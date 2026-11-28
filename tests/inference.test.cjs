const test = require('node:test');
const assert = require('node:assert/strict');
const { findNearestPoint } = require('../src/inference.js');

test('finds the nearest projected point inside the pixel tolerance', () => {
  const candidates = [
    { id: 'far', screenX: 40, screenY: 40 },
    { id: 'near', screenX: 11, screenY: 8 },
    { id: 'middle', screenX: 15, screenY: 8 }
  ];
  assert.equal(findNearestPoint(candidates, { x: 10, y: 8 }, 12).id, 'near');
});

test('returns null when every point is outside the pixel tolerance', () => {
  assert.equal(findNearestPoint([{ screenX: 30, screenY: 30 }], { x: 0, y: 0 }, 12), null);
});

test('keeps the first candidate for an exact distance tie', () => {
  const result = findNearestPoint([
    { id: 'first', screenX: 9, screenY: 10 },
    { id: 'second', screenX: 11, screenY: 10 }
  ], { x: 10, y: 10 }, 4);
  assert.equal(result.id, 'first');
  assert.equal(result.distancePx, 1);
});

test('rejects invalid pointers and malformed candidates safely', () => {
  assert.equal(findNearestPoint([{ screenX: 1, screenY: 1 }], { x: NaN, y: 1 }, 10), null);
  assert.equal(findNearestPoint([null, { screenX: Infinity, screenY: 0 }], { x: 0, y: 0 }, 10), null);
});

test('skips candidates rejected by the visibility predicate', () => {
  const result = findNearestPoint([
    { id: 'hidden', screenX: 10, screenY: 10 },
    { id: 'visible', screenX: 12, screenY: 10 }
  ], { x: 10, y: 10 }, 12, candidate => candidate.id === 'visible');
  assert.equal(result.id, 'visible');
});



test('prefers a more precise snap kind when candidates are effectively tied', () => {
  const { chooseBestSnapCandidate } = require('../src/inference.js');
  const candidates = [
    { id: 'edge', kind: 'edge', screenX: 10, screenY: 10, distancePx: 2.1 },
    { id: 'midpoint', kind: 'midpoint', screenX: 10, screenY: 10, distancePx: 2.0 },
    { id: 'intersection', kind: 'intersection', screenX: 10, screenY: 10, distancePx: 2.05 },
    { id: 'vertex', kind: 'vertex', screenX: 10, screenY: 10, distancePx: 2.2 }
  ];
  assert.equal(chooseBestSnapCandidate(candidates).id, 'vertex');
});

test('snap priority is independent of input ordering within the tie band', () => {
  const { chooseBestSnapCandidate } = require('../src/inference.js');
  const candidates = [
    { id: 'edge-near', kind: 'edge', screenX: 10, screenY: 10, distancePx: 1 },
    { id: 'vertex-mid', kind: 'vertex', screenX: 10, screenY: 10, distancePx: 1.3 },
    { id: 'edge-far', kind: 'edge', screenX: 10, screenY: 10, distancePx: 1.6 }
  ];
  assert.equal(chooseBestSnapCandidate(candidates).id, 'vertex-mid');
  assert.equal(chooseBestSnapCandidate([...candidates].reverse()).id, 'vertex-mid');
});

test('chooses the genuinely closer snap when the distance gap exceeds the tie tolerance', () => {
  const { chooseBestSnapCandidate } = require('../src/inference.js');
  const result = chooseBestSnapCandidate([
    { id: 'vertex', kind: 'vertex', screenX: 10, screenY: 10, distancePx: 2 },
    { id: 'edge', kind: 'edge', screenX: 10, screenY: 10, distancePx: 1.5 }
  ]);
  assert.equal(result.id, 'edge');
});

test('keeps the first candidate when distance and snap priority are equal', () => {
  const { chooseBestSnapCandidate } = require('../src/inference.js');
  const result = chooseBestSnapCandidate([
    { id: 'first', kind: 'midpoint', screenX: 10, screenY: 10, distancePx: 2 },
    { id: 'second', kind: 'midpoint', screenX: 10, screenY: 10, distancePx: 2.1 }
  ]);
  assert.equal(result.id, 'first');
});

test('ignores malformed snap candidates and invalid tolerances', () => {
  const { chooseBestSnapCandidate } = require('../src/inference.js');
  assert.equal(chooseBestSnapCandidate([null, { kind: 'vertex', distancePx: NaN, screenX: 0, screenY: 0 }]), null);
  assert.equal(chooseBestSnapCandidate([{ kind: 'vertex', distancePx: 1, screenX: 0, screenY: 0 }], -1), null);
});

test('finds feature edges but ignores the diagonal inside a flat triangulated quad', () => {
  const positions = [
    0,0,0, 1,0,0, 1,1,0,
    0,0,0, 1,1,0, 0,1,0
  ];
  const edges = require('../src/inference.js').findFeatureEdgeMidpoints(positions);
  assert.equal(edges.length, 4);
  assert.ok(edges.every(edge => edge.boundary));
  assert.equal(edges.some(edge => edge.start[0] === 0 && edge.start[1] === 0 && edge.end[0] === 1 && edge.end[1] === 1), false);
});

test('detects a sharp crease after welding duplicated triangle vertices', () => {
  const positions = [
    0,0,0, 1,0,0, 0,1,0,
    0,0,0, 0,0,1, 1,0,0
  ];
  const edges = require('../src/inference.js').findFeatureEdgeMidpoints(positions);
  const shared = edges.find(edge =>
    edge.midpoint[0] === 0.5 && edge.midpoint[1] === 0 && edge.midpoint[2] === 0);
  assert.ok(shared, 'gemeinsame scharfe Kante fehlt');
  assert.equal(shared.boundary, false);
});

test('returns no feature edges for malformed or degenerate geometry', () => {
  assert.deepEqual(require('../src/inference.js').findFeatureEdgeMidpoints([0,0,0, 1,0,0]), []);
  assert.deepEqual(require('../src/inference.js').findFeatureEdgeMidpoints([0,0,0, 1,0,0, 2,0,0]), []);
});


test('projects the pointer onto the nearest visible segment and interpolates its world position', () => {
  const { findNearestPointOnSegments } = require('../src/inference.js');
  const result = findNearestPointOnSegments([
    { id: 'edge', start: { screenX: 0, screenY: 0, world: [0, 0, 0] }, end: { screenX: 100, screenY: 0, world: [10, 0, 0] } }
  ], { x: 35, y: 4 }, 12);
  assert.equal(result.id, 'edge');
  assert.equal(result.t, 0.35);
  assert.deepEqual(result.world, [3.5, 0, 0]);
  assert.equal(result.distancePx, 4);
});

test('clamps segment projection to its endpoints and respects pixel tolerance', () => {
  const { findNearestPointOnSegments } = require('../src/inference.js');
  const segment = { start: { screenX: 10, screenY: 10 }, end: { screenX: 20, screenY: 10 } };
  assert.equal(findNearestPointOnSegments([segment], { x: 2, y: 10 }, 7), null);
  const result = findNearestPointOnSegments([segment], { x: 2, y: 10 }, 8.1);
  assert.equal(result.t, 0);
  assert.equal(result.screenX, 10);
});

test('ignores malformed, zero-length and rejected segments', () => {
  const { findNearestPointOnSegments } = require('../src/inference.js');
  const result = findNearestPointOnSegments([
    null,
    { start: { screenX: 1, screenY: 1 }, end: { screenX: 1, screenY: 1 } },
    { id: 'hidden', start: { screenX: 0, screenY: 0 }, end: { screenX: 10, screenY: 0 } }
  ], { x: 5, y: 1 }, 12, segment => segment.id !== 'hidden');
  assert.equal(result, null);
});


test('uses perspective-correct interpolation for projected 3D edges', () => {
  const { findNearestPointOnSegments } = require('../src/inference.js');
  const result = findNearestPointOnSegments([{
    start: { screenX: 0, screenY: 0, world: [0, 0, 0], cameraDepth: 10 },
    end: { screenX: 100, screenY: 0, world: [3, 0, 0], cameraDepth: 20 }
  }], { x: 50, y: 0 }, 1);
  assert.equal(result.t, 0.5);
  assert.ok(Math.abs(result.worldT - 1 / 3) < 1e-12);
  assert.ok(Math.abs(result.world[0] - 1) < 1e-12);
});

test('finds an interior crossing and averages matching world positions', () => {
  const { findSegmentIntersections } = require('../src/inference.js');
  const intersections = findSegmentIntersections([
    { start: { screenX: 0, screenY: 5, world: [0, 5, 0] }, end: { screenX: 10, screenY: 5, world: [10, 5, 0] } },
    { start: { screenX: 5, screenY: 0, world: [5, 0, 0] }, end: { screenX: 5, screenY: 10, world: [5, 10, 0] } }
  ]);
  assert.equal(intersections.length, 1);
  assert.deepEqual(intersections[0].world, [5, 5, 0]);
  assert.equal(intersections[0].screenX, 5);
  assert.equal(intersections[0].screenY, 5);
});

test('ignores parallel, collinear and endpoint-only segment contacts', () => {
  const { findSegmentIntersections } = require('../src/inference.js');
  const parallel = [
    { start: { screenX: 0, screenY: 0, world: [0,0,0] }, end: { screenX: 10, screenY: 0, world: [10,0,0] } },
    { start: { screenX: 0, screenY: 2, world: [0,2,0] }, end: { screenX: 10, screenY: 2, world: [10,2,0] } }
  ];
  const endpoint = [
    { start: { screenX: 0, screenY: 0, world: [0,0,0] }, end: { screenX: 5, screenY: 5, world: [5,5,0] } },
    { start: { screenX: 5, screenY: 5, world: [5,5,0] }, end: { screenX: 10, screenY: 0, world: [10,0,0] } }
  ];
  assert.deepEqual(findSegmentIntersections(parallel), []);
  assert.deepEqual(findSegmentIntersections(endpoint), []);
});

test('rejects screen crossings whose projected world positions disagree', () => {
  const { findSegmentIntersections } = require('../src/inference.js');
  const intersections = findSegmentIntersections([
    { start: { screenX: 0, screenY: 5, world: [0,5,0] }, end: { screenX: 10, screenY: 5, world: [10,5,0] } },
    { start: { screenX: 5, screenY: 0, world: [5,0,5] }, end: { screenX: 5, screenY: 10, world: [5,10,5] } }
  ]);
  assert.deepEqual(intersections, []);
});

test('uses perspective-correct interpolation for crossing world positions', () => {
  const { findSegmentIntersections } = require('../src/inference.js');
  const intersections = findSegmentIntersections([
    { start: { screenX: 0, screenY: 5, world: [0,1,0], cameraDepth: 10 }, end: { screenX: 10, screenY: 5, world: [3,1,0], cameraDepth: 20 } },
    { start: { screenX: 5, screenY: 0, world: [1,0,0], cameraDepth: 10 }, end: { screenX: 5, screenY: 10, world: [1,3,0], cameraDepth: 20 } }
  ]);
  assert.equal(intersections.length, 1);
  assert.ok(Math.abs(intersections[0].world[0] - 1) < 1e-12);
  assert.ok(Math.abs(intersections[0].world[1] - 1) < 1e-12);
});


test('constrains a point to the dominant axis of an arbitrary sketch plane', () => {
  const { constrainPointToPlaneAxis } = require('../src/inference.js');
  assert.deepEqual(
    constrainPointToPlaneAxis([1, 2, 3], [4, 7, 3], [1, 0, 0], [0, 1, 0]),
    [4, 2, 3]
  );
  assert.deepEqual(
    constrainPointToPlaneAxis([1, 2, 3], [4, 7, 3], [1, 0, 0], [0, 0, 1]),
    [4, 2, 3]
  );
  assert.deepEqual(
    constrainPointToPlaneAxis([0, 0, 0], [1, 5, 0], [0, 1, 0], [0, 0, 1]),
    [0, 5, 0]
  );
});

test('rejects invalid axes and preserves the start point when movement is zero', () => {
  const { constrainPointToPlaneAxis } = require('../src/inference.js');
  assert.equal(constrainPointToPlaneAxis([0,0,0], [1,1,1], [0,0,0], [0,1,0]), null);
  assert.equal(constrainPointToPlaneAxis([0,0,0], [1,1,1], [1,0,0], [0,1]), null);
  assert.deepEqual(constrainPointToPlaneAxis([2,3,4], [2,3,4], [1,0,0], [0,1,0]), [2,3,4]);
});
