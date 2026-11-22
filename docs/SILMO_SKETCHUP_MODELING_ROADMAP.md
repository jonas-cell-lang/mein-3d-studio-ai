# SILMO – SketchUp-orientierter Modellierfahrplan

**Ziel:** SILMO soll eine möglichst vollständige, eigenständige Nachbildung des SketchUp-Desktop-Arbeitsablaufs für allgemeine 3D-Modelle werden. Die Modellierung von Gegenständen, Bauteilen, Werkzeugen, Maschinen und 3D-Druck-Modellen steht im Vordergrund. Architektur- und Figurenmodelle bleiben möglich, sind aber keine Voraussetzung und kein Schwerpunkt.

**Arbeitszweig:** `feature/sketchup-object-modeling-focus`

## Verbindliche Schutzregeln

- Bestehende Funktionen werden nicht entfernt, nur weil sie nicht zum ersten SketchUp-Werkzeugset gehören.
- Bestehende Projektdateien, Einheiten, Undo/Redo, STL-Import/-Export und OCCT-Funktionen müssen rückwärtskompatibel bleiben.
- Neue Funktionen zuerst isoliert entwickeln und testen.
- Kein Merge und keine Veröffentlichung ohne ausdrückliche Freigabe des Projektinhabers.
- SketchUp dient als Funktions- und Bedienungsreferenz. Es werden keine geschützten SketchUp-Codebestandteile, Markenassets oder proprietären Implementierungen übernommen.

## Verifizierter Ausgangspunkt

Die Bestandsaufnahme und der aktuelle Quellcode zeigen bereits:

- Grundkörper wie Würfel, Kugel, Zylinder, Kegel, Prisma und Torus.
- Auswahl, Mehrfachauswahl, Duplizieren, Löschen, Verschieben, Drehen und Skalieren von Objekten.
- 2D-Skizzen, Kurven, Freiformkonturen und räumliche Linien.
- Extrusion von Skizzen, Hohlrahmen, Boolesche Operationen, Loft und Sweep.
- Gruppierung, Spiegeln, Ausrichten, exakte Masse und Positionen.
- STL-Projektworkflow und 3D-Druckprüfung.
- OCCT/WASM als B-Rep-Kern für ausgewählte native Körper.
- Direkte 3D-Auswahl nativer OCCT-Flächen und -Kanten mit hervorgehobenen Overlays.

Wichtige Einschränkung: Die direkte Flächen-/Kantenauswahl ist derzeit an native OCCT-B-Rep-Körper gebunden. Normale Three.js-Meshes und importierte STL-Netze besitzen nicht automatisch dieselbe editierbare B-Rep-Topologie. Diese Grenze muss vor einer allgemeinen SketchUp-artigen Bearbeitung sauber gelöst werden.

## Entwicklungsreihenfolge

### 1. Modelliermodus und Auswahl vereinheitlichen
- Einen klaren Standardmodus für Modellieren festlegen.
- Objekt-, Flächen-, Kanten- und später Punkt-/Vertex-Auswahl als verständliche Auswahlmodi gestalten.
- Direkte Auswahl im 3D-Viewport priorisieren; Listen bleiben ergänzende Alternative.
- Auswahlvorschau, Hover-Hervorhebung, Mehrfachauswahl und Escape-Verhalten vereinheitlichen.
- Für OCCT-B-Rep und Mesh-Objekte klar anzeigen, welche Bearbeitungen jeweils unterstützt werden.

**Abnahme:** Auswahl verhält sich reproduzierbar; bestehende Objektwahl und OCCT-Flächen-/Kantenauswahl bleiben funktionsfähig.

### 2. Inferenz und Fangsystem
- Endpunkte, Mittelpunkte, Kanten, Flächen, Achsen, Schnittpunkte und Rasterpunkte erkennen.
- Fanghinweise direkt am Cursor anzeigen.
- Achsenbindung und Richtungs-Lock ergänzen.
- Fangtoleranzen zentral definieren und in Bildschirm-/Weltkoordinaten korrekt behandeln.

**Abnahme:** Wiederholbare Fangtests aus verschiedenen Kameraabständen und Modellgrössen bestehen.

### 3. Direkt auf Flächen zeichnen
- Linie, Rechteck, Kreis, Bogen und Freihandprofil direkt auf einer gewählten Fläche starten.
- Zeichenebene aus der Fläche und ihrer Orientierung ableiten.
- Exakte Längen, Radien, Winkel und numerische Eingabe unterstützen.
- Konturen mit vorhandener Skizzen- und Geometrie-Pipeline verbinden.

**Abnahme:** Konturen liegen exakt auf der Ziel-Ebene und bleiben nach Speichern/Wiederöffnen erhalten.

### 4. SketchUp-Kernwerkzeuge
In dieser Reihenfolge entwickeln bzw. vervollständigen:
1. Auswahl
2. Linie
3. Rechteck
4. Kreis und Bogen
5. Drücken/Ziehen (Push/Pull)
6. Verschieben
7. Drehen
8. Versetzen (Offset)
9. Massband/Messen
10. Radieren
11. Farbe/Material
12. Orbit, Pan und Zoom

**Abnahme:** Jedes Werkzeug besitzt klare Maus-/Touch-Abläufe, numerische Eingabe, Abbruch und Undo/Redo. Geometrieänderungen werden gegen mathematische Sollwerte getestet.

### 5. Modellstruktur
- Gruppen und Komponenten in einer konsistenten Hierarchie darstellen.
- Komponenteninstanzen und unabhängige Kopien unterscheiden.
- Tags/Ebenen, Sichtbarkeit und Sperren verbessern.
- Objektliste/Outliner und Eigenschaften auf den aktiven Auswahltyp abstimmen.

**Abnahme:** Gruppen und Komponenten bleiben nach Projekt-Roundtrip korrekt und Undo/Redo verändert keine fremden Objekte.

### 6. Arbeitsoberfläche
- Große, ruhige 3D-Arbeitsfläche.
- Zentrale Werkzeugleiste mit vertrauter SketchUp-artiger Reihenfolge.
- Kontextabhängige Eigenschaften statt überladener Werkzeuglisten.
- Materialien, Komponenten, Tags und Objektstruktur in seitlichen Panels.
- Erweiterte CAD-, Bildstudio- und Druckfunktionen behalten, aber klar getrennt vom Standard-Modellierablauf.

**Abnahme:** Die Hauptaufgaben sind ohne Wechsel durch viele Spezial-Unterseiten erreichbar.

## Technische Leitplanken

- OCCT ist die Quelle exakter B-Rep-Topologie für native OCCT-Körper; Three.js bleibt zunächst Anzeige-/Interaktionsschicht.
- Mesh-Objekte dürfen nicht fälschlich als B-Rep-Flächen/Kanten behandelt werden.
- Für allgemeine Modellbearbeitung ist eine klare Strategie nötig: Mesh-Editierfunktionen, B-Rep-Konvertierung oder ein hybrides Modellobjekt. Die Entscheidung wird anhand gleicher Referenzfälle und Tests getroffen.
- Einheiten bleiben zentral über `src/units.js`; keine neuen lokalen Umrechnungsfaktoren.
- Undo/Redo und Projektformat müssen jede neue Geometrieoperation vollständig erfassen.
- Fehlgeschlagene Geometrieoperationen dürfen das Originalmodell nicht beschädigen.

## Aktueller Umsetzungsstand auf dem Arbeitszweig

- Die erste sichtbare Auswahlhilfe ist im Viewport-Code ergänzt: Nicht ausgewählte Objekte erhalten beim Darüberfahren mit der Maus eine blaue Kontur.
- Die Vorschau wird beim Verlassen des Viewports, beim Start einer Auswahl-/Ziehaktion und im Zeichenmodus entfernt.
- Die Trefferprüfung berücksichtigt nur das tatsächlich vorderste Objekt. Ein dahinterliegendes Objekt darf nicht durch ein ausgewähltes Vordergrundobjekt hindurch hervorgehoben werden.
- Ein Browser-Regressionstest prüft das Erscheinen, die Objektzuordnung und das Entfernen der Kontur.
- Der Browser-Test wurde in dieser Entwicklungsumgebung noch nicht ausgeführt. Der Commit-Status meldet derzeit keine CI-Prüfungen; die Änderung gilt daher noch nicht als verifiziert.

## Nächster konkreter Umsetzungsschritt

Als Nächstes wird das Inferenz-/Fangsystem vorbereitet. Vor einer Änderung werden die vorhandenen Skizzenebenen und Fangpunkte kartiert. Der aktuelle Rasterfang arbeitet in globalen X/Y/Z-Koordinaten; das reicht nicht für ein echtes Zeichnen auf beliebig ausgerichteten Modellflächen. Deshalb werden zuerst Fangziele, Bildschirmtoleranzen und die spätere Flächenebene sauber getrennt, bevor die Zeichenwerkzeuge umgebaut werden. Anschließend folgt ein kleiner, testbarer erster Fangtyp (Endpunkt) und danach das Zeichnen auf ebenen Flächen.

## Definition von „fertig“

SILMO gilt nicht schon dann als SketchUp-ähnlich, wenn die Oberfläche ähnlich aussieht. Die wichtigsten Werkzeuge müssen sich im realen Modellierablauf ähnlich bedienen lassen, geometrisch korrekte Ergebnisse erzeugen, numerische Eingaben unterstützen und zuverlässig mit Speichern, Wiederöffnen und Undo/Redo zusammenarbeiten.
