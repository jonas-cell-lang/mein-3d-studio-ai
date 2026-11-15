# SILMO – Geometriekern: Technische Vorauswahl und Prototyp-Testplan

**Stand:** 15.11.2026  
**Ausgangsstand:** v90 – Focused CAD Subtabs  
**Ablage:** `main` (Dokumentations-Commit; keine Änderung an der App)  
**Status:** Recherche und Vorauswahl; noch keine SILMO-Integration und noch kein eigener Laufzeit-Benchmark.

## 1. Ziel und Entscheidungsregel

SILMO benötigt langfristig einen Geometriekern, der echte B-Rep-Geometrie und Topologie verwaltet. Three.js bleibt vorerst für Darstellung, Kamera und Interaktion zuständig. Der Geometriekern muss davon unabhängig sein und seine Ergebnisse als triangulierte Darstellung an Three.js übergeben können.

Die Recherche entscheidet noch nicht endgültig über die spätere Architektur. Eine Bibliothek wird erst ausgewählt, wenn ein isolierter Prototyp denselben Testkatalog erfolgreich durchläuft und Lizenz, Browserlaufzeit, Speicherbedarf und Wartbarkeit geprüft sind.

## 2. Kandidaten

### A. Open CASCADE Technology (OCCT) über WebAssembly

**Rolle:** Hauptkandidat für einen professionellen B-Rep-Kern.

- OCCT ist ein umfangreiches C++-Framework für 3D-Oberflächen- und Volumenmodellierung, CAD-Datenaustausch und Geometrieprüfung.
- Die offizielle Dokumentation beschreibt unter anderem Primitiven, Boolesche Operationen, Sweep/Loft, Abrundungen/Fasen, Shape Healing, STEP/IGES und ein Dokument-/Assoziativitäts-Framework (OCAF).
- OCCT 8.0.1 ist dokumentiert.
- Lizenz: LGPL 2.1 mit zusätzlicher Open-CASCADE-Ausnahme. Bei einer Verteilung müssen die konkreten Pflichten geprüft und erfüllt werden; dazu gehören unter anderem Hinweise für Nutzer und zugängliche Lizenz-/Quellinformationen.

**Bewertung:** Sehr gute fachliche Passung für B-Rep, Topologie, robuste Modellierungsoperationen und CAD-Austausch. Browserfähigkeit hängt von einer gepflegten WebAssembly-Portierung und deren API ab. Die Lizenz ist ein verbindlicher Architekturpunkt, kein nachträgliches Detail.

### B. Replicad (TypeScript-Abstraktion über Open CASCADE)

**Rolle:** Kandidat für einen höherstufigen TypeScript-Zugang zu OCCT.

- Replicad beschreibt sich als Bibliothek für browserbasierte 3D-Modellierung und als Abstraktion über Open CASCADE.
- Das Repository weist eine MIT-Lizenz für Replicad selbst aus.
- Der darunterliegende OCCT-Kern behält seine eigene Lizenz. Die MIT-Lizenz des Wrappers hebt die OCCT-Pflichten nicht auf.
- Die Abstraktion könnte die Integration gegenüber einer niedrigeren C++/WASM-Fassade vereinfachen.

**Bewertung:** Für einen ersten TypeScript-Prototyp interessant. Zu prüfen sind API-Abdeckung, Versionen und Wartungsrhythmus, Ladegrösse, Speicherverwaltung, Topologie-Identitäten und die Qualität der Browser-/Worker-Integration.

### C. moket-io/occt-wasm

**Rolle:** Konkrete, moderne OCCT-WASM-Implementierung als direkter Vergleichskandidat.

Die öffentliche Projektbeschreibung nennt:
- OCCT 8.0.1, kompiliert nach WebAssembly.
- Eine dünne C++-Fassade mit TypeScript-Typen.
- Browser-, Web-Worker- und Node-Unterstützung.
- Operationen wie Extrusion, Rotation, Boolesche Operationen, Fillet, Chamfer, Shell, Offset, Draft, Sweep und Loft.
- Topologieabfragen, Geometrieprüfung, Abstände, Masseneigenschaften, Tessellierung sowie STEP- und B-Rep-Austausch.
- Operationshistorie, die geänderte, erzeugte, gelöschte und unveränderte Unterformen melden kann.
- Empfohlene Ausführung in einem eigenen Modul-Worker, da die Geometrieoperationen synchron laufen und länger dauern können.
- Eine angegebene WASM-Dateigrösse von rund 19,83 MB roh bzw. 4,43 MB Brotli für die dokumentierte Konfiguration auf einem Apple-M4-System.

**Bewertung:** Sehr gute funktionale Abdeckung und eine für SILMO passende Worker-Schnittstelle. Noch zu prüfen sind reale Browserintegration, Speicherverhalten, Lizenz- und Austauschpflichten, Release-Stabilität sowie die Frage, ob die vorhandene Fassade alle benötigten Operationen in ausreichender Qualität abdeckt. Die geringe öffentliche Verbreitung ist ein Wartungsrisiko, aber kein Beweis für schlechte Geometrie.

### D. occt-wasm (andymai) – öffentliche TypeScript/WASM-Distribution

**Rolle:** Neuer direkter OCCT-Kandidat mit öffentlich installierbarem npm-Paket.

Der Projektstand und die npm-Veröffentlichung weisen Version **5.17.2** aus. Das Projekt baut Open CASCADE 8.0.1 nach WebAssembly und stellt eine TypeScript-API sowie einen Worker-Zugang bereit.

Dokumentierte Eigenschaften:
- Über 170 API-Methoden für Grundkörper, Boolesche Operationen, Sweep/Loft, Topologie, Kurven/Flächen, STEP/STL/BREP/glTF und Formhistorie.
- Three.js bleibt als Renderer möglich; die Bibliothek enthält keine eigene OCCT-Visualisierung.
- OcctKernel.init() lädt den Kernel; OcctWorker führt CAD-Aufgaben getrennt vom UI-Thread aus.
- Speicher wird über Shape-Handles verwaltet. Formen müssen explizit freigegeben oder der Kernel muss deterministisch entsorgt werden.
- Dokumentierte komprimierte WASM-Grösse: ungefähr 4,5 MB Brotli.
- Browseranforderungen laut Projekt: Chrome/Edge 114+, Safari 17.2+, Firefox 121+.
- IGES wird nicht unterstützt; STEP ist der vorgesehene CAD-Austauschweg.
- Eine Kernel-Instanz ist single-threaded; Worker-Verwendung verschiebt die Arbeit aus dem UI-Thread.
- Build-Tooling und TypeScript-Wrapper: MIT OR Apache-2.0. Das kompilierte WASM: LGPL-2.1-only (OCCT). Lizenzhinweise und Austauschbarkeit des WASM-Moduls müssen für SILMO separat geprüft werden.

**Bewertung:** Derzeit der praktischste OCCT-Prototyp-Kandidat, weil ein öffentliches npm-Paket mit TypeScript-API und Worker-Helfer vorhanden ist. Das ist keine Qualitätsfreigabe: Geometrie, Stabilität, Speicherfreigabe, Browserkompatibilität, Worker-Fehlerverhalten und Lizenzanforderungen müssen im SILMO-Testkorpus selbst geprüft werden. Die Paketversion ist jung und muss für reproduzierbare Tests exakt gepinnt werden.

### E. OpenGeometry 3.x

**Rolle:** Moderner Web-/WASM-B-Rep-Kandidat mit direkter Three.js-Integration.

Die Projektbeschreibung nennt:
- Rust-Kern, kompiliert nach WebAssembly, mit TypeScript-SDK für Three.js.
- B-Rep-Körper und Boolesche Vereinigung, Subtraktion und Schnittmenge.
- Extrusion, Sweep, Rotation, Shell und STEP-Export.
- Messungen, Validitäts-/Geschlossenheitsabfragen sowie Auswahl bis zu Flächen und Kanten.
- Lizenz MPL-2.0.

Wichtige Einschränkungen der dokumentierten 3.0-Version:
- Loft fehlt in 3.0.
- Spline-, Ellipsen- und elliptische Bogenkurven fehlen.
- STL-Export fehlt in 3.0.
- Die API unterscheidet sich deutlich von 2.0; Beispiele und Integrationscode müssen exakt zur installierten Version passen.
- Das Projekt beschreibt sich selbst als aktiv wachsend und weist auf sich entwickelnde APIs hin.

**Bewertung:** Unbedingt als Challenger testen. Die Three.js-Integration und die Web-Ausrichtung sind attraktiv. Für SILMO bestehen derzeit aber sichtbare Funktionslücken bei Loft, Freiformkurven und einigen Austausch-/Geometrieaufgaben. Diese Lücken müssen im Prototyp konkret bewertet werden.

### F. Manifold

**Rolle:** Mesh-basierter Vergleichs- und Ergänzungskandidat, nicht der bevorzugte alleinige CAD-Kern.

- Manifold konzentriert sich auf geschlossene, manifold Dreiecksnetze.
- Das Projekt nennt zuverlässige Boolesche Operationen mit garantiert manifold Ausgabe und eine WebAssembly-Version.
- Es ist auf Leistung und robuste Mesh-Ausgabe ausgerichtet.

**Bewertung:** Sehr interessant für druckorientierte Mesh-Operationen, Validierung und als Vergleich zum bestehenden BSP-CSG. Es ersetzt aber nicht ohne Weiteres einen analytischen B-Rep-Kern mit stabilen Flächen-, Kanten- und Vertex-Beziehungen, parametrischer Feature-Historie und nativer STEP-Modellierung.

### G. Truck und weitere Rust-B-Rep-Projekte

**Rolle:** Beobachtungskandidaten, derzeit keine erste Integrationsentscheidung.

Truck ist ein Rust-B-Rep-/NURBS-Projekt mit WebGPU-Ausrichtung und Apache-2.0-Lizenz. Die öffentlich sichtbare Reife und Funktionsabdeckung müssen genauer geprüft werden; es gibt keine ausreichende Grundlage, es ohne Prototyp als Ersatz für OCCT einzustufen. Weitere junge Rust-Kerne werden beobachtet, aber nicht als produktionsreif vorausgesetzt.

## 3. Vorläufige Einordnung

| Kandidat | B-Rep-Fit | Browser/WASM | Funktionspassung für SILMO | Hauptrisiko |
|---|---|---|---|---|
| OCCT 8.x | Sehr hoch | Über Wrapper | Sehr hoch | Lizenzpflichten und WASM-Integration |
| Replicad + OCCT | Sehr hoch | Browserorientiert | Hoch | Wrapper-Abdeckung und OCCT-Lizenz bleiben zu prüfen |
| moket occt-wasm | Sehr hoch | Direkt für WASM/Worker | Sehr hoch laut dokumentierter API | Privates npm-Paket; Quellbuild und Verteilung prüfen |
| occt-wasm (andymai) 5.17.2 | Sehr hoch | Direkt für WASM/Worker | Sehr hoch laut dokumentierter API | Junge API, WASM-Lizenz und Browser-Mindestversionen prüfen |
| OpenGeometry 3.x | B-Rep-orientiert | Direkt für Web/WASM | Mittel bis hoch | Sichtbare Funktionslücken und bewegliche API |
| Manifold | Mesh-basiert | WASM vorhanden | Ergänzend | Kein vollwertiger analytischer B-Rep-Ersatz |
| Truck | B-Rep/NURBS-Ziel | Rust/WebGPU-Ausrichtung | Noch offen | Reifegrad und fehlende Produktionsnachweise |

**Vorläufige technische Richtung:** Der erste echte Prototyp soll den öffentlich installierbaren Kandidaten occt-wasm (andymai, exakt gepinnte Version) mit dem separaten moket-io/occt-wasm-Build und Replicad vergleichen. OpenGeometry 3.x bleibt ein zusätzlicher B-Rep-Challenger. Manifold dient als Mesh-Benchmark und mögliche Ergänzung. Das ist ausdrücklich noch keine endgültige Kernelwahl.

## 4. Einheitlicher Prototyp-Testkatalog

Alle Kandidaten müssen dieselben geometrischen Aufgaben erhalten. Wo eine Funktion nicht angeboten wird, wird das als Funktionslücke protokolliert und nicht durch eine andere Operation kaschiert.

### Testgruppe A – Grundkörper und Masse
1. Quader mit bekannten Kantenlängen erzeugen.
2. Zylinder und Kugel erzeugen.
3. Volumen, Oberfläche und Bounding Box auslesen.
4. Werte gegen analytisch berechnete Sollwerte prüfen.
5. Einheitensystem mm und die bestehende SILMO-Umrechnung eindeutig abbilden.

### Testgruppe B – Boolesche Operationen
1. Zwei Körper vereinigen.
2. Zylinder als Durchgangsloch abziehen.
3. Schnittmenge berechnen.
4. Mehrere Werkzeuge in einem Schnittvorgang verarbeiten.
5. Koplanare Flächen testen.
6. Tangierende bzw. fast deckungsgleiche Körper testen.
7. Sehr dünne Wand und kleine Abstände testen.
8. Fehlgeschlagene Operation muss einen kontrollierten Fehler liefern und darf den Ausgangskörper nicht beschädigen.

### Testgruppe C – Topologie und Bearbeitung
1. Flächen, Kanten und Vertices eines Körpers abfragen.
2. Eine bestimmte Fläche und Kante anhand ihrer geometrischen Eigenschaften finden.
3. Fillet an ausgewählten Kanten.
4. Chamfer an ausgewählten Kanten.
5. Shell/Hohlkörper mit definierter Wandstärke.
6. Nach Boolean und Fillet die Operationshistorie auswerten.
7. Prüfen, wie Unterformen nach einer Änderung wiedergefunden werden können.
8. Topologie-Indizes nicht ungeprüft als dauerhaft stabile IDs behandeln.

### Testgruppe D – Erzeugungsoperationen
1. Skizzenprofil extrudieren.
2. Profil rotieren.
3. Sweep entlang gerader und gekrümmter Pfade.
4. Loft mit mehreren Profilen.
5. Innenkonturen/Löcher in Profilen erhalten.
6. Freiform-/Spline-Grenzen und nicht unterstützte Kurven dokumentieren.

### Testgruppe E – Datenaustausch
1. STEP exportieren.
2. STEP wieder importieren.
3. Volumen, Flächenzahl, Körperzahl und Einheiten nach Roundtrip vergleichen.
4. STL-/Mesh-Ausgabe erzeugen und in Three.js darstellen.
5. B-Rep- oder Projektpersistenz separat von der Mesh-Darstellung testen.
6. Exportfehler und nicht unterstützte Attribute sichtbar protokollieren.

### Testgruppe F – Browser und Stabilität
1. Initiale Ladezeit und WASM-Grösse messen.
2. Speicherverbrauch vor und nach grossen Operationen messen.
3. 100 wiederholte Operationen ausführen und Speicherfreigabe prüfen.
4. Geometrieoperationen in einem Worker ausführen.
5. Währenddessen muss die Benutzeroberfläche weiter reagieren.
6. Abbruch-/Fehlerfälle dürfen den Worker nicht dauerhaft blockieren.
7. Browser-Neustart und erneutes Laden müssen reproduzierbar sein.
8. Desktop-Safari und Chromium testen; mobile Browser später ergänzen.

## 5. Testdaten und Sollwerte

Ein kleiner, versionierter Testsatz soll für alle Kerne identisch sein:

- Quader: 40 × 30 × 20 mm; Volumen 24'000 mm³.
- Zylinder: Radius 5 mm, Höhe 20 mm; Volumen (500\pi\) mm³.
- Platte: 40 × 30 × 5 mm mit vier Durchgangslöchern.
- Dünnwandige Box mit definierter Wandstärke.
- Zwei Körper mit koplanarer Kontaktfläche.
- Zwei fast tangierende Zylinder.
- Extrudiertes Profil mit einer inneren Kontur.
- Sweep mit geradem und gebogenem Pfad.
- Loft mit drei Profilquerschnitten.

Die konkreten Sollwerte werden im Testcode festgehalten. Bei numerischen Resultaten wird eine vorab definierte absolute und relative Toleranz verwendet; sie darf nicht pro Test nachträglich so angepasst werden, dass ein Fehler als Erfolg erscheint.

## 6. Integrationsprinzip für SILMO

Unabhängig vom gewählten Kern gilt:

1. Der Kern wird als eigenständiges Modul gekapselt.
2. Er läuft in einem Worker, damit die CAD-Oberfläche nicht blockiert.
3. Three.js erhält ausschliesslich abgeleitete Darstellungsdaten (Mesh, Kantenlinien, Auswahlhilfen).
4. Die exakte Geometrie und Topologie bleiben die Quelle der Wahrheit.
5. Das bestehende SILMO-Objektmodell wird nicht direkt an eine fremde Kernel-API gekoppelt.
6. Eine SILMO-interne Kernel-Schnittstelle kapselt Körpererstellung, Operationen, Topologieabfragen, Messwerte, Validierung und Export.
7. Die bisherige BSP-CSG-Implementierung bleibt während des Vergleichs unangetastet.
8. Migration erfolgt erst nach bestandenen Tests und mit Rückfallmöglichkeit.

## 7. Offene Architekturfragen

- Wie werden SILMO-IDs für Flächen, Kanten und Punkte über Änderungen hinweg stabil gehalten?
- Wie wird Feature-Historie im SILMO-Dokumentmodell gespeichert?
- Welche Einheiten und Toleranzen gelten intern verbindlich?
- Wie werden Worker-Abstürze, Speichergrenzen und lange Operationen behandelt?
- Welche Lizenzhinweise, Quellcodezugänge und Austauschmöglichkeiten sind bei der gewählten OCCT-Verteilung erforderlich?
- Welche Daten bleiben im nativen SILMO-Projekt erhalten, auch wenn ein Kernel später gewechselt wird?

## 8. Quellen

- Open CASCADE Technology 8.0.1 – Übersicht, Modellierungsfunktionen, Datenaustausch und Lizenz: https://occt3d.com/dev/doc/overview/html/
- OpenCascade.js – Projektüberblick und Browser/WASM-Portierung: https://ocjs.org/docs/about
- Replicad – Repository und eigene MIT-Lizenz: https://github.com/sgenoud/replicad
- moket-io/occt-wasm – OCCT 8.0.1 WASM, API, Worker-Empfehlung und Grössenangaben: https://github.com/moket-io/occt-wasm
- occt-wasm (andymai) – öffentliches npm-Paket, TypeScript-API, Worker, Browseranforderungen und Lizenzaufteilung: https://github.com/andymai/occt-wasm
- occt-wasm 5.17.2 – veröffentlichte npm-Version: https://www.npmjs.com/package/occt-wasm
- OpenGeometry – Repository, API-Stand 3.0, Funktionen und MPL-2.0: https://github.com/openGeometry-io/OpenGeometry
- Manifold – offizielle Dokumentation zu manifold Meshes und WASM: https://manifoldcad.org/docs/html/
- Truck – Repository und Projektbeschreibung: https://github.com/ricosjp/truck

---

## 9. Erster isolierter Prototyp – tatsächlich ausgeführte Tests

Der Kandidat **occt-wasm 5.17.2 / OCCT 8.0.1** wurde in einem getrennten Forschungsordner getestet. Die bestehende SILMO-App wurde nicht an den Kernel angebunden.

### Node.js 24 – analytische Geometrietests

<badge>Bestanden</badge>

Ausgeführt im GitHub-Actions-Lauf: https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43693968178

Bestandene Fälle:
- Quader 40 × 30 × 20 mm: Volumen 24'000 mm³ und Bounding-Box-Abmessungen geprüft.
- Boolescher Durchbruch mit Zylinder: analytisches Sollvolumen geprüft.
- Platte 40 × 30 × 5 mm mit vier Durchgangslöchern: analytisches Sollvolumen geprüft.
- Fillet auf vier Kanten eines Quaders: gültiger Volumenkörper und verändertes Volumen geprüft.
- Flächen- und Kantenabfragen über Topologie-Handles.
- Tessellierung in Positions- und Indexpuffer.
- STEP-Export und erneuter Import mit Volumenvergleich.
- Unmögliche Fillet-Operation wird abgelehnt; der Kernel bleibt danach nutzbar.
- Freigabe aller Shape-Handles und erneute Kernel-Verwendung.

### Chromium – Browser-Web-Worker

<badge>Bestanden</badge>

Ausgeführt im selben isolierten Prototyp-Workflow. Ein Worker erzeugte einen Quader 10 × 20 × 30 mm, las das Volumen aus und lieferte ein Mesh zurück.

- Volumen: 6'000 mm³
- Dreiecke: 12
- Positionswerte: 72
- Indexwerte: 36

### Regression der bestehenden SILMO-App und Veröffentlichung

- Bestehender Playwright-Browser-Regressionslauf auf dem PR: bestanden – https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43693968253
- Manifest-/HTML-Validierung auf dem PR: bestanden – https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43693968196
- Nach Merge: Build und GitHub-Pages-Deployment bestanden – https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43694122230
- Nach Merge: bestehender Browser-Regressionslauf bestanden – https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43694122727
- Nach Merge: Manifest-/HTML-Validierung bestanden – https://github.com/jonas-cell-lang/mein-3d-studio-ai/actions/runs/43694122738

Prototyp und Tests liegen unter: [research/geometry-kernel-prototype](../research/geometry-kernel-prototype/README.md). Der Prototyp wurde mit Commit 93cd7c9e877d56761032a6c6ff7ebaa4dfc57a51 in das Repository übernommen.

## 10. Nächster Schritt

Den Testkorpus erweitern: koplanare und fast tangierende Flächen, dünne Wände, ungültige/degenerierte Eingaben, Topologiehistorie nach mehreren Operationen, Speicherwachstum über wiederholte Operationen, Worker-Abbruch und UI-Reaktionsfähigkeit. Danach Browserprüfungen in Safari/WebKit und Firefox ergänzen und denselben Testkatalog mit Replicad, moket-io/occt-wasm und OpenGeometry ausführen. Erst dann folgt eine technische Empfehlung.

**Wichtig:** Der erste Smoke-Test beweist nur, dass dieser Kandidat die geprüften einfachen Aufgaben in Node.js 24 und einem Chromium-Worker bestanden hat. Er beweist weder professionelle CAD-Reife noch Produktionsintegration, Foto-zu-3D-Eignung oder physische Druckqualität.
