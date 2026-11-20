(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOProjectSchema = api;
})(globalThis, function () {
  const CURRENT_PROJECT_VERSION = 3;
  const SUPPORTED_PROJECT_VERSIONS = Object.freeze([3]);

  function validateSerializedGeometry(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        !data.attributes || typeof data.attributes !== 'object' || Array.isArray(data.attributes)) {
      throw new Error('Geometriedaten fehlen oder sind ungültig.');
    }

    const attributeTypeRanges = Object.freeze({
      Float32Array: [-3.402823466e38, 3.402823466e38],
      Float64Array: [-Number.MAX_VALUE, Number.MAX_VALUE],
      Uint8Array: [0, 0xff], Uint16Array: [0, 0xffff], Uint32Array: [0, 0xffffffff],
      Int8Array: [-0x80, 0x7f], Int16Array: [-0x8000, 0x7fff], Int32Array: [-0x80000000, 0x7fffffff]
    });
    const allowedArrays = new Set(Object.keys(attributeTypeRanges));
    const indexTypeMaximums = Object.freeze({ Uint8Array: 0xff, Uint16Array: 0xffff, Uint32Array: 0xffffffff });
    const names = Object.keys(data.attributes);
    if (!names.length) throw new Error('Geometrie enthält keine Attribute.');

    let totalValues = 0;
    let positionCount = 0;
    for (const [name, item] of Object.entries(data.attributes)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(name) ||
          !item || typeof item !== 'object' || !Array.isArray(item.array)) {
        throw new Error('Ungültiges Geometrieattribut.');
      }
      const valueRange = attributeTypeRanges[item.arrayType];
      if (name === 'position' && item.itemSize !== 3) {
        throw new Error('Positionsdaten müssen das itemSize 3 haben.');
      }
      if (!allowedArrays.has(item.arrayType) || !valueRange ||
          !Number.isInteger(item.itemSize) || item.itemSize < 1 || item.itemSize > 4 ||
          item.array.length === 0 || item.array.length % item.itemSize !== 0 ||
          item.array.some(value => !Number.isFinite(value) || Math.abs(value) > 1e7 ||
            value < valueRange[0] || value > valueRange[1])) {
        throw new Error('Ungültige oder zu grosse Geometriedaten.');
      }
      totalValues += item.array.length;
      if (totalValues > 1500000) throw new Error('Das Modell ist zu komplex für den sicheren Projektimport.');
      const attributeCount = item.array.length / item.itemSize;
      if (name === 'position') {
        if (item.itemSize !== 3 || item.array.length < 9) {
          throw new Error('Positionsdaten müssen mindestens drei 3D-Punkte enthalten.');
        }
        positionCount = attributeCount;
      }
    }
    if (!positionCount) throw new Error('Geometriedaten enthalten kein Positionsattribut.');
    for (const [name, item] of Object.entries(data.attributes)) {
      if (item.array.length / item.itemSize !== positionCount) {
        throw new Error('Geometrieattribute haben unterschiedliche Punktanzahlen: ' + name);
      }
    }

    if (data.index != null) {
      const index = data.index;
      const maxIndexValue = index && indexTypeMaximums[index.arrayType];
      if (!index || typeof index !== 'object' || !Array.isArray(index.array) ||
          index.array.length < 3 || index.array.length > 4500000 ||
          index.array.length % 3 !== 0 ||
          !['Uint8Array', 'Uint16Array', 'Uint32Array'].includes(index.arrayType) ||
          !Number.isInteger(maxIndexValue) ||
          !index.array.every(value => Number.isInteger(value) && value >= 0 && value < positionCount &&
            value <= maxIndexValue)) {
        throw new Error('Ungültige Modell-Indizes.');
      }
    } else if (positionCount % 3 !== 0) {
      throw new Error('Nicht-indizierte Mesh-Geometrie enthält keine vollständigen Dreiecke.');
    }
    return data;
  }

  function validateContourFrameMetadata(object) {
    if (!object || typeof object !== 'object' || Array.isArray(object)) return;
    const frame = object.contourFrame ?? object.caseWallFrame;
    if (frame == null) return;
    if (!frame || typeof frame !== 'object' || Array.isArray(frame) ||
        !Number.isFinite(frame.wallThicknessMM) || frame.wallThicknessMM < 0.2 || frame.wallThicknessMM > 100 ||
        !Number.isFinite(frame.wallHeightMM) || frame.wallHeightMM < 0.2 || frame.wallHeightMM > 2000) {
      throw new Error('Ungültige Hohlrahmen-Metadaten: Wandstärke oder Rahmenhöhe liegt ausserhalb des unterstützten Bereichs.');
    }
  }

  function validateProjectObjectIdentities(objects) {
    const ids = new Set();
    for (const object of objects) {
      if (object?.objectId == null) continue;
      if (typeof object.objectId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(object.objectId) || ids.has(object.objectId)) {
        throw new Error('Ungültige oder doppelte Objektkennung in der Projektdatei.');
      }
      ids.add(object.objectId);
    }
  }

  function validateSketchMetadata(object) {
    if (!object || typeof object !== 'object' || Array.isArray(object) || object.sketch == null) return;
    const sketch=object.sketch;
    if (!sketch || typeof sketch !== 'object' || Array.isArray(sketch)) throw new Error('Ungültige Skizzen-Metadaten.');
    if (sketch.type === 'freeform2d' && sketch.holes != null &&
        (!Array.isArray(sketch.holes) || sketch.holes.length > 100 ||
          !sketch.holes.every(ring => Array.isArray(ring) && ring.length >= 3 && ring.length <= 1000 &&
            ring.every(point => Array.isArray(point) && point.length === 2 &&
              point.every(value => Number.isFinite(value) && Math.abs(value) <= 10000))))) {
      throw new Error('Ungültige oder zu umfangreiche Skizzen-Innenkonturen.');
    }
  }

  function validateLoftMetadata(object) {
    if (!object || typeof object !== 'object' || Array.isArray(object) || object.loft == null) return;
    const loft = object.loft;
    const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
    if (!loft || typeof loft !== 'object' || Array.isArray(loft) ||
        loft.sections !== 2 || !validId(loft.sourceA) || !validId(loft.sourceB) ||
        !Number.isInteger(loft.innerContourCount) || loft.innerContourCount < 0 || loft.innerContourCount > 8 ||
        !Array.isArray(loft.sourceHoles) || loft.sourceHoles.length !== loft.innerContourCount ||
        !loft.sourceHoles.every(pair => pair && typeof pair === 'object' && !Array.isArray(pair) &&
          validId(pair.a) && validId(pair.b))) {
      throw new Error('Ungültige Loft-Metadaten oder Innenkontur-Zuordnung.');
    }
  }

  const MAX_PROJECT_GEOMETRY_VALUES = 15000000;

  function validateProjectGeometryBudget(objects) {
    let totalValues = 0;
    function visit(object) {
      if (!object || typeof object !== 'object' || Array.isArray(object)) return;
      if (object.geometry != null) {
        const geometry = validateSerializedGeometry(object.geometry);
        for (const attribute of Object.values(geometry.attributes)) totalValues += attribute.array.length;
        if (geometry.index) totalValues += geometry.index.array.length;
        if (totalValues > MAX_PROJECT_GEOMETRY_VALUES) {
          throw new Error('Das Projekt enthält insgesamt zu viele Geometriedaten für einen sicheren Import.');
        }
      }
      if (Array.isArray(object.unionParts)) object.unionParts.forEach(visit);
    }
    objects.forEach(visit);
  }

  function validateProjectEnvelope(project) {
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      throw new Error('Projektdatei ist kein gültiges JSON-Objekt.');
    }
    if (project.app !== 'SILMO 3D Studio AI') {
      throw new Error('Das ist keine gültige SILMO-Projektdatei.');
    }
    if (!Number.isInteger(project.version)) {
      throw new Error('Projektdatei enthält keine gültige Versionsnummer. Unterstützt wird derzeit Version 3.');
    }
    if (!SUPPORTED_PROJECT_VERSIONS.includes(project.version)) {
      throw new Error('Nicht unterstützte Projektversion ' + project.version + '. Unterstützt wird derzeit Version 3.');
    }
    if (!Array.isArray(project.objects) || project.objects.length > 100) {
      throw new Error('Die Projektdatei enthält eine ungültige Objektliste (maximal 100 Objekte).');
    }
    validateProjectObjectIdentities(project.objects);
    project.objects.forEach(object => { validateContourFrameMetadata(object); validateSketchMetadata(object); validateLoftMetadata(object); });
    validateProjectGeometryBudget(project.objects);
    return project;
  }

  return Object.freeze({
    CURRENT_PROJECT_VERSION,
    SUPPORTED_PROJECT_VERSIONS,
    validateProjectEnvelope,
    validateSerializedGeometry
  });
});
