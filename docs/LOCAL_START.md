# SILMO lokal starten

Diese Anleitung startet die SILMO-Web-App lokal mit den festgelegten, kostenlosen Open-Source-Abhängigkeiten. Three.js und die STL-Erweiterungen werden aus der exakt versionierten npm-Abhängigkeit lokal bereitgestellt; die App braucht dafür keine CDN-Verbindung.

## Voraussetzungen

- macOS, Windows oder Linux
- Node.js 22 oder neuer (npm ist enthalten)
- Python 3

## Einmalige Einrichtung

1. Das Repository von GitHub herunterladen oder klonen.
2. Terminal bzw. PowerShell im Projektordner öffnen.
3. Die festgelegten Abhängigkeiten installieren:

   ```sh
   npm ci
   ```

4. Die lokalen Three.js-Dateien aus dem installierten Paket vorbereiten:

   ```sh
   npm run prepare:runtime
   ```

Der Vorbereitungsschritt erstellt den ignorierten Ordner `vendor/three/` mit Three.js r128, STLLoader und STLExporter. Der Ordner wird nicht von Hand bearbeitet.

## Start unter macOS und Linux

Im Projektordner:

```sh
python3 -m http.server 4173
```

Danach im Browser öffnen:

```
http://localhost:4173/
```

## Start unter Windows

Im Projektordner PowerShell öffnen:

```powershell
py -3 -m http.server 4173
```

Danach im Browser `http://localhost:4173/` öffnen.

Die Terminal-Anwendung muss geöffnet bleiben, solange SILMO läuft. Zum Beenden `Ctrl+C` drücken.

## Nach einem frischen Checkout

Bei jedem neuen Checkout oder wenn `node_modules/` bzw. `vendor/` gelöscht wurden, die Einrichtung erneut ausführen:

```sh
npm ci
npm run prepare:runtime
```

## Wichtige Hinweise

- `npm ci` installiert exakt die in `package-lock.json` festgelegte Three.js-Version.
- Die Vorbereitung kopiert nur die Three.js-Dateien aus dem installierten Paket in `vendor/three/`; die Quellversion bleibt unverändert.
- `node_modules/` und `vendor/` sind generierte Ordner und werden nicht eingecheckt.
- Der lokale Webserver stellt nur Projektdateien bereit. Er verändert weder GitHub noch die öffentliche Live-App.
- SILMO muss über den lokalen Webserver gestartet werden, nicht durch direktes Öffnen der HTML-Datei (`file://`).
- Der Browser lädt die Kernbibliotheken nun aus `./vendor/three/` und benötigt dafür kein externes CDN. Die zentralen Module `src/units.js`, `src/tolerances.js` und `src/project-schema.js` werden ebenfalls lokal geladen.
