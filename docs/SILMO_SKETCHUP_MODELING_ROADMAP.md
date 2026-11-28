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

## Neue Umsetzung: Modellier-Kürzel

- Die vorhandenen Skizzierwerkzeuge sind jetzt direkt über die SketchUp-orientierten Tasten erreichbar: **L** Linie, **R** Rechteck, **C** Kreis.
- Die Kürzel aktivieren den Zeichenmodus automatisch. Ein Werkzeugwechsel während des Zeichnens startet die Skizze nicht erneut.
- **Escape** beendet den aktiven Zeichenmodus.
- Es werden vorhandene Skizzierwerkzeuge verwendet; keine bestehende CAD-Funktion wurde entfernt.
- Browser-Regressionstests prüfen alle drei Kürzel sowie Escape. Der neue Testlauf muss noch erfolgreich abgeschlossen werden.

## Nächster konkreter Umsetzungsschritt

Als Nächstes wird das Inferenz-/Fangsystem vorbereitet. Vor einer Änderung werden die vorhandenen Skizzenebenen und Fangpunkte kartiert. Der aktuelle Rasterfang arbeitet in globalen X/Y/Z-Koordinaten; das reicht nicht für ein echtes Zeichnen auf beliebig ausgerichteten Modellflächen. Deshalb werden zuerst Fangziele, Bildschirmtoleranzen und die spätere Flächenebene sauber getrennt, bevor die Zeichenwerkzeuge umgebaut werden. Anschliessend folgt ein kleiner, testbarer erster Fangtyp (Endpunkt) und danach das Zeichnen auf ebenen Flächen.

## Definition von „fertig“

SILMO gilt nicht schon dann als SketchUp-ähnlich, wenn die Oberfläche ähnlich aussieht. Die wichtigsten Werkzeuge müssen sich im realen Modellierablauf ähnlich bedienen lassen, geometrisch korrekte Ergebnisse erzeugen, numerische Eingaben unterstützen und zuverlässig mit Speichern, Wiederöffnen und Undo/Redo zusammenarbeiten.

## Browser-Test-Fix – 22. November 2026

- Der Browser-Workflow ist beim Hover-Auswahltest fehlgeschlagen: Die blaue Kontur wurde innerhalb des 3-Sekunden-Zeitlimits nicht sichtbar.
- Die allgemeinen Code-Checks waren erfolgreich; der 24'999-Punkte-Geometrie-Roundtrip war ebenfalls erfolgreich.
- Ursache noch nicht abschliessend bewiesen. Der Hover-Code deaktiviert die Vorschau absichtlich im Zeichenmodus. Der Browser-Test kann Zustand aus vorangegangenen Tests übernehmen.
- Testanpassung auf dem Feature-Branch: Vor der Hover-Prüfung wird ein eventuell noch aktiver Zeichenmodus über die normale UI beendet.
- Diese Anpassung ist noch nicht erneut durch CI bestätigt. Keine Aussage, dass der Browser-Test jetzt bestanden ist.

## Isolierter Modellier-Kurztest – 22. November 2026

- Hover-Erkennung prüft jetzt rekursiv auch Kind-Meshes und ordnet einen Treffer dem obersten SILMO-Szenenobjekt zu. So wird bei Gruppen nicht versehentlich nur ein Unter-Mesh hervorgehoben.
- Die Testpunkt-Ermittlung verwendet dieselbe rekursive Trefferlogik.
- Ein eigener Playwright-Kurztest prüft unabhängig vom grossen Browser-Szenario: L/R/C/Escape, blaue Hover-Kontur inklusive korrekter Objektzuordnung und freies Ziehen eines ausgewählten Objekts.
- Der Kurztest speichert bei Erfolg oder Fehler einen Screenshot als CI-Artefakt.
- Allgemeine Code-Checks: erfolgreich.
- Der isolierte Browser-Kurztest ist erfolgreich durchgelaufen: L/R/C/Escape, blaue Hover-Kontur mit korrekter Objektzuordnung und freies Objektziehen bestanden.
- Der grosse Browser-Workflow stoppt weiterhin an einem bereits vorher vorhandenen Test zur OCCT-Kantenerkennung (14-Pixel-Bildschirmtoleranz, Testzeile 598); der neue Kurztest läuft davor erfolgreich. WebKit wird wegen dieses vorherigen Chromium-Fehlers in diesem Workflow nicht mehr gestartet.
- Zeichnen direkt auf Objektflächen und Push/Pull sind weiterhin noch nicht implementiert. Der nächste Umsetzungsschritt ist die lokale Zeichenebene auf einer tatsächlich getroffenen ebenen Fläche; erst danach wird die Extrusion entlang der Flächennormalen umgesetzt.
- Der Kurztest wurde anschliessend erweitert, um zusätzlich einen Screenshot genau während der sichtbaren Hover-Kontur zu speichern; diese Screenshot-Erweiterung wartet noch auf einen eigenen CI-Lauf.

## Fokuswechsel: SketchUp zuerst, Spezialfunktionen im Hintergrund – 22. November 2026

Der Standardarbeitsbereich wird auf den häufigsten SketchUp-Modellierablauf ausgerichtet. Spezialfunktionen bleiben im Projekt erhalten, sollen aber nicht mehr den Einstieg und die normale Modellierfläche überladen.

### Im Vordergrund
- **Modellieren:** Grundkörper als Startformen, Objektliste und Duplizieren.
- **Zeichnen:** Linie, Rechteck, Kreis, Bogen und später direkt auf Modellflächen.
- **Bearbeiten:** Auswahl, Verschieben, Drehen, Skalieren, Kopieren und später Drücken/Ziehen.
- **Direkte Interaktion im 3D-Fenster:** Hover-Kontur, Flächen-/Kantenauswahl und intelligentes Fangen.
- **Präzision:** Masseingabe, Achsenbindung, Fangpunkte und Undo/Redo.
- **Ansicht:** Orbit, Pan und Zoom müssen beim Modellieren schnell erreichbar sein.

### Im Hintergrund – behalten, nicht löschen
- Boolesche Vereinigung, Abziehen und Schnittmenge: erweiterte CAD-Formoperationen.
- Loft, Sweep, Hohlrahmen und spezialisierte Kontur-/Wandfunktionen: Spezialwerkzeuge.
- OCCT-Diagnose und technische Prüfungen: Expertenzentrum.
- STL-/STEP-Import und -Export sowie Projektdatei-Funktionen: Projektbereich.
- Druckbett, Druckvorprüfung und Druckausrichtung: eigener 3D-Druck-Bereich.
- Bildstudio: eigener separater Bereich.
- Erweiterte Mess- und Analysefunktionen: Messen & Prüfen.

### Erste konkrete UI-Änderung
- Der bisherige Hauptreiter **„Erstellen“** heisst jetzt **„Modellieren“**.
- Die booleschen CAD-Operationen wurden aus dem normalen Modellierbereich in einen aufklappbaren Abschnitt **„Erweiterte CAD-Formoperationen“** im Expertenzentrum verschoben.
- Die vorhandenen Schaltflächen und Handler bleiben erhalten; es wurde keine Funktion gelöscht.
- Das ist eine erste, begrenzte Umordnung. Weitere Spezialwerkzeuge werden erst nach Prüfung ihrer Abhängigkeiten verschoben, damit keine bestehenden Arbeitsabläufe kaputtgehen.

### Nächste Entwicklungspriorität
Nach dieser Aufräumrunde geht es nicht um zusätzliche Spezialfunktionen, sondern um den eigentlichen SketchUp-Kern: **auf Flächen zeichnen → Kontur auswählen → Drücken/Ziehen → mit Fangpunkten und numerischen Eingaben präzisieren**.

## Verbindliche Fortschrittsmessung – 22. November 2026

Die Prozentanzeige wird bewusst streng und konservativ geführt. Sie ist keine Schätzung, wie viel Code bereits geschrieben wurde, sondern misst den Weg zum vom Projektinhaber definierten Endziel.

**100 % bedeutet erst dann:**
1. Alle für SILMO vorgesehenen SketchUp-Funktionen sind umgesetzt.
2. Jede Funktion wurde einzeln getestet.
3. Die Funktionen funktionieren auch zusammen in vollständigen Modellierabläufen.
4. Geometrie, Fangverhalten, numerische Eingaben, Undo/Redo sowie Speichern/Wiederöffnen sind zuverlässig geprüft.
5. Die vollständige Benutzeroberfläche wurde vom Projektinhaber praktisch geprüft und ausdrücklich als zufriedenstellend bestätigt.

**Bewertungsregeln:**
- Nicht implementierte Funktionen zählen nicht als fertig.
- Implementierte, aber nicht erfolgreich getestete Funktionen zählen nicht als verifiziert.
- Fehlgeschlagene oder noch laufende Tests erhöhen den Fortschritt nicht.
- Eine reine Code-Prüfung ersetzt keinen Funktionstest.
- Fortschritt wird in kleinen, nachweisbaren Schritten erhöht; bei Regressionen kann er auch sinken.
- Bei jeder Entwicklungsrückmeldung werden Gesamtfortschritt und aktueller Arbeitsschritt getrennt angezeigt.
- Die Prozentwerte sind eine konservative Projektmessung anhand der Roadmap, keine Behauptung einer mathematisch exakten Gleichheit mit SketchUp.

**Aktuelle konservative Gesamteinschätzung:** 10 %. Der zusätzliche Prozentpunkt basiert auf dem Ende-zu-Ende verifizierten Schnittpunktfang mit zwei realen 3D-Testkörpern sowie erfolgreich abgeschlossenen Code- und Browser-Prüfungen in Chromium und Safari-kompatiblem WebKit. Die Prozentzahl bleibt bewusst niedrig: Zahlreiche SketchUp-Kernwerkzeuge, die vollständige Modellierabdeckung und die persönliche UI-Abnahme fehlen noch. Frühere Prozentangaben sind historische Zwischenstände.

## Erster Fangtyp: sichtbare Modell-Eckpunkte – 24. November 2026

- Im Zeichenbereich gibt es nun einen separaten Schalter für den Eckpunktfang; der vorhandene Rasterfang bleibt unabhängig davon erhalten.
- Beim Zeichnen werden sichtbare Mesh-Eckpunkte auf der aktiven Zeichenebene innerhalb einer Bildschirmtoleranz von 12 Pixeln gesucht.
- Verdeckte Eckpunkte werden durch einen zusätzlichen Sichtbarkeitstest verworfen.
- Ein grüner Punkt markiert die tatsächlich eingerastete Position.
- Die Kandidatensuche ist pro Zeichenstart zwischengespeichert und auf höchstens 6'000 Modellpunkte begrenzt.
- Unit-Tests decken die Bildschirmdistanz, Toleranzgrenze, ungültige Kandidaten und Sichtbarkeitsfilterung ab.
- Ein fokussierter Browser-Test prüft das Einrasten auf einer ausgewählten Würfelfläche. Der vollständige Browser-Workflow wurde am 24. November 2026 erfolgreich abgeschlossen: Chromium und Safari-kompatibles WebKit bestanden. Auch die Code-Prüfungen waren erfolgreich.

## Verifizierter Fang-/Zeichen-Meilenstein – 24. November 2026

- Der Eckpunktfang und der Rasterfang sind getrennt schaltbar. Der Regressionstest deaktiviert den Eckpunktfang gezielt, wenn ausschliesslich das 5-mm-Raster geprüft wird.
- Code-Prüfungen: erfolgreich.
- Isolierte SketchUp-Modellierinteraktionen: erfolgreich.
- Vollständige Browserinteraktionen in Chromium: erfolgreich.
- Vollständige Browserinteraktionen in Safari-kompatiblem WebKit: erfolgreich.
- Der Branch bleibt in Draft-PR #74. Es wurde nichts gemergt oder veröffentlicht.

## Zweiter Fangtyp: sichtbare Kanten-Mittelpunkte – 24. November 2026

- Der Fangalgorithmus erkennt Mittelpunkte von Randkanten und scharfen Modellkanten.
- Doppelte Mesh-Vertices werden vor der Kantenanalyse innerhalb einer kleinen geometrischen Toleranz zusammengeführt.
- Koplanare Dreiecksdiagonalen werden nicht als Modellkanten behandelt.
- Eckpunktfang und Kantenmittefang besitzen getrennte, standardmässig aktivierte Schalter.
- Die Kandidaten werden in Weltkoordinaten transformiert, auf die aktive Zeichenebene begrenzt und durch einen Sichtbarkeitstest gefiltert.
- Der grüne Fangmarker zeigt auch bei Kantenmitten die tatsächlich verwendete Position.
- Unit-Tests prüfen ein trianguliertes flaches Viereck, scharfe Kanten mit duplizierten Vertices sowie ungültige/degenerierte Geometrie.
- Der fokussierte Modellier-Browser-Test prüft Eckpunkt- und Kantenmittefang. Die Rasterprüfung schaltet beide Fangtypen gezielt aus, damit die Fangsysteme unabhängig getestet werden.
- Code-Prüfungen sowie vollständige Browserinteraktionen in Chromium und Safari-kompatiblem WebKit sind erfolgreich abgeschlossen (Workflow 45456547678). Auch der isolierte SketchUp-Modelliertest war erfolgreich.

## Dritter Fangtyp: Projektion auf sichtbare Modellkanten – 27. November 2026

- Ein eigener Schalter aktiviert die Projektion auf scharfe Modellkanten; Eckpunkt-, Kantenmitte- und Rasterfang bleiben unabhängig schaltbar.
- Die Kanten werden aus der Mesh-Geometrie ermittelt und für die Bildschirmprojektion auf die aktive Zeichenebene abgebildet.
- Die Mausposition wird auf das nächstgelegene sichtbare Kantensegment projiziert; die Position wird perspektivisch korrekt entlang des 3D-Segments interpoliert.
- Der Sichtbarkeitstest verwendet die ursprüngliche 3D-Kante, damit eine Projektion nicht versehentlich durch verdeckte Kanten ausgelöst wird.
- Unit-Tests prüfen Segmentprojektion, Interpolation, Endpunktbegrenzung, Pixel-Toleranz sowie ungültige und abgewiesene Segmente. Ein zusätzlicher Test prüft die perspektivisch korrekte Interpolation bei unterschiedlichen Kameratiefen.
- Der fokussierte Modellier-Browser-Test prüft die Projektion auf einer ausgewählten Fläche; die Testhilfe verwendet dieselbe Nächstsegment- und Sichtbarkeitsregel wie die Laufzeitfunktion.
- **Verifiziert:** Code-Prüfungen erfolgreich (Workflow 46034339121). Isolierter Modellier-Test erfolgreich; vollständige Browserinteraktionen in Chromium und Safari-kompatiblem WebKit erfolgreich (Workflow 46034339249).
- Der Browserlauf bestätigte zusätzlich den 24'999-Punkte-Geometrie-Roundtrip mit identischen Positionen, Normalen, UV-Koordinaten und Indizes sowie fünf zusätzliche OCCT-Ladezyklen.
- Das Test-Screenshot-Artefakt wurde erfolgreich hochgeladen. Es ist ein CI-Artefakt und keine hier eingebettete Live-Aufnahme.
- Der Branch bleibt in Draft-PR #74. Kein Merge und keine Veröffentlichung.

## Vierter Fangtyp: Schnittpunkte sichtbarer Modellkanten – 28. November 2026

- Eine neue reine Geometrie-Hilfsfunktion `findSegmentIntersections` erkennt innere Kreuzungen zweier projizierter Kantensegmente.
- Parallele, kollineare und reine Endpunktkontakte werden nicht als Schnittpunkte ausgegeben.
- Ein Bildschirmkreuzungspunkt wird nur akzeptiert, wenn die perspektivisch interpolierten 3D-Punkte der beiden Kanten räumlich höchstens 0,5 mm auseinanderliegen.
- Die Interpolation berücksichtigt unterschiedliche Kameratiefen. Die resultierende Fangposition wird aus den räumlich passenden Punkten gebildet.
- Der Schnittpunktfang hat einen eigenen Schalter und ist standardmässig ausgeschaltet, damit bestehende Zeichenabläufe und Rastertests unverändert bleiben.
- Zur Laufzeit werden nur nahe Kantensegmente betrachtet; die Kandidatenmenge wird vor der paarweisen Schnittprüfung auf höchstens 64 Segmente begrenzt.
- Der Schnittpunkt wird zusätzlich mit der vorhandenen Sichtbarkeitsprüfung kontrolliert und konkurriert anhand des Bildschirmabstands mit den anderen Fangtypen.
- Die Fangarten werden bei nahezu gleichem Bildschirmabstand stabil priorisiert: Eckpunkt, Schnittpunkt, Kantenmitte, Kantenprojektion. Ein deutlich näherer Treffer gewinnt weiterhin unabhängig vom Typ. Die Tie-Band-Toleranz beträgt 0,35 Pixel.
- Unit-Tests prüfen korrekte Kreuzungen, parallele/kollineare/Endpunktfälle, räumlich auseinanderliegende Kanten und perspektivische Interpolation.
- Ein Ende-zu-Ende-Browser-Test erstellt zwei echte, flache Mesh-Quader in der Szene, richtet den Schnittpunktfang ein, bewegt den Mauszeiger auf den geometrischen Schnittpunkt und prüft den tatsächlich gesetzten Fangmarker samt Weltkoordinaten. Anschliessend werden die Testkörper entfernt und die Fangschalter zurückgesetzt.
- **Verifiziert:** Code-Prüfungen für Commit `606ea3f` erfolgreich (Workflow 46120288500). Der vollständige Browser-Workflow 46120288527 ist ebenfalls erfolgreich abgeschlossen: isolierte Modellierinteraktionen, Screenshot-Artefakt, Chromium und Safari-kompatibles WebKit bestanden.
- **Ende-zu-Ende bestätigt:** Der Browser-Test erzeugt zwei reale Mesh-Testkörper, prüft den aktiven Fangmarker und vergleicht dessen 3D-Weltposition mit dem erwarteten gemeinsamen Schnittpunkt. Die anschliessende Bereinigung der Testkörper und Rücksetzung der Fangschalter ist ebenfalls Teil des Tests.
- Der Branch bleibt in Draft-PR #74. Kein Merge, keine Veröffentlichung und kein Deployment.

## Nächster Umsetzungsschritt

Der Ende-zu-Ende-Test mit zwei realen Mesh-Körpern ist erfolgreich abgeschlossen. Die Fangpriorität wurde zusätzlich mit mehreren gleichzeitig aktivierten Fangarten in einem echten 3D-Test geprüft: Der Schnittpunktfang wird korrekt gewählt, wenn er innerhalb des definierten Tie-Bands liegt. Der vollständige Browser-Workflow mit Chromium und Safari-kompatiblem WebKit ist erfolgreich.

### Belastungstest der Feature-Kantenanalyse – 28. November 2026

- Ein Browser-Test erzeugt ein trianguliertes, flaches Gitter mit 6'561 Vertices und 12'800 Dreiecken.
- Erwartet werden ausschliesslich die 320 äusseren Feature-Kanten; die inneren koplanaren Triangulationsdiagonalen dürfen nicht erscheinen.
- **Gemessen:** 320 Feature-Kanten korrekt erkannt; Laufzeit rund 22,4 ms im Chromium-CI-Lauf.
- Die isolierten Modellierinteraktionen und der Screenshot-Artefakt-Upload waren erfolgreich.
- Der vollständige Browser-Workflow in Chromium und Safari-kompatiblem WebKit ist erfolgreich abgeschlossen. Auch alle Code-Prüfungen sind erfolgreich.
- Der Test ist ein gezielter Algorithmus-Benchmark auf einem flachen synthetischen Gitter. Er beweist noch keine gleichbleibende Leistung bei beliebig grossen oder komplexen realen Modellen.

Als Nächstes folgt ein Laufzeittest mit mehreren verschieden geformten Meshes und vielen Kanten, um Kandidatensammlung, Projektion und Sichtbarkeitsprüfung gemeinsam zu belasten. Danach wird die Achsenbindung (Richtungs-Lock) als weiterer zentraler SketchUp-Inferenzbaustein umgesetzt. Das aktuelle Fangsystem ist weiterhin nur ein Teil des vollständigen Inferenzsystems.
