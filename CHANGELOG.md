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

### Changed
- `yt-dlp[default]` (enthält yt-dlp-ejs) in den Abhängigkeiten.
