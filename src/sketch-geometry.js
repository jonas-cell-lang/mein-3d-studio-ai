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



  function createContourFrameGeometry(outline, thickness, height, tolerances, minimumDimension = 1e-9) {
    if (!Array.isArray(outline) || outline.length < 3 || outline.length > 240 ||
        !outline.every(point => Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])) ||
        !Number.isFinite(thickness) || thickness <= 0 || !Number.isFinite(height) || height <= 0 ||
        !tolerances) {
      throw new TypeError('Hohlrahmen benötigt eine gültige Kontur sowie positive Wandstärke und Höhe.');
    }
    const outer = outline.map(point => new THREE.Vector2(point[0], point[1]));
    const signedArea = points => points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2;
    const area = signedArea(outer);
    if (!Number.isFinite(area) || Math.abs(area) < tolerances.CONTOUR_FRAME_MIN_AREA_WORLD_UNITS2) {
      throw new Error('Die Rückwand-Kontur ist zu klein oder ungültig.');
    }
    const ccw = area > 0, inner = [];
    const cross = (a, b) => a.x * b.y - a.y * b.x;
    for (let i = 0; i < outer.length; i++) {
      const previous = outer[(i + outer.length - 1) % outer.length], point = outer[i], next = outer[(i + 1) % outer.length];
      const edge1 = new THREE.Vector2(point.x - previous.x, point.y - previous.y);
      const edge2 = new THREE.Vector2(next.x - point.x, next.y - point.y);
      if (edge1.length() < tolerances.CONTOUR_FRAME_MIN_EDGE_WORLD_UNITS ||
          edge2.length() < tolerances.CONTOUR_FRAME_MIN_EDGE_WORLD_UNITS) continue;
      edge1.normalize(); edge2.normalize();
      const normal1 = ccw ? new THREE.Vector2(-edge1.y, edge1.x) : new THREE.Vector2(edge1.y, -edge1.x);
      const normal2 = ccw ? new THREE.Vector2(-edge2.y, edge2.x) : new THREE.Vector2(edge2.y, -edge2.x);
      const offset1 = point.clone().addScaledVector(normal1, thickness);
      const offset2 = point.clone().addScaledVector(normal2, thickness);
      const denominator = cross(edge1, edge2);
      let hit;
      if (Math.abs(denominator) < tolerances.CONTOUR_FRAME_PARALLEL_CROSS_MIN) {
        const normal = normal1.clone().add(normal2);
        if (normal.length() < tolerances.CONTOUR_FRAME_MIN_NORMAL_WORLD_UNITS) throw new Error('Kontur enthält einen ungültigen Knick.');
        hit = point.clone().addScaledVector(normal.normalize(), thickness);
      } else {
        const distance = cross(new THREE.Vector2(offset2.x - offset1.x, offset2.y - offset1.y), edge2) / denominator;
        hit = offset1.clone().addScaledVector(edge1, distance);
      }
      if (hit.distanceTo(point) > thickness * tolerances.CONTOUR_FRAME_MITER_LIMIT_FACTOR + tolerances.CONTOUR_FRAME_MITER_ALLOWANCE_WORLD_UNITS) {
        throw new Error('Die Kontur ist für diese Wandstärke zu eng. Verringere die Wandstärke.');
      }
      inner.push(hit);
    }
    const distanceToSegment = (point, start, end) => {
      const edge = end.clone().sub(start);
      const lengthSquared = edge.lengthSq();
      const t = lengthSquared > 0 ? Math.max(0, Math.min(1, point.clone().sub(start).dot(edge) / lengthSquared)) : 0;
      return point.distanceTo(start.clone().addScaledVector(edge, t));
    };
    for (const point of inner) {
      let nearestBoundary = Infinity;
      for (let i = 0; i < outer.length; i++) {
        nearestBoundary = Math.min(nearestBoundary, distanceToSegment(point, outer[i], outer[(i + 1) % outer.length]));
      }
      if (nearestBoundary + tolerances.CONTOUR_FRAME_MIN_EDGE_WORLD_UNITS < thickness) {
        throw new Error('Innenkontur ist zu eng oder überschreitet die ursprüngliche Kontur. Verringere die Wandstärke.');
      }
    }
    const innerArea = signedArea(inner);
    if (inner.length < 3 || Math.abs(innerArea) < tolerances.CONTOUR_FRAME_MIN_AREA_WORLD_UNITS2 || Math.sign(innerArea) !== Math.sign(area)) {
      throw new Error('Innenkontur ist zu eng oder überschneidet sich. Verringere die Wandstärke oder glätte die gezeichnete Kontur.');
    }
    const shape = new THREE.Shape();
    shape.moveTo(outer[0].x, outer[0].y);
    outer.slice(1).forEach(point => shape.lineTo(point.x, point.y));
    shape.closePath();
    const hole = new THREE.Path(), reversed = inner.slice().reverse();
    hole.moveTo(reversed[0].x, reversed[0].y);
    reversed.slice(1).forEach(point => hole.lineTo(point.x, point.y));
    hole.closePath();
    shape.holes.push(hole);
    const geometry = createExtrusionGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 16 });
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    if (![size.x, size.y, size.z].every(value => Number.isFinite(value) && value > minimumDimension)) {
      geometry.dispose();
      throw new Error('Hohlrahmen hat ungültige Abmessungen.');
    }
    return geometry;
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


  function createEdgeTreatmentGeometry(outline, depth, bevel, mode) {
    if (!Array.isArray(outline) || outline.length < 3 ||
        !outline.every(point => Array.isArray(point) && point.length >= 2 &&
          Number.isFinite(point[0]) && Number.isFinite(point[1])) ||
        !Number.isFinite(depth) || depth <= 0 ||
        !Number.isFinite(bevel) || bevel <= 0 ||
        (mode !== 'fillet' && mode !== 'chamfer')) {
      throw new TypeError('Kantenbearbeitung benötigt eine gültige Kontur, positive Tiefe und Fasenbreite sowie einen gültigen Modus.');
    }
    const shape = new THREE.Shape();
    shape.moveTo(outline[0][0], outline[0][1]);
    outline.slice(1).forEach(point => shape.lineTo(point[0], point[1]));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: mode === 'fillet' ? 8 : 1,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 32
    });
    try {
      geometry.translate(0, 0, bevel);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      if (!geometry.boundingBox || geometry.boundingBox.isEmpty() ||
          !geometry.attributes.position || geometry.attributes.position.count < 3) {
        throw new Error('Kantenbearbeitung konnte keine gültige Geometrie erzeugen.');
      }
      return geometry;
    } catch (error) {
      geometry.dispose();
      throw error;
    }
  }

  return Object.freeze({ createExtrusionGeometry, createParametricProfile, addRoundedRectPath, resampleClosedOutline, createLoftGeometry, createSweepGeometry, createPathCurve, createPathTubeGeometry, createContourFrameGeometry, createEdgeTreatmentGeometry });
});
