const test = require('node:test');
const assert = require('node:assert/strict');
const THREE = require('three');

globalThis.THREE = THREE;
const primitiveGeometry = require('../src/primitive-geometry.js');

function dimensions(type) {
  const geometry = primitiveGeometry.createPrimitiveGeometry(type);
  try {
    assert.ok(geometry.boundingBox, type + ': Bounding Box fehlt');
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok([size.x, size.y, size.z].every(Number.isFinite), type + ': ungültige Abmessungen');
    return [size.x, size.y, size.z];
  } finally {
    geometry.dispose();
  }
}

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= 1e-6,
    label + ': erwartet ' + expected + ', erhalten ' + actual);
}

test('Grundkörper-Fabrik erzeugt alle vorhandenen CAD-Grundformen mit Sollabmessungen', () => {
  const cases = [
    ['Würfel', [1.5, 1.5, 1.5]],
    ['Kugel', [1.6, 1.6, 1.6]],
    ['Zylinder', [1.4, 1.4, 1.5]],
    ['Kegel', [1.6, 1.6, 1.5]],
    ['Sechskant-Prisma', [1.4722431864, 1.7, 1.5]],
    ['Ring / Torus', [1.66, 1.66, 0.36]]
  ];
  for (const [type, expected] of cases) {
    const actual = dimensions(type);
    actual.forEach((value, axis) => close(value, expected[axis], type + ' Achse ' + axis));
  }
});

test('unbekannte Grundkörpertypen behalten den bisherigen Würfel-Fallback', () => {
  const actual = dimensions('unbekannter Typ');
  actual.forEach((value, axis) => close(value, 1, 'Fallback-Achse ' + axis));
});

test('Grundkörper-Fabrik verändert die drei.js-Einheiten und Originaltypen nicht', () => {
  assert.equal(typeof primitiveGeometry.createPrimitiveGeometry, 'function');
  assert.equal(Object.isFrozen(primitiveGeometry), true);
  const first = primitiveGeometry.createPrimitiveGeometry('Würfel');
  const second = primitiveGeometry.createPrimitiveGeometry('Würfel');
  try {
    assert.notEqual(first, second, 'Jeder Grundkörper braucht eine eigene Geometrieinstanz');
    assert.equal(first.attributes.position.count, second.attributes.position.count);
  } finally {
    first.dispose();
    second.dispose();
  }
});
