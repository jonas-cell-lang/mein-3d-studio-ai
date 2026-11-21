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
