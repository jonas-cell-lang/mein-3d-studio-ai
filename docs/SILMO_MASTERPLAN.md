# SILMO – Masterplan für ein eigenständiges professionelles 3D-Studio

**Projektziel:** SILMO wird ein eigenständiges, vollwertiges 3D-Modellierungsprogramm. SketchUp dient als Qualitätsreferenz für die intuitive Objekt- und Architekturmodellierung, ist aber weder Zielplattform noch technische Abhängigkeit. SILMO soll zusätzlich anspruchsvolle technische, freie und KI-gestützte Modellierung ermöglichen.

**Leitgedanke:** Einfach zu bedienen, ohne den Funktionsumfang künstlich zu begrenzen.

## 1. Verbindliche Produktprinzipien

1. **Einsteigerfreundlich und professionell zugleich:** Ein klarer Grundmodus und ein jederzeit zugänglicher Expertenmodus. Keine Funktion wird nur deshalb weggelassen, weil sie anspruchsvoll ist.
2. **Präzision vor Scheinpräzision:** Masse, Einheiten, Winkel, Abstände, Abhängigkeiten und Geometrie müssen mathematisch nachvollziehbar sein.
3. **Nicht-destruktiver Arbeitsablauf:** Änderungen müssen nachvollziehbar, rückgängig zu machen und sicher speicherbar sein.
4. **Modellqualität:** Geschlossene Volumenkörper, saubere Flächen, konsistente Normalen und kontrollierbare Topologie.
5. **Druckbarkeit als Qualitätsbereich:** Wandstärken, Löcher, Selbstüberschneidungen, offene Kanten und Volumen werden geprüft; Druckbarkeit wird nicht bloss behauptet.
6. **KI unterstützt, entscheidet aber nicht heimlich:** Erkannte und generierte Geometrie bleibt editierbar und überprüfbar.
7. **Eigenständigkeit:** SILMO muss ohne SketchUp nutzbar sein. Import und Export sind Austauschfunktionen, keine Voraussetzung für den normalen Arbeitsablauf.
8. **Schrittweise Migration:** Die bestehende Anwendung bleibt nutzbar. Neue Architektur wird parallel und in überprüfbaren Etappen eingeführt, nicht durch einen riskanten Komplett-Neustart.

## 2. Bestandsaufnahme – Ausgangslage v90

Am 14.11.2026 wurde der aktuelle Hauptstand geprüft.

- Die Anwendung liegt weiterhin im Wesentlichen in einer einzelnen `index.html` (aktuell rund 3'800 Zeilen) mit eingebettetem CSS/JavaScript; mehrere unabhängige Bereiche sind bereits in `src/`-Module ausgelagert.
- Die 3D-Darstellung basiert weiterhin auf Three.js r128. Die Laufzeitbibliothek sowie STLLoader/STLExporter werden inzwischen aus der exakt festgelegten npm-Version lokal vorbereitet und nicht mehr von CDNs geladen.
- Interne Modellkoordinaten verwenden weiterhin **1 Three.js-Einheit = 10 mm**. Die zentrale Einheiten-API ist implementiert; eine aktuelle Quellcodesuche findet in `index.html` keine verbliebenen Verwendungen von `MM_PER_UNIT`.
- Es gibt bereits Grundkörper, Objekttransformationen, Auswahl, Mehrfachauswahl, Gruppierung, Undo/Redo, Projektdateien, STL-Import, STL-Export, 2D-Skizzen, Extrusion, Kontur- und Wandwerkzeuge, eigene BSP-basierte Boolesche Operationen, Loft/Sweep, Skizzenbeziehungen und Bildkontur-Erkennung.
- Die Oberfläche besitzt Hauptbereiche und fokussierte Unterreiter.
- Browser- und GitHub-Actions-Tests sind vorhanden.
- Ein Root-`package.json` und eine Lockdatei sind inzwischen vorhanden. Der reproduzierbare Build-/Modulumbau ist aber noch nicht abgeschlossen; die Anwendung besteht weiterhin überwiegend aus einer grossen `index.html`.

### Konsequenz

SILMO hat bereits viele sichtbare Funktionen. Der grösste nächste Schritt ist nicht, wahllos weitere Schaltflächen hinzuzufügen. Wir müssen die technische Grundlage so verbessern, dass die vorhandenen Funktionen langfristig zuverlässig, erweiterbar und geometrisch belastbar bleiben.

## 3. Zielarchitektur

Die Anwendung wird schrittweise in klar getrennte Module aufgeteilt. Die genaue Ordner- und Build-Struktur wird vor der Migration festgelegt und dokumentiert.

### A. Benutzeroberfläche und Arbeitsabläufe
- Arbeitsbereiche, Werkzeugleisten, Eigenschafteninspektor und kontextbezogene Werkzeuge
- Anfänger-/Expertenmodus ohne Funktionsverlust
- Tastenkürzel, Befehlsuche, Werkzeughinweise und konfigurierbare Ansichten
- Barrierearme Bedienung und passende Touch-/Stift-Unterstützung

### B. Dokument- und Projektmodell
- Eindeutiges Dokumentformat mit Schema-Versionen und Migrationen
- Objekte, Komponenten, Gruppen, Ebenen, Materialien, Szenen und Referenzen
- Zuverlässiges Speichern, Wiederherstellen und automatische Wiederherstellung
- Einheitliches Undo/Redo-System für alle Modellierungsaktionen

### C. Geometrie-Kern
- Saubere Trennung zwischen exakter Modellgeometrie und angezeigtem Polygonnetz
- Punkte, Kanten, Flächen, Körper und topologische Beziehungen
- Boolesche Operationen, Extrusion, Rotation, Sweep, Loft, Abrundung und Fase
- Geometrievalidierung und robuste Fehlerbehandlung
- Präzise Einheiten- und Toleranzverwaltung

**Wichtige Architekturentscheidung:** Three.js bleibt zunächst für Darstellung, Kamera und Interaktion zuständig. Es ist nicht automatisch der endgültige CAD-Geometriekern. In einer separaten technischen Erprobung werden geeignete B-Rep-/CAD-Kerne (insbesondere WebAssembly-basierte Optionen wie Open CASCADE) anhand von Lizenz, Browserleistung, Robustheit, Dateiformaten und Wartbarkeit verglichen. Erst nach bestandenen Prototyp-Tests wird entschieden, ob und wie ein solcher Kern integriert wird. Kein ungetesteter Komplettaustausch.

### D. Interaktion und Auswahl
- Auswahl von Objekt, Komponente, Fläche, Kante und Punkt
- Fangfunktionen: Raster, Endpunkt, Mittelpunkt, Schnittpunkt, Achse und Fläche
- Verschieben, Drehen, Skalieren, Spiegeln und Ausrichten
- Präzise numerische Eingabe und geometrische Bedingungen

### E. Import, Export und Austausch
- Eigenes versioniertes SILMO-Projektformat
- STL für triangulierte Druckmodelle
- Weitere Formate wie OBJ, glTF/GLB, 3MF und STEP/IGES werden einzeln auf technische Eignung und Lizenz geprüft
- Material-, Einheiten- und Strukturübertragung, soweit das Zielformat dies unterstützt
- Austauschformate sind optional; SILMO bleibt vollständig eigenständig

### F. KI- und Bildstudio
- Foto- und Skizzenerkennung
- Segmentierung mehrerer zusammenhängender und getrennter Motivteile
- Umwandlung erkannter Konturen in editierbare Skizzen und Körper
- Rekonstruktion mit nachvollziehbaren Unsicherheiten und manueller Korrektur
- KI-Ergebnisse dürfen keine unprüfbaren oder nicht editierbaren Sackgassen erzeugen

### G. Qualitäts- und Druckprüfung
- Geschlossene Volumen und Manifold-Prüfung
- Offene Kanten, Selbstüberschneidungen und degenerierte Flächen
- Wandstärken, Mindestabstände und kleine Details
- Volumen, Abmessungen, Schwerpunkt und Bounding Box
- Verständliche Fehlerliste mit Auswahl und Zoom auf die betroffene Geometrie

## 4. Entwicklungsphasen und Abnahmekriterien

### Phase 0 – Bestandsaufnahme und Architekturplan
**Status: weit fortgeschritten; Quellcodeprüfung und Architekturabnahme noch offen.**

- Bestandsaufnahme v90 und Funktions-/Abhängigkeitsmatrix erstellt
- Kritische technische Risiken aus Mesh-Modell, BSP-CSG, Einheiten, Projektformat und Undo/Redo dokumentiert
- Tatsächliche Einheitenumrechnung direkt im Quellcode geprüft und Dokumentationsfehler korrigiert: 1 Three.js-Einheit = 10 mm
- Unit-/Tolerance-Spezifikation mit bekannten Schwellen und offenen Zuordnungen erstellt
- CAD-Kern-Kandidaten verglichen und einen isolierten OCCT-WASM-Prototyp ergänzt
- Weitere direkte Prüfung von Objekt-Erzeugung, Mesh-Manipulation, Projektserialisierung und CSG-Aufrufstellen bleibt erforderlich

**Abnahme:** Der Plan benennt vorhandene Funktionen, Risiken, Modulgrenzen, Migrationsschritte und überprüfbare Qualitätskriterien.

### Phase 1 – Zuverlässiges technisches Fundament
- Modularer Build- und Entwicklungsablauf
- Lokale, reproduzierbare Abhängigkeiten statt unkontrollierter CDN-Laufzeitabhängigkeit
- Dokumentmodell und Schema-Versionierung
- Einheitliche Undo-/Redo- und Befehlsarchitektur
- Automatisierte Unit-, Integrations- und Browser-Tests
- Fehlerprotokollierung und Leistungs-Baselines

**Abnahme:** Bestehende Kernabläufe funktionieren weiterhin; Projektdateien bleiben kompatibel; Offline-/Ladefehler werden kontrolliert behandelt.

### Phase 2 – Geometrie-Kern und Modellierungsqualität
- CAD-Kern-Prototypen vergleichen und testen
- Topologie- und Geometrie-Datenmodell definieren
- Boolesche Operationen und Flächenbearbeitung robust machen
- Extrusion, Rotation, Sweep, Loft, Abrundung und Fase vereinheitlichen
- Geometriefehler erkennen und verständlich melden

**Abnahme:** Ein festgelegter Testsatz mit einfachen und schwierigen Körpern besteht reproduzierbar; keine Funktion gilt allein aufgrund einer Erfolgsmeldung als bestanden.

### Phase 3 – Professionelle Modellierungswerkzeuge
- Volle Objekt-, Komponenten-, Gruppen-, Flächen-, Kanten- und Punktbearbeitung
- Fangsystem und präzise Eingabe
- Skizzenbedingungen und parametrische Abmessungen
- Muster, Spiegeln, Ausrichten, Schnitte und Konstruktionsebenen
- Architektur-, Produkt- und technische Modellierungswerkzeuge

**Abnahme:** Reale Modellierungsaufgaben lassen sich ohne Umwege und ohne Datenverlust erledigen.

### Phase 4 – Bedienung und Arbeitsorganisation
- Kontextwerkzeuge, Befehlsuche und anpassbare Arbeitsbereiche
- Mehrere Ansichten, Szenen, Ebenen und Komponentenbibliothek
- Anfänger- und Expertenführung
- Tastenkürzel und Touch-/Stift-Bedienung

**Abnahme:** Funktionen sind auffindbar, die Oberfläche bleibt übersichtlich und fortgeschrittene Werkzeuge bleiben erreichbar.

### Phase 5 – KI, Bild- und Freiformmodellierung
- Foto-/Skizzenerkennung verbessern
- Getrennte Teile, Innenbereiche und schwierige Silhouetten erkennen
- Konturen kontrolliert in editierbare Geometrie überführen
- Freiform- und organische Modellierungswerkzeuge ausbauen

**Abnahme:** Ergebnisse werden anhand vielfältiger, auch schwieriger realer Vorlagen geprüft; Grenzen und Unsicherheiten werden angezeigt.

### Phase 6 – Dokumente, Austausch und Zusammenarbeit
- Robustes SILMO-Projektformat
- Import/Export weiterer 3D-Formate
- Materialien, Komponenten und Szenen erhalten, soweit möglich
- Versionierung und Wiederherstellung
- Später: Bibliotheken und Zusammenarbeit

**Abnahme:** Projekte lassen sich zuverlässig speichern, öffnen, weitergeben und zwischen unterstützten Formaten austauschen.

### Phase 7 – Druck- und Produktionsreife
- Geometrie- und Druckprüfung
- Masshaltigkeit und Wandstärken
- Exportqualität und Slicer-Kompatibilität
- Leistungs-, Stabilitäts- und Langzeittests

**Abnahme:** Modelle bestehen die dokumentierten Prüfungen; reale Druckergebnisse werden zusätzlich mit tatsächlichen Drucktests verifiziert.

## 5. Entwicklungs- und Veröffentlichungsregeln

1. Vor jeder Änderung den neuesten Hauptbranch-Stand und die betroffenen Dateien abrufen.
2. Bestehende Funktionen nicht entfernen, ohne Ersatz und Regressionstest.
3. Jede sinnvolle App-Iteration erhält eine neue Versionsnummer.
4. Änderungen klein genug halten, damit Fehler lokalisierbar bleiben.
5. Für jede neue Geometriefunktion positive, negative und Grenzfalltests ergänzen.
6. Browser-Tests, Syntax-/Build-Prüfungen und GitHub Actions müssen erfolgreich sein.
7. Deployment muss erfolgreich abgeschlossen sein, bevor eine Version als veröffentlicht gilt.
8. Synthetische Tests beweisen keine reale Fotoerkennung und keinen erfolgreichen physischen 3D-Druck.
9. Keine Fortschrittsmeldung als Fertigmeldung ausgeben. Nur geprüfte und veröffentlichte Ergebnisse als abgeschlossen melden.
10. Bei Unsicherheit wird die Funktion als experimentell gekennzeichnet, nicht als professionell fertig.

## 6. Nächster konkreter Arbeitsschritt

Phase 1 – technisches Fundament – wird auf einem separaten Implementierungsbranch umgesetzt. Die Einheiten-/Projektformat-Bausteine sind implementiert; der aktuelle Entwicklungszweig ergänzt die History-Auslagerung und weitere Toleranz-Audits. Der Produktionsstand bleibt davon getrennt.

### 6.1 Zentrale Einheiten-API
- `src/units.js` definiert die bestehende Skala: 1 Three.js-Welteinheit = 10 mm.
- Die API enthält getrennte Umrechnungen für Länge, Fläche und Volumen.
- Die Längen- und Flächenkonvertierungen im CAD-Hauptskript wurden auf die API umgestellt: Druckbett/Raster, Skizzenbegrenzung und -vereinfachung, Eingabedimensionen, STL-Import/-Export, Ausrichtung/Abstandsverteilung, Tastaturschritte, Skizzengeometrie und Druckmassenausgabe.
- Der alte `MM_PER_UNIT`-Kompatibilitätsalias wurde entfernt; es gibt keine verbleibenden Verwendungen in `index.html`.
- Unit-Tests und Browserprüfungen sichern die Referenzumrechnungen.

### 6.2 Projektformat v3 und Geometrievalidierung
- `src/project-schema.js` validiert App-Kennung, ganzzahlige Versionsnummer und Objektliste.
- `src/project-geometry.js` kapselt Serialisierung und Wiederaufbau von BufferGeometry sowie Union-Formteilen; es erhält Three.js und das Schema über eine explizite Factory-Schnittstelle.
- `src/project-io.js` kapselt das Speichern und Öffnen von Projektdateien. Der Hauptcode übergibt App-Zustand und Commit-Änderungen über explizite Callbacks.
- `validateSerializedGeometry` prüft zusätzlich Positionen mit itemSize 3, Attributlängen und -anzahlen, endliche Werte, Indexgrenzen und vollständige Dreiecksgruppen.
- `restoreGeometry` ruft die Validierung vor dem Wiederaufbau der typisierten Arrays auf.
- Der Browser-Regressionslauf prüft auch fehlerhafte Positionsdaten: Das zuvor geöffnete Projekt muss erhalten bleiben.
- Speichern schreibt weiterhin Formatversion 3; unbekannte ältere und neuere Versionen werden abgelehnt.
- Die Spezifikation steht in `docs/SILMO_PROJECT_FORMAT_V3.md`.

### 6.3 Lokale Runtime und reproduzierbare Abhängigkeiten
- `package.json` und `package-lock.json` pinnen Three.js auf Version 0.128.0.
- `npm ci` installiert die festgelegte Version; `scripts/prepare-runtime.mjs` stellt Three.js r128, STLLoader, STLExporter und die Lizenzdatei lokal bereit.
- `index.html` lädt die Runtime aus `vendor/three/`; externe CDN-Script-Referenzen wurden entfernt.
- Code- und Browser-CI erzeugen die Runtime vor den Tests. Der Browser-Test blockiert externe HTTPS-Zugriffe und prüft, dass SILMO trotzdem startet.
- Der Pages-Build kopiert die lokal erzeugten Runtime-Dateien in sein Artefakt. Das Produktionsdeployment bleibt bis zur Freigabe des PR gesperrt.

### 6.4 Benannte Toleranzen
- `src/tolerances.js` enthält die zuerst inventarisierten Werte mit klarer Dimension und Funktion: CSG, Ausrichtungs-/Änderungsschwellen, Skizzenvereinfachung, Skizzen-Druckbettgrenze und Druckprüfung.
- Die Werte wurden nicht vereinheitlicht oder numerisch verändert. Die API macht die Bedeutung sichtbar.
- `tests/tolerances.test.cjs` sichert Werte und Unveränderlichkeit.
- Das Inventar und die offenen Zuordnungen stehen in `docs/SILMO_UNITS_TOLERANCE_SPEC.md`.

### 6.7 BSP-CSG-Kern
- Der polygonbasierte BSP-Kern wurde in `src/csg.js` ausgelagert und erhält Three.js sowie die CSG-Toleranz über eine explizite Factory-Schnittstelle.
- `runBooleanOperation` bleibt im Hauptskript, weil es Auswahl, Undo-History, Szene und UI aktualisiert. Die reine Geometrieberechnung wird über `window.SILMOCSG.combineMeshes` ausgeführt.
- Der Browser-Regressionslauf prüft sowohl Boolesche Verbindung als auch Differenz; bestehende Union-Teile bleiben speicher- und wiederherstellbar.
### 6.6 Erste schrittweise Modularisierung
- `src/developer-diagnostics.js` enthält das Diagnosefenster als eigenständige Datei.
- `src/tool-navigation.js` enthält Hauptnavigation, Werkzeugbereiche und Unterreiter.
- `src/tutorial.js` enthält den geführten Lernkurs.
- `src/image-studio.js` enthält den Bildbereich, die Konturerkennung und die CAD-Übergabe.
- `src/project-geometry.js` kapselt Geometrie-Serialisierung und -Wiederaufbau.
- `src/project-io.js` kapselt Speichern und Öffnen von Projektdateien über eine explizite Callback-Schnittstelle.
- Die Module werden in dokumentierter Reihenfolge geladen; statische Prüfungen und Browser-Regressionen beziehen die ausgelagerten Module ein.
- Das CAD-Hauptskript enthält weiterhin den zentralen Laufzeitzustand, die Modellierungswerkzeuge und eng gekoppelte Interaktionen. Weitere Extraktionen erfolgen erst nach dokumentierter Abhängigkeitsanalyse.

### 6.7 Aktueller Stand und nächste Schritte
- Die zentrale Einheiten-API ist in `index.html` eingebunden; eine aktuelle Quellcodesuche findet dort keine Verwendung des alten Namens `MM_PER_UNIT`.
- Die lokale Three.js-Runtime ist fest gepinnt und wird für Browser-Tests und Pages-Artefakte vorbereitet.
- Projektformat v3 und Geometrievalidierung sind implementiert. Einfache und erweiterte Projekt-Fixtures sowie negative Importtests sind Teil der Browser-Regression.
- Die benannten Toleranzen sind dokumentiert. Zusätzlich wurden Kontur-Hohlrahmen, editierte Skizzenkonturen, Pfadrichtungen und Profilumfang mit getrennten Konstanten versehen; die numerischen Altwerte blieben unverändert. Das vollständige Toleranzinventar und Grenzfalltests für alle Klassen bleiben offen.
- Projektdatei-I/O ist aus dem Hauptskript ausgelagert. Der atomare Wechsel auf das neue Modell wird durch Browser-Regressionen abgesichert.
- Der aktuelle Entwicklungszweig ist `phase1/history-foundation`; PR 69 und PR 70 bleiben Draft und ungemergt. Es erfolgt kein Produktionsdeployment vor der ausdrücklichen Fertigstellung und Freigabe.
- Für Code-Commit `0f32a9ca60adb78a0510a2facac1236aa03176a0` waren Code-Checks und vollständige Browser-Tests erfolgreich. Der Stand enthält zusätzlich die geprüfte Hohlrahmen-Metadatenvalidierung für Projektimporte.

**Nächste Schritte:** Zuerst die noch offenen Einheiten-/Toleranz-Aufrufstellen anhand des Quellcodes inventarisieren und fachlich getrennt migrieren. Danach weitere kritische Import-/Export- und Projektdatei-Grenzfälle ergänzen. Anschliessend die nächste Modulgrenze aus der Abhängigkeitsmatrix auswählen und mit kleinem Diff extrahieren. Phase 1 gilt erst als abgeschlossen, wenn alle festgelegten Abnahmekriterien nachweisbar erfüllt sind.

### 6.8 Undo-/Redo-History und weitere Toleranz-Audits
- `src/history.js` verwaltet Undo-/Redo-Stacks, begrenzte Snapshot-Anzahl, Verwerfen des Redo-Zweigs nach neuen Änderungen sowie Snapshot-Freigabe.
- Die App erstellt Mesh-/Material-Snapshots und übergibt Capture-, Restore- und Dispose-Funktionen an das unabhängige Modul.
- Wiederherstellung baut die neuen Meshes und Materialien zuerst auf, bevor die bisherige Szene ersetzt wird; Material-Arrays werden unterstützt.
- Unit-Tests decken Undo/Redo, Verlaufslimit, Snapshot-Freigabe, Clear/Dispose und fehlgeschlagene Wiederherstellung ab.
- Weitere einzeln zugeordnete Schwellen für Rastergrenzen, Gruppenrotation, Profilquellabmessungen, Skizzenprofil-Schliessung, parallele Strahl-/Skizzenebenen-Berechnung, Bildkontur-Prüfungen in Pixel/Pixel² und mm/mm² und Lernkurs-Positionsänderungen sind in `src/tolerances.js` benannt und getestet.
- Die History bleibt snapshotbasiert. Eine inkrementelle/befehlsbasierte Historie und Speicher-/Leistungs-Baselines sind noch offen.
- Der Browser-Testhelfer verwendet Playwright 1.65.1; die App-Runtime selbst hängt nicht von Playwright ab.


### 6.9 STL-Import/-Export als eigenes Modul
- `src/stl-io.js` kapselt STL-Dateiparsing und ASCII-STL-Export über eine Factory-Schnittstelle.
- Die Einheitenumrechnung verwendet die zentrale `SILMOUnits`-API: STL-Koordinaten werden beim Import als mm interpretiert und beim Export vollständig in mm umgerechnet.
- Der Import prüft Dateityp, Dateigrösse, Positionsattribut, Punktanzahl und endliche Koordinaten; Fehler geben nicht übernommene Geometrie- und Materialressourcen frei.
- Der Export arbeitet ausschliesslich auf Geometriekopien und entsorgt diese nach dem Export, ohne das sichtbare Modell zu verändern.
- Dateiauswahl, Drag-and-drop und Web-Link-Interaktion bleiben im Hauptskript; Objekt- und Statusänderungen werden über Callbacks angebunden.
- Code- und Browser-Regressionsläufe prüfen Import, Mehrfachimport, Export, mm-Skalierung und Roundtrip; der vollständige Browserlauf war auf Commit `1e69a14ee41043d76fe95886b2e75938f791e2f9` erfolgreich. Ein zusätzlicher negativer STL-Importtest prüft, dass eine beschädigte Datei abgewiesen wird, keine vorhandenen Modelle verändert und keinen unerwarteten Konsolenfehler erzeugt. Der Test war auf Commit `f1d97ad7f03ca6fc9efd126e704b6bbd74b2f33d` im vollständigen Browserlauf erfolgreich.

### 6.10 Erste reproduzierbare History-Leistungsbaseline
- `scripts/benchmark-history.mjs` misst die snapshotbasierte Undo-/Redo-Verwaltung mit 1, 10 und 50 Objekten, je 999 Vertices und fünf gespeicherten Zuständen.
- Erfasst werden Median der Snapshot-Aufnahme, Undo-/Redo-Zeit sowie Node-Speicherwerte vor Snapshots, nach Snapshots und nach Freigabe/GC.
- Der Benchmark läuft als `npm run benchmark:history` in den Code-Checks.
- Die Messung ist zunächst informativ und verwendet keine maschinenabhängigen Pass/Fail-Grenzwerte. Sie ist eine isolierte History-Baseline, keine vollständige Browser-/CAD-Leistungsmessung.
- Erste GitHub-Runner-Referenz (Node v22.23.5, Three.js r128): bei 1/10/50 Objekten lag der Snapshot-Median bei 0,035/0,095/0,669 ms; Undo bei 0,192/0,277/1,429 ms; Redo bei 0,106/0,224/1,480 ms. Diese Werte sind nur Vergleichspunkte und keine Qualitätsgrenzen.
- Bei 50 Objekten stiegen ArrayBuffers während fünf Snapshots von rund 1,22 MB auf 7,21 MB und fielen nach Dispose/GC auf rund 20,8 KB zurück; beide History-Stacks waren leer.
- Nach dem Leeren der History werden mehrere GC-/Event-Loop-Durchläufe abgewartet; zusätzlich wird geprüft und protokolliert, dass Undo-/Redo-Stacks danach leer sind.
- Offene nächste Schritte: grössere reale Meshes, Browser-RAM/Frame-Zeit, Projektöffnung, Boolesche Operationen und interaktive Bildkonturerkennung messen.

Die Kernel-Forschung bleibt davon getrennt: Kein OCCT-/Replicad-/OpenGeometry-Paket wird in die Produktionsanwendung eingebunden, bevor die offenen technischen und rechtlichen Abnahmepunkte geklärt sind.

**Erfolg bedeutet nicht möglichst viele Werkzeuge. Erfolg bedeutet, dass SILMO komplexe 3D-Aufgaben präzise, stabil und verständlich erledigt.**


### 6.11 Weitere Skizzen- und Kontur-Toleranzen
- Die bislang direkt im CAD-Hauptskript verwendeten Skizzen-Eingabeschwellen sind in `src/tolerances.js` einzeln benannt.
- Abgedeckt sind Punktaufnahmeabstände, Mindestlänge einer Skizzenlinie, Vorschauversatz, Klickkontur-Schliessabstand, Konturpunktabstand, minimale Straightening-Bewegung, RDP-Degenerationsnenner und Mindestfläche einer Freiform.
- Die Zahlenwerte wurden nicht verändert. Die Benennung hält Welteinheiten und Welteinheiten² getrennt und kennzeichnet den Vorschauversatz ausdrücklich als Darstellung.
- `tests/tolerances.test.cjs` sichert alle neuen Werte; die betroffenen Aufrufstellen verwenden die zentrale API.
- Offene Toleranzarbeit bleibt: weitere Aufrufstellen im Bild-Studio und in Modellierungsfunktionen systematisch inventarisieren; danach Grenzfalltests pro Funktionsfamilie ergänzen. Kein pauschales Ersetzen ähnlicher Zahlenwerte.


### 6.12 Bild-Studio-Druckbarkeitsgrenzen
- Der Mindestanteil einer erkannten Bildkomponente, die Mindestfläche real abgebildeter Konturen und die Mindestwandstärke sind in `src/tolerances.js` benannt.
- `src/image-studio.js` nutzt diese Werte für die Bildkomponentenfilterung und die Druckbarkeitsprüfung. Die bestehenden Werte 0,000025, 0,01 mm² und 0,8 mm wurden nicht verändert.
- Unit-Tests sichern die Werte; die Browser-Regression muss die automatische Konturerkennung, echte Innenlöcher und Druckbarkeitsvalidierung weiterhin bestehen.
- Die zuvor als möglicherweise gemischt eingestufte Flächenschwelle in `polygonIsSimple` wurde anhand sämtlicher Aufrufstellen geprüft: die Funktion wird nur für bereits in mm abgebildete Konturen verwendet. Sie ist jetzt als `IMAGE_MIN_SIMPLE_POLYGON_AREA_MM2` benannt und getestet.


### 6.13 Kontur-Hohlrahmen-Gehrungsgrenze
- Die Gehrungs-/Offset-Schnittpunktbegrenzung des Kontur-Hohlrahmens verwendet jetzt zwei getrennt benannte Werte: dimensionsloser Faktor 8 und Zusatzspielraum 0,02 Welteinheiten.
- Die Berechnung verwendet beide Werte über `SILMOTolerances`; die bisherigen Zahlenwerte bleiben unverändert.
- Unit-Tests sichern beide Konstanten. Die bestehende Browser-Regression für den Kontur-Hohlrahmen bleibt Teil der Pflichtprüfung.


### 6.14 Freiform- und Herz-Kontur-Punktabstände
- Die Mindestabstände für die Bereinigung benachbarter Freiformpunkte und für die Herz-Konturklassifikation sind zentral benannt.
- Die Werte 0,005 und 1e-5 Welteinheiten bleiben unverändert und werden durch Unit-Tests gesichert.
- Der spezielle Herz-Konturpfad bleibt getrennt von der allgemeinen Bildkonturerkennung; diese Benennung ändert keine Erkennungslogik.


### 6.15 Grenzfalltests für Bildkontur-Druckbarkeit
- Die Playwright-Browser-Regression prüft die Mindestwand von 0,8 mm an der Grenze (0,8 mm akzeptiert; 0,799 mm abgewiesen).
- Sie prüft auch die Mindestkonturfläche von 0,01 mm² (exakte Grenze akzeptiert; 0,009801 mm² abgewiesen).
- Zusätzlich bleiben bestehende Tests für Aussparungen an der Aussenkante, überlappende Innenlöcher und selbstschneidende Aussenkonturen aktiv.


### 6.16 Korrektur des numerischen Flächen-Grenzfalls
- Der Browser-Testlauf vom 20.11.2026 deckte auf, dass eine mathematisch exakt 0,01 mm² grosse Kontur durch binäre Gleitkomma-Rundung knapp unter dem gespeicherten Grenzwert landen und abgewiesen werden konnte.
- Die Mindestflächenvergleiche verwenden nun einen separaten numerischen Spielraum von `1e-12 mm²`; die fachliche Mindestfläche bleibt 0,01 mm².
- Die Browser-Regression prüft weiterhin die exakte Grenze und eine deutlich kleinere Kontur von 0,009801 mm².


### 6.17 Bildkontur-Einheiten im CAD-Prüfpfad präzisiert
- Die Segment- und Punkt-in-Polygon-Prüfungen laufen ausschliesslich auf Konturen, die bereits auf reale Millimeter abgebildet wurden.
- Fünf bisher mit `_PX` / `_PX2` bezeichnete Werte wurden deshalb dimensionsrichtig in `_MM` / `_MM2` umbenannt; Zahlenwerte und Verhalten blieben unverändert.
- Die eigentliche Raster-/Bildkomponenten-Erkennung bleibt separat im Pixelraum.


### 6.18 Projektweite Geometrie-Importgrenze
- Die bisherige Schema-Grenze von 1'500'000 Attributwerten galt pro Mesh. Bei bis zu 100 Projektobjekten hätte sich daraus eine sehr grosse kumulierte Datenmenge ergeben.
- `validateProjectEnvelope` validiert Geometrien jetzt bereits beim Projektumschlag und summiert Attributwerte sowie Indizes über alle Objekte und rekursiv gespeicherten Union-Teile.
- Die projektweite Obergrenze beträgt 15'000'000 numerische Geometriewerte. Der Grenzfalltest akzeptiert exakt 15'000'000 Werte und weist einen zusätzlichen Geometrieanteil in einem Union-Teil ab.
- Diese zusätzliche Schutzgrenze ändert keine Geometriekoordinaten und keine bestehende Modellierungsfunktion; sie begrenzt ausschliesslich die Datenmenge beim Projektimport.
- Status: Implementiert auf Commit `dcc8246a53d00f4a569ea61e99bd5fa5dfde3d03`; Code- und Browser-CI für diesen Commit müssen noch erfolgreich nachgewiesen werden.


### 6.19 Grundkörper-Geometrie isoliert und mathematisch geprüft (20.11.2026)
- Die reine Three.js-Geometrieerzeugung der sechs bestehenden Grundkörper wurde aus `index.html` nach `src/primitive-geometry.js` ausgelagert.
- Die Zuständigkeiten für History, Material, Position, Objektliste, Auswahl und UI bleiben weiterhin im Hauptskript; das neue Modul erzeugt nur die Geometrie und berechnet ihre Bounding Box.
- Die bisherigen Formen, Segmentzahlen, Abmessungen, Z-Höhenorientierung und der Würfel-Fallback für unbekannte Typen bleiben erhalten.
- `tests/primitive-geometry.test.cjs` prüft Sollabmessungen für Würfel, Kugel, Zylinder, Kegel, Sechskant-Prisma und Torus sowie den Fallback und unabhängige Geometrieinstanzen.
- Die neue Datei ist in der Script-Reihenfolge, den Unit-Tests, den Pages-Paketprüfungen und den Browser-Regressionen registriert.
- Auf Commit `1880cc057d8c332d13cbf50691bb3864a3461bea` sind 37/37 Unit-Tests und der vollständige SILMO-Browserlauf erfolgreich. Der isolierte OCCT-Prototyp mit 40-Bohrungs-Musterplatte und der 12-Bohrungs-WebWorker-Test ist ebenfalls erfolgreich.
- Die Extraktion ändert keine Produktversion; Build-Metadaten bleiben v94. Kein Merge und kein Deployment.


### 6.20 Skizzen-Extrusionsgeometrie isoliert (20.11.2026)
- Die gemeinsame Erzeugung und Fertigstellung der Three.js-Extrusionsgeometrie liegt jetzt in `src/sketch-geometry.js`.
- Die reguläre Freiform-Skizze inklusive Innenlöchern und die parametrischen 2D-Profile (Kreis, Ellipse, Dreieck, abgerundetes Rechteck und Rechteck) verwenden die neue Factory.
- Skizzeneingabe, Constraints, Abmessungsvalidierung, Profilaufbau, Positionierung, Druckbettprüfung, Metadaten, Material, History und Modell-Commit bleiben bewusst im Hauptskript. Die Extraktion verändert daher keine Bedien- oder Zustandslogik.
- `tests/sketch-geometry.test.cjs` prüft Quaderabmessungen und Volumen, ein echtes Innenloch mit analytischem Volumen, Kreisextrusion, unabhängige Geometrieinstanzen und kontrollierte Ablehnung eines fehlenden Profils.
- Das neue Modul ist in Script-Reihenfolge, Pages-Paket, Code-Checks und Browser-Regression registriert.
- Commit `4f6b1be0983651f590977a10ab48e34b3146d551`: 41/41 Unit-Tests bestanden; vollständige Browser-Regression und isolierter OCCT-/WebWorker-Test erfolgreich.
- Kein Versionssprung: App-Metadaten bleiben v94. Kein Merge und kein Deployment.


### 6.21 Parametrische Skizzenprofile ebenfalls ausgelagert (20.11.2026)
- `src/sketch-geometry.js` erzeugt jetzt neben Extrusionsgeometrien auch die parametrischen Profile Kreis, Ellipse, Dreieck, Rechteck und abgerundetes Rechteck.
- Die bisher im Hauptskript liegende abgerundete Rechteck-Kontur wurde in dieselbe Factory verschoben. Sowohl die Vorschau als auch die endgültige Skizzengeometrie verwenden diese gemeinsame Konturimplementierung; die Option für umgekehrte Konturrichtung bleibt verfügbar.
- Die bestehenden Eingabegrenzen und Fehlermeldungen für Eckenradien bleiben im App-Hauptskript. Die Factory prüft zusätzlich, ob positive Profilabmessungen übergeben wurden.
- Neue Unit-Tests prüfen die Aussenabmessungen und gültige Volumenerzeugung aller fünf Profiltypen, umgekehrte abgerundete Konturrichtung sowie ungültige Abmessungen.
- Auf Code-Head `2af76685ebf31a417bc0cf1896a7b161a199567c`: 44/44 Unit-Tests, vollständige Browser-Regression und isolierter OCCT-/WebWorker-Test erfolgreich.
- Die Extraktion verändert weder Werkzeugbedienung noch Modell-Commit. Keine Versionsänderung, kein Merge und kein Deployment.


### 6.22 Loft- und Sweep-Geometrie ausgelagert (20.11.2026)
- Die Geometriefunktionen für Loft und Sweep sind jetzt Teil von `src/sketch-geometry.js`.
- Loft: geschlossene Profile werden gleichmässig abgetastet, zu Seitenflächen verbunden und mit triangulierten Endflächen geschlossen.
- Sweep: ein geschlossenes Profil wird entlang einer Catmull-Rom-3D-Bahn extrudiert.
- Auswahl, Quellobjekttransformationen, History, Material, Objektverwaltung und UI bleiben im Hauptskript.
- Neue Tests prüfen analytische Sollvolumen (Loft 8, Sweep 12), Bounding-Box-Abmessungen, endliche Koordinaten und kontrollierte Fehlerfälle.
- Bekannte Loft-Grenzen: Endkappen verwenden weiterhin XY-Projektion der Weltkoordinaten; arbitrary geneigte Profile und Innenkonturen sind noch nicht robust. Die Zuordnung von Startpunkt und Laufrichtung zweier Profile ist ebenfalls noch nicht optimiert.
- Auf Code-Head `9bf75280747d879f5980df6c9cc45b5da199fea1`: 48/48 Unit-Tests, Browser-Regression und OCCT-WebWorker-Test erfolgreich.


### 6.23 CAD-Pfadkurven und Pfadrohre ausgelagert (20.11.2026)
- Gerade 2D-Pfade und Catmull-Rom-Kurven werden zentral durch `createPathCurve` erzeugt.
- Die Rohrgeometrie für Linien und Kurven wird durch `createPathTubeGeometry` erzeugt und berechnet Normalen, Bounding Box und Bounding Sphere.
- Die Factory wird bei der Skizzenanlage, Pfadlängenänderung und Kurvenlängenabfrage verwendet.
- Neue Tests prüfen Linien-/Kurvensemantik, Sollradius und Rohrabmessungen sowie ungültige Parameter.

- Verifikation der Pfadkurven-/Rohr-Extraktion auf Code-Head `fdb0139a9b48188b39f92ecbe1beb5260618781c`: 51/51 Unit-Tests; Browser-Regression und OCCT-/WebWorker-Test erfolgreich.


### 6.24 Hohlrahmen-Geometrie ausgelagert und Offset-Grenzfall abgesichert (20.11.2026)
- Die Offset-Kontur und Extrusionsgeometrie des selbst gezeichneten Hohlrahmens wird jetzt durch `src/sketch-geometry.js` erzeugt.
- Auswahl, Sperrstatus, Eingabefelder, mm-Umrechnung, History, Material, Positionierung und Szenen-Commit verbleiben im Hauptskript.
- Zusätzlich wurde ein geometrischer Grenzfall korrigiert: Bei zu grosser Wandstärke konnte ein nach innen versetztes Quadrat über den Kollapspunkt hinaus wieder eine kleine Kontur mit gleicher Flächenorientierung bilden. Die Factory prüft jetzt den tatsächlichen Mindestabstand der Innenkontur zur Ausgangskontur und weist diesen Fall zurück.
- Tests prüfen Hohlrahmenvolumen, Abmessungen, beide Konturrichtungen sowie ungültige und kollabierte Innenkonturen.
- Auf Code-Head `208815fd7d101f1af4520d2834c8437a9ea8bad4`: 54/54 Unit-Tests, Browser-Regression und OCCT-WebWorker erfolgreich.


### 6.25 Kantenbearbeitung aus dem Hauptskript ausgelagert (20.11.2026)
- Die Geometrieerzeugung für Skizzen-Abrundungen und -Fasen liegt jetzt in `src/sketch-geometry.js`.
- Das Hauptskript behält die Eingabegrenzen, Auswahl, History, Material-/Mesh-Austausch und UI-Meldungen; die Factory erzeugt nur die neue Extrusionsgeometrie.
- Unit-Tests prüfen beide Modi, endliche Positionen/Normalen, Bounding-Volumen, Sollabmessungen und ungültige Parameter. Die bestehende Browser-Regression führt zusätzlich den integrierten Profi-CAD-Funktionstest für Abrunden und Abfasen aus.
- Die Extraktion ist implementiert. Ein erfolgreicher GitHub-CI-Lauf auf dem neuen Commit muss noch bestätigt werden.


### 6.26 Loft-Factory für geneigte und hohle Profile (20.11.2026)
- Die Loft-Factory wurde von reiner XY-Kappung auf ebene 3D-Endprofile mit lokaler 2D-Projektion erweitert.
- Die Triangulation kann mehrere Innenkonturen berücksichtigen und verbindet deren Mantelflächen zwischen beiden Profilen.
- Startpunkt und Laufrichtung der zweiten Profilkontur werden standardmässig anhand der zentrierten Konturform ausgerichtet; `alignProfiles: false` deaktiviert diese Anpassung.
- Zentrale Planaritäts- und Normalentoleranzen sind ergänzt. Nicht planare/entartete Profile und nicht paarweise passende Innenkonturen werden kontrolliert abgewiesen.
- Unit- und Browsertests decken geneigte Profile, umgekehrte Punktreihenfolgen, Hohlkörper-Volumen und ungültige Eingaben ab.
- **Grenze:** Die Geometrie-API unterstützt Innenkonturen; die bestehende App-Auswahl und Projektmetadaten liefern derzeit noch keine mehreren Konturen pro Skizze.


### 6.27 Hohl-Loft in der App und im Projektformat (20.11.2026)
- Die Profi-CAD-Loft-Auswahl akzeptiert jetzt zwei Aussenprofile sowie paarweise Innenprofile in der Reihenfolge Aussen A, Aussen B, Innen A1, Innen B1, Innen A2, Innen B2 usw.
- Bis zu acht Innenkontur-Paare werden auf die bestehende Loft-Factory übertragen; die Factory trianguliert die Endflächen mit Aussparungen und verbindet die Innenwände.
- Die UI-Hilfe erklärt die Auswahlreihenfolge. Ungültige Auswahlanzahlen und Profile ohne gespeicherte geschlossene Kontur werden vor der Geometrieerzeugung abgewiesen.
- Loft-Metadaten enthalten Anzahl der Innenkonturen und die Quellprofil-UUIDs. Projektformat v3 speichert diese Metadaten und stellt sie beim Import wieder her.
- Das Projektschema validiert die Loft-Referenzen, die Anzahl (0–8) und die paarweise Quellzuordnung.
- Browser-Regression prüft den App-Workflow mit vier ausgewählten Profilen sowie Speichern und erneutes Öffnen einer Projektdatei.
- **Noch offen:** Innenprofile müssen weiterhin als separate geschlossene Skizzenobjekte gezeichnet werden; eine direkte Lochzeichnung innerhalb eines einzigen Skizzenprofils und editierbare assoziative Loft-Features sind noch nicht umgesetzt.

- Ergänzend werden Objekt-UUIDs im Projektformat gespeichert und beim Import wiederhergestellt, damit Loft-Quellprofilverweise nach einem Projekt-Roundtrip stabil bleiben. Das Schema weist ungültige oder doppelte gespeicherte Objektkennungen zurück.


### 6.28 Innenlöcher direkt in einer einzelnen Freiform-Skizze (20.11.2026)
- Der Punkt-für-Punkt-Zeichenbereich kann nach der Aussenkontur in den Modus „Innenloch zeichnen“ wechseln. Weitere Innenkonturen werden im selben Skizzenentwurf geführt und als echte Durchöffnungen extrudiert.
- Die Vorschau zeigt Aussen- und Innenkonturen gemeinsam. Fertige Innenlöcher bleiben beim Abbrechen einer gerade begonnenen Innenkontur erhalten.
- Validierung weist Innenkonturen ausserhalb der Aussenkontur, Selbstüberschneidungen, Berührungen und Überschneidungen mit anderen Innenlöchern zurück.
- Freiform-Skizzen-Metadaten mit Innenkonturen werden im Projektformat v3 gespeichert, beim Import validiert und wiederhergestellt. Ältere v3-Dateien ohne diese optionalen Metadaten bleiben kompatibel.
- Browser-Regression prüft echte Innenlöcher, Ablehnung einer ausserhalb liegenden Innenkontur sowie Speichern und erneutes Öffnen der editierbaren Konturdaten.


### 6.29 Nachträgliche Konturpunktbearbeitung inklusive Innenlöcher (20.11.2026)
- Der bestehende Konturpunkt-Editor erhält eine Konturauswahl: Aussenkontur oder eines der gespeicherten Innenlöcher.
- Punktkoordinaten lassen sich nach dem Erzeugen des 3D-Körpers ändern. Beim Neuaufbau der Extrusion bleiben sämtliche anderen Ringe erhalten und werden als echte Öffnungen neu erzeugt.
- Änderungen werden auf degenerierte Ringe, zu kurze Kanten und ungültige Lage/Überschneidung der Innenlöcher geprüft, bevor die alte Geometrie ersetzt wird.
- Browser-Regression prüft das Verschieben eines Innenloch- und Aussenkontur-Punktes an einem bereits erzeugten Körper. Zusätzlich werden die Konturkoordinaten beim Ändern der Gesamtmasse mitskaliert; Innenlochfläche und Aussenkontur bleiben synchron.
- Noch nicht unterstützt: Konturbearbeitung an bereits abgerundeten/abgefasten Körpern; parametrische Abhängigkeiten und interaktive direkte Manipulation im 3D-Viewport.
- Validierung auf Test-Head `065693f968f1b4e077cfaaa774cd36dda1b0d797`: Code Checks Run `44772620376`, Browser-Regression Run `44772620471` und isolierter OCCT-/WebWorker-Test Run `44772620241` erfolgreich. Der Browser-Test ändert auch die Gesamtmasse und bearbeitet danach Innen- und Aussenkontur; die Öffnung bleibt erhalten.


### 6.30 Loft-Feature aus gespeicherten Quellprofilen aktualisieren (20.11.2026)
- Ein ausgewählter Loft-Körper kann über „Aus Quellprofilen aktualisieren“ aus den gespeicherten UUID-Referenzen seiner Aussen- und Innenprofile neu aufgebaut werden.
- Die Funktion übernimmt aktuelle Quellkonturen und Welttransformationen. Die neue Geometrie wird in den lokalen Koordinatenraum des Loft-Objekts zurücktransformiert; dessen Position, Drehung und Skalierung bleiben bestehen.
- Fehlende Quellprofile, ungültige Konturen, unvollständige Innenprofil-Paare und gesperrte Loft-Körper werden kontrolliert abgewiesen. Die alte Geometrie wird erst nach erfolgreicher Neuerzeugung ersetzt.
- Browser-Regression verändert die Position eines Quellprofils und prüft, dass der ausgewählte Loft-Körper eine neue Bounding-Box erhält.
- Grenze: Die Aktualisierung erfolgt bewusst manuell über die Schaltfläche; automatische Live-Neuberechnung bei jeder Quelländerung und vollständige Feature-Abhängigkeitsverwaltung bleiben offen.
- Validierung auf Test-Head `1915a52be5661aee7cf0d3f94635c4f7c16eaf16`: Code Checks Run `44773232840`, Browser-Regression Run `44773232809` und isolierter OCCT-/WebWorker-Test Run `44773232778` erfolgreich.
