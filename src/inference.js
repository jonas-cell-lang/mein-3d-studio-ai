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


  function findNearestPointOnSegments(segments, pointer, maxDistancePx = 12, acceptSegment = null) {
    if (!Array.isArray(segments) || !pointer ||
        !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y) ||
        !Number.isFinite(maxDistancePx) || maxDistancePx < 0) return null;
    const maxDistanceSquared = maxDistancePx * maxDistancePx;
    let best = null;
    let bestDistanceSquared = maxDistanceSquared;
    for (const segment of segments) {
      if (!segment || !segment.start || !segment.end) continue;
      if (typeof acceptSegment === 'function' && !acceptSegment(segment)) continue;
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
      let world = null;
      if (Array.isArray(a.world) && Array.isArray(b.world) &&
          a.world.length >= 3 && b.world.length >= 3 &&
          [...a.world.slice(0, 3), ...b.world.slice(0, 3)].every(Number.isFinite)) {
        world = a.world.slice(0, 3).map((value, index) => value + (b.world[index] - value) * t);
      }
      best = { ...segment, screenX, screenY, t, distancePx: Math.sqrt(distanceSquared), world };
      bestDistanceSquared = distanceSquared;
    }
    return best;
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

  const api = Object.freeze({ findNearestPoint, findNearestPointOnSegments, findFeatureEdgeMidpoints });
  if (typeof window !== 'undefined') window.SILMOInference = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
