# Settings-Schema (Vertrag Backend ↔ UI)

Verbindliche Struktur von `config.yaml` / `app/core/config.py` (pydantic v2) und der Einstellungs-Tabs in der GUI.
Schlüssel = Englisch, snake_case. UI-Labels kommen aus `ui/js/i18n.js`. Änderungen an diesem Schema nur durch den Orchestrator.

| Abschnitt (Tab) | Schlüssel | Typ | Default | Grenzen / Werte |
|---|---|---|---|---|
| `general` (Allgemein) | `start_view` | str | `discover` | discover, inbox, watchlist, downloads, library, log |
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
| | `path_template` | str | `{genre}/{artist}/{year}/{date} - {title} [{id}]` | Platzhalter: genre, artist, channel, year, date, title, id, platform («YouTube»/«SoundCloud», Phase 7a). `{id}` bei SoundCloud = `sc-<id>` |
| | `max_title_length` | int | 120 | 20–200 |
| | `max_path_length` | int | 240 | 100–259 |
| | `artist_from_title` | bool | false | |
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
| `maintenance` (Wartung) | `check_updates_on_start` | bool | true | max. 1×/Tag |

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
