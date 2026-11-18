const test = require('node:test');
const assert = require('node:assert/strict');
const tolerances = require('../src/tolerances.js');

test('Toleranzwerte behalten die im Audit belegten Werte', () => {
  assert.equal(tolerances.CSG_GEOMETRY_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.ALIGNMENT_OVERLAP_WORLD_UNITS, 1e-7);
  assert.equal(tolerances.ALIGNMENT_CHANGE_WORLD_UNITS, 1e-8);
  assert.equal(tolerances.SKETCH_SIMPLIFICATION_MIN_MM, 0.01);
  assert.equal(tolerances.SKETCH_BED_BOUNDS_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.PRINT_BED_BOUNDS_WORLD_UNITS, 1e-4);
  assert.equal(tolerances.PRINT_TRIANGLE_AREA2_WORLD_UNITS2, 1e-8);
});

test('Toleranz-API ist unveränderlich', () => {
  assert.equal(Object.isFrozen(tolerances), true);
});
