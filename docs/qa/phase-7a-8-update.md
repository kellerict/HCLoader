# QA Phase 7a (SoundCloud), Phase 8 (Mini-Player, Genre-Popover) und Selbst-Update

Ergebnis: **BESTANDEN** (Basis-Commit `5cbaf1c`; 1 mittlerer Hinweis, mehrere kleine; Windows-only-Punkte offen)

Hinweis zur Methode: Waehrend der QA haben andere Agenten weitere Commits ("wip review fixes", bis `9dac8e2`) und
unversionierte Aenderungen in den Arbeitsbaum gelegt. Alle Belege unten gelten fuer den Stand `5cbaf1c`
(Snapshot per `git archive` nach `/tmp/claude-0/qa7/base`, dort alle Skripte nochmals vollstaendig gelaufen).
Der laufende Arbeitsbaum (`9dac8e2` + Aenderungen) ist ein Zwischenstand und war zum Pruefzeitpunkt rot, siehe Mangel 1.

## 1. Lint und Tests (Stand 5cbaf1c)
| Pruefung | Beleg |
|---|---|
| `ruff check .` | All checks passed |
| `ruff format --check .` | 125 files already formatted |
| `pytest -q` | 799 Tests gesammelt, alle gruen (kein F/E im Lauf, `/tmp/claude-0/qa7/b_pytest.log`) |
| Arbeitsbaum `9dac8e2` (WIP, nicht Pruefgegenstand) | `ruff check`: 3x E501 in `tests/test_soundcloud.py` (Zeilen 795, 830, 831); `ruff format --check`: 2 Dateien (u.a. `app/core/watchlist.py`); `pytest`: 1 rot, `tests/test_api.py::test_db_backed_reads_and_simple_actions` (Antwortschluessel `geo_blocked` neu, Test erwartet ihn nicht; Migration 6) |

## 2. SoundCloud live (`/tmp/claude-0/qa7/live7.py`, echte `Api` + Fake-pywebview in Chromium, `yt_dlp.YoutubeDL` gefaelscht, 40/40 Checks)
| Pruefung | Beleg |
|---|---|
| Plattform-Umschalter, SC-Suche | Klick `#plat [data-p=soundcloud]`; yt-dlp-Aufruf `scsearch30:hardstyle`; Badge `SC` auf allen Karten; Zaehler "SoundCloud-Suchen diese Stunde 1 / 20" (`shots/01-sc-search.png`) |
| Go+-Vorschau nicht ladbar | Karte (nach "Geladene ausblenden" aus) `is-preview`, Hinweis "Nur Vorschau (Go+) - nicht ladbar", Laden-Knopf disabled. Direkt `enqueue(["sc:333333333"])`: Download bricht vor der Uebertragung ab, Status `failed`, "Nur Vorschau (Go+) - vollstaendiger Track nur mit SoundCloud Go+", keine Datei |
| Duplikat-Hinweis | Nach Download von `ytTheraMix1` zeigt der SC-Treffer "Vermutlich bereits geladen (YouTube)", Tooltip "Sehr aehnlicher Titel und gleiche Dauer wie ... Laden ist trotzdem moeglich." |
| 2 SC-Tracks laden | Dateien `Hardstyle/DJ Thera/2026/2026-09-21 - DJ Thera Hardstyle Mix 2026 [sc-111111111].m4a` und `Uptempo/Partyraiser/2026/... Liveset #2 Maess [sc-222222222].mp3` (+ `.cue`); Archiv `soundcloud 111111111` / `soundcloud 222222222` |
| Original behalten | `keep_original_soundcloud`: AAC bleibt `.m4a`, MP3 bleibt `.mp3`, keine Umwandlung (kein postprocessor) |
| Tags | MP3: `TXXX:SOURCE=['SoundCloud']`, `TXXX:SOUNDCLOUD_ID`, 3 CHAP, 1 APIC; M4A: Freeform `SOURCE=SoundCloud` |
| SC-429, nur SoundCloud | Queue `[sc:555 (429), ytOther, ytThird, sc:666]`: sc:555 `failed`, beide YT-Mixe `done`, sc:666 bleibt `queued`. Waehrend YouTube noch laedt: `get_queue().platform_blocked = {soundcloud:{code:"backoff", reason:"SoundCloud: Backoff aktiv bis ..."}}`, `blocked_code` null. Danach `blocked_code=backoff`. `get_status().platforms.soundcloud.backoff.active=true`, YouTube und `status.backoff` false. Statusleiste "SC Backoff bis 15:18", "Backoff keiner" (`shots/03-downloads-sc-backoff.png`) |
| 1100x700 | `shots/03b-downloads-sc-backoff-1100.png`: Banner "SoundCloud: Backoff aktiv bis ... YouTube laedt weiter", Zeile "WARTET - BACKOFF", Toast, kein horizontaler Ueberlauf (scrollWidth - clientWidth = 0) |

## 3. Watchlist-Namensvorschlag
| Pruefung | Beleg |
|---|---|
| URL tippen -> Vorschlag | `soundcloud.com/dj-thera` -> Name "Dj Thera", Typ Kanal, "erkannt: SoundCloud . Kanal", Feld kursiv (`font-style: italic`, Klasse `suggested`), Marke "VORSCHLAG" (`shots/04-wl-suggest.png`); unveraendert gespeichert -> `name_auto=true`, `platform=soundcloud` |
| Aendern -> `name_auto` false | YT-URL `@RealChan` -> Vorschlag "RealChan"; Name auf "Mein eigener Name" -> Marke und Kursiv weg, gespeichert mit `name_auto=false` |
| Pruefung ersetzt automatischen Namen | Fake-Listing "Dj Thera Real (Tracks)" -> Name "Dj Thera Real" (`name_auto` bleibt true); manueller Name bleibt "Mein eigener Name" |

## 4. Mini-Player
| Pruefung | Beleg |
|---|---|
| `get_media` | `src` `file:///.../Uptempo/Partyraiser/2026/2026-09-21%20-%20Uptempo%20Terror%20Liveset%20%232%20M%C3%A4ss%20%5Bsc-222222222%5D.mp3` (Leerzeichen, `#`, Umlaut, `[id]` kodiert; Rueckwandlung ergibt dieselbe Datei), `cover` Cache-JPG existiert, `chapters` 0/30/75 s mit Interpret ("Anthem" von "DJ B"). Fremde ID: `{ok:false, "Eintrag ist nicht in der Bibliothek"}` |
| Leiste erscheint | Klick auf Play in der Bibliothek: `#player` sichtbar, Titel, `audio.readyState=4`, `duration=120`, `currentTime` laeuft (Chromium spielte ohne Fehler auf Null-Senke) |
| Kapitel | 3 Marker auf der Zeitleiste, Trackliste mit 3 Eintraegen (`shots/06-player-chapters-open.png`), Klick auf Track 3 -> `currentTime` 75.6, Zeile hervorgehoben; Klick auf Marker 2 -> 30.4 s |
| Ansichtswechsel | Einstellungen -> Entdecken: Leiste bleibt, Zeit 31.3 -> 32.8 s, `playing=true` |
| `player.mode=external` | Ueber die UI gespeichert (Einstellungen > Allgemein); Play ruft `play_external` (gemockt: `xdg-open <Datei>`), Leiste bleibt zu; Menue bietet "Im App-Player abspielen", das die Leiste oeffnet |

## 5. Genre-Popover
Klick auf Genre-Badge (`[data-act=genre]`) -> Menue "Genre setzen" (Uptempo, Hardcore, Hardstyle "aktuell", Unsortiert; `shots/08-genre-popover.png`); "Hardcore" gewaehlt: `set_genre` + `retag`, DB-Genre Hardcore, Datei von `Hardstyle/DJ Thera/...` nach `Hardcore/DJ Thera/...` verschoben (alter Pfad weg), M4A-Tag `(c)gen=Hardcore`, Toast "Genre: Hardcore - verschoben nach .../Hardcore/DJ Thera/2026/". Fehlerfall (Zielpfad existiert bereits): Toast "Genre konnte nicht gesetzt werden: Zieldatei existiert bereits: ...", DB-Genre und Badge zurueck auf Uptempo, Datei unveraendert (`shots/10-genre-fail.png`).

## 6. Selbst-Update (`/tmp/claude-0/qa7/upd7.py`, `mig7.py`; Fake-HTTP ueber `SelfUpdater(opener=...)`, `platform="win32"`, `popen`-Mock; 26/26 Checks)
| Pruefung | Beleg |
|---|---|
| Start-Pruefung | Genau 1 Request `https://api.github.com/repos/x/HCLoader/releases/latest`; Banner "Version 0.9.0 verfuegbar - Installiert: 0.1.0 - Herunterladen / Aenderungen / Spaeter" (`shots/u1-banner.png`); Notizen-Dialog zeigt Release-Text als escapten Text |
| Download mit Fortschritt | Erst nach Klick; 59 `update_progress`-Events (Phasen download, verify, prepare), 255 Banner-Zwischenstaende bis "99 % . 85.9 / 86.5 MB"; Status `ready` (`shots/u3-ready.png`) |
| Staging | Nur `app ui scripts CHANGELOG.md LICENSE README.md config.example.yaml pyproject.toml requirements.txt` und die 4 Portable-Starter. Nicht enthalten: `tests/`, `docs/`, `.github/`, `.claude/`, im ZIP eingeschmuggelte `data/evil.txt` und `portable.txt`. `manifest.items` und `protected` disjunkt |
| `data/`/Musik unberuehrt | Hash-Vergleich Sentinel-Dateien (`config.yaml`, `archive.txt`, `notes.txt`), Musikordner und installierter Programmordner vor/nach Download: identisch |
| Pruefsumme | `SHA256SUMS` stimmt -> ok; falsche Summe -> Fehler "Pruefsumme stimmt nicht ...", kein Staging |
| `apply_update_now` | Dialog bestaetigt -> `window.destroy()`; danach `shutdown()` sauber, `finish_update()` startet (Mock) `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File <update>/apply_update.ps1 -Manifest <update>/manifest.json -WaitPid 4242 -Restart`, `creationflags` `0x09000200` (NO_WINDOW\|NEW_PROCESS_GROUP\|BREAKAWAY), `cwd` = Update-Ordner, `update.lock` mit PID, Skript-Kopie byte-gleich; Zustand `applying`, Programmdateien noch alt (tauscht der Updater) |
| Beenden-Variante | `apply_update_on_exit=an`: Updater ohne `-Restart`; `aus`: nichts gestartet, nach Neustart wieder `ready` (restore); `cancel_update` verwirft Staging |
| Sperren | `update.lock` -> `main(["--headless","--run-watchlist"])` endet mit 4 und der Meldung; Lock > 30 min gilt als verwaist. Git-Checkout und Nicht-Windows: Download abgelehnt mit deutschem Hinweis |
| Offline | Start-Pruefung still (kein Toast, `error` leer, Zustand `idle`, Events checking -> idle); manuelle Pruefung meldet "Update-Pruefung fehlgeschlagen: keine Verbindung ..." |
| Pre-Migrations-Backup | Echte DB mit Schema v3 + 2 Videos, `python -m app.main` als Prozess: `backups/hcloader-premigrate-v3-to-v5-<ts>.db` (v3, beide Zeilen), DB danach v5, Daten erhalten (`platform=youtube` ergaenzt); zweiter Start: kein weiteres Backup. Backup nicht schreibbar -> Start abgebrochen "Sicherung ... fehlgeschlagen ... Die Migration wurde nicht gestartet, die Daten sind unveraendert", DB-Version unveraendert |
| Neuere DB | Schema v99: GUI-Start und `--headless --run-watchlist` enden mit Exit 1 und "Die Datenbank stammt von einer neueren HCLoader-Version (Schema v99); diese Version kennt nur v5 ... Sicherung hcloader-premigrate-... zurueckkopieren", kein Traceback, DB unveraendert |

(Mein Skript `mig7.py` meldet auf dem Basisstand "CHECK migrate+backup: FAIL", weil es den Namen `v3-to-v6` des spaeteren Stands fest erwartet; der Basisstand hat Schema v5, das Verhalten ist korrekt. Auf dem Arbeitsbaum mit Migration 6: PASS.)

## 7. Screenshots (`scripts/ui_screenshots.py --out /tmp/claude-0/qa7-shots`, Exit 0, 86 Bilder; `--viewport 1100x700 --out /tmp/claude-0/qa7-shots-1100`, Exit 0, 93 Bilder)
Angesehen: discover-soundcloud (SC-Badges, "2 nur Vorschau (Go+)", Duplikat-Hinweise), watchlist-suggest (kursiver Name, Marke VORSCHLAG, Hinweistext), library-player und player-chapters-open (Leiste mit Kapitelmarkern, Trackliste mit aktivem Track), library-genre-popover, settings-soundcloud, settings-maintenance-updated (App-Update-Abschnitt, "Jetzt pruefen"), settings-maintenance-updated-3, downloads-soundcloud-backoff bei 1100x700 (Banner, WARTET-BACKOFF, Statusleiste "SC Backoff bis 14:28"). Plus eigene Live-Bilder in `/tmp/claude-0/qa7/shots/`. Keine JS-Fehler (Skript bricht sonst ab; eigene Laeufe: 0 PAGEERROR, nur erwartete `ERR_NAME_NOT_RESOLVED` fuer sperrte Thumbnails).

## 8. Statische Pruefung
- `scripts/apply_update.ps1` (266 Zeilen): reines ASCII, keine `&&`/`||`, keine PS-7-Syntax, Klammern ausgeglichen. Parameter `-Manifest -WaitPid [-WaitSeconds] [-Restart]` entsprechen dem Python-Aufruf; Manifest-Schluessel (`app_root staging items protected python pythonw site_packages pip_args bin_dir materialize_links log result lock`) decken sich mit `prepare_staging`; Rollback-Ablauf (`_previous`, site-packages, Provider) nachvollziehbar; Updater laeuft aus der Kopie in `<data>\update\`, nicht aus dem getauschten `scripts\`. Nicht ausgefuehrt (kein PowerShell hier).
- `.github/workflows/portable.yml`, Job `release`: nur bei Tag `v*`, `needs: portable`, `contents: write` nur dort, Tag-gegen-`__version__`-Pruefung, `git archive` mit Praefix `HCLoader-<v>/` und Dateiname `HCLoader-<v>-source.zip` (= `SOURCE_ASSET`), `SHA256SUMS` im Format `<hash>  <name>` (von `parse_sums` lesbar), `gh release create` nur wenn nicht vorhanden, `--clobber`. Plausibel. Der Changelog-Regex passt auf `## [X.Y.Z] - Datum`; `CHANGELOG.md` hat derzeit nur `## [Unreleased]`, Release-Notizen waeren leer, bis Schritt 2 aus `docs/RELEASING.md` gemacht ist.

## Maengel
1. **Arbeitsbaum nicht stabil** (nur Information): `9dac8e2` + unversionierte Aenderungen sind rot (3x E501, Formatierung, 1 Test, siehe Abschnitt 1). Vor dem Merge neu pruefen.
2. **Mittel: Quell-ZIP ~ 87-90 MB.** `git archive HEAD` ist 90 684 971 Byte, weil `docs/screenshots/` (86 PNG, 126 MB) im Repo liegt. Jedes Selbst-Update laedt das (auch ueber `codeload`), `docs/RELEASING.md` und `docs/decisions.md` sprechen von "wenige MB". Grenzen im Code: `MAX_ZIP_BYTES` 200 MB, `MAX_UNPACKED_BYTES` 400 MB; mit weiteren Screenshot-Runden wird das knapp. Empfehlung: `.gitattributes` mit `docs/screenshots export-ignore` (gilt fuer `git archive` und GitHub-Archive), ggf. auch `tests/`, `docs/`, `.claude/`.
3. Klein: `enqueue` nimmt bekannte Go+-Vorschau-IDs an (`{ok:true, ids:[sc:...]}`); der Download scheitert erst danach (1 Metadaten-Request). Die UI verhindert das; nur Backend-Direktaufruf betroffen.
4. Klein: Update-Banner (oben rechts, fix) verdeckt in "Entdecken" Suchen-Knopf und Sortierung, bis er mit x/"Spaeter" geschlossen wird (`shots/u3-ready.png`).
5. Kosmetik: Bibliothek zeigt "Groesse -" bei Dateien < 0.05 MB (Testartefakt der Fake-Dateien).
6. Kosmetik: Die Meldung "Datenbank stammt von einer neueren Version" erscheint auf stderr doppelt (Print + Log-Handler).

## Nur unter Windows prueflbar / nicht pruefbar (kein Mangel)
- Ausfuehrung von `apply_update.ps1` (PowerShell 5.1, `\\?\`-Pfade, robocopy, Rollback, gesperrte `.pyd`), Neustart ueber `pythonw`, `CREATE_BREAKAWAY_FROM_JOB`/Job-Objekt, Wartezeit auf das Prozessende, pip/`fetch_binaries.ps1`/`materialize_links.py` im Updater
- `os.startfile` (externer Player), echter WebView2-`file:`-URL-Umgang mit `#`/`%`/`[]` (`System.Uri`), Audio-Codecs/-Ausgabe in WebView2 (hier nur Chromium mit Null-Senke)
- MessageBox bei Datenbankfehlern (`show_fatal` unter `pythonw`)
- Echte SoundCloud-Antworten (client_id, Datadome-403, Go+-`policy`), echte GitHub-API/Release-Assets/`SHA256SUMS`, GitHub-Actions-Lauf (`portable.yml` Job `release`)
- Smoke-Test mit echtem YouTube/SoundCloud: nicht verlangt, `MV_SMOKE_URL` nicht gesetzt, nicht ausgefuehrt
