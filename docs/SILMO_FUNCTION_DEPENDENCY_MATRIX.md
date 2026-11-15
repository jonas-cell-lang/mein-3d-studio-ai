# SILMO – Funktions- und Abhängigkeitsmatrix

**Stand:** 15.11.2026
**Basis:** Technische Bestandsaufnahme v90 vom 14.11.2026 und Masterplan.
**Zweck:** Bestehende Funktionen und bekannte technische Grundlagen vor Architektur- und Kernelmigration festhalten.

> Diese Matrix ist eine Arbeitsgrundlage. Wo die Bestandsaufnahme keine konkrete interne Codebeziehung belegt, steht ausdrücklich „Quellcodeprüfung offen“.

## 1. Bestehende Funktionsbereiche

| Bereich | Vorhandener Stand laut Audit | Bereits vorhandene Prüfung | Schutz bei Migration |
|---|---|---|---|
| 3D-Ansicht | Three.js r128, Kamera/Navigation, Arbeitsraster und Druckbett | Browserstart und Canvas-Prüfung | Rendering und Bedienung unabhängig vom CAD-Kern halten |
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
| Projektdateien | JSON-Projekt mit eingebetteten Geometriedaten, Öffnen/Speichern | Genaue Schemaabdeckung offen | Rückwärtskompatibilität und Schema-Versionierung definieren |
| STL | Import und Export | Grenzfallabdeckung offen | Mesh-Ausgabe, Einheiten und Normalen prüfen |
| Image Studio | Bildvorlage importieren, drehen, skalieren; Konturerkennung; Übergabe in Skizze/3D | Synthetische Browser-Regressionsfälle | Nicht als beliebige vollständige Foto-zu-3D-Rekonstruktion ausgeben |
| Oberfläche | Hauptbereiche und fokussierte Unterreiter; Anfänger-/Expertenmodus | Browser-Tests auf Sichtbarkeit und Interaktion | Keine Funktionen aus Einfachheitsgründen entfernen |
| Diagnose/Tutorials | Tastenkürzel, Tutorials, Diagnose-/Prüftool | Teilweise Browser-Tests | Hilfen beim Modulumbau erhalten |

## 2. Bekannte technische Grundlagen und Risiken

| Grundlage | Im Audit bestätigter Ist-Zustand | Daraus folgender Architekturbedarf |
|---|---|---|
| Anwendungseintritt | Hauptsächlich eine index.html mit eingebettetem CSS/JavaScript | Modulgrenzen schrittweise herauslösen; Anwendung lauffähig halten |
| Rendering | Three.js r128 über externe CDN-Skripte | Rendering als eigene Schicht erhalten; Abhängigkeiten später lokal verwalten |
| Modellrepräsentation | Aktive Objekte sind Three.js-Meshes mit BufferGeometry | Exakte Geometrie und triangulierte Darstellung trennen |
| Boolesche Geometrie | Eigener BSP-basierter CSG-Algorithmus | Vergleichstestkorpus erstellen; keinen ungetesteten Austausch vornehmen |
| Einheiten | 1 Three.js-Einheit = 10 mm (der Code teilt Millimeterwerte durch 10, um interne Koordinaten zu erhalten); Umrechnung an mehreren Stellen | Zentrale Unit-/Tolerance-API definieren; bisherige Umrechnung zunächst unverändert lassen |
| Projektformat | JSON mit eingebetteten Geometriedaten, Transformationen und Metadaten | Dokumentmodell mit Schema-Versionen und Migrationen spezifizieren |
| Undo/Redo | Vollständige Objektzustandskopien | Speicher-/Leistungsbaseline messen; später befehlsbasierten Verlauf vergleichen |
| Tests | Playwright-Browser-Test mit 327 Assertions laut Audit | Mathematische Unit- und Integrationstests ergänzen |
| Abhängigkeiten | Keine package.json im Repository-Root; CDN-Laufzeitabhängigkeiten | Build- und Dependency-Strategie nach Bestandsaufnahme festlegen |
| Bildverarbeitung | Lokale Browser-Konturerkennung | Foto-zu-3D getrennt erforschen; Ergebnisse editierbar halten |

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
1. Quellcodeprüfung der Einheitenumrechnung, Objekt-Erzeugung, Mesh-Manipulation, Projektserialisierung und CSG-Aufrufstellen.
2. Referenzfixtures und mathematische Sollwerte aus dem vorhandenen Verhalten ableiten.
3. Zentrale Unit-/Tolerance-Spezifikation festlegen, ohne das aktuelle Verhalten zu verändern.
4. Danach den isolierten Kernel-Prototyp anhand der dokumentierten Kandidaten und desselben Testkatalogs durchführen.

## 6. Quellen im SILMO-Projekt
- [Masterplan](SILMO_MASTERPLAN.md)
- [Technische Bestandsaufnahme v90](SILMO_CURRENT_STATE_AUDIT.md)
- [Einheiten- und Toleranzspezifikation](SILMO_UNITS_TOLERANCE_SPEC.md)
- [Geometriekern-Vorauswahl und Testplan](SILMO_GEOMETRY_KERNEL_EVALUATION.md)
- [Vollständige Projektsicherung](SILMO_PROJECT_BACKUP.md)
