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
| `appearance` (Darstellung) | `reduce_effects` | bool | false | |
| | `scanlines` | bool | true | |
| | `pulse_bpm` | int | 200 | 60–300 |
| `player` (Tab «Allgemein», Phase 8) | `mode` | str | `internal` | internal (eingebauter Player), external (Standardplayer des Systems) |
| `festivals` (Festivals & Serien, v0.3.0) | `detect` | bool | true | Festival/Serie, Jahr, Bühne, Set-Art automatisch erkennen (offline, nur gespeicherte Titel/Kanal/Beschreibung) |
| | `min_confidence` | float | 0.65 | 0.3–1.0; ab diesem Wert zuordnen, darunter nur Vorschlag |
| | `year_from_upload_date` | bool | true | ohne Jahreszahl im Titel das Upload-Jahr nehmen |
| | `match_description` | bool | true | Festivalnamen auch in der Beschreibung suchen (Suchtreffer: nur falls geliefert; Bibliothek: Sidecar) |
| | `extra_stages` | list[str] | `[]` | zusätzliche Bühnennamen, je max. 40 Zeichen (eingebaut: RED, BLUE, BLACK, UV, YELLOW, INDIGO, MAGENTA, GOLD, SILVER, PURPLE, GREEN, ORANGE, WHITE, PINK, Mainstage) |
| | `extra_set_types` | list[{`keyword` str 1–60, `set_type` Code}] | `[]` | eigene Begriffe für Set-Arten, vor den eingebauten geprüft; Codes: live_set, closing_ceremony, opening, endshow, full_show, warm_up, anthem, episode. Fehler: `festivals.extra_set_types.<i>.set_type` |
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
