// Shared, unit-normalized geometry fixtures for every kernel candidate.
// All dimensions and expected volumes are expressed in millimetres / mm^3.
// These are research comparison tolerances, not SILMO production tolerances.
export const TEST_CASES = Object.freeze({
  version: 1,
  unit: "mm",
  tolerance: Object.freeze({ relativeVolume: 1e-6, absoluteVolumeMm3: 1e-7 }),
  throughHole: Object.freeze({
    description: "40 x 20 x 30 mm box with a radius-5 mm cylinder passing through its 20 mm Y extent",
    boxDimensionsMm: Object.freeze([40, 20, 30]),
    cylinder: Object.freeze({
      radiusMm: 5, lengthMm: 40,
      originMm: Object.freeze([20, -10, 15]),
      axis: Object.freeze([0, 1, 0])
    }),
    expectedVolumeMm3: 24000 - 500 * Math.PI
  }),
  coplanarOverlap: Object.freeze({
    description: "10 mm cubes offset 5 mm along X; fuse, common and cut",
    boxDimensionsMm: Object.freeze([10, 10, 10]),
    secondOffsetMm: Object.freeze([5, 0, 0]),
    expectedVolumeMm3: Object.freeze({ fuse: 1500, common: 500, cut: 500 })
  }),
  tangency: Object.freeze({
    description: "10 mm cubes touching by face, edge or vertex",
    boxDimensionsMm: Object.freeze([10, 10, 10]),
    offsetsMm: Object.freeze({
      face: Object.freeze([10, 0, 0]),
      edge: Object.freeze([10, 10, 0]),
      vertex: Object.freeze([10, 10, 10])
    }),
    expectedUnionVolumeMm3: 2000
  }),
  nearCoincident: Object.freeze({
    description: "10 mm cubes with 0.0001 mm overlap along X",
    boxDimensionsMm: Object.freeze([10, 10, 10]),
    secondOffsetMm: 9.9999,
    expectedUnionVolumeMm3: 1999.99
  }),
  cylinderBoxTangency: Object.freeze({
    description: "10 mm cube and radius-5 mm, length-10 mm cylinder touching along a line",
    boxDimensionsMm: Object.freeze([10, 10, 10]),
    cylinderRadiusMm: 5,
    cylinderLengthMm: 10,
    cylinderOriginMm: Object.freeze([15, 0, 5]),
    cylinderAxis: Object.freeze([0, 1, 0]),
    expectedUnionVolumeMm3: 1000 + 250 * Math.PI
  }),
  thinWall: Object.freeze({
    description: "20 x 0.1 x 10 mm wall with a radius-0.2 mm hole through its 0.1 mm thickness",
    wallDimensionsMm: Object.freeze([20, 0.1, 10]),
    cylinderRadiusMm: 0.2,
    cylinderLengthMm: 0.2,
    cylinderOriginMm: Object.freeze([10, -0.05, 5]),
    cylinderAxis: Object.freeze([0, 1, 0]),
    expectedVolumeMm3: 20 - Math.PI * 0.2 ** 2 * 0.1
  }),
  invalidPrimitiveInputs: Object.freeze([
    Object.freeze({ id: "zero-width-box", primitive: "box", dimensionsMm: Object.freeze([0, 10, 10]) }),
    Object.freeze({ id: "negative-width-box", primitive: "box", dimensionsMm: Object.freeze([-1, 10, 10]) }),
    Object.freeze({ id: "nan-box-dimension", primitive: "box", dimensionsMm: Object.freeze([Number.NaN, 10, 10]) }),
    Object.freeze({ id: "infinite-box-dimension", primitive: "box", dimensionsMm: Object.freeze([Number.POSITIVE_INFINITY, 10, 10]) }),
    Object.freeze({ id: "zero-radius-cylinder", primitive: "cylinder", dimensionsMm: Object.freeze([0, 10]) }),
    Object.freeze({ id: "zero-height-cylinder", primitive: "cylinder", dimensionsMm: Object.freeze([5, 0]) })
  ])
});

export function closeToExpectedVolume(actual, expected, label, relativeTolerance = TEST_CASES.tolerance.relativeVolume) {
  const allowed = Math.max(TEST_CASES.tolerance.absoluteVolumeMm3, Math.abs(expected) * relativeTolerance);
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > allowed) {
    throw new Error(`${label}: expected ${expected} mm^3, got ${actual} mm^3 (±${allowed})`);
  }
  return { actualMm3: actual, expectedMm3: expected, toleranceMm3: allowed };
}
