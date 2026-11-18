# SILMO – Laufzeit-Abhängigkeitsprüfung und Migrationsplan

**Prüfstand:** Entwicklungsbranch `phase1/central-units-api`  
**Prüfgrundlage:** Direkte Auswertung der aktuellen `index.html`, der Workflows und der lokalen Startanleitung.  
**Ziel:** Die CDN-Laufzeitabhängigkeit kontrolliert beseitigen, ohne die bestehende Three.js-Anwendung oder ihre Geometriefunktionen vorzeitig umzubauen.

## 1. Tatsächlich geladene Laufzeitabhängigkeiten

Die aktuelle HTML-Datei lädt unmittelbar vor dem CAD-Hauptskript diese drei externen Dateien:

| Reihenfolge | Bibliothek | Exakte Version | Aktuelle Quelle | Benötigte globale API |
|---|---|---:|---|---|
| 1 | Three.js | r128 / 0.128.0 | cdnjs | `THREE` |
| 2 | STLLoader | passend zu Three.js 0.128.0 | jsDelivr, `three@0.128.0` | `THREE.STLLoader` |
| 3 | STLExporter | passend zu Three.js 0.128.0 | jsDelivr, `three@0.128.0` | `THREE.STLExporter` |

Danach lädt SILMO lokal und in dieser Reihenfolge:

1. `./src/units.js`
2. `./src/project-schema.js`
3. Das grosse Inline-CAD-Hauptskript.

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

## 5. Umgesetzter erster Migrationsschritt

Der Entwicklungsbranch enthält jetzt die erste lokale Runtime-Vorbereitung:

- `package.json` und `package-lock.json` pinnen Three.js exakt auf `0.128.0`.
- `npm ci` installiert die festgelegte Paketversion reproduzierbar.
- `scripts/prepare-runtime.mjs` kopiert die drei benötigten Dateien aus dem Paket nach `vendor/three/`.
- `index.html` lädt Three.js, STLLoader und STLExporter ausschliesslich über lokale relative Pfade.
- `.gitignore` schliesst `node_modules/` und den generierten Ordner `vendor/` aus.
- Code- und Browser-CI installieren die Abhängigkeit und erzeugen die Runtime vor den Prüfungen.
- Der Browser-Test blockiert HTTPS-Zugriffe und prüft Three.js r128 sowie beide STL-Erweiterungen.
- Der GitHub-Pages-Build erzeugt die lokalen Dateien erst beim Build und kopiert sie in das Pages-Artefakt.

Die npm-Installation und das Kopieren der drei Runtime-Dateien sind im Code-Workflow des aktuellen Entwicklungsstands bereits erfolgreich durchlaufen. Die vollständigen Prüfungen und der Offline-Browser-Test müssen für den aktuellen HEAD noch abschliessen.

## 5. Was bewusst noch nicht geändert wurde

- Kein `package.json` nur als leere Hülle angelegt.
- Keine Three.js-Version aktualisiert.
- Die drei Three.js-CDN-Referenzen wurden im Entwicklungsbranch durch lokale Pfade ersetzt; der Offline-Browsernachweis läuft.
- Kein Komplettumbau der Inline-CAD-Anwendung.
- Keine Änderung am öffentlichen GitHub-Pages-Stand.

Diese Zurückhaltung verhindert, dass SILMO durch einen halbfertigen Build-Schritt nicht mehr startet.

## 6. Konkrete nächste Implementierung

Als nächster Code-Schritt wird die Build- und Abhängigkeitsstruktur so eingerichtet, dass sie die aktuelle globale Three.js-Laufzeit zunächst unverändert lokal bereitstellen kann. Erst wenn der lokale Pages-Build und die Offline-Browserprüfung bestehen, werden die CDN-Tags entfernt.

**Abnahmekriterium:** Ein frischer Checkout kann mit dokumentierten kostenlosen Werkzeugen reproduzierbar gebaut und lokal gestartet werden; der Browser benötigt für die Kernanwendung keine externen CDN-Skripte. Bestehende Projektdateien, Modellierungsabläufe und STL-Import/-Export bleiben funktionsfähig.
