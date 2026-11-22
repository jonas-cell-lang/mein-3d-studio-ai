
// SILMO Lernkurs: geführte Lernphase mit echter Erfolgskontrolle und eigenständigem Abschlusstest.
(() => {
  const $ = id => document.getElementById(id);
  const launch = $('tutorialLaunch');
  if (!launch) return;
  const shade = document.createElement('div'); shade.id = 'tutorialShade'; shade.hidden = true;
  const card = document.createElement('section'); card.id = 'tutorialCard'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'false'); card.setAttribute('aria-label', 'SILMO Lernkurs');
  card.innerHTML = '<div id="tutorialDragHandle" title="Hier ziehen, um das Lernfenster zu verschieben">⠿ Lernfenster verschieben – hier ziehen</div>' + '<button id="tutorialClose" type="button" aria-label="Tutorial schliessen">✕</button>' +
    '<div style="font-size:10px;color:#ffcf70;margin-bottom:6px">SILMO LERNKURS · <span id="tutorialBuild"></span></div>' +
    '<div id="tutorialStepLabel"></div><div id="tutorialVisual" aria-label="Bildliche Darstellung des Lernschritts"><span id="tutorialVisualGlyph" aria-hidden="true">◧</span><span id="tutorialVisualCaption">Werkzeug</span></div>' +
    '<h2 id="tutorialTitle"></h2><p id="tutorialText"></p><div id="tutorialProgress"><span></span></div>' +
    '<div id="tutorialWhere" class="tutorial-where"></div><section id="tutorialInstructions" aria-label="Schritt-für-Schritt-Anleitung"><h3>So gehst du vor</h3><ol id="tutorialInstructionList"></ol></section><details id="tutorialWordHelp"><summary>Fachbegriffe einfach erklärt</summary><div id="tutorialTermList"></div></details><div id="tutorialFeedback" aria-live="polite"></div>' +
    '<div id="tutorialExamPanel" hidden><div class="tutorial-exam-rule"><strong>Abschlusstest – zeichne selbst ein Herz</strong><p>Wechsle zu „Zeichnen“, wähle „2D-Freiform“ und zeichne die Umrandung eines Herzens. SILMO prüft deine eigene Zeichnung – sie muss nicht perfekt sein.</p></div>' +
    '<div class="tutorial-heart-guide"><svg viewBox="0 0 100 92" role="img" aria-label="Beispiel für eine einfache Herzform"><path d="M50 84 C42 76 9 52 8 29 C7 12 28 3 42 16 L50 25 L58 16 C72 3 93 12 92 29 C91 52 58 76 50 84Z" fill="none" stroke="#ff8fa8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg><div><strong>Woran erkennt man ein Herz?</strong><p>Zwei runde Bögen oben, eine kleine Einbuchtung in der Mitte und eine Spitze unten. Die Seiten sollten ungefähr zusammenpassen.</p></div></div>' +
    '<button id="tutorialExamHint" type="button">Noch einen Zeichentipp anzeigen</button><p id="tutorialExamHintText" hidden></p>' +
    '<button id="tutorialRecognizeHeart" type="button" class="primary">Meine Herzzeichnung erkennen</button><p id="tutorialHeartRecognition" aria-live="polite">Noch keine Herzzeichnung geprüft. Zeichne zuerst eine geschlossene Freiform.</p><div id="tutorialExamChecks"></div></div>' +
    '<details id="tutorialQuickGuide"><summary>Alle Werkzeuge – Übersicht während des Lernens</summary><div id="tutorialToolGallery" aria-label="SILMO-Werkzeugübersicht"></div></details>' +
    '<details id="tutorialKeyboardGuide"><summary>Tastenkombinationen – die fünf wichtigsten</summary><p class="tutorial-key-intro">Halte die Tasten gleichzeitig gedrückt. Auf Windows verwendest du Strg, auf dem Mac die Taste ⌘ Command.</p>' +
    '<details class="tutorial-key-combo"><summary>1. Kopieren – Strg/⌘ + C</summary><ol><li>Wähle ein oder mehrere Objekte aus.</li><li>Halte Strg oder ⌘ gedrückt.</li><li>Drücke C. SILMO merkt sich die ausgewählten Objekte.</li></ol></details>' +
    '<details class="tutorial-key-combo"><summary>2. Einfügen – Strg/⌘ + V</summary><ol><li>Kopiere oder schneide zuerst ein Objekt aus.</li><li>Halte Strg oder ⌘ gedrückt.</li><li>Drücke V. Die Kopie erscheint im Modell.</li></ol></details>' +
    '<details class="tutorial-key-combo"><summary>3. Alles auswählen – Strg/⌘ + A</summary><ol><li>Klicke in die 3D-Ansicht.</li><li>Halte Strg oder ⌘ gedrückt.</li><li>Drücke A. Alle 3D-Objekte werden ausgewählt.</li></ol></details>' +
    '<details class="tutorial-key-combo"><summary>4. Ausschneiden – Strg/⌘ + X</summary><ol><li>Wähle die Objekte aus.</li><li>Halte Strg oder ⌘ gedrückt.</li><li>Drücke X. Die Objekte werden ausgeschnitten und können mit V eingefügt werden.</li></ol></details>' +
    '<details class="tutorial-key-combo"><summary>5. Rückgängig – Strg/⌘ + Z</summary><ol><li>Halte Strg oder ⌘ gedrückt.</li><li>Drücke Z. Die letzte Änderung wird rückgängig gemacht.</li></ol></details></details>' +
    '<div id="tutorialKeyboard" class="tutorial-where">Tastatur: Die Tastenkombinationen oben sind einzeln erklärt. Du kannst jede Erklärung aufklappen.</div><pre id="tutorialDebug" aria-live="polite"></pre><div class="tutorial-actions"><button id="tutorialBack" type="button">Zurück</button><button id="tutorialRetry" type="button">Erneut prüfen</button><button id="tutorialSkipStep" type="button" title="Nur diese Aufgabe auslassen">Aufgabe überspringen ⇧ Shift + →</button><button id="tutorialNext" type="button" class="primary" disabled>Weiter</button><button id="tutorialSkip" type="button">Beenden</button></div>';
  document.body.append(shade, card);
  // Tastenkombinationen werden als normale Lernaufgaben unterrichtet, nicht als separate Übersicht vorangestellt.
  $('tutorialBuild').textContent = document.querySelector('meta[name="silmo-build"]')?.content || 'Build unbekannt';

  const toolCards = [
    ['◧','Würfel','create','addCube'],['●','Kugel','create','addSphere'],['⬭','Zylinder','create','addCylinder'],
    ['△','Kegel','create','addCone'],['⬡','Sechskant-Prisma','create','addHexPrism'],['◎','Ring / Torus','create','addTorus'],
    ['▢','Duplizieren','create','duplicate'],['⊕','Verbinden','create','booleanUnion'],['⊖','Abziehen','create','booleanSubtract'],
    ['↔','Verschieben','edit','positionFields'],['⟳','Drehen','edit','gizmoModeToggle'],['⇥','Ausrichten','edit','alignSelected'],
    ['▤','Verteilen','edit','alignSelected'],['▧','Gruppieren','edit','createObjectGroup'],['◐','Spiegeln','edit','mirror'],
    ['↔','Masse in mm','measure','sizeFields'],['％','Skalierung','measure','percentFields'],['◉','Farbe','measure','color'],
    ['▭','Rechteck','draw','sketchTool'],['▢','Abgerundetes Rechteck','draw','sketchTool'],['◯','Kreis / Ellipse','draw','sketchTool'],
    ['△','Dreieck','draw','sketchTool'],['／','2D-Linie','draw','sketchTool'],['〰','2D-Kurve','draw','sketchTool'],
    ['✎','Freiform','draw','sketchTool'],['⌁','3D-Linie','draw','sketchTool'],['▦','Rasterfang','draw','sketchSnapEnabled'],
    ['⌗','Skizzenmasse','draw','loadSketchDimensions'],['✥','Konturpunkte','draw','loadSketchPoints'],
    ['◒','Abrunden / Fase','draw','applyEdgeFillet'],['∿','Loft / Sweep','draw','createLoft'],
    ['⬇','STL exportieren','project','exportModel'],['▣','Druckbett','print','applyBedSize'],
    ['✓','Druckprüfung','print','checkBed'],['💾','Projekt sichern','project','saveProjectButton'],['📂','Projekt öffnen','project','openProjectButton']
  ];
  $('tutorialToolGallery').innerHTML = toolCards.map(([glyph,label,tab,target]) =>
    '<button type="button" class="tutorial-tool-card" data-tool-tab="' + tab + '" data-target="' + target + '"><span class="tutorial-tool-icon" aria-hidden="true">' + glyph + '</span><span>' + label + '</span></button>'
  ).join('');

  const beginnerDefinitions = [
    ['Grundkörper','Eine einfache 3D-Startform, zum Beispiel ein Würfel, eine Kugel oder ein Zylinder.'],
    ['Objektliste','Die Liste mit allen Teilen, die du in deinem Modell erstellt hast.'],
    ['Duplizieren','Eine Kopie erstellen. Das ursprüngliche Teil bleibt erhalten.'],
    ['Position','Der Ort, an dem ein Teil im 3D-Raum steht. X, Y und Z beschreiben die drei Richtungen.'],
    ['Rotation','Das Fachwort für das Drehen eines Teils.'],
    ['Skalierung','Ein Teil grösser oder kleiner machen, ohne es neu zu zeichnen.'],
    ['Millimeter','Eine Längeneinheit. 10 Millimeter sind 1 Zentimeter.'],
    ['Mehrfachauswahl','Mehr als ein Teil gleichzeitig auswählen.'],
    ['Gruppieren','Mehrere Teile zu einer gemeinsamen Gruppe zusammenfassen.'],
    ['Ausrichten','Teile so verschieben, dass sie zum Beispiel auf einer Linie oder mittig stehen.'],
    ['Spiegeln','Ein Teil wie in einem Spiegel auf die andere Seite drehen.'],
    ['Skizze','Eine flache 2D-Zeichnung, aus der du später einen 3D-Körper machen kannst.'],
    ['Extrudieren','Einer flachen Zeichnung Höhe geben, damit ein 3D-Körper entsteht.'],
    ['Kontur','Die Aussenlinie oder Umrandung einer gezeichneten Form.'],
    ['Rasterfang','Der Mauszeiger springt auf feste Punkte eines Gitters. Das hilft beim genauen Zeichnen.'],
    ['STL','Ein Dateiformat, das viele 3D-Druckprogramme für Modelle verwenden.'],
    ['Druckbett','Die Fläche des 3D-Druckers, auf der das Modell gedruckt wird.'],
    ['CAD','Ein Computerprogramm, mit dem du genaue technische Zeichnungen und 3D-Modelle bauen kannst.'],
    ['2D','Flach wie ein Blatt Papier: Es gibt Breite und Höhe, aber keine Tiefe.'],
    ['3D','Ein Körper mit Breite, Höhe und Tiefe. Du kannst ihn von verschiedenen Seiten ansehen.'],
    ['Achse','Eine gedachte Richtung oder Linie, an der du etwas ausrichten oder drehen kannst.'],
    ['Drehring','Der farbige Ring am ausgewählten Teil. Ziehe daran, um das Teil zu drehen.'],
    ['Freiform','Eine Form, die du selbst mit mehreren Punkten zeichnest.'],
    ['Rasterweite','Der Abstand zwischen zwei Linien oder Punkten im Zeichengitter.'],
    ['Kante','Die Linie, an der zwei Flächen eines Körpers zusammentreffen.'],
    ['Fase','Eine schräge, abgeschnittene Kante.'],
    ['parallel','Zwei Linien verlaufen nebeneinander und treffen sich nicht.'],
    ['senkrecht','Zwei Linien treffen sich im rechten Winkel, also bei 90 Grad.'],
    ['tangential','Zwei Formen oder Linien berühren sich weich an einer Stelle.'],
    ['konzentrisch','Zwei Kreise haben denselben Mittelpunkt.'],
    ['Profil','Die Form oder Umrandung, die du für einen Körper verwendest.'],
    ['Loft','SILMO verbindet mehrere gezeichnete Formen zu einem neuen Körper.'],
    ['Sweep','SILMO zieht eine Form entlang einer gezeichneten Linie oder Kurve.'],
    ['Pfad','Eine Linie oder Kurve, an der eine Form entlanggeführt wird.'],
    ['Boolesche Operation','Ein Rechenschritt mit Körpern: Du kannst sie verbinden oder einen Körper aus einem anderen herausschneiden.'],
    ['Slicer','Ein Programm, das dein 3D-Modell für einen 3D-Drucker vorbereitet.'],
    ['STL exportiert','Das Modell wird als Datei gespeichert, die ein Slicer öffnen kann.']
  ];
  let phase = 'learn', index = 0, highlight = null, baseline = {}, exportObserved = false, savedObserved = false, renderingStep = false, examPassed = false;
  let observedShortcut = null;
  const steps = [
    {title:"1. Objekte kopieren",glyph:'⌨',tab:'create',target:'viewport',where:"Tastenkombination: Strg/⌘ + C. Die Tasten müssen gleichzeitig gedrückt werden.",text:"Lerne die Tastenkombination Strg/⌘ + C. Lies die Schritte und probiere sie danach aus.",instructions:["Wähle zuerst ein oder mehrere 3D-Objekte aus.","Halte Strg (Windows) oder ⌘ Command (Mac/iPad) gedrückt.","Drücke zusätzlich den Buchstaben C.","Lass beide Tasten los. SILMO merkt sich die ausgewählten Objekte zum Kopieren."],shortcutId:"mod-c",begin:()=>{observedShortcut=null;return{};},check:()=>observedShortcut==="mod-c"},
    {title:"2. Objekte einfügen",glyph:'⌨',tab:'create',target:'viewport',where:"Tastenkombination: Strg/⌘ + V. Die Tasten müssen gleichzeitig gedrückt werden.",text:"Lerne die Tastenkombination Strg/⌘ + V. Lies die Schritte und probiere sie danach aus.",instructions:["Kopiere zuerst ein Objekt mit Strg/⌘ + C.","Halte Strg (Windows) oder ⌘ Command (Mac/iPad) gedrückt.","Drücke zusätzlich den Buchstaben V.","Lass beide Tasten los. Die Kopie wird eingefügt."],shortcutId:"mod-v",begin:()=>{observedShortcut=null;return{};},check:()=>observedShortcut==="mod-v"},
    {title:"3. Alle Objekte auswählen",glyph:'⌨',tab:'create',target:'viewport',where:"Tastenkombination: Strg/⌘ + A. Die Tasten müssen gleichzeitig gedrückt werden.",text:"Lerne die Tastenkombination Strg/⌘ + A. Lies die Schritte und probiere sie danach aus.",instructions:["Klicke zuerst in die 3D-Ansicht, nicht in ein Texteingabefeld.","Halte Strg (Windows) oder ⌘ Command (Mac/iPad) gedrückt.","Drücke zusätzlich den Buchstaben A.","Lass beide Tasten los. Alle 3D-Objekte werden ausgewählt."],shortcutId:"mod-a",begin:()=>{observedShortcut=null;return{};},check:()=>observedShortcut==="mod-a"},
    {title:"4. Objekte ausschneiden",glyph:'⌨',tab:'create',target:'viewport',where:"Tastenkombination: Strg/⌘ + X. Die Tasten gleichzeitig drücken. Ausgewählte Objekte werden in die SILMO-Zwischenablage kopiert und aus dem Modell entfernt.",text:"Lerne Strg/⌘ + X. Damit schneidest du ausgewählte Objekte aus: SILMO merkt sie sich und entfernt sie aus deinem Modell. Mit Strg/⌘ + V kannst du sie wieder einfügen.",instructions:["Wähle zuerst ein oder mehrere 3D-Objekte aus.","Halte Strg (Windows) oder ⌘ Command (Mac) gedrückt.","Drücke zusätzlich den Buchstaben X.","Lass beide Tasten los. Die ausgewählten Objekte werden ausgeschnitten."],shortcutId:"mod-x",begin:()=>{observedShortcut=null;return{};},check:()=>observedShortcut==="mod-x"},
    {title:"5. Änderung rückgängig machen",glyph:'⌨',tab:'create',target:'viewport',where:"Tastenkombination: Strg/⌘ + Z. Die Tasten müssen gleichzeitig gedrückt werden.",text:"Lerne die Tastenkombination Strg/⌘ + Z. Lies die Schritte und probiere sie danach aus.",instructions:["Führe zuerst eine kleine Änderung am Modell aus.","Halte Strg (Windows) oder ⌘ Command (Mac/iPad) gedrückt.","Drücke zusätzlich den Buchstaben Z.","Lass beide Tasten los. Die letzte Änderung wird rückgängig gemacht."],shortcutId:"mod-z",begin:()=>{observedShortcut=null;return{};},check:()=>observedShortcut==="mod-z"},
    {title:'1. Grundkörper erstellen',glyph:'◧',tab:'create',target:'addCube',where:'Links im Bereich „Erstellen“ findest du die Grundkörper. Klicke auf „＋ Würfel“. Danach erscheint der neue Körper in der Objektliste.',text:'Erstelle einen zusätzlichen Würfel. Ein Grundkörper ist der Startpunkt vieler CAD-Konstruktionen.',begin:()=>({count:objectCount()}),check:b=>objectCount()>b.count},
    {title:'2. Weitere Grundkörper',glyph:'●',tab:'create',target:'addSphere',where:'Im selben Bereich „Erstellen“ findest du Kugel, Zylinder, Kegel, Sechskant-Prisma und Ring.',text:'Erstelle zusätzlich eine Kugel. Schau dir danach auch die anderen Grundkörper an. Die Aufgabe zählt, wenn die Kugel wirklich in der Objektliste erscheint.',begin:()=>({count:objectCount()}),check:b=>objectCount()>b.count},
    {title:'3. Objekt auswählen und duplizieren',glyph:'▢',tab:'create',target:'duplicate',where:'Wähle zuerst ein Objekt in der Objektliste oder direkt auf der 3D-Fläche. Danach findest du „Duplizieren“ im Bereich „Erstellen“.',text:'Wähle einen Körper aus und dupliziere ihn. Die Objektliste muss danach ein zusätzliches Objekt enthalten.',begin:()=>({count:objectCount()}),check:b=>objectCount()>b.count},
    {title:'4. Objekte verschieben',glyph:'↔',tab:'edit',target:'positionFields',where:'Wähle ein Objekt. Die Positionsfelder findest du im Reiter „Bearbeiten“. Alternativ ziehst du die Pfeile direkt am Modell.',text:'Verschiebe ein Objekt sichtbar an eine andere Position. Du kannst die Pfeile benutzen oder einen anderen X-, Y- oder Z-Wert eingeben.',begin:()=>({positions:positions()}),check:b=>positionChanged(b.positions)},
    {title:'5. Objekte drehen',glyph:'⟳',tab:'edit',target:'gizmoModeToggle',where:'Im Reiter „Bearbeiten“ wechselst du mit der Schaltfläche am 3D-Manipulator zwischen Verschieben und Drehen. Ziehe danach einen Drehring.',text:'Schalte auf Drehen um und drehe ein ausgewähltes Objekt. Die tatsächliche Rotation muss sich verändern.',begin:()=>({transforms:transforms()}),check:b=>rotationChanged(b.transforms)},
    {title:'6. Exakte Masse in Millimetern',glyph:'↔',tab:'measure',target:'sizeFields',where:'Öffne „Messen & Prüfen“. Im Abschnitt „Exakte Objektmasse“ findest du die Felder für Breite, Tiefe und Höhe.',text:'Ändere mindestens eine Objektabmessung in Millimetern und bestätige den Wert. SILMO vergleicht die Werte vor und nach deiner Änderung.',begin:()=>({size:fieldValues('sizeFields')}),check:b=>fieldValues('sizeFields')!==b.size},
    {title:'7. Skalierung in Prozent',glyph:'％',tab:'measure',target:'percentFields',where:'Direkt unter den Objektmassen findest du „Skalierung (%)“. Die Kettenschaltfläche bestimmt, ob alle Achsen gemeinsam skaliert werden.',text:'Verändere die Skalierung eines Objekts über die Prozentfelder. Mindestens ein tatsächlicher Skalierungswert muss sich ändern.',begin:()=>({transforms:transforms()}),check:b=>scaleChanged(b.transforms)},
    {title:'8. Objektfarbe',glyph:'◉',tab:'measure',target:'color',where:'Im Bereich „Messen & Prüfen“ befindet sich die Farbauswahl „Objektfarbe“.',text:'Wähle ein Objekt aus und ändere seine Farbe. SILMO prüft, ob die Farbauswahl tatsächlich verändert wurde.',begin:()=>({color:$('color')?.value||''}),check:b=>($('color')?.value||'')!==b.color},
    {title:'9. Mehrfachauswahl und Gruppieren',glyph:'▧',tab:'edit',target:'multiSelectToggle',where:'Im Reiter „Bearbeiten“ findest du „Mehrfachauswahl“ und die Schaltfläche „Gruppieren“. Wähle mindestens zwei Objekte aus.',text:'Aktiviere die Mehrfachauswahl, wähle mindestens zwei Objekte und gruppiere sie. In der Objektliste werden Gruppenmitglieder gekennzeichnet.',begin:()=>({groups:groupCount()}),check:b=>groupCount()>b.groups},
    {title:'10. Ausrichten und Spiegeln',glyph:'⇥',tab:'edit',target:'alignSelected',where:'Die Werkzeuge „Ausrichten“, Achse und Bezugspunkt liegen im Reiter „Bearbeiten“. „Spiegeln“ findest du ebenfalls dort.',text:'Wähle mindestens zwei Objekte aus und richte sie über eine Achse aus. Probiere danach das Spiegeln aus. SILMO erkennt eine echte Änderung an den Objekttransformationen.',begin:()=>({transforms:transforms()}),check:b=>transformChanged(b.transforms)},
    {title:'11. 2D-Skizze zeichnen und extrudieren',glyph:'▭',tab:'draw',target:'sketchTool',where:'Öffne „Zeichnen“. Wähle im Feld „Skizzenwerkzeug“ ein Rechteck. Klicke auf „Zeichnen starten“, ziehe die Kontur auf der Druckplatte und klicke anschliessend auf „Skizze als 3D-Körper erstellen“.',text:'Zeichne ein Rechteck und verwandle es in einen 3D-Körper. Du kannst vor dem Erstellen Breite, Tiefe und Höhe einstellen.',begin:()=>({count:objectCount()}),check:b=>objectCount()>b.count&&sketchSnapshot()?.type==='rectangle'},
    {title:'12. Kreis, Ellipse und Dreieck',glyph:'◯',tab:'draw',target:'sketchTool',where:'Alle 2D-Grundformen findest du im Feld „Skizzenwerkzeug“. Bei einer Ellipse kannst du Breite und Tiefe getrennt einstellen.',text:'Wähle eine Ellipse oder ein Dreieck, zeichne die Kontur und erstelle daraus einen 3D-Körper. SILMO kontrolliert den Typ der zuletzt erzeugten Skizze.',begin:()=>({count:objectCount()}),check:b=>objectCount()>b.count&&['ellipse','triangle'].includes(sketchSnapshot()?.type)},
    {title:'13. Freiform zeichnen und 3D-Körper erstellen',glyph:'〰',tab:'draw',target:'sketchTool',where:'Öffne links den Reiter „Zeichnen“. Das Auswahlfeld heisst „Skizzenwerkzeug“. Wähle dort „2D-Freiform“. Direkt darunter findest du „Zeichnen starten“.',text:'Du zeichnest eine eigene Form, indem du die Zeichenfläche mit gedrückter Maustaste oder mit dem Finger/Apple Pencil entlangfährst. SILMO schliesst die Linie beim Loslassen automatisch. Danach machst du daraus einen 3D-Körper.',instructions:['Klicke links auf den Reiter „Zeichnen“.','Öffne das Auswahlfeld „Skizzenwerkzeug“ und wähle „2D-Freiform“.','Klicke auf „Zeichnen starten“. Die Zeichenfläche wird zum Zeichenbereich.','Suche auf dem Raster eine freie Stelle. Setze dort den Mauszeiger auf.','Computer: Halte die linke Maustaste gedrückt. iPad: Berühre die Fläche mit dem Finger oder Apple Pencil und halte den Kontakt.','Fahre in einer zusammenhängenden Bewegung über das Raster und zeichne eine einfache Form mit mindestens drei verschiedenen Ecken. Lass die Maustaste oder den Finger erst los, wenn du fertig bist.','Lass los. SILMO schliesst die Umrandung automatisch. Du musst den Anfang nicht exakt treffen. Unter dem Zeichenbereich sollte „Freiform bereit“ mit mindestens 3 Konturpunkten stehen.','Klicke auf „Skizze als 3D-Körper erstellen“. Jetzt sollte deine flache Zeichnung als 3D-Teil in der Objektliste erscheinen.','Falls „mindestens drei unterschiedliche Punkte“ erscheint: Klicke auf „Zeichenmodus beenden“, starte erneut und zeichne eine grössere Form mit mehreren Ecken.'],begin:()=>({count:objectCount()}),check:b=>objectCount()>b.count&&sketchSnapshot()?.type==='freeform2d'&&Number(sketchSnapshot()?.points)>=3},
    {title:'14. Raster und Rasterfang',glyph:'▦',tab:'draw',target:'sketchSnapEnabled',where:'Unter den Skizzeneinstellungen findest du „Rasterfang“ und die Rasterweite in Millimetern.',text:'Aktiviere den Rasterfang und stelle eine Rasterweite ein. Zeichne danach eine neue Skizze, deren Kontur am eingestellten Raster liegt.',begin:()=>({snap:$('sketchSnapEnabled')?.checked,grid:$('sketchGridMM')?.value||''}),check:b=>$('sketchSnapEnabled')?.checked===true&&($('sketchGridMM')?.value||'')!==''&&($('sketchGridMM')?.value||'')!==b.grid},
    {title:'15. Skizzenmasse und Konturpunkte',glyph:'⌗',tab:'draw',target:'loadSketchDimensions',where:'Öffne rechts im Zeichenbereich „Professionelle CAD-Bearbeitung“. Dort findest du „Exakte Masse und Position“, „Konturpunkte“ und die zugehörigen Laden-/Übernehmen-Schaltflächen.',text:'Wähle einen selbst erstellten Skizzenkörper aus. Lade seine Skizzenmasse und Konturpunkte. Ändere einen Konturpunkt oder eine Abmessung und übernimm die Änderung.',begin:()=>({status:$('status')?.textContent||''}),check:b=>{const t=$('status')?.textContent||'';return t!==b.status&&(/Konturpunkt .* geändert|Skizzenmasse aktualisiert/.test(t));}},
    {title:'16. Kanten abrunden und fasen',glyph:'◒',tab:'draw',target:'applyEdgeFillet',where:'Im rechten Zeichen-Eigenschaftenbereich unter „Professionelle CAD-Bearbeitung“ findest du die Kantenbearbeitung. Wähle einen extrudierten Skizzenkörper und einen kleinen Wert.',text:'Runde eine geeignete Kante ab oder erstelle eine Fase. Die Funktion arbeitet an Kanten extrudierter Skizzenprofile.',begin:()=>({status:$('status')?.textContent||''}),check:b=>{const t=$('status')?.textContent||'';return t!==b.status&&(/Kanten abgerundet|Kanten abgefast/.test(t));}},
    {title:'17. CAD-Beziehungen und Bedingungen',glyph:'∥',tab:'draw',target:'applySketchRelation',where:'Unter „Professionelle CAD-Bearbeitung“ findest du die CAD-Beziehungen. Dazu gehören parallel, senkrecht, tangential und konzentrisch.',text:'Wähle geeignete Skizzenelemente, stelle eine passende Beziehung ein und wende sie an. SILMO prüft die Erfolgsmeldung der CAD-Funktion.',begin:()=>({status:$('status')?.textContent||''}),check:b=>{const t=$('status')?.textContent||'';return t!==b.status&&(/parallel ausgerichtet|senkrecht ausgerichtet|tangential verbunden|konzentrisch ausgerichtet/.test(t));}},
    {title:'18. Loft, Sweep und Pfadlänge',glyph:'∿',tab:'draw',target:'createLoft',where:'Öffne rechts im Reiter „Zeichnen“ den Abschnitt „Professionelle CAD-Bearbeitung“. Scrolle dort bis „Komplexe Formoperationen“. Die beiden Schaltflächen heissen „Loft zwischen Profilen“ und „Profil entlang Pfad“.',text:'Diese Aufgabe ist etwas schwieriger. Wichtig: Für Loft brauchst du genau zwei geschlossene Skizzenprofile. Für Sweep brauchst du genau ein geschlossenes Profil UND eine gespeicherte 2D-/3D-Linie oder Kurve als Pfad. Normale Würfel oder Kugeln reichen nicht. Du darfst zuerst nur Loft ausprobieren; Sweep ist eine zweite Möglichkeit.',instructions:['Öffne links den Reiter „Zeichnen“. Beende zuerst einen eventuell noch aktiven Zeichenmodus mit „Zeichenmodus beenden“.','Öffne rechts den Abschnitt „Professionelle CAD-Bearbeitung“. Scrolle bis ganz nach unten zum Bereich „Komplexe Formoperationen“.','Für LOFT: Du brauchst genau zwei geschlossene Skizzenprofile. Das sind zwei Körper, die aus geschlossenen Skizzen erstellt wurden. Ein Rechteck, ein Kreis oder eine Ellipse eignen sich. Wenn du noch keine zwei hast, wähle links „Rechteck“, klicke „Zeichnen starten“, ziehe eine geschlossene Rechteck-Kontur und klicke „Als 3D-Körper erstellen“. Wiederhole das mit einer zweiten Form, zum Beispiel einem kleineren Kreis oder Rechteck.','Wähle die zwei Profil-Körper in der Objektliste aus. Am Computer: Klicke das erste Objekt an und halte beim zweiten Klick Strg (Windows) oder ⌘ Command (Mac) gedrückt. Auf dem iPad: Aktiviere zuerst „Mehrfachauswahl“ im Reiter „Bearbeiten“ und tippe beide Profil-Körper an. Es müssen genau zwei ausgewählt sein.','Klicke rechts auf „Loft zwischen Profilen“. Wenn es funktioniert, erscheint ein neuer Körper und links steht „Loft erstellt: zwei Skizzenprofile wurden zu einem Körper verbunden.“','Wenn eine Fehlermeldung erscheint: Wähle nicht einen normalen Würfel oder eine Kugel. Beide ausgewählten Körper müssen eine gespeicherte geschlossene Skizzenkontur besitzen. Prüfe auch, dass wirklich genau zwei Profile markiert sind.','Für SWEEP (freiwillig): Erstelle zuerst ein geschlossenes Profil, zum Beispiel ein Rechteck. Erstelle danach im Reiter „Zeichnen“ eine 2D-Linie oder Kurve und wandle sie – falls nötig – in einen 3D-Körper/Pfad um, sodass sie als Linien-/Kurvenpfad gespeichert ist.','Wähle für Sweep zuerst das Profil und danach den Pfad aus. Bei Mehrfachauswahl muss die Reihenfolge stimmen: zuerst Profil, danach Pfad. Klicke auf „Profil entlang Pfad“.','Die Meldung „Sweep braucht ein geschlossenes Profil und eine gespeicherte Linien-/Kurvenbahn“ bedeutet: Das erste Objekt ist kein geeignetes geschlossenes Profil oder das zweite Objekt enthält keinen gespeicherten Pfad. Du kannst dann zurückgehen und nur Loft fertigstellen.','Du kannst diese Aufgabe mit „Aufgabe überspringen“ oder ⇧ Shift + → jederzeit auslassen. Wenn du weiter üben möchtest, probiere es beliebig oft; „Erneut prüfen“ kontrolliert den Erfolg nochmals.'],begin:()=>({count:objectCount()}),check:b=>objectCount()>b.count&&/Loft erstellt|Sweep erstellt/.test($('status')?.textContent||'')},
    {title:'19. Verbinden und Abziehen',glyph:'⊕',tab:'create',target:'booleanUnion',where:'Im Bereich „Erstellen“ findest du „Formen verbinden“ und „Löcher / Form abziehen“. Wähle dafür die benötigten Körper aus.',text:'Verbinde zwei sich berührende oder überlappende Körper. Danach kannst du mit einem weiteren Körper eine Form abziehen. SILMO erkennt eine erfolgreiche Boolesche Operation.',begin:()=>({status:$('status')?.textContent||''}),check:b=>{const t=$('status')?.textContent||'';return t!==b.status&&(/verbunden|abgezogen|Boolesche/.test(t));}},
    {title:'20. Druckbett einstellen und prüfen',glyph:'▣',tab:'print',target:'applyBedSize',where:'Im Reiter „3D-Druck“ findest du die Druckbettgrösse, die Druckbettprüfung und die zusätzliche Modellprüfung.',text:'Stelle zuerst die passende Druckbettgrösse ein. Prüfe danach, ob alle Modelle auf die Platte passen. Starte zusätzlich die Druckmodell-Prüfung und kontrolliere den Bericht.',instructions:['Öffne links den Reiter „3D-Druck“.','Suche die Felder „Breite X (mm)“ und „Tiefe Y (mm)“ unter „Druckbettgrösse (mm)“.','Gib eine gültige Grösse ein. Zum Ausprobieren kannst du zum Beispiel 180 mm Breite und 180 mm Tiefe verwenden. Falls dein Drucker ein anderes Druckbett hat, nimm dessen echte Masse.','Klicke auf „Druckbettgrösse übernehmen“. Die 3D-Druckplatte sollte sich sichtbar anpassen.','Klicke im selben Reiter auf „Druckbett prüfen“. SILMO kontrolliert, ob alle Modelle innerhalb der Platte liegen.','Wenn ein Modell ausserhalb liegt, kannst du es auswählen und „Auf Arbeitsplatte stellen“ verwenden.','Starte danach „Modell auf Druckfehler prüfen“. Lies den Bericht zu Dreiecken, offenen Kanten, Abmessungen und Druckbettlage.','Wenn noch keine Modelle vorhanden sind, meldet SILMO das ausdrücklich. Erstelle zuerst einen Würfel oder importiere ein STL-Modell und starte die Prüfungen nochmals.'],begin:()=>({bed:($('bedWidth')?.value||'')+'x'+($('bedDepth')?.value||'')}),check:()=>/Druckbettprüfung/.test($('status')?.textContent||'')},
    {title:'21. Projekt speichern, STL und STEP exportieren und importieren',glyph:'⬇',tab:'project',target:'saveProjectButton',where:'Im Reiter „Projekt“ findest du die Projektdatei, den Import von STL- und STEP-Modellen sowie den Export in beide Formate.',text:'Speichere dein bearbeitbares SILMO-Projekt, exportiere eine STL-Datei und importiere sie danach wieder. STEP ist zusätzlich für den Austausch präziser CAD-Geometrie gedacht.',instructions:['Öffne links den Reiter „Projekt“.','Im Unterreiter „Projektdatei“ klickst du auf „Projekt speichern“. SILMO lädt eine JSON-Datei mit deinem bearbeitbaren Projekt herunter.','Wechsle zum Unterreiter „Export“. Klicke auf „STL exportieren“. Die STL-Datei enthält die Dreiecksgeometrie für einen Slicer.','Wenn ein nativer OCCT-Körper ausgewählt ist, kannst du zusätzlich „STEP exportieren“ wählen. STEP ist für den Austausch präziser CAD-Geometrie gedacht.','Wechsle zum Unterreiter „Import“. Ziehe eine STL-Datei auf die Ablagefläche oder wähle sie über „Datei auswählen …“ aus.','Für eine STEP-Datei verwendest du „STEP importieren (OCCT)“.','Nach dem Import erscheint das Modell zusätzlich in der Objektliste. Deine bisherigen Formen werden nicht ersetzt oder gelöscht.','Die JSON-Projektdatei öffnest du im Unterreiter „Projektdatei“ mit „Projekt öffnen“. STL und STEP gehören in den Modell-Import.'],begin:()=>({saved:window.__silmoSavedRevision||0,exported:window.__silmoExportRevision||0,imported:window.__silmoImportRevision||0}),check:b=>(window.__silmoSavedRevision||0)>b.saved&&(window.__silmoExportRevision||0)>b.exported&&(window.__silmoImportRevision||0)>b.imported}
  ];
  // Renumber the original CAD lessons after the eleven keyboard lessons.
  steps.forEach((step,i)=>{if(i>=11)step.title=step.title.replace(/^\d+\./,(i+1)+'.');});

  function objectCount(){return $('objects')?.querySelectorAll('.object-row').length||0;}
  function positions(){try{return window.__silmoTutorialAllPositions?.()||[];}catch(_){return [];}}
  function transforms(){try{return window.__silmoTutorialAllTransforms?.()||[];}catch(_){return [];}}
  function sketchSnapshot(){try{return window.__silmoSketchSnapshot?.()||null;}catch(_){return null;}}
  function fieldValues(id){const el=$(id);return el?[...el.querySelectorAll('input,select')].map(x=>x.value).join('|'):'';}
  function positionChanged(before){if(!Array.isArray(before))return false;const now=positions();return Array.isArray(now)&&before.some(p=>{const n=now.find(x=>x&&p&&x.uuid===p.uuid);return n&&(Math.abs(n.x-p.x)>window.SILMOTolerances.TUTORIAL_POSITION_CHANGE_WORLD_UNITS||Math.abs(n.y-p.y)>window.SILMOTolerances.TUTORIAL_POSITION_CHANGE_WORLD_UNITS||Math.abs(n.z-p.z)>window.SILMOTolerances.TUTORIAL_POSITION_CHANGE_WORLD_UNITS);});}
  function rotationChanged(before){if(!Array.isArray(before))return false;const now=transforms();return Array.isArray(now)&&before.some(p=>{const n=now.find(x=>x&&p&&x.uuid===p.uuid);return n&&['qx','qy','qz','qw'].some(k=>Math.abs((n[k]||0)-(p[k]||0))>0.01);});}
  function scaleChanged(before){if(!Array.isArray(before))return false;const now=transforms();return Array.isArray(now)&&before.some(p=>{const n=now.find(x=>x&&p&&x.uuid===p.uuid);return n&&['sx','sy','sz'].some(k=>Math.abs((n[k]||1)-(p[k]||1))>0.01);});}
  function transformChanged(before){if(!Array.isArray(before))return false;const now=transforms();return Array.isArray(now)&&before.some(p=>{const n=now.find(x=>x&&p&&x.uuid===p.uuid);return n&&['x','y','z','sx','sy','sz','qx','qy','qz','qw'].some(k=>Math.abs((n[k]||0)-(p[k]||0))>0.01);});}
  function groupCount(){return $('objects')?.querySelectorAll('.object-edit').length||0;}
  function feedback(message,success){const el=$('tutorialFeedback');el.textContent=message;el.classList.toggle('success',!!success);}
  function clearHighlight(){if(highlight)highlight.classList.remove('tutorial-highlight');highlight=null;}
  function selectTab(tab){const button=document.querySelector('[data-tab="' + tab + '"]');if(button&&!button.hidden)button.click();}
  function revealTarget(id){
    if(!id)return;
    const target=$(id);if(!target)return;
    let parent=target.parentElement;
    while(parent&&parent!==document.body){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
    clearHighlight();highlight=target;target.classList.add('tutorial-highlight');
    target.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});
  }
  function updateProgress(){$('tutorialProgress').querySelector('span').style.width=(phase==='exam'?100:((index+1)/steps.length*100))+'%';}
  function renderStep(){
    const step=steps[index];
    // Capture the new task baseline before changing tabs: tab clicks trigger global
    // interaction listeners, which used to evaluate the previous task's baseline.
    renderingStep=true;
    baseline=step.begin();
    // Aufgaben mit Seitenleisten-Werkzeugen brauchen die linke/rechte Werkzeugleiste.
    // Falls der Nutzer die 3D-Ansicht maximiert hat, wird sie für diese Lernaufgaben wieder eingeblendet.
    if(['print','measure','project'].includes(step.tab))document.body.classList.remove('viewport-expanded');
    selectTab(step.tab);
    $('tutorialStepLabel').textContent='LERNPHASE · AUFGABE '+(index+1)+' VON '+steps.length;
    $('tutorialVisualGlyph').textContent=step.glyph;$('tutorialVisualCaption').textContent=step.title;
    $('tutorialTitle').textContent=step.title;$('tutorialText').textContent=step.text;
    $('tutorialWhere').textContent='WO FINDEST DU ES? '+step.where;
    const instructionList=$('tutorialInstructionList');
    instructionList.replaceChildren();
    (Array.isArray(step.instructions)&&step.instructions.length?step.instructions:String(step.where).split(/(?<=[.!?])\s+/).filter(Boolean)).forEach((instruction,stepNumber)=>{
      const item=document.createElement('li');
      item.textContent=instruction;
      instructionList.append(item);
    });
    $('tutorialInstructions').hidden=false;
    const termList=$('tutorialTermList');
    termList.replaceChildren();
    const taskWords=[step.title,step.text,step.where].join(' ').toLocaleLowerCase('de-CH');
    const relevantTerms=beginnerDefinitions.filter(([term])=>taskWords.includes(term.toLocaleLowerCase('de-CH')));
    relevantTerms.forEach(([term,explanation])=>{
      const paragraph=document.createElement('p');
      const label=document.createElement('strong');
      label.textContent=term+': ';
      paragraph.append(label,document.createTextNode(explanation));
      termList.append(paragraph);
    });
    $('tutorialWordHelp').hidden=relevantTerms.length===0;
    $('tutorialWordHelp').open=false;
    $('tutorialExamPanel').hidden=true;$('tutorialQuickGuide').hidden=false;$('tutorialBack').hidden=false;$('tutorialRetry').hidden=false;$('tutorialKeyboard').hidden=true;$('tutorialKeyboardGuide').hidden=true;$('tutorialKeyboardGuide').open=false;
    $('tutorialBack').disabled=index===0;$('tutorialNext').textContent='Weiter';$('tutorialNext').disabled=true;$('tutorialSkipStep').hidden=false;
    updateProgress();if(step.target)revealTarget(step.target);else clearHighlight();
    renderingStep=false;
    feedback('Führe die Aufgabe aus. Du kannst es beliebig oft versuchen. SILMO prüft automatisch; „Erneut prüfen“ startet eine zusätzliche Kontrolle.',false);updateDebug();
  }
  window.__silmoTutorialShowStepForTest = n => { if (phase !== 'learn' || !Number.isInteger(n) || n < 0 || n >= steps.length) return false; index=n; renderStep(); return true; };
  function renderExam(){
    examPassed=false;
    clearHighlight();$('tutorialStepLabel').textContent='ABSCHLUSSTEST · SELBSTSTÄNDIG';
    $('tutorialVisualGlyph').textContent='♥';$('tutorialVisualCaption').textContent='Deine eigene Herzzeichnung';
    $('tutorialTitle').textContent='Zeichne selbst ein Herz';
    $('tutorialText').textContent='Zeichne im Reiter „Zeichnen“ eine geschlossene Freiform. SILMO vergleicht die Kontur mit einer ungefähren Herzform. Kleine Ungenauigkeiten sind erlaubt.';
    $('tutorialWhere').textContent='Öffne oben den Reiter „Zeichnen“, wähle links „2D-Freiform“ und zeichne die Umrandung. Danach klicke auf „Als 3D-Körper erstellen“.';
    $('tutorialInstructions').hidden=true;
    $('tutorialWordHelp').hidden=true;
    $('tutorialExamPanel').hidden=false;$('tutorialQuickGuide').hidden=true;$('tutorialBack').hidden=true;$('tutorialRetry').hidden=true;$('tutorialSkipStep').hidden=true;$('tutorialKeyboard').hidden=true;$('tutorialKeyboardGuide').hidden=true;
    $('tutorialNext').textContent='Abschlusstest prüfen';$('tutorialNext').disabled=false;
    $('tutorialExamHintText').hidden=true;$('tutorialExamHint').disabled=false;
    $('tutorialHeartRecognition').textContent='Noch keine Herzzeichnung geprüft. Zeichne zuerst eine geschlossene Freiform.';
    $('tutorialExamChecks').textContent='Noch nicht geprüft.';
    baseline={model:window.__silmoTutorialModelAudit?.()||[]};
    feedback('Der Abschlusstest beginnt. Zeichne ein Herz selbst – SILMO beurteilt die Form nur ungefähr.',false);
    updateProgress();updateDebug();
  }
  window.__silmoTutorialEnterExamForTest=()=>{phase='exam';shade.hidden=false;card.hidden=false;renderExam();return true;};
  function refreshHeartRecognition(){
    const result=window.__silmoHeartRecognitionSnapshot?.()||{recognized:false,score:0,reason:'Herzprüfung nicht verfügbar.'};
    $('tutorialHeartRecognition').textContent=result.recognized
      ? '✓ Herzform ungefähr erkannt ('+Math.round(result.score*100)+' % Ähnlichkeit). Du kannst den Abschlusstest prüfen.'
      : 'Noch nicht erkannt: '+result.reason+' Zeichne zwei Rundungen oben, eine Einbuchtung in der Mitte und eine Spitze unten.';
    $('tutorialHeartRecognition').classList.toggle('success',!!result.recognized);
    return result;
  }
  function updateDebug(){
    const el=$('tutorialDebug');if(!el)return;
    el.textContent='Build: '+(document.querySelector('meta[name="silmo-build"]')?.content||'unbekannt')+
      '\nPhase: '+phase+'\nAufgabe: '+(phase==='learn'?(index+1)+' / '+steps.length:'Abschlusstest')+
      '\nObjekte: '+objectCount()+'\nLetzter Status: '+($('status')?.textContent||'').slice(0,160);
  }
  function verifyStep(manual=false){
    if(phase!=='learn'||card.hidden||renderingStep)return false;
    let passed=false;
    try{passed=!!steps[index].check(baseline);}
    catch(error){
      console.error('SILMO Lernkontrolle:',error);
      $('tutorialNext').disabled=true;
      feedback('Die automatische Kontrolle hatte ein Problem. Deine Arbeit bleibt erhalten. Versuche es erneut oder führe die Aktion noch einmal aus.',false);
      updateDebug();return false;
    }
    $('tutorialNext').disabled=!passed;
    if(passed)feedback('Erfolgskontrolle bestanden: SILMO hat die erforderliche Änderung am Modell festgestellt. Klicke auf „Weiter“.',true);
    else if(manual)feedback('Noch nicht erkannt. Du kannst es beliebig oft erneut versuchen. Prüfe, ob die Aufgabe wirklich ausgeführt wurde.',false);
    updateDebug();return passed;
  }
  function open(){phase='learn';index=0;shade.hidden=false;card.hidden=false;renderStep();}
  function close(){clearHighlight();shade.hidden=true;card.hidden=true;}
  function skipCurrentStep(){
    if(phase!=='learn'||card.hidden)return;
    const skippedTitle=steps[index].title;
    feedback('Aufgabe übersprungen: '+skippedTitle+'. Deine bisherigen Formen und dein Modell bleiben unverändert. Du kannst später mit „Zurück“ wiederkommen oder die Aufgabe erneut öffnen.',false);
    if(index<steps.length-1){index++;renderStep();feedback('Vorherige Aufgabe übersprungen. Du kannst jederzeit mit „Zurück“ zurückgehen und sie ausprobieren.',false);return;}
    phase='exam';renderExam();
  }
  function next(){
    if(phase==='complete'){close();return;}
    if(phase==='learn'){
      verifyStep();if($('tutorialNext').disabled)return;
      if(index<steps.length-1){index++;renderStep();return;}
      phase='exam';renderExam();return;
    }
    if(phase==='exam'&&examPassed){completeCourse();return;}
    runExam();
  }
  function completeCourse(){
    if(!examPassed)return;
    try{localStorage.setItem('silmoCourseCompleted','true');}catch(_){}
    phase='complete';
    $('status').textContent='Lernkurs erfolgreich abgeschlossen – deine Herzzeichnung wurde erkannt.';
    launch.textContent='Lernkurs erneut starten';
    close();
  }
  function runExam(){
    const audit=window.__silmoTutorialModelAudit?.()||[];
    const valid=audit.filter(x=>x&&x.vertexCount>=20&&x.width>0&&x.depth>0&&x.height>0&&[x.width,x.depth,x.height].every(Number.isFinite));
    const hasExport=exportObserved||Number(window.__silmoExportRevision)>0||/STL exportiert/i.test($('status')?.textContent||'');
    const heart=refreshHeartRecognition();
    const checks=[
      {label:'Mindestens ein echter 3D-Körper mit ausreichend Geometrie',ok:valid.length>0},
      {label:'Modell besitzt messbare Abmessungen',ok:valid.some(x=>x.width>=2&&x.depth>=2&&x.height>=2)},
      {label:'SILMO erkennt deine selbst gezeichnete Herzform ungefähr',ok:heart.recognized},
      {label:'STL-Export erfolgreich durchgeführt',ok:hasExport}
    ];
    $('tutorialExamChecks').innerHTML=checks.map(x=>'<div class="tutorial-exam-result '+(x.ok?'ok':'pending')+'">'+(x.ok?'✓ ':'○ ')+x.label+'</div>').join('');
    const count=checks.filter(x=>x.ok).length;
    examPassed=count===checks.length;
    if(examPassed){
      feedback('Abschlusstest bestanden! SILMO hat deine Herzzeichnung ungefähr erkannt und die technischen Prüfungen sind erfüllt. Klicke auf „Kurs beenden“.',true);
      $('tutorialNext').textContent='Kurs beenden';
    }else{
      feedback('Noch nicht bestanden: '+checks.filter(x=>!x.ok).map(x=>x.label).join('; ')+'. Du kannst deine Zeichnung verbessern und erneut prüfen.',false);
      $('tutorialNext').textContent='Erneut prüfen';
    }
    $('tutorialNext').disabled=false;updateDebug();
  }

  $('tutorialToolGallery').addEventListener('click',event=>{
    const button=event.target.closest('.tutorial-tool-card');if(!button||phase!=='learn')return;
    selectTab(button.dataset.toolTab);revealTarget(button.dataset.target);
    feedback('Hier findest du „'+button.textContent.trim()+'“. Kehre danach zur Aufgabe zurück.',false);
  });
  // Das Lernfenster lässt sich am Griff aus dem Drehbereich ziehen – auch per Touch auf dem iPad.
  const dragHandle = $('tutorialDragHandle');
  let dragState = null;
  dragHandle.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const rect = card.getBoundingClientRect();
    dragState = { pointerId:event.pointerId, offsetX:event.clientX-rect.left, offsetY:event.clientY-rect.top };
    card.style.left = rect.left + 'px';
    card.style.top = rect.top + 'px';
    card.style.right = 'auto';
    card.style.transform = 'none';
    dragHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  dragHandle.addEventListener('pointermove', event => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - card.offsetWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - card.offsetHeight - margin);
    card.style.left = Math.max(margin, Math.min(maxLeft, event.clientX-dragState.offsetX)) + 'px';
    card.style.top = Math.max(margin, Math.min(maxTop, event.clientY-dragState.offsetY)) + 'px';
  });
  const stopDragging = event => { if (dragState && event.pointerId === dragState.pointerId) dragState = null; };
  dragHandle.addEventListener('pointerup', stopDragging);
  dragHandle.addEventListener('pointercancel', stopDragging);
  window.addEventListener('resize', () => {
    if (card.hidden || !card.style.left) return;
    const margin=8, rect=card.getBoundingClientRect();
    card.style.left=Math.max(margin,Math.min(window.innerWidth-card.offsetWidth-margin,rect.left))+'px';
    card.style.top=Math.max(margin,Math.min(window.innerHeight-70,rect.top))+'px';
  });
  launch.addEventListener('click',open);$('tutorialClose').addEventListener('click',close);$('tutorialSkip').addEventListener('click',close);
  $('tutorialBack').addEventListener('click',()=>{if(phase==='learn'&&index>0){index--;renderStep();}});
  $('tutorialNext').addEventListener('click',next);
  $('tutorialRetry').addEventListener('click',()=>verifyStep(true));
  $('tutorialSkipStep').addEventListener('click',skipCurrentStep);
  $('tutorialExamHint').addEventListener('click',()=>{
    $('tutorialExamHintText').hidden=false;
    $('tutorialExamHintText').textContent='Zeichne die Aussenlinie möglichst in einem Zug: Beginne oben in der kleinen Einbuchtung, ziehe eine runde linke oder rechte Hälfte, führe die Linie unten zu einer Spitze und zeichne die andere Hälfte zurück. Die Kontur wird beim Erstellen des 3D-Körpers automatisch geschlossen.';
    $('tutorialExamHint').disabled=true;
  });
  $('tutorialRecognizeHeart').addEventListener('click',()=>refreshHeartRecognition());
  document.addEventListener('pointerup',()=>{if(phase==='exam')setTimeout(refreshHeartRecognition,0);},true);
  document.addEventListener('click',event=>{if(phase==='exam'&&event.target?.closest('#createSketchSolid'))setTimeout(refreshHeartRecognition,0);},true);
  $('exportModel').addEventListener('click',()=>{setTimeout(()=>{if(/STL exportiert/i.test($('status')?.textContent||''))exportObserved=true;},300);});
  $('saveProjectButton').addEventListener('click',()=>{setTimeout(()=>{if(/gespeichert|Projekt gespeichert/i.test($('status')?.textContent||''))savedObserved=true;},250);});
  document.addEventListener('click',()=>{if(!card.hidden)verifyStep();},true);
  document.addEventListener('input',()=>{if(!card.hidden)verifyStep();},true);
  document.addEventListener('change',()=>{if(!card.hidden)verifyStep();},true);
  document.addEventListener('pointerup',()=>{if(!card.hidden)verifyStep();},true);
  function monitor(){if(!card.hidden){verifyStep();updateDebug();}requestAnimationFrame(monitor);}
  requestAnimationFrame(monitor);
  // Tastenkürzel zuverlässig über key UND code erkennen (Safari/macOS liefert
  // je nach Tastaturbelegung unterschiedliche key-Werte).
  window.addEventListener('keydown',event=>{
    if(phase!=='learn'||card.hidden)return;
    const id=steps[index]?.shortcutId;if(!id)return;
    const key=String(event.key||'').toLowerCase();
    const code=String(event.code||'').toLowerCase();
    const normalized=key.startsWith('arrow')?key:(code.startsWith('arrow')?code:key);
    const mod=event.ctrlKey||event.metaKey;
    let matched=false;
    if(id==='alt-shift-left')matched=event.altKey&&event.shiftKey&&normalized==='arrowleft';
    else if(id==='alt-shift-right')matched=event.altKey&&event.shiftKey&&normalized==='arrowright';
    else if(id==='shift-arrow')matched=event.shiftKey&&['arrowleft','arrowright','arrowup','arrowdown'].includes(normalized);
    else if(id.startsWith('mod-')){
      const wanted=id.slice(4);
      matched=mod&&(key===wanted||code==='key'+wanted);
    }
    if(!matched)return;
    observedShortcut=id;
    // Verhindert z. B. den Browser-Dialog bei Cmd+S, ohne die eigentliche
    // SILMO-Funktion auf document-Ebene zu blockieren.
    event.preventDefault();
    if(id==='alt-shift-left'||id==='alt-shift-right')event.stopImmediatePropagation();
    verifyStep();
  },true);
  // Tutorial navigation via external keyboard; capture before CAD arrow-key shortcuts.
  window.addEventListener('keydown',event=>{
    if(card.hidden)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
    if(event.altKey&&event.shiftKey&&event.key==='ArrowLeft'){
      event.preventDefault();event.stopImmediatePropagation();
      if(phase==='learn'&&index>0){index--;renderStep();}
    }else if(!event.altKey&&!event.ctrlKey&&!event.metaKey&&event.shiftKey&&(event.key==='ArrowRight'||event.code==='ArrowRight')){
      event.preventDefault();event.stopImmediatePropagation();
      if(phase==='learn')skipCurrentStep();
    }
  },true);
})();
