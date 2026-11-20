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

`src/project-schema.js` validiert die Dokumenthülle und stellt mit `validateSerializedGeometry` zusätzlich einen reinen Geometrie-Validator bereit. `restoreGeometry` ruft diesen vor der Erzeugung typisierter Arrays auf und prüft beim Wiederaufbau weiterhin die Laufzeitobjekte.

- Gültige v3-Projekte bleiben lesbar.
- Das Positionsattribut muss mindestens drei 3D-Punkte mit `itemSize: 3` enthalten.
- Alle Geometrieattribute müssen dieselbe Punktanzahl besitzen; Attributtypen, Arraylängen, endliche Werte und Grössenlimits werden geprüft.
- Indizes müssen einen unterstützten Integer-Typ, gültige Vertex-Verweise und vollständige Dreiergruppen für Dreiecke enthalten.
- Nicht-indizierte Mesh-Geometrie muss ebenfalls aus vollständigen Dreiecken bestehen.
- Fehlende oder unbekannte Versionen werden mit einer verständlichen Meldung abgelehnt.
- Bei einer nicht unterstützten Version bleibt das aktuell geöffnete Projekt unverändert.
- Das Speichern schreibt weiterhin Version 3.
- Ein minimales Kompatibilitätsfixture liegt unter `tests/fixtures/project-v3-minimal.json`.
- Ein erweitertes Fixture unter `tests/fixtures/project-v3-advanced.json` deckt zwei gruppierte Objekte, eine verbundene Form mit zwei Ursprungsobjekten, Skizzenkontur, Konturrahmen und eine eingebettete Image-Studio-Vorlage ab.
- Der Browser-Regressionslauf öffnet das erweiterte Fixture und speichert es erneut. Er prüft, dass alle genannten Metadaten und Bilddaten im exportierten Projekt erhalten bleiben.

## Offene Erweiterungen

- Weitere reale Fixtures aus bestehenden Benutzerprojekten ergänzen; die repräsentativen Metadatenfälle sind nun durch das erweiterte synthetische Fixture abgedeckt. Das Fixture ist kein Ersatz für eine breite Sammlung echter Benutzerprojekte.
- Explizite Migrationsregeln erst dann ergänzen, wenn ein konkretes älteres Format samt Testfixture vorliegt.
- Vertikalen Referenzablauf Erstellen → Bearbeiten → Speichern → Öffnen → STL-Export über echte Projekte absichern.
