# SILMO – isolierter OCCT-WASM-Prototyp

Dieser Ordner ist eine Forschungs-/Testumgebung. Er wird nicht von der SILMO-Live-App geladen und ändert keine Produktionsfunktionen.

## Gepinnter Kandidat

- npm: `occt-wasm 5.17.2`
- Kernelbasis laut Projekt: Open CASCADE 8.0.1
- Laufzeit: Node.js 24 in CI
- Geometrieeinheiten im Test: Millimeter (OCCT API)
- Toleranz für analytische Volumenvergleiche: standardmässig 1e-6 relativ (Testvergleich, keine SILMO-Kerneltoleranz)

## Lokale Tests

Im Ordner `research/geometry-kernel-prototype`:

```sh
npm install
npm test
npm run test:browser:all
npm run test:candidates
```

## Testumfang

Der Kandidatenvergleich verwendet `candidate-test-catalog.mjs` als gemeinsame, versionierte Testspezifikation. Alle erwarteten Masse und Volumen sind dort in mm bzw. mm³ definiert; Adapter dürfen intern andere Achsen oder Einheiten verwenden, müssen aber dieselben physikalischen Fälle und Sollwerte prüfen. Verglichen werden die fest gepinnten Versionen `occt-wasm 5.17.2`, `@moket/occt-wasm v0.10.1` (über verifizierte GitHub-Release-Assets), `replicad 1.2.1` plus `replicad-opencascadejs 1.2.1` und `opengeometry 3.0.0`. Nicht verfügbare API-Funktionen werden ausdrücklich als Lücke protokolliert.

- Analytische Grundkörper, Bounding Box und bekannte Volumen
- Boolescher Durchbruch und Platte mit vier Durchgangslöchern
- Überlappende koplanare Flächen: Fuse, Cut und Common
- Tangierende Körper: gemeinsame Fläche, Kante und Ecke
- Tangierender Zylinder/Quader-Fall mit analytischem Sollvolumen
- Nahezu koplanare bzw. fast deckungsgleiche Geometrie mit 0.0001 mm Überlapp
- Dünne Platte und dünne Wand mit kleinen Durchgangslöchern
- Ungültige primitive Eingaben: Null, negative, NaN- und unendliche Masse; Annahme/Ablehnung und OCCT-Validität werden getrennt protokolliert
- Fillet, Flächen-/Kantenabfragen und explizite Topologiehistorie über aufeinanderfolgende Boolesche Operationen
- Tessellierung und STEP-Export/-Import mit Volumenvergleich
- Kontrollierter Fehlerfall und anschliessende Weiterverwendung des Kerns
- Wiederholte Boolesche Operationen, Handle-Wachstum, WASM-/Prozessspeicher-Beobachtung und `releaseSince`
- Browser-Worker: korrekte Geometrieantwort, UI-Reaktionsfähigkeit und Abbruch eines laufenden OCCT-Arbeitslaufs durch Worker-Terminierung in Chromium, Firefox und WebKit

## Aussagekraft und Grenzen

- Tangentiale Boolesche Fälle werden als gültiges Ergebnis mit analytischem Volumen oder als kontrollierte OCCT-Ablehnung protokolliert. Ein ungültig zurückgegebenes Ergebnis lässt den Test fehlschlagen.
- Ungültige Primitiveingaben werden nicht pauschal als abgelehnt vorausgesetzt: Der Test protokolliert, ob die API wirft, ein ungültiges Shape zurückgibt oder ein gültiges Shape akzeptiert. Das ist eine Verhaltensmessung, keine Freigabe dieses Verhaltens.
- Im aktuellen Lauf akzeptiert die gepinnte API eine negative Quaderbreite als gültigen Körper; NaN-/unendliche Abmessungen sowie Zylinder mit Radius/Höhe 0 werden als ungültige Shapes zurückgegeben statt durchgehend geworfen. Diese Fälle sind als offene Eingabevalidierungs-Risiken festgehalten.
- Die Speichermessung protokolliert den OCCT-Handle-Bestand, eine zugängliche WASM-Heap-Grösse (falls die Bibliothek sie exponiert) sowie Prozessspeicher-Spitzenwerte. WebAssembly-Speicher schrumpft nach Freigabe nicht zwingend; die Handle-Baseline muss jedoch wiederhergestellt werden. Der aktuelle Wrapper exponiert den WASM-Heap möglicherweise nicht direkt.
- Der Worker-Abbruchtest prüft die Terminierung eines Workers während synchroner OCCT-Arbeit. Er beweist keine kooperative Unterbrechung einer einzelnen OCCT-Operation.
- OpenGeometry liefert neben dem Volumen eine Messfehlergrenze. Liegt diese über der gemeinsamen analytischen Vergleichstoleranz, ist der Messwert nur eine Näherung und darf nicht als gleich präziser Nachweis wie ein exakter B-Rep-Volumenwert gewertet werden.
- Die automatisierten WebKit-/Firefox-Läufe sind Browser-Kompatibilitätstests in Playwright auf Linux; sie ersetzen noch keine manuellen Prüfungen in Desktop-Safari bzw. realen Safari-Versionen.
- Der standardisierte Vergleichslauf ist als CI-Test eingerichtet. Der Gesamtstatus `completed-with-gaps` bedeutet, dass alle Adapter ausgeführt wurden, aber dokumentierte API- oder Messpräzisionslücken verbleiben; er ist kein vollständiger Präzisionspass.
- Die Resultate bleiben Kandidaten-Charakterisierung und sind keine Freigabe für die Produktionsintegration.
- Kein Nachweis der Kompatibilität mit SILMO-Projektdateien
- Keine Integration in die bestehende Anwendung

Ein erfolgreicher Lauf ist ein erweiterter Kandidaten-Test, aber keine Freigabe für die spätere Produktionsintegration.

## Reproduzierbare Abhängigkeiten und Lizenz-Provenienz

Der GitHub-Actions-Workflow erzeugt vor den Tests ein npm-Lockfile und installiert anschliessend mit `npm ci` exakt aus diesem Lockfile. Zusätzlich wird eine CycloneDX-SBOM der npm-Abhängigkeiten erzeugt. Die Quellarchive der vier getesteten, fest markierten Kandidaten-Releases sowie SHA-256-Prüfsummen und die verifizierten Moket-WASM-Release-Prüfsummen werden als separates Actions-Artefakt gespeichert.

Das Artefakt heisst `silmo-kernel-provenance-<commit-sha>` und enthält:
- `package-lock.json` für die transitive npm-Auflösung dieses Laufs
- `silmo-occt-prototype.cdx.json` (CycloneDX)
- Quellarchive der vier geprüften Release-Tags und SHA-256-Prüfsummen
- Node-/npm-Versionen und Moket-Release-Asset-Prüfsummen

**Verifizierter Stand (15.11.2026):** Der CI-Lauf `43701667009` hat das Lockfile, die CycloneDX-SBOM, vier Release-Quellarchive und SHA-256-Prüfsummen erfolgreich erzeugt und als Artefakt hochgeladen. Das Artefakt wurde anschliessend geöffnet und auf seine erwarteten Dateien geprüft. Der Workflow ist so angepasst, dass er das Lockfile beim ersten erfolgreichen PR-Lauf auf dem Forschungsbranch versioniert und bei späteren Läufen `npm ci` direkt aus dem eingecheckten Lockfile verwendet. Die Prüfsummen der Quellarchive, die Moket-WASM-Asset-Prüfsummen, die SBOM und das Lockfile werden versioniert; die grossen Quellarchive bleiben als zeitlich begrenztes Actions-Artefakt erhalten. Der nächste Lauf muss den neuen automatischen Commit-Schritt noch bestätigen.

Die SBOM erfasst den npm-Abhängigkeitsbaum (28 Komponenten). Ihr Zeitstempel wird entfernt und ihre Kennung deterministisch aus dem Lockfile abgeleitet, damit identische Abhängigkeiten keine unnötigen SBOM-Commits erzeugen. Browser-Binaries, Betriebssystempakete und sämtliche Build-Toolchains sind damit nicht automatisch vollständig inventarisiert. Die vier im Actions-Artefakt gespeicherten Quellarchive wurden nochmals direkt gegen die versionierten SHA-256-Werte geprüft.

Die übergeordnete Freigabe für die nächste Programmierphase ist in [docs/SILMO_ARCHITECTURE_DECISION.md](../../docs/SILMO_ARCHITECTURE_DECISION.md) dokumentiert. Sie erlaubt Phase 1, aber keine Kernel-Integration.
