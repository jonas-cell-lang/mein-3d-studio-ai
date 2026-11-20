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


  function resampleClosedOutline(points, count = 64, minimumPerimeter = 1e-8) {
    if (!Array.isArray(points) || points.length < 3 || !Number.isInteger(count) || count < 3) {
      throw new TypeError('Für ein Loft wird eine geschlossene Kontur mit mindestens drei Punkten benötigt.');
    }
    const pts = points.map(point => {
      if (!Array.isArray(point) || point.length < 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
        throw new TypeError('Die Loft-Kontur enthält ungültige Punkte.');
      }
      return new THREE.Vector2(point[0], point[1]);
    });
    const lengths = [];
    let total = 0;
    for (let i = 0; i < pts.length; i++) {
      const length = pts[i].distanceTo(pts[(i + 1) % pts.length]);
      lengths.push(length);
      total += length;
    }
    if (!Number.isFinite(total) || total < minimumPerimeter) throw new Error('Profilkontur ist ungültig.');
    const result = [];
    for (let k = 0; k < count; k++) {
      let target = total * k / count, segment = 0;
      while (segment < lengths.length - 1 && target > lengths[segment]) {
        target -= lengths[segment];
        segment++;
      }
      const a = pts[segment], b = pts[(segment + 1) % pts.length];
      const t = lengths[segment] > 0 ? target / lengths[segment] : 0;
      result.push(a.clone().lerp(b, t));
    }
    return result;
  }

  function appendTriangle(vertices, a, b, c) {
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }


  function createPathCurve(pathPoints, type) {
    if (!Array.isArray(pathPoints) || pathPoints.length < 2 ||
        !pathPoints.every(point => Array.isArray(point) && point.length >= 3 && point.slice(0, 3).every(Number.isFinite))) {
      throw new TypeError('Ein Pfad benötigt mindestens zwei gültige 3D-Punkte.');
    }
    const points = pathPoints.map(point => new THREE.Vector3(point[0], point[1], point[2]));
    return type === 'line2d'
      ? new THREE.LineCurve3(points[0], points[points.length - 1])
      : new THREE.CatmullRomCurve3(points);
  }

  function createPathTubeGeometry(pathPoints, type, radius, tubularSegments, radialSegments = 8) {
    if (!Number.isFinite(radius) || radius <= 0 ||
        !Number.isInteger(tubularSegments) || tubularSegments < 1 ||
        !Number.isInteger(radialSegments) || radialSegments < 3) {
      throw new TypeError('Pfadradius und Segmentzahlen müssen gültig und positiv sein.');
    }
    const curve = createPathCurve(pathPoints, type);
    const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return { curve, geometry };
  }

  function createLoftGeometry(ringA, ringB) {
    if (!Array.isArray(ringA) || !Array.isArray(ringB) || ringA.length < 3 || ringA.length !== ringB.length ||
        !ringA.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)) ||
        !ringB.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z))) {
      throw new TypeError('Loft-Ringe müssen gleich viele gültige 3D-Punkte enthalten.');
    }
    const vertices = [];
    for (let i = 0; i < ringA.length; i++) {
      const next = (i + 1) % ringA.length;
      appendTriangle(vertices, ringA[i], ringA[next], ringB[i]);
      appendTriangle(vertices, ringA[next], ringB[next], ringB[i]);
    }
    const cap = (ring, reverse) => {
      const contour = ring.map(point => new THREE.Vector2(point.x, point.y));
      const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
      triangles.forEach(triangle => {
        const ids = reverse ? [triangle[2], triangle[1], triangle[0]] : triangle;
        appendTriangle(vertices, ring[ids[0]], ring[ids[1]], ring[ids[2]]);
      });
    };
    cap(ringA, true);
    cap(ringB, false);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
      geometry.dispose();
      throw new Error('Loft konnte keine gültige Geometrie erzeugen.');
    }
    return geometry;
  }

  function createSweepGeometry(outline, pathPoints, options = {}) {
    if (!Array.isArray(outline) || outline.length < 3 ||
        !outline.every(point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])) ||
        !Array.isArray(pathPoints) || pathPoints.length < 2 ||
        !pathPoints.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z))) {
      throw new TypeError('Sweep benötigt ein gültiges geschlossenes Profil und mindestens zwei 3D-Pfadpunkte.');
    }
    const shape = new THREE.Shape();
    shape.moveTo(outline[0][0], outline[0][1]);
    outline.slice(1).forEach(point => shape.lineTo(point[0], point[1]));
    shape.closePath();
    const curve = new THREE.CatmullRomCurve3(pathPoints);
    const geometry = createExtrusionGeometry(shape, {
      steps: Math.max(48, pathPoints.length * 16),
      bevelEnabled: false,
      extrudePath: curve,
      curveSegments: 24,
      ...options
    });
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
      geometry.dispose();
      throw new Error('Sweep konnte keine gültige Geometrie erzeugen.');
    }
    return geometry;
  }

  return Object.freeze({ createExtrusionGeometry, createParametricProfile, addRoundedRectPath, resampleClosedOutline, createLoftGeometry, createSweepGeometry, createPathCurve, createPathTubeGeometry });
});
