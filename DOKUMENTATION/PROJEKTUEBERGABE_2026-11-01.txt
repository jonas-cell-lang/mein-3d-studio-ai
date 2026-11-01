# SILMO 3D Studio AI – Projektübergabe und Sicherungsstand
Stand: 1. November 2026
Sprache der Zusammenarbeit: Deutsch

## 1. Zweck dieses Dokuments
Dieses Dokument hält den technischen Projektstand fest, damit die Arbeit in einer späteren Unterhaltung ohne erneute Grundsatzklärung fortgesetzt werden kann. Es ist eine separate Projektdokumentation. Die bestehende Datei „Weiterentwickeln Deines 3D Studios.txt“ wurde nicht verändert.

## 2. Repository und Sicherung
- GitHub-Repository: jonas-cell-lang/mein-3d-studio-ai
- Repository-URL: https://github.com/jonas-cell-lang/mein-3d-studio-ai
- Arbeits-/Reparaturbranch: fix/v35-selection-tools
- Gesicherter Commit: 70cb7d324c883b704fa2e68da5c51afcf892dc3c
- Sicherungsbranch: backup/2026-11-01-stand-70cb7d3
- Sicherungsbranch wurde direkt vom Commit 70cb7d324c883b704fa2e68da5c51afcf892dc3c erstellt. Er ist ein unveränderter Snapshot des gesamten Repository-Stands zu diesem Commit.
- Der Branch main wurde nicht verändert.
- Die Datei index.html und die Tests befinden sich im Repository; dieser Sicherungsbranch ist ein Git-Snapshot, keine separate ZIP-Datei.

## 3. Live-/Testumgebung
- GitHub-Pages-Adresse: https://jonas-cell-lang.github.io/mein-3d-studio-ai/
- Zum gezielten Laden kann ein Cache-Buster verwendet werden: https://jonas-cell-lang.github.io/mein-3d-studio-ai/?v=70cb7d3
- Der Pages-Workflow für Commit 70cb7d3 war erfolgreich.
- Änderungen an der Pages-Quelle oder weitere Deployments nicht eigenmächtig auf main übertragen. Der Nutzer möchte keine ungefragten Versions-/Branchwechsel und möchte die bestehende Produktions-/Testadresse nicht unkontrolliert verändern.
- Das Laptop des Nutzers ist derzeit nicht verfügbar. Daher keine Schritte verlangen, die VS Code, lokale Installation oder Live Server voraussetzen. Der Nutzer testet über Safari auf dem iPad bzw. über einen Browser-Link.

## 4. Arbeitsweise und feste Wünsche des Nutzers
- Immer auf Deutsch antworten.
- Nutzer nicht mit Namen ansprechen.
- Anfängerfreundlich, klar und in überschaubaren Schritten erklären.
- Der Nutzer erwartet, dass Änderungen soweit möglich direkt im GitHub-Repository ausgeführt werden.
- Bei Codeänderungen sorgfältig prüfen und keine Tests behaupten, die nicht wirklich gelaufen sind.
- Klar unterscheiden zwischen statischer Codeprüfung, automatisierten Browser-Tests (Chromium) und echtem Safari-/iPad-Test.
- Keine Code-Teilstücke ausgeben, wenn der Nutzer vollständigen Code verlangt; im GitHub-Workflow nach Möglichkeit direkt Dateien im Repository bearbeiten.
- Keine neue Version oder Branch anlegen, ausser wenn der Nutzer ausdrücklich danach fragt oder eine separate Sicherung erforderlich ist.
- Bestehende Hauptversion und main nicht ungefragt überschreiben.
- Nicht wiederholt generische Fehlersuche oder Laptop-only-Anleitungen anbieten.

## 5. Letzter bestätigter Quellcode-Stand
Branch: fix/v35-selection-tools
Commit: 70cb7d324c883b704fa2e68da5c51afcf892dc3c
Commit-Nachricht: „Fix ungroup selection fallback for selected object“

Relevante Dateien:
- index.html – zentrale App mit 3D-Szene, Oberfläche und Funktionen.
- tests/silmo-browser-test.mjs – Playwright-Browserinteraktionstest.
- .github/workflows/browser-tests.yml – GitHub-Actions-Workflow für Browserinteraktionstests.

UI-/Build-Bezeichnung in index.html:
- HTML-Titel: „SILMO 3D Studio AI – v35 Reparatur Auswahlwerkzeuge“
- Build-Kommentar: „v35 – Reparatur Auswahlwerkzeuge: Ausrichten, Gruppieren, Spiegeln“
- Im Tutorial-/Diagnosebereich existiert noch ein interner älterer Build-Hinweis „v28 Ausrichten“. Dieser ist nicht mit dem aktuellen v35-Build zu verwechseln.

## 6. Auswahl-, Gruppen- und Transformationsfunktionen
Die Reparaturarbeit in v35 betraf insbesondere:
- Mehrfachauswahl über Auswahlmodus bzw. Ctrl/Meta-Klick.
- Ausrichten ausgewählter Objekte entlang X/Y/Z.
- Gruppieren ausgewählter Objekte durch groupId in userData.
- Gruppierung aufheben durch Entfernen der groupId aller Gruppenmitglieder.
- Spiegeln über X/Y/Z durch Skalierungszeichenwechsel und Aktualisierung der Szene.
- Auswahl eines Gruppenobjekts über selectObject(obj), wobei im normalen Modus die Gruppenmitglieder gemeinsam ausgewählt werden.
- Gesperrte Objekte werden beim Ausrichten herausgefiltert bzw. beim Gruppieren abgelehnt.

Wichtige bisherige Implementierungsdetails:
- createObjectGroup() sammelt gültige ausgewählte Objekte aus selectedObjects oder als Fallback selected.
- Eine Gruppe erhält eine Kennung in der Form „grp-“ plus Zeit-/Zufallsteil; diese wird auf obj.userData.groupId gesetzt.
- ungroupSelectedObjects() sammelt nun sowohl selectedObjects als auch selected in einem Set, filtert auf Objekte, die noch in objects enthalten sind, bestimmt daraus groupIds und entfernt groupId bei allen Mitgliedern dieser Gruppen.
- Nach dem Aufheben der Gruppe werden die Mitglieder wieder als Auswahl gesetzt und Objektliste, Eigenschaften und Move-Gizmo aktualisiert.
- mirrorSelectedObjects(axis) spiegelt ausgewählte Objekte um die Mitte ihrer kombinierten Begrenzungsbox.
- alignSelectedObjects() verwendet selectedObjects, mit Fallback auf selected, und berechnet die Begrenzungsboxen.

Wichtiger Bedienkontext:
- Mehrfachauswahl-Schalter und Gruppenaktionen liegen im Bearbeiten-/Edit-Bereich.
- Objektzeilen sind im Erstellen-/Create-Bereich sichtbar.
- Bisher beschriebener Ablauf zur Auswahl mehrerer Objekte: im Edit-Bereich Mehrfachauswahl aktivieren, im Create-Bereich weitere Objektzeilen auswählen und danach im Edit-Bereich die Aktion ausführen. Dieser Wechsel zwischen Bereichen ist auf iPad besonders genau zu prüfen.

## 7. Automatisierte Tests und was sie aussagen
Letzte erfolgreiche Browser-Testausführung:
- Workflow: „SILMO browser interaction tests“
- Run-ID: 41324124119
- Commit: 70cb7d324c883b704fa2e68da5c51afcf892dc3c
- Ergebnis: completed / success
- Job: browser-test, Job-ID 124900362372
- Logausgabe: „BESTANDEN: 3D-Start, Objekterstellung, Mehrfachauswahl, Ausrichten, Gruppieren, Spiegeln und Gruppierung aufheben.“

Letzte erfolgreiche Codeprüfung:
- Workflow: „SILMO code checks“
- Run-ID: 41324129013
- Commit: 70cb7d324c883b704fa2e68da5c51afcf892dc3c
- Ergebnis: completed / success

Letzter erfolgreicher Pages-Workflow:
- Workflow: „pages build and deployment“
- Run-ID: 41324123676
- Commit: 70cb7d324c883b704fa2e68da5c51afcf892dc3c
- Ergebnis: completed / success

Einschränkung:
- Browserinteraktionstests laufen auf GitHub Actions mit Playwright und Chromium (headless, SwiftShader/WebGL).
- Das ist kein echter Safari-Test und kein Test auf dem iPad des Nutzers.
- Der Test enthält eine programmatische Interaktionssequenz und prüft unter anderem, dass Gruppierung aufheben die groupId-Zuordnung entfernt. Ein erfolgreicher automatisierter Ablauf beweist nicht automatisch, dass die reale iPad-Bedienung, Tab-Wechsel, Touch-Eingaben und sichtbare Schaltflächen in jedem Fall korrekt funktionieren.
- Daher vor weiteren grösseren Änderungen den tatsächlichen Bedienablauf und die Zustandsverwaltung in index.html prüfen, statt nur den Test als Beweis zu nehmen.

## 8. Nächste technische Untersuchung
Bei der nächsten Weiterentwicklung zuerst den gesamten Ablauf in index.html nachverfolgen, nicht blind weitere Änderungen an ungroupSelectedObjects() vornehmen:
1. Wie wird die Objektzeile in der Liste auf Touch/Klick ausgewählt?
2. Wie werden selected, selectedObjects, multiSelectMode und individualGroupEdit synchron gehalten?
3. Was geschieht mit selectedObjects beim Wechsel zwischen Create- und Edit-Pane?
4. Wird der Klick auf die Schaltfläche ungroupObjects tatsächlich an ungroupSelectedObjects() weitergeleitet?
5. Wird der Status-Text nach der Aktion sichtbar aktualisiert?
6. Werden groupId-Werte korrekt aus allen Mitgliedern entfernt und bleibt die Auswahl anschliessend stabil?
7. Wird eine Gruppe beim erneuten Aufrufen der Objektliste oder beim erneuten Selektieren ungewollt wieder als Gruppe behandelt?
8. Gibt es CSS-/Overlay-/Touch-Probleme, durch die die Schaltfläche auf iPad nicht erreichbar ist?

Erst nach dieser Ursachenanalyse eine kleine, gezielte Korrektur machen und den Browser-Test entsprechend erweitern. Nicht nur den Test-Helfer verwenden: auch die echte UI-Schaltfläche und die Touch-/Pane-Wechsel simulieren.

## 9. Ursprünglich bestätigte Produktvision
Die separate Nutzerdatei „Weiterentwickeln Deines 3D Studios.txt“ enthält die ursprüngliche bestätigte Wunschliste mit 36 Wünschen in sechs Bereichen. Sie bleibt unverändert und ist die inhaltliche Grundlage. Zusammenfassung:
1. Grundfunktionen: Grundformen, Auswahl, Bewegung, Rotation, Skalierung, Löschen, Undo/Redo, Kopieren, Einfügen, Duplizieren, Farben.
2. Präzises Modellieren: Millimetereingaben, Tastaturbewegung, Formen verbinden, Löcher, Ausrichten, 3D-Text, eigene Formen.
3. 3D-Druck: Druckbett, STL-Import/-Export, Passform-/Druckprüfung, automatische Platzierung, Masse und weitere Formate.
4. KI: Text-/Sprachsteuerung, Bild-zu-3D, Modelländerung durch Text; Grundfunktionen sollen auch ohne KI verfügbar bleiben.
5. Lernen und Modi: Einsteiger-/Fortgeschrittenenmodus, Lernprogramm, Übungen, Erklärungen, Beispielmodelle.
6. Speichern/Sicherheit: Projekte speichern und öffnen, automatische Zwischenspeicherung, Export, Änderungsverlauf/Wiederherstellung, iPhone-/iPad-/Computer-Bedienung.

Die Wunschliste ist ein Ziel-/Planungsdokument. Bestätigte Wünsche dürfen nicht als bereits implementierte Funktionen dargestellt werden.

## 10. Grundsätze für die nächsten Änderungen
- Vor einer Änderung zuerst aktuellen Branch und HEAD prüfen.
- Änderungen möglichst klein halten und auf fix/v35-selection-tools weiterarbeiten, solange kein anderer Auftrag vorliegt.
- Sicherungsbranch backup/2026-11-01-stand-70cb7d3 nicht als Arbeitsbranch verwenden und nicht verändern.
- Vor Änderungen an index.html die relevanten Funktionsdefinitionen und Event-Handler vollständig lesen.
- Tests nach jeder Korrektur ausführen; Browser-Test und Code-Checks separat auswerten.
- Bei erfolgreichem Test genau sagen, was getestet wurde und welche Plattform nicht getestet wurde.
- Erst nach expliziter Freigabe weitere Änderungen auf die produktive Pages-Adresse ausrollen.
