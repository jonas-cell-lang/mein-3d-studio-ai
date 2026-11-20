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

test('parametrische Skizzenprofile behalten ihre definierten Aussenabmessungen', () => {
  const cases = [
    ['rectangle', { width: 4, depth: 3 }, 0, [4, 3]],
    ['circle', { width: 4, depth: 4 }, 0, [4, 4]],
    ['ellipse', { width: 4, depth: 2 }, 0, [4, 2]],
    ['triangle', { width: 4, depth: 3 }, 0, [4, 3]],
    ['roundedRectangle', { width: 4, depth: 3 }, 0.5, [4, 3]]
  ];
  for (const [type, dimensions, radius, expected] of cases) {
    const shape = sketchGeometry.createParametricProfile(type, dimensions, radius);
    const geometry = sketchGeometry.createExtrusionGeometry(shape, { depth: 1, bevelEnabled: false });
    try {
      const size = geometry.boundingBox.getSize(new THREE.Vector3());
      assert.ok(Math.abs(size.x - expected[0]) < 1e-6, type + ' Breite');
      assert.ok(Math.abs(size.y - expected[1]) < 1e-6, type + ' Tiefe');
      assert.ok(Math.abs(size.z - 1) < 1e-6, type + ' Höhe');
      assert.ok(meshVolume(geometry) > 0, type + ' muss ein Volumen erzeugen');
    } finally {
      geometry.dispose();
    }
  }
});

test('abgerundetes Profil unterstützt die umgekehrte Konturrichtung für Innenkonturen', () => {
  const hole = new THREE.Path();
  sketchGeometry.addRoundedRectPath(hole, 2, 1, 0.2, 0, 0, true);
  hole.closePath();
  assert.ok(hole.getPoints(8).length >= 8);
});

test('parametrische Profile lehnen ungültige Abmessungen kontrolliert ab', () => {
  assert.throws(() => sketchGeometry.createParametricProfile('rectangle', { width: 0, depth: 2 }), /positive Abmessungen/);
});

test('Loft-Geometrie verbindet zwei geschlossene Ringe mit Sollabmessungen und Volumen', () => {
  const lower = [
    new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, -1, 0),
    new THREE.Vector3(1, 1, 0), new THREE.Vector3(-1, 1, 0)
  ];
  const upper = lower.map(point => point.clone().add(new THREE.Vector3(0, 0, 2)));
  const geometry = sketchGeometry.createLoftGeometry(lower, upper);
  try {
    assert.deepEqual(geometry.boundingBox.getSize(new THREE.Vector3()).toArray(), [2, 2, 2]);
    assert.ok(Math.abs(meshVolume(geometry) - 8) < 1e-5);
    assert.ok(geometry.attributes.normal);
  } finally {
    geometry.dispose();
  }
});

test('Loft-Kontur wird gleichmässig abgetastet und ungültige Konturen abgewiesen', () => {
  const sampled = sketchGeometry.resampleClosedOutline([[0, 0], [2, 0], [2, 2], [0, 2]], 32, 0.001);
  assert.equal(sampled.length, 32);
  assert.ok(sampled.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  assert.throws(() => sketchGeometry.resampleClosedOutline([[0, 0], [0, 0], [0, 0]], 32, 0.001), /ungültig/);
  assert.throws(() => sketchGeometry.createLoftGeometry([new THREE.Vector3()], []), /gleich viele gültige/);
});

test('Sweep erzeugt entlang eines 3D-Pfads einen endlichen Volumenkörper', () => {
  const outline = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const path = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 3)];
  const geometry = sketchGeometry.createSweepGeometry(outline, path);
  try {
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.x - 2) < 1e-5);
    assert.ok(Math.abs(size.y - 2) < 1e-5);
    assert.ok(Math.abs(size.z - 3) < 1e-5);
    assert.ok(Math.abs(meshVolume(geometry) - 12) < 0.05);
    for (const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value));
  } finally {
    geometry.dispose();
  }
});

test('Sweep lehnt offene oder ungültige Eingaben kontrolliert ab', () => {
  assert.throws(() => sketchGeometry.createSweepGeometry([[0, 0], [1, 0]], [new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]), /gültiges geschlossenes Profil/);
  assert.throws(() => sketchGeometry.createSweepGeometry([[0, 0], [1, 0], [0, 1]], [new THREE.Vector3()]), /mindestens zwei/);
});
