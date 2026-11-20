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
  assert.equal(tolerances.CONTOUR_FRAME_MIN_EDGE_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.CONTOUR_FRAME_PARALLEL_CROSS_MIN, 1e-5);
  assert.equal(tolerances.CONTOUR_FRAME_MIN_NORMAL_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.CONTOUR_FRAME_MIN_AREA_WORLD_UNITS2, 1e-4);
  assert.equal(tolerances.SKETCH_OUTLINE_MIN_AREA2_WORLD_UNITS2, 1e-7);
  assert.equal(tolerances.SKETCH_OUTLINE_MIN_EDGE_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.CAD_PATH_MIN_DIRECTION_WORLD_UNITS, 1e-6);
  assert.equal(tolerances.PROFILE_MIN_PERIMETER_WORLD_UNITS, 1e-6);
  assert.equal(tolerances.GRID_BOUNDARY_EPSILON_WORLD_UNITS, 1e-8);
  assert.equal(tolerances.GROUP_ROTATION_MIN_RADIANS, 1e-12);
  assert.equal(tolerances.PROFILE_MIN_SOURCE_DIMENSION_WORLD_UNITS, 1e-6);
  assert.equal(tolerances.SKETCH_PROFILE_CLOSURE_WORLD_UNITS, 1e-7);
  assert.equal(tolerances.SKETCH_RAY_PARALLEL_DENOMINATOR_MIN, 1e-6);
});

test('Toleranz-API ist unveränderlich', () => {
  assert.equal(Object.isFrozen(tolerances), true);
});
