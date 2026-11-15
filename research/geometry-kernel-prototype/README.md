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

Zusätzlich läuft ein gemeinsamer Kandidatenvergleich mit den fest gepinnten Versionen `occt-wasm 5.17.2`, `@moket/occt-wasm v0.10.1` (über verifizierte GitHub-Release-Assets), `replicad 1.2.1` plus `replicad-opencascadejs 1.2.1` und `opengeometry 3.0.0`. Die Adapter führen denselben Kern aus Grundkörper, Bohrung, koplanarer Überlappung, Tangentialfällen, dünner Wand und Eingabevalidierung aus; nicht verfügbare API-Funktionen werden ausdrücklich als Lücke protokolliert.

- Analytische Grundkörper, Bounding Box und bekannte Volumen
- Boolescher Durchbruch und Platte mit vier Durchgangslöchern
- Überlappende koplanare Flächen: Fuse, Cut und Common
- Tangierende Körper: gemeinsame Fläche, Kante, Ecke sowie Zylinder/Quader
- Nahezu koplanare Geometrie mit kleinem Überlapp
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
- Die automatisierten WebKit-/Firefox-Läufe sind Browser-Kompatibilitätstests in Playwright auf Linux; sie ersetzen noch keine manuellen Prüfungen in Desktop-Safari bzw. realen Safari-Versionen.
- Noch kein reproduzierbarer Vergleichslauf mit Replicad, moket-io/occt-wasm oder OpenGeometry
- Kein Nachweis der Kompatibilität mit SILMO-Projektdateien
- Keine Integration in die bestehende Anwendung

Ein erfolgreicher Lauf ist ein erweiterter Kandidaten-Test, aber keine Freigabe für die spätere Produktionsintegration.
