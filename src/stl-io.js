(function (root, factory) {
  const api = factory(root.THREE, root.SILMOUnits, root.SILMOTolerances);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOSTLIO = api;
})(globalThis, function (THREE, units, tolerances) {
  if (!THREE || !units || !tolerances) throw new Error('SILMO-STL-I/O benötigt Three.js sowie Einheiten- und Toleranz-API.');

  // Prüft die Dreiecks-Topologie, ohne die STL-Geometrie zu verändern.
  // STL-Koordinaten liegen an dieser Stelle noch in Millimetern vor.
  const MAX_STL_DIAGNOSTIC_TRIANGLES = 100000;

  function analyzeSTLGeometry(geometry) {
    const position = geometry && geometry.attributes && geometry.attributes.position;
    if (!position || position.itemSize !== 3 || position.count < 3 || position.count % 3 !== 0) {
      throw new Error('Für die STL-Topologieprüfung werden vollständige Dreiecke benötigt.');
    }
    const triangleCount = position.count / 3;
    const maxTriangles = MAX_STL_DIAGNOSTIC_TRIANGLES;
    if (!Number.isInteger(maxTriangles) || maxTriangles < 1) {
      throw new Error('Das STL-Diagnoselimit ist nicht korrekt konfiguriert.');
    }
    if (triangleCount > maxTriangles) {
      return Object.freeze({ analyzed: false, reason: 'limit', triangleCount, maxTriangles });
    }
    if (!position.array || position.array.length !== position.count * 3 ||
        !Array.from(position.array).every(Number.isFinite)) {
      throw new Error('Die STL-Topologieprüfung benötigt ausschliesslich endliche XYZ-Koordinaten.');
    }
    const weldToleranceMM = units.worldUnitsToMm(tolerances.STL_VERTEX_WELD_WORLD_UNITS);
    if (!Number.isFinite(weldToleranceMM) || weldToleranceMM <= 0) {
      throw new Error('Die STL-Verschweisstoleranz ist ungültig.');
    }
    const toleranceSquared = weldToleranceMM * weldToleranceMM;
    const cells = new Map();
    const vertexCoordinates = [];
    const edges = new Map();
    const vertexLinks = new Map();
    const faces = new Set();
    let duplicateTriangleCount = 0;
    let collapsedTriangleCount = 0;
    let degenerateTriangleCount = 0;
    let signedVolumeMM3 = 0;
    const triangleVertexIds = [];
    const vertexParents = [];
    const vertexRanks = [];
    // Komponenten werden über gemeinsam genutzte Dreieckskanten verbunden.
    // So lässt sich die Orientierung jedes getrennten Körpers unabhängig prüfen.
    const cellKey = (x, y, z) => x + ',' + y + ',' + z;
    function vertexId(x, y, z) {
      const cx = Math.floor(x / weldToleranceMM);
      const cy = Math.floor(y / weldToleranceMM);
      const cz = Math.floor(z / weldToleranceMM);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const candidates = cells.get(cellKey(cx + dx, cy + dy, cz + dz));
        if (!candidates) continue;
        for (const id of candidates) {
          const offset = id * 3;
          const vx = vertexCoordinates[offset] - x;
          const vy = vertexCoordinates[offset + 1] - y;
          const vz = vertexCoordinates[offset + 2] - z;
          if (vx * vx + vy * vy + vz * vz <= toleranceSquared) return id;
        }
      }
      const id = vertexCoordinates.length / 3;
      vertexCoordinates.push(x, y, z);
      vertexParents[id] = id;
      vertexRanks[id] = 0;
      const key = cellKey(cx, cy, cz);
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(id);
      return id;
    }
    function findVertexRoot(id) {
      if (vertexParents[id] !== id) vertexParents[id] = findVertexRoot(vertexParents[id]);
      return vertexParents[id];
    }
    function unionVertices(a, b) {
      let rootA = findVertexRoot(a), rootB = findVertexRoot(b);
      if (rootA === rootB) return;
      if (vertexRanks[rootA] < vertexRanks[rootB]) [rootA, rootB] = [rootB, rootA];
      vertexParents[rootB] = rootA;
      if (vertexRanks[rootA] === vertexRanks[rootB]) vertexRanks[rootA]++;
    }
    function addEdge(from, to) {
      const low = Math.min(from, to), high = Math.max(from, to);
      const key = low + ':' + high;
      const direction = from < to ? 1 : -1;
      const edge = edges.get(key);
      if (edge) { edge.count++; edge.directionBalance += direction; }
      else edges.set(key, { count: 1, directionBalance: direction });
    }
    function addVertexLink(vertex, a, b) {
      if (!vertexLinks.has(vertex)) vertexLinks.set(vertex, new Map());
      const link = vertexLinks.get(vertex);
      if (!link.has(a)) link.set(a, { degree: 0, adjacent: new Set() });
      if (!link.has(b)) link.set(b, { degree: 0, adjacent: new Set() });
      link.get(a).degree++;
      link.get(b).degree++;
      link.get(a).adjacent.add(b);
      link.get(b).adjacent.add(a);
    }
    for (let i = 0; i < position.count; i += 3) {
      const points = [
        [position.getX(i), position.getY(i), position.getZ(i)],
        [position.getX(i + 1), position.getY(i + 1), position.getZ(i + 1)],
        [position.getX(i + 2), position.getY(i + 2), position.getZ(i + 2)]
      ];
      const ids = points.map(point => vertexId(point[0], point[1], point[2]));
      triangleVertexIds.push(ids[0], ids[1], ids[2]);
      unionVertices(ids[0], ids[1]);
      unionVertices(ids[1], ids[2]);
      unionVertices(ids[2], ids[0]);
      if (ids[0] === ids[1] || ids[1] === ids[2] || ids[2] === ids[0]) collapsedTriangleCount++;
      const abx = points[1][0] - points[0][0], aby = points[1][1] - points[0][1], abz = points[1][2] - points[0][2];
      const acx = points[2][0] - points[0][0], acy = points[2][1] - points[0][1], acz = points[2][2] - points[0][2];
      const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
      if (nx * nx + ny * ny + nz * nz <= toleranceSquared * toleranceSquared) degenerateTriangleCount++;
      const faceKey = ids.slice().sort((a, b) => a - b).join(':');
      if (faces.has(faceKey)) duplicateTriangleCount++;
      else faces.add(faceKey);
      addEdge(ids[0], ids[1]); addEdge(ids[1], ids[2]); addEdge(ids[2], ids[0]);
      addVertexLink(ids[0], ids[1], ids[2]);
      addVertexLink(ids[1], ids[2], ids[0]);
      addVertexLink(ids[2], ids[0], ids[1]);
    }
    let boundaryEdgeCount = 0, nonManifoldEdgeCount = 0, inconsistentEdgeCount = 0;
    for (const edge of edges.values()) {
      if (edge.count === 1) boundaryEdgeCount++;
      else if (edge.count > 2) nonManifoldEdgeCount++;
      else if (edge.directionBalance !== 0) inconsistentEdgeCount++;
    }
    // Bei einem geschlossenen 2-Manifold muss der Link jedes Vertex genau
    // einen zusammenhängenden Zyklus bilden. Das erkennt z.B. zwei nur an
    // einem Punkt verbundene geschlossene Körper.
    let nonManifoldVertexCount = 0;
    for (const link of vertexLinks.values()) {
      const neighbors = Array.from(link.keys());
      if (neighbors.some(neighbor => link.get(neighbor).degree !== 2)) {
        nonManifoldVertexCount++;
        continue;
      }
      const visited = new Set();
      const stack = neighbors.length ? [neighbors[0]] : [];
      while (stack.length) {
        const current = stack.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        for (const neighbor of link.get(current).adjacent) {
          if (!visited.has(neighbor)) stack.push(neighbor);
        }
      }
      if (visited.size !== neighbors.length) nonManifoldVertexCount++;
    }
    const isClosedEdgeManifold = boundaryEdgeCount === 0 && nonManifoldEdgeCount === 0 &&
      nonManifoldVertexCount === 0 && inconsistentEdgeCount === 0 &&
      duplicateTriangleCount === 0 && collapsedTriangleCount === 0 && degenerateTriangleCount === 0;
    // Das Volumen wird je zusammenhängender Komponente relativ zu einem
    // lokalen Vertex berechnet. Weit getrennte Körper beeinflussen dadurch
    // weder die numerische Stabilität noch die Orientierungserkennung anderer Körper.
    const componentVolumes = new Map();
    const componentBounds = new Map();
    for (let i = 0; i < triangleVertexIds.length; i += 3) {
      const ids = [triangleVertexIds[i], triangleVertexIds[i + 1], triangleVertexIds[i + 2]];
      const root = findVertexRoot(ids[0]);
      if (!componentVolumes.has(root)) {
        componentVolumes.set(root, 0);
        componentBounds.set(root, {
          min: [Infinity, Infinity, Infinity],
          max: [-Infinity, -Infinity, -Infinity]
        });
      }
      const bounds = componentBounds.get(root);
      for (const id of ids) {
        const offset = id * 3;
        for (let axis = 0; axis < 3; axis++) {
          const coordinate = vertexCoordinates[offset + axis];
          bounds.min[axis] = Math.min(bounds.min[axis], coordinate);
          bounds.max[axis] = Math.max(bounds.max[axis], coordinate);
        }
      }
      const originOffset = root * 3;
      const aOffset = ids[0] * 3, bOffset = ids[1] * 3, cOffset = ids[2] * 3;
      const ax = vertexCoordinates[aOffset] - vertexCoordinates[originOffset];
      const ay = vertexCoordinates[aOffset + 1] - vertexCoordinates[originOffset + 1];
      const az = vertexCoordinates[aOffset + 2] - vertexCoordinates[originOffset + 2];
      const bx = vertexCoordinates[bOffset] - vertexCoordinates[originOffset];
      const by = vertexCoordinates[bOffset + 1] - vertexCoordinates[originOffset + 1];
      const bz = vertexCoordinates[bOffset + 2] - vertexCoordinates[originOffset + 2];
      const cx = vertexCoordinates[cOffset] - vertexCoordinates[originOffset];
      const cy = vertexCoordinates[cOffset + 1] - vertexCoordinates[originOffset + 1];
      const cz = vertexCoordinates[cOffset + 2] - vertexCoordinates[originOffset + 2];
      const volume = (
        ax * (by * cz - bz * cy) +
        ay * (bz * cx - bx * cz) +
        az * (bx * cy - by * cx)
      ) / 6;
      componentVolumes.set(root, componentVolumes.get(root) + volume);
    }
    let invertedComponentCount = 0;
    const componentRecords = [];
    for (const [root, volume] of componentVolumes) {
      signedVolumeMM3 += volume;
      if (volume < -tolerances.STL_SIGNED_VOLUME_EPSILON_MM3) invertedComponentCount++;
      componentRecords.push({ volume, bounds: componentBounds.get(root) });
    }
    const componentCount = componentVolumes.size;
    // Eine negative innere Hüllfläche kann eine gültige Aussparung beschreiben.
    // Nur entgegengesetzt orientierte, räumlich getrennte AABB-Komponenten
    // werden deshalb als Konflikt markiert; ineinanderliegende Hüllen bleiben erlaubt.
    let disconnectedWindingConflict = false;
    for (let i = 0; i < componentRecords.length && !disconnectedWindingConflict; i++) {
      for (let j = i + 1; j < componentRecords.length; j++) {
        const a = componentRecords[i], b = componentRecords[j];
        if (!((a.volume < -tolerances.STL_SIGNED_VOLUME_EPSILON_MM3 && b.volume > tolerances.STL_SIGNED_VOLUME_EPSILON_MM3) ||
              (a.volume > tolerances.STL_SIGNED_VOLUME_EPSILON_MM3 && b.volume < -tolerances.STL_SIGNED_VOLUME_EPSILON_MM3))) continue;
        const separated = a.bounds.max.some((value, axis) => value < b.bounds.min[axis]) ||
          b.bounds.max.some((value, axis) => value < a.bounds.min[axis]);
        if (separated) {
          disconnectedWindingConflict = true;
          break;
        }
      }
    }
    const mixedWinding = isClosedEdgeManifold && disconnectedWindingConflict;
    const invertedWinding = isClosedEdgeManifold && !mixedWinding &&
      Math.abs(signedVolumeMM3) > tolerances.STL_SIGNED_VOLUME_EPSILON_MM3 ? signedVolumeMM3 < 0 : null;
    return Object.freeze({
      analyzed: true, triangleCount, weldedVertexCount: vertexCoordinates.length / 3,
      uniqueEdgeCount: edges.size, boundaryEdgeCount, nonManifoldEdgeCount,
      inconsistentEdgeCount, nonManifoldVertexCount, duplicateTriangleCount, collapsedTriangleCount, degenerateTriangleCount,
      isClosedEdgeManifold, invertedWinding, disconnectedWindingConflict,
      componentCount, invertedComponentCount, signedVolumeMM3, weldToleranceMM
    });
  }

  function createSTLIO(dependencies) {
    const deps = dependencies || {};
    const required = ['getObjects', 'addObject', 'selectObject', 'setStatus'];
    for (const name of required) {
      if (typeof deps[name] !== 'function') throw new Error('STL-I/O-Abhängigkeit fehlt: ' + name);
    }

    const MAX_STL_FILE_BYTES = 50 * 1024 * 1024;
    const MAX_STL_TRIANGLES = 500000;
    const MAX_STL_COORDINATE_MM = 1e7;

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
      if (!Number.isFinite(file.size) || file.size < 0 || file.size > MAX_STL_FILE_BYTES) {
        deps.setStatus('STL-Datei ist zu gross (maximal 50 MB).');
        return;
      }

      let reader;
      try {
        reader = new FileReader();
      } catch (error) {
        deps.setStatus('STL-Datei konnte nicht gelesen werden.');
        return;
      }
      reader.onload = () => {
        let geometry = null;
        let material = null;
        let committed = false;
        try {
          const loader = new THREE.STLLoader();
          geometry = loader.parse(reader.result);
          const position = geometry && geometry.attributes && geometry.attributes.position;
          if (!position || position.itemSize !== 3 || position.count < 3 ||
              position.count % 3 !== 0 || position.array.length !== position.count * 3) {
            throw new Error('Die STL-Datei enthält keine vollständigen, gültigen Dreiecke.');
          }
          if (position.count / 3 > MAX_STL_TRIANGLES) {
            throw new Error('Die STL-Datei überschreitet das sichere Limit von 500000 Dreiecken.');
          }
          if (!position.array.every(Number.isFinite)) {
            throw new Error('Die STL-Datei enthält keine vollständigen, gültigen Dreiecke.');
          }
          if (!position.array.every(value => Math.abs(value) <= MAX_STL_COORDINATE_MM)) {
            throw new Error('Die STL-Datei enthält Koordinaten ausserhalb des unterstützten Bereichs.');
          }
          // STL ist ein Dreiecksformat. Nullflächen-Dreiecke können beim
          // weiteren Modellieren und beim Slicer zu undefinierten Ergebnissen führen.
          for (let i = 0; i < position.count; i += 3) {
            const ax = position.getX(i), ay = position.getY(i), az = position.getZ(i);
            const abx = position.getX(i + 1) - ax;
            const aby = position.getY(i + 1) - ay;
            const abz = position.getZ(i + 1) - az;
            const acx = position.getX(i + 2) - ax;
            const acy = position.getY(i + 2) - ay;
            const acz = position.getZ(i + 2) - az;
            const nx = aby * acz - abz * acy;
            const ny = abz * acx - abx * acz;
            const nz = abx * acy - aby * acx;
            if (![nx, ny, nz].every(Number.isFinite) || (nx === 0 && ny === 0 && nz === 0)) {
              throw new Error('Die STL-Datei enthält ein entartetes Dreieck ohne Fläche.');
            }
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
          let stlDiagnostics;
          try {
            stlDiagnostics = analyzeSTLGeometry(geometry);
          } catch (diagnosticError) {
            stlDiagnostics = { analyzed: false, reason: 'error' };
            console.warn('STL-Topologieprüfung übersprungen:', diagnosticError);
          }
          mesh.userData.stlDiagnostics = stlDiagnostics;

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
          let diagnosticMessage = '';
          if (stlDiagnostics.analyzed) {
            if (stlDiagnostics.isClosedEdgeManifold) {
              if (stlDiagnostics.disconnectedWindingConflict) {
                diagnosticMessage = ' Topologie: geschlossenes Dreiecksnetz, aber räumlich getrennte Körper haben widersprüchliche Orientierung.';
              } else if (stlDiagnostics.invertedWinding) {
                diagnosticMessage = ' Topologie: geschlossenes Dreiecksnetz, aber die Komponenten sind umgekehrt orientiert.';
              } else {
                diagnosticMessage = ' Topologie: geschlossenes Dreiecksnetz (Kantenprüfung).';
              }
            } else {
              const issues = [];
              if (stlDiagnostics.boundaryEdgeCount) issues.push(stlDiagnostics.boundaryEdgeCount + ' offene Kanten');
              if (stlDiagnostics.nonManifoldEdgeCount) issues.push(stlDiagnostics.nonManifoldEdgeCount + ' nicht-manifold Kanten');
              if (stlDiagnostics.inconsistentEdgeCount) issues.push(stlDiagnostics.inconsistentEdgeCount + ' widersprüchlich orientierte Kanten');
              if (stlDiagnostics.nonManifoldVertexCount) issues.push(stlDiagnostics.nonManifoldVertexCount + ' nicht-manifold Eckpunkte');
              if (stlDiagnostics.duplicateTriangleCount) issues.push(stlDiagnostics.duplicateTriangleCount + ' doppelte Dreiecke');
              if (stlDiagnostics.degenerateTriangleCount) issues.push(stlDiagnostics.degenerateTriangleCount + ' flächenlose Dreiecke');
              if (stlDiagnostics.collapsedTriangleCount) issues.push(stlDiagnostics.collapsedTriangleCount + ' durch Toleranz zusammengefallene Dreiecke');
              diagnosticMessage = ' Topologie-Warnung: ' + issues.join(', ') + '.';
            }
          } else {
            diagnosticMessage = ' Topologieprüfung bei dieser Dateigrösse nicht durchgeführt.';
          }
          deps.setStatus('STL-Modell importiert: ' + mesh.userData.label + ' (mm). Vorhandene Modelle bleiben erhalten.' + diagnosticMessage);
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
          const rotationValues = clone.rotation.toArray().slice(0, 3);
          const exportPosition = exportGeometry.attributes && exportGeometry.attributes.position;
          const exportIndex = exportGeometry.index;
          const exportTriangleCount = exportIndex ? exportIndex.count / 3 :
            (exportPosition ? exportPosition.count / 3 : 0);
          if (![clone.position.x, clone.position.y, clone.position.z,
                clone.scale.x, clone.scale.y, clone.scale.z, ...rotationValues].every(Number.isFinite) ||
              [clone.scale.x, clone.scale.y, clone.scale.z].some(value => value === 0) ||
              !exportPosition || exportPosition.itemSize !== 3 ||
              !Number.isInteger(exportTriangleCount) || exportTriangleCount < 1 ||
              exportTriangleCount > MAX_STL_TRIANGLES ||
              (!exportIndex && exportPosition.count % 3 !== 0) ||
              !exportPosition.array.every(value => Number.isFinite(value) && Math.abs(value) <= MAX_STL_COORDINATE_MM)) {
            throw new Error('Ungültige oder zu umfangreiche Geometrie, Position, Drehung oder Skalierung bei Objekt ' + (index + 1));
          }
          if (exportIndex && (!exportIndex.array.every(value =>
              Number.isInteger(value) && value >= 0 && value < exportPosition.count))) {
            throw new Error('Ungültige Dreiecksindizes bei Objekt ' + (index + 1));
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

    return Object.freeze({ importSTLFile, exportSTL, analyzeSTLGeometry });
  }

  return Object.freeze({ createSTLIO });
});
