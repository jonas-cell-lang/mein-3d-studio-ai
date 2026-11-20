(function (root, factory) {
  const api = factory(root.THREE);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOSketchGeometry = api;
})(globalThis, function (THREE) {
  if (!THREE || !THREE.ExtrudeGeometry) {
    throw new Error('SILMO-Skizzengeometrie benötigt Three.js.');
  }

  function addRoundedRectPath(path, width, height, radius, offsetX = 0, offsetY = 0, reverse = false) {
    const halfWidth = width / 2, halfHeight = height / 2;
    const corner = Math.min(Math.max(0.01, radius), halfWidth, halfHeight);
    if (!reverse) {
      path.moveTo(offsetX - halfWidth + corner, offsetY - halfHeight);
      path.lineTo(offsetX + halfWidth - corner, offsetY - halfHeight);
      path.quadraticCurveTo(offsetX + halfWidth, offsetY - halfHeight, offsetX + halfWidth, offsetY - halfHeight + corner);
      path.lineTo(offsetX + halfWidth, offsetY + halfHeight - corner);
      path.quadraticCurveTo(offsetX + halfWidth, offsetY + halfHeight, offsetX + halfWidth - corner, offsetY + halfHeight);
      path.lineTo(offsetX - halfWidth + corner, offsetY + halfHeight);
      path.quadraticCurveTo(offsetX - halfWidth, offsetY + halfHeight, offsetX - halfWidth, offsetY + halfHeight - corner);
      path.lineTo(offsetX - halfWidth, offsetY - halfHeight + corner);
      path.quadraticCurveTo(offsetX - halfWidth, offsetY - halfHeight, offsetX - halfWidth + corner, offsetY - halfHeight);
    } else {
      path.moveTo(offsetX - halfWidth + corner, offsetY - halfHeight);
      path.quadraticCurveTo(offsetX - halfWidth, offsetY - halfHeight, offsetX - halfWidth, offsetY - halfHeight + corner);
      path.lineTo(offsetX - halfWidth, offsetY + halfHeight - corner);
      path.quadraticCurveTo(offsetX - halfWidth, offsetY + halfHeight, offsetX - halfWidth + corner, offsetY + halfHeight);
      path.lineTo(offsetX + halfWidth - corner, offsetY + halfHeight);
      path.quadraticCurveTo(offsetX + halfWidth, offsetY + halfHeight, offsetX + halfWidth, offsetY + halfHeight - corner);
      path.lineTo(offsetX + halfWidth, offsetY - halfHeight + corner);
      path.quadraticCurveTo(offsetX + halfWidth, offsetY - halfHeight, offsetX + halfWidth - corner, offsetY - halfHeight);
      path.lineTo(offsetX - halfWidth + corner, offsetY - halfHeight);
    }
  }

  function createParametricProfile(type, dimensions, cornerRadius = 0) {
    if (!dimensions || !Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.depth) ||
        dimensions.width <= 0 || dimensions.depth <= 0) {
      throw new TypeError('Ein Skizzenprofil benötigt gültige positive Abmessungen.');
    }
    const width = dimensions.width, depth = dimensions.depth;
    const shape = new THREE.Shape();
    if (type === 'circle') {
      shape.absarc(0, 0, width / 2, 0, Math.PI * 2, false);
    } else if (type === 'ellipse') {
      shape.absellipse(0, 0, width / 2, depth / 2, 0, Math.PI * 2, false, 0);
    } else if (type === 'triangle') {
      const x = width / 2, y = depth / 2;
      shape.moveTo(-x, -y); shape.lineTo(x, -y); shape.lineTo(0, y); shape.closePath();
    } else if (type === 'roundedRectangle') {
      addRoundedRectPath(shape, width, depth, cornerRadius);
      shape.closePath();
    } else {
      const x = width / 2, y = depth / 2;
      shape.moveTo(-x, -y); shape.lineTo(x, -y);
      shape.lineTo(x, y); shape.lineTo(-x, y); shape.closePath();
    }
    return shape;
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

  return Object.freeze({ createExtrusionGeometry, createParametricProfile, addRoundedRectPath });
});
