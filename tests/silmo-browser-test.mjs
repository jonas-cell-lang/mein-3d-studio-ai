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
  assert.ok((await page.title()).includes(currentBuild), 'Seitentitel zeigt nicht den aktuellen Build');
  const tutorialStartRows = await page.locator('#objects .object-row').count();
  await page.locator('#addCube').click();
  assert.equal(await page.locator('#objects .object-row').count(), tutorialStartRows + 1, 'Tutorial-Testobjekt wurde nicht erstellt');
  assert.match(await page.locator('#tutorialFeedback').innerText(), /Erfolgskontrolle bestanden/, 'Tutorial erkennt das neu erstellte Objekt nicht');
  await page.locator('#tutorialClose').click();

  assert.ok(canvasSize.width > 0 && canvasSize.height > 0, '3D canvas hat keine gültige Grösse');

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

  // Zahlenfelder müssen den tatsächlichen Drehwinkel des ausgewählten Objekts setzen.
  await page.locator('[data-tab="measure"]').click();
  const beforeNumericRotation = await page.evaluate(() => window.__silmoTutorialAllTransforms().at(-2));
  const rotationX = page.locator('#rotationFields input').nth(0);
  await rotationX.fill('45');
  await rotationX.press('Enter');
  await page.waitForTimeout(200);
  const afterNumericRotation = await page.evaluate(() => window.__silmoTutorialAllTransforms().at(-2));
  assert.ok(Math.abs(afterNumericRotation.qx - beforeNumericRotation.qx) > 0.05 ||
            Math.abs(afterNumericRotation.qy - beforeNumericRotation.qy) > 0.05 ||
            Math.abs(afterNumericRotation.qz - beforeNumericRotation.qz) > 0.05 ||
            Math.abs(afterNumericRotation.qw - beforeNumericRotation.qw) > 0.05,
            'Drehung über das Zahlenfeld verändert die Objektrotation nicht');
  assert.match(await page.locator('#status').innerText(), /Drehung um X auf 45° gesetzt/, 'Zahlenfeld meldet die gesetzte Drehung nicht');

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
  await page.mouse.up();
  assert.equal((await page.evaluate(() => window.__silmoRotationGuideSnapshot())).labelVisible, false, 'Gradzahl bleibt nach dem Drehen eingeblendet');
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
  console.log('BESTANDEN: 3D-Start, Objekterstellung, Mehrfachauswahl, Ausrichten, Gruppieren, Spiegeln, Gruppierung aufheben, numerische Drehung, Moduswechsel und Drehring.');
  console.log(JSON.stringify({ canvasSize, beforeAlign, afterAlign, selectedCount, alignStatus }));
} catch (error) {
  console.error('BROWSERTEST FEHLGESCHLAGEN:', error);
  if (pageErrors.length) console.error('BROWSERFEHLER:', pageErrors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
