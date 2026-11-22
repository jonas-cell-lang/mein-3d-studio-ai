(function (root, factory) {
  const api = factory(root.THREE, root.SILMOProjectSchema);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOProjectGeometry = api;
})(globalThis, function (THREE, projectSchema) {
  if (!THREE || !THREE.BufferGeometry || !projectSchema) {
    throw new Error('SILMO-Projektgeometrie benötigt Three.js und das Projekt-Schema.');
  }

  function serializeGeometry(geometry) {
    const attributes = {};
    Object.entries(geometry.attributes).forEach(([name, attribute]) => {
      attributes[name] = {
        arrayType: attribute.array.constructor.name,
        array: Array.from(attribute.array),
        itemSize: attribute.itemSize,
        normalized: attribute.normalized
      };
    });
    return {
      attributes,
      index: geometry.index ? {
        arrayType: geometry.index.array.constructor.name,
        array: Array.from(geometry.index.array)
      } : null
    };
  }

  function restoreGeometry(data) {
    projectSchema.validateSerializedGeometry(data);
    if (!data || !data.attributes || !data.attributes.position || typeof data.attributes !== 'object') {
      throw new Error('Geometriedaten fehlen.');
    }
    const allowedArrays = { Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array };
    const geometry = new THREE.BufferGeometry();
    let totalValues = 0;
    Object.entries(data.attributes).forEach(([name, item]) => {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(name) || !item || !Array.isArray(item.array)) throw new Error('Ungültiges Geometrieattribut.');
      totalValues += item.array.length;
      if (totalValues > 1500000) throw new Error('Das Modell ist zu komplex für den sicheren Projektimport.');
      const TypedArray = allowedArrays[item.arrayType];
      if (!TypedArray || !Number.isInteger(item.itemSize) || item.itemSize < 1 || item.itemSize > 4 || item.array.length % item.itemSize !== 0 || item.array.some(v => !Number.isFinite(v) || Math.abs(v) > 1e7)) {
        throw new Error('Ungültige oder zu grosse Geometriedaten.');
      }
      geometry.setAttribute(name, new THREE.BufferAttribute(new TypedArray(item.array), item.itemSize, Boolean(item.normalized)));
    });
    if (data.index) {
      if (!Array.isArray(data.index.array) || data.index.array.length > 4500000 || !data.index.array.every(v => Number.isInteger(v) && v >= 0 && v < geometry.attributes.position.count)) throw new Error('Ungültige Modell-Indizes.');
      const IndexArray = allowedArrays[data.index.arrayType];
      if (!IndexArray || !['Uint8Array','Uint16Array','Uint32Array'].includes(data.index.arrayType)) throw new Error('Ungültiger Indextyp.');
      geometry.setIndex(new THREE.BufferAttribute(new IndexArray(data.index.array), 1));
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    return geometry;
  }

  function serializeObjectForUnion(obj) {
    return {
      label: obj.userData.label || 'Objekt', position: obj.position.toArray(), rotation: obj.rotation.toArray(), scale: obj.scale.toArray(),
      color: '#' + obj.material.color.getHexString(),
      baseDimensions: obj.userData.baseDimensions || {x:1,y:1,z:1},
      percent: obj.userData.percent || {x:100,y:100,z:100},
      locked: obj.userData.locked === true,
      groupId: typeof obj.userData.groupId === 'string' ? obj.userData.groupId : null,
      geometry: serializeGeometry(obj.geometry),
      unionParts: Array.isArray(obj.userData.unionParts) ? obj.userData.unionParts.map(part => JSON.parse(JSON.stringify(part))) : null
    };
  }

  function restoreObjectForUnion(item) {
    if (!item || !item.geometry) throw new Error('Ein ursprünglicher Formteil ist unvollständig.');
    const geometry = restoreGeometry(item.geometry);
    const material = new THREE.MeshStandardMaterial({color:/^#[0-9a-f]{6}$/i.test(item.color||'')?item.color:'#4b91ed',roughness:0.5,metalness:0.05});
    const mesh = new THREE.Mesh(geometry,material);
    const position=Array.isArray(item.position)?item.position:[0,0,0], rotation=Array.isArray(item.rotation)?item.rotation:[0,0,0], scale=Array.isArray(item.scale)?item.scale:[1,1,1];
    if ([position,rotation,scale].some((values,i)=>!Array.isArray(values)||values.length<3||values.slice(0,3).some(v=>!Number.isFinite(v)||Math.abs(v)>(i===2?1000:10000)||(i===2&&v===0)))) {
      geometry.dispose(); material.dispose(); throw new Error('Ein ursprünglicher Formteil enthält ungültige Positionsdaten.');
    }
    mesh.position.fromArray(position); mesh.rotation.fromArray(rotation); mesh.scale.fromArray(scale);
    geometry.computeBoundingBox(); const measured=new THREE.Vector3(); geometry.boundingBox.getSize(measured);
    mesh.userData={
      label:typeof item.label==='string'&&item.label?item.label:'Objekt',
      baseDimensions:item.baseDimensions&&['x','y','z'].every(a=>Number.isFinite(item.baseDimensions[a]))?{x:item.baseDimensions.x,y:item.baseDimensions.y,z:item.baseDimensions.z}:{x:measured.x,y:measured.y,z:measured.z},
      percent:item.percent&&['x','y','z'].every(a=>Number.isFinite(item.percent[a]))?{x:item.percent.x,y:item.percent.y,z:item.percent.z}:{x:100,y:100,z:100},
      locked:item.locked===true,
      groupId:typeof item.groupId==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(item.groupId)?item.groupId:null
    };
    return mesh;
  }

  return Object.freeze({ serializeGeometry, restoreGeometry, serializeObjectForUnion, restoreObjectForUnion });
});
