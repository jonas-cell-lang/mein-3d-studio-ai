(function (root, factory) {
  const api = factory(root.THREE, root.SILMOTolerances);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOSketchGeometry = api;
})(globalThis, function (THREE, TOLERANCES = {}) {
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
    const maximumOutlinePoints = 10000, maximumSamples = 10000;
    if (!Array.isArray(points) || points.length < 3 || points.length > maximumOutlinePoints ||
        !Number.isInteger(count) || count < 3 || count > maximumSamples ||
        !Number.isFinite(minimumPerimeter) || minimumPerimeter <= 0) {
      throw new TypeError('Für ein Loft wird eine gültige geschlossene Kontur sowie eine begrenzte positive Abtastung benötigt.');
    }
    const pts = points.map(point => {
      if (!Array.isArray(point) || point.length < 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
        throw new TypeError('Die Loft-Kontur enthält ungültige Punkte.');
      }
      return new THREE.Vector2(point[0], point[1]);
    });
    const samePoint = (a, b) => a.x === b.x && a.y === b.y;
    if (pts.length > 3 && samePoint(pts[0], pts[pts.length - 1])) pts.pop();
    if (pts.length < 3 || pts.some((point, index) => samePoint(point, pts[(index + 1) % pts.length]))) {
      throw new Error('Profilkontur ist ungültig: Nullkanten werden nicht unterstützt.');
    }
    const lengths = [];
    let total = 0;
    for (let i = 0; i < pts.length; i++) {
      const length = pts[i].distanceTo(pts[(i + 1) % pts.length]);
      if (!Number.isFinite(length) || length <= 0) throw new Error('Profilkontur ist ungültig.');
      lengths.push(length);
      total += length;
    }
    if (!Number.isFinite(total) || total < minimumPerimeter) throw new Error('Profilkontur ist ungültig.');
    const result = [];
    let segment = 0, segmentStart = 0;
    for (let k = 0; k < count; k++) {
      const target = total * k / count;
      while (segment < lengths.length - 1 && target > segmentStart + lengths[segment]) {
        segmentStart += lengths[segment];
        segment++;
      }
      const a = pts[segment], b = pts[(segment + 1) % pts.length];
      const t = Math.max(0, Math.min(1, (target - segmentStart) / lengths[segment]));
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
    const maximumPathPoints = 1000;
    if (!Array.isArray(pathPoints) || pathPoints.length < 2 || pathPoints.length > maximumPathPoints ||
        !pathPoints.every(point => Array.isArray(point) && point.length >= 3 && point.slice(0, 3).every(Number.isFinite))) {
      throw new TypeError('Ein Pfad benötigt mindestens zwei gültige 3D-Punkte.');
    }
    const points = pathPoints.map(point => new THREE.Vector3(point[0], point[1], point[2]));
    return type === 'line2d'
      ? new THREE.LineCurve3(points[0], points[points.length - 1])
      : new THREE.CatmullRomCurve3(points);
  }

  function createPathTubeGeometry(pathPoints, type, radius, tubularSegments, radialSegments = 8) {
    const maximumTubularSegments = 10000, maximumRadialSegments = 256;
    const maximumTubeVertices = 250000;
    if (!Number.isFinite(radius) || radius <= 0 ||
        !Number.isInteger(tubularSegments) || tubularSegments < 1 || tubularSegments > maximumTubularSegments ||
        !Number.isInteger(radialSegments) || radialSegments < 3 || radialSegments > maximumRadialSegments ||
        (tubularSegments + 1) * (radialSegments + 1) > maximumTubeVertices) {
      throw new TypeError('Pfadradius und Segmentzahlen müssen gültig und positiv sein.');
    }
    const curve = createPathCurve(pathPoints, type);
    const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return { curve, geometry };
  }

  function createLoftGeometry(ringA, ringB, options = {}) {
    const maximumRingPoints = 512, maximumHoleRings = 64, maximumTotalProfilePoints = 4096;
    const validRing = ring => Array.isArray(ring) && ring.length >= 3 && ring.length <= maximumRingPoints &&
      ring.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));
    if (!validRing(ringA) || !validRing(ringB) || ringA.length !== ringB.length ||
        !options || typeof options !== 'object') {
      throw new TypeError('Loft-Ringe müssen gleich viele gültige 3D-Punkte enthalten.');
    }
    const holesA = options.holesA || [], holesB = options.holesB || [];
    if (!Array.isArray(holesA) || !Array.isArray(holesB) ||
        holesA.length > maximumHoleRings || holesB.length > maximumHoleRings ||
        holesA.length !== holesB.length ||
        !holesA.every((ring, index) => validRing(ring) && ring.length === holesB[index]?.length) ||
        !holesB.every(validRing) ||
        ringA.length + ringB.length + holesA.reduce((sum, ring) => sum + (Array.isArray(ring) ? ring.length : 0), 0) +
          holesB.reduce((sum, ring) => sum + (Array.isArray(ring) ? ring.length : 0), 0) > maximumTotalProfilePoints) {
      throw new TypeError('Loft-Innenkonturen müssen paarweise gültig sein und innerhalb der Punkt- und Ringgrenzen liegen.');
    }
    const alignRingPair = (a, b) => {
      const center = ring => ring.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / ring.length);
      const ca = center(a), cb = center(b);
      const radius = (ring, centroid) => Math.sqrt(
        ring.reduce((sum, point) => sum + point.distanceToSquared(centroid), 0) / ring.length
      ) || 1;
      const ra = radius(a, ca), rb = radius(b, cb);
      let best = null, bestCost = Infinity;
      for (const direction of [1, -1]) {
        for (let shift = 0; shift < b.length; shift++) {
          const candidate = b.map((_, index) => b[(shift + direction * index + b.length * 2) % b.length]);
          let cost = 0;
          for (let index = 0; index < a.length; index++) {
            const pa = a[index].clone().sub(ca).multiplyScalar(1 / ra);
            const pb = candidate[index].clone().sub(cb).multiplyScalar(1 / rb);
            cost += pa.distanceToSquared(pb);
          }
          if (cost < bestCost) { bestCost = cost; best = candidate; }
        }
      }
      return best;
    };
    const alignedB = options.alignProfiles === false ? ringB : alignRingPair(ringA, ringB);
    const alignedHolesB = holesA.map((hole, index) =>
      options.alignProfiles === false ? holesB[index] : alignRingPair(hole, holesB[index]));
    const vertices = [];
    const connect = (a, b) => {
      for (let i = 0; i < a.length; i++) {
        const next = (i + 1) % a.length;
        appendTriangle(vertices, a[i], a[next], b[i]);
        appendTriangle(vertices, a[next], b[next], b[i]);
      }
    };
    connect(ringA, alignedB);
    holesA.forEach((hole, index) => connect(hole, alignedHolesB[index]));

    const cap = (outer, holes, reverse) => {
      const origin = outer[0];
      let normal = new THREE.Vector3();
      for (let i = 0; i < outer.length; i++) {
        const a = outer[i], b = outer[(i + 1) % outer.length];
        normal.x += (a.y - b.y) * (a.z + b.z);
        normal.y += (a.z - b.z) * (a.x + b.x);
        normal.z += (a.x - b.x) * (a.y + b.y);
      }
      if (normal.lengthSq() < Math.pow(TOLERANCES.LOFT_PROFILE_MIN_NORMAL_WORLD_UNITS || 1e-9, 2)) throw new Error('Loft-Profil ist entartet und kann nicht gekappt werden.');
      normal.normalize();
      const u = outer[1].clone().sub(origin);
      if (u.lengthSq() < Math.pow(TOLERANCES.LOFT_PROFILE_MIN_NORMAL_WORLD_UNITS || 1e-9, 2)) throw new Error('Loft-Profil enthält aufeinanderfolgende identische Punkte.');
      u.normalize();
      const v = new THREE.Vector3().crossVectors(normal, u).normalize();
      const project = ring => ring.map(point => {
        const delta = point.clone().sub(origin);
        if (Math.abs(delta.dot(normal)) > (TOLERANCES.LOFT_PROFILE_PLANARITY_WORLD_UNITS || 1e-6)) throw new Error('Loft-Endprofile müssen jeweils planar sein.');
        return new THREE.Vector2(delta.dot(u), delta.dot(v));
      });
      const contours = [project(outer), ...holes.map(project)];
      const triangles = THREE.ShapeUtils.triangulateShape(contours[0], contours.slice(1));
      if (!triangles.length) throw new Error('Loft-Profil konnte nicht trianguliert werden.');
      const points = [outer, ...holes].flat();
      triangles.forEach(triangle => {
        let ids = triangle.slice();
        const a = points[ids[0]], b = points[ids[1]], c = points[ids[2]];
        const ab = b.clone().sub(a), ac = c.clone().sub(a);
        const faceNormal = new THREE.Vector3().crossVectors(ab, ac);
        const shouldPointAlongNormal = !reverse;
        if ((faceNormal.dot(normal) > 0) !== shouldPointAlongNormal) ids = [ids[0], ids[2], ids[1]];
        appendTriangle(vertices, points[ids[0]], points[ids[1]], points[ids[2]]);
      });
    };
    cap(ringA, holesA, true);
    cap(alignedB, alignedHolesB, false);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty() || !geometry.attributes.position.count) {
      geometry.dispose();
      throw new Error('Loft konnte keine gültige Geometrie erzeugen.');
    }
    return geometry;
  }

  function createSweepGeometry(outline, pathPoints, options = {}) {
    const maximumSweepProfilePoints = 256, maximumSweepPathPoints = 256;
    if (!Array.isArray(outline) || outline.length < 3 || outline.length > maximumSweepProfilePoints ||
        !outline.every(point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])) ||
        !Array.isArray(pathPoints) || pathPoints.length < 2 || pathPoints.length > maximumSweepPathPoints ||
        !pathPoints.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)) ||
        !options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('Sweep benötigt ein gültiges geschlossenes Profil und mindestens zwei 3D-Pfadpunkte.');
    }
    const shape = new THREE.Shape();
    shape.moveTo(outline[0][0], outline[0][1]);
    outline.slice(1).forEach(point => shape.lineTo(point[0], point[1]));
    shape.closePath();
    const curve = new THREE.CatmullRomCurve3(pathPoints);
    const geometry = createExtrusionGeometry(shape, {
      ...options,
      steps: Math.max(48, pathPoints.length * 16),
      bevelEnabled: false,
      extrudePath: curve,
      curveSegments: 24
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
    const points = outline.map(point => [point[0], point[1]]);
    const samePoint = (a, b) => a[0] === b[0] && a[1] === b[1];
    if (points.length > 3 && samePoint(points[0], points[points.length - 1])) points.pop();
    if (points.length < 3 || points.some((point, index) => samePoint(point, points[(index + 1) % points.length]))) {
      throw new TypeError('Kantenbearbeitung benötigt mindestens drei unterschiedliche Konturpunkte ohne Nullkanten.');
    }
    if (points.length > 1000) {
      throw new RangeError('Kantenbearbeitung unterstützt höchstens 1000 Konturpunkte.');
    }
    const cross = (a, b, c) =>
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const onSegment = (point, a, b) =>
      Math.abs(cross(a, b, point)) <= 1e-12 &&
      point[0] >= Math.min(a[0], b[0]) - 1e-12 &&
      point[0] <= Math.max(a[0], b[0]) + 1e-12 &&
      point[1] >= Math.min(a[1], b[1]) - 1e-12 &&
      point[1] <= Math.max(a[1], b[1]) + 1e-12;
    const intersects = (a, b, c, d) => {
      const abC = cross(a, b, c), abD = cross(a, b, d);
      const cdA = cross(c, d, a), cdB = cross(c, d, b);
      if (((abC > 1e-12 && abD < -1e-12) || (abC < -1e-12 && abD > 1e-12)) &&
          ((cdA > 1e-12 && cdB < -1e-12) || (cdA < -1e-12 && cdB > 1e-12))) return true;
      return (Math.abs(abC) <= 1e-12 && onSegment(c, a, b)) ||
        (Math.abs(abD) <= 1e-12 && onSegment(d, a, b)) ||
        (Math.abs(cdA) <= 1e-12 && onSegment(a, c, d)) ||
        (Math.abs(cdB) <= 1e-12 && onSegment(b, c, d));
    };
    for (let i = 0; i < points.length; i++) {
      const previous = points[(i + points.length - 1) % points.length];
      const current = points[i];
      const next = points[(i + 1) % points.length];
      if (Math.abs(cross(previous, current, next)) <= 1e-12 &&
          (onSegment(previous, current, next) || onSegment(next, previous, current))) {
        throw new TypeError('Kantenbearbeitung unterstützt keine überlappenden benachbarten Konturkanten.');
      }
    }
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      for (let j = i + 1; j < points.length; j++) {
        if (j === i || j === (i + 1) % points.length || i === (j + 1) % points.length) continue;
        if (intersects(a, b, points[j], points[(j + 1) % points.length])) {
          throw new TypeError('Kantenbearbeitung benötigt eine einfache, nicht selbstüberschneidende Kontur.');
        }
      }
    }
    const twiceArea = points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0);
    if (!Number.isFinite(twiceArea) || Math.abs(twiceArea) <= 1e-12) {
      throw new TypeError('Kantenbearbeitung benötigt eine Kontur mit einer Fläche grösser null.');
    }
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(point => shape.lineTo(point[0], point[1]));
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
