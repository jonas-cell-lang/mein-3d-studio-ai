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
