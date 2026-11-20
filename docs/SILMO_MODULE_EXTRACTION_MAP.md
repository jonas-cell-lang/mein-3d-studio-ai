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
| `src/sketch-geometry.js` | Parametrische 2D-Profile, Konturpfade, Extrusion, Loft, Sweep, CAD-Pfadkurven/-rohre und Hohlrahmen-Offset-/Extrusionsgeometrie | Factory erhält `THREE`; stellt Profil-, Pfad-, Konturrahmen-, Extrusions-, Loft- und Sweep-Factories bereit |
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
- Kontur- und Pfadwerkzeuge: Profil-/Kurven-/Rohr-/Loft-/Sweep-Geometrie liegt nun in `src/sketch-geometry.js`; Pfadbearbeitung, Auswahlprüfung, Objekttransformationen, History, Material, Szene-Commit und Statusmeldungen bleiben im Hauptskript
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


## 6. Loft- und Sweep-Extraktion (20.11.2026)

- `src/sketch-geometry.js` enthält jetzt auch das gleichmässige Abtasten geschlossener Profilkonturen, die Loft-Mesh-Erzeugung inklusive triangulierter Endflächen und die Sweep-Erzeugung entlang einer Catmull-Rom-3D-Kurve.
- Das Hauptskript übernimmt weiterhin Auswahl und Validierung der Quellobjekte, Welttransformationen, Materialkopie, Undo-History, Modell-Commit und UI-Status.
- Tests decken ein analytisches Loft-Volumen von 8 Einheiten³, ein Sweep-Volumen von 12 Einheiten³, Sollabmessungen, endliche Vertexdaten und ungültige Eingaben ab.
- Bekannte fachliche Grenze des bestehenden Loft-Verfahrens: Die Endkappen-Triangulation verwendet die XY-Projektion der Weltkoordinaten. Beliebig orientierte Profile bzw. Profile mit Innenlöchern benötigen eine spätere, explizit ebeneunabhängige Kontur-/Kappenbehandlung. Die Extraktion hat diese bisherige Einschränkung nicht stillschweigend verändert.
- Die Kontur-Abtastung gleicht Punktzahlen und Abstände an, bestimmt aber noch keine semantisch optimale Startpunkt-/Drehrichtungszuordnung zwischen Profilen. Verdrehungsarme Korrespondenz bleibt ein eigener Qualitäts-/Algorithmusschritt.


## 7. CAD-Pfadkurven und Pfadrohre (20.11.2026)

- `src/sketch-geometry.js` stellt jetzt gemeinsame Factory-Funktionen für gespeicherte CAD-Pfade bereit: `createPathCurve` erhält die bisherige Unterscheidung zwischen gerader 2D-Linie und Catmull-Rom-Kurve; `createPathTubeGeometry` baut das Rohr mit den angeforderten Segmentzahlen und berechnet Normalen sowie Bounding-Volumen.
- Das Hauptskript nutzt die Factory bei der ursprünglichen Skizzenanlage, beim erneuten Aufbau nach einer Pfadlängenänderung und beim Auslesen der Kurvenlänge.
- Pfadpunkte, mm-Eingabe, Längenskalierung, Mittelpunktverschiebung, Metadaten, History und Modell-Commit bleiben im Hauptskript.


### Verifikation Pfadkurven-/Rohr-Factories
- Code-Head `fdb0139a9b48188b39f92ecbe1beb5260618781c`: 51/51 Unit-Tests bestanden; Browser-Regression und OCCT-/WebWorker-Test erfolgreich.
- GitHub Actions: Code Checks `44765048481`, Browser-Regression `44765048493`, OCCT-Prototyp `44765048667` – alle erfolgreich.


## 8. Hohlrahmen-Geometrie (20.11.2026)

- Die reine Geometrieerzeugung für den selbst gezeichneten Hohlrahmen liegt jetzt ebenfalls in `src/sketch-geometry.js`.
- Die Factory berechnet die nach innen versetzte Kontur, prüft die resultierende Innenkontur und erzeugt den extrudierten Rahmen mit echtem Innenloch.
- Die App behält Auswahl-/Sperrprüfung, mm-Eingaben, UI-Meldungen, Quellobjektposition, Material, History und Szene-Commit.
- Ein zusätzlicher Mindestabstandscheck verhindert, dass eine zu grosse Wandstärke bei einem kleinen Profil über die Innenkontur hinweg kollabiert und fälschlich wieder eine kleine gültige Kontur erzeugt.
- Unit-Tests prüfen beide Konturrichtungen, Aussenabmessungen, analytisches Hohlrahmenvolumen und ungültige/zu grosse Wandstärken.
- Code-Head `208815fd7d101f1af4520d2834c8437a9ea8bad4`: 54/54 Unit-Tests, Browser-Regression und OCCT-/WebWorker-Test erfolgreich.
