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
