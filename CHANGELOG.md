# Changelog

Alle relevanten Änderungen werden hier festgehalten.
Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach [SemVer](https://semver.org/lang/de/).

## [Unreleased]

### Added
- Projektgerüst, Konfiguration (YAML/pydantic), SQLite-Schema mit Migrationen.
- Kernmodule: Pfade, Filter, Genre-Erkennung, Throttle mit Backoff, Logging.
- CI-Workflow (Windows, ruff, pytest).
- Kern-Download: `ytclient` (Suche, Quellenliste, Auflösen, Download-Pipeline mit Archiv, Throttle,
  Backoff, Abbruch), `binaries` (deno/ffmpeg/Provider-Status, HTTP-Provider-Kindprozess),
  `tagging` (ID3v2.4, Cover quadratisch, CUE, CHAP/CTOC; m4a/opus).
- CLI `python -m app.main --smoke <URL>`; Stub für `--headless --run-watchlist`.
- `scripts/setup.ps1` und `scripts/fetch_binaries.ps1` (venv, deno, ffmpeg, bgutil-Provider, Verknüpfung).
- README.

### Fixed
- Review Phase 1: `download()` akzeptiert nur Einzelvideos (Playlist-/Kanal-/Such-URLs werden vor dem Throttle abgelehnt).
- Migrationen atomar (kein `executescript`), Rollback-Test.
- Download-Archiv wird erst nach `done` von HCLoader geschrieben; hängende `downloading`-Zeilen werden beim Start auf `failed` ("Unterbrochen") gesetzt.
- Throttle thread-sicher; Pause zwischen Downloads zentral erzwungen (persistiert, abbrechbar); Fehlversuche zählen gegen Lauf-/Tageslimit; `finish_run(success)` setzt den Backoff zurück.
- 429/Bot-Check als yt-dlp-Warnung löst den Backoff aus; Abbruch setzt den vorherigen Status zurück ("Abgebrochen"); `.part` bleibt für Wiederholungen erhalten; Schritte nach dem Verschieben sind nicht mehr fatal.
- Pfadlänge in UTF-16-Einheiten, `CONIN$`/`CONOUT$` reserviert; CUE mit UTF-8-BOM; unlesbare `config.yaml` wird als `.bak-<Zeitstempel>` gesichert.
- HTTP-PO-Token-Server: Warten auf `/ping` (10 s); TOKEN_TTL in ganzen Stunden.
- Echte Single-Instance und Lauf-Lock (`app/core/locks.py`); `setup.ps1` wählt Python 3.13/3.12/`py -3` (>= 3.12); `fetch_binaries.ps1` prüft SHA256 und kopiert statt zu verschieben; `.gitignore` ergänzt.

### Changed
- `yt-dlp[default]` (enthält yt-dlp-ejs) in den Abhängigkeiten.
