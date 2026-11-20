(function (root, factory) {
  const api = factory(root.THREE, root.SILMOProjectSchema, root.SILMOProjectGeometry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOProjectIO = api;
})(globalThis, function (THREE, projectSchema, projectGeometry) {
  if (!THREE || !projectSchema || !projectGeometry) {
    throw new Error('SILMO-Projektdateien benötigen Three.js, Projekt-Schema und Projektgeometrie.');
  }

  function createProjectIO(dependencies) {
    const deps = dependencies || {};
    const required = ['getObjects','getBedWidthMM','getBedDepthMM','getUniform','commitProject','setStatus','getProjectFileInput'];
    for (const name of required) {
      if (typeof deps[name] !== 'function') throw new Error('Projekt-I/O-Abhängigkeit fehlt: ' + name);
    }

    function saveProject() {
      try {
        const project = {
          app: 'SILMO 3D Studio AI',
          version: projectSchema.CURRENT_PROJECT_VERSION,
          imageStudio: typeof deps.exportImageStudio === 'function' ? deps.exportImageStudio() : null,
          bedWidthMM: deps.getBedWidthMM(),
          bedDepthMM: deps.getBedDepthMM(),
          uniform: deps.getUniform(),
          objects: deps.getObjects().map(obj => ({
            objectId: obj.uuid,
            label: obj.userData.label || 'Objekt',
            position: obj.position.toArray(),
            rotation: obj.rotation.toArray(),
            scale: obj.scale.toArray(),
            color: '#' + obj.material.color.getHexString(),
            baseDimensions: obj.userData.baseDimensions || { x: 1, y: 1, z: 1 },
            percent: obj.userData.percent || { x: 100, y: 100, z: 100 },
            locked: obj.userData.locked === true,
            groupId: typeof obj.userData.groupId === 'string' ? obj.userData.groupId : null,
            unionParts: Array.isArray(obj.userData.unionParts) ? obj.userData.unionParts : null,
            sketchOutline: Array.isArray(obj.userData.sketchOutline) ? obj.userData.sketchOutline : null,
            sketch: obj.userData.sketch || null,
            contourFrame: obj.userData.contourFrame || null,
            loft: obj.userData.loft || null,
            geometry: projectGeometry.serializeGeometry(obj.geometry)
          }))
        };
        const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'silmo-projekt.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        deps.setStatus('Vollständiges Projekt gespeichert');
        if (typeof deps.onSaved === 'function') deps.onSaved();
      } catch (error) {
        console.error(error);
        deps.setStatus('Projekt konnte nicht gespeichert werden.');
      }
    }

    function openProjectFile(file) {
      if (!file) return;
      const input = deps.getProjectFileInput();
      if (file.size > 25 * 1024 * 1024) {
        deps.setStatus('Projektdatei ist zu gross (maximal 25 MB).');
        if (input) input.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        let newObjects = [];
        try {
          const project = JSON.parse(String(reader.result || ''));
          projectSchema.validateProjectEnvelope(project);
          // Zuerst alle Objekte vollständig aufbauen. Erst danach darf die
          // Anwendung den bisherigen Modellbestand ersetzen.
          for (const item of project.objects) {
            const geometry = projectGeometry.restoreGeometry(item.geometry);
            const material = new THREE.MeshStandardMaterial({
              color: /^#[0-9a-f]{6}$/i.test(item.color || '') ? item.color : '#4b91ed',
              roughness: 0.5,
              metalness: 0.05
            });
            try {
              const mesh = new THREE.Mesh(geometry, material);
              if (typeof item.objectId === 'string') mesh.uuid = item.objectId;
              const position = Array.isArray(item.position) ? item.position : [0, 0, 0];
              const rotation = Array.isArray(item.rotation) ? item.rotation : [0, 0, 0];
              const scale = Array.isArray(item.scale) ? item.scale : [1, 1, 1];
              if ([position, rotation, scale].some((values, i) => !Array.isArray(values) || values.length < 3 || values.slice(0,3).some(v => !Number.isFinite(v) || Math.abs(v) > (i === 2 ? 1000 : 10000) || (i === 2 && v === 0)))) {
                throw new Error('Ungültige Objektposition, Drehung oder Skalierung.');
              }
              mesh.position.fromArray(position);
              mesh.rotation.fromArray(rotation);
              mesh.scale.fromArray(scale);
              const measured = new THREE.Vector3();
              geometry.computeBoundingBox();
              geometry.boundingBox.getSize(measured);
              mesh.userData = {
                label: typeof item.label === 'string' && item.label ? item.label : 'Objekt',
                baseDimensions: item.baseDimensions && ['x','y','z'].every(a => Number.isFinite(item.baseDimensions[a]))
                  ? { x: item.baseDimensions.x, y: item.baseDimensions.y, z: item.baseDimensions.z }
                  : { x: measured.x, y: measured.y, z: measured.z },
                percent: item.percent && ['x','y','z'].every(a => Number.isFinite(item.percent[a]))
                  ? { x: item.percent.x, y: item.percent.y, z: item.percent.z }
                  : { x: scale[0] * 100, y: scale[1] * 100, z: scale[2] * 100 },
                locked: item.locked === true,
                groupId: typeof item.groupId === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(item.groupId) ? item.groupId : null,
                unionParts: Array.isArray(item.unionParts) && item.unionParts.length >= 2 && item.unionParts.length <= 100 ? item.unionParts.map(part => JSON.parse(JSON.stringify(part))) : null,
                sketchOutline: (Array.isArray(item.sketchOutline) ? item.sketchOutline : item.caseOutline) && (Array.isArray(item.sketchOutline) ? item.sketchOutline : item.caseOutline).length >= 3 && (Array.isArray(item.sketchOutline) ? item.sketchOutline : item.caseOutline).length <= 240 && (Array.isArray(item.sketchOutline) ? item.sketchOutline : item.caseOutline).every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)) ? (Array.isArray(item.sketchOutline) ? item.sketchOutline : item.caseOutline).map(point => [point[0],point[1]]) : null,
                sketch: item.sketch && typeof item.sketch === 'object' ? JSON.parse(JSON.stringify(item.sketch)) : null,
                contourFrame: (item.contourFrame || item.caseWallFrame) && Number.isFinite((item.contourFrame || item.caseWallFrame).wallThicknessMM) && Number.isFinite((item.contourFrame || item.caseWallFrame).wallHeightMM) ? {wallThicknessMM:(item.contourFrame || item.caseWallFrame).wallThicknessMM,wallHeightMM:(item.contourFrame || item.caseWallFrame).wallHeightMM} : null,
                loft: item.loft ? {
                  sourceA: item.loft.sourceA, sourceB: item.loft.sourceB, sections: item.loft.sections,
                  innerContourCount: item.loft.innerContourCount,
                  sourceHoles: item.loft.sourceHoles.map(pair => ({ a: pair.a, b: pair.b }))
                } : null
              };
              if (Array.isArray(item.unionParts)) {
                if (item.unionParts.length < 2 || item.unionParts.length > 100) throw new Error('Ungültige Anzahl ursprünglicher Formteile.');
                item.unionParts.forEach(part => {
                  const check = projectGeometry.restoreObjectForUnion(part);
                  check.geometry.dispose();
                  check.material.dispose();
                });
              }
              newObjects.push(mesh);
            } catch (error) {
              geometry.dispose();
              if (Array.isArray(material)) material.forEach(m => m.dispose());
              else material.dispose();
              throw error;
            }
          }

          deps.commitProject(project, newObjects);
          newObjects = [];
          if (typeof deps.importImageStudio === 'function') {
            try {
              Promise.resolve(deps.importImageStudio(project.imageStudio || null))
                .catch(error => console.warn('Image Studio konnte nicht geladen werden:', error));
            } catch (error) {
              console.warn('Image Studio konnte nicht geladen werden:', error);
            }
          }
          deps.setStatus('Projekt geöffnet (' + deps.getObjects().length + ' Objekt(e))');
        } catch (error) {
          newObjects.forEach(obj => {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else if (obj.material) obj.material.dispose();
          });
          console.error(error);
          deps.setStatus('Projekt konnte nicht geöffnet werden: ' + (error.message || 'Datei prüfen.'));
        }
        if (input) input.value = '';
      };
      reader.onerror = () => {
        deps.setStatus('Projektdatei konnte nicht gelesen werden.');
        if (input) input.value = '';
      };
      reader.readAsText(file);
    }

    return Object.freeze({ saveProject, openProjectFile });
  }

  return Object.freeze({ createProjectIO });
});
