![](images/divider.svg)

All settings are in the app under **Einstellungen** (Settings), one tab per section. Each setting
shows a label, a help text, its default and a reset link. **Speichern** validates everything and
flags errors at the field; nothing is applied before you save. *Tab auf Standard* resets one tab,
*Alles auf Standard* (tab Wartung) resets everything (database and music files stay untouched).

## Where settings live

Settings are stored as YAML (comments are preserved) in `config.yaml`:

| Install type | Location |
|---|---|
| venv install | `%APPDATA%\HCLoader\config.yaml` |
| Portable build | `HCLoader\data\config.yaml` |
| `HCLOADER_HOME` set | `%HCLOADER_HOME%\config.yaml` |

The repository ships [`config.example.yaml`](https://github.com/kellerict/HCLoader/blob/main/config.example.yaml)
with all defaults and comments. Missing keys fall back to their defaults. Key names below are the
YAML keys (`section.key`); the tab names in the app are German, shown in parentheses.

## general (tab Allgemein)

| Key | Default | Range / values | Description |
|---|---|---|---|
| `language` | `en` | auto, en, de, zh-CN, hi, es, fr, bn, pt, ru, id, nl, nl-BE, sv, nb, fi, lt, lv, et, de-x-frk | UI and message language (v0.2.0): English (default), German (Swiss spelling), Chinese (Simplified), Hindi, Spanish, French, Bengali, Portuguese (Brazil), Russian, Indonesian, Dutch, Flemish (Belgium), Swedish, Norwegian (Bokmål), Finnish, Lithuanian, Latvian, Estonian and Fränggisch (fun dialect). `auto` follows the Windows display language; unsupported languages fall back to English. `auto` never picks `de-x-frk` (Fränggisch, a fun dialect – choose it explicitly; missing texts fall back to German, then English). `nl-BE` (Vlaams) only overrides the keys where Belgian Dutch differs; the rest comes from `nl`, and `auto` picks it for a Belgian Dutch system language (other `nl-*` → `nl`). Switching applies at once (the window content reloads, no restart). Data (genre names, folders, tags) never changes with the language. |
| `start_view` | `discover` | discover, inbox, watchlist, downloads, library, log | View opened at start. |
| `log_level` | `INFO` | DEBUG, INFO, WARNING, ERROR | Verbosity of the log file and live log. Use DEBUG only for troubleshooting. |
| `confirm_delete` | `true` | | Ask before deleting a mix (entry and file) from the library. |

## player (tab Allgemein)

| Key | Default | Range / values | Description |
|---|---|---|---|
| `mode` | `internal` | internal, external | What play does in the library: built-in mini player (in development) or the system's default audio player. The other one stays available per entry. |

## search (tab Filter & Keywords)

| Key | Default | Range / values | Description |
|---|---|---|---|
| `results_count` | `30` | 1 to 100 | Number of hits per search. |
| `append_year` | `true` | | When a year filter is set, append the year to the search text. |

## filters (tab Filter & Keywords)

| Key | Default | Range / values | Description |
|---|---|---|---|
| `min_duration` | `600` | seconds, >= 0 | Shortest accepted duration (10 minutes). Unknown duration and livestreams are always dropped. |
| `max_duration` | `0` | seconds, >= 0 | Longest accepted duration; `0` = unlimited, otherwise at least `min_duration`. |
| `upload_period` | `all` | all, 7d, 30d, 1y, year, custom | Upload date window. |
| `upload_year` | `0` | `0` = unset, otherwise 2005 to the current year | Required when `upload_period` is `year`. |
| `upload_from` | `""` | `YYYY-MM-DD` or empty | Start of the custom range. |
| `upload_to` | `""` | `YYYY-MM-DD` or empty, not before `upload_from` | End of the custom range. |
| `include_keywords` | `mix, set, liveset, live set, podcast, continuous, megamix, yearmix, radio show, session, warm up, closing` | list | If not empty, at least one must match the title. |
| `exclude_keywords` | `reaction, tutorial, how to, shorts, trailer, aftermovie, teaser, preview, lyrics, karaoke, sample pack, ableton, fl studio` | list | None may match the title. |
| `match_description` | `false` | | Also match keywords against the description (flat queries often do not return it). |
| `hide_done_ignored` | `true` | | Hide videos that are already downloaded or ignored. |
| `apply_channel_blacklist` | `true` | | Never show videos from blocked channels. |
| `hide_cross_platform_duplicates` | `false` | | Hide hits that were probably already downloaded or queued from the other platform (duration within 5 s, title similarity at least 0.8). Never downloaded automatically. |

Matching is case-insensitive, on word boundaries, with umlauts and accents normalized.

## genres (tab Genres)

`genres.items` is a list of genres; order and `priority` decide which genre wins. Each item has:

| Field | Description |
|---|---|
| `name` | Unique name, also used as folder name. `Unsortiert` (fallback) always exists. |
| `color` | `#rrggbb` used for badges. |
| `keywords` | Words that, found in the title, assign this genre. |
| `priority` | Lower number = checked first. |

Defaults:

| Priority | Name | Color | Keywords |
|---|---|---|---|
| 1 | Uptempo | `#b6ff00` | uptempo, up-tempo, terror, terrorcore, speedcore |
| 2 | Hardcore | `#ff1f1f` | hardcore, gabber, gabba, frenchcore, industrial, early hardcore, millennium, mainstream hardcore |
| 3 | Hardstyle | `#a43bff` | hardstyle, rawstyle, raw, euphoric, xtra raw, reverse bass |
| 99 | Unsortiert | `#6b6b78` | (none, fallback) |

Genre resolution order: manually set genre, then the source's default genre, then the first keyword
match by priority, then the genre chip selected for the search, then `Unsortiert`.

Keywords match the title on word boundaries, so a mix called "Dominator 2026" stays in `Unsortiert`
until you add a keyword such as `dominator` to the right genre.

## festivals (tab Festivals & series, v0.3.0)

Detection of festival or series, edition year, stage and set type. Everything runs offline on data
that is already stored (title, channel, upload date, description).

| Key | Default | Range / values | Description |
|---|---|---|---|
| `detect` | `true` | | Detect automatically on new search and watchlist results and after each download. Manually set values are never overwritten. |
| `min_confidence` | `0.65` | 0.3 to 1.0 | From this confidence a match is assigned; below it, it is only shown as a suggestion that you can accept in the library. |
| `year_from_upload_date` | `true` | | Without a year in the title, use the upload year (counts as less certain). |
| `match_description` | `true` | | Also look for festival names in the stored description. |
| `extra_stages` | (none) | list, 40 characters each | Stage names in addition to the built-in ones (RED, BLUE, BLACK, UV, YELLOW, INDIGO, MAGENTA, GOLD, SILVER, PURPLE, GREEN, ORANGE, WHITE, PINK, Mainstage). |
| `extra_set_types` | (none) | list of term + set type | Own words that indicate a set type, checked before the built-in ones. Set types: live set, closing ceremony, opening, endshow, full show, warm-up, anthem, episode. |
| `collector_searches_per_hour` | `10` | 1 to 200 | v0.5.0 [Festival collector](Festival-Collector): searches per hour for missing sets, spread evenly (10 = one every 6 minutes). Never more than `throttle.max_searches_per_hour`. |
| `collector_results_per_search` | `10` | 1 to 50 | Results one search for a missing set looks at (one request per search). |
| `collector_auto_confirm` | `0.85` | 0.5 to 1.0 | From this confidence a hit counts without your confirmation – only with DJ, festival and year in the title. |

The tab also contains:

- **Assign festivals now**: a one-off pass over the existing library with a progress bar and
  **Cancel**. It works offline, skips manually set entries and does not retag or move files (use
  *Retag* in the library for that). The box shows how many mixes are assigned, the number of
  suggestions and the time of the last pass.
- **Test a title**: type a title to see what the detection would find (series, year, stage, set
  type, confidence). Nothing is stored.
- **Album = edition** (`storage.album_from_edition`, see below).
- **Series**: the list of known festivals, radio shows and podcasts. It lives in the database, not
  in `config.yaml`, and **changes are saved immediately** (they are not part of *Save* / *Discard*).

| Series action | What it does |
|---|---|
| Switch | Off = the series stays in the list but is no longer detected; existing assignments remain. |
| Edit | Name, kind (festival, radio show, podcast), default genre, aliases (other spellings; one hit in the title is enough), weak aliases (everyday words such as *Rebirth* that only count together with a year), variants (*Australia*, *at Home*) and organiser channels (only raise the confidence). |
| Add | Creates your own series (label **own**). |
| Delete / Hide | Own series are deleted with their editions; built-in ones are hidden and stay hidden after app updates. Assignments to the series are removed. |
| Restore | Resets an edited (**modified**) or hidden built-in series to its shipped state. *Show hidden* lists hidden ones; *Reset built-in series* restores all of them and keeps your own. |

## download (tab Download & Qualität)

| Key | Default | Range / values | Description |
|---|---|---|---|
| `audio_format` | `mp3` | mp3, original | `mp3` converts with ffmpeg; `original` keeps the source audio (Opus or M4A) without conversion. |
| `mp3_quality` | `320` | 320, v0 | 320 kbps constant bitrate or V0 variable bitrate. Note that YouTube usually delivers Opus at roughly 130 to 160 kbps, so MP3 is a conversion, not an upgrade. |
| `embed_cover` | `true` | | Embed square cover art (APIC). |
| `write_cover_jpg` | `false` | | Also write `cover.jpg` next to the file. |
| `write_cue` | `true` | | Write a `.cue` file from chapters or description timestamps. |
| `write_id3_chapters` | `true` | | Write ID3 `CHAP`/`CTOC` frames (MP3 only). |
| `keep_original_soundcloud` | `true` | | SoundCloud: keep the original audio unchanged (AAC 160 kbps to `.m4a`, MP3 128 kbps to `.mp3`). `false` = follow `audio_format`. |

## storage (tab Ablage & Tags)

| Key | Default | Range / values | Description |
|---|---|---|---|
| `target_dir` | `%USERPROFILE%\Music\HCLoader` | path | Root of the library. Temporary files live in `.tmp` below it. In the portable build a relative path such as `.\Music` is relative to the app folder. |
| `path_template` | `{genre}/{artist}/{year}/{date} - {title} [{id}]` | must contain `{id}` | Folder and file name pattern. Placeholders: `genre`, `artist`, `channel`, `year`, `date`, `title`, `id`, `platform` (YouTube or SoundCloud), and from v0.3.0 `festival`, `event_year`, `stage` (only filled when a festival is assigned; otherwise they drop out together with leftover separators such as ` - ` or `()` and empty folder levels). For SoundCloud `{id}` is `sc-<id>`. The default template is unchanged. |
| `max_title_length` | `120` | 20 to 200 | Titles are shortened to this many characters in file names. |
| `max_path_length` | `240` | 100 to 259 | Total path length limit (Windows MAX_PATH safety). |
| `artist_from_title` | `false` | | Parse the artist from the title (patterns like `ARTIST @ EVENT` or `ARTIST - TITLE`) instead of using the channel name. |
| `album_from_edition` | `true` | | v0.3.0: write the edition (e.g. `Defqon.1 2024`) as album tag when a festival or series is assigned, so Plex and Jellyfin show all sets of an edition as one album. Off = album is the title, as before. Also shown in the tab *Festivals & series*. |
| `title_cleanup_patterns` | `\(Official[^)]*\)`, `\[HQ\]`, `\[HD\]`, `\(HQ\)`, `\(HD\)`, `\[Official[^\]]*\]` | list of valid regular expressions | Removed from titles before tagging and naming. |

## throttle (tab Schonung): YouTube

Details and rationale: [Throttling and backoff](Throttling-and-Backoff).

| Key | Default | Range / values | Description |
|---|---|---|---|
| `sleep_requests` | `3` | 0 to 60 s | Pause between metadata requests (search, watchlist). |
| `sleep_interval` | `30` | 0 to 3600 s | Minimum random pause after each download. |
| `max_sleep_interval` | `120` | at least `sleep_interval` | Maximum random pause after each download. |
| `limit_rate_mb` | `3.0` | MB/s, `0` = unlimited | Download bandwidth cap. Unlimited is not recommended. |
| `max_downloads_per_run` | `10` | 1 to 100 | Downloads per run. The rest stays queued. |
| `max_downloads_per_day` | `25` | 1 to 500 | Downloads per day. |
| `max_searches_per_hour` | `20` | 1 to 200 | Searches per hour. |
| `backoff_initial_hours` | `6` | 0.5 to 168 | First backoff after HTTP 429 or a bot check. |
| `backoff_max_hours` | `48` | at least `backoff_initial_hours` | The backoff doubles up to this value. |

## soundcloud (tab SoundCloud, in development)

SoundCloud has its own section with the same keys as `throttle` (same ranges and defaults), plus a
switch. Counters, backoff, request spacing and download pauses are kept per platform: a 429 from
SoundCloud never blocks YouTube and the other way around.

| Key | Default | Description |
|---|---|---|
| `enabled` | `true` | Off = no SoundCloud search, source or download. |
| `sleep_requests`, `sleep_interval`, `max_sleep_interval`, `limit_rate_mb`, `max_downloads_per_run`, `max_downloads_per_day`, `max_searches_per_hour`, `backoff_initial_hours`, `backoff_max_hours` | as `throttle` | Same meaning as above, for SoundCloud. |

## network (tab Netzwerk & PO-Token)

| Key | Default | Range / values | Description |
|---|---|---|---|
| `po_token_mode` | `script` | off, script, http | PO token provider: off; script mode with Deno (no server needed, preferred); or a local HTTP server started by the app on `127.0.0.1`. |
| `po_token_port` | `4416` | 1024 to 65535 | Port of the local provider in HTTP mode. |
| `po_token_ttl_hours` | `6` | 0.5 to 48 | PO token lifetime (rounded to whole hours). |
| `cookies_from_browser` | `""` | "", edge, chrome, firefox, brave | Emergency option: use browser cookies. Off by default, because combining cookies with PO tokens can cause problems and cookies tie requests to your account. |
| `proxy` | `""` | URL | Optional proxy. Credentials in the URL are masked in logs. |

The tab also has a PO-token status indicator and a test button.

## schedule (tab Zeitplan)

See [Scheduled checks](Scheduled-Checks).

| Key | Default | Range / values | Description |
|---|---|---|---|
| `watchlist_interval_hours` | `24` | 1 to 168 | Interval of the in-app watchlist check while the app is open. |
| `in_app_check` | `true` | | Enable the in-app check. |
| `task_scheduler_enabled` | `false` | | A Windows scheduled task exists (created or removed by the app). |
| `task_time` | `03:00` | `HH:MM` | Daily start time of the scheduled task. |
| `entries_per_source` | `30` | 1 to 200 | Default number of entries read per source and check. |

## watchlist (tab Schedule, section «Read everything (once)», v0.4.0)

See [Watchlist and inbox](Watchlist-and-Inbox#read-everything-once).

| Key | Default | Range / values | Description |
|---|---|---|---|
| `backfill_max_entries` | `2000` | 100 to 10000 | «Read everything (once)» reads at most this many entries of a channel, playlist or SoundCloud profile/set. |
| `backfill_requests_per_hour` | `120` | 10 to 600 | Page requests of «Read everything» are spread evenly (120 = one every 30 s); the normal request spacing and the backoff apply as well. A scheduled (headless) run continues an open backfill for at most this many requests. |

## appearance (tab Darstellung)

| Key | Default | Range / values | Description |
|---|---|---|---|
| `reduce_effects` | `false` | | Turns off glow, glitch and pulse effects (also respects the system's reduced-motion setting). |
| `scanlines` | `true` | | Scanline/noise overlay. |
| `pulse_bpm` | `200` | 60 to 300 | Tempo of the progress bar pulse. |

## maintenance (tab Wartung)

| Key | Default | Description |
|---|---|---|
| `check_updates_on_start` | `true` | Check PyPI for newer yt-dlp and plugin versions at start, at most once per day. |
| `check_app_updates_on_start` | `true` | Check GitHub releases for a newer HCLoader version once per start. |
| `apply_update_on_exit` | `true` | Apply a downloaded app update when the app is closed. |
| `update_repo` | `kellerict/HCLoader` | `owner/repo` on GitHub used for app updates (a `https://github.com/...` URL is accepted); changeable for forks. |

The tab itself shows versions (app, yt-dlp, PO-token plugin), the update button for yt-dlp and the
plugin (a restart is needed afterwards; search and downloads are blocked until then, the queue is
kept), database info and backup (the 10 newest backups are kept in `backups\`), buttons to open the
data and log folders, and the reset-all button.

## Not in the GUI

Nothing a user would want to change is code-only, with one exception: the number of kept database
backups (10) is a constant.

---

[← Supported sources](Supported-Sources) · [🏠 Home](Home) · [Throttling and backoff →](Throttling-and-Backoff)
