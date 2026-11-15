(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOUnits = api;
})(globalThis, function () {
  // Bestehende SILMO-Semantik: 1 Three.js-Welteinheit entspricht 10 mm.
  const MM_PER_WORLD_UNIT = 10;

  return Object.freeze({
    MM_PER_WORLD_UNIT,
    mmToWorldUnits(value) {
      return value / MM_PER_WORLD_UNIT;
    },
    worldUnitsToMm(value) {
      return value * MM_PER_WORLD_UNIT;
    },
    mm2ToWorldUnits2(value) {
      return value / (MM_PER_WORLD_UNIT * MM_PER_WORLD_UNIT);
    },
    worldUnits2ToMm2(value) {
      return value * MM_PER_WORLD_UNIT * MM_PER_WORLD_UNIT;
    },
    mm3ToWorldUnits3(value) {
      return value / (MM_PER_WORLD_UNIT * MM_PER_WORLD_UNIT * MM_PER_WORLD_UNIT);
    },
    worldUnits3ToMm3(value) {
      return value * MM_PER_WORLD_UNIT * MM_PER_WORLD_UNIT * MM_PER_WORLD_UNIT;
    }
  });
});
