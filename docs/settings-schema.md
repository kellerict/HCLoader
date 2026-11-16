# Settings-Schema (Vertrag Backend ↔ UI)

Verbindliche Struktur von `config.yaml` / `app/core/config.py` (pydantic v2) und der Einstellungs-Tabs in der GUI.
Schlüssel = Englisch, snake_case. UI-Labels kommen aus `ui/js/i18n.js`. Änderungen an diesem Schema nur durch den Orchestrator.

| Abschnitt (Tab) | Schlüssel | Typ | Default | Grenzen / Werte |
|---|---|---|---|---|
| `general` (Allgemein) | `start_view` | str | `discover` | discover, inbox, watchlist, downloads, library, log |
| | `log_level` | str | `INFO` | DEBUG, INFO, WARNING, ERROR |
| | `confirm_delete` | bool | true | |
| `search` (Filter & Keywords) | `results_count` | int | 30 | 1–100 |
| `filters` (Filter & Keywords) | `min_duration` | int (s) | 600 | ≥ 0 |
| | `max_duration` | int (s) | 0 | ≥ 0, 0 = unbegrenzt, sonst ≥ min_duration |
| | `upload_period` | str | `all` | all, 7d, 30d, 1y |
| | `include_keywords` | list[str] | SPEC §4 | |
| | `exclude_keywords` | list[str] | SPEC §4 | |
| | `match_description` | bool | false | |
| | `hide_done_ignored` | bool | true | |
| | `apply_channel_blacklist` | bool | true | |
| `genres` (Genres) | `items` | list[{`name`, `color` (#rrggbb), `keywords` list[str], `priority` int}] | SPEC §8 | Namen eindeutig, "Unsortiert" immer vorhanden |
| `download` (Download & Qualität) | `audio_format` | str | `mp3` | mp3, original |
| | `mp3_quality` | str | `320` | 320, v0 |
| | `embed_cover` | bool | true | |
| | `write_cover_jpg` | bool | false | |
| | `write_cue` | bool | true | |
| | `write_id3_chapters` | bool | true | |
| `storage` (Ablage & Tags) | `target_dir` | str | `%USERPROFILE%\Music\HCLoader` | |
| | `path_template` | str | `{genre}/{artist}/{year}/{date} - {title} [{id}]` | Platzhalter: genre, artist, channel, year, date, title, id |
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
