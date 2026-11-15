# SILMO – Spezifikation für Einheiten und Toleranzen

**Stand:** 15.11.2026
**Basis:** Direkte Quellcodeprüfung von index.html, insbesondere Zeilen 1267–1321, 1359–1463, 2846–2860, 3007–3011, 4284–4353 sowie der Projektserialisierung.
**Status:** Ist-Zustand und Migrationsanforderungen. Noch keine Änderung am Laufzeitcode.

## 1. Verifizierter Ist-Zustand

### 1.1 Interne Längeneinheit

Der Quellcode setzt `MM_PER_UNIT = 10` (index.html, Zeile 1321). Die tatsächliche Umrechnung lautet:

- **1 Three.js-Welteinheit = 10 mm**
- **1 mm = 0,1 Three.js-Welteinheiten**
- Millimeter → interne Koordinate: durch 10 teilen
- interne Koordinate → Millimeter: mit 10 multiplizieren

Das wird im Code konkret bestätigt:
- Druckbettbreite und -tiefe werden durch `MM_PER_UNIT` geteilt (Zeilen 1267–1280).
- Objektabmessungen werden mit `MM_PER_UNIT` in Millimeter umgerechnet (Funktion `currentSizeMM`, Zeilen 1353–1357).
- Der STL-Export skaliert Geometrie und Objekttranslation mit `MM_PER_UNIT`, damit STL-Koordinaten Millimeter sind (Zeilen 2846–2860).
- Skizzenraster und Skizzenvereinfachung rechnen Millimeterwerte in interne Einheiten um (z. B. Zeilen 3007–3011).

**Korrektur der älteren Projektdokumentation:** Die frühere Formulierung „10 Three.js-Einheiten = 1 mm“ war umgekehrt. Richtig ist **1 Three.js-Einheit = 10 mm**. Masterplan und technische Bestandsaufnahme wurden entsprechend berichtigt.

### 1.2 Aktuelle Geometrie- und Vergleichsschwellen

| Stelle | Quellcodewert | Bedeutung, soweit belegt |
|---|---:|---|
| CSG | `CSG_EPSILON = 1e-5` (Zeile 1362) | BSP-Klassifikation, Ebenen-Schnitt und Filterung degenerierter Dreiecke; Koordinaten sind interne Three.js-Koordinaten. Entspricht bei der aktuellen Skala 0,0001 mm. |
| Skizzenvereinfachung | Standard `toleranceMM = 0.5`; intern `max(0.001, toleranceMM / MM_PER_UNIT)` (Zeilen 3007–3011) | Fachliche Vereinfachungstoleranz in mm mit interner Untergrenze 0,001 Welteinheiten (= 0,01 mm). |
| Druckbettprüfung | `bedTolerance = 1e-5` (Zeilen 3776–3780) | Wird direkt mit internen Weltkoordinaten verglichen; bei aktueller Skala entspricht dies 0,0001 mm. |
| Geometrie-/Skizzenvergleiche | Mehrere Schwellen wie `1e-7`, `1e-6`, `0.01`, `0.02` (u. a. Zeilen 2058–2091, 3207–3227, 3477–3571) | Nicht pauschal als Modelliertoleranz interpretieren. Jede Stelle braucht eine eigene fachliche Zuordnung. |

Die Werte dürfen nicht zu einer einzigen globalen Toleranz zusammengezogen werden. Einige sind geometrische Grenzwerte, andere dienen Vergleich, Vereinfachung, Kamera-/Interaktionsverhalten oder Darstellungsabständen.

## 2. Verbindliche Regeln für die Zielarchitektur

1. Das interne Dokument-/Geometriemodell erhält eine eindeutig dokumentierte Basiseinheit. Die bestehende Anwendung verwendet aktuell Three.js-Einheiten mit 10 mm pro Einheit.
2. Die Umrechnung liegt künftig an einer zentralen, getesteten API-Grenze. Fachmodule dürfen keine eigenen Faktoren wie `/10` oder `*10` verstreut definieren.
3. API-Namen müssen die Richtung eindeutig machen, zum Beispiel `mmToWorldUnits` und `worldUnitsToMm`; der bisherige Name `MM_PER_UNIT` wird wegen möglicher Lesart dokumentiert und nicht ungeprüft übernommen.
4. Einheiten von Punkten, Richtungsvektoren, Winkeln, Flächen, Volumen, Mesh-Tessellierung und Toleranzen werden ausdrücklich unterschieden.
5. Winkel werden nicht mit Längenfaktoren umgerechnet. Für den Geometriekern sind Winkel in Radiant nur dann verbindlich, wenn die jeweilige API dies dokumentiert.
6. Exakte CAD-Geometrie und Darstellungsmesh bleiben getrennt. Tessellierungsabweichung ist keine Modelliertoleranz.
7. Import-/Heilungstoleranzen gehören zum jeweiligen Import-/Reparaturvorgang und dürfen nicht unbemerkt die Dokumentgeometrie verändern.
8. Bestehende v90-Projekte behalten ihre gespeicherten Koordinaten. Eine Umstellung des internen Massstabs benötigt ein explizites, getestetes Dokumentformat-Migrationsverfahren.
9. Jeder neue Toleranzwert braucht eine dokumentierte fachliche Begründung, Einheit, betroffene Operation und positive/negative Grenzfalltests.
10. Ein Kernel darf seine eigene interne Toleranzverwaltung haben; die SILMO-Adapter-Schicht muss die verwendeten Werte und Einheiten jedoch explizit übergeben oder dokumentieren.

## 3. Zielstruktur der zentralen API (Spezifikation, noch kein Code)

Die API soll mindestens folgende getrennte Aufgaben anbieten:

- Längen: mm ↔ interne Modellkoordinaten
- Flächen und Volumen: aus der Basiseinheit korrekt abgeleitete Einheiten
- Winkel: Grad ↔ Radiant, falls beide Einheiten in der Oberfläche verwendet werden
- Modell-/Kernel-Toleranzen: Operationen und Einheiten explizit benennen
- Skizzenvereinfachung: eigener fachlicher Wert, nicht mit Kernel-Toleranz vermischen
- Tessellierung: Darstellungsqualität getrennt von exakter Geometrie
- Import-/Heilungstoleranz: nur für den jeweiligen Austausch-/Reparaturschritt

Es werden hier bewusst keine neuen globalen Zahlenwerte festgelegt. Die bestehenden Schwellen müssen zuerst vollständig mit ihren Aufrufstellen und Tests inventarisiert werden.

## 4. Migrations- und Testanforderungen

### Referenzkonvertierungen
- 10 mm müssen exakt 1,0 interne Welteinheit ergeben.
- 1 mm muss exakt 0,1 interne Welteinheiten ergeben.
- 200 mm Druckbettbreite müssen intern 20 Einheiten ergeben.
- Ein Objekt mit 2 internen Einheiten Kantenlänge muss als 20 mm gemessen werden.
- Beim STL-Export müssen interne Koordinaten und Translationen gemeinsam in Millimeter überführt werden.

### Regression
- Bestehende v90-Projektdateien müssen ohne Positions-/Grössenänderung geöffnet werden.
- Speichern und Wiederöffnen darf keine Einheitenverschiebung verursachen.
- Skalierung bleibt dimensionslos und wird nicht nochmals mit dem Längenfaktor multipliziert.
- Rotationen bleiben unverändert.
- Boolesche Operationen, Skizzen, Extrusion, Hohlkörper und Druckbettprüfung werden mit den bisherigen Referenzfällen verglichen.

### Abnahme
- Alle Umrechnungsfunktionen haben Unit-Tests mit exakten einfachen Referenzwerten.
- Grenzfalltests prüfen Null, negative Werte, ungültige Werte und sehr grosse Werte entsprechend den jeweiligen API-Verträgen.
- Browser-Tests prüfen, dass die Oberfläche dieselben Millimeterwerte zeigt und dieselben STL-Abmessungen exportiert.
- Kein bestehendes Projekt wird durch die neue API stillschweigend skaliert.

## 5. Offene Quellcodeprüfung

- Alle Längen- und Abstandsgrenzen in index.html einer Einheit zuordnen.
- Prüfen, welche Schwellen numerische Stabilität und welche nur UI-/Interaktionsabstände betreffen.
- Druckbettprüfung ab Zeile 3776 vollständig lesen und ihre Toleranz fachlich zuordnen.
- Prüfen, ob STL-Import die eingelesenen Koordinaten bereits auf interne Einheiten skaliert.
- Prüfen, ob Projektformat v3 die Basiseinheit explizit speichert oder sie nur implizit voraussetzt.
- Testfälle für alle Einheiten-Grenzen aus dem vorhandenen Browser-Test und den Diagnosefunktionen ableiten.

## 6. Quellen

- `index.html`: Zeilen 1267–1321 (Druckbett und Umrechnungsfaktor)
- `index.html`: Zeilen 1353–1357 (Objektabmessungen in mm)
- `index.html`: Zeilen 1359–1540 (BSP-CSG und `CSG_EPSILON`)
- `index.html`: Zeilen 2846–2860 (STL-Export in Millimetern)
- `index.html`: Zeilen 3007–3011 (Skizzenvereinfachung)
- `index.html`: Zeilen 1678–1875 (Geometrie- und Projektserialisierung; Projektversion 3)
- [Technische Bestandsaufnahme v90](SILMO_CURRENT_STATE_AUDIT.md)
- [Funktions- und Abhängigkeitsmatrix](SILMO_FUNCTION_DEPENDENCY_MATRIX.md)
- [Masterplan](SILMO_MASTERPLAN.md)
