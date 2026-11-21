# SILMO – isolierter OCCT-WASM-Prototyp

Dieser Ordner enthält weiterhin die isolierten Kandidatentests und zusätzlich den reproduzierbaren Build für den ersten produktiven OCCT-Worker. Der Worker-Build wird in die SILMO-Runtime kopiert; die Testprogramme und Smoke-Seiten selbst werden nicht von der App geladen.

## Gepinnter Kandidat

- npm: occt-wasm 5.17.2
- Kernelbasis laut Projekt: Open CASCADE 8.0.1
- Laufzeit: Node.js 24 in CI
- Geometrieeinheiten im Test: Millimeter (OCCT API)
- Testtoleranz für analytische Volumenvergleiche: 1e-6 relativ (Testvergleich, keine SILMO-Kerneltoleranz)

## Worker-Build für SILMO\n\nNach `npm install` erzeugt `npm run build:worker` den Produktions-Worker unter `dist-production/silmo-occt-worker.js`. Das Root-Skript `npm run prepare:runtime` kopiert anschliessend den Worker und `occt-wasm.wasm` nach `vendor/occt/`.\n\nDie App lädt den Worker erst beim ersten Klick auf „OCCT-B-Rep-Quader“.\n\n## Lokaler Test

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

- Chromium-Web-Worker-Test prüft Quader 10 × 20 × 30 mm, 12- und 40-Bohrungs-Boolean, eine 1,2-mm-Dünnwandplatte sowie Freigabe/Wiederverwendung des Kerns; Volumen, Solid-Anzahl und Tessellierung werden geprüft
- Noch kein Safari-/WebKit-Test
- Noch kein Vergleichslauf mit Replicad, moket-io/occt-wasm oder OpenGeometry
- Noch keine Last-/Langzeitmessung
- Kein Nachweis der Kompatibilität mit SILMO-Projektdateien
- Erste vertikale Integration: OCCT erzeugt einen Quader im Worker; Three.js zeigt dessen Tessellierung. Bestehende CAD-Werkzeuge und BSP-CSG verwenden OCCT noch nicht. B-Rep-Projektspeicherung und Migration bleiben offen.

Ein erfolgreicher Lauf ist nur ein Kandidaten-Smoke-Test und keine Freigabe für die spätere Produktionsintegration.
