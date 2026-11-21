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
      const handleWorkerFailure = (event, message) => {
        const failedWorker = worker;
        const error = new Error(event?.message || message);
        // Ein abgestürzter Worker darf nicht als initialisiert weiterverwendet
        // werden: Folgeaufrufe erhalten sonst nie eine Antwort.
        if (failedWorker) {
          worker = null;
          failedWorker.onmessage = null;
          failedWorker.onerror = null;
          failedWorker.onmessageerror = null;
          try { failedWorker.terminate(); } catch { /* Worker ist bereits beendet. */ }
        }
        initialized = false;
        // initialize() räumt sein eigenes Promise in finally() auf. Hier nicht
        // vorzeitig nullen, damit ein sofortiger Retry nicht überholt wird.
        rejectPending(error);
        if (typeof event?.preventDefault === "function") event.preventDefault();
      };
      worker.onerror = event => handleWorkerFailure(event, "OCCT-Worker ist ausgefallen.");
      worker.onmessageerror = event => handleWorkerFailure(event, "OCCT-Worker lieferte eine unlesbare Nachricht.");
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
      async importStep(stepText) {
        if (typeof stepText !== "string" || stepText.length < 20 ||
            stepText.length > 10 * 1024 * 1024 ||
            !/^ISO-10303-21\s*;/i.test(stepText.trimStart()) ||
            !/END-ISO-10303-21\s*;\s*$/i.test(stepText.trim())) {
          throw new Error("STEP-Datei ist ungültig oder überschreitet 10 MB.");
        }
        await initialize();
        return send("importStep", { stepText });
      },
      async exportStep(shapeId) {
        if (!Number.isInteger(shapeId) || shapeId <= 0) {
          throw new Error("Für den STEP-Export ist eine gültige OCCT-Körperkennung erforderlich.");
        }
        await initialize();
        const result = await send("exportStep", { shapeId });
        return result.stepText;
      },
      async createSphere(radiusMM) {
        if (!Number.isFinite(radiusMM) || radiusMM < 0.01 || radiusMM > 2000) throw new Error("Kugelradius muss zwischen 0.01 und 2000 mm liegen.");
        await initialize();
        return send("createSphere", { radiusMM });
      },
      async createCylinder(radiusMM, heightMM) {
        if (![radiusMM, heightMM].every(value =>
          Number.isFinite(value) && value >= 0.01 && value <= 2000)) {
          throw new Error("Zylinderradius und -höhe müssen zwischen 0.01 und 2000 mm liegen.");
        }
        await initialize();
        return send("createCylinder", { radiusMM, heightMM });
      },
      async createBox(widthMM, depthMM, heightMM) {
        await initialize();
        return send("createBox", { widthMM, depthMM, heightMM });
      },
      async createExtrusion(loops, heightMM) {
        await initialize();
        return send("createExtrusion", { loops, heightMM });
      },
      async booleanOperation(operation, shapeIds, transforms = [[0, 0, 0], [0, 0, 0]]) {
        if (!["fuse", "cut", "common"].includes(operation)) {
          throw new Error("Unbekannte OCCT-Boolean-Operation.");
        }
        if (!Array.isArray(shapeIds) || shapeIds.length !== 2 ||
            shapeIds.some(id => !Number.isInteger(id) || id <= 0) || shapeIds[0] === shapeIds[1]) {
          throw new Error("Eine OCCT-Boolean-Operation benötigt zwei verschiedene Körperkennungen.");
        }
        if (!Array.isArray(transforms) || transforms.length !== 2) {
          throw new Error("OCCT benötigt genau zwei gültige Körpertransformationen.");
        }
        const transformsMM = transforms.map(transform => {
          if (!Array.isArray(transform)) return null;
          if (transform.length === 3) {
            const [x, y, z] = transform;
            return [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z];
          }
          return transform;
        });
        const validMatrix = matrix => {
          if (!Array.isArray(matrix) || matrix.length !== 12 ||
              !matrix.every(Number.isFinite) ||
              matrix.slice(0, 11).some((value, index) => index % 4 !== 3 && Math.abs(value) > 1000) ||
              [matrix[3], matrix[7], matrix[11]].some(value => Math.abs(value) > 200000)) return false;
          const determinant =
            matrix[0] * (matrix[5] * matrix[10] - matrix[6] * matrix[9]) -
            matrix[1] * (matrix[4] * matrix[10] - matrix[6] * matrix[8]) +
            matrix[2] * (matrix[4] * matrix[9] - matrix[5] * matrix[8]);
          return Number.isFinite(determinant) && Math.abs(determinant) > 1e-12;
        };
        if (!transformsMM.every(validMatrix)) {
          throw new Error("OCCT-Transformationen müssen zwei gültige, nicht entartete 3×4-Matrizen in mm enthalten.");
        }
        await initialize();
        return send("booleanOperation", { operation, shapeIds, transformsMM });
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
