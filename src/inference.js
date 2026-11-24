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

  const api = Object.freeze({ findNearestPoint });
  if (typeof window !== 'undefined') window.SILMOInference = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
