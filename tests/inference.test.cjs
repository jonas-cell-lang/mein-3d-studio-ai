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
