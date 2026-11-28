(() => {
  function findNearestPoint(candidates, pointer, maxDistancePx = 12, acceptCandidate = null) {
    if (!Array.isArray(candidates) || !pointer ||
        !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y) ||
        !Number.isFinite(maxDistancePx) || maxDistancePx < 0) return null;
    const maxDistanceSquared = maxDistancePx * maxDistancePx;
    let best = null;
    let bestDistanceSquared = maxDistanceSquared;
    for (const candidate of candidates) {
      if (!candidate || !Number.isFinite(candidate.screenX) || !Number.isFinite(candidate.screenY)) continue;
      if (typeof acceptCandidate === 'function' && !acceptCandidate(candidate)) continue;
      const dx = candidate.screenX - pointer.x;
      const dy = candidate.screenY - pointer.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < bestDistanceSquared) {
        best = candidate;
        bestDistanceSquared = distanceSquared;
      }
    }
    return best ? { ...best, distancePx: Math.sqrt(bestDistanceSquared) } : null;
  }


  function chooseBestSnapCandidate(candidates, tieTolerancePx = 0.35) {
    if (!Array.isArray(candidates) || !Number.isFinite(tieTolerancePx) || tieTolerancePx < 0) return null;
    const priority = { vertex: 0, intersection: 1, midpoint: 2, edge: 3 };
    let best = null;
    for (const candidate of candidates) {
      if (!candidate || !Number.isFinite(candidate.distancePx) || candidate.distancePx < 0 ||
          !Number.isFinite(candidate.screenX) || !Number.isFinite(candidate.screenY)) continue;
      if (!best || candidate.distancePx < best.distancePx - tieTolerancePx) {
        best = candidate;
        continue;
      }
      if (Math.abs(candidate.distancePx - best.distancePx) <= tieTolerancePx) {
        const candidatePriority = priority[candidate.kind] ?? 99;
        const bestPriority = priority[best.kind] ?? 99;
        if (candidatePriority < bestPriority) best = candidate;
      }
    }
    return best;
  }

  function findNearestPointOnSegments(segments, pointer, maxDistancePx = 12, acceptSegment = null) {
    if (!Array.isArray(segments) || !pointer ||
        !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y) ||
        !Number.isFinite(maxDistancePx) || maxDistancePx < 0) return null;
    const maxDistanceSquared = maxDistancePx * maxDistancePx;
    let best = null;
    let bestDistanceSquared = maxDistanceSquared;
    for (const segment of segments) {
      if (!segment || !segment.start || !segment.end) continue;
      const a = segment.start, b = segment.end;
      if (![a.screenX, a.screenY, b.screenX, b.screenY].every(Number.isFinite)) continue;
      const dx = b.screenX - a.screenX;
      const dy = b.screenY - a.screenY;
      const lengthSquared = dx * dx + dy * dy;
      if (lengthSquared <= 1e-12) continue;
      const rawT = ((pointer.x - a.screenX) * dx + (pointer.y - a.screenY) * dy) / lengthSquared;
      const t = Math.max(0, Math.min(1, rawT));
      const screenX = a.screenX + dx * t;
      const screenY = a.screenY + dy * t;
      const distanceSquared = (pointer.x - screenX) ** 2 + (pointer.y - screenY) ** 2;
      if (distanceSquared >= bestDistanceSquared) continue;
      let worldT = t;
      // Bei perspektivischer Projektion ist die Bildschirm-Interpolation
      // nicht linear zur Position entlang der 3D-Kante.
      if (Number.isFinite(a.cameraDepth) && a.cameraDepth > 0 &&
          Number.isFinite(b.cameraDepth) && b.cameraDepth > 0) {
        const denominator = (1 - t) * b.cameraDepth + t * a.cameraDepth;
        if (denominator > 1e-12) worldT = t * a.cameraDepth / denominator;
      }
      let world = null;
      if (Array.isArray(a.world) && Array.isArray(b.world) &&
          a.world.length >= 3 && b.world.length >= 3 &&
          [...a.world.slice(0, 3), ...b.world.slice(0, 3)].every(Number.isFinite)) {
        world = a.world.slice(0, 3).map((value, index) => value + (b.world[index] - value) * worldT);
      }
      const projected = { ...segment, screenX, screenY, t, worldT, distancePx: Math.sqrt(distanceSquared), world };
      if (typeof acceptSegment === 'function' && !acceptSegment(projected)) continue;
      best = projected;
      bestDistanceSquared = distanceSquared;
    }
    return best;
  }

  function findSegmentIntersections(segments, options = {}) {
    if (!Array.isArray(segments)) return [];
    const minimumParameter = Number.isFinite(options.minimumParameter)
      ? Math.max(0, Math.min(0.49, options.minimumParameter)) : 1e-4;
    const maxWorldSeparation = Number.isFinite(options.maxWorldSeparation) && options.maxWorldSeparation >= 0
      ? options.maxWorldSeparation : 0.5;
    const result = [];
    const interpolateWorld = (segment, t) => {
      const a = segment.start, b = segment.end;
      if (!Array.isArray(a.world) || !Array.isArray(b.world) ||
          a.world.length < 3 || b.world.length < 3 ||
          ![...a.world.slice(0, 3), ...b.world.slice(0, 3)].every(Number.isFinite)) return null;
      let worldT = t;
      if (Number.isFinite(a.cameraDepth) && a.cameraDepth > 0 &&
          Number.isFinite(b.cameraDepth) && b.cameraDepth > 0) {
        const denominator = (1 - t) * b.cameraDepth + t * a.cameraDepth;
        if (denominator > 1e-12) worldT = t * a.cameraDepth / denominator;
      }
      return a.world.slice(0, 3).map((value, index) => value + (b.world[index] - value) * worldT);
    };
    for (let i = 0; i < segments.length; i++) {
      const first = segments[i];
      if (!first?.start || !first?.end) continue;
      const a = first.start, b = first.end;
      if (![a.screenX, a.screenY, b.screenX, b.screenY].every(Number.isFinite)) continue;
      const rx = b.screenX - a.screenX, ry = b.screenY - a.screenY;
      if (rx * rx + ry * ry <= 1e-12) continue;
      for (let j = i + 1; j < segments.length; j++) {
        const second = segments[j];
        if (!second?.start || !second?.end) continue;
        const c = second.start, d = second.end;
        if (![c.screenX, c.screenY, d.screenX, d.screenY].every(Number.isFinite)) continue;
        const sx = d.screenX - c.screenX, sy = d.screenY - c.screenY;
        if (sx * sx + sy * sy <= 1e-12) continue;
        const denominator = rx * sy - ry * sx;
        if (Math.abs(denominator) <= 1e-9) continue;
        const qpx = c.screenX - a.screenX, qpy = c.screenY - a.screenY;
        const t = (qpx * sy - qpy * sx) / denominator;
        const u = (qpx * ry - qpy * rx) / denominator;
        if (t <= minimumParameter || t >= 1 - minimumParameter ||
            u <= minimumParameter || u >= 1 - minimumParameter) continue;
        const worldA = interpolateWorld(first, t);
        const worldB = interpolateWorld(second, u);
        if (!worldA || !worldB) continue;
        const worldSeparation = Math.hypot(
          worldA[0] - worldB[0], worldA[1] - worldB[1], worldA[2] - worldB[2]);
        if (worldSeparation > maxWorldSeparation) continue;
        result.push({
          screenX: a.screenX + rx * t,
          screenY: a.screenY + ry * t,
          world: worldA.map((value, index) => (value + worldB[index]) / 2),
          worldSeparation,
          firstIndex: i,
          secondIndex: j,
          firstT: t,
          secondT: u
        });
      }
    }
    return result;
  }

  function findFeatureEdgeMidpoints(positions, indices = null, options = {}) {
    if (!positions || typeof positions.length !== 'number' || positions.length < 9 || positions.length % 3 !== 0) return [];
    const vertexCount = positions.length / 3;
    const sourceIndices = indices && typeof indices.length === 'number'
      ? indices : Array.from({ length: vertexCount }, (_, index) => index);
    if (sourceIndices.length < 3 || sourceIndices.length % 3 !== 0) return [];
    const weldTolerance = Number.isFinite(options.weldTolerance) && options.weldTolerance > 0
      ? options.weldTolerance : 1e-5;
    const angleDegrees = Number.isFinite(options.angleDegrees)
      ? Math.min(180, Math.max(0, options.angleDegrees)) : 30;
    const cosineThreshold = Math.cos(angleDegrees * Math.PI / 180);
    const welded = new Array(vertexCount);
    const vertexByKey = new Map();
    const coordinates = [];
    for (let index = 0; index < vertexCount; index++) {
      const x = Number(positions[index * 3]);
      const y = Number(positions[index * 3 + 1]);
      const z = Number(positions[index * 3 + 2]);
      if (![x, y, z].every(Number.isFinite)) return [];
      const key = [x, y, z].map(value => Math.round(value / weldTolerance)).join(':');
      let weldedIndex = vertexByKey.get(key);
      if (weldedIndex === undefined) {
        weldedIndex = coordinates.length / 3;
        vertexByKey.set(key, weldedIndex);
        coordinates.push(x, y, z);
      }
      welded[index] = weldedIndex;
    }
    const edges = new Map();
    for (let face = 0; face < sourceIndices.length; face += 3) {
      const ia = Number(sourceIndices[face]);
      const ib = Number(sourceIndices[face + 1]);
      const ic = Number(sourceIndices[face + 2]);
      if (![ia, ib, ic].every(index => Number.isInteger(index) && index >= 0 && index < vertexCount)) return [];
      const a = welded[ia], b = welded[ib], c = welded[ic];
      if (a === b || b === c || c === a) continue;
      const ax = coordinates[a * 3], ay = coordinates[a * 3 + 1], az = coordinates[a * 3 + 2];
      const abx = coordinates[b * 3] - ax, aby = coordinates[b * 3 + 1] - ay, abz = coordinates[b * 3 + 2] - az;
      const acx = coordinates[c * 3] - ax, acy = coordinates[c * 3 + 1] - ay, acz = coordinates[c * 3 + 2] - az;
      let nx = aby * acz - abz * acy;
      let ny = abz * acx - abx * acz;
      let nz = abx * acy - aby * acx;
      const length = Math.hypot(nx, ny, nz);
      if (length <= 1e-12) continue;
      nx /= length; ny /= length; nz /= length;
      for (const [from, to] of [[a, b], [b, c], [c, a]]) {
        const key = from < to ? from + ':' + to : to + ':' + from;
        let edge = edges.get(key);
        if (!edge) {
          edge = { a: Math.min(from, to), b: Math.max(from, to), normals: [] };
          edges.set(key, edge);
        }
        edge.normals.push([nx, ny, nz]);
      }
    }
    const result = [];
    for (const edge of edges.values()) {
      let isFeature = edge.normals.length === 1;
      if (!isFeature && edge.normals.length > 1) {
        outer: for (let i = 0; i < edge.normals.length; i++) {
          for (let j = i + 1; j < edge.normals.length; j++) {
            const first = edge.normals[i], second = edge.normals[j];
            if (first[0] * second[0] + first[1] * second[1] + first[2] * second[2] <= cosineThreshold) {
              isFeature = true;
              break outer;
            }
          }
        }
      }
      if (!isFeature) continue;
      const start = coordinates.slice(edge.a * 3, edge.a * 3 + 3);
      const end = coordinates.slice(edge.b * 3, edge.b * 3 + 3);
      result.push({
        start,
        end,
        midpoint: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2],
        boundary: edge.normals.length === 1
      });
    }
    return result;
  }

  const api = Object.freeze({ findNearestPoint, chooseBestSnapCandidate, findNearestPointOnSegments, findSegmentIntersections, findFeatureEdgeMidpoints });
  if (typeof window !== 'undefined') window.SILMOInference = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
