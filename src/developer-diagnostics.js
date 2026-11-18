
(function(){
  'use strict';
  const startedAt=new Date();
  const entries=[];
  const errors=[];
  let panel,logEl,summaryEl,openButton,banner,auditRunning=false;
  const maxEntries=500;
  const recentInteractions=[];
  const externalScriptStates=new Map();
  function scriptDiagnostics(){
    const scripts=[...document.scripts].filter(script=>script.src).map(script=>{
      const state=externalScriptStates.get(script.src);
      return script.src+' | Status: '+(state?state.status:'kein Ladeereignis erfasst')+' | crossorigin: '+(script.crossOrigin||'nicht gesetzt')+(state?' | Zeit: '+state.time:'');
    });
    let resources=[];
    try{resources=performance.getEntriesByType('resource').filter(item=>item.initiatorType==='script').slice(-8).map(item=>item.name+' | Dauer: '+Math.round(item.duration)+' ms | Ende: '+Math.round(item.responseEnd)+' ms');}catch(_){}
    return 'Skript-Ladestatus:\n'+(scripts.join('\n')||'Keine externen Skripte')+'\nLetzte Script-Ressourcen (Performance API):\n'+(resources.join('\n')||'Keine Ressourcendaten verfügbar');
  }
  document.addEventListener('load',event=>{
    const target=event.target;
    if(!target||target.tagName!=='SCRIPT'||!target.src)return;
    const time=new Date().toLocaleTimeString('de-CH',{hour12:false});
    externalScriptStates.set(target.src,{status:'geladen',time});
    add('EXTERNES SKRIPT GELADEN',target.src+' | crossorigin: '+(target.crossOrigin||'nicht gesetzt'),false);
  },true);
  function interactionContext(){return recentInteractions.length?recentInteractions.slice(-8).map((item,i)=>(i+1)+'. '+item).join('\n'):'Keine Bedienaktion aufgezeichnet.';}
  document.addEventListener('click',event=>{
    const target=event.target&&event.target.closest?event.target.closest('button,[role="button"],input,select'):null;
    if(!target)return;
    const description=(target.tagName||'Element')+(target.id?'#'+target.id:'')+(target.textContent?' · '+target.textContent.trim().replace(/\s+/g,' ').slice(0,90):'');
    recentInteractions.push(new Date().toLocaleTimeString('de-CH',{hour12:false})+' '+description);
    if(recentInteractions.length>20)recentInteractions.shift();
  },true);
  const isIPad=/iPad/i.test(navigator.platform)||(/MacIntel/i.test(navigator.platform)&&navigator.maxTouchPoints>1);
  const isMac=/Mac|iPhone|iPad/i.test(navigator.platform)&&!isIPad;
  const shortcutLabel=isIPad?'⌥ + Leertaste':(isMac?'⌘ + Leertaste':'Strg + Leertaste');
  function safeString(value){
    try{if(value instanceof Error)return value.stack||(value.name+': '+value.message);if(typeof value==='string')return value;const result=JSON.stringify(value);return result===undefined?String(value):result;}
    catch(_){return String(value);}
  }
  window.addEventListener('error',event=>{
    const target=event.target;
    if(target&&target!==window){
      const source=target.src||target.href||'unbekannte Ressource';
      if(target.tagName==='SCRIPT'&&target.src)externalScriptStates.set(target.src,{status:'Ladefehler',time:new Date().toLocaleTimeString('de-CH',{hour12:false})});
      add('RESSOURCE FEHLER',(target.tagName||'Element')+' '+source+'\nHTML-Element: '+(target.outerHTML||'nicht verfügbar')+'\n'+scriptDiagnostics(),true);
      return;
    }
    const generic=!event.filename&&!event.lineno&&!event.colno&&(!event.message||event.message==='Script error.');
    add('JAVASCRIPT FEHLER',(event.message||'Unbekannter Fehler')+' | Datei: '+(event.filename||'?')+' | Zeile: '+(event.lineno||'?')+':'+(event.colno||'?')+(event.error?'\n'+safeString(event.error):'')+'\nDokumentstatus: '+document.readyState+' | Zeit seit Navigation: '+Math.round(performance.now())+' ms\nLetzte Bedienaktionen:\n'+interactionContext()+'\n'+scriptDiagnostics()+(generic?'\nHINWEIS: Safari hat die Fehlerquelle nicht offengelegt (generischer Script error). Die gelisteten Skript-Ladezeiten helfen bei der Eingrenzung, beweisen aber allein keine Ursache.':''),true);
  },true);
  window.addEventListener('unhandledrejection',event=>add('PROMISE FEHLER',safeString(event.reason),true));
  const originalConsoleError=console.error.bind(console);
  console.error=function(){
    try{add('console.error',Array.from(arguments).map(safeString).join(' '),true);}catch(_){}
    originalConsoleError.apply(console,arguments);
  };
  window.addEventListener('securitypolicyviolation',event=>add('SICHERHEITSRICHTLINIE',event.violatedDirective+' · '+event.blockedURI,true));
  function updateBanner(){
    if(!banner){const viewport=document.querySelector('#viewport');if(!viewport)return;banner=document.createElement('button');banner.id='silmoDiagBanner';banner.type='button';banner.hidden=true;banner.setAttribute('role','alert');banner.addEventListener('click',()=>toggle(true));viewport.appendChild(banner);}
    if(errors.length){banner.textContent='⚠ SILMO hat '+errors.length+' Fehler gefunden – hier tippen, um Details zu öffnen';banner.hidden=false;}
    else banner.hidden=true;
  }
  function add(type,message,isError){
    const time=new Date().toLocaleTimeString('de-CH',{hour12:false});
    const entry={time,type,message:String(message)};
    entries.push(entry);
    if(isError)errors.push(entry);
    if(entries.length>maxEntries)entries.splice(0,entries.length-maxEntries);
    if(errors.length>maxEntries)errors.splice(0,errors.length-maxEntries);
    renderLog();updateBanner();
  }
  function renderLog(){
    if(logEl)logEl.textContent=entries.length?entries.map((e,i)=>String(i+1).padStart(3,'0')+' ['+e.time+'] '+e.type+'\n'+e.message).join('\n\n'):'Noch keine Fehler oder Ereignisse erfasst.';
    if(summaryEl)summaryEl.textContent='Fehler: '+errors.length+' · Einträge: '+entries.length+' · Seit: '+startedAt.toLocaleTimeString('de-CH',{hour12:false});
  }
  function snapshot(){
    const canvas=document.querySelector('canvas');
    let webgl='Canvas nicht gefunden';
    if(canvas){try{const gl=canvas.getContext('webgl2')||canvas.getContext('webgl')||canvas.getContext('experimental-webgl');webgl=gl?'WebGL verfügbar ('+canvas.width+'×'+canvas.height+')':'WebGL-Kontext nicht verfügbar';}catch(e){webgl='WebGL-Prüfung: '+e.message;}}
    const status=document.querySelector('#status');
    const tut=document.querySelector('#tutorialDebug');
    const active=document.activeElement;
    let groupState='nicht verfügbar';
    try{if(typeof window.__silmoGroupSnapshot==='function')groupState=JSON.stringify(window.__silmoGroupSnapshot());}catch(e){groupState='Fehler: '+safeString(e);}
    return [
      'SILMO 3D STUDIO AI – PRÜFTOOLBERICHT',
      'Zeit: '+new Date().toISOString(),
      'URL: '+location.href,
      'Browser: '+navigator.userAgent,
      'Online: '+navigator.onLine,
      'Dokumentstatus: '+document.readyState,
      'WebGL: '+webgl,
      'Statusmeldung: '+(status?status.textContent.trim():'nicht gefunden'),
      'Tutorial-Diagnose: '+(tut?tut.textContent.trim():'nicht eingeblendet / nicht vorhanden'),
      'Gruppierungsstatus: '+groupState,
      'Fokuselement: '+(active?(active.tagName+'#'+(active.id||'')):'keines'),
      'Gerät: '+(isIPad?'iPad':(isMac?'Apple-Gerät':'Computer / anderes Gerät'))+' · Plattform: '+navigator.platform+' · Touchpunkte: '+navigator.maxTouchPoints,
      'Letzte Bedienaktionen:\n'+interactionContext(),
      scriptDiagnostics(),
      'Objektlisteinträge: '+document.querySelectorAll('#objects .object-row').length,
      'Ausgewählte Objektzeilen: '+document.querySelectorAll('#objects .object-select[aria-pressed="true"]').length,
      'Fehler-/Ereignisprotokoll:',
      entries.length?entries.map((e,i)=>String(i+1).padStart(3,'0')+' ['+e.time+'] '+e.type+'\n'+e.message).join('\n\n'):'Keine Einträge erfasst.'
    ].join('\n');
  }
  async function runFullAudit(){
    if(auditRunning)return;
    auditRunning=true;
    if(summaryEl)summaryEl.textContent='Vollständige Codeprüfung läuft …';
    add('CODEPRÜFUNG','Prüfe die vollständige HTML-Datei, alle eingebetteten JavaScript-Blöcke, CSS-Regeln und die wichtigen App-Bestandteile.');
    const issues=[];
    let scriptCount=0,cssRuleCount=0,duplicateCount=0;
    try{
      const response=await fetch(location.href,{cache:'no-store'});
      if(!response.ok)throw new Error('Quelldatei konnte nicht geladen werden (HTTP '+response.status+').');
      const source=await response.text();
      if(!/^\s*<!doctype html/i.test(source))issues.push('HTML: HTML5-Doctype fehlt.');
      const doc=new DOMParser().parseFromString(source,'text/html');
      const idCounts=new Map();
      doc.querySelectorAll('[id]').forEach(el=>idCounts.set(el.id,(idCounts.get(el.id)||0)+1));
      for(const [id,count] of idCounts){if(count>1){duplicateCount++;issues.push('HTML: ID "'+id+'" kommt '+count+'-mal vor.');}}
      ['viewport','status','objects','tutorialLaunch','addCube'].forEach(id=>{if(!doc.getElementById(id))issues.push('HTML: Wichtiges Element #'+id+' fehlt.');});
      const scripts=[...doc.querySelectorAll('script:not([src])')];
      scriptCount=scripts.length;
      scripts.forEach((script,index)=>{
        const type=(script.getAttribute('type')||'').toLowerCase();
        if(type&&type!=='text/javascript'&&type!=='application/javascript'&&type!=='module')return;
        try{new Function(script.textContent||'');}
        catch(error){issues.push('JavaScript-Block '+(index+1)+': '+(error.message||String(error)));}
      });
      const styles=[...doc.querySelectorAll('style')].map(style=>style.textContent||'').join('\n');
      if(typeof CSSStyleSheet==='function'&&CSSStyleSheet.prototype&&typeof CSSStyleSheet.prototype.replaceSync==='function'){
        try{const sheet=new CSSStyleSheet();sheet.replaceSync(styles);cssRuleCount=sheet.cssRules.length;}
        catch(error){issues.push('CSS: '+(error.message||String(error)));}
      }else{
        cssRuleCount=styles?styles.split('{').length-1:0;
        add('HINWEIS','Dieser Browser bietet keinen vollständigen CSS-Parser für die Zusatzprüfung; CSS-Regeln wurden gezählt.');
      }
      ['#createObjectGroup','#ungroupObjects','#alignSelected','#booleanSeparate','#sketchTool','#startSketch','#createSketchSolid','#createContourFrame','#subtractSelected','#wallThicknessMM','#frameHeightMM'].forEach(selector=>{if(!document.querySelector(selector))issues.push('App: Werkzeug '+selector+' wurde nicht initialisiert.');});
      if(!window.THREE)issues.push('3D: Three.js ist nicht geladen.');
      else{
        if(!window.THREE.STLLoader)issues.push('3D: STLLoader ist nicht geladen.');
        if(!window.THREE.STLExporter)issues.push('3D: STLExporter ist nicht geladen.');
      }
      if(!document.querySelector('#viewport canvas'))issues.push('3D: Die Arbeitsfläche besitzt kein Canvas.');
      if(issues.length){
        issues.forEach(issue=>add('CODEPRÜFUNG – FEHLER',issue,true));
        add('ERGEBNIS','Prüfung beendet: '+issues.length+' Fehler gefunden. Siehe rotes Banner auf der 3D-Arbeitsfläche.');
      }else{
        add('ERGEBNIS','Bestanden: HTML-Struktur, '+scriptCount+' JavaScript-Blöcke, '+cssRuleCount+' CSS-Regeln, keine doppelten IDs, wichtige Werkzeuge und 3D-Abhängigkeiten geprüft.');
      }
    }catch(error){add('CODEPRÜFUNG – FEHLER',safeString(error),true);}
    finally{auditRunning=false;renderLog();updateBanner();}
  }
  function copyReport(){
    const report=snapshot();
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(report).then(()=>add('DIAGNOSE','Bericht in Zwischenablage kopiert.')).catch(()=>fallbackCopy(report));
    else fallbackCopy(report);
  }
  function fallbackCopy(value){
    const ta=document.createElement('textarea');ta.value=value;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
    try{add('DIAGNOSE',document.execCommand('copy')?'Bericht in Zwischenablage kopiert.':'Kopieren blockiert – bitte Bericht herunterladen.');}
    catch(error){add('DIAGNOSE','Kopieren nicht möglich: '+error.message);}
    ta.remove();
  }
  async function shareReport(){
    const report=snapshot();
    if(typeof navigator.share==='function'){
      try{await navigator.share({title:'SILMO – Fehlerbericht',text:report});add('DIAGNOSE','Bericht wurde über das Teilen-Menü übergeben.');}
      catch(error){if(error&&error.name==='AbortError')return;add('DIAGNOSE','Teilen nicht möglich: '+safeString(error));copyReport();}
    }else copyReport();
  }
  function downloadReport(){
    const blob=new Blob([snapshot()],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='SILMO_Prueftool_'+new Date().toISOString().replace(/[:.]/g,'-')+'.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);add('DIAGNOSE','Berichtdownload gestartet.');
  }
  function isTypingTarget(target){return !!(target&&target.closest&&target.closest('input,textarea,select,[contenteditable="true"]'));}
  function shortcutMatches(event){
    if(event.code!=='Space'&&event.key!==' ')return false;
    if(isTypingTarget(event.target))return false;
    if(isIPad)return event.altKey&&!event.ctrlKey&&!event.metaKey;
    if(isMac)return event.metaKey&&!event.ctrlKey;
    return event.ctrlKey&&!event.metaKey;
  }
  function createUI(){
    if(document.getElementById('silmoDiagPanel'))return;
    const actions=document.querySelector('.header-actions');
    openButton=document.createElement('button');openButton.id='silmoDiagToggle';openButton.type='button';openButton.textContent='🛠 Prüftool';openButton.title='Prüftool öffnen: '+shortcutLabel;
    openButton.addEventListener('click',()=>toggle());
    if(actions)actions.insertBefore(openButton,actions.firstChild);
    else{openButton.style.position='fixed';openButton.style.right='10px';openButton.style.top='10px';openButton.style.zIndex='19999';document.body.appendChild(openButton);}
    panel=document.createElement('section');panel.id='silmoDiagPanel';panel.hidden=true;panel.setAttribute('aria-label','SILMO vollständiges Prüftool');
    panel.innerHTML='<div class="sd-head"><span>🛠 SILMO – vollständiges Prüftool</span><button type="button" data-sd="close">Schliessen ✕</button></div><div class="sd-summary" id="silmoDiagSummary"></div><div class="sd-actions"><button type="button" data-sd="audit">Gesamten Code prüfen</button><button type="button" data-sd="snapshot">Status erfassen</button><button type="button" data-sd="copy">Bericht kopieren</button><button type="button" data-sd="share">Bericht teilen</button><button type="button" data-sd="download">Bericht herunterladen</button><button type="button" data-sd="clear">Protokoll leeren</button></div><pre id="silmoDiagLog" aria-live="polite"></pre><div class="sd-foot">iPad: Oben auf „Prüftool“ tippen. Danach den Fehler erneut auslösen und „Bericht teilen“ wählen (z. B. in ChatGPT). Alternativ „Bericht kopieren“. '+shortcutLabel+' öffnet das Prüftool mit Tastatur.</div>';
    document.body.appendChild(panel);logEl=panel.querySelector('#silmoDiagLog');summaryEl=panel.querySelector('#silmoDiagSummary');
    panel.addEventListener('click',event=>{const button=event.target.closest('button[data-sd]');if(!button)return;switch(button.dataset.sd){
      case'close':toggle(false);break;
      case'audit':runFullAudit();break;
      case'snapshot':add('STATUS-SNAPSHOT',snapshot().split('Fehler-/Ereignisprotokoll:')[0]);break;
      case'copy':copyReport();break;
      case'share':shareReport();break;
      case'download':downloadReport();break;
      case'clear':entries.length=0;errors.length=0;renderLog();updateBanner();add('DIAGNOSE','Protokoll wurde manuell geleert.');break;
    }});
    updateBanner();renderLog();add('START','Prüftool bereit. Tastenkürzel: '+shortcutLabel+'.');
  }
  function toggle(force){
    if(!panel)return;
    const show=typeof force==='boolean'?force:panel.hidden;
    panel.hidden=!show;
    if(show){add('STATUS-SNAPSHOT',snapshot().split('Fehler-/Ereignisprotokoll:')[0]);runFullAudit();}
  }
  document.addEventListener('keydown',event=>{
    const legacy=event.key==='F9'||((event.ctrlKey||event.metaKey)&&event.shiftKey&&String(event.key||'').toLowerCase()==='d');
    if(shortcutMatches(event)||legacy){event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();toggle();}
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',createUI,{once:true});else createUI();
  window.SILMO_DIAG={report:snapshot,log:(label,value)=>add(String(label||'MANUELL'),safeString(value)),open:()=>toggle(true),close:()=>toggle(false),clear:()=>{entries.length=0;errors.length=0;renderLog();updateBanner();},audit:runFullAudit,version:'diagnostics-v40'};
})();
