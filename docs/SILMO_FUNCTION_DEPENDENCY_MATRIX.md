# SILMO – Funktions- und Abhängigkeitsmatrix

**Stand:** 20.11.2026
**Basis:** Technische Bestandsaufnahme v90 vom 14.11.2026 und Masterplan.
**Zweck:** Bestehende Funktionen und bekannte technische Grundlagen vor Architektur- und Kernelmigration festhalten.

> Diese Matrix ist eine Arbeitsgrundlage. Wo die Bestandsaufnahme keine konkrete interne Codebeziehung belegt, steht ausdrücklich „Quellcodeprüfung offen“.

## 1. Bestehende Funktionsbereiche

| Bereich | Vorhandener Stand laut Audit | Bereits vorhandene Prüfung | Schutz bei Migration |
|---|---|---|---|
| 3D-Ansicht | Three.js r128 lokal gepinnt, Kamera/Navigation, Arbeitsraster und Druckbett | Browserstart und Canvas-Prüfung | Rendering und Bedienung unabhängig vom CAD-Kern halten |
| Grundkörper | Würfel, Kugel, Zylinder, Kegel, Sechskant-Prisma, Torus | Objektanlage im Browser-Test | Geometrie, Masse und Bedienabläufe erhalten |
| Objektbearbeitung | Auswahl, Mehrfachauswahl, Verschieben, Drehen, Skalieren, Duplizieren, Löschen, Sperren | Browser-Regressionstests | Objekt-IDs und Transformationen schützen |
| Gruppen | Gruppieren, Gruppierung aufheben, Gruppenbearbeitung | Browser-Regressionstests | Gruppenstruktur und Undo/Redo erhalten |
| Ausrichten/Spiegeln | Objekte ausrichten und spiegeln | Browser-Regressionstests | Achsen, Positionen und Ergebnisse mathematisch prüfen |
| Skizzieren | 2D-Profile, Linien, Kurven, Freiform, mehrere Zeichenebenen, Rasterfang | Browser-Regressionstests | Skizzen editierbar halten; Einheiten und Ebenenbezug vereinheitlichen |
| Skizzenbedingungen | Beziehungen, Abstände und Längen | Browser-Regressionstests | Vorhandene Bedingungen und Werte erhalten |
| Extrusion/Hohlkörper | Skizzen extrudieren, Konturrahmen und Hohlkörper | Browser-Regressionstests | Profil- und Innenkontursemantik erhalten |
| Boolesche Operationen | Eigene BSP-basierte CSG-Operationen; Vereinigen und Abziehen | Browser-Regressionstests | BSP erst nach Vergleichs- und Regressionstests ersetzen |
| Loft/Sweep | Vorhandene Loft- und Sweep-Werkzeuge | Browser-Regressionstests | Vorhandene Profile, Pfade und Ergebnisse als Referenz sichern |
| Kantenbehandlung | Abrunden und Fasen | Browser-Regressionstests | Fehlgeschlagene Operationen dürfen Originalgeometrie nicht beschädigen |
| Projektdateien | Projektformat v3 mit eingebetteten Geometriedaten, Schema- und Geometrievalidierung; Export validiert dieselbe Projekthülle und hält das 25-MB-Importlimit ein; Import baut alle Meshes vor dem atomaren Commit auf | Unit-Tests für Save/Open, Roundtrip, ungültige Transformationen, fehlgeschlagenen Teilaufbau und Dateigrössen; Browser-Tests inkl. minimalem/erweitertem Fixture und fehlerhaften Geometriedaten | Reale ältere Benutzerprojekte und explizite Migrationen bleiben offen |
| STL | Import/Export in `src/stl-io.js`, zentrale mm-Konvertierung; Importgrenze 50 MB/500'000 Dreiecke und Koordinatenlimit ±10'000'000 mm; nicht blockierende Topologieprüfung erkennt offene, nicht-manifold und widersprüchlich orientierte Kanten, doppelte Flächen und negatives orientiertes Gesamtvolumen; Export prüft Geometrie, Indizes und endliche, nicht-null Skalierung/Drehung auf Geometriekopien | Isolierte Unit-Tests für mm-Import, Zentrierung, defekte/entartete/zu grosse Dreiecke, Exportkopien, ungültige Transformationen sowie geschlossenen Würfel, offenes Netz, doppelte Flächen, nicht-manifold Kanten und Orientierung; Browser-Tests mit realen ASCII-STL-Fixtures | Grosse Netze über 100'000 Dreiecke erhalten bewusst keine Topologieanalyse; Vertex-Link-/Selbstschnittprüfung, vollständige Reparatur/Heilung, Druckbarkeitsgarantie und Browser-Leistungsmessungen bleiben offen |
| Image Studio | Bildvorlage importieren, drehen, skalieren; Konturerkennung; Übergabe in Skizze/3D | Synthetische Browser-Regressionsfälle inkl. Randabstand, Lochüberschneidung, Selbstüberschneidung, 0,8-mm-Wand- und 0,01-mm²-Flächengrenze | Keine beliebige vollständige Foto-zu-3D-Rekonstruktion behaupten; weitere reale/komplexe Vorlagen und Erkennungsqualität bleiben offen |
| Oberfläche | Hauptbereiche und fokussierte Unterreiter; Anfänger-/Expertenmodus | Browser-Tests auf Sichtbarkeit und Interaktion | Keine Funktionen aus Einfachheitsgründen entfernen |
| Diagnose/Tutorials | Tastenkürzel, Tutorials, Diagnose-/Prüftool | Teilweise Browser-Tests | Hilfen beim Modulumbau erhalten |

## 2. Bekannte technische Grundlagen und Risiken

| Grundlage | Im Audit bestätigter Ist-Zustand | Daraus folgender Architekturbedarf |
|---|---|---|
| Anwendungseintritt | Hauptsächlich eine index.html mit eingebettetem CSS/JavaScript | Modulgrenzen schrittweise herauslösen; Anwendung lauffähig halten |
| Rendering | Three.js r128 aus lokal bereitgestellten, gepinnten Dateien | Rendering als eigene Schicht erhalten; lokale Runtime-Version reproduzierbar halten |
| Modellrepräsentation | Aktive Objekte sind Three.js-Meshes mit BufferGeometry | Exakte Geometrie und triangulierte Darstellung trennen |
| Boolesche Geometrie | Eigener BSP-basierter CSG-Algorithmus | Vergleichstestkorpus erstellen; keinen ungetesteten Austausch vornehmen |
| Einheiten | 1 Three.js-Einheit = 10 mm; zentrale `src/units.js`-API für Längen, Flächen und Volumen | Restliche direkte Umrechnungsstellen inventarisieren; bestehende Semantik unverändert halten |
| Projektformat | JSON v3 mit eingebetteten Geometriedaten, Transformationen und Metadaten | Validatoren und Fixtures vorhanden; Migrationen erst mit realen Altformaten ergänzen |
| Undo/Redo | `src/history.js`, snapshotbasiert mit Restore-/Dispose-Schutz und Material-Arrays | Unit-Tests plus Node-Benchmark für 1/10/50 Objekte | Browser-RAM/Frame-Zeit und grosse reale Meshes fehlen; inkrementelle/befehlsbasierte History bleibt offen |
| Tests | Playwright-Browserregression plus Node-Unit-Tests; aktueller Testquellstand: 23 Unit-Testfälle und 9 Browser-Testblöcke mit zusammen ungefähr 505 Assertion-Aufrufen | Geometrische Sollwerte, grosse reale CAD-Modelle und Browser-Leistungsmessungen ergänzen |
| Abhängigkeiten | `package.json`/Lockdatei, Three.js 0.128.0 gepinnt und lokale Runtime-Vorbereitung; keine CDN-Laufzeitabhängigkeit | Reproduzierbaren Build und Pages-Paketprüfung erhalten |
| Bildverarbeitung | Lokale Browser-Konturerkennung; Bildraster- und Modellmass-Prüfungen sind getrennt | Foto-zu-3D getrennt erforschen; Ergebnisse editierbar halten |

## 3. Datenflussübersicht – bestätigte und offene Beziehungen

### Belegte Funktionsabläufe
1. Bildvorlage → Konturerkennung → Kontur → 3D-Körper: Das Image Studio kann erkannte Konturen in vorhandene Skizzen-/3D-Funktionen überführen.
2. Skizze → Extrusion → 3D-Körper: Skizzen können in Körper überführt werden.
3. 3D-Körper → Boolesche Operation: Körper können vereinigt und voneinander abgezogen werden.
4. 3D-Körper → STL: Die Anwendung kann STL exportieren.
5. Projekt → JSON-Datei → Projekt öffnen: Projektzustand kann gespeichert und wieder geöffnet werden.

### Vor Migration direkt im Quellcode zu verifizieren
- Wo werden Modellobjekte erstellt und welche Funktionen erzeugen BufferGeometry?
- Wo und wie werden die 10 Einheiten pro Millimeter angewendet?
- Welche Funktionen verändern Mesh-Geometrie direkt?
- Welche Funktionen setzen voraus, dass ein Objekt ein Three.js-Mesh ist?
- Wie werden Gruppen, Kindobjekte und Objekt-IDs serialisiert?
- Wie werden Undo-/Redo-Snapshots erstellt und wiederhergestellt?
- Welche Bildkontur-Daten werden im Projekt gespeichert?
- Welche CSG-Ergebnisse und Fehlerfälle decken die vorhandenen Tests tatsächlich ab?
- Welche Funktionen lesen oder schreiben Material-, Normalen-, UV- und Bounding-Informationen?

Diese offenen Fragen werden anhand konkreter Funktionsnamen, Aufrufstellen und Testfälle ergänzt, bevor produktiver Code auf ein neues Datenmodell umgestellt wird.

## 4. Migrationsschutz: Reihenfolge und Abnahmekriterien

### Schutzstufe 1 – Referenzverhalten sichern
- Bestehende Browser-Tests unverändert als Regressionstest erhalten.
- Für Grundkörper, Extrusion, Booleans, Loft/Sweep, Fillet/Chamfer und STL konkrete Geometrie-Sollwerte ergänzen.
- Projektdateien aus v90 als Kompatibilitätsfixtures sichern.
- Aktuelle Einheitenumrechnung mit bekannten Referenzkörpern dokumentieren.

**Abnahme:** Referenzfälle sind reproduzierbar und erwartete Werte nachvollziehbar.

### Schutzstufe 2 – Domänenmodell und Einheiten
- Modellobjekt, exakte Form, Darstellungsmesh und Transformationsdaten als getrennte Konzepte definieren.
- Eine verbindliche interne Einheit festlegen; die bestehende Umrechnung bleibt bis zur getesteten Migration unverändert.
- Toleranzarten getrennt benennen (z. B. Modell-/Geometrietoleranz, Tessellierung und Import-/Heilungstoleranz), statt einen unklaren Wert überall einzusetzen.
- Dokumentformat und Schema-Versionen festlegen.

**Abnahme:** Einheiten und Toleranzen sind zentral dokumentiert; keine stillen Änderungen an bestehenden Projekten.

### Schutzstufe 3 – Isolierter Kernel-Prototyp
- Kernel nicht in die Hauptanwendung integrieren.
- Gleiche Testkörper und Sollwerte für jeden Kandidaten verwenden.
- Erzeugung, Boolesche Operation, Topologieabfrage, Fillet/Chamfer, Tessellierung und STEP-Roundtrip getrennt bewerten.
- Fehlerfälle, Speicherfreigabe und Worker-Verhalten erfassen.
- Lizenz und Wartbarkeit als technische Abnahmekriterien behandeln.

**Abnahme:** Prototyp-Ergebnisse sind durch automatisierte Tests und reproduzierbare Messungen belegt.

### Schutzstufe 4 – Vertikaler Migrationsschnitt
- Erst nach bestandenem Prototyp eine einzelne Modellierungsstrecke parallel migrieren.
- Vorhandene Mesh-basierte Anwendung bleibt Rückfallpfad.
- Keine globale Umstellung, solange Projektkompatibilität und Regressionen nicht bewiesen sind.

**Abnahme:** Der migrierte Ablauf funktioniert vom Erstellen über Bearbeiten und Anzeigen bis Speichern/Wiederöffnen.

## 5. Nächste konkrete Arbeit nach dieser Matrix
1. Restliche Quellcodeprüfung der Objekt-Erzeugung, Mesh-Manipulation, Projektserialisierung und CSG-Aufrufstellen abschliessen.
2. Mathematische Sollwerte für Grundkörper, Extrusion, Boolesche Operationen, Loft/Sweep, Fillet/Chamfer und STL aus Referenzkörpern ergänzen.
3. Browser-RAM/Frame-Zeit und Import-/Export-/CSG-Zeit an grösseren realen Meshes messen.
4. Toleranz-Audit mit positiven/negativen Grenzfällen pro Funktionsfamilie vervollständigen.
5. Snapshot-History hinsichtlich grosser realer CAD-Modelle bewerten und danach die nächste Modulgrenze nur mit dokumentierter Abhängigkeitsanalyse extrahieren.
6. PR #69 und PR #70 als geordnete Änderungen prüfen; bis zur ausdrücklichen Fertigstellung weder mergen noch deployen.

## 6. Quellen im SILMO-Projekt
- [Masterplan](SILMO_MASTERPLAN.md)
- [Technische Bestandsaufnahme v90](SILMO_CURRENT_STATE_AUDIT.md)
- [Einheiten- und Toleranzspezifikation](SILMO_UNITS_TOLERANCE_SPEC.md)
- [Geometriekern-Vorauswahl und Testplan](SILMO_GEOMETRY_KERNEL_EVALUATION.md)
- [Vollständige Projektsicherung](SILMO_PROJECT_BACKUP.md)


## 7. Ergänzung – aktueller Phase-1-Stand am 20.11.2026

- Lokale Three.js-Runtime, Projektformat v3, zentrale Einheiten-API, History-, STL-, Projekt-I/O-, Projektgeometrie-, Image-Studio-, Toleranz- und Navigationsmodule sind im Entwicklungszweig vorhanden.
- Die History ist weiterhin snapshotbasiert; der isolierte Node-Benchmark ist keine Browser-/CAD-Gesamtmessung.
- Die Toleranz-API benennt Werte dimensionsgetrennt. Die Bildkontur-Punkt-in-Polygon- und Segmentprüfungen wurden anhand der Aufrufstellen korrekt als mm/mm² klassifiziert; Pixelraum-Erkennung bleibt getrennt.
- Die Bildkontur-Druckbarkeitsprüfung hat Browser-Grenzfälle für Mindestwand 0,8 mm und Mindestfläche 0,01 mm². Ein numerischer Vergleichsspielraum von 1e-12 mm² verhindert Gleitkomma-Rundungsfehler an der exakten Grenze.
- Der Code-Check-Workflow auf Commit `67cb91f9b55f2775e6cb5ccae71caeff5c5ad1a0` ist erfolgreich. Der vollständige Browserlauf auf demselben Code-Stand läuft noch; der unmittelbar vorherige Stand mit Flächen-Grenzfallkorrektur hatte vollständige Code- und Browserprüfungen erfolgreich.
- Offen bleiben grössere reale CAD-Referenzkörper, Browser-Speicher-/Frame-Zeit, vollständige Geometrie-Sollwerte für alle Modellierungsfamilien, Rest-Audit der Toleranzen und die Prüfung der PR-Reihenfolge.
