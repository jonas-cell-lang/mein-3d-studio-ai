# SILMO – isolierter OCCT-WASM-Prototyp

Dieser Ordner ist eine Forschungs-/Testumgebung. Er wird nicht von der SILMO-Live-App geladen und ändert keine Produktionsfunktionen.

## Gepinnter Kandidat

- npm: occt-wasm 5.17.2
- Kernelbasis laut Projekt: Open CASCADE 8.0.1
- Laufzeit: Node.js 24 in CI
- Geometrieeinheiten im Test: Millimeter (OCCT API)
- Testtoleranz für analytische Volumenvergleiche: 1e-6 relativ (Testvergleich, keine SILMO-Kerneltoleranz)

## Lokaler Test

Im Ordner research/geometry-kernel-prototype:

```sh
npm install
npm test
```

## Testumfang

- Analytischer Quader und Bounding Box
- Boolescher Durchbruch mit bekanntem Volumen
- Platte mit vier Durchgangslöchern
- Zwölf nacheinander ausgeführte Durchgangsbohrungen mit analytischem Volumenvergleich und anschliessender Tessellierung
- Grössere Musterplatte 80 × 50 × 4 mm mit 40 Bohrungen; analytischer Volumenvergleich, Ein-Körper-Prüfung und Tessellierung
- Dünne 1,2-mm-Platte mit Durchgangsloch und analytischem Volumenvergleich
- Boolesche Ergebnisse mit Compound-Wurzel: enthaltene Solid-Körper werden gezählt, statt den Wurzeltyp fälschlich mit einem einzelnen Solid gleichzusetzen
- Fillet und Topologieabfragen
- Tessellierung
- STEP-Export und -Import mit Volumenvergleich
- Fehlerfall und anschliessende Weiterverwendung des Kerns
- Freigabe aller Handles und erneute Verwendung

## Grenzen dieses ersten Prototyps

- Chromium-Web-Worker-Test prüft Quader 10 × 20 × 30 mm und 12-Bohrungs-Boolean mit Volumen, Solid-Anzahl und Tessellierung
- Noch kein Safari-/WebKit-Test
- Noch kein Vergleichslauf mit Replicad, moket-io/occt-wasm oder OpenGeometry
- Noch keine Last-/Langzeitmessung
- Kein Nachweis der Kompatibilität mit SILMO-Projektdateien
- Keine Integration in die bestehende Anwendung

Ein erfolgreicher Lauf ist nur ein Kandidaten-Smoke-Test und keine Freigabe für die spätere Produktionsintegration.
