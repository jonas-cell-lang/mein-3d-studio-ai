# SILMO – OCCT-WASM-Kern und Prototyp-Tests

Dieser Ordner enthält zwei getrennte Dinge:
1. isolierte Kandidatentests für OCCT-WASM;
2. den reproduzierbaren Build des OCCT-Produktions-Workers, den SILMO lokal lädt.

Die Testprogramme und Smoke-Seiten selbst werden nicht von der App geladen.

## Gepinnte Laufzeit

- npm-Paket: `occt-wasm 5.17.2`
- Kernelbasis: Open CASCADE 8.0.1
- Geometrieeinheit der OCCT-API: Millimeter
- Testtoleranz für analytische Volumenvergleiche: (1e-6) relativ; dies ist eine Testvergleichstoleranz, keine globale SILMO-Kerneltoleranz.

## Produktions-Worker bauen

Im Ordner `research/geometry-kernel-prototype`:

```sh
npm install
npm run build:worker
```

Das Root-Skript `npm run prepare:runtime` kopiert anschliessend den gebündelten Worker und die WASM-Datei nach `vendor/occt/`. Diese generierten Dateien sind Build-Artefakte und werden nicht als Quellcode eingecheckt.

SILMO startet den Worker bei Bedarf. Der Client unter `src/occt-kernel-client.js` kapselt Worker-Kommunikation und Lebenszyklus. Es gibt keine CDN-Abhängigkeit für die OCCT-Laufzeit.

## Produktiv integrierter Funktionsumfang

- Echte OCCT-B-Rep-Quader werden im Worker erzeugt und für die Three.js-Anzeige tesselliert.
- Unterstützte Skizzenextrusionen werden als OCCT-B-Rep-Körper erstellt.
- Fuse, Cut und Common sind für zwei geeignete OCCT-Körper verfügbar.
- Undo/Redo kann unterstützte B-Rep-Körper und Boolean-Ergebnisse aus Konstruktionsrezepten rekonstruieren.
- Projektformat v3 speichert optionale `occtSource`-Rezepte; beim Öffnen werden die B-Rep-Körper im Worker neu aufgebaut.
- Löschen, Projektwechsel und Worker-Lebenszyklus geben verwaltete Handles frei.

## Isolierte Kerneltests

Im Ordner `research/geometry-kernel-prototype`:

```sh
npm test
```

Der Testkorpus umfasst analytische Quader, Boolesche Durchbrüche, Platten mit 4, 12 und 40 Bohrungen, dünne Platten, Compound-/Solid-Auswertung, Fillet, Topologieabfragen, Tessellierung, STEP-Export/-Import, Fehlerbehandlung und Handle-Freigabe.

## Bewusste Grenzen

- Der Produktions-Worker ist noch kein Ersatz für sämtliche bestehenden Three.js-/BSP-Werkzeuge.
- Die UI-Booleschen Operationen unterstützen zwei oder mehr passende OCCT-B-Rep-Körper. Bei mehr als zwei Operanden werden die Operationen als geordnete Kette ausgeführt: Fuse vereinigt fortlaufend, Cut zieht jeden weiteren Körper vom Zwischenergebnis ab, Common bildet fortlaufend die Schnittmenge.
- Rotation, Skalierung und Verschiebung werden als vollständige 3×4-Affintransformationen im OCCT-Worker angewendet. Nachfolgende Operationen verwenden das vorherige Ergebnis im Weltkoordinatensystem.
- Die Mehrkörper-Kette bleibt bei Fehlern transaktional: Die Szene wird erst nach einem gültigen Endergebnis ersetzt; temporäre B-Rep-Handles werden anschliessend freigegeben. Verschachtelte Konstruktionsrezepte ermöglichen Undo/Redo und Projektwiederherstellung.
- Gewöhnliche Meshes ohne OCCT-Konstruktionsrezept bleiben ausserhalb dieses OCCT-Pfads und verwenden weiterhin den bisherigen Mesh-/BSP-Pfad.
- Projektdateien speichern Konstruktionsrezepte und Darstellungsgeometrie, keine rohe native OCCT-B-Rep-Datei.
- Ein Safari-/WebKit-Test, plattformübergreifende Leistungsmessungen und Langzeitmessungen stehen noch aus.

Ein erfolgreicher isolierter Kerneltest beweist nicht automatisch die vollständige Integration sämtlicher CAD-Funktionen. Produktionsintegration, Browserregression und isolierte Kerneltests werden getrennt bewertet.
