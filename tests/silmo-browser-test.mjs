import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const browserType = process.env.SILMO_BROWSER === 'webkit' ? webkit : chromium;
const browser = await browserType.launch({
  headless: true,
  ...(browserType === chromium ? { args: ['--no-sandbox', '--use-gl=swiftshader'] } : {})
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
let allowExpectedConsoleError = false;
async function showCreateSubtab(index) {
  await page.locator('[data-tab="create"]').click();
  const tabs = page.locator('#pane-create-left > .inner-tab-nav button');
  await tabs.nth(index).click();
  const state = await page.locator('#addCube').evaluate(el => {
    const ancestors = [];
    for (let node = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      ancestors.push({
        tag: node.tagName,
        id: node.id || null,
        className: typeof node.className === 'string' ? node.className : null,
        hidden: node.hidden,
        display: style.display,
        visibility: style.visibility
      });
    }
    return {
      visible: el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
      selectedTab: document.querySelector('[data-tab="create"]')?.getAttribute('aria-selected'),
      selectedSubtab: tabsState(),
      ancestors
    };
    function tabsState() {
      return [...document.querySelectorAll('#pane-create-left > .inner-tab-nav button')]
        .map(button => ({label: button.textContent, selected: button.getAttribute('aria-selected')}));
    }
  });
  if (index === 0 && !state.visible) {
    throw new Error('Grundformen-Unterreiter wurde aktiviert, aber Würfel-Button bleibt unsichtbar: ' + JSON.stringify(state));
  }
}
async function showExpertBooleanTools() {
  const toggle = page.locator('#expertCenterToggle');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await page.locator('[data-tab="expert"]').click();
  const details = page.locator('#pane-expert-left details.advanced-cad-tools');
  if (!(await details.evaluate(el => el.open))) await details.locator('summary').click();
}
async function showDrawRightSubtab(index) {
  await page.locator('#pane-draw-right > .inner-tab-nav button').nth(index).click();
}
async function waitForSelectedSketchOcct() {
  await page.waitForFunction(() => window.__silmoSketchSnapshot()?.geometryKernel === 'occt-wasm', null, { timeout: 45000 });
}
async function waitForOcctRestore(previousGeneration) {
  await page.waitForFunction(previous => Number.isInteger(window.__silmoOcctRestoreGeneration) &&
    window.__silmoOcctRestoreGeneration > previous, previousGeneration, { timeout: 20000 });
  await page.evaluate(async () => {
    if (window.__silmoOcctRestorePromise) await window.__silmoOcctRestorePromise;
  });
}
page.on('pageerror', error => pageErrors.push(error.stack || error.message));
page.on('console', message => {
  if (message.type() === 'error' && !allowExpectedConsoleError) pageErrors.push('console: ' + message.text());
});

// Die Kernanwendung muss auch dann starten, wenn externe HTTPS-Zugriffe blockiert sind.
await page.route('https://**/*', route => route.abort());

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#viewport canvas', { timeout: 20000 });
  const webglInfo = await page.locator('#viewport canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return { available: !!gl, version: gl ? gl.getParameter(gl.VERSION) : null };
  });
  assert.equal(webglInfo.available, true, '3D-Arbeitsfläche besitzt keinen aktiven WebGL-Kontext');
  assert.match(await page.locator('#modeToggle').innerText(), /AUS/, 'Erweiterte Funktionen sind beim Start nicht ausgeschaltet');
  assert.equal(await page.locator('#occtFilletPanel').isVisible(), false, 'Alte OCCT-Flächen- und Kantenwerkzeuge sind im Normalmodus sichtbar');
  await page.locator('#modeToggle').click();
  assert.match(await page.locator('#modeToggle').innerText(), /EIN/, 'Erweiterte Funktionen lassen sich für den vollständigen CAD-Test nicht einschalten');
  await showCreateSubtab(0);
  assert.equal(await page.locator('#occtFilletPanel').isVisible(), true, 'OCCT-Flächen- und Kantenwerkzeuge bleiben im Expertenmodus im Grundformen-Untertab verborgen');
  // SketchUp-orientierte Grundkürzel müssen vorhandene Skizzierwerkzeuge aktivieren.
  await page.keyboard.press('l');
  assert.equal(await page.locator('#sketchTool').inputValue(), 'line2d', 'L aktiviert nicht das Linienwerkzeug');
  assert.equal(await page.locator('#cancelSketch').isDisabled(), false, 'L startet den Zeichenmodus nicht');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#cancelSketch').isDisabled(), true, 'Escape beendet den Zeichenmodus nicht');
  await page.keyboard.press('r');
  assert.equal(await page.locator('#sketchTool').inputValue(), 'rectangle', 'R aktiviert nicht das Rechteckwerkzeug');
  await page.keyboard.press('Escape');
  await page.keyboard.press('c');
  assert.equal(await page.locator('#sketchTool').inputValue(), 'circle', 'C aktiviert nicht das Kreiswerkzeug');
  await page.keyboard.press('Escape');
  const runtimeInfo = await page.evaluate(() => ({
    revision: window.THREE?.REVISION,
    loader: typeof window.THREE?.STLLoader,
    exporter: typeof window.THREE?.STLExporter
  }));
  assert.deepEqual(runtimeInfo, { revision: '128', loader: 'function', exporter: 'function' }, 'Lokale Three.js r128 Runtime oder STL-Erweiterungen fehlen');
  await page.waitForFunction(() => typeof window.__silmoTutorialAllPositions === 'function', null, { timeout: 20000 });
  assert.match(await page.locator('meta[name="silmo-build"]').getAttribute('content'), /^v95/, 'Build-Metadaten zeigen nicht v95');
  assert.equal(await page.locator('[data-tab="expert"]').isVisible(), true, 'Expertenzentrum-Reiter wird bei eingeschalteten erweiterten Funktionen nicht angezeigt');
  const mainTabs = await page.locator('nav.tool-tabs[aria-label="Werkzeugbereiche"]').evaluate(nav => Array.from(nav.querySelectorAll(':scope > button.tool-tab[data-tab]')).filter(el => !el.hidden).map(el => el.textContent.trim()));
  assert.deepEqual(mainTabs, ['Modellieren','Zeichnen','Bearbeiten','Messen & Prüfen','Projekt','3D-Druck','Expertenzentrum'], 'Hauptreiter sind nicht vollständig oder falsch sortiert');
  await page.locator('[data-tab="project"]').click();
  const projectSubtabs = page.locator('#pane-project-left > .inner-tab-nav button');
  assert.deepEqual(await projectSubtabs.allTextContents(), ['Projektdatei','Import','Export'], 'Projekt-Unterreiter fehlen oder sind falsch sortiert');
  assert.equal(await page.locator('#saveProjectButton').isVisible(), true, 'Projekt speichern ist nicht im Projekt-Reiter sichtbar');
  assert.equal(await page.locator('#openProjectButton').isVisible(), true, 'Projekt öffnen ist nicht im Projekt-Reiter sichtbar');
  await projectSubtabs.nth(1).click();
  for (const id of ['importModel','importStepModel','stlDropZone']) assert.equal(await page.locator('#'+id).isVisible(), true, id+' ist im Import-Unterreiter nicht sichtbar');
  await projectSubtabs.nth(2).click();
  for (const id of ['exportModel','exportStepModel']) assert.equal(await page.locator('#'+id).isVisible(), true, id+' ist im Export-Unterreiter nicht sichtbar');
  await page.locator('[data-tab="print"]').click();
  for (const id of ['bedWidth','bedDepth','applyBedSize','runPrintCheck']) assert.equal(await page.locator('#'+id).isVisible(), true, id+' fehlt im 3D-Druck-Reiter');
  await page.locator('#runPrintCheck').click();
  assert.match(await page.locator('#printCheckReport').innerText(), /Würfel:/, 'Druckprüfung analysiert das beim Start vorhandene Beispielmodell nicht');
  assert.match(await page.locator('#status').innerText(), /3D-Druck-Vorprüfung beendet/, 'Druckprüfung meldet keinen Abschluss');
  await page.locator('[data-tab="create"]').click();
  const quickLinkPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await quickLinkPage.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await quickLinkPage.waitForSelector('#viewport canvas', { timeout: 20000 });
  await quickLinkPage.locator('#tutorialLaunch').click();
  await quickLinkPage.locator('#tutorialQuickGuide > summary').click();
  await quickLinkPage.locator('#tutorialToolGallery [data-target="exportModel"]').click();
  assert.equal(await quickLinkPage.locator('[data-tab="project"]').getAttribute('aria-selected'), 'true', 'Tutorial-Schnelllink wechselt nicht in den Projekt-Reiter');
  assert.equal(await quickLinkPage.locator('#exportModel').isVisible(), true, 'Tutorial-Schnelllink öffnet den Export-Unterreiter nicht');
  await quickLinkPage.locator('#tutorialSkip').click();
  await quickLinkPage.close();
  assert.equal(await page.evaluate(() => window.SILMOUnits?.mmToWorldUnits(10)), 1, 'Zentrale Einheiten-API ist im Browser nicht verfügbar');
  assert.equal(await page.evaluate(() => window.SILMOUnits?.worldUnitsToMm(1)), 10, 'Zentrale Einheiten-API liefert falsche Millimeterwerte');
  assert.equal(await page.evaluate(() => window.SILMOTolerances?.CSG_GEOMETRY_WORLD_UNITS), 1e-5, 'Zentrale Toleranz-API ist nicht verfügbar oder hat den falschen CSG-Wert');
  assert.equal(await page.evaluate(() => window.SILMOTolerances?.PRINT_BED_BOUNDS_WORLD_UNITS), 1e-4, 'Druckbett-Toleranz hat sich unerwartet geändert');
  assert.equal(await page.evaluate(() => typeof window.SILMOPrimitiveGeometry?.createPrimitiveGeometry), 'function', 'Grundkörper-Geometriemodul ist nicht verfügbar');
  assert.equal(await page.evaluate(() => typeof window.SILMOSketchGeometry?.createExtrusionGeometry), 'function', 'Skizzen-Geometriemodul ist nicht verfügbar');
  assert.equal(await page.evaluate(() => typeof window.SILMOSketchGeometry?.createParametricProfile), 'function', 'Parametrische Skizzenprofile sind nicht verfügbar');
  assert.equal(await page.evaluate(() => typeof window.SILMOSketchGeometry?.createLoftGeometry), 'function', 'Loft-Geometrie ist nicht verfügbar');
  assert.equal(await page.evaluate(() => typeof window.SILMOSketchGeometry?.createSweepGeometry), 'function', 'Sweep-Geometrie ist nicht verfügbar');
  assert.equal(await page.evaluate(() => typeof window.SILMOSketchGeometry?.createPathCurve), 'function', 'CAD-Pfadkurven sind nicht verfügbar');
  assert.equal(await page.evaluate(() => typeof window.SILMOSketchGeometry?.createPathTubeGeometry), 'function', 'CAD-Pfadrohre sind nicht verfügbar');
  assert.equal(await page.evaluate(() => typeof window.SILMOSketchGeometry?.createContourFrameGeometry), 'function', 'Hohlrahmen-Geometrie ist nicht verfügbar');
  assert.equal(await page.evaluate(() => window.SILMOProjectSchema?.CURRENT_PROJECT_VERSION), 3, 'Projektformat-Version 3 ist nicht registriert');
assert.equal(await page.evaluate(() => typeof window.SILMOProjectGeometry?.serializeGeometry), 'function', 'Projektgeometrie-Serialisierung ist nicht verfügbar');
assert.equal(await page.evaluate(() => typeof window.SILMOProjectGeometry?.restoreGeometry), 'function', 'Projektgeometrie-Wiederaufbau ist nicht verfügbar');
assert.equal(await page.evaluate(() => typeof window.SILMOProjectGeometry?.serializeObjectForUnion), 'function', 'Union-Serialisierung ist nicht verfügbar');
assert.equal(await page.evaluate(() => typeof window.SILMOProjectGeometry?.restoreObjectForUnion), 'function', 'Union-Wiederherstellung ist nicht verfügbar');
assert.equal(await page.evaluate(() => typeof window.SILMOProjectIO?.createProjectIO), 'function', 'Projektdatei-I/O-Modul ist nicht verfügbar');
assert.equal(await page.evaluate(() => typeof window.SILMOCSG?.combineMeshes), 'function', 'BSP-CSG-Modul ist nicht verfügbar');
  assert.equal(await page.evaluate(() => typeof window.SILMOOCCTClient?.createClient), 'function', 'OCCT-Client ist nicht verfügbar');
  await showCreateSubtab(0);
  const occtStartCount = await page.locator('#objects .object-row').count();
  await page.locator('#addOcctBox').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  assert.equal(await page.locator('#objects .object-row').count(), occtStartCount + 1,
    'OCCT-B-Rep-Körper wurde nicht in die SILMO-Szene übernommen');
  const occtResult = await page.evaluate(async () => {
    const created = window.__silmoOcctLastCreated;
    return { ...created, workerVolumeMM3: await window.__silmoOcctClient.getVolume(created.shapeId) };
  });
  assert.ok(Math.abs(occtResult.volumeMM3 - 8000) < 1e-7, 'OCCT-Quader besitzt nicht das analytische Volumen von 8000 mm³');
  assert.ok(Math.abs(occtResult.workerVolumeMM3 - 8000) < 1e-7, 'B-Rep-Körper blieb im Worker nicht mit korrektem Volumen abfragbar');
  assert.equal(occtResult.triangleCount > 0, true, 'OCCT-B-Rep wurde nicht in ein Three.js-Darstellungsnetz tesselliert');
  assert.deepEqual(occtResult.dimensionsMM, [20, 20, 20], 'OCCT-Testkörper hat falsche Sollabmessungen');
  const occtExtrusion = await page.evaluate(async () => {
    const loops = [
      [[0, 0], [40, 0], [40, 30], [0, 30]],
      [[10, 10], [10, 20], [20, 20], [20, 10]]
    ];
    const result = await window.__silmoOcctClient.createExtrusion(loops, 5);
    return {
      ...result,
      workerVolumeMM3: await window.__silmoOcctClient.getVolume(result.shapeId),
      meshValues: result.mesh.positions.length,
      indexValues: result.mesh.indices.length
    };
  });
  assert.equal(occtExtrusion.shapeType, 'solid', 'Skizzenextrusion erzeugte keinen OCCT-Solid');
  assert.ok(Math.abs(occtExtrusion.volumeMM3 - 5500) < 1e-6, 'OCCT-Skizzenextrusion hat falsches Volumen mit Innenloch');
  assert.ok(Math.abs(occtExtrusion.workerVolumeMM3 - 5500) < 1e-6, 'OCCT-B-Rep-Extrusion blieb nicht im Worker abfragbar');
  assert.ok(occtExtrusion.mesh.triangleCount > 0 && occtExtrusion.meshValues > 0 && occtExtrusion.indexValues > 0,
    'OCCT-Skizzenextrusion lieferte kein Darstellungsnetz');
  assert.equal(await page.evaluate(shapeId => window.__silmoOcctClient.releaseShape(shapeId), occtExtrusion.shapeId), true,
    'Einzelner OCCT-Skizzenkörper konnte nicht freigegeben werden');
  assert.equal(await page.evaluate(async shapeId => {
    try { await window.__silmoOcctClient.getVolume(shapeId); return false; }
    catch { return true; }
  }, occtExtrusion.shapeId), true, 'Freigegebener OCCT-Körper blieb weiterhin abfragbar');
  const booleanResults = await page.evaluate(async () => {
    const first = await window.__silmoOcctClient.createBox(20, 20, 20);
    const second = await window.__silmoOcctClient.createBox(10, 20, 20);
    const results = {};
    try {
      for (const operation of ['fuse', 'cut', 'common']) {
        const result = await window.__silmoOcctClient.booleanOperation(operation, [first.shapeId, second.shapeId]);
        results[operation] = {
          volumeMM3: result.volumeMM3,
          triangleCount: result.mesh.triangleCount,
          meshValues: result.mesh.positions.length,
          indexValues: result.mesh.indices.length
        };
        await window.__silmoOcctClient.releaseShape(result.shapeId);
      }
    } finally {
      await window.__silmoOcctClient.releaseShape(first.shapeId);
      await window.__silmoOcctClient.releaseShape(second.shapeId);
    }
    return results;
  });
  assert.ok(Math.abs(booleanResults.fuse.volumeMM3 - 8000) < 1e-7,
    'OCCT-Fuse lieferte falsches Volumen');
  assert.ok(Math.abs(booleanResults.cut.volumeMM3 - 4000) < 1e-7,
    'OCCT-Cut lieferte falsches Volumen');
  assert.ok(Math.abs(booleanResults.common.volumeMM3 - 4000) < 1e-7,
    'OCCT-Common lieferte falsches Volumen');
  for (const operation of ['fuse', 'cut', 'common']) {
    assert.ok(booleanResults[operation].triangleCount > 0 &&
      booleanResults[operation].meshValues > 0 && booleanResults[operation].indexValues > 0,
    'OCCT-' + operation + ' lieferte kein verwendbares Darstellungsnetz');
  }

  // OCCT-Worker-Belastung: sechs Zyklen mit je Fuse, Cut und Common.
  // Jeder Durchlauf prüft Volumen, Tessellierung und anschliessende Freigabe aller Handles.
  const occtStress = await page.evaluate(async () => {
    const expected = { fuse: 12000, cut: 4000, common: 4000 };
    const translationsMM = [[0, 0, 0], [10, 0, 0]];
    const completed = [];
    const released = [];
    for (let cycle = 0; cycle < 6; cycle++) {
      const first = await window.__silmoOcctClient.createBox(20, 20, 20);
      const second = await window.__silmoOcctClient.createBox(20, 20, 20);
      try {
        for (const operation of ['fuse', 'cut', 'common']) {
          const result = await window.__silmoOcctClient.booleanOperation(
            operation, [first.shapeId, second.shapeId], translationsMM
          );
          const workerVolumeMM3 = await window.__silmoOcctClient.getVolume(result.shapeId);
          if (Math.abs(result.volumeMM3 - expected[operation]) > 1e-7 ||
              Math.abs(workerVolumeMM3 - expected[operation]) > 1e-7 ||
              !(result.mesh?.triangleCount > 0) ||
              !(result.mesh?.positions?.length > 0) ||
              !(result.mesh?.indices?.length > 0)) {
            throw new Error('OCCT-Stresstest Zyklus ' + cycle + ', ' + operation +
              ': Volumen oder Tessellierung ungültig.');
          }
          await window.__silmoOcctClient.releaseShape(result.shapeId);
          let resultReleased = false;
          try { await window.__silmoOcctClient.getVolume(result.shapeId); }
          catch { resultReleased = true; }
          if (!resultReleased) throw new Error('OCCT-Ergebnis-Handle blieb nach Freigabe aktiv.');
          released.push(result.shapeId);
          completed.push({ cycle, operation, volumeMM3: result.volumeMM3 });
        }
      } finally {
        await window.__silmoOcctClient.releaseShape(first.shapeId);
        await window.__silmoOcctClient.releaseShape(second.shapeId);
      }
      for (const shapeId of [first.shapeId, second.shapeId]) {
        let sourceReleased = false;
        try { await window.__silmoOcctClient.getVolume(shapeId); }
        catch { sourceReleased = true; }
        if (!sourceReleased) throw new Error('OCCT-Quellkörper-Handle blieb nach Freigabe aktiv.');
        released.push(shapeId);
      }
    }
    return { cycles: 6, operations: completed.length, releasedHandles: released.length, completed };
  });
  assert.equal(occtStress.operations, 18, 'OCCT-Stresstest hat nicht alle 18 Boolean-Operationen ausgeführt');
  assert.equal(occtStress.releasedHandles, 30, 'OCCT-Stresstest hat nicht alle 30 Worker-Handles freigegeben');

  await page.locator('[data-tab="edit"]').click();
  await page.locator('#delete').evaluate(button => {
    if (button.disabled) throw new Error('Löschen-Schaltfläche ist deaktiviert.');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  assert.equal(await page.locator('#objects .object-row').count(), occtStartCount,
    'OCCT-Testkörper konnte nicht wieder aus der Szene entfernt werden');
  await page.waitForFunction(async shapeId => {
    try { await window.__silmoOcctClient.getVolume(shapeId); return false; }
    catch { return true; }
  }, occtResult.shapeId, { timeout: 10000 });
  const boxUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(boxUndoGeneration);
  const restoredOcctVolume = await page.evaluate(async () =>
    window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId));
  assert.ok(Math.abs(restoredOcctVolume - 8000) < 1e-7,
    'Undo stellte den OCCT-B-Rep-Quader nicht mit seinem korrekten Volumen wieder her');

  // Echter OCCT-Zylinder über die SILMO-Oberfläche inklusive Undo/Redo-Rekonstruktion.
  await page.locator('[data-tab="create"]').click();
  const cylinderSceneStart = await page.locator('#objects .object-row').count();
  await page.locator('#addOcctCylinder').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Zylinder erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  const cylinderResult = await page.evaluate(async () => {
    const created = window.__silmoOcctLastCreated;
    return { ...created, workerVolumeMM3: await window.__silmoOcctClient.getVolume(created.shapeId) };
  });
  assert.ok(Math.abs(cylinderResult.volumeMM3 - 3000 * Math.PI) < 1e-6,
    'OCCT-Zylinder besitzt nicht das analytische Volumen 3000π mm³');
  assert.ok(Math.abs(cylinderResult.workerVolumeMM3 - 3000 * Math.PI) < 1e-6,
    'OCCT-Zylinder ist im Worker nicht als echter B-Rep-Körper abfragbar');
  assert.deepEqual(cylinderResult.dimensionsMM, [20, 20, 30]);
  const cylinderUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(cylinderUndoGeneration);
  assert.equal(await page.locator('#objects .object-row').count(), cylinderSceneStart,
    'Undo hat den OCCT-Zylinder nicht entfernt');
  const cylinderRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(cylinderRedoGeneration);
  const restoredCylinder = await page.evaluate(async () => {
    const created = window.__silmoOcctLastRestored;
    return created ? await window.__silmoOcctClient.getVolume(created.shapeId) : null;
  });
  assert.ok(Math.abs(restoredCylinder - 3000 * Math.PI) < 1e-6,
    'Redo hat den OCCT-Zylinder nicht als echten B-Rep-Körper rekonstruiert');

  // Echter OCCT-B-Rep-Kugelkörper über die Oberfläche inklusive Undo/Redo.
  const sphereSceneStart = await page.locator('#objects .object-row').count();
  await page.locator('#addOcctSphere').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Kugel erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  const sphereResult = await page.evaluate(async () => {
    const created = window.__silmoOcctLastCreated;
    return { ...created, workerVolumeMM3: await window.__silmoOcctClient.getVolume(created.shapeId) };
  });
  const expectedSphereVolume = (4 / 3) * Math.PI * 10 ** 3;
  assert.ok(Math.abs(sphereResult.volumeMM3 - expectedSphereVolume) < 1e-6, 'OCCT-Kugel besitzt nicht das analytische Volumen 4000π/3 mm³');
  assert.ok(Math.abs(sphereResult.workerVolumeMM3 - expectedSphereVolume) < 1e-6, 'OCCT-Kugel ist im Worker nicht als echter B-Rep-Körper abfragbar');
  assert.deepEqual(sphereResult.dimensionsMM, [20, 20, 20]);
  const sphereUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(sphereUndoGeneration);
  assert.equal(await page.locator('#objects .object-row').count(), sphereSceneStart, 'Undo hat die OCCT-Kugel nicht entfernt');
  const sphereRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(sphereRedoGeneration);
  const restoredSphere = await page.evaluate(async () => {
    const created = window.__silmoOcctLastRestored;
    return created ? await window.__silmoOcctClient.getVolume(created.shapeId) : null;
  });
  assert.ok(Math.abs(restoredSphere - expectedSphereVolume) < 1e-6, 'Redo hat die OCCT-Kugel nicht als echten B-Rep-Körper rekonstruiert');

  // Echter OCCT-B-Rep-Kegel über die Oberfläche inklusive Undo/Redo.
  const coneSceneStart = await page.locator('#objects .object-row').count();
  await page.locator('#addOcctCone').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Kegel erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  const coneResult = await page.evaluate(async () => {
    const created = window.__silmoOcctLastCreated;
    return { ...created, workerVolumeMM3: await window.__silmoOcctClient.getVolume(created.shapeId) };
  });
  const expectedConeVolume = (Math.PI * 10 ** 2 * 30) / 3;
  assert.ok(Math.abs(coneResult.volumeMM3 - expectedConeVolume) < 1e-6,
    'OCCT-Kegel besitzt nicht das analytische Volumen 1000π mm³');
  assert.ok(Math.abs(coneResult.workerVolumeMM3 - expectedConeVolume) < 1e-6,
    'OCCT-Kegel ist im Worker nicht als echter B-Rep-Körper abfragbar');
  assert.deepEqual(coneResult.dimensionsMM, [20, 20, 30]);
  const coneUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(coneUndoGeneration);
  assert.equal(await page.locator('#objects .object-row').count(), coneSceneStart,
    'Undo hat den OCCT-Kegel nicht entfernt');
  const coneRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(coneRedoGeneration);
  const restoredCone = await page.evaluate(async () => {
    const created = window.__silmoOcctLastRestored;
    return created ? await window.__silmoOcctClient.getVolume(created.shapeId) : null;
  });
  assert.ok(Math.abs(restoredCone - expectedConeVolume) < 1e-6,
    'Redo hat den OCCT-Kegel nicht als echten B-Rep-Körper rekonstruiert');

  // Echter OCCT-B-Rep-Torus über die Oberfläche inklusive Undo/Redo.
  const torusSceneStart = await page.locator('#objects .object-row').count();
  await page.locator('#addOcctTorus').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Torus erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  const topologyAndFillet = await page.evaluate(async () => {
    const client = window.__silmoOcctClient;
    const source = await client.createBox(20, 20, 20);
    try {
      const topology = await client.listSubShapes(source.shapeId);
      const rounded = await client.filletEdges(source.shapeId, [0], 1);
      let multiRounded = null;
      try {
        multiRounded = await client.filletEdges(source.shapeId, [0, 1], 1);
      } catch (error) {
        multiRounded = { error: String(error?.message || error) };
      }
      let variableRounded = null;
      try {
        variableRounded = await client.filletEdges(source.shapeId, [0, 1], [
          { start: 1, end: 1 }, { start: 1.5, end: 1.5 }
        ]);
      } catch (error) {
        variableRounded = { error: String(error?.message || error) };
      }
      let chamfered = null;
      try {
        chamfered = await client.chamferEdges(source.shapeId, [2], 1);
      } catch (error) {
        chamfered = { error: String(error?.message || error) };
      }
      const draftFaceIndex = topology.face.find(face =>
         Math.abs(face.centerMM?.[0] ?? Infinity) < 1e-5 &&
         Math.abs((face.centerMM?.[2] ?? -Infinity) - 10) < 1e-5)?.index;
       let drafted = null;
       if (Number.isInteger(draftFaceIndex)) {
         try {
           drafted = await client.draftFaces(source.shapeId, [draftFaceIndex], 5,
             { x: 0, y: 0, z: 1 },
             { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 } });
         } catch (error) {
           drafted = { error: String(error?.message || error) };
         }
       }
       const invalidIndexRejected = await client.filletEdges(source.shapeId, [999], 1)
        .then(() => false, () => true);
      const impossibleChamferRejected = await client.chamferEdges(source.shapeId, [2], 2000)
        .then(() => false, () => true);
      const result = {
        faceCount: topology.face.length,
        edgeCount: topology.edge.length,
        faceTypes: topology.face.map(face => face.geometryType),
        faceAreasFinite: topology.face.every(face => Number.isFinite(face.areaMM2) && face.areaMM2 > 0),
        faceAreasMM2: topology.face.map(face => face.areaMM2),
        totalFaceAreaMM2: topology.face.reduce((sum, face) => sum + face.areaMM2, 0),
        edgeTypes: topology.edge.map(edge => edge.geometryType),
        edgeLengthsFinite: topology.edge.every(edge => Number.isFinite(edge.lengthMM) && edge.lengthMM > 0),
        sourceVolume: source.volumeMM3,
        roundedVolume: rounded.volumeMM3,
        roundedWorkerVolume: await client.getVolume(rounded.shapeId),
        roundedShapeId: rounded.shapeId,
        multiRoundedVolume: multiRounded?.volumeMM3 ?? null,
        multiRoundedWorkerVolume: multiRounded?.shapeId ? await client.getVolume(multiRounded.shapeId) : null,
        multiRoundedError: multiRounded?.error || null,
        variableRoundedVolume: variableRounded?.volumeMM3 ?? null,
        variableRoundedWorkerVolume: variableRounded?.shapeId ? await client.getVolume(variableRounded.shapeId) : null,
        variableRoundedError: variableRounded?.error || null,
        chamferedVolume: chamfered?.volumeMM3 ?? null,
        chamferedWorkerVolume: chamfered?.shapeId ? await client.getVolume(chamfered.shapeId) : null,
        draftFaceIndex: Number.isInteger(draftFaceIndex) ? draftFaceIndex : null,
         draftedVolume: drafted?.volumeMM3 ?? null,
         draftedWorkerVolume: drafted?.shapeId ? await client.getVolume(drafted.shapeId) : null,
         draftError: drafted?.error || null,
         chamferError: chamfered?.error || null,
        impossibleChamferRejected,
        invalidIndexRejected
      };
      await client.releaseShape(rounded.shapeId);
      if (multiRounded?.shapeId) await client.releaseShape(multiRounded.shapeId);
      if (variableRounded?.shapeId) await client.releaseShape(variableRounded.shapeId);
      if (drafted?.shapeId) await client.releaseShape(drafted.shapeId);
       if (chamfered?.shapeId) await client.releaseShape(chamfered.shapeId);
      return result;
    } finally {
      await client.releaseShape(source.shapeId);
    }
  });
  assert.equal(topologyAndFillet.faceCount, 6, 'OCCT-Topologie liefert für den Quader nicht sechs Flächen');
  assert.equal(topologyAndFillet.edgeCount, 12, 'OCCT-Topologie liefert für den Quader nicht zwölf Kanten');
  assert.ok(topologyAndFillet.faceTypes.every(type => typeof type === 'string' && type.length > 0),
    'OCCT-Flächentypen fehlen');
  assert.equal(topologyAndFillet.faceAreasFinite, true, 'Native OCCT-Flächen müssen gültige Oberflächeninhalte liefern');
  assert.equal(topologyAndFillet.faceAreasMM2.length, 6, 'Jede der sechs Quaderflächen muss einen eigenen Flächeninhalt besitzen');
  assert.ok(topologyAndFillet.faceAreasMM2.every(area => Math.abs(area - 400) < 1e-5),
    'Jede Seite des 20-mm-Würfels muss einzeln 400 mm² besitzen');
  assert.ok(Math.abs(topologyAndFillet.totalFaceAreaMM2 - 2400) < 1e-5,
    'Die sechs nativen Quaderflächen müssen zusammen 2400 mm² ergeben');
  assert.ok(topologyAndFillet.edgeTypes.every(type => typeof type === 'string' && type.length > 0) &&
    topologyAndFillet.edgeLengthsFinite, 'OCCT-Kantentypen oder Kantenlängen sind ungültig');
  assert.ok(topologyAndFillet.roundedVolume > 0 &&
    topologyAndFillet.roundedVolume < topologyAndFillet.sourceVolume,
    'Native OCCT-Kantenrundung hat das Quader-Volumen nicht plausibel verändert');
  assert.ok(Math.abs(topologyAndFillet.roundedWorkerVolume - topologyAndFillet.roundedVolume) < 1e-7,
    'Gerundeter OCCT-Körper ist im Worker nicht dauerhaft abfragbar');
  assert.equal(topologyAndFillet.invalidIndexRejected, true,
    'OCCT muss Kantenindizes ausserhalb der nativen Topologie ablehnen');
  assert.ok(Number.isFinite(topologyAndFillet.multiRoundedVolume) &&
    topologyAndFillet.multiRoundedVolume > 0 &&
    topologyAndFillet.multiRoundedVolume < topologyAndFillet.sourceVolume,
    'Mehrfach-Kantenrundung mit zwei nativen Kanten lieferte keinen gültigen Solid: ' +
      String(topologyAndFillet.multiRoundedError));
  assert.ok(Math.abs(topologyAndFillet.multiRoundedWorkerVolume - topologyAndFillet.multiRoundedVolume) < 1e-7,
    'Mehrfach gerundeter OCCT-Körper ist im Worker nicht dauerhaft abfragbar');
  assert.ok(Number.isFinite(topologyAndFillet.variableRoundedVolume) &&
    topologyAndFillet.variableRoundedVolume > 0 &&
    topologyAndFillet.variableRoundedVolume < topologyAndFillet.sourceVolume,
    'Per-Kante-Radien ergaben keinen gültigen B-Rep-Körper: ' + String(topologyAndFillet.variableRoundedError));
  assert.ok(Math.abs(topologyAndFillet.variableRoundedWorkerVolume - topologyAndFillet.variableRoundedVolume) < 1e-7,
    'B-Rep mit unterschiedlichen Kantenradien ist im Worker nicht dauerhaft abfragbar');
  assert.ok(Number.isFinite(topologyAndFillet.chamferedVolume) &&
    topologyAndFillet.chamferedVolume > 0 &&
    topologyAndFillet.chamferedVolume < topologyAndFillet.sourceVolume,
    'Native OCCT-Kantenfase ergab keinen gültigen Solid: ' + String(topologyAndFillet.chamferError));
  assert.ok(Math.abs(topologyAndFillet.chamferedWorkerVolume - topologyAndFillet.chamferedVolume) < 1e-7,
    'Gefaster OCCT-Körper ist im Worker nicht dauerhaft abfragbar');
  assert.notEqual(topologyAndFillet.draftFaceIndex, null,
     'Für die Flächenneigung wurde keine vertikale native Würfelfläche gefunden');
   assert.ok(Number.isFinite(topologyAndFillet.draftedVolume) &&
     topologyAndFillet.draftedVolume > 0 &&
     topologyAndFillet.draftedVolume < topologyAndFillet.sourceVolume,
     'Native OCCT-Flächenneigung ergab keinen gültigen Solid: ' + String(topologyAndFillet.draftError));
   assert.ok(Math.abs(topologyAndFillet.draftedWorkerVolume - topologyAndFillet.draftedVolume) < 1e-7,
     'Geneigter OCCT-Körper ist im Worker nicht dauerhaft abfragbar');
   assert.equal(topologyAndFillet.impossibleChamferRejected, true,
    'Geometrisch unmögliche Kantenfase muss kontrolliert abgewiesen werden');

  const torusResult = await page.evaluate(async () => {
    const created = window.__silmoOcctLastCreated;
    return { ...created, workerVolumeMM3: await window.__silmoOcctClient.getVolume(created.shapeId) };
  });
  const expectedTorusVolume = 2 * Math.PI ** 2 * 20 * 5 ** 2;
  assert.ok(Math.abs(torusResult.volumeMM3 - expectedTorusVolume) < 1e-5,
    'OCCT-Torus besitzt nicht das analytische Volumen 1000π² mm³');
  assert.ok(Math.abs(torusResult.workerVolumeMM3 - expectedTorusVolume) < 1e-5,
    'OCCT-Torus ist im Worker nicht als echter B-Rep-Körper abfragbar');
  assert.deepEqual(torusResult.dimensionsMM, [50, 50, 10]);
  await page.locator('#inspectOcctShape').click();
  await page.waitForFunction(() => /^OCCT-Analyse:/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  const torusInspection = await page.evaluate(() => window.__silmoOcctLastInspection);
  assert.ok(Math.abs(torusInspection.volumeMM3 - expectedTorusVolume) < 1e-5,
    'Körperprüfung meldet ein falsches natives OCCT-Volumen');
  assert.ok(torusInspection.boundingBoxMM.size.every((value, axis) => Math.abs(value - [50, 50, 10][axis]) < 1e-5),
    'Native OCCT-B-Rep-Bounding-Box meldet falsche Torus-Abmessungen');
  assert.equal(torusInspection.boundingBoxMM.source, 'native-brep',
    'Bounding Box stammt nicht aus der nativen OCCT-B-Rep-Abfrage');
  assert.ok(Math.abs(torusInspection.surfaceAreaMM2 - 400 * Math.PI ** 2) < 1e-4,
    'OCCT-Körperprüfung meldet eine falsche analytische Torus-Oberfläche');
  assert.ok(torusInspection.topology.face > 0 && torusInspection.topology.edge > 0 &&
    torusInspection.topology.vertex > 0 && torusInspection.topology.solid > 0,
    'Native OCCT-Topologiezählung ist unvollständig');
  assert.ok(torusInspection.centerOfMassMM.every(value => Math.abs(value) < 1e-6),
    'Torus-Schwerpunkt liegt nicht am Ursprung');
  assert.ok(torusInspection.mesh.vertexCount > 0 && torusInspection.mesh.triangleCount > 0 &&
    torusInspection.mesh.indexCount === torusInspection.mesh.triangleCount * 3,
    'Körperprüfung meldet ungültige Tessellierungskennzahlen');
  const torusUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(torusUndoGeneration);
  assert.equal(await page.locator('#objects .object-row').count(), torusSceneStart,
    'Undo hat den OCCT-Torus nicht entfernt');
  const torusRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(torusRedoGeneration);
  const restoredTorus = await page.evaluate(async () => {
    const created = window.__silmoOcctLastRestored;
    return created ? await window.__silmoOcctClient.getVolume(created.shapeId) : null;
  });
  assert.ok(Math.abs(restoredTorus - expectedTorusVolume) < 1e-5,
    'Redo hat den OCCT-Torus nicht als echten B-Rep-Körper rekonstruiert');

  // Sichtbarer CAD-Workflow: native Kanten laden, in der Oberfläche wählen,
  // abrunden und das Ergebnis über Undo/Redo als echten B-Rep rekonstruieren.
  const filletSceneStart = await page.locator('#objects .object-row').count();
  await page.locator('#addOcctBox').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  await page.locator('#loadOcctEdges').click();
  await page.waitForFunction(() => document.querySelectorAll('#occtEdgeList option').length === 12, null, { timeout: 45000 });
  await page.waitForFunction(() => document.querySelectorAll('#occtFaceList option').length === 6, null, { timeout: 45000 });
  const faceOverlayState = await page.evaluate(() => ({
    count: window.__silmoOcctFaceOverlay?.group.children.length || 0,
    sourceExists: Boolean(window.__silmoOcctFaceOverlay?.sourceMesh)
  }));
  assert.equal(faceOverlayState.count, 6, 'Jede native Quaderfläche muss ein eigenes Auswahlnetz besitzen');
  assert.equal(faceOverlayState.sourceExists, true, 'Flächenauswahl ist nicht mit dem Quader verbunden');
  await page.locator('#occtFaceList').selectOption('0');
  const faceSelection = await page.evaluate(() => ({
    selected: window.__silmoOcctFaceOverlay?.selectedIndex,
    highlighted: window.__silmoOcctFaceOverlay?.group.children
      .find(mesh => mesh.userData.occtFaceIndex === 0)?.material.color.getHex(),
    summary: document.querySelector('#occtFaceSummary')?.textContent || ''
  }));
  assert.equal(faceSelection.selected, 0, 'Die erste native Fläche wurde nicht ausgewählt');
  assert.equal(faceSelection.highlighted, 0xffbd4a, 'Die ausgewählte native Fläche wurde nicht hervorgehoben');
  assert.match(faceSelection.summary, /400\.00 mm²/, 'Die Flächenauswahl zeigt den falschen nativen Flächeninhalt');
  await page.locator('#toggleOcctFacePick').click();
  const faceScreenPoint = await page.evaluate(() => window.__silmoOcctFacePickPoint());
  assert.ok(faceScreenPoint && Number.isFinite(faceScreenPoint.x) && Number.isFinite(faceScreenPoint.y),
    'Für den sichtbaren Quader wurde kein 3D-Auswahlpunkt berechnet');
  await page.mouse.click(faceScreenPoint.x, faceScreenPoint.y);
  await page.waitForFunction(() => Number.isInteger(window.__silmoOcctFaceOverlay?.selectedIndex), null, { timeout: 5000 });
  const pickedFaceIndex = await page.evaluate(() => window.__silmoOcctFaceOverlay.selectedIndex);
  assert.equal(await page.locator('#occtFaceList').inputValue(), String(pickedFaceIndex),
    '3D-Klick hat die getroffene native Fläche nicht in der Liste ausgewählt');
  assert.match(await page.locator('#occtTopologySummary').textContent(), /6 echte B-Rep-Flächen und 12 echte B-Rep-Kanten/,
    'Die sichtbare Kantenliste zeigt keine vollständige native Quader-Topologie');
  assert.equal(await page.locator('#occtEdgeList option:not([disabled])').count(), 12,
    'Nicht alle zwölf Quaderkanten sind für die 3D-Auswahl verfügbar');
  await page.locator('#toggleOcctEdgePick').click();
  let edgePickTarget = null;
  for (let edgeIndex = 0; edgeIndex < 12; edgeIndex++) {
    const point = await page.evaluate(index => window.__silmoOcctEdgePickPoint(index), edgeIndex);
    if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      edgePickTarget = { edgeIndex, point };
      break;
    }
  }
  assert.ok(edgePickTarget,
    'Für keine der zwölf nativen Quaderkanten wurde ein eindeutig sichtbarer 3D-Auswahlpunkt berechnet');
  const { edgeIndex: pickedEdgeIndex, point: edgeScreenPoint } = edgePickTarget;
  const edgePickState = await page.evaluate(point => ({
    ...window.__silmoOcctEdgePickReady(),
    point,
    pointInsideCanvas: point.x >= window.__silmoOcctEdgePickReady().canvas.left &&
      point.x <= window.__silmoOcctEdgePickReady().canvas.right &&
      point.y >= window.__silmoOcctEdgePickReady().canvas.top &&
      point.y <= window.__silmoOcctEdgePickReady().canvas.bottom
  }), edgeScreenPoint);
  assert.ok(edgePickState.enabled && edgePickState.overlayExists && edgePickState.sourceMatchesSelected &&
    edgePickState.pointInsideCanvas,
    '3D-Kantenauswahl ist vor dem Klick nicht aktiv oder der Auswahlpunkt liegt ausserhalb des Viewports: ' + JSON.stringify(edgePickState));
  const edgePickTolerance = await page.evaluate(point => ({
    near: window.__silmoOcctFindEdgeAtScreenPoint(point.x + 8, point.y + 6),
    far: window.__silmoOcctFindEdgeAtScreenPoint(point.x + 40, point.y + 40)
  }), edgeScreenPoint);
  assert.equal(edgePickTolerance.near?.edgeIndex, pickedEdgeIndex,
    'Die bildschirmbasierte Kantenerkennung verfehlt einen Klick innerhalb der 14-Pixel-Toleranz: ' + JSON.stringify(edgePickTolerance));
  assert.notEqual(edgePickTolerance.far?.edgeIndex, pickedEdgeIndex,
    'Die bildschirmbasierte Kantenerkennung akzeptiert einen weit entfernten Klick weiterhin als dieselbe Zielkante');
  await page.mouse.click(edgeScreenPoint.x + 8, edgeScreenPoint.y + 6);
  await page.waitForTimeout(300);
  const edgePickEventDebug = await page.evaluate(index => ({
    event: window.__silmoOcctLastEdgePickEvent || null,
    selected: document.querySelector(`#occtEdgeList option[value="${index}"]`)?.selected === true
  }), pickedEdgeIndex);
  assert.ok(edgePickEventDebug.selected,
    '3D-Klick hat Kante 1 nicht ausgewählt. Ereignisdiagnose: ' + JSON.stringify(edgePickEventDebug));
  const viewportEdgePick = await page.evaluate(index => ({
    selected: Array.from(window.__silmoOcctEdgeOverlay?.selectedIndices || []),
    highlighted: window.__silmoOcctEdgeOverlay?.group.children
      .find(line => line.userData.occtEdgeIndex === index)?.material.color.getHex()
  }), pickedEdgeIndex);
  assert.deepEqual(viewportEdgePick.selected, [pickedEdgeIndex],
    'Ein Klick auf die 3D-Kante hat die native Kante nicht ausgewählt');
  assert.equal(viewportEdgePick.highlighted, 0xffbd4a,
    'Die ausgewählte 3D-Kante wurde nicht hervorgehoben');
  await page.locator('#occtFilletRadius').fill('1');
  await page.locator('#applyOcctFillet').click();
  await page.waitForFunction(() => /^Echte OCCT-Kantenrundung erfolgreich/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  const visibleFillet = await page.evaluate(async () => ({
    ...window.__silmoOcctLastFillet,
    workerVolumeMM3: await window.__silmoOcctClient.getVolume(window.__silmoOcctLastFillet.shapeId),
    source: window.__silmoOcctLastFillet && document.querySelector('#objects .object-row')?.textContent
  }));
  assert.ok(visibleFillet.volumeMM3 > 0 && visibleFillet.volumeMM3 < 8000 &&
    Math.abs(visibleFillet.workerVolumeMM3 - visibleFillet.volumeMM3) < 1e-7,
    'Sichtbare Kantenrundung hat keinen gültigen nativen OCCT-Solid erzeugt');
  assert.deepEqual(visibleFillet.edgeIndices, [pickedEdgeIndex]);
  assert.equal(visibleFillet.radiusMM, 1);
  const filletUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(filletUndoGeneration);
  const restoredBeforeFillet = await page.evaluate(async () => ({
    volume: await window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId),
    source: window.__silmoOcctLastRestored
  }));
  assert.ok(Math.abs(restoredBeforeFillet.volume - 8000) < 1e-7,
    'Undo hat den ursprünglichen Quader vor der Kantenrundung nicht rekonstruiert');
  const filletRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(filletRedoGeneration);
  const restoredAfterFillet = await page.evaluate(async () =>
    window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId));
  assert.ok(Math.abs(restoredAfterFillet - visibleFillet.volumeMM3) < 1e-7,
    'Redo hat den gerundeten OCCT-Körper nicht aus seiner Konstruktionsquelle rekonstruiert');
  const finalFilletUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(finalFilletUndoGeneration);
  await page.locator('#delete').evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  assert.equal(await page.locator('#objects .object-row').count(), filletSceneStart,
    'Der Testkörper für die sichtbare Kantenrundung konnte nicht entfernt werden');

  // Sichtbarer Chamfer-Workflow: echte B-Rep-Fase mit Projekt-/Undo-Rezept.
  const chamferSceneStart = await page.locator('#objects .object-row').count();
  await page.locator('#addOcctBox').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  await page.locator('#loadOcctEdges').click();
  await page.waitForFunction(() => document.querySelectorAll('#occtEdgeList option').length === 12, null, { timeout: 45000 });
  await page.locator('#occtEdgeList').selectOption('1');
  await page.locator('#occtChamferDistance').fill('1');
  await page.locator('#applyOcctChamfer').click();
  await page.waitForFunction(() => /^Echte OCCT-Kantenfase erfolgreich/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  const visibleChamfer = await page.evaluate(async () => ({
    ...window.__silmoOcctLastChamfer,
    workerVolumeMM3: await window.__silmoOcctClient.getVolume(window.__silmoOcctLastChamfer.shapeId),
    sourceKind: document.querySelector('#objects .object-row')?.textContent
  }));
  assert.ok(visibleChamfer.volumeMM3 > 0 && visibleChamfer.volumeMM3 < 8000 &&
    Math.abs(visibleChamfer.workerVolumeMM3 - visibleChamfer.volumeMM3) < 1e-7,
    'Sichtbare Kantenfase hat keinen gültigen nativen OCCT-Solid erzeugt');
  assert.deepEqual(visibleChamfer.edgeIndices, [1]);
  assert.equal(visibleChamfer.distanceMM, 1);
  const chamferUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(chamferUndoGeneration);
  const restoredBeforeChamfer = await page.evaluate(async () =>
    window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId));
  assert.ok(Math.abs(restoredBeforeChamfer - 8000) < 1e-7,
    'Undo hat den ursprünglichen Quader vor der Kantenfase nicht rekonstruiert');
  const chamferRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(chamferRedoGeneration);
  const restoredAfterChamfer = await page.evaluate(async () =>
    window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId));
  assert.ok(Math.abs(restoredAfterChamfer - visibleChamfer.volumeMM3) < 1e-7,
    'Redo hat den gefasten OCCT-Körper nicht aus seiner Konstruktionsquelle rekonstruiert');
  const finalChamferUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(finalChamferUndoGeneration);
  await page.locator('#delete').evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  assert.equal(await page.locator('#objects .object-row').count(), chamferSceneStart,
    'Der Testkörper für die sichtbare Kantenfase konnte nicht entfernt werden');

  // Sichtbarer Draft-Workflow: eine native Seitenfläche neigen und Undo/Redo prüfen.
  const draftSceneStart = await page.locator('#objects .object-row').count();
  await page.locator('#addOcctBox').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  await page.locator('#loadOcctEdges').click();
  await page.waitForFunction(() => document.querySelectorAll('#occtFaceList option').length === 6, null, { timeout: 45000 });
  const draftFaceIndex = await page.evaluate(() => {
    const faces = window.__silmoOcctFaceOverlay?.faces || [];
    return faces.find(face => Math.abs(face.centerMM?.[0] ?? Infinity) < 1e-5 &&
      Math.abs((face.centerMM?.[2] ?? -Infinity) - 10) < 1e-5)?.index ?? null;
  });
  assert.notEqual(draftFaceIndex, null, 'Der Quader besitzt keine auswählbare vertikale Fläche für den Draft-Test');
  await page.locator('#occtFaceList').selectOption(String(draftFaceIndex));
  await page.locator('#occtDraftAngle').fill('5');
  await page.locator('#occtDraftDirectionX').fill('0.25');
  await page.locator('#occtDraftDirectionY').fill('0');
  await page.locator('#occtDraftDirectionZ').fill('1');
  await page.locator('#occtDraftOriginX').fill('0.5');
  await page.locator('#occtDraftOriginY').fill('0');
  await page.locator('#occtDraftOriginZ').fill('0');
  await page.locator('#occtDraftNormalX').fill('0');
  await page.locator('#occtDraftNormalY').fill('0');
  await page.locator('#occtDraftNormalZ').fill('1');
  assert.equal(await page.locator('#applyOcctDraft').isDisabled(), false,
    'Die gültige native Fläche aktiviert das Flächenneigungswerkzeug nicht');
  await page.locator('#occtDraftDirectionX').fill('0');
  await page.locator('#occtDraftDirectionY').fill('0');
  await page.locator('#occtDraftDirectionZ').fill('0');
  await page.locator('#applyOcctDraft').click();
  await page.waitForFunction(() => /Zugrichtung und Normalenvektor/.test(document.querySelector('#status')?.textContent || ''));
  await page.locator('#occtDraftDirectionX').fill('0.25');
  await page.locator('#occtDraftDirectionZ').fill('1');
  const draftUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.locator('#applyOcctDraft').click();
  await page.waitForFunction(() => /^Echte OCCT-Flächenneigung erfolgreich/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  const visibleDraft = await page.evaluate(async () => ({
    ...window.__silmoOcctLastDraft,
    workerVolumeMM3: await window.__silmoOcctClient.getVolume(window.__silmoOcctLastDraft.shapeId)
  }));
  assert.ok(visibleDraft.volumeMM3 > 0 && visibleDraft.volumeMM3 < 8000 &&
    Math.abs(visibleDraft.workerVolumeMM3 - visibleDraft.volumeMM3) < 1e-7,
    'Sichtbare OCCT-Flächenneigung hat keinen gültigen nativen Solid erzeugt');
  assert.deepEqual(visibleDraft.faceIndices, [draftFaceIndex]);
  assert.equal(visibleDraft.angleDeg, 5);
  assert.ok(Math.abs(visibleDraft.direction.x - 0.25) < 1e-9 &&
    Math.abs(visibleDraft.direction.z - 1) < 1e-9,
    'Die frei eingestellte Zugrichtung wurde nicht an OCCT übergeben');
  assert.ok(Math.abs(visibleDraft.neutralPlane.origin.x - 0.5) < 1e-9 &&
    Math.abs(visibleDraft.neutralPlane.normal.z - 1) < 1e-9,
    'Ursprung oder Normale der frei eingestellten Neutralebene wurden nicht übernommen');
  await page.locator('[data-tab="project"]').click();
  await page.locator('#pane-project-left > .inner-tab-nav button').nth(0).click();
  const draftProjectDownloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.locator('#saveProjectButton').click();
  const draftProjectDownload = await draftProjectDownloadPromise;
  const draftProjectPath = await draftProjectDownload.path();
  assert.ok(draftProjectPath && statSync(draftProjectPath).size > 1000,
    'Projektdatei mit geneigtem OCCT-Körper wurde nicht gespeichert');
  const savedDraftProject = JSON.parse(readFileSync(draftProjectPath, 'utf8'));
  const savedDraftSource = savedDraftProject.objects.at(-1).occtSource;
  assert.equal(savedDraftSource?.kind, 'draft',
    'Flächenneigungs-Rezept fehlt in der gespeicherten Projektdatei');
  assert.ok(Math.abs(savedDraftSource.direction.x - 0.25) < 1e-9 &&
    Math.abs(savedDraftSource.neutralPlane.origin.x - 0.5) < 1e-9,
    'Zugrichtung oder Neutralebene gingen beim Speichern verloren');
  const draftRoundTripPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const draftRoundTripErrors = [];
  draftRoundTripPage.on('pageerror', error => draftRoundTripErrors.push(error.message));
  await draftRoundTripPage.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await draftRoundTripPage.waitForSelector('#viewport canvas', { timeout: 20000 });
  await draftRoundTripPage.locator('#projectFileInput').setInputFiles({
    name: 'draft-roundtrip.silmo.json',
    mimeType: 'application/json',
    buffer: readFileSync(draftProjectPath)
  });
  await draftRoundTripPage.waitForFunction(() =>
    /^Projekt geöffnet/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 10000 });
  await draftRoundTripPage.evaluate(async () => {
    if (window.__silmoOcctProjectRestorePromise) await window.__silmoOcctProjectRestorePromise;
  });
  const reopenedDraft = await draftRoundTripPage.evaluate(async () => {
    const restored = window.__silmoOcctProjectRestoreSummary?.at(-1);
    return {
      source: restored?.occtSource,
      volumeMM3: restored?.shapeId ? await window.__silmoOcctClient.getVolume(restored.shapeId) : null
    };
  });
  assert.equal(reopenedDraft.source?.kind, 'draft',
    'Gespeicherter geneigter OCCT-Körper wurde beim Projektimport nicht rekonstruiert');
  assert.ok(Number.isFinite(reopenedDraft.volumeMM3) &&
    Math.abs(reopenedDraft.volumeMM3 - visibleDraft.volumeMM3) < 1e-7,
    'Projekt-Roundtrip hat das native Volumen des geneigten Körpers verändert');
  assert.deepEqual(draftRoundTripErrors, [], 'Projektimport des geneigten Körpers erzeugte Browserfehler');
  await draftRoundTripPage.close();
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(draftUndoGeneration);
  const restoredBeforeDraft = await page.evaluate(async () =>
    window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId));
  assert.ok(Math.abs(restoredBeforeDraft - 8000) < 1e-7,
    'Undo hat den ursprünglichen Quader vor der Flächenneigung nicht rekonstruiert');
  const draftRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(draftRedoGeneration);
  const restoredAfterDraft = await page.evaluate(async () =>
    window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId));
  assert.ok(Math.abs(restoredAfterDraft - visibleDraft.volumeMM3) < 1e-7,
    'Redo hat den geneigten OCCT-Körper nicht aus seiner Konstruktionsquelle rekonstruiert');
  const finalDraftUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(finalDraftUndoGeneration);
  await page.locator('#delete').evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  assert.equal(await page.locator('#objects .object-row').count(), draftSceneStart,
    'Der Testkörper für die sichtbare Flächenneigung konnte nicht entfernt werden');

  // STEP-Export und anschliessender Import über die echte SILMO-Dateiauswahl.
  await page.locator('#objects .object-select').filter({ hasText: 'OCCT-B-Rep-Quader' }).last().evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.locator('#pane-project-left > .inner-tab-nav button').nth(2).click();
  const [stepDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportStepModel').click()
  ]);
  assert.match(stepDownload.suggestedFilename(), /\.step$/i,
    'STEP-Export erzeugt keine .step-Datei');
  const stepDownloadPath = await stepDownload.path();
  assert.ok(stepDownloadPath, 'STEP-Export hat keinen Downloadpfad geliefert');
  const exportedStepText = readFileSync(stepDownloadPath, 'utf8');
  assert.match(exportedStepText, /^ISO-10303-21/i, 'STEP-Export enthält keinen ISO-10303-21-Header');
  assert.match(exportedStepText, /END-ISO-10303-21;\s*$/i, 'STEP-Export besitzt keinen gültigen Abschluss');
  const beforeStepImportCount = await page.locator('#objects .object-row').count();
  await page.locator('#pane-project-left > .inner-tab-nav button').nth(1).click();
  await page.locator('#stepFileInput').setInputFiles({
    name: 'silmo-roundtrip.step',
    mimeType: 'application/step',
    buffer: Buffer.from(exportedStepText)
  });
  await page.waitForFunction(() => /^STEP-Modell importiert/.test(document.querySelector('#status')?.textContent || ''),
    null, { timeout: 45000 });
  assert.equal(await page.locator('#objects .object-row').count(), beforeStepImportCount + 1,
    'STEP-Import hat kein neues Szenenobjekt erzeugt');
  const importedStep = await page.evaluate(async () => ({
    ...window.__silmoOcctLastCreated,
    workerVolumeMM3: await window.__silmoOcctClient.getVolume(window.__silmoOcctLastCreated.shapeId)
  }));
  assert.ok(Math.abs(importedStep.volumeMM3 - 8000) < 1e-7 &&
    Math.abs(importedStep.workerVolumeMM3 - 8000) < 1e-7,
  'STEP-Roundtrip hat das ursprüngliche OCCT-Volumen nicht erhalten: ' + JSON.stringify({ imported: importedStep.volumeMM3, worker: importedStep.workerVolumeMM3 }));
  const stepUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(stepUndoGeneration);
  assert.equal(await page.locator('#objects .object-row').count(), beforeStepImportCount,
    'Undo hat den importierten STEP-Körper nicht entfernt');
  const stepRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(stepRedoGeneration);
  const restoredStepVolume = await page.evaluate(async () =>
    window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId));
  assert.ok(Math.abs(restoredStepVolume - 8000) < 1e-7,
    'Redo hat den importierten STEP-Körper nicht als echten B-Rep rekonstruiert');
  await page.locator('#objects .object-select').last().evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.locator('#delete').evaluate(button => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  assert.equal(await page.locator('#objects .object-row').count(), beforeStepImportCount,
    'Importierter STEP-Körper konnte nach dem Roundtrip nicht gelöscht werden');

  // End-to-end: two scene objects selected in the normal object list are fused by OCCT.
  const booleanSceneStart = await page.locator('#objects .object-row').count();
  await showCreateSubtab(0);
  await page.locator('#addOcctBox').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  await page.locator('#addOcctBox').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  assert.equal(await page.locator('#objects .object-row').count(), booleanSceneStart + 2,
    'Zwei OCCT-Testkörper wurden nicht in die Szene übernommen');
  await page.evaluate(index => {
    const button = document.querySelectorAll('#objects .object-select')[index];
    if (!button) throw new Error('OCCT-Mehrfachauswahl: Objektzeile fehlt.');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
  }, booleanSceneStart);
  const previousBooleanShapeId = await page.evaluate(() => window.__silmoOcctLastBoolean?.shapeId || 0);
  await page.locator('#booleanUnion').evaluate(button => {
    if (button.disabled) throw new Error('OCCT-Fuse-Schaltfläche ist deaktiviert.');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForFunction(previous => Number.isFinite(window.__silmoOcctLastBoolean?.shapeId) &&
    window.__silmoOcctLastBoolean.shapeId > previous, previousBooleanShapeId, { timeout: 20000 });
  const sceneBoolean = await page.evaluate(async () => ({
    ...window.__silmoOcctLastBoolean,
    workerVolumeMM3: await window.__silmoOcctClient.getVolume(window.__silmoOcctLastBoolean.shapeId)
  }));
  assert.equal(sceneBoolean.operation, 'fuse', 'SILMO-Schaltfläche hat keine OCCT-Fuse-Operation ausgelöst');
  assert.ok(Math.abs(sceneBoolean.volumeMM3 - 8000) < 1e-7 &&
    Math.abs(sceneBoolean.workerVolumeMM3 - 8000) < 1e-7,
  'SILMO-OCCT-Fuse lieferte für zwei identische Körper nicht das erwartete Volumen');
  assert.equal(await page.locator('#objects .object-row').count(), booleanSceneStart + 1,
    'OCCT-Fuse hat die zwei Ausgangsobjekte nicht durch ein Ergebnisobjekt ersetzt');

  const booleanUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(booleanUndoGeneration);
  assert.equal(await page.locator('#objects .object-row').count(), booleanSceneStart + 2,
    'Undo hat die beiden OCCT-Ausgangskörper nicht wiederhergestellt');
  const booleanRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(booleanRedoGeneration);
  const redoneBooleanVolume = await page.evaluate(async () =>
    window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId));
  assert.ok(Math.abs(redoneBooleanVolume - 8000) < 1e-7,
    'Redo stellte das OCCT-Boolean-Ergebnis nicht als echten B-Rep-Körper wieder her');

  // End-to-end: Drei getrennte OCCT-Körper in einem einzigen UI-Auftrag vereinigen.
  const multiBodyStart = await page.locator('#objects .object-row').count();
  await showCreateSubtab(0);
  for (let index = 0; index < 3; index++) {
    await page.locator('#addOcctBox').click();
    await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  }
  // Körper mit der normalen SILMO-Tastaturbedienung auf 0, 30 und 60 mm verteilen.
  for (const [index, steps] of [[1, 3], [2, 6]]) {
    await page.locator('#objects .object-select').nth(multiBodyStart + index).evaluate(button =>
      button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    for (let step = 0; step < steps; step++) await page.keyboard.press('Shift+ArrowRight');
  }
  await page.locator('#objects .object-select').nth(multiBodyStart).evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.locator('#objects .object-select').nth(multiBodyStart + 1).evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true })));
  await page.locator('#objects .object-select').nth(multiBodyStart + 2).evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true })));
  const previousMultiBodyShapeId = await page.evaluate(() => window.__silmoOcctLastBoolean?.shapeId || 0);
  await page.locator('#booleanUnion').evaluate(button => {
    if (button.disabled) throw new Error('OCCT-Mehrkörper-Fuse-Schaltfläche ist deaktiviert.');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForFunction(previous => window.__silmoOcctLastBoolean?.operandCount === 3 &&
    window.__silmoOcctLastBoolean.shapeId > previous, previousMultiBodyShapeId, { timeout: 30000 });
  const multiBodyResult = await page.evaluate(async () => ({
    ...window.__silmoOcctLastBoolean,
    workerVolumeMM3: await window.__silmoOcctClient.getVolume(window.__silmoOcctLastBoolean.shapeId)
  }));
  assert.ok(Math.abs(multiBodyResult.volumeMM3 - 24000) < 1e-6 &&
    Math.abs(multiBodyResult.workerVolumeMM3 - 24000) < 1e-6,
  'OCCT-Mehrkörper-Fuse lieferte für drei getrennte 20-mm-Quader nicht 24000 mm³');
  assert.equal(await page.locator('#objects .object-row').count(), multiBodyStart + 1,
    'Drei OCCT-Ausgangskörper wurden nicht durch ein Ergebnisobjekt ersetzt');
  const multiUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(multiUndoGeneration);
  assert.equal(await page.locator('#objects .object-row').count(), multiBodyStart + 3,
    'Undo stellte nicht alle drei OCCT-Ausgangskörper wieder her');
  const multiRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(multiRedoGeneration);
  const multiRedo = await page.evaluate(async () => ({
    volume: await window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId)
  }));
  assert.ok(Math.abs(multiRedo.volume - 24000) < 1e-6,
    'Redo rekonstruierte das Mehrkörper-OCCT-Ergebnis nicht korrekt');
  assert.equal(await page.locator('#objects .object-row').count(), multiBodyStart + 1,
    'Redo stellte nicht genau einen Mehrkörper-Verbund wieder her');
  await page.locator('#delete').evaluate(button => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  assert.equal(await page.locator('#objects .object-row').count(), multiBodyStart,
    'Mehrkörper-OCCT-Ergebnis konnte nicht entfernt werden');

  await page.locator('#objects .object-select').nth(booleanSceneStart).evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.locator('#delete').evaluate(button => {
    if (button.disabled) throw new Error('Löschen-Schaltfläche ist deaktiviert.');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  assert.equal(await page.locator('#objects .object-row').count(), booleanSceneStart,
    'OCCT-Boolean-Ergebnis konnte nach Redo nicht aus der Szene entfernt werden');

  // End-to-end: Cut über die SILMO-Oberfläche mit zwei um 10 mm überlappenden OCCT-Quadern.
  const cutSceneStart = await page.locator('#objects .object-row').count();
  await showCreateSubtab(0);
  await page.locator('#addOcctBox').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  await page.locator('#addOcctBox').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  assert.equal(await page.locator('#objects .object-row').count(), cutSceneStart + 2,
    'Zwei OCCT-Körper für den Cut-Test wurden nicht erstellt');
  // Den zweiten Quader über die normale SILMO-Tastaturbedienung um 10 mm verschieben.
  await page.locator('#objects .object-select').nth(cutSceneStart + 1).evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.keyboard.press('Shift+ArrowRight');
  // Ersten Quader als Grundform wählen, danach den verschobenen Quader hinzufügen.
  await page.locator('#objects .object-select').nth(cutSceneStart).evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.locator('#objects .object-select').nth(cutSceneStart + 1).evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true })));
  const previousCutShapeId = await page.evaluate(() => window.__silmoOcctLastBoolean?.shapeId || 0);
  await page.locator('#booleanSubtract').evaluate(button => {
    if (button.disabled) throw new Error('OCCT-Cut-Schaltfläche ist deaktiviert.');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForFunction(previous => window.__silmoOcctLastBoolean?.operation === 'cut' &&
    Number.isFinite(window.__silmoOcctLastBoolean?.shapeId) &&
    window.__silmoOcctLastBoolean.shapeId > previous, previousCutShapeId, { timeout: 20000 });
  const sceneCut = await page.evaluate(async () => ({
    ...window.__silmoOcctLastBoolean,
    workerVolumeMM3: await window.__silmoOcctClient.getVolume(window.__silmoOcctLastBoolean.shapeId)
  }));
  assert.ok(Math.abs(sceneCut.volumeMM3 - 4000) < 1e-7 &&
    Math.abs(sceneCut.workerVolumeMM3 - 4000) < 1e-7,
  'SILMO-OCCT-Cut lieferte für 10 mm Überlappung nicht das erwartete Volumen von 4000 mm³');
  assert.equal(await page.locator('#objects .object-row').count(), cutSceneStart + 1,
    'OCCT-Cut hat die Ausgangskörper nicht durch einen Ausschnitt ersetzt');

  const cutUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(cutUndoGeneration);
  assert.equal(await page.locator('#objects .object-row').count(), cutSceneStart + 2,
    'Undo stellte die beiden OCCT-Cut-Ausgangskörper nicht wieder her');
  const cutRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(cutRedoGeneration);
  const redoneCutVolume = await page.evaluate(async () =>
    window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId));
  assert.ok(Math.abs(redoneCutVolume - 4000) < 1e-7,
    'Redo stellte das OCCT-Cut-Ergebnis nicht als echten B-Rep-Körper wieder her');

  // OCCT-Projekt-Roundtrip: echten Cut-Körper speichern und in einem frischen Browserkontext rekonstruieren.
  await page.locator('[data-tab="project"]').click();
  await page.locator('#pane-project-left > .inner-tab-nav button').nth(0).click();
  await page.locator('#saveProjectButton').waitFor({ state: 'visible', timeout: 5000 });
  const occtProjectDownloadPromise = page.waitForEvent('download', { timeout: 10000 });
  await page.locator('#saveProjectButton').click();
  const occtProjectDownload = await occtProjectDownloadPromise;
  const occtProjectPath = await occtProjectDownload.path();
  assert.ok(occtProjectPath && statSync(occtProjectPath).size > 1000,
    'OCCT-Projektdatei wurde nicht vollständig heruntergeladen');
  const occtSavedProject = JSON.parse(readFileSync(occtProjectPath, 'utf8'));
  assert.equal(occtSavedProject.objects.length, cutSceneStart + 1,
    'Gespeichertes OCCT-Projekt enthält nicht die erwartete Objektanzahl');
  const savedOcctSource = occtSavedProject.objects.at(-1).occtSource;
  assert.equal(savedOcctSource?.kind, 'boolean',
    'OCCT-Boolean-Konstruktionsrezept wurde nicht in die Projektdatei geschrieben');
  assert.equal(savedOcctSource.operation, 'cut',
    'OCCT-Cut-Operation ging beim Speichern verloren');
  assert.deepEqual(savedOcctSource.translationsMM, [[0,0,0],[10,0,0]],
    'OCCT-Boolean-Transformationen gingen beim Speichern verloren');

  const occtRoundTripPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const occtRoundTripErrors = [];
  occtRoundTripPage.on('pageerror', error => occtRoundTripErrors.push(error.message));
  occtRoundTripPage.on('console', message => {
    if (message.type() === 'error') occtRoundTripErrors.push('console: ' + message.text());
  });
  await occtRoundTripPage.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await occtRoundTripPage.waitForSelector('#viewport canvas', { timeout: 20000 });
  await occtRoundTripPage.locator('#projectFileInput').setInputFiles({
    name: 'occt-roundtrip.silmo.json',
    mimeType: 'application/json',
    buffer: readFileSync(occtProjectPath)
  });
  await occtRoundTripPage.waitForFunction(() =>
    /^Projekt geöffnet/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 10000 });
  await occtRoundTripPage.waitForFunction(() =>
    Number.isInteger(window.__silmoOcctProjectRestoreGeneration) &&
    window.__silmoOcctProjectRestoreGeneration > 0, null, { timeout: 10000 });
  await occtRoundTripPage.evaluate(async () => {
    if (window.__silmoOcctProjectRestorePromise) await window.__silmoOcctProjectRestorePromise;
  });
  const reopenedOcctProject = await occtRoundTripPage.evaluate(async () => {
    const restored = window.__silmoOcctProjectRestoreSummary?.at(-1);
    return {
      objectCount: document.querySelectorAll('#objects .object-row').length,
      kernel: restored?.geometryKernel,
      source: restored?.occtSource,
      shapeId: restored?.shapeId,
      volumeMM3: restored?.shapeId ? await window.__silmoOcctClient.getVolume(restored.shapeId) : null
    };
  });
  assert.equal(reopenedOcctProject.objectCount, cutSceneStart + 1,
    'OCCT-Projekt wurde nach erneutem Öffnen nicht vollständig geladen');
  assert.equal(reopenedOcctProject.kernel, 'occt-wasm',
    'Gespeicherter OCCT-Körper wurde nach erneutem Öffnen nicht als echter B-Rep rekonstruiert');
  assert.equal(reopenedOcctProject.source?.operation, 'cut',
    'OCCT-Cut-Rezept ging beim erneuten Öffnen verloren');
  assert.ok(Number.isInteger(reopenedOcctProject.shapeId) &&
    Math.abs(reopenedOcctProject.volumeMM3 - 4000) < 1e-7,
  'Wiedergeöffneter OCCT-B-Rep-Körper besitzt nicht mehr das korrekte Worker-Volumen von 4000 mm³');
  // Verschachtelter Konstruktionsbaum: ein gespeicherter Cut wird Operand einer zweiten Fuse-Operation.
  const nestedOcctProject = structuredClone(occtSavedProject);
  nestedOcctProject.objects.at(-1).occtSource = {
    kind: 'boolean',
    operation: 'fuse',
    operands: [structuredClone(savedOcctSource), {
      kind: 'box', widthMM: 20, depthMM: 20, heightMM: 20
    }],
    translationsMM: [[0, 0, 0], [0, 0, 0]]
  };
  const nestedGeneration = await occtRoundTripPage.evaluate(() =>
    window.__silmoOcctProjectRestoreGeneration || 0);
  await occtRoundTripPage.locator('#projectFileInput').setInputFiles({
    name: 'occt-nested-roundtrip.silmo.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(nestedOcctProject))
  });
  await occtRoundTripPage.waitForFunction(() =>
    /^Projekt geöffnet/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 10000 });
  await occtRoundTripPage.waitForFunction(previous =>
    window.__silmoOcctProjectRestoreGeneration > previous,
    nestedGeneration, { timeout: 10000 });
  await occtRoundTripPage.evaluate(async () => {
    if (window.__silmoOcctProjectRestorePromise) await window.__silmoOcctProjectRestorePromise;
  });
  const nestedRestored = await occtRoundTripPage.evaluate(async () => {
    const restored = window.__silmoOcctProjectRestoreSummary?.at(-1);
    return {
      kernel: restored?.geometryKernel,
      source: restored?.occtSource,
      shapeId: restored?.shapeId,
      volumeMM3: restored?.shapeId ? await window.__silmoOcctClient.getVolume(restored.shapeId) : null
    };
  });
  assert.equal(nestedRestored.kernel, 'occt-wasm',
    'Verschachtelter OCCT-Boolean-Baum wurde nicht als echter B-Rep rekonstruiert');
  assert.equal(nestedRestored.source?.operands?.[0]?.kind, 'boolean',
    'Verschachtelte Boolean-Quelle ging beim Wiederherstellen verloren');
  assert.ok(Number.isInteger(nestedRestored.shapeId) &&
    Math.abs(nestedRestored.volumeMM3 - 8000) < 1e-7,
  'Verschachtelte OCCT-Fuse lieferte nicht das erwartete B-Rep-Volumen von 8000 mm³');

  // Fehlerpfad im produktiven Worker: eine leere Common-Operation darf die Queue nicht blockieren.
  const failedCommonRecovery = await occtRoundTripPage.evaluate(async () => {
    const client = window.__silmoOcctClient;
    const first = await client.createBox(10, 10, 10);
    const second = await client.createBox(10, 10, 10);
    let rejected = false;
    try {
      await client.booleanOperation('common', [first.shapeId, second.shapeId],
        [[0, 0, 0], [1000, 1000, 1000]]);
    } catch {
      rejected = true;
    }
    const retainedVolumes = [
      await client.getVolume(first.shapeId),
      await client.getVolume(second.shapeId)
    ];
    const afterFailure = await client.createBox(2, 2, 2);
    const afterFailureVolume = await client.getVolume(afterFailure.shapeId);
    await Promise.all([first.shapeId, second.shapeId, afterFailure.shapeId].map(id =>
      client.releaseShape(id)
    ));
    return { rejected, retainedVolumes, afterFailureVolume };
  });
  assert.equal(failedCommonRecovery.rejected, true,
    'Leeres OCCT-Common-Ergebnis wurde nicht kontrolliert abgelehnt');
  assert.ok(failedCommonRecovery.retainedVolumes.every(volume => Math.abs(volume - 1000) < 1e-7),
    'Fehlgeschlagene Boolean-Operation beschädigte ihre Ausgangskörper');
  assert.ok(Math.abs(failedCommonRecovery.afterFailureVolume - 8) < 1e-7,
    'OCCT-Worker-Queue blieb nach fehlgeschlagener Boolean-Operation blockiert');

  // Vollständige affine Transformation: Rotation, ungleichmässige Skalierung und Position
  // müssen vor dem OCCT-Fuse auf die echten B-Rep-Körper angewendet werden.
  const affineBooleanRecovery = await occtRoundTripPage.evaluate(async () => {
    const client = window.__silmoOcctClient;
    const first = await client.createBox(20, 20, 20);
    const second = await client.createBox(20, 20, 20);
    const singular = Array(12).fill(0);
    let singularRejected = false;
    try { await client.booleanOperation('fuse', [first.shapeId, second.shapeId], [singular, singular]); }
    catch { singularRejected = true; }
    const rotatedScaled = [0, -1, 0, 20, 2, 0, 0, 0, 0, 0, 1, 0];
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
    const fused = await client.booleanOperation('fuse',
      [first.shapeId, second.shapeId], [rotatedScaled, identity]);
    const volumes = [
      await client.getVolume(first.shapeId),
      await client.getVolume(second.shapeId),
      await client.getVolume(fused.shapeId)
    ];
    await Promise.all([first.shapeId, second.shapeId, fused.shapeId].map(id => client.releaseShape(id)));
    return { singularRejected, volumes };
  });
  assert.equal(affineBooleanRecovery.singularRejected, true,
    'Entartete affine Transformation wurde nicht vor dem OCCT-Aufruf abgelehnt');
  assert.ok(Math.abs(affineBooleanRecovery.volumes[0] - 8000) < 1e-7 &&
    Math.abs(affineBooleanRecovery.volumes[1] - 8000) < 1e-7 &&
    Math.abs(affineBooleanRecovery.volumes[2] - 16000) < 1e-6,
  'OCCT-Fuse hat Rotation plus ungleichmässige Skalierung nicht korrekt angewendet oder die Quellkörper verändert');

  assert.deepEqual(occtRoundTripErrors, [],
    'OCCT-Projekt-Roundtrip löste Browserfehler aus: ' + occtRoundTripErrors.join(' ; '));

  // Wiederholtes Speichern/Öffnen: fünf weitere Reloads desselben echten OCCT-Cut-Projekts.
  // Jeder Durchlauf muss neue Handles erzeugen, das korrekte Volumen behalten und alte Handles freigeben.
  const repeatedRoundTrips = [];
  for (let cycle = 0; cycle < 5; cycle++) {
    const previous = await occtRoundTripPage.evaluate(() => ({
      generation: window.__silmoOcctProjectRestoreGeneration || 0,
      shapeId: window.__silmoOcctProjectRestoreSummary?.at(-1)?.shapeId ?? null
    }));
    assert.ok(Number.isInteger(previous.shapeId), 'Vorheriger OCCT-Handle fehlt vor Roundtrip ' + cycle);
    await occtRoundTripPage.locator('#projectFileInput').setInputFiles({
      name: 'occt-roundtrip-repeat-' + cycle + '.silmo.json',
      mimeType: 'application/json',
      buffer: readFileSync(occtProjectPath)
    });
    await occtRoundTripPage.waitForFunction(() =>
      /^Projekt geöffnet/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 10000 });
    await occtRoundTripPage.waitForFunction(generation =>
      Number.isInteger(window.__silmoOcctProjectRestoreGeneration) &&
      window.__silmoOcctProjectRestoreGeneration > generation,
      previous.generation, { timeout: 10000 });
    await occtRoundTripPage.evaluate(async () => {
      if (window.__silmoOcctProjectRestorePromise) await window.__silmoOcctProjectRestorePromise;
    });
    const current = await occtRoundTripPage.evaluate(async () => {
      const restored = window.__silmoOcctProjectRestoreSummary?.at(-1);
      return {
        objectCount: document.querySelectorAll('#objects .object-row').length,
        kernel: restored?.geometryKernel,
        shapeId: restored?.shapeId ?? null,
        volumeMM3: restored?.shapeId ? await window.__silmoOcctClient.getVolume(restored.shapeId) : null
      };
    });
    assert.equal(current.objectCount, occtSavedProject.objects.length,
      'Objektanzahl nach wiederholtem OCCT-Roundtrip ' + cycle + ' stimmt nicht');
    assert.equal(current.kernel, 'occt-wasm',
      'OCCT-Roundtrip ' + cycle + ' wurde nicht als echter B-Rep rekonstruiert');
    assert.ok(Number.isInteger(current.shapeId) && current.shapeId !== previous.shapeId &&
      Math.abs(current.volumeMM3 - 4000) < 1e-7,
    'OCCT-Roundtrip ' + cycle + ' besitzt keinen neuen Handle mit 4000 mm³');
    const oldHandleReleased = await occtRoundTripPage.evaluate(async shapeId => {
      try { await window.__silmoOcctClient.getVolume(shapeId); return false; }
      catch { return true; }
    }, previous.shapeId);
    assert.equal(oldHandleReleased, true,
      'Alter OCCT-Handle blieb nach Roundtrip ' + cycle + ' aktiv');
    repeatedRoundTrips.push({ cycle, shapeId: current.shapeId, volumeMM3: current.volumeMM3 });
  }
  assert.deepEqual(occtRoundTripErrors, [],
    'Wiederholte OCCT-Roundtrips lösten Browserfehler aus: ' + occtRoundTripErrors.join(' ; '));
  console.log('OCCT-Roundtrip-Stresstest bestanden: ' + repeatedRoundTrips.length + ' zusätzliche Ladezyklen.');

  // Beschädigte OCCT-Rezepte müssen bereits vor dem Projektwechsel abgewiesen werden.
  // Das aktive Projekt und sein echter Worker-Handle müssen dabei vollständig erhalten bleiben.
  const malformedOcctVariants = [
    { name: 'operation', mutate: source => { source.operation = 'explode'; } },
    { name: 'operand-count', mutate: source => { source.operands.pop(); } },
    { name: 'translation', mutate: source => { source.translationsMM[1][0] = 200001; } },
    { name: 'singular-transform', mutate: source => { source.transformsMM[0] = Array(12).fill(0); } }
  ];
  for (const variant of malformedOcctVariants) {
    const activeBefore = await occtRoundTripPage.evaluate(async () => {
      const restored = window.__silmoOcctProjectRestoreSummary?.at(-1);
      return {
        count: document.querySelectorAll('#objects .object-row').length,
        shapeId: restored?.shapeId ?? null,
        volumeMM3: restored?.shapeId ? await window.__silmoOcctClient.getVolume(restored.shapeId) : null
      };
    });
    assert.ok(Number.isInteger(activeBefore.shapeId) &&
      Math.abs(activeBefore.volumeMM3 - 4000) < 1e-7,
    'Aktiver OCCT-Körper fehlt vor ungültigem Rezept ' + variant.name);
    const malformedProject = structuredClone(occtSavedProject);
    variant.mutate(malformedProject.objects.at(-1).occtSource);
    await occtRoundTripPage.locator('#projectFileInput').setInputFiles({
      name: 'invalid-occt-' + variant.name + '.silmo.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(malformedProject))
    });
    await occtRoundTripPage.waitForFunction(() =>
      /Projekt konnte nicht geöffnet werden/.test(document.querySelector('#status')?.textContent || ''),
      null, { timeout: 10000 });
    const rejected = await occtRoundTripPage.evaluate(async () => {
      const restored = window.__silmoOcctProjectRestoreSummary?.at(-1);
      return {
        count: document.querySelectorAll('#objects .object-row').length,
        shapeId: restored?.shapeId ?? null,
        volumeMM3: restored?.shapeId ? await window.__silmoOcctClient.getVolume(restored.shapeId) : null
      };
    });
    assert.equal(rejected.count, activeBefore.count,
      'Ungültiges OCCT-Rezept ' + variant.name + ' hat die aktive Szene verändert');
    assert.equal(rejected.shapeId, activeBefore.shapeId,
      'Ungültiges OCCT-Rezept ' + variant.name + ' hat den aktiven Worker-Handle ersetzt');
    assert.ok(Math.abs(rejected.volumeMM3 - 4000) < 1e-7,
      'Aktiver OCCT-B-Rep wurde nach Ablehnung von ' + variant.name + ' beschädigt');
  }
  assert.equal(occtRoundTripErrors.length, 4,
    'Jedes der vier ungültigen OCCT-Rezepte muss genau einen Validierungsfehler melden: ' + occtRoundTripErrors.join(' ; '));
  assert.ok(occtRoundTripErrors.every(message =>
    message.startsWith('console: Error: Ungültige OCCT-Boolean-Konstruktionsdaten.')),
  'Ungültige OCCT-Rezepte lösten andere als die erwarteten Validierungsfehler aus: ' +
    occtRoundTripErrors.join(' ; '));
  // Die drei erwarteten Validierungsfehler sind geprüft; spätere Roundtrip-Tests
  // beginnen mit einem sauberen Fehlerprotokoll.
  occtRoundTripErrors.length = 0;

  await occtRoundTripPage.close();

  // Parallel-Roundtrip: acht identische OCCT-Cut-Konstruktionsrezepte in einem neuen Dokument.
  // Das prüft konkurrierenden Worker-Aufbau, eindeutige Handles und vollständige Wiederherstellung.
  const stressSourceObject = occtSavedProject.objects.at(-1);
  const occtParallelProject = {
    ...occtSavedProject,
    objects: Array.from({ length: 8 }, (_, index) => ({
      ...structuredClone(stressSourceObject),
      objectId: 'occt-parallel-roundtrip-' + index,
      label: 'OCCT-Cut-Roundtrip-' + index,
      position: [index * 3, 0, 0]
    }))
  };
  const occtParallelPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const occtParallelErrors = [];
  occtParallelPage.on('pageerror', error => occtParallelErrors.push(error.message));
  occtParallelPage.on('console', message => {
    if (message.type() === 'error') occtParallelErrors.push('console: ' + message.text());
  });
  await occtParallelPage.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await occtParallelPage.waitForSelector('#viewport canvas', { timeout: 20000 });
  await occtParallelPage.locator('#projectFileInput').setInputFiles({
    name: 'occt-parallel-roundtrip.silmo.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(occtParallelProject))
  });
  await occtParallelPage.waitForFunction(() =>
    /^Projekt geöffnet/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 10000 });
  await occtParallelPage.waitForFunction(() =>
    Number.isInteger(window.__silmoOcctProjectRestoreGeneration) &&
    window.__silmoOcctProjectRestoreGeneration > 0, null, { timeout: 10000 });
  await occtParallelPage.evaluate(async () => {
    if (window.__silmoOcctProjectRestorePromise) await window.__silmoOcctProjectRestorePromise;
  });
  const parallelOcctRestore = await occtParallelPage.evaluate(async () => {
    const restored = window.__silmoOcctProjectRestoreSummary || [];
    const volumes = await Promise.all(restored.map(item =>
      item.shapeId ? window.__silmoOcctClient.getVolume(item.shapeId) : Promise.resolve(null)
    ));
    return {
      objectCount: document.querySelectorAll('#objects .object-row').length,
      restoredCount: restored.length,
      kernels: restored.map(item => item.geometryKernel),
      shapeIds: restored.map(item => item.shapeId),
      volumes
    };
  });
  assert.equal(parallelOcctRestore.objectCount, 8,
    'Paralleler OCCT-Projektimport hat nicht alle acht Körper geladen');
  assert.equal(parallelOcctRestore.restoredCount, 8,
    'Nicht alle acht OCCT-Körper wurden in der Wiederherstellungsübersicht erfasst');
  assert.ok(parallelOcctRestore.kernels.every(kernel => kernel === 'occt-wasm'),
    'Mindestens ein parallel importierter Körper blieb ein Three.js-Fallback');
  assert.ok(parallelOcctRestore.shapeIds.every(Number.isInteger) &&
    new Set(parallelOcctRestore.shapeIds).size === 8,
  'Paralleler OCCT-Projektimport erzeugte fehlende oder doppelte Worker-Handles');
  assert.ok(parallelOcctRestore.volumes.every(volume =>
    Number.isFinite(volume) && Math.abs(volume - 4000) < 1e-7),
  'Mindestens ein parallel rekonstruierter OCCT-Cut-Körper besitzt nicht 4000 mm³');
  assert.deepEqual(occtParallelErrors, [],
    'Paralleler OCCT-Projektimport löste Browserfehler aus: ' + occtParallelErrors.join(' ; '));

  // Projektwechsel-Stresstest im selben Browserkontext:
  // Acht aktive B-Reps durch ein einzelnes Projekt ersetzen und danach erneut acht laden.
  const previousProjectGeneration = await occtParallelPage.evaluate(() =>
    window.__silmoOcctProjectRestoreGeneration || 0);
  const singleOcctProject = {
    ...occtParallelProject,
    objects: [{
      ...structuredClone(stressSourceObject),
      objectId: 'occt-project-switch-single',
      label: 'OCCT-Projektwechsel-Einzelkörper'
    }]
  };
  await occtParallelPage.locator('#projectFileInput').setInputFiles({
    name: 'occt-project-switch-single.silmo.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(singleOcctProject))
  });
  await occtParallelPage.waitForFunction(() =>
    /^Projekt geöffnet/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 10000 });
  await occtParallelPage.waitForFunction(previous =>
    Number.isInteger(window.__silmoOcctProjectRestoreGeneration) &&
    window.__silmoOcctProjectRestoreGeneration > previous,
    previousProjectGeneration, { timeout: 10000 });
  await occtParallelPage.evaluate(async () => {
    if (window.__silmoOcctProjectRestorePromise) await window.__silmoOcctProjectRestorePromise;
  });
  const switchedSingle = await occtParallelPage.evaluate(async () => {
    const restored = window.__silmoOcctProjectRestoreSummary || [];
    return {
      objectCount: document.querySelectorAll('#objects .object-row').length,
      restoredCount: restored.length,
      volume: restored[0]?.shapeId
        ? await window.__silmoOcctClient.getVolume(restored[0].shapeId)
        : null,
      shapeId: restored[0]?.shapeId ?? null
    };
  });
  assert.equal(switchedSingle.objectCount, 1,
    'Projektwechsel hat die acht vorherigen Körper nicht durch den Einzelkörper ersetzt');
  assert.equal(switchedSingle.restoredCount, 1,
    'Einzelkörper wurde nach dem Projektwechsel nicht als OCCT-Körper rekonstruiert');
  assert.ok(Number.isInteger(switchedSingle.shapeId) &&
    Math.abs(switchedSingle.volume - 4000) < 1e-7,
  'Einzelkörper besitzt nach dem Projektwechsel keinen gültigen OCCT-B-Rep-Handle');
  const oldProjectHandlesReleased = await occtParallelPage.evaluate(async ids => {
    const results = await Promise.all(ids.map(async shapeId => {
      try { await window.__silmoOcctClient.getVolume(shapeId); return false; }
      catch { return true; }
    }));
    return results;
  }, parallelOcctRestore.shapeIds);
  assert.ok(oldProjectHandlesReleased.every(Boolean),
    'Beim Projektwechsel blieben OCCT-Handles des vorherigen Projekts aktiv');

  const singleProjectGeneration = await occtParallelPage.evaluate(() =>
    window.__silmoOcctProjectRestoreGeneration || 0);
  await occtParallelPage.locator('#projectFileInput').setInputFiles({
    name: 'occt-project-switch-eight.silmo.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(occtParallelProject))
  });
  await occtParallelPage.waitForFunction(() =>
    /^Projekt geöffnet/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 10000 });
  await occtParallelPage.waitForFunction(previous =>
    Number.isInteger(window.__silmoOcctProjectRestoreGeneration) &&
    window.__silmoOcctProjectRestoreGeneration > previous,
    singleProjectGeneration, { timeout: 10000 });
  await occtParallelPage.evaluate(async () => {
    if (window.__silmoOcctProjectRestorePromise) await window.__silmoOcctProjectRestorePromise;
  });
  const switchedBack = await occtParallelPage.evaluate(async () => {
    const restored = window.__silmoOcctProjectRestoreSummary || [];
    const volumes = await Promise.all(restored.map(item =>
      item.shapeId ? window.__silmoOcctClient.getVolume(item.shapeId) : Promise.resolve(null)
    ));
    return {
      objectCount: document.querySelectorAll('#objects .object-row').length,
      restoredCount: restored.length,
      shapeIds: restored.map(item => item.shapeId),
      volumes
    };
  });
  assert.equal(switchedBack.objectCount, 8,
    'Erneutes Laden des Acht-Körper-Projekts hat nicht alle Objekte wiederhergestellt');
  assert.equal(switchedBack.restoredCount, 8,
    'Erneutes Laden hat nicht alle acht OCCT-Konstruktionsrezepte rekonstruiert');
  assert.ok(switchedBack.shapeIds.every(Number.isInteger) &&
    new Set(switchedBack.shapeIds).size === 8 &&
    !switchedBack.shapeIds.includes(switchedSingle.shapeId),
  'Erneuter Projektimport hat keine neuen, eindeutigen OCCT-Handles erzeugt');
  assert.ok(switchedBack.volumes.every(volume =>
    Number.isFinite(volume) && Math.abs(volume - 4000) < 1e-7),
  'Mindestens ein Körper hat nach wiederholtem Projektwechsel sein B-Rep-Volumen verloren');
  assert.deepEqual(occtParallelErrors, [],
    'Wiederholter OCCT-Projektwechsel löste Browserfehler aus: ' + occtParallelErrors.join(' ; '));

  // Wiederholtes Laden desselben OCCT-Projekts im selben Dokument.
  // Jeder Durchlauf muss frische Handles erhalten und alle vorherigen Handles freigeben.
  let previousCycleHandles = switchedBack.shapeIds;
  const repeatedLoadSummaries = [];
  for (let cycle = 0; cycle < 5; cycle++) {
    const generationBefore = await occtParallelPage.evaluate(() =>
      window.__silmoOcctProjectRestoreGeneration || 0);
    await occtParallelPage.locator('#projectFileInput').setInputFiles({
      name: 'occt-repeated-load-' + cycle + '.silmo.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(occtParallelProject))
    });
    await occtParallelPage.waitForFunction(() =>
      /^Projekt geöffnet/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 10000 });
    await occtParallelPage.waitForFunction(previous =>
      Number.isInteger(window.__silmoOcctProjectRestoreGeneration) &&
      window.__silmoOcctProjectRestoreGeneration > previous,
      generationBefore, { timeout: 10000 });
    await occtParallelPage.evaluate(async () => {
      if (window.__silmoOcctProjectRestorePromise) await window.__silmoOcctProjectRestorePromise;
    });
    const repeatedState = await occtParallelPage.evaluate(async () => {
      const restored = window.__silmoOcctProjectRestoreSummary || [];
      const volumes = await Promise.all(restored.map(item =>
        item.shapeId ? window.__silmoOcctClient.getVolume(item.shapeId) : Promise.resolve(null)
      ));
      return {
        objectCount: document.querySelectorAll('#objects .object-row').length,
        shapeIds: restored.map(item => item.shapeId),
        volumes
      };
    });
    assert.equal(repeatedState.objectCount, 8,
      'Wiederholtes Laden Zyklus ' + (cycle + 1) + ' hat nicht acht Objekte geladen');
    assert.ok(repeatedState.shapeIds.length === 8 &&
      repeatedState.shapeIds.every(Number.isInteger) &&
      new Set(repeatedState.shapeIds).size === 8,
    'Wiederholtes Laden Zyklus ' + (cycle + 1) + ' erzeugte ungültige oder doppelte Handles');
    assert.ok(repeatedState.volumes.every(volume =>
      Number.isFinite(volume) && Math.abs(volume - 4000) < 1e-7),
    'Wiederholtes Laden Zyklus ' + (cycle + 1) + ' hat falsche OCCT-Volumen geliefert');
    const priorHandlesReleased = await occtParallelPage.evaluate(async ids => Promise.all(ids.map(async shapeId => {
      try { await window.__silmoOcctClient.getVolume(shapeId); return false; }
      catch { return true; }
    })), previousCycleHandles);
    assert.ok(priorHandlesReleased.every(Boolean),
      'Wiederholtes Laden Zyklus ' + (cycle + 1) + ' hat alte OCCT-Handles nicht freigegeben');
    repeatedLoadSummaries.push({ cycle: cycle + 1, shapeIds: repeatedState.shapeIds });
    previousCycleHandles = repeatedState.shapeIds;
  }

  // Fehlerhafte Importdateien dürfen das aktive OCCT-Projekt weder ersetzen
  // noch seine gültigen Worker-Handles freigeben.
  const invalidOcctProject = structuredClone(occtParallelProject);
  invalidOcctProject.objects[0].geometry.attributes.position.itemSize = 2;
  await occtParallelPage.locator('#projectFileInput').setInputFiles({
    name: 'invalid-occt-project-geometry.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(invalidOcctProject))
  });
  await occtParallelPage.waitForFunction(() =>
    /Projekt konnte nicht geöffnet werden/.test(document.querySelector('#status')?.textContent || ''),
    null, { timeout: 10000 });
  const afterInvalidOcctImport = await occtParallelPage.evaluate(async ids => {
    const restored = window.__silmoOcctProjectRestoreSummary || [];
    const volumes = await Promise.all(ids.map(async shapeId => {
      try { return await window.__silmoOcctClient.getVolume(shapeId); }
      catch { return null; }
    }));
    return {
      objectCount: document.querySelectorAll('#objects .object-row').length,
      restoredCount: restored.length,
      volumes
    };
  }, previousCycleHandles);
  assert.equal(afterInvalidOcctImport.objectCount, 8,
    'Ungültiger OCCT-Projektimport hat das aktive Projekt verändert');
  assert.equal(afterInvalidOcctImport.restoredCount, 8,
    'Ungültiger OCCT-Projektimport hat die aktive Wiederherstellungsübersicht verändert');
  assert.ok(afterInvalidOcctImport.volumes.every(volume =>
    Number.isFinite(volume) && Math.abs(volume - 4000) < 1e-7),
  'Ungültiger OCCT-Projektimport hat aktive B-Rep-Handles beschädigt');
  assert.equal(occtParallelErrors.length, 1,
    'Wiederholte OCCT-Ladevorgänge erzeugten unerwartete Browserfehler: ' + occtParallelErrors.join(' ; '));
  assert.match(occtParallelErrors[0], /Positionsdaten müssen das itemSize 3 haben/,
    'Der absichtlich ungültige Import wurde nicht mit dem erwarteten Validierungsfehler protokolliert: ' +
    occtParallelErrors.join(' ; '));
  await occtParallelPage.close();

  // OCCT-Lifecycle-Stresstest in einem isolierten Worker:
  // wiederholtes Erzeugen, Boolean-Cut, Freigeben und Prüfen ungültiger Handles.
  const occtLifecyclePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const occtLifecycleErrors = [];
  occtLifecyclePage.on('pageerror', error => occtLifecycleErrors.push(error.message));
  occtLifecyclePage.on('console', message => {
    if (message.type() === 'error') occtLifecycleErrors.push('console: ' + message.text());
  });
  await occtLifecyclePage.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await occtLifecyclePage.waitForSelector('#viewport canvas', { timeout: 20000 });
  const occtLifecycle = await occtLifecyclePage.evaluate(async () => {
    const client = window.SILMOOCCTClient.createClient();
    await client.initialize();
    const cycles = [];
    const releasedHandlesRejected = [];
    for (let index = 0; index < 12; index++) {
      const left = await client.createBox(20, 20, 20);
      const right = await client.createBox(20, 20, 20);
      const cut = await client.booleanOperation('cut',
        [left.shapeId, right.shapeId], [[0, 0, 0], [10, 0, 0]]);
      const measuredVolume = await client.getVolume(cut.shapeId);
      cycles.push({ volume: cut.volumeMM3, measuredVolume });
      for (const shapeId of [cut.shapeId, left.shapeId, right.shapeId]) {
        await client.releaseShape(shapeId);
        try {
          await client.getVolume(shapeId);
          releasedHandlesRejected.push(false);
        } catch {
          releasedHandlesRejected.push(true);
        }
      }
    }
    const concurrent = await Promise.all(Array.from({ length: 8 }, () =>
      client.createBox(10, 10, 10)));
    const concurrentVolumes = await Promise.all(concurrent.map(item => client.getVolume(item.shapeId)));
    // Gemischte parallele Befehle: Jede Boolean-Operation muss genau ihre
    // beiden Ausgangskörper sehen und ein korrektes Ergebnis behalten.
    const concurrentCuts = await Promise.all(Array.from({ length: 4 }, (_, index) =>
      client.booleanOperation('cut',
        [concurrent[index * 2].shapeId, concurrent[index * 2 + 1].shapeId],
        [[0, 0, 0], [5, 0, 0]])));
    const concurrentCutVolumes = await Promise.all(concurrentCuts.map(item =>
      client.getVolume(item.shapeId)));
    await client.releaseAll();
    let releaseAllRejected = false;
    try {
      await client.getVolume(concurrent[0].shapeId);
    } catch {
      releaseAllRejected = true;
    }
    const afterReleaseAll = await client.createBox(5, 5, 5);
    const afterReleaseAllVolume = await client.getVolume(afterReleaseAll.shapeId);
    await client.dispose();
    let disposedRejected = false;
    try {
      await client.createBox(5, 5, 5);
    } catch {
      disposedRejected = true;
    }
    return {
      cycles,
      releasedHandlesRejected,
      concurrentVolumes,
      concurrentCutVolumes,
      releaseAllRejected,
      afterReleaseAllVolume,
      disposedRejected
    };
  });
  assert.equal(occtLifecycle.cycles.length, 12,
    'OCCT-Lifecycle-Test hat nicht alle zwölf Erstellungs-/Löschzyklen ausgeführt');
  assert.ok(occtLifecycle.cycles.every(item =>
    Math.abs(item.volume - 4000) < 1e-7 && Math.abs(item.measuredVolume - 4000) < 1e-7),
  'OCCT-Boolean-Cut lieferte während wiederholter Lifecycle-Zyklen ein falsches Volumen');
  assert.equal(occtLifecycle.releasedHandlesRejected.length, 36,
    'Nicht alle 36 freigegebenen OCCT-Handles wurden geprüft');
  assert.ok(occtLifecycle.releasedHandlesRejected.every(Boolean),
    'Ein freigegebener OCCT-Körper blieb über seine Handle-ID erreichbar');
  assert.ok(occtLifecycle.concurrentVolumes.every(volume => Math.abs(volume - 1000) < 1e-7),
    'Gleichzeitige OCCT-Anfragen lieferten falsche Körpervolumen');
  assert.equal(occtLifecycle.concurrentCutVolumes.length, 4,
    'Nicht alle vier parallelen OCCT-Boolean-Operationen wurden abgeschlossen');
  assert.ok(occtLifecycle.concurrentCutVolumes.every(volume => Math.abs(volume - 500) < 1e-7),
    'Parallele OCCT-Boolean-Operationen lieferten falsche Volumen oder vermischte Operanden');
  assert.equal(occtLifecycle.releaseAllRejected, true,
    'releaseAll hat nicht alle Worker-Handles unzugänglich gemacht');
  assert.ok(Math.abs(occtLifecycle.afterReleaseAllVolume - 125) < 1e-7,
    'OCCT-Worker konnte nach releaseAll keinen neuen Körper mehr erstellen');
  assert.equal(occtLifecycle.disposedRejected, true,
    'Ein geschlossener OCCT-Client akzeptierte weiterhin neue Aufträge');
  assert.deepEqual(occtLifecycleErrors, [],
    'OCCT-Lifecycle-Stresstest löste Browserfehler aus: ' + occtLifecycleErrors.join(' ; '));
  await occtLifecyclePage.close();

  await page.locator('#delete').evaluate(button => {
    if (button.disabled) throw new Error('Löschen-Schaltfläche ist deaktiviert.');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  assert.equal(await page.locator('#objects .object-row').count(), cutSceneStart,
    'OCCT-Cut-Ergebnis konnte nach Redo nicht aus der Szene entfernt werden');

  // End-to-end: Common/Schnittmenge über die SILMO-Oberfläche inklusive Undo/Redo.
  const commonSceneStart = await page.locator('#objects .object-row').count();
  await showCreateSubtab(0);
  await page.locator('#addOcctBox').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  await page.locator('#addOcctBox').click();
  await page.waitForFunction(() => /^OCCT-B-Rep-Quader erstellt/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 45000 });
  await page.locator('#objects .object-select').nth(commonSceneStart + 1).evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.keyboard.press('Shift+ArrowRight');
  await page.locator('#objects .object-select').nth(commonSceneStart).evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.locator('#objects .object-select').nth(commonSceneStart + 1).evaluate(button =>
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true })));
  const previousCommonShapeId = await page.evaluate(() => window.__silmoOcctLastBoolean?.shapeId || 0);
  await page.locator('#booleanIntersect').evaluate(button => {
    if (button.disabled) throw new Error('OCCT-Common-Schaltfläche ist deaktiviert.');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForFunction(previous => window.__silmoOcctLastBoolean?.operation === 'common' &&
    Number.isFinite(window.__silmoOcctLastBoolean?.shapeId) &&
    window.__silmoOcctLastBoolean.shapeId > previous, previousCommonShapeId, { timeout: 20000 });
  const sceneCommon = await page.evaluate(async () => ({
    ...window.__silmoOcctLastBoolean,
    workerVolumeMM3: await window.__silmoOcctClient.getVolume(window.__silmoOcctLastBoolean.shapeId)
  }));
  assert.ok(Math.abs(sceneCommon.volumeMM3 - 4000) < 1e-7 &&
    Math.abs(sceneCommon.workerVolumeMM3 - 4000) < 1e-7,
  'SILMO-OCCT-Common lieferte für zwei um 10 mm überlappende Quader nicht 4000 mm³');
  assert.equal(await page.locator('#objects .object-row').count(), commonSceneStart + 1,
    'OCCT-Common hat die Ausgangskörper nicht durch die Schnittmenge ersetzt');
  const commonUndoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+z');
  await waitForOcctRestore(commonUndoGeneration);
  assert.equal(await page.locator('#objects .object-row').count(), commonSceneStart + 2,
    'Undo stellte die beiden OCCT-Common-Ausgangskörper nicht wieder her');
  const commonRedoGeneration = await page.evaluate(() => window.__silmoOcctRestoreGeneration || 0);
  await page.keyboard.press('Control+y');
  await waitForOcctRestore(commonRedoGeneration);
  const redoneCommonVolume = await page.evaluate(async () =>
    window.__silmoOcctClient.getVolume(window.__silmoOcctLastRestored.shapeId));
  assert.ok(Math.abs(redoneCommonVolume - 4000) < 1e-7,
    'Redo stellte die OCCT-Schnittmenge nicht als echten B-Rep-Körper wieder her');
  await page.locator('#delete').evaluate(button => {
    if (button.disabled) throw new Error('Löschen-Schaltfläche ist deaktiviert.');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  assert.equal(await page.locator('#objects .object-row').count(), commonSceneStart,
    'OCCT-Common-Ergebnis konnte nach Redo nicht aus der Szene entfernt werden');
  await showCreateSubtab(0);



  // Browser-History-Benchmark mit echten Three.js-BufferGeometries und dem SILMO-History-Modul.
  // Synthetischer CAD-ähnlicher Lastfall: 50 Meshes, 999 Vertices, 45 Aufzeichnungen bei Limit 40.
  // Zeiten und Browser-Heap sind informativ; es gibt keine maschinenabhängigen Pass/Fail-Grenzwerte.
  const browserHistoryBenchmark = await page.evaluate(async () => {
    const THREE = window.THREE;
    const objectCount = 50;
    const verticesPerObject = 999;
    const recordAttempts = 45;
    const limit = 40;
    const makeObject = index => {
      const positions = new Float32Array(verticesPerObject * 3);
      const indices = new Uint32Array(verticesPerObject);
      for (let i = 0; i < verticesPerObject; i++) {
        const angle = i / verticesPerObject * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * (1 + index * 0.001);
        positions[i * 3 + 1] = Math.sin(angle) * (1 + index * 0.001);
        positions[i * 3 + 2] = (i % 31) * 0.002;
        indices[i] = i;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeVertexNormals();
      return {
        geometry,
        material: new THREE.MeshStandardMaterial({ color: 0x4b91ed }),
        position: new THREE.Vector3(index * 0.01, 0, 0),
        rotation: new THREE.Euler(),
        scale: new THREE.Vector3(1, 1, 1),
        userData: { label: 'Browser-History-' + index }
      };
    };
    const cloneState = state => state.map(object => ({
      geometry: object.geometry.clone(),
      material: object.material.clone(),
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone(),
      userData: structuredClone(object.userData)
    }));
    const disposeState = state => state.forEach(object => {
      object.geometry.dispose();
      object.material.dispose();
    });
    const arrayBufferBytes = state => state.reduce((total, object) => {
      const attributes = Object.values(object.geometry.attributes)
        .reduce((sum, attribute) => sum + attribute.array.byteLength, 0);
      return total + attributes + (object.geometry.index?.array.byteLength || 0);
    }, 0);
    const heapBytes = () => performance.memory?.usedJSHeapSize ?? null;
    let objects = Array.from({ length: objectCount }, (_, index) => makeObject(index));
    const initialArrayBufferBytes = arrayBufferBytes(objects);
    const history = window.SILMOHistory.createHistory({
      limit,
      captureState: () => cloneState(objects),
      restoreState: state => {
        const restored = cloneState(state);
        disposeState(objects);
        objects = restored;
      },
      disposeState
    });
    const heapBefore = heapBytes();
    const recordTimesMs = [];
    for (let step = 0; step < recordAttempts; step++) {
      const start = performance.now();
      history.record();
      recordTimesMs.push(performance.now() - start);
      objects.forEach(object => {
        object.position.x += 0.01;
        object.geometry.attributes.position.array[0] += 0.01;
      });
    }
    const heapAfterSnapshots = heapBytes();
    const statsAtLimit = history.getStats();
    const undoStart = performance.now();
    const undoSucceeded = history.undo();
    const undoMs = performance.now() - undoStart;
    const redoStart = performance.now();
    const redoSucceeded = history.redo();
    const redoMs = performance.now() - redoStart;
    history.dispose();
    const statsAfterDispose = history.getStats();
    disposeState(objects);
    objects = [];
    const sorted = recordTimesMs.slice().sort((a, b) => a - b);
    return {
      objectCount,
      verticesPerObject,
      recordAttempts,
      configuredLimit: limit,
      retainedSnapshots: statsAtLimit.undoCount,
      initialArrayBufferBytes,
      estimatedSnapshotArrayBufferBytesAtLimit: initialArrayBufferBytes * limit,
      recordMedianMs: Number((sorted[Math.floor(sorted.length / 2)] || 0).toFixed(3)),
      undoMs: Number(undoMs.toFixed(3)),
      redoMs: Number(redoMs.toFixed(3)),
      browserHeapBeforeBytes: heapBefore,
      browserHeapAfterSnapshotsBytes: heapAfterSnapshots,
      undoSucceeded,
      redoSucceeded,
      statsAfterDispose
    };
  });
  assert.equal(browserHistoryBenchmark.retainedSnapshots, 40, 'Browser-History hält nicht das konfigurierte Limit von 40 Snapshots ein');
  assert.equal(browserHistoryBenchmark.undoSucceeded, true, 'Browser-History-Benchmark konnte Undo nicht ausführen');
  assert.equal(browserHistoryBenchmark.redoSucceeded, true, 'Browser-History-Benchmark konnte Redo nicht ausführen');
  assert.equal(browserHistoryBenchmark.statsAfterDispose.undoCount, 0, 'Browser-History hat Undo-Snapshots nach Dispose nicht freigegeben');
  assert.equal(browserHistoryBenchmark.statsAfterDispose.redoCount, 0, 'Browser-History hat Redo-Snapshots nach Dispose nicht freigegeben');
  console.log('SILMO_BROWSER_HISTORY_BENCHMARK ' + JSON.stringify(browserHistoryBenchmark));

  // Reale Browser-Runtime: grosses Mesh im Projektformat serialisieren und wiederherstellen.
  // Die Laufzeit wird protokolliert, aber nicht mit maschinenabhängigen Grenzwerten bewertet.
  const browserGeometryRoundtrip = await page.evaluate(() => {
    const vertexCount = 24999;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      const radius = 10 + (i % 97) * 0.01;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (i % 251) * 0.02;
      normals[i * 3] = Math.cos(angle);
      normals[i * 3 + 1] = Math.sin(angle);
      uvs[i * 2] = i / vertexCount;
      uvs[i * 2 + 1] = (i % 127) / 126;
      indices[i] = i;
    }
    const source = new THREE.BufferGeometry();
    source.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    source.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    source.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    source.setIndex(new THREE.BufferAttribute(indices, 1));
    const start = performance.now();
    const serialized = window.SILMOProjectGeometry.serializeGeometry(source);
    const serializedAt = performance.now();
    const restored = window.SILMOProjectGeometry.restoreGeometry(serialized);
    const restoredAt = performance.now();
    const exact = (actual, expected) => actual.length === expected.length &&
      actual.every((value, index) => value === expected[index]);
    const result = {
      vertexCount: restored.attributes.position.count,
      indexCount: restored.index.count,
      positionsExact: exact(restored.attributes.position.array, positions),
      normalsExact: exact(restored.attributes.normal.array, normals),
      uvsExact: exact(restored.attributes.uv.array, uvs),
      indicesExact: exact(restored.index.array, indices),
      hasFiniteBounds: Boolean(restored.boundingBox && restored.boundingSphere &&
        Number.isFinite(restored.boundingSphere.radius) && restored.boundingSphere.radius > 0),
      serializeMs: Number((serializedAt - start).toFixed(2)),
      restoreMs: Number((restoredAt - serializedAt).toFixed(2))
    };
    source.dispose();
    restored.dispose();
    return result;
  });
  assert.equal(browserGeometryRoundtrip.vertexCount, 24999, 'Browser-Roundtrip verliert Mesh-Vertices');
  assert.equal(browserGeometryRoundtrip.indexCount, 24999, 'Browser-Roundtrip verliert Mesh-Indizes');
  assert.equal(browserGeometryRoundtrip.positionsExact, true, 'Browser-Roundtrip verändert Positionen');
  assert.equal(browserGeometryRoundtrip.normalsExact, true, 'Browser-Roundtrip verändert Normalen');
  assert.equal(browserGeometryRoundtrip.uvsExact, true, 'Browser-Roundtrip verändert UV-Koordinaten');
  assert.equal(browserGeometryRoundtrip.indicesExact, true, 'Browser-Roundtrip verändert Indizes');
  assert.equal(browserGeometryRoundtrip.hasFiniteBounds, true, 'Browser-Roundtrip erzeugt ungültige Begrenzungen');
  console.log('SILMO browser geometry roundtrip:', JSON.stringify(browserGeometryRoundtrip));

  assert.match(await page.locator('#tutorialQuickGuide').evaluate(el => el.textContent), /2D-Linie/, 'Visuelle Übersicht zeigt keine 2D-Linie');
  assert.match(await page.locator('#tutorialQuickGuide').evaluate(el => el.textContent), /2D-Kurve/, 'Visuelle Übersicht zeigt keine 2D-Kurve');
  assert.match(await page.locator('#tutorialQuickGuide').evaluate(el => el.textContent), /Freiform/, 'Visuelle Übersicht zeigt keine Freiform');
  assert.match(await page.locator('#tutorialQuickGuide').evaluate(el => el.textContent), /Rasterfang/, 'Visuelle Übersicht zeigt keinen Rasterfang');
  await page.waitForTimeout(1500);
  // Image Studio: generisches Motiv mit zwei echten Innenaussparungen.
  // Prüft, dass kleine Details nicht durch die Mindestfläche abgeschnitten werden.
  const motifContours=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=240;c.height=180;
    const x=c.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,240,180);
    x.fillStyle='#e34b27';x.beginPath();x.ellipse(120,90,76,62,0,0,Math.PI*2);x.fill();
    x.fillStyle='#111111';x.beginPath();x.arc(92,76,9,0,Math.PI*2);x.fill();
    x.beginPath();x.arc(148,76,9,0,Math.PI*2);x.fill();
    return await window.__silmoImageStudioAutoTraceAllTest(c.toDataURL('image/png'));
  });
  assert.ok(motifContours.length>=3,'Image Studio erkennt nicht Aussenkontur und beide kleinen Innenformen');
  const sortedMotifAreas=motifContours.map(points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2)).sort((a,b)=>b-a);
  assert.ok(sortedMotifAreas.length>=3&&sortedMotifAreas[0]>sortedMotifAreas[1]*3,'Aussenkontur und Innenformen werden nicht als getrennte Grössen erkannt');

  // Komplexe Geist-Silhouette mit mehreren Einbuchtungen, Kurven und Details.
  const ghostContours=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=320;c.height=260;
    const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,320,260);g.addColorStop(0,'#45546a');g.addColorStop(1,'#75849a');
    x.fillStyle=g;x.fillRect(0,0,320,260);
    x.fillStyle='#f0f2f5';x.beginPath();
    x.moveTo(160,28);x.bezierCurveTo(205,28,236,66,236,112);
    x.bezierCurveTo(236,144,252,166,278,180);
    x.lineTo(258,207);x.lineTo(232,190);x.lineTo(210,222);
    x.lineTo(184,197);x.lineTo(160,232);x.lineTo(136,197);
    x.lineTo(110,222);x.lineTo(88,190);x.lineTo(62,207);
    x.lineTo(42,180);x.bezierCurveTo(68,166,84,144,84,112);
    x.bezierCurveTo(84,66,115,28,160,28);x.closePath();x.fill();
    x.fillStyle='#080b12';x.beginPath();x.ellipse(137,112,5,10,0,0,Math.PI*2);x.fill();
    x.beginPath();x.ellipse(184,112,5,10,0,0,Math.PI*2);x.fill();
    x.beginPath();x.ellipse(160,157,13,19,0,0,Math.PI*2);x.fill();
    return await window.__silmoImageStudioAutoTraceAllTest(c.toDataURL('image/png'));
  });
  assert.ok(ghostContours.length>=4,'Komplexes Geistmotiv verliert Aussenkontur oder mehrere Innenbereiche');
  const ghostAreas=ghostContours.map(points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2)).sort((a,b)=>b-a);
  assert.ok(ghostAreas[0]>ghostAreas[1]*2,'Geist-Aussenkontur wird nicht klar von Details getrennt');

  // Schwach kontrastierter Geist auf hellem, leicht verlaufendem Hintergrund.
  // Prüft die adaptive Farbabstandsschwelle statt eines festen RGB-Minimums.
  const paleGhostContours=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=320;c.height=260;
    const x=c.getContext('2d');
    const bg=x.createLinearGradient(0,0,320,260);bg.addColorStop(0,'#dedede');bg.addColorStop(1,'#c9c9c9');
    x.fillStyle=bg;x.fillRect(0,0,320,260);
    x.fillStyle='rgba(90,90,90,0.12)';x.beginPath();x.ellipse(160,248,92,7,0,0,Math.PI*2);x.fill();
    x.fillStyle='#eeeeee';x.beginPath();
    x.moveTo(160,34);x.bezierCurveTo(205,34,238,70,238,116);
    x.bezierCurveTo(238,148,254,166,278,184);
    x.lineTo(258,211);x.lineTo(232,194);x.lineTo(210,226);
    x.lineTo(184,201);x.lineTo(160,235);x.lineTo(136,201);
    x.lineTo(110,226);x.lineTo(88,194);x.lineTo(62,211);
    x.lineTo(42,184);x.bezierCurveTo(66,166,82,148,82,116);
    x.bezierCurveTo(82,70,115,34,160,34);x.closePath();x.fill();
    x.fillStyle='#555555';x.beginPath();x.ellipse(137,116,5,10,0,0,Math.PI*2);x.fill();
    x.beginPath();x.ellipse(184,116,5,10,0,0,Math.PI*2);x.fill();
    x.beginPath();x.ellipse(160,160,12,18,0,0,Math.PI*2);x.fill();
    return await window.__silmoImageStudioAutoTraceAllTest(c.toDataURL('image/png'));
  });
  assert.ok(paleGhostContours.length>=4,'Schwach kontrastierter Geist auf hellem Hintergrund: '+paleGhostContours.length+' Konturen erkannt, Flächen='+JSON.stringify(paleGhostContours.map(points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2)).sort((a,b)=>b-a)));
  const paleGhostAreas=paleGhostContours.map(points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2)).sort((a,b)=>b-a);
  assert.ok(paleGhostAreas[0]>paleGhostAreas[1]*2,'Aussenkontur des hellen Geistes wird nicht von den Details getrennt');

  // v87: hohe Empfindlichkeit muss die gleiche schwierige Form verarbeiten,
  // ohne dass die adaptive Erkennung bei Extremwerten abstürzt.
  const highSensitivityGhost=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=320;c.height=260;
    const x=c.getContext('2d');const bg=x.createLinearGradient(0,0,320,260);
    bg.addColorStop(0,'#dedede');bg.addColorStop(1,'#c9c9c9');x.fillStyle=bg;x.fillRect(0,0,320,260);
    x.fillStyle='#eeeeee';x.beginPath();x.moveTo(160,34);x.bezierCurveTo(205,34,238,70,238,116);
    x.bezierCurveTo(238,148,254,166,278,184);x.lineTo(258,211);x.lineTo(232,194);
    x.lineTo(210,226);x.lineTo(184,201);x.lineTo(160,235);x.lineTo(136,201);
    x.lineTo(110,226);x.lineTo(88,194);x.lineTo(62,211);x.lineTo(42,184);
    x.bezierCurveTo(66,166,82,148,82,116);x.bezierCurveTo(82,70,115,34,160,34);x.closePath();x.fill();
    x.fillStyle='#555555';x.beginPath();x.ellipse(137,116,5,10,0,0,Math.PI*2);x.fill();
    x.beginPath();x.ellipse(184,116,5,10,0,0,Math.PI*2);x.fill();
    x.beginPath();x.ellipse(160,160,12,18,0,0,Math.PI*2);x.fill();
    return await window.__silmoImageStudioAutoTraceAllTest(c.toDataURL('image/png'),100);
  });
  assert.ok(highSensitivityGhost.length>=4,'v87: hohe Empfindlichkeit verliert die blassen Geistdetails');

  // v87: Transparenz wird anhand des gesamten Bildrandes erkannt, nicht nur
  // anhand der beiden oberen Eckpixel.
  const asymmetricTransparent=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=160;c.height=120;const x=c.getContext('2d');
    x.clearRect(0,0,160,120);x.fillStyle='#e34b27';x.beginPath();x.ellipse(80,60,35,28,0,0,Math.PI*2);x.fill();
    x.fillStyle='#111111';x.fillRect(0,0,2,2);x.fillRect(158,0,2,2);
    return await window.__silmoImageStudioAutoTraceAllTest(c.toDataURL('image/png'));
  });
  assert.ok(asymmetricTransparent.length>=1,'v87: transparenter Hintergrund mit einzelnen opaken Randpixeln wird nicht erkannt');
  const transparentLargest=asymmetricTransparent.map(points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2)).sort((a,b)=>b-a);
  assert.ok(transparentLargest[0]>2500,'v87: Hauptmotiv auf transparentem Hintergrund wird nicht als grösste Kontur erkannt');

  const printGeometryChecks=await page.evaluate(()=>{
    const outer=[[0,0],[40,0],[40,30],[0,30]];
    const safeHole=[[10,10],[15,10],[15,15],[10,15]];
    const edgeHole=[[0.2,10],[4,10],[4,14],[0.2,14]];
    const overlapHole=[[14,10],[19,10],[19,15],[14,15]];
    const exactWallHole=[[0.8,10],[4.8,10],[4.8,14],[0.8,14]];
    const underWallHole=[[0.799,10],[4.799,10],[4.799,14],[0.799,14]];
    const exactAreaHole=[[10,10],[10.1,10],[10.1,10.1],[10,10.1]];
    const underAreaHole=[[10,10],[10.099,10],[10.099,10.099],[10,10.099]];
    const valid=window.__silmoImageStudioValidateForPrintTest(outer,[safeHole]);
    const edge=window.__silmoImageStudioValidateForPrintTest(outer,[edgeHole]);
    const overlap=window.__silmoImageStudioValidateForPrintTest(outer,[safeHole,overlapHole]);
    const exactWall=window.__silmoImageStudioValidateForPrintTest(outer,[exactWallHole]);
    const underWall=window.__silmoImageStudioValidateForPrintTest(outer,[underWallHole]);
    const exactArea=window.__silmoImageStudioValidateForPrintTest(outer,[exactAreaHole]);
    const underArea=window.__silmoImageStudioValidateForPrintTest(outer,[underAreaHole]);
    const crossed=window.__silmoImageStudioValidateForPrintTest([[0,0],[40,30],[0,30],[40,0]],[safeHole]);
    return {valid:valid.holes.length,edge:edge.holes.length,overlap:overlap.holes.length,
      exactWall:exactWall.holes.length,underWall:underWall.holes.length,
      exactArea:exactArea.holes.length,underArea:underArea.holes.length,crossed:crossed.ok};
  });
  assert.equal(printGeometryChecks.valid,1,'Eine ausreichend grosse und korrekt platzierte Aussparung wird nicht übernommen');
  assert.equal(printGeometryChecks.edge,0,'Eine zu nahe an der Aussenkante liegende Aussparung wird nicht ausgeschlossen');
  assert.equal(printGeometryChecks.overlap,1,'Überlappende Innenlöcher werden nicht zuverlässig gefiltert');
  assert.equal(printGeometryChecks.exactWall,1,'Eine Aussparung mit exakt 0,8 mm Mindestwand wird fälschlich abgewiesen');
  assert.equal(printGeometryChecks.underWall,0,'Eine Aussparung mit weniger als 0,8 mm Mindestwand wird fälschlich akzeptiert');
  assert.equal(printGeometryChecks.exactArea,1,'Eine Kontur mit exakt 0,01 mm² Mindestfläche wird fälschlich abgewiesen');
  assert.equal(printGeometryChecks.underArea,0,'Eine Kontur unter 0,01 mm² wird fälschlich akzeptiert');
  assert.equal(printGeometryChecks.crossed,false,'Eine selbstschneidende Aussenkontur wird nicht zurückgewiesen');



  // Eigenständige Prüfung der ungefähren Herz-Erkennung und des Kursabschlusses.
  const examPage=await browser.newPage({viewport:{width:1440,height:1000}});
  await examPage.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded'});
  await examPage.waitForFunction(()=>typeof window.__silmoTestRecognizeHeart==='function'&&typeof window.__silmoTutorialEnterExamForTest==='function',null,{timeout:20000});
  const roughHeart=[[0,0.18],[0.13,0.04],[0.30,0],[0.43,0.06],[0.50,0.20],[0.57,0.06],[0.70,0],[0.87,0.04],[1,0.18],[0.97,0.39],[0.82,0.63],[0.50,1],[0.18,0.63],[0.03,0.39]];
  const heartScore=await examPage.evaluate(points=>window.__silmoTestRecognizeHeart(points),roughHeart);
  assert.equal(heartScore.recognized,true,'Eine grob gezeichnete Herzform wird nicht erkannt');
  const rectangleScore=await examPage.evaluate(()=>window.__silmoTestRecognizeHeart([[0,0],[0.33,0],[0.66,0],[1,0],[1,0.33],[1,0.66],[1,1],[0.66,1],[0.33,1],[0,1],[0,0.66],[0,0.33]]));
  assert.equal(rectangleScore.recognized,false,'Ein Rechteck wird fälschlich als Herz erkannt');
  const noisyHeart=[];
  for(let i=0;i<roughHeart.length;i++){
    const a=roughHeart[i],b=roughHeart[(i+1)%roughHeart.length];
    for(let step=0;step<4;step++){
      const t=step/4,n=noisyHeart.length;
      noisyHeart.push([a[0]*(1-t)+b[0]*t+0.012*Math.sin(n*1.7),a[1]*(1-t)+b[1]*t+0.012*Math.cos(n*1.3)]);
    }
  }
  const noisyHeartScore=await examPage.evaluate(points=>window.__silmoTestRecognizeHeart(points),noisyHeart);
  assert.equal(noisyHeartScore.recognized,true,'Eine unregelmässig gezeichnete Herzform wird nicht erkannt');
  const invertedHeart=await examPage.evaluate(points=>window.__silmoTestRecognizeHeart(points.map(([x,y])=>[x,1-y])),roughHeart);
  assert.equal(invertedHeart.recognized,true,'Ein auf dem Kopf gezeichnetes Herz wird nicht erkannt');
  const xzHeart=await examPage.evaluate(points=>window.__silmoTestRecognizeHeart(points.map(([x,y])=>[x,0,y])),roughHeart);
  assert.equal(xzHeart.recognized,true,'Ein Herz auf der XZ-Zeichenebene wird nicht erkannt');
  const yzHeart=await examPage.evaluate(points=>window.__silmoTestRecognizeHeart(points.map(([x,y])=>[0,x,y])),roughHeart);
  assert.equal(yzHeart.recognized,true,'Ein Herz auf der YZ-Zeichenebene wird nicht erkannt');
  await examPage.evaluate(points=>window.__silmoTestCreateHeartSketch(points),roughHeart);
  const createdHeart=await examPage.evaluate(()=>window.__silmoHeartRecognitionSnapshot());
  assert.equal(createdHeart.recognized,true,'Herzform wird nach der Umwandlung in einen 3D-Körper nicht mehr erkannt');
  // The native OCCT extrusion completes asynchronously. Wait for its final status
  // before starting the independent STL export, otherwise the late kernel result
  // can overwrite the export status and make this test timing-dependent.
  await examPage.waitForFunction(() => {
    const text = document.querySelector('#status')?.textContent || '';
    return /Skizzenkörper als exakter OCCT-B-Rep erstellt|OCCT-Extrusion nicht verfügbar/.test(text);
  }, null, { timeout: 20000 });
  await examPage.evaluate(()=>window.__silmoTutorialEnterExamForTest());
  await examPage.locator('[data-tab="project"]').click();
  await examPage.locator('#pane-project-left > .inner-tab-nav button').nth(2).click();
  const examExport=examPage.waitForEvent('download');
  await examPage.locator('#exportModel').click();
  await examExport;
  await examPage.waitForFunction(() => Number(window.__silmoExportRevision) > 0 && /STL exportiert/.test(document.querySelector('#status')?.textContent || ''), null, { timeout: 5000 });
  assert.match(await examPage.locator('#status').innerText(),/STL exportiert/,'STL-Export wurde nicht erfolgreich abgeschlossen');
  await examPage.locator('#tutorialRecognizeHeart').click();
  assert.match(await examPage.locator('#tutorialHeartRecognition').innerText(),/Herzform ungefähr erkannt/,'Erkennungsergebnis wird nicht angezeigt');
  await examPage.locator('#tutorialNext').click();
  const examChecksText=await examPage.locator('#tutorialExamChecks').innerText();
  assert.match(await examPage.locator('#tutorialNext').innerText(),/Kurs beenden/,'Bestandener Abschlusstest zeigt keinen Kurs-beenden-Knopf. Prüfungen: '+examChecksText);
  await examPage.locator('#tutorialNext').click();
  assert.equal(await examPage.locator('#tutorialCard').isVisible(),false,'Kurs-beenden-Knopf schliesst den Kurs nicht');
  assert.equal(await examPage.evaluate(() => localStorage.getItem('silmoCourseCompleted')), 'true', 'Kursabschluss wurde nicht dauerhaft gespeichert');
  assert.equal(await examPage.locator('#tutorialLaunch').innerText(),'Lernkurs erneut starten','Kursstart zeigt den Abschluss nicht an');
  await examPage.close();

  // Prüftool: Strg+Leertaste öffnet es und startet automatisch die vollständige Codeprüfung.
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {
    key: ' ', code: 'Space', ctrlKey: true, bubbles: true, cancelable: true
  })));
  assert.equal(await page.locator('#silmoDiagPanel').isVisible(), true, 'Strg+Leertaste öffnet das Prüftool nicht');
  await page.waitForFunction(() => /ERGEBNIS/.test(document.querySelector('#silmoDiagLog')?.innerText || ''), null, { timeout: 15000 });
  const auditLog = await page.locator('#silmoDiagLog').innerText();
  assert.match(auditLog, /CODEPRÜFUNG|ERGEBNIS/, 'Vollständige Codeprüfung wurde nicht ausgeführt');
  assert.match(auditLog, /Bestanden:/, 'Codeprüfung meldet unerwartete Fehler');
  await page.evaluate(() => window.SILMO_DIAG.close());

  // Mac: Cmd+Leertaste.
  const macPage = await browser.newPage();
  await macPage.addInitScript(() => Object.defineProperty(navigator, 'platform', { configurable: true, get: () => 'MacIntel' }));
  await macPage.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await macPage.waitForSelector('#silmoDiagToggle', { timeout: 20000 });
  await macPage.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {
    key: ' ', code: 'Space', metaKey: true, bubbles: true, cancelable: true
  })));
  assert.equal(await macPage.locator('#silmoDiagPanel').isVisible(), true, 'Cmd+Leertaste öffnet das Prüftool auf dem Mac nicht');
  await macPage.close();

  // iPad mit externer Tastatur: Option+Leertaste.
  const ipadPage = await browser.newPage({ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, hasTouch: true });
  await ipadPage.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', { configurable: true, get: () => 'MacIntel' });
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
  });
  await ipadPage.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await ipadPage.waitForSelector('#silmoDiagToggle', { timeout: 20000 });
  await ipadPage.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {
    key: ' ', code: 'Space', altKey: true, bubbles: true, cancelable: true
  })));
  assert.equal(await ipadPage.locator('#silmoDiagPanel').isVisible(), true, 'Option+Leertaste öffnet das Prüftool auf dem iPad nicht');
  await ipadPage.evaluate(() => window.SILMO_DIAG.close());
  await ipadPage.locator('#tutorialLaunch').click();
  const ipadTutorialBox = await ipadPage.locator('#tutorialCard').boundingBox();
  const ipadPropertiesBox = await ipadPage.locator('[aria-label="Eigenschaften des ausgewählten Modells"]').boundingBox();
  assert.ok(ipadTutorialBox && ipadTutorialBox.width >= 380, 'Tutorial ist auf dem iPad nicht breit genug lesbar');
  assert.ok(ipadTutorialBox && ipadTutorialBox.x >= 170 && ipadTutorialBox.x + ipadTutorialBox.width < 590, 'Tutorial überdeckt auf dem iPad die Eigenschaften');
  assert.ok(ipadTutorialBox && ipadTutorialBox.y >= 0 && ipadTutorialBox.y + ipadTutorialBox.height <= 1180, 'Tutorial liegt ausserhalb des iPad-Bildschirms');
  assert.ok(ipadPropertiesBox, 'Eigenschaftenpanel fehlt auf dem iPad');
  assert.ok(await ipadPage.locator('#tutorialInstructionList li').count() >= 2, 'Schritt-für-Schritt-Anleitung fehlt auf dem iPad');
  assert.ok(Number(await ipadPage.locator('#tutorialInstructionList li').first().evaluate(el => getComputedStyle(el).fontSize.replace('px',''))) >= 14, 'Anleitungsschrift ist auf dem iPad zu klein');
  assert.equal(await ipadPage.locator('#tutorialKeyboardGuide').isVisible(), false, 'Tastenkombinations-Referenz soll im Tutorial eingeklappt bleiben');
  assert.equal(await ipadPage.locator('#tutorialCard > #tutorialKeyboardGuide').count(),1,'Fünf Tastenkombinationen fehlen im Tutorial');
  assert.match(await ipadPage.locator('#tutorialTitle').innerText(),/Objekte kopieren/,'Erste iPad-Lernaufgabe ist nicht Strg+C');
  assert.equal(await ipadPage.locator('#tutorialKeyboardGuide .tutorial-key-combo').count(), 5, 'Es sollen genau fünf Tastenkombinationen erklärt werden');
  await ipadPage.locator('#tutorialCard').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const ipadLastButtonBox = await ipadPage.locator('#tutorialSkip').boundingBox();
  assert.ok(ipadLastButtonBox && ipadLastButtonBox.y + ipadLastButtonBox.height <= 1180, 'Untere Tutorial-Schaltflächen sind auf dem iPad nicht erreichbar');
  await ipadPage.close();

  const canvasSize = await page.locator('#viewport canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
  // Tutorial-Prüfung: Buildkennung und tatsächliche Objektanzahl kontrollieren.
  await page.locator('#tutorialLaunch').click();
  // Das Lernfenster kann aus dem Bereich des 3D-Modells gezogen werden.
  const dragHandle = page.locator('#tutorialDragHandle');
  const dragStartBox = await page.locator('#tutorialCard').boundingBox();
  const handleBox = await dragHandle.boundingBox();
  assert.ok(dragStartBox && handleBox, 'Verschiebegriff des Lernfensters fehlt');
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(1300, 48, { steps: 8 });
  await page.mouse.up();
  const dragEndBox = await page.locator('#tutorialCard').boundingBox();
  assert.ok(dragEndBox && dragEndBox.x > dragStartBox.x + 100, 'Lernfenster lässt sich nicht aus dem Drehbereich verschieben');
  assert.ok(dragEndBox.y >= 0 && dragEndBox.y + dragEndBox.height <= 1000, 'Verschobenes Lernfenster bleibt nicht vollständig sichtbar');
  await page.locator('#tutorialCard').evaluate(el => { el.style.left=''; el.style.top=''; el.style.right=''; el.style.transform=''; });
  assert.equal(await page.locator('#tutorialExamPanel').isVisible(), false, 'Abschlusstest darf nicht bereits in der Lernphase sichtbar sein');
  assert.equal(await page.locator('#tutorialNext').isDisabled(), true, 'Weiter muss bis zur erkannten Aufgabe gesperrt bleiben');
  assert.equal(await page.evaluate(()=>window.__silmoTutorialShowStepForTest(17)),true,'Freiform-Aufgabe kann für die gezielte Browserprüfung nicht geöffnet werden');
  assert.equal(await page.locator('#tutorialInstructionList li').count(),9,'Freiform-Aufgabe enthält nicht alle neun einzelnen Handlungsschritte');
  assert.match(await page.locator('#tutorialInstructionList').innerText(),/linke Maustaste.*Finger.*Apple Pencil/s,'Aufgabe 13 erklärt die Bedienung auf Computer und iPad nicht');
  assert.match(await page.locator('#tutorialInstructionList').innerText(),/schliesst die Umrandung automatisch/i,'Aufgabe 13 erklärt das automatische Schliessen nicht');
  assert.match(await page.locator('#tutorialInstructionList').innerText(),/Skizze als 3D-Körper erstellen/,'Aufgabe 13 erklärt nicht, wie die Freiform zu einem 3D-Körper wird');
  assert.equal(await page.evaluate(()=>window.__silmoTutorialShowStepForTest(22)),true,'Aufgabe 23 Loft/Sweep lässt sich nicht gezielt öffnen');
  assert.match(await page.locator('#tutorialStepLabel').innerText(),/AUFGABE 23 VON 26/,'Loft/Sweep ist nicht Aufgabe 23');
  assert.equal(await page.locator('#tutorialInstructionList li').count(),10,'Aufgabe 23 hat keine zehn konkreten Handlungsschritte');
  assert.match(await page.locator('#tutorialInstructionList').innerText(),/genau zwei geschlossene Skizzenprofile/,'Loft erklärt die zwei benötigten Profile nicht');
  assert.match(await page.locator('#tutorialInstructionList').innerText(),/zuerst das Profil und danach den Pfad/,'Sweep erklärt die Auswahlreihenfolge nicht');
  assert.ok((await page.locator('#tutorialInstructionList').innerText()).includes('⇧ Shift + →'),'Aufgabe 23 erklärt die Tastenkombination zum Überspringen nicht');
  assert.equal(await page.locator('#tutorialSkipStep').isVisible(),true,'Schaltfläche zum Überspringen der aktuellen Aufgabe fehlt');
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',shiftKey:true,bubbles:true,cancelable:true})));
  assert.match(await page.locator('#tutorialStepLabel').innerText(),/AUFGABE 24 VON 26/,'Shift+Pfeil rechts überspringt Aufgabe 23 nicht');
  assert.equal(await page.evaluate(()=>window.__silmoTutorialShowStepForTest(22)),true,'Aufgabe 23 kann nach Tastenkürzel nicht erneut geöffnet werden');
  await page.locator('#tutorialSkipStep').click();
  assert.match(await page.locator('#tutorialStepLabel').innerText(),/AUFGABE 24 VON 26/,'Schaltfläche überspringt Aufgabe 23 nicht');
  // Aufgabe 25: Die Anleitung bündelt Bettgrösse und Prüfung im 3D-Druck-Reiter.
  assert.equal(await page.evaluate(()=>window.__silmoTutorialShowStepForTest(24)),true,'Aufgabe 25 kann nicht geöffnet werden');
  assert.match(await page.locator('#tutorialTitle').innerText(),/Druckbett einstellen und prüfen/,'Aufgabe 25 hat den falschen Titel');
  assert.equal(await page.locator('#tutorialInstructionList li').count(),8,'Aufgabe 25 enthält nicht acht konkrete Schritte');
  assert.match(await page.locator('#tutorialInstructionList').innerText(),/3D-Druck/,'Aufgabe 25 nennt den richtigen Reiter für die Druckbettprüfung nicht');

  const bedWidthBefore=Number(await page.locator('#bedWidth').inputValue());
  const bedDepthBefore=Number(await page.locator('#bedDepth').inputValue());
  const targetBedWidth=Math.min(2000,bedWidthBefore+37);
  const targetBedDepth=Math.min(2000,bedDepthBefore+23);
  await page.locator('#bedWidth').fill(String(targetBedWidth));
  await page.locator('#bedDepth').fill(String(targetBedDepth));
  await page.locator('#applyBedSize').click();
  // Die Druckbettprüfung liegt direkt im Druck-Reiter.
  await page.waitForFunction(({w,d})=>{
    const s=window.__silmoBedSnapshot?.();
    return s && s.widthMM===w && s.depthMM===d && s.outlineWidthMM===w && s.outlineDepthMM===d;
  },{w:targetBedWidth,d:targetBedDepth},{timeout:5000});
  const changedBed=await page.evaluate(()=>window.__silmoBedSnapshot());
  assert.equal(changedBed.widthMM,targetBedWidth,'Druckbettbreite wurde intern nicht übernommen');
  assert.equal(changedBed.depthMM,targetBedDepth,'Druckbetttiefe wurde intern nicht übernommen');
  assert.equal(changedBed.outlineWidthMM,targetBedWidth,'Sichtbarer 3D-Rand hat nicht die eingegebene Breite');
  assert.equal(changedBed.outlineDepthMM,targetBedDepth,'Sichtbarer 3D-Rand hat nicht die eingegebene Tiefe');
  await page.locator('#checkBed').click();
  await page.waitForFunction(()=>document.querySelector('#tutorialNext')?.disabled===false,null,{timeout:5000});
  assert.match(await page.locator('#tutorialFeedback').innerText(),/Erfolgskontrolle bestanden/,'Aufgabe 25 erkennt die Druckbettprüfung nicht');
  // Ungültige Masse dürfen die letzte gültige Platte nicht unbemerkt überschreiben.

  await page.locator('#bedWidth').fill('2');
  await page.locator('#checkBed').click();
  assert.match(await page.locator('#status').innerText(),/Druckbett nicht übernommen/,'Ungültige Druckbettgrösse wird nicht klar abgewiesen');
  const afterInvalidBed=await page.evaluate(()=>window.__silmoBedSnapshot());
  assert.equal(afterInvalidBed.widthMM,targetBedWidth,'Ungültige Breite hat den letzten gültigen Druckbettzustand verändert');
  // Testzustand zurücksetzen: nachfolgende Geometrieprüfungen erwarten das Standardbett 200 × 200 mm.

  await page.locator('#bedWidth').fill(String(bedWidthBefore));
  await page.locator('#bedDepth').fill(String(bedDepthBefore));
  await page.locator('#applyBedSize').click();
  // Aufgabe 26: Projekt sichern, STL exportieren und eine STL direkt in die neue Ablage ziehen.
  assert.equal(await page.evaluate(()=>window.__silmoTutorialShowStepForTest(25)),true,'Aufgabe 26 kann nicht geöffnet werden');
  assert.equal(await page.locator('#stlDropZone').count(),1,'STL-Ablagefläche fehlt');
  assert.match(await page.locator('#tutorialInstructionList').innerText(),/Downloads-Ordner/,'Aufgabe 26 erklärt den Import aus Downloads nicht');
  await page.locator('#pane-project-left > .inner-tab-nav button').nth(0).click();
  const saveDownload=page.waitForEvent('download');
  await page.locator('#saveProjectButton').click();
  const savedProjectDownload = await saveDownload;
  const savedProjectPath = await savedProjectDownload.path();
  const savedProject = JSON.parse(readFileSync(savedProjectPath, 'utf8'));
  assert.equal(savedProject.version, 3, 'Gespeicherte Projekte verwenden nicht mehr Formatversion 3');
  const exportDownload=page.waitForEvent('download');
  await page.locator('#pane-project-left > .inner-tab-nav button').nth(2).click();
  await page.locator('#exportModel').click();
  await exportDownload;
  await page.locator('#pane-project-left > .inner-tab-nav button').nth(1).click();
  const modelCountBeforeImport=await page.locator('#objects .object-row').count();
  await page.locator('#stlDropZone').evaluate(zone=>{
    // STL-Dateien werden im Import-Unterreiter abgelegt.
    const stl='solid test\\nfacet normal 0 0 1\\nouter loop\\nvertex 0 0 0\\nvertex 10 0 0\\nvertex 0 10 0\\nendloop\\nendfacet\\nendsolid test';
    const transfer=new DataTransfer();
    transfer.items.add(new File([stl],'test-import.stl',{type:'model/stl'}));
    zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  await page.waitForFunction(()=>Number(window.__silmoImportRevision||0)>0,null,{timeout:5000});
  assert.equal(await page.locator('#objects .object-row').count(),modelCountBeforeImport+1,'STL-Drop importiert kein zusätzliches Modell oder hat bestehende Modelle ersetzt');
  const modelCountBeforeDegenerateImport=await page.locator('#objects .object-row').count();
  await page.locator('#stlDropZone').evaluate(zone=>{
    const stl='solid degenerate\\nfacet normal 0 0 1\\nouter loop\\nvertex 0 0 0\\nvertex 10 0 0\\nvertex 20 0 0\\nendloop\\nendfacet\\nendsolid degenerate';
    const transfer=new DataTransfer();
    transfer.items.add(new File([stl],'degenerate.stl',{type:'model/stl'}));
    zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  await page.waitForFunction(()=>/entartetes Dreieck/.test(document.querySelector('#status')?.textContent||''),null,{timeout:5000});
  assert.equal(await page.locator('#objects .object-row').count(),modelCountBeforeDegenerateImport,'STL mit Nullflächen-Dreieck wurde importiert');
  // Binäre STL-Dateien mit NaN-Koordinaten müssen vor dem Modellaufbau abgewiesen werden.
  const modelCountBeforeNonFiniteImport=await page.locator('#objects .object-row').count();
  await page.locator('#stlDropZone').evaluate(zone=>{
    const buffer=new ArrayBuffer(134);
    const view=new DataView(buffer);
    view.setUint32(80,1,true);
    const values=[0,0,1, 0,0,0, 10,0,0, 0,10,0];
    values.forEach((value,index)=>view.setFloat32(84+index*4,value,true));
    view.setFloat32(84+4*4,NaN,true);
    const transfer=new DataTransfer();
    transfer.items.add(new File([buffer],'non-finite-test.stl',{type:'model/stl'}));
    zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  await page.waitForFunction(()=>/vollständigen, gültigen Dreiecke/.test(document.querySelector('#status')?.textContent||''),null,{timeout:5000});
  assert.equal(await page.locator('#objects .object-row').count(),modelCountBeforeNonFiniteImport,'STL mit nicht endlichen Koordinaten hat den Modellbestand verändert');
  const modelCountBeforeInvalidImport=await page.locator('#objects .object-row').count();
  await page.locator('#stlDropZone').evaluate(zone=>{
    const transfer=new DataTransfer();
    transfer.items.add(new File(['kein gültiges STL-Mesh'],'broken.stl',{type:'model/stl'}));
    zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  await page.waitForFunction(()=>/STL-Datei konnte nicht gelesen werden/.test(document.querySelector('#status')?.textContent||''),null,{timeout:5000});
  assert.equal(await page.locator('#objects .object-row').count(),modelCountBeforeInvalidImport,'Ungültiger STL-Import hat den bestehenden Modellbestand verändert');
  // Ein vom Download-Button gezogener Web-Link liefert oft keinen File-Eintrag, sondern text/uri-list.
  // Simuliere eine vom Browser erlaubte CORS-Antwort und prüfe, dass SILMO den Link direkt lädt.
  await page.route('https://example.com/test-from-web.stl',route=>route.fulfill({status:200,contentType:'model/stl',body:'solid web\\nfacet normal 0 0 1\\nouter loop\\nvertex 0 0 0\\nvertex 12 0 0\\nvertex 0 12 0\\nendloop\\nendfacet\\nendsolid web'}));
  await page.locator('#stlDropZone').evaluate(zone=>{
    const transfer=new DataTransfer();
    transfer.setData('text/uri-list','https://example.com/test-from-web.stl');
    zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  await page.waitForFunction(()=>Number(window.__silmoImportRevision||0)>1,null,{timeout:5000});
  assert.equal(await page.locator('#objects .object-row').count(),modelCountBeforeImport+2,'STL-Weblink wurde nicht als zusätzliches Modell importiert');
  // Binäres STL mit einem gültigen Dreieck muss ebenso importierbar sein.
  const modelCountBeforeBinaryImport=await page.locator('#objects .object-row').count();
  await page.locator('#stlDropZone').evaluate(zone=>{
    const buffer=new ArrayBuffer(134);
    const view=new DataView(buffer);
    const header=new TextEncoder().encode('SILMO binary STL fixture');
    new Uint8Array(buffer,0,header.length).set(header);
    view.setUint32(80,1,true);
    const values=[0,0,1, 0,0,0, 10,0,0, 0,10,0];
    values.forEach((value,index)=>view.setFloat32(84+index*4,value,true));
    view.setUint16(132,0,true);
    const transfer=new DataTransfer();
    transfer.items.add(new File([buffer],'binary-test.stl',{type:'model/stl'}));
    zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  await page.waitForFunction(()=>Number(window.__silmoImportRevision||0)>2,null,{timeout:5000});
  assert.equal(await page.locator('#objects .object-row').count(),modelCountBeforeBinaryImport+1,'Gültige binäre STL-Datei wurde nicht importiert');
  const cubeFixture = readFileSync(new URL('./fixtures/stl/cube-10mm.stl', import.meta.url), 'utf8');
  await page.locator('#stlDropZone').evaluate((zone,stl)=>{
    const transfer=new DataTransfer();
    transfer.items.add(new File([stl],'cube-10mm.stl',{type:'model/stl'}));
    zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  },cubeFixture);
  await page.waitForFunction(()=>Number(window.__silmoImportRevision||0)>3&&/Topologie: geschlossenes Dreiecksnetz/.test(document.querySelector('#status')?.textContent||''),null,{timeout:5000});
  assert.equal(await page.locator('#objects .object-row').count(),modelCountBeforeBinaryImport+2,'Reale ASCII-STL-Würfelreferenz wurde nicht importiert');
  const openFixture = readFileSync(new URL('./fixtures/stl/open-triangle.stl', import.meta.url), 'utf8');
  await page.locator('#stlDropZone').evaluate((zone,stl)=>{
    const transfer=new DataTransfer();
    transfer.items.add(new File([stl],'open-triangle.stl',{type:'model/stl'}));
    zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  },openFixture);
  await page.waitForFunction(()=>Number(window.__silmoImportRevision||0)>4&&/3 offene Kanten/.test(document.querySelector('#status')?.textContent||''),null,{timeout:5000});
  assert.equal(await page.locator('#objects .object-row').count(),modelCountBeforeBinaryImport+3,'Offene STL-Referenz wurde nicht importiert oder ihre Topologiewarnung fehlt');
  await page.waitForFunction(()=>document.querySelector('#tutorialNext')?.disabled===false,null,{timeout:5000});
  assert.match(await page.locator('#tutorialFeedback').innerText(),/Erfolgskontrolle bestanden/,'Aufgabe 26 erkennt Speichern, Export und STL-Import nicht');
  assert.equal(await page.evaluate(()=>window.__silmoTutorialShowStepForTest(0)),true,'Tutorial kann nach dem Aufgabe-13-Test nicht zur ersten Aufgabe zurückkehren');
  assert.match(await page.locator('#tutorialWhere').innerText(), /WO FINDEST DU ES/, 'Lernphase erklärt nicht, wo das Werkzeug liegt');
  const tutorialDebug = await page.locator('#tutorialDebug').textContent();
  const currentBuild = await page.locator('meta[name="silmo-build"]').getAttribute('content');
  assert.ok(currentBuild, 'Build-Metadaten fehlen');
  assert.ok(tutorialDebug.includes(`Build: ${currentBuild}`), 'Tutorial-Diagnose zeigt nicht den aktuellen Build');
  assert.equal(await page.locator('#tutorialBuild').innerText(), currentBuild, 'Tutorial-Kopfzeile zeigt nicht den aktuellen Build');
  assert.equal(await page.locator('#tutorialQuickGuide').count(), 1, 'Schnellhilfe fehlt im Tutorial');
  const quickGuide = await page.locator('#tutorialQuickGuide').textContent();
  assert.match(quickGuide, /Alle Werkzeuge/, 'Visuelle Werkzeugübersicht fehlt');
  assert.ok(await page.locator('#tutorialToolGallery .tutorial-tool-card').count() >= 25, 'Tutorial zeigt nicht alle Werkzeugkarten');
  assert.ok(await page.locator('#tutorialVisualGlyph').isVisible(), 'Bildliche Schritt-Darstellung fehlt');
  assert.match(await page.locator('#tutorialToolGallery').textContent(), /2D-Linie.*2D-Kurve.*Freiform/s, 'Neue Zeichenwerkzeuge fehlen in der visuellen Übersicht');
  const tutorialBox = await page.locator('#tutorialCard').boundingBox();
  const propertiesBox = await page.locator('[aria-label="Eigenschaften des ausgewählten Modells"]').boundingBox();
  assert.ok(tutorialBox && tutorialBox.width >= 430, 'Tutorialfenster ist auf dem Desktop zu schmal');
  assert.ok(tutorialBox && propertiesBox && tutorialBox.x + tutorialBox.width < propertiesBox.x, 'Tutorialfenster verdeckt weiterhin den Skalierungsbereich');
  assert.ok(await page.locator('#tutorialInstructionList li').count() >= 2, 'Anleitung ist nicht in einzelne Schritte aufgeteilt');
  assert.ok(Number(await page.locator('#tutorialInstructionList li').first().evaluate(el => getComputedStyle(el).fontSize.replace('px',''))) >= 14, 'Anleitungsschrift ist zu klein');
  assert.ok((await page.title()).includes(currentBuild), 'Seitentitel zeigt nicht den aktuellen Build');
  assert.equal(await page.locator('#tutorialRetry').isVisible(), true, 'Manuelle Wiederholungsprüfung fehlt');
  assert.equal(await page.locator('#tutorialKeyboard').isVisible(), false, 'Separate Tastaturhinweise sollen nicht neben den Lernaufgaben erscheinen');
  const keyboardGuide = page.locator('#tutorialKeyboardGuide');
  assert.equal(await keyboardGuide.isVisible(), false, 'Tastenkombinations-Referenz soll eingeklappt bleiben');
  assert.equal(await page.locator('#tutorialCard > #tutorialKeyboardGuide').count(),1,'Tastenkombinationen stehen nicht im Tutorial');
  assert.equal(await keyboardGuide.evaluate(el=>el.open),false,'Referenzliste soll anfangs geschlossen sein');
  assert.equal(await keyboardGuide.locator('.tutorial-key-combo').count(),5,'Es müssen genau fünf Tastenkombinationen erklärt werden');
  assert.match(await page.locator('#tutorialStepLabel').innerText(),/AUFGABE 1 VON/,'Tutorial startet nicht mit den Tastenkombinationen');
  assert.match(await page.locator('#tutorialTitle').innerText(),/Objekte kopieren/,'Erste Aufgabe ist nicht Strg+C');
  const shortcutCases = [
    {step:0,key:'c',code:'KeyC',ctrlKey:true},
    {step:1,key:'v',code:'KeyV',ctrlKey:true},
    {step:2,key:'a',code:'KeyA',ctrlKey:true},
    {step:3,key:'x',code:'KeyX',ctrlKey:true},
    {step:4,key:'z',code:'KeyZ',ctrlKey:true}
  ];
  for (const combo of shortcutCases) {
    assert.equal(await page.evaluate(step=>window.__silmoTutorialShowStepForTest(step),combo.step),true,'Shortcut-Aufgabe '+combo.step+' ist nicht erreichbar');
    await page.evaluate(combo=>window.dispatchEvent(new KeyboardEvent('keydown',{...combo,bubbles:true,cancelable:true})),combo);
    await page.waitForFunction(() => /Erfolgskontrolle bestanden/.test(document.querySelector('#tutorialFeedback')?.innerText||''),null,{timeout:3000});
    assert.equal(await page.locator('#tutorialNext').isDisabled(),false,'Tastenkombination '+combo.key.toUpperCase()+' wurde nicht erkannt');
  }
  assert.equal(await page.evaluate(()=>window.__silmoTutorialShowStepForTest(5)),true,'Würfel-Aufgabe ist nach den fünf Tastenkombinationen nicht erreichbar');
  assert.match(await page.locator('#tutorialTitle').innerText(),/Grundkörper erstellen/,'Würfel-Aufgabe folgt nicht direkt auf die fünf Tastenkombinationen');
  assert.equal(await page.locator('#tutorialWordHelp').isVisible(),true,'Einfache Begriffserklärungen fehlen bei der Würfel-Aufgabe');
  assert.match(await page.locator('#tutorialTermList').textContent(),/Grundkörper|Objektliste/,'Grundbegriffe der Würfel-Aufgabe werden nicht einfach erklärt');
  assert.equal(await page.locator('#tutorialNext').isDisabled(), true, 'Würfel-Aufgabe darf nicht ohne erstellten Körper freigeschaltet sein');
  assert.equal(await page.locator('#tutorialRetry').isVisible(), true, 'Manuelle Wiederholungsprüfung fehlt');
  assert.equal(await page.locator('#tutorialKeyboard').isVisible(), false, 'Separate Tastaturhinweise sollen in der Lernphase ausgeblendet sein');
  const tutorialStartRows = await page.locator('#objects .object-row').count();
  await page.locator('#addCube').click();
  assert.equal(await page.locator('#objects .object-row').count(), tutorialStartRows + 1, 'Tutorial-Testobjekt wurde nicht erstellt');
  // Hover-Auswahlhilfe ist im Zeichenmodus absichtlich deaktiviert. Der Test
  // beendet einen eventuell aus vorherigen Tests verbliebenen Zeichenmodus,
  // bevor er die Maus-Auswahlhilfe prüft.
  if (!await page.locator('#cancelSketch').isDisabled()) {
    await page.locator('#cancelSketch').click();
  }
  // Das Tutorial erstellt den Würfel und wählt ihn automatisch aus. Für den
  // Hover-Test muss er unselektiert sein, da die Hover-Kontur ausgewählte
  // Objekte absichtlich nicht überlagert. Strg-Klick auf die aktive Zeile
  // hebt die Auswahl über denselben UI-Weg wie ein Benutzer auf.
  const lastObjectButton = page.locator('#objects .object-select').last();
  assert.equal(await lastObjectButton.count(), 1, 'Tutorial-Objekt fehlt in der Objektliste');
  // Der Test läuft hier mit einem offenen Tutorial-Overlay. Die Objektliste
  // kann dadurch visuell verdeckt sein; dispatchEvent löst denselben
  // Button-Handler aus, ohne Playwrights Sichtbarkeitsprüfung zu umgehen.
  await lastObjectButton.evaluate(button => button.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, metaKey: true })
  ));
  const selectionAfterDeselect = await page.evaluate(() => window.__silmoModelingTestSnapshot?.());
  assert.equal(selectionAfterDeselect?.selectedId, null,
    'Testobjekt konnte vor der Hover-Prüfung nicht abgewählt werden');
  // Das Tutorial-Panel verdeckt im Browser-Viewport den zentralen 3D-Bereich.
  // Für den unabhängigen Hover-Test wird es kurz ausgeblendet und danach wiederhergestellt.
  // Das Tutorial selbst wird anschliessend weiterhin mit sichtbarem Panel geprüft.
  const tutorialCard = page.locator('#tutorialCard');
  const tutorialVisibility = await tutorialCard.evaluate(element => element.style.visibility);
  await tutorialCard.evaluate(element => { element.style.visibility = 'hidden'; });
  const hoverPoint = await page.evaluate(() => window.__silmoHoverTestPoint?.());
  assert.ok(hoverPoint, 'Kein nicht ausgewähltes Testobjekt für die Hover-Auswahlhilfe gefunden. Diagnose: ' +
    JSON.stringify(await page.evaluate(() => ({
      model: window.__silmoModelingTestSnapshot?.(),
      canvas: (() => { const r = document.querySelector('canvas')?.getBoundingClientRect(); return r ? {x:r.x,y:r.y,width:r.width,height:r.height} : null; })(),
      tutorial: (() => { const e=document.querySelector('#tutorialCard'); return e ? {display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,rect:(()=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})()} : null; })()
    }))));
  assert.equal(hoverPoint.targetElement, 'CANVAS', 'Hover-Testpunkt liegt nicht auf der 3D-Canvas: ' + JSON.stringify(hoverPoint));
  await page.mouse.move(hoverPoint.x, hoverPoint.y);
  try {
    await page.waitForFunction(() => window.__silmoHoverSnapshot?.().outlineVisible === true, null, { timeout: 3000 });
  } catch (error) {
    const hoverState = await page.evaluate(() => window.__silmoHoverSnapshot?.());
    throw new Error('Hover-Kontur nach Mausbewegung nicht sichtbar. Testpunkt: ' + JSON.stringify(hoverPoint) + '. Diagnose: ' + JSON.stringify(hoverState) + '. Ursache: ' + error.message);
  }
  const hoverState = await page.evaluate(() => window.__silmoHoverSnapshot());
  assert.equal(hoverState.objectId, hoverPoint.objectId,
    'Blaue Hover-Kontur gehört nicht zum Objekt unter dem Mauszeiger');
  assert.ok(Math.abs(hoverState.debug.pointerClient.x - hoverPoint.x) < 1 &&
    Math.abs(hoverState.debug.pointerClient.y - hoverPoint.y) < 1,
    'Die 3D-Canvas hat nicht die berechnete Mausposition erhalten: ' + JSON.stringify({ hoverPoint, pointerClient: hoverState.debug.pointerClient }));
  await page.mouse.move(5, 5);
  await page.waitForFunction(() => window.__silmoHoverSnapshot?.().outlineVisible === false, null, { timeout: 3000 });
  await tutorialCard.evaluate((element, visibility) => { element.style.visibility = visibility; }, tutorialVisibility);
  await page.waitForFunction(() => document.querySelector('#tutorialNext')?.disabled === false, null, { timeout: 5000 });
  assert.match(await page.locator('#tutorialFeedback').innerText(), /Erfolgskontrolle bestanden/, 'Tutorial erkennt das neu erstellte Objekt nicht');
  assert.equal(await page.locator('#tutorialNext').isDisabled(), false, 'Weiter wird nach erkannter Aufgabe nicht freigeschaltet');
  await page.locator('#tutorialNext').click();
  assert.match(await page.locator('#tutorialStepLabel').innerText(), /AUFGABE 7 VON/, 'Tutorial geht nach erfolgreicher Kontrolle nicht zum nächsten Lernschritt');
  assert.equal(await page.locator('#tutorialNext').isDisabled(), true, 'Nächste Aufgabe muss wieder bis zur Erfolgskontrolle gesperrt sein');
  await page.locator('#addSphere').click();
  await page.waitForFunction(() => document.querySelector('#tutorialNext')?.disabled === false, null, { timeout: 5000 });
  await page.locator('#tutorialNext').click();
  assert.match(await page.locator('#tutorialStepLabel').innerText(), /AUFGABE 8 VON/, 'Tutorial kann die zweite CAD-Aufgabe nicht abschliessen');
  await showCreateSubtab(1); // Objektliste (Grundformen = 0, Objektliste = 1; Kombinieren liegt im Expertenzentrum)
  await page.locator('#objects .object-select').last().click();
  await showCreateSubtab(0); // Grundformen und Duplizieren
  await page.locator('#duplicate').click();
  await page.waitForFunction(() => document.querySelector('#tutorialNext')?.disabled === false, null, { timeout: 5000 });
  await page.locator('#tutorialNext').click();
  assert.match(await page.locator('#tutorialStepLabel').innerText(), /AUFGABE 9 VON/, 'Tutorial kann nicht bis zur Transformationsaufgabe navigieren');
  assert.deepEqual(pageErrors, [], 'Beim Wechsel in die Verschiebeaufgabe entstehen Browserfehler');
  await page.locator('#tutorialClose').click();

  assert.ok(canvasSize.width > 0 && canvasSize.height > 0, '3D canvas hat keine gültige Grösse');

  // Zeichenmodus: Rechtsklick-Ziehen darf die Kamera nicht drehen.
  // Mathematische Referenzprüfung der drei grundlegenden CAD-Körper.
  await page.locator('[data-tab="create"]').click();
  await showCreateSubtab(0);
  for (const id of ['addCube', 'addSphere', 'addCylinder']) await page.locator('#' + id).click();
  const basicPrimitiveBounds = (await page.evaluate(() => window.__silmoTutorialModelAudit())).slice(-3);
  const expectedBasicBounds = [
    { label: 'Würfel', size: [15, 15, 15] },
    { label: 'Kugel', size: [16, 16, 16] },
    { label: 'Zylinder', size: [14, 14, 15] }
  ];
  for (let i = 0; i < expectedBasicBounds.length; i++) {
    const actual = basicPrimitiveBounds[i], expected = expectedBasicBounds[i];
    assert.equal(actual.label, expected.label, 'Grundkörper-Reihenfolge oder Typ ist falsch');
    assert.ok(actual.vertexCount > 0, expected.label + ' enthält keine Geometriepunkte');
    for (const key of ['width', 'depth', 'height']) {
      const axis = key === 'width' ? 0 : key === 'depth' ? 1 : 2;
      assert.ok(Number.isFinite(actual[key]), expected.label + ' hat eine nicht endliche Ausdehnung');
      assert.ok(Math.abs(actual[key] - expected.size[axis]) < 1e-4,
        expected.label + ' hat eine falsche geometrische Ausdehnung (' + key +
        '): erwartet ' + expected.size[axis] + ' mm, erhalten ' + actual[key] + ' mm');
    }
  }

  await page.locator('[data-tab="draw"]').click();
  await showDrawRightSubtab(0);
  await page.locator('#sketchTool').selectOption('rectangle');
  await page.locator('#startSketch').click();
  assert.equal((await page.evaluate(() => window.__silmoSketchCameraLockSnapshot())).active, true, 'Zeichenmodus aktiviert die Kamerasperre nicht');
  const cameraBeforeSketch = await page.evaluate(() => window.__silmoSketchCameraLockSnapshot());
  const lockStart = await page.evaluate(() => window.__silmoSketchPointForTest(-0.7, -0.65));
  const lockEnd = await page.evaluate(() => window.__silmoSketchPointForTest(0.7, 0.65));
  await page.mouse.move(lockStart.x, lockStart.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(lockEnd.x, lockEnd.y, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  const cameraAfterSketch = await page.evaluate(() => window.__silmoSketchCameraLockSnapshot());
  assert.ok(Math.abs(cameraAfterSketch.targetRX - cameraBeforeSketch.targetRX) < 1e-10, 'Kamera wurde im Zeichenmodus vertikal gedreht');
  assert.ok(Math.abs(cameraAfterSketch.targetRY - cameraBeforeSketch.targetRY) < 1e-10, 'Kamera wurde im Zeichenmodus horizontal gedreht');
  assert.equal(cameraAfterSketch.rotatingView, false, 'Kameradrehung blieb nach Zeichnen aktiv');
  assert.equal(cameraAfterSketch.active, true, 'Zeichenmodus wurde nach dem ersten Strich unerwartet beendet');
  assert.equal(cameraAfterSketch.rotateButtonDisabled, true, 'Drehschaltfläche ist im Zeichenmodus nicht gesperrt');
  assert.equal(cameraAfterSketch.gizmoMode, 'move', 'Drehringe wurden im Zeichenmodus nicht deaktiviert');
  assert.equal(cameraAfterSketch.rotationInputHidden, true, 'Direkte Winkeleingabe ist im Zeichenmodus noch sichtbar');
  assert.equal(await page.locator('#createSketchSolid').isEnabled(), true, 'Rechtsklick-Zeichnung wurde nicht als Skizze vorbereitet');
  await page.locator('#createSketchSolid').click();

  // Punkt-für-Punkt-Zeichnen: kein gedrückter Mausknopf nötig.
  await page.locator('#startSketch').click();
  await page.locator('#clickContourToggle').click();
  assert.equal(await page.locator('#clickContourToggle').getAttribute('aria-pressed'),'true','Punktmodus lässt sich nicht einschalten');
  assert.equal(await page.locator('#clickContourStraight').isChecked(),true,'Gerade Linien sollten standardmässig aktiviert sein');
  assert.equal(await page.locator('#sketchSmoothEnabled').isChecked(),true,'Freihand-Beruhigung sollte standardmässig aktiviert sein');
  const smoothSketchTest = await page.evaluate(() => window.__silmoTestSimplifySketchPolyline([
    [0,0],[10,0.01],[20,0],[30,0],[30,10],[30,20],[20,20],[10,20],[0,20],[0,10],[0,0]
  ]));
  assert.ok(smoothSketchTest.length < 11,'Freihand-Beruhigung entfernt kleine Zitterschwankungen nicht');
  for (const corner of [[0,0],[30,0],[30,20],[0,20]]) {
    assert.ok(smoothSketchTest.some(point => Math.hypot(point[0]-corner[0],point[1]-corner[1]) < 0.01),
      'Freihand-Beruhigung hat eine echte Rechteckecke entfernt');
  }
  const simplifiedSketch=await page.evaluate(()=>window.__silmoTestSimplifySketchPolyline([[0,0],[0.05,0.01],[0.1,-0.01],[0.15,0.01],[0.2,0],[0.2,0.2],[0,0.2]]));
  assert.ok(simplifiedSketch.length<7,'Kleine Zitterschwankungen werden nicht reduziert');
  assert.ok(simplifiedSketch.some(p=>Math.abs(p[0]-0.2)<1e-6&&Math.abs(p[1])<1e-6),'Echte Ecke am Ende der waagrechten Kante ging verloren');
  assert.ok(simplifiedSketch.some(p=>Math.abs(p[0]-0.2)<1e-6&&Math.abs(p[1]-0.2)<1e-6),'Echte obere Ecke ging verloren');
  const contourA=await page.evaluate(()=>window.__silmoSketchPointForTest(-0.55,-0.45));
  const contourB=await page.evaluate(()=>window.__silmoSketchPointForTest(0.55,-0.45));
  const contourC=await page.evaluate(()=>window.__silmoSketchPointForTest(0,0.55));
  for(const point of [contourA,contourB,contourC]) await page.mouse.click(point.x,point.y);
  assert.equal(await page.locator('#clickContourFinish').isEnabled(),true,'Konturabschluss wird ab drei Punkten nicht aktiviert');
  await page.locator('#clickContourUndo').click();
  assert.equal(await page.locator('#clickContourFinish').isEnabled(),false,'Letzten Punkt entfernen aktualisiert die Mindestpunktzahl nicht');
  await page.mouse.click(contourC.x,contourC.y);
  await page.locator('#clickContourFinish').click();
  assert.equal(await page.locator('#createSketchSolid').isEnabled(),true,'Abgeschlossene Punktkontur ist nicht als 3D-Körper bereit');
  await page.locator('#createSketchSolid').click();
  await waitForSelectedSketchOcct();

  // 2D-Skizze: Rechteck auf der XY-Ebene zeichnen und mit exakten Massen extrudieren.
  await page.locator('[data-tab="draw"]').click();
  await page.locator('#sketchTool').selectOption('rectangle');
  await page.locator('#startSketch').click();
  const sketchStart = await page.evaluate(() => window.__silmoSketchPointForTest(-0.8, -0.8));
  const sketchEnd = await page.evaluate(() => window.__silmoSketchPointForTest(0.8, 0.8));
  await page.mouse.move(sketchStart.x, sketchStart.y);
  await page.mouse.down();
  await page.mouse.move(sketchEnd.x, sketchEnd.y, { steps: 8 });
  await page.mouse.up();
  assert.equal(await page.locator('#createSketchSolid').isEnabled(), true, '2D-Skizze wird nach dem Ziehen nicht vorbereitet');
  await showDrawRightSubtab(1);
  await page.locator('#sketchWidthMM').fill('25');
  await page.locator('#sketchDepthMM').fill('15');
  await page.locator('#sketchHeightMM').fill('5');
  await page.locator('#createSketchSolid').click();
  await waitForSelectedSketchOcct();
  const sketchSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(sketchSnapshot.type, 'rectangle', 'Rechteck-Skizze wurde nicht als Rechteck erkannt');
  assert.ok(Math.abs(sketchSnapshot.actualWidthMM - 25) < 0.01, 'Exakte Rechteckbreite wurde nicht übernommen');
  assert.ok(Math.abs(sketchSnapshot.actualDepthMM - 15) < 0.01, 'Exakte Rechtecktiefe wurde nicht übernommen');
  assert.ok(Math.abs(sketchSnapshot.actualHeightMM - 5) < 0.01, 'Extrusionshöhe wurde nicht übernommen');
  assert.ok(Math.abs(sketchSnapshot.occtVolumeMM3 - 1875) < 1e-6, 'OCCT-Rechteck besitzt nicht das exakte Volumen von 1875 mm³');
  assert.equal(await page.locator('#createSketchSolid').isDisabled(), true, 'Erstellte Skizze bleibt fälschlich zur erneuten Extrusion bereit');
  await showDrawRightSubtab(0);
  await page.locator('#sketchTool').selectOption('circle');
  await showDrawRightSubtab(1);
  assert.equal(await page.locator('#sketchDepthMM').isVisible(), false, 'Kreis zeigt ein unnötiges separates Tiefenfeld');

  // Direkt auf einer ebenen Modellfläche zeichnen und senkrecht zur Fläche extrudieren.
  await page.locator('#cancelSketch').click();
  await showDrawRightSubtab(0);
  const faceBaseId = await page.evaluate(() => window.__silmoModelingTestSnapshot().selectedId);
  assert.ok(faceBaseId, 'Kein ausgewählter Körper für den Flächenskizzen-Test vorhanden');
  const facePickPoint = await page.evaluate(id => window.__silmoFaceSketchTestPoint(id), faceBaseId);
  assert.ok(facePickPoint, 'Keine sichtbare Seitenfläche für den Flächenskizzen-Test gefunden');
  await page.locator('#pickFaceSketchPlane').click();
  await page.mouse.click(facePickPoint.x, facePickPoint.y);
  await page.waitForFunction(() => window.__silmoFaceSketchFrameSnapshot()?.active === true, null, { timeout: 5000 });
  const pickedFaceFrame = await page.evaluate(() => window.__silmoFaceSketchFrameSnapshot());
  const faceFrameChecks = await page.evaluate(() => {
    const frame = window.__silmoFaceSketchFrameSnapshot();
    const vector = values => ({ x: values[0], y: values[1], z: values[2] });
    const dot = (a,b) => a.x*b.x + a.y*b.y + a.z*b.z;
    const length = a => Math.hypot(a.x,a.y,a.z);
    const u=vector(frame.u), v=vector(frame.v), normal=vector(frame.normal);
    return { uLength:length(u), vLength:length(v), normalLength:length(normal), uvDot:dot(u,v), unDot:dot(u,normal), vnDot:dot(v,normal) };
  });
  for (const key of ['uLength','vLength','normalLength']) assert.ok(Math.abs(faceFrameChecks[key]-1)<1e-6, 'Flächenkoordinatensystem ist nicht normiert: '+key);
  for (const key of ['uvDot','unDot','vnDot']) assert.ok(Math.abs(faceFrameChecks[key])<1e-6, 'Flächenkoordinatensystem ist nicht rechtwinklig: '+key);
  assert.equal(await page.locator('#sketchPlaneSelect').isDisabled(), true, 'Globale Zeichenebene bleibt trotz gewählter Modellfläche änderbar');
  await showDrawRightSubtab(0);
  await page.locator('#sketchTool').selectOption('rectangle');
  await page.locator('#startSketch').click();
  const faceSketchStart = await page.evaluate(() => window.__silmoFaceSketchScreenPointForTest(-0.2,-0.2));
  const faceSketchEnd = await page.evaluate(() => window.__silmoFaceSketchScreenPointForTest(0.2,0.2));
  assert.ok(faceSketchStart && faceSketchEnd, 'Punkte auf der gewählten Modellfläche lassen sich nicht projizieren');
  await page.mouse.move(faceSketchStart.x,faceSketchStart.y);
  await page.mouse.down();
  await page.mouse.move(faceSketchEnd.x,faceSketchEnd.y,{steps:8});
  await page.mouse.up();
  assert.equal(await page.locator('#createSketchSolid').isEnabled(), true, 'Rechteck auf Modellfläche wurde nicht als Skizze vorbereitet');
  await showDrawRightSubtab(1);
  await page.locator('#sketchWidthMM').fill('2');
  await page.locator('#sketchDepthMM').fill('2');
  await page.locator('#sketchHeightMM').fill('2');
  await page.locator('#createSketchSolid').click();
  await waitForSelectedSketchOcct();
  const faceSketchResult = await page.evaluate(() => {
    const snapshot = window.__silmoSketchSnapshot();
    const model = window.__silmoModelingTestSnapshot();
    const frame = window.__silmoFaceSketchFrameSnapshot();
    const object = model.objects.find(item => item.id === model.selectedId);
    return { snapshot, position: object?.position || null, origin: frame.origin };
  });
  assert.equal(faceSketchResult.snapshot.type, 'rectangle', 'Flächenskizze wurde nicht als Rechteck gespeichert');
  assert.ok(Math.abs(faceSketchResult.snapshot.extrusionMM-2)<0.01, 'Flächenskizze hat nicht die eingestellte Extrusionshöhe');
  assert.ok(Math.abs(faceSketchResult.snapshot.occtVolumeMM3-8)<1e-5, 'Flächenskizze wurde nicht mit dem erwarteten Volumen von 8 mm³ extrudiert');
  assert.ok(faceSketchResult.position && Math.hypot(
    faceSketchResult.position.x-faceSketchResult.origin[0],
    faceSketchResult.position.y-faceSketchResult.origin[1],
    faceSketchResult.position.z-faceSketchResult.origin[2]
  )<0.02, 'Extrudierter Körper wurde nicht am Ursprung der gewählten Modellfläche platziert');
  await page.locator('#cancelSketch').click();

  // Ellipse: unabhängige Breite und Tiefe sowie Extrusion prüfen.
  await showDrawRightSubtab(0);
  await page.locator('#sketchTool').selectOption('ellipse');
  await showDrawRightSubtab(1);
  assert.equal(await page.locator('#sketchDepthMM').isVisible(), true, 'Ellipse zeigt kein separates Tiefenfeld');
  await page.locator('#startSketch').click();
  const ellipseStart = await page.evaluate(() => window.__silmoSketchPointForTest(-0.72, -0.48));
  const ellipseEnd = await page.evaluate(() => window.__silmoSketchPointForTest(0.72, 0.48));
  await page.mouse.move(ellipseStart.x, ellipseStart.y); await page.mouse.down();
  await page.mouse.move(ellipseEnd.x, ellipseEnd.y, { steps: 8 }); await page.mouse.up();
  await page.locator('#sketchWidthMM').fill('30'); await page.locator('#sketchDepthMM').fill('12'); await page.locator('#sketchHeightMM').fill('4');
  await page.locator('#createSketchSolid').click();
  await waitForSelectedSketchOcct();
  const ellipseSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(ellipseSnapshot.type, 'ellipse', 'Ellipse wurde nicht als Ellipse gespeichert');
  assert.ok(Math.abs(ellipseSnapshot.actualWidthMM - 30) < 0.01, 'Ellipsenbreite stimmt nicht');
  assert.ok(Math.abs(ellipseSnapshot.actualDepthMM - 12) < 0.01, 'Ellipsentiefe stimmt nicht');
  assert.ok(Math.abs(ellipseSnapshot.actualHeightMM - 4) < 0.01, 'Ellipsenhöhe stimmt nicht');

  // Dreieck: echte dreieckige Extrusionsgeometrie mit eigenen Massen.
  await showDrawRightSubtab(0);
  await page.locator('#sketchTool').selectOption('triangle');
  await showDrawRightSubtab(1);
  await page.locator('#startSketch').click();
  const triangleStart = await page.evaluate(() => window.__silmoSketchPointForTest(-0.65, -0.6));
  const triangleEnd = await page.evaluate(() => window.__silmoSketchPointForTest(0.65, 0.6));
  await page.mouse.move(triangleStart.x, triangleStart.y); await page.mouse.down();
  await page.mouse.move(triangleEnd.x, triangleEnd.y, { steps: 8 }); await page.mouse.up();
  await page.locator('#sketchWidthMM').fill('24'); await page.locator('#sketchDepthMM').fill('18'); await page.locator('#sketchHeightMM').fill('6');
  await page.locator('#createSketchSolid').click();
  await waitForSelectedSketchOcct();
  const triangleSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(triangleSnapshot.type, 'triangle', 'Dreieck wurde nicht als Dreieck gespeichert');
  assert.ok(Math.abs(triangleSnapshot.actualWidthMM - 24) < 0.01, 'Dreiecksbreite stimmt nicht');
  assert.ok(Math.abs(triangleSnapshot.actualDepthMM - 18) < 0.01, 'Dreieckstiefe stimmt nicht');
  assert.ok(Math.abs(triangleSnapshot.actualHeightMM - 6) < 0.01, 'Dreieckshöhe stimmt nicht');

  // Das sichtbare Druckplattenraster muss dieselbe einstellbare Weite verwenden.
  await showDrawRightSubtab(2);
  await page.locator('#sketchGridMM').fill('2');
  const gridAt2 = await page.evaluate(() => window.__silmoSketchGridSnapshot());
  assert.equal(gridAt2.spacingMM, 2, 'Rasterweite 2 mm wird nicht übernommen');
  assert.equal(gridAt2.visualSpacingMM, 2, 'Sichtbares Raster aktualisiert sich nicht auf 2 mm');
  await page.locator('#sketchGridMM').fill('5');
  const gridAt5 = await page.evaluate(() => window.__silmoSketchGridSnapshot());
  assert.equal(gridAt5.spacingMM, 5, 'Rasterweite 5 mm wird nicht übernommen');
  assert.equal(gridAt5.visualSpacingMM, 5, 'Sichtbares Raster aktualisiert sich nicht auf 5 mm');

  // Zeichenpunkte werden an allen vier Seiten auf die tatsächliche Druckplatte begrenzt.
  const boundedPoint = await page.evaluate(() => window.__silmoSketchClampPointForTest(25, -25, 0));
  assert.ok(Math.abs(boundedPoint.x) <= 10.00001, 'Zeichenpunkt kann über die X-Grenze der 200-mm-Druckplatte hinaus');
  assert.ok(Math.abs(boundedPoint.y) <= 10.00001, 'Zeichenpunkt kann über die Y-Grenze der 200-mm-Druckplatte hinaus');

  // Rasterfang: gezeichnete Rechteckkanten werden auf das gewählte 5-mm-Raster gesetzt.
  await showDrawRightSubtab(0);
  await page.locator('#sketchTool').selectOption('rectangle');
  await showDrawRightSubtab(2);
  await page.locator('#sketchSnapEnabled').check();
  await page.locator('#sketchGridMM').fill('5');
  await page.locator('#startSketch').click();
  const snapStart = await page.evaluate(() => window.__silmoSketchPointForTest(-0.73, -0.62));
  const snapEnd = await page.evaluate(() => window.__silmoSketchPointForTest(0.68, 0.57));
  await page.mouse.move(snapStart.x, snapStart.y);
  await page.mouse.down();
  await page.mouse.move(snapEnd.x, snapEnd.y, { steps: 10 });
  await page.mouse.up();
  await page.locator('#createSketchSolid').click();
  await waitForSelectedSketchOcct();
  const snappedSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(snappedSnapshot.type, 'rectangle', 'Rasterfang-Test hat kein Rechteck erstellt');
  assert.ok(Math.abs(snappedSnapshot.widthMM / 5 - Math.round(snappedSnapshot.widthMM / 5)) < 0.001, 'Rechteckbreite liegt nicht auf dem 5-mm-Raster');
  assert.ok(Math.abs(snappedSnapshot.depthMM / 5 - Math.round(snappedSnapshot.depthMM / 5)) < 0.001, 'Rechtecktiefe liegt nicht auf dem 5-mm-Raster');
  await page.locator('#sketchSnapEnabled').uncheck();

  // 2D-Freiform: eine geschlossene Kontur mit mehreren Punkten zeichnen und extrudieren.
  await showDrawRightSubtab(0);
  await page.locator('#sketchTool').selectOption('freeform2d');
  await showDrawRightSubtab(1);
  assert.equal(await page.locator('#sketchWidthMM').isVisible(), false, 'Freiform zeigt unnötige Breitenfelder');
  await page.locator('#sketchHeightMM').fill('7');
  await page.locator('#startSketch').click();
  const freeformPoints = [
    await page.evaluate(() => window.__silmoSketchPointForTest(-0.75, -0.55)),
    await page.evaluate(() => window.__silmoSketchPointForTest(0.65, -0.55)),
    await page.evaluate(() => window.__silmoSketchPointForTest(0.85, 0.05)),
    await page.evaluate(() => window.__silmoSketchPointForTest(0.1, 0.75)),
    await page.evaluate(() => window.__silmoSketchPointForTest(-0.7, 0.35))
  ];
  await page.mouse.move(freeformPoints[0].x, freeformPoints[0].y);
  await page.mouse.down();
  for (const point of freeformPoints.slice(1)) await page.mouse.move(point.x, point.y, { steps: 4 });
  await page.mouse.up();
  assert.equal(await page.locator('#createSketchSolid').isEnabled(), true, 'Freiform wurde nicht als geschlossene Skizze vorbereitet');
  const freeformBeforeCreate = await page.evaluate(() => ({
    tool: document.getElementById('sketchTool').value,
    draft: window.__silmoSketchDraftSnapshot(),
    status: document.getElementById('sketchStatus').textContent
  }));
  assert.equal(freeformBeforeCreate.tool, 'freeform2d', 'Skizzenwerkzeug wechselte vor der Freiform-Extrusion: ' + JSON.stringify(freeformBeforeCreate));
  assert.equal(freeformBeforeCreate.draft?.type, 'freeform2d', 'Freiform-Zeichenpunkte gingen vor der Extrusion verloren: ' + JSON.stringify(freeformBeforeCreate));
  await page.locator('#createSketchSolid').click();
  await waitForSelectedSketchOcct();
  const freeformAfterCreate = await page.evaluate(() => ({
    snapshot: window.__silmoSketchSnapshot(),
    status: document.getElementById('status')?.textContent,
    sketchStatus: document.getElementById('sketchStatus')?.textContent,
    tool: document.getElementById('sketchTool')?.value
  }));
  const freeformSnapshot = freeformAfterCreate.snapshot;
  assert.equal(freeformSnapshot.type, 'freeform2d', 'Freiform wurde nicht als Freiformkörper gespeichert: ' + JSON.stringify(freeformAfterCreate));
  assert.ok(freeformSnapshot.points >= 3, 'Freiform enthält zu wenige Konturpunkte');
  assert.ok(freeformSnapshot.areaMM2 > 0, 'Freiform hat keine gültige Fläche');
  assert.ok(freeformSnapshot.perimeterMM > 0, 'Freiform hat keinen Umfang');
  assert.ok(Math.abs(freeformSnapshot.extrusionMM - 7) < 0.01, 'Freiform-Extrusionshöhe wurde nicht übernommen');
  assert.ok(freeformSnapshot.actualHeightMM > 0, 'Freiform wurde nicht zu einem 3D-Körper extrudiert');

  // 2D-Linie: eine gerade Linie auf XY als echten runden Körper erzeugen.
  await showDrawRightSubtab(0);
  await page.locator('#sketchTool').selectOption('line2d');
  await showDrawRightSubtab(2);
  assert.equal(await page.locator('#sketchDiameterMM').isVisible(), true, '2D-Linie zeigt kein Durchmesserfeld');
  await page.locator('#sketchDiameterMM').fill('1.5');
  await page.locator('#startSketch').click();
  const line2dStart = await page.evaluate(() => window.__silmoSketchPointForTest(-0.65, -0.25));
  const line2dEnd = await page.evaluate(() => window.__silmoSketchPointForTest(0.65, 0.25));
  await page.mouse.move(line2dStart.x, line2dStart.y);
  await page.mouse.down();
  await page.mouse.move(line2dEnd.x, line2dEnd.y, { steps: 6 });
  await page.mouse.up();
  assert.equal(await page.locator('#createSketchSolid').isEnabled(), true, '2D-Linie wurde nicht vorbereitet');
  await page.locator('#createSketchSolid').click();
  const line2dSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(line2dSnapshot.type, 'line2d', '2D-Linie wurde nicht als solche gespeichert');
  assert.equal(line2dSnapshot.plane, 'xy', '2D-Linie liegt nicht auf XY');
  assert.equal(line2dSnapshot.diameterMM, 1.5, 'Durchmesser der 2D-Linie wurde nicht übernommen');
  assert.ok(line2dSnapshot.lengthMM > 0, '2D-Linie hat keine Länge');

  // 2D-Kurve: freie Kurve auf XY mit mehreren Punkten erzeugen.
  await showDrawRightSubtab(0);
  await page.locator('#sketchTool').selectOption('curve2d');
  await showDrawRightSubtab(2);
  await page.locator('#sketchDiameterMM').fill('1.0');
  await page.locator('#startSketch').click();
  const curvePoints = [
    await page.evaluate(() => window.__silmoSketchPointForTest(-0.7, -0.2)),
    await page.evaluate(() => window.__silmoSketchPointForTest(-0.3, 0.45)),
    await page.evaluate(() => window.__silmoSketchPointForTest(0.15, -0.35)),
    await page.evaluate(() => window.__silmoSketchPointForTest(0.7, 0.3))
  ];
  await page.mouse.move(curvePoints[0].x, curvePoints[0].y);
  await page.mouse.down();
  for (const point of curvePoints.slice(1)) await page.mouse.move(point.x, point.y, { steps: 5 });
  await page.mouse.up();
  assert.equal(await page.locator('#createSketchSolid').isEnabled(), true, '2D-Kurve wurde nicht vorbereitet');
  await page.locator('#createSketchSolid').click();
  const curve2dSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(curve2dSnapshot.type, 'curve2d', '2D-Kurve wurde nicht als solche gespeichert');
  assert.ok(curve2dSnapshot.pointCount >= 2, '2D-Kurve enthält zu wenige Punkte');
  assert.ok(curve2dSnapshot.lengthMM > 0, '2D-Kurve hat keine Länge');

  // 3D-Linie: eine räumliche Freihandlinie auf der XZ-Ebene zeichnen und als Körper erzeugen.
  await showDrawRightSubtab(0);
  await page.locator('#sketchTool').selectOption('line3d');
  await showDrawRightSubtab(2);
  await page.locator('#sketchPlaneSelect').selectOption('xz');
  await page.locator('#sketchDiameterMM').fill('1.2');
  await page.locator('#startSketch').click();
  const lineStart = await page.evaluate(() => window.__silmoSketchPointForTest(-0.7, 0, 0.2));
  const lineEnd = await page.evaluate(() => window.__silmoSketchPointForTest(0.7, 0, 0.9));
  await page.mouse.move(lineStart.x, lineStart.y);
  await page.mouse.down();
  await page.mouse.move(lineEnd.x, lineEnd.y, { steps: 14 });
  await page.mouse.up();
  assert.equal(await page.locator('#createSketchSolid').isEnabled(), true, '3D-Linie wird nach dem Zeichnen nicht vorbereitet');
  await page.locator('#createSketchSolid').click();
  const lineSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(lineSnapshot.type, 'line3d', 'Räumliche Linie wurde nicht als 3D-Linie erkannt');
  assert.equal(lineSnapshot.plane, 'xz', 'Ausgewählte Zeichenebene wurde nicht gespeichert');
  assert.equal(lineSnapshot.diameterMM, 1.2, 'Linienstärke wurde nicht übernommen');
  assert.ok(lineSnapshot.pointCount >= 2, '3D-Linie enthält nicht mindestens zwei Punkte');
  assert.ok(lineSnapshot.lengthMM > 0, '3D-Linie hat keine Länge');
  assert.ok(lineSnapshot.actualWidthMM > 0 && lineSnapshot.actualDepthMM > 0 && lineSnapshot.actualHeightMM > 0, '3D-Linie hat keine echte räumliche Ausdehnung');
  assert.equal((await page.evaluate(() => window.__silmoSketchCameraLockSnapshot())).active, true, 'Zeichenmodus wurde nach dem Extrudieren beendet');
  await page.locator('#cancelSketch').click();
  assert.equal((await page.evaluate(() => window.__silmoSketchCameraLockSnapshot())).active, false, 'Zeichenmodus lässt sich nicht beenden');
  assert.equal(await page.locator('#gizmoModeToggle').isDisabled(), false, 'Drehfunktion wurde nach dem Beenden nicht freigegeben');
  await showCreateSubtab(0);

  // Ein Fehler im zweiten CSG-Schritt muss alle temporären Geometrien freigeben
  // und darf keines der drei Originalobjekte aus der Szene entfernen.
  const csgFailureStartCount = await page.locator('#objects .object-row').count();
  await showCreateSubtab(0);
  await page.locator('#addCube').click();
  await page.locator('#addCube').click();
  await page.locator('#addCube').click();
  await page.locator('[data-tab="edit"]').click();
  await page.locator('#multiSelectToggle').click();
  await showCreateSubtab(1);
  await page.locator('#objects .object-select').nth(csgFailureStartCount).click();
  await page.locator('#objects .object-select').nth(csgFailureStartCount + 1).click();
  assert.equal(await page.locator('#objects .object-select[aria-pressed="true"]').count(), 3,
    'CSG-Fehlerfall konnte nicht alle drei Originalobjekte auswählen');
  await showExpertBooleanTools();
  await page.evaluate(() => {
    const originalCSG = window.SILMOCSG;
    const originalCombine = originalCSG.combineMeshes;
    const originalDispose = THREE.BufferGeometry.prototype.dispose;
    window.__silmoCSGFailureProbe = { calls: 0, disposeCalls: 0, originalCSG, originalDispose };
    window.SILMOCSG = {
      combineMeshes(...args) {
        window.__silmoCSGFailureProbe.calls += 1;
        if (window.__silmoCSGFailureProbe.calls === 2) throw new Error('simulierter zweiter CSG-Schrittfehler');
        return originalCombine(...args);
      }
    };
    THREE.BufferGeometry.prototype.dispose = function () {
      window.__silmoCSGFailureProbe.disposeCalls += 1;
      return originalDispose.call(this);
    };
  });
  allowExpectedConsoleError = true;
  try { await page.locator('#booleanUnion').click(); }
  finally { allowExpectedConsoleError = false; }
  const csgFailureProbe = await page.evaluate(() => {
    const probe = window.__silmoCSGFailureProbe;
    window.SILMOCSG = probe.originalCSG;
    THREE.BufferGeometry.prototype.dispose = probe.originalDispose;
    delete window.__silmoCSGFailureProbe;
    return { calls: probe.calls, disposeCalls: probe.disposeCalls };
  });
  assert.equal(csgFailureProbe.calls, 2, 'Der erzwungene Fehler trat nicht im zweiten CSG-Schritt auf');
  assert.equal(csgFailureProbe.disposeCalls, 2, 'Temporäre CSG-Geometrien wurden nicht vollständig freigegeben');
  assert.equal(await page.locator('#objects .object-row').count(), csgFailureStartCount + 3,
    'Ein fehlgeschlagener CSG-Vorgang hat Originalobjekte entfernt');
  assert.match(await page.locator('#status').innerText(), /simulierter zweiter CSG-Schrittfehler/,
    'Der simulierte CSG-Fehler wurde nicht kontrolliert gemeldet');
  await page.locator('[data-tab="edit"]').click();
  await page.locator('#delete').click();
  await page.locator('#multiSelectToggle').click();
  assert.equal(await page.locator('#objects .object-row').count(), csgFailureStartCount,
    'Die drei CSG-Fehlerfall-Testobjekte wurden nicht sauber entfernt');
  await page.locator('[data-tab="create"]').click();
  await showCreateSubtab(0);

  // Boolesche Verbindung muss sich wieder in die ursprünglichen Formen zerlegen lassen.
  const unionStartCount=await page.locator('#objects .object-row').count();
  await page.locator('#addCube').click(); await page.locator('#addSphere').click();
  await page.locator('[data-tab="edit"]').click();
  await page.locator('#multiSelectToggle').click();
  await showCreateSubtab(1);
  await page.locator('#objects .object-select').nth(unionStartCount).click();
  assert.equal(await page.locator('#objects .object-select[aria-pressed="true"]').count(),2,'Union-Test konnte nicht beide Formen auswählen');
  await showExpertBooleanTools();
  await page.locator('#booleanUnion').click();
  assert.equal(await page.locator('#objects .object-row').count(),unionStartCount+1,'Verbinden erzeugt nicht genau ein Ergebnisobjekt');
  assert.equal((await page.evaluate(()=>window.__silmoUnionSnapshot())).partCount,2,'Verbundene Form speichert die ursprünglichen Einzelteile nicht');
  await page.locator('[data-tab="project"]').click();
  await page.locator('#pane-project-left > .inner-tab-nav button').nth(0).click();
  const unionDownloadPromise=page.waitForEvent('download');
  await page.locator('#saveProjectButton').click();
  const unionDownload=await unionDownloadPromise;
  await page.locator('#projectFileInput').setInputFiles(await unionDownload.path());
  await page.waitForFunction(()=>window.__silmoUnionSnapshot().partCount===2,null,{timeout:10000});
  assert.equal((await page.evaluate(()=>window.__silmoUnionSnapshot())).partCount,2,'Projektimport verliert die gespeicherten Einzelteile');
  await showExpertBooleanTools();
  await page.locator('#booleanSeparate').click();
  assert.equal(await page.locator('#objects .object-row').count(),unionStartCount+2,'Verbindung lösen stellt die ursprünglichen Objekte nicht wieder her');
  assert.match(await page.locator('#status').innerText(),/Verbindung gelöst: 2 ursprüngliche Einzelobjekte/,'Trennen meldet keinen Erfolg');
  await page.locator('#viewport canvas').focus();
  await page.keyboard.press('Control+z');
  assert.equal(await page.locator('#objects .object-row').count(),unionStartCount+1,'Rückgängig stellt die verbundene Form nicht wieder her');
  assert.equal((await page.evaluate(()=>window.__silmoUnionSnapshot())).partCount,2,'Rückgängig verliert die gespeicherten Einzelteile');
  await page.locator('#booleanSeparate').click();
  assert.equal(await page.locator('#objects .object-row').count(),unionStartCount+2,'Verbindung kann nach Rückgängig nicht erneut gelöst werden');

  // Boolesche Differenz muss den zweiten Körper aus dem ersten ausschneiden.
  const subtractStartCount = await page.locator('#objects .object-row').count();
  await showCreateSubtab(0);
  await page.locator('#addCube').click();
  await page.locator('#addSphere').click();
  await page.locator('[data-tab="edit"]').click();
  await page.locator('#multiSelectToggle').click();
  await showCreateSubtab(1);
  // Die Kugel ist nach dem Erstellen bereits ausgewählt; nur den Würfel ergänzen.
  await page.locator('#objects .object-select').nth(subtractStartCount).click();
  assert.equal(await page.locator('#objects .object-select[aria-pressed="true"]').count(), 2, 'Differenz-Test konnte nicht beide Formen auswählen');
  await showExpertBooleanTools();
  await page.locator('#booleanSubtract').click();
  assert.equal(await page.locator('#objects .object-row').count(), subtractStartCount + 1, 'Differenz erzeugt nicht genau ein Ergebnisobjekt');
  assert.match(await page.locator('#status').innerText(), /Ausschnitt erfolgreich berechnet/, 'Boolesche Differenz wurde nicht erfolgreich ausgeführt');
  // Den Mehrfachauswahlmodus für die nachfolgenden, unabhängigen Regressionen zurücksetzen.
  await page.locator('[data-tab="edit"]').click();
  await page.locator('#multiSelectToggle').click();

  // Die App kann bereits ein Startobjekt enthalten. Nur die beiden neu erstellten prüfen.
  const initialCount = await page.locator('#objects .object-row').count();
  await showCreateSubtab(0);
  await page.locator('#addCube').click();
  await page.locator('#addSphere').click();
  assert.equal(await page.locator('#objects .object-row').count(), initialCount + 2, 'Neue Objekte wurden nicht korrekt erstellt');

  // Das zuletzt erstellte Objekt versetzen, damit Ausrichten messbar etwas verändert.
  await page.locator('[data-tab="edit"]').click();
  const xField = page.locator('#positionFields input').first();
  await xField.fill('2');
  await xField.press('Enter');
  await page.waitForTimeout(150);
  await page.locator('#multiSelectToggle').click();
  await showCreateSubtab(1);

  // Das neu erstellte Würfel-Objekt zusätzlich zur Kugel auswählen.
  await page.locator('#objects .object-select').nth(initialCount).click();
  const selectedCount = await page.locator('#objects .object-select[aria-pressed="true"]').count();
  assert.equal(selectedCount, 2, 'Mehrfachauswahl markiert nicht beide neuen Objekte');

  // Ausrichten: Beide Objektmittelpunkte müssen danach auf X übereinstimmen.
  const beforeAlign = await page.evaluate(() => window.__silmoTutorialAllPositions());
  await page.locator('[data-tab="edit"]').click();
  assert.equal(await page.locator('#status').isVisible(), true, 'Statusmeldung muss auch im Bearbeiten-Reiter sichtbar sein');
  await page.locator('#alignAxis').selectOption('x');
  await page.locator('#alignMode').selectOption('center');
  await page.locator('#alignSelected').click();
  const alignStatus = await page.locator('#status').innerText();
  assert.match(alignStatus, /2 Objekte auf Achse X ausgerichtet|bereits so ausgerichtet/, 'Ausrichten meldet keinen Erfolg');
  const afterAlign = await page.evaluate(() => window.__silmoTutorialAllPositions());
  const alignedNewObjects = afterAlign.slice(-2);
  assert.ok(Math.abs(alignedNewObjects[0].x - alignedNewObjects[1].x) < 1e-6, 'Die beiden neu erstellten Objekte wurden nicht mittig auf X ausgerichtet');

  // Gruppieren muss beide Objekte als Gruppe markieren.
  await page.locator('#createObjectGroup').click();
  assert.match(await page.locator('#status').innerText(), /2 Objekte zu einer Gruppe zusammengefasst/, 'Gruppieren hat nicht funktioniert');
  await page.locator('[data-tab="create"]').click();
  assert.equal(await page.locator('#objects .object-edit').count(), 2, 'Gruppenmitglieder werden nicht als Gruppe angezeigt');

  // Spiegeln muss sowohl den Status als auch das tatsächliche Skalierungsvorzeichen ändern.
  const beforeMirror = await page.evaluate(() => window.__silmoTutorialAllTransforms());
  await page.locator('[data-tab="edit"]').click();
  await page.locator('#mirrorX').click();
  assert.match(await page.locator('#status').innerText(), /2 Objekt\(e\) an der X-Achse gespiegelt/, 'Spiegeln hat nicht funktioniert');
  const afterMirror = await page.evaluate(() => window.__silmoTutorialAllTransforms());
  const beforeNew = beforeMirror.slice(-2);
  const afterNew = afterMirror.slice(-2);
  assert.ok(beforeNew.every((obj, i) => Math.sign(obj.sx) !== Math.sign(afterNew[i].sx)), 'Spiegeln hat das tatsächliche X-Skalierungsvorzeichen nicht geändert');

  // Gruppierung wieder aufheben.
  await page.locator('#ungroupObjects').click();
  assert.match(await page.locator('#status').innerText(), /Gruppierung von 2 Objekten aufgehoben/, 'Gruppierung aufheben hat nicht funktioniert');
  await showCreateSubtab(1);
  assert.equal(await page.locator('#objects .object-edit').count(), 0, 'Gruppenkennzeichnung ist nach dem Aufheben noch vorhanden');
  assert.equal(await page.locator('#objects .object-select[aria-pressed="true"]').count(), 1, 'Nach dem Aufheben darf nur ein Objekt ausgewählt bleiben');
  assert.equal(await page.locator('#multiSelectToggle').getAttribute('aria-pressed'), 'false', 'Mehrfachauswahl muss nach dem Aufheben ausgeschaltet sein');

  // Ein einzelnes Gruppenmitglied muss danach unabhängig bewegbar sein.
  await page.locator('#objects .object-select').nth(initialCount).click();
  assert.equal(await page.locator('#objects .object-select[aria-pressed="true"]').count(), 1, 'Einzelobjekt lässt sich nach dem Aufheben nicht allein auswählen');
  const beforeUngroupMove = await page.evaluate(() => window.__silmoTutorialAllPositions());
  await page.locator('[data-tab="edit"]').click();
  const singleX = page.locator('#positionFields input').first();
  const nextX = String(Number(await singleX.inputValue()) + 1);
  await singleX.fill(nextX);
  await singleX.press('Enter');
  await page.waitForTimeout(150);
  const afterUngroupMove = await page.evaluate(() => window.__silmoTutorialAllPositions());
  const changedAfterUngroup = beforeUngroupMove.filter(before => {
    const after = afterUngroupMove.find(item => item.uuid === before.uuid);
    return after && Math.abs(after.x - before.x) > 1e-6;
  });
  assert.equal(changedAfterUngroup.length, 1, 'Nach dem Aufheben muss genau ein Objekt unabhängig bewegt werden können');

  // Die Gradzahl soll direkt neben dem Würfel editierbar sein, nicht mehr in der Seitenleiste.
  assert.equal(await page.locator('#rotationFields').count(), 0, 'Alte Drehfelder in der Seitenleiste wurden nicht entfernt');

  // Verschieben und Drehen müssen getrennte Modi sein: standardmässig
  // erscheinen die Pfeile, erst nach dem Umschalten die Drehringe.
  const gizmoModeToggle = page.locator('#gizmoModeToggle');
  assert.equal(await gizmoModeToggle.getAttribute('aria-pressed'), 'false', 'Verschieben muss der Standardmodus sein');
  assert.equal(await page.evaluate(() => window.__silmoTutorialRotationRingPoint('z', 0.45)), null, 'Drehringe dürfen im Verschieben-Modus nicht aktiv sein');
  await gizmoModeToggle.click();
  assert.equal(await gizmoModeToggle.getAttribute('aria-pressed'), 'true', 'Umschalten auf Drehen funktioniert nicht');
  assert.ok(await page.evaluate(() => window.__silmoTutorialRotationRingPoint('z', 0.45)), 'Drehringe werden nach dem Umschalten nicht angezeigt');

  // Einen Ring wirklich mit der Maus ziehen. Das Modell darunter darf dabei
  // nicht neu ausgewählt werden und seine Rotation muss sich ändern.
  const selectedBeforeRing = await page.locator('#objects .object-select[aria-pressed="true"]').evaluate(el => el.dataset.objectId);
  const beforeRingRotation = await page.evaluate(() => window.__silmoTutorialAllTransforms().at(-2));
  const ringStart = await page.evaluate(() => window.__silmoTutorialRotationRingPoint('z', 0.45));
  const ringEnd = await page.evaluate(() => window.__silmoTutorialRotationRingPoint('z', 0.95));
  assert.ok(ringStart && ringEnd, 'Test konnte die Position des Z-Drehrings nicht bestimmen');
  await page.mouse.move(ringStart.x, ringStart.y);
  await page.mouse.down();
  await page.mouse.move(ringEnd.x, ringEnd.y, { steps: 12 });
  const rotationGuide = await page.evaluate(() => window.__silmoRotationGuideSnapshot());
  assert.equal(rotationGuide.labelVisible, true, 'Gradzahl wird während des Drehens nicht angezeigt');
  assert.match(rotationGuide.label, /^-?\d+°$/, 'Drehwinkel wird nicht als Gradzahl angezeigt');
  assert.equal(rotationGuide.activeAxis, 'z', 'Aktive Drehachse wird nicht erkannt');
  assert.ok(rotationGuide.activeLineOpacity > 0.8, 'Drehachse durch den Würfel wird nicht hervorgehoben');
  assert.ok(rotationGuide.activeRingOpacity > 0.95, 'Aktiver Drehring wird nicht deutlich hervorgehoben');
  assert.ok(rotationGuide.inactiveRingOpacity < 0.3, 'Nicht aktive Drehringe werden nicht ausreichend abgedunkelt');
  assert.equal(rotationGuide.activeGlowVisible, true, 'Leuchthof der aktiven Drehachse fehlt');
  await page.mouse.up();
  assert.equal((await page.evaluate(() => window.__silmoRotationGuideSnapshot())).labelVisible, true, 'Gradzahl-Eingabe verschwindet nach dem Ziehen');
  const angleInput = page.locator('#rotationAngleLabel');
  assert.equal(await angleInput.getAttribute('type'), 'number', 'Gradzahl neben dem Würfel ist kein Zahlenfeld');
  await angleInput.fill('45');
  const whileTyping = await page.evaluate(() => window.__silmoRotationGuideSnapshot());
  assert.equal(whileTyping.activeAxis, 'z', 'Ausgewählte Achse geht beim Eintippen verloren');
  assert.equal(whileTyping.activeGlowVisible, true, 'Achsen-Leuchten verschwindet während der Gradzahl-Eingabe');
  await angleInput.press('Enter');
  await page.waitForTimeout(200);
  assert.match(await page.locator('#status').innerText(), /Drehung um Z auf 45° gesetzt/, 'Direkte Gradzahl-Eingabe wurde nicht übernommen');
  const afterTyping = await page.evaluate(() => window.__silmoRotationGuideSnapshot());
  assert.equal(afterTyping.activeAxis, 'z', 'Ausgewählte Achse bleibt nach der Gradzahl-Eingabe nicht aktiv');
  assert.equal(afterTyping.activeGlowVisible, true, 'Achsen-Leuchten verschwindet nach der Gradzahl-Eingabe');
  const afterTypedAngle = await page.evaluate(() => window.__silmoTutorialAllTransforms().at(-2));
  assert.ok(Math.abs(afterTypedAngle.qz) > 0.05 || Math.abs(afterTypedAngle.qw) < 0.99, 'Eingetippte Gradzahl verändert das Modell nicht');

  // Escape muss eine noch nicht bestätigte Änderung abbrechen.
  const committedAngle = await page.evaluate(() => window.__silmoTutorialAllTransforms().at(-2));
  const committedStatus = await page.locator('#status').innerText();
  await angleInput.fill('120');
  await angleInput.press('Escape');
  await page.waitForTimeout(100);
  assert.equal(await angleInput.inputValue(), '45', 'Escape stellt den zuvor bestätigten Winkel nicht wieder her');
  assert.equal(await page.locator('#status').innerText(), committedStatus, 'Escape hat fälschlich eine Drehung bestätigt');
  const afterEscape = await page.evaluate(() => window.__silmoTutorialAllTransforms().at(-2));
  assert.ok(Math.abs(afterEscape.qx - committedAngle.qx) < 1e-6 &&
            Math.abs(afterEscape.qy - committedAngle.qy) < 1e-6 &&
            Math.abs(afterEscape.qz - committedAngle.qz) < 1e-6 &&
            Math.abs(afterEscape.qw - committedAngle.qw) < 1e-6,
            'Escape hat die Objektrotation verändert');
  await angleInput.blur();
  await page.waitForTimeout(200);
  const afterRingRotation = await page.evaluate(() => window.__silmoTutorialAllTransforms().at(-2));
  const selectedAfterRing = await page.locator('#objects .object-select[aria-pressed="true"]').evaluate(el => el.dataset.objectId);
  assert.equal(selectedAfterRing, selectedBeforeRing, 'Beim Ziehen des Drehrings wurde ein anderes Objekt ausgewählt');
  assert.ok(Math.abs(afterRingRotation.qx - beforeRingRotation.qx) > 0.01 ||
            Math.abs(afterRingRotation.qy - beforeRingRotation.qy) > 0.01 ||
            Math.abs(afterRingRotation.qz - beforeRingRotation.qz) > 0.01 ||
            Math.abs(afterRingRotation.qw - beforeRingRotation.qw) > 0.01,
            'Ziehen am Drehring verändert die Objektrotation nicht');
  await gizmoModeToggle.click();
  assert.equal(await gizmoModeToggle.getAttribute('aria-pressed'), 'false', 'Zurückschalten auf Verschieben funktioniert nicht');
  assert.equal(await page.evaluate(() => window.__silmoTutorialRotationRingPoint('z', 0.45)), null, 'Drehringe bleiben nach dem Zurückschalten aktiv');

  // Allgemeine CAD-Werkzeuge: keine produktgebundene Sonderfunktion, sondern wiederverwendbare Konstruktion.
  await page.locator('[data-tab="create"]').click();
  const createSubtabs=page.locator('#pane-create-left > .inner-tab-nav button');
  assert.equal(await createSubtabs.count(),2,'SketchUp-Modellieren muss Grundformen und Objektliste als zwei Unterreiter zeigen');
  assert.match(await createSubtabs.nth(0).innerText(),/Grundformen/,'Grundformen-Unterreiter fehlt');
  assert.match(await createSubtabs.nth(1).innerText(),/Objektliste/,'Objektliste-Unterreiter fehlt');
  // Der Modellieren-Bereich darf den zuletzt gewählten Unterreiter behalten.
  // Für die folgenden Grundformen-Prüfungen wird er ausdrücklich aktiviert.
  await createSubtabs.nth(0).click();
  assert.equal(await createSubtabs.nth(0).getAttribute('aria-selected'),'true','Grundformen-Unterreiter lässt sich nicht aktivieren');
  assert.equal(await page.locator('#pane-create-left .inner-tab-panel').nth(0).isVisible(),true,'Grundformen-Bereich ist nach Aktivierung nicht sichtbar');
  await showExpertBooleanTools();
  assert.equal(await page.locator('#pane-expert-left details.advanced-cad-tools').isVisible(),true,'Erweiterte Boolean-CAD-Werkzeuge fehlen im Expertenzentrum');
  await showCreateSubtab(0);
  for (const id of ['addCone','addHexPrism','addTorus']) assert.equal(await page.locator('#'+id).count(),1,`Allgemeines CAD-Grundwerkzeug ${id} fehlt`);
  const primitiveStart = await page.locator('#objects .object-row').count();
  await page.locator('#addCone').click(); await page.locator('#addHexPrism').click(); await page.locator('#addTorus').click();
  assert.equal(await page.locator('#objects .object-row').count(),primitiveStart+3,'Zusätzliche CAD-Grundkörper werden nicht erstellt');

  // Mathematische Referenzprüfung der neu ergänzten Grundkörper.
  // Die Abmessungen werden direkt aus der tatsächlich erzeugten BufferGeometry gelesen.
  const primitiveBounds = (await page.evaluate(() => window.__silmoTutorialModelAudit())).slice(-3);
  const expectedPrimitiveBounds = [
    { label: 'Kegel', size: [16, 16, 15] },
    { label: 'Sechskant-Prisma', size: [2 * 8.5 * Math.cos(Math.PI / 6), 17, 15] },
    { label: 'Ring / Torus', size: [16.6, 16.6, 3.6] }
  ];
  for (let i = 0; i < expectedPrimitiveBounds.length; i++) {
    const actual = primitiveBounds[i], expected = expectedPrimitiveBounds[i];
    assert.equal(actual.label, expected.label, 'Grundkörper-Reihenfolge oder Typ ist falsch');
    assert.ok(actual.vertexCount > 0, expected.label + ' enthält keine Geometriepunkte');
    for (const key of ['width', 'depth', 'height']) {
      const axis = key === 'width' ? 0 : key === 'depth' ? 1 : 2;
      assert.ok(Number.isFinite(actual[key]), expected.label + ' hat eine nicht endliche Ausdehnung');
      assert.ok(Math.abs(actual[key] - expected.size[axis]) < 1e-4,
        expected.label + ' hat eine falsche geometrische Ausdehnung (' + key +
        '): erwartet ' + expected.size[axis] + ' mm, erhalten ' + actual[key] + ' mm');
    }
  }
  await page.locator('[data-tab="draw"]').click();
  const drawSubtabs=page.locator('#pane-draw-left > .inner-tab-nav button');
  assert.equal(await drawSubtabs.count(),2,'v90: Unterreiter Zeichnen fehlen');
  await drawSubtabs.nth(1).click();
  assert.equal(await drawSubtabs.nth(1).getAttribute('aria-selected'),'true','v90: Kontur-Unterreiter wird nicht aktiviert');
  assert.equal(await page.locator('#pane-draw-left .inner-tab-panel').nth(0).isVisible(),false,'v90: Skizzieren bleibt trotz anderem Unterreiter sichtbar');
  assert.equal(await page.locator('#pane-draw-left .inner-tab-panel').nth(1).isVisible(),true,'v90: aktiver Kontur-Bereich ist nicht sichtbar');
  await showDrawRightSubtab(0); // Werkzeugtyp
  assert.equal(await page.locator('#sketchTool').isVisible(),true,'Freie Zeichenwerkzeuge sind nicht erreichbar');
  assert.equal(await page.locator('#cadSketchToolPalette button').count(),9,'Die CAD-Werkzeugpalette ist unvollständig');
  assert.equal(await page.locator('#pane-draw-right').isVisible(),true,'Das rechte CAD-Eigenschaftenpanel fehlt');
  await showDrawRightSubtab(1); // Masse und Position
  assert.equal(await page.locator('#sketchPositionXMM').isVisible(),true,'Exakte X-Position der Skizze fehlt');
  assert.equal(await page.locator('#sketchPositionYMM').isVisible(),true,'Exakte Y-Position der Skizze fehlt');
  await showDrawRightSubtab(4); // Profi-CAD
  const professionalCadDetails=page.locator('#pane-draw-right details').filter({hasText:'Professionelle CAD-Bearbeitung'});
  if (!(await professionalCadDetails.evaluate(el=>el.open))) await professionalCadDetails.locator('summary').click();
  for (const id of ['sketchConstraint','editSketchWidthMM','editSketchDepthMM','editSketchHeightMM','loadSketchDimensions','applySketchDimensions','sketchPointIndex','sketchPointXMM','sketchPointYMM','loadSketchPoints','applySketchPoint','edgeTreatmentMM','applyEdgeFillet','applyEdgeChamfer','createLoft','createSweep','cadRelationSelect','applySketchRelation','editPathLengthMM','loadPathLength','applyPathLength','objectDistanceAxis','objectDistanceMM','applyObjectDistance']) {
    assert.equal(await page.locator('#'+id).isVisible(),true, 'Professionelles CAD-Werkzeug '+id+' fehlt');
  }
  assert.match(await page.locator('#pane-draw-right').innerText(),/Masse/,'Skizzenparameter sind nicht übersichtlich gruppiert');
  assert.ok((await page.locator('#sketchTool option').allTextContents()).some(x=>/Freiform/.test(x)),'Freiform-Zeichenwerkzeug fehlt');
  await showDrawRightSubtab(3); // Wand und Kontur
  await page.locator('#pane-draw-right details').filter({hasText:'Wand und Kontur bearbeiten'}).locator('summary').click();
  assert.equal(await page.locator('#createContourFrame').isVisible(),true,'Allgemeines Kontur-Rahmenwerkzeug fehlt');
  assert.equal(await page.locator('#wallThicknessMM').inputValue(),'1.4','Standard-Wandstärke fehlt');
  assert.equal(await page.locator('#frameHeightMM').inputValue(),'12','Standard-Rahmenhöhe fehlt');
  assert.equal(await page.locator('#subtractSelected').isVisible(),true,'Allgemeines Abziehwerkzeug fehlt');
  assert.doesNotMatch(await page.locator('body').innerText(),/Handyhüllen-Konstruktion|Seitenwand-Rahmen/,'Die Oberfläche enthält noch produktgebundene Sonderfunktionen');
  const preciseSketchTest = await page.evaluate(() => window.__silmoTestCreatePreciselyPositionedSketch());
  assert.equal(preciseSketchTest.found,true,'Präzise platzierte Skizze wird nicht erstellt');
  assert.equal(preciseSketchTest.xMM,15,'Exakte X-Position der Skizze wird nicht übernommen');
  assert.equal(preciseSketchTest.yMM,-10,'Exakte Y-Position der Skizze wird nicht übernommen');
  assert.equal(preciseSketchTest.widthMM,20,'Exakte Skizzenbreite stimmt nicht');
  assert.equal(preciseSketchTest.depthMM,30,'Exakte Skizzentiefe stimmt nicht');
  const contourFrameTest = await page.evaluate(() => window.__silmoTestCreateContourFrame());
  assert.equal(contourFrameTest.frameFound,true,'Aus eigener Kontur wurde kein Hohlrahmen erzeugt');
  assert.equal(contourFrameTest.wallThicknessMM,1.4,'Hohlrahmen übernimmt die Wandstärke nicht');
  assert.equal(contourFrameTest.wallHeightMM,12,'Hohlrahmen übernimmt die Höhe nicht');
  assert.ok(contourFrameTest.geometryVertices>0,'Hohlrahmen enthält keine Geometrie');
  assert.ok((await page.locator('#sketchTool option').allTextContents()).some(x=>/Rundungen/.test(x)),'Werkzeug für abgerundete Rechtecke fehlt');
  assert.equal(await page.locator('#sketchCornerRadiusMM').inputValue(),'6','Eckenradius-Eingabe fehlt');
  const roundedShellTest = await page.evaluate(() => window.__silmoTestCreateRoundedShell());
  assert.equal(roundedShellTest.baseFound,true,'Abgerundete Kontur erzeugt keinen Grundkörper');
  assert.equal(roundedShellTest.frameFound,true,'Aus abgerundetem Grundkörper wird kein Hohlrahmen erzeugt');
  assert.equal(roundedShellTest.baseWidthMM,72,'Breite der abgerundeten Skizze stimmt nicht');
  assert.equal(roundedShellTest.baseDepthMM,150,'Tiefe der abgerundeten Skizze stimmt nicht');
  assert.equal(roundedShellTest.baseThicknessMM,2,'Dünne Extrusion / Bodenstärke stimmt nicht');
  assert.equal(roundedShellTest.wallThicknessMM,1.4,'Wandstärke des abgerundeten Rahmens stimmt nicht');
  assert.equal(roundedShellTest.wallHeightMM,12,'Höhe des abgerundeten Rahmens stimmt nicht');
  assert.ok(roundedShellTest.outlinePoints>=8,'Abgerundete Kontur wurde nicht ausreichend aufgelöst');
  assert.ok(roundedShellTest.frameVertices>0,'Abgerundeter Hohlrahmen enthält keine Geometrie');
  const pointEditTest=await page.evaluate(()=>window.__silmoTestEditSketchPoint());
  assert.equal(pointEditTest.pointCount,4,'Skizzenpunkt-Editor lädt nicht alle vier Rechteckpunkte');
  assert.ok(Math.abs(pointEditTest.newXMM-pointEditTest.oldXMM+2)<0.01,'Konturpunkt-X wurde nicht exakt angepasst');
  assert.ok(pointEditTest.widthMM>21.9&&pointEditTest.widthMM<22.1,'Geometrie wurde nach Punktänderung nicht neu aufgebaut');
  assert.ok(pointEditTest.vertices>0,'Punktbearbeitung erzeugt keine 3D-Geometrie');
  const proCadTest=await page.evaluate(()=>window.__silmoTestRunProCad());
  for (const key of ['dimensionOK','filletOK','chamferOK','loftOK','hollowLoftOK','sweepOK']) assert.equal(proCadTest[key],true,'Professionelle CAD-Funktion '+key+' funktioniert nicht');
  for (const [axis,expected] of Object.entries({x:30,y:25,z:4})) assert.ok(Math.abs(proCadTest.dimensionsMM[axis]-expected)<0.01,'Skizzen-Extrusion hat falsche '+axis.toUpperCase()+'-Abmessung: '+proCadTest.dimensionsMM[axis]+' mm statt '+expected+' mm');
  assert.ok(proCadTest.loftVertices>0&&proCadTest.hollowLoftVertices>0&&proCadTest.sweepVertices>0,'Loft/Hohl-Loft/Sweep erzeugt keine Geometrie');
  const loftTopologyTest = await page.evaluate(() => {
    const makeRing = (radius, z, reverse = false) => {
      const points = [
        new THREE.Vector3(-radius, -radius, z),
        new THREE.Vector3(radius, -radius, z),
        new THREE.Vector3(radius, radius, z),
        new THREE.Vector3(-radius, radius, z)
      ];
      return reverse ? points.reverse() : points;
    };
    const outerA = makeRing(2, 0), outerB = makeRing(2, 3, true);
    const holeA = makeRing(1, 0, true), holeB = makeRing(1, 3);
    const geometry = window.SILMOSketchGeometry.createLoftGeometry(
      outerA, outerB, { holesA: [holeA], holesB: [holeB] }
    );
    try {
      const p = geometry.attributes.position.array;
      let volume = 0;
      for (let i = 0; i < p.length; i += 9) {
        const ax=p[i], ay=p[i+1], az=p[i+2];
        const bx=p[i+3], by=p[i+4], bz=p[i+5];
        const cx=p[i+6], cy=p[i+7], cz=p[i+8];
        volume += (ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6;
      }
      return { volume: Math.abs(volume), vertices: geometry.attributes.position.count };
    } finally {
      geometry.dispose();
    }
  });
  assert.ok(Math.abs(loftTopologyTest.volume - 36) < 1e-4,
    'Loft mit geneigten/umgekehrten Konturen und Innenloch hat falsches Volumen: '+loftTopologyTest.volume);
  assert.ok(loftTopologyTest.vertices > 0, 'Loft-Innenloch erzeugt kein Mesh');
  const relationTest=await page.evaluate(()=>window.__silmoTestRunSketchRelations());
  for (const key of ['parallelOK','perpendicularOK','tangentOK','concentricOK','lengthOK','distanceOK']) assert.equal(relationTest[key],true,'Skizzenbedingung/Bemaßung '+key+' funktioniert nicht');

  // Hohl-Loft-Metadaten müssen Speichern und erneutes Öffnen überstehen.
  await page.locator('[data-tab="project"]').click();
  await page.locator('#pane-project-left > .inner-tab-nav button').nth(0).click();
  const hollowLoftDownloadPromise=page.waitForEvent('download');
  await page.locator('#saveProjectButton').click();
  const hollowLoftDownload=await hollowLoftDownloadPromise;
  const hollowLoftSavedPath=await hollowLoftDownload.path();
  const hollowLoftProject=JSON.parse(readFileSync(hollowLoftSavedPath,'utf8'));
  const savedHollowLoft=hollowLoftProject.objects.find(item=>item.loft?.innerContourCount===1);
  assert.ok(savedHollowLoft,'Projektdatei speichert keine Hohl-Loft-Metadaten');
  assert.equal(savedHollowLoft.loft.sourceHoles.length,1,'Innenkontur-Zuordnung fehlt in der Projektdatei');
  const hollowLoftRoundTripPage=await browser.newPage();
  await hollowLoftRoundTripPage.goto(page.url());
  await hollowLoftRoundTripPage.waitForFunction(()=>typeof window.SILMOProjectSchema?.validateProjectEnvelope==='function',null,{timeout:15000});
  await hollowLoftRoundTripPage.locator('[data-tab="project"]').click();
  await hollowLoftRoundTripPage.locator('#projectFileInput').setInputFiles(hollowLoftSavedPath);
  await hollowLoftRoundTripPage.waitForFunction(()=>window.__silmoLoftMetadataSnapshot?.().some(item=>item.innerContourCount===1&&item.sourceHoleCount===1&&item.sourceReferencesResolve),null,{timeout:15000});
  const restoredHollowLoft=await hollowLoftRoundTripPage.evaluate(()=>window.__silmoLoftMetadataSnapshot());
  assert.ok(restoredHollowLoft.some(item=>item.innerContourCount===1&&item.sourceHoleCount===1&&item.sourceReferencesResolve),
    'Projektimport stellt die Hohl-Loft-Zuordnung oder Quellprofil-IDs nicht wieder her');
  await hollowLoftRoundTripPage.close();

  // Eine einzelne Freiform-Skizze erhält echte Innenlöcher samt editierbaren Konturdaten.
  const sketchHolePage=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
  await sketchHolePage.goto(page.url(),{waitUntil:'domcontentloaded'});
  await sketchHolePage.waitForSelector('#viewport canvas',{timeout:20000});
  const sketchHoleResult=await sketchHolePage.evaluate(()=>window.__silmoImageStudioCreateFromPoints(
    [[0,0],[40,0],[40,30],[0,30]],10,
    [[[10,10],[10,20],[20,20],[20,10]]]
  ));
  assert.equal(sketchHoleResult.ok,true,'Freiform mit Innenloch konnte nicht erstellt werden: '+(sketchHoleResult.message||''));
  const sketchHoleSnapshot=await sketchHolePage.evaluate(()=>window.__silmoSketchHoleMetadataSnapshot());
  assert.ok(sketchHoleSnapshot.some(item=>item.holeCount===1&&item.outerPointCount>=3),'Einzelne Skizze speichert die Innenkontur nicht');
  const invalidSketchHole=await sketchHolePage.evaluate(()=>window.__silmoImageStudioCreateFromPoints(
    [[0,0],[40,0],[40,30],[0,30]],10,
    [[[50,50],[50,55],[55,55],[55,50]]]
  ));
  assert.equal(invalidSketchHole.ok,false,'Innenloch ausserhalb der Aussenkontur wurde akzeptiert');
  await sketchHolePage.locator('[data-tab="project"]').click();
  await sketchHolePage.locator('#pane-project-left > .inner-tab-nav button').nth(0).click();
  const sketchHoleDownloadPromise=sketchHolePage.waitForEvent('download',{timeout:10000});
  await sketchHolePage.locator('#saveProjectButton').click();
  const sketchHoleDownload=await sketchHoleDownloadPromise;
  const sketchHolePath=await sketchHoleDownload.path();
  const sketchHoleProject=JSON.parse(readFileSync(sketchHolePath,'utf8'));
  assert.ok(sketchHoleProject.objects.some(item=>item.sketch?.type==='freeform2d'&&item.sketch.holes?.length===1),
    'Projektdatei speichert die editierbaren Innenkonturen nicht');
  const sketchHoleReload=await browser.newPage({viewport:{width:1280,height:900}});
  await sketchHoleReload.goto(page.url(),{waitUntil:'domcontentloaded'});
  await sketchHoleReload.waitForSelector('#viewport canvas',{timeout:20000});
  await sketchHoleReload.locator('#projectFileInput').setInputFiles(sketchHolePath);
  await sketchHoleReload.waitForFunction(()=>window.__silmoSketchHoleMetadataSnapshot?.().some(item=>item.holeCount===1),null,{timeout:15000});
  await sketchHoleReload.close();
  const editedHole=await sketchHolePage.evaluate(()=>window.__silmoTestEditSketchHolePoint());
  assert.equal(editedHole.holeCount,1,'Innenloch ging bei der Punktbearbeitung verloren');
  assert.ok(editedHole.pointXMM< -19,'Innenloch-Punkt wurde nach Massstabsänderung nicht verändert');
  assert.ok(editedHole.outerPointXMM< -40,'Aussenkontur-Punkt wurde nach Massstabsänderung nicht verändert');
  assert.equal(editedHole.holeCount,1,'Innenloch ging bei der anschliessenden Aussenkonturbearbeitung verloren');
  assert.ok(editedHole.vertices>0,'Bearbeitete Skizze besitzt keine Geometrie');
  const contourPointCounts=await sketchHolePage.evaluate(()=>window.__silmoTestInsertDeleteSketchContourPoint());
  assert.equal(contourPointCounts.afterInsert,5,'Neuer Punkt wurde nicht in die Innenkontur eingefügt');
  assert.equal(contourPointCounts.afterDelete,4,'Punkt wurde nicht korrekt aus der Innenkontur entfernt');
  assert.equal(contourPointCounts.holeCount,1,'Innenloch ging beim Einfügen/Entfernen verloren');
  assert.ok(contourPointCounts.vertices>0,'Kontur besitzt nach Punktbearbeitung keine Geometrie');
  const removedHole=await sketchHolePage.evaluate(()=>window.__silmoTestRemoveSketchHole());
  assert.equal(removedHole.holeCount,0,'Innenloch wurde nicht vollständig entfernt');
  assert.equal(removedHole.outerPointCount,4,'Aussenkontur wurde beim Entfernen eines Innenlochs beschädigt');
  assert.ok(removedHole.vertices>0,'Körper ohne Innenloch besitzt keine gültige Geometrie');
  const editableLoft=await sketchHolePage.evaluate(()=>window.__silmoTestUpdateLoftFromSources());
  assert.ok(editableLoft.sourceReferencesResolve,'Loft-Quellprofile konnten nicht wiedergefunden werden');
  assert.ok(editableLoft.afterMaxZ>editableLoft.beforeMaxZ,'Loft wurde nach Änderung eines Quellprofils nicht aktualisiert');
  assert.ok(editableLoft.vertices>0,'Aktualisiertes Loft besitzt keine Geometrie');
  await sketchHolePage.close();
  await page.locator('[data-tab="draw"]').click();

  // SILMO Image Studio Phase 1: separater Arbeitsbereich, Import, Rotation,
  // persistente Vorlagendaten und Übergabe an die bestehende CAD-Freiform.
  assert.equal(await page.locator('#imageStudioWorkspace').isVisible(),false,'Image Studio ist beim Start unerwartet geöffnet');
  await page.locator('#imageStudioLaunch').click();
  const imageSubtabs=page.locator('#imageStudioWorkspace .isw-tools > .inner-tab-nav button');
  assert.equal(await imageSubtabs.count(),4,'v90: Unterreiter Bildvorlage, Grösse, Erkennung und 3D fehlen');
  await imageSubtabs.nth(2).click();
  assert.equal(await imageSubtabs.nth(2).getAttribute('aria-selected'),'true','v90: Erkennungs-Unterreiter wird nicht aktiviert');
  assert.equal(await page.locator('#imageStudioWorkspace .isw-tools .inner-tab-panel').nth(0).isVisible(),false,'v90: Vorlage bleibt trotz anderem Unterreiter sichtbar');
  assert.equal(await page.locator('#imageStudioWorkspace .isw-tools .inner-tab-panel').nth(2).isVisible(),true,'v90: aktiver Erkennungs-Bereich ist nicht sichtbar');
  assert.equal(await page.locator('#imageStudioWorkspace').isVisible(),true,'Image Studio lässt sich nicht öffnen');
  assert.equal(await page.locator('#imageStudioSensitivity').inputValue(),'55','v87: Standard-Empfindlichkeit fehlt');
  await page.locator('#imageStudioSensitivity').evaluate(el=>{el.value='80';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('#imageStudioSensitivityValue').innerText(),'80 %','v87: Empfindlichkeitsanzeige aktualisiert sich nicht');
  const cadLayout=await page.evaluate(()=>({
    grid:getComputedStyle(document.querySelector('main')).gridTemplateColumns,
    headerHeight:getComputedStyle(document.querySelector('header')).height,
    tabBackground:getComputedStyle(document.querySelector('.tool-tabs')).backgroundColor,
    viewportBackground:getComputedStyle(document.querySelector('#viewport')).backgroundImage
  }));
  assert.match(cadLayout.grid,/252px/,'v88: CAD-Linkspanel hat nicht die erwartete Breite');
  assert.match(cadLayout.headerHeight,/54px/,'v88: kompakte CAD-Kopfzeile fehlt');
  assert.ok(cadLayout.viewportBackground.includes('linear-gradient'),'v88: technisches Raster im Arbeitsbereich fehlt');
  await page.locator('#imageStudioSensitivity').evaluate(el=>{el.value='55';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const tinyPng='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=';
  await page.evaluate(async data => {
    await window.__silmoImageStudioImport({version:1,fileName:'test.png',dataUrl:data,widthMM:20,rotation:0,contours:[[[0,0],[1,0],[1,1],[0,1]]]});
  },tinyPng);
  assert.equal((await page.evaluate(()=>window.__silmoImageStudioSnapshot())).loaded,true,'Bildvorlage konnte nicht geladen werden');
  const autoOutlineData=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=100;c.height=80;const x=c.getContext('2d');
    x.fillStyle='#ffffff';x.fillRect(0,0,100,80);x.fillStyle='#202020';x.fillRect(25,15,50,50);
    return c.toDataURL('image/png');
  });
  const autoOutline=await page.evaluate(data=>window.__silmoImageStudioAutoTraceTest(data),autoOutlineData);
  assert.ok(autoOutline.length>=4&&autoOutline.length<=240,'Automatische Konturhilfe liefert keine kompakte Aussenkontur');
  assert.ok(autoOutline.some(p=>Math.abs(p[0]-25)<3&&Math.abs(p[1]-15)<3),'Automatische Konturhilfe erkennt die Motivkante nicht');
  // v79: Kürbis-Testbild mit eigenem Stiel sowie getrennten Augen und Mund.
  const pumpkinData=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=120;c.height=100;const x=c.getContext('2d');
    x.fillStyle='#ffffff';x.fillRect(0,0,120,100);
    x.fillStyle='#f28a18';x.beginPath();x.ellipse(60,59,35,29,0,0,Math.PI*2);x.fill();
    x.fillStyle='#398b35';x.fillRect(52,12,16,22);
    x.fillStyle='#171717';x.beginPath();x.moveTo(43,47);x.lineTo(51,57);x.lineTo(35,57);x.closePath();x.fill();
    x.beginPath();x.moveTo(77,47);x.lineTo(85,57);x.lineTo(69,57);x.closePath();x.fill();
    x.beginPath();x.moveTo(40,68);x.lineTo(80,68);x.lineTo(72,81);x.lineTo(60,85);x.lineTo(48,81);x.closePath();x.fill();
    return c.toDataURL('image/png');
  });
  const pumpkinContours=await page.evaluate(data=>window.__silmoImageStudioAutoTraceAllTest(data),pumpkinData);
  assert.ok(pumpkinContours.length>=4,'v79 erkennt nicht mehrere getrennte Kürbis-Details (Stiel/Augen/Mund)');
  const pumpkinMain=pumpkinContours[pumpkinContours.length-1];
  assert.ok(Math.min(...pumpkinMain.map(p=>p[1]))<15,'v79 erkennt den oberen Stiel nicht in der Aussenkontur');
  assert.ok(pumpkinMain.length>=6,'v79 erhält keine ausreichend detaillierte Kürbis-Aussenkontur');

  await page.locator('#imageStudioAutoTrace').click();
  assert.equal((await page.evaluate(()=>window.__silmoImageStudioSnapshot())).contourCount,1,'Automatischer Konturvorschlag wird nicht im Image Studio gespeichert');
  assert.equal((await page.evaluate(()=>window.__silmoImageStudioSnapshot())).widthMM,20,'Bildbreite wird nicht gespeichert');
  await imageSubtabs.nth(1).click(); // Grösse und Ansicht
  await page.locator('#imageStudioRotate').click();
  assert.equal((await page.evaluate(()=>window.__silmoImageStudioSnapshot())).rotation,90,'Bildrotation funktioniert nicht');
  const imageState=await page.evaluate(()=>window.__silmoImageStudioExport());
  assert.equal(imageState.fileName,'test.png','Bilddatei-Metadaten werden nicht exportiert');
  assert.ok(imageState.dataUrl.startsWith('data:image/png;base64,'),'Bilddaten werden nicht in Projektstruktur eingebettet');
  await imageSubtabs.nth(3).click(); // Kontur und 3D
  await page.locator('#imageStudioCreate3D').click();
  assert.match(await page.locator('#imageStudioStatus').innerText(),/3D-Körper erstellt/,'Bildkontur wird nicht in einen vorhandenen CAD-Körper übertragen');
  assert.equal(await page.locator('#imageStudioWorkspace').isVisible(),false,'Image Studio schliesst nach erfolgreicher CAD-Übertragung nicht');
  assert.ok((await page.locator('#objects .object-row').count())>0,'CAD-Übergabe hat kein Objekt erstellt');

  // Projektformat v3: echtes Fixture laden und unbekannte Version atomar ablehnen.
  const validationPage = await browser.newPage({viewport:{width:1280,height:900}});
  const validationPageErrors = [];
  validationPage.on('pageerror', error => validationPageErrors.push(error.message));
  await validationPage.goto('http://127.0.0.1:4173', {waitUntil:'domcontentloaded'});
  await validationPage.waitForSelector('#viewport canvas', {timeout:20000});
  const projectFixture = readFileSync(new URL('./fixtures/project-v3-minimal.json', import.meta.url));
  await validationPage.locator('#projectFileInput').setInputFiles({name:'project-v3-minimal.json',mimeType:'application/json',buffer:projectFixture});
  await validationPage.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Projekt geöffnet (1 Objekt(e))'), null, {timeout:5000});
  assert.equal(await validationPage.locator('#objects .object-row').count(),1,'Projektformat-v3-Fixture wurde nicht korrekt geladen');
  assert.match(await validationPage.locator('#objects').innerText(),/Fixture Würfel v3/,'Projektformat-v3-Fixture hat den falschen Objektinhalt');
  const unsupportedProject = JSON.parse(projectFixture.toString('utf8'));
  unsupportedProject.version = 4;
  await validationPage.locator('#projectFileInput').setInputFiles({name:'unsupported-project-v4.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(unsupportedProject))});
  await validationPage.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Nicht unterstützte Projektversion 4'), null, {timeout:5000});
  assert.equal(await validationPage.locator('#objects .object-row').count(),1,'Ungültige Projektversion hat das bestehende Projekt verändert');
  assert.match(await validationPage.locator('#objects').innerText(),/Fixture Würfel v3/,'Ungültige Projektversion hat das geladene v3-Projekt ersetzt');
  assert.deepEqual(validationPageErrors,[],'Projektformat-v3-Fixture löst Browserfehler aus');
  await validationPage.close();

  // Erweitertes v3-Fixture: Gruppen, Boolesche Ursprungsformen, Skizzenkontur,
  // Konturrahmen und gespeicherte Image-Studio-Vorlage müssen erhalten bleiben.
  // Dieser isolierte Browserkontext muss Downloads explizit erlauben.
  // Die übrigen Tests bleiben unverändert; der Download wird weiterhin vollständig geprüft.
  const advancedContext = await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  const advancedPage = await advancedContext.newPage();
  const advancedErrors = [];
  advancedPage.on('pageerror', error => advancedErrors.push(error.message));
  advancedPage.on('console', message => { if(message.type()==='error') advancedErrors.push('console: '+message.text()); });
  await advancedPage.goto('http://127.0.0.1:4173', {waitUntil:'domcontentloaded'});
  await advancedPage.waitForSelector('#viewport canvas', {timeout:20000});
  const advancedFixture = readFileSync(new URL('./fixtures/project-v3-advanced.json', import.meta.url));
  await advancedPage.locator('#projectFileInput').setInputFiles({name:'project-v3-advanced.json',mimeType:'application/json',buffer:advancedFixture});
  await advancedPage.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Projekt geöffnet (3 Objekt(e))'), null, {timeout:10000});
  await advancedPage.waitForFunction(() => window.__silmoImageStudioSnapshot?.().loaded === true, null, {timeout:10000});
  assert.equal(await advancedPage.locator('#objects .object-row').count(),3,'Erweitertes v3-Fixture hat nicht alle drei Objekte geladen');
  const advancedImageState = await advancedPage.evaluate(() => window.__silmoImageStudioSnapshot());
  assert.equal(advancedImageState.fileName,'fixture-image.png','Image-Studio-Dateiname wurde nicht geladen');
  assert.equal(advancedImageState.rotation,90,'Image-Studio-Drehung wurde nicht geladen');
  assert.equal(advancedImageState.contourCount,1,'Image-Studio-Kontur wurde nicht geladen');
  // Die Speichern-Funktion liegt im Projekt-Reiter. Den Projektdatei-Unterreiter öffnen,
  // dann sicherstellen, dass der Button wirklich sichtbar und anklickbar ist.
  await advancedPage.locator('[data-tab="project"]').click();
  await advancedPage.locator('#pane-project-left > .inner-tab-nav button').nth(0).click();
  await advancedPage.locator('#saveProjectButton').waitFor({state:'visible',timeout:5000});
  // Diagnose the browser's actual handling of the generated download link.
  await advancedPage.evaluate(() => {
    window.__silmoDownloadClicks = [];
    document.addEventListener('click', event => {
      const link = event.target instanceof Element ? event.target.closest('a[download]') : null;
      if (!link) return;
      const record = { href: link.href, download: link.download, trusted: event.isTrusted };
      queueMicrotask(() => {
        record.defaultPrevented = event.defaultPrevented;
        window.__silmoDownloadClicks.push(record);
      });
    }, true);
  });
  const advancedSavePromise = advancedPage.waitForEvent('download', {timeout:10000}).catch(() => null);
  await advancedPage.locator('#saveProjectButton').click();
  await advancedPage.waitForFunction(() => {
    const text = document.querySelector('#status')?.textContent || '';
    return /Vollständiges Projekt gespeichert|Projekt konnte nicht gespeichert werden/.test(text);
  }, null, {timeout:10000});
  const advancedSaveStatus = await advancedPage.locator('#status').innerText();
  assert.equal(advancedSaveStatus, 'Vollständiges Projekt gespeichert',
    'Erweitertes Projekt konnte nicht gespeichert werden: ' + advancedSaveStatus +
    (advancedErrors.length ? ' | Browserfehler: ' + advancedErrors.join(' ; ') : ''));
  const advancedSave = await advancedSavePromise;
  if (!advancedSave) {
    const downloadDiagnostics = await advancedPage.evaluate(() => ({
      clicks: window.__silmoDownloadClicks || [],
      remainingDownloadLinks: Array.from(document.querySelectorAll('a[download]')).map(link => ({
        href: link.href, download: link.download
      }))
    }));
    assert.ok(advancedSave, 'Kein Browser-Download trotz erfolgreicher Statusmeldung. Download-Diagnose: ' + JSON.stringify(downloadDiagnostics));
  }
  const advancedSavedPath = await advancedSave.path();
  assert.ok(advancedSavedPath && statSync(advancedSavedPath).size > 1000,'Erweitertes Projekt wurde nicht vollständig gespeichert');
  const advancedSavedProject = JSON.parse(readFileSync(advancedSavedPath,'utf8'));
  assert.deepEqual(advancedSavedProject.objects.slice(0,2).map(item => item.groupId),['fixture-gruppe-01','fixture-gruppe-01'],'Gruppenzugehörigkeit ging beim Speichern verloren');
  assert.equal(advancedSavedProject.objects[2].unionParts.length,2,'Ursprüngliche Teile der verbundenen Form gingen verloren');
  assert.equal(advancedSavedProject.objects[2].sketchOutline.length,4,'Skizzenkontur ging beim Speichern verloren');
  assert.deepEqual(advancedSavedProject.objects[2].contourFrame,{wallThicknessMM:1.2,wallHeightMM:12},'Konturrahmen-Metadaten gingen beim Speichern verloren');
  assert.equal(advancedSavedProject.imageStudio.fileName,'fixture-image.png','Image-Studio-Datei ging beim Speichern verloren');
  assert.equal(advancedSavedProject.imageStudio.rotation,90,'Image-Studio-Drehung ging beim Speichern verloren');
  assert.equal(advancedSavedProject.imageStudio.contours.length,1,'Image-Studio-Kontur ging beim Speichern verloren');
  assert.deepEqual(advancedErrors,[],'Erweitertes v3-Fixture löst Browserfehler aus');
  await advancedContext.close();

  // Vertikaler Referenzablauf: gespeichertes Projekt erneut öffnen und als STL exportieren.
  assert.ok(savedProject.objects.length > 0,'Referenzprojekt enthält keine Modellobjekte');
  const roundTripPage = await browser.newPage({viewport:{width:1280,height:900}});
  const roundTripErrors = [];
  roundTripPage.on('pageerror', error => roundTripErrors.push(error.message));
  roundTripPage.on('console', message => {
    if(message.type()==='error' && !message.text().includes('Positionsdaten müssen das itemSize 3 haben')) {
      roundTripErrors.push('console: '+message.text());
    }
  });
  await roundTripPage.goto('http://127.0.0.1:4173', {waitUntil:'domcontentloaded'});
  await roundTripPage.waitForSelector('#viewport canvas', {timeout:20000});
  await roundTripPage.locator('#projectFileInput').setInputFiles(savedProjectPath);
  await roundTripPage.waitForFunction(() => /^Projekt geöffnet/.test(document.querySelector('#status')?.textContent || ''), null, {timeout:10000});
  assert.equal(await roundTripPage.locator('#objects .object-row').count(),savedProject.objects.length,'Gespeichertes Projekt wurde nicht vollständig wiederhergestellt');

  // Ungültige Geometriedaten dürfen das bereits geöffnete Projekt nicht ersetzen.
  const invalidGeometryProject = structuredClone(savedProject);
  invalidGeometryProject.objects[0].geometry.attributes.position.itemSize = 2;
  await roundTripPage.locator('#projectFileInput').setInputFiles({
    name: 'invalid-geometry.silmo.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(invalidGeometryProject))
  });
  await roundTripPage.waitForFunction(() => /Projekt konnte nicht geöffnet werden/.test(document.querySelector('#status')?.textContent || ''), null, {timeout:10000});
  assert.match(await roundTripPage.locator('#status').innerText(),/Positionsdaten müssen das itemSize 3 haben/,'Ungültige Positionsdaten werden nicht mit einer klaren Meldung abgewiesen');
  assert.equal(await roundTripPage.locator('#objects .object-row').count(),savedProject.objects.length,'Ungültige Geometriedaten haben das zuvor geöffnete Projekt verändert');

  await roundTripPage.locator('[data-tab="project"]').click();
  await roundTripPage.locator('#pane-project-left > .inner-tab-nav button').nth(2).click();
  await roundTripPage.waitForFunction(() => typeof window.THREE?.STLExporter === 'function', null, {timeout:15000});
  const roundTripExportPromise = roundTripPage.waitForEvent('download',{timeout:5000}).catch(() => null);
  await roundTripPage.locator('#exportModel').click();
  await roundTripPage.waitForFunction(() => /STL exportiert|STL-Export fehlgeschlagen|STL-Export konnte nicht geladen werden|Es gibt keine Objekte/.test(document.querySelector('#status')?.textContent || ''), null, {timeout:5000});
  const roundTripExportStatus = await roundTripPage.locator('#status').innerText();
  assert.match(roundTripExportStatus,/STL exportiert/,'STL-Export nach Projekt-Wiederöffnung fehlgeschlagen: '+roundTripExportStatus);
  const roundTripStl = await roundTripExportPromise;
  assert.ok(roundTripStl,'STL-Export meldet Erfolg, aber der Browser hat keinen Download erhalten');
  assert.match(roundTripStl.suggestedFilename(),/\.stl$/i,'STL-Export erzeugt keine STL-Datei');
  const roundTripStlPath = await roundTripStl.path();
  assert.ok(roundTripStlPath && statSync(roundTripStlPath).size > 84,'STL-Export enthält keine nutzbaren Geometriedaten');
  assert.deepEqual(roundTripErrors,[],'Projekt-Wiederöffnung oder STL-Export löst Browserfehler aus');
  await roundTripPage.close();

  assert.deepEqual(pageErrors, [], 'Browser meldet JavaScript- oder Konsolenfehler');
  console.log('BESTANDEN: 3D-Start, CAD-Zeichenarbeitsplatz, Werkzeugpalette, exakte Skizzenposition, Skizzenbearbeitung, Konturpunkt-Editor, Kantenbearbeitung, Loft, Sweep, Parallel/Senkrecht, Tangential/Konzentrisch, Pfadlänge und Objektabstand, Zeichnen, allgemeine CAD-Konstruktion, Verbinden und Trennen von Formen, Undo, Mehrfachauswahl, Ausrichten, Gruppieren, Spiegeln, Gruppierung aufheben, Gradzahl direkt am Würfel, Moduswechsel und Drehring.');
  console.log(JSON.stringify({ canvasSize, beforeAlign, afterAlign, selectedCount, alignStatus }));
} catch (error) {
  console.error('BROWSERTEST FEHLGESCHLAGEN:', error);
  if (pageErrors.length) console.error('BROWSERFEHLER:', pageErrors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
