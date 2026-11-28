import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.stack || error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.route('https://**/*', route => route.abort());

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#viewport canvas', { timeout: 20000 });
  // Shift-Achsenfang: Browser-Laufzeit muss die aktive Skizzenebene korrekt beschränken.
  const axisLockRuntime = await page.evaluate(() => {
    const constrain = window.SILMOInference?.constrainPointToPlaneAxis;
    if (typeof constrain !== 'function') return { available: false };
    return {
      available: true,
      xy: constrain([1, 2, 3], [4, 7, 3], [1, 0, 0], [0, 1, 0]),
      xz: constrain([1, 2, 3], [4, 7, 3], [1, 0, 0], [0, 0, 1]),
      yz: constrain([1, 2, 3], [4, 7, 6], [0, 1, 0], [0, 0, 1])
    };
  });
  assert.equal(axisLockRuntime.available, true, 'Shift-Achsenfang ist in der Browser-Laufzeit nicht geladen');
  assert.deepEqual(axisLockRuntime.xy, [1, 7, 3], 'XY-Achsenfang wählt nicht die dominante Bewegungsachse');
  assert.deepEqual(axisLockRuntime.xz, [4, 2, 3], 'XZ-Achsenfang wählt nicht die dominante Bewegungsachse');
  assert.deepEqual(axisLockRuntime.yz, [1, 7, 3], 'YZ-Achsenfang wählt nicht die dominante Bewegungsachse');

  // Echter Maus-/Tastatur-Ende-zu-Ende-Test: Shift während einer 2D-Linie halten.
  await page.locator('[data-tab="draw"]').click();
  await page.locator('#sketchPlaneSelect').selectOption('xy');
  await page.locator('#sketchTool').selectOption('line2d');
  await page.locator('#startSketch').click();
  await page.waitForTimeout(150);
  const axisDrag = await page.evaluate(() => ({
    start: window.__silmoSketchPointForTest(0.15, 0.15, 0),
    end: window.__silmoSketchPointForTest(0.75, 0.25, 0)
  }));
  assert.ok(axisDrag.start && axisDrag.end, 'Shift-Achsenfang-Testpunkte liegen nicht im sichtbaren Zeichenbereich');
  await page.mouse.move(axisDrag.start.x, axisDrag.start.y);
  await page.mouse.down();
  await page.keyboard.down('Shift');
  await page.mouse.move(axisDrag.end.x, axisDrag.end.y, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  const axisDraftDuringDrag = await page.evaluate(() => window.__silmoSketchDraftPointsSnapshot?.());
  assert.equal(axisDraftDuringDrag?.type, 'line2d', 'Shift-Test hat keine 2D-Linie gezeichnet');
  assert.equal(axisDraftDuringDrag?.points?.length, 2, 'Shift-Test-Linie enthält nicht genau zwei Endpunkte');
  const [axisStart, axisEnd] = axisDraftDuringDrag.points;
  assert.ok(Math.abs(axisEnd[0] - axisStart[0]) > 0.2, 'Shift-Achsenfang hat die dominante X-Bewegung blockiert: ' + JSON.stringify(axisDraftDuringDrag));
  assert.ok(Math.abs(axisEnd[1] - axisStart[1]) < 1e-5, 'Shift-Achsenfang hat die Linie nicht auf der X-Achse gehalten: ' + JSON.stringify(axisDraftDuringDrag));
  await page.locator('#cancelSketch').click();

  await page.locator('[data-tab="create"]').click();
  assert.equal((await page.locator('[data-tab="create"]').innerText()).trim(), 'Modellieren', 'Hauptreiter ist nicht als Modellieren beschriftet');
  assert.equal(await page.locator('#pane-create-left #booleanUnion').count(), 0, 'Boolesche CAD-Funktion befindet sich noch im normalen Modellierbereich');
  // Der neue Ein/Aus-Schalter blendet Spezialfunktionen wirklich aus und wieder ein.
  assert.match(await page.locator('#modeToggle').innerText(), /AUS/, 'Erweiterte Funktionen sind nicht standardmässig ausgeschaltet');
  assert.equal(await page.locator('#addOcctBox').isVisible(), false, 'OCCT-Spezialwerkzeug ist im Normalmodus sichtbar');
  assert.equal(await page.locator('#createContourFrame').isVisible(), false, 'Hohlrahmen-Werkzeug ist im Normalmodus sichtbar');
  assert.equal(await page.locator('#subtractSelected').isVisible(), false, 'Subtraktionswerkzeug ist im Normalmodus sichtbar');
  assert.equal(await page.locator('#occtFilletPanel').isVisible(), false, 'Alte OCCT-Flächen- und Kantenbearbeitung ist im Normalmodus sichtbar');
  await page.locator('#modeToggle').click();
  assert.match(await page.locator('#modeToggle').innerText(), /EIN/, 'Schalter zeigt den eingeschalteten Zustand nicht');
  await page.locator('[data-tab="create"]').click();
  const occtState = await page.locator('#addOcctBox').evaluate(el => ({ elementClass: el.className, bodyClass: document.body.className, display: getComputedStyle(el).display, visibility: getComputedStyle(el).visibility, paneClass: el.closest('.tab-pane')?.className, parentClass: el.parentElement?.className }));
  console.log('OCCT-SCHALTER-DIAGNOSE', JSON.stringify(occtState));
  assert.equal(await page.locator('#addOcctBox').isVisible(), true, 'OCCT-Spezialwerkzeug wird beim Einschalten im Modellieren-Reiter nicht eingeblendet: ' + JSON.stringify(occtState));
  assert.equal(await page.locator('#occtFilletPanel').isVisible(), true, 'OCCT-Flächen- und Kantenbearbeitung wird beim Einschalten nicht eingeblendet');
  await page.locator('[data-tab="draw"]').click();
  await page.locator('#pane-draw-right .inner-tab-nav button').filter({ hasText: 'Kontur' }).click();
  const wallGroup = page.locator('#pane-draw-right details.cad-group').filter({ hasText: 'Wand und Kontur bearbeiten' });
  if (!(await wallGroup.evaluate(el => el.open))) await wallGroup.locator('summary').click();
  assert.equal(await page.locator('#createContourFrame').isVisible(), true, 'Hohlrahmen-Werkzeug wird beim Einschalten im Eigenschaftenbereich Kontur nicht eingeblendet');
  assert.equal(await page.locator('#subtractSelected').isVisible(), true, 'Subtraktionswerkzeug wird beim Einschalten im Zeichnen-Reiter nicht eingeblendet');
  await page.locator('#modeToggle').click();
  await page.locator('[data-tab="create"]').click();
  assert.equal(await page.locator('#addOcctBox').isVisible(), false, 'OCCT-Spezialwerkzeug wird beim Ausschalten nicht ausgeblendet');
  assert.equal(await page.locator('#occtFilletPanel').isVisible(), false, 'OCCT-Flächen- und Kantenbearbeitung bleibt nach Ausschalten sichtbar');
  await page.locator('[data-tab="draw"]').click();
  assert.equal(await page.locator('#createContourFrame').isVisible(), false, 'Hohlrahmen-Werkzeug bleibt nach Ausschalten sichtbar');
  assert.equal(await page.locator('#subtractSelected').isVisible(), false, 'Subtraktionswerkzeug bleibt nach Ausschalten sichtbar');


  // Erweiterte CAD-Funktionen bleiben erreichbar, sind aber standardmässig im Expertenbereich.
  await page.locator('#expertCenterToggle').click();
  await page.locator('[data-tab="expert"]').waitFor({ state: 'visible' });
  const advancedCad = page.locator('#pane-expert-left details.advanced-cad-tools');
  await advancedCad.locator('summary').click();
  for (const id of ['booleanUnion', 'booleanSubtract', 'booleanIntersect', 'booleanSeparate']) {
    assert.equal(await page.locator('#' + id).isVisible(), true, id + ' ist im Expertenbereich nicht erreichbar');
  }
  await page.locator('#expertCenterToggle').click();
  assert.match(await page.locator('#modeToggle').innerText(), /AUS/, 'Expertenzentrum schliessen setzt den Schalter nicht zurück');
  assert.equal(await page.locator('#addOcctBox').isVisible(), false, 'Spezialwerkzeug bleibt nach Schliessen des Expertenzentrums sichtbar');
  await page.locator('[data-tab="create"]').click();
  // Der Würfel wird im Bereich Modellieren erstellt; die Flächenauswahl liegt im Bereich Zeichnen.
  
  // 1) Zeichenebene auf einer seitlichen Modellfläche ausrichten.
  await page.locator('#addCube').click();
  const faceObject = await page.evaluate(() => window.__silmoModelingTestSnapshot().selectedId);
  const facePoint = await page.evaluate(id => window.__silmoFaceSketchTestPoint?.(id), faceObject);
  assert.ok(facePoint, 'Keine sichtbare seitliche Würfelfläche für den Flächentest gefunden');
  await page.locator('[data-tab="draw"]').click();
  await page.waitForFunction(() => document.querySelector('#pane-draw-left')?.classList.contains('active-pane'));
  // Das Werkzeug liegt im linken Zeichenbereich. Falls der Browser die verschachtelte
  // Unterregister-Navigation noch nicht sichtbar gerendert hat, wird der echte Button-Handler
  // direkt ausgelöst; die Flächenauswahl selbst wird anschliessend per Maus geprüft.
  await page.locator('#pickFaceSketchPlane').evaluate(el => el.click());
  await page.mouse.click(facePoint.x, facePoint.y);
  let faceFrame = await page.evaluate(() => window.__silmoFaceSketchFrameSnapshot?.());
  assert.equal(faceFrame?.active, true, 'Seitliche Modellfläche wurde nicht als Zeichenebene übernommen');
  assert.ok(Math.max(Math.abs(faceFrame.normal[0]), Math.abs(faceFrame.normal[1])) > 0.5, 'Flächennormale zeigt nicht auf eine seitliche Fläche');
  const quaternionAxis = await page.evaluate(() => {
    const q = new THREE.Quaternion(...window.__silmoFaceSketchFrameSnapshot().quaternion);
    return new THREE.Vector3(0, 0, 1).applyQuaternion(q).toArray();
  });
  assert.ok(Math.hypot(
    quaternionAxis[0] - faceFrame.normal[0],
    quaternionAxis[1] - faceFrame.normal[1],
    quaternionAxis[2] - faceFrame.normal[2]
  ) < 1e-5, 'Extrusionsachse ist nicht korrekt auf die gewählte Fläche ausgerichtet');

  // Vollständiger Mini-Ablauf: Rechteck auf der gewählten Seitenfläche zeichnen
  // und als Körper extrudieren. Die Dicke muss entlang der Flächennormalen liegen.
  await page.locator('#pane-draw-left .inner-tab-nav button').filter({ hasText: 'Skizzieren' }).click();
  await page.locator('#pane-draw-right .inner-tab-nav button').filter({ hasText: 'Werkzeug' }).click();
  await page.locator('#sketchTool').selectOption('rectangle');
  await page.locator('#startSketch').click();
  await page.waitForTimeout(700);
  assert.equal(await page.locator('#sketchEndpointSnapEnabled').isChecked(), true, 'Eckpunktfang ist nicht standardmässig aktiviert');
  assert.equal(await page.locator('#sketchIntersectionSnapEnabled').isChecked(), false, 'Optionaler Schnittpunktfang ist standardmässig eingeschaltet');
  await page.locator('#sketchIntersectionSnapEnabled').check();
  assert.equal((await page.evaluate(() => window.__silmoEndpointSnapSnapshot?.()))?.intersectionSnapEnabled, true,
    'Schnittpunktfang wird nach dem Einschalten im Laufzeitstatus nicht als aktiviert gemeldet');
  const intersectionRuntime = await page.evaluate(() => {
    const find = window.SILMOInference?.findSegmentIntersections;
    if (typeof find !== 'function') return { available: false, intersections: [] };
    const horizontal = {
      start: { screenX: 0, screenY: 5, world: [0, 5, 0] },
      end: { screenX: 10, screenY: 5, world: [10, 5, 0] }
    };
    const vertical = {
      start: { screenX: 5, screenY: 0, world: [5, 0, 0] },
      end: { screenX: 5, screenY: 10, world: [5, 10, 0] }
    };
    const intersections = find([horizontal, vertical], { maxWorldSeparation: 0.0001 });
    return { available: true, intersections };
  });
  assert.equal(intersectionRuntime.available, true, 'Schnittpunkt-Erkennung ist im Browser nicht geladen');
  assert.equal(intersectionRuntime.intersections.length, 1,
    'Browser-Laufzeit erkennt den Kreuzungspunkt zweier räumlich passender Modellkanten nicht: ' + JSON.stringify(intersectionRuntime));
  assert.ok(Math.hypot(
    intersectionRuntime.intersections[0].world[0] - 5,
    intersectionRuntime.intersections[0].world[1] - 5,
    intersectionRuntime.intersections[0].world[2]
  ) < 1e-8, 'Browser-Laufzeit liefert eine falsche Weltposition für den Schnittpunkt');
  await page.locator('#sketchIntersectionSnapEnabled').uncheck();
  const snapTarget = await page.evaluate(() => window.__silmoEndpointSnapTestPoint?.());
  assert.ok(snapTarget, 'Kein sichtbarer Eckpunkt auf der gewählten Zeichenfläche gefunden: ' + JSON.stringify(await page.evaluate(() => window.__silmoEndpointSnapSnapshot?.())));
  await page.mouse.move(snapTarget.x + 5, snapTarget.y + 4);
  await page.mouse.down();
  const snapState = await page.evaluate(() => ({
    state: window.__silmoEndpointSnapSnapshot?.(),
    start: window.__silmoSketchStartSnapshot?.()
  }));
  assert.equal(snapState.state?.visible, true, 'Eckpunktfang-Marker wird beim Einrasten nicht angezeigt');
  assert.ok(snapState.state?.snappedWorld && Math.hypot(
    snapState.state.snappedWorld[0] - snapTarget.world[0],
    snapState.state.snappedWorld[1] - snapTarget.world[1],
    snapState.state.snappedWorld[2] - snapTarget.world[2]
  ) < 1e-5, 'Zeichenstart wurde nicht auf den sichtbaren Modell-Eckpunkt eingerastet');
  await page.mouse.up();
  await page.locator('#cancelSketch').click();

  // Separater Test für Kantenmitten: Eckpunktfang aus, Kantenmittefang an.
  await page.locator('#sketchEndpointSnapEnabled').uncheck();
  await page.locator('#sketchMidpointSnapEnabled').check();
  const midpointTarget = await page.evaluate(() => window.__silmoEndpointSnapTestPoint?.('midpoint'));
  assert.ok(midpointTarget, 'Keine sichtbare scharfe Kantenmitte auf der Zeichenfläche gefunden: ' + JSON.stringify(await page.evaluate(() => window.__silmoEndpointSnapSnapshot?.())));
  await page.locator('#startSketch').click();
  await page.waitForTimeout(300);
  await page.mouse.move(midpointTarget.x + 4, midpointTarget.y + 3);
  await page.mouse.down();
  const midpointState = await page.evaluate(() => window.__silmoEndpointSnapSnapshot?.());
  assert.equal(midpointState?.visible, true, 'Kantenmittefang-Marker wird nicht angezeigt');
  assert.ok(midpointState.snappedWorld && Math.hypot(
    midpointState.snappedWorld[0] - midpointTarget.world[0],
    midpointState.snappedWorld[1] - midpointTarget.world[1],
    midpointState.snappedWorld[2] - midpointTarget.world[2]
  ) < 1e-5, 'Zeichenstart wurde nicht auf die Kantenmitte eingerastet');
  await page.mouse.up();
  await page.locator('#cancelSketch').click();
  await page.locator('#sketchEndpointSnapEnabled').check();
  await page.locator('#sketchMidpointSnapEnabled').uncheck();

  // cancelSketch setzt die Flächenmodus-Markierung zurück. Für diesen
  // unabhängigen Durchlauf wird die Seitenfläche deshalb erneut ausgewählt,
  // damit die getesteten Modellkanten tatsächlich in der Zeichenebene liegen.
  const edgeFacePoint = await page.evaluate(id => window.__silmoFaceSketchTestPoint?.(id), faceObject);
  assert.ok(edgeFacePoint, 'Keine Seitenfläche für den Kantenprojektionstest gefunden');
  await page.locator('#pickFaceSketchPlane').click();
  await page.mouse.click(edgeFacePoint.x, edgeFacePoint.y);
  const edgeFaceFrame = await page.evaluate(() => window.__silmoFaceSketchFrameSnapshot?.());
  assert.equal(edgeFaceFrame?.active, true, 'Seitenfläche wurde für die Kantenprojektion nicht aktiviert');

  // Kantenprojektion: Eckpunkt- und Mittelpunktfang aus, Projektion auf eine
  // beliebige Position entlang einer sichtbaren Kante allein aktiv.
  await page.locator('#sketchEndpointSnapEnabled').uncheck();
  await page.locator('#sketchMidpointSnapEnabled').uncheck();
  await page.locator('#sketchEdgeProjectionSnapEnabled').check();
  await page.locator('#startSketch').click();
  await page.waitForTimeout(300);
  // startSketch kann die Kamera auf die Zeichenebene ausrichten. Das Testziel
  // deshalb erst danach berechnen, damit Mausposition und Projektion dieselbe
  // aktuelle Kamerapose verwenden.
  const edgeProjectionTarget = await page.evaluate(() => window.__silmoEndpointSnapTestSegment?.());
  assert.ok(edgeProjectionTarget?.visible, 'Keine sichtbare Modellkante für den Projektionstest gefunden: ' + JSON.stringify(edgeProjectionTarget));
  // Genau auf den bekannten Testpunkt zielen: Ein seitlicher Versatz entlang
  // der Kante verändert den korrekten Projektionsparameter und damit den Sollpunkt.
  await page.mouse.move(edgeProjectionTarget.x, edgeProjectionTarget.y);
  await page.mouse.down();
  const edgeProjectionState = await page.evaluate(() => window.__silmoEndpointSnapSnapshot?.());
  assert.equal(edgeProjectionState?.visible, true, 'Kantenprojektion zeigt keinen Fangmarker');
  const edgeProjectionError = edgeProjectionState.snappedWorld
    ? Math.hypot(
        edgeProjectionState.snappedWorld[0] - edgeProjectionTarget.world[0],
        edgeProjectionState.snappedWorld[1] - edgeProjectionTarget.world[1],
        edgeProjectionState.snappedWorld[2] - edgeProjectionTarget.world[2]
      )
    : Infinity;
  assert.ok(edgeProjectionError < 1e-5,
    'Zeichenstart wurde nicht auf die projizierte Position der Modellkante eingerastet: ' +
    JSON.stringify({ target: edgeProjectionTarget, snappedWorld: edgeProjectionState.snappedWorld, error: edgeProjectionError, debug: edgeProjectionState.debug }));
  await page.mouse.up();
  await page.locator('#cancelSketch').click();
  await page.locator('#sketchEndpointSnapEnabled').check();
  await page.locator('#sketchMidpointSnapEnabled').uncheck();
  await page.locator('#sketchEdgeProjectionSnapEnabled').uncheck();

  // Nach dem Snap-Test die aktuell sichtbare Seitenfläche neu bestimmen.
  // Der Kamerastand kann sich zwischen den beiden Skizzierdurchläufen unterscheiden.
  const extrusionFacePoint = await page.evaluate(id => window.__silmoFaceSketchTestPoint?.(id), faceObject);
  assert.ok(extrusionFacePoint, 'Keine aktuelle Seitenfläche für den Extrusionstest gefunden');
  await page.locator('#pickFaceSketchPlane').click();
  await page.mouse.click(extrusionFacePoint.x, extrusionFacePoint.y);
  faceFrame = await page.evaluate(() => window.__silmoFaceSketchFrameSnapshot?.());
  assert.equal(faceFrame?.active, true, 'Seitenfläche wurde vor dem Extrusionstest nicht erneut ausgewählt');
  assert.ok(Math.abs(Math.hypot(...faceFrame.normal) - 1) < 1e-5, 'Ausgewählte Zeichenfläche besitzt keine gültige Einheitsnormale: ' + JSON.stringify(faceFrame));
  await page.locator('#startSketch').click();
  await page.waitForTimeout(500);
  const faceDrag = await page.evaluate(() => {
    const half = window.SILMOUnits.mmToWorldUnits(10);
    return {
      start: window.__silmoFaceSketchScreenPointForTest(-half, -half),
      end: window.__silmoFaceSketchScreenPointForTest(half, half)
    };
  });
  assert.ok(faceDrag.start && faceDrag.end, 'Zeichenpunkte auf der ausgewählten Modellfläche sind nicht sichtbar');
  await page.mouse.move(faceDrag.start.x, faceDrag.start.y);
  await page.mouse.down();
  await page.mouse.move(faceDrag.end.x, faceDrag.end.y, { steps: 8 });
  await page.mouse.up();
  await page.locator('#createSketchSolid').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#createSketchSolid').isDisabled(), false, 'Rechteck-Skizze auf der Seitenfläche wurde nicht abgeschlossen');
  await page.locator('#createSketchSolid').click();
  await page.waitForFunction(() => !!window.__silmoSketchSnapshot?.() || (document.getElementById('status')?.textContent || '').includes('Skizze konnte nicht erstellt'));
  const resultAfterExtrusion = await page.evaluate(() => ({ snapshot: window.__silmoSketchSnapshot?.() || null, status: document.getElementById('status')?.textContent || '', sketchStatus: document.getElementById('sketchStatus')?.textContent || '' }));
  assert.ok(resultAfterExtrusion.snapshot, 'Extrusion fehlgeschlagen. Status: ' + resultAfterExtrusion.status + ' | Skizze: ' + resultAfterExtrusion.sketchStatus);
  const extruded = resultAfterExtrusion.snapshot;
  assert.equal(extruded.type, 'rectangle', 'Falscher Skizzentyp wurde extrudiert');
  const normalAxis = faceFrame.normal.reduce((best, value, index, values) =>
    Math.abs(value) > Math.abs(values[best]) ? index : best, 0);
  const extents = [extruded.actualWidthMM, extruded.actualDepthMM, extruded.actualHeightMM];
  console.log('SILMO-EXTRUSION-DIAG', JSON.stringify({ normal: faceFrame.normal, normalAxis, extents, extrusionMM: extruded.extrusionMM, actualWidthMM: extruded.actualWidthMM, actualDepthMM: extruded.actualDepthMM, actualHeightMM: extruded.actualHeightMM, faceFrameAfter: await page.evaluate(() => window.__silmoFaceSketchFrameSnapshot?.()) }));
  assert.ok(
    Math.abs(extents[normalAxis] - extruded.extrusionMM) < 0.8,
    'Extrusion verläuft nicht entlang der ausgewählten Flächennormalen: ' + JSON.stringify({ normal: faceFrame.normal, extents, extrusionMM: extruded.extrusionMM, snapshot: extruded, faceFrameAfter: await page.evaluate(() => window.__silmoFaceSketchFrameSnapshot?.()) })
  );
  await page.locator('[data-tab="create"]').click();
  // Der folgende Escape-Test beendet den Zeichenmodus und setzt die Flächenauswahl zurück.

  // 2) Tastenkürzel: L, R und C starten das vorhandene Werkzeug; Escape beendet es.
  for (const [key, tool] of [['l', 'line2d'], ['r', 'rectangle'], ['c', 'circle']]) {
    await page.keyboard.press(key);
    assert.equal(await page.locator('#sketchTool').inputValue(), tool, key.toUpperCase() + ' wählt das falsche Werkzeug');
    assert.equal(await page.locator('#cancelSketch').isDisabled(), false, key.toUpperCase() + ' startet den Zeichenmodus nicht');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#cancelSketch').isDisabled(), true, 'Escape beendet den Zeichenmodus nicht');
  }

  // 2) Blaue Hover-Kontur: zwei getrennte Körper erzeugen und das nicht
  // ausgewählte, tatsächlich vorderste Objekt mit der Maus treffen.
  await page.locator('#addCube').click();
  await page.locator('#duplicate').click();
  const hoverPoint = await page.evaluate(() => window.__silmoHoverTestPoint?.());
  assert.ok(hoverPoint, 'Kein sichtbares, nicht ausgewähltes Testobjekt für die Hover-Kontur gefunden');
  assert.equal(hoverPoint.targetElement, 'CANVAS', 'Der berechnete Hover-Punkt liegt nicht direkt auf der 3D-Canvas: ' + JSON.stringify(hoverPoint));
  await page.mouse.move(hoverPoint.x, hoverPoint.y);
  await page.waitForFunction(() => window.__silmoHoverSnapshot?.().outlineVisible === true, null, { timeout: 5000 });
  const hoverState = await page.evaluate(() => window.__silmoHoverSnapshot());
  assert.equal(hoverState.objectId, hoverPoint.objectId, 'Die blaue Kontur gehört nicht zum Objekt unter dem Mauszeiger');
  assert.ok(Math.abs(hoverState.debug.pointerClient.x - hoverPoint.x) < 1 &&
    Math.abs(hoverState.debug.pointerClient.y - hoverPoint.y) < 1,
    'Die 3D-Canvas hat nicht die berechnete Mausposition erhalten: ' + JSON.stringify({ hoverPoint, pointerClient: hoverState.debug.pointerClient }));
  await page.screenshot({ path: 'test-results/sketchup-hover-preview.png', fullPage: true });
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__silmoHoverSnapshot?.().outlineVisible === false, null, { timeout: 3000 });

  // 3) Freies Objektziehen: Startposition vor und nach dem Maus-Drag vergleichen.
  await page.locator('#addCube').click();
  const before = await page.evaluate(() => window.__silmoModelingTestSnapshot());
  assert.ok(before.selectedId, 'Nach dem Erstellen ist kein Objekt ausgewählt');
  const dragPoint = await page.evaluate(id => window.__silmoModelingTestPoint(id), before.selectedId);
  assert.ok(dragPoint, 'Ausgewähltes Objekt liegt nicht im sichtbaren Viewport');
  const selectedBefore = before.objects.find(object => object.id === before.selectedId);
  await page.mouse.move(dragPoint.x, dragPoint.y);
  await page.mouse.down();
  await page.mouse.move(dragPoint.x + 75, dragPoint.y - 35, { steps: 8 });
  await page.mouse.up();
  const after = await page.evaluate(() => window.__silmoModelingTestSnapshot());
  const selectedAfter = after.objects.find(object => object.id === before.selectedId);
  assert.ok(selectedAfter, 'Gezogenes Objekt ist aus der Szene verschwunden');
  const movement = Math.hypot(
    selectedAfter.position.x - selectedBefore.position.x,
    selectedAfter.position.y - selectedBefore.position.y,
    selectedAfter.position.z - selectedBefore.position.z
  );
  assert.ok(movement > 0.05, 'Mausziehen hat die Objektposition nicht verändert');

  // Ende-zu-Ende-Test mit echten Mesh-Kanten: Zwei flache Quader kreuzen
  // sich in der XY-Zeichenebene. Der Fang muss den räumlich gemeinsamen
  // Schnittpunkt ihrer sichtbaren Oberkanten erkennen.
  await page.locator('[data-tab="draw"]').click();
  await page.locator('#pane-draw-right .inner-tab-nav button').filter({ hasText: 'Werkzeug' }).click();
  // Mehrere Fangarten gleichzeitig aktivieren: Die exakte Kantenkreuzung
  // muss gegenüber weiter entfernten Eckpunkten und Kantenmitten gewinnen.
  await page.locator('#sketchEndpointSnapEnabled').check();
  await page.locator('#sketchMidpointSnapEnabled').check();
  await page.locator('#sketchEdgeProjectionSnapEnabled').uncheck();
  await page.locator('#sketchIntersectionSnapEnabled').check();
  await page.locator('#startSketch').click();
  await page.waitForTimeout(500);
  const intersectionFixture = await page.evaluate(() => window.__silmoCreateIntersectionSnapFixture?.());
  assert.ok(intersectionFixture, 'Testkörper für den echten Schnittpunktfang konnten nicht erstellt werden');
  await page.mouse.move(intersectionFixture.x, intersectionFixture.y);
  await page.mouse.down();
  await page.waitForTimeout(100);
  const actualIntersectionSnap = await page.evaluate(() => window.__silmoEndpointSnapSnapshot?.());
  console.log('SILMO-ECHTER-SCHNITTPUNKT-DIAG', JSON.stringify({
    fixture: intersectionFixture,
    canvas: await page.locator('#viewport canvas').boundingBox(),
    snap: actualIntersectionSnap
  }));
  assert.equal(actualIntersectionSnap?.visible, true,
    'Kein Fangmarker am realen Kanten-Schnittpunkt: ' + JSON.stringify({ fixture: intersectionFixture, snap: actualIntersectionSnap }));
  assert.equal(actualIntersectionSnap.snappedKind, 'intersection',
    'Bei gleichzeitig aktivem Eckpunkt-, Kantenmitte- und Schnittpunktfang wurde nicht der Schnittpunkt gewählt: ' + JSON.stringify({ fixture: intersectionFixture, snap: actualIntersectionSnap }));
  assert.ok(actualIntersectionSnap.snappedWorld && Math.hypot(
    actualIntersectionSnap.snappedWorld[0] - intersectionFixture.expectedWorld[0],
    actualIntersectionSnap.snappedWorld[1] - intersectionFixture.expectedWorld[1],
    actualIntersectionSnap.snappedWorld[2] - intersectionFixture.expectedWorld[2]
  ) < 1e-5, 'Der echte Schnittpunktfang hat den geometrischen Schnittpunkt der beiden Modellkanten verfehlt: ' +
    JSON.stringify({ fixture: intersectionFixture, snap: actualIntersectionSnap }));
  await page.mouse.up();
  await page.locator('#cancelSketch').click();
  await page.evaluate(ids => window.__silmoRemoveIntersectionSnapFixture?.(ids), intersectionFixture.ids);
  await page.locator('#sketchIntersectionSnapEnabled').uncheck();
  await page.locator('#sketchEndpointSnapEnabled').check();
  await page.locator('#sketchMidpointSnapEnabled').check();
  await page.locator('[data-tab="create"]').click();


  // Mehrfach-Mesh-Laufzeittest: Kandidaten aus vielen getrennten Körpern
  // sammeln, in den Bildschirm projizieren und per Raycast auf Sichtbarkeit prüfen.
  const multiMeshFixture = await page.evaluate(() => window.__silmoCreateMultiMeshSnapFixture?.(16));
  assert.ok(multiMeshFixture?.ids?.length === 16,
    'Mehrfach-Mesh-Testkörper konnten nicht vollständig erstellt werden: ' + JSON.stringify(multiMeshFixture));
  const multiMeshSnap = await page.evaluate(() => {
    const target = window.__silmoEndpointSnapTestPoint?.('vertex');
    const snapshot = window.__silmoEndpointSnapSnapshot?.();
    return { target, snapshot };
  });
  console.log('SILMO-MEHRFACH-MESH-FANGTEST', JSON.stringify({
    fixture: multiMeshFixture,
    target: multiMeshSnap.target,
    debug: multiMeshSnap.snapshot?.debug
  }));
  assert.ok(multiMeshSnap.snapshot?.debug?.meshCount >= 16,
    'Kandidaten-Sammlung hat nicht alle getrennten Meshes verarbeitet: ' + JSON.stringify(multiMeshSnap.snapshot?.debug));
  assert.ok(multiMeshSnap.snapshot?.candidateCount > 60,
    'Aus den getrennten Körpern wurden zu wenige Fangpunkte gesammelt: ' + JSON.stringify(multiMeshSnap.snapshot));
  assert.ok(multiMeshSnap.target,
    'Kein sichtbarer projizierter Eckpunkt aus der Mehrfach-Mesh-Szene gefunden: ' + JSON.stringify(multiMeshSnap.snapshot));
  assert.ok(multiMeshSnap.snapshot.debug.visibilityChecks > 0 &&
    multiMeshSnap.snapshot.debug.visibleCount > 0,
    'Raycast-Sichtbarkeitsprüfung hat keinen sichtbaren Kandidaten bestätigt: ' + JSON.stringify(multiMeshSnap.snapshot.debug));
  await page.evaluate(ids => window.__silmoRemoveMultiMeshSnapFixture?.(ids), multiMeshFixture.ids);

  // Belastungstest für die Kantenanalyse: ein dicht trianguliertes, flaches
  // Gitter enthält viele Dreiecke, aber nur seinen äusseren Rand als Feature-Kanten.
  const edgeLoad = await page.evaluate(() => {
    const gridSize = 80;
    const positions = [];
    const indices = [];
    for (let y = 0; y <= gridSize; y++) {
      for (let x = 0; x <= gridSize; x++) positions.push(x, y, 0);
    }
    const row = gridSize + 1;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const a = y * row + x;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        indices.push(a, b, d, a, d, c);
      }
    }
    const started = performance.now();
    const edges = window.SILMOInference.findFeatureEdgeMidpoints(positions, indices);
    return { gridSize, triangleCount: indices.length / 3, vertexCount: positions.length / 3,
      featureEdgeCount: edges.length, durationMs: performance.now() - started };
  });
  assert.equal(edgeLoad.triangleCount, 12800, 'Belastungstest hat nicht die erwartete Dreiecksmenge erzeugt');
  assert.equal(edgeLoad.featureEdgeCount, 320,
    'Kantenanalyse erkennt bei einem grossen flachen Gitter nicht nur den Aussenrand: ' + JSON.stringify(edgeLoad));
  assert.ok(edgeLoad.durationMs < 5000,
    'Kantenanalyse überschreitet das grosszügige 5-Sekunden-Testlimit: ' + JSON.stringify(edgeLoad));
  console.log('SILMO-KANTEN-BELASTUNGSTEST', JSON.stringify(edgeLoad));

  assert.deepEqual(errors, [], 'Browser-Konsole enthält Fehler während der Modellierprüfung');
  await page.screenshot({ path: 'test-results/sketchup-modeling-focused.png', fullPage: true });
  console.log('MODELLIER-KURZTEST BESTANDEN: Tastenkürzel, Hover-Kontur und Objektziehen.');
  console.log(JSON.stringify({ hoverObjectId: hoverState.objectId, draggedObjectId: before.selectedId, movementWorldUnits: movement }));
} catch (error) {
  try { await page.screenshot({ path: 'test-results/sketchup-modeling-focused-failed.png', fullPage: true }); } catch {}
  console.error('MODELLIER-KURZTEST FEHLGESCHLAGEN:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
