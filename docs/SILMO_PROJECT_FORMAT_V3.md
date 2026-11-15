# SILMO – Projektformat v3

**Status:** Aktuelles Speicherformat; explizite Versionsprüfung in Phase 1 ergänzt.

## Identität und Version

- App-Kennung: `SILMO 3D Studio AI`
- Aktuelle und derzeit unterstützte Projektversion: `3`
- Die Version ist eine Ganzzahl. Fehlende, nicht ganzzahlige oder unbekannte Versionsnummern werden abgelehnt.
- Es gibt derzeit keine automatische Migration von älteren oder zukünftigen Versionen. Version 2 und Version 4 werden ausdrücklich nicht als kompatibel ausgegeben.

## Dokumentstruktur

| Feld | Bedeutung |
|---|---|
| `app` | feste SILMO-App-Kennung |
| `version` | Schema-Version 3 |
| `imageStudio` | optionale, separat versionierte Bildvorlage oder `null` |
| `bedWidthMM`, `bedDepthMM` | Druckbettabmessungen in mm |
| `uniform` | Status der gleichmässigen Skalierung |
| `objects` | maximal 100 Modellobjekte |

Jedes Modellobjekt speichert mindestens Geometrieattribute, Position, Drehung, Skalierung, Farbe und Grundabmessungen. Zusätzliche Metadaten umfassen unter anderem Sperrstatus, Gruppenzugehörigkeit, Skizzenkontur, Konturrahmen und gegebenenfalls die Ursprungsobjekte einer verbundenen Form.

Geometrieattribute werden als typisierte Zahlenarrays mit Typname, Elementgrösse und Normalisierungsstatus gespeichert. Indizes werden separat gespeichert. Der Loader prüft die zulässigen Arraytypen, Wertebereiche, Attributgrössen und Indexgrenzen.

## Einheiten

Die bestehenden Projekte verwenden unverändert die bisherige SILMO-Skalierung:

- 1 Three.js-Welteinheit = 10 mm
- Objektpositionen und Geometriekoordinaten sind interne Welteinheiten.
- Druckbettabmessungen und die expliziten `*MM`-Metadaten sind Millimeter.

Eine Änderung dieser Semantik erfordert eine neue Projektformatversion und eine explizite Migration. v3-Projekte werden nicht stillschweigend skaliert.

## Validierung und Kompatibilität

`src/project-schema.js` validiert die Dokumenthülle, bevor der Geometrieimport beginnt. `restoreGeometry` prüft anschliessend die einzelnen Geometrieattribute und Indizes.

- Gültige v3-Projekte bleiben lesbar.
- Fehlende oder unbekannte Versionen werden mit einer verständlichen Meldung abgelehnt.
- Bei einer nicht unterstützten Version bleibt das aktuell geöffnete Projekt unverändert.
- Das Speichern schreibt weiterhin Version 3.
- Ein minimales, reales Kompatibilitätsfixture liegt unter `tests/fixtures/project-v3-minimal.json`.

## Offene Erweiterungen

- Vollständige Fixtures aus repräsentativen bestehenden Projekten, insbesondere mit Gruppen, Booleschen Verbindungen, Skizzen und Image-Studio-Daten.
- Explizite Migrationsregeln erst dann ergänzen, wenn ein konkretes älteres Format samt Testfixture vorliegt.
- Vertikalen Referenzablauf Erstellen → Bearbeiten → Speichern → Öffnen → STL-Export über echte Projekte absichern.
