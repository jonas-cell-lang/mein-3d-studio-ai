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
  assert.match(await page.locator('meta[name="silmo-build"]').getAttribute('content'), /^v76/, 'Build-Metadaten zeigen nicht v75');
  assert.match(await page.locator('#tutorialQuickGuide').evaluate(el => el.textContent), /2D-Linie/, 'Visuelle Übersicht zeigt keine 2D-Linie');
  assert.match(await page.locator('#tutorialQuickGuide').evaluate(el => el.textContent), /2D-Kurve/, 'Visuelle Übersicht zeigt keine 2D-Kurve');
  assert.match(await page.locator('#tutorialQuickGuide').evaluate(el => el.textContent), /Freiform/, 'Visuelle Übersicht zeigt keine Freiform');
  assert.match(await page.locator('#tutorialQuickGuide').evaluate(el => el.textContent), /Rasterfang/, 'Visuelle Übersicht zeigt keinen Rasterfang');
  await page.waitForTimeout(1500);

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
  await examPage.evaluate(()=>window.__silmoTutorialEnterExamForTest());
  assert.match(await examPage.locator('#tutorialTitle').innerText(),/Zeichne selbst ein Herz/,'Abschlusstest erklärt die eigene Herzzeichnung nicht');
  assert.equal(await examPage.locator('#tutorialRecognizeHeart').isVisible(),true,'Schaltfläche zur Herz-Erkennung fehlt');
  await examPage.locator('[data-tab="print"]').click();
  const examExport=examPage.waitForEvent('download');
  await examPage.locator('#exportModel').click();
  await examExport;
  await examPage.locator('#tutorialRecognizeHeart').click();
  assert.match(await examPage.locator('#tutorialHeartRecognition').innerText(),/Herzform ungefähr erkannt/,'Erkennungsergebnis wird nicht angezeigt');
  await examPage.locator('#tutorialNext').click();
  assert.match(await examPage.locator('#tutorialNext').innerText(),/Kurs beenden/,'Bestandener Abschlusstest zeigt keinen Kurs-beenden-Knopf');
  await examPage.locator('#tutorialNext').click();
  assert.equal(await examPage.locator('#tutorialCard').isVisible(),false,'Kurs-beenden-Knopf schliesst den Kurs nicht');
  assert.match(await examPage.locator('#status').innerText(),/Lernkurs erfolgreich abgeschlossen/,'Kursabschluss wird nicht bestätigt');
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
  // Aufgabe 25: Die Anleitung muss auf die getrennten Reiter für Bettgrösse und Prüfung hinweisen.
  assert.equal(await page.evaluate(()=>window.__silmoTutorialShowStepForTest(24)),true,'Aufgabe 25 kann nicht geöffnet werden');
  assert.match(await page.locator('#tutorialTitle').innerText(),/Druckbett einstellen und prüfen/,'Aufgabe 25 hat den falschen Titel');
  assert.equal(await page.locator('#tutorialInstructionList li').count(),8,'Aufgabe 25 enthält nicht acht konkrete Schritte');
  assert.match(await page.locator('#tutorialInstructionList').innerText(),/Messen & Prüfen/,'Aufgabe 25 nennt den richtigen Reiter für die Druckbettprüfung nicht');
  await page.locator('[data-tab="print"]').click();
  const bedWidthBefore=Number(await page.locator('#bedWidth').inputValue());
  const bedDepthBefore=Number(await page.locator('#bedDepth').inputValue());
  const targetBedWidth=Math.min(2000,bedWidthBefore+37);
  const targetBedDepth=Math.min(2000,bedDepthBefore+23);
  await page.locator('#bedWidth').fill(String(targetBedWidth));
  await page.locator('#bedDepth').fill(String(targetBedDepth));
  // Beim Verlassen der Felder müssen die neuen Werte sofort in der echten 3D-Platte ankommen.
  await page.locator('[data-tab="measure"]').click();
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
  await page.locator('[data-tab="print"]').click();
  await page.locator('#bedWidth').fill('2');
  await page.locator('[data-tab="measure"]').click();
  await page.locator('#checkBed').click();
  assert.match(await page.locator('#status').innerText(),/Druckbett nicht übernommen/,'Ungültige Druckbettgrösse wird nicht klar abgewiesen');
  const afterInvalidBed=await page.evaluate(()=>window.__silmoBedSnapshot());
  assert.equal(afterInvalidBed.widthMM,targetBedWidth,'Ungültige Breite hat den letzten gültigen Druckbettzustand verändert');
  // Testzustand zurücksetzen: nachfolgende Geometrieprüfungen erwarten das Standardbett 200 × 200 mm.
  await page.locator('[data-tab="print"]').click();
  await page.locator('#bedWidth').fill(String(bedWidthBefore));
  await page.locator('#bedDepth').fill(String(bedDepthBefore));
  await page.locator('#applyBedSize').click();
  // Aufgabe 26: Projekt sichern, STL exportieren und eine STL direkt in die neue Ablage ziehen.
  assert.equal(await page.evaluate(()=>window.__silmoTutorialShowStepForTest(25)),true,'Aufgabe 26 kann nicht geöffnet werden');
  assert.equal(await page.locator('#stlDropZone').count(),1,'STL-Ablagefläche fehlt');
  assert.match(await page.locator('#tutorialInstructionList').innerText(),/Downloads-Ordner/,'Aufgabe 26 erklärt den Import aus Downloads nicht');
  const saveDownload=page.waitForEvent('download');
  await page.locator('#saveProjectButton').click();
  await saveDownload;
  const exportDownload=page.waitForEvent('download');
  await page.locator('#exportModel').click();
  await exportDownload;
  const modelCountBeforeImport=await page.locator('#objects .object-row').count();
  await page.locator('#stlDropZone').evaluate(zone=>{
    const stl='solid test\\nfacet normal 0 0 1\\nouter loop\\nvertex 0 0 0\\nvertex 10 0 0\\nvertex 0 10 0\\nendloop\\nendfacet\\nendsolid test';
    const transfer=new DataTransfer();
    transfer.items.add(new File([stl],'test-import.stl',{type:'model/stl'}));
    zone.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  await page.waitForFunction(()=>Number(window.__silmoImportRevision||0)>0,null,{timeout:5000});
  assert.equal(await page.locator('#objects .object-row').count(),modelCountBeforeImport+1,'STL-Drop importiert kein zusätzliches Modell oder hat bestehende Modelle ersetzt');
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
  await page.waitForFunction(()=>document.querySelector('#tutorialNext')?.disabled===false,null,{timeout:5000});
  assert.match(await page.locator('#tutorialFeedback').innerText(),/Erfolgskontrolle bestanden/,'Aufgabe 26 erkennt Speichern, Export und STL-Import nicht');
  assert.equal(await page.evaluate(()=>window.__silmoTutorialShowStepForTest(0)),true,'Tutorial kann nach dem Aufgabe-13-Test nicht zur ersten Aufgabe zurückkehren');
  assert.match(await page.locator('#tutorialWhere').innerText(), /WO FINDEST DU ES/, 'Lernphase erklärt nicht, wo das Werkzeug liegt');
  const tutorialDebug = await page.locator('#tutorialDebug').innerText();
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
  await page.locator('#objects .object-select').last().click();
  await page.locator('#duplicate').click();
  await page.waitForFunction(() => document.querySelector('#tutorialNext')?.disabled === false, null, { timeout: 5000 });
  await page.locator('#tutorialNext').click();
  assert.match(await page.locator('#tutorialStepLabel').innerText(), /AUFGABE 9 VON/, 'Tutorial kann nicht bis zur Transformationsaufgabe navigieren');
  assert.deepEqual(pageErrors, [], 'Beim Wechsel in die Verschiebeaufgabe entstehen Browserfehler');
  await page.locator('#tutorialClose').click();

  assert.ok(canvasSize.width > 0 && canvasSize.height > 0, '3D canvas hat keine gültige Grösse');

  // Zeichenmodus: Rechtsklick-Ziehen darf die Kamera nicht drehen.
  await page.locator('[data-tab="draw"]').click();
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

  // Ellipse: unabhängige Breite und Tiefe sowie Extrusion prüfen.
  await page.locator('#sketchTool').selectOption('ellipse');
  assert.equal(await page.locator('#sketchDepthMM').isVisible(), true, 'Ellipse zeigt kein separates Tiefenfeld');
  await page.locator('#startSketch').click();
  const ellipseStart = await page.evaluate(() => window.__silmoSketchPointForTest(-0.72, -0.48));
  const ellipseEnd = await page.evaluate(() => window.__silmoSketchPointForTest(0.72, 0.48));
  await page.mouse.move(ellipseStart.x, ellipseStart.y); await page.mouse.down();
  await page.mouse.move(ellipseEnd.x, ellipseEnd.y, { steps: 8 }); await page.mouse.up();
  await page.locator('#sketchWidthMM').fill('30'); await page.locator('#sketchDepthMM').fill('12'); await page.locator('#sketchHeightMM').fill('4');
  await page.locator('#createSketchSolid').click();
  const ellipseSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(ellipseSnapshot.type, 'ellipse', 'Ellipse wurde nicht als Ellipse gespeichert');
  assert.ok(Math.abs(ellipseSnapshot.actualWidthMM - 30) < 0.01, 'Ellipsenbreite stimmt nicht');
  assert.ok(Math.abs(ellipseSnapshot.actualDepthMM - 12) < 0.01, 'Ellipsentiefe stimmt nicht');
  assert.ok(Math.abs(ellipseSnapshot.actualHeightMM - 4) < 0.01, 'Ellipsenhöhe stimmt nicht');

  // Dreieck: echte dreieckige Extrusionsgeometrie mit eigenen Massen.
  await page.locator('#sketchTool').selectOption('triangle');
  await page.locator('#startSketch').click();
  const triangleStart = await page.evaluate(() => window.__silmoSketchPointForTest(-0.65, -0.6));
  const triangleEnd = await page.evaluate(() => window.__silmoSketchPointForTest(0.65, 0.6));
  await page.mouse.move(triangleStart.x, triangleStart.y); await page.mouse.down();
  await page.mouse.move(triangleEnd.x, triangleEnd.y, { steps: 8 }); await page.mouse.up();
  await page.locator('#sketchWidthMM').fill('24'); await page.locator('#sketchDepthMM').fill('18'); await page.locator('#sketchHeightMM').fill('6');
  await page.locator('#createSketchSolid').click();
  const triangleSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(triangleSnapshot.type, 'triangle', 'Dreieck wurde nicht als Dreieck gespeichert');
  assert.ok(Math.abs(triangleSnapshot.actualWidthMM - 24) < 0.01, 'Dreiecksbreite stimmt nicht');
  assert.ok(Math.abs(triangleSnapshot.actualDepthMM - 18) < 0.01, 'Dreieckstiefe stimmt nicht');
  assert.ok(Math.abs(triangleSnapshot.actualHeightMM - 6) < 0.01, 'Dreieckshöhe stimmt nicht');

  // Das sichtbare Druckplattenraster muss dieselbe einstellbare Weite verwenden.
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
  await page.locator('#sketchTool').selectOption('rectangle');
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
  const snappedSnapshot = await page.evaluate(() => window.__silmoSketchSnapshot());
  assert.equal(snappedSnapshot.type, 'rectangle', 'Rasterfang-Test hat kein Rechteck erstellt');
  assert.ok(Math.abs(snappedSnapshot.widthMM / 5 - Math.round(snappedSnapshot.widthMM / 5)) < 0.001, 'Rechteckbreite liegt nicht auf dem 5-mm-Raster');
  assert.ok(Math.abs(snappedSnapshot.depthMM / 5 - Math.round(snappedSnapshot.depthMM / 5)) < 0.001, 'Rechtecktiefe liegt nicht auf dem 5-mm-Raster');
  await page.locator('#sketchSnapEnabled').uncheck();

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

  // 2D-Linie: eine gerade Linie auf XY als echten runden Körper erzeugen.
  await page.locator('#sketchTool').selectOption('line2d');
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
  await page.locator('#sketchTool').selectOption('curve2d');
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
  assert.equal((await page.evaluate(() => window.__silmoSketchCameraLockSnapshot())).active, true, 'Zeichenmodus wurde nach dem Extrudieren beendet');
  await page.locator('#cancelSketch').click();
  assert.equal((await page.evaluate(() => window.__silmoSketchCameraLockSnapshot())).active, false, 'Zeichenmodus lässt sich nicht beenden');
  assert.equal(await page.locator('#gizmoModeToggle').isDisabled(), false, 'Drehfunktion wurde nach dem Beenden nicht freigegeben');
  await page.locator('[data-tab="create"]').click();

  // Boolesche Verbindung muss sich wieder in die ursprünglichen Formen zerlegen lassen.
  const unionStartCount=await page.locator('#objects .object-row').count();
  await page.locator('#addCube').click(); await page.locator('#addSphere').click();
  await page.locator('[data-tab="edit"]').click();
  await page.locator('#multiSelectToggle').click();
  await page.locator('[data-tab="create"]').click();
  await page.locator('#objects .object-select').nth(unionStartCount).click();
  assert.equal(await page.locator('#objects .object-select[aria-pressed="true"]').count(),2,'Union-Test konnte nicht beide Formen auswählen');
  await page.locator('#booleanUnion').click();
  assert.equal(await page.locator('#objects .object-row').count(),unionStartCount+1,'Verbinden erzeugt nicht genau ein Ergebnisobjekt');
  assert.equal((await page.evaluate(()=>window.__silmoUnionSnapshot())).partCount,2,'Verbundene Form speichert die ursprünglichen Einzelteile nicht');
  await page.locator('[data-tab="print"]').click();
  const unionDownloadPromise=page.waitForEvent('download');
  await page.locator('#saveProjectButton').click();
  const unionDownload=await unionDownloadPromise;
  await page.locator('#projectFileInput').setInputFiles(await unionDownload.path());
  await page.waitForFunction(()=>window.__silmoUnionSnapshot().partCount===2,null,{timeout:10000});
  assert.equal((await page.evaluate(()=>window.__silmoUnionSnapshot())).partCount,2,'Projektimport verliert die gespeicherten Einzelteile');
  await page.locator('[data-tab="create"]').click();
  await page.locator('#booleanSeparate').click();
  assert.equal(await page.locator('#objects .object-row').count(),unionStartCount+2,'Verbindung lösen stellt die ursprünglichen Objekte nicht wieder her');
  assert.match(await page.locator('#status').innerText(),/Verbindung gelöst: 2 ursprüngliche Einzelobjekte/,'Trennen meldet keinen Erfolg');
  await page.locator('#viewport canvas').focus();
  await page.keyboard.press('Control+z');
  assert.equal(await page.locator('#objects .object-row').count(),unionStartCount+1,'Rückgängig stellt die verbundene Form nicht wieder her');
  assert.equal((await page.evaluate(()=>window.__silmoUnionSnapshot())).partCount,2,'Rückgängig verliert die gespeicherten Einzelteile');
  await page.locator('#booleanSeparate').click();
  assert.equal(await page.locator('#objects .object-row').count(),unionStartCount+2,'Verbindung kann nach Rückgängig nicht erneut gelöst werden');

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

  // Allgemeine CAD-Werkzeuge: keine produktgebundene Sonderfunktion, sondern wiederverwendbare Konstruktion.
  await page.locator('[data-tab="create"]').click();
  for (const id of ['addCone','addHexPrism','addTorus']) assert.equal(await page.locator('#'+id).count(),1,`Allgemeines CAD-Grundwerkzeug ${id} fehlt`);
  const primitiveStart = await page.locator('#objects .object-row').count();
  await page.locator('#addCone').click(); await page.locator('#addHexPrism').click(); await page.locator('#addTorus').click();
  assert.equal(await page.locator('#objects .object-row').count(),primitiveStart+3,'Zusätzliche CAD-Grundkörper werden nicht erstellt');
  await page.locator('[data-tab="draw"]').click();
  assert.equal(await page.locator('#sketchTool').isVisible(),true,'Freie Zeichenwerkzeuge sind nicht erreichbar');
  assert.equal(await page.locator('#cadSketchToolPalette button').count(),9,'Die CAD-Werkzeugpalette ist unvollständig');
  assert.equal(await page.locator('#pane-draw-right').isVisible(),true,'Das rechte CAD-Eigenschaftenpanel fehlt');
  assert.equal(await page.locator('#sketchPositionXMM').isVisible(),true,'Exakte X-Position der Skizze fehlt');
  assert.equal(await page.locator('#sketchPositionYMM').isVisible(),true,'Exakte Y-Position der Skizze fehlt');
  const professionalCadDetails=page.locator('#pane-draw-right details').filter({hasText:'Professionelle CAD-Bearbeitung'});
  if (!(await professionalCadDetails.evaluate(el=>el.open))) await professionalCadDetails.locator('summary').click();
  for (const id of ['sketchConstraint','editSketchWidthMM','editSketchDepthMM','editSketchHeightMM','loadSketchDimensions','applySketchDimensions','sketchPointIndex','sketchPointXMM','sketchPointYMM','loadSketchPoints','applySketchPoint','edgeTreatmentMM','applyEdgeFillet','applyEdgeChamfer','createLoft','createSweep','cadRelationSelect','applySketchRelation','editPathLengthMM','loadPathLength','applyPathLength','objectDistanceAxis','objectDistanceMM','applyObjectDistance']) {
    assert.equal(await page.locator('#'+id).isVisible(),true, 'Professionelles CAD-Werkzeug '+id+' fehlt');
  }
  assert.match(await page.locator('#pane-draw-right').innerText(),/Exakte Masse und Position/,'Skizzenparameter sind nicht übersichtlich gruppiert');
  assert.ok((await page.locator('#sketchTool option').allTextContents()).some(x=>/Freiform/.test(x)),'Freiform-Zeichenwerkzeug fehlt');
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
  for (const key of ['dimensionOK','filletOK','chamferOK','loftOK','sweepOK']) assert.equal(proCadTest[key],true,'Professionelle CAD-Funktion '+key+' funktioniert nicht');
  assert.ok(proCadTest.loftVertices>0&&proCadTest.sweepVertices>0,'Loft/Sweep erzeugt keine Geometrie');
  const relationTest=await page.evaluate(()=>window.__silmoTestRunSketchRelations());
  for (const key of ['parallelOK','perpendicularOK','tangentOK','concentricOK','lengthOK','distanceOK']) assert.equal(relationTest[key],true,'Skizzenbedingung/Bemaßung '+key+' funktioniert nicht');


  // SILMO Image Studio Phase 1: separater Arbeitsbereich, Import, Rotation,
  // persistente Vorlagendaten und Übergabe an die bestehende CAD-Freiform.
  assert.equal(await page.locator('#imageStudioWorkspace').isVisible(),false,'Image Studio ist beim Start unerwartet geöffnet');
  await page.locator('#imageStudioLaunch').click();
  assert.equal(await page.locator('#imageStudioWorkspace').isVisible(),true,'Image Studio lässt sich nicht öffnen');
  const tinyPng='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=';
  await page.evaluate(async data => {
    await window.__silmoImageStudioImport({version:1,fileName:'test.png',dataUrl:data,widthMM:20,rotation:0,contours:[[[0,0],[1,0],[1,1],[0,1]]]});
  },tinyPng);
  assert.equal((await page.evaluate(()=>window.__silmoImageStudioSnapshot())).loaded,true,'Bildvorlage konnte nicht geladen werden');
  assert.equal((await page.evaluate(()=>window.__silmoImageStudioSnapshot())).widthMM,20,'Bildbreite wird nicht gespeichert');
  await page.locator('#imageStudioRotate').click();
  assert.equal((await page.evaluate(()=>window.__silmoImageStudioSnapshot())).rotation,90,'Bildrotation funktioniert nicht');
  const imageState=await page.evaluate(()=>window.__silmoImageStudioExport());
  assert.equal(imageState.fileName,'test.png','Bilddatei-Metadaten werden nicht exportiert');
  assert.ok(imageState.dataUrl.startsWith('data:image/png;base64,'),'Bilddaten werden nicht in Projektstruktur eingebettet');
  await page.locator('#imageStudioCreate3D').click();
  assert.match(await page.locator('#imageStudioStatus').innerText(),/3D-Körper erstellt/,'Bildkontur wird nicht in einen vorhandenen CAD-Körper übertragen');
  assert.equal(await page.locator('#imageStudioWorkspace').isVisible(),false,'Image Studio schliesst nach erfolgreicher CAD-Übertragung nicht');
  assert.ok((await page.locator('#objects .object-row').count())>0,'CAD-Übergabe hat kein Objekt erstellt');

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
