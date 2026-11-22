(function (root, factory) {
  const api = factory(root.THREE);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOPrimitiveGeometry = api;
})(globalThis, function (THREE) {
  if (!THREE || !THREE.BoxGeometry) {
    throw new Error('SILMO-Grundkörper benötigen Three.js.');
  }

  function createPrimitiveGeometry(type) {
    let geometry;
    if (type === 'Würfel') geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    else if (type === 'Kugel') geometry = new THREE.SphereGeometry(0.8, 32, 24);
    else if (type === 'Zylinder') geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.5, 32);
    else if (type === 'Kegel') geometry = new THREE.ConeGeometry(0.8, 1.5, 48);
    else if (type === 'Sechskant-Prisma') geometry = new THREE.CylinderGeometry(0.85, 0.85, 1.5, 6);
    else if (type === 'Ring / Torus') geometry = new THREE.TorusGeometry(0.65, 0.18, 16, 48);
    else geometry = new THREE.BoxGeometry(1, 1, 1);

    // Three.js-Standardformen haben ihre Höhe entlang Y. SILMO verwendet Z als Höhenachse.
    if (type !== 'Ring / Torus') geometry.rotateX(Math.PI / 2);
    geometry.computeBoundingBox();
    return geometry;
  }

  return Object.freeze({ createPrimitiveGeometry });
});
