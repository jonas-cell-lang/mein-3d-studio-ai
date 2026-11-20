(function (root, factory) {
  const api = factory(root.THREE, root.SILMOTolerances);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOCSG = api;
})(globalThis, function (THREE, tolerances) {
  if (!THREE || !tolerances) throw new Error('SILMO-CSG benötigt Three.js und die Toleranz-API.');
  const CSG_EPSILON = tolerances.CSG_GEOMETRY_WORLD_UNITS;

  class CSGVertex {
    constructor(pos) { this.pos = pos.clone(); }
    clone() { return new CSGVertex(this.pos); }
    interpolate(other, t) { return new CSGVertex(this.pos.clone().lerp(other.pos, t)); }
  }
  class CSGPlane {
    constructor(normal, w) { this.normal = normal.clone(); this.w = w; }
    clone() { return new CSGPlane(this.normal, this.w); }
    flip() { this.normal.negate(); this.w = -this.w; }
    splitPolygon(poly, coplanarFront, coplanarBack, front, back) {
      const COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;
      let polygonType = 0;
      const types = poly.vertices.map(v => {
        const t = this.normal.dot(v.pos) - this.w;
        const type = t < -CSG_EPSILON ? BACK : t > CSG_EPSILON ? FRONT : COPLANAR;
        polygonType |= type; return type;
      });
      if (polygonType === COPLANAR) {
        (this.normal.dot(poly.plane.normal) > 0 ? coplanarFront : coplanarBack).push(poly);
      } else if (polygonType === FRONT) front.push(poly);
      else if (polygonType === BACK) back.push(poly);
      else {
        const f = [], b = [];
        for (let i = 0; i < poly.vertices.length; i++) {
          const j = (i + 1) % poly.vertices.length;
          const ti = types[i], tj = types[j], vi = poly.vertices[i], vj = poly.vertices[j];
          if (ti !== BACK) f.push(vi);
          if (ti !== FRONT) b.push(ti === BACK ? vi : vi.clone());
          if ((ti | tj) === SPANNING) {
            const direction = vj.pos.clone().sub(vi.pos);
            const denom = this.normal.dot(direction);
            if (Math.abs(denom) > CSG_EPSILON) {
              const t = (this.w - this.normal.dot(vi.pos)) / denom;
              const v = vi.interpolate(vj, Math.max(0, Math.min(1, t)));
              f.push(v); b.push(v.clone());
            }
          }
        }
        if (f.length >= 3) front.push(new CSGPolygon(f));
        if (b.length >= 3) back.push(new CSGPolygon(b));
      }
    }
    static fromPoints(a, b, c) {
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      return new CSGPlane(normal, normal.dot(a));
    }
  }
  class CSGPolygon {
    constructor(vertices) {
      this.vertices = vertices;
      this.plane = CSGPlane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
    }
    clone() { return new CSGPolygon(this.vertices.map(v => v.clone())); }
    flip() { this.vertices.reverse(); this.plane.flip(); }
  }
  class CSGNode {
    constructor(polygons = []) { this.plane = null; this.front = null; this.back = null; this.polygons = []; if (polygons.length) this.build(polygons); }
    clone() {
      const node = new CSGNode(); node.plane = this.plane && this.plane.clone();
      node.front = this.front && this.front.clone(); node.back = this.back && this.back.clone();
      node.polygons = this.polygons.map(p => p.clone()); return node;
    }
    invert() {
      this.polygons.forEach(p => p.flip()); if (this.plane) this.plane.flip();
      if (this.front) this.front.invert(); if (this.back) this.back.invert();
      const tmp = this.front; this.front = this.back; this.back = tmp;
    }
    clipPolygons(polygons) {
      if (!this.plane) return polygons.slice();
      let front = [], back = [];
      polygons.forEach(p => this.plane.splitPolygon(p, front, back, front, back));
      if (this.front) front = this.front.clipPolygons(front);
      if (this.back) back = this.back.clipPolygons(back); else back = [];
      return front.concat(back);
    }
    clipTo(node) {
      this.polygons = node.clipPolygons(this.polygons);
      if (this.front) this.front.clipTo(node); if (this.back) this.back.clipTo(node);
    }
    allPolygons() { return this.polygons.concat(this.front ? this.front.allPolygons() : [], this.back ? this.back.allPolygons() : []); }
    build(polygons) {
      if (!polygons.length) return;
      if (!this.plane) this.plane = polygons[0].plane.clone();
      const front = [], back = [];
      polygons.forEach(p => this.plane.splitPolygon(p, this.polygons, this.polygons, front, back));
      if (front.length) { if (!this.front) this.front = new CSGNode(); this.front.build(front); }
      if (back.length) { if (!this.back) this.back = new CSGNode(); this.back.build(back); }
    }
  }

  const MAX_INPUT_TRIANGLES = 25000;
  const MAX_OUTPUT_TRIANGLES = 250000;
  const MAX_ABSOLUTE_COORDINATE = 10000000;

  function polygonsFromMesh(mesh) {
    if (!mesh || !mesh.isMesh || !mesh.geometry || !mesh.geometry.isBufferGeometry) {
      throw new TypeError('CSG benötigt zwei gültige Meshes mit BufferGeometry.');
    }
    mesh.updateMatrixWorld(true);
    const geom = mesh.geometry;
    const pos = geom.getAttribute('position');
    const index = geom.index;
    const elementCount = index ? index.count : pos?.count;
    if (!pos || pos.itemSize < 3 || !Number.isInteger(elementCount) || elementCount < 3 || elementCount % 3 !== 0) {
      throw new TypeError('CSG benötigt vollständige Dreiecke und ein gültiges Positionsattribut.');
    }
    const triangleCount = elementCount / 3;
    if (triangleCount > MAX_INPUT_TRIANGLES) {
      throw new RangeError('CSG-Eingaben sind auf maximal ' + MAX_INPUT_TRIANGLES + ' Dreiecke pro Mesh begrenzt.');
    }
    const world = mesh.matrixWorld;
    if (!world.elements.every(Number.isFinite)) throw new TypeError('CSG-Transformation enthält ungültige Werte.');
    const reverseWinding = world.determinant() < 0;
    const polygons = [];
    const vertex = new THREE.Vector3();
    for (let i = 0; i < elementCount; i += 3) {
      const verts = [];
      for (let j = 0; j < 3; j++) {
        const vertexIndex = index ? index.getX(i + j) : i + j;
        if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= pos.count) {
          throw new TypeError('CSG-Index verweist ausserhalb des Positionsattributs.');
        }
        const x = pos.getX(vertexIndex), y = pos.getY(vertexIndex), z = pos.getZ(vertexIndex);
        if (![x, y, z].every(Number.isFinite) ||
            Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) > MAX_ABSOLUTE_COORDINATE) {
          throw new TypeError('CSG-Eingabe enthält ungültige oder zu grosse Koordinaten.');
        }
        vertex.set(x, y, z).applyMatrix4(world);
        if (![vertex.x, vertex.y, vertex.z].every(Number.isFinite) ||
            Math.max(Math.abs(vertex.x), Math.abs(vertex.y), Math.abs(vertex.z)) > MAX_ABSOLUTE_COORDINATE) {
          throw new TypeError('CSG-Weltkoordinaten sind ungültig oder ausserhalb des erlaubten Bereichs.');
        }
        verts.push(new CSGVertex(vertex));
      }
      if (reverseWinding) [verts[1], verts[2]] = [verts[2], verts[1]];
      const cross = verts[1].pos.clone().sub(verts[0].pos).cross(verts[2].pos.clone().sub(verts[0].pos));
      if (cross.lengthSq() > CSG_EPSILON * CSG_EPSILON) polygons.push(new CSGPolygon(verts));
    }
    if (!polygons.length) throw new Error('Eine Form enthält keine gültigen Dreiecke.');
    return polygons;
  }

  function geometryFromPolygons(polygons, localOffset) {
    const coords = [];
    let outputTriangles = 0;

    // BSP-Schnitte können T-Verbindungen erzeugen: Ein Polygon besitzt eine
    // lange Kante, während das Nachbarpolygon dieselbe Kante in Teilstücke
    // zerlegt. Alle Endpunkte auf derselben geometrischen Linie werden deshalb
    // vor der Triangulierung gesammelt und in beide Polygonränder eingefügt.
    const lineGroups = new Map();
    const directionQuantum = tolerances.CSG_LINE_DIRECTION_QUANTUM;
    const lineQuantum = CSG_EPSILON;
    function lineInfo(a, b) {
      const direction = b.clone().sub(a);
      const length = direction.length();
      if (!(length > CSG_EPSILON)) return null;
      direction.multiplyScalar(1 / length);
      if (direction.x < -directionQuantum ||
          (Math.abs(direction.x) <= directionQuantum && direction.y < -directionQuantum) ||
          (Math.abs(direction.x) <= directionQuantum && Math.abs(direction.y) <= directionQuantum && direction.z < 0)) {
        direction.negate();
      }
      const moment = a.clone().cross(direction);
      const key = [
        Math.round(direction.x / directionQuantum),
        Math.round(direction.y / directionQuantum),
        Math.round(direction.z / directionQuantum),
        Math.round(moment.x / lineQuantum),
        Math.round(moment.y / lineQuantum),
        Math.round(moment.z / lineQuantum)
      ].join(':');
      return { key, direction };
    }
    polygons.forEach(poly => {
      for (let i = 0; i < poly.vertices.length; i++) {
        const a = poly.vertices[i].pos, b = poly.vertices[(i + 1) % poly.vertices.length].pos;
        const info = lineInfo(a, b);
        if (!info) continue;
        let group = lineGroups.get(info.key);
        if (!group) { group = { direction: info.direction, points: [] }; lineGroups.set(info.key, group); }
        group.points.push(a, b);
      }
    });

    polygons.forEach(poly => {
      if (poly.vertices.length < 3) return;
      const boundary = [];
      for (let i = 0; i < poly.vertices.length; i++) {
        const a = poly.vertices[i].pos;
        const b = poly.vertices[(i + 1) % poly.vertices.length].pos;
        boundary.push(a);
        const info = lineInfo(a, b);
        const group = info && lineGroups.get(info.key);
        if (!group) continue;
        const direction = b.clone().sub(a);
        const lengthSquared = direction.lengthSq();
        if (lengthSquared <= CSG_EPSILON * CSG_EPSILON) continue;
        const candidates = [];
        const seen = new Set();
        for (const point of group.points) {
          const t = point.clone().sub(a).dot(direction) / lengthSquared;
          if (t <= CSG_EPSILON / Math.sqrt(lengthSquared) ||
              t >= 1 - CSG_EPSILON / Math.sqrt(lengthSquared)) continue;
          const projection = a.clone().addScaledVector(direction, t);
          if (projection.distanceToSquared(point) > CSG_EPSILON * CSG_EPSILON) continue;
          const key = [
            Math.round(point.x / CSG_EPSILON),
            Math.round(point.y / CSG_EPSILON),
            Math.round(point.z / CSG_EPSILON)
          ].join(':');
          if (!seen.has(key)) { seen.add(key); candidates.push({ point, t }); }
        }
        candidates.sort((left, right) => left.t - right.t);
        candidates.forEach(candidate => boundary.push(candidate.point));
      }
      if (boundary.length < 3) return;
      const center = new THREE.Vector3();
      boundary.forEach(point => center.add(point));
      center.multiplyScalar(1 / boundary.length);
      outputTriangles += boundary.length;
      if (outputTriangles > MAX_OUTPUT_TRIANGLES) {
        throw new RangeError('CSG-Ergebnis überschreitet die Grenze von ' + MAX_OUTPUT_TRIANGLES + ' Dreiecken.');
      }
      for (let i = 0; i < boundary.length; i++) {
        [center, boundary[i], boundary[(i + 1) % boundary.length]].forEach(point => {
          const p = point.clone().sub(localOffset);
          if (![p.x, p.y, p.z].every(Number.isFinite) ||
              Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) > MAX_ABSOLUTE_COORDINATE) {
            throw new TypeError('CSG-Ergebnis enthält ungültige oder zu grosse Koordinaten.');
          }
          coords.push(p.x,p.y,p.z);
        });
      }
    });
    if (coords.length < 9) throw new Error('Das Ergebnis ist leer. Prüfe, ob sich die Formen überschneiden.');
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    geom.computeVertexNormals(); geom.computeBoundingBox(); geom.computeBoundingSphere();
    return geom;
  }

  function combineMeshes(base, tool, operation) {
    if (operation !== 'union' && operation !== 'subtract') {
      throw new Error('Unbekannte CSG-Operation: ' + String(operation));
    }
    const a = new CSGNode(polygonsFromMesh(base));
    const b = new CSGNode(polygonsFromMesh(tool));
    if (operation === 'union') {
      a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.allPolygons());
    } else {
      a.invert(); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.allPolygons()); a.invert();
    }
    return geometryFromPolygons(a.allPolygons(), base.position);
  }

  return Object.freeze({ combineMeshes });
});
