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

- Die Anwendung liegt derzeit im Wesentlichen in einer einzelnen `index.html` mit rund 5'600 Zeilen und eingebettetem CSS/JavaScript.
- Die 3D-Darstellung basiert auf Three.js r128, das aktuell über externe CDN-Skripte geladen wird.
- Interne Modellkoordinaten verwenden derzeit den Faktor **1 Three.js-Einheit = 10 mm (der Code teilt Millimeterwerte durch 10, um interne Koordinaten zu erhalten)**; diese Umrechnung ist an mehreren Stellen in der Anwendung verankert.
- Es gibt bereits Grundkörper, Objekttransformationen, Auswahl, Mehrfachauswahl, Gruppierung, Undo/Redo, Projektdateien, STL-Import, STL-Export, 2D-Skizzen, Extrusion, Kontur- und Wandwerkzeuge, eigene BSP-basierte Boolesche Operationen, Loft/Sweep, Skizzenbeziehungen und Bildkontur-Erkennung.
- Die Oberfläche besitzt Hauptbereiche und fokussierte Unterreiter.
- Browser- und GitHub-Actions-Tests sind vorhanden.
- Ein `package.json` ist im Repository-Root derzeit nicht vorhanden; die aktuelle Struktur ist damit noch kein modernes, modular gebautes Entwicklungsprojekt.

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

## 6. Stand des erweiterten Geometriekern-Testkatalogs

Der nächste konkrete Arbeitsschritt aus der vorherigen Fassung wurde auf einem isolierten Forschungsbranch umgesetzt. Die gemeinsame Spezifikation liegt in `research/geometry-kernel-prototype/candidate-test-catalog.mjs` (Version 1). Alle Adapter verwenden dieselben physikalischen Testfälle und Sollwerte; Masse und Volumen sind in mm bzw. mm³ definiert.

Ausgeführt wurden:
- Schwierige Boolesche Fälle: koplanare Überlappung, Flächen-/Kanten-/Eckkontakt, Zylinder-/Quader-Tangenz und nahezu deckungsgleiche Körper.
- Dünnwand- und Kleinfeature-Fälle.
- Sechs standardisierte ungültige Primitiveingaben.
- Topologiehistorie und Speicher-/Handle-Beobachtungen, soweit die jeweilige API diese Informationen bereitstellt.
- Vergleich mit `occt-wasm 5.17.2`, `@moket/occt-wasm 0.10.1`, Replicad 1.2.1 und OpenGeometry 3.0.0.
- Worker-Prüfungen in Chromium, Firefox und WebKit sowie Regressionstests der bestehenden SILMO-App.

**Nachweis:** Der GitHub-Actions-Lauf [43700411664](https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43700411664) hat die isolierten Geometrietests, den standardisierten Kandidatenvergleich und alle drei Browser-Worker-Tests bestanden. Die Code-Prüfungen [43700411629](https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43700411629) und die Browser-Regression [43700411668](https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43700411668) waren ebenfalls erfolgreich.

### Wichtige Befunde und offene Punkte

- Der Gesamtstatus des Kandidatenvergleichs lautet **`completed-with-gaps`**: Alle vier Adapter wurden ausgeführt, aber nicht alle APIs liefern gleichwertige Fähigkeiten oder ausreichend präzise Messwerte.
- `occt-wasm` (andymai) und Replicad akzeptieren eine negative Quaderbreite als gültigen Körper. NaN-/unendliche Masse und Zylinder mit Radius/Höhe 0 werden dort teilweise als ungültige Shapes statt als abgelehnte Eingaben zurückgegeben. SILMO müsste Eingaben daher unabhängig vom Kernel streng validieren.
- `@moket/occt-wasm` und OpenGeometry lehnen alle sechs standardisierten ungültigen Eingaben ab.
- Explizite Boolesche Topologiehistorie ist in den getesteten OCCT-Wrappern verfügbar. Replicad und OpenGeometry bieten in den geprüften öffentlichen APIs keine entsprechende Face-/Edge-Evolution-Map.
- OpenGeometry liefert Volumenmessfehlergrenzen, die in mehreren Fällen deutlich über der gemeinsamen Vergleichstoleranz liegen. Diese Fälle werden ausdrücklich als **messpräzisionsbedingt ungeklärt** protokolliert und nicht als Präzisionspass gewertet.
- Die automatisierten WebKit-Tests laufen in Playwright unter Linux. Ein manueller Test mit Desktop-Safari bleibt offen.

**Noch keine Architekturentscheidung:** Die Lizenzprüfung und die Bewertung der dokumentierten API-/Messlücken stehen aus. Es gibt keine Integration in die SILMO-Live-App; der bisherige Geometriekern bleibt unverändert. Phase 0 ist damit weiterhin nicht vollständig abgenommen.

**Nächster Schritt:** Lizenzbedingungen und Wartbarkeit der Kandidaten prüfen, die offenen Fähigkeiten und Messlücken bewerten und erst danach eine begründete Architektur-Empfehlung erstellen.

**Erfolg bedeutet nicht möglichst viele Werkzeuge. Erfolg bedeutet, dass SILMO komplexe 3D-Aufgaben präzise, stabil und verständlich erledigt.**
