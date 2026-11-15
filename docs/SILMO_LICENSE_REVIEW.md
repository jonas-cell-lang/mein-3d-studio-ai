# SILMO – Lizenzprüfung der Geometriekern-Kandidaten

**Prüfdatum:** 15.11.2026  
**Geprüfte Testversionen:** `occt-wasm 5.17.2`, `@moket/occt-wasm 0.10.1`, `replicad 1.2.1` + `replicad-opencascadejs 1.2.1`, `opengeometry 3.0.0`  
**Status:** Quellenbasierte Vorprüfung; keine Rechtsberatung und keine Freigabe zur Veröffentlichung.

## 1. Ergebnis in Kürze

Keiner der vier Kandidaten ist allein aufgrund seiner Lizenz bereits für SILMO freigegeben. Die Lizenz des JavaScript-/TypeScript-Wrappers ist nicht zwingend die Lizenz des mitgelieferten WebAssembly-Kerns. Für die Entscheidung müssen immer das tatsächlich ausgelieferte WASM-Artefakt, dessen vollständiger Quellcode, die Austauschbarkeit des Moduls und die erforderlichen Hinweise gemeinsam betrachtet werden.

**Vorläufiger Befund:**
- `@moket/occt-wasm 0.10.1` dokumentiert seine LGPL- und Open-CASCADE-Ausnahme, die enthaltenen Fremdkomponenten, den Quellcode und den Austausch des WASM-Moduls am transparentesten.
- `occt-wasm 5.17.2` hat eine wichtige Zweiteilung: Build-/Wrapper-Code MIT oder Apache-2.0, kompiliertes WASM laut Projekt ausdrücklich LGPL-2.1-only. Das npm-Metadatenfeld nennt dagegen MIT OR Apache-2.0. Für das WASM darf deshalb nicht nur das npm-Feld verwendet werden.
- Replicad selbst ist MIT; das separat benötigte `replicad-opencascadejs 1.2.1` ist LGPL-2.1-only und enthält das OCCT-WASM. Die MIT-Lizenz des Wrappers hebt diese Pflichten nicht auf.
- OpenGeometry 3.0.0 ist MPL-2.0. Die MPL ist dateibasiert: geänderte MPL-bedeckte Dateien müssen unter MPL bleiben und der Quellcode der abgedeckten Software muss bei einer Verteilung in der vorgeschriebenen Form verfügbar sein. Das bedeutet nicht automatisch, dass die gesamte getrennte SILMO-Anwendung MPL werden muss.

Es wurde **kein Geometriekern ausgewählt** und keine Bibliothek in die Live-App eingebunden.

## 2. Kandidatenvergleich

| Getesteter Kandidat | Lizenz laut geprüften Projekt-/Paketquellen | Für SILMO wichtige Punkte | Offene Nachweise |
|---|---|---|---|
| `occt-wasm 5.17.2` (andymai) | Build-Werkzeuge und TypeScript-Wrapper: MIT OR Apache-2.0. Kompiliertes WASM: LGPL-2.1-only laut README des exakt gepinnten Tags. | Das Projekt beschreibt, dass die Web-App das WASM als separate URL lädt und Nutzer eine eigene WASM-Datei einsetzen können. Die LGPL-Komponente muss austauschbar bleiben. | Das npm-Paket-Metadatenfeld lautet MIT OR Apache-2.0, während die README das WASM als LGPL-2.1-only ausweist. Vor Verwendung müssen die Lizenzdateien und der vollständige, exakt zum ausgelieferten WASM passende Quellcode samt Build-Rezept im Release-Artefakt überprüft und mit ausgeliefert werden. Nicht ungeprüft annehmen, dass die Open-CASCADE-Ausnahme im veröffentlichten Binärpaket gilt. |
| `@moket/occt-wasm 0.10.1` | LGPL-2.1-only mit Open-CASCADE-Ausnahme 1.0; die Projekt-Notice nennt zusätzlich Emscripten-/libc++-/musl-Komponenten unter MIT bzw. University of Illinois NCSA. | Die Release-Dokumentation beschreibt das WASM als separat geladen und ersetzbar. Das Repository enthält LGPL-Text, OCCT-Ausnahme, NOTICE und Build-Anleitung; die README beschreibt vollständige Quellcode-Release-Archive. | Bei jeder konkreten SILMO-Veröffentlichung das Quellcode-Archiv, die Lizenzdateien und die Versionsübereinstimmung mit genau dem verwendeten WASM-Build sichern. Auch die übrigen mitgelieferten Runtime-Komponenten müssen im Third-Party-Verzeichnis aufgeführt werden. |
| `replicad 1.2.1` + `replicad-opencascadejs 1.2.1` | Replicad: MIT. `replicad-opencascadejs`: LGPL-2.1-only. | Der Wrapper ist MIT, aber die für die Geometrie nötige OCCT-WASM-Distribution bleibt LGPL-pflichtig. Das Paket stellt sowohl Single- als auch Multi-Thread-WASM-Dateien bereit. | Quellcode-/Build-Zuordnung für die ausgelieferten WASM-Dateien, Austauschmöglichkeit und die Frage einer zusätzlich anwendbaren OCCT-Ausnahme müssen für den konkreten Paketstand geprüft werden. Bis dahin konservativ als LGPL-2.1-only behandeln. |
| `opengeometry 3.0.0` | MPL-2.0 laut Paket und LICENSE.md. | Bei Verteilung der ausführbaren Form muss der Quellcode der MPL-bedeckten Software zugänglich gemacht werden. Änderungen an MPL-bedeckten Dateien bleiben MPL. Eine grössere Anwendung aus getrennten Dateien kann grundsätzlich unter anderen Bedingungen stehen. Das Paket meldet keine direkten npm-Abhängigkeiten. | Sicherstellen, dass die genaue 3.0.0-Quellfassung und alle Änderungen daran veröffentlicht bzw. zugänglich gemacht werden. Rust-/WASM-Buildartefakt und SDK müssen versionsgenau dokumentiert werden. |

## 3. Weitere direkt gepinnte Prototyp-Abhängigkeiten

Diese Pakete sind Teil der Forschungsumgebung, aber nicht selbst einer der vier verglichenen Geometriekern-Kandidaten:

| Paket | Gepinnte Version | Veröffentlichte Lizenzangabe | Einordnung |
|---|---:|---|---|
| `three` | 0.168.0 | MIT | Renderer-/Testumgebung |
| `playwright` | 1.64.1 | Apache-2.0 | Browser-Testwerkzeug |
| `vite` | 8.3.5 | MIT | Prototyp-Entwicklungsserver |
| `manifold-3d` | 3.0.1 | Apache-2.0 | Im Prototyp deklariert, aber nicht Teil des aktuellen Vier-Kandidaten-Vergleichslaufs |

Die obige Tabelle ist keine vollständige SBOM. Indirekte Abhängigkeiten, Browser-Binaries und Build-Werkzeuge sind damit noch nicht vollständig inventarisiert. Das erfolgreiche Provenienz-Artefakt enthält ein `package-lock.json` und eine CycloneDX-1.5-SBOM mit 28 Komponenten. Der Lockfile-/SBOM-Nachweis wurde geprüft; der neue Workflow soll das Lockfile und die SBOM im Forschungsbranch versionieren. Der nächste Lauf muss den automatischen Commit-Schritt noch bestätigen.

## 4. Konsequenzen für SILMO

Wenn ein LGPL-Kandidat später verwendet wird, muss die Architektur von Anfang an darauf ausgelegt sein:

1. Das LGPL-WASM als eigenständige Datei über eine URL laden; nicht in den SILMO-JavaScript-Code einbetten oder untrennbar bündeln.
2. Nutzern eine praktisch nutzbare Möglichkeit geben, eine modifizierte kompatible Kernel-Datei einzusetzen.
3. Den vollständigen passenden Quellcode, eigene Änderungen, Build-Anleitung und die erforderlichen Lizenztexte/Notices zugänglich machen.
4. In SILMO einen sichtbaren Drittanbieter-/Lizenzbereich vorsehen und die erforderlichen OCCT-Hinweise sowie Lizenztexte bereitstellen.
5. Für jede veröffentlichte Version die exakten Paketversionen, Quell-Commits, WASM-Prüfsummen und Lizenzdateien archivieren.

Bei OpenGeometry/MPL-2.0 müssen die MPL-bedeckten Dateien und allfällige Änderungen daran getrennt nachvollziehbar bleiben; der zugehörige Quellcode muss bei der Verteilung in der von MPL verlangten Form bereitgestellt werden.

**Zusätzlicher Projektpunkt:** Das SILMO-GitHub-Repository weist derzeit keine Repository-Lizenz aus und im Root-Verzeichnis ist keine LICENSE-Datei vorhanden. Ein öffentlich sichtbares GitHub-Repository ist dadurch nicht automatisch zur freien Weiterverwendung lizenziert. Vor externen Beiträgen oder einer klar definierten Weiterverteilung muss entschieden werden, unter welchen Bedingungen SILMO-eigener Code verwendet werden darf. Das ist eine separate Entscheidung und darf nicht mit den Lizenzen der Geometriekern-Kandidaten vermischt werden.

## 5. Vorläufige Empfehlung

- Für einen OCCT-basierten Prototyp ist Moket derzeit der transparenteste Kandidat hinsichtlich Lizenzhinweisen, Quellcode und Austauschbarkeit. Das ist keine rechtliche Freigabe.
- Andy Mai bleibt technisch interessant, benötigt aber vor einer Produktentscheidung eine eindeutige Klärung der unterschiedlichen Lizenzangaben für npm-Paket und kompiliertes WASM.
- Replicad vereinfacht die TypeScript-API, beseitigt aber nicht die LGPL-Frage des darunterliegenden WASM.
- OpenGeometry hat mit MPL-2.0 ein anderes, dateibasiertes Lizenzmodell und ist aus Lizenzsicht grundsätzlich prüfbar; seine im Test festgestellten Messpräzisions- und API-Lücken bleiben davon unberührt.

Die Lizenz darf nicht allein entscheiden: Geometriequalität, Messpräzision, Topologiehistorie, Browserstabilität, Speicherverhalten und Wartbarkeit müssen weiterhin gemeinsam bewertet werden.

## 6. Offene Freigabepunkte

- [ ] Exakte Release-Quellen und Lizenztexte aller ausgelieferten WASM-Dateien archivieren.
- [ ] Transitive Abhängigkeiten mit Lockfile und maschinenlesbarer SBOM erfassen.
- [ ] Austauschbarkeit der Kernel-Datei in einem echten SILMO-Webbuild praktisch testen.
- [ ] Lizenz-/Attributionsansicht in der späteren Anwendung spezifizieren.
- [ ] Lizenzmodell für SILMO-eigenen Code separat festlegen.
- [ ] Vor einer öffentlichen oder kommerziellen Verteilung die konkrete Umsetzung mit einer qualifizierten erwachsenen/rechtlichen Stelle prüfen lassen.

## 7. Quellen

- OCCT – offizielle Lizenz und Hinweise zu LGPL Abschnitt 6: https://occt3d.com/dev/doc/overview/html/occt_public_license.html
- OCCT – offizielle Übersicht mit Hinweisen für proprietäre Anwendungen: https://occt3d.com/dev/doc/overview/html/
- andymai/occt-wasm, Tag v5.17.2 README und package.json: https://github.com/andymai/occt-wasm/tree/v5.17.2
- andymai/occt-wasm npm-Paket: https://www.npmjs.com/package/occt-wasm
- moket-io/occt-wasm, Tag v0.10.1, LICENSE, NOTICE, OCCT exception und README: https://github.com/moket-io/occt-wasm/tree/v0.10.1
- Replicad 1.2.1, MIT-Lizenz und Paketmanifest: https://github.com/sgenoud/replicad/tree/v1.2.1
- replicad-opencascadejs 1.2.1, Paketmanifest: https://github.com/sgenoud/replicad/tree/v1.2.1/packages/replicad-opencascadejs
- replicad-opencascadejs npm-Paket: https://www.npmjs.com/package/replicad-opencascadejs
- OpenGeometry 3.0.0, MPL-2.0-Lizenz: https://github.com/OpenGeometry-io/OpenGeometry/tree/v3.0.0
- OpenGeometry npm-Paket: https://www.npmjs.com/package/opengeometry
- Manifold 3.0.1: https://www.npmjs.com/package/manifold-3d
- Three.js: https://www.npmjs.com/package/three
- Playwright: https://www.npmjs.com/package/playwright
- Vite: https://www.npmjs.com/package/vite

## 8. Technische Provenienz-Automatisierung (Artefakt erfolgreich geprüft; Branch-Commit noch zu bestätigen)

Der isolierte GitHub-Actions-Workflow wurde erweitert, um bei einem erfolgreichen Lauf:
- ein Lockfile für die exakt deklarierten npm-Direktabhängigkeiten zu erzeugen und mit `npm ci` zu verwenden,
- eine CycloneDX-SBOM aus dem aufgelösten npm-Abhängigkeitsbaum zu erstellen,
- Quellarchive der vier getesteten Release-Tags zu speichern und SHA-256-Prüfsummen zu berechnen,
- die bereits verifizierten Moket-WASM-Release-Asset-Prüfsummen abzulegen,
- diese Nachweise als zeitlich begrenztes Actions-Artefakt bereitzustellen.

**Nachweis:** Der Lauf [43701667009](https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43701667009) war vollständig erfolgreich. Das Actions-Artefakt `silmo-kernel-provenance-b413b659c26197c8e23e2b4246efb887eccddd0b` (SHA-256 `e1455c6b65dbf8ae70923c4fa065229b2d09d082b41f8fa8e09dfb0dd7d65d9d`) wurde heruntergeladen und geprüft. Es enthält das Lockfile, eine CycloneDX-1.5-SBOM mit 28 npm-Komponenten, die vier Quellarchive, die Quellarchiv-Prüfsummen, die verifizierten Moket-WASM-Asset-Prüfsummen und die Toolchain-Versionen Node 24.22.2 / npm 11.19.1. Die Quellarchive haben folgende SHA-256-Werte:

```text
4a5975d776ed673d831bda781428a4d7c175af4bb97a281e122ca7c305867e07  andymai-occt-wasm-v5.17.2.zip
857fb6393c4ad3a99d287fb04eb06a63eb621622174fbb936ce556be9344e6b5  moket-occt-wasm-v0.10.1.zip
02314a4d61eaec0386a8f07f75ec57551a1fc9b815e374f2e8a69353b6d49de4  opengeometry-v3.0.0.zip
d4302cb2da28cef399b6628c3c8da8799c5067fe9ece7f39348f25cc2ceee989  replicad-v1.2.1.zip
```

Der Workflow wurde anschliessend so angepasst, dass ein erstmalig erzeugtes Lockfile nach erfolgreichen Tests auf dem PR-Branch versioniert und bei Folgeläufen mit `npm ci` verwendet wird. **Der automatische Commit-Schritt wurde im Folge-Lauf `43702597723` erfolgreich ausgeführt.** Lockfile, SBOM, Toolchain- und Prüfsummendateien liegen jetzt im Forschungsbranch. Die Quellarchive bleiben als Actions-Artefakt. Die SBOM deckt den npm-Baum ab, nicht automatisch Betriebssystem-, Browser- oder vollständige Compiler-Abhängigkeiten. Die Quellarchive bleiben als 90-Tage-Actions-Artefakt gesichert; die Hashes werden versioniert.
