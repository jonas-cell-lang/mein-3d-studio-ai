# SILMO – Technische Bestandsaufnahme v90

**Prüfdatum:** 14.11.2026  
**Ausgangscommit:** `f1caa90cb246db2bb66b35e24ca91cac0d838fa3`  
**Zweck:** Tatsächlichen Ist-Zustand von SILMO festhalten, damit die Weiterentwicklung auf vorhandener Arbeit aufbaut und keine Funktionen versehentlich neu erfunden oder verloren werden.

## 1. Repository und Laufzeit

| Bereich | Beobachteter Stand |
|---|---|
| Einstiegspunkt | `index.html`, ca. 5'600 Zeilen |
| Anwendungscode | Mehrere grosse Inline-Skripte in einer HTML-Datei |
| 3D-Rendering | Three.js r128 |
| Laden der 3D-Bibliotheken | Externe CDN-Skripte |
| Projektstruktur | Statische GitHub-Pages-Anwendung; kein `package.json` im Repository-Root |
| Browser-Tests | Playwright-Testdatei mit ca. 1'000 Zeilen |
| Automatisierte Assertions | 327 im aktuellen Browser-Test |
| DOM-Grösse | 163 explizit vergebene IDs im aktuellen HTML |
| Letzter bestätigter App-Stand | v90 – Focused CAD Subtabs |

Die Anwendung ist bereits eine umfangreiche Web-3D-Anwendung, aber noch keine modular aufgebaute CAD-Software-Architektur.

## 2. Bereits vorhandene Funktionen

### Modell- und Szenenverwaltung
- Grundkörper: Würfel, Kugel, Zylinder, Kegel, Sechskant-Prisma und Torus
- Objektliste, Auswahl und Mehrfachauswahl
- Duplizieren und Löschen
- Verschieben, Drehen und Skalieren
- Direkte Eingabe von Objektmassen und Positionen
- Sperren von Objekten
- Gruppieren, Gruppierung aufheben und individuelle Gruppenbearbeitung
- Spiegeln und Ausrichten
- Druckbettgrösse und Arbeitsraster

### Geometrie und Konstruktion
- Eigene BSP-basierte Boolesche Operationen
- Formen vereinigen und voneinander abziehen
- Ursprüngliche Teile verbundener Formen wiederherstellen
- 2D-Skizzen: Rechteck, abgerundetes Rechteck, Kreis, Ellipse, Dreieck, Linie, Kurve und Freiform
- 3D-Linien auf mehreren Zeichenebenen
- Rasterfang und Konturglättung
- Skizzen zu 3D-Körpern extrudieren
- Konturrahmen und Hohlkörper erzeugen
- Skizzenpunkte und Skizzenabmessungen bearbeiten
- Kanten abrunden und fasen
- Loft und Sweep
- Skizzenbeziehungen und Abstände/Längen bearbeiten

### Navigation und Bedienung
- Mehrere Hauptarbeitsbereiche
- Unterreiter, die nur den aktiven Werkzeugbereich anzeigen
- Anfänger- und Expertenmodus
- Maximierbare 3D-Ansicht
- Verschiebe- und Dreh-Gizmo
- Direkte Winkeleingabe beim Drehen
- Tastenkürzel und interaktive Tutorials
- Integriertes Diagnose-/Prüftool

### Dateien und Bildstudio
- SILMO-Projekt als JSON mit eingebetteten Geometriedaten
- Projektdatei öffnen und speichern
- STL-Import
- STL-Export
- Bildvorlage importieren, drehen und skalieren
- Automatische Kontur-Erkennung mit einstellbarer Empfindlichkeit
- Mehrere erkannte Konturen
- Prüfung ausgewählter Kontur-Eigenschaften
- Konturen in 3D-Körper überführen

## 3. Technische Beobachtungen und Risiken

### 3.1 Mesh-zentriertes Modell
Die aktiven Modellobjekte sind Three.js-Meshes mit BufferGeometry. Die Geometrie wird als Polygonnetz gespeichert und bearbeitet. Das ist für Darstellung, STL und viele Mesh-Operationen geeignet, stellt aber allein noch kein vollwertiges parametrisches CAD-/B-Rep-Modell mit stabilen Flächen-, Kanten- und Vertex-Identitäten dar.

**Folge:** Eine professionelle Flächen-/Kanten-/Punktbearbeitung benötigt ein zusätzliches topologisches Datenmodell oder einen geeigneten CAD-Kern. Das darf nicht durch immer mehr ad-hoc-Manipulationen an Dreiecksnetzen ersetzt werden.

### 3.2 Boolesche Operationen
Die Anwendung enthält einen eigenen BSP-basierten CSG-Algorithmus. Das ist ein wertvoller vorhandener Funktionsbaustein, muss aber mit koplanaren Flächen, dünnen Wänden, fast deckungsgleichen Flächen, nicht-manifold Eingaben und grossen Netzen systematisch getestet werden.

**Folge:** CSG nicht blind entfernen. Erst Testkorpus und Vergleich mit alternativen Geometriekernen aufbauen.

### 3.3 Einheiten
Der aktuelle Renderer nutzt die Umrechnung **1 interne Three.js-Einheit = 10 mm**. Das ist im Code durch `MM_PER_UNIT = 10` festgelegt: Millimeterwerte werden für interne Koordinaten durch 10 geteilt und beim STL-Export mit 10 multipliziert. Import und andere Modellierungsfunktionen rechnen an den jeweiligen Grenzen um.

**Folge:** Langfristig eine zentrale Unit-/Tolerance-API einführen. Kein Modul soll eigene, abweichende Umrechnungsfaktoren definieren.

### 3.4 Projektformat und Verlauf
Projekte speichern Geometrieattribute, Transformationsdaten und einige Metadaten in JSON. Undo/Redo erstellt aktuell vollständige Objektzustandskopien.

**Folge:** Für grosse Modelle müssen Speicherverbrauch, Ladezeit, Schema-Versionierung, atomare Änderungen und ein späterer befehlsbasierter Verlauf geprüft werden.

### 3.5 Abhängigkeiten und Testbarkeit
Three.js und STL-Erweiterungen werden zur Laufzeit über CDNs eingebunden. Die Anwendung ist stark in einer einzigen Datei gekoppelt.

**Folge:** Abhängigkeiten lokal und reproduzierbar verwalten; Module schrittweise extrahieren. Der Umbau muss mit Regressionstests abgesichert werden.

### 3.6 KI-/Bildstudio
Die aktuelle Bildverarbeitung ist im Browser implementiert und liefert Konturen, die in bestehende Skizzen-/CAD-Funktionen übergeben werden. Das ist nicht gleichbedeutend mit einer vollständigen 3D-Rekonstruktion beliebiger Fotos.

**Folge:** Foto-zu-3D als eigenständiges Forschungs- und Produktmodul behandeln; Ergebnisse, Unsicherheit und manuelle Nachbearbeitung explizit machen.

## 4. Testabdeckung, die bereits vorhanden ist

Der aktuelle Playwright-Test prüft unter anderem:
- Start und Interaktion der 3D-Ansicht
- Objektanlage, Transformationen, Mehrfachauswahl und Gruppierung
- Ausrichten und Spiegeln
- Undo/Redo
- Boolesche Operationen und Wiederherstellen verbundener Teile
- Skizzenwerkzeuge, Masse, Kontur und Extrusion
- Kantenbehandlung, Loft und Sweep
- Skizzenbeziehungen und Abstände
- Unterreiter und Sichtbarkeit der aktiven Bereiche
- Image Studio, Bildimport, Kontur-Erkennung und Übergabe an 3D
- Fehlerfreiheit des Browserlaufs

Die Tests sind ein guter Ausgangspunkt. Sie ersetzen noch keine mathematischen Geometrie-Tests, keine Lasttests und keine Prüfung mit echten, schwierigen CAD-Dateien.

## 5. Funktionslücken gegenüber einem professionellen CAD-System

Diese Punkte sind keine Behauptung, dass die Anwendung gar nichts davon kann; sie markieren Bereiche, die für ein professionelles, allgemeines CAD-System systematisch vertieft und abgenommen werden müssen:

1. **Topologische Modellierung:** persistente Identitäten und Beziehungen von Körpern, Flächen, Kanten und Punkten.
2. **Parametrik:** Feature-Historie, Abhängigkeiten, Constraints und zuverlässige Neuberechnung.
3. **Geometrische Robustheit:** präzise Boolesche Operationen, Fillets/Chamfers und Reparatur komplexer Geometrie.
4. **Auswahl und Snapping:** zuverlässige Auswahl einzelner Flächen/Kanten/Punkte und geometrische Fangpunkte.
5. **Komponenten und Instanzen:** wiederverwendbare Komponenten mit kontrollierter gemeinsamer oder unabhängiger Bearbeitung.
6. **Ansichten und Dokumentstruktur:** Ebenen, Szenen, Schnitte, Kameraansichten und Zeichnungsableitungen.
7. **Austauschformate:** Formate für Mesh, Szenen und echte CAD-Solids getrennt bewerten.
8. **Skalierung:** grosse Modelle, viele Objekte, Speicherbedarf und GPU-Leistung.
9. **Druckprüfung:** echte Mesh-Validierung, Wandstärke und druckrelevante Grenzfälle.
10. **KI-Rekonstruktion:** komplexe reale Fotos und organische Motive über einfache Silhouetten hinaus.

## 6. Empfohlene Reihenfolge ab hier

1. Einheitliches Domänenmodell und Unit-/Tolerance-Konzept spezifizieren.
2. Geometriekern-Prototypen in einem separaten Testbereich vergleichen.
3. Dokument-/Command-/Undo-Architektur definieren.
4. Build- und Modulstruktur einführen, ohne bestehende UI-Funktionen zu verlieren.
5. Einen ersten vertikalen CAD-Workflow vom Erstellen bis Speichern/Wiederöffnen vollständig migrieren.
6. Danach Flächen-/Kanten-/Punktbearbeitung und parametrische Features erweitern.

## 7. Nicht verhandelbare Schutzmassnahmen

- Bestehende Funktionen bleiben erhalten, bis Ersatz und Regressionstest vorhanden sind.
- Keine parallelen, widersprüchlichen Einheiten- oder Dokumentmodelle.
- Keine Behauptung „CAD-genau“, solange nur eine Mesh-Näherung getestet wurde.
- Keine automatische Veröffentlichung bei fehlgeschlagenen Tests.
- Reale Druck- und Fotoergebnisse werden separat von synthetischen Tests beurteilt.
