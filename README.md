# HCLoader

Windows-Desktop-App zum Finden, Filtern und lokalen Speichern von Hardstyle-, Hardcore- und
Uptempo-Mixes von YouTube als getaggte MP3 – mit möglichst geringer Last für YouTube
(zentraler Throttle, flache Metadaten-Abfragen, Backoff bei HTTP 429, nie doppelt laden).

> **Privater Eigengebrauch.** HCLoader ist für das persönliche Archivieren von Inhalten gedacht,
> zu denen du Zugang hast. Keine Weiterverbreitung; beachte die Nutzungsbedingungen von YouTube
> und das Urheberrecht deines Landes.

![Entdecken](docs/screenshots/discover.png)

## Installation (Windows 10/11, x64)

Voraussetzungen: Python 3.12+ (`py -3.12` oder `python` im PATH), Internetzugang. Git ist optional.

```powershell
.\scripts\setup.ps1
```

Das Skript legt ein lokales `.venv` an, installiert die Abhängigkeiten (`yt-dlp[default]`,
bgutil-Plugin, mutagen, ...), holt `deno.exe`, `ffmpeg.exe`, `ffprobe.exe` und den
PO-Token-Provider nach `bin/` und legt eine Desktop-Verknüpfung an. Es ist idempotent;
`-Force` holt alles neu, `-SkipBinaries` / `-NoShortcut` lassen Teile aus.
Die Binaries lassen sich auch einzeln holen: `.\scripts\fetch_binaries.ps1`.

## Start

```powershell
.\.venv\Scripts\python -m app.main                          # GUI
.\.venv\Scripts\python -m app.main --headless --run-watchlist   # für die Aufgabenplanung (Phase 4)
```

Konfiguration, Datenbank, Archiv und Logs liegen unter `%APPDATA%\HCLoader\`.

## Smoke-Test

Lädt genau ein Video durch die komplette Pipeline (Deno, PO-Token, ffmpeg, Tags, Ablage):

```powershell
.\.venv\Scripts\python -m app.main --smoke "https://www.youtube.com/watch?v=<ID>"
```

Ausgabe: Ergebnis (`done` / `skipped` / `failed`) und Zielpfad. Ein zweiter Aufruf mit derselben URL
lädt nichts erneut (`skipped`). Exitcodes: 0 ok, 1 Fehler, 2 durch Throttle/Backoff gesperrt.

## Entwicklung

```powershell
.\.venv\Scripts\pip install -r requirements-dev.txt
.\.venv\Scripts\pytest
.\.venv\Scripts\ruff check . ; .\.venv\Scripts\ruff format .
```

Tests mocken das Netzwerk vollständig. Anforderungen: `SPEC.md`, Arbeitsregeln: `CLAUDE.md`.
