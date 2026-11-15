// Shared, unit-normalized geometry fixtures for every kernel candidate.
// All dimensions and expected volumes are expressed in millimetres / mm^3.
// These are research comparison tolerances, not SILMO production tolerances.
export const TEST_CASES = Object.freeze({
  unit: "mm",
  tolerance: Object.freeze({ relativeVolume: 1e-6, absoluteVolumeMm3: 1e-7 }),
  throughHole: Object.freeze({
    description: "40 x 30 x 20 mm box with one radius-5 mm through-hole across 20 mm",
    expectedVolumeMm3: 24000 - 500 * Math.PI
  }),
  coplanarOverlap: Object.freeze({
    description: "10 mm cubes offset 5 mm along X; fuse, common and cut",
    expectedVolumeMm3: Object.freeze({ fuse: 1500, common: 500, cut: 500 })
  }),
  tangency: Object.freeze({
    description: "10 mm cubes touching by face, edge or vertex",
    offsetsMm: Object.freeze({
      face: Object.freeze([10, 0, 0]),
      edge: Object.freeze([10, 10, 0]),
      vertex: Object.freeze([10, 10, 10])
    }),
    expectedUnionVolumeMm3: 2000
  }),
  nearCoincident: Object.freeze({
    description: "10 mm cubes with 0.0001 mm overlap along X",
    secondOffsetMm: 9.9999,
    expectedUnionVolumeMm3: 1999.99
  }),
  cylinderBoxTangency: Object.freeze({
    description: "10 mm cube and radius-5 mm, length-10 mm cylinder touching along a line",
    cylinderRadiusMm: 5,
    cylinderLengthMm: 10,
    expectedUnionVolumeMm3: 1000 + 250 * Math.PI
  }),
  thinWall: Object.freeze({
    description: "20 x 0.1 x 10 mm wall with a radius-0.2 mm hole through its 0.1 mm thickness",
    expectedVolumeMm3: 20 - Math.PI * 0.2 ** 2 * 0.1
  })
});

export function closeToExpectedVolume(actual, expected, label, relativeTolerance = TEST_CASES.tolerance.relativeVolume) {
  const allowed = Math.max(TEST_CASES.tolerance.absoluteVolumeMm3, Math.abs(expected) * relativeTolerance);
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > allowed) {
    throw new Error(`${label}: expected ${expected} mm^3, got ${actual} mm^3 (±${allowed})`);
  }
  return { actualMm3: actual, expectedMm3: expected, toleranceMm3: allowed };
}
