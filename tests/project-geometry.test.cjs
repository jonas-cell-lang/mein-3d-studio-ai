const test = require('node:test');
const assert = require('node:assert/strict');
const THREE = require('three');
const schema = require('../src/project-schema.js');

globalThis.THREE = THREE;
globalThis.SILMOProjectSchema = schema;
const projectGeometry = require('../src/project-geometry.js');

test('Geometriewiederherstellung gibt teilweise aufgebaute Ressourcen bei Fehlern frei', () => {
  const originalSetAttribute = THREE.BufferGeometry.prototype.setAttribute;
  const originalDispose = THREE.BufferGeometry.prototype.dispose;
  let disposeCalls = 0;

  THREE.BufferGeometry.prototype.setAttribute = function (name, attribute) {
    if (name === 'normal') throw new Error('simulierter Attributfehler');
    return originalSetAttribute.call(this, name, attribute);
  };
  THREE.BufferGeometry.prototype.dispose = function () {
    disposeCalls += 1;
    return originalDispose.call(this);
  };

  const data = {
    attributes: {
      position: { arrayType: 'Float32Array', array: [0,0,0, 1,0,0, 0,1,0], itemSize: 3, normalized: false },
      normal: { arrayType: 'Float32Array', array: [0,0,1, 0,0,1, 0,0,1], itemSize: 3, normalized: false }
    },
    index: null
  };

  try {
    assert.throws(() => projectGeometry.restoreGeometry(data), /simulierter Attributfehler/);
    assert.equal(disposeCalls, 1);
  } finally {
    THREE.BufferGeometry.prototype.setAttribute = originalSetAttribute;
    THREE.BufferGeometry.prototype.dispose = originalDispose;
  }
});
