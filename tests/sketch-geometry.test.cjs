const test = require('node:test');
const assert = require('node:assert/strict');
const THREE = require('three');

globalThis.THREE = THREE;
const sketchGeometry = require('../src/sketch-geometry.js');

function meshVolume(geometry) {
  const positions = geometry.attributes.position;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let volume = 0;
  for (let i = 0; i < positions.count; i += 3) {
    a.fromBufferAttribute(positions, i);
    b.fromBufferAttribute(positions, i + 1);
    c.fromBufferAttribute(positions, i + 2);
    volume += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return Math.abs(volume);
}

test('Skizzenextrusion erstellt einen korrekt begrenzten Quader', () => {
  const shape = new THREE.Shape();
  shape.moveTo(-2, -1.5); shape.lineTo(2, -1.5);
  shape.lineTo(2, 1.5); shape.lineTo(-2, 1.5); shape.closePath();
  const geometry = sketchGeometry.createExtrusionGeometry(shape, { depth: 2, bevelEnabled: false });
  try {
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    assert.deepEqual(size.toArray(), [4, 3, 2]);
    assert.ok(Math.abs(meshVolume(geometry) - 24) < 1e-6);
    assert.ok(geometry.boundingSphere && geometry.attributes.normal);
    for (const value of geometry.attributes.normal.array) assert.ok(Number.isFinite(value));
  } finally {
    geometry.dispose();
  }
});

test('Skizzenextrusion erhält echte Innenlöcher mit korrektem Volumen', () => {
  const shape = new THREE.Shape();
  shape.moveTo(-2, -1.5); shape.lineTo(2, -1.5);
  shape.lineTo(2, 1.5); shape.lineTo(-2, 1.5); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-0.5, -0.5); hole.lineTo(-0.5, 0.5);
  hole.lineTo(0.5, 0.5); hole.lineTo(0.5, -0.5); hole.closePath();
  shape.holes.push(hole);
  const geometry = sketchGeometry.createExtrusionGeometry(shape, { depth: 2, bevelEnabled: false });
  try {
    assert.equal(shape.holes.length, 1);
    assert.ok(Math.abs(meshVolume(geometry) - 22) < 1e-5);
    assert.deepEqual(geometry.boundingBox.getSize(new THREE.Vector3()).toArray(), [4, 3, 2]);
  } finally {
    geometry.dispose();
  }
});

test('Skizzenextrusion unterstützt Kreisprofile und getrennte Geometrieinstanzen', () => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1, 0, Math.PI * 2, false);
  const options = { depth: 3, bevelEnabled: false, curveSegments: 48 };
  const first = sketchGeometry.createExtrusionGeometry(shape, options);
  const second = sketchGeometry.createExtrusionGeometry(shape, options);
  try {
    assert.notEqual(first, second);
    assert.deepEqual(first.boundingBox.getSize(new THREE.Vector3()).toArray(), [2, 2, 3]);
    assert.ok(Math.abs(meshVolume(first) - Math.PI * 3) < 0.03);
  } finally {
    first.dispose();
    second.dispose();
  }
});

test('Skizzenextrusion lehnt ein fehlendes Profil kontrolliert ab', () => {
  assert.throws(() => sketchGeometry.createExtrusionGeometry(null, { depth: 1 }), /gültiges 2D-Profil/);
  assert.equal(Object.isFrozen(sketchGeometry), true);
});
