# QA Phase 4 – Watchlist & Zeitplan

Ergebnis: **BESTANDEN** (Windows-only-Punkte offen; Smoke-Test von Phase 4 nicht verlangt, YouTube extern blockiert)

Umgebung: Linux, `.venv/bin/python`, kein YouTube. Alle Fake-Läufe: nur `yt_dlp.YoutubeDL` ersetzt, echte `YtClient`, `Throttle`, `DownloadQueue`, DB, Tagging, ffmpeg.

## Befunde pro Kriterium
| Prüfung | Beleg |
|---|---|
| `ruff check .` / `ruff format --check .` | All checks passed / 74 files already formatted |
| `pytest -q` | 523 passed (19 s); `tests/test_headless_integration.py` + `tests/test_watchlist.py` + `tests/test_headless.py`: 44 passed |
| Echter Headless-Prozess (`/tmp/claude-0/qa4/hl.py`, `HCLOADER_HOME=/tmp/claude-0/qa4/home`) | Kanal-Quelle auto_download, max_entries 30, `max_downloads_per_run=2`, Pausen 1 s; DB vorab: knownAAAAA1/2 `done` |
| Lauf 1 | Exit 0. `runs`: `(1,'headless',found=3,downloaded=2,errors=0,'Limit pro Lauf erreicht (2/2) – Rest bleibt in der Warteschlange; …')`. Videos: newAAAAAAA1/2 `done`, newAAAAAAA3 `queued`. 2 MP3 auf Platte: `Hardcore/DJ Test/2026/2026-10-03 - Hardcore Mix One [newAAAAAAA1].mp3` (+ Two). Requests: 1 Listing (`@DJTest/videos`, playlistend 30) + 2 Downloads |
| Inkrementell | `behindAAAA1` (unbekannt, hinter erstem bekannten) NICHT in der DB (Videos-Liste enthält es nicht) |
| Lauf 2 | Exit 0, `runs`: `(2,'headless',found=0,downloaded=1,errors=0,NULL)` -> 0 neue, wartendes newAAAAAAA3 geladen, behindAAAA1 weiterhin unbekannt |
| 429-Simulation (`FAKE_ERR="HTTP Error 429: Too Many Requests"`) | Exit 2; `runs`: `(3,'headless',0,0,1,'Backoff bis 20:52')`; `state`: `backoff_until=2026-11-16T20:52:01+00:00`, `backoff_level=1`, `backoff_reason='HTTP Error 429…'` |
| Backoff greift danach | Lauf 4: Exit 2, `runs`: `(4,'headless',0,0,0,'Backoff aktiv bis 20:52 – nichts geprüft')`; `requests.log` blieb bei 6 Zeilen -> kein Request |
| Parallel-Schutz (`home2`, erster Lauf `FAKE_SLOW=4`) | Zweiter Lauf: "Ein anderer Download-Lauf ist aktiv (GUI oder Headless)." Exit 4; erster Lauf Exit 0 mit sauberem `runs`-Eintrag (3 neu, 2 geladen) |
| Live-UI (`/tmp/claude-0/qa4/live.py`, echte `Api` hinter Fake-`pywebview`, Events via `evaluate_js`->`page.evaluate`, 29 Events) | 0 FAIL, 18 PASS. Screenshots `/tmp/claude-0/qa4/ui-01…ui-11*.png` |
| – Quelle anlegen, Feldfehler | Leere URL -> "URL fehlt." am Feld (rot markiert), Dialog bleibt offen (`ui-02-field-error.png`) |
| – Checkbox "Neueste stehen hinten" | Nur bei Typ Playlist sichtbar (Kanal/Suche: versteckt); gespeichert `newest_last=True` (API), Zeile mit Tag "RÜCKWÄRTS", Bearbeiten-Dialog zeigt Haken (`ui-11-edit-playlist.png`); Kanal speichert `False` |
| – "Prüfen" -> Live-Zustand | Zeile Klasse `checking`, "prüft …", Knopf disabled, Toast "«DJ Live» wird geprüft …" (`ui-05-checking.png`) |
| – Eingang + Badge | Nach Prüfung Nav-Badge 4, Zeilen-Badge 4, 4 Karten, Toast "Watchlist geprüft: 4 neue Treffer" |
| – Auswahl laden -> Downloads | 2 gewählt ("Auswahl laden (2)"), exakt diese 2 geladen, 2 MP3 (`Hardcore/DJ Live/…`, `Uptempo/DJ Live/…`), Eingang 2, Badge 2 |
| – Quelle löschen | Bestätigungsdialog -> Quelle weg |
| `newest_last` (`/tmp/claude-0/qa4/nl.py`, Playlist 50 Einträge, neue hinten, yt-dlps echte `PlaylistEntries`-Slice-Logik) | Optionen `playlist_items='-1:-5:-1'`, kein `playlistend`; `list_source` -> IDs 50,49,48,47,46 (genau N, neueste zuerst); `check_all` findet 48, 49, 50 (47 bekannt -> Abbruch) im Eingang. Ohne Option wären 1..5 gelesen worden (verpasst Neue) |
| `scripts/ui_screenshots.py --out /tmp/claude-0/qa4-shots` | Exit 0, 50 Screenshots; angesehen: `watchlist-dialog-playlist.png` (Checkbox + Hinweis), `settings-schedule-task.png` (Intervall, Aufgabenplanung, Toast "Aufgabe … angelegt"); außerdem vorhanden: watchlist-backoff/-checking/-done/-edit-errors, inbox*, settings-schedule* |

## Mängel
Keine blockierenden. Hinweise:
- Die Run-Notiz bei erreichtem Lauf-Limit enthält im Headless-Modus «Fortsetzen» startet einen neuen Lauf (GUI-Formulierung; im Headless-Lauf irreführend, kosmetisch).
- Ein Screenshot (`ui-03`) während der Eingabe zeigte den frisch angehakten Haken noch ungefüllt (Animationszeitpunkt); Wert war korrekt gespeichert und im Bearbeiten-Dialog gesetzt.
- Im Container fehlt Deno (Statusleiste "fehlt"), umgebungsbedingt.

## Nur unter Windows prüfbar (kein Mangel)
- `schtasks /Create /XML` (UTF-16-XML, täglich, `pythonw.exe scripts/run_watchlist.pyw`), `/Query`-Status (lokalisierte Spalten), `/Delete` – echtes Anlegen/Entfernen der Aufgabe
- Globaler Mutex (`Global\…`) über Sitzungen hinweg; Lock-Verhalten GUI vs. Aufgabe
- Aufgabe in Sitzung 0 / ohne angemeldeten Benutzer ("auch ohne Anmeldung"), pythonw ohne stderr
- Echter YouTube-Lauf, echte 429-/Bot-Reaktion, `newest_last` gegen echte Playlist (Paging ~100 Einträge/Request)
- Echtes `evaluate_js`-Verhalten in pywebview/WebView2
