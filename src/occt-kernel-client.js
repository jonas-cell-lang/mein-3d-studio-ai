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
      async createTorus(majorRadiusMM, minorRadiusMM) {
        if (![majorRadiusMM, minorRadiusMM].every(value =>
          Number.isFinite(value) && value >= 0.01 && value <= 2000) ||
          majorRadiusMM <= minorRadiusMM) {
          throw new Error("Der grosse Torusradius muss grösser als der kleine Radius sein; beide müssen zwischen 0.01 und 2000 mm liegen.");
        }
        await initialize();
        return send("createTorus", { majorRadiusMM, minorRadiusMM });
      },
      async createCone(radiusMM, heightMM) {
        if (![radiusMM, heightMM].every(value =>
          Number.isFinite(value) && value >= 0.01 && value <= 2000)) {
          throw new Error("Kegelradius und -höhe müssen zwischen 0.01 und 2000 mm liegen.");
        }
        await initialize();
        return send("createCone", { radiusMM, heightMM });
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
      async inspectShape(shapeId) {
        if (!Number.isInteger(shapeId) || shapeId <= 0) {
          throw new Error("Für die Körperprüfung ist eine gültige OCCT-Körperkennung erforderlich.");
        }
        await initialize();
        return send("inspectShape", { shapeId });
      },
      async listSubShapes(shapeId) {
        if (!Number.isInteger(shapeId) || shapeId <= 0) {
          throw new Error("Für die Topologieauswahl ist eine gültige OCCT-Körperkennung erforderlich.");
        }
        await initialize();
        const result = await send("listSubShapes", { shapeId });
        const validEntries = (entries, type) => Array.isArray(entries) && entries.length > 0 &&
          entries.every((entry, index) => entry && entry.index === index &&
            typeof entry.geometryType === "string" && entry.geometryType.length > 0 &&
            (type === "face"
              ? Number.isFinite(entry.areaMM2) && entry.areaMM2 > 0 &&
                Array.isArray(entry.centerMM) && entry.centerMM.length === 3 && entry.centerMM.every(Number.isFinite)
              : Number.isFinite(entry.lengthMM) && entry.lengthMM > 0));
        if (!result || !validEntries(result.face, "face") || !validEntries(result.edge, "edge")) {
          throw new Error("OCCT lieferte ungültige native Flächen- oder Kantendaten.");
        }
        return result;
      },
      async getFaceMeshes(shapeId) {
        if (!Number.isInteger(shapeId) || shapeId <= 0) {
          throw new Error("Für die Flächenauswahl ist eine gültige OCCT-Körperkennung erforderlich.");
        }
        await initialize();
        const result = await send("getFaceMeshes", { shapeId });
        if (!result || !Array.isArray(result.faces) || result.faces.length < 1 || result.faces.length > 10000 ||
            !result.faces.every((face, index) => face && face.index === index &&
              face.mesh && face.mesh.positions instanceof Float32Array &&
              face.mesh.indices instanceof Uint32Array &&
              face.mesh.positions.length >= 9 && face.mesh.positions.length % 3 === 0 &&
              face.mesh.indices.length >= 3 && face.mesh.indices.length % 3 === 0 &&
              Number.isInteger(face.mesh.triangleCount) && face.mesh.triangleCount > 0 &&
              face.mesh.triangleCount <= 250000 &&
              face.mesh.triangleCount === face.mesh.indices.length / 3 &&
              face.mesh.positions.length / 3 <= face.mesh.triangleCount * 3 &&
              face.mesh.positions.every(Number.isFinite) &&
              face.mesh.indices.every(value => value < face.mesh.positions.length / 3)) ||
            !Number.isInteger(result.triangleCount) || result.triangleCount < 1 ||
            result.triangleCount > 250000 ||
            result.triangleCount !== result.faces.reduce((sum, face) => sum + face.mesh.triangleCount, 0)) {
          throw new Error("OCCT lieferte ungültige native Flächen-Netze.");
        }
        return result;
      },
      async getWireframe(shapeId) {
        if (!Number.isInteger(shapeId) || shapeId <= 0) {
          throw new Error("Für die 3D-Kantenauswahl ist eine gültige OCCT-Körperkennung erforderlich.");
        }
        await initialize();
        const result = await send("getWireframe", { shapeId });
        if (!result || !(result.points instanceof Float32Array) ||
            !(result.edgeGroups instanceof Int32Array) ||
            result.points.length % 3 !== 0 || result.edgeGroups.length % 3 !== 0 ||
            result.edgeCount !== result.edgeGroups.length / 3 ||
            !result.points.every(Number.isFinite)) {
          throw new Error("OCCT lieferte ungültige Kantendarstellungsdaten.");
        }
        for (let i = 0; i < result.edgeGroups.length; i += 3) {
          const start = result.edgeGroups[i], count = result.edgeGroups[i + 1], edgeIndex = result.edgeGroups[i + 2];
          if (!Number.isInteger(start) || start < 0 || start % 3 !== 0 ||
              !Number.isInteger(count) || count < 6 || count % 3 !== 0 ||
              start + count > result.points.length ||
              !Number.isInteger(edgeIndex) || edgeIndex < 0) {
            throw new Error("OCCT lieferte eine ungültige native Kanten-Polyline.");
          }
        }
        return result;
      },
      async filletEdges(shapeId, edgeIndices, radiusMM) {
        const validRadius = value => Number.isFinite(value) && value >= 0.01 && value <= 2000;
        const validRadii = typeof radiusMM === "number"
          ? validRadius(radiusMM)
          : Array.isArray(radiusMM) && radiusMM.length === edgeIndices?.length &&
            radiusMM.every(value => value && validRadius(value.start) && validRadius(value.end));
        if (!Number.isInteger(shapeId) || shapeId <= 0 ||
            !Array.isArray(edgeIndices) || edgeIndices.length < 1 || edgeIndices.length > 12 ||
            !edgeIndices.every(index => Number.isInteger(index) && index >= 0) ||
            new Set(edgeIndices).size !== edgeIndices.length || !validRadii) {
          throw new Error("Kantenrundung benötigt gültige Kantenindizes und Radien von 0,01 bis 2000 mm je Kante.");
        }
        await initialize();
        const result = await send("filletEdges", { shapeId, edgeIndices, radiusMM });
        const mesh = result?.mesh;
        if (!Number.isInteger(result?.shapeId) || result.shapeId <= 0 ||
            !Number.isFinite(result.volumeMM3) || result.volumeMM3 <= 0 ||
            !mesh || !(mesh.positions instanceof Float32Array) ||
            !(mesh.indices instanceof Uint32Array) ||
            mesh.positions.length < 9 || mesh.positions.length % 3 !== 0 ||
            mesh.indices.length < 3 || mesh.indices.length % 3 !== 0 ||
            !mesh.positions.every(Number.isFinite) ||
            !mesh.indices.every(index => index < mesh.positions.length / 3) ||
            mesh.triangleCount !== mesh.indices.length / 3) {
          throw new Error("OCCT lieferte ein ungültiges Ergebnis der Kantenrundung.");
        }
        return result;
      },
      async chamferEdges(shapeId, edgeIndices, distanceMM) {
        if (!Number.isInteger(shapeId) || shapeId <= 0 ||
            !Array.isArray(edgeIndices) || edgeIndices.length < 1 || edgeIndices.length > 12 ||
            !edgeIndices.every(index => Number.isInteger(index) && index >= 0) ||
            new Set(edgeIndices).size !== edgeIndices.length ||
            !Number.isFinite(distanceMM) || distanceMM < 0.01 || distanceMM > 2000) {
          throw new Error("Kantenfase benötigt gültige, eindeutige Kantenindizes und einen Abstand von 0,01 bis 2000 mm.");
        }
        await initialize();
        const result = await send("chamferEdges", { shapeId, edgeIndices, distanceMM });
        const mesh = result?.mesh;
        if (!Number.isInteger(result?.shapeId) || result.shapeId <= 0 ||
            !Number.isFinite(result.volumeMM3) || result.volumeMM3 <= 0 ||
            !mesh || !(mesh.positions instanceof Float32Array) ||
            !(mesh.indices instanceof Uint32Array) ||
            mesh.positions.length < 9 || mesh.positions.length % 3 !== 0 ||
            mesh.indices.length < 3 || mesh.indices.length % 3 !== 0 ||
            !mesh.positions.every(Number.isFinite) ||
            !mesh.indices.every(index => index < mesh.positions.length / 3) ||
            mesh.triangleCount !== mesh.indices.length / 3) {
          throw new Error("OCCT lieferte ein ungültiges Ergebnis der Kantenfase.");
        }
        return result;
      },
      async draftFaces(shapeId, faceIndices, angleDeg, direction, neutralPlane) {
        const validVector = value => value && [value.x, value.y, value.z].every(Number.isFinite) &&
          Math.hypot(value.x, value.y, value.z) > 1e-9;
        if (!Number.isInteger(shapeId) || shapeId <= 0 ||
            !Array.isArray(faceIndices) || faceIndices.length < 1 || faceIndices.length > 12 ||
            !faceIndices.every(index => Number.isInteger(index) && index >= 0) ||
            new Set(faceIndices).size !== faceIndices.length ||
            !Number.isFinite(angleDeg) || Math.abs(angleDeg) < 0.1 || Math.abs(angleDeg) > 20 ||
            !validVector(direction) ||
            !neutralPlane?.origin || ![neutralPlane.origin.x, neutralPlane.origin.y, neutralPlane.origin.z].every(Number.isFinite) ||
            !validVector(neutralPlane?.normal)) {
          throw new Error("Flächenneigung benötigt eindeutige Flächen, einen Winkel von 0,1 bis 20 Grad sowie gültige Richtungs- und Neutralebenenvektoren.");
        }
        await initialize();
        const result = await send("draftFaces", { shapeId, faceIndices, angleDeg, direction, neutralPlane });
        const mesh = result?.mesh;
        if (!Number.isInteger(result?.shapeId) || result.shapeId <= 0 ||
            !Number.isFinite(result.volumeMM3) || result.volumeMM3 <= 0 ||
            !mesh || !(mesh.positions instanceof Float32Array) ||
            !(mesh.indices instanceof Uint32Array) ||
            mesh.positions.length < 9 || mesh.positions.length % 3 !== 0 ||
            mesh.indices.length < 3 || mesh.indices.length % 3 !== 0 ||
            !mesh.positions.every(Number.isFinite) ||
            !mesh.indices.every(index => index < mesh.positions.length / 3) ||
            mesh.triangleCount !== mesh.indices.length / 3) {
          throw new Error("OCCT lieferte ein ungültiges Ergebnis der Flächenneigung.");
        }
        return result;
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
