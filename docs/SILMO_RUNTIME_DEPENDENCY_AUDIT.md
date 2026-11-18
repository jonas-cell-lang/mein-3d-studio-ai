# SILMO – Laufzeit-Abhängigkeitsprüfung und Migrationsplan

**Prüfstand:** Entwicklungsbranch `phase1/central-units-api`  
**Prüfgrundlage:** Direkte Auswertung der aktuellen `index.html`, der Workflows und der lokalen Startanleitung.  
**Ziel:** Die CDN-Laufzeitabhängigkeit kontrolliert beseitigen, ohne die bestehende Three.js-Anwendung oder ihre Geometriefunktionen vorzeitig umzubauen.

## 1. Tatsächlich geladene Laufzeitabhängigkeiten

Die HTML-Datei lädt Three.js und die beiden passenden STL-Erweiterungen aus lokalen, beim Build vorbereiteten Dateien:

| Reihenfolge | Bibliothek | Exakte Version | Aktuelle Quelle | Benötigte globale API |
|---|---|---:|---|---|
| 1 | Three.js | r128 / 0.128.0 | `./vendor/three/three.min.js` | `THREE` |
| 2 | STLLoader | passend zu Three.js 0.128.0 | `./vendor/three/STLLoader.js` | `THREE.STLLoader` |
| 3 | STLExporter | passend zu Three.js 0.128.0 | `./vendor/three/STLExporter.js` | `THREE.STLExporter` |

Danach lädt SILMO lokal und in dieser Reihenfolge:

1. `./src/units.js`
2. `./src/tolerances.js`
3. `./src/project-schema.js`
4. Das grosse Inline-CAD-Hauptskript.
5. `./src/tutorial.js` – ausgelagerter, selbstständiger Lernkurs.
6. `./src/image-studio.js` – ausgelagerter, selbstständiger 2D-Bildarbeitsbereich.

Die Reihenfolge ist relevant: Das Hauptskript erwartet sowohl `THREE` samt STL-Erweiterungen als auch `window.SILMOUnits` und `window.SILMOProjectSchema`.

## 2. Festgestellte Abhängigkeit vom Three.js-Global

Die direkte Quellcodeprüfung bestätigt, dass die Anwendung das globale `THREE` breit verwendet. Dazu gehören unter anderem:

- Renderer, Szene, Kamera und Licht
- Meshes, Materialien und BufferGeometry
- Vektoren, Ebenen, Quaternionen, Bounding Boxes und Raycasting
- Grundkörper, Extrusion, Kurven, Röhren und Formen
- STL-Import und STL-Export

Es handelt sich deshalb nicht um eine Bibliothek, die man durch blosses Entfernen eines Script-Tags ersetzen kann. Auch die beiden STL-Erweiterungen hängen an der passenden Three.js-Version und müssen gemeinsam behandelt werden.

## 3. Risiken, die vor einer Umstellung abgesichert werden müssen

1. **Versionsgleichheit:** Three.js und STLLoader/STLExporter müssen aus derselben festgelegten Version stammen.
2. **Lade-Reihenfolge:** Die Erweiterungen müssen verfügbar sein, bevor das CAD-Hauptskript STL-Funktionen aufruft.
3. **Globale Kompatibilität:** Der bestehende Code erwartet `THREE` als Browser-Global. Eine sofortige Umstellung auf ES-Module würde viele Stellen gleichzeitig betreffen.
4. **GitHub-Pages-Pfade:** Die Anwendung liegt unter einem Repository-Unterpfad. Gebaute Assets müssen mit relativen, unter diesem Pfad gültigen URLs geladen werden.
5. **Offline-Verhalten:** Nach der Migration darf der normale Modellierungsstart nicht mehr von einem CDN abhängen.
6. **STL-Regression:** Import und Export müssen mit Referenzmodellen, Einheiten und Geometrieabmessungen geprüft werden.
7. **Kosten:** Build und Tests müssen mit kostenlosen Open-Source-Werkzeugen und GitHub Actions auskommen; keine bezahlten APIs oder Dienste.

## 4. Empfohlene risikoarme Migrationsreihenfolge

### Schritt A – Versionen und aktuelle Schnittstellen einfrieren
- Three.js bei r128 / 0.128.0 belassen, solange kein eigener Kompatibilitätstest eine Versionsänderung rechtfertigt.
- Die beiden STL-Erweiterungen exakt an dieselbe Version binden.
- Keine gleichzeitige Three.js-Aktualisierung und Architekturmigration durchführen.

### Schritt B – Reproduzierbare Entwicklungsabhängigkeiten einführen
- Ein Root-`package.json` mit klaren Skripten für Tests und Build anlegen.
- Exakte Versionen festlegen und eine Lockdatei committen.
- CI verwendet danach `npm ci`, nicht eine ungebundene Paketinstallation.
- Playwright bleibt zunächst eine explizit versionierte Testabhängigkeit; keine unkontrollierte Installation bei jedem Lauf.

### Schritt C – Laufzeitdateien lokal bereitstellen
- Die drei geprüften Three.js-Dateien aus den festgelegten Paketversionen reproduzierbar in einen lokalen App-Ordner übernehmen oder in ein lokales Bundle überführen.
- Zunächst die bisherige globale API und Script-Reihenfolge erhalten.
- CDN-URLs erst entfernen, wenn die lokalen Dateien im Pages-Testpaket vorhanden sind und im Browser geladen werden.

### Schritt D – Regression und Offline-Ladeprüfung
- App-Start und 3D-Canvas prüfen.
- Objektanlage, Auswahl, Transformationen und Skizzen prüfen.
- STL-Import und STL-Export mit bekannten Abmessungen testen.
- Projekt speichern und in einer frischen Sitzung wieder öffnen.
- Netzwerkanfragen prüfen: keine notwendige Laufzeitbibliothek darf mehr von einem externen CDN kommen.
- Den erzeugten Pages-Ordner lokal unter einem Repository-Unterpfad testen, nicht nur am Server-Root.

### Schritt E – Erst danach Module schrittweise extrahieren
- UI, Dokumentmodell, Geometrieadapter und Import/Export getrennt herauslösen.
- Bestehende Funktionen während der Migration über Regressionstests schützen.
- Die Umstellung auf ES-Module oder eine neue Three.js-Version ist eine eigene spätere Entscheidung, kein Bestandteil des ersten CDN-Abbaus.

## 5. Umgesetzte Runtime- und Modulschritte

- `package.json` und `package-lock.json` pinnen Three.js exakt auf `0.128.0`.
- `npm ci` installiert die festgelegte Version reproduzierbar.
- `scripts/prepare-runtime.mjs` kopiert Three.js r128, STLLoader, STLExporter und die Lizenzdatei nach `vendor/three/`.
- `index.html` lädt die Runtime ausschliesslich über lokale relative Pfade; die drei CDN-Script-Referenzen wurden entfernt.
- `.gitignore` schliesst `node_modules/` und den generierten Ordner `vendor/` aus.
- Code- und Browser-CI installieren die Abhängigkeit und erzeugen die Runtime vor den Prüfungen.
- Der Browser-Test blockiert externe HTTPS-Zugriffe und prüft den Start, Modellierungsabläufe, Projekt-Speichern/Wiederöffnen sowie STL-Funktionen.
- Der GitHub-Pages-Build erzeugt die lokalen Dateien erst beim Build und kopiert sie in das Pages-Artefakt.
- `src/tutorial.js` und `src/image-studio.js` wurden aus zwei selbstständigen Inline-IIFEs herausgelöst. Ihre Ausführungsreihenfolge blieb gleich; die Module verwenden eigene lokale Variablen und kommunizieren über die vorhandenen DOM-/`window`-Schnittstellen.
- Die CI prüft, dass beide neuen Module im lokalen Pages-Testpaket enthalten sind und die HTML-Datei auf die lokalen Dateien verweist.
- Die erste Einheitenmigration ist abgeschlossen: `MM_PER_UNIT` wird in `index.html` nicht mehr verwendet; Längen- und Flächenkonvertierungen laufen über `src/units.js`.

### Verifizierter Stand

Für Commit `10502a8` sind Code-Checks und Browser-Interaktionstests erfolgreich. Der Browserlauf blockiert externe HTTPS-Zugriffe. Der Workflow erzeugt die Runtime lokal und prüft die lokale Anwendung; es wurde kein Pages-Deployment ausgelöst.

## 6. Was bewusst noch nicht geändert wurde

- Three.js wurde nicht aktualisiert; r128 bleibt aus Kompatibilitätsgründen festgelegt.
- Das grosse CAD-Hauptskript in `index.html` wurde noch nicht aufgeteilt. Die ausgelagerten Lernkurs- und Image-Studio-Dateien sind ein erster, risikoarmer Schritt.
- Keine sofortige ES-Module-Umstellung der gesamten Anwendung.
- Keine Änderung am öffentlichen GitHub-Pages-Stand.

## 7. Nächste Schritte

1. Den verbleibenden Inline-Code in `index.html` nach Abhängigkeiten und klaren Verantwortlichkeiten inventarisieren.
2. Als Nächstes eine kleine, eigenständige UI-/Diagnosekomponente extrahieren, ohne auf den CAD-Hauptskript-Scope zuzugreifen.
3. Danach Dokument-/Projektverwaltung und Import-/Export-Grenzen schrittweise separieren.
4. Für jede Extraktion Byte-/Verhaltensregressionen und Browserprüfungen ausführen.
5. Erst nach stabiler Modulstruktur eine grössere Umstellung auf native ES-Module oder Bundling erwägen.
