# SILMO – Vollständige Projektsicherung und Übergabe

> **Dieses Dokument ist die zentrale Projekt-Erinnerung für die Weiterentwicklung von SILMO.**  
> Es bündelt die bestätigten Ziele, Nutzerentscheidungen, Bedienungswünsche, vorhandenen Funktionen, bisherigen Entwicklungsschritte, technischen Erkenntnisse, Qualitätsregeln und nächsten Aufgaben. Bei einem neuen Chat oder einer Übergabe zuerst dieses Dokument lesen und danach den verlinkten Quellcode und die aktuellen Tests prüfen.

**Sicherungsstand:** 14.11.2026  
**Produktversion der Web-App:** v90  
**Letzter dokumentierter Repository-Commit:** `d960c71cb7300b2cef13f163e5c4f7cf1a030579`  
**Letzter bestätigter App-Code-Commit:** `f1caa90cb246db2bb66b35e24ca91cac0d838fa3`  
**Hauptbranch:** `main`

---

# INHALTSVERZEICHNIS

1. Projektidentität und endgültige Vision
2. Verbindliche Nutzerwünsche und Zusammenarbeit
3. Was SILMO können soll
4. Bedienkonzept und Oberfläche
5. Bildstudio, Fotoerkennung und Image-to-3D
6. Zeichnen und Skizzieren
7. 3D-Modellierung und CAD-Funktionen
8. 3D-Druck und Modellqualität
9. Bisherige Entwicklung und Versionsgeschichte
10. Aktueller technischer Zustand
11. Bestehende Funktionen – Inventar
12. Technische Risiken und offene Grundsatzfragen
13. Langfristige Zielarchitektur
14. Entwicklungsphasen mit Abnahmekriterien
15. Test-, Versions- und Veröffentlichungsregeln
16. Aktueller Status und nächste konkrete Schritte
17. Was ausdrücklich NICHT passieren darf
18. Links und wichtige Projektdateien
19. Übergabe-Checkliste für jeden neuen Arbeitsabschnitt

---

# 1. Projektidentität und endgültige Vision

## 1.1 Name
**SILMO – 3D Studio AI**

## 1.2 Das endgültige Ziel

SILMO soll ein eigenständiges, vollwertiges und professionelles 3D-Modellierungsprogramm werden. Als Qualitätsmassstab dient unter anderem SketchUp. SILMO soll aber nicht bloss eine vereinfachte Kopie oder ein Vorbereitungswerkzeug für SketchUp sein.

**SILMO muss selbst das vollständige Arbeitsprogramm sein.** Der Benutzer muss keine Modelle in SketchUp hochladen, um sie dort fertigzustellen. SILMO soll eigenständig funktionieren.

Die Vision geht über eine SketchUp-Kopie hinaus: SILMO soll langfristig intuitive Architektur- und Objektmodellierung, präzise technische CAD-Konstruktion, freie/organische 3D-Modellierung, 3D-Druck und KI-gestützte Arbeit in einer Anwendung verbinden.

## 1.3 Wichtigster Leitsatz des Benutzers

> **So gut wie SketchUp, aber so einfach wie möglich – ohne dass die Einfachheit den Funktionsumfang einschränkt.**

Das bedeutet:
- Einfachheit ist eine Frage der Bedienung, nicht eine Begrenzung der Möglichkeiten.
- Anfänger sollen schnell zu Ergebnissen kommen.
- Fortgeschrittene und Profis müssen trotzdem Zugriff auf anspruchsvolle Werkzeuge und genaue Einstellungen haben.
- Keine Funktion darf nur deshalb weggelassen werden, weil sie schwierig zu bedienen wäre.
- Komplexe Funktionen müssen verständlich organisiert, erklärt und auffindbar sein.
- SILMO darf langfristig auch Funktionen erhalten, die über den üblichen SketchUp-Umfang hinausgehen.

## 1.4 Produktcharakter

SILMO ist gleichzeitig:
- intuitives 3D-Modellierungsprogramm,
- professionelles CAD-/Konstruktionswerkzeug,
- Architektur- und Produktmodellierer,
- Werkzeug für freie und organische 3D-Formen,
- 3D-Druck-Vorbereitung und Geometrieprüfung,
- KI-gestütztes Bild-, Skizzen- und 3D-Studio.

Diese Bereiche sollen sinnvoll zusammenarbeiten, statt wie voneinander getrennte Mini-Programme zu wirken.

---

# 2. Verbindliche Nutzerwünsche und Zusammenarbeit

Diese Regeln gelten bei jeder weiteren Entwicklung.

## 2.1 Bestehendes Projekt fortsetzen
- Das vorhandene GitHub-Projekt ist die Grundlage.
- Nicht ohne Grund neu anfangen und nicht die bestehende Anwendung durch einen leeren Prototyp ersetzen.
- Vorhandene Funktionen und bisherige Arbeit müssen erhalten bleiben.
- Neue Architektur schrittweise einführen.
- Vor einem Umbau untersuchen, welche bestehenden Funktionen davon abhängen.

## 2.2 Gründlich statt schnell
Der Benutzer hat ausdrücklich gesagt, dass wir uns so viel Zeit nehmen können, wie nötig ist. Es gibt keinen Zwang, das Programm schnell fertigzustellen.

Daraus folgt:
- Qualität vor Geschwindigkeit.
- Erst planen, dann technisch prüfen, dann umsetzen.
- Keine hastig hinzugefügten Schaltflächen, die nicht zuverlässig funktionieren.
- Keine Funktion als fertig bezeichnen, wenn sie nur oberflächlich getestet wurde.
- Bei schwierigen Aufgaben in nachvollziehbaren Etappen arbeiten.

## 2.3 Kommunikation und Fertigmeldungen
- Der Benutzer möchte bei Entwicklungsaufgaben bevorzugt erst dann eine Fertigmeldung erhalten, wenn die Arbeit tatsächlich abgeschlossen, getestet und öffentlich veröffentlicht ist.
- Keine Fortschrittsmeldungen als vermeintliche Fertigmeldung.
- Bei nicht abgeschlossenen Tests oder Deployment offen sagen, dass die Arbeit noch nicht abgeschlossen ist.
- Keine unbestätigten Behauptungen über Funktion, Fotoerkennung oder Druckbarkeit.

## 2.4 Versions- und Quellcode-Regeln
Vor jeder Codeänderung:
1. Aktuellen Stand von `main` abrufen.
2. Betroffene Dateien und deren aktuelle SHA prüfen.
3. Abhängigkeiten und bestehende Funktionsaufrufe untersuchen.
4. Änderung möglichst klein und isoliert halten.
5. Versionsnummer der App bei einer sinnvollen App-Änderung erhöhen.
6. Regressionstests ergänzen oder aktualisieren.
7. Syntax-/Build-Prüfungen und Browser-Tests ausführen.
8. GitHub-Actions-Ergebnisse und Deployment prüfen.
9. Erst danach als abgeschlossen melden.

Dokumentationsänderungen allein müssen nicht künstlich die App-Version erhöhen.

---

# 3. Was SILMO können soll

## 3.1 Modellierung
- 3D-Grundkörper und freie Formen erstellen.
- Objekte präzise positionieren, drehen, skalieren und ausrichten.
- Punkte, Kanten, Flächen und Körper bearbeiten.
- Skizzen zeichnen und daraus 3D-Geometrie erzeugen.
- Extrudieren, Drehen, Sweepen, Loften.
- Formen verbinden, voneinander abziehen und schneiden.
- Abrunden, Fasen und Flächen versetzen.
- Muster, Spiegelungen und Wiederholungen erstellen.
- Gruppen, Komponenten und Instanzen verwalten.
- Exakte Masse, Winkel und Abstände eingeben.
- Konstruktionsebenen, Raster, Fangpunkte und Hilfslinien verwenden.

## 3.2 Architektur und Produktgestaltung
Langfristig sollen unter anderem möglich sein:
- Häuser und Gebäude,
- Räume und Innenausbau,
- Dächer, Treppen, Fenster und Türen,
- Möbel und Einrichtungsgegenstände,
- technische Bauteile,
- Gehäuse, Halterungen und Adapter,
- mechanische und funktionale Teile,
- freie und organische Objekte.

Diese Beispiele sind keine abschliessende Funktionsliste.

## 3.3 Professionelle CAD-Funktionen
- Parametrische Abmessungen und Skizzenbedingungen.
- Feature-Historie und nachvollziehbare Modellschritte.
- Robuste Boolesche Operationen.
- Topologische Auswahl und Bearbeitung.
- Konstruktionsebenen und Referenzgeometrie.
- Mehrere Ansichten, Schnitte und technische Darstellungen.
- Präzise Fang- und Ausrichtungsfunktionen.
- Wiederverwendbare Komponenten und Bibliotheken.

## 3.4 KI und Automatisierung
- Fotos und Skizzen erkennen.
- Motive und einzelne Teilbereiche voneinander trennen.
- Erkannte Formen in bearbeitbare 2D-Skizzen umwandeln.
- Aus Konturen 3D-Körper erzeugen.
- Langfristig echte Image-to-3D-Rekonstruktion ermöglichen.
- Textbeschreibungen als Ausgangspunkt für Modelle nutzen.
- Geometriefehler finden und Verbesserungsvorschläge machen.
- KI-Ergebnisse müssen kontrollierbar, editierbar und korrigierbar bleiben.

## 3.5 Eigenständigkeit
SILMO muss ohne SketchUp nutzbar sein. Import- und Exportformate sind nützliche Austauschmöglichkeiten, aber keine Voraussetzung, um normale Projekte in SILMO zu erstellen und fertigzustellen.

---

# 4. Bedienkonzept und Oberfläche

## 4.1 Grundregel
**Nur der gerade geöffnete Unterreiter soll seinen Inhalt zeigen.** Andere Unterreiter dürfen nicht gleichzeitig ihre gesamten Werkzeugfelder anzeigen.

Diese Anforderung wurde vom Benutzer ausdrücklich korrigiert und in v90 umgesetzt.

## 4.2 Übersichtliche, professionelle Oberfläche
- CAD-orientierte Arbeitsfläche.
- Dunkles, neutrales Design wurde als Richtung eingeführt.
- Zentraler 3D-Arbeitsbereich.
- Linke Werkzeug-/Objektbereiche und rechter Eigenschafteninspektor.
- Hauptbereiche mit logisch gruppierten Unterreitern.
- Unterreiter sollen klar und kompakt sein.
- Der aktive Bereich soll sichtbar sein; nicht aktive Inhalte werden verborgen.
- Die Oberfläche darf professionell wirken, aber nicht unnötig überladen sein.

## 4.3 Einsteiger und Experten
Langfristiges Ziel:
- verständliche Grundwerkzeuge,
- fortgeschrittene Einstellungen auf Abruf,
- Expertenfunktionen nicht entfernen,
- kontextabhängige Werkzeuge,
- durchsuchbare Befehle,
- Tastenkürzel,
- Werkzeugbeschreibungen und interaktive Hilfen,
- anpassbare Arbeitsbereiche.

Ein einfacher Modus darf nicht bedeuten, dass die eigentliche Anwendung weniger kann.

## 4.4 Bereits umgesetzte Unterreiter in v90

**Erstellen:**
- Grundformen
- Kombinieren
- Objektliste

**Zeichnen – linker Bereich:**
- Skizzieren
- Kontur
- Zeichenaktionen wie Starten/Abbrechen/Volumenkörper erstellen und Status wurden dem Skizzieren-Bereich zugeordnet.
- Punkt-für-Punkt-Konturmodus bleibt beim Skizzieren auffindbar.

**Zeichnen – rechter Eigenschaftenbereich:**
- Werkzeugtyp
- Masse
- Raster
- Kontur
- Profi

**Image Studio:**
- Vorlage
- Grösse
- Erkennung
- Kontur & 3D

Die Unterreiter besitzen ARIA-Zustände und die inaktiven Inhalte werden per CSS verborgen.

---

# 5. Bildstudio, Fotoerkennung und Image-to-3D

Dieser Bereich ist ein wichtiger Teil der SILMO-Vision. In früherer Planung wurde Image-to-3D als erste Priorität für einen eigenständigen Arbeitsbereich benannt. Der Benutzer möchte sowohl manuelle Kontrolle als auch spätere automatische KI-Unterstützung.

## 5.1 Separater Arbeitsbereich
- Bildstudio als eigener Arbeitsbereich.
- Bildvorlage importieren.
- Bildgrösse und Position kontrollieren.
- Vorlage drehen und skalieren.
- Erkennung und Konturbearbeitung getrennt organisieren.
- Erkannte Konturen in 3D überführen.

## 5.2 Anforderungen an Erkennung
- Nicht nur einfache geometrische Silhouetten.
- Auch schwierige und komplexe Motive erkennen.
- Mehrere voneinander getrennte Teile berücksichtigen.
- Innenbereiche und Aussparungen berücksichtigen.
- Konturen nicht unnötig vereinfachen.
- Wichtige Ecken und Details erhalten.
- Benutzer muss erkannte Konturen manuell korrigieren können.
- Empfindlichkeit muss sinnvoll einstellbar sein.
- Die Erkennung soll auch bei komplexen organischen Formen zuverlässig arbeiten.

## 5.3 Konkrete frühere Bild-Erkennungs-Iteration
In v87 wurde eine einstellbare Fotoerkennungs-Empfindlichkeit eingeführt:
- Bereich 0–100 %.
- Standardwert 55 %.
- Höhere Empfindlichkeit senkt den adaptiven Hintergrund-Schwellenwert.
- Transparenter Hintergrund wird über den gesamten Bildrand geprüft.
- Transparenz-Kriterium: mindestens 12 % transparente Randproben.
- Ein synthetischer Geist-Test wurde ergänzt.

**Wichtiger echter Nutzerhinweis:** Der Benutzer testete später ein anderes, kompliziertes Geist-Motiv. Dieses wurde nicht korrekt erkannt. Danach konnte er zunächst kein weiteres Bild hochladen und bat darum, die Erkennung so weit wie nötig zu verbessern.

Das ist ein offener Qualitätsauftrag. Ein bestandener synthetischer Test darf nicht als Beweis gelten, dass schwierige reale Motive zuverlässig erkannt werden. Es müssen reale, vielfältige Testbilder und schwierige Fälle geprüft werden, sobald sie zur Verfügung stehen.

## 5.4 Manuelles und automatisches Image-to-3D
Der Benutzer möchte beides:
1. Manuelle Modellierung aus einer importierten Bildvorlage.
2. Langfristig KI-gestützte automatische Rekonstruktion.

Die KI soll die Arbeit erleichtern, aber keine nicht editierbare Blackbox liefern.

---

# 6. Zeichnen und Skizzieren

## 6.1 Zeichnungswerkzeuge
Bereits vorhanden sind unter anderem:
- Rechteck
- abgerundetes Rechteck
- Kreis
- Ellipse
- Dreieck
- Linie
- Kurve
- Freiform
- 3D-Linien auf unterschiedlichen Zeichenebenen

## 6.2 Anforderungen an Linien und Freihand
Frühere Verbesserungsrichtung v76/v77:
- 45°-Raster bzw. 45°-Ausrichtung für Linien.
- Freihandlinien beruhigen und glätten.
- Ecken und Richtungswechsel erhalten.
- Glättung darf charakteristische Konturpunkte nicht zerstören.
- Gerade Linien sollen zuverlässig und kontrolliert gezeichnet werden.

## 6.3 Skizzen zu 3D
- Skizze kontrolliert abschliessen.
- Kontur prüfen.
- Geschlossene Profile erkennen.
- Extrusion in einen Volumenkörper.
- Konturrahmen und Hohlkörper.
- Skizzenpunkte und Masse nachträglich bearbeiten.
- Beziehungen und Abstände zwischen Skizzenelementen bearbeiten.

---

# 7. 3D-Modellierung und CAD-Funktionen

## 7.1 Grundkörper
Der aktuelle Stand enthält:
- Würfel
- Kugel
- Zylinder
- Kegel
- Sechskant-Prisma
- Torus

## 7.2 Transformationen
- Verschieben
- Drehen
- Skalieren
- direkte Eingabe von Massen und Positionen
- Spiegeln
- Duplizieren
- Ausrichten
- Mehrfachauswahl
- Gruppieren und Gruppierung aufheben

## 7.3 Geometrieoperationen
Bereits vorhanden:
- eigene BSP-basierte CSG-/Boolesche Operationen
- Vereinigung
- Subtraktion
- Wiederherstellen ursprünglicher Teile verbundener Formen
- Extrusion
- Loft
- Sweep
- Kantenbehandlung (Abrunden/Fasen)
- Kontur- und Wandwerkzeuge

Diese Funktionen müssen in zukünftigen Schritten auf geometrische Robustheit geprüft werden. Die blosse Existenz eines Buttons ist kein Qualitätsnachweis.

## 7.4 Noch systematisch auszubauende Profi-Funktionen
- echte Topologie mit stabilen Flächen-, Kanten- und Punktidentitäten
- Auswahl einzelner Flächen, Kanten und Punkte
- präzise Fangpunkte (Endpunkt, Mittelpunkt, Schnittpunkt, Achse, Fläche)
- parametrische Skizzen und Abhängigkeiten
- Feature-Historie
- robuste Fillets und Chamfers
- Konstruktionsebenen und Referenzgeometrie
- Komponenten und Instanzen
- Muster und Wiederholungen
- mehrere Ansichten und Schnitte
- technische Zeichnungen und Bemaßungen
- Freiform- und organische Modellierung

---

# 8. 3D-Druck und Modellqualität

3D-Druckbarkeit ist ein zentrales Qualitätsziel. SILMO soll nicht nur ein hübsches Mesh darstellen, sondern prüfen können, ob ein Modell geometrisch für die Weiterverarbeitung geeignet ist.

Zu prüfende Eigenschaften:
- geschlossene Volumenkörper
- offene Kanten
- Manifold-/Nicht-Manifold-Geometrie
- Selbstüberschneidungen
- degenerierte oder ungültige Flächen
- konsistente Normalen
- Wandstärken
- Mindestabstände und kleine Details
- Bounding Box und exakte Abmessungen
- Volumen
- Mesh-Reparatur und verständliche Fehlerliste
- zuverlässiger STL-Export
- langfristig 3MF und weitere Formate

**Wichtig:** Synthetische Softwaretests beweisen nicht, dass ein Modell auf einem realen Drucker erfolgreich gedruckt werden kann. Reale Drucktests sind eine eigene Abnahmestufe.

---

# 9. Bisherige Entwicklung und Versionsgeschichte

Die folgende Liste ist ein zusammengefasster Verlauf aus den bisher festgehaltenen Projektständen. Wo keine exakten Details dokumentiert sind, wird kein Funktionsumfang erfunden.

## v76/v77 – Sketch-/Zeichenverbesserungen
- Verbesserte gerade Linien.
- 45°-Ausrichtung bzw. 45°-Raster.
- Freihand-Beruhigung.
- Ecken erhalten statt sie durch Glättung zu verlieren.
- v77 wurde als „Smooth Sketch“ dokumentiert.
- Ein früher bestätigter Commit zu v77: `b7016db585e5bf5f237ff89866c5e093e983c911`.

## v87 – Adjustable Photo Recognition
- Einstellbare Fotoerkennungs-Empfindlichkeit 0–100 %.
- Standard 55 %.
- Adaptive Schwellenwertanpassung.
- Transparenter Rand wird berücksichtigt.
- Synthetischer Geist-Regressionstest.
- Späterer echter schwieriger Geist-Test zeigte weiterhin eine Erkennungsschwäche.

## v88 – Professional CAD Workspace
- CAD-orientierte dunkle Oberfläche.
- Drei-Spalten-Aufbau.
- Header ungefähr 54 px.
- Linker Bereich ungefähr 252 px.
- Rechter Eigenschafteninspektor ungefähr 292 px.
- Zentrale 3D-Ansicht mit Raster.
- Responsive Darstellung.

## v89 – Verschachtelte CAD-Unterbereiche
- Hauptbereiche erhielten verschachtelte Unterreiter.
- Werkzeuggruppen wurden in klarere Bereiche aufgeteilt.

## v90 – Focused CAD Subtabs
- Nur der aktuell ausgewählte Unterreiter zeigt seine Inhalte.
- Nicht aktive Unterreiter-Inhalte werden ausgeblendet.
- Erstellen: Grundformen, Kombinieren, Objektliste.
- Zeichnen links: Skizzieren, Kontur.
- Zeichnen rechts: Werkzeugtyp, Masse, Raster, Kontur, Profi.
- Image Studio: Vorlage, Grösse, Erkennung, Kontur & 3D.
- Skizzenaktionen und Punkt-für-Punkt-Modus wurden im Skizzieren-Bereich auffindbar gemacht.
- Browser-Regressionstests für Unterreiter-Sichtbarkeit und relevante Werkzeuge erweitert.
- Letzter bestätigter App-Code-Commit für v90: `f1caa90cb246db2bb66b35e24ca91cac0d838fa3`.

## Dokumentationsstand nach v90
Am 14.11.2026 wurden zusätzlich erstellt:
- `docs/SILMO_MASTERPLAN.md`
- `docs/SILMO_CURRENT_STATE_AUDIT.md`
- Dieses vollständige Übergabe- und Sicherungsdokument.

Dokumentationscommits ändern die App-Version nicht.

---

# 10. Aktueller technischer Zustand

**Grundlage der Bestandsaufnahme:** v90 / App-Code-Commit `f1caa90cb246db2bb66b35e24ca91cac0d838fa3`.

| Bereich | Aktueller Stand |
|---|---|
| Hauptdatei | `index.html` |
| Grösse der Hauptdatei | ca. 5'600 Zeilen / ca. 392 KB |
| Rendering | Three.js r128 |
| Abhängigkeiten | teilweise externe CDN-Skripte |
| Projektformat | JSON mit eingebetteten Geometriedaten |
| Tests | `tests/silmo-browser-test.mjs` |
| Browser-Testumfang | ca. 1'000 Zeilen, 327 Assertions |
| HTML-IDs | 163 explizite IDs |
| Build-System | kein `package.json` im Repository-Root |
| Hosting | GitHub Pages |
| Hauptbranch | `main` |

## 10.1 Koordinaten und Einheiten
Aktuelle interne Umrechnung:
**10 Three.js-Einheiten = 1 mm.**

Diese Umrechnung ist in mehreren Stellen der bestehenden Anwendung verankert. Sie muss zentralisiert werden, bevor grosse Teile des Codes umgebaut werden.

## 10.2 Geometrie-Datenmodell
Die aktuellen aktiven Modellobjekte sind überwiegend Three.js-Meshes mit BufferGeometry. Das ist für Mesh-Modellierung und Rendering geeignet, ist aber allein kein vollständiger parametrischer CAD-/B-Rep-Kern.

## 10.3 Undo/Redo
Der aktuelle Verlauf arbeitet mit Zustandskopien. Für grosse Modelle muss später geprüft werden, ob ein befehlsbasierter, inkrementeller Verlauf effizienter und robuster ist.

## 10.4 Projektdateien
Projektdateien enthalten Geometrieattribute, Transformationen und Metadaten als JSON. Schema-Versionierung, Migration und Wiederherstellung müssen langfristig ausgebaut werden.

---

# 11. Bestehende Funktionen – Inventar

Diese Liste beschreibt Funktionen, die im aktuellen Codebestand identifiziert wurden. Sie ist eine Bestandsaufnahme, keine pauschale Garantie, dass jeder Grenzfall bereits professionell gelöst ist.

## 11.1 Objekt- und Szenenverwaltung
- Grundkörper erstellen
- Objektliste
- Objekt auswählen
- Mehrfachauswahl
- Objekte duplizieren
- Objekte löschen
- Transformationen
- Masse und Positionen
- Gruppieren
- Gruppierung aufheben
- Gruppen einzeln bearbeiten
- Spiegeln
- Ausrichten
- Druckbettgrösse
- Raster

## 11.2 CAD-/Skizzenwerkzeuge
- 2D-Skizzen
- 3D-Linien
- Rechteck und abgerundetes Rechteck
- Kreis und Ellipse
- Dreieck
- Linie und Kurve
- Freiform
- Rasterfang
- Kontur glätten
- Skizzenbeziehungen
- Skizzenabmessungen
- Skizzenpunkte
- Extrusion
- Konturrahmen
- Hohlkörper
- Loft
- Sweep
- Kantenabrundung und Fase
- Boolesche Operationen

## 11.3 Projekt und Dateiaustausch
- Projekt speichern
- Projekt öffnen
- Geometrie serialisieren und wiederherstellen
- STL importieren
- STL exportieren

## 11.4 Bildstudio
- Bildvorlage importieren
- Vorlage skalieren und drehen
- Konturen erkennen
- Empfindlichkeit einstellen
- mehrere Konturen bearbeiten
- Konturen validieren
- erkannte Konturen in 3D überführen

## 11.5 Oberfläche und Bedienung
- Hauptarbeitsbereiche
- Unterreiter
- aktiver Unterreiter isoliert sichtbar
- Eigenschaftenbereiche
- maximierbarer Viewport
- Verschiebe- und Dreh-Gizmos
- Tastenkürzel
- Tutorial
- Diagnose-/Prüftool

---

# 12. Technische Risiken und offene Grundsatzfragen

## 12.1 Geometriekern
Three.js ist in erster Linie Rendering-/3D-Interaktionsgrundlage, nicht automatisch ein professioneller parametrischer CAD-Geometriekern.

Zu untersuchen:
- Open CASCADE / OCCT mit WebAssembly
- andere geeignete B-Rep-/CAD-Kerne
- Lizenzbedingungen
- Browserkompatibilität
- Performance
- Speicherverbrauch
- Boolesche Robustheit
- STEP/IGES-Unterstützung
- Wartbarkeit und Integrationsaufwand

**Noch keine endgültige Entscheidung treffen, bevor ein isolierter Prototyp mit Testfällen verglichen wurde.**

## 12.2 BSP-CSG
Die eigene BSP-basierte Boolesche Engine nicht vorschnell löschen. Zuerst Testkorpus aufbauen:
- einfache Überschneidungen
- koplanare Flächen
- fast deckungsgleiche Flächen
- sehr dünne Wände
- nicht-manifold Eingaben
- grosse und komplexe Meshes
- wiederholte Operationen
- ungültige Eingaben

## 12.3 Modularisierung
Die einzelne grosse HTML-Datei soll langfristig in Module aufgeteilt werden. Das darf aber nicht in einem riskanten Komplett-Neustart enden.

## 12.4 Externe Abhängigkeiten
Three.js und Erweiterungen werden aktuell teilweise über CDNs geladen. Langfristig reproduzierbare, lokal verwaltete Abhängigkeiten und kontrollierte Versionen einführen.

## 12.5 Parametrik und Topologie
Eine Mesh-Fläche ist nicht dasselbe wie eine stabile CAD-Fläche. Wenn ein Benutzer eine Fläche auswählt und später weitere Operationen ausführt, müssen Identitäten und Beziehungen nachvollziehbar bleiben.

## 12.6 KI-Rekonstruktion
Einfache Konturerkennung ist nicht dasselbe wie die Rekonstruktion beliebiger 3D-Objekte aus Fotos. Für echte Image-to-3D-Funktionalität sind separate technische Tests und ein realistischer Qualitätsplan nötig.

---

# 13. Langfristige Zielarchitektur

Die Anwendung soll schrittweise in Module aufgeteilt werden.

## A. UI / Interaction
- Werkzeugleisten
- Hauptbereiche und Unterreiter
- Viewport und Kamera
- Eigenschafteninspektor
- Kontextmenüs
- Tastenkürzel und Befehlssuche
- Einsteiger-/Expertenführung

## B. Document Core
- Dokumentmodell
- Objekt- und Komponentenstruktur
- Gruppen und Ebenen
- Materialien und Szenen
- Schema-Versionierung
- Speichern, Wiederherstellen und Migration

## C. Geometry Core
- B-Rep-/Topologie-Modell
- Körper, Flächen, Kanten, Punkte
- Mesh-Tessellierung für Darstellung
- Boolesche Operationen
- Extrusion, Rotation, Sweep, Loft
- Fillet/Chamfer
- Geometrievalidierung

## D. Command / History
- Einheitliche Befehle
- Transaktionen
- Undo/Redo
- nachvollziehbare Modellhistorie
- später parametrische Neuberechnung

## E. Selection / Snapping
- Objekt-, Komponenten-, Flächen-, Kanten- und Punktselektion
- Raster
- Endpunkt, Mittelpunkt, Schnittpunkt
- Achsen- und Flächenfang
- Präzise Eingaben und geometrische Bedingungen

## F. Image Studio / AI
- Bildimport und Kalibrierung
- Segmentierung
- Kontur-Erkennung
- Skizzenextraktion
- Image-to-3D
- KI-gestützte Bearbeitung
- Unsicherheitsanzeige und manuelle Korrektur

## G. File IO
- Eigenes versioniertes SILMO-Format
- STL
- mögliche Formate: 3MF, OBJ, glTF/GLB, STEP, IGES
- Formate einzeln auf Eignung prüfen
- Materialien und Szenen so weit wie möglich erhalten

## H. Validation / 3D Print
- Mesh-Validierung
- Volumen und Masse
- Wandstärken
- offene Kanten
- Selbstüberschneidungen
- Druckbett und Bauraum
- Exportprüfung

---

# 14. Entwicklungsphasen mit Abnahmekriterien

## Phase 0 – Bestandsaufnahme und Planung
**Status: begonnen; Masterplan, Bestandsaufnahme und diese Projektsicherung liegen vor.**

Noch zu vervollständigen:
- vollständige Funktions-/Abhängigkeitsmatrix
- Modulgrenzen
- Datenfluss zwischen UI, Dokument und Geometrie
- Teststrategie für mathematische Geometrie
- Vergleich der Geometriekern-Kandidaten

Abnahme: Ein konkreter technischer Bauplan liegt vor, der vorhandene Funktionen und Migrationsschritte schützt.

## Phase 1 – Technisches Fundament
- Modularer Build
- reproduzierbare lokale Abhängigkeiten
- Dokumentmodell und Schema-Versionierung
- zentrale Einheiten-/Toleranzverwaltung
- einheitliche Command-/Undo-/Redo-Architektur
- Unit- und Integrationstests
- Leistungs-Baselines

Abnahme: Bestehende Kernworkflows funktionieren weiterhin; Projekte bleiben kompatibel; Speichern und Wiederöffnen ist zuverlässig.

## Phase 2 – Geometriekern
- CAD-Kern-Prototypen vergleichen
- Topologie und Geometrie-Datenmodell definieren
- Boolesche Operationen robust machen
- Extrusion, Rotation, Sweep, Loft, Fillet, Chamfer
- Geometrievalidierung

Abnahme: Definierter Testkorpus aus einfachen, schwierigen und ungültigen Geometrien wird reproduzierbar bestanden.

## Phase 3 – Professionelle Modellierungswerkzeuge
- Objekt-/Komponenten-/Gruppenbearbeitung
- Flächen-/Kanten-/Punktbearbeitung
- präzises Snapping
- numerische Eingaben
- parametrische Skizzen und Constraints
- Muster, Spiegeln, Schnitte, Konstruktionsebenen
- Architektur- und technische Werkzeuge

Abnahme: Reale Modellierungsaufgaben lassen sich präzise und ohne Datenverlust durchführen.

## Phase 4 – Bedienung und Arbeitsorganisation
- anpassbare Arbeitsbereiche
- Befehlsuche
- Kontextwerkzeuge
- mehrere Ansichten und Szenen
- Ebenen und Komponentenbibliothek
- Tastenkürzel
- Touch-/Stift-Unterstützung

Abnahme: Funktionen sind leicht auffindbar, aber Profifunktionen bleiben erreichbar.

## Phase 5 – KI, Bild- und Freiformmodellierung
- Foto- und Skizzenerkennung
- komplexe Motive und getrennte Teile
- organische Formen
- echte Image-to-3D-Rekonstruktion
- manuelle Nachbearbeitung und editierbare Ergebnisse

Abnahme: Vielfältige reale Testbilder, schwierige Motive und Fehlerfälle werden nachvollziehbar geprüft.

## Phase 6 – Dokumente und Austausch
- robustes SILMO-Projektformat
- Import/Export
- Materialien, Komponenten, Szenen
- Wiederherstellung und Versionierung
- später Bibliotheken und Zusammenarbeit

Abnahme: Projekte können zuverlässig gespeichert, geöffnet und ausgetauscht werden.

## Phase 7 – Druck- und Produktionsreife
- Geometrieprüfung
- Wandstärken
- Masshaltigkeit
- Slicer-Kompatibilität
- Performance und Langzeittests
- reale Drucktests

Abnahme: Softwareprüfungen und tatsächliche Drucktests sind getrennt dokumentiert und bestanden.

---

# 15. Test-, Versions- und Veröffentlichungsregeln

## 15.1 Tests
Bei jeder relevanten Änderung:
- Syntax-/Code-Prüfung
- Unit-Tests, sobald vorhanden
- Integrations- und Geometrie-Tests
- Browser-Regressionstests
- Test von Speichern und Wiederöffnen
- negative und Grenzfälle
- Leistung bei grösseren Modellen

## 15.2 Regressionen verhindern
Jede vorhandene Funktion, die von einer Änderung betroffen ist, muss mit einem Regressionstest geschützt werden. Keine stillschweigende Entfernung bestehender Features.

## 15.3 Versionsnummern
- App-Version bei jeder sinnvollen App-Iteration erhöhen.
- Dokumentationsänderungen allein brauchen keine neue App-Version.
- Version, Commit und Testergebnis nachvollziehbar festhalten.

## 15.4 Veröffentlichung
Eine Version gilt erst als veröffentlicht, wenn:
- Code-Prüfungen erfolgreich sind,
- Browser-Tests erfolgreich sind,
- Deployment erfolgreich ist,
- der richtige Commit deployed wurde.

## 15.5 Ehrlichkeit
- Keine Testresultate erfinden.
- Keine echten Fotoerkennungs- oder Druckergebnisse aus synthetischen Tests ableiten.
- Experimentelle Funktionen als experimentell kennzeichnen.
- Bei Fehlern erst korrigieren und erneut testen.

---

# 16. Aktueller Status und nächste konkrete Schritte

## 16.1 Aktueller Status am 18.11.2026

**Entwicklungs-App-Metadaten:** v93 (Produktionsstand auf `main` bleibt unverändert)  
**Entwicklungsbranch:** `phase1/central-units-api`  
**Aktueller PR:** [PR 69 – Draft, nicht gemergt](https://github.com/jonas-cell-lang/mein-3d-studio-ai/pull/69)  
**Letzter vollständig erfolgreich geprüfter Stand:** `b3de4af99c30fe5d9d29dfb2ad5dc2bf3923218c` (Code-Checks und Browser-Regression erfolgreich).

### Technische Fortschritte seit der letzten Sicherung

- Zentrale Einheiten-API in `src/units.js`; bestätigte Skala bleibt 1 Three.js-Welteinheit = 10 mm.
- Die zentrale Einheiten-API wird nun für Längen- und Flächenumrechnungen in den bisherigen direkten Aufrufstellen verwendet: Druckbett/Raster, Skizzenbegrenzung und -vereinfachung, Eingabedimensionen, STL-Import/-Export, Ausrichtung/Abstandsverteilung, Tastaturschritte, Skizzengeometrie und Druckmassenausgabe. Der alte `MM_PER_UNIT`-Alias wurde entfernt.
- Benannte Toleranz-API in `src/tolerances.js` mit getrennten Werten für CSG, Ausrichtung, Skizzenvereinfachung und Druckbett-/Dreiecksprüfung. Die bisherigen Zahlenwerte wurden dabei nicht verändert.
- Projektformat v3 besitzt nun einen separaten Geometrievalidator in `src/project-schema.js`.
- `src/project-geometry.js` kapselt die Geometrie-Serialisierung und den validierten Wiederaufbau von Meshes sowie Union-Formteilen.
- `src/project-io.js` kapselt Projekt-Speichern und -Öffnen. Es baut neue Objekte vollständig auf und ersetzt das aktuelle Modell erst nach erfolgreicher Vorbereitung.
- `src/csg.js` kapselt den BSP-Kern für Boolesche Verbindung und Differenz; der Browserlauf prüft beide Operationen. Er prüft vor dem Wiederaufbau unter anderem Positionen mit itemSize 3, Attributlängen, endliche Werte, Indexgrenzen und vollständige Dreiecksgruppen.
- Repräsentative minimale und erweiterte v3-Fixtures sowie Tests für ungültige Geometriedaten sind vorhanden.
- Ein zusätzlicher Browser-Regressionstest lädt absichtlich fehlerhafte Positionsdaten und prüft, dass das zuvor geöffnete Projekt vollständig erhalten bleibt.
- Three.js r128, STLLoader und STLExporter werden nicht mehr von externen CDNs geladen. Die Bibliotheken werden aus der exakt festgelegten npm-Version lokal bereitgestellt.
- `package.json`, `package-lock.json`, `scripts/prepare-runtime.mjs` und `.gitignore` richten die Runtime ein. Die Three.js-Lizenz wird mit den Laufzeitdateien übernommen.
- Code- und Browser-CI bereiten die Runtime vor. Der Browser-Test blockiert externe HTTPS-Zugriffe und prüft den lokalen Start sowie STL-Funktionen.
- `src/developer-diagnostics.js`, `src/tool-navigation.js`, `src/tutorial.js` und `src/image-studio.js` wurden aus selbstständigen Inline-IIFEs ausgelagert; Reihenfolge und bestehende Schnittstellen blieben erhalten.
- `src/project-geometry.js` wurde als separates Modul für Projektgeometrie ergänzt.
- `docs/SILMO_MODULE_EXTRACTION_MAP.md` dokumentiert die Modulgrenzen und die Abhängigkeiten für die nächste Projektdatei-I/O-Extraktion.
- Die CI und der Pages-Build prüfen, dass alle sieben Module im lokalen Seitenpaket vorhanden sind. Die statische Funktionsprüfung durchsucht den ausgelagerten Navigationscode mit.
- Lokale Startanleitung und Runtime-/Toleranz-/Projektformat-Dokumentation wurden aktualisiert.

### Nachweisbare Tests

Für den aktuellen Stand `b3de4af99c30fe5d9d29dfb2ad5dc2bf3923218c`:
- SILMO code checks: erfolgreich.
- SILMO browser interaction tests: erfolgreich.
- Der Browserlauf deckt weiterhin die Zeichenwerkzeuge einschliesslich Freiform-Extrusion sowie Projektimport/-export und die sichere Zurückweisung fehlerhafter Geometrie ab.

Für frühere Änderungen an der lokalen Runtime wurden ebenfalls beide Prüfungen erfolgreich abgeschlossen, unter anderem für Commit `5440c78`. Fehlerhafte Zwischenstände bei der neuen Geometrievalidierung wurden anhand der CI-Logs korrigiert; sie sind nicht der aktuelle geprüfte Code-Stand.

Für den aktuellen geprüften Code-Stand `78fe921` sind sowohl Code-Prüfung als auch Browser-Regression erfolgreich. Die sechs ausgelagerten Module sind im Browserlauf enthalten. Es gibt keinen neuen Produktionsdeploy.

## 16.2 Was als Nächstes getan werden soll

1. CI für den neuesten Dokumentationsstand abschliessen lassen.
2. Als Nächstes die verbleibenden Geometrie- und Skizzenfunktionen nach Abhängigkeiten modularisieren, ohne Modellzustand, Undo/Redo und bestehende Werkzeuge zu beschädigen.
3. Dokument-/Projektverwaltung und Import-/Export-Grenzen weiter modularisieren, ohne die bestehende Geometrie- und Undo/Redo-Logik zu beschädigen.
4. Geometrievalidierung und Toleranzinventar mit zusätzlichen Grenzfalltests vervollständigen.
5. Phase 1 gegen den Masterplan vollständig abgleichen und alle noch offenen Punkte dokumentiert abarbeiten.
6. Erst nach ausreichender technischer Basis die isolierte CAD-Kern-Prototypstudie fortsetzen; keine voreilige Integration in die Produktions-App.

## 16.3 Keine voreilige Entscheidung
Three.js soll zunächst Darstellung, Kamera und Interaktion weiter übernehmen können. Ob ein WebAssembly-basierter CAD-Kern wie Open CASCADE integriert wird, ist erst nach einem erfolgreichen Prototypenvergleich zu entscheiden.

---

# 17. Was ausdrücklich NICHT passieren darf

1. SILMO darf nicht zu einer SketchUp-Upload-Hilfsanwendung werden.
2. SILMO darf nicht auf einfache Funktionen beschränkt werden, nur um die Oberfläche simpel zu halten.
3. Das Projekt darf nicht ohne Grund von Grund auf neu gestartet werden.
4. Bestehende Funktionen dürfen nicht stillschweigend verschwinden.
5. Die Oberfläche darf nicht alle Unterreiter-Inhalte gleichzeitig anzeigen; nur der aktive Unterreiter ist sichtbar.
6. Schwierige Fotoerkennung darf nicht als gelöst bezeichnet werden, wenn reale komplexe Motive noch scheitern.
7. Ein Mesh darf nicht als präzises parametrisches CAD-Modell ausgegeben werden, wenn die Datenstruktur das nicht unterstützt.
8. Ein synthetischer Test darf nicht als Beweis für reale 3D-Druckbarkeit gelten.
9. Keine Veröffentlichung bei fehlgeschlagenen Tests.
10. Keine unbestätigten Erfolgsmeldungen.
11. Keine unnötige Eile: Der Benutzer hat ausdrücklich erlaubt, sich so viel Zeit zu nehmen, wie nötig ist.

---

# 18. Links und wichtige Projektdateien

## Hauptlinks
- Repository: https://github.com/jonas-cell-lang/mein-3d-studio-ai
- Live-App: https://jonas-cell-lang.github.io/mein-3d-studio-ai/
- GitHub Actions: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions

## Wichtige Dateien
- App: `index.html`
- Browser-Regressionstests: `tests/silmo-browser-test.mjs`
- Masterplan: `docs/SILMO_MASTERPLAN.md`
- Technische Bestandsaufnahme: `docs/SILMO_CURRENT_STATE_AUDIT.md`
- Diese vollständige Sicherung: `docs/SILMO_PROJECT_BACKUP.md`
- Runtime-Abhängigkeitsprüfung: `docs/SILMO_RUNTIME_DEPENDENCY_AUDIT.md`
- Einheiten- und Toleranzspezifikation: `docs/SILMO_UNITS_TOLERANCE_SPEC.md`
- Projektformat v3: `docs/SILMO_PROJECT_FORMAT_V3.md`
- Lokaler Start: `docs/LOCAL_START.md`
- Zentrale Einheiten-API: `src/units.js`
- Zentrale Toleranz-API: `src/tolerances.js`
- Projekt-/Geometrievalidierung: `src/project-schema.js`
- Geometrievalidierungstests: `tests/project-schema.test.cjs`

## Bestätigte Commits
- v77 Smooth Sketch: `b7016db585e5bf5f237ff89866c5e093e983c911`
- v90 App-Code: `f1caa90cb246db2bb66b35e24ca91cac0d838fa3`
- Masterplan-Dokument: `63952de963b28518b1b0a23e1a11c4dbde75fa0b`
- Technische Bestandsaufnahme: `d960c71cb7300b2cef13f163e5c4f7cf1a030579`
- Lokale Runtime / CDN-freier Browserlauf: `5440c78f2bddef1b1d9f4f9f648df5ff660be77b`
- Zentrale Toleranzen: `2abc639121673ef39877d16847fb7a9bfe4a4d0a`
- Geometrievalidierung und sicherer Fehlerfall im Browser: `d131d4ec23fe0c30349f548205dd819e759f3ec8`

---

# 19. Übergabe-Checkliste für jeden neuen Arbeitsabschnitt

Vor Beginn einer neuen Aufgabe:

- [ ] Dieses Dokument vollständig lesen.
- [ ] `docs/SILMO_MASTERPLAN.md` lesen.
- [ ] `docs/SILMO_CURRENT_STATE_AUDIT.md` lesen.
- [ ] Neueste Commits auf `main` prüfen.
- [ ] Aktuelle `index.html` und betroffene Tests abrufen.
- [ ] Nutzerwünsche und bestehende Funktionen aus diesem Backup beachten.
- [ ] Aufgabe einer Entwicklungsphase zuordnen.
- [ ] Vor Änderungen Risiken und Regressionen benennen.
- [ ] Nach Änderungen Tests, Actions und Deployment prüfen.
- [ ] Dieses Backup nach jeder wichtigen neuen Nutzerentscheidung, Funktionsänderung oder Architekturentscheidung aktualisieren.

**Wenn ein späterer Chat nur eine einzige Datei als Projektübergabe lesen kann, soll es diese Datei sein.** Sie ist die zentrale Zusammenfassung; der tatsächliche Quellcode und die vollständige Versionshistorie bleiben im GitHub-Repository erhalten.

---

**Endgültiger Projektleitsatz:**

# SILMO – Einfach zu bedienen. Professionell in den Möglichkeiten. Präzise in der Technik. Eigenständig als 3D-Studio.


## Ergänzung – weiterer Entwicklungsstand am 20.11.2026

- PR 70 ergänzt auf dem separaten Branch `phase1/history-foundation` die Auslagerung der Undo-/Redo-Verwaltung in `src/history.js`.
- Die Code-Checks und Playwright-Browser-Regression waren nach dem Playwright-Update auf Commit `da26cb15438e30efd90fbf2d29ff76568e44c668` erfolgreich.
- Weitere bestehende Schwellen für Rastergrenzen, Gruppenrotation, Profilquellabmessungen, Profil-Schliessung und Strahl-/Skizzenebenen-Berechnung wurden einzeln benannt und durch Unit-Tests abgesichert; die Zahlenwerte wurden nicht verändert.
- Die folgenden Änderungen müssen nach dem letzten Toleranz-Audit erneut durch Code- und Browser-CI laufen.
- Keine Änderung an `main`, kein Live-Deployment, keine kostenpflichtigen Dienste; Kostenlimit CHF 0.00.


## Ergänzung – CI-Nachweis und Bildkontur-Audit am 20.11.2026

- Auf Commit `ef35d6f5fa8b9409fd8a271d0e9baa5d89a9ef7c` waren sowohl die Code-Checks als auch die vollständige Playwright-Browser-Regression erfolgreich.
- Die Code-Checks führten `node --test tests/*.test.cjs`, Inline-JavaScript-Syntaxprüfung, Manifest-/HTML-ID-Prüfung und lokalen Pages-Paket-Test aus.
- Die Browser-Regression startete SILMO mit lokaler Three.js-Runtime und führte `tests/silmo-browser-test.mjs` in Chromium erfolgreich aus.
- Der Toleranz-Audit umfasst nun zusätzlich Pixel-/Pixel²-Schwellen der Bildkonturprüfung, Mindestwandvergleich in mm und die Positionsänderungsprüfung des Lernkurses. Die Werte sind getrennt benannt und durch Unit-Tests abgesichert; ihre bisherigen Zahlenwerte wurden nicht verändert.
- Dokumentationsstand wurde danach auf Commit `88473a6b28d68d0dd4085800503e18eb050364c1` aktualisiert.
- PR 69 und PR 70 bleiben Drafts. Kein Merge nach `main`, kein Live-Deployment, keine Ausgaben.


## Ergänzung – Projektimport-Ressourcen und abschliessende CI am 20.11.2026

- `src/project-geometry.js` gibt eine teilweise aufgebaute `BufferGeometry` bei jedem Fehler während der Wiederherstellung frei, bevor der Fehler weitergereicht wird.
- `tests/project-geometry.test.cjs` simuliert einen Fehler beim Setzen des Normalenattributs und prüft, dass die bereits angelegte Geometrie genau einmal entsorgt wird.
- Für Commit `717ff6c1eea5eb7bda4f5d7e26cf8e3bcdc6e3f2` waren Code-Checks und vollständige Chromium-/Playwright-Browser-Regression erfolgreich.
- Code-Check-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44735662941
- Browser-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44735662796
- Kein Merge nach `main`, kein Live-Deployment, keine kostenpflichtigen Dienste; Kostenlimit CHF 0.00.


## Ergänzung – Hohlrahmen-Metadatenprüfung und Browser-CI am 20.11.2026

- `src/project-schema.js` prüft beim Projektimport Hohlrahmen-Metadaten gegen dieselben Eingabegrenzen wie die CAD-Oberfläche: Wandstärke 0,2–100 mm, Rahmenhöhe 0,2–2000 mm. Der frühere Alias `caseWallFrame` wird ebenfalls geprüft; auch falsy ungültige Werte werden zurückgewiesen.
- `tests/project-schema.test.cjs` deckt gültige Grenzwerte, zu kleine und zu grosse Werte, fehlende/ungültige Zahlen sowie ungültige falsy Werte ab.
- Für Code-Commit `0f32a9ca60adb78a0510a2facac1236aa03176a0` waren Code-Checks und vollständige Playwright-Browser-Regression erfolgreich.
- Code-Check-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44736126833
- Browser-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44736126756
- Kein Merge nach `main`, kein Live-Deployment, keine kostenpflichtigen Dienste; Kostenlimit CHF 0.00.


## Ergänzung – STL-Adapter-Auslagerung am 20.11.2026

- Der STL-Import/-Export wurde in `src/stl-io.js` ausgelagert. Die Oberfläche behält Dateiauswahl, Drag-and-drop und Web-Link-Handling; das Modul übernimmt Parsing, Validierung, mm-/Welteinheiten-Konvertierung, ASCII-Export und temporäre Exportgeometrien.
- Die neue Datei ist in den Code-Checks und Pages-Artefaktlisten eingetragen.
- Import prüft Positionsdaten und entsorgt nicht übernommene Geometrie-/Materialressourcen bei Fehlern. Export arbeitet mit Kopien und entsorgt diese nach Abschluss.
- Die Browser-Regression muss diesen Stand noch vollständig prüfen; bis dahin gilt die Auslagerung als implementiert, aber nicht abgenommen.
- Kein Merge nach `main`, kein Live-Deployment, keine Kosten.


## Ergänzung – STL-Adapter und erfolgreiche Gesamtregression am 20.11.2026

- `src/stl-io.js` kapselt STL-Import und ASCII-STL-Export. Dateiauswahl, Drag-and-drop und Web-Link-Handling bleiben im CAD-Hauptskript; das Modul übernimmt Parsing, Positionsdatenprüfung, Einheitenumrechnung, Exportkopien und Ressourcenfreigabe.
- Der neue Adapter ist in `index.html`, den Code-Asset-Prüfungen und dem Pages-Paketmanifest eingebunden.
- Für Code-Commit `1e69a14ee41043d76fe95886b2e75938f791e2f9` waren Code-Checks und vollständige Playwright-Browser-Regression erfolgreich.
- Code-Check-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44736758062
- Browser-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44736758290
- Der STL-Browserlauf prüft Dateiimport per Drop, Web-Link-Import sowie Export/erneuten Export nach Projekt-Wiederöffnung.
- Kein Merge nach `main`, kein Live-Deployment, keine Kosten.


## Ergänzung – STL-Fehlerfalltest am 20.11.2026

- Die Browser-Regression enthält jetzt zusätzlich einen ungültigen STL-Importfall. Er prüft, dass ein beschädigter STL-Upload abgewiesen wird und die bereits vorhandenen Modelle unverändert erhalten bleiben.
- Dieser zusätzliche Browser-Test ist im aktuellen Branch enthalten; ein eigener neuer Actions-Lauf dafür ist noch nicht sichtbar.


## Ergänzung – STL-Fehlerbehandlung aus Browser-Regression abgeleitet am 20.11.2026

- Der erste Negativtest zeigte, dass Three.js beim Parsen einer beschädigten STL-Datei einen `RangeError` auslöst. SILMO fing ihn bereits ab, protokollierte ihn aber als `console.error`, wodurch der Browser-Regressionslauf einen unerwarteten Laufzeitfehler erkannte.
- Der STL-Adapter behandelt diesen erwartbaren Benutzereingabefehler nun als Importwarnung (`console.warn`) und zeigt weiterhin eine verständliche Statusmeldung. Der Negativtest prüft zusätzlich, dass keine vorhandenen Modelle verändert werden.
- Die korrigierte Version benötigt einen erneuten vollständigen Code- und Browser-CI-Nachweis.


## Ergänzung – abgeschlossene STL-Fehlerfallregression am 20.11.2026

- Der beschädigte STL-Test zeigte zunächst, dass Three.js beim Parsen einen `RangeError` in der Konsole ausgibt. SILMO fing den Fehler bereits ab; die Meldung wurde von `console.error` auf eine erwartbare Importwarnung umgestellt.
- Auf Commit `f1d97ad7f03ca6fc9efd126e704b6bbd74b2f33d` waren anschliessend Code-Checks und vollständige Playwright-Browser-Regression erfolgreich.
- Code-Check-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44737483853
- Browser-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44737483844
- Der Browser-Test bestätigt nun: beschädigter STL-Import wird abgewiesen, der bestehende Modellbestand bleibt unverändert und es entsteht kein unerwarteter Konsolenfehler.


## Ergänzung – erste reproduzierbare History-Leistungsbaseline am 20.11.2026

- `scripts/benchmark-history.mjs` wurde ergänzt und über `npm run benchmark:history` in die Code-Checks eingebunden.
- Er misst 1, 10 und 50 Objekte mit je 999 Vertices, fünf Snapshots, Snapshot-Aufnahmezeit, Undo-/Redo-Zeit sowie Node-Speicherwerte vor/nach Snapshot und nach Freigabe/GC.
- Der Benchmark ist bewusst informativ und verwendet keine maschinenabhängigen Schwellenwerte. Er ist eine isolierte History-Baseline, noch keine vollständige Browser-/CAD-Leistungsmessung.
- Der neue Benchmark muss durch den nächsten Code-Check-Lauf ausgeführt und auf seine Messausgabe geprüft werden.


## Ergänzung – reproduzierbare History-Baseline am 20.11.2026

- `npm run benchmark:history` wurde in die Code-Checks aufgenommen. Der Benchmark verwendet Node v22.23.5 und Three.js r128, misst je 999 Vertices pro Objekt, fünf Snapshots und 1/10/50 Objekte.
- Messung auf dem GitHub-Runner (nur Referenzwerte, keine Pass/Fail-Grenzen):
  - 1 Objekt: Snapshot-Median 0,035 ms; Undo 0,192 ms; Redo 0,106 ms.
  - 10 Objekte: Snapshot-Median 0,095 ms; Undo 0,277 ms; Redo 0,224 ms.
  - 50 Objekte: Snapshot-Median 0,669 ms; Undo 1,429 ms; Redo 1,480 ms.
- Bei 50 Objekten stiegen die ArrayBuffer-Werte während fünf Snapshots von rund 1,22 MB auf 7,21 MB und fielen nach History-Dispose und GC auf rund 20,8 KB zurück. Die History-Stacks waren danach leer und als disposed markiert.
- Die Code-Checks inklusive Benchmark und die vollständige Playwright-Browser-Regression waren auf Commit `8ee614b10654e99b77d286c9bad66ae47e8342da` erfolgreich.
- Code-Check-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44738160483
- Browser-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44738160492
- Dies ist eine erste isolierte Node-History-Baseline, keine Aussage über Browserleistung oder grosse CAD-Modelle.


## Ergänzung – Skizzen-/Kontur-Toleranz-Audit am 20.11.2026

- Neun bisher direkt im CAD-Hauptskript verwendete Werte wurden in `src/tolerances.js` mit dimensionsspezifischen Namen versehen.
- Betroffen sind Punktaufnahme, Mindestlinienlänge, Zeichenpunktabstand, Vorschauversatz, Klickkonturabschluss, Klickkonturpunktabstand, minimale Straightening-Bewegung, RDP-Degenerationsnenner und Mindestfläche einer Freiform.
- Alle numerischen Werte bleiben unverändert; Aufrufstellen verwenden jetzt die zentrale API. Die Unit-Tests sichern die Werte.
- Spezifikation und Masterplan wurden ergänzt. Der neue Stand benötigt noch den automatischen Code- und Browser-Regressionslauf.


## Ergänzung – Bild-Studio-Druckbarkeitsgrenzen am 20.11.2026

- Die Bildkomponenten-Mindestgrösse (dimensionsloser Bildflächenanteil), die Mindestfläche real abgebildeter Konturen (mm²) und die Mindestwandstärke (mm) wurden in `src/tolerances.js` benannt und in `src/image-studio.js` auf die zentrale API umgestellt.
- Die bisherigen Werte 0,000025, 0,01 mm² und 0,8 mm bleiben unverändert. Unit-Tests sichern die Werte.
- Die gemischte Flächenschwelle in `polygonIsSimple` wurde bewusst nicht migriert: die Funktion wird in mehreren Koordinatenräumen genutzt und muss zuerst sauber getrennt werden.
- Der neue Stand benötigt noch den automatischen Code- und Browser-Regressionsnachweis.


## Ergänzung – Einheitenprüfung der Bildkonturfläche abgeschlossen am 20.11.2026

- Alle Aufrufstellen von `polygonIsSimple` wurden geprüft. Die Funktion wird ausschliesslich von `validatePrintableContours` auf Konturen aufgerufen, die bereits in reale Millimeter abgebildet wurden.
- Die bisherige Mindestfläche 0,01 wird deshalb korrekt als `IMAGE_MIN_SIMPLE_POLYGON_AREA_MM2` benannt und in `src/image-studio.js` verwendet.
- Die neue Konstante wird durch `tests/tolerances.test.cjs` gesichert. Die zuvor offene mögliche Einheitenvermischung ist damit für diese Stelle geklärt.
- Die abschliessende Code- und Browser-CI-Prüfung für den gesamten Audit-Stand steht noch aus.


## Ergänzung – Korrektur der Druckbett-Toleranzdokumentation am 20.11.2026

- Die aktuelle Quellcodeprüfung bestätigt zwei getrennte Werte: Skizzenkontur-Grenze `SKETCH_BED_BOUNDS_WORLD_UNITS = 1e-5` und fertige Modell-Druckbettprüfung `PRINT_BED_BOUNDS_WORLD_UNITS = 1e-4` Welteinheiten.
- Eine ältere Tabellenzeile hatte die Werte verwechselt. Die technische Spezifikation ist korrigiert; am Programmverhalten wurde nichts geändert.


## Ergänzung – Kontur-Hohlrahmen-Gehrungsgrenze am 20.11.2026

- Die Begrenzung der inneren Gehrungs-/Offset-Schnittpunkte verwendet nun `CONTOUR_FRAME_MITER_LIMIT_FACTOR = 8` und `CONTOUR_FRAME_MITER_ALLOWANCE_WORLD_UNITS = 0.02` aus der zentralen Toleranz-API.
- Die Dimensionen (dimensionsloser Faktor und Welteinheiten) bleiben getrennt; Werte und Verhalten wurden nicht verändert.
- Unit-Tests und Browser-Regression müssen den neuen Stand noch bestätigen.


## Ergänzung – Freiform-/Herz-Kontur-Punktabstände am 20.11.2026

- Die Freiform-Punktbereinigung nutzt nun `SKETCH_FREEFORM_MIN_POINT_SPACING_WORLD_UNITS = 0.005`.
- Die spezielle Herz-Konturklassifikation nutzt `HEART_OUTLINE_POINT_DEDUPLICATION_WORLD_UNITS = 1e-5`.
- Beide Werte sind unverändert und durch Toleranz-Unit-Tests abgesichert. Die Erkennungslogik wurde nicht geändert.


## Ergänzung – Bildkontur-Grenzfalltests am 20.11.2026

- Der Browser-Test prüft nun die Druckbarkeitsgrenzen exakt: 0,8 mm Mindestwand wird akzeptiert, 0,799 mm abgewiesen; 0,01 mm² Mindestkonturfläche wird akzeptiert, 0,009801 mm² abgewiesen.
- Bestehende Prüfungen für Randabstand, überlappende Innenlöcher und selbstschneidende Konturen bleiben bestehen.
- Diese zusätzlichen Browserfälle müssen noch in einem vollständigen Actions-Lauf erfolgreich bestätigt werden.


## Ergänzung – numerischer Bildflächen-Grenzfall am 20.11.2026

- Der Browser-Test deckte einen Gleitkomma-Grenzfall auf: eine mathematisch exakt 0,01 mm² grosse Kontur wurde durch binäre Rundung knapp unter dem Mindestwert eingeordnet.
- Die Vergleiche verwenden jetzt `IMAGE_MIN_AREA_COMPARISON_EPSILON_MM2 = 1e-12`. Die fachliche Mindestfläche bleibt 0,01 mm²; 0,009801 mm² muss weiterhin abgewiesen werden.
- Der korrigierte Stand muss den vollständigen Code- und Browser-Testlauf noch bestehen.


## Ergänzung – Einheitenkorrektur der Bildkonturprüfung am 20.11.2026

- Die Quellcode-Aufrufstellen bestätigen, dass Punkt-in-Polygon- und Segmentabstandsprüfungen nur auf bereits in reale Millimeter abgebildete Konturen angewendet werden.
- Fünf Toleranznamen wurden deshalb von irreführenden Pixel-/Pixel²-Endungen auf mm-/mm²-Endungen korrigiert. Die Zahlenwerte und das Laufzeitverhalten blieben unverändert.
- Die Bildraster-Erkennung bleibt weiterhin im Pixelraum; die Druckkonturprüfung bleibt im Modellmassraum.


## Ergänzung – vollständige Regression nach Bildflächen- und Einheitenkorrektur am 20.11.2026

- Der Code-Check und der vollständige Playwright-Browserlauf sind auf Code-Commit `e96d550896e7b18e0ea912a13a8b22b7a93fd4ca` erfolgreich.
- Der Lauf enthält die numerisch robuste Mindestflächenprüfung (0,01 mm² mit separatem 1e-12-mm²-Vergleichsspielraum) und die korrekt als mm/mm² benannten Punkt-in-Polygon-/Segmenttoleranzen.
- Ein weiterer Code-Check auf dem nachfolgenden Dokumentationsstand `8df0875ca835099f3a9034150e09a263c439e7df` ist ebenfalls erfolgreich; der dazugehörige Browserlauf läuft noch. Die Programmdateien sind seit `e96d...` unverändert.


## Ergänzung – zusätzliche STL- und Projektgeometrie-Regressionen am 20.11.2026

- Der Browser-Test prüft jetzt zusätzlich eine binäre STL-Datei mit nicht endlichen Koordinaten (NaN). Der Import muss vor dem Modellaufbau abgewiesen werden; die Anzahl vorhandener Modelle muss unverändert bleiben.
- Für Commit `690ff7c5d1bdec0645a6ffb8796bccd40d4be496` waren Code-Checks und vollständige Playwright-Browser-Regression erfolgreich.
- Code-Check-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44753695266
- Browser-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44753695318
- `tests/project-schema.test.cjs` prüft zusätzlich, dass nicht-indizierte Meshes mit vollständigen Dreiecksgruppen akzeptiert und unvollständige Dreiecksgruppen abgewiesen werden.
- Für Commit `414a79af11bd4554fef6f3049a8666dc25ea0c20` waren Code-Checks und vollständige Playwright-Browser-Regression erfolgreich.
- Code-Check-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44754049101
- Browser-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/44754049089
- PR #70 bleibt Draft. Kein Merge nach `main`, kein Live-Deployment und keine kostenpflichtigen Dienste; Kostenlimit CHF 0.00.


## Ergänzung – projektweite Geometrie-Obergrenze (20.11.2026)

- Die bisherige Schema-Prüfung begrenzte die Geometriedaten pro einzelnes Mesh, nicht aber die Summe über alle Projektobjekte und verbundene Union-Teile.
- `src/project-schema.js` validiert Geometrien nun bereits beim Prüfen des Projektumschlags und zählt Positions-/Normal-/weitere Attributwerte sowie Indizes projektweit.
- Die neue Obergrenze beträgt 15'000'000 numerische Geometriewerte pro Projekt. Sie verhindert, dass bis zu 100 Objekte jeweils das individuelle Mesh-Limit ausschöpfen und zusammen einen unverhältnismässig grossen Import erzeugen.
- Der Grenzfalltest prüft 15'000'000 Werte als akzeptierte Grenze und weist einen zusätzlichen Mesh-Anteil innerhalb eines Union-Teils ab.
- Noch ausstehend: Code-Checks und vollständiger Browserlauf auf dem neuen Commit; bis dahin gilt die Änderung als implementiert, aber noch nicht verifiziert.
- Kein Merge, kein Deployment; CHF 0.00.


## Ergänzung – Grundkörper-Modul und erweiterte OCCT-Prüfung (20.11.2026)
- Die reine Geometrieerzeugung der sechs Grundkörper ist in `src/primitive-geometry.js` ausgelagert. Objektanlage, Materialien, Auswahl und App-Zustand verbleiben im CAD-Hauptskript.
- Die Unit-Tests prüfen die mathematischen Bounding-Box-Abmessungen von Würfel, Kugel, Zylinder, Kegel, Sechskant-Prisma und Torus sowie den bisherigen Fallback.
- Auf Code-Commit `1880cc057d8c332d13cbf50691bb3864a3461bea` sind 37/37 Unit-Tests erfolgreich; die vollständige SILMO-Browser-Regression ist ebenfalls erfolgreich.
- OCCT-Prototyp-Run `44761699676` ist erfolgreich: 40-Bohrungs-Musterplatte, analytisches Volumen, ein Solid und Tessellierung; die Boolean-Berechnung dauerte im GitHub-Runner rund 353 ms.
- Chromium-WebWorker-Smoke-Test: zwölf sequenzielle Durchgangsbohrungen, Volumen 5811,504440784614 mm³ gegenüber Soll 5811,504440784613 mm³, genau ein Solid und ein verwendbares Mesh.
- Der CAD-Kern bleibt isolierte Forschung und ist nicht in die Produktions-App integriert. PR #70 bleibt Draft; kein Merge, kein Deployment und CHF 0.00.


## Ergänzung – Skizzenextrusions-Modul (20.11.2026)
- `src/sketch-geometry.js` übernimmt die Erstellung der Extrusionsgeometrie aus einem bereits aufgebauten Three.js-2D-Profil sowie die Berechnung von Normalen, Bounding Box und Bounding Sphere.
- Die reguläre Freiform-Extrusion (inklusive echter Innenlöcher) und die Extrusion der parametrischen 2D-Skizzen verwenden diese Factory.
- Skizzeneingabe, Profilaufbau, Masse, Constraints, Positionierung, Druckbettprüfung, Metadaten, Material, Undo-History und Szene-Commit bleiben im Hauptskript.
- Neue Tests prüfen 4×3×2-Quader mit Volumen 24, eine Innenloch-Extrusion mit Volumen 22, Kreisprofil, Geometrieinstanzen und Fehlerfall.
- Auf Commit `4f6b1be0983651f590977a10ab48e34b3146d551` sind 41/41 Unit-Tests, die vollständige Browser-Regression sowie der isolierte OCCT-/WebWorker-Test erfolgreich.
- PR #70 bleibt Draft und ungemergt. Kein Deployment. Kosten: CHF 0.00.


## Ergänzung – Parametrische Skizzenprofile (20.11.2026)
- Das Skizzen-Geometriemodul erzeugt nun die parametrischen Profile Kreis, Ellipse, Dreieck, Rechteck und abgerundetes Rechteck.
- Die gemeinsame Funktion für abgerundete Rechteckpfade wird sowohl von der Skizzenvorschau als auch von der Profilgenerierung verwendet. Die umgekehrte Konturrichtung für Innenkonturen ist weiter verfügbar.
- Die App validiert weiterhin die Eingabegrenzen (z.B. Eckenradius); das Geometriemodul kontrolliert zusätzlich positive Profilabmessungen.
- Neue Tests ergänzen die Extrusions-/Lochtests um die Soll-Aussenabmessungen aller Profilformen und die umgekehrte Konturrichtung.
- Commit `2af76685ebf31a417bc0cf1896a7b161a199567c`: 44/44 Unit-Tests, Browser-Regression und OCCT-WebWorker erfolgreich.


## Ergänzung – Loft- und Sweep-Geometrie (20.11.2026)
- `src/sketch-geometry.js` übernimmt jetzt auch das Resampling geschlossener Konturen, die Erzeugung von Loft-Geometrien mit Endkappen und Sweep-Geometrien entlang einer 3D-Catmull-Rom-Kurve.
- Das Hauptskript verwaltet weiterhin Quellobjektauswahl, Welttransformationen, Undo-History, Material, Szene-Commit und UI.
- Zusätzliche Tests prüfen analytische Sollvolumen für einen Loft-Quader (8 Einheiten³) und einen Sweep-Quader (12 Einheiten³), Abmessungen, endliche Geometriedaten und ungültige Eingaben.
- Bekannte Loft-Grenzen bleiben dokumentiert: Die Kappentriangulation arbeitet in XY-Weltprojektion und ist nicht für beliebig geneigte Profile oder Innenlöcher abgesichert. Die optimale Zuordnung der Kontur-Startpunkte ist noch offen.
- Code-Head `9bf75280747d879f5980df6c9cc45b5da199fea1`: 48/48 Unit-Tests, Browser-Regression und isolierter OCCT-/WebWorker-Test erfolgreich.
- Keine Versionsänderung, kein Merge, kein Deployment; Kosten CHF 0.00.


## Ergänzung – CAD-Pfadkurven und Pfadrohre (20.11.2026)
- Das Geometriemodul erzeugt nun auch gerade 2D-Pfadkurven, Catmull-Rom-Kurven und die zugehörigen Rohrgeometrien.
- Die App verwendet die gemeinsame Factory bei Skizzenanlage und Pfadlängenänderung. Pfadbearbeitung, mm-Konvertierung, History, Objektverwaltung und UI bleiben im Hauptskript.
- Tests prüfen Pfadlänge, Linien-/Kurvenverhalten, Rohrabmessungen und Parameterfehler.

- Code-Head `fdb0139a9b48188b39f92ecbe1beb5260618781c`: 51/51 Unit-Tests, Browser-Regression und OCCT-/WebWorker-Test erfolgreich. Die anschliessende Änderung `1be5a96` betrifft nur die Projektdokumentation.


## Ergänzung – Hohlrahmen-Geometrie (20.11.2026)
- Die Erzeugung der versetzten Innenkontur und des extrudierten Hohlrahmens wurde nach `src/sketch-geometry.js` verschoben.
- Die UI-/Modellzuständigkeiten bleiben im Hauptskript. Ein Mindestabstandscheck weist zu grosse Wandstärken zurück, die zuvor über den Kollapspunkt der Innenkontur hinauslaufen konnten.
- Tests decken Volumen, Abmessungen, beide Konturrichtungen und ungültige Wandstärken ab.
- Code-Head `208815fd7d101f1af4520d2834c8437a9ea8bad4`: 54/54 Unit-Tests, Browser-Regression und OCCT-/WebWorker-Test erfolgreich.


## Ergänzung – Kantenbearbeitung und Toleranz-Audit (20.11.2026)
- Die Geometrieerzeugung für Abrunden und Abfasen wurde nach `src/sketch-geometry.js` ausgelagert; App-Auswahl, Eingabeprüfung, History und UI verbleiben in `index.html`.
- Unit-Tests für beide Modi prüfen endliche Mesh-Daten, Normalen, Bounding-Box/-Sphere, Sollabmessungen und ungültige Parameter.
- Der Toleranz-Audit umfasst 45 benannte Werte. Ein neuer Quellcode-Test prüft, dass jede Konstante in mindestens einem Laufzeitmodul verwendet wird; Lernkurs-Schwellen werden dazu korrekt in `src/tutorial.js` gesucht.
- Die neuen Prüfungen sind implementiert; CI-Erfolg ist noch nicht bestätigt.
