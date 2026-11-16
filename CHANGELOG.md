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
- Phase 2 Integration: `app/api.py` (js_api, Methoden exakt wie `ui/js/bridge.js`), `app/worker.py`
  (EventBus → `window.mv.emit`, Hintergrund-Worker, `run_session` für Download-Läufe,
  PO-Token-Watchdog, Live-Log als `log`-Events), `run_gui()` mit pywebview-Fenster
  (1440×900, min. 1100×700, `#08080a`), Single-Instance-Aktivierung (zweiter Start holt das Fenster
  nach vorne, `app/instance.py`).
- Einstellungen speichern/zurücksetzen mit deutschen Feldmeldungen (`section.key`,
  `genres.items.<i>.<feld>`), sofort wirksam (Throttle, Log-Stufe, PO-Token-Server).
- Statusleiste mit echten Werten (Versionen, Deno/ffmpeg, PO-Token-Status, Backoff, Zähler, Queue,
  Eingang, nächste geplante Prüfung).
- Wartung: yt-dlp & Plugin per pip aktualisieren, tägliche Update-Prüfung (PyPI), DB-Sicherung
  (`backups/hcloader-<Zeit>.db`), PO-Token-Test ohne YouTube-Request (`app/core/maintenance.py`,
  `app/core/potoken.py`, `app/core/status.py`).
- Windows-Aufgabenplanung anlegen/prüfen/entfernen (`app/core/scheduler.py`,
  `scripts/run_watchlist.pyw`).
- `docs/bridge-api.md`: Methoden, Rückgaben, Events, Phase-Status.

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
- `bridge.js`: Live-Modus erst, wenn die pywebview-API-Funktionen existieren; mit `?host=pywebview`
  kein Mock-Fallback nach 1,2 s (Wartezeit 30 s).
- Validierung: Maximaldauer muss ≥ Mindestdauer sein (0 = unbegrenzt); doppelte Genre-Namen werden
  zusätzlich an der Zeile gemeldet. Live-Log-Einträge tragen optional `ui_level` (z.B. `ok`).
