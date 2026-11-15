# SILMO – Architekturentscheid vor Beginn der nächsten Programmierphase

**Datum:** 15.11.2026  
**Geltungsbereich:** Freigabe des Starts von Phase 1 des Masterplans; keine Freigabe eines Geometriekerns und keine Produktionsintegration.

## 1. Entscheid

**SILMO kann mit Phase 1 – zuverlässiges technisches Fundament – weiterprogrammiert werden.**

Die Kernel-Auswahl bleibt ausdrücklich offen. Die Programmierung von Phase 1 darf deshalb weder von einem noch nicht freigegebenen Kernel abhängen noch bereits bestehende CAD-Funktionen auf einen Kandidaten umstellen.

## 2. Verbindliche technische Leitplanken

1. Die bestehende Live-Anwendung bleibt der Ausgangspunkt. Kein Neustart und kein Entfernen vorhandener Funktionen.
2. Three.js r128 bleibt zunächst für Darstellung, Kamera, Auswahl und Interaktion zuständig.
3. Der vorhandene BSP-basierte Mesh-CSG-Kern bleibt unverändert und ist während der Migration der Rückfallpfad.
4. Kein OCCT-, Replicad- oder OpenGeometry-Paket wird in die Produktionsanwendung eingebunden.
5. Die bestehende Einheitensemantik bleibt erhalten: 1 Three.js-Welteinheit = 10 mm. Eine Änderung ist erst nach einer eigenen Projektformat-Migration zulässig.
6. Das bestehende Projektformat v3 bleibt lesbar. Neue Schema-Versionen benötigen explizite Migrationen und Kompatibilitätsfixtures.
7. Exakte CAD-Geometrie, Mesh-Darstellung und Dokumentzustand werden als getrennte Verantwortlichkeiten vorbereitet; eine vollständige Umstellung erfolgt nicht in einem Schritt.
8. Änderungen werden klein und vertikal geliefert. Jeder Schritt muss Build-, Browser- und Regressionstests bestehen.

## 3. Tatsächlich bestätigte Ausgangslage

- Der aktuelle App-Einstieg liegt in index.html mit umfangreichem Inline-CSS/JavaScript; im Repository-Root gibt es noch kein App-package.json.
- Primitive, Skizzen, Extrusionen, Kantenbehandlung und Boolesche Operationen erzeugen bzw. verändern direkt Three.js-Mesh-/BufferGeometry-Objekte.
- Die eigene CSG-Implementierung wandelt Dreiecke in BSP-Polygone um und erzeugt daraus wieder BufferGeometry; sie ist keine analytische B-Rep-Modellierung.
- Projektdateien speichern Geometrieattribute und Indizes als JSON-Arrays; der Loader validiert die Daten und baut zunächst alle neuen Objekte auf, bevor das aktuelle Projekt ersetzt wird.
- Das Projekt wird als Version 3 gespeichert. Der Loader prüft aktuell App-Kennung, Objektliste und Objektanzahl, aber keine explizite unterstützte Projektversionsliste.
- Undo/Redo erstellt vollständige Geometrie- und Materialkopien aller Objekte; der Undo-Verlauf ist auf 40 Zustände begrenzt. Das ist ein bekannter Speicher-/Leistungsbereich für spätere Messungen.
- STL-Import skaliert Millimeter auf interne Welteinheiten um; STL-Export skaliert Geometrie und Objektposition zurück auf Millimeter.
- Das Image Studio wird über globale Schnittstellen in den App-Zustand integriert.
- Die vorhandenen Playwright-Regressionen und die neuen isolierten Kerneltests laufen getrennt.

## 4. Kernel-Forschungsentscheid

Es wird **noch kein Kernel gewählt**.

- Moket ist unter den OCCT-Kandidaten derzeit am transparentesten bei LGPL-Hinweisen, NOTICE, Quellarchiv und WASM-Austauschbarkeit. Das ist keine Rechtsfreigabe.
- andymai weist einen konkreten Lizenzwiderspruch zwischen npm-Metadaten, MIT-Lizenzdatei im Quellarchiv und LGPL-Angabe für das kompilierte WASM auf. Bis zur Klärung gesperrt.
- Replicad ist ein MIT-Wrapper über einer LGPL-lizenzierten OCCT-WASM-Komponente; die Wrapper-Lizenz beseitigt die LGPL-Pflichten nicht.
- OpenGeometry ist MPL-2.0, hat im Test aber offene Messpräzisions- und API-Lücken.
- Die standardisierte Kandidatenprüfung bleibt completed-with-gaps. Die erfolgreichen automatisierten Browserläufe sind keine manuelle Desktop-Safari-Prüfung.

## 5. Erste Programmierstrecke in Phase 1

Die erste Implementierung soll die Anwendung absichern und modularisierbar machen, ohne die Modellierungssemantik zu verändern:

1. Root-Build- und Dependency-Struktur vorbereiten; Laufzeitbibliotheken lokal und exakt versioniert laden, statt die bestehende CDN-Laufzeit unkontrolliert weiter auszubauen.
2. Bestehende HTML-/CSS-/JavaScript-Verantwortlichkeiten in kleine Module überführen, ohne UI-Neugestaltung oder Funktionsabbau.
3. Eine zentrale, getestete Einheiten-API einführen, die zunächst exakt das bisherige Verhalten abbildet.
4. Projektformat v3 als Kompatibilitätsfixture sichern; Versionsvalidierung und Migrationsregeln ergänzen, ohne alte Projekte zu verändern.
5. Den ersten vertikalen Referenzablauf testen: Grundkörper erstellen → auswählen/bearbeiten → speichern → wieder öffnen → STL exportieren.
6. Bestehende Browser-Regressionen und neue Unit-/Integrationstests bei jedem Schritt ausführen.

## 6. Noch offene Abnahmepunkte für spätere Phasen

- Vollständige Zuordnung aller verstreuten Toleranzschwellen zu ihrer fachlichen Bedeutung.
- Vollständige Fixtures für bestehende v3-Projekte und schwierige reale Modelle.
- Messung der Speicher-/Leistungskosten des aktuellen Undo-/Redo-Systems.
- Stabilitäts- und Austauschbarkeitstest eines konkreten Kernel-WASM in einem echten SILMO-Webbuild.
- Lizenzprüfung der exakt ausgelieferten WASM-Datei samt vollständigem passenden Quellcode.
- Manuelle Desktop-Safari-Prüfung.
- Rechtliche Prüfung der konkreten Verteilung vor einer späteren öffentlichen oder kommerziellen Veröffentlichung.

Diese offenen Punkte blockieren den Beginn von Phase 1 nicht. Sie blockieren aber die Freigabe einer Kernel-Integration und die Behauptung professioneller B-Rep-/CAD-Reife.

## 7. Prüfnachweise

- Isolierter Kandidaten- und Browser-Worker-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43701667009
- Code-Prüfungen: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43701667078
- Browser-Regression: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43701667067
- Pull Request mit isolierter Forschung: https://github.com/jonas-cell-lang/mein-3d-studio-ai/pull/68

**Freigabestatus:** Phase 1 darf beginnen, sobald der nachfolgende Provenienz-Workflow den Lockfile-Commit erfolgreich abgeschlossen hat und die drei CI-Prüfungen auf dem resultierenden PR-Head grün sind. PR 68 bleibt bis zur separaten Review-Entscheidung offen und unverändert ein Draft.
