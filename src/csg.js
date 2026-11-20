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

  function polygonsFromMesh(mesh) {
    mesh.updateMatrixWorld(true);
    const geom = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    const pos = geom.getAttribute('position');
    const world = mesh.matrixWorld;
    const polygons = [];
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const verts = [];
      for (let j = 0; j < 3; j++) verts.push(new CSGVertex(new THREE.Vector3(pos.getX(i+j),pos.getY(i+j),pos.getZ(i+j)).applyMatrix4(world)));
      const cross = verts[1].pos.clone().sub(verts[0].pos).cross(verts[2].pos.clone().sub(verts[0].pos));
      if (cross.lengthSq() > CSG_EPSILON * CSG_EPSILON) polygons.push(new CSGPolygon(verts));
    }
    if (geom !== mesh.geometry) geom.dispose();
    if (!polygons.length) throw new Error('Eine Form enthält keine gültigen Dreiecke.');
    return polygons;
  }

  function geometryFromPolygons(polygons, localOffset) {
    const coords = [];
    polygons.forEach(poly => {
      if (poly.vertices.length < 3) return;
      for (let i = 2; i < poly.vertices.length; i++) {
        [poly.vertices[0], poly.vertices[i-1], poly.vertices[i]].forEach(v => {
          const p = v.pos.clone().sub(localOffset); coords.push(p.x,p.y,p.z);
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
