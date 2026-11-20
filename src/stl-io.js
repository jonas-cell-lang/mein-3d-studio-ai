(function (root, factory) {
  const api = factory(root.THREE, root.SILMOUnits);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOSTLIO = api;
})(globalThis, function (THREE, units) {
  if (!THREE || !units) throw new Error('SILMO-STL-I/O benötigt Three.js und die Einheiten-API.');

  function createSTLIO(dependencies) {
    const deps = dependencies || {};
    const required = ['getObjects', 'addObject', 'selectObject', 'setStatus'];
    for (const name of required) {
      if (typeof deps[name] !== 'function') throw new Error('STL-I/O-Abhängigkeit fehlt: ' + name);
    }

    function importSTLFile(file) {
      if (!file) return;
      if (typeof THREE.STLLoader === 'undefined') {
        deps.setStatus('STL-Import konnte nicht geladen werden. Bitte lokale Runtime prüfen.');
        return;
      }
      if (!/\.stl$/i.test(file.name || '') && file.type !== 'model/stl' && file.type !== 'application/sla') {
        deps.setStatus('Bitte eine STL-Datei auswählen oder in die Ablage ziehen.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        deps.setStatus('STL-Datei ist zu gross (maximal 50 MB).');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        let geometry = null;
        let material = null;
        let committed = false;
        try {
          const loader = new THREE.STLLoader();
          geometry = loader.parse(reader.result);
          const position = geometry && geometry.attributes && geometry.attributes.position;
          if (!position || position.itemSize !== 3 || position.count < 3 ||
              position.array.length % 3 !== 0 ||
              !position.array.every(Number.isFinite)) {
            throw new Error('Die STL-Datei enthält keine gültigen 3D-Punkte.');
          }
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
            throw new Error('Die STL-Datei enthält keine gültige Geometrie.');
          }

          // STL-Koordinaten sind Millimeter; SILMO verwendet 10 mm pro Welteinheit.
          const mmToWorld = units.mmToWorldUnits(1);
          geometry.scale(mmToWorld, mmToWorld, mmToWorld);
          geometry.computeBoundingBox();

          const size = new THREE.Vector3();
          geometry.boundingBox.getSize(size);
          if (![size.x, size.y, size.z].every(Number.isFinite)) {
            throw new Error('Die STL-Datei enthält ungültige Abmessungen.');
          }

          material = new THREE.MeshStandardMaterial({
            color: 0x4b91ed,
            roughness: 0.5,
            metalness: 0.05
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData.baseDimensions = { x: size.x, y: size.y, z: size.z };
          mesh.userData.percent = { x: 100, y: 100, z: 100 };
          mesh.userData.label = (file.name || '').replace(/\.stl$/i, '') || 'STL-Modell';

          // Das importierte Modell wird auf der Arbeitsplatte zentriert.
          geometry.translate(
            -(geometry.boundingBox.min.x + geometry.boundingBox.max.x) / 2,
            -(geometry.boundingBox.min.y + geometry.boundingBox.max.y) / 2,
            -geometry.boundingBox.min.z
          );
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();
          mesh.position.set(0, 0, 0);

          deps.addObject(mesh);
          committed = true;
          deps.selectObject(mesh);
          if (typeof deps.onImported === 'function') deps.onImported(mesh);
          deps.setStatus('STL-Modell importiert: ' + mesh.userData.label + ' (mm). Vorhandene Modelle bleiben erhalten.');
        } catch (error) {
          if (!committed) {
            if (geometry) geometry.dispose();
            if (material) material.dispose();
          }
          // Eine fehlerhafte Benutzereingabe ist ein erwartbarer Importfehler, kein Laufzeitabsturz.
          console.warn('STL-Import abgewiesen:', error);
          deps.setStatus('STL-Datei konnte nicht gelesen werden: ' + (error.message || 'Datei prüfen.'));
        }
      };
      reader.onerror = () => deps.setStatus('STL-Datei konnte nicht gelesen werden.');
      try {
        reader.readAsArrayBuffer(file);
      } catch (error) {
        deps.setStatus('STL-Datei konnte nicht gelesen werden: ' + (error.message || 'Datei prüfen.'));
      }
    }

    function exportSTL() {
      if (typeof THREE.STLExporter === 'undefined') {
        deps.setStatus('STL-Export konnte nicht geladen werden. Bitte lokale Runtime prüfen.');
        return;
      }
      const objects = deps.getObjects();
      if (!objects.length) {
        deps.setStatus('Es gibt keine Objekte zum Exportieren.');
        return;
      }

      const exportScene = new THREE.Scene();
      const temporaryGeometries = [];
      try {
        objects.forEach((obj, index) => {
          // Nur eine private Kopie wird in Millimeter umgerechnet; das Modell bleibt unverändert.
          const exportGeometry = obj.geometry.clone();
          temporaryGeometries.push(exportGeometry);
          const worldToMm = units.worldUnitsToMm(1);
          exportGeometry.scale(worldToMm, worldToMm, worldToMm);
          exportGeometry.computeBoundingBox();
          exportGeometry.computeBoundingSphere();

          const clone = new THREE.Mesh(exportGeometry, obj.material);
          clone.position.set(
            units.worldUnitsToMm(obj.position.x),
            units.worldUnitsToMm(obj.position.y),
            units.worldUnitsToMm(obj.position.z)
          );
          clone.rotation.copy(obj.rotation);
          clone.scale.copy(obj.scale);
          clone.updateMatrix();
          if (![clone.position.x, clone.position.y, clone.position.z,
                clone.scale.x, clone.scale.y, clone.scale.z].every(Number.isFinite)) {
            throw new Error('Ungültige Position oder Skalierung bei Objekt ' + (index + 1));
          }
          exportScene.add(clone);
        });

        const exporter = new THREE.STLExporter();
        const stlText = exporter.parse(exportScene, { binary: false });
        if (typeof stlText !== 'string' || !stlText.trim().startsWith('solid') || !stlText.includes('endsolid')) {
          throw new Error('Der STL-Exporter hat keine gültige ASCII-STL-Datei erzeugt.');
        }
        const blob = new Blob([stlText], { type: 'model/stl' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'silmo-3d-modell.stl';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        deps.setStatus('STL exportiert: alle Modelle in Millimetern');
        if (typeof deps.onExported === 'function') deps.onExported();
      } catch (error) {
        console.error(error);
        deps.setStatus('STL-Export fehlgeschlagen: ' + (error.message || 'Datei prüfen.'));
      } finally {
        temporaryGeometries.forEach(geometry => geometry.dispose());
      }
    }

    return Object.freeze({ importSTLFile, exportSTL });
  }

  return Object.freeze({ createSTLIO });
});
