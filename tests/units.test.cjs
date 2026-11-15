const test = require('node:test');
const assert = require('node:assert/strict');
const units = require('../src/units.js');

test('SILMO behält 10 mm pro Three.js-Welteinheit', () => {
  assert.equal(units.MM_PER_WORLD_UNIT, 10);
  assert.equal(units.mmToWorldUnits(10), 1);
  assert.equal(units.worldUnitsToMm(1), 10);
});

test('Längenumrechnung erhält Bruchteile und negative Koordinaten', () => {
  assert.equal(units.mmToWorldUnits(2.5), 0.25);
  assert.equal(units.mmToWorldUnits(-25), -2.5);
  assert.equal(units.worldUnitsToMm(-2.5), -25);
});

test('Flächenumrechnung verwendet den quadrierten Längenfaktor', () => {
  assert.equal(units.mm2ToWorldUnits2(100), 1);
  assert.equal(units.worldUnits2ToMm2(1), 100);
  assert.equal(units.mm2ToWorldUnits2(2500), 25);
});

test('Volumen verwendet den kubierten Längenfaktor', () => {
  assert.equal(units.mm3ToWorldUnits3(1000), 1);
  assert.equal(units.worldUnits3ToMm3(1), 1000);
  assert.equal(units.mm3ToWorldUnits3(2500), 2.5);
});

test('API ist unveränderlich', () => {
  assert.equal(Object.isFrozen(units), true);
});
