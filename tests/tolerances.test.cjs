const test = require('node:test');
const assert = require('node:assert/strict');
const tolerances = require('../src/tolerances.js');
const fs = require('node:fs');
const path = require('node:path');

test('Toleranzwerte behalten die im Audit belegten Werte', () => {
  assert.equal(tolerances.CSG_GEOMETRY_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.CSG_LINE_DIRECTION_QUANTUM, 1e-8);
  assert.equal(tolerances.STL_VERTEX_WELD_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.STL_SIGNED_VOLUME_EPSILON_MM3, 1e-12);
  assert.equal(tolerances.ALIGNMENT_OVERLAP_WORLD_UNITS, 1e-7);
  assert.equal(tolerances.ALIGNMENT_CHANGE_WORLD_UNITS, 1e-8);
  assert.equal(tolerances.SKETCH_SIMPLIFICATION_MIN_MM, 0.01);
  assert.equal(tolerances.SKETCH_POLYLINE_SIMPLIFICATION_TOLERANCE_MM, 0.5);
  assert.equal(tolerances.SKETCH_BED_BOUNDS_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.PRINT_BED_BOUNDS_WORLD_UNITS, 1e-4);
  assert.equal(tolerances.PRINT_TRIANGLE_AREA2_WORLD_UNITS2, 1e-8);
  assert.equal(tolerances.PRINT_MIN_MODEL_DIMENSION_MM, 0.01);
  assert.equal(tolerances.CONTOUR_FRAME_MIN_EDGE_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.CONTOUR_FRAME_PARALLEL_CROSS_MIN, 1e-5);
  assert.equal(tolerances.CONTOUR_FRAME_MIN_NORMAL_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.CONTOUR_FRAME_MIN_AREA_WORLD_UNITS2, 1e-4);
  assert.equal(tolerances.CONTOUR_FRAME_MITER_LIMIT_FACTOR, 8);
  assert.equal(tolerances.CONTOUR_FRAME_MITER_ALLOWANCE_WORLD_UNITS, 0.02);
  assert.equal(tolerances.SKETCH_OUTLINE_MIN_AREA2_WORLD_UNITS2, 1e-7);
  assert.equal(tolerances.SKETCH_OUTLINE_MIN_EDGE_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.CAD_PATH_MIN_DIRECTION_WORLD_UNITS, 1e-6);
  assert.equal(tolerances.PROFILE_MIN_PERIMETER_WORLD_UNITS, 1e-6);
  assert.equal(tolerances.LOFT_PROFILE_RESAMPLE_MIN_PERIMETER_WORLD_UNITS, 1e-8);
  assert.equal(tolerances.CONTOUR_FRAME_MIN_RESULT_DIMENSION_WORLD_UNITS, 1e-9);
  assert.equal(tolerances.PATH_LENGTH_MIN_CURRENT_MM, 0.001);
  assert.equal(tolerances.SKETCH_EXTRUSION_SCALE_DENOMINATOR_MIN, 1e-12);
  assert.equal(tolerances.LOFT_PROFILE_PLANARITY_WORLD_UNITS, 1e-6);
  assert.equal(tolerances.LOFT_PROFILE_MIN_NORMAL_WORLD_UNITS, 1e-9);
  assert.equal(tolerances.GRID_BOUNDARY_EPSILON_WORLD_UNITS, 1e-8);
  assert.equal(tolerances.GROUP_ROTATION_MIN_RADIANS, 1e-12);
  assert.equal(tolerances.PROFILE_MIN_SOURCE_DIMENSION_WORLD_UNITS, 1e-6);
  assert.equal(tolerances.SKETCH_PROFILE_MIN_CORNER_RADIUS_WORLD_UNITS, 0.01);
  assert.equal(tolerances.SKETCH_PROFILE_CLOSURE_WORLD_UNITS, 1e-7);
  assert.equal(tolerances.SKETCH_RAY_PARALLEL_DENOMINATOR_MIN, 1e-6);
  assert.equal(tolerances.IMAGE_POLYGON_RAY_DENOMINATOR_FALLBACK_MM, 1e-12);
  assert.equal(tolerances.IMAGE_SEGMENT_BOUNDS_EPSILON_MM, 1e-8);
  assert.equal(tolerances.IMAGE_SEGMENT_ORIENTATION_EPSILON_MM2, 1e-8);
  assert.equal(tolerances.IMAGE_POLYGON_MIN_EDGE_MM, 1e-5);
  assert.equal(tolerances.IMAGE_POLYGON_MIN_NONADJACENT_GAP_MM, 1e-7);
  assert.equal(tolerances.IMAGE_MIN_WALL_COMPARISON_EPSILON_MM, 1e-6);
  assert.equal(tolerances.TUTORIAL_POSITION_CHANGE_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.SKETCH_POLYLINE_SAMPLE_MIN_DISTANCE_WORLD_UNITS, 0.015);
  assert.equal(tolerances.SKETCH_POLYLINE_MIN_LENGTH_WORLD_UNITS, 0.02);
  assert.equal(tolerances.SKETCH_DRAW_POINT_MIN_DISTANCE_WORLD_UNITS, 0.02);
  assert.equal(tolerances.SKETCH_DRAW_MIN_DIMENSION_WORLD_UNITS, 0.01);
  assert.equal(tolerances.SKETCH_FREEFORM_MIN_POINT_SPACING_WORLD_UNITS, 0.005);
  assert.equal(tolerances.SKETCH_FREEFORM_BOUNDS_EPSILON_WORLD_UNITS, 1e-9);
  assert.equal(tolerances.SKETCH_FREEFORM_ORIENTATION_EPSILON_WORLD_UNITS2, 1e-9);
  assert.equal(tolerances.SKETCH_GEOMETRY_BOUNDS_EPSILON_WORLD_UNITS, 1e-12);
  assert.equal(tolerances.SKETCH_GEOMETRY_ORIENTATION_EPSILON_WORLD_UNITS2, 1e-12);
  assert.equal(tolerances.PROJECT_SKETCH_RING_BOUNDS_EPSILON_MM, 1e-12);
  assert.equal(tolerances.PROJECT_SKETCH_RING_ORIENTATION_EPSILON_MM2, 1e-12);
  assert.equal(tolerances.PROJECT_SKETCH_RING_MIN_EDGE_MM, 1e-12);
  assert.equal(tolerances.HEART_OUTLINE_POINT_DEDUPLICATION_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.HEART_OUTLINE_MIN_SPAN_WORLD_UNITS, 1e-5);
  assert.equal(tolerances.HEART_OUTLINE_HEIGHT_DENOMINATOR_MIN_WORLD_UNITS, 1e-9);
  assert.equal(tolerances.SKETCH_PREVIEW_OFFSET_WORLD_UNITS, 0.025);
  assert.equal(tolerances.CLICK_CONTOUR_CLOSE_DISTANCE_WORLD_UNITS, 0.025);
  assert.equal(tolerances.CLICK_CONTOUR_POINT_MIN_DISTANCE_WORLD_UNITS, 0.01);
  assert.equal(tolerances.CLICK_CONTOUR_STRAIGHTEN_MIN_DISTANCE_WORLD_UNITS, 1e-4);
  assert.equal(tolerances.SKETCH_POLYLINE_DEGENERATE_LENGTH_SQUARED_WORLD_UNITS2, 1e-12);
  assert.equal(tolerances.FREEFORM_MIN_AREA_WORLD_UNITS2, 1e-4);
  assert.equal(tolerances.IMAGE_MIN_COMPONENT_PIXEL_COUNT, 4);
  assert.equal(tolerances.IMAGE_MIN_DRAWN_CONTOUR_AREA_PIXELS2, 0.5);
  assert.equal(tolerances.IMAGE_MIN_COMPONENT_AREA_FRACTION, 0.000025);
  assert.equal(tolerances.IMAGE_CONTOUR_SIMPLIFICATION_TOLERANCE_PIXELS, 1.1);
  assert.equal(tolerances.IMAGE_MIN_PRINT_CONTOUR_AREA_MM2, 0.01);
  assert.equal(tolerances.IMAGE_MIN_SIMPLE_POLYGON_AREA_MM2, 0.01);
  assert.equal(tolerances.IMAGE_MIN_AREA_COMPARISON_EPSILON_MM2, 1e-12);
  assert.equal(tolerances.IMAGE_MIN_WALL_THICKNESS_MM, 0.8);
});

test('Toleranz-API ist unveränderlich', () => {
  assert.equal(Object.isFrozen(tolerances), true);
});


test('Jede zentrale Toleranz wird von mindestens einem Laufzeitmodul verwendet', () => {
  const runtimeFiles = [
    '../index.html',
    '../src/csg.js',
    '../src/image-studio.js',
    '../src/tutorial.js',
    '../src/sketch-geometry.js',
    '../src/project-schema.js',
    '../src/primitive-geometry.js',
    '../src/stl-io.js'
  ];
  const runtimeSource = runtimeFiles
    .map(file => fs.readFileSync(path.join(__dirname, file), 'utf8'))
    .join('\n');
  const keys = Object.keys(tolerances);
  const unused = keys.filter(key => !runtimeSource.includes(key));
  assert.deepEqual(unused, [], 'Nicht verwendete Toleranzkonstanten: ' + unused.join(', '));
});
