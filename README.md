# SILMO – 3D Studio AI

Eigenständiges professionelles 3D-Modellierungsprogramm.

## Projektunterlagen

**Wichtigster Einstieg für neue Chats und Projektübergaben:**

- [Vollständige Projektsicherung und Übergabe](docs/SILMO_PROJECT_BACKUP.md)
- [Masterplan](docs/SILMO_MASTERPLAN.md)
- [Technische Bestandsaufnahme](docs/SILMO_CURRENT_STATE_AUDIT.md)
- [Funktions- und Abhängigkeitsmatrix](docs/SILMO_FUNCTION_DEPENDENCY_MATRIX.md)
- [Laufzeit-Abhängigkeitsprüfung und lokale Migration](docs/SILMO_RUNTIME_DEPENDENCY_AUDIT.md)
- [Einheiten- und Toleranzspezifikation](docs/SILMO_UNITS_TOLERANCE_SPEC.md)
- [Projektformat v3 und Kompatibilität](docs/SILMO_PROJECT_FORMAT_V3.md)
- [Geometriekern-Vorauswahl und Testplan](docs/SILMO_GEOMETRY_KERNEL_EVALUATION.md)
- [OCCT-WASM-Kern, Produktions-Worker und Prototyp-Tests](research/geometry-kernel-prototype/README.md)

## Geometrie-Kern\n\nOCCT 8.0.1 über `occt-wasm` 5.17.2 ist als erster Worker-basierter Produktions-Vertikalschnitt eingebunden: Der B-Rep-Testkörper wird im OCCT-Worker erzeugt und als Three.js-Tessellierung angezeigt. Die vorhandenen Modellierungswerkzeuge und Booleschen Operationen sind noch nicht vollständig migriert.\n\n## Anwendung und Entwicklung

- [SILMO kostenlos lokal starten](docs/LOCAL_START.md)
- [Live-App](https://jonas-cell-lang.github.io/mein-3d-studio-ai/)
- [GitHub Actions / Tests und Deployment](https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions)
- Hauptdatei: `index.html`
- Browser-Regressionstests: `tests/silmo-browser-test.mjs`

**Projektprinzip:** So leistungsfähig wie ein professionelles 3D-Programm, dabei so einfach wie möglich zu bedienen – ohne den Funktionsumfang durch die Einfachheit zu begrenzen. SILMO ist eigenständig und nicht von SketchUp abhängig.
