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

  const canvasSize = await page.locator('#viewport canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
  // Tutorial-Prüfung: Buildkennung und tatsächliche Objektanzahl kontrollieren.
  await page.locator('#tutorialLaunch').click();
  const tutorialDebug = await page.locator('#tutorialDebug').innerText();
  assert.match(tutorialDebug, /Build: v37 – Diagnoseprüfung repariert/, 'Tutorial-Diagnose zeigt nicht den aktuellen Build');
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
  assert.match(alignStatus, /2 Objekte auf Achse X mittig ausgerichtet|bereits so ausgerichtet/, 'Ausrichten meldet keinen Erfolg');
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

  assert.deepEqual(pageErrors, [], 'Browser meldet JavaScript- oder Konsolenfehler');
  console.log('BESTANDEN: 3D-Start, Objekterstellung, Mehrfachauswahl, Ausrichten, Gruppieren, Spiegeln und Gruppierung aufheben.');
  console.log(JSON.stringify({ canvasSize, beforeAlign, afterAlign, selectedCount, alignStatus }));
} catch (error) {
  console.error('BROWSERTEST FEHLGESCHLAGEN:', error);
  if (pageErrors.length) console.error('BROWSERFEHLER:', pageErrors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
