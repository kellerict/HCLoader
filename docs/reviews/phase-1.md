# Review Phase 1 – Gerüst & Kern-Download

- Reviewer: `reviewer` (unabhängig, hat den Code nicht geschrieben)
- Umfang: `git diff 6e1363a..HEAD -- app tests scripts/setup.ps1 scripts/fetch_binaries.ps1 .github pyproject.toml requirements*.txt .gitignore config.example.yaml README.md` (Stand `e3711b0`; `ui/` nicht Teil dieses Reviews)
- Geprüft gegen: CLAUDE.md, SPEC §2, §4–§9, §11 Phase 1, docs/settings-schema.md, yt-dlp 2026.10.26 (`YoutubeDL.py`), bgutil-ytdlp-pot-provider 2.0.2 (`yt_dlp_plugins/extractor/`)
- Werkzeuge: `ruff check .` sauber, `ruff format --check .` sauber, `pytest`: 183 passed. Keine echten Netzwerkzugriffe.

## Ergebnis: ÄNDERUNGEN NÖTIG

1 Blocker, 5 Major, 13 Minor. Die Architektur ist solide (yt-dlp nur in `ytclient.py`, ein zentraler `build_ydl_opts`, Throttle vor jedem `extract_info`, keine yt-dlp-internen Retries, 429/Bot-Check → persistenter Backoff, Tests mocken das Netz). Der Blocker und die Major-Punkte betreffen YouTube-Schonung und Archiv-/DB-Konsistenz und sollten vor dem Merge behoben werden.

---

## Blocker

### B1 – `download()` akzeptiert Playlist-/Kanal-/Such-URLs → Massen-Download am Throttle vorbei
- **Ort:** `app/core/ytclient.py:418-419` (`url = watch_url(vid) if vid else url_or_id.strip()`), `:212` (`noplaylist`)
- **Problem:** Lässt sich keine Video-ID extrahieren, wird die rohe URL mit `download=True` an yt-dlp gegeben. `noplaylist` wirkt nur, wenn die URL Video **und** Playlist enthält (`InfoExtractor._yes_playlist`: ohne `video_id` gibt es `return not video_id` → True). Bei `https://www.youtube.com/playlist?list=…`, `/@kanal`, `/channel/…` oder `ytsearch10:…` lädt yt-dlp deshalb **alle** Einträge nacheinander herunter. Das passiert innerhalb eines einzigen `before_request` und ohne `max_downloads_per_run/day`, ohne Pause zwischen den Downloads und ohne Tagging. Danach findet `_finish` keine Audiodatei (die ID ist die der Playlist) und `_fail` räumt nur `<playlist-id>.*` auf. Die geladenen `<video-id>.mp3` bleiben ungetaggt in `.tmp` liegen. Alle Video-IDs stehen trotzdem im `archive.txt` und werden später für immer als „übersprungen“ behandelt. Erreichbar ist das heute schon über `--smoke <URL>`.
- **Vorschlag:** `download()` nur mit auflösbarer Video-ID zulassen, sonst `YtClientError("Keine Video-URL")` bzw. `DownloadResult(status='failed')` **vor** dem Throttle. Zusätzlich als Absicherung in `_download_opts`: `"max_downloads": 1` und `"playlist_items": "1"` und `info.get("_type") == "playlist"` als Fehler behandeln. Tests für Playlist-, Kanal- und `ytsearch`-URL ergänzen.

---

## Major

### M1 – Migrationen sind nicht atomar (`executescript` committet implizit)
- **Ort:** `app/core/db.py:59-60` (`conn.executescript`), `:115-123` (`BEGIN … commit/rollback`)
- **Problem:** `sqlite3.Connection.executescript()` führt bei Legacy-Transaktionssteuerung zuerst ein `COMMIT` aus. Das `BEGIN` in `migrate()` wird dadurch wirkungslos, und jedes DDL-Statement läuft im Autocommit. Nachgestellt: Schlägt eine Migration nach dem `executescript` fehl, bleiben die Tabellen bestehen und `schema_version` steht auf 0. Beim nächsten Start bricht `migrate()` mit `table videos already exists` ab, die App startet also nicht mehr. Dasselbe Muster würde jede künftige Migration treffen.
- **Vorschlag:** Statements einzeln mit `conn.execute(...)` innerhalb der Transaktion ausführen (DDL ist in SQLite transaktional) oder `BEGIN`, Script und Versions-Update als **ein** `executescript("BEGIN; …; DELETE FROM schema_version; INSERT …; COMMIT;")`. Dazu einen Test mit einer absichtlich fehlschlagenden zweiten Migration, der Rollback und Wiederanlauf prüft.

### M2 – yt-dlp schreibt das Archiv vor dem Taggen/Verschieben → Absturzfenster blockiert ein Video dauerhaft
- **Ort:** `app/core/ytclient.py:262` (`download_archive` an yt-dlp), `:485-487` (`_skip_result` vertraut dem Archiv), `:612-625` (DB `done` erst ganz am Ende)
- **Problem:** yt-dlp ruft `record_download_archive` in `process_video_result` direkt nach `process_info` auf (`YoutubeDL.py:3144`), also nach Download und FFmpeg, aber vor `_finish`. Beendet sich der Prozess in diesem Fenster hart (Fenster geschlossen, Kill, Stromausfall), steht die ID im Archiv, die DB zeigt `downloading` und die Datei liegt in `.tmp` oder ist weg. Beim nächsten Aufruf liefert `_skip_result` „Übersprungen (im Download-Archiv)“, und das Video wird nie mehr geladen. Für normale Exceptions räumt `_fail(archive=True)` korrekt auf, für Abstürze greift das nicht.
- **Vorschlag:** `download_archive` nicht mehr an yt-dlp geben. Die Zeile `youtube <id>` selbst anhängen, und zwar erst nach `set_status(vid, "done")`. Das Archiv bleibt Wahrheit für „bereits geladen“, und es gibt kein Fenster mehr. Alternativ: In `_skip_result` das Archiv ignorieren bzw. bereinigen, wenn die DB-Zeile `downloading`/`failed` ist. Zusätzlich beim Start: hängende `downloading` → `failed` (oder `queued`).

### M3 – Throttle ist nicht thread-sicher
- **Ort:** `app/core/throttle.py:176-194` (`before_request`: `_last_request` lesen → schlafen → schreiben; `search_times` read-modify-write), `:233-239` (`register_download`), `:126-142` (`trigger_backoff`)
- **Problem:** Die DB-Aufrufe sind einzeln gelockt, die zusammengesetzten Operationen aber nicht. Ab Phase 3 laufen Worker-Thread (Download) und pywebview-Thread (Suche/Liste) parallel. Zwei Threads können dann gleichzeitig dieselbe Wartezeit berechnen und praktisch gleichzeitig Requests absetzen (Verletzung von `sleep_requests`), Suchzähler oder Download-Zähler verlieren oder den Backoff doppelt eskalieren. Der Throttle ist laut CLAUDE.md die zentrale Schutzinstanz und muss das selbst garantieren.
- **Vorschlag:** Ein `threading.Lock` in `Throttle`, gehalten über `before_request` einschliesslich Sleep, damit Requests seriell und mit Abstand laufen, über `register_download`, `trigger_backoff`/`handle_error` und `start_run`. Für mehrere Prozesse (siehe m13) DB-seitig `BEGIN IMMEDIATE` um die Zähler-Updates. Dazu ein Test mit zwei Threads und Fake-Clock.

### M4 – Pause zwischen Downloads (`sleep_interval`/`max_sleep_interval`) wird im Download-Pfad nicht erzwungen
- **Ort:** `app/core/ytclient.py:195` (Docstring: „sleep_interval is deliberately not used: the throttle paces downloads“), `:405-477` (`download()` ruft nur `before_request("download")`, das nur `sleep_requests` = 3 s wartet), `app/core/throttle.py:246-251` (`sleep_between_downloads` wird nirgends aufgerufen)
- **Problem:** Laut Docstring übernimmt der Throttle das Pacing, tatsächlich muss es aber jeder Aufrufer selbst machen. Zwei direkt aufeinanderfolgende `download()`-Aufrufe liegen nur 3 s auseinander statt 30–120 s. Ein künftiger Worker oder Headless-Lauf, der den Aufruf vergisst, umgeht die Regel unbemerkt (CLAUDE.md §1: „Neue Features dürfen diese Regeln nie umgehen“).
- **Vorschlag:** Pacing zentral im Throttle: Ende des letzten Downloads in `state` persistieren (`last_download_end`). In `before_request("download")` wird die verbleibende zufällige Pause bis `uniform(sleep_interval, max_sleep_interval)` abgewartet, abbrechbar über ein Event. Alternativ `sleep_interval`/`max_sleep_interval` an yt-dlp übergeben. Das wirkt aber nur innerhalb einer YoutubeDL-Instanz und reicht deshalb hier nicht.

### M5 – Fehlgeschlagene Download-Versuche zählen nicht gegen die Limits
- **Ort:** `app/core/ytclient.py:626` (`register_download()` nur in `_finish`), `app/core/throttle.py:233-234` (Docstring „finished (or attempted)“)
- **Problem:** `max_downloads_per_run/day` zählen nur Erfolge. Eine Queue mit 30 Videos, die alle mit 403 scheitern (typisch bei fehlendem PO-Token), erzeugt 30 vollständige Player-/Download-Versuche hintereinander. Genau dieses Muster löst Sperren aus. Code und Docstring widersprechen sich.
- **Vorschlag:** Den Versuch zählen, sobald `before_request("download")` den Request freigegeben hat (unabhängig vom Ausgang, ohne Skips), oder ein separates Limit für Fehlversuche pro Lauf (z. B. Lauf nach 3 Fehlern in Folge abbrechen). Test ergänzen.

---

## Minor

| # | Ort | Problem | Vorschlag |
|---|---|---|---|
| m1 | `app/core/throttle.py:151` / `app/main.py:80-95` | `reset_backoff()` wird nirgends aufgerufen. SPEC §5 verlangt „Reset nach erfolgreichem Lauf“, das Level wächst sonst über Monate. | Im Smoke-Pfad nach `result.ok` aufrufen. Für Phase 3/4 im Worker/Run-Abschluss verankern (Hinweis in PROGRESS.md). |
| m2 | `app/core/ytclient.py:601-610` | Fehler nach `shutil.move` (z. B. `write_cue`, `cover.jpg`, OSError) führen über `_fail` zu DB `failed` und Entfernen aus dem Archiv, obwohl die MP3 schon am Ziel liegt. Der nächste Versuch lädt erneut. | Schritte nach dem Move als nicht-fatal behandeln (Warnung loggen, Status trotzdem `done`). |
| m3 | `app/core/ytclient.py:434`, `:643`, `:264-265` | `.tmp` wird vor jedem Versuch und bei jedem Fehler/Abbruch geleert, damit auch `.part`. `continuedl=True` greift nur innerhalb des einen Netzwerk-Retrys. Ein manueller „Wiederholen“ lädt einen 300-MB-Mix komplett neu. | Bei Netzwerkfehler/Abbruch `.part` behalten und erst bei Erfolg oder 403 aufräumen, so dass der manuelle Retry fortsetzt (schont YouTube). |
| m4 | `app/core/ytclient.py:647-648` | Ein Abbruch landet in der DB als `failed` + „Abgebrochen“. Hängende `downloading`-Zeilen (Absturz) werden nie zurückgesetzt. | Abbruch → `queued` (oder voriger Status). Beim Start `downloading` → `failed`. |
| m5 | `app/core/ytclient.py:160-173`, `:346`, `:472` | Backoff greift nur bei der finalen Exception. yt-dlp meldet 429 oft zuerst als Warnung (Client-Fallback) und versucht weitere Clients/Requests. | In `_YdlLogger.warning` `is_rate_limit_error` prüfen, ein Flag setzen und nach dem Aufruf `trigger_backoff`. Optional den Aufruf abbrechen (Exception aus dem Logger). |
| m6 | `app/core/paths.py:156-157` | Pfadlänge in Python-Codepoints, Windows zählt UTF-16-Einheiten. Emojis/Symbole in Mix-Titeln zählen doppelt, dadurch sind > 260 möglich. `_RESERVED` ohne `CONIN$`/`CONOUT$`. | `len(str(p).encode("utf-16-le")) // 2` verwenden, Test mit Emoji-Titel. Reservierte Namen ergänzen. |
| m7 | `app/core/binaries.py:189-208` | Der HTTP-Provider wird gestartet und sofort benutzt, ohne auf Bereitschaft zu warten. Der erste Request läuft ggf. ohne PO-Token (riskant bzgl. Bot-Check). | Nach `Popen` lokal `GET /ping` bis ca. 10 s abwarten (nur 127.0.0.1, kein YouTube). Bei Timeout Fehler melden. |
| m8 | `app/core/ytclient.py:307-311` | `TOKEN_TTL` wird global in `os.environ` gesetzt. Ob der Script-Modus (`generate_once.ts`) diese Variable auswertet, ist im Repo nicht belegt. Nicht-ganzzahlige Werte (`0.5`) parst der Server vermutlich als `parseInt` → 0. | Gegen die Provider-Doku 2.0.2 verifizieren und im Code-Kommentar belegen. TTL ggf. als ganze Stunden validieren (Schema-Abweichung mit Orchestrator klären). |
| m9 | `scripts/fetch_binaries.ps1:201` | `Move-Item` eines Ordners von `%TEMP%` (C:) in ein Repo auf einem anderen Laufwerk scheitert unter PS 5.1 (nur ZIP-Fallback ohne git). Downloads werden nicht per Prüfsumme verifiziert. | `Copy-Item -Recurse` + Aufräumen. SHA256 für ffmpeg (gyan.dev liefert `.sha256`) und deno (`.sha256sum`) prüfen. |
| m10 | `scripts/setup.ps1:35` | `py -3.12` verlangt exakt 3.12. Mit nur 3.13 installiert schlägt das fehl, danach greift der `python`-Fallback (eventuell falsches Python im PATH). | `py -3` + die vorhandene Versionsprüfung `>= (3,12)`. |
| m11 | `.gitignore` | `.tmp/`, `*.part`, `*.ytdl`, `*.webm`, `*.cue`, `config.yaml.tmp` fehlen (relevant, falls der Zielordner testweise im Repo liegt). | Ergänzen. |
| m12 | SPEC §11 / `README.md:11` | `scripts/ui_screenshots.py` (Phase-1-Lieferobjekt) fehlt. README verweist auf das nicht existierende `docs/screenshots/discover.png`. | Mit dem UI-Teil nachliefern oder den Verweis bis dahin entfernen. |
| m13 | `app/main.py:33-35` | Single-Instance ist ein Platzhalter. GUI und geplanter Headless-Lauf könnten parallel laufen: zwei Throttle-Instanzen, parallele Downloads, Zähler-Races. | Spätestens in Phase 2/4 ein prozessweites Lock (Named Mutex/Lockfile in `%APPDATA%\HCLoader`). Headless bricht ab, wenn die GUI läuft (oder delegiert). |
| m14 | `app/core/tagging.py:172` | CUE als UTF-8 ohne BOM. foobar2000 und einige Player lesen BOM-lose CUEs als ANSI, Umlaute werden zerstört. | `encoding="utf-8-sig"`. |
| m15 | `app/core/config.py:524-527` | Eine unlesbare `config.yaml` wird beim Speichern kommentarlos überschrieben. | Vorher `config.yaml.bak` anlegen. |

---

## Geprüft und in Ordnung

- **Modulgrenzen:** `yt_dlp` wird nur in `app/core/ytclient.py` importiert. `core/` hat keinen UI-Bezug (`webview` nur in `app/main.py`). `api.py` gibt es noch nicht.
- **yt-dlp-Optionen gegen `YoutubeDL.py` 2026.10.26:** `js_runtimes` im Format `{runtime: {config}}` (Z. 544, 863 ff.), `remote_components` bleibt ungesetzt, ejs kommt aus `yt-dlp[default]`. `sleep_interval_requests` wird in `extractor/common.py:872` ausgewertet. `retries`/`fragment_retries`/`extractor_retries` = 0, die YouTube-API retryt 403/429 ohnehin nicht. `ratelimit`, `paths`/`outtmpl`, `writethumbnail`, `cookiesfrombrowser` als Tupel, `ffmpeg_location` und `extract_flat="in_playlist"` + `lazy_playlist` sind korrekt.
- **bgutil 2.0.2:** `youtubepot-bgutilscript:server_home` (→ `src/generate_once.ts`, `node_modules`) und `youtubepot-bgutilhttp:base_url` stimmen mit dem Plugin überein. Deno-Pfad kommt über `js_runtimes.deno.path` (Plugin liest `traverse_obj(js_runtimes, ('deno','path'))`). Modus „off“ setzt `youtube:fetch_pot=never`. Das HTTP-Startkommando entspricht der Provider-Doku (`cd server/node_modules; deno run --allow-env --allow-net --allow-ffi=. --allow-read=. ../src/main.ts --port N`).
- **Retry-Regel SPEC §5:** Genau 1 Retry nur bei Netzwerkfehler, keiner bei 403/429/Bot-Check. Der Retry läuft erneut durch `before_request`. Die Bot-Check-Regex deckt den typografischen Apostroph ab. Backoff 6 h → ×2 → max. 48 h wird in `state` persistiert. Kein Eskalieren während eines aktiven Backoffs, manuelles Aufheben behält das Level.
- **Abbruch:** `DownloadCancelled` aus Progress- und Postprocessor-Hook. `.tmp/<id>.*` wird aufgeräumt (inkl. `.part`, `.ytdl`, Thumbnail), ein bereits geschriebener Archiv-Eintrag wird entfernt.
- **Tags:** ID3v2.4 mit TIT2/TPE1/TPE2/TALB/TRCK=1/TCON/TDRC/COMM/TXXX:YOUTUBE_ID/TXXX:SOURCE/APIC(type 3), CHAP/CTOC. Das CUE-Format `MM:SS:FF` mit 75 fps und `FILE … MP3` ist korrekt. Das quadratische Cover entsteht per ffmpeg-Crop.
- **Pfade:** Ungültige Zeichen, Steuerzeichen, Punkt/Leerzeichen am Ende und reservierte Namen werden behandelt. `..` und Laufwerksangaben im Template werden neutralisiert. `{id}` ist Pflicht und wird nie gekürzt. Titel max. 120, Gesamtpfad < 240.
- **Hygiene:** Keine Cookies/Tokens/Binaries/Benutzerpfade im Repo. `bin/`, `.venv/`, `*.db`, `config.yaml`, `archive.txt`, Logs und Medien sind ignoriert. `config.example.yaml` stimmt byte-genau mit `render_yaml(defaults())` überein.
- **PowerShell:** PS-5.1-kompatibel (kein `??`/Ternary, reines ASCII), TLS 1.2 erzwungen. Die URLs für deno (latest, `x86_64-pc-windows-msvc.zip`) und gyan.dev (release essentials) stimmen. Der Provider wird in genau der pip-Plugin-Version geklont, und der Versionsstempel macht das Skript idempotent. `deno install --allow-scripts=npm:canvas --frozen` entspricht der Provider-Doku.
- **Konfigurierbarkeit:** Alle Schlüssel aus `docs/settings-schema.md` (SPEC §4–§8) sind im pydantic-Modell mit Grenzen und deutschen Fehlermeldungen enthalten. Die Erreichbarkeit in der GUI ist Gegenstand von Phase 2 und hier nicht bewertet.
- **CI:** `windows-latest`, Python 3.12, `ruff check`, `ruff format --check` und `pytest` bei Push/PR.
