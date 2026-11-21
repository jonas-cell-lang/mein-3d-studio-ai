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

  if (method === "createTorus") {
    const { majorRadiusMM, minorRadiusMM } = args;
    if (![majorRadiusMM, minorRadiusMM].every(value => Number.isFinite(value) && value >= 0.01 && value <= 2000) ||
        majorRadiusMM <= minorRadiusMM) {
      throw new Error("Der grosse Torusradius muss grösser als der kleine Radius sein; beide müssen zwischen 0.01 und 2000 mm liegen.");
    }
    let shape = null;
    try {
      shape = kernel.makeTorus(majorRadiusMM, minorRadiusMM);
      const volumeMM3 = kernel.getVolume(shape);
      const mesh = serializeMesh(kernel.tessellate(shape));
      if (!Number.isFinite(volumeMM3) || volumeMM3 <= 0) throw new Error("OCCT-Torus besitzt kein gültiges positives Volumen.");
      const shapeId = nextShapeId++;
      shapes.set(shapeId, shape);
      shape = null;
      return { shapeId, volumeMM3, mesh, shapeType: "solid" };
    } finally {
      if (shape !== null) { try { kernel.release(shape); } catch { /* best effort cleanup */ } }
    }
  }

  if (method === "createCone") {
    const { radiusMM, heightMM } = args;
    if (![radiusMM, heightMM].every(value => Number.isFinite(value) && value >= 0.01 && value <= 2000)) {
      throw new Error("Kegelradius und -höhe müssen zwischen 0.01 und 2000 mm liegen.");
    }
    let shape = null;
    try {
      shape = kernel.makeCone(radiusMM, 0, heightMM);
      const volumeMM3 = kernel.getVolume(shape);
      const mesh = serializeMesh(kernel.tessellate(shape));
      if (!Number.isFinite(volumeMM3) || volumeMM3 <= 0) {
        throw new Error("OCCT-Kegel besitzt kein gültiges positives Volumen.");
      }
      const shapeId = nextShapeId++;
      shapes.set(shapeId, shape);
      shape = null;
      return { shapeId, volumeMM3, mesh, shapeType: "solid" };
    } finally {
      if (shape !== null) { try { kernel.release(shape); } catch { /* best effort cleanup */ } }
    }
  }

  if (method === "createSphere") {
    const { radiusMM } = args;
    if (!Number.isFinite(radiusMM) || radiusMM < 0.01 || radiusMM > 2000) throw new Error("Kugelradius muss zwischen 0.01 und 2000 mm liegen.");
    let shape = null;
    try {
      shape = kernel.makeSphere(radiusMM);
      const volumeMM3 = kernel.getVolume(shape);
      const mesh = serializeMesh(kernel.tessellate(shape));
      if (!Number.isFinite(volumeMM3) || volumeMM3 <= 0) throw new Error("OCCT-Kugel besitzt kein gültiges positives Volumen.");
      const shapeId = nextShapeId++;
      shapes.set(shapeId, shape);
      shape = null;
      return { shapeId, volumeMM3, mesh, shapeType: "solid" };
    } finally {
      if (shape !== null) { try { kernel.release(shape); } catch { /* best effort cleanup */ } }
    }
  }

  if (method === "createCylinder") {
    const { radiusMM, heightMM } = args;
    if (!Number.isFinite(radiusMM) || radiusMM < 0.01 || radiusMM > 2000 ||
        !Number.isFinite(heightMM) || heightMM < 0.01 || heightMM > 2000) {
      throw new Error("Zylinderradius und -höhe müssen zwischen 0.01 und 2000 mm liegen.");
    }
    let shape = null;
    try {
      shape = kernel.makeCylinder(radiusMM, heightMM);
      const volumeMM3 = kernel.getVolume(shape);
      const mesh = serializeMesh(kernel.tessellate(shape));
      if (!Number.isFinite(volumeMM3) || volumeMM3 <= 0) {
        throw new Error("OCCT-Zylinder besitzt kein gültiges positives Volumen.");
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

  if (method === "inspectShape") {
    const shape = shapes.get(args.shapeId);
    if (!shape) throw new Error("OCCT-Körperkennung ist unbekannt oder wurde freigegeben.");

    // Diese Kennzahlen stammen direkt aus der nativen B-Rep-Topologie.
    // Anders als die Mesh-Daten unten werden sie nicht aus Dreiecken geschätzt.
    const shapeType = kernel.getShapeType(shape);
    const topology = Object.fromEntries(
      ["solid", "shell", "face", "wire", "edge", "vertex"].map(type =>
        [type, kernel.subShapeCount(shape, type)]
      )
    );
    const volumeMM3 = kernel.getVolume(shape);
    const surfaceAreaMM2 = kernel.getSurfaceArea(shape);
    const centerOfMass = kernel.getCenterOfMass(shape);
    const nativeBounds = kernel.getBoundingBox(shape, { precise: true, useTriangulation: false });
    const min = [nativeBounds.xmin, nativeBounds.ymin, nativeBounds.zmin];
    const max = [nativeBounds.xmax, nativeBounds.ymax, nativeBounds.zmax];
    const size = max.map((value, axis) => value - min[axis]);
    const center = max.map((value, axis) => (value + min[axis]) / 2);
    const centerOfMassMM = [centerOfMass.x, centerOfMass.y, centerOfMass.z];

    const mesh = serializeMesh(kernel.tessellate(shape));
    const positions = mesh.positions;
    if (positions.length < 9 || positions.length % 3 !== 0 ||
        !Array.from(positions).every(Number.isFinite)) {
      throw new Error("OCCT-Körper besitzt keine gültigen 3D-Darstellungskoordinaten.");
    }
    const topologyValues = Object.values(topology);
    if (!Number.isFinite(volumeMM3) || volumeMM3 <= 0 ||
        !Number.isFinite(surfaceAreaMM2) || surfaceAreaMM2 <= 0 ||
        ![...min, ...max, ...size, ...center, ...centerOfMassMM].every(Number.isFinite) ||
        !topologyValues.every(value => Number.isInteger(value) && value >= 0) ||
        topology.face < 1 || topology.edge < 1 || topology.vertex < 1) {
      throw new Error("OCCT-Körperprüfung lieferte ungültige native Geometrie- oder Topologiedaten.");
    }
    return {
      shapeId: args.shapeId, shapeType, volumeMM3, surfaceAreaMM2,
      centerOfMassMM, topology,
      mesh: { vertexCount: positions.length / 3, triangleCount: mesh.triangleCount, indexCount: mesh.indices.length },
      boundingBoxMM: { min, max, size, center, source: "native-brep" }
    };
  }

  if (method === "listSubShapes") {
    const shape = shapes.get(args.shapeId);
    if (!shape) throw new Error("OCCT-Körperkennung ist unbekannt oder wurde freigegeben.");
    const requestedTypes = ["face", "edge"];
    const result = {};
    for (const type of requestedTypes) {
      const handles = kernel.getSubShapes(shape, type);
      try {
        if (!Array.isArray(handles) || handles.length < 1 || handles.length > 100000) {
          throw new Error("OCCT lieferte eine ungültige Anzahl nativer " + (type === "face" ? "Flächen." : "Kanten."));
        }
        result[type] = handles.map((handle, index) => {
          const geometryType = type === "face" ? kernel.surfaceType(handle) : kernel.curveType(handle);
          if (typeof geometryType !== "string" || geometryType.length === 0) {
            throw new Error("OCCT lieferte einen ungültigen nativen Geometrietyp.");
          }
          if (type === "face") {
            const areaMM2 = kernel.getSurfaceArea(handle);
            if (!Number.isFinite(areaMM2) || areaMM2 <= 0) {
              throw new Error("OCCT lieferte eine ungültige native Flächenfläche.");
            }
            return { index, geometryType, areaMM2 };
          }
          const lengthMM = kernel.curveLength(handle);
          if (!Number.isFinite(lengthMM) || lengthMM <= 0) {
            throw new Error("OCCT lieferte eine ungültige native Kantenlänge.");
          }
          return { index, geometryType, lengthMM };
        });
      } finally {
        for (const handle of handles) {
          try { kernel.release(handle); } catch { /* best effort cleanup */ }
        }
      }
    }
    return result;
  }

  if (method === "getFaceMeshes") {
    const shape = shapes.get(args.shapeId);
    if (!shape) throw new Error("OCCT-Körperkennung ist unbekannt oder wurde freigegeben.");
    const faces = kernel.getSubShapes(shape, "face");
    try {
      if (!Array.isArray(faces) || faces.length < 1 || faces.length > 10000) {
        throw new Error("OCCT lieferte eine ungültige Anzahl nativer Flächen.");
      }
      const result = faces.map((face, index) => {
        const mesh = serializeMesh(kernel.tessellate(face));
        return { index, mesh };
      });
      return { faces: result };
    } finally {
      for (const face of faces) {
        try { kernel.release(face); } catch { /* best effort cleanup */ }
      }
    }
  }

  if (method === "getWireframe") {
    const shape = shapes.get(args.shapeId);
    if (!shape) throw new Error("OCCT-Körperkennung ist unbekannt oder wurde freigegeben.");
    const edges = kernel.getSubShapes(shape, "edge");
    try {
      const indexByHash = new Map(edges.map((edge, index) => [
        kernel.hashCode(edge, 2147483647), index
      ]));
      const wireframe = kernel.wireframe(shape, {
        source: "triangulation",
        deflection: 0.05
      });
      const groups = new Int32Array(wireframe.edgeCount * 3);
      for (let i = 0; i < wireframe.edgeCount; i++) {
        const start = i * 3;
        const edgeIndex = indexByHash.get(wireframe.edgeGroups[start + 2]);
        if (!Number.isInteger(edgeIndex)) {
          throw new Error("Eine dargestellte OCCT-Kante konnte keiner nativen Kantenkennung zugeordnet werden.");
        }
        groups[start] = wireframe.edgeGroups[start];
        groups[start + 1] = wireframe.edgeGroups[start + 1];
        groups[start + 2] = edgeIndex;
      }
      return {
        points: new Float32Array(wireframe.points),
        edgeGroups: groups,
        edgeCount: wireframe.edgeCount
      };
    } finally {
      for (const edge of edges) {
        try { kernel.release(edge); } catch { /* best effort cleanup */ }
      }
    }
  }

  if (method === "filletEdges") {
    const { shapeId, edgeIndices, radiusMM } = args;
    const shape = shapes.get(shapeId);
    if (!shape) throw new Error("OCCT-Körperkennung ist unbekannt oder wurde freigegeben.");
    const validRadius = value => Number.isFinite(value) && value >= 0.01 && value <= 2000;
    const validRadii = typeof radiusMM === "number"
      ? validRadius(radiusMM)
      : Array.isArray(radiusMM) && radiusMM.length === edgeIndices.length &&
        radiusMM.every(value => value && validRadius(value.start) && validRadius(value.end));
    if (!Array.isArray(edgeIndices) || edgeIndices.length < 1 || edgeIndices.length > 12 ||
        !edgeIndices.every(index => Number.isInteger(index) && index >= 0) ||
        new Set(edgeIndices).size !== edgeIndices.length || !validRadii) {
      throw new Error("Kantenrundung benötigt eindeutige Kantenindizes und Radien von 0,01 bis 2000 mm je Kante.");
    }
    if (kernel.getShapeType(shape) !== "solid") {
      throw new Error("Kantenrundung ist nur für einen einzelnen OCCT-Solid verfügbar.");
    }
    const edges = kernel.getSubShapes(shape, "edge");
    let resultShape = null;
    try {
      if (edgeIndices.some(index => index >= edges.length)) {
        throw new Error("Mindestens ein ausgewählter Kantenindex liegt ausserhalb des Körpers.");
      }
      const selectedEdges = edgeIndices.map(index => edges[index]);
      resultShape = kernel.fillet(shape, selectedEdges, radiusMM);
      const volumeMM3 = kernel.getVolume(resultShape);
      const mesh = serializeMesh(kernel.tessellate(resultShape));
      const positions = mesh.positions;
      const indices = mesh.indices;
      if (!Number.isFinite(volumeMM3) || volumeMM3 <= 0 ||
          !kernel.isValid(resultShape) ||
          positions.length < 9 || positions.length % 3 !== 0 ||
          !Array.from(positions).every(Number.isFinite) ||
          indices.length < 3 || indices.length % 3 !== 0 ||
          !Array.from(indices).every(index => Number.isInteger(index) && index >= 0 && index < positions.length / 3) ||
          mesh.triangleCount !== indices.length / 3) {
        throw new Error("OCCT-Kantenrundung lieferte keinen gültigen Solid mit positivem Volumen und gültigem Dreiecksnetz.");
      }
      const resultId = nextShapeId++;
      shapes.set(resultId, resultShape);
      resultShape = null;
      return { shapeId: resultId, volumeMM3, mesh, operation: "fillet", edgeIndices, radiusMM };
    } finally {
      if (resultShape !== null) {
        try { kernel.release(resultShape); } catch { /* best effort cleanup */ }
      }
      for (const edge of edges) {
        try { kernel.release(edge); } catch { /* best effort cleanup */ }
      }
    }
  }

  if (method === "chamferEdges") {
    const { shapeId, edgeIndices, distanceMM } = args;
    const shape = shapes.get(shapeId);
    if (!shape) throw new Error("OCCT-Körperkennung ist unbekannt oder wurde freigegeben.");
    if (!Array.isArray(edgeIndices) || edgeIndices.length < 1 || edgeIndices.length > 12 ||
        !edgeIndices.every(index => Number.isInteger(index) && index >= 0) ||
        new Set(edgeIndices).size !== edgeIndices.length ||
        !Number.isFinite(distanceMM) || distanceMM < 0.01 || distanceMM > 2000) {
      throw new Error("Kantenfase benötigt eindeutige Kantenindizes und einen Abstand von 0,01 bis 2000 mm.");
    }
    if (kernel.getShapeType(shape) !== "solid") {
      throw new Error("Kantenfase ist nur für einen einzelnen OCCT-Solid verfügbar.");
    }
    const edges = kernel.getSubShapes(shape, "edge");
    let resultShape = null;
    try {
      if (edgeIndices.some(index => index >= edges.length)) {
        throw new Error("Mindestens ein ausgewählter Kantenindex liegt ausserhalb des Körpers.");
      }
      const selectedEdges = edgeIndices.map(index => edges[index]);
      resultShape = kernel.chamfer(shape, selectedEdges, distanceMM);
      const volumeMM3 = kernel.getVolume(resultShape);
      const mesh = serializeMesh(kernel.tessellate(resultShape));
      const positions = mesh.positions;
      const indices = mesh.indices;
      if (!Number.isFinite(volumeMM3) || volumeMM3 <= 0 ||
          !kernel.isValid(resultShape) ||
          positions.length < 9 || positions.length % 3 !== 0 ||
          !Array.from(positions).every(Number.isFinite) ||
          indices.length < 3 || indices.length % 3 !== 0 ||
          !Array.from(indices).every(index => Number.isInteger(index) && index >= 0 && index < positions.length / 3) ||
          mesh.triangleCount !== indices.length / 3) {
        throw new Error("OCCT-Kantenfase lieferte keinen gültigen Solid mit positivem Volumen und gültigem Dreiecksnetz.");
      }
      const resultId = nextShapeId++;
      shapes.set(resultId, resultShape);
      resultShape = null;
      return { shapeId: resultId, volumeMM3, mesh, operation: "chamfer", edgeIndices, distanceMM };
    } finally {
      if (resultShape !== null) {
        try { kernel.release(resultShape); } catch { /* best effort cleanup */ }
      }
      for (const edge of edges) {
        try { kernel.release(edge); } catch { /* best effort cleanup */ }
      }
    }
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

// OCCT/WASM-Kernel-Aufrufe werden bewusst serialisiert. Worker-Message-
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
