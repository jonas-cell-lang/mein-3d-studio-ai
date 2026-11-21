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
      } else if (message.method === "createBox") {
        this.onmessage({ data: { id: message.id, ok: true, result: {
          shapeId: 7, volumeMM3: 8000,
          mesh: { positions: new Float32Array([0, 0, 0]), indices: new Uint32Array([0]), triangleCount: 1 }
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
