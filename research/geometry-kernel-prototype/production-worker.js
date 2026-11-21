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
