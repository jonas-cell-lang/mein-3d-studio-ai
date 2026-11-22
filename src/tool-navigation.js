
// Werkzeugnavigation: vorhandene Elemente werden verschoben, ihre IDs und Handler bleiben erhalten.
(() => {
  const nav = document.querySelector('.tool-tabs');
  const left = document.querySelector('.left-panel');
  const right = document.querySelector('.right-panel');
  const ids = [
    'addCube','addOcctBox','addOcctCylinder','addOcctSphere','addOcctCone','addOcctTorus','addSphere','addCylinder','addCone','addHexPrism','addTorus','duplicate','booleanUnion','booleanSubtract','booleanIntersect','importModel','exportModel','importStepModel','exportStepModel','stepFileInput',
    'saveProjectButton','openProjectButton','fileInput','projectFileInput','delete',
    'dropToBed','checkBed','fitView','bedWidth','bedDepth','applyBedSize','objects',
    'status','positionFields','scaleLock','sizeFields','percentFields','color','expertCenterToggle'
  ];
  const nodes = new Map();
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    nodes.set(id, ['bedWidth','bedDepth','color'].includes(id) ? (el.closest('.field') || el) : el);
  }
  // Erweiterte/ältere Spezialwerkzeuge bleiben erhalten, sind im normalen Modelliermodus aber ausgeblendet.
  const legacyIds = ['addOcctBox','addOcctCylinder','addOcctSphere','addOcctCone','addOcctTorus','importStepModel','exportStepModel','inspectOcctShape'];
  legacyIds.forEach(id => {
    const el = nodes.get(id) || document.getElementById(id);
    if (el) el.classList.add('expert-only');
  });
  const bedNote = document.createElement('p');
  bedNote.className = 'note expert-only';
  bedNote.textContent = 'Stelle Breite und Tiefe passend zu deinem 3D-Drucker ein.';
  const sizeNote = document.createElement('p');
  sizeNote.className = 'note';
  sizeNote.textContent = 'Exakte Objektmasse in Millimetern eingeben. Mit Enter oder beim Verlassen des Feldes übernehmen.';

  const leftContainer = document.createElement('div'); leftContainer.className = 'tab-content';
  const rightContainer = document.createElement('div'); rightContainer.className = 'tab-content';
  const paneMap = {};
  const tabDefs = [
    ['create','Modellieren'],['draw','Zeichnen'],['edit','Bearbeiten'],['measure','Messen & Prüfen'],['project','Projekt'],['print','3D-Druck'],['expert','Expertenzentrum']
  ];
  for (const [key] of tabDefs) {
    paneMap[key] = {};
    for (const [side, container] of [['left',leftContainer],['right',rightContainer]]) {
      const pane = document.createElement('section');
      pane.className = 'tab-pane' + (key === 'create' ? ' active-pane' : '');
      pane.dataset.pane = key;
      pane.id = `pane-${key}-${side}`;
      container.appendChild(pane);
      paneMap[key][side] = pane;
    }
  }
  const heading = (pane, text, cls='') => { const h=document.createElement('h2'); h.textContent=text; if(cls)h.className=cls; pane.appendChild(h); };
  const put = (pane, id) => { const n=nodes.get(id); if(n) pane.appendChild(n); };

  heading(paneMap.create.left,'Objekte');
  ['addCube','addOcctBox','addOcctCylinder','addOcctSphere','addOcctCone','addOcctTorus','addSphere','addCylinder','addCone','addHexPrism','addTorus','duplicate'].forEach(id=>put(paneMap.create.left,id));
  heading(paneMap.create.left,'Formen kombinieren');
  const booleanHelp=document.createElement('p'); booleanHelp.className='note'; booleanHelp.textContent='Wähle mindestens zwei Objekte in der Objektliste. Mit Strg-Klick kannst du mehrere auswählen. Das erste ausgewählte Objekt ist die Grundform.'; paneMap.create.left.appendChild(booleanHelp);
  ['booleanUnion','booleanSubtract','booleanIntersect'].forEach(id=>put(paneMap.create.left,id));
  const booleanNote=document.createElement('p'); booleanNote.className='note'; booleanNote.textContent='Beim Abziehen bleibt die erste Form erhalten; alle weiteren ausgewählten Formen schneiden sie aus. Die Schnittmenge benötigt zwei unveränderte OCCT-B-Rep-Körper.'; paneMap.create.left.appendChild(booleanNote);
  const booleanSeparateButton=document.createElement('button'); booleanSeparateButton.type='button'; booleanSeparateButton.id='booleanSeparate'; booleanSeparateButton.className='wide'; booleanSeparateButton.textContent='↗ Verbindung lösen'; paneMap.create.left.appendChild(booleanSeparateButton);
  const booleanSeparateNote=document.createElement('p'); booleanSeparateNote.className='note'; booleanSeparateNote.textContent='Stellt die ursprünglichen Einzelobjekte einer verbundenen Form wieder her – auch nach dem Speichern und Öffnen.'; paneMap.create.left.appendChild(booleanSeparateNote);
  heading(paneMap.create.left,'Objektliste'); put(paneMap.create.left,'objects');

  heading(paneMap.draw.left,'2D-Skizze');
  const sketchIntro=document.createElement('p'); sketchIntro.className='note'; sketchIntro.textContent='Zeichne Rechtecke, Kreise und freie geschlossene Konturen auf XY oder räumliche Linien auf XY, XZ oder YZ – mit Maus, Touch oder Apple Pencil. Extrudiere deine 2D-Skizze zu einem echten 3D-Körper.'; paneMap.draw.left.appendChild(sketchIntro);
  const sketchToolWrap=document.createElement('div'); sketchToolWrap.className='field';
  const sketchToolLabel=document.createElement('label'); sketchToolLabel.htmlFor='sketchTool'; sketchToolLabel.textContent='Zeichenwerkzeug';
  const sketchTool=document.createElement('select'); sketchTool.id='sketchTool'; sketchTool.innerHTML='<option value="rectangle">2D-Rechteck</option><option value="roundedRectangle">2D-Rechteck mit Rundungen</option><option value="circle">2D-Kreis</option><option value="ellipse">2D-Ellipse</option><option value="triangle">2D-Dreieck</option><option value="line2d">2D-Linie</option><option value="curve2d">2D-Kurve</option><option value="freeform2d">2D-Freiform</option><option value="line3d">3D-Linie</option>';
  sketchToolWrap.append(sketchToolLabel,sketchTool); paneMap.draw.left.appendChild(sketchToolWrap);
  const sketchSnapWrap=document.createElement('div'); sketchSnapWrap.className='field';
  const sketchSnapLabel=document.createElement('label'); sketchSnapLabel.htmlFor='sketchSnapEnabled'; sketchSnapLabel.textContent='Rasterfang aktivieren';
  const sketchSnapEnabled=document.createElement('input'); sketchSnapEnabled.id='sketchSnapEnabled'; sketchSnapEnabled.type='checkbox'; sketchSnapEnabled.checked=false;
  sketchSnapWrap.append(sketchSnapLabel,sketchSnapEnabled); paneMap.draw.left.appendChild(sketchSnapWrap);
  const sketchSmoothWrap=document.createElement('div'); sketchSmoothWrap.className='field';
  const sketchSmoothLabel=document.createElement('label'); sketchSmoothLabel.htmlFor='sketchSmoothEnabled'; sketchSmoothLabel.textContent='Freihand-Linien beruhigen';
  const sketchSmoothEnabled=document.createElement('input'); sketchSmoothEnabled.id='sketchSmoothEnabled'; sketchSmoothEnabled.type='checkbox'; sketchSmoothEnabled.checked=true;
  sketchSmoothWrap.append(sketchSmoothLabel,sketchSmoothEnabled);
  const sketchSmoothNote=document.createElement('p'); sketchSmoothNote.className='note'; sketchSmoothNote.textContent='Entfernt kleine Zitterschwankungen (ca. 0,5 mm), erhält aber erkennbare Ecken. Gilt beim Beenden der 2D-Freihandzeichnung.';
  sketchSmoothWrap.appendChild(sketchSmoothNote); paneMap.draw.left.appendChild(sketchSmoothWrap);
  const sketchGridWrap=document.createElement('div'); sketchGridWrap.className='field';
  const sketchGridLabel=document.createElement('label'); sketchGridLabel.htmlFor='sketchGridMM'; sketchGridLabel.textContent='Rasterweite (mm)';
  const sketchGridMM=document.createElement('input'); sketchGridMM.id='sketchGridMM'; sketchGridMM.type='number'; sketchGridMM.min='0.1'; sketchGridMM.max='100'; sketchGridMM.step='0.1'; sketchGridMM.value='10';
  sketchGridWrap.append(sketchGridLabel,sketchGridMM); paneMap.draw.left.appendChild(sketchGridWrap);
  const sketchPlaneWrap=document.createElement('div'); sketchPlaneWrap.className='field'; sketchPlaneWrap.id='sketchPlaneWrap';
  const sketchPlaneLabel=document.createElement('label'); sketchPlaneLabel.htmlFor='sketchPlaneSelect'; sketchPlaneLabel.textContent='Zeichenebene für 3D-Linie';
  const sketchPlaneSelect=document.createElement('select'); sketchPlaneSelect.id='sketchPlaneSelect'; sketchPlaneSelect.innerHTML='<option value="xy">XY – von oben</option><option value="xz">XZ – von vorne</option><option value="yz">YZ – von der Seite</option>';
  sketchPlaneWrap.append(sketchPlaneLabel,sketchPlaneSelect); paneMap.draw.left.appendChild(sketchPlaneWrap);
  const sketchDiameterWrap=document.createElement('div'); sketchDiameterWrap.className='field'; sketchDiameterWrap.id='sketchDiameterWrap';
  const sketchDiameterLabel=document.createElement('label'); sketchDiameterLabel.htmlFor='sketchDiameterMM'; sketchDiameterLabel.textContent='Linienstärke / Durchmesser (mm)';
  const sketchDiameter=document.createElement('input'); sketchDiameter.id='sketchDiameterMM'; sketchDiameter.type='number'; sketchDiameter.min='0.2'; sketchDiameter.max='50'; sketchDiameter.step='0.1'; sketchDiameter.value='1.2';
  sketchDiameterWrap.append(sketchDiameterLabel,sketchDiameter); paneMap.draw.left.appendChild(sketchDiameterWrap);
  const sketchWidthWrap=document.createElement('div'); sketchWidthWrap.className='field';
  const sketchWidthLabel=document.createElement('label'); sketchWidthLabel.htmlFor='sketchWidthMM'; sketchWidthLabel.textContent='Breite / Durchmesser (mm)';
  const sketchWidth=document.createElement('input'); sketchWidth.id='sketchWidthMM'; sketchWidth.type='number'; sketchWidth.min='0.1'; sketchWidth.max='2000'; sketchWidth.step='0.1'; sketchWidth.value='20';
  sketchWidthWrap.append(sketchWidthLabel,sketchWidth); paneMap.draw.left.appendChild(sketchWidthWrap);
  const cornerRadiusWrap=document.createElement('div'); cornerRadiusWrap.className='field'; cornerRadiusWrap.id='sketchCornerRadiusWrap';
  const cornerRadiusLabel=document.createElement('label'); cornerRadiusLabel.htmlFor='sketchCornerRadiusMM'; cornerRadiusLabel.textContent='Eckenradius (mm)';
  const cornerRadiusInput=document.createElement('input'); cornerRadiusInput.id='sketchCornerRadiusMM'; cornerRadiusInput.type='number'; cornerRadiusInput.min='0'; cornerRadiusInput.max='500'; cornerRadiusInput.step='0.1'; cornerRadiusInput.value='6';
  cornerRadiusWrap.append(cornerRadiusLabel,cornerRadiusInput); paneMap.draw.left.appendChild(cornerRadiusWrap);
  const sketchDepthWrap=document.createElement('div'); sketchDepthWrap.className='field';
  const sketchDepthLabel=document.createElement('label'); sketchDepthLabel.htmlFor='sketchDepthMM'; sketchDepthLabel.textContent='Tiefe Y (mm)';
  const sketchDepth=document.createElement('input'); sketchDepth.id='sketchDepthMM'; sketchDepth.type='number'; sketchDepth.min='0.1'; sketchDepth.max='2000'; sketchDepth.step='0.1'; sketchDepth.value='20';
  sketchDepthWrap.append(sketchDepthLabel,sketchDepth); paneMap.draw.left.appendChild(sketchDepthWrap);
  const sketchHeightWrap=document.createElement('div'); sketchHeightWrap.className='field';
  const sketchHeightLabel=document.createElement('label'); sketchHeightLabel.htmlFor='sketchHeightMM'; sketchHeightLabel.textContent='Extrusionshöhe / Bodenstärke Z (mm)';
  const sketchHeight=document.createElement('input'); sketchHeight.id='sketchHeightMM'; sketchHeight.type='number'; sketchHeight.min='0.1'; sketchHeight.max='2000'; sketchHeight.step='0.1'; sketchHeight.value='2';
  sketchHeightWrap.append(sketchHeightLabel,sketchHeight); paneMap.draw.left.appendChild(sketchHeightWrap);

  const sketchPositionXWrap=document.createElement('div'); sketchPositionXWrap.className='field';
  const sketchPositionXLabel=document.createElement('label'); sketchPositionXLabel.htmlFor='sketchPositionXMM'; sketchPositionXLabel.textContent='Mittelpunkt X (mm)';
  const sketchPositionX=document.createElement('input'); sketchPositionX.id='sketchPositionXMM'; sketchPositionX.type='number'; sketchPositionX.step='0.1'; sketchPositionX.placeholder='Mausposition';
  sketchPositionXWrap.append(sketchPositionXLabel,sketchPositionX);
  const sketchPositionYWrap=document.createElement('div'); sketchPositionYWrap.className='field';
  const sketchPositionYLabel=document.createElement('label'); sketchPositionYLabel.htmlFor='sketchPositionYMM'; sketchPositionYLabel.textContent='Mittelpunkt Y (mm)';
  const sketchPositionY=document.createElement('input'); sketchPositionY.id='sketchPositionYMM'; sketchPositionY.type='number'; sketchPositionY.step='0.1'; sketchPositionY.placeholder='Mausposition';
  sketchPositionYWrap.append(sketchPositionYLabel,sketchPositionY);

  const contourToolsHeading=document.createElement('h2');contourToolsHeading.classList.add('expert-only');contourToolsHeading.textContent='Kontur- und Wandwerkzeuge';paneMap.draw.left.appendChild(contourToolsHeading);
  const contourHelp=document.createElement('p');contourHelp.className='note expert-only';contourHelp.textContent='Erzeuge aus einer selbst gezeichneten geschlossenen Kontur einen hohlen Rahmen oder Wandkörper. Für Bohrungen und Ausschnitte wählst du den Grundkörper zuerst und den Schneidkörper danach.';paneMap.draw.left.appendChild(contourHelp);
  const wallThicknessWrap=document.createElement('div');wallThicknessWrap.className='field expert-only';
  const wallThicknessLabel=document.createElement('label');wallThicknessLabel.htmlFor='wallThicknessMM';wallThicknessLabel.textContent='Wandstärke (mm)';
  const wallThickness=document.createElement('input');wallThickness.id='wallThicknessMM';wallThickness.type='number';wallThickness.min='0.2';wallThickness.max='100';wallThickness.step='0.1';wallThickness.value='1.4';
  wallThicknessWrap.append(wallThicknessLabel,wallThickness);paneMap.draw.left.appendChild(wallThicknessWrap);
  const frameHeightWrap=document.createElement('div');frameHeightWrap.className='field expert-only';
  const frameHeightLabel=document.createElement('label');frameHeightLabel.htmlFor='frameHeightMM';frameHeightLabel.textContent='Rahmenhöhe (mm)';
  const frameHeight=document.createElement('input');frameHeight.id='frameHeightMM';frameHeight.type='number';frameHeight.min='0.2';frameHeight.max='2000';frameHeight.step='0.1';frameHeight.value='12';
  frameHeightWrap.append(frameHeightLabel,frameHeight);paneMap.draw.left.appendChild(frameHeightWrap);
  const contourFrameButton=document.createElement('button');contourFrameButton.type='button';contourFrameButton.id='createContourFrame';contourFrameButton.className='wide expert-only';contourFrameButton.textContent='▱ Hohlrahmen aus Kontur erzeugen';paneMap.draw.left.appendChild(contourFrameButton);
  const subtractSelectedButton=document.createElement('button');subtractSelectedButton.type='button';subtractSelectedButton.id='subtractSelected';subtractSelectedButton.className='wide expert-only';subtractSelectedButton.textContent='− Auswahl voneinander abziehen';paneMap.draw.left.appendChild(subtractSelectedButton);
  const sketchLockNote=document.createElement('p'); sketchLockNote.id='sketchViewLockNote'; sketchLockNote.className='note'; sketchLockNote.textContent='Während des Zeichnens ist die Kameradrehung gesperrt. Zoomen bleibt möglich.'; paneMap.draw.left.appendChild(sketchLockNote);
  const pickFacePlaneButton=document.createElement('button'); pickFacePlaneButton.type='button'; pickFacePlaneButton.id='pickFaceSketchPlane'; pickFacePlaneButton.className='wide'; pickFacePlaneButton.textContent='▱ Zeichenfläche auf Modell wählen'; paneMap.draw.left.appendChild(pickFacePlaneButton);
  const pickFacePlaneNote=document.createElement('p'); pickFacePlaneNote.className='note'; pickFacePlaneNote.textContent='Erster Schritt: Wähle die obere, waagerechte Fläche eines Körpers. Danach kannst du darauf skizzieren.'; paneMap.draw.left.appendChild(pickFacePlaneNote);
  const startSketchButton=document.createElement('button'); startSketchButton.type='button'; startSketchButton.id='startSketch'; startSketchButton.className='wide primary'; startSketchButton.textContent='✎ Zeichnen starten'; paneMap.draw.left.appendChild(startSketchButton);
  const createSketchButton=document.createElement('button'); createSketchButton.type='button'; createSketchButton.id='createSketchSolid'; createSketchButton.className='wide'; createSketchButton.textContent='▰ Als 3D-Körper erstellen'; createSketchButton.disabled=true; paneMap.draw.left.appendChild(createSketchButton);
  const cancelSketchButton=document.createElement('button'); cancelSketchButton.type='button'; cancelSketchButton.id='cancelSketch'; cancelSketchButton.className='wide'; cancelSketchButton.textContent='Skizze abbrechen'; cancelSketchButton.disabled=true; paneMap.draw.left.appendChild(cancelSketchButton);
  const sketchStatus=document.createElement('p'); sketchStatus.id='sketchStatus'; sketchStatus.className='note'; sketchStatus.setAttribute('aria-live','polite'); sketchStatus.textContent='Noch keine Skizze. Wähle ein 2D-Werkzeug oder eine 3D-Linie und starte den Zeichenmodus.'; paneMap.draw.left.appendChild(sketchStatus);

  // CAD-Zeichenarbeitsplatz v55: Werkzeugpalette links, exakte Eigenschaften rechts.
  const drawIntro=document.createElement('div');drawIntro.className='cad-workspace-intro';
  drawIntro.textContent='Skizziere präzise Konturen, lege Masse und Position fest und wandle sie anschliessend in editierbare 3D-Körper um.';
  sketchIntro.textContent='Wähle ein Werkzeug und starte den Zeichenmodus. Die Skizze wird auf der XY-Ebene gezeichnet.';
  paneMap.draw.left.insertBefore(drawIntro,sketchIntro);
  const toolPalette=document.createElement('div');toolPalette.className='cad-tool-grid';toolPalette.id='cadSketchToolPalette';
  const paletteTools=[
    ['rectangle','▭','Rechteck'],['roundedRectangle','▢','Rundung'],['circle','○','Kreis'],['ellipse','⬭','Ellipse'],
    ['triangle','△','Dreieck'],['line2d','／','Linie'],['curve2d','〰','Kurve'],['freeform2d','✎','Freiform'],['line3d','⌁','3D-Linie']
  ];
  const advancedSketchTools = new Set(['roundedRectangle','ellipse','triangle','curve2d','freeform2d','line3d']);
  paletteTools.forEach(([value,glyph,label])=>{
    const button=document.createElement('button');button.type='button';button.className='cad-tool-button'+(advancedSketchTools.has(value)?' expert-only':'');button.dataset.sketchTool=value;button.setAttribute('aria-pressed',String(sketchTool.value===value));
    const icon=document.createElement('span');icon.className='cad-tool-icon';icon.textContent=glyph;
    const text=document.createElement('span');text.textContent=label;button.append(icon,text);
    button.addEventListener('click',()=>{sketchTool.value=value;sketchTool.dispatchEvent(new Event('change',{bubbles:true}));});
    toolPalette.appendChild(button);
  });
  paneMap.draw.left.insertBefore(toolPalette,sketchToolWrap);

  // Einfacher Punktmodus: Konturen durch einzelne Klicks statt durch freihändiges Ziehen zeichnen.
  const clickContourPanel=document.createElement('div');clickContourPanel.className='cad-group-body';clickContourPanel.id='clickContourPanel';
  clickContourPanel.style.cssText='margin:10px 0;padding:12px;border:1px solid #365575;border-radius:12px;background:#10243a';
  const clickContourTitle=document.createElement('strong');clickContourTitle.textContent='Einfach zeichnen – Punkt für Punkt';
  const clickContourHelp=document.createElement('p');clickContourHelp.className='note';clickContourHelp.textContent='Zeichne zuerst die Aussenkontur. Danach kannst du mit „Innenloch“ weitere geschlossene Konturen in derselben Skizze hinzufügen. Ungültige, überlappende oder ausserhalb liegende Löcher werden abgewiesen.';
  const clickContourToggle=document.createElement('button');clickContourToggle.type='button';clickContourToggle.id='clickContourToggle';clickContourToggle.className='wide';clickContourToggle.textContent='＋ Punktmodus einschalten';clickContourToggle.setAttribute('aria-pressed','false');
  const clickContourUndo=document.createElement('button');clickContourUndo.type='button';clickContourUndo.id='clickContourUndo';clickContourUndo.className='wide';clickContourUndo.textContent='↶ Letzten Punkt entfernen';clickContourUndo.disabled=true;
  const clickContourFinish=document.createElement('button');clickContourFinish.type='button';clickContourFinish.id='clickContourFinish';clickContourFinish.className='wide primary';clickContourFinish.textContent='✓ Kontur abschliessen';clickContourFinish.disabled=true;
  const clickContourHoleToggle=document.createElement('button');clickContourHoleToggle.type='button';clickContourHoleToggle.id='clickContourHoleToggle';clickContourHoleToggle.className='wide';clickContourHoleToggle.textContent='＋ Innenloch in dieser Skizze zeichnen';clickContourHoleToggle.disabled=true;clickContourHoleToggle.setAttribute('aria-pressed','false');
  const clickContourStraightLabel=document.createElement('label');clickContourStraightLabel.style.cssText='display:flex;align-items:center;gap:8px;margin:8px 0;color:#dcecff';
  const clickContourStraight=document.createElement('input');clickContourStraight.type='checkbox';clickContourStraight.id='clickContourStraight';clickContourStraight.checked=true;
  clickContourStraightLabel.append(clickContourStraight,document.createTextNode('Linien begradigen (45°-Raster)'));
  const clickContourStraightHelp=document.createElement('small');clickContourStraightHelp.textContent='Neue Kanten werden waagrecht, senkrecht oder diagonal ausgerichtet.';
  clickContourPanel.append(clickContourTitle,clickContourHelp,clickContourStraightLabel,clickContourStraightHelp,clickContourToggle,clickContourHoleToggle,clickContourUndo,clickContourFinish);
  paneMap.draw.left.insertBefore(clickContourPanel,startSketchButton);

  const createGroup=(parent,title,open=false)=>{
    const details=document.createElement('details');details.className='cad-group';details.open=open;
    const summary=document.createElement('summary');summary.textContent=title;
    const body=document.createElement('div');body.className='cad-group-body';
    details.append(summary,body);parent.appendChild(details);return body;
  };
  const drawRight=paneMap.draw.right;
  heading(drawRight,'Skizzen-Eigenschaften');
  const typeGroup=createGroup(drawRight,'Werkzeugtyp',true);typeGroup.appendChild(sketchToolWrap);
  const dimensionGroup=createGroup(drawRight,'Exakte Masse und Position',true);
  const dimensionGrid=document.createElement('div');dimensionGrid.className='cad-dimension-grid';
  [sketchWidthWrap,sketchDepthWrap,sketchHeightWrap,cornerRadiusWrap,sketchPositionXWrap,sketchPositionYWrap].forEach(node=>dimensionGrid.appendChild(node));
  dimensionGroup.appendChild(dimensionGrid);
  const dimensionHelp=document.createElement('p');dimensionHelp.className='cad-inline-help';dimensionHelp.textContent='Masse in Millimetern. Mittelpunkt X/Y leer lassen, um die Position deiner Zeichnung zu übernehmen.';dimensionGroup.appendChild(dimensionHelp);
  const snapGroup=createGroup(drawRight,'Raster und Zeichenoptionen',true);
  snapGroup.append(sketchSnapWrap,sketchGridWrap,sketchPlaneWrap,sketchDiameterWrap);
  const wallGroup=createGroup(drawRight,'Wand und Kontur bearbeiten',false);
  wallGroup.appendChild(contourHelp);
  const wallGrid=document.createElement('div');wallGrid.className='cad-dimension-grid';wallGrid.append(wallThicknessWrap,frameHeightWrap);wallGroup.appendChild(wallGrid);
  wallGroup.append(contourFrameButton,subtractSelectedButton);
  const proGroup=createGroup(drawRight,'Professionelle CAD-Bearbeitung',false);proGroup.classList.add('cad-pro-group');
  const constraintLabel=document.createElement('label');constraintLabel.htmlFor='sketchConstraint';constraintLabel.textContent='Skizzenbedingung';
  const sketchConstraint=document.createElement('select');sketchConstraint.id='sketchConstraint';
  sketchConstraint.innerHTML='<option value="none">Keine zusätzliche Bedingung</option><option value="horizontal">Horizontal (Linie)</option><option value="vertical">Vertikal (Linie)</option><option value="equal">Gleiche Breite und Tiefe</option><option value="centered">Auf Ursprung zentrieren</option>';
  const constraintWrap=document.createElement('div');constraintWrap.className='field';constraintWrap.append(constraintLabel,sketchConstraint);proGroup.appendChild(constraintWrap);
  const constraintNote=document.createElement('p');constraintNote.className='cad-pro-note';constraintNote.textContent='Rechteckige Profile besitzen bereits parallele und rechtwinklige Kanten. Diese Bedingungen richten Linien aus, gleichen Masse an oder zentrieren Profile.';
  proGroup.appendChild(constraintNote);
  const relationLabel=document.createElement('label');relationLabel.htmlFor='cadRelationSelect';relationLabel.textContent='Beziehung zwischen zwei Skizzen';
  const relationSelect=document.createElement('select');relationSelect.id='cadRelationSelect';relationSelect.innerHTML='<option value="parallel">Parallel</option><option value="perpendicular">Senkrecht</option><option value="concentric">Konzentrisch</option><option value="tangent">Tangential verbinden</option>';
  const relationWrap=document.createElement('div');relationWrap.className='field';relationWrap.append(relationLabel,relationSelect);proGroup.appendChild(relationWrap);
  const applyRelationButton=document.createElement('button');applyRelationButton.type='button';applyRelationButton.id='applySketchRelation';applyRelationButton.className='wide';applyRelationButton.textContent='↔ Bedingung auf zwei Auswahlen anwenden';proGroup.appendChild(applyRelationButton);
  const relationNote=document.createElement('p');relationNote.className='cad-pro-note';relationNote.textContent='Wähle zwei Linien/Kurven für Parallel, Senkrecht oder Tangential. Für Konzentrisch wähle zwei geschlossene Profile.';proGroup.appendChild(relationNote);
  const proDividerRelation=document.createElement('div');proDividerRelation.className='cad-pro-divider';proGroup.appendChild(proDividerRelation);
  const pathHeading=document.createElement('h3');pathHeading.textContent='Linienlänge exakt bemaßen';proGroup.appendChild(pathHeading);
  const pathLengthWrap=document.createElement('div');pathLengthWrap.className='field';const pathLengthLabel=document.createElement('label');pathLengthLabel.htmlFor='editPathLengthMM';pathLengthLabel.textContent='Pfadlänge (mm)';const pathLengthInput=document.createElement('input');pathLengthInput.id='editPathLengthMM';pathLengthInput.type='number';pathLengthInput.min='0.1';pathLengthInput.max='20000';pathLengthInput.step='0.1';pathLengthInput.value='20';pathLengthWrap.append(pathLengthLabel,pathLengthInput);proGroup.appendChild(pathLengthWrap);
  const pathLengthActions=document.createElement('div');pathLengthActions.className='cad-pro-actions';
  const loadPathLength=document.createElement('button');loadPathLength.type='button';loadPathLength.id='loadPathLength';loadPathLength.textContent='Länge laden';
  const applyPathLength=document.createElement('button');applyPathLength.type='button';applyPathLength.id='applyPathLength';applyPathLength.textContent='Länge übernehmen';
  pathLengthActions.append(loadPathLength,applyPathLength);proGroup.appendChild(pathLengthActions);
  const distanceHeading=document.createElement('h3');distanceHeading.textContent='Abstand zwischen zwei Objekten';proGroup.appendChild(distanceHeading);
  const distanceGrid=document.createElement('div');distanceGrid.className='cad-pro-grid';
  const distanceAxisWrap=document.createElement('div');distanceAxisWrap.className='field';const distanceAxisLabel=document.createElement('label');distanceAxisLabel.htmlFor='objectDistanceAxis';distanceAxisLabel.textContent='Achse';const distanceAxis=document.createElement('select');distanceAxis.id='objectDistanceAxis';distanceAxis.innerHTML='<option value="x">X</option><option value="y">Y</option><option value="z">Z</option>';distanceAxisWrap.append(distanceAxisLabel,distanceAxis);
  const distanceValueWrap=document.createElement('div');distanceValueWrap.className='field';const distanceValueLabel=document.createElement('label');distanceValueLabel.htmlFor='objectDistanceMM';distanceValueLabel.textContent='Mittelpunktabstand (mm)';const distanceValue=document.createElement('input');distanceValue.id='objectDistanceMM';distanceValue.type='number';distanceValue.min='0';distanceValue.max='20000';distanceValue.step='0.1';distanceValue.value='20';distanceValueWrap.append(distanceValueLabel,distanceValue);
  distanceGrid.append(distanceAxisWrap,distanceValueWrap);proGroup.appendChild(distanceGrid);
  const applyDistance=document.createElement('button');applyDistance.type='button';applyDistance.id='applyObjectDistance';applyDistance.className='wide';applyDistance.textContent='↔ Abstand festlegen';proGroup.appendChild(applyDistance);
  const proDivider1=document.createElement('div');proDivider1.className='cad-pro-divider';proGroup.appendChild(proDivider1);
  const editHeading=document.createElement('h3');editHeading.textContent='Ausgewählte Skizze nachträglich bemaßen';proGroup.appendChild(editHeading);
  const editGrid=document.createElement('div');editGrid.className='cad-pro-grid';
  const makeProField=(id,labelText,value)=>{const wrap=document.createElement('div');wrap.className='field';const label=document.createElement('label');label.htmlFor=id;label.textContent=labelText;const input=document.createElement('input');input.id=id;input.type='number';input.min='0.1';input.max='2000';input.step='0.1';input.value=String(value);wrap.append(label,input);editGrid.appendChild(wrap);return input;};
  const editSketchWidth=makeProField('editSketchWidthMM','Breite X (mm)',20);
  const editSketchDepth=makeProField('editSketchDepthMM','Tiefe Y (mm)',20);
  const editSketchHeight=makeProField('editSketchHeightMM','Höhe Z (mm)',2);
  proGroup.appendChild(editGrid);
  const loadSketchDims=document.createElement('button');loadSketchDims.type='button';loadSketchDims.id='loadSketchDimensions';loadSketchDims.className='wide';loadSketchDims.textContent='↧ Masse der Auswahl laden';proGroup.appendChild(loadSketchDims);
  const applySketchDims=document.createElement('button');applySketchDims.type='button';applySketchDims.id='applySketchDimensions';applySketchDims.className='wide primary';applySketchDims.textContent='✓ Skizzenmasse übernehmen';proGroup.appendChild(applySketchDims);
  const editNote=document.createElement('p');editNote.className='cad-pro-note';editNote.textContent='Wähle einen zuvor extrudierten Skizzenkörper. Die Geometrie wird angepasst; Position und Drehung bleiben erhalten.';proGroup.appendChild(editNote);
  const pointDivider=document.createElement('div');pointDivider.className='cad-pro-divider';proGroup.appendChild(pointDivider);
  const pointHeading=document.createElement('h3');pointHeading.textContent='Einzelne Skizzenpunkte bearbeiten';proGroup.appendChild(pointHeading);
  const pointHelp=document.createElement('p');pointHelp.className='cad-pro-note';pointHelp.textContent='Lade die Aussenkontur oder eines der Innenlöcher eines ausgewählten Skizzenkörpers. Wähle einen Punkt und ändere seine X-/Y-Koordinate millimetergenau. Alle übrigen Konturen bleiben erhalten.';proGroup.appendChild(pointHelp);
  const contourSelectWrap=document.createElement('div');contourSelectWrap.className='field';
  const contourSelectLabel=document.createElement('label');contourSelectLabel.htmlFor='sketchContourIndex';contourSelectLabel.textContent='Kontur';
  const contourSelect=document.createElement('select');contourSelect.id='sketchContourIndex';contourSelect.innerHTML='<option value="0">Aussenkontur</option>';
  contourSelectWrap.append(contourSelectLabel,contourSelect);proGroup.appendChild(contourSelectWrap);
  const pointSelectWrap=document.createElement('div');pointSelectWrap.className='field';
  const pointSelectLabel=document.createElement('label');pointSelectLabel.htmlFor='sketchPointIndex';pointSelectLabel.textContent='Konturpunkt';
  const pointSelect=document.createElement('select');pointSelect.id='sketchPointIndex';pointSelect.innerHTML='<option value="0">Punkt 1</option>';
  pointSelectWrap.append(pointSelectLabel,pointSelect);proGroup.appendChild(pointSelectWrap);
  const pointGrid=document.createElement('div');pointGrid.className='cad-pro-grid';
  const makePointField=(id,labelText,value)=>{const wrap=document.createElement('div');wrap.className='field';const label=document.createElement('label');label.htmlFor=id;label.textContent=labelText;const input=document.createElement('input');input.id=id;input.type='number';input.step='0.1';input.value=String(value);wrap.append(label,input);pointGrid.appendChild(wrap);return input;};
  makePointField('sketchPointXMM','Punkt X (mm)',0);makePointField('sketchPointYMM','Punkt Y (mm)',0);proGroup.appendChild(pointGrid);
  const pointActions=document.createElement('div');pointActions.className='cad-pro-actions';
  const loadPointButton=document.createElement('button');loadPointButton.type='button';loadPointButton.id='loadSketchPoints';loadPointButton.textContent='Konturpunkte laden';
  const applyPointButton=document.createElement('button');applyPointButton.type='button';applyPointButton.id='applySketchPoint';applyPointButton.className='primary';applyPointButton.textContent='Punkt übernehmen';
  pointActions.append(loadPointButton,applyPointButton);proGroup.appendChild(pointActions);
  const vertexActions=document.createElement('div');vertexActions.className='cad-pro-actions';
  const insertPointButton=document.createElement('button');insertPointButton.type='button';insertPointButton.id='insertSketchPoint';insertPointButton.textContent='＋ Punkt einfügen';
  const deletePointButton=document.createElement('button');deletePointButton.type='button';deletePointButton.id='deleteSketchPoint';deletePointButton.textContent='− Punkt entfernen';
  vertexActions.append(insertPointButton,deletePointButton);proGroup.appendChild(vertexActions);
  const removeContourButton=document.createElement('button');removeContourButton.type='button';removeContourButton.id='removeSketchHole';removeContourButton.className='wide';removeContourButton.textContent='× Ganzes Innenloch entfernen';proGroup.appendChild(removeContourButton);
  const pointNote=document.createElement('p');pointNote.className='cad-pro-note';pointNote.textContent='Hinweis: Das ist ein direkter Kontur-Editor. Er löst noch keine vollständigen parametrischen Abhängigkeiten zwischen mehreren Linien.';proGroup.appendChild(pointNote);
  const proDivider2=document.createElement('div');proDivider2.className='cad-pro-divider';proGroup.appendChild(proDivider2);
  const edgeHeading=document.createElement('h3');edgeHeading.textContent='Kanten abrunden oder abfasen';proGroup.appendChild(edgeHeading);
  const edgeRadiusWrap=document.createElement('div');edgeRadiusWrap.className='field';const edgeRadiusLabel=document.createElement('label');edgeRadiusLabel.htmlFor='edgeTreatmentMM';edgeRadiusLabel.textContent='Radius / Fasenbreite (mm)';const edgeRadius=document.createElement('input');edgeRadius.id='edgeTreatmentMM';edgeRadius.type='number';edgeRadius.min='0.1';edgeRadius.max='20';edgeRadius.step='0.1';edgeRadius.value='1';edgeRadiusWrap.append(edgeRadiusLabel,edgeRadius);proGroup.appendChild(edgeRadiusWrap);
  const edgeActions=document.createElement('div');edgeActions.className='cad-pro-actions';
  const filletButton=document.createElement('button');filletButton.type='button';filletButton.id='applyEdgeFillet';filletButton.textContent='◜ Kanten abrunden';
  const chamferButton=document.createElement('button');chamferButton.type='button';chamferButton.id='applyEdgeChamfer';chamferButton.textContent='／ Kanten abfasen';
  edgeActions.append(filletButton,chamferButton);proGroup.appendChild(edgeActions);
  const edgeNote=document.createElement('p');edgeNote.className='cad-pro-note';edgeNote.textContent='Funktioniert auf extrudierten 2D-Skizzen mit gespeicherter Kontur. Bei sehr engen oder konkaven Konturen kann ein kleinerer Wert nötig sein.';proGroup.appendChild(edgeNote);
  const proDivider3=document.createElement('div');proDivider3.className='cad-pro-divider';proGroup.appendChild(proDivider3);
  const formHeading=document.createElement('h3');formHeading.textContent='Komplexe Formoperationen';proGroup.appendChild(formHeading);
  const formActions=document.createElement('div');formActions.className='cad-pro-actions';
  const loftButton=document.createElement('button');loftButton.type='button';loftButton.id='createLoft';loftButton.textContent='⤢ Loft zwischen Profilen';
  const sweepButton=document.createElement('button');sweepButton.type='button';sweepButton.id='createSweep';sweepButton.textContent='〰 Profil entlang Pfad';
  formActions.append(loftButton,sweepButton);proGroup.appendChild(formActions);
  const updateLoftButton=document.createElement('button');updateLoftButton.type='button';updateLoftButton.id='updateLoftFromSources';updateLoftButton.className='wide';updateLoftButton.textContent='↻ Aus Quellprofilen aktualisieren';proGroup.appendChild(updateLoftButton);
  const formNote=document.createElement('p');formNote.className='cad-pro-note';formNote.textContent='Loft: Wähle zuerst Aussenprofil A und B. Für jedes Innenloch folgen danach zwei passende Konturen (A und B), also 4, 6, 8 … Profile insgesamt. Ein ausgewähltes Loft lässt sich später aus seinen gespeicherten Quellprofilen neu aufbauen. Sweep: Wähle zuerst ein geschlossenes Profil und danach eine gezeichnete 2D-/3D-Linie oder Kurve als Pfad.';proGroup.appendChild(formNote);
  // Start-/Abschlussaktionen gehören direkt zum Skizzieren und bleiben dort sichtbar.
  const actionWrap=document.createElement('div');actionWrap.className='cad-draw-actions';actionWrap.append(startSketchButton,createSketchButton,cancelSketchButton);
  paneMap.draw.left.insertBefore(clickContourPanel,contourToolsHeading);
  paneMap.draw.left.insertBefore(sketchLockNote,contourToolsHeading);
  paneMap.draw.left.insertBefore(actionWrap,contourToolsHeading);
  paneMap.draw.left.insertBefore(sketchStatus,contourToolsHeading);
  // Die Werkzeugauswahl und Parameter liegen nun bewusst rechts; links bleibt die Werkzeugpalette.
  [sketchToolWrap,sketchSnapWrap,sketchGridWrap,sketchPlaneWrap,sketchDiameterWrap,sketchWidthWrap,cornerRadiusWrap,sketchDepthWrap,sketchHeightWrap,wallThicknessWrap,frameHeightWrap,contourFrameButton,subtractSelectedButton,contourHelp].forEach(node=>{if(node.parentElement===paneMap.draw.left)node.remove();});
  const syncPalette=()=>toolPalette.querySelectorAll('[data-sketch-tool]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sketchTool===sketchTool.value)));
  sketchTool.addEventListener('change',syncPalette);syncPalette();


  heading(paneMap.edit.left,'Bearbeiten');
  ['delete','fitView'].forEach(id=>put(paneMap.edit.left,id));
  const multiSelectButton=document.createElement('button'); multiSelectButton.type='button'; multiSelectButton.id='multiSelectToggle'; multiSelectButton.className='wide'; multiSelectButton.textContent='☷ Mehrfachauswahl: AUS'; multiSelectButton.setAttribute('aria-pressed','false'); paneMap.edit.left.appendChild(multiSelectButton);
  const alignHeading=document.createElement('h2'); alignHeading.textContent='Ausrichten & Verteilen'; paneMap.edit.left.appendChild(alignHeading);
  const alignHelp=document.createElement('p'); alignHelp.className='note'; alignHelp.textContent='Wähle mindestens zwei Objekte. Mehrfachauswahl einschalten und die Objekte in der Liste antippen. Das zuerst ausgewählte Objekt bleibt bei „Am ersten Objekt“ an seiner Position.'; paneMap.edit.left.appendChild(alignHelp);
  const alignAxisWrap=document.createElement('div'); alignAxisWrap.className='field';
  const alignAxisLabel=document.createElement('label'); alignAxisLabel.htmlFor='alignAxis'; alignAxisLabel.textContent='Achse';
  const alignAxis=document.createElement('select'); alignAxis.id='alignAxis'; alignAxis.innerHTML='<option value="x">X – links / rechts</option><option value="y">Y – vorne / hinten</option><option value="z">Z – unten / oben</option>';
  alignAxisWrap.append(alignAxisLabel,alignAxis); paneMap.edit.left.appendChild(alignAxisWrap);
  const alignOperationWrap=document.createElement('div'); alignOperationWrap.className='field';
  const alignOperationLabel=document.createElement('label'); alignOperationLabel.htmlFor='alignOperation'; alignOperationLabel.textContent='Aktion';
  const alignOperation=document.createElement('select'); alignOperation.id='alignOperation'; alignOperation.innerHTML='<option value="align">Ausrichten</option><option value="distribute">Gleichmässig verteilen</option><option value="gap">Exakten Abstand einstellen</option>';
  alignOperationWrap.append(alignOperationLabel,alignOperation); paneMap.edit.left.appendChild(alignOperationWrap);
  const alignModeWrap=document.createElement('div'); alignModeWrap.className='field'; alignModeWrap.id='alignModeWrap';
  const alignModeLabel=document.createElement('label'); alignModeLabel.htmlFor='alignMode'; alignModeLabel.textContent='Ausrichtung';
  const alignMode=document.createElement('select'); alignMode.id='alignMode'; alignMode.innerHTML='<option value="min">Linke / vordere / untere Kante</option><option value="center">Mitte</option><option value="max">Rechte / hintere / obere Kante</option>';
  alignModeWrap.append(alignModeLabel,alignMode); paneMap.edit.left.appendChild(alignModeWrap);
  const alignReferenceWrap=document.createElement('div'); alignReferenceWrap.className='field'; alignReferenceWrap.id='alignReferenceWrap';
  const alignReferenceLabel=document.createElement('label'); alignReferenceLabel.htmlFor='alignReference'; alignReferenceLabel.textContent='Bezugspunkt';
  const alignReference=document.createElement('select'); alignReference.id='alignReference'; alignReference.innerHTML='<option value="first">Am ersten ausgewählten Objekt</option><option value="common">An gemeinsamer Mitte / Kante</option>';
  alignReferenceWrap.append(alignReferenceLabel,alignReference); paneMap.edit.left.appendChild(alignReferenceWrap);
  const alignGapWrap=document.createElement('div'); alignGapWrap.className='field'; alignGapWrap.id='alignGapWrap';
  const alignGapLabel=document.createElement('label'); alignGapLabel.htmlFor='alignGapMM'; alignGapLabel.textContent='Abstand zwischen Objekten (mm)';
  const alignGap=document.createElement('input'); alignGap.id='alignGapMM'; alignGap.type='number'; alignGap.min='0'; alignGap.step='0.1'; alignGap.value='2';
  alignGapWrap.append(alignGapLabel,alignGap); paneMap.edit.left.appendChild(alignGapWrap);
  const alignButton=document.createElement('button'); alignButton.type='button'; alignButton.id='alignSelected'; alignButton.className='wide primary'; alignButton.textContent='⇔ Aktion ausführen'; paneMap.edit.left.appendChild(alignButton);
  const updateAlignControls=()=>{const op=alignOperation.value;alignModeWrap.hidden=op!=='align';alignReferenceWrap.hidden=op!=='align';alignGapWrap.hidden=op!=='gap';alignButton.textContent=op==='align'?'⇔ Ausgewählte Objekte ausrichten':op==='distribute'?'↔ Gleichmässig verteilen':'↔ Abstand einstellen';};
  alignOperation.addEventListener('change',updateAlignControls); updateAlignControls();

  const groupHeading=document.createElement('h2'); groupHeading.textContent='Objektgruppen'; paneMap.edit.left.appendChild(groupHeading);
  const groupHelp=document.createElement('p'); groupHelp.className='note'; groupHelp.textContent='Wähle mindestens zwei Objekte aus. Gruppen lassen sich gemeinsam bewegen und bleiben beim Speichern erhalten.'; paneMap.edit.left.appendChild(groupHelp);
  const groupButton=document.createElement('button'); groupButton.type='button'; groupButton.id='createObjectGroup'; groupButton.className='wide primary'; groupButton.textContent='▣ Auswahl gruppieren'; paneMap.edit.left.appendChild(groupButton);
  const ungroupButton=document.createElement('button'); ungroupButton.type='button'; ungroupButton.id='ungroupObjects'; ungroupButton.className='wide'; ungroupButton.textContent='▤ Gruppierung aufheben'; paneMap.edit.left.appendChild(ungroupButton);
  const mirrorHeading=document.createElement('h2'); mirrorHeading.textContent='Spiegeln'; paneMap.edit.left.appendChild(mirrorHeading);
  const mirrorHelp=document.createElement('p'); mirrorHelp.className='note'; mirrorHelp.textContent='Spiegelt die Form. Bei mehreren Objekten wird die ganze Auswahl an ihrer gemeinsamen Mitte gespiegelt.'; paneMap.edit.left.appendChild(mirrorHelp);
  const mirrorButtons=document.createElement('div'); mirrorButtons.className='tool-grid';
  [['x','↔ X'],['y','↕ Y'],['z','⇅ Z']].forEach(([axis,label])=>{const b=document.createElement('button');b.type='button';b.id='mirror'+axis.toUpperCase();b.textContent=label;b.title='Auswahl an der '+axis.toUpperCase()+'-Achse spiegeln';mirrorButtons.appendChild(b);});
  paneMap.edit.left.appendChild(mirrorButtons);
  const moveStepWrap=document.createElement('div'); moveStepWrap.className='field';
  const moveStepLabel=document.createElement('label'); moveStepLabel.htmlFor='moveStepMM'; moveStepLabel.textContent='Pfeiltasten-Schritt (mm)';
  const moveStepInput=document.createElement('input'); moveStepInput.id='moveStepMM'; moveStepInput.type='number'; moveStepInput.min='0.1'; moveStepInput.max='100'; moveStepInput.step='0.1'; moveStepInput.value='1'; moveStepInput.title='Bewegung pro Pfeiltastendruck in Millimetern';
  moveStepWrap.append(moveStepLabel,moveStepInput); paneMap.edit.left.appendChild(moveStepWrap);
  const moveHelp=document.createElement('p'); moveHelp.className='note'; moveHelp.textContent='Pfeiltasten bewegen X/Y. Mit Shift wird der Schritt verzehnfacht. Die Schrittweite lässt sich hier einstellen.'; paneMap.edit.left.appendChild(moveHelp);
  heading(paneMap.edit.right,'Position'); put(paneMap.edit.right,'positionFields');

  heading(paneMap.measure.left,'Objektmessung');
  const measureIntro=document.createElement('p');measureIntro.className='note';measureIntro.textContent='Wähle ein Modell in der Objektliste. Rechts kannst du Position, exakte Masse in Millimetern, Skalierung und Farbe kontrollieren und anpassen. Native OCCT-Körper lassen sich zusätzlich über „Körper prüfen“ oben technisch vermessen.';paneMap.measure.left.appendChild(measureIntro);
  function addBedButton(pane,key){ const b=document.createElement('button'); b.type='button'; b.className='wide'; b.textContent='⬇ Auf Arbeitsplatte stellen'; b.dataset.bedAction=key; b.addEventListener('click',()=>document.getElementById('dropToBed').click()); pane.appendChild(b); }
  ['create','draw','edit','measure','print','expert'].forEach(key=>addBedButton(paneMap[key].left,key));
  heading(paneMap.measure.right,'Skalierung (%)'); put(paneMap.measure.right,'percentFields');
  heading(paneMap.measure.right,'Exakte Masse (mm)'); put(paneMap.measure.right,'sizeFields');
  heading(paneMap.measure.right,'Farbe'); put(paneMap.measure.right,'color');
  // Einheitliche Skalierung ist ebenfalls im normalen Mess-/Prüfbereich erreichbar.
  put(paneMap.measure.right,'scaleLock');

  heading(paneMap.project.left,'Projektdatei');
  const projectIntro=document.createElement('p');projectIntro.className='note';projectIntro.textContent='Speichere dein bearbeitbares SILMO-Projekt oder öffne ein früher gespeichertes Projekt. Die Projektdatei enthält mehr Informationen als eine reine STL-Datei.';paneMap.project.left.appendChild(projectIntro);
  ['saveProjectButton','openProjectButton','projectFileInput'].forEach(id=>put(paneMap.project.left,id));
  heading(paneMap.project.left,'Modelle importieren');
  const importIntro=document.createElement('p');importIntro.className='note';importIntro.textContent='Importiere fertige 3D-Modelle. STL eignet sich für den 3D-Druck; STEP erhält bei unterstützten Modellen die präzise CAD-Geometrie.';paneMap.project.left.appendChild(importIntro);
  ['importModel','importStepModel','fileInput','stepFileInput'].forEach(id=>put(paneMap.project.left,id));
  const stlDropZone=document.createElement('div');
  stlDropZone.id='stlDropZone';
  stlDropZone.setAttribute('role','region');
  stlDropZone.setAttribute('aria-label','STL-Modelle importieren');
  stlDropZone.innerHTML='<strong>⬇ STL-Datei hier hineinziehen</strong><p>Ziehe eine oder mehrere STL-Dateien aus deinen Downloads hierher – oder wähle sie direkt aus.</p><button type="button" class="wide" id="stlChooseFile">Datei auswählen …</button>';
  paneMap.project.left.appendChild(stlDropZone);
  heading(paneMap.project.left,'Modelle exportieren');
  const exportIntro=document.createElement('p');exportIntro.className='note';exportIntro.textContent='Exportiere die ausgewählten Modelle als STL für den Slicer oder als STEP für andere CAD-Programme.';paneMap.project.left.appendChild(exportIntro);
  ['exportModel','exportStepModel'].forEach(id=>put(paneMap.project.left,id));
  heading(paneMap.project.right,'Dateiformate');
  const projectFormatNotes=document.createElement('div');projectFormatNotes.className='note';
  projectFormatNotes.innerHTML='<p><strong> SILMO-Projekt (.json)</strong><br>Enthält Szene, bearbeitbare Modellinformationen und Projektdaten. Zum späteren Weiterarbeiten verwenden.</p><p><strong>STL (.stl)</strong><br>Enthält ein Dreiecksnetz. Ideal für Slicer und 3D-Druck, aber keine vollständige CAD-Konstruktionshistorie.</p><p><strong>STEP (.step / .stp)</strong><br>Für den Austausch präziser CAD-Körper. Die STEP-Funktionen benötigen unterstützte OCCT-Geometrie.</p>';
  paneMap.project.right.appendChild(projectFormatNotes);
  heading(paneMap.project.right,'Empfohlener Ablauf');
  const projectFlow=document.createElement('ol');['Projekt speichern, bevor du grössere Änderungen machst.','STL exportieren, wenn du das Modell slicen oder drucken willst.','STEP verwenden, wenn du präzise CAD-Geometrie weitergeben möchtest.','Eine frühere JSON-Projektdatei über „Projekt öffnen“ wieder laden.'].forEach(item=>{const li=document.createElement('li');li.textContent=item;projectFlow.appendChild(li);});
  paneMap.project.right.appendChild(projectFlow);

  heading(paneMap.print.right,'Vor dem Drucken');
  const printGuide=document.createElement('ol');['Druckbettgrösse passend zum Drucker einstellen.','Modelle bei Bedarf auf die Arbeitsplatte stellen.','Druckbettprüfung ausführen, damit Modelle innerhalb der Platte liegen.','Zusätzlich die Druckmodell-Prüfung starten und Warnungen kontrollieren.'].forEach(item=>{const li=document.createElement('li');li.textContent=item;printGuide.appendChild(li);});
  paneMap.print.right.appendChild(printGuide);
  const printLimit=document.createElement('p');printLimit.className='note';printLimit.textContent='Die automatische Prüfung ist eine Vorprüfung. Sie ersetzt keinen Slicer und garantiert nicht, dass jedes Modell fehlerfrei gedruckt werden kann.';paneMap.print.right.appendChild(printLimit);

  heading(paneMap.print.left,'Druckbettgrösse (mm)');
  ['bedWidth','bedDepth','applyBedSize'].forEach(id=>put(paneMap.print.left,id));
  heading(paneMap.print.left,'Druckbettprüfung');
  put(paneMap.print.left,'checkBed');
  paneMap.print.left.appendChild(bedNote);
  heading(paneMap.print.left,'Druckmodell prüfen');
  const printCheckButton = document.createElement('button');
  printCheckButton.type = 'button';
  printCheckButton.id = 'runPrintCheck';
  printCheckButton.className = 'wide primary';
  printCheckButton.textContent = '✓ Modell auf Druckfehler prüfen';
  paneMap.print.left.appendChild(printCheckButton);
  const printCheckReport = document.createElement('div');
  printCheckReport.id = 'printCheckReport';
  printCheckReport.className = 'note';
  printCheckReport.setAttribute('role','status');
  printCheckReport.setAttribute('aria-live','polite');
  printCheckReport.textContent = 'Prüft Dreiecke, offene Kanten, nicht-manifold Kanten, Abmessungen und Druckbettlage. Dies ist eine automatische Vorprüfung, keine Garantie für druckbare Geometrie.';
  paneMap.print.left.appendChild(printCheckReport);

  heading(paneMap.expert.left,'Expertenzentrum');
  const expertIntro=document.createElement('p');expertIntro.className='note';expertIntro.textContent='Erweiterte Funktionen und technische Diagnose für die Fehlersuche.';paneMap.expert.left.appendChild(expertIntro);
  const diagnosticsButton=document.createElement('button');diagnosticsButton.type='button';diagnosticsButton.className='wide';diagnosticsButton.textContent='🛠 Technische Diagnose öffnen';diagnosticsButton.addEventListener('click',()=>window.SILMO_DIAG?.open());paneMap.expert.left.appendChild(diagnosticsButton);
  heading(paneMap.expert.right,'Erweiterte Hinweise','expert-only');
  paneMap.expert.right.appendChild(sizeNote);

  // Erweiterte Boolesche CAD-Operationen bleiben vollständig erhalten,
  // verlassen aber den normalen SketchUp-orientierten Modellierbereich.
  const booleanCadDetails=document.createElement('details');
  booleanCadDetails.className='advanced-cad-tools expert-only';
  const booleanCadSummary=document.createElement('summary');
  booleanCadSummary.textContent='Erweiterte CAD-Formoperationen';
  booleanCadDetails.appendChild(booleanCadSummary);
  const booleanHeading=[...paneMap.create.left.querySelectorAll(':scope > h2')].find(h=>h.textContent==='Formen kombinieren');
  const objectListHeading=[...paneMap.create.left.querySelectorAll(':scope > h2')].find(h=>h.textContent==='Objektliste');
  if(booleanHeading && objectListHeading){
    paneMap.expert.left.appendChild(booleanCadDetails);
    let node=booleanHeading;
    while(node && node!==objectListHeading){
      const next=node.nextSibling;
      booleanCadDetails.appendChild(node);
      node=next;
    }
  }



  // v90: Echte Unterreiter – sichtbar bleibt ausschliesslich der aktive Bereich.
  function addSectionTabs(container, targets, ariaLabel, groupHeadings=false) {
    if (!container || !targets.length || container.querySelector(':scope > .inner-tab-nav')) return;
    const nav=document.createElement('nav'); nav.className='inner-tab-nav';
    nav.setAttribute('aria-label',ariaLabel); nav.setAttribute('role','tablist');
    const buttons=[];
    targets.forEach((item,index)=>{
      if(!item.target)return;
      const button=document.createElement('button'); button.type='button';
      button.id='inner-tab-'+Math.random().toString(36).slice(2,10);
      button.setAttribute('role','tab'); button.textContent=item.label;
      button.setAttribute('aria-selected',String(index===0));
      button.tabIndex=index===0?0:-1;
      buttons.push(button); nav.appendChild(button);
    });
    const panels=[];
    if(groupHeadings){
      const headings=targets.map(item=>item.target);
      const first=headings[0];
      container.insertBefore(nav,first);
      headings.forEach((heading,index)=>{
        const panel=document.createElement('section'); panel.className='inner-tab-panel';
        panel.id='inner-panel-'+buttons[index].id;
        panel.setAttribute('role','tabpanel'); panel.setAttribute('aria-labelledby',buttons[index].id);
        panel.hidden=index!==0;
        const nextHeading=headings[index+1]||null;
        let node=heading;
        while(node&&node!==nextHeading){
          const next=node.nextSibling;
          panel.appendChild(node);
          node=next;
        }
        if(nextHeading)container.insertBefore(panel,nextHeading);
        else container.appendChild(panel);
        panels.push(panel);
      });
    } else {
      const first=targets[0].target;
      container.insertBefore(nav,first);
      targets.forEach((item,index)=>{
        item.target.hidden=index!==0;
        item.target.classList.add('inner-tab-panel');
        item.target.setAttribute('role','tabpanel');
        item.target.id=item.target.id||'inner-panel-'+buttons[index].id;
        item.target.setAttribute('aria-labelledby',buttons[index].id);
        panels.push(item.target);
      });
    }
    buttons.forEach((button,index)=>{
      button.setAttribute('aria-controls',panels[index].id);
      button.addEventListener('click',()=>{
        buttons.forEach((b,i)=>{
          const active=i===index;
          b.setAttribute('aria-selected',String(active));
          b.tabIndex=active?0:-1;
          panels[i].hidden=!active;
        });
      });
    });
  }
  const directHeadings=(pane)=>[...pane.querySelectorAll(':scope > h2')];
  const createHeadings=directHeadings(paneMap.create.left);
  addSectionTabs(paneMap.create.left,createHeadings.map(h=>({label:h.textContent==='Objekte'?'Grundformen':h.textContent,target:h})),'Unterbereiche Modellieren',true);
  const drawHeadings=directHeadings(paneMap.draw.left);
  addSectionTabs(paneMap.draw.left,drawHeadings.map((h,i)=>({label:['Skizzieren','Kontur','Aktionen'][i]||h.textContent,target:h})),'Unterbereiche Zeichnen',true);
  const projectHeadings=directHeadings(paneMap.project.left);
  addSectionTabs(paneMap.project.left,projectHeadings.map((h,i)=>({label:['Projektdatei','Import','Export'][i]||h.textContent,target:h})),'Unterbereiche Projekt',true);
  const drawRightGroups=[...paneMap.draw.right.querySelectorAll(':scope > details')];
  addSectionTabs(paneMap.draw.right,drawRightGroups.map((d,i)=>({label:['Werkzeug','Masse','Raster','Kontur','Profi'][i]||d.querySelector('summary')?.textContent||'Optionen',target:d})),'Unterbereiche Zeichen-Eigenschaften');
  const imageTools=document.querySelector('#imageStudioWorkspace .isw-tools');
  const imageHeadings=imageTools?[...imageTools.querySelectorAll(':scope > h2')]:[];
  addSectionTabs(imageTools,imageHeadings.map((h,i)=>({label:['Vorlage','Grösse','Erkennung','Kontur & 3D'][i]||h.textContent,target:h})),'Unterbereiche Bilderkennung',true);

  // Den Schalter außerhalb der Reiter lassen, damit er immer erreichbar bleibt.
  const expertToggle = nodes.get('expertCenterToggle');
  left.replaceChildren(leftContainer);
  right.replaceChildren(rightContainer);
  // Statusmeldungen müssen auch in den Reitern Bearbeiten/Messen/Druck sichtbar bleiben.
  // Deshalb liegt das gemeinsame Statusfeld ausserhalb der umschaltbaren Tab-Panes.
  if (nodes.get('status')) left.appendChild(nodes.get('status'));
  // Das ursprüngliche Aktions-Element bleibt im DOM, damit der bestehende Handler
  // über getElementById('dropToBed') erreichbar bleibt. Sichtbare Kopien in den
  // Reitern lösen dieses Element per click() aus.
  const hiddenActionHolder = document.createElement('div');
  hiddenActionHolder.hidden = true;
  hiddenActionHolder.setAttribute('aria-hidden', 'true');
  const dropToBedAction = nodes.get('dropToBed');
  if (dropToBedAction) hiddenActionHolder.appendChild(dropToBedAction);
  document.body.appendChild(hiddenActionHolder);
  if (expertToggle) {
    expertToggle.classList.remove('expert-only');
    expertToggle.classList.add('wide');
    expertToggle.textContent = '⚙ Expertenzentrum öffnen';
    expertToggle.setAttribute('aria-expanded','false');
    left.appendChild(expertToggle);
  }

  const expertTab = nav.querySelector('[data-tab="expert"]') || document.createElement('button');
  expertTab.className='tool-tab'; expertTab.type='button'; expertTab.setAttribute('role','tab');
  expertTab.dataset.tab='expert'; expertTab.setAttribute('aria-selected','false'); expertTab.tabIndex=-1;
  expertTab.textContent='Expertenzentrum'; expertTab.hidden=true;
  if (!expertTab.isConnected) nav.appendChild(expertTab);

  function selectTab(key) {
    nav.querySelectorAll('[role="tab"]').forEach(b=>{
      const active=b.dataset.tab===key;
      b.setAttribute('aria-selected',String(active)); b.tabIndex=active?0:-1;
    });
    document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active-pane',p.dataset.pane===key));
    document.body.classList.toggle('expert-tab-active',key==='expert');
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
  nav.addEventListener('click',e=>{const b=e.target.closest('[data-tab]'); if(b && !b.hidden) selectTab(b.dataset.tab);});
  nav.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    const bs=[...nav.querySelectorAll('[role="tab"]')].filter(b=>!b.hidden);
    let i=bs.indexOf(document.activeElement);
    if(e.key==='Home')i=0; else if(e.key==='End')i=bs.length-1; else i=(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length;
    if(bs[i]){bs[i].focus();selectTab(bs[i].dataset.tab);} e.preventDefault();
  });
  if(expertToggle) expertToggle.addEventListener('click',()=>{
    const opening=expertTab.hidden;
    expertTab.hidden=!opening;
    expertToggle.setAttribute('aria-expanded',String(opening));
    expertToggle.textContent=opening?'⚙ Expertenzentrum schliessen':'⚙ Expertenzentrum öffnen';
    if(opening){
      document.body.classList.add('expert-mode'); document.body.classList.remove('beginner-mode');
      const mode=document.getElementById('modeToggle'); if(mode){mode.textContent='Erweiterte Funktionen: EIN';mode.setAttribute('aria-pressed','true');}
      selectTab('expert');
    } else {
      document.body.classList.remove('expert-mode');
      document.body.classList.add('beginner-mode');
      const mode=document.getElementById('modeToggle');
      if(mode){mode.textContent='Erweiterte Funktionen: AUS';mode.setAttribute('aria-pressed','false');}
      selectTab('measure');
    }
  });
  selectTab('create');
})();
