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
npm run test:browser
```

## Testumfang

- Analytische Grundkörper, Bounding Box und bekannte Volumen
- Boolescher Durchbruch und Platte mit vier Durchgangslöchern
- Überlappende koplanare Flächen: Fuse, Cut und Common
- Tangierende Körper: gemeinsame Fläche, Kante, Ecke sowie Zylinder/Quader
- Nahezu koplanare Geometrie mit kleinem Überlapp
- Dünne Platte und dünne Wand mit kleinen Durchgangslöchern
- Ungültige primitive Eingaben: Null, negative, NaN- und unendliche Masse
- Fillet, Flächen-/Kantenabfragen und explizite Topologiehistorie über aufeinanderfolgende Boolesche Operationen
- Tessellierung und STEP-Export/-Import mit Volumenvergleich
- Kontrollierter Fehlerfall und anschliessende Weiterverwendung des Kerns
- Wiederholte Boolesche Operationen, Handle-Wachstum, WASM-/Prozessspeicher-Beobachtung und `releaseSince`
- Browser-Worker: korrekte Geometrieantwort und Abbruch eines laufenden OCCT-Arbeitslaufs durch Worker-Terminierung

## Aussagekraft und Grenzen

- Tangentiale Boolesche Fälle werden als gültiges Ergebnis mit analytischem Volumen oder als kontrollierte OCCT-Ablehnung protokolliert. Ein ungültig zurückgegebenes Ergebnis lässt den Test fehlschlagen.
- Die Speichermessung protokolliert den OCCT-Handle-Bestand, den WASM-Heap-Höchststand und Prozessspeicherwerte. WebAssembly-Speicher schrumpft nach Freigabe nicht zwingend; die Handle-Baseline muss jedoch wiederhergestellt werden.
- Der Worker-Abbruchtest prüft die Terminierung eines Workers während synchroner OCCT-Arbeit. Er beweist keine kooperative Unterbrechung einer einzelnen OCCT-Operation.
- Noch keine Safari-/WebKit- oder Firefox-Prüfung
- Noch kein reproduzierbarer Vergleichslauf mit Replicad, moket-io/occt-wasm oder OpenGeometry
- Kein Nachweis der Kompatibilität mit SILMO-Projektdateien
- Keine Integration in die bestehende Anwendung

Ein erfolgreicher Lauf ist ein erweiterter Kandidaten-Test, aber keine Freigabe für die spätere Produktionsintegration.
