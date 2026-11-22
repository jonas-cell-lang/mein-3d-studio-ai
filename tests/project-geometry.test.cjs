const test = require('node:test');
const assert = require('node:assert/strict');
const THREE = require('three');
globalThis.THREE = THREE;
globalThis.SILMOTolerances = require('../src/tolerances.js');
const schema = require('../src/project-schema.js');
globalThis.SILMOProjectSchema = schema;
const projectGeometry = require('../src/project-geometry.js');

test('Geometriewiederherstellung gibt teilweise aufgebaute Ressourcen bei Fehlern frei', () => {
  const originalSetAttribute = THREE.BufferGeometry.prototype.setAttribute;
  const originalDispose = THREE.BufferGeometry.prototype.dispose;
  let disposeCalls = 0;

  THREE.BufferGeometry.prototype.setAttribute = function (name, attribute) {
    if (name === 'normal') throw new Error('simulierter Attributfehler');
    return originalSetAttribute.call(this, name, attribute);
  };
  THREE.BufferGeometry.prototype.dispose = function () {
    disposeCalls += 1;
    return originalDispose.call(this);
  };

  const data = {
    attributes: {
      position: { arrayType: 'Float32Array', array: [0,0,0, 1,0,0, 0,1,0], itemSize: 3, normalized: false },
      normal: { arrayType: 'Float32Array', array: [0,0,1, 0,0,1, 0,0,1], itemSize: 3, normalized: false }
    },
    index: null
  };

  try {
    assert.throws(() => projectGeometry.restoreGeometry(data), /simulierter Attributfehler/);
    assert.equal(disposeCalls, 1);
  } finally {
    THREE.BufferGeometry.prototype.setAttribute = originalSetAttribute;
    THREE.BufferGeometry.prototype.dispose = originalDispose;
  }
});

test('grosse indizierte CAD-Geometrie bleibt beim Serialisieren und Wiederherstellen verlustfrei', () => {
  const vertexCount = 24999;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint32Array(vertexCount);

  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * Math.PI * 2;
    const radius = 10 + (i % 97) * 0.01;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = (i % 251) * 0.02;
    normals[i * 3] = Math.cos(angle);
    normals[i * 3 + 1] = Math.sin(angle);
    normals[i * 3 + 2] = 0;
    uvs[i * 2] = i / vertexCount;
    uvs[i * 2 + 1] = (i % 127) / 126;
    indices[i] = i;
  }

  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  source.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  source.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  source.setIndex(new THREE.BufferAttribute(indices, 1));

  const serialized = projectGeometry.serializeGeometry(source);
  const restored = projectGeometry.restoreGeometry(serialized);

  try {
    assert.equal(restored.attributes.position.count, vertexCount);
    assert.equal(restored.index.count, vertexCount);
    assert.deepEqual(Array.from(restored.attributes.position.array), Array.from(positions));
    assert.deepEqual(Array.from(restored.attributes.normal.array), Array.from(normals));
    assert.deepEqual(Array.from(restored.attributes.uv.array), Array.from(uvs));
    assert.deepEqual(Array.from(restored.index.array), Array.from(indices));
    assert.ok(restored.boundingBox);
    assert.ok(restored.boundingSphere);
    assert.ok(Number.isFinite(restored.boundingSphere.radius));
    assert.ok(restored.boundingSphere.radius > 0);
  } finally {
    source.dispose();
    restored.dispose();
  }
});

test('Geometrie ohne Index wird nach dem Roundtrip weiterhin nicht-indiziert aufgebaut', () => {
  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 2, 0, 0, 0, 3, 0,
    0, 0, 1, 2, 0, 1, 0, 3, 1
  ], 3));
  source.computeVertexNormals();

  const restored = projectGeometry.restoreGeometry(projectGeometry.serializeGeometry(source));
  try {
    assert.equal(restored.index, null);
    assert.equal(restored.attributes.position.count, 6);
    assert.equal(restored.attributes.normal.count, 6);
    assert.deepEqual(Array.from(restored.attributes.position.array), Array.from(source.attributes.position.array));
  } finally {
    source.dispose();
    restored.dispose();
  }
});

