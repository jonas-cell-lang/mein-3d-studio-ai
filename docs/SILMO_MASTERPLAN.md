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


### 6.31 Konturpunkte nach der Extrusion einfügen und entfernen (20.11.2026)
- Der Kontur-Editor kann einen Punkt mittig auf der ausgewählten Kante einfügen oder den ausgewählten Punkt entfernen.
- Aussenkontur und jedes Innenloch sind getrennt bearbeitbar. Das Entfernen des letzten möglichen Eckpunkts wird verhindert; jede Kontur behält mindestens drei Punkte.
- Die gemeinsame Geometrie-Neuerzeugung validiert Mindestfläche, Mindestkantenlänge, Selbstüberschneidung und Lage/Abstand aller Innenlöcher. Erst nach erfolgreicher Geometrieerzeugung wird die alte Geometrie ersetzt und History erfasst.
- Browser-Regression prüft Einfügen und Entfernen eines Punktes in einer extrudierten Innenkontur, ohne die Öffnung zu verlieren.
- Kantenbehandelte Körper bleiben von dieser direkten Konturbearbeitung ausgeschlossen.
- Validierung auf Test-Head `f20c40951c0cccf11b89c36fa84d01f4a3769260`: Code Checks Run `44773846336` und Browser-Regression Run `44773846039` erfolgreich. Der unabhängige OCCT-/WebWorker-Lauf `44773846005` läuft noch.


### 6.32 Ein ganzes Innenloch aus einer extrudierten Skizze entfernen (20.11.2026)
- Der Kontur-Editor kann ein ausgewähltes Innenloch vollständig entfernen, ohne die Aussenkontur oder andere Innenlöcher zu verändern.
- Die Aussenkontur ist gegen versehentliches Entfernen geschützt. Nach dem Entfernen wird der Körper mit den verbleibenden Konturen neu aufgebaut und vor dem Commit validiert.
- Browser-Regression prüft das Entfernen des einzigen Innenlochs und die erhaltene gültige Grundgeometrie.
- Validierung auf Test-Head `9e714d46e3da9bda5c9b140ec9e26ef4ded20236`: Code Checks Run `44774341591`, Browser-Regression Run `44774342170` und isolierter OCCT-/WebWorker-Test Run `44774343771` erfolgreich.


### 6.33 Topologieprüfung für gespeicherte Skizzen-Innenlöcher (20.11.2026)
- Projektimport prüft bei Freiform-Skizzen mit Innenlöchern nicht mehr nur Array-Längen und endliche Koordinaten, sondern auch die Ringtopologie.
- Die Aussenkontur und jedes Loch müssen einfache, geschlossene, nicht entartete 2D-Ringe sein. Jedes Loch muss strikt innerhalb der Aussenkontur liegen; Randberührung, Kantenkreuzung, Selbstüberschneidung, Überlappung und ineinander liegende Löcher werden abgewiesen.
- Die Prüfung ist bewusst im Projekt-Schema implementiert und benötigt beim Import keine Three.js-Geometrieerzeugung.
- Tests decken gültige Mehrfachlöcher sowie Selbstüberschneidung, Nullfläche, doppelte Nachbarpunkte, fehlende Aussenkontur, ausserhalb liegende Löcher, Randberührung, Kreuzungen, Überlappung, Berührung und Verschachtelung ab.
- Die Geometrie- und Browserregressionen bleiben zusätzlich erforderlich; Schema-Prüfung allein ersetzt keine geometrische Druckbarkeitsprüfung.


### 6.34 Sichere Laufzeitgrenzen für die Skizzen-Topologieprüfung (20.11.2026)
- Die Topologieprüfung begrenzt die Summe aus Aussen- und Innenkonturpunkten pro Skizzenobjekt auf 5000 Punkte; zusätzlich bleiben maximal 100 Innenlöcher und 1000 Punkte pro Ring zulässig.
- Ringpaar-Prüfungen verwenden zunächst überlappende Bounding-Boxen. Räumlich getrennte Löcher müssen dadurch nicht mit jedem einzelnen Segment des anderen Rings verglichen werden.
- Das Punktbudget begrenzt die quadratischen Segmentvergleiche bei manipulierten Projektdateien und verhindert unbeschränkt grosse Import-Prüfaufwände.
- Direkte Modulprüfung auf dem aktuellen Code-Stand: gültige Mehrfachlöcher akzeptiert; Selbstüberschneidung, Nullfläche, Randberührung, Aussenkontur-Kreuzung, Überlappung, Verschachtelung und fehlende Aussenkontur abgewiesen; Punktbudget knapp darunter akzeptiert und darüber abgewiesen.
- GitHub Actions hat für diese API-Commits bislang keine zugehörigen Runs bzw. Statuschecks zurückgegeben. Die Modulprüfungen sind daher kein Ersatz für einen bestätigten CI-Lauf.


### 6.35 Eindeutige Quellprofile für gespeicherte Loft-Features (20.11.2026)
- Das Projekt-Schema prüft zusätzlich, dass Aussenprofile und alle gepaarten Innenprofile eines Loft-Features unterschiedliche UUIDs besitzen.
- Doppelte Verweise auf dasselbe Quellobjekt werden abgewiesen, da sie die Profilpaarung und spätere Aktualisierung mehrdeutig machen würden.
- Die Existenz der Quellobjekte wird weiterhin nicht erzwungen: Ein Benutzer darf Quellskizzen löschen; das Loft bleibt dann als Geometrie erhalten, kann aber nicht mehr aus fehlenden Quellen aktualisiert werden.
- Unit-Tests prüfen gültige eindeutige Zuordnungen sowie wiederverwendete Aussen- und Innenprofil-IDs.
- Direkte Ausführung des Schema-Moduls und Syntaxprüfung der Tests: gültige Zuordnung akzeptiert; doppelte Aussen-ID, doppelte Innen-ID und doppelte ID innerhalb eines Innenprofil-Paars jeweils abgewiesen. GitHub meldet für den Code-Commit keine CI-Statuschecks.


### 6.36 Projektdatei-I/O: Exportvalidierung und atomarer Importaufbau (20.11.2026)
- saveProject() prüft die erzeugte Projektstruktur vor dem Download mit demselben Schema wie der Import. Damit werden z. B. mehr als 100 Objekte, doppelte IDs oder ungültige gespeicherte Konturen nicht als vermeintlich gültige Projektdatei angeboten.
- Der Export prüft zusätzlich die tatsächliche JSON-Blobgrösse gegen das 25-MB-Limit des Imports. Ein Projekt, das SILMO anschliessend nicht wieder öffnen könnte, wird nicht heruntergeladen.
- Der Import lehnt fehlende, negative, nicht endliche oder zu grosse Dateigrössen ab. Fehler beim Erzeugen oder Lesen des FileReaders werden kontrolliert gemeldet und die Dateiauswahl zurückgesetzt.
- Der bisherige sichere Ablauf bleibt erhalten: Alle Geometrien/Meshes werden vor commitProject aufgebaut; bei einem späteren Fehler werden bereits erzeugte Ressourcen freigegeben und das aktuelle Projekt nicht ersetzt.
- Neue isolierte Node-Tests prüfen gültigen Save/Open-Roundtrip, Exportvalidierung, Importlimit, ungültige Transformationen und Ressourcenfreigabe beim Teilfehler.

### 6.37 STL-I/O: begrenzte Importkomplexität und geprüfter Export (20.11.2026)
- STL-Import bleibt auf 50 MB begrenzt und prüft nun zusätzlich maximal 500'000 Dreiecke sowie endliche Koordinaten im Bereich ±10'000'000 mm.
- Bestehende Fehlermeldung für nicht endliche oder unvollständige Dreiecksdaten bleibt erhalten; zu grosse Dreieckszahlen und ausserhalb des Bereichs liegende Koordinaten erhalten getrennte Meldungen.
- STL-Export prüft Positionen, Rotationen, Skalierungen, Positionsattribute, Dreiecksanzahl und Indizes, bevor der Exporter aufgerufen wird. Nullskalierungen werden abgewiesen.
- Die Umrechnung in Millimeter erfolgt weiterhin nur auf privaten Geometriekopien; das sichtbare Ursprungsmodell wird nicht verändert.
- Neue isolierte Node-Tests prüfen mm-Konvertierung, Zentrierung, Erhalt vorhandener Objekte, Nullflächen-/Übergrössen-Ablehnung, Exportkopien und ungültige Drehungen.
- Validierung auf Commit 60b0906de797f5fbdbb3ac452664773e274a1857: Code Checks Run 44777656360 erfolgreich (79/79 Unit-Tests). Browser-Regression Run 44777656275 und OCCT/WebWorker Run 44777656779 sind zum Zeitpunkt dieser Dokumentation noch nicht abgeschlossen.


### 6.38 STL-Topologie-Diagnose und reale Referenzdateien (20.11.2026)
- Der STL-Import prüft nach der grundlegenden Dreiecksvalidierung zusätzlich die Netz-Topologie. Die Prüfung verändert die importierte Geometrie nicht und blockiert den Import bei offenen oder problematischen Netzen nicht.
- Erkannt werden offene Randkanten, Kanten mit mehr als zwei angrenzenden Dreiecken, lokal widersprüchliche Dreiecksorientierung, doppelte Dreiecke, durch die Verschweisstoleranz zusammenfallende Dreiecke und negatives orientiertes Gesamtvolumen bei geschlossenen Netzen.
- Die Vertex-Verschweisstoleranz ist zentral in `src/tolerances.js` definiert und wird für den STL-Eingaberaum korrekt in Millimeter umgerechnet.
- Die Topologieanalyse ist auf 100'000 Dreiecke begrenzt. Grössere Dateien bleiben innerhalb der bisherigen Importgrenze von 500'000 Dreiecken importierbar; SILMO weist dann darauf hin, dass die Topologieprüfung übersprungen wurde.
- Reale ASCII-STL-Fixtures prüfen einen geschlossenen 10-mm-Würfel mit 12 Dreiecken und ein offenes Dreiecksnetz. Unit- und Browser-Tests decken ausserdem Duplikate, nicht-manifold Kanten sowie lokale und globale Orientierungsfehler ab.
- Diese Diagnose ist eine Vorprüfung der Netzstruktur. Automatische Reparatur, vollständige Slicer-Simulation und eine Druckbarkeitsgarantie sind nicht Bestandteil dieses Schritts.

### 6.26 Projektgeometrie-Roundtrip mit grösserem Mesh (20.11.2026)
- `tests/project-geometry.test.cjs` prüft jetzt zusätzlich den vollständigen Serialisierungs-/Wiederherstellungs-Roundtrip eines indizierten Meshes mit 24'999 Vertices und Positions-, Normalen- sowie UV-Attributen.
- Der Test vergleicht sämtliche Attribut- und Indexwerte exakt und prüft Bounding Box und Bounding Sphere nach dem Wiederaufbau.
- Ein separater Test sichert den Roundtrip nicht-indizierter Geometrie.
- Auf Commit `e5cc84c74f44d7fb0dc47c8c588cebfcbbcb2711` bestanden alle 88/88 Unit-Tests sowie Benchmark, Syntaxprüfung, Manifest-/HTML-ID-Prüfung und lokaler Pages-Paketcheck.
- Browser- und OCCT-WebWorker-Regressionen wurden für diesen reinen Test-/Dokumentationsschritt nicht erneut ausgelöst; ihr letzter erfolgreicher Stand bleibt Commit `1248213f9897f8ac9f473729bb5816b0f9b71740`.
- Dies ist ein gezielter Roundtrip-Belastungstest, noch keine Browser-RAM-/Frame-Zeit-Messung und kein Nachweis für beliebig grosse reale CAD-Projekte.

### 6.39 Vollständiger Projektdatei-Roundtrip mit grossem Mesh (20.11.2026)
- Der isolierte Geometrie-Roundtrip wird jetzt durch einen Test des vollständigen Projektdatei-I/O ergänzt.
- Eine Projektdatei mit 24'999 indizierten Vertices sowie Positions-, Normalen- und UV-Attributen wird als JSON aufgebaut und über den echten `project-io.js`-Importpfad wiederhergestellt.
- Der Test vergleicht alle Attribut- und Indexwerte exakt, prüft Objektkennung und Transformation, kontrolliert den erfolgreichen Projekt-Commit und gibt die erzeugten Ressourcen frei.
- Auf Commit `09fc0b953685dd9499f0fc0f2d8505eeb7303f5c` bestanden 89/89 Unit-Tests einschliesslich des neuen Datei-I/O-Tests. Code-Checks, Benchmark, Syntax-, Manifest-/HTML-ID- und lokaler Pages-Paketcheck waren erfolgreich.
- Browser- und OCCT-/WebWorker-Regressionen waren auf dem unmittelbar vorherigen Commit `bc70ea3fb1c35619de705da8926c3dcd7932458f` erfolgreich; der neue Commit ergänzt ausschliesslich einen Node-Test und Dokumentation, ohne App-Laufzeitcode zu ändern.
- Der Test deckt einen einzelnen grösseren Projektkörper ab. Er ersetzt weder Browser-RAM-/Frame-Zeit-Messungen noch einen Mehrkörper-Langzeittest.



### 6.40 Kantenbearbeitung: unabhängige Konturrichtung (20.11.2026)
- Die Skizzen-Kantenbearbeitung wird zusätzlich mit identischer Aussenkontur in beiden Umlaufrichtungen geprüft.
- Für Abrundung und Fase müssen die erzeugten Körper bei umgekehrter Konturrichtung dieselben Aussenabmessungen und dasselbe Volumen behalten.
- Der neue Regressionstest ergänzt die vorhandenen Prüfungen für gültige konkave Konturen, explizit geschlossene Ringe, Nullkanten, überlappende Nachbarkanten und Selbstüberschneidungen.
- Auf Commit `7f9e0e1b6f36303ff3c6ae65479782d4e6378876` bestanden alle 90/90 Unit-Tests. Code Checks Run 44784501133 waren erfolgreich; Syntax-, Manifest-/HTML-ID-, History-Benchmark- und lokaler Pages-Paketcheck ebenfalls erfolgreich.
- Browser-Interaktion und isolierter OCCT-/WebWorker-Prototyp waren unmittelbar zuvor auf dem unveränderten Laufzeitcode-Stand `da469d13f60f75583a1fcd6be9ff66ddc977ce6d` erfolgreich (Runs 44783707413 und 44783707750). Der neue Commit ändert nur Regressionstest und Dokumentation, nicht den Anwendungscode.


### 6.41 Loft-Kontur-Abtastung: Eingabegrenzen und Nullkanten (20.11.2026)
- `resampleClosedOutline` begrenzt die Kontur auf maximal 10'000 Punkte und die erzeugte Abtastung auf maximal 10'000 Samples, damit fehlerhafte Aufrufparameter keine unkontrolliert grossen Ergebnisarrays anfordern.
- Die Mindest-Umfangstoleranz muss endlich und positiv sein.
- Explizit wiederholte Schluss-Punkte werden normalisiert; Nullkanten innerhalb der Kontur werden kontrolliert abgewiesen.
- Die Segmentposition wird während der gleichmässigen Abtastung fortlaufend weitergeführt, statt für jeden Samplepunkt erneut bei Segment 0 zu beginnen.
- Regressionstests decken die normale Abtastung, explizit geschlossene Konturen, Nullkanten sowie ungültige und zu grosse Abtastparameter ab. Die CI-Ergebnisse für die neuen Commits sind noch abzuwarten.


### 6.42 Loft-Abtastung: gleichmässige Abstände und Startpunktunabhängigkeit (20.11.2026)
- Die Loft-Kontur-Abtastung wird nicht nur auf Anzahl und Endlichkeit der Samples geprüft, sondern auch auf den tatsächlichen Abstand entlang des geschlossenen Umfangs.
- Für ein Quadrat mit Umfang 8 und 32 Samples muss jeder aufeinanderfolgende Abstand einschliesslich des letzten zum ersten 0,25 Einheiten betragen.
- Umgekehrte Umlaufrichtung und zyklisch verschobener Startpunkt müssen dieselbe abgetastete Punktmenge ergeben.
- Der Test ergänzt die Normalisierung explizit geschlossener Konturen und die Ablehnung echter Nullkanten.
- Auf Commit `4299ae265b9d9bcccfcb90def0eb43a8fcb91102` bestanden alle 90/90 Unit-Tests; der Code-Check-Workflow hat den Unit-Test-Schritt erfolgreich abgeschlossen.

**Nachtrag zu Abschnitt 6.41:** Auf Commit `5b5ac584d9e8525827934feb31977d73b6271d08` waren Code Checks, Browser-Interaktion und isolierter OCCT-/WebWorker-Prototyp erfolgreich (Runs 44785871641, 44785871362 und 44785871326). Die vorherigen fehlgeschlagenen Code-Checks auf `5e08409` betrafen einen fehlerhaft konstruierten Nullkanten-Testfall; nach Korrektur auf `5b5ac58` bestanden 90/90 Tests.


### 6.43 Begrenzung der Loft-, Sweep- und Rohrkomplexität (20.11.2026)
- Loft-Profile begrenzen einzelne Ringe auf 512 Punkte, Innenringe auf 64 Paare und alle Profilpunkte zusammen auf 4096. Das schützt insbesondere die kombinatorische Profil-Ausrichtung vor übermässigem Rechenaufwand.
- Sweep begrenzt Aussenprofile und Pfade jeweils auf 256 Punkte. Die Optionen können die sicherheitsrelevanten Werte für Pfad, Schrittzahl und Abschrägung nicht mehr überschreiben.
- Pfadkurven begrenzen ihre Eingabe auf 1000 Punkte. Rohrgeometrien begrenzen die Segmentzahlen und zusätzlich die daraus resultierende Vertex-Obergrenze auf 250'000.
- Neue Unit-Tests prüfen die Grenzwerte knapp oberhalb der Limits und stellen sicher, dass ungültig grosse Eingaben kontrolliert abgewiesen werden.
- Die Änderungen sind auf dem Entwicklungszweig enthalten; CI-Ergebnisse für den aktuellen Test- und Dokumentationsstand sind noch abzuwarten.

- Nach dem ersten CI-Lauf wurde ausschliesslich die erwartete Fehlermeldung sprachlich kompatibel zur bestehenden Regression gehalten; die Grenzprüfungen selbst waren bereits erfolgreich. Der abschliessende CI-Lauf auf dem korrigierten Stand ist abzuwarten.


### 6.44 Boolesche Geometrie: Eingabe- und Ergebnisgrenzen (20.11.2026)
- CSG akzeptiert nur echte Three.js-Meshes mit BufferGeometry, gültigem Positionsattribut und vollständigen Dreiecken.
- Indizierte Meshes werden ohne vorherige Vollkonvertierung zu nicht indizierten Kopien geprüft; jeder Index muss innerhalb des Positionsattributs liegen.
- Pro Eingabekörper sind maximal 25'000 Dreiecke erlaubt. Die Grenze wird vor dem Aufbau der BSP-Struktur geprüft.
- Lokale und transformierte Weltkoordinaten müssen endlich sein und innerhalb ±10'000'000 Einheiten liegen; auch die Weltmatrix wird auf endliche Werte geprüft.
- Die triangulierte Ausgabe ist auf 250'000 Dreiecke begrenzt und wird vor dem Buffer-Aufbau auf endliche, begrenzte Koordinaten geprüft.
- Bei Transformationen mit negativer Determinante (Spiegelung) wird die Dreiecksreihenfolge korrigiert, damit die Aussenorientierung der CSG-Flächen erhalten bleibt. Ein Regressionstest prüft das Volumen und die Begrenzung einer Vereinigung mit gespiegeltem Werkzeugkörper.
- Neue Tests prüfen unvollständige Dreiecke, nicht endliche/zu grosse Koordinaten, ungültige Indizes und die Dreiecksobergrenze.
- Die Grenzwerte sind Schutzgrenzen für diese aktuelle BSP-Implementierung und keine Aussage, dass beliebig komplexe Produktionsmodelle performant verarbeitet werden.
- CI für den aktuellen Commit ist noch abzuwarten.


### 6.45 Boolesche Geometrie: gespiegelter Basiskörper (20.11.2026)
- Ergänzend zur Spiegelung des Werkzeugkörpers wird nun auch ein negativer Skalierungsdeterminant des Basiskörpers geprüft.
- Die Vereinigung eines gespiegelten Basiskörpers mit einem überlappenden Würfel muss dasselbe analytische Volumen von 12 Kubikeinheiten und dieselben erwarteten Grenzen liefern.
- Damit wird die Orientierungskorrektur für beide Eingabepositionen der CSG-Operation abgesichert; dies ist weiterhin ein gezielter BSP-Regressionstest und kein Nachweis für alle koplanaren, tangierenden oder selbstüberschneidenden Fälle.
- Der neue Unit-Test wurde auf dem Entwicklungszweig ergänzt. CI für Commit `878d81c1700f16e86a82f6ce565b98f41c179be5` ist noch abzuwarten.


**Nachtrag zu Abschnitt 6.44/6.45:** Die beiden Spiegelungs-Regressionen prüfen jetzt ausdrücklich ein positives orientiertes Volumen und nicht nur dessen Absolutwert. Damit würde eine vollständig umgedrehte Dreiecksorientierung nicht mehr fälschlich als bestanden gelten. Die aktualisierten Tests sind auf Commit `1f7be71bfd114faeab237b79e33fcf1ce7277b4b` enthalten; CI steht noch aus.


### 6.46 Boolesche Geometrie: leere Differenz und gespiegeltes Werkzeug (20.11.2026)
- Ergänzt wurden zwei gezielte Regressionen: Die Differenz zweier identischer Körper muss als kontrolliert leeres Ergebnis abgelehnt werden; beide Eingabegeometrien müssen dabei unverändert bleiben.
- Eine Differenz mit negativ skalierter/gespiegelter Werkzeuggeometrie muss das analytische Restvolumen 4 und positive Aussenorientierung liefern.
- Diese Fälle erweitern die Prüfung von Fehlerbehandlung und Spiegelung. Sie ersetzen keine systematische Prüfung aller koplanaren, tangierenden und fast deckungsgleichen Flächen.
- Tests hinzugefügt auf Commit `b7358420ec5778d3dda66f578c49a0fda9446c45`; CI-Ergebnis für diesen Commit steht noch aus.


### 6.47 Boolesche Geometrie: Kanten-, Punkt- und tangentiale Flächenberührung (20.11.2026)
- Ergänzt wurden Regressionstests für zwei getrennte Würfel mit reiner Kantenberührung und reiner Punktberührung bei Vereinigung.
- Zusätzlich wird geprüft, dass eine Differenz bei bloss gemeinsamer Fläche das Volumen des Basiskörpers nicht verändert.
- Die Tests kontrollieren signiertes Volumen und bei der tangentialen Differenz zusätzlich die Begrenzungsbox.
- Diese Tests untersuchen degenerierte Kontaktfälle des BSP-CSG-Verfahrens. Ein bestandener Volumentest allein beweist noch keine vollständige Wasserdichtigkeit oder fehlerfreie STL-Manifold-Topologie.
- Teständerung enthalten in Commit `6f50e30124b5171485198e2e4a003c29129a4ac0`; CI steht aus.


### 6.48 Boolesche Geometrie: kleine Spalte und Überlappungen nahe der Toleranz (20.11.2026)
- Ergänzt wurde ein Union-Test für zwei Würfel mit einem Spalt von 0.00005 Welteinheiten.
- Ergänzt wurde ein Subtract-Test für eine Überlappung von 0.00005 Welteinheiten; das erwartete Restvolumen wird aus der tatsächlichen Überlappungsfläche berechnet.
- Beide Abstände liegen oberhalb der aktuellen CSG-Geometrietoleranz von 0.00001 Welteinheiten und prüfen, ob kleine, aber unterscheidbare Abstände nicht versehentlich als koplanar behandelt werden.
- Die Ergebnisse der automatischen CI-Prüfungen sind zum Zeitpunkt dieses Eintrags noch ausstehend.
- Teständerung enthalten in Commit `0bdd912c6795aff7ae1e74534ba87099a2be8fad`.


### 6.49 Boolesche Geometrie: dünne Wände und schmale Aussparungen (20.11.2026)
- Neuer Regressionstest: Ein fast gleich grosser Innenwürfel wird aus einem Aussenwürfel entfernt. Die verbleibende dünne Wand wird über das erwartete Restvolumen und die äusseren Grenzen geprüft.
- Neuer Regressionstest: Ein schmaler Schlitz mit 0.0005 Welteinheiten Breite wird aus einem Würfel entfernt; das Restvolumen muss stimmen.
- Diese Tests prüfen gezielt, ob kleine, aber deutlich über der CSG-Toleranz liegende Wand- und Schnittgeometrie erhalten bleibt.
- Ein korrektes Volumen allein ist kein Nachweis für vollständige STL-Manifold-Qualität; spätere Prüfungen müssen Kanteninzidenz, offene Kanten und Normalenorientierung ergänzen.
- Teständerung enthalten in Commit `a04a3beff8d2d523aa30b1a387a9a630ed092672`; CI-Prüfungen ausstehend.


### 6.50 CSG-Ausgabe: Topologieprüfung vor STL-Einsatz (20.11.2026)
- Die vorhandene STL-Topologieanalyse wird jetzt direkt auf Ergebnisse der CSG-Vereinigung und CSG-Differenz angewendet.
- Geprüft werden geschlossene Kanteninzidenz, nicht-manifold Kanten, konsistente Kantenrichtung, doppelte Dreiecke, kollabierte Dreiecke und umgekehrte Gesamtorientierung.
- Die Testgeometrie wird für die Analyse entsprechend der bestehenden SILMO-Einheitenkonvention von 10 mm pro Welteinheit in Millimeter skaliert.
- Ziel ist nicht nur ein korrektes Volumen, sondern auch ein geschlossenes, konsistent orientiertes Dreiecksnetz als Voraussetzung für verlässlichen STL-Export.
- Neue Tests enthalten in Commit `57ccbcbb5fbf15c067aa6fe8d79b3d2c6f1d354d`; CI-Prüfungen ausstehend.


### 6.51 CSG-Reparatur: T-Verbindungen vor der Triangulierung auflösen (20.11.2026)
- Die neuen STL-Topologietests fanden bei überlappender Würfel-Vereinigung und -Differenz jeweils 12 offene Kanten, obwohl die Volumenwerte korrekt waren.
- Ursache: BSP-Schnittpolygone konnten T-Verbindungen erzeugen, bei denen eine lange Polygonkante nicht dieselben Zwischenpunkte wie die benachbarte, unterteilte Kante enthielt.
- Die CSG-Ausgabe gruppiert jetzt kollineare Polygonkanten und fügt gemeinsame Zwischenpunkte vor der Triangulierung in die Polygonränder ein. Die Polygone werden anschliessend über einen Mittelpunkt trianguliert.
- Nach dieser Änderung bestehen alle 110 Unit-Tests einschliesslich der beiden geschlossenen CSG-Topologieprüfungen.
- Code-Check-Commit `dcd6863410dbb1a1cac3af50f85be8a7db35709a`: 110/110 Tests erfolgreich. Browser- und OCCT-Workflows sind separat noch zu bestätigen.


### 6.52 Topologie-Grenzfälle: dünne Wand und schmaler Schlitz (20.11.2026)
- Ergänzend zu den allgemeinen CSG-Manifold-Tests werden nun auch eine dünne Hohlwand (Innenmass 1.9995 bei Aussenmass 2) und ein schmaler durchgehender Schlitz (Breite 0.0005) mit der vorhandenen STL-Topologieanalyse geprüft.
- Für beide Ergebnisse wird ein geschlossenes Edge-Manifold-Netz und keine umgekehrte Gesamtorientierung verlangt.
- Code-Checks auf Commit `960cf8600e59f5265a301facac83653df1309f8f`: 112/112 Unit-Tests erfolgreich.
- Isolierter OCCT-WebWorker-Prototyp auf demselben Commit: erfolgreich.
- Browser-Interaktionstest auf diesem Commit: beim letzten Statusabruf noch in Bearbeitung; daher nicht als bestanden dokumentiert.


### 6.53 STL-Diagnose: ungültige und flächenlose Dreiecke (20.11.2026)
- Die öffentliche STL-Topologieanalyse weist jetzt nicht-endliche XYZ-Koordinaten vor dem Weld-/Kantenaufbau mit einer klaren Fehlermeldung zurück.
- Zusätzlich wird die geometrische Fläche jedes Dreiecks gegen die quadratische Verschweisstoleranz geprüft. Dadurch werden auch kollineare Dreiecke mit drei verschiedenen Eckpunkten als degeneriert erkannt.
- Degenerierte Dreiecke fliessen ausdrücklich in `isClosedEdgeManifold` ein und können nicht mehr als geschlossenes, gültiges Netz gemeldet werden.
- Neue Regressionstests decken NaN-Koordinaten und kollineare Dreiecke ab.
- Code-Checks auf Commit `27202985272e3e9947c369c903208cfa0f5fba05`: 114/114 Unit-Tests erfolgreich.
- Browser-Interaktion und OCCT-WebWorker liefen für diesen Commit beim Dokumentationszeitpunkt noch; Ergebnisse werden separat bestätigt.


### 6.54 STL-Topologie: Vertex-Link-Prüfung für getrennte und punktberührende Körper (20.11.2026)
- Die STL-Diagnose prüft zusätzlich zu Kanteninzidenz und Orientierung den Link jedes verschweissten Eckpunkts.
- Bei einem geschlossenen triangulierten 2-Manifold muss der Vertex-Link genau einen zusammenhängenden Zyklus bilden. Mehrere getrennte Zyklen am selben Eckpunkt weisen z.B. zwei Körper nach, die sich nur an einem Punkt berühren.
- `nonManifoldVertexCount` wird im Diagnoseergebnis ausgegeben und verhindert, dass solche Netze als geschlossenes Edge-/Vertex-Manifold eingestuft werden.
- Die Importwarnung nennt nicht-manifold Eckpunkte und flächenlose Dreiecke nun ausdrücklich.
- Neue Regressionstests: punktberührende Würfel werden abgewiesen; zwei räumlich getrennte geschlossene Würfel werden weiterhin akzeptiert.
- Code-Checks auf Commit `68d0b9bb6543b40770f988c6eaa7c0680f9a51ee`: 116/116 Unit-Tests erfolgreich.
- Browser-Interaktion und OCCT-WebWorker für diesen Commit sind beim Dokumentationszeitpunkt noch in Bearbeitung; nicht als bestanden dokumentiert.


### 6.55 STL-Topologie: Körper mit gemeinsamer Kante oder Fläche (20.11.2026)
- Die Regressionstests erweitern die Kontaktfälle um zwei Würfel, die eine Kante bzw. eine ganze Fläche teilen.
- Der gemeinsame Kantenkontakt muss über nicht-manifold Kanten auffallen; der Flächenkontakt muss als nicht-manifold oder doppelte Dreiecksfläche erkannt werden.
- Beide Fälle dürfen nicht als geschlossenes Edge-/Vertex-Manifold gemeldet werden.
- Code-Checks auf Commit `fc518c038ec8e3230e92b95b908d13b1374f30b2`: 118/118 Unit-Tests erfolgreich, darunter beide neuen Kontaktfälle.
- Browser-Interaktion und OCCT-WebWorker für diesen Commit sind noch in Bearbeitung; diese Ergebnisse werden separat bestätigt.

### 6.56 STL-Volumenberechnung bei grossen Koordinaten stabilisiert (20.11.2026)
- Die signierte Volumenberechnung in `analyzeSTLGeometry` verwendet jetzt einen lokalen Bezugspunkt aus dem ersten Mesh-Vertex. Vor der Berechnung des orientierten Volumens werden die Dreieckspunkte relativ zu diesem Ursprung ausgewertet.
- Damit wird numerische Auslöschung bei kleinen Modellen verhindert, deren absolute Koordinaten weit vom Weltursprung entfernt liegen.
- Der Regressionstest verschiebt einen geschlossenen Würfel mit 10 mm Kantenlänge in die Nähe von `[9000000, -9000000, 9000000]` und erwartet weiterhin ein geschlossenes Manifold sowie ein positives Volumen von ungefähr 1000 mm³.
- Derselbe Test kehrt anschliessend die Dreiecksreihenfolge um und erwartet ungefähr -1000 mm³ sowie `invertedWinding === true`.
- Auf Commit `9f9d770b8c01cb910db22037e260fa09f202269f` bestanden 119/119 Unit-Tests. Code-Checks, Browser-Interaktion und isolierter OCCT-/WebWorker-Prototyp waren erfolgreich.
- Der Eintrag dokumentiert einen gezielten numerischen Grenzfall; er ist kein allgemeiner Nachweis für Druckbarkeit oder alle möglichen Mesh-Koordinatenbereiche.

### 6.57 STL-Topologie: widersprüchliche Orientierung räumlich getrennter Körper (20.11.2026)
- Die STL-Diagnose erkennt zusätzlich getrennte, räumlich separierte Körperkomponenten, deren Dreiecksorientierungen widersprüchlich sind.
- Die Prüfung vergleicht die Begrenzungsboxen der Komponenten. Verschachtelte oder sich überlappende Begrenzungsboxen werden nicht allein wegen entgegengesetzter Vorzeichen als Konflikt gewertet; dadurch bleiben typische umgekehrt orientierte innere Hüllflächen geschlossener Hohlkörper zulässig.
- Ein Regressionstest verwendet zwei gleich grosse, getrennte Würfel mit entgegengesetzter Orientierung. Obwohl sich ihre signierten Volumina im Gesamtwert aufheben, muss die Diagnose den Orientierungskonflikt erkennen.
- Die Diagnose ist bewusst konservativ: Überlappende Begrenzungsboxen können auch bei tatsächlich getrennten oder sich schneidenden Geometrien vorkommen. Daraus folgt keine vollständige geometrische Kollisionsprüfung.
- Auf Commit `d95c9679b03eaa1b76e16acdba744e6a6923c735` bestanden die Code-Checks (120/120 Unit-Tests), der isolierte OCCT-WebWorker-Prototyp und der vollständige Browser-Interaktionstest.
- Der bestandene Browser-Test umfasst reale CAD-Interaktionen sowie Projekt-Wiederöffnung und anschliessenden STL-Export. Diese Prüfungen sind wichtige Regressionstests, aber kein allgemeiner Beweis für Fehlerfreiheit oder Druckbarkeit jedes Modells.


### 6.58 History: verschachtelte Undo-/Redo-Aufrufe verhindern (20.11.2026)
- Während restoreState ausgeführt wird, sind Undo, Redo und record jetzt gegen erneute, verschachtelte Verlaufsaktionen geschützt. apply prüft dafür zusätzlich den bestehenden applying-Status.
- Der Regressionstest löst während eines Undo- und eines Redo-Wiederherstellungsvorgangs erneut Undo, Redo und record aus. Alle drei verschachtelten Aktionen müssen kontrolliert false zurückgeben; die äusseren Undo-/Redo-Schritte müssen ihre erwarteten Zustände und Stack-Zähler behalten.
- Auf Commit 21d8d1995dd9051e39b755bdd088c912b785336c bestanden 122/122 Unit-Tests.
- Der isolierte OCCT-WebWorker-Prototyp auf demselben Commit wurde erfolgreich abgeschlossen. Der vollständige Browser-Interaktionstest lief zum Zeitpunkt dieses Eintrags noch und wird erst nach erfolgreichem Abschluss als bestanden gewertet.
- Die Änderung verhindert Reentrancy während der Wiederherstellung. Sie ist keine allgemeine Garantie gegen Fehler in beliebigen benutzerdefinierten Capture-, Restore- oder Dispose-Callbacks.


### 6.59 History: Clear/Dispose während Wiederherstellung schützen (20.11.2026)
- `clear()` und `dispose()` brechen während einer laufenden `restoreState`-Anwendung kontrolliert ab. Dadurch können Callback-seitige verschachtelte Aufrufe die gerade verwendeten Undo-/Redo-Snapshots nicht vorzeitig freigeben oder die History mitten in `apply()` als disposed markieren.
- Der Regressionstest ruft beide Methoden während Undo und Redo aus `restoreState` heraus auf und kontrolliert Zwischenzustand, Stack-Zähler sowie anschliessende Nutzbarkeit von Undo/Redo. Die reguläre `dispose()`-Funktion wird nach Abschluss weiterhin ausgeführt.
- Auf Commit `27e338be7706f4a1a244661acc2f6aeb04b66a05` bestanden 123/123 Unit-Tests; Code-Checks, Browser-Interaktion und isolierter OCCT-WebWorker-Prototyp waren erfolgreich.
- Der Schutz gilt für synchrone, während `restoreState` ausgeführte Reentrancy. Asynchrone Callbacks oder Fehler innerhalb benutzerdefinierter `disposeState`-Funktionen sind damit nicht allgemein abgesichert.


### 6.60 History: fehlgeschlagene Snapshot-Aufnahme erhält Verlauf (20.11.2026)
- Wenn `captureState()` beim Aufzeichnen, Undo oder Redo einen Fehler auslöst, bleiben die betroffenen Undo-/Redo-Stacks unverändert. Ein fehlgeschlagenes Undo/Redo verschiebt den Ziel-Snapshot somit nicht und verliert auch den aktuell erreichbaren Zustand nicht.
- Der Regressionstest erzwingt Aufnahmefehler in `record()`, `undo()` und `redo()`, kontrolliert jeweils die Stack-Zähler und prüft anschliessend, dass Undo und Redo nach Behebung des Fehlers wieder funktionieren.
- Auf Commit `d3c6ddd96b768557d9c7b2994e5fbea0bd6435dc` bestanden alle 124/124 Unit-Tests. Code-Checks (Run 44796023996), Browser-Interaktion (Run 44796035446) und isolierter OCCT-/WebWorker-Test (Run 44796035828) waren erfolgreich.
- Der Test belegt die Stack-Konsistenz bei synchronen Fehlern der Snapshot-Aufnahme. Er ist keine allgemeine Garantie gegen Fehler in beliebigen benutzerdefinierten Restore- oder Dispose-Callbacks.

### 6.61 History-Baseline für grössere Modelle und Skizzen-Toleranzsplit (20.11.2026)
- Die History-Benchmark-Suite enthält einen grösseren synthetischen Fall mit 100 Objekten und je 9'999 Vertices. Gemessen werden fünf Snapshot-Aufnahmen, Undo/Redo sowie Speicher vor den Snapshots, nach den Snapshots und nach Dispose/GC.
- Auf GitHub Actions (Node v22.23.4, Three.js r128) ergab dieser Fall einen Snapshot-Median von 12,243 ms, 26,015 ms für Undo und 14,658 ms für Redo. ArrayBuffers stiegen von rund 24,0 MB auf 144,0 MB und fielen nach Dispose/GC auf rund 20,8 KB zurück.
- Die Messung ist synthetisch und läuft in Node, nicht im Browser. Sie verwendet fünf Snapshots und bildet weder die maximale App-History von 40 Zuständen noch sämtliche realen CAD-Geometrien ab. Die Werte sind eine Vergleichs-Baseline, keine Leistungszusage oder Pass/Fail-Grenze. Sie zeigen aber, dass grosse Snapshot-Verläufe erheblichen temporären Speicher benötigen können.
- In src/sketch-geometry.js wurden die zuvor fest eingebauten 1e-12-Vergleiche der Kontur-Schnittpunktprüfung in zwei zentrale Konstanten getrennt: SKETCH_GEOMETRY_BOUNDS_EPSILON_WORLD_UNITS für Koordinaten-/Segmentgrenzen und SKETCH_GEOMETRY_ORIENTATION_EPSILON_WORLD_UNITS2 für Orientierungs-/Flächenvergleiche. Die bisherigen Zahlenwerte bleiben unverändert.
- tests/tolerances.test.cjs prüft beide Werte; der Laufzeit-Verwendungs-Audit stellt sicher, dass beide Konstanten tatsächlich verwendet werden.
- Auf Commit 0c9e495c3df36a37482656bb70d38fc1f99eb37f bestanden die Code-Checks einschliesslich 124/124 Unit-Tests und der History-Benchmark (Run 44797636726), der isolierte OCCT-WebWorker-Prototyp (Run 44797641336) sowie der vollständige Browser-Interaktionstest (Run 44797641270).
- Konsequenz: Die Snapshot-History bleibt vorerst bestehen. Vor einer Architekturänderung werden reale Browser-/CAD-Messungen und ein fairer Vergleich mit einer befehlsbasierten History benötigt.

### 6.62 Projektimport: Skizzenring-Toleranzen nach Dimension getrennt (20.11.2026)
- Die Projektformat-Validierung hatte denselben festen Wert 1e-12 sowohl für Koordinaten-/Segmentgrenzen als auch für Kreuzprodukt- und Flächenvergleiche verwendet. Diese dimensionsverschiedenen Vergleiche sind nun getrennt.
- `src/tolerances.js` definiert `PROJECT_SKETCH_RING_BOUNDS_EPSILON_MM`, `PROJECT_SKETCH_RING_ORIENTATION_EPSILON_MM2` und `PROJECT_SKETCH_RING_MIN_EDGE_MM`. Alle drei behalten den bisherigen Zahlenwert 1e-12.
- `src/project-schema.js` verwendet die zentrale Toleranz-API für Segmentbegrenzungen, Orientierungsprüfungen, Ringflächen und minimale Kantenlängen. Die bestehende Projektformat-Version 3 und die gespeicherten Daten werden dadurch nicht geändert.
- Die Unit-Tests prüfen die drei Werte und beziehen `project-schema.js` in den Laufzeit-Verwendungs-Audit ein. Die Tests für gültige und ungültige gespeicherte Konturen bleiben bestehen.
- Auf Commit 15a3523a0cacb42f8715b4080e039c455eaf340b bestanden 124/124 Unit-Tests, die History-Benchmark, Inline-JavaScript-Syntaxprüfung, Manifest-/HTML-ID-Prüfung und der lokale Pages-Pakettest. Browser-Interaktion und OCCT-WebWorker waren beim Dokumentationszeitpunkt noch in Bearbeitung.
- Dies ist ein gezielter weiterer Schritt des Toleranz-Audits; das vollständige Inventar und die fachliche Prüfung aller verbleibenden Schwellen sind weiterhin offen.


### 6.63 Image-Studio: Bildkontur-Vereinfachung benannt (21.11.2026)
- Die Konturvereinfachung des Image-Studios verwendet jetzt `IMAGE_CONTOUR_SIMPLIFICATION_TOLERANCE_PIXELS = 1.1` statt eines nicht benannten Zahlenliterals.
- Die Schwelle wirkt ausschliesslich im Bildpixelraum vor der Abbildung auf reale CAD-Millimeter. Sie darf nicht als Modelliertoleranz oder Kernel-Epsilon interpretiert werden.
- Der bisherige Wert und das Konturverhalten bleiben unverändert; die zentrale Toleranzwertprüfung und der Laufzeit-Verwendungs-Audit sichern die Zuordnung.
- Die Änderung ist ein gezielter weiterer Schritt des offenen Toleranz-Audits. Andere Pixel-, Farb- und Bildklassifikationsparameter werden erst nach separater fachlicher Einordnung migriert.
- Code-Checks, Browser-Interaktion und isolierter OCCT-WebWorker wurden auf Commit 13f354fd9a27a3d3f631f50814d95c33d34be361 erfolgreich abgeschlossen; Details und History-Browsermessung stehen in Abschnitt 6.64.


### 6.64 Browser-History-Baseline für 40 Snapshots (21.11.2026)
- Der Browser-Regressionstest misst jetzt zusätzlich das echte src/history.js-Modul mit Three.js-r128-BufferGeometry-Objekten in Chromium. Der synthetische CAD-ähnliche Lastfall verwendet 50 Meshes mit je 999 Vertices, 45 record()-Aufrufe und das produktive History-Limit von 40 Snapshots.
- Auf GitHub Actions (Commit 13f354fd9a27a3d3f631f50814d95c33d34be361) betrug der Median der Snapshot-Aufnahme 1,4 ms; Undo benötigte 2,6 ms und Redo 2,3 ms. Nach 45 Aufzeichnungen waren genau 40 Snapshots vorhanden. Undo und Redo funktionierten; nach dispose() waren beide Stacks leer und disposed === true.
- Die initialen Geometrie-ArrayBuffer betrugen 1'398'600 Byte. Der daraus berechnete ArrayBuffer-Payload für 40 Snapshot-Kopien beträgt rund 55,9 MB. Das ist eine rechnerische Nutzdatenabschätzung aus den tatsächlich gemessenen Attribut-/Index-Arraygrössen, keine Messung des gesamten Browser-RAM.
- Chromium meldete über performance.memory.usedJSHeapSize vor und nach den Snapshots jeweils gerundet 10'000'000 Byte. Diese grobe Messung löst die ArrayBuffer-Speicherfrage nicht; sie wird daher nicht als Beleg für unveränderten Speicherverbrauch oder erfolgreiche Speicherfreigabe verwendet.
- Parallel dazu ergab die Node-Baseline auf demselben Commit für 100 Objekte mit je 9'999 Vertices und fünf Snapshots: 13,422 ms Snapshot-Median, 28,277 ms Undo, 19,022 ms Redo; ArrayBuffers stiegen von 24'018'423 auf 144'006'423 Byte und fielen nach dispose() und GC auf 20'823 Byte.
- Code-Checks auf Commit 13f354fd9a27a3d3f631f50814d95c33d34be361: 124/124 Unit-Tests, History-Benchmark, Syntax-, Manifest-/HTML-ID- und lokaler Pages-Paketcheck erfolgreich. Browser-Interaktion (Run 44875238587) und isolierter OCCT-WebWorker (Run 44875238589) ebenfalls erfolgreich.
- Beide Benchmarks sind synthetische Vergleichswerte. Sie beweisen weder die Leistung sämtlicher realer CAD-Szenen noch die Reaktionszeit des vollständigen UI-Workflows. Die nächste Messstufe bleibt ein reproduzierbarer Browser-Test mit tatsächlichen App-Bearbeitungsaktionen, realistischen Modellgrössen und einer belastbareren Speicher-/Frame-Zeit-Erfassung.


### 6.65 Image-Studio: absolute Mindest-Pixelzahl benannt (21.11.2026)
- Die Mindestgrösse einer erkannten Bildkomponente verwendet jetzt `IMAGE_MIN_COMPONENT_PIXEL_COUNT = 4` zusätzlich zum bereits zentralisierten relativen Flächenanteil `IMAGE_MIN_COMPONENT_AREA_FRACTION`.
- Die bisherige Mindest-Pixelzahl und das Verhalten bleiben unverändert. Die beiden Werte beschreiben unterschiedliche Regeln im Bildpixelraum und werden nicht mit Modell-/Kernel-Toleranzen vermischt.
- Der Test sichert den Zahlenwert und den Laufzeit-Verwendungs-Audit; die Farb-/Kontrastparameter der Segmentierungsheuristik bleiben separat und werden nur nach eigener fachlicher Prüfung klassifiziert.
- Code-, Browser- und OCCT-CI für diesen Schritt stehen noch aus.


### 6.66 Herz-Umriss-Erkennung: Geometrische Grössengrenzen benannt (21.11.2026)
- Die Mindestbreite/-höhe und der Schutz des Höhen-Divisors bei der Herz-Umriss-Erkennung sind als getrennte, dimensionsbezogene Konstanten zentralisiert.
- Die bisherigen Werte `1e-5` und `1e-9` bleiben unverändert. Die Seitenverhältnis-Grenzen sind Formklassifikationsparameter und bleiben bewusst ausserhalb der CAD-Längentoleranzen.
- Der Test sichert die Werte und den Laufzeit-Verwendungs-Audit. Die gebündelte CI-Prüfung auf dem Branch-Stand ist in Abschnitt 6.75 dokumentiert.


### 6.67 Loft-Kontur-Resampling: Mindestumfang zentral benannt (21.11.2026)
- Der Standard-Mindestumfang für das Resampling geschlossener Loft-Konturen ist als `LOFT_PROFILE_RESAMPLE_MIN_PERIMETER_WORLD_UNITS = 1e-8` benannt.
- Der Wert bleibt getrennt vom bestehenden Profil-Mindestumfang `PROFILE_MIN_PERIMETER_WORLD_UNITS = 1e-6`, weil beide unterschiedliche Verarbeitungsschritte absichern.
- Der Standardwert wurde nicht verändert; Grenzfalltests sichern Ablehnung, Annahme mit explizitem Override und den Konstantenwert. Die gebündelte CI-Prüfung auf dem Branch-Stand ist in Abschnitt 6.75 dokumentiert.


### 6.68 Pfadlängen- und Extrusions-Skalierungsgrenzen benannt (21.11.2026)
- Die Mindestlänge des bestehenden CAD-Pfads vor einer Längenänderung (`0.001 mm`) und der dimensionslose Divisor-Schutz bei der Wiederherstellung der Skizzen-Extrusionshöhe (`1e-12`) sind zentral benannt.
- Die Zahlenwerte bleiben unverändert. Die Spezifikation unterscheidet ausdrücklich Millimeter von einem dimensionslosen Skalierungsfaktor.
- Die gebündelte CI-Prüfung auf dem Branch-Stand ist in Abschnitt 6.75 dokumentiert.


### 6.69 Hohlrahmen-Mindestabmessung zentral benannt (21.11.2026)
- Die Standard-Mindestabmessung des erzeugten Hohlrahmens (`1e-9` Welteinheiten) ist zentral definiert und wird vom Geometrie-API-Standardparameter verwendet.
- Ein expliziter Aufrufer-Override bleibt möglich; die Hauptanwendung übergibt weiterhin ihre strengere CSG-Grenze. Bestehendes Verhalten bleibt erhalten.
- Neue Grenzfalltests prüfen Standardgrenze und Override. Die gebündelte CI-Prüfung auf dem Branch-Stand ist in Abschnitt 6.75 dokumentiert.

### 6.70 Parametrische Skizzenprofile: Mindest-Eckenradius benannt (21.11.2026)
- Die bisherige Untergrenze `0.01` für den Eckenradius abgerundeter Rechteckprofile ist als `SKETCH_PROFILE_MIN_CORNER_RADIUS_WORLD_UNITS` zentral benannt.
- Der Wert und das bisherige Verhalten bleiben unverändert. Ein gezielter Geometrietest prüft den tatsächlich erzeugten Profilstartpunkt bei einem Radius-Eingabewert von `0`.
- Die zentrale Toleranzwertprüfung und der Laufzeit-Verwendungs-Audit sichern die Konstante. Die gebündelte CI-Prüfung auf dem Branch-Stand ist in Abschnitt 6.75 dokumentiert.

### 6.71 Skizzen-Polylinien: Vereinfachungsabstand benannt (21.11.2026)
- Der bisherige Standardabstand von `0.5 mm` bei der Vereinfachung gezeichneter Skizzen-Polylinien ist als `SKETCH_POLYLINE_SIMPLIFICATION_TOLERANCE_MM` zentral benannt.
- Funktionsstandard, Produktionsaufruf und Browser-Testzugang teilen die Konstante. Die vorhandene Mindestschwelle von `0.01 mm` bleibt separat; Werte und Geometrieverhalten ändern sich nicht.
- Der zentrale Zahlenwerttest und Laufzeit-Verwendungs-Audit wurden erweitert. Die gebündelte CI-Prüfung auf dem Branch-Stand ist in Abschnitt 6.75 dokumentiert.

### 6.72 Gezeichnete Skizzen: Mindestabmessung benannt (21.11.2026)
- Die bisherige Mindestbreite und -tiefe von `0.01` Welteinheiten für per Ziehen erzeugte Rechteck-/Kreis-Skizzenprofile ist als `SKETCH_DRAW_MIN_DIMENSION_WORLD_UNITS` zentral benannt.
- Der Wert und das bisherige Verhalten bleiben gleich. Die Spezifikation ordnet ihn als Geometrie-Mindestgrösse im Weltkoordinatenraum ein, nicht als allgemeines Kernel-Epsilon.
- Der zentrale Toleranztest und Laufzeit-Verwendungs-Audit wurden erweitert. Die gebündelte CI-Prüfung auf dem Branch-Stand ist in Abschnitt 6.75 dokumentiert.

### 6.73 Druckvorprüfung: minimale Modellabmessung benannt (21.11.2026)
- Die bisherige diagnostische Untergrenze `0.01 mm` für Modell-Bounding-Box-Abmessungen ist als `PRINT_MIN_MODEL_DIMENSION_MM` zentral benannt.
- Die Warnlogik, der Schwellenwert und der Meldungstext bleiben unverändert. Die Konstante ist ausdrücklich von STL-Weld- und CAD-Kernel-Toleranzen getrennt.
- Der zentrale Zahlenwerttest und Laufzeit-Verwendungs-Audit wurden erweitert. Die gebündelte CI-Prüfung auf dem Branch-Stand ist in Abschnitt 6.75 dokumentiert.

### 6.74 Manuell gezeichnete Bildkonturen: Mindestfläche benannt (21.11.2026)
- Die bisherige Mindestfläche von `0.5 Pixel²` für das Speichern manuell gezeichneter Image-Studio-Konturen ist als `IMAGE_MIN_DRAWN_CONTOUR_AREA_PIXELS2` zentral benannt.
- Die Bildpixel-Fläche bleibt ausdrücklich von der CAD-Mindestfläche in mm² getrennt; Verhalten und Grenzwert ändern sich nicht.
- Der zentrale Zahlenwerttest und Laufzeit-Verwendungs-Audit wurden erweitert. Die gebündelte CI-Prüfung auf dem Branch-Stand ist in Abschnitt 6.75 dokumentiert.


### 6.75 Gebündelte Validierung des Toleranz-Audits und Browser-/OCCT-Regressionen (21.11.2026)
- Der gemeinsame Branch-Stand `4aeae6e8c23552d347511120abaf70c48619e444` enthält die in den Abschnitten 6.65–6.74 dokumentierten Benennungen. Die Werte und das bisherige Laufzeitverhalten wurden nicht verändert.
- Code-Checks (Run 44877541315) erfolgreich: 127/127 Unit-Tests bestanden, 0 fehlgeschlagen. Zusätzlich waren JavaScript-Syntax, Manifest-/HTML-ID-Prüfungen und die lokale Pages-Paketvalidierung erfolgreich.
- Browser-Interaktion (Run 44877541291) erfolgreich. Der Test deckt unter anderem 3D-Start, CAD-Zeichenarbeitsplatz, Skizzenbearbeitung, Konturpunkt-Editor, Kantenbearbeitung, Loft, Sweep, geometrische Beziehungen, Pfadlänge/Objektabstand, CSG-Verbindung/Trennung, Undo, Mehrfachauswahl, Ausrichten, Gruppieren, Spiegeln und Drehring ab.
- Der Browser-History-Lastfall behielt 40 von 45 angeforderten Snapshots. Aufzeichnung: Median 0,9 ms; Undo 1,6 ms; Redo 1,3 ms. Der berechnete ArrayBuffer-Payload für 40 Snapshot-Kopien betrug rund 55,9 MB. Dies ist eine Nutzdatenabschätzung, keine Messung des gesamten Browser-RAM.
- Der Browser-Roundtrip für 24'999 3D-Punkte war exakt: Positionen, Normalen, UV-Koordinaten und Indizes stimmten nach Wiederherstellung überein. Gemessen wurden 6,4 ms für Serialisierung und 10,8 ms für Wiederherstellung. Diese Zeiten sind ein einzelner synthetischer CI-Lauf, keine Leistungszusage für beliebige Projekte.
- Isolierter OCCT-Prototyp (Run 44877541285) erfolgreich: analytischer Geometrietest und Browser-WebWorker-Smoke-Test bestanden. Der dokumentierte Stressfall erzeugte 12 Bohrungen; das Volumen lag bei 5811.504440784614 gegenüber erwarteten 5811.504440784613, mit einem zusammenhängenden Solid und 1308 Dreiecken.
- Diese Ergebnisse bestätigen die geprüften Regressionen und den isolierten Worker-Prototyp. Sie bedeuten noch nicht, dass OCCT bereits in den produktiven SILMO-Modellierkern integriert ist oder dass alle CAD-Funktionen OCCT verwenden.
- PR #70 bleibt offen und Draft. Es erfolgten kein Merge, kein Deployment, keine Veröffentlichung und keine kostenpflichtigen Schritte.

### 6.76 Projektimport: Objekttransformationen vor Geometrieaufbau prüfen (21.11.2026)
- Die v3-Projektvalidierung prüft vorhandene Positions-, Drehungs- und Skalierungsarrays nun bereits vor dem Aufbau der Three.js-Geometrien. Damit werden nicht endliche, zu grosse, zu kurze oder nullskalierte Transformationsdaten früher abgewiesen.
- Die Grenzwerte entsprechen exakt dem bisherigen Laufzeit-Loader: Position und Drehung maximal 10'000 interne Einheiten; Skalierung maximal 1'000 und jede Skalierungskomponente ungleich null. Fehlende/nicht-arrayförmige Alt-Metadaten behalten die bisherigen Defaults.
- Das optionale `normalized`-Flag serialisierter Geometrieattribute muss boolesch sein, wenn es vorhanden ist. Fehlende Flags bleiben für v3-Kompatibilität erlaubt.
- Neue Schema-Tests decken gültige Grenzwerte, ungültige Transformationsfälle, partielle Alt-Metadaten und ungültige Normalisierungsflags ab. Die Projektformat-Version bleibt 3; keine gespeicherten Werte oder gültigen Projektabläufe werden geändert.
- Code-, Browser- und OCCT-CI für den neuen Stand müssen noch abgeschlossen werden.
\n### 6.77 Import- und CSG-Grenzen: verschachtelte Quellen und Dateilesefehler absichern (21.11.2026)\n- Die frühe Projektvalidierung prüft Transformationsmetadaten jetzt rekursiv auch in ursprünglichen CSG-Quellteilen (`unionParts`). Fehlerhafte Positionen, Drehungen oder Skalierungen werden dadurch vor der Wiederherstellung ihrer Geometrien erkannt.\n- Der STL-Import fängt nun auch einen Fehler beim Erzeugen des `FileReader` ab und meldet einen kontrollierten Importfehler, statt eine nicht abgefangene Ausnahme auszulösen.\n- CSG akzeptiert für Positionen ausschliesslich BufferAttribute mit genau drei Komponenten pro Vertex und für Indizes genau einen Index pro Eintrag. Unpassende Attributlayouts werden vor dem BSP-Aufbau zurückgewiesen.\n- Neue Regressionstests decken verschachtelte ungültige CSG-Transformationen, FileReader-Konstruktorfehler sowie fehlerhafte CSG-Positions- und Indexlayouts ab.\n- Die vorhandenen gültigen Geometrien, Grenzwerte und CSG-Berechnungen bleiben unverändert. Code-, Browser- und OCCT-CI für diesen Stand müssen noch abgeschlossen werden.\n