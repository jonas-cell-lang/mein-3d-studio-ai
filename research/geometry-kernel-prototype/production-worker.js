import { OcctKernel } from "occt-wasm";

let kernel = null;
let initialization = null;
let nextShapeId = 1;
const shapes = new Map();

async function ensureKernel(wasmUrl) {
  if (kernel) return kernel;
  if (!initialization) {
    initialization = OcctKernel.init({ wasm: wasmUrl }).then(instance => {
      kernel = instance;
      return instance;
    }).catch(error => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

function serializeMesh(mesh) {
  if (!mesh || !mesh.positions?.length || !mesh.indices?.length || !mesh.triangleCount) {
    throw new Error("OCCT lieferte kein verwendbares Darstellungsnetz.");
  }
  return {
    positions: new Float32Array(mesh.positions),
    indices: new Uint32Array(mesh.indices),
    triangleCount: mesh.triangleCount
  };
}

async function execute(method, args) {
  if (method === "initialize") {
    await ensureKernel(args.wasmUrl);
    return { ready: true, kernel: "OCCT 8.0.1", wrapper: "occt-wasm 5.17.2" };
  }
  if (method === "dispose") {
    if (kernel) kernel[Symbol.dispose]();
    kernel = null;
    initialization = null;
    shapes.clear();
    return { disposed: true };
  }
  if (!kernel) throw new Error("OCCT-Kern wurde noch nicht initialisiert.");

  if (method === "createBox") {
    const { widthMM, depthMM, heightMM } = args;
    for (const [name, value] of Object.entries({ widthMM, depthMM, heightMM })) {
      if (!Number.isFinite(value) || value < 0.01 || value > 2000) {
        throw new Error(name + " muss zwischen 0.01 und 2000 mm liegen.");
      }
    }
    const shape = kernel.makeBox(widthMM, depthMM, heightMM);
    const mesh = serializeMesh(kernel.tessellate(shape));
    const shapeId = nextShapeId++;
    shapes.set(shapeId, shape);
    return {
      shapeId,
      volumeMM3: kernel.getVolume(shape),
      mesh
    };
  }

  if (method === "createExtrusion") {
    const { loops, heightMM } = args;
    if (!Array.isArray(loops) || loops.length < 1 || loops.length > 101 ||
        !Number.isFinite(heightMM) || heightMM < 0.1 || heightMM > 2000) {
      throw new Error("OCCT-Extrusion benötigt eine Aussenkontur, gültige Innenkonturen und eine Höhe von 0,1 bis 2000 mm.");
    }
    const totalPoints = loops.reduce((sum, loop) => sum + (Array.isArray(loop) ? loop.length : 0), 0);
    if (totalPoints > 10000 || loops.some(loop => !Array.isArray(loop) || loop.length < 3 || loop.length > 5000 ||
        !loop.every(point => Array.isArray(point) && point.length === 2 &&
          point.every(value => Number.isFinite(value) && Math.abs(value) <= 2000)))) {
      throw new Error("OCCT-Skizzenkontur enthält ungültige oder zu viele Punkte.");
    }

    const temporaryHandles = new Set();
    let solid = null;
    const makeClosedWire = points => {
      const edges = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        const edge = kernel.makeLineEdge(
          { x: a[0], y: a[1], z: 0 },
          { x: b[0], y: b[1], z: 0 }
        );
        edges.push(edge);
        temporaryHandles.add(edge);
      }
      const wire = kernel.makeWire(edges);
      temporaryHandles.add(wire);
      return wire;
    };

    try {
      const outerWire = makeClosedWire(loops[0]);
      let face = kernel.makeFace(outerWire);
      temporaryHandles.add(face);
      if (loops.length > 1) {
        const holeWires = loops.slice(1).map(makeClosedWire);
        const faceWithHoles = kernel.addHolesInFace(face, holeWires);
        temporaryHandles.add(faceWithHoles);
        face = faceWithHoles;
      }
      solid = kernel.extrude(face, 0, 0, heightMM);
      const volumeMM3 = kernel.getVolume(solid);
      const mesh = serializeMesh(kernel.tessellate(solid));
      if (!Number.isFinite(volumeMM3) || volumeMM3 <= 0) {
        throw new Error("OCCT-Extrusion besitzt kein gültiges positives Volumen.");
      }
      const shapeId = nextShapeId++;
      shapes.set(shapeId, solid);
      solid = null;
      return { shapeId, volumeMM3, mesh, shapeType: "solid" };
    } finally {
      if (solid !== null) {
        try { kernel.release(solid); } catch { /* Fehlerpfad: best effort cleanup. */ }
      }
      for (const handle of temporaryHandles) {
        try { kernel.release(handle); } catch { /* Bereits freigegebene Hilfsform ignorieren. */ }
      }
    }
  }

  if (method === "releaseShape") {
    const shape = shapes.get(args.shapeId);
    if (!shape) throw new Error("OCCT-Körperkennung ist unbekannt oder wurde freigegeben.");
    kernel.release(shape);
    shapes.delete(args.shapeId);
    return { released: true };
  }

  if (method === "getVolume") {
    const shape = shapes.get(args.shapeId);
    if (!shape) throw new Error("OCCT-Körperkennung ist unbekannt oder wurde freigegeben.");
    return { volumeMM3: kernel.getVolume(shape) };
  }

  if (method === "releaseAll") {
    kernel.releaseAll();
    shapes.clear();
    return { released: true };
  }

  throw new Error("Unbekannter OCCT-Befehl: " + method);
}

self.addEventListener("message", async event => {
  const message = event.data;
  if (message?.type !== "request" || !Number.isInteger(message.id)) return;
  try {
    const result = await execute(message.method, message.args || {});
    const transfer = [];
    if (result?.mesh?.positions?.buffer) transfer.push(result.mesh.positions.buffer);
    if (result?.mesh?.indices?.buffer) transfer.push(result.mesh.indices.buffer);
    self.postMessage({ id: message.id, ok: true, result }, transfer);
  } catch (error) {
    self.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
