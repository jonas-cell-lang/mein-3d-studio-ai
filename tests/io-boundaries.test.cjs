const test = require('node:test');
const assert = require('node:assert/strict');
const THREE = require('three');
const schema = require('../src/project-schema.js');
const units = require('../src/units.js');
const tolerances = require('../src/tolerances.js');

globalThis.THREE = THREE;
globalThis.SILMOProjectSchema = schema;
const projectGeometry = require('../src/project-geometry.js');
globalThis.SILMOProjectGeometry = projectGeometry;
globalThis.SILMOUnits = units;
globalThis.SILMOTolerances = tolerances;

const projectIO = require('../src/project-io.js');
const stlIO = require('../src/stl-io.js');
const stlDiagnostics = stlIO.createSTLIO({
  getObjects: () => [],
  addObject: () => {},
  selectObject: () => {},
  setStatus: () => {}
});

class FakeFileReader {
  readAsText(file) {
    if (file.throwRead) throw new Error('simulierter Lesefehler');
    this.result = file.text;
    if (this.onload) this.onload();
  }

  readAsArrayBuffer(file) {
    if (file.throwRead) throw new Error('simulierter Lesefehler');
    this.result = file.buffer;
    if (this.onload) this.onload();
  }
}

function withBrowserGlobals(run) {
  const previous = {
    FileReader: globalThis.FileReader,
    document: globalThis.document,
    createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL,
    setTimeout: globalThis.setTimeout
  };
  const downloads = [];
  globalThis.FileReader = FakeFileReader;
  globalThis.document = {
    body: { appendChild(link) { downloads.push(link); } },
    createElement() {
      return { click() { this.clicked = true; }, remove() { this.removed = true; } };
    }
  };
  URL.createObjectURL = blob => {
    downloads.push(blob);
    return 'blob:silmo-test';
  };
  URL.revokeObjectURL = () => {};
  globalThis.setTimeout = () => 0;
  try {
    return run(downloads);
  } finally {
    globalThis.FileReader = previous.FileReader;
    globalThis.document = previous.document;
    URL.createObjectURL = previous.createObjectURL;
    URL.revokeObjectURL = previous.revokeObjectURL;
    globalThis.setTimeout = previous.setTimeout;
  }
}

function makeProjectDependencies(overrides = {}) {
  const state = { objects: [], committed: null, status: '', input: { value: 'selected-file' } };
  const deps = {
    getObjects: () => state.objects,
    getBedWidthMM: () => 220,
    getBedDepthMM: () => 220,
    getUniform: () => true,
    commitProject: (project, objects) => { state.committed = { project, objects }; state.objects = objects; },
    setStatus: value => { state.status = value; },
    getProjectFileInput: () => state.input,
    ...overrides
  };
  return { state, deps };
}

function makeProjectItem(id = 'test-object', position = [0, 0, 0]) {
  const geometry = new THREE.BoxGeometry(2, 4, 6);
  const item = {
    objectId: id,
    label: 'Testkörper',
    position,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: '#336699',
    geometry: projectGeometry.serializeGeometry(geometry)
  };
  geometry.dispose();
  return item;
}

function makeTriangleGeometry(points = [0, 0, 0, 10, 0, 0, 0, 10, 0]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

function makeGeometryFromTriangles(triangles) {
  const points = triangles.flat(2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

const cubeTriangles = [
  [[0,0,0],[0,10,0],[10,10,0]], [[0,0,0],[10,10,0],[10,0,0]],
  [[0,0,10],[10,0,10],[10,10,10]], [[0,0,10],[10,10,10],[0,10,10]],
  [[0,0,0],[10,0,0],[10,0,10]], [[0,0,0],[10,0,10],[0,0,10]],
  [[0,10,0],[10,10,10],[10,10,0]], [[0,10,0],[0,10,10],[10,10,10]],
  [[0,0,0],[0,0,10],[0,10,10]], [[0,0,0],[0,10,10],[0,10,0]],
  [[10,0,0],[10,10,10],[10,0,10]], [[10,0,0],[10,10,0],[10,10,10]]
];

test('Projektdatei-Export validiert den Inhalt vor dem Download', () => {
  withBrowserGlobals(downloads => {
    const { state, deps } = makeProjectDependencies();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6), new THREE.MeshStandardMaterial({ color: 0x336699 }));
    mesh.userData.label = 'Testkörper';
    state.objects = [mesh];
    const io = projectIO.createProjectIO(deps);
    io.saveProject();
    const blob = downloads.find(item => item instanceof Blob);
    assert.ok(blob, 'gültiges Projekt wurde nicht zum Download vorbereitet');
    assert.equal(blob.type, 'application/json');
    assert.match(state.status, /Vollständiges Projekt gespeichert/);
    return blob.text().then(text => {
      const saved = JSON.parse(text);
      assert.equal(schema.validateProjectEnvelope(saved), saved);
      assert.equal(saved.objects.length, 1);
      assert.equal(saved.objects[0].label, 'Testkörper');
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
  });
});

test('Projektdatei-Export lädt kein Projekt herunter, das das Importlimit überschreitet', () => {
  withBrowserGlobals(downloads => {
    const oversizedObjects = Array.from({ length: 101 }, (_, index) => ({
      uuid: 'object-' + index, userData: {}, position: new THREE.Vector3(),
      rotation: new THREE.Euler(), scale: new THREE.Vector3(1, 1, 1),
      material: new THREE.MeshStandardMaterial(), geometry: new THREE.BoxGeometry()
    }));
    const { state, deps } = makeProjectDependencies({ getObjects: () => oversizedObjects });
    projectIO.createProjectIO(deps).saveProject();
    assert.equal(downloads.length, 0);
    assert.match(state.status, /nicht gespeichert/);
    oversizedObjects.forEach(object => { object.geometry.dispose(); object.material.dispose(); });
  });
});

test('Projektdatei-Import baut alle Meshes auf, bevor das bestehende Projekt ersetzt wird', () => {
  withBrowserGlobals(() => {
    const { state, deps } = makeProjectDependencies();
    const project = {
      app: 'SILMO 3D Studio AI', version: 3,
      objects: [makeProjectItem('roundtrip-object', [1, 2, 3])]
    };
    projectIO.createProjectIO(deps).openProjectFile({
      size: Buffer.byteLength(JSON.stringify(project)),
      text: JSON.stringify(project)
    });
    assert.ok(state.committed, 'gültiges Projekt wurde nicht übernommen');
    assert.equal(state.committed.objects.length, 1);
    assert.equal(state.committed.objects[0].uuid, 'roundtrip-object');
    assert.deepEqual(state.committed.objects[0].position.toArray(), [1, 2, 3]);
    assert.match(state.status, /Projekt geöffnet/);
    assert.equal(state.input.value, '');
    state.committed.objects.forEach(object => {
      object.geometry.dispose();
      object.material.dispose();
    });
  });
});

test('Fehler beim Aufbau eines späteren Projektobjekts lassen den Commit aus und geben frühere Meshes frei', () => {
  withBrowserGlobals(() => {
    const { state, deps } = makeProjectDependencies();
    const project = {
      app: 'SILMO 3D Studio AI', version: 3,
      objects: [
        makeProjectItem('first-object'),
        makeProjectItem('invalid-transform', [NaN, 0, 0])
      ]
    };
    let disposeCalls = 0;
    const originalDispose = THREE.BufferGeometry.prototype.dispose;
    THREE.BufferGeometry.prototype.dispose = function () {
      disposeCalls += 1;
      return originalDispose.call(this);
    };
    try {
      projectIO.createProjectIO(deps).openProjectFile({
        size: Buffer.byteLength(JSON.stringify(project)),
        text: JSON.stringify(project)
      });
    } finally {
      THREE.BufferGeometry.prototype.dispose = originalDispose;
    }
    assert.equal(state.committed, null);
    assert.ok(disposeCalls >= 2, 'bereits aufgebaute und fehlerhafte Geometrien wurden nicht freigegeben');
    assert.match(state.status, /Ungültige Objektposition/);
  });
});

test('Projektdatei-Import weist ungültige und übergrosse Dateigrössen vor dem Lesen ab', () => {
  withBrowserGlobals(() => {
    const { state, deps } = makeProjectDependencies();
    projectIO.createProjectIO(deps).openProjectFile({ size: 25 * 1024 * 1024 + 1, text: '{}' });
    assert.equal(state.committed, null);
    assert.match(state.status, /maximal 25 MB/);
    assert.equal(state.input.value, '');
  });
});

test('STL-Import rechnet Millimeter um, zentriert das Modell und erhält vorhandene Objekte', () => {
  withBrowserGlobals(() => {
    const existing = { id: 'existing' };
    const state = { objects: [existing], added: null, selected: null, status: '' };
    THREE.STLLoader = class { parse() { return makeTriangleGeometry(); } };
    const io = stlIO.createSTLIO({
      getObjects: () => state.objects,
      addObject: object => { state.added = object; state.objects.push(object); },
      selectObject: object => { state.selected = object; },
      setStatus: value => { state.status = value; }
    });
    io.importSTLFile({
      name: 'test.stl', type: 'model/stl', size: 84,
      buffer: new ArrayBuffer(84)
    });
    assert.ok(state.added);
    assert.equal(state.objects[0], existing);
    assert.equal(state.selected, state.added);
    assert.ok(Math.abs(state.added.geometry.boundingBox.max.x - 0.5) < 1e-6);
    assert.ok(Math.abs(state.added.geometry.boundingBox.min.x + 0.5) < 1e-6);
    assert.ok(Math.abs(state.added.geometry.boundingBox.min.z) < 1e-6);
    assert.match(state.status, /importiert/);
    state.added.geometry.dispose();
    state.added.material.dispose();
  });
});

test('STL-Import weist Nullflächen-Dreiecke ab und verändert keine vorhandenen Modelle', () => {
  withBrowserGlobals(() => {
    const existing = { id: 'existing' };
    const state = { objects: [existing], status: '' };
    THREE.STLLoader = class { parse() { return makeTriangleGeometry([0,0,0, 1,1,1, 2,2,2]); } };
    stlIO.createSTLIO({
      getObjects: () => state.objects,
      addObject: object => state.objects.push(object),
      selectObject: () => {},
      setStatus: value => { state.status = value; }
    }).importSTLFile({ name: 'broken.stl', type: 'model/stl', size: 84, buffer: new ArrayBuffer(84) });
    assert.deepEqual(state.objects, [existing]);
    assert.match(state.status, /entartetes Dreieck/);
  });
});

test('STL-Import begrenzt die Dreiecksanzahl zusätzlich zur Dateigrösse', () => {
  withBrowserGlobals(() => {
    const state = { objects: [], status: '' };
    let disposed = false;
    THREE.STLLoader = class {
      parse() {
        return {
          attributes: { position: {
            itemSize: 3, count: 1500003,
            array: { length: 4500009, every: () => true },
            getX: () => 0, getY: () => 0, getZ: () => 0
          } },
          dispose() { disposed = true; }
        };
      }
    };
    stlIO.createSTLIO({
      getObjects: () => state.objects,
      addObject: object => state.objects.push(object),
      selectObject: () => {},
      setStatus: value => { state.status = value; }
    }).importSTLFile({ name: 'huge.stl', type: 'model/stl', size: 100, buffer: new ArrayBuffer(84) });
    assert.equal(state.objects.length, 0);
    assert.equal(disposed, true);
    assert.match(state.status, /500000 Dreiecken/);
  });
});

test('STL-Export rechnet Kopien in Millimeter um und verändert das Original nicht', () => {
  withBrowserGlobals(downloads => {
    const geometry = new THREE.BoxGeometry(2, 4, 6);
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(1, 2, 3);
    const originalPosition = Array.from(geometry.attributes.position.array);
    let exportedScene = null;
    let exportedText = null;
    THREE.STLExporter = class {
      parse(scene, options) {
        exportedScene = scene;
        exportedText = options;
        return 'solid silmo-test\nendsolid silmo-test';
      }
    };
    const state = { status: '' };
    stlIO.createSTLIO({
      getObjects: () => [mesh],
      addObject: () => {},
      selectObject: () => {},
      setStatus: value => { state.status = value; }
    }).exportSTL();
    assert.ok(exportedScene);
    assert.deepEqual(exportedText, { binary: false });
    assert.equal(exportedScene.children[0].position.x, 10);
    assert.deepEqual(Array.from(geometry.attributes.position.array), originalPosition);
    assert.match(state.status, /STL exportiert/);
    const blob = downloads.find(item => item instanceof Blob);
    assert.ok(blob);
    geometry.dispose();
    material.dispose();
  });
});

test('STL-Export weist ungültige Drehungen zurück', () => {
  withBrowserGlobals(() => {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.rotation.x = NaN;
    const state = { status: '' };
    let exporterCalled = false;
    THREE.STLExporter = class { parse() { exporterCalled = true; return 'solid x\nendsolid x'; } };
    stlIO.createSTLIO({
      getObjects: () => [mesh],
      addObject: () => {},
      selectObject: () => {},
      setStatus: value => { state.status = value; }
    }).exportSTL();
    assert.equal(exporterCalled, false);
    assert.match(state.status, /Ungültige oder zu umfangreiche Geometrie/);
    geometry.dispose();
    mesh.material.dispose();
  });
});


test('STL-Topologie erkennt einen geschlossenen 10-mm-Würfel mit korrektem Volumen', () => {
  const geometry = makeGeometryFromTriangles(cubeTriangles);
  const result = stlDiagnostics.analyzeSTLGeometry(geometry);
  assert.equal(result.analyzed, true);
  assert.equal(result.triangleCount, 12);
  assert.equal(result.weldedVertexCount, 8);
  assert.equal(result.boundaryEdgeCount, 0);
  assert.equal(result.nonManifoldEdgeCount, 0);
  assert.equal(result.inconsistentEdgeCount, 0);
  assert.equal(result.duplicateTriangleCount, 0);
  assert.equal(result.isClosedEdgeManifold, true);
  assert.equal(result.invertedWinding, false);
  assert.ok(Math.abs(result.signedVolumeMM3 - 1000) < 1e-5);
  geometry.dispose();
});

test('STL-Topologie meldet offene Dreiecksnetze, blockiert sie aber nicht', () => {
  const geometry = makeGeometryFromTriangles([[[0,0,0],[10,0,0],[0,10,0]]]);
  const result = stlDiagnostics.analyzeSTLGeometry(geometry);
  assert.equal(result.isClosedEdgeManifold, false);
  assert.equal(result.boundaryEdgeCount, 3);
  assert.equal(result.nonManifoldEdgeCount, 0);
  geometry.dispose();
});

test('STL-Topologie erkennt doppelte Dreiecke', () => {
  const geometry = makeGeometryFromTriangles([...cubeTriangles, cubeTriangles[0]]);
  const result = stlDiagnostics.analyzeSTLGeometry(geometry);
  assert.equal(result.duplicateTriangleCount, 1);
  assert.equal(result.isClosedEdgeManifold, false);
  geometry.dispose();
});

test('STL-Topologie erkennt nicht-manifold Kanten mit mehr als zwei Flächen', () => {
  const geometry = makeGeometryFromTriangles([
    [[0,0,0],[1,0,0],[0,1,0]],
    [[1,0,0],[0,0,0],[0,-1,0]],
    [[0,0,0],[1,0,0],[0,0,1]]
  ]);
  const result = stlDiagnostics.analyzeSTLGeometry(geometry);
  assert.ok(result.nonManifoldEdgeCount >= 1);
  assert.equal(result.isClosedEdgeManifold, false);
  geometry.dispose();
});

test('STL-Topologie erkennt lokal widersprüchliche Dreiecksorientierung', () => {
  const altered = cubeTriangles.map(triangle => triangle.map(point => point.slice()));
  [altered[0][1], altered[0][2]] = [altered[0][2], altered[0][1]];
  const geometry = makeGeometryFromTriangles(altered);
  const result = stlDiagnostics.analyzeSTLGeometry(geometry);
  assert.ok(result.inconsistentEdgeCount > 0);
  assert.equal(result.isClosedEdgeManifold, false);
  geometry.dispose();
});

test('STL-Topologie erkennt global umgekehrte Orientierung eines geschlossenen Körpers', () => {
  const reversed = cubeTriangles.map(triangle => [triangle[0], triangle[2], triangle[1]]);
  const geometry = makeGeometryFromTriangles(reversed);
  const result = stlDiagnostics.analyzeSTLGeometry(geometry);
  assert.equal(result.isClosedEdgeManifold, true);
  assert.equal(result.invertedWinding, true);
  assert.ok(result.signedVolumeMM3 < 0);
  geometry.dispose();
});

test('STL-Topologie überspringt grosse Netze kontrolliert statt den Import zu blockieren', () => {
  const geometry = {
    attributes: { position: { itemSize: 3, count: 300003 } }
  };
  const result = stlDiagnostics.analyzeSTLGeometry(geometry);
  assert.equal(result.analyzed, false);
  assert.equal(result.reason, 'limit');
  assert.equal(result.triangleCount, 100001);
  assert.equal(result.maxTriangles, 100000);
});

test('Projektdatei öffnet ein grosses indiziertes Mesh verlustfrei über den vollständigen Datei-I/O-Pfad', () => {
  withBrowserGlobals(() => {
    const vertexCount = 24999;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      const radius = 5 + (i % 53) * 0.01;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (i % 113) * 0.01;
      normals[i * 3] = Math.cos(angle);
      normals[i * 3 + 1] = Math.sin(angle);
      normals[i * 3 + 2] = 0;
      uvs[i * 2] = i / vertexCount;
      uvs[i * 2 + 1] = (i % 97) / 96;
      indices[i] = i;
    }
    const source = new THREE.BufferGeometry();
    source.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    source.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    source.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    source.setIndex(new THREE.BufferAttribute(indices, 1));
    const project = {
      app: 'SILMO 3D Studio AI',
      version: schema.CURRENT_PROJECT_VERSION,
      bedWidthMM: 220,
      bedDepthMM: 220,
      uniform: true,
      objects: [{
        objectId: 'large-roundtrip-mesh',
        label: 'Grosses Testmesh',
        position: [1, 2, 3],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: '#336699',
        geometry: projectGeometry.serializeGeometry(source)
      }]
    };
    const text = JSON.stringify(project);
    source.dispose();

    const { state, deps } = makeProjectDependencies();
    projectIO.createProjectIO(deps).openProjectFile({
      size: Buffer.byteLength(text),
      text
    });

    try {
      assert.ok(state.committed, 'Projektdatei wurde nicht übernommen');
      assert.equal(state.committed.objects.length, 1);
      const restored = state.committed.objects[0];
      assert.equal(restored.uuid, 'large-roundtrip-mesh');
      assert.equal(restored.geometry.attributes.position.count, vertexCount);
      assert.equal(restored.geometry.index.count, vertexCount);
      assert.deepEqual(Array.from(restored.geometry.attributes.position.array), Array.from(positions));
      assert.deepEqual(Array.from(restored.geometry.attributes.normal.array), Array.from(normals));
      assert.deepEqual(Array.from(restored.geometry.attributes.uv.array), Array.from(uvs));
      assert.deepEqual(Array.from(restored.geometry.index.array), Array.from(indices));
      assert.deepEqual(restored.position.toArray(), [1, 2, 3]);
      assert.match(state.status, /Projekt geöffnet/);
      assert.equal(state.input.value, '');
    } finally {
      if (state.committed) state.committed.objects.forEach(object => {
        object.geometry.dispose();
        object.material.dispose();
      });
    }
  });
});



test('STL-Topologie weist nicht endliche Koordinaten kontrolliert zurück', () => {
  const geometry = makeGeometryFromTriangles([[[0,0,0],[10,0,0],[0,10,0]]]);
  geometry.getAttribute('position').array[0] = Number.NaN;
  assert.throws(
    () => stlDiagnostics.analyzeSTLGeometry(geometry),
    /ausschliesslich endliche XYZ-Koordinaten/
  );
  geometry.dispose();
});

test('STL-Topologie erkennt kollineare Dreiecke mit drei verschiedenen Eckpunkten', () => {
  const geometry = makeGeometryFromTriangles([[[0,0,0],[10,0,0],[5,0,0]]]);
  const result = stlDiagnostics.analyzeSTLGeometry(geometry);
  assert.equal(result.collapsedTriangleCount, 0);
  assert.equal(result.degenerateTriangleCount, 1);
  assert.equal(result.isClosedEdgeManifold, false);
  geometry.dispose();
});
