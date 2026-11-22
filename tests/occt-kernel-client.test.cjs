const test = require("node:test");
const assert = require("node:assert/strict");
const { createClient } = require("../src/occt-kernel-client.js");

class FakeWorker {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.messages = [];
    this.terminated = false;
  }
  postMessage(message) {
    this.messages.push(message);
    queueMicrotask(() => {
      if (this.terminated) return;
      if (message.method === "initialize") {
        this.onmessage({ data: { id: message.id, ok: true, result: { ready: true } } });
      } else if (message.method === "importStep") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: 10, volumeMM3: 8000, shapeType: "solid",
          mesh: { positions: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]), triangleCount: 1 }
        } } });
      } else if (message.method === "exportStep") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          stepText: "ISO-10303-21;\\nHEADER;\\nENDSEC;\\nDATA;\\nENDSEC;\\nEND-ISO-10303-21;"
        } } });
      } else if (message.method === "createTorus") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: 14, volumeMM3: 2 * Math.PI ** 2 * message.args.majorRadiusMM * message.args.minorRadiusMM ** 2,
          shapeType: "solid",
          mesh: { positions: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]), triangleCount: 1 }
        } } });
      } else if (message.method === "createCone") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: 13, volumeMM3: (Math.PI * message.args.radiusMM ** 2 * message.args.heightMM) / 3,
          shapeType: "solid",
          mesh: { positions: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]), triangleCount: 1 }
        } } });
      } else if (message.method === "createSphere") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: 12, volumeMM3: (4 / 3) * Math.PI * message.args.radiusMM ** 3, shapeType: "solid",
          mesh: { positions: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]), triangleCount: 1 }
        } } });
      } else if (message.method === "createCylinder") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: 11, volumeMM3: Math.PI * message.args.radiusMM ** 2 * message.args.heightMM,
          shapeType: "solid",
          mesh: { positions: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]), triangleCount: 1 }
        } } });
      } else if (message.method === "createBox") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: 7, volumeMM3: 8000,
          mesh: { positions: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]), triangleCount: 1 }
        } } });
      } else if (message.method === "inspectShape") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: message.args.shapeId, shapeType: "solid", volumeMM3: 8000, surfaceAreaMM2: 2400,
          centerOfMassMM: [10, 10, 10],
          topology: { solid: 1, shell: 1, face: 6, wire: 6, edge: 12, vertex: 8 },
          mesh: { vertexCount: 8, triangleCount: 12, indexCount: 36 },
          boundingBoxMM: { min: [0, 0, 0], max: [20, 20, 20], size: [20, 20, 20], center: [10, 10, 10], source: "native-brep" }
        } } });
      } else if (message.method === "draftFaces") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: 24, volumeMM3: 7900,
          mesh: { positions: new Float32Array([0,0,0, 1,0,0, 0,1,0]), indices: new Uint32Array([0,1,2]), triangleCount: 1 }
        } } });
      } else if (message.method === "getVolume") {
        this.onmessage({ data: { id: message.id, ok: true, result: { volumeMM3: 8000 } } });
      } else if (message.method === "createExtrusion") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: 8, volumeMM3: 5500, shapeType: "solid",
          mesh: { positions: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]), triangleCount: 1 }
        } } });
      } else if (message.method === "booleanOperation") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: 9, volumeMM3: message.args.operation === "fuse" ? 8000 : 4000,
          operation: message.args.operation,
          mesh: { positions: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]), triangleCount: 1 }
        } } });
      } else if (message.method === "releaseShape") {
        this.onmessage({ data: { id: message.id, ok: true, result: { released: true } } });
      } else if (message.method === "releaseAll") {
        this.onmessage({ data: { id: message.id, ok: true, result: { released: true } } });
      } else if (message.method === "dispose") {
        this.onmessage({ data: { id: message.id, ok: true, result: { disposed: true } } });
      } else {
        this.onmessage({ data: { id: message.id, ok: false, error: "unknown method" } });
      }
    });
  }
  terminate() { this.terminated = true; }
}

test("OCCT client imports and exports STEP text through the worker", async () => {
  let worker;
  const client = createClient({
    WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } }
  });
  const stepText = "ISO-10303-21;\\nHEADER;\\nENDSEC;\\nDATA;\\nENDSEC;\\nEND-ISO-10303-21;";
  const imported = await client.importStep(stepText);
  assert.equal(imported.shapeId, 10);
  assert.equal(imported.volumeMM3, 8000);
  assert.equal(imported.shapeType, "solid");
  assert.equal(imported.mesh.triangleCount, 1);
  assert.equal(await client.exportStep(10), stepText);
  assert.deepEqual(worker.messages.map(message => message.method),
    ["initialize", "importStep", "exportStep"]);
  assert.equal(worker.messages[1].args.stepText, stepText);
  await assert.rejects(client.importStep("not a STEP file"), /STEP-Datei ist ungültig/);
  await assert.rejects(client.exportStep(0), /gültige OCCT-Körperkennung/);
  await client.dispose();
});

test("OCCT client creates analytic tori and rejects invalid radii", async () => {
  let worker;
  const client = createClient({ WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } } });
  const result = await client.createTorus(20, 5);
  assert.equal(result.shapeId, 14);
  assert.ok(Math.abs(result.volumeMM3 - 1000 * Math.PI ** 2) < 1e-10);
  assert.equal(result.shapeType, "solid");
  assert.deepEqual(worker.messages.map(message => message.method), ["initialize", "createTorus"]);
  assert.deepEqual(worker.messages[1].args, { majorRadiusMM: 20, minorRadiusMM: 5 });
  await assert.rejects(client.createTorus(5, 5), /grosse Torusradius/);
  await assert.rejects(client.createTorus(4, 5), /grosse Torusradius/);
  await assert.rejects(client.createTorus(20, 0), /grosse Torusradius/);
  await client.dispose();
});

test("OCCT client creates analytic cones and rejects unsafe dimensions", async () => {
  let worker;
  const client = createClient({ WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } } });
  const result = await client.createCone(5, 20);
  assert.equal(result.shapeId, 13);
  assert.ok(Math.abs(result.volumeMM3 - (500 * Math.PI / 3)) < 1e-10);
  assert.equal(result.shapeType, "solid");
  assert.deepEqual(worker.messages.map(message => message.method), ["initialize", "createCone"]);
  assert.deepEqual(worker.messages[1].args, { radiusMM: 5, heightMM: 20 });
  await assert.rejects(client.createCone(0, 20), /Kegelradius/);
  await assert.rejects(client.createCone(5, 2001), /Kegelradius/);
  await client.dispose();
});

test("OCCT client creates analytic spheres and rejects unsafe radii", async () => {
  let worker;
  const client = createClient({ WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } } });
  const result = await client.createSphere(5);
  assert.equal(result.shapeId, 12);
  assert.ok(Math.abs(result.volumeMM3 - (500 * Math.PI / 3)) < 1e-10);
  assert.equal(result.shapeType, "solid");
  assert.deepEqual(worker.messages.map(message => message.method), ["initialize", "createSphere"]);
  assert.deepEqual(worker.messages[1].args, { radiusMM: 5 });
  await assert.rejects(client.createSphere(0), /Kugelradius/);
  await assert.rejects(client.createSphere(2001), /Kugelradius/);
  await client.dispose();
});

test("OCCT client creates analytic cylinders and rejects unsafe dimensions", async () => {
  let worker;
  const client = createClient({
    WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } }
  });
  const result = await client.createCylinder(5, 20);
  assert.equal(result.shapeId, 11);
  assert.ok(Math.abs(result.volumeMM3 - 500 * Math.PI) < 1e-10);
  assert.equal(result.shapeType, "solid");
  assert.deepEqual(worker.messages.map(message => message.method), ["initialize", "createCylinder"]);
  assert.deepEqual(worker.messages[1].args, { radiusMM: 5, heightMM: 20 });
  await assert.rejects(client.createCylinder(0, 20), /Zylinderradius/);
  await assert.rejects(client.createCylinder(5, 2001), /Zylinderradius/);
  await client.dispose();
});

test("OCCT client inspects a solid and validates the requested body handle", async () => {
  let worker;
  const client = createClient({
    WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } }
  });
  const result = await client.inspectShape(7);
  assert.equal(result.shapeId, 7);
  assert.equal(result.shapeType, "solid");
  assert.equal(result.volumeMM3, 8000);
  assert.deepEqual(result.mesh, { vertexCount: 8, triangleCount: 12, indexCount: 36 });
  assert.equal(result.surfaceAreaMM2, 2400);
  assert.deepEqual(result.centerOfMassMM, [10, 10, 10]);
  assert.deepEqual(result.topology, { solid: 1, shell: 1, face: 6, wire: 6, edge: 12, vertex: 8 });
  assert.deepEqual(result.boundingBoxMM, {
    min: [0, 0, 0], max: [20, 20, 20], size: [20, 20, 20], center: [10, 10, 10], source: "native-brep"
  });
  assert.deepEqual(worker.messages.map(message => message.method), ["initialize", "inspectShape"]);
  assert.equal(worker.messages[1].args.shapeId, 7);
  await assert.rejects(client.inspectShape(0), /gültige OCCT-Körperkennung/);
  await assert.rejects(client.inspectShape(-1), /gültige OCCT-Körperkennung/);
  await client.dispose();
});
test("OCCT client validates native topology and fillet result payloads", async () => {
  let worker;
  let invalidFaceArea = false;
  let faceMeshPayload = {
    faces: [{ index: 0, mesh: { positions: new Float32Array([0,0,0, 1,0,0, 0,1,0]), indices: new Uint32Array([0,1,2]), triangleCount: 1 } }],
    triangleCount: 1
  };
  const client = createClient({
    WorkerClass: class extends FakeWorker {
      constructor(url, options) { super(url, options); worker = this; }
      postMessage(message) {
        if (message.method === "getFaceMeshes") {
          this.messages.push(message);
          queueMicrotask(() => this.onmessage({ data: { id: message.id, ok: true, result: faceMeshPayload } }));
          return;
        }
        if (message.method === "listSubShapes") {
          this.messages.push(message);
          queueMicrotask(() => this.onmessage({ data: { id: message.id, ok: true, result: {
            face: [{ index: 0, geometryType: "plane", areaMM2: invalidFaceArea ? Number.NaN : 400 }],
            edge: [{ index: 0, geometryType: "line", lengthMM: 20 }]
          } } }));
          return;
        }
        if (message.method === "filletEdges") {
          this.messages.push(message);
          queueMicrotask(() => this.onmessage({ data: { id: message.id, ok: true, result: {
            shapeId: 22, volumeMM3: 7900,
            mesh: { positions: new Float32Array([0,0,0, 1,0,0, 0,1,0]), indices: new Uint32Array([0,1,2]), triangleCount: 1 }
          } } }));
          return;
        }
        if (message.method === "chamferEdges") {
          this.messages.push(message);
          queueMicrotask(() => this.onmessage({ data: { id: message.id, ok: true, result: {
            shapeId: 23, volumeMM3: 7800,
            mesh: { positions: new Float32Array([0,0,0, 1,0,0, 0,1,0]), indices: new Uint32Array([0,1,2]), triangleCount: 1 }
          } } }));
          return;
        }
        super.postMessage(message);
      }
    }
  });
  const faceMeshes = await client.getFaceMeshes(7);
  assert.equal(faceMeshes.faces.length, 1);
  assert.equal(faceMeshes.faces[0].mesh.triangleCount, 1);
  assert.deepEqual(worker.messages.find(message => message.method === "getFaceMeshes").args, { shapeId: 7 });
  faceMeshPayload = {
    faces: [{ index: 0, mesh: { positions: new Float32Array([0,0,0, 1,0,0, 0,1,0]), indices: new Uint32Array([0,1,9]), triangleCount: 1 } }],
    triangleCount: 1
  };
  await assert.rejects(client.getFaceMeshes(7), /ungültige native Flächen-Netze/);
  faceMeshPayload = {
    faces: [{ index: 0, mesh: { positions: new Float32Array([0,0,0, 1,0,0, 0,1,0]), indices: new Uint32Array([0,1,2]), triangleCount: 2 } }],
    triangleCount: 2
  };
  await assert.rejects(client.getFaceMeshes(7), /ungültige native Flächen-Netze/);
  faceMeshPayload = {
    faces: [{ index: 0, mesh: { positions: new Float32Array([NaN,0,0, 1,0,0, 0,1,0]), indices: new Uint32Array([0,1,2]), triangleCount: 1 } }],
    triangleCount: 1
  };
  await assert.rejects(client.getFaceMeshes(7), /ungültige native Flächen-Netze/);
  faceMeshPayload = {
    faces: [{ index: 0, mesh: { positions: new Float32Array([0,0,0, 1,0,0, 0,1,0, 2,2,2]), indices: new Uint32Array([0,1,2]), triangleCount: 1 } }],
    triangleCount: 1
  };
  await assert.rejects(client.getFaceMeshes(7), /ungültige native Flächen-Netze/);
  faceMeshPayload = {
    faces: [{ index: 0, mesh: { positions: new Float32Array([0,0,0, 1,0,0, 0,1,0]), indices: new Uint32Array([0,1,2]), triangleCount: 1 } }],
    triangleCount: 1
  };
  const topology = await client.listSubShapes(7);
  assert.equal(topology.face[0].geometryType, "plane");
  assert.equal(topology.face[0].areaMM2, 400);
  assert.equal(topology.edge[0].lengthMM, 20);
  invalidFaceArea = true;
  await assert.rejects(client.listSubShapes(7), /ungültige native Flächen- oder Kantendaten/);
  invalidFaceArea = false;
  const rounded = await client.filletEdges(7, [0, 2], 1.5);
  assert.equal(rounded.shapeId, 22);
  assert.equal(rounded.mesh.triangleCount, 1);
  assert.deepEqual(worker.messages.find(message => message.method === "filletEdges").args,
    { shapeId: 7, edgeIndices: [0, 2], radiusMM: 1.5 });
  const variableRounded = await client.filletEdges(7, [0, 2], [
    { start: 1, end: 1.5 }, { start: 2, end: 1.25 }
  ]);
  assert.equal(variableRounded.shapeId, 22);
  assert.deepEqual(worker.messages.filter(message => message.method === "filletEdges")[1].args.radiusMM,
    [{ start: 1, end: 1.5 }, { start: 2, end: 1.25 }]);
  const chamfered = await client.chamferEdges(7, [1, 3], 0.8);
  assert.equal(chamfered.shapeId, 23);
  assert.equal(chamfered.mesh.triangleCount, 1);
  assert.deepEqual(worker.messages.find(message => message.method === "chamferEdges").args,
    { shapeId: 7, edgeIndices: [1, 3], distanceMM: 0.8 });
  await client.dispose();
});

test("OCCT client rejects invalid fillet parameters before contacting the worker", async () => {
  let worker;
  const client = createClient({
    WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } }
  });
  await client.createBox(20, 20, 20);
  worker.messages.length = 0;
  await assert.rejects(client.filletEdges(7, [], 1), /Kantenrundung benötigt/);
  await assert.rejects(client.filletEdges(7, [0, 0], 1), /Kantenrundung benötigt/);
  await assert.rejects(client.filletEdges(7, [0], 0.001), /Kantenrundung benötigt/);
  await assert.rejects(client.filletEdges(7, [0], 2001), /Kantenrundung benötigt/);
  await assert.rejects(client.filletEdges(7, [0, 1], [{ start: 1, end: 2 }]), /Kantenrundung benötigt/);
  await assert.rejects(client.filletEdges(7, [0], [{ start: 0, end: 1 }]), /Kantenrundung benötigt/);
  await assert.rejects(client.chamferEdges(7, [], 1), /Kantenfase benötigt/);
  await assert.rejects(client.chamferEdges(7, [0, 0], 1), /Kantenfase benötigt/);
  await assert.rejects(client.chamferEdges(7, [0], 2001), /Kantenfase benötigt/);
  assert.equal(worker.messages.length, 0, "Ungültige Rundungs-/Fasenparameter dürfen keinen Worker-Aufruf auslösen");
  await client.dispose();
});


test("OCCT client validates and sends selected-face draft operations", async () => {
  let worker;
  const client = createClient({
    WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } }
  });
  await client.createBox(20, 20, 20);
  worker.messages.length = 0;
  const direction = { x: 0, y: 0, z: 1 };
  const neutralPlane = { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 } };
  await assert.rejects(client.draftFaces(7, [], 5, direction, neutralPlane), /Flächenneigung benötigt/);
  await assert.rejects(client.draftFaces(7, [0, 0], 5, direction, neutralPlane), /Flächenneigung benötigt/);
  await assert.rejects(client.draftFaces(7, [0], 0, direction, neutralPlane), /Flächenneigung benötigt/);
  await assert.rejects(client.draftFaces(7, [0], 25, direction, neutralPlane), /Flächenneigung benötigt/);
  await assert.rejects(client.draftFaces(7, [0], 5, { x: 0, y: 0, z: 0 }, neutralPlane), /Flächenneigung benötigt/);
  assert.equal(worker.messages.length, 0, "Ungültige Flächenneigung darf keinen Worker-Aufruf auslösen");
  const result = await client.draftFaces(7, [1], 5, direction, neutralPlane);
  assert.equal(result.shapeId, 24);
  assert.equal(result.mesh.triangleCount, 1);
  assert.deepEqual(worker.messages.find(message => message.method === "draftFaces").args,
    { shapeId: 7, faceIndices: [1], angleDeg: 5, direction, neutralPlane });
  await client.dispose();
});

test("OCCT client initializes lazily and sends CAD commands through one module worker", async () => {
  let worker;
  const client = createClient({
    WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } },
    workerUrl: "/assets/silmo-occt-worker.js",
    wasmUrl: "/assets/occt-wasm.wasm"
  });
  const result = await client.createBox(20, 20, 20);
  assert.equal(result.shapeId, 7);
  assert.equal(result.volumeMM3, 8000);
  assert.equal(result.mesh.triangleCount, 1);
  assert.equal(await client.getVolume(7), 8000);
  assert.deepEqual(worker.messages.map(message => message.method), ["initialize", "createBox", "getVolume"]);
  assert.equal(worker.messages[0].args.wasmUrl, "/assets/occt-wasm.wasm");
  assert.equal(worker.options.type, "module");
  assert.equal(await client.releaseAll(), true);
  await client.dispose();
  assert.equal(worker.terminated, true);
});

test("OCCT client shares concurrent initialization requests", async () => {
  let worker;
  const client = createClient({
    WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } }
  });
  const [first, second] = await Promise.all([
    client.createBox(10, 10, 10),
    client.createBox(20, 20, 20)
  ]);
  assert.equal(first.shapeId, 7);
  assert.equal(second.shapeId, 7);
  assert.equal(worker.messages.filter(message => message.method === "initialize").length, 1);
  await client.dispose();
});

test("OCCT client rejects use after disposal", async () => {
  const client = createClient({ WorkerClass: FakeWorker });
  await client.dispose();
  await assert.rejects(client.createBox(1, 1, 1), /geschlossen/);
});


test("OCCT client forwards sketch loops and extrusion height and releases individual B-Rep bodies", async () => {
  let worker;
  const client = createClient({
    WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } }
  });
  const loops = [
    [[0, 0], [40, 0], [40, 30], [0, 30]],
    [[10, 10], [10, 20], [20, 20], [20, 10]]
  ];
  const result = await client.createExtrusion(loops, 5);
  assert.equal(result.shapeId, 8);
  assert.equal(result.volumeMM3, 5500);
  assert.equal(result.shapeType, "solid");
  assert.equal(worker.messages.find(message => message.method === "createExtrusion").args.heightMM, 5);
  assert.deepEqual(worker.messages.find(message => message.method === "createExtrusion").args.loops, loops);
  assert.equal(await client.releaseShape(8), true);
  assert.deepEqual(worker.messages.map(message => message.method), ["initialize", "createExtrusion", "releaseShape"]);
  await client.dispose();
});


test("OCCT client validates and forwards fuse, cut and common operations", async () => {
  let worker;
  const client = createClient({
    WorkerClass: class extends FakeWorker { constructor(url, options) { super(url, options); worker = this; } }
  });
  await assert.rejects(client.booleanOperation("shell", [1, 2]), /Unbekannte OCCT-Boolean-Operation/);
  await assert.rejects(client.booleanOperation("cut", [1, 1]), /zwei verschiedene Körperkennungen/);
  for (const operation of ["fuse", "cut", "common"]) {
    const result = await client.booleanOperation(operation, [11, 12], [[5, 0, 0], [0, 0, 0]]);
    assert.equal(result.operation, operation);
    assert.equal(result.shapeId, 9);
    assert.ok(result.volumeMM3 > 0);
    assert.equal(result.mesh.triangleCount, 1);
  }
  assert.deepEqual(worker.messages.filter(message => message.method === "booleanOperation")
    .map(message => message.args.operation), ["fuse", "cut", "common"]);
  assert.deepEqual(worker.messages.filter(message => message.method === "booleanOperation")[0].args.transformsMM,
    [
      [1, 0, 0, 5, 0, 1, 0, 0, 0, 0, 1, 0],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]
    ]);
  await assert.rejects(client.booleanOperation("cut", [11, 12], [[Infinity, 0, 0], [0, 0, 0]]),
    /gültige, nicht entartete 3×4-Matrizen/);
  await assert.rejects(client.booleanOperation("cut", [11, 12], [
    Array(12).fill(0), Array(12).fill(0)
  ]), /gültige, nicht entartete 3×4-Matrizen/);
  await client.dispose();
});


test("OCCT client discards a crashed worker and can initialize a replacement", async () => {
  const workers = [];
  class CrashOnceWorker extends FakeWorker {
    constructor(url, options) {
      super(url, options);
      this.crashOnBox = workers.length === 0;
      workers.push(this);
    }
    postMessage(message) {
      if (this.crashOnBox && message.method === "createBox") {
        this.messages.push(message);
        return;
      }
      super.postMessage(message);
    }
  }
  const client = createClient({ WorkerClass: CrashOnceWorker });
  const firstRequest = client.createBox(10, 10, 10);
  await new Promise(resolve => setImmediate(resolve));
  const firstWorker = workers[0];
  assert.ok(firstWorker);
  firstWorker.onerror({ message: "simulierter Worker-Absturz", preventDefault() {} });
  await assert.rejects(firstRequest, /simulierter Worker-Absturz/);
  assert.equal(firstWorker.terminated, true);
  const recovered = await client.createBox(20, 20, 20);
  assert.equal(recovered.volumeMM3, 8000);
  assert.equal(workers.length, 2, "Nach dem Absturz wurde kein neuer Worker gestartet");
  assert.equal(workers[1].messages.filter(message => message.method === "initialize").length, 1);
  await client.dispose();
});

test("OCCT client treats unreadable worker messages as a worker failure", async () => {
  const workers = [];
  class MessageErrorWorker extends FakeWorker {
    constructor(url, options) { super(url, options); workers.push(this); }
    postMessage(message) {
      if (message.method === "createBox") {
        this.messages.push(message);
        return;
      }
      super.postMessage(message);
    }
  }
  const client = createClient({ WorkerClass: MessageErrorWorker });
  const request = client.createBox(10, 10, 10);
  await new Promise(resolve => setImmediate(resolve));
  workers[0].onmessageerror({ preventDefault() {} });
  await assert.rejects(request, /unlesbare Nachricht/);
  assert.equal(workers[0].terminated, true);
  await client.dispose();
});
