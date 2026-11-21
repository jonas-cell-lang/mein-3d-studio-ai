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

  if (method === "importStep") {
    const { stepText } = args;
    if (typeof stepText !== "string" || stepText.length < 20 ||
        stepText.length > 10 * 1024 * 1024 ||
        !/^ISO-10303-21\s*;/i.test(stepText.trimStart()) ||
        !/END-ISO-10303-21\s*;\s*$/i.test(stepText.trim())) {
      throw new Error("STEP-Datei ist ungültig oder überschreitet 10 MB.");
    }
    let shape = null;
    try {
      shape = kernel.importStep(stepText);
      const volumeMM3 = kernel.getVolume(shape);
      const mesh = serializeMesh(kernel.tessellate(shape));
      if (!Number.isFinite(volumeMM3) || volumeMM3 <= 0) {
        throw new Error("STEP-Datei enthält keinen Körper mit positivem Volumen.");
      }
      const shapeId = nextShapeId++;
      shapes.set(shapeId, shape);
      shape = null;
      return { shapeId, volumeMM3, mesh, shapeType: "solid" };
    } finally {
      if (shape !== null) {
        try { kernel.release(shape); } catch { /* Fehlerpfad: best effort cleanup. */ }
      }
    }
  }

  if (method === "exportStep") {
    const shape = shapes.get(args.shapeId);
    if (!shape) throw new Error("OCCT-Körperkennung ist unbekannt oder wurde freigegeben.");
    const stepText = kernel.exportStep(shape, { unit: "mm", schema: "AP242" });
    if (typeof stepText !== "string" || !stepText.startsWith("ISO-10303-21")) {
      throw new Error("OCCT konnte keine gültige STEP-Datei erzeugen.");
    }
    return { stepText };
  }

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

  if (method === "booleanOperation") {
    const { operation, shapeIds, transformsMM, translationsMM } = args;
    if (!["fuse", "cut", "common"].includes(operation) ||
        !Array.isArray(shapeIds) || shapeIds.length !== 2 ||
        shapeIds.some(id => !Number.isInteger(id) || id <= 0) ||
        shapeIds[0] === shapeIds[1]) {
      throw new Error("OCCT-Boolean benötigt zwei verschiedene Körper und eine gültige Operation.");
    }
    const suppliedTransforms = transformsMM ?? (translationsMM ?? [[0, 0, 0], [0, 0, 0]]).map(offset =>
      Array.isArray(offset) && offset.length === 3
        ? [1, 0, 0, offset[0], 0, 1, 0, offset[1], 0, 0, 1, offset[2]]
        : null
    );
    const validMatrix = matrix => {
      if (!Array.isArray(matrix) || matrix.length !== 12 ||
          !matrix.every(Number.isFinite) ||
          matrix.some((value, index) => (index % 4 === 3
            ? Math.abs(value) > 200000
            : Math.abs(value) > 1000))) return false;
      const determinant =
        matrix[0] * (matrix[5] * matrix[10] - matrix[6] * matrix[9]) -
        matrix[1] * (matrix[4] * matrix[10] - matrix[6] * matrix[8]) +
        matrix[2] * (matrix[4] * matrix[9] - matrix[5] * matrix[8]);
      return Number.isFinite(determinant) && Math.abs(determinant) > 1e-12;
    };
    if (!Array.isArray(suppliedTransforms) || suppliedTransforms.length !== 2 ||
        !suppliedTransforms.every(validMatrix)) {
      throw new Error("OCCT benötigt zwei gültige, nicht entartete 3×4-Transformationen.");
    }
    const originals = shapeIds.map(id => shapes.get(id));
    if (originals.some(shape => !shape)) {
      throw new Error("Mindestens eine OCCT-Körperkennung ist unbekannt oder wurde freigegeben.");
    }
    const temporaryShapes = [];
    let resultShape = null;
    try {
      const operands = originals.map((shape, index) => {
        const matrix = suppliedTransforms[index];
        const identity = matrix.every((value, i) =>
          Math.abs(value - ([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0][i])) < 1e-12
        );
        if (identity) return shape;
        const transformed = kernel.transform(shape, matrix);
        temporaryShapes.push(transformed);
        return transformed;
      });
      resultShape = kernel[operation](operands[0], operands[1]);
      const volumeMM3 = kernel.getVolume(resultShape);
      const mesh = serializeMesh(kernel.tessellate(resultShape));
      if (!Number.isFinite(volumeMM3) || volumeMM3 <= 0) {
        throw new Error("OCCT-Boolean-Ergebnis besitzt kein gültiges positives Volumen.");
      }
      const shapeId = nextShapeId++;
      shapes.set(shapeId, resultShape);
      resultShape = null;
      return { shapeId, volumeMM3, mesh, operation };
    } finally {
      if (resultShape !== null) {
        try { kernel.release(resultShape); } catch { /* Fehlerpfad: best effort cleanup. */ }
      }
      temporaryShapes.forEach(shape => {
        try { kernel.release(shape); } catch { /* Temporäre Transformationskörper freigeben. */ }
      });
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

// OCCT/WASM-Kernel-Aufrufe werden bewusst serialisiert. Web-Worker-Message-
 // Events können sich während await überlappen; parallele Mutationen am selben
 // Kernel würden sonst Erzeugung, Boolean-Operationen und Freigaben vermischen.
let executionQueue = Promise.resolve();

self.addEventListener("message", event => {
  const message = event.data;
  if (message?.type !== "request" || !Number.isInteger(message.id)) return;

  const executeRequest = async () => {
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
  };

  executionQueue = executionQueue.then(executeRequest, executeRequest);
});
