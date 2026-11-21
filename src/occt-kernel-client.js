(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SILMOOCCTClient = api;
})(globalThis, function (root) {
  function createClient(options = {}) {
    const WorkerConstructor = options.WorkerClass || root.Worker;
    if (typeof WorkerConstructor !== "function") throw new Error("Dieser Browser unterstützt keine Web Worker.");

    const baseURI = root.document?.baseURI || "http://localhost/";
    const workerUrl = options.workerUrl || new URL("./vendor/occt/silmo-occt-worker.js", baseURI).href;
    const wasmUrl = options.wasmUrl || new URL("./vendor/occt/occt-wasm.wasm", baseURI).href;
    let worker = null;
    let nextId = 1;
    let disposed = false;
    let initialized = false;
    let initializing = null;
    const pending = new Map();

    function rejectPending(error) {
      for (const entry of pending.values()) entry.reject(error);
      pending.clear();
    }

    function ensureWorker() {
      if (disposed) throw new Error("OCCT-Client wurde bereits geschlossen.");
      if (worker) return worker;
      worker = new WorkerConstructor(workerUrl, { type: "module" });
      worker.onmessage = event => {
        const message = event.data;
        const entry = pending.get(message?.id);
        if (!entry) return;
        pending.delete(message.id);
        if (message.ok) entry.resolve(message.result);
        else entry.reject(new Error(message.error || "OCCT-Worker-Aufruf fehlgeschlagen."));
      };
      worker.onerror = event => {
        const error = new Error(event.message || "OCCT-Worker ist ausgefallen.");
        rejectPending(error);
      };
      return worker;
    }

    function send(method, args = {}) {
      const activeWorker = ensureWorker();
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        try {
          activeWorker.postMessage({ type: "request", id, method, args });
        } catch (error) {
          pending.delete(id);
          reject(error);
        }
      });
    }

    function initialize() {
      if (initialized) return Promise.resolve({ ready: true });
      if (!initializing) {
        initializing = send("initialize", { wasmUrl }).then(result => {
          initialized = true;
          return result;
        }).finally(() => {
          initializing = null;
        });
      }
      return initializing;
    }

    return Object.freeze({
      initialize,
      async createBox(widthMM, depthMM, heightMM) {
        await initialize();
        return send("createBox", { widthMM, depthMM, heightMM });
      },
      async createExtrusion(loops, heightMM) {
        await initialize();
        return send("createExtrusion", { loops, heightMM });
      },
      async releaseShape(shapeId) {
        await initialize();
        const result = await send("releaseShape", { shapeId });
        return result.released === true;
      },
      async getVolume(shapeId) {
        await initialize();
        const result = await send("getVolume", { shapeId });
        return result.volumeMM3;
      },
      async releaseAll() {
        await initialize();
        const result = await send("releaseAll");
        return result.released === true;
      },
      async dispose() {
        if (disposed) return;
        if (worker && initialized) {
          try { await send("dispose"); } catch { /* Worker wird in jedem Fall beendet. */ }
        }
        disposed = true;
        if (worker) worker.terminate();
        worker = null;
        rejectPending(new Error("OCCT-Client wurde geschlossen."));
      }
    });
  }

  return Object.freeze({ createClient });
});
