# SILMO – Spezifikation für Einheiten und Toleranzen

**Stand:** 20.11.2026
**Basis:** Direkte Quellcodeprüfung von index.html, insbesondere Zeilen 1267–1321, 1359–1463, 2846–2860, 3007–3011, 4284–4353 sowie der Projektserialisierung.
**Status:** Ist-Zustand, Migrationsanforderungen und erste Phase-1-Implementierung (PR in Prüfung).

## 1. Verifizierter Ist-Zustand

### 1.1 Interne Längeneinheit

Der Quellcode setzt `MM_PER_UNIT = 10` (index.html, Zeile 1321). Die tatsächliche Umrechnung lautet:

- **1 Three.js-Welteinheit = 10 mm**
- **1 mm = 0,1 Three.js-Welteinheiten**
- Millimeter → interne Koordinate: durch 10 teilen
- interne Koordinate → Millimeter: mit 10 multiplizieren

Das wird im Code konkret bestätigt:
- Druckbettbreite und -tiefe werden durch `MM_PER_UNIT` geteilt (Zeilen 1267–1280).
- Objektabmessungen werden mit `MM_PER_UNIT` in Millimeter umgerechnet (Funktion `currentSizeMM`, Zeilen 1353–1357).
- Der STL-Import behandelt STL-Koordinaten als Millimeter und teilt sie durch `MM_PER_UNIT` (Zeilen 2726–2750).
- Skizzenraster und Skizzenvereinfachung rechnen Millimeterwerte in interne Einheiten um (z. B. Zeilen 3007–3011).

**Korrektur der älteren Projektdokumentation:** Die frühere Formulierung „10 Three.js-Einheiten = 1 mm“ war umgekehrt. Richtig ist **1 Three.js-Einheit = 10 mm**. Masterplan und technische Bestandsaufnahme wurden entsprechend berichtigt.

### 1.2 Aktuelle Geometrie- und Vergleichsschwellen

| Stelle | Quellcodewert | Bedeutung, soweit belegt |
|---|---:|---|
| CSG | `CSG_EPSILON = 1e-5` (Zeile 1362) | BSP-Klassifikation, Ebenen-Schnitt und Filterung degenerierter Dreiecke; Koordinaten sind interne Three.js-Koordinaten. Entspricht bei der aktuellen Skala 0,0001 mm. |
| Skizzenvereinfachung | Standard `toleranceMM = 0.5`; intern `max(0.001, toleranceMM / MM_PER_UNIT)` (Zeilen 3007–3011) | Fachliche Vereinfachungstoleranz in mm mit interner Untergrenze 0,001 Welteinheiten (= 0,01 mm). |
| Druckbettprüfung | `bedTolerance = 1e-5` (Zeilen 3776–3780) | Wird direkt mit internen Weltkoordinaten verglichen; bei aktueller Skala entspricht dies 0,0001 mm. |
| Geometrie-/Skizzenvergleiche | Mehrere Schwellen wie `1e-7`, `1e-6`, `0.01`, `0.02` (u. a. Zeilen 2058–2091, 3207–3227, 3477–3571) | Nicht pauschal als Modelliertoleranz interpretieren. Jede Stelle braucht eine eigene fachliche Zuordnung. |

Die Werte dürfen nicht zu einer einzigen globalen Toleranz zusammengezogen werden. Einige sind geometrische Grenzwerte, andere dienen Vergleich, Vereinfachung, Kamera-/Interaktionsverhalten oder Darstellungsabständen.

## 2. Verbindliche Regeln für die Zielarchitektur

1. Das interne Dokument-/Geometriemodell erhält eine eindeutig dokumentierte Basiseinheit. Die bestehende Anwendung verwendet aktuell Three.js-Einheiten mit 10 mm pro Einheit.
2. Die Umrechnung liegt künftig an einer zentralen, getesteten API-Grenze. Fachmodule dürfen keine eigenen Faktoren wie `/10` oder `*10` verstreut definieren.
3. API-Namen müssen die Richtung eindeutig machen, zum Beispiel `mmToWorldUnits` und `worldUnitsToMm`; der bisherige Name `MM_PER_UNIT` wird wegen möglicher Lesart dokumentiert und nicht ungeprüft übernommen.
4. Einheiten von Punkten, Richtungsvektoren, Winkeln, Flächen, Volumen, Mesh-Tessellierung und Toleranzen werden ausdrücklich unterschieden.
5. Winkel werden nicht mit Längenfaktoren umgerechnet. Für den Geometriekern sind Winkel in Radiant nur dann verbindlich, wenn die jeweilige API dies dokumentiert.
6. Exakte CAD-Geometrie und Darstellungsmesh bleiben getrennt. Tessellierungsabweichung ist keine Modelliertoleranz.
7. Import-/Heilungstoleranzen gehören zum jeweiligen Import-/Reparaturvorgang und dürfen nicht unbemerkt die Dokumentgeometrie verändern.
8. Bestehende v90-Projekte behalten ihre gespeicherten Koordinaten. Eine Umstellung des internen Massstabs benötigt ein explizites, getestetes Dokumentformat-Migrationsverfahren.
9. Jeder neue Toleranzwert braucht eine dokumentierte fachliche Begründung, Einheit, betroffene Operation und positive/negative Grenzfalltests.
10. Ein Kernel darf seine eigene interne Toleranzverwaltung haben; die SILMO-Adapter-Schicht muss die verwendeten Werte und Einheiten jedoch explizit übergeben oder dokumentieren.

## 3. Quellcode-Inventar der vorhandenen Toleranzen

Die folgenden Werte wurden direkt im aktuellen `index.html` geprüft. Sie werden hier bewusst klassifiziert und noch nicht vereinheitlicht. Unterschiedliche Einheiten und Zwecke dürfen nicht in einen einzigen globalen Wert umgewandelt werden.

| Fundstelle / Funktion | Aktueller Wert | Tatsächliche Bedeutung | Einordnung |
|---|---:|---|---|
| `CSG_EPSILON`, BSP-Klassifikation | `1e-5` Welteinheiten | Ebenen-/Polygonklassifikation und Filterung degenerierter CSG-Flächen; entspricht bei aktueller Skala `0,0001 mm` | Geometriekern-Toleranz |
| Objektverteilung | `1e-7` Welteinheiten | Kleine negative Restlücke wird als Rundungsrest behandelt; entspricht `0,000001 mm` | Numerische Vergleichsschwelle |
| Objekt-Ausrichtung | `1e-8` Welteinheiten | Delta darunter gilt als unverändert; entspricht `0,0000001 mm` | Numerische Vergleichsschwelle |
| Skizzenvereinfachung | Standard `0,5 mm`, Untergrenze `0,01 mm` | Fachliche Ramer-Douglas-Peucker-Abweichung, danach Umrechnung in Welteinheiten | Benutzer-/Geometriequalität, keine Kernel-Epsilon |
| Skizzenpunkt-Abstände | z. B. `0,015` und `0,02` Welteinheiten | Mindestabstand beim interaktiven Zeichnen; entspricht `0,15 mm` bzw. `0,2 mm` | Interaktions-/Eingabegrenze |
| Vorschauversatz | `0,025` Welteinheiten | Zeichenvorschau liegt leicht über der Skizzenebene; entspricht `0,25 mm` | Darstellung, keine Geometrietoleranz |
| Hohlrahmen-Konstruktion | `1e-5`, `0,0001`, `0,02` an verschiedenen Stellen | Prüft kurze Kontursegmente, Flächen und Offset-Schnittpunkte; mehrere unterschiedliche Kriterien | Fachliche Konturvalidierung; einzeln zu testen |
| Druckbettprüfung | `1e-4` Welteinheiten | Erlaubter Bounding-Box-Rundungsrand; entspricht `0,001 mm` | Druckbett-/Importvergleich |
| Mesh-Druckprüfung | `1e-5` Quantisierung; `1e-8` Welteinheiten² für degenerierte Dreiecke | Eckpunkte werden zur Kanten-Zuordnung quantisiert; Dreiecksfläche wird separat geprüft | Mesh-Analyse; Längen- und Flächenschwellen getrennt halten |
| Image-Studio-Konturen | `1,1` Pixel beim Konturvereinfachen | Vereinfachung erfolgt vor der Umrechnung auf reale Millimeter | Bild-/Pixelraum, nicht CAD-Kernel |
| Image-Studio-Druckkonturen | `0,01 mm²` Flächenminimum; `0,8 mm` Mindestwand | Konturen werden vor dem 3D-Aufbau bereits in reale Millimeter abgebildet | Fertigungs-/Druckbarkeitsregel |

### Konsequenzen für die Migration

- Werte mit gleicher Schreibweise können verschiedene Dimensionen haben: Längen, Flächen, Winkel, Pixel oder dimensionslose Faktoren.
- `1e-8` in einer Orientierungsprüfung ist nicht austauschbar mit `1e-8` als Flächenschwelle.
- Bildraumtoleranzen dürfen nicht mit Modellkoordinaten vermischt werden.
- Druckbarkeitsregeln wie die Mindestwand von `0,8 mm` sind fachliche Anforderungen und keine numerischen Kernel-Epsilons.
- Der Z-Vorschauversatz von `0,025` ist eine Darstellungsentscheidung und darf nicht als Modellgenauigkeit ausgegeben werden.
- Vor jeder Änderung muss die jeweilige Schwelle mit positiven und negativen Grenzfällen im Browser oder als mathematischer Unit-Test abgesichert sein.


### 3.1 Bildkontur- und Lernkurs-Schwellen

| API-Konstante | Wert | Dimension / Zweck |
|---|---:|---|
| `IMAGE_POLYGON_RAY_DENOMINATOR_FALLBACK_PX` | `1e-12` | Pixel-Differenz; Fallback bei nahezu horizontaler Polygonkante im Punkt-in-Polygon-Test |
| `IMAGE_SEGMENT_BOUNDS_EPSILON_PX` | `1e-8` | Pixel; Einschlussrand für Punkt-auf-Segment-Prüfung |
| `IMAGE_SEGMENT_ORIENTATION_EPSILON_PX2` | `1e-8` | Pixel²; Kollinearitätsgrenze des 2D-Kreuzprodukts |
| `IMAGE_POLYGON_MIN_EDGE_PX` | `1e-5` | Pixel; Mindestlänge einer Polygonkante |
| `IMAGE_POLYGON_MIN_NONADJACENT_GAP_PX` | `1e-7` | Pixel; Mindestabstand nicht benachbarter Polygonsegmente |
| `IMAGE_MIN_WALL_COMPARISON_EPSILON_MM` | `1e-6` | Millimeter; Vergleichsrand bei der Prüfung der Mindestwand zwischen Konturen |
| `TUTORIAL_POSITION_CHANGE_WORLD_UNITS` | `1e-5` | interne Welteinheiten; erkennt Positionsänderungen für die Lernkurs-Erfolgskontrolle |

Die Bildkontur-Schwellen sind bewusst nicht als CAD-Weltkoordinaten benannt. Pixelraum, Pixel² und Millimeter bleiben getrennt. Der Lernkurswert prüft eine Interaktionsänderung und ist keine Fertigungstoleranz.

### 3.2 Weitere einzeln benannte Kontur- und Skizzenschwellen

| Rastergrenzen | `GRID_BOUNDARY_EPSILON_WORLD_UNITS` | `1e-8` | interne Welteinheiten; nur Einschluss des letzten Rasterpunkts an der Bettkante |
| Gruppenrotation | `GROUP_ROTATION_MIN_RADIANS` | `1e-12` | Radiant; ignoriert numerisch vernachlässigbare Rotationsänderungen |
| Profil-Quellabmessung | `PROFILE_MIN_SOURCE_DIMENSION_WORLD_UNITS` | `1e-6` | interne Welteinheiten; verhindert Skalierung aus praktisch nullgrossen Ausgangsabmessungen |
| Skizzenprofil-Schliessung | `SKETCH_PROFILE_CLOSURE_WORLD_UNITS` | `1e-7` | interne Welteinheiten; entfernt den doppelten Endpunkt einer geschlossenen Profilkontur |
| Strahl-/Skizzenebenen-Nenner | `SKETCH_RAY_PARALLEL_DENOMINATOR_MIN` | `1e-6` | Schwelle des algebraischen Nenners; keine direkte Längenangabe |


Bei der weiteren Quellcodeprüfung wurden zusätzliche Schwellen in klar begrenzten Funktionen zugeordnet. Die bisherigen Zahlenwerte wurden nicht verändert:

| API-Konstante | Wert | Dimension / Zweck |
|---|---:|---|
| `CONTOUR_FRAME_MIN_EDGE_WORLD_UNITS` | `1e-5` | Mindestlänge einer Kante beim Aufbau eines Kontur-Hohlrahmens |
| `CONTOUR_FRAME_PARALLEL_CROSS_MIN` | `1e-5` | dimensionsloser Kreuzprodukt-Grenzwert zur Erkennung nahezu paralleler Kantenrichtungen |
| `CONTOUR_FRAME_MIN_NORMAL_WORLD_UNITS` | `1e-5` | Mindestlänge des kombinierten Normalenvektors an einem Konturknick |
| `CONTOUR_FRAME_MIN_AREA_WORLD_UNITS2` | `1e-4` | Mindestfläche der äusseren und inneren Hohlrahmen-Kontur |
| `SKETCH_OUTLINE_MIN_AREA2_WORLD_UNITS2` | `1e-7` | Grenzwert für den doppelt orientierten Flächeninhalt der editierbaren Skizzenkontur |
| `SKETCH_OUTLINE_MIN_EDGE_WORLD_UNITS` | `1e-5` | Mindestabstand benachbarter editierter Skizzenpunkte |
| `CAD_PATH_MIN_DIRECTION_WORLD_UNITS` | `1e-6` | Mindestlänge einer Pfadrichtung vor der Richtungs-/Quaternionenberechnung |
| `PROFILE_MIN_PERIMETER_WORLD_UNITS` | `1e-6` | Mindestumfang einer Profilkontur vor der Resampling-Operation |

Diese Konstanten sind bewusst getrennt: Der Kreuzproduktwert ist dimensionslos, die Flächenwerte sind keine Längen, und die übrigen Werte prüfen unterschiedliche geometrische Bedingungen. Die Zuordnung ist eine Benennung des bestehenden Verhaltens, keine neue globale Genauigkeitsgarantie.

## 4. Zielstruktur der zentralen API

Die API soll mindestens folgende getrennte Aufgaben anbieten:

- Längen: mm ↔ interne Modellkoordinaten
- Flächen und Volumen: aus der Basiseinheit korrekt abgeleitete Einheiten
- Winkel: Grad ↔ Radiant, falls beide Einheiten in der Oberfläche verwendet werden
- Modell-/Kernel-Toleranzen: Operationen und Einheiten explizit benennen
- Skizzenvereinfachung: eigener fachlicher Wert, nicht mit Kernel-Toleranz vermischen
- Tessellierung: Darstellungsqualität getrennt von exakter Geometrie
- Import-/Heilungstoleranz: nur für den jeweiligen Austausch-/Reparaturschritt

Es werden hier bewusst keine neuen globalen Zahlenwerte festgelegt. Die bestehenden Schwellen müssen zuerst vollständig mit ihren Aufrufstellen und Tests inventarisiert werden.

## 5. Erste Implementierung in Phase 1

- `src/units.js` stellt eine unveränderliche, zentrale API bereit: `mmToWorldUnits`, `worldUnitsToMm`, `mm2ToWorldUnits2`, `worldUnits2ToMm2`, `mm3ToWorldUnits3` und `worldUnits3ToMm3`.
- Die bestätigte Basisskala bleibt unverändert: 1 Three.js-Welteinheit = 10 mm.
- `src/tolerances.js` stellt die bereits inventarisierten, fachlich getrennten Schwellen unveränderlich bereit: CSG-Geometrie, Ausrichtungs-/Änderungsschwellen, Mindestwert der Skizzenvereinfachung, Skizzen-Druckbettgrenze sowie Druckbett- und Dreiecksprüfung.
- Die ersten produktiven Aufrufstellen verwenden diese benannten Werte. Die Zahlen bleiben gegenüber dem vorherigen Stand unverändert; die Änderung macht ihren Zweck und ihre Einheit sichtbar.
- `index.html` lädt das Modul synchron vor dem CAD-Hauptskript. Die Längen- und Flächenumrechnungen im CAD-Hauptskript verwenden jetzt die passenden API-Funktionen; der alte `MM_PER_UNIT`-Kompatibilitätsalias wurde nach der vollständigen Migration der bisherigen Verwendungen entfernt.
- Die zentrale API wird für die Anzeige von Objektabmessungen, die präzise X-/Y-Positionierung von Skizzen, Druckbett-/Rastermasse, Skizzenbegrenzung, Skizzenvereinfachung, Eingabedimensionen, STL-Import/-Export, Ausrichtung/Abstandsverteilung, Tastaturschritte und Druckbett-/Druckmassenausgabe verwendet.
- Die bisherigen direkten Verwendungen des Faktors wurden einzeln auf die API umgestellt. Eine Quellcodeprüfung bestätigt, dass `MM_PER_UNIT` in `index.html` nicht mehr verwendet wird und keine direkten `* 10`-/`/ 10`-Längenkonvertierungen übrig sind.
- `tests/units.test.cjs` prüft Längen, negative und gebrochene Werte, Flächenfaktoren und Unveränderlichkeit; `tests/tolerances.test.cjs` sichert die inventarisierten Toleranzwerte und ihre Unveränderlichkeit. Der Code-Check-Workflow führt beide Tests aus.
- Die App-Metadaten tragen auf dem Implementierungsbranch die Version v93. Die Produktionsversion bleibt bis zur Review und zum Merge unverändert.

## 6. Migrations- und Testanforderungen

### Referenzkonvertierungen
- 10 mm müssen exakt 1,0 interne Welteinheit ergeben.
- 1 mm muss exakt 0,1 interne Welteinheiten ergeben.
- 200 mm Druckbettbreite müssen intern 20 Einheiten ergeben.
- Ein Objekt mit 2 internen Einheiten Kantenlänge muss als 20 mm gemessen werden.
- Beim STL-Export müssen interne Koordinaten und Translationen gemeinsam in Millimeter überführt werden.

### Regression
- Bestehende v90-Projektdateien müssen ohne Positions-/Grössenänderung geöffnet werden.
- Speichern und Wiederöffnen darf keine Einheitenverschiebung verursachen.
- Skalierung bleibt dimensionslos und wird nicht nochmals mit dem Längenfaktor multipliziert.
- Rotationen bleiben unverändert.
- Boolesche Operationen, Skizzen, Extrusion, Hohlkörper und Druckbettprüfung werden mit den bisherigen Referenzfällen verglichen.

### Abnahme
- Alle Umrechnungsfunktionen haben Unit-Tests mit exakten einfachen Referenzwerten.
- Grenzfalltests prüfen Null, negative Werte, ungültige Werte und sehr grosse Werte entsprechend den jeweiligen API-Verträgen.
- Browser-Tests prüfen, dass die Oberfläche dieselben Millimeterwerte zeigt und dieselben STL-Abmessungen exportiert.
- Kein bestehendes Projekt wird durch die neue API stillschweigend skaliert.

## 7. Offene Quellcodeprüfung

- Alle Längen- und Abstandsgrenzen in index.html einer Einheit zuordnen.
- Prüfen, welche Schwellen numerische Stabilität und welche nur UI-/Interaktionsabstände betreffen.
- Weitere Druck- und Skizzen-Schwellen mit ihren jeweiligen Aufrufstellen fachlich zuordnen.
- Quellcodeprüfung der übrigen Einheitenkonvertierungen fortsetzen; STL-Import ist bereits verifiziert.
- Prüfen, ob Projektformat v3 die Basiseinheit explizit speichert oder sie nur implizit voraussetzt.
- Testfälle für alle Einheiten-Grenzen aus dem vorhandenen Browser-Test und den Diagnosefunktionen ableiten.

## 8. Quellen

- `index.html`: Zeilen 1267–1321 (Druckbett und Umrechnungsfaktor)
- `index.html`: Zeilen 1353–1357 (Objektabmessungen in mm)
- `index.html`: Zeilen 1359–1540 (BSP-CSG und `CSG_EPSILON`)
- `index.html`: Zeilen 2846–2860 (STL-Export in Millimetern)
- `index.html`: Zeilen 3007–3011 (Skizzenvereinfachung)
- `index.html`: Zeilen 1678–1875 (Geometrie- und Projektserialisierung; Projektversion 3)
- [Technische Bestandsaufnahme v90](SILMO_CURRENT_STATE_AUDIT.md)
- [Funktions- und Abhängigkeitsmatrix](SILMO_FUNCTION_DEPENDENCY_MATRIX.md)
- [Masterplan](SILMO_MASTERPLAN.md)


### 3.3 Skizzen- und Kontur-Interaktionsschwellen

Die folgende Gruppe wurde beim weiteren Audit in den CAD-Skizzenfunktionen gefunden. Die bisherigen Zahlenwerte bleiben unverändert; die Konstantennamen unterscheiden Eingabeabstand, Konturabschluss, Vorschau und mathematische Degenerationsgrenzen.

| API-Konstante | Wert | Dimension / Zweck |
|---|---:|---|
| `SKETCH_POLYLINE_SAMPLE_MIN_DISTANCE_WORLD_UNITS` | 0,015 | Welteinheiten; Mindestabstand für neu aufgenommene Punkte bei interaktiver Skizzenlinien-Eingabe |
| `SKETCH_POLYLINE_MIN_LENGTH_WORLD_UNITS` | 0,02 | Welteinheiten; Mindestlänge einer fertigen Skizzenlinie/-kurve |
| `SKETCH_DRAW_POINT_MIN_DISTANCE_WORLD_UNITS` | 0,02 | Welteinheiten; Mindestabstand aufeinanderfolgender Punkte beim interaktiven Zeichnen |
| `SKETCH_PREVIEW_OFFSET_WORLD_UNITS` | 0,025 | Welteinheiten; Z-Versatz für die 2D-Skizzenvorschau, keine Modelliertoleranz |
| `CLICK_CONTOUR_CLOSE_DISTANCE_WORLD_UNITS` | 0,025 | Welteinheiten; Abstand zum ersten Punkt, ab dem eine Klickkontur geschlossen wird |
| `CLICK_CONTOUR_POINT_MIN_DISTANCE_WORLD_UNITS` | 0,01 | Welteinheiten; Mindestabstand zwischen aufgenommenen Klickkonturpunkten |
| `CLICK_CONTOUR_STRAIGHTEN_MIN_DISTANCE_WORLD_UNITS` | 0,0001 | Welteinheiten; ignoriert nahezu nullgrosse Schritte beim 45°-Ausrichten von Konturpunkten |
| `SKETCH_POLYLINE_DEGENERATE_LENGTH_SQUARED_WORLD_UNITS2` | 1e-12 | Welteinheiten²; Nenner-Fallback bei nahezu punktförmigen Segmenten der RDP-Skizzenvereinfachung |
| `FREEFORM_MIN_AREA_WORLD_UNITS2` | 0,0001 | Welteinheiten²; Mindestfläche einer geschlossenen Freiform vor Extrusion |

Diese Werte sind keine globalen CAD-Genauigkeitsversprechen. Insbesondere Vorschauversatz, Punktaufnahme und Konturabschluss sind Bedien-/Darstellungsregeln und bleiben getrennt von CSG- und Druckbett-Toleranzen.


### 3.4 Bild-Studio: eindeutig zugeordnete Druckbarkeitsgrenzen

| API-Konstante | Wert | Dimension / Zweck |
|---|---:|---|
| `IMAGE_MIN_COMPONENT_AREA_FRACTION` | 0,000025 | Dimensionsloser Anteil der Bildfläche; Mindestgrösse einer erkannten zusammenhängenden Bildkomponente (zusätzlich mindestens 4 Pixel) |
| `IMAGE_MIN_PRINT_CONTOUR_AREA_MM2` | 0,01 | mm²; Mindestfläche einer auf reale Modellmasse abgebildeten Aussen-/Innenkontur vor der CAD-Übergabe |
| `IMAGE_MIN_WALL_THICKNESS_MM` | 0,8 | mm; Mindestmaterialstärke zwischen Aussparungen sowie zwischen Aussparung und Aussenkante |

Die Flächenschwelle in `polygonIsSimple` wird ausschliesslich innerhalb von `validatePrintableContours` auf bereits auf reale Modellmasse abgebildete Konturen angewendet. Sie ist deshalb als `IMAGE_MIN_SIMPLE_POLYGON_AREA_MM2` mit 0,01 mm² benannt und getestet.
