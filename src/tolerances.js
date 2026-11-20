(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOTolerances = api;
})(globalThis, function () {
  // Bestehende Werte mit expliziter Dimension und Funktion.
  // Diese Werte erhalten vorerst das bisherige Verhalten; sie sind keine
  // universelle Modelliertoleranz und dürfen nicht miteinander vermischt werden.
  return Object.freeze({
    CSG_GEOMETRY_WORLD_UNITS: 1e-5,
    ALIGNMENT_OVERLAP_WORLD_UNITS: 1e-7,
    ALIGNMENT_CHANGE_WORLD_UNITS: 1e-8,
    SKETCH_SIMPLIFICATION_MIN_MM: 0.01,
    SKETCH_BED_BOUNDS_WORLD_UNITS: 1e-5,
    PRINT_BED_BOUNDS_WORLD_UNITS: 1e-4,
    PRINT_TRIANGLE_AREA2_WORLD_UNITS2: 1e-8,
    CONTOUR_FRAME_MIN_EDGE_WORLD_UNITS: 1e-5,
    CONTOUR_FRAME_PARALLEL_CROSS_MIN: 1e-5,
    CONTOUR_FRAME_MIN_NORMAL_WORLD_UNITS: 1e-5,
    CONTOUR_FRAME_MIN_AREA_WORLD_UNITS2: 1e-4,
    SKETCH_OUTLINE_MIN_AREA2_WORLD_UNITS2: 1e-7,
    SKETCH_OUTLINE_MIN_EDGE_WORLD_UNITS: 1e-5,
    CAD_PATH_MIN_DIRECTION_WORLD_UNITS: 1e-6,
    PROFILE_MIN_PERIMETER_WORLD_UNITS: 1e-6,
    GRID_BOUNDARY_EPSILON_WORLD_UNITS: 1e-8,
    GROUP_ROTATION_MIN_RADIANS: 1e-12,
    PROFILE_MIN_SOURCE_DIMENSION_WORLD_UNITS: 1e-6,
    SKETCH_PROFILE_CLOSURE_WORLD_UNITS: 1e-7,
    SKETCH_RAY_PARALLEL_DENOMINATOR_MIN: 1e-6
  });
});
