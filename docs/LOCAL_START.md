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

4. Den gepinnten OCCT-WASM-Worker-Build installieren und erstellen:

   ```sh
   npm install --prefix research/geometry-kernel-prototype --no-audit --no-fund
   npm run build:worker --prefix research/geometry-kernel-prototype
   ```

5. Die lokalen Laufzeitdateien vorbereiten:

   ```sh
   npm run prepare:runtime
   ```

Der Vorbereitungsschritt erstellt die ignorierten Ordner `vendor/three/` und `vendor/occt/`. Sie enthalten Three.js r128, die STL-Erweiterungen, den gebündelten OCCT-Worker und `occt-wasm.wasm`. Die generierten Dateien werden nicht von Hand bearbeitet.

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
npm install --prefix research/geometry-kernel-prototype --no-audit --no-fund
npm run build:worker --prefix research/geometry-kernel-prototype
npm run prepare:runtime
```

## Wichtige Hinweise

- `npm ci` installiert exakt die in der Root-`package-lock.json` festgelegte Three.js-Version. Der OCCT-Prototyp verwendet separat direkt gepinnte Paketversionen; `occt-wasm` ist auf 5.17.2 festgelegt.
- Die Vorbereitung kopiert nur die Three.js-Dateien aus dem installierten Paket in `vendor/three/`; die Quellversion bleibt unverändert.
- `node_modules/` und `vendor/` sind generierte Ordner und werden nicht eingecheckt.
- Der lokale Webserver stellt nur Projektdateien bereit. Er verändert weder GitHub noch die öffentliche Live-App.
- SILMO muss über den lokalen Webserver gestartet werden, nicht durch direktes Öffnen der HTML-Datei (`file://`).
- Der Browser lädt Three.js aus `./vendor/three/` und den OCCT-Kern bei Bedarf aus `./vendor/occt/`; beide Runtime-Pfade benötigen kein externes CDN. Die lokalen App-Module umfassen `src/developer-diagnostics.js`, `src/tool-navigation.js`, `src/units.js`, `src/tolerances.js`, `src/csg.js`, `src/project-schema.js`, `src/project-geometry.js`, `src/project-io.js`, `src/tutorial.js` und `src/image-studio.js`, `src/primitive-geometry.js`.
