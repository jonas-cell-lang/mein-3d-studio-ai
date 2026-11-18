# SILMO – Modul-Extraktionskarte

**Stand:** Entwicklungsbranch `phase1/central-units-api`  
**Zweck:** Die grosse Inline-Anwendung schrittweise aufteilen, ohne ihre Laufzeitreihenfolge, Zuständigkeiten oder vorhandenen CAD-Funktionen zu beschädigen.

## 1. Bereits ausgelagerte Module

| Modul | Aufgabe | Abhängigkeiten / Schnittstelle |
|---|---|---|
| `src/units.js` | Umrechnung Länge, Fläche und Volumen | Keine Laufzeitabhängigkeit; unveränderliche API |
| `src/tolerances.js` | Benannte, fachlich getrennte Toleranzwerte | Keine Laufzeitabhängigkeit; unveränderliche API |
| `src/project-schema.js` | Projekt-Hülle und serialisierte Geometrie validieren | Keine Three.js-Abhängigkeit |
| `src/project-geometry.js` | BufferGeometry serialisieren/wiederherstellen; Union-Formteile speichern/wiederherstellen | Factory erhält `THREE` und `SILMOProjectSchema`; stellt `window.SILMOProjectGeometry` bereit |
| `src/developer-diagnostics.js` | Diagnosefenster, Laufzeit- und Bedienprotokoll | Eigenständige DOM-/Browser-IIFE; bleibt im Dokumentkopf |
| `src/tool-navigation.js` | Hauptnavigation, Werkzeugbereiche und Unterreiter organisieren | Eigenständige DOM-IIFE; wird vor Three.js ausgeführt |
| `src/tutorial.js` | Geführter Lernkurs und Erfolgskontrolle | Eigenständige DOM-IIFE; nutzt vorhandene `window`-Test-/App-Schnittstellen |
| `src/image-studio.js` | 2D-Bildbereich, Konturerkennung und Übergabe an CAD | Eigenständige DOM-/Canvas-IIFE; Übergabe über `window.__silmoImageStudioCreateFromPoints` |

Die ausgelagerten Dateien werden in ihrer bisherigen Ausführungsreihenfolge geladen. Die lokalen Pages-Prüfungen vergleichen die vorhandenen Dateien und die Browser-Tests blockieren externe HTTPS-Zugriffe.

## 2. Was weiterhin im CAD-Hauptskript liegt

Das verbleibende Inline-CAD-Skript hält weiterhin den zentralen Laufzeitzustand und mehrere eng gekoppelte Bereiche:

- Three.js-Szene, Kamera, Renderer und Animationsschleife
- Modellobjektliste, Auswahl und Mehrfachauswahl
- Undo/Redo und Zustandsaufnahme
- Transformationen, Gizmos, Ausrichtung und Gruppierung
- Boolesche Geometrieoperationen und BSP-CSG
- Skizzen, Extrusion, Kontur- und Pfadwerkzeuge
- Import/Export und Projektdatei-Ablauf
- DOM-Ereignisse und Statusmeldungen

Diese Bereiche sollten nicht als grosse Textblöcke verschoben werden. Zuerst müssen ihre Daten- und Seiteneffekt-Abhängigkeiten als explizite Schnittstellen sichtbar werden.

## 3. Nächste geeignete Extraktionsgrenze: Projektdatei-I/O

Die Funktionen `saveProject` und `openProjectFile` bleiben vorerst im Hauptskript. Die Geometrie-Serialisierung ist bereits ausgelagert; die Projektdatei-I/O-Funktionen greifen aber weiterhin auf veränderlichen App-Zustand zu.

Vor einer Extraktion müssen diese Abhängigkeiten über eine kleine Factory-/Callback-Schnittstelle bereitgestellt werden:

- aktueller Objektbestand und Three.js-Szene
- Druckbettbreite/-tiefe und Uniform-Skalierungsmodus
- Undo-History vor dem Ersetzen des aktuellen Modells
- Auswahlzustand und Gruppenbearbeitungsmodus
- UI-Aktualisierung, Eigenschaftenanzeige, Gizmo-Aktualisierung und Statusmeldung
- Projektdatei-Eingabefeld und Download-/Dateilesen
- Image-Studio-Export beim Speichern und Import beim Öffnen
- Geometrie-Serialisierung und -Wiederherstellung aus `SILMOProjectGeometry`

**Sicherheitsanforderung:** Das neue Modul muss zuerst alle Objekte vollständig validieren und aufbauen. Erst wenn alle erfolgreich erstellt sind, darf ein Callback den vorhandenen Modellbestand ersetzen. Bei einem Fehler müssen Modell, Auswahl und Undo-History des bereits geöffneten Projekts unverändert bleiben.

## 4. Weitere spätere Kandidaten

1. BSP-CSG-Kern als eigenständige Factory mit expliziter Three.js-Abhängigkeit.
2. Geometrie- und Skizzenfunktionen in getrennte Werkzeuge, sobald gemeinsame Modelloperationen über eine stabile API laufen.
3. Import-/Export-Adapter als eigene Module, die nur geprüfte Dokument- und Geometriedaten entgegennehmen.
4. Renderer-/Kamera-/Gizmo-Bereich erst nach klarer Trennung vom Modellzustand.

## 5. Regeln für jede weitere Extraktion

- Zuerst echte Abhängigkeiten und Seiteneffekte inventarisieren.
- Bestehende Logik möglichst unverändert verschieben; keine gleichzeitige Funktionsneuentwicklung.
- Die Script-Reihenfolge und relative GitHub-Pages-Pfade erhalten.
- Das Modul im lokalen Pages-Paket und in der Browserlaufzeit prüfen.
- Betroffene Arbeitsabläufe mit Regressionstests abdecken.
- Erst nach bestandenen Code- und Browser-Tests den nächsten Bereich extrahieren.
