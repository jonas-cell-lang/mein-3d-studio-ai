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
- Die 3D-Darstellung basiert weiterhin auf Three.js r128. Die Laufzeitbibliothek sowie STLLoader/STLExporter werden inzwischen aus der exakt festgelegten npm-Version lokal vorbereitet und nicht mehr von CDNs geladen.
- Interne Modellkoordinaten verwenden weiterhin **1 Three.js-Einheit = 10 mm**. Die zentrale Einheiten-API ist implementiert und erste Kernbereiche sind migriert; der Kompatibilitätsalias `MM_PER_UNIT` bleibt für noch nicht migrierte Aufrufstellen bestehen.
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

Phase 1 – technisches Fundament – wird auf einem separaten Implementierungsbranch umgesetzt. Die ersten beiden Bausteine sind implementiert und auf dem aktuellen Stand v93 geprüft:

### 6.1 Zentrale Einheiten-API
- `src/units.js` definiert die bestehende Skala: 1 Three.js-Welteinheit = 10 mm.
- Die API enthält getrennte Umrechnungen für Länge, Fläche und Volumen.
- Die Längen- und Flächenkonvertierungen im CAD-Hauptskript wurden auf die API umgestellt: Druckbett/Raster, Skizzenbegrenzung und -vereinfachung, Eingabedimensionen, STL-Import/-Export, Ausrichtung/Abstandsverteilung, Tastaturschritte, Skizzengeometrie und Druckmassenausgabe.
- Der alte `MM_PER_UNIT`-Kompatibilitätsalias wurde entfernt; es gibt keine verbleibenden Verwendungen in `index.html`.
- Unit-Tests und Browserprüfungen sichern die Referenzumrechnungen.

### 6.2 Projektformat v3 und Geometrievalidierung
- `src/project-schema.js` validiert App-Kennung, ganzzahlige Versionsnummer und Objektliste.
- `src/project-geometry.js` kapselt Serialisierung und Wiederaufbau von BufferGeometry sowie Union-Formteilen; es erhält Three.js und das Schema über eine explizite Factory-Schnittstelle.
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

### 6.6 Erste schrittweise Modularisierung
- `src/developer-diagnostics.js` enthält das zuvor im Dokumentkopf eingebettete Diagnosefenster als eigenständige Datei; die Script-ID blieb erhalten.
- `src/tool-navigation.js` enthält die DOM-basierte Werkzeugnavigation, die vor Three.js ausgeführt wird und keinen lexikalischen Zugriff auf den CAD-Hauptskript-Scope benötigt.
- `src/tutorial.js` enthält den zuvor nach dem CAD-Hauptskript eingebetteten Lernkurs als eigenständige IIFE-Datei.
- `src/image-studio.js` enthält den zuvor ebenfalls eingebetteten Image-Studio-Arbeitsbereich als eigenständige IIFE-Datei.
- `src/project-geometry.js` trennt die Geometrie-Serialisierung und den Wiederaufbau aus dem Hauptskript heraus.
- Die ursprüngliche Ausführungsreihenfolge blieb erhalten: Diagnosemodul, Werkzeugnavigation, Three.js/Schema/Projektgeometrie, CAD-Hauptskript, Lernkurs, Image Studio.
- Die Dateien wurden ohne Änderung ihrer Funktionslogik ausgelagert. Sie verwenden eigene lokale Variablen und die vorhandenen DOM-/`window`-Schnittstellen.
- Der lokale Pages-Test prüft, dass alle fünf Module vorhanden sind und von `index.html` referenziert werden. Die statische Funktionsprüfung berücksichtigt auch den ausgelagerten Navigationscode.
- Browser-Interaktionstests prüfen, dass die Anwendung mit den ausgelagerten Dateien weiterhin startet und die bestehenden Workflows funktionieren.
- Das grosse CAD-Hauptskript bleibt bewusst unangetastet. Weitere Extraktionen benötigen zuerst eine klare Abhängigkeitsgrenze.

### 6.5 Vertikaler Referenzablauf
Der Playwright-Browserlauf prüft einen echten Durchgang: Modellobjekte erstellen, Projektdatei speichern, die gespeicherte Datei in einer frischen Sitzung wieder öffnen, die Objektanzahl vergleichen und anschliessend eine STL-Datei exportieren. Zusätzlich werden das v3-Fixture, die Ablehnung von v4, die lokalen Three.js-Dateien ohne CDN-Zugriff und die Zurückweisung fehlerhafter Geometriedaten geprüft.

**Prüfstatus:** Für Code-Commit `64f681debbd04ff466c2e0d21a50140f3f0e898c` sind Code-Checks und Browser-Regression erfolgreich. PR 69 bleibt Draft und ungemergt; die öffentliche Live-App wurde nicht verändert und nicht neu deployed.

**Als Nächstes:** Die noch offenen Einheiten-Aufrufstellen schrittweise migrieren und mit Referenzfällen absichern. Danach den modularen Build- und Dokument-/Befehlsaufbau vervollständigen und Phase 1 vollständig gegen die Abnahmekriterien prüfen. Die Kernel-Forschung bleibt getrennt; kein CAD-Kern wird vor erfolgreichem Prototyp- und Lizenzvergleich in die App integriert.eitere repräsentative v3-Fixtures für Gruppen, verbundene Formen, Skizzen und Image-Studio-Daten ergänzen. Danach folgen das kostenlose Root-Build-/Abhängigkeitsfundament und die schrittweise Modularisierung. Die übrigen historischen Einheiten-Aufrufstellen werden ohne globale riskante Ersetzungen migriert.

Die Kernel-Forschung bleibt davon getrennt: Kein OCCT-/Replicad-/OpenGeometry-Paket wird in die Produktionsanwendung eingebunden, bevor die offenen technischen und rechtlichen Abnahmepunkte geklärt sind.

**Erfolg bedeutet nicht möglichst viele Werkzeuge. Erfolg bedeutet, dass SILMO komplexe 3D-Aufgaben präzise, stabil und verständlich erledigt.**
