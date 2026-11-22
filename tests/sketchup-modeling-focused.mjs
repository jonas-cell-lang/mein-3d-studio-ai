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
  await page.locator('[data-tab="create"]').click();
  assert.equal((await page.locator('[data-tab="create"]').innerText()).trim(), 'Modellieren', 'Hauptreiter ist nicht als Modellieren beschriftet');
  assert.equal(await page.locator('#pane-create-left #booleanUnion').count(), 0, 'Boolesche CAD-Funktion befindet sich noch im normalen Modellierbereich');

  // Erweiterte CAD-Funktionen bleiben erreichbar, sind aber standardmässig im Expertenbereich.
  await page.locator('#expertCenterToggle').click();
  await page.locator('[data-tab="expert"]').waitFor({ state: 'visible' });
  const advancedCad = page.locator('#pane-expert-left details.advanced-cad-tools');
  await advancedCad.locator('summary').click();
  for (const id of ['booleanUnion', 'booleanSubtract', 'booleanIntersect', 'booleanSeparate']) {
    assert.equal(await page.locator('#' + id).isVisible(), true, id + ' ist im Expertenbereich nicht erreichbar');
  }
  await page.locator('#expertCenterToggle').click();
  await page.locator('[data-tab="create"]').click();
  await page.locator('#pane-create-left > .inner-tab-nav button').first().click();

  // 1) Zeichenebene auf einer seitlichen Modellfläche ausrichten.
  await page.locator('#addCube').click();
  const faceObject = await page.evaluate(() => window.__silmoModelingTestSnapshot().selectedId);
  const facePoint = await page.evaluate(id => window.__silmoFaceSketchTestPoint?.(id), faceObject);
  assert.ok(facePoint, 'Keine sichtbare seitliche Würfelfläche für den Flächentest gefunden');
  await page.locator('#pickFaceSketchPlane').click();
  await page.mouse.click(facePoint.x, facePoint.y);
  const faceFrame = await page.evaluate(() => window.__silmoFaceSketchFrameSnapshot?.());
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
  await page.mouse.move(hoverPoint.x, hoverPoint.y);
  await page.waitForFunction(() => window.__silmoHoverSnapshot?.().outlineVisible === true, null, { timeout: 5000 });
  const hoverState = await page.evaluate(() => window.__silmoHoverSnapshot());
  assert.equal(hoverState.objectId, hoverPoint.objectId, 'Die blaue Kontur gehört nicht zum Objekt unter dem Mauszeiger');
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
