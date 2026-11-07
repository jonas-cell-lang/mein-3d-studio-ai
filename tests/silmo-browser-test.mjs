import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') pageErrors.push('console: ' + message.text());
});

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#viewport canvas', { timeout: 20000 });
  await page.waitForFunction(() => typeof window.__silmoTutorialAllPositions === 'function', null, { timeout: 20000 });
  await page.waitForTimeout(1500);

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
  const ipadPage = await browser.newPage();
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
  await ipadPage.close();

  const canvasSize = await page.locator('#viewport canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
  // Tutorial-Prüfung: Buildkennung und tatsächliche Objektanzahl kontrollieren.
  await page.locator('#tutorialLaunch').click();
  const tutorialDebug = await page.locator('#tutorialDebug').innerText();
  const currentBuild = await page.locator('meta[name="silmo-build"]').getAttribute('content');
  assert.ok(currentBuild, 'Build-Metadaten fehlen');
  assert.ok(tutorialDebug.includes(`Build: ${currentBuild}`), 'Tutorial-Diagnose zeigt nicht den aktuellen Build');
  assert.equal(await page.locator('#tutorialBuild').innerText(), currentBuild, 'Tutorial-Kopfzeile zeigt nicht den aktuellen Build');
  assert.equal(await page.locator('#tutorialQuickGuide').count(), 1, 'Schnellhilfe fehlt im Tutorial');
  const quickGuide = await page.locator('#tutorialQuickGuide').textContent();
  assert.match(quickGuide, /Escape bricht.*ab/, 'Schnellhilfe erklärt das Abbrechen einer Winkel-Eingabe nicht');
  assert.match(quickGuide, /Projekt speichern/, 'Schnellhilfe erklärt das Sichern eines Projekts nicht');
  assert.ok((await page.title()).includes(currentBuild), 'Seitentitel zeigt nicht den aktuellen Build');
  const tutorialStartRows = await page.locator('#objects .object-row').count();
  await page.locator('#addCube').click();
  assert.equal(await page.locator('#objects .object-row').count(), tutorialStartRows + 1, 'Tutorial-Testobjekt wurde nicht erstellt');
  assert.match(await page.locator('#tutorialFeedback').innerText(), /Erfolgskontrolle bestanden/, 'Tutorial erkennt das neu erstellte Objekt nicht');
  await page.locator('#tutorialClose').click();

  assert.ok(canvasSize.width > 0 && canvasSize.height > 0, '3D canvas hat keine gültige Grösse');

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
  await page.locator('#sketchWidthMM').fill('25');
  await page.locator('#sketchDepthMM').fill('15');
  await page.locator('#sketchHeightMM').fill('5');
  await page.locator('#createSketchSolid').click();
  const sketchSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(sketchSnapshot.type, 'rectangle', 'Rechteck-Skizze wurde nicht als Rechteck erkannt');
  assert.ok(Math.abs(sketchSnapshot.actualWidthMM - 25) < 0.01, 'Exakte Rechteckbreite wurde nicht übernommen');
  assert.ok(Math.abs(sketchSnapshot.actualDepthMM - 15) < 0.01, 'Exakte Rechtecktiefe wurde nicht übernommen');
  assert.ok(Math.abs(sketchSnapshot.actualHeightMM - 5) < 0.01, 'Extrusionshöhe wurde nicht übernommen');
  assert.equal(await page.locator('#createSketchSolid').isDisabled(), true, 'Erstellte Skizze bleibt fälschlich zur erneuten Extrusion bereit');
  await page.locator('#sketchTool').selectOption('circle');
  assert.equal(await page.locator('#sketchDepthMM').isVisible(), false, 'Kreis zeigt ein unnötiges separates Tiefenfeld');

  // 2D-Freiform: eine geschlossene Kontur mit mehreren Punkten zeichnen und extrudieren.
  await page.locator('#sketchTool').selectOption('freeform2d');
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
  await page.locator('#createSketchSolid').click();
  const freeformSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(freeformSnapshot.type, 'freeform2d', 'Freiform wurde nicht als Freiformkörper gespeichert');
  assert.ok(freeformSnapshot.points >= 3, 'Freiform enthält zu wenige Konturpunkte');
  assert.ok(freeformSnapshot.areaMM2 > 0, 'Freiform hat keine gültige Fläche');
  assert.ok(freeformSnapshot.perimeterMM > 0, 'Freiform hat keinen Umfang');
  assert.ok(Math.abs(freeformSnapshot.extrusionMM - 7) < 0.01, 'Freiform-Extrusionshöhe wurde nicht übernommen');
  assert.ok(freeformSnapshot.actualHeightMM > 0, 'Freiform wurde nicht zu einem 3D-Körper extrudiert');

  // 3D-Linie: eine räumliche Freihandlinie auf der XZ-Ebene zeichnen und als Körper erzeugen.
  await page.locator('#sketchTool').selectOption('line3d');
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
  await page.locator('[data-tab="create"]').click();

  // Die App kann bereits ein Startobjekt enthalten. Nur die beiden neu erstellten prüfen.
  const initialCount = await page.locator('#objects .object-row').count();
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
  await page.locator('[data-tab="create"]').click();

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
  await page.locator('[data-tab="create"]').click();
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

  assert.deepEqual(pageErrors, [], 'Browser meldet JavaScript- oder Konsolenfehler');
  console.log('BESTANDEN: 3D-Start, Objekterstellung, Mehrfachauswahl, Ausrichten, Gruppieren, Spiegeln, Gruppierung aufheben, Gradzahl direkt am Würfel, Moduswechsel und Drehring.');
  console.log(JSON.stringify({ canvasSize, beforeAlign, afterAlign, selectedCount, alignStatus }));
} catch (error) {
  console.error('BROWSERTEST FEHLGESCHLAGEN:', error);
  if (pageErrors.length) console.error('BROWSERFEHLER:', pageErrors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
