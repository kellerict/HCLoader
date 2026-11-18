# Settings-Schema (Vertrag Backend ↔ UI)

Verbindliche Struktur von `config.yaml` / `app/core/config.py` (pydantic v2) und der Einstellungs-Tabs in der GUI.
Schlüssel = Englisch, snake_case. UI-Labels kommen aus `ui/js/locales/<code>.js` (Engine `ui/js/i18n.js`,
Leitfaden `docs/TRANSLATING.md`); Validierungsmeldungen aus `app/locales/<code>.json` in der aktiven Sprache. Änderungen an diesem Schema nur durch den Orchestrator.

| Abschnitt (Tab) | Schlüssel | Typ | Default | Grenzen / Werte |
|---|---|---|---|---|
| `general` (Allgemein) | `language` | str | `en` | auto, en, de, zh-CN, hi, es, fr, bn, pt, ru, id, nl, nl-BE, sv, nb, fi, lt, lv, et, de-x-frk (v0.2.0). `auto` = Windows-Anzeigesprache, nicht unterstützt → `en`; `auto` wählt nie `de-x-frk` (Fränggisch, Spass-Dialekt; fehlende Texte → `de` → `en`). `nl-BE` (Vlaams) enthält nur abweichende Texte (Rest → `nl` → `en`); `auto` wählt es bei belgisch-niederländischer Systemsprache, übrige `nl-*` → `nl`. Fehlt der Schlüssel (Konfiguration vor v0.2.0) → `en` |
| | `start_view` | str | `discover` | discover, inbox, watchlist, downloads, library, log |
| | `log_level` | str | `INFO` | DEBUG, INFO, WARNING, ERROR |
| | `confirm_delete` | bool | true | |
| `search` (Filter & Keywords) | `results_count` | int | 30 | 1–100 |
| | `append_year` | bool | true | Bei Jahr-Filter Jahreszahl an Suchbegriff anhängen |
| `filters` (Filter & Keywords) | `min_duration` | int (s) | 600 | ≥ 0 |
| | `max_duration` | int (s) | 0 | ≥ 0, 0 = unbegrenzt, sonst ≥ min_duration |
| | `upload_period` | str | `all` | all, 7d, 30d, 1y, year, custom |
| | `upload_year` | int | 0 | 0 = nicht gesetzt, sonst 2005–aktuelles Jahr; Pflicht bei `year` |
| | `upload_from` | str | `""` | `YYYY-MM-DD` oder leer (für `custom`) |
| | `upload_to` | str | `""` | `YYYY-MM-DD` oder leer, ≥ upload_from |
| | `include_keywords` | list[str] | SPEC §4 | |
| | `exclude_keywords` | list[str] | SPEC §4 | |
| | `match_description` | bool | false | |
| | `hide_done_ignored` | bool | true | |
| | `apply_channel_blacklist` | bool | true | |
| | `hide_cross_platform_duplicates` | bool | false | Phase 7a: Treffer ausblenden, die vermutlich schon von der anderen Plattform geladen/eingereiht sind (Dauer ±5 s, Titel-Jaccard ≥ 0.8) |
| `genres` (Genres) | `items` | list[{`name`, `color` (#rrggbb), `keywords` list[str], `priority` int}] | SPEC §8 | Namen eindeutig, "Unsortiert" immer vorhanden |
| `download` (Download & Qualität) | `audio_format` | str | `mp3` | mp3, original |
| | `mp3_quality` | str | `320` | 320, v0 |
| | `embed_cover` | bool | true | |
| | `write_cover_jpg` | bool | false | |
| | `write_cue` | bool | true | |
| | `write_id3_chapters` | bool | true | |
| | `keep_original_soundcloud` | bool | true | Phase 7a: SoundCloud-Audio unverändert behalten (AAC 160 → `.m4a`, MP3 128 → `.mp3`); `false` = wie `audio_format` |
| `storage` (Ablage & Tags) | `target_dir` | str | `%USERPROFILE%\Music\HCLoader` | relativ (z.B. `.\Music`) = relativ zum App-Ordner, nur Portable-Version (Phase 6) |
| | `path_template` | str | `{genre}/{artist}/{year}/{date} - {title} [{id}]` | Platzhalter: genre, artist, channel, year, date, title, id, platform («YouTube»/«SoundCloud», Phase 7a), festival, event_year, stage (v0.3.0; leer → Reste wie « - »/«()» entfernt, leere Ordnerebene entfällt). `{id}` bei SoundCloud = `sc-<id>`. Standard bleibt unverändert |
| | `max_title_length` | int | 120 | 20–200 |
| | `max_path_length` | int | 240 | 100–259 |
| | `artist_from_title` | bool | false | |
| | `album_from_edition` | bool | true | v0.3.0: Album-Tag = Ausgabe («Defqon.1 2024»), wenn ein Festival/eine Serie zugeordnet ist; aus = Album wie bisher = Titel |
| | `title_cleanup_patterns` | list[str] (Regex) | `\(Official[^)]*\)`, `\[HQ\]`, `\[HD\]`, `\(HQ\)`, `\(HD\)`, `\[Official[^\]]*\]` | gültige Regex |
| `throttle` (Schonung) | `sleep_requests` | float (s) | 3 | 0–60 |
| | `sleep_interval` | int (s) | 30 | 0–3600 |
| | `max_sleep_interval` | int (s) | 120 | ≥ sleep_interval |
| | `limit_rate_mb` | float (MB/s) | 3.0 | 0 = unbegrenzt |
| | `max_downloads_per_run` | int | 10 | 1–100 |
| | `max_downloads_per_day` | int | 25 | 1–500 |
| | `max_searches_per_hour` | int | 20 | 1–200 |
| | `backoff_initial_hours` | float | 6 | 0.5–168 |
| | `backoff_max_hours` | float | 48 | ≥ initial |
| `network` (Netzwerk & PO-Token) | `po_token_mode` | str | `script` | off, script, http |
| | `po_token_port` | int | 4416 | 1024–65535 |
| | `po_token_ttl_hours` | float | 6 | 0.5–48 |
| | `cookies_from_browser` | str | `""` | "", edge, chrome, firefox, brave (Notlösung, Warnung) |
| | `proxy` | str | `""` | |
| `soundcloud` (SoundCloud, Phase 7a) | `enabled` | bool | true | aus = keine SoundCloud-Suche, -Quelle, -Download |
| | `sleep_requests` | float (s) | 3 | 0–60 |
| | `sleep_interval` | int (s) | 30 | 0–3600 |
| | `max_sleep_interval` | int (s) | 120 | ≥ sleep_interval |
| | `limit_rate_mb` | float (MB/s) | 3.0 | 0 = unbegrenzt |
| | `max_downloads_per_run` | int | 10 | 1–100 |
| | `max_downloads_per_day` | int | 25 | 1–500 |
| | `max_searches_per_hour` | int | 20 | 1–200 |
| | `backoff_initial_hours` | float | 6 | 0.5–168 |
| | `backoff_max_hours` | float | 48 | ≥ initial |
| `schedule` (Zeitplan) | `watchlist_interval_hours` | float | 24 | 1–168 |
| | `in_app_check` | bool | true | |
| | `task_scheduler_enabled` | bool | false | |
| | `task_time` | str | `03:00` | HH:MM |
| | `entries_per_source` | int | 30 | 1–200 |
| `watchlist` (Tab «Zeitplan», Abschnitt «Alles einlesen (einmalig)», v0.4.0) | `backfill_max_entries` | int | 2000 | 100–10000: so viele Einträge liest «Alles einlesen» höchstens pro Quelle (in Listen-Reihenfolge) |
| | `backfill_requests_per_hour` | int | 120 | 10–600: Seiten-Anfragen von «Alles einlesen» pro Stunde, gleichmässig verteilt (120 = alle 30 s; zusätzlich gilt `sleep_requests`); Headless-Lauf: Budget pro Lauf |
| `appearance` (Darstellung) | `reduce_effects` | bool | false | |
| | `scanlines` | bool | true | |
| | `pulse_bpm` | int | 200 | 60–300 |
| `player` (Tab «Wiedergabe», bis v0.6.0 «Allgemein»; Phase 8) | `mode` | str | `internal` | internal (eingebauter Player), external (Standardplayer des Systems) |
| | `normalize` | bool | true | v0.7.0: Lautheit im eingebauten Player angleichen (ReplayGain aus Analyse/Tags, begrenzt durch den True Peak) |
| | `target_lufs` | float (LUFS) | -18 | -30 – -6 (v0.7.0; -18 = ReplayGain-2.0-Referenz) |
| | `resume` | str | `ask` | ask (fragen), auto (still fortsetzen), off (nichts merken, keine «Weiterhören»-Leiste) – v0.7.0; erste/letzte 30 s werden nie gemerkt |
| | `waveform` | bool | true | v0.7.0: Wellenform als Zeitleiste (sonst einfacher Balken) |
| `loudness` (Tab «Wiedergabe», Abschnitt «Analyse», v0.7.0) | `analyse_after_download` | bool | true | Lautheit + Wellenform direkt nach jedem Download offline berechnen (ffmpeg, niedrige Priorität, eine Datei nach der anderen) |
| | `write_tags` | bool | true | ReplayGain-Tags in die Datei schreiben (MP3 TXXX, M4A Freeform-Atome, Opus R128_TRACK_GAIN); nie neu kodieren |
| | `waveforms` | bool | true | Wellenformen in Analyse/Durchlauf vorberechnen; aus = erst beim ersten Abspielen |
| `festivals` (Festivals & Serien, v0.3.0) | `detect` | bool | true | Festival/Serie, Jahr, Bühne, Set-Art automatisch erkennen (offline, nur gespeicherte Titel/Kanal/Beschreibung) |
| | `min_confidence` | float | 0.65 | 0.3–1.0; ab diesem Wert zuordnen, darunter nur Vorschlag |
| | `year_from_upload_date` | bool | true | ohne Jahreszahl im Titel das Upload-Jahr nehmen |
| | `match_description` | bool | true | Festivalnamen auch in der Beschreibung suchen (Suchtreffer: nur falls geliefert; Bibliothek: Sidecar) |
| | `extra_stages` | list[str] | `[]` | zusätzliche Bühnennamen, je max. 40 Zeichen (eingebaut: RED, BLUE, BLACK, UV, YELLOW, INDIGO, MAGENTA, GOLD, SILVER, PURPLE, GREEN, ORANGE, WHITE, PINK, Mainstage) |
| | `extra_set_types` | list[{`keyword` str 1–60, `set_type` Code}] | `[]` | eigene Begriffe für Set-Arten, vor den eingebauten geprüft; Codes: live_set, closing_ceremony, opening, endshow, full_show, warm_up, anthem, episode. Fehler: `festivals.extra_set_types.<i>.set_type` |
| | `collector_searches_per_hour` | int | 10 | 1–200 (v0.5.0 Festival-Sammler): Suchen pro Stunde für fehlende Sets, gleichmässig verteilt (10 = alle 6 Min.); nie mehr als `throttle.max_searches_per_hour` |
| | `collector_results_per_search` | int | 10 | 1–20: Treffer pro Suche (eine Anfrage pro Suche, YouTube liefert etwa 20 pro Seite) |
| | `collector_auto_confirm` | float | 0.85 | 0.5–1.0: ab dieser Sicherheit gilt ein Treffer ohne Bestätigung – nur mit DJ, Festival und Jahr im Titel |
| `maintenance` (Wartung) | `check_updates_on_start` | bool | true | max. 1×/Tag |
| | `check_app_updates_on_start` | bool | true | HCLoader-Update (GitHub-Release) einmal pro Start prüfen |
| | `apply_update_on_exit` | bool | true | bereitgelegtes App-Update beim Beenden einspielen |
| | `update_repo` | str | `kellerict/HCLoader` | `besitzer/repo` (auch `https://github.com/…` wird angenommen) |

Installer-Vorgaben: Die Datenschutzseite des Installers schreibt `installer-defaults.json` in den Programmordner (`maintenance.check_app_updates_on_start`, `maintenance.check_updates_on_start`). Diese Werte gelten nur, solange keine `config.yaml` existiert (erster Start), und landen mit dem ersten Speichern darin. Vorrang: vorhandene `config.yaml` > `installer-defaults.json` > Standardwerte.

Bridge (`ui/js/bridge.js`): `get_settings()` → `{values, defaults}`; `save_settings(values)` → `{ok: true}` oder `{ok: false, errors: {"section.key": "Meldung"}}`; `reset_settings(section?)`.

## Phase 3 – Jahr-/Zeitraum-Filter (Entscheid)
- Flache Suche liefert Datum nur ungefähr (`youtubetab:approximate_date`, aus "vor X Jahren").
- `year`: Video besteht, wenn die Jahreszahl als eigenes Wort im Titel steht ODER das (ungefähre) Upload-Jahr == Jahr ist (bei ungefährem Datum ±1 Jahr toleriert). Unbekanntes Datum und kein Jahr im Titel → verwerfen.
- `custom`: Upload-Datum innerhalb [from, to]; bei ungefährem Datum ±1 Jahr Toleranz an den Rändern; unbekannt → verwerfen.
- Suche: `search(query, {genre?, year?})` – Backend hängt Genre-Suchbegriffe (SPEC §3.1) und bei `append_year` die Jahreszahl an.

## Phase 7a – SoundCloud (Entscheid)
- Eigener Abschnitt `soundcloud` statt `throttle.platforms.soundcloud`: ein eigener Tab «SoundCloud» mit
  Ein/Aus-Schalter und denselben Schonungs-Feldern wie `throttle` (gleiche Grenzen und deutsche Meldungen,
  das Modell erbt von `ThrottleSettings`). `throttle` bleibt unverändert = YouTube; bestehende
  `config.yaml` brauchen keine Migration. Zähler, Backoff, Request-Abstand und Pause zwischen Downloads
  sind pro Plattform getrennt (docs/decisions.md).
- `download.keep_original_soundcloud` statt eines allgemeinen `audio_format_by_platform`: eine einfache
  Checkbox; eine dritte Plattform kann es später ablösen.
- Suche: `search(query, {genre?, year?, platform?})`; Genre-Begriffe und Jahr werden auch bei SoundCloud
  angehängt (SoundCloud sucht in Titel, Tags und Beschreibung, die Begriffe grenzen gleich ein).

## v0.3.0 – Festivals & Serien (Entscheid)
- Neuer Tab «Festivals & Serien» = Abschnitt `festivals` (Tabelle oben) + Serienliste. Die **Serienliste
  steht nicht in `config.yaml`**, sondern in der DB (Tabelle `series`): mitgelieferte Einträge aus
  `app/data/series.yaml` werden beim Start synchronisiert, eigene/geänderte/ausgeblendete bleiben bei
  Updates unangetastet. Bearbeitet wird sie über die Bridge (`get_series`, `save_series`,
  `delete_series`, `reset_series`, docs/bridge-api.md «Festivals & Serien»), nicht über `save_settings`.
- Der Tab enthält ausserdem: Knopf «Festivals zuordnen» (`assign_festivals`, Fortschritt
  `festival_assign`, Stand `get_festival_status`) und ein Testfeld (`detect_festival`).
- `storage.album_from_edition` gehört zum Tab «Ablage & Tags» (bei den Tag-Optionen) und steht zusätzlich
  im Tab «Festivals & Serien» (dasselbe Feld, ein Wert; die UI zählt es bei «ungespeichert» nur einmal).
  Die neuen Platzhalter erklärt der Hinweis unter der Pfad-Vorschau (`set.path_preview.fest`), die
  Vorschau bietet `{festival}`, `{event_year}`, `{stage}` als Knöpfe an.
- UI der Serienliste: Zeile pro Serie (Art, Name, Kennzeichen mitgeliefert/eigene/angepasst/ausgeblendet,
  Aliase, Anzahl, Schalter «erkennen»), Dialog zum Anlegen/Bearbeiten; jede Änderung ruft sofort
  `save_series`/`delete_series`/`reset_series` auf und sendet UI-intern `series_changed`.

## v0.4.0 – «Alles einlesen (einmalig)» (Entscheid)
- Neuer Abschnitt `watchlist` (in `config.yaml` nach `schedule`), in der UI im Tab «Zeitplan» unter der
  Zwischenüberschrift «Alles einlesen (einmalig)» (`set.h.backfill`); Einheit von
  `backfill_requests_per_hour` = `unit.req_h`.
- Bewusst nur zwei Werte: Obergrenze und Tempo. Seitengrösse bestimmt yt-dlp (YouTube-Kanal ~30,
  Playlist 100, SoundCloud 200), das Tempo gilt pro Anfrage. Ein eigenes Stundenbudget mit hartem Stopp
  gibt es nicht (ein Fortsetzen muss die schon gelesenen Seiten erneut abfragen – ein hartes Budget unter
  dieser Seitenzahl käme nie voran); stattdessen gleichmässige Verteilung, im Headless-Lauf als Budget
  pro Lauf (docs/decisions.md «Alles einlesen»).

## v0.5.0 – Festival-Sammler (Entscheid)
- Drei neue Werte im Abschnitt `festivals` (Tabelle oben), in der UI im Tab «Festivals & Serien» unter
  einer Zwischenüberschrift «Festival-Sammler»; Einheit von `collector_searches_per_hour` = `unit.req_h`
  (bzw. «Suchen/h»), `collector_auto_confirm` wie `min_confidence` (0.5–1.0, Schritt 0.05).
- Seitengrösse/Tempo des Playlist-Imports kommen aus `watchlist.backfill_*` (gleiches Seiten-Tor wie
  «Alles einlesen»), die Mindestdauer eines Treffers aus `filters.min_duration` – keine eigenen Werte.
- Die Checklisten selbst stehen in der DB (`checklists`, `checklist_rows`), nicht in `config.yaml`
  (Bridge: docs/bridge-api.md «Festival collector»).

## v0.7.0 – Lautheit, Wellenform, Player-Gedächtnis (Entscheid)
- Neuer Tab «Wiedergabe» (`tabs.playback`) nach «Allgemein»: `player.mode` zieht aus «Allgemein» hierher
  (Schlüssel unverändert, keine Migration), dazu `player.normalize`, `player.target_lufs` (Einheit
  `unit.lufs`; Bereich mit negativen Grenzen wird als «-30 … -6» angezeigt), `player.resume` (Segment),
  `player.waveform` und der Abschnitt «Analyse» mit Statusbox (`get_analysis_status`, Knöpfe «Neue
  analysieren» = `analyse_library({scope:"new"})` / «Alle neu analysieren» = `scope:"all"`, Fortschritt
  `audio_analysis`) und den drei `loudness.*`-Schaltern. Bei `player.mode == "external"` sind die
  Player-Felder ausgegraut (sie betreffen nur den eingebauten Player).
- Eigener Abschnitt `loudness` statt weiterer `player.*`-Schlüssel: die Analyse läuft unabhängig vom
  Player (Tags nützen auch anderen Playern).
- Die Ziel-Lautheit wirkt **nur im eingebauten Player**; die Tags in den Dateien beziehen sich immer auf
  die ReplayGain-2.0-Referenz −18 LUFS (Opus: R128 auf −23 LUFS), damit andere Player sie richtig lesen.
- Der Schlaf-Timer ist bewusst **keine** Einstellung: er gilt nur für die laufende Sitzung und wird im
  Player gewählt (15/30/45/60 Min. oder Ende des Sets; die letzten 10 s blenden aus).
