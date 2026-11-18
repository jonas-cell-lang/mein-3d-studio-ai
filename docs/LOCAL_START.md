# SILMO lokal starten

Diese Anleitung startet die bestehende SILMO-Web-App lokal, ohne kostenpflichtige Dienste und ohne zusätzliche npm-Pakete.

## Voraussetzungen

- macOS, Windows oder Linux
- Python 3
- Internetverbindung, weil Three.js und die STL-Erweiterungen derzeit noch von einem CDN geladen werden

## Start unter macOS

1. Das Repository von GitHub herunterladen oder mit Git klonen.
2. Terminal öffnen.
3. In den heruntergeladenen Projektordner wechseln. Beispiel:

   ```sh
   cd ~/Downloads/mein-3d-studio-ai
   ```

4. Prüfen, ob Python 3 vorhanden ist:

   ```sh
   python3 --version
   ```

5. Den lokalen Webserver starten:

   ```sh
   python3 -m http.server 4173
   ```

6. Im Browser diese Adresse öffnen:

   ```
   http://localhost:4173/
   ```

Die Terminal-Anwendung muss geöffnet bleiben, solange SILMO läuft. Zum Beenden im Terminal `Ctrl+C` drücken.

## Windows

Im Projektordner PowerShell öffnen und ausführen:

```powershell
py -3 -m http.server 4173
```

Danach im Browser `http://localhost:4173/` öffnen. Zum Beenden `Ctrl+C` drücken.

## Wichtige Hinweise

- SILMO ist derzeit eine statische Browser-Anwendung. Für den lokalen Start ist kein `npm install` erforderlich.
- Die lokale Adresse ist nur auf diesem Computer erreichbar; der Start veröffentlicht nichts im Internet.
- Die aktuelle Version lädt Three.js und STL-Erweiterungen von externen CDNs. Darum ist für den vollständigen Funktionsumfang derzeit Internet nötig.
- Die Module `src/units.js` und `src/project-schema.js` werden relativ zu `index.html` geladen. Deshalb muss SILMO über einen lokalen Webserver gestartet werden und nicht durch direktes Öffnen der HTML-Datei (`file://`).
- Der Startserver stellt nur Projektdateien bereit. Er verändert weder GitHub noch die öffentliche Live-App.
