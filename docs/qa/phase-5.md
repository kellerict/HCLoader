# QA Phase 5 – Bibliothek, Protokoll, Feinschliff

Ergebnis: **BESTANDEN** (Windows-only-Punkte offen; 2 kosmetische Hinweise bei 1100x700)

## Automatisch (.venv)
| Prüfung | Beleg |
|---|---|
| `ruff check .` | All checks passed |
| `ruff format --check .` | 84 files already formatted |
| `pytest -q` | alle grün (1 network-Test abgewählt: "1 passed, 601 deselected" im Marker-Lauf) |
| `pytest -q -m network` | 1 passed in 8.2 s (`tests/test_update_real_venv.py`, PyPI) |
| `pytest -q tests/test_cue_acceptance.py` | 5 passed |
| `scripts/ui_screenshots.py` | Exit 0, 68 Bilder (/tmp/claude-0/qa5-shots); `--reduced` Exit 0, 68 (…-reduced); `--viewport 1100x700` Exit 0, 73 (…-1100) |

## Akzeptanz 1: Kapitel-Mix erzeugt gültige .cue
Eigenes Skript `/tmp/claude-0/qa5/cue_check.py`: Fake-YoutubeDL, `YtClient.download`, echte 6900-s-MP3 (ffmpeg), Titel `Ünïcode "Quoted" Mix – Hardcore 2026`, Kanal `DJ "Q" Müller`, Kapitel 0 / 600 / 3600.5 / 6100 s (= 101:40:00) und eines bei 9000 s (hinter dem Ende).
- .cue: UTF-8-BOM, keine CR, genau eine `FILE "…" MP3`-Zeile (Datei existiert), TRACK 01..04 fortlaufend, `INDEX 01` 00:00:00 / 10:00:00 / 60:00:38 / 101:40:00 (Minuten > 99 ok, Sek < 60, Frames < 75, streng steigend), Anführungszeichen zu `'`, Umlaute erhalten, Kapitel hinter Medienende verworfen. Eigene Regex-Prüfung (nicht der Test-Parser): bestanden.
- ffprobe: Dauer 6900.19 s >= letzte CUE-Zeit 6100.0 s.
- mutagen: 4 CHAP (chp0..3, korrekte Start/End in ms, TIT2) + CTOC `toc` (TOP_LEVEL|ORDERED, Kinder chp0..chp3); TIT2/TPE1 mit Original-Anführungszeichen.

## Akzeptanz 2: Update-Knopf aktualisiert yt-dlp im venv
- Backend: `/tmp/claude-0/qa5/venv` (yt-dlp==2025.1.15), `maintenance.run_update(executable=…)` -> `{'ok': True, 'ytdlp': '2026.10.26', 'plugin': '2.0.2', 'changed': True}`; `pip list` im venv bestätigt yt-dlp 2026.10.26, bgutil-Plugin 2.0.2.
- UI: echte `Api(update_runner=…→ run_update(executable=venv))` hinter Fake-pywebview in Chromium (`/tmp/claude-0/qa5/live5.py`): Klick auf Update-Knopf im Wartung-Tab, Live-Konsole zeigt pip-Zeilen und "Neue Version installiert – wirksam nach einem Neustart", Banner "Neustart nötig", beide Toasts, venv-Version vorher 2025.1.15, nachher 2026.10.26 (`/tmp/claude-0/qa5/shots/16-…, 17-maint-update-done.png`).

## Live im Browser (live5.py, 25/25 Checks PASS, keine PAGEERRORs)
| Bereich | Ergebnis |
|---|---|
| 3 Mixes per UI-Suche + "Auswahl laden" | 3 Downloads, 1 mit Kapitel -> .cue; Pfade Genre/Artist/Jahr |
| Bibliothek | 3 Mixes, Kennzahlen (Mixes 3, Dauer 3.3 Std., Genre-Balken Uptempo 1 / Hardcore 2), Grid/Liste; Genre-Filter, Jahr 2013 -> 1 Treffer, Suche "terror" -> 1 Treffer |
| Datei von Hand gelöscht | Ansicht neu geladen: Zeile "DATEI FEHLT", Chip "1 FEHLT"; "Entfernen" per Dialog -> DB `ignored`, `file_path` leer |
| Neu taggen nach Template-Änderung (Einstellungen › Ablage, `{year}/{artist}/{date} - {title} [{id}]`) | Datei von `Uptempo/DJ Terror/2020/…` nach `2020/DJ Terror/…` verschoben, .cue mitverschoben, `FILE`-Zeile der .cue auf neuen Namen, Toast "Neu getaggt und verschoben: … → …/music/2020/DJ Terror/", alte Ordner entfernt |
| Löschen per Dialog | Datei + .cue weg, leere Ordner (Hardcore/Partyraiser/2013) weg, DB `ignored`, Karte verschwindet; `enqueue` -> `skipped: 1`, erneute Suche -> kein weiterer Download (Download-Zähler bleibt 1), Datei nicht neu angelegt |
| Protokoll | Live-Log 16 Zeilen (Setup wie `main.py`: `setup_logging(history=500)`); Level-Filter INFO aus -> Zeilen verschwinden; Suche "gelöscht" filtert; Lauf-Historie Timeline + Tabelle, Art-Filter (Watchlist -> leer, Manuell -> Läufe); nach weiterem Download-Lauf erscheint neuer Lauf (Runs 1 -> 2, `downloaded 1`) |
| DB-Backup | 12 Klicks auf "DB-Backup erstellen" -> genau 10 `hcloader-*.db` im Ordner, `get_versions().backups` = 10, UI zeigt 5 + "+ 5 ältere im Ordner «backups»" |

Hinweis zur Methode: Die Api konfiguriert Logging nicht selbst (macht `main.py`); im Testskript daher `setup_logging` vor `Api` aufgerufen. Kein Mangel.

## Screenshots angesehen
Normal: library-grid, log, settings-maintenance (Mock) sowie Live-Shots 02/14/17 – Layout sauber, Kennzahlen, Level-Zähler, Run-Karten, Backup-Liste, Update-Konsole lesbar.
1100x700 (Stichprobe): discover.png, inbox.png, settings-storage.png.

## Mängel (alle kosmetisch, nicht blockierend)
1. 1100x700, Einstellungen › Ablage & Tags (`settings-storage.png`): Eingabefelder "Zielordner" und "Pfadmuster" sind so schmal, dass der Inhalt abgeschnitten ist (`%USERPROFI…`, `{genre}/{artist}/{year`); das Muster ist nur durch Scrollen im Feld lesbar. Die Vorschau darunter ist vollständig.
2. 1100x700, Entdecken: Trefferzeile "15 Treffer · 4 herausgefiltert" bricht auf zwei Zeilen; Filterspalte schneidet unten ab (scrollt, erwartbar). Eingang unauffällig, kein horizontaler Überlauf in den drei Ansichten.
3. Kleinigkeit: Kennzahl "Grösse 0 MB" bei 3-s-Testdateien (Rundung, Testartefakt).

## Nur unter Windows prüfbar (kein Mangel)
- Explorer `/select` (Ordner öffnen, `library.reveal`)
- Zwischenablage ("Kopieren" im Protokoll) in WebView2
- `schtasks /Query /XML` (nächster Lauf der Aufgabe)
- Update mit gesperrten .pyd-Dateien, echtes pywebview-`evaluate_js`, echter YouTube-Smoke (nicht verlangt, `MV_SMOKE_URL` nicht gesetzt)
