const test = require('node:test');
const assert = require('node:assert/strict');
const THREE = require('three');

require('../src/tolerances.js');
global.THREE = THREE;
global.SILMOTolerances = require('../src/tolerances.js');
const { combineMeshes } = require('../src/csg.js');

function box(position = [0, 0, 0], size = [2, 2, 2]) {
  const geometry = new THREE.BoxGeometry(...size);
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.updateMatrixWorld(true);
  return mesh;
}

function signedVolume(geometry) {
  const position = geometry.getAttribute('position');
  let volume = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i + 2 < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    volume += a.dot(b.clone().cross(c)) / 6;
  }
  return volume;
}

function bounds(geometry) {
  geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);
  return {
    min: geometry.boundingBox.min.toArray(),
    max: geometry.boundingBox.max.toArray(),
    size: size.toArray()
  };
}

test('CSG-Vereinigung zweier überlappender Würfel hat korrektes Volumen und Begrenzung', () => {
  const base = box();
  const tool = box([1, 0, 0]);
  const result = combineMeshes(base, tool, 'union');
  try {
    assert.ok(result.getAttribute('position').count >= 36, 'Union muss Dreiecke enthalten');
    assert.ok(Math.abs(Math.abs(signedVolume(result)) - 12) < 1e-5,
      'Union-Volumen muss 8 + 8 - 4 = 12 Kubikeinheiten betragen');
    const b = bounds(result);
    assert.deepEqual(b.min.map(v => Number(v.toFixed(5))), [-1, -1, -1]);
    assert.deepEqual(b.max.map(v => Number(v.toFixed(5))), [2, 1, 1]);
  } finally {
    result.dispose();
    base.geometry.dispose();
    tool.geometry.dispose();
    base.material.dispose();
    tool.material.dispose();
  }
});

test('CSG-Abziehen zweier überlappender Würfel hat korrektes Restvolumen', () => {
  const base = box();
  const tool = box([1, 0, 0]);
  const result = combineMeshes(base, tool, 'subtract');
  try {
    assert.ok(result.getAttribute('position').count >= 12, 'Differenz muss Dreiecke enthalten');
    assert.ok(Math.abs(Math.abs(signedVolume(result)) - 4) < 1e-5,
      'Restvolumen muss 8 - 4 = 4 Kubikeinheiten betragen');
    const b = bounds(result);
    assert.deepEqual(b.min.map(v => Number(v.toFixed(5))), [-1, -1, -1]);
    assert.deepEqual(b.max.map(v => Number(v.toFixed(5))), [0, 1, 1]);
  } finally {
    result.dispose();
    base.geometry.dispose();
    tool.geometry.dispose();
    base.material.dispose();
    tool.material.dispose();
  }
});

test('CSG berücksichtigt die Weltposition des Werkzeugs bei der Berechnung', () => {
  const base = box([4, 2, -3]);
  const tool = box([5, 2, -3]);
  const result = combineMeshes(base, tool, 'union');
  try {
    assert.ok(Math.abs(Math.abs(signedVolume(result)) - 12) < 1e-5);
    const b = bounds(result);
    assert.deepEqual(b.min.map(v => Number(v.toFixed(5))), [-1, -1, -1]);
    assert.deepEqual(b.max.map(v => Number(v.toFixed(5))), [2, 1, 1]);
  } finally {
    result.dispose();
    base.geometry.dispose();
    tool.geometry.dispose();
    base.material.dispose();
    tool.material.dispose();
  }
});


test('CSG weist unbekannte Operationen zurück, statt sie als Abziehen auszuführen', () => {
  const base = box();
  const tool = box([1, 0, 0]);
  try {
    assert.throws(() => combineMeshes(base, tool, 'intersect'), /Unbekannte CSG-Operation/);
    assert.equal(base.geometry.getAttribute('position').count, 24,
      'Basisgeometrie bleibt nach ungültiger Operation unverändert');
    assert.equal(tool.geometry.getAttribute('position').count, 24,
      'Werkzeuggeometrie bleibt nach ungültiger Operation unverändert');
  } finally {
    base.geometry.dispose();
    tool.geometry.dispose();
    base.material.dispose();
    tool.material.dispose();
  }
});


test('CSG-Vereinigung getrennter Körper erhält beide Volumen', () => {
  const base = box();
  const tool = box([4, 0, 0]);
  const result = combineMeshes(base, tool, 'union');
  try {
    assert.ok(Math.abs(Math.abs(signedVolume(result)) - 16) < 1e-5);
    const b = bounds(result);
    assert.deepEqual(b.min.map(v => Number(v.toFixed(5))), [-1, -1, -1]);
    assert.deepEqual(b.max.map(v => Number(v.toFixed(5))), [5, 1, 1]);
  } finally {
    result.dispose();
    base.geometry.dispose();
    tool.geometry.dispose();
    base.material.dispose();
    tool.material.dispose();
  }
});

test('CSG-Abziehen eines vollständig enthaltenen Würfels erhält die innere Aussparung', () => {
  const base = box();
  const tool = box([0, 0, 0], [1, 1, 1]);
  const result = combineMeshes(base, tool, 'subtract');
  try {
    assert.ok(Math.abs(Math.abs(signedVolume(result)) - 7) < 1e-5,
      'Restvolumen muss 8 - 1 = 7 Kubikeinheiten betragen');
    const b = bounds(result);
    assert.deepEqual(b.min.map(v => Number(v.toFixed(5))), [-1, -1, -1]);
    assert.deepEqual(b.max.map(v => Number(v.toFixed(5))), [1, 1, 1]);
  } finally {
    result.dispose();
    base.geometry.dispose();
    tool.geometry.dispose();
    base.material.dispose();
    tool.material.dispose();
  }
});

test('CSG-Vereinigung identischer Körper verdoppelt das Volumen nicht', () => {
  const base = box();
  const tool = box();
  const result = combineMeshes(base, tool, 'union');
  try {
    assert.ok(Math.abs(Math.abs(signedVolume(result)) - 8) < 1e-5);
  } finally {
    result.dispose();
    base.geometry.dispose();
    tool.geometry.dispose();
    base.material.dispose();
    tool.material.dispose();
  }
});


test('CSG behandelt zwei nur an einer Fläche anliegende Würfel ohne Volumenverlust', () => {
  const base = box();
  const tool = box([2, 0, 0]);
  const result = combineMeshes(base, tool, 'union');
  try {
    assert.ok(Math.abs(Math.abs(signedVolume(result)) - 16) < 1e-5,
      'Die gemeinsame Fläche darf kein Volumen erzeugen oder entfernen');
    const b = bounds(result);
    assert.deepEqual(b.min.map(v => Number(v.toFixed(5))), [-1, -1, -1]);
    assert.deepEqual(b.max.map(v => Number(v.toFixed(5))), [3, 1, 1]);
  } finally {
    result.dispose();
    base.geometry.dispose();
    tool.geometry.dispose();
    base.material.dispose();
    tool.material.dispose();
  }
});

test('CSG berücksichtigt Rotation und Skalierung beider Eingabekörper', () => {
  const base = box([0, 0, 0], [2, 2, 2]);
  const tool = box([0, 1, 0], [2, 2, 2]);
  base.rotation.z = Math.PI / 2;
  tool.rotation.z = Math.PI / 2;
  base.scale.set(2, 1, 1);
  tool.scale.set(2, 1, 1);
  base.updateMatrixWorld(true);
  tool.updateMatrixWorld(true);
  const result = combineMeshes(base, tool, 'union');
  try {
    assert.ok(Math.abs(Math.abs(signedVolume(result)) - 20) < 1e-4,
      'Vereinigungsvolumen muss nach Rotation und Skalierung 20 Kubikeinheiten betragen; gemessen: ' + Math.abs(signedVolume(result)));
    const b = bounds(result);
    assert.deepEqual(b.min.map(v => Number(v.toFixed(4))), [-1, -2, -1]);
    assert.deepEqual(b.max.map(v => Number(v.toFixed(4))), [1, 3, 1]);
  } finally {
    result.dispose();
    base.geometry.dispose();
    tool.geometry.dispose();
    base.material.dispose();
    tool.material.dispose();
  }
});


test('CSG weist fehlerhafte Positionsattribute und unvollständige Dreiecke ab', () => {
  const base = box();
  const tool = box();
  try {
    tool.geometry.setIndex(null);
    tool.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));
    assert.throws(() => combineMeshes(base, tool, 'union'), /vollständige Dreiecke/);
  } finally {
    base.geometry.dispose(); tool.geometry.dispose();
    base.material.dispose(); tool.material.dispose();
  }
});

test('CSG weist nicht endliche und ausserhalb des Koordinatenlimits liegende Punkte ab', () => {
  const base = box();
  const tool = box();
  try {
    const invalid = new THREE.BoxGeometry(2, 2, 2);
    const values = invalid.getAttribute('position').array;
    values[0] = Number.NaN;
    invalid.getAttribute('position').needsUpdate = true;
    tool.geometry.dispose(); tool.geometry = invalid;
    assert.throws(() => combineMeshes(base, tool, 'union'), /ungültige oder zu grosse Koordinaten/);
  } finally {
    base.geometry.dispose(); tool.geometry.dispose();
    base.material.dispose(); tool.material.dispose();
  }
});

test('CSG begrenzt die Dreieckszahl vor der BSP-Berechnung', () => {
  const base = box();
  const tool = box();
  try {
    const count = 25001 * 3;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 3) {
      positions[i * 3] = 0; positions[i * 3 + 1] = 0; positions[i * 3 + 2] = 0;
      positions[(i + 1) * 3] = 1; positions[(i + 1) * 3 + 1] = 0; positions[(i + 1) * 3 + 2] = 0;
      positions[(i + 2) * 3] = 0; positions[(i + 2) * 3 + 1] = 1; positions[(i + 2) * 3 + 2] = 0;
    }
    tool.geometry.dispose();
    tool.geometry = new THREE.BufferGeometry();
    tool.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    assert.throws(() => combineMeshes(base, tool, 'union'), /maximal 25000 Dreiecke/);
  } finally {
    base.geometry.dispose(); tool.geometry.dispose();
    base.material.dispose(); tool.material.dispose();
  }
});

test('CSG prüft Indexbereiche bei indizierten Meshes', () => {
  const base = box();
  const tool = box();
  try {
    tool.geometry.setIndex([0, 1, 9999]);
    assert.throws(() => combineMeshes(base, tool, 'union'), /ausserhalb des Positionsattributs/);
  } finally {
    base.geometry.dispose(); tool.geometry.dispose();
    base.material.dispose(); tool.material.dispose();
  }
});