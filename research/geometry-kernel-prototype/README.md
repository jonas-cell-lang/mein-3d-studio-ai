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
- STEP-Dateien (`.step`/`.stp`) werden im Produktions-Worker als OCCT-B-Rep importiert und aus ausgewählten OCCT-Körpern als AP242 in Millimetern exportiert. Importierte STEP-Quellen bleiben in Projektdateien erhalten und werden bei Undo/Redo bzw. Projektwiederherstellung erneut in OCCT geladen (maximal 10 MB je STEP-Quelle).
- Fuse, Cut und Common sind für zwei oder mehr geeignete OCCT-Körper verfügbar; Mehrkörper-Aufträge werden als geordnete B-Rep-Kette ausgeführt.
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
- Projektdateien speichern Konstruktionsrezepte und Darstellungsgeometrie, keine rohe native OCCT-B-Rep-Datei. Bei importierten STEP-Körpern wird die begrenzte STEP-Quelldatei im Konstruktionsrezept mitgeführt.
- Ein Safari-/WebKit-Test, plattformübergreifende Leistungsmessungen und Langzeitmessungen stehen noch aus.

Ein erfolgreicher isolierter Kerneltest beweist nicht automatisch die vollständige Integration sämtlicher CAD-Funktionen. Produktionsintegration, Browserregression und isolierte Kerneltests werden getrennt bewertet.


## Native OCCT-Zylinder (21.11.2026)

SILMO kann zusätzlich zum Quader einen analytischen Zylinder als echten OCCT-B-Rep-Körper erzeugen. Die produktive Worker-API verwendet die in `occt-wasm` 5.17.2 vorhandene `makeCylinder(radius, height)`-Funktion. Radius und Höhe sind in Millimetern angegeben und jeweils auf 0,01 bis 2000 mm begrenzt. Das Ergebnis wird auf endliches positives Volumen und ein gültiges Darstellungsnetz geprüft. Das Konstruktionsrezept (`kind: cylinder`) wird in Projektdateien gespeichert und für Undo/Redo sowie Projektwiederherstellung erneut als OCCT-Körper aufgebaut.


## Native OCCT-Kugel (21.11.2026)

SILMO kann zusätzlich zu Quader und Zylinder eine analytische Kugel als echten OCCT-B-Rep-Körper erzeugen. Der produktive Worker verwendet `makeSphere(radius)` aus `occt-wasm` 5.17.2. Der Radius ist auf 0,01 bis 2000 mm begrenzt. Volumen und Tessellierung werden validiert; das Konstruktionsrezept (`kind: sphere`) bleibt für Undo/Redo und Projektwiederherstellung erhalten.


## Native OCCT-Kegel (21.11.2026)

SILMO erzeugt einen analytischen Vollkegel als echten OCCT-B-Rep-Körper über `makeCone(baseRadius, 0, height)`. Radius und Höhe sind jeweils auf 0,01 bis 2000 mm begrenzt. Volumen und Tessellierung werden geprüft. Das Konstruktionsrezept (`kind: cone`) wird schema-validiert und bei Undo/Redo sowie Projektwiederherstellung rekonstruiert.


## Native OCCT-Torus (21.11.2026)

SILMO erzeugt einen analytischen Volltorus als echten OCCT-B-Rep-Körper über `makeTorus(majorRadius, minorRadius)`. Der grosse Radius muss grösser als der kleine Radius sein; beide liegen zwischen 0,01 und 2000 mm. Volumen und Tessellierung werden validiert. Das Konstruktionsrezept (`kind: torus`) wird schema-validiert und bei Undo/Redo sowie Projektwiederherstellung rekonstruiert.
