(function (root, factory) {
  const api = factory(root.THREE);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOSketchGeometry = api;
})(globalThis, function (THREE) {
  if (!THREE || !THREE.ExtrudeGeometry) {
    throw new Error('SILMO-Skizzengeometrie benötigt Three.js.');
  }

  function createExtrusionGeometry(shape, options) {
    if (!shape || typeof shape.getPoints !== 'function') {
      throw new TypeError('Für eine Extrusion wird ein gültiges 2D-Profil benötigt.');
    }
    const geometry = new THREE.ExtrudeGeometry(shape, options);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  return Object.freeze({ createExtrusionGeometry });
});
