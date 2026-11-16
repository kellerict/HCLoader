# QA Phase 1 – Gerüst & Kern-Download

Datum: 2026-11-16. Ergebnis: **BESTANDEN bis auf extern blockierten Smoke-Test** (2 kleine Mängel, nicht blockierend).

## Läufe
- `ruff check .` -> All checks passed
- `ruff format --check .` -> 45 files already formatted
- `pytest -q` (voll) -> alles grün (Exit 0), ffmpeg vorhanden, keine Skips
- `python scripts/ui_screenshots.py --out .tmp/qa-shots` -> 32 Screenshots, Exit 0 (Repo unverändert, `git status` sauber)

## Kriterien
| Kriterium | Status | Beleg |
|---|---|---|
| Projektstruktur laut CLAUDE.md | OK | app/core/{config,db,ytclient,throttle,filters,genre,paths,tagging,binaries}.py, ui/ (index.html, css, js/views, fonts+OFL), scripts/, tests/ vorhanden; zusätzlich locks.py, logging_setup.py. api.py/worker.py gehören zu späteren Phasen |
| setup.ps1 (statisch) | OK | venv (py 3.13/3.12/python, Versionscheck >=3.12), pip install requirements(+dev), fetch_binaries.ps1, Desktop-Verknüpfung mit pythonw `-m app.main`, idempotent, Schalter -Force/-Dev/-SkipBinaries/-NoShortcut. Nicht ausgeführt (kein pwsh) |
| Config laden/speichern | OK | Snippet mit HCLOADER_HOME=/tmp/claude-0/qa-home2: `load()` legt nichts an, `save()` schreibt kommentierte config.yaml, `load()` -> `s2 == s` True, geänderter Wert (log_level=DEBUG) erhalten. tests/test_config.py grün |
| DB + Migration | OK | hcloader.db mit Tabellen schema_version, videos, sources, channel_blacklist, runs, state; Version 1. tests/test_db.py: Migration von älterer Version, idempotent, neuere Version abgelehnt, WAL |
| Logging | OK | `setup_logging` schrieb `logs/hcloader.log` (RotatingFileHandler), Live-Handler fuer UI; tests/test_logging_setup.py (siehe Mangel 2) |
| .gitignore | OK | bin/, venv, *.db, config.yaml, archive.txt, cookies, logs, .tmp/, Medien |
| CI-Workflow | OK | .github/workflows/ci.yml: windows-latest, py3.12, ruff check, ruff format --check, pytest |
| CLI `--smoke` | OK | `python -m app.main --help` listet `--smoke URL`; ohne Argument Exit 2. tests/test_main.py: Download einmal, Exitcodes (done/skipped=0, failed=1, Throttle=blockiert, Run-Lock belegt) mit gemocktem Client |
| ui_screenshots.py | OK (Mangel 1) | alle Ansichten (discover, inbox, watchlist, downloads, library, log, settings + Dialoge/Tabs), 32 PNG, Exit 0 |
| ytclient.download: Deno + PO-Token Script, MP3 320, Tags, Cover, Ordner | OK (gemockt) | test_opts_download_mp3_320 (FFmpegExtractAudio mp3/320, Thumbnail), test_opts_po_token_modes (script -> bgutilscript server_home), test_opts_ffmpeg_and_deno_locations. test_download_pipeline_and_second_call_skips mit echtem ffmpeg-MP3: Pfad `Hardcore/Partyraiser/2026/2026-10-03 - ... [ID].mp3`; mutagen: TIT2, TCON=Hardcore, TXXX:YOUTUBE_ID, APIC, 3x CHAP, CUE mit `INDEX 01 30:00:00`. tests/test_tagging.py::test_write_tags_all_frames prüft ID3v2.4 (TIT2/TPE1/TPE2/TALB/TRCK/TCON/TDRC/COMM/APIC/CTOC) |
| Zweiter Aufruf lädt nicht erneut | OK | gleicher Test: zweiter `download()` -> `skipped`, keine neue YoutubeDL-Instanz, Downloadzähler bleibt 1; test_skip_when_only_in_archive |
| Tests paths/filters/genre | OK | tests/test_paths.py, test_filters.py, test_genre.py grün |
| Smoke mit echtem YouTube | **BLOCKIERT (extern)** | MV_SMOKE_URL nicht gesetzt, youtube.com gesperrt; nicht umgangen. Reale Ende-zu-Ende-Verifikation (echtes Deno/bgutil/yt-dlp, echte Tags) steht aus |

## Mängel
1. (gering) `scripts/ui_screenshots.py --out <Pfad ausserhalb des Repos>` stürzt nach dem ersten Screenshot ab (Exit 1): `shot()` nutzt `path.relative_to(ROOT)` -> ValueError. Mit Ziel im Repo und Standard funktioniert es. Fix: Ausgabe ohne relative_to oder mit Fallback auf absoluten Pfad.
2. (gering, nur Tests) Reihenfolgeabhängigkeit: `pytest tests/test_main.py tests/test_logging_setup.py` (oder Teilmengen, in denen test_main vor test_logging_setup läuft) lässt `test_file_and_live_stream` fehlschlagen (`ValueError: I/O operation on closed file`). Ursache: `run_smoke` -> `setup_logging(console=True)` hinterlässt einen StreamHandler auf dem von capsys geschlossenen stderr im Root-Logger. Volle Suite (alphabetische Reihenfolge) ist grün. Fix: Console-Handler in test_main aufräumen (Fixture) oder in setup_logging bei erneutem Aufruf ersetzen.
