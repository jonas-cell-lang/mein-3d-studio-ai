# SILMO – Modul-Extraktionskarte

**Stand:** Entwicklungsbranch `phase1/history-foundation`  
**Zweck:** Die grosse Inline-Anwendung schrittweise aufteilen, ohne ihre Laufzeitreihenfolge, Zuständigkeiten oder vorhandenen CAD-Funktionen zu beschädigen.

## 1. Bereits ausgelagerte Module

| Modul | Aufgabe | Abhängigkeiten / Schnittstelle |
|---|---|---|
| `src/units.js` | Umrechnung Länge, Fläche und Volumen | Keine Laufzeitabhängigkeit; unveränderliche API |
| `src/tolerances.js` | Benannte, fachlich getrennte Toleranzwerte | Keine Laufzeitabhängigkeit; unveränderliche API |
| `src/project-schema.js` | Projekt-Hülle und serialisierte Geometrie validieren | Keine Three.js-Abhängigkeit |
| `src/project-geometry.js` | BufferGeometry serialisieren/wiederherstellen; Union-Formteile speichern/wiederherstellen | Factory erhält `THREE` und `SILMOProjectSchema`; stellt `window.SILMOProjectGeometry` bereit |
| `src/project-io.js` | Projektdateien speichern und öffnen; alle Objekte vor dem Ersetzen des aktuellen Modells aufbauen | Factory erhält Three.js, Schema und Projektgeometrie; der App-Zustand wird über explizite Getter-/Commit-/UI-Callbacks angebunden |
| `src/history.js` | Undo-/Redo-Stack, Begrenzung, Redo-Verwerfung und Snapshot-Freigabe | Factory erhält `captureState`, `restoreState` und `disposeState`; Three.js und DOM bleiben ausserhalb des Moduls |
| `src/stl-io.js` | STL-Dateien importieren und als ASCII-STL exportieren; Einheitenumrechnung und temporäre Exportgeometrien verwalten | Factory erhält Three.js und Einheiten-API; App-Zustand wird über Objekt-/Status-Callbacks angebunden |
| `src/csg.js` | BSP-basierte Boolesche Geometrieoperationen (Verbindung und Differenz) | Factory erhält `THREE` und `SILMOTolerances`; stellt `window.SILMOCSG.combineMeshes` bereit |
| `src/primitive-geometry.js` | Erzeugung der sechs vorhandenen Grundkörper inklusive Z-Höhenorientierung und Bounding Box | Factory erhält `THREE`; stellt `window.SILMOPrimitiveGeometry.createPrimitiveGeometry(type)` bereit |
| `src/sketch-geometry.js` | Erzeugung und Fertigstellung der Extrusionsgeometrie aus einem 2D-Skizzenprofil | Factory erhält `THREE`; stellt `window.SILMOSketchGeometry.createExtrusionGeometry(shape, options)` bereit |
| `src/developer-diagnostics.js` | Diagnosefenster, Laufzeit- und Bedienprotokoll | Eigenständige DOM-/Browser-IIFE; bleibt im Dokumentkopf |
| `src/tool-navigation.js` | Hauptnavigation, Werkzeugbereiche und Unterreiter organisieren | Eigenständige DOM-IIFE; wird vor Three.js ausgeführt |
| `src/tutorial.js` | Geführter Lernkurs und Erfolgskontrolle | Eigenständige DOM-IIFE; nutzt vorhandene `window`-Test-/App-Schnittstellen |
| `src/image-studio.js` | 2D-Bildbereich, Konturerkennung und Übergabe an CAD | Eigenständige DOM-/Canvas-IIFE; Übergabe über `window.__silmoImageStudioCreateFromPoints` |

Der Undo-/Redo-Stack ist in `src/history.js` ausgelagert. Die Snapshots bleiben vorerst vollständige Kopien der bestehenden Mesh-Geometrien und Materialien; eine befehlsbasierte Historie und echte Speicher-/Leistungs-Baselines sind noch offen.

Die ausgelagerten Dateien werden in ihrer bisherigen Ausführungsreihenfolge geladen. Die lokalen Pages-Prüfungen vergleichen die vorhandenen Dateien und die Browser-Tests blockieren externe HTTPS-Zugriffe.

## 2. Was weiterhin im CAD-Hauptskript liegt

Das verbleibende Inline-CAD-Skript hält weiterhin den zentralen Laufzeitzustand und mehrere eng gekoppelte Bereiche:

- Three.js-Szene, Kamera, Renderer und Animationsschleife
- Modellobjektliste, Auswahl und Mehrfachauswahl
- Objektanlage, Materialzuweisung und Auswahl bleiben im Hauptskript; die reine Geometrieerzeugung der sechs Grundkörper liegt jetzt in `src/primitive-geometry.js`
- Zustandsaufnahme und Anbindung der Undo-/Redo-History über `src/history.js`
- Transformationen, Gizmos, Ausrichtung und Gruppierung
- Boolesche Geometrieoperationen und BSP-CSG
- Skizzenaufnahme, Constraints, Profilaufbau, Metadaten und Modell-Commit bleiben im Hauptskript; die beiden regulären 2D-Skizzen-Extrusionspfade verwenden jetzt `src/sketch-geometry.js`
- Kontur- und Pfadwerkzeuge
- STL-Datei-Auswahl, Drag-and-drop und Web-Link-Interaktion; der eigentliche STL-Import/-Export ist in `src/stl-io.js` ausgelagert
- DOM-Ereignisse und Statusmeldungen

Diese Bereiche sollten nicht als grosse Textblöcke verschoben werden. Zuerst müssen ihre Daten- und Seiteneffekt-Abhängigkeiten als explizite Schnittstellen sichtbar werden.

## 3. Abgeschlossene Extraktion: Projektdatei-I/O

`src/project-io.js` kapselt jetzt `saveProject` und `openProjectFile`. Das Modul übernimmt Datei-Download und -Lesen, Projekthüllenprüfung, Mesh-Wiederaufbau und Fehlerbehandlung.

Die App übergibt eine Factory-Abhängigkeit mit klaren Funktionen:
- Objektbestand, Druckbettmasse und Uniform-Modus lesen
- Projektdatei-Eingabefeld und Statusmeldung bereitstellen
- Image-Studio-Daten exportieren/importieren
- beim erfolgreichen Öffnen über `commitProject(project, newObjects)` Undo-History, Szene, Objektliste, Druckbett, Auswahl und UI aktualisieren

**Wichtige Sicherheitsregel:** Das Modul baut alle neuen Objekte zuerst vollständig auf. Erst danach ruft es den Commit-Callback auf. Bei ungültiger Datei werden die neu erzeugten Ressourcen entsorgt; das bereits geöffnete Projekt bleibt bestehen.

Die Browser-Regression prüft weiterhin Speichern, Wiederöffnen, Objektanzahl und die Zurückweisung fehlerhafter Geometrie. Zusätzlich bestätigt sie, dass `SILMOProjectIO.createProjectIO` verfügbar ist.

## 4. Weitere spätere Kandidaten

Der STL-Import/-Export ist jetzt als `src/stl-io.js` ausgelagert. Dateiauswahl, Drag-and-drop und Web-Link-Interaktion bleiben im Hauptskript; Geometrieparsing, mm-/Welteinheiten-Konvertierung, Exportkopien und Statusmeldungen laufen über explizite Callbacks.

Der BSP-CSG-Kern ist als `src/csg.js` ausgelagert. Der vollständige Browserlauf hat sowohl die bestehende Union-Prüfung als auch die neue Differenz-Prüfung erfolgreich bestanden.

1. Skizzen-/Extrusions- und Pfadfunktionen in getrennte Werkzeuge, sobald gemeinsame Modelloperationen über eine stabile API laufen.
2. Import-/Export-Adapter weiter trennen, falls sie unabhängig von Projektdatei-I/O werden können.
3. Renderer-/Kamera-/Gizmo-Bereich erst nach klarer Trennung vom Modellzustand.

## 5. Regeln für jede weitere Extraktion

- Zuerst echte Abhängigkeiten und Seiteneffekte inventarisieren.
- Bestehende Logik möglichst unverändert verschieben; keine gleichzeitige Funktionsneuentwicklung.
- Die Script-Reihenfolge und relative GitHub-Pages-Pfade erhalten.
- Das Modul im lokalen Pages-Paket und in der Browserlaufzeit prüfen.
- Betroffene Arbeitsabläufe mit Regressionstests abdecken.
- Erst nach bestandenen Code- und Browser-Tests den nächsten Bereich extrahieren.
