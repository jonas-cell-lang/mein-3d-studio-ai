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
