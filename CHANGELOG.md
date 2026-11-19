# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/).
Entries are written in English from v0.2.1 on; older entries are in German.

Every version starts with `### Highlights`: 3 to 8 one-line bullets, no prose. The app shows exactly
this list in the update dialog; everything below it (`### Added`, `### Changed`, `### Fixed` …) only
appears after «Show all changes» (`docs/RELEASING.md`).

## [Unreleased]

## [0.10.0] - 2026-11-19

### Highlights
- **Re-upload detection**: an offline audio fingerprint recognises the same mix uploaded again – another channel, another platform, a new id
- Probable re-uploads are **marked in the library** with *Keep both*, *Link as the same mix* or *Delete this newer file* – nothing is deleted automatically
- **Fingerprint your existing library** in the background, with progress and cancel; optional check by length and title before downloading
- **Mixcloud** as a new source: search, users and playlists in the watchlist, downloads
- **hearthis.at** as a new source: search, users and sets in the watchlist, downloads
- Every source has **its own throttle**, counters and backoff – a block on one never stops the others

### Added
- Re-upload detection (new settings tab **Re-uploads**): after each download the new file is
  fingerprinted offline with ffmpeg (first minutes plus a few 30-second windows, mono at low sample
  rate, low priority, one file at a time, after the loudness analysis) and compared with the library
  through a fast index. A match at the same time offset in at least two parts of the set marks the
  newer download as *probable re-upload of X* (threshold adjustable, default 15 %). Two different
  sets that only share the opening track are no match. Library: tag **RE-UPLOAD?** with the actions
  *Keep both*, *Link as the same mix*, *Show the original*, *Delete this newer file* (the entry
  becomes *ignored* and is never downloaded again) and *Undo*; chip **Re-uploads (n)**; a note in
  Downloads and a toast after a download. **Fingerprint new files** / **Fingerprint all again**
  compare the existing library (progress, cancel, resumes where it stopped; decisions are kept).
- Optional **Check before downloading** (`reupload.precheck`, off by default): search hits and
  watchlist entries are also compared by length (±5 s) and title with the library on the same
  platform – no extra request; matches go to the inbox instead of the queue.
- **Mixcloud**: search (Mixcloud's public search API, 50 results per request), watchlist sources
  `mixcloud.com/<user>` (uploads) and `mixcloud.com/<user>/playlists/<playlist>`, downloads through
  yt-dlp. Listings ask for title, length, date and picture in the same page request and stop as soon
  as they have enough entries. Mixcloud Select uploads (subscribers only) are shown as not
  downloadable. Original AAC audio kept by default (`download.keep_original_mixcloud`).
- **hearthis.at**: search and watchlist sources `hearthis.at/<user>/` and
  `hearthis.at/<user>/set/<set>/` through the public API (20 entries per request, lazy), downloads
  through yt-dlp; the MP3 stream is kept unchanged by default (`download.keep_original_hearthis`),
  lossless originals are skipped.
- Settings tab **More sources** with a switch and the full throttle (pauses, limits, backoff) for
  Mixcloud and hearthis.at each; status bar items for them while they are active; platform switch in
  Discover and in saved searches with four platforms; statistics show all sources.
- New settings sections `mixcloud`, `hearthis`, `reupload`; `download.keep_original_mixcloud`,
  `download.keep_original_hearthis`. Database migration 16 (`fingerprints`, `fingerprint_index`,
  `reuploads`).
- Ids `mc:<user>_<slug>` / `ht:<id>`, file names `[mc-…]` / `[ht-…]`, tags `TXXX:MIXCLOUD_ID` /
  `TXXX:HEARTHIS_ID`, archive lines `mixcloud …` / `hearthisat …`; `{platform}` in the folder pattern
  gives «Mixcloud» / «hearthis.at».
- Bridge methods `get_reupload_status`, `fingerprint_library`, `cancel_fingerprint_library`,
  `get_reuploads`, `resolve_reupload`; events `fingerprint`, `reupload`; `LibraryItem.reupload`
  (`docs/bridge-api.md`).
- Texts in all languages; wiki pages *Re-upload detection* (new), *Supported sources*, *Settings
  reference* updated; installer privacy page and privacy table list Mixcloud and hearthis.at.

### Changed
- Settings sections and throttles of all platforms come from one table
  (`config.PLATFORM_SECTIONS`), so a new platform gets its throttle everywhere at once.
- Re-upload fingerprint windows sit at fixed times – half counted from the start (5, 10, 15 … min),
  half counted back from the end (2, 6, 12 … min) – and a partial match is confirmed by decoding the
  new file again where the other set's parts lie at the found offset. Copies with minutes more or less
  at either end, trimmed copies, low bitrates and noisy copies are recognised; sets that only share
  a track or the intro are not.
- An HTTP 403 of the Mixcloud or hearthis.at API starts that platform's backoff (as for SoundCloud).
- The same-platform pre-check needs equal numbers in both titles, so the next episode of a weekly
  show is not taken for a re-upload.

### Fixed
- *Delete this newer file* is only possible while the original file is present and readable;
  otherwise the menu explains why and offers **Original missing – keep this copy** (the copy replaces
  the original). The last copy of a mix can no longer be deleted by accident.
- Deleting a set while its fingerprint is computed no longer fails on Windows (the decode stops
  first) and leaves no fingerprint rows behind.
- Mixcloud: playlists read newest-last stop paging past the size limit; search paging only follows
  Mixcloud's own API.

### Not included
- **archive.org** is postponed: yt-dlp only supports single items, not collections or search
  (`docs/decisions.md`).

## [0.9.0] - 2026-11-18

### Highlights
- **Statistics view**: sets, hours and GB of your library, by genre, festival, year and DJ – charts that work offline
- **Downloads over time**, YouTube vs. SoundCloud, most played tracks and watchlist activity, with a date range filter
- **Windows notifications** when the watchlist finds new sets or downloads finish or fail – bundled, with quiet hours
- A click on a notification **opens the app at the inbox** (also after a scheduled check while the app was closed)
- **Plex and Jellyfin**: the media server rescans its library after downloads – batched, only the new folders
- The Plex token / Jellyfin API key lives in the **Windows Credential Manager**, never in config.yaml or the log

### Added
- Statistics view (navigation › **Statistics**, `#stats`, Ctrl+6): totals (sets, playing time, size on
  disk, average set length), downloads per month (per year for long histories), genres, YouTube vs.
  SoundCloud, top 10 festivals and DJs, sets per event year, the most played tracks (offline
  tracklists) and watchlist activity (checks, scheduled share, found, inbox, the most productive
  sources). Presets *All time*, *12 months*, *30 days*, *This year* and a custom range. Computed from
  the database only (no network, fast on 10,000 sets); charts are plain HTML/CSS/SVG with text
  alternatives, keyboard focus and no animation with *Reduce effects*. A click on a DJ opens their page.
- File sizes are stored with every download (`videos.file_size`, database migration 15 with an index
  on the download time); libraries from before v0.9.0 are measured once in the background (local
  files only) when the statistics view opens.
- Windows notifications (new settings tab **Notifications**): new sets in the inbox (in-app and
  scheduled checks), downloads finished, downloads failed – each switchable, plus quiet hours. Events
  are collected and shown as one notification (one per download run, at least two minutes apart);
  during the quiet hours nothing is shown and one summary follows afterwards. **Send test** button.
  Shown through Windows PowerShell 5.1 (part of Windows, no extra package) or, if installed, the
  optional pywinrt packages; without either the events are only logged.
- A click on a notification opens HCLoader at the matching view (inbox, downloads or library) –
  also when the app is already running. New command-line option `--open <view>`; the
  `hcloader://open/<view>` link can only navigate (fixed allow-list, any extra argument is refused);
  the app registers its notification name/icon and the `hcloader:` link per user (HKCU, no admin
  rights); the uninstaller removes both.
- Plex/Jellyfin library scan (new settings tab **Media server**): server type, address, library
  (chosen from the list loaded by **Test connection**), the target folder as the server sees it
  (NAS/Docker), wait time and certificate check. After downloads the new files are sent in one
  batch: Plex `…/library/sections/<id>/refresh?path=<folder>`, Jellyfin `/Library/Media/Updated`
  (falls back to a full library refresh when paths cannot be mapped). **Scan now** button, last scan
  shown. Only the address you enter is contacted, without the system proxy, no redirects, 10 s
  timeouts, no retries; failures are logged and shown as a message. The scheduled run scans too.
- Token / API key in the Windows Credential Manager (`HCLoader/media_server/<type>`), stored after a
  successful connection test, removable in the settings.
- New settings sections `notifications` and `media_server`; `general.start_view` accepts `stats`.
- Bridge methods `get_stats`, `get_notification_status`, `test_notification`,
  `get_media_server_status`, `test_media_server`, `forget_media_server_secret`, `scan_media_server`;
  events `stats_sizes`, `media_scan`, `navigate`; `watchlist_done` also carries `inbox`
  (`docs/bridge-api.md`).
- Texts in all languages; wiki pages *Statistics* and *Notifications and media servers*, *Settings
  reference* updated.

### Changed
- The navigation has a new entry *Statistics* between *Library* and *Log*; Ctrl+6 opens it, the log
  and the settings moved to Ctrl+7 and Ctrl+8.

## [0.8.0] - 2026-11-18

### Highlights
- **DJ pages**: every artist in your library with sets, hours, festivals and years – grouped by festival and year
- **Aliases and b2b**: "HH" is Headhunterz, "SubZero Project" is Sub Zero Project, and a b2b set counts for every artist
- **Play all** sets of a DJ in the built-in player, one after the other
- **Add a DJ to the watchlist** with one click – their own channel if known, otherwise a "live set" search
- **Playlist export (M3U8)** for a festival edition, a genre, a DJ, your current search, a collector checklist or "Continue listening"
- Relative paths by default, so playlists keep working when the music folder moves; optional **auto-update after downloads**

### Added
- DJ pages (Library › **DJs**, `#library/djs`): list with search (also by alias), sort by sets, most
  recent or name, hidden "not a DJ" entries; a page per DJ with an initials badge, stats (sets, hours,
  festivals, years, b2b), sets grouped by festival and year with stage and b2b partners, the 10 most
  played tracks of their sets (from the offline tracklists), **Play all**, **Export M3U**, **Add to
  watchlist** (confirmation first, then the normal watchlist path; nothing is downloaded
  automatically) and **Search in Discover**.
- Artist detection runs offline on stored data (`app/core/artists.py`): confirmed festival-collector
  rows, the set title (festival, year, stage and set type parts skipped, "… by <DJ>"), the artist's own
  channel. b2b/vs/x and "&" credit every artist; a known act such as "D-Block & S-te-Fan" stays one.
  Spelling variants fold to one DJ; a short built-in alias list (`app/data/artists.yaml`).
- Edit name, aliases and own channel, merge two DJs, split an alias off again, hide entries that are
  not DJs – stored in the database and kept across updates.
- Playlist export (`app/core/playlists.py`): M3U8 (UTF-8, `#EXTM3U`, `#EXTINF` with duration and
  "Artist - Title") from the library (selected festival edition/series, a genre, or search + filters
  + sort), a DJ page, a collector checklist (downloaded sets) and "Continue listening". Relative paths
  by default (a file on another drive or share is written with its full path, the dialog says how
  many), file names cleaned for Windows and shortened to the path length limit, overwrite question,
  folder picker, missing files skipped.
- Saved playlists with **Keep up to date**: rewritten after downloads (also the scheduled run) when
  *Update saved playlists after downloads* is on (off by default); list in Settings › Storage & tags.
- New settings section `playlists` (`folder`, `relative_paths`, `sync_after_download`).
- Database migration 13 (automatic backup first): tables `artists` and `playlists`.
- Bridge methods `get_artists`, `get_artist`, `save_artist`, `merge_artists`, `split_artist`,
  `hide_artist`, `get_artist_watch`, `preview_playlist`, `export_playlist`, `get_saved_playlists`,
  `set_playlist_sync`, `forget_playlist`, `sync_playlists`; event `playlists_synced`
  (`docs/bridge-api.md`).
- Texts in all languages; wiki page *DJ pages and playlists*, *Settings reference* updated.
- Database migration 14: triggers keep one cache version for the DJ index, so festival
  assignments, collector credits, retags, deletes and artist edits show up at once (also from a
  scheduled run).

### Fixed
- Known artists (built-in list and your own entries) are recognised before a credit is split:
  "Mark With a K" is no longer cut to "Mark"; "with" only cuts before an MC or between two known
  names; "presents" and "feat." never cut into a known name.
- "Will Sparks & MC Stretch" no longer makes the MC a b2b partner (an MC alone still counts).
- Hidden artists no longer appear as b2b partners on DJ pages.
- The DJ index is updated incrementally after downloads (only new or changed sets are parsed) and
  builds about three times faster on large libraries.
- Merging artists no longer drops aliases silently beyond the limit; it refuses with a message.
- Playlists: a relative entry starting with "#" (or a space) is written as "`.\…`" so players do not
  read it as a comment; line breaks of every kind are removed from entries; "foo.m3u8" is not
  saved as "foo.m3u8.m3u8"; a unique temporary file is used and counted against the path limit.
- A playlist deleted in Explorer is no longer recreated by the automatic sync – it stops being
  kept up to date ("Write now" still writes it on request).
- A sync request that arrived while the previous sync was finishing is no longer lost.

## [0.7.0] - 2026-11-18

### Highlights
- **Loudness normalisation**: every set plays at the same perceived loudness in the built-in player – never clipping
- Offline **loudness analysis** with ffmpeg writes **ReplayGain tags** into your files (MP3, M4A, Opus) – the audio is never re-encoded
- **Waveform seek bar** with tracklist marks: hover for the track name, click or drag to jump
- The player **remembers where you stopped** in every set and offers to resume
- **Continue listening**: your last five unfinished sets at the top of the library
- **Sleep timer**: 15/30/45/60 minutes or end of the set, with a gentle fade-out

### Added
- Offline audio analysis (`app/core/analysis.py`): EBU R128 integrated loudness, loudness range and
  true peak via ffmpeg's `ebur128` filter, plus a compact waveform (1600 points) – both from a single
  decode, one file at a time, `-threads 1` and lowered process priority, cancellable at any moment.
  Runs after every download (setting), the first time a set without waveform is played, and as a
  one-off or incremental pass over the library (Settings › Playback › *Analyse N new* / *Analyse all
  again*, with progress and cancel). Never touches the network.
- ReplayGain 2.0 tags (`REPLAYGAIN_TRACK_GAIN`/`_PEAK`, −18 LUFS reference): ID3 TXXX for MP3, iTunes
  freeform atoms for M4A, `R128_TRACK_GAIN` for Opus (RFC 7845). Only the tag block is written; files
  locked by another program are re-tagged by the next pass without measuring again. ReplayGain tags of
  other programs are read as well.
- Built-in player: loudness normalisation through Web Audio with a configurable target (default
  −18 LUFS) and a true-peak limit; a small badge shows the gain in use. If the audio engine stays
  silent (local file treated as cross-origin), the player switches to plain playback at the same
  position within ~1.5 s – volume can then only be lowered, not boosted.
- ReplayGain tags are never written into the set that is loaded in the player; they follow once it
  is closed or another set plays. Tag writes go to a copy that atomically replaces the file.
- Built-in player: waveform seek bar with chapter lines, tooltips, click and drag; falls back to the
  plain bar without ffmpeg or with the setting off; respects *Reduce effects*.
- Player memory: the position of every set is remembered (not in the first/last 30 s); *Ask*,
  *Automatic* or *Off*. *Continue listening* row in the library with progress, resume and remove.
- Sleep timer in the player: 15/30/45/60 minutes or end of the set; the last 10 seconds fade out.
- New settings tab **Playback** (`player.mode` moved here from General) with `player.normalize`,
  `player.target_lufs`, `player.resume`, `player.waveform` and the new section `loudness`
  (`analyse_after_download`, `write_tags`, `waveforms`).
- Database migration 12 (automatic backup first): tables `audio_analysis` and `playback`.
- Bridge methods `get_waveform`, `save_position`, `forget_position`, `get_continue_listening`,
  `get_analysis_status`, `analyse_library`, `cancel_analyse_library`, `set_now_playing`; `get_media` now also returns
  `loudness`, `resume` and `peaks`; events `audio_analysis`, `media_analysed`, `waveform`
  (`docs/bridge-api.md`).
- Texts in all languages; wiki pages *Library and player* and *Settings reference* updated.

## [0.6.0] - 2026-11-18

### Highlights
- New **Tracks** search in the library: type an artist or title and see every set that plays it, with the timestamp
- Click a timestamp to play the set from exactly that point in the built-in player
- **Tracklist** panel for every set with clickable timestamps; unreleased "ID – ID" tracks shown discreetly
- **Most played tracks**: the top 20 tracks across your sets
- Tracklists come from chapters, descriptions, ID3 chapters and CUE files – offline, no extra requests to YouTube

### Added
- Tracklist extraction (`app/core/tracklist.py`): chapters and description from the metadata
  sidecar, ID3 CHAP frames and `.cue` files. Understands timestamped lines (`00:00`, `[12:34]`,
  `(1:02:03)`, timestamp at the end), numbered lists (`1.`, `01)`, `#3`, `Track 01 –`, `Track 1:`) and plain
  "Tracklist:" blocks; skips timetables, links and promo lines. Artists and titles are normalised (`feat.`, `x`,
  `vs.`, `&`, remix/edit/VIP as version, trailing `[Label]`, unicode quotes and dashes).
- Database migration 10 (automatic backup first): tables `tracklists` and `tracks` with an SQLite
  FTS5 index for fast search over thousands of sets; falls back to a plain search with the same
  results if FTS5 is missing (checked at every start; the index is repaired or rebuilt when needed).
  Migration 11 adds an index that makes "Most played" about four times faster on large libraries.
- Deleting a set also removes its tracklist, so it no longer shows up in search or "Most played".
- Tracklists are read after every download; the existing library is read once when the Tracks view
  is opened for the first time (progress, cancel). Later, "Read new" only reads sets that are new or
  changed since, and "Re-read all" reads everything again.
- Bridge methods `search_tracks`, `get_tracklist`, `get_top_tracks`, `get_tracklist_status`,
  `build_tracklists`, `cancel_build_tracklists` and event `tracklist_index` (`docs/bridge-api.md`).
- External player mode: clicking a timestamp opens the file and tells you where to jump.
- Texts in all languages; wiki page "Tracklist search".

### Changed
- The metadata sidecar keeps the whole description (up to 5000 characters instead of 2000), so
  tracklists at the end of long descriptions are found for new downloads.

### Fixed
- Chapters read from a description no longer lose a closing bracket at the end of the title
  ("Title (X Remix" in CUE files and ID3 chapters).
- A damaged audio file no longer breaks the Tracklist panel; it shows a clear message instead.
- A download that fails on a local file error (missing program, locked file) now names the
  error type, the file and where it happened, instead of a bare "[WinError 2]".

## [0.5.1] - 2026-11-18

### Highlights
- The installer installs the Microsoft Edge WebView2 Runtime if it is missing (nothing happens if it is already there)
- Portable build: a clear message with the download link when WebView2 is missing, instead of a broken window

### Added
- Installer: detects the WebView2 Runtime through the registry keys Microsoft documents (`pv` per
  machine or per user, not empty and not 0.0.0.0). If it is missing, Microsoft's Evergreen
  Bootstrapper (packed, signed by Microsoft) runs silently after the files are installed, with a
  status text; it installs per user without admin rights. Without internet the installation still
  completes and a message shows the download page; the setup log records every step. Texts in all
  installer languages.
- App start (all builds): if no WebView2 Runtime is registered, HCLoader stops before opening the
  window and explains it, with the option to open Microsoft's download page (all languages).
  `HCLOADER_SKIP_WEBVIEW2_CHECK=1` skips the check for setups it cannot see (Fixed Version runtime).

### Changed
- Release build: the bootstrapper is downloaded from Microsoft at build time and must carry a valid
  Microsoft Authenticode signature, otherwise the build fails; it is never committed and not
  re-signed. The installer smoke test checks the "already installed" path and a dry run of the
  "missing" path (`/WEBVIEW2DRYRUN=1`).
- Docs: README and wiki (Installation, Troubleshooting), third-party notes and code signing policy
  mention the bootstrapper.

## [0.5.0] - 2026-11-18

### Highlights
- Festival collector: a checklist of the expected sets of one festival edition, in the library (button «Collector», or «Collect this edition» in the festival view)
- Fill it from the organiser's playlist, a pasted timetable (text or CSV, **beta** – check the preview before importing), a shared timetable file or by hand
- Missing sets are found in your library first (free), then searched one by one – gently spread over the hour
- Only ticked and confirmed sets are queued; downloads are tagged with edition, stage and set type from the checklist

### Added
- Festival collector UI (`ui/js/views/collector.js`, sub-view of the library, `#library/collector`):
  overview of all checklists with «New checklist» (series + year + variant); per edition the status
  tiles (found / queued / downloaded / missing / ignored, click = filter), filters by stage, day and
  DJ, the table with checkbox, DJ, stage, day/time, set type, status and matched video (duration,
  confidence), confirm / reject / «other hits» for uncertain matches, ignore, inline edit, «Add row»,
  and a fixed action bar with «Select all / None», «Find missing sets» and «Download checked (n)».
- Collector dialogs: organiser playlist (link, progress while it is read), «Paste timetable» with a
  live preview of the parsed sets and the lines that were not understood, «Shipped timetables» (empty
  state explains the format and how to contribute), estimate before the search (searches, duration,
  free searches this hour) with progress, stop and resume.
- Entry «Collect this edition» / «Checklist n / total» at the selected year of the festival view.
- Timetable paste: the preview rows can be corrected or removed before importing; headerless
  CSV, combined `Saturday – RED` headings, emoji/markdown decoration and `Sat 18.00–19.00 Name @ STAGE`
  are understood, and lines that cannot be read are listed instead of becoming a stage.
- Settings tab «Festivals & series»: section «Festival collector» (searches per hour, results per
  search, automatic confirmation threshold). UI texts in all languages.
- Wiki page «Festival collector».
- Festival collector backend (`app/core/collector.py`, `app/core/timetable.py`): per
  edition a checklist of sets (DJ/artist, stage, day, start/end, set type, source playlist / timetable /
  file / manual, status missing / found / queued / downloaded / ignored, match + confidence +
  candidates, confirmed and ticked flags).
- Organiser playlist import: one flat listing, page by page through the throttle with the «Read
  everything» pacing; every entry becomes a confirmed row, trailers/aftermovies/short clips stay
  unticked. Entries are stored like search hits, never in the inbox or queue.
- Timetable parser for pasted text: `18:00 - 19:00 Artist`, `Artist | 18:00–19:00 | RED`, dotted/`h`/
  four-digit/am-pm times, day headings (English, German, Dutch, French, Spanish, Nordic; `Day 2`),
  stage headings, CSV/TSV/semicolon/Markdown tables with a header row; preview before import.
- Shared timetable files `app/data/timetables/<series>/<year>.json` (format documented in
  `app/data/timetables/README.md`; none shipped yet – only verified data will be added).
- Matching: against the stored videos first (library, inbox, earlier hits; free, offline), then a
  resumable search job – one flat search `<artist> <festival> <year>` per row, counted against
  `max_searches_per_hour` and spread evenly by `festivals.collector_searches_per_hour` (default 10/h).
  Estimate of searches and time before it starts; continues after restart, stops on backoff. Only hits
  with artist, festival and year in the title are confirmed automatically; all others need a click.
- Queueing ticked + confirmed rows through the normal sequential queue; the row's edition, stage and
  set type are stored on the video as manual festival values (tags, album, path follow), already
  downloaded matches are re-tagged.
- Bridge: 19 methods (`get_collector_editions`, `open_collector_edition`, `get_checklist`,
  `import_checklist_playlist`, `parse_timetable`, `import_timetable`, `get_timetable_files`,
  `import_timetable_file`, row editing, `confirm_checklist_match`, `estimate/start/cancel_checklist_matching`,
  `queue_checklist`, …) and events `collector_rows`, `collector_job`, `collector_import`
  (docs/bridge-api.md «Festival collector»).
- Settings `festivals.collector_searches_per_hour`, `festivals.collector_results_per_search`,
  `festivals.collector_auto_confirm`; backend texts in all languages.

### Changed
- Database migration 9 (`checklists`, `checklist_rows`) with the automatic pre-migration backup.

## [0.4.0] - 2026-11-18

### Highlights
- «Read everything (once)»: fetch the complete back catalogue of a channel, playlist or SoundCloud artist/set into the Inbox
- Gentle by design: paced page by page through the central throttle with its own hourly budget, automatic pause on backoff
- Resumable after backoff, restart or pause; progress shown right at the source («Reading … 240 / ~500»)
- Confirmation with an estimate of requests and time before it starts; adjustable cap (default 2000 entries)

### Highlights
- Watchlist «Read everything (once)»: read the complete back catalogue of a channel, playlist or SoundCloud profile/set – page by page, gently, into the inbox
- Confirmation with the estimated number of requests and time before anything starts
- Progress right at the source («Reading … 240 / ~486»), pause, resume and cancel
- Interrupted by a backoff, a restart or an error? It continues automatically where it stopped – also in scheduled runs

### Added
- «Read everything (once)» per watchlist source (channel, playlist, SoundCloud user or set; not for
  saved searches): reads the whole flat listing page by page up to `watchlist.backfill_max_entries`
  (default 2000, 100–10000). Every single page request goes through the throttle of the platform:
  backoff check, even pacing of `watchlist.backfill_requests_per_hour` (default 120 = one every 30 s,
  persisted across restarts) and the normal request spacing; the metadata lock is held per request,
  so searches and downloads keep working in between.
- Hits always go to the inbox, never into the download queue (also for auto-download sources);
  filters, de-duplication (never twice) and festival detection work exactly as for a normal check.
- Resumable: the position is stored after every page. Backoff, closing the app, a network error or
  the request budget of a scheduled run only interrupt it; it continues automatically 90 s after the
  next app start, after the next watchlist check and in headless runs (at most one hour's worth of
  requests per run). Pause waits for «Resume»; cancel discards the position (hits stay in the inbox).
  Three errors in a row pause the backfill with the error as a note.
- Confirmation dialog with the estimated requests and duration, based on the size reported by the
  last check (new: `item_count` per source, no extra request) or a conservative estimate.
- Bridge: `estimate_backfill`, `start_backfill`, `pause_backfill`, `cancel_backfill`, event `backfill`,
  `Source.backfill` and `Source.item_count` (docs/bridge-api.md).
- Settings tab «Schedule»: new section «Read everything (once)» (`watchlist.backfill_max_entries`,
  `watchlist.backfill_requests_per_hour`).
- Texts in all 19 languages.

### Changed
- Database migration 8 (`backfills` table, `sources.item_count`) with the automatic pre-migration
  backup.
- The watchlist check and the backfill share one ingestion step (`watchlist.Ingest`).

### Fixed
- Uninstall could hang while removing the scheduled task; the cleanup now gives up after 60 s. Installer messages respect silent mode.
- Installer upgrades only close HCLoader's own processes (python.exe, pythonw.exe, deno.exe in the install folder), never other programs that merely have one of its files open.

## [0.3.0] - 2026-11-18

### Highlights
- Festivals & series: HCLoader recognises festival, year, stage and set type (Defqon.1, Qlimax, Dominator, Q-dance Radio …) – offline, no extra requests
- Library «Group by» festival, genre, artist or year – festival tiles with a year timeline and sets per stage
- Click the festival badge to correct or confirm an assignment; the file is retagged right away
- Album tag = edition (e.g. «Defqon.1 2024») so Plex/Jellyfin group sets as albums (switchable)
- New settings tab «Festivals & series» with an editable list of 35 festivals and shows and a one-click pass for your existing library

### Added
- Festivals & series (backend): built-in, editable list of 35 hard dance festivals, radio shows and
  podcasts (`app/data/series.yaml`: Defqon.1 incl. Australia/Chile/at Home, Qlimax, Dominator,
  Masters of Hardcore, Thunderdome, Q-dance Radio, Hardstyle Mag Podcast …), stored in the database
  (migration 7 with automatic pre-migration backup). Updates of the list never overwrite series you
  edited, hid or added.
- Offline detection of festival/series, edition year (title, else upload year), variant, stage (RED,
  BLUE, BLACK, UV, Mainstage …), set type (live set, closing ceremony, endshow, warm-up, anthem,
  episode …) and episode number with a confidence score; below the threshold it is only a suggestion.
  Runs on new search and watchlist results and after each download; manual values are never
  overwritten.
- One-off «Assign festivals» pass over the existing library (background, progress events, cancellable).
- New tags `TXXX:FESTIVAL`, `TXXX:EVENT_YEAR`, `TXXX:STAGE`, `TXXX:SET_TYPE`, `TXXX:EPISODE`; album tag =
  edition (e.g. «Defqon.1 2024») when `storage.album_from_edition` is on (default). Re-tagging removes
  stale frames and keeps foreign ones.
- Path placeholders `{festival}`, `{event_year}`, `{stage}`; empty values are tidied away. The default
  path template is unchanged.
- Settings section `festivals` (detection on/off, confidence threshold, upload year fallback,
  description matching, extra stages and set-type keywords) and `storage.album_from_edition`.
- Bridge API for the coming UI: `get_series`, `save_series`, `delete_series`, `reset_series`,
  `get_festival_options`, `get_library_groups`, `set_festival`, `reset_festival`, `detect_festival`,
  `get_festival_status`, `assign_festivals`, `cancel_assign_festivals`; event `festival_assign`;
  library items carry `festival` / `festival_suggestion` (docs/bridge-api.md).
- Library: «Group by» switch (none · genre · festival · artist · year), remembered between starts.
  The festival view shows one tile per series (kind, number of sets, year range) – click a tile for
  the editions as a year timeline and the sets grouped by stage. Search and filters keep working;
  entries without a festival sit in «Other / unassigned».
- Festival badge on library entries (edition + stage). Click it to pick the series (searchable),
  year, variant, stage and set type, or to go back to automatic; the file is retagged right away.
  Uncertain detections appear as dashed suggestions with a one-click «accept».
- Settings tab «Festivals & series»: detection options and threshold, own stage names and set-type
  terms, a title test field, «Assign festivals now» with progress and cancel, and the series list
  (built-in or own, on/off, aliases, kind, default genre; add, edit, delete, hide, reset).
  `storage.album_from_edition` is explained there and under «Storage & tags»; the path preview
  offers `{festival}`, `{event_year}` and `{stage}`.
- All new texts in every UI language.

### Changed
- Library: the «By genre» checkbox became the «Group by» switch; a saved «By genre» choice is kept.

## [0.2.1] - 2026-11-17

### Highlights
- Readable release notes in the app: highlights first, all changes on demand
- The update dialog lists every skipped version with its own highlights, newest first
- Links in the release notes open in your system browser
- Release notes of every version are readable offline under Settings › Maintenance, with ‹ Older / Newer ›

### Added
- Settings › Maintenance › «Release notes»: browse the notes of every version from the CHANGELOG.md
  shipped with the app (offline), newest first, with ‹ Older / Newer ›, a version list and "x of n";
  the installed version is marked and shown first. Same calm view as the update dialog: highlights,
  «Show all changes» on demand. Bridge method `get_release_notes()`.
- Update check: when an update is available, one extra request to the GitHub release list fills in
  the notes and dates of all versions between the installed and the offered one (drafts and
  pre-releases are skipped; on any error only the offered release is shown). Without GitHub
  releases the sections of the tag's `CHANGELOG.md` are used. The list survives a restart while an
  update is ready.
- Bridge method `open_url(url)`: opens `https://` links on github.com (or the update repo's host) in
  the system browser; every other target is refused. In the app all `target="_blank"` links go
  through it.

### Changed
- Update dialog («Changes»): shows the version, its date and its highlights (at most 8 bullets)
  instead of the whole text; «Show all changes» expands the full notes, «Release on GitHub» opens
  the release page in the browser. Skipped versions are listed newest first.
- Release notes are rendered as Markdown (headings, lists, **bold**, `code`, tables, quotes, rules,
  `https://` links). All text is escaped; raw HTML and other link schemes are never rendered.
- CHANGELOG entries are written in English from this version on.

### Fixed
- Dialogs: Enter on a link or button inside the dialog text no longer triggers the primary button.

## [0.2.0] - 2026-11-17

Mehrsprachige Version. / Multilingual release.

**Highlights**
- 19 Sprachen, Englisch als Standard: Englisch, Deutsch (Schweizer Schreibweise), Chinesisch (vereinfacht), Hindi, Spanisch, Französisch, Bengali, Portugiesisch (Brasilien), Russisch, Indonesisch, Niederländisch, Flämisch (Belgien), Schwedisch, Norwegisch (Bokmål), Finnisch, Litauisch, Lettisch, Estnisch und Fränggisch (Spass-Dialekt). Wechsel sofort, ohne Neustart. / 19 languages, English default, live switching.
- Schriften je Schriftsystem (Devanagari, Bengalisch, Chinesisch, Kyrillisch …) und Layout für lange Texte. / Script-specific fonts.
- Installer: Seite «Datenschutz und Netzwerkzugriffe» mit abwählbarer Update-Prüfung beim Start. / Installer privacy page with an opt-out update-check checkbox.
- Automatische Releases: neue Version + CHANGELOG-Abschnitt auf `main` → Tag, Release und Assets. / Automatic releases from `main`.
- Öffentliche Roadmap (v0.2.0 – v0.10.0) im Wiki und als GitHub-Milestones; Wiki im App-Look. / Public roadmap and redesigned wiki.

### Added
- Mehrsprachige Oberfläche: Sprache unter Einstellungen › Allgemein
  (`general.language`, Standard Englisch, «Automatisch» = Windows-Anzeigesprache).
  19 Sprachen: Englisch, Deutsch (Schweizer Schreibweise), Chinesisch (vereinfacht), Hindi,
  Spanisch, Französisch, Bengali, Portugiesisch (Brasilien), Russisch, Indonesisch, Niederländisch,
  Flämisch (`nl-BE`, «Vlaams (België)»), Schwedisch, Norwegisch (Bokmål), Finnisch, Litauisch,
  Lettisch, Estnisch und Fränggisch (Spass-Dialekt; wird von «Automatisch» nie gewählt, fehlende
  Texte fallen auf Deutsch zurück). Der Wechsel wirkt sofort, ohne App-Neustart. / Multilingual UI:
  language picker in Settings › General, English default, 19 languages incl. Flemish and the
  Fränggisch fun dialect.
- Sprachkataloge können eine Rückfallsprache angeben (`_meta.fallback`, z. B. `de-x-frk` → `de`
  → `en`). Regionale Varianten wie `nl-BE` enthalten nur die abweichenden Texte (Rest aus `nl`);
  «Automatisch» wählt `nl-BE` bei belgisch-niederländischer Systemsprache.
- Installer: Seite «Datenschutz und Netzwerkzugriffe» nach der Ordnerwahl – beschreibt, welche
  Dienste HCLoader kontaktiert (GitHub/PyPI für Update-Prüfungen beim Start, YouTube/SoundCloud nur
  auf Aktion, keine Telemetrie) und bietet «Beim Start nach Updates suchen» zum Abwählen an
  (still: `/UPDATECHECK=0`). Die Wahl gilt für eine neue Konfiguration (`installer-defaults.json`),
  eine bestehende bleibt unverändert – bei einem Upgrade zeigt die Seite deshalb einen Hinweis statt
  der Checkbox. Weitere Installer-Sprachen: es, fr, pt-BR, ru, nl, fi, nb (sv,
  falls Inno Setup sie mitbringt).
- Release-Automatik: Ein Push auf `main` mit neuer Version (`__version__` ohne Tag) und
  CHANGELOG-Abschnitt `## [X.Y.Z]` erstellt nach erfolgreichem Build und Smoke-Test Tag, Release
  (Notizen aus dem CHANGELOG) und Assets (`docs/RELEASING.md`).
- Datum, Zahlen, Dauer und Dateigrössen im Format der gewählten Sprache (Intl).
- Meldungen des Backends (Validierung, Fehler, Toasts, Protokoll, Kommandozeile) in der gewählten
  Sprache. Leitfaden für Übersetzungen: `docs/TRANSLATING.md`.

### Changed
- Tests lesen Navigationstexte über `textContent` (die Navigation ist per CSS in Grossbuchstaben).
- Standardsprache ist Englisch, auch für bestehende Installationen ohne Spracheinstellung.
  Daten bleiben sprachneutral (Genre «Unsortiert», Ordner, Tags, Datenbank).

### Fixed
- Plural-Formen richten sich nach der Sprache, aus der ein Text tatsächlich stammt (fehlt eine
  Übersetzung, gelten die Regeln der Rückfallsprache, z. B. Englisch statt Russisch).
- Headless-Lauf: der Backoff-Hinweis erscheint in jeder Sprache nur einmal in der Lauf-Notiz.
- Portable-Version: der bgutil-PO-Token-Provider lief nach dem Verschieben bzw. Entpacken an einem
  anderen Ort nicht mehr (`Could not find package 'lru-cache'`). Der Provider wird jetzt mit dem
  hoisted Linker von Deno ohne Links installiert (`deno install --node-modules-linker=hoisted`, Deno ≥ 2.8) und
  nach jeder Installation geprüft (`scripts/hoisted_node_modules.py`). Bestehende Installationen werden
  bei `fetch_binaries.ps1` bzw. beim Selbst-Update neu aufgebaut; ein `deno.exe` älter als 2.8 wird ersetzt.

## [0.1.0] - 2026-11-17

Erste öffentliche Version. / First public release.

**Highlights**
- Entdecken: YouTube- und SoundCloud-Suche mit Filtern (Dauer, Jahr/Zeitraum, Keywords, Genre, Kanal-Blacklist), Duplikat-Erkennung über Plattformen.
- Watchlist für Kanäle, Playlists (auch rückwärts), SoundCloud-Künstler/-Sets und gespeicherte Suchen; Eingang, Auto-Download, In-App-Intervall und Windows-Aufgabenplanung (headless).
- Downloads: sequenzielle Warteschlange mit Fortschritt, Pausen, Lauf-/Tageslimits und Backoff pro Plattform (YouTube schonen).
- MP3 320 bzw. Original, ID3v2.4-Tags, quadratisches Cover, CUE und ID3-Kapitel; Ordnerstruktur für Plex/Jellyfin.
- Bibliothek mit eingebautem Mini-Player (Kapitel-Sprungmarken, Trackliste) oder Standardplayer, Genre per Klick ändern (Datei wird verschoben), Neu taggen, Löschen.
- Protokoll mit Lauf-Historie, Wartung (yt-dlp-Update, DB-Backups), Selbst-Update mit Rollback.
- Windows-Installer `HCLoader-Setup-0.1.0.exe` (pro Benutzer, ohne Admin-Rechte, Startmenü, Deinstallation) – empfohlen; Portable-ZIP als Alternative. / Windows installer (per user, no admin rights) – recommended; portable ZIP as alternative.
- Portable-Build mit eingebettetem Python, Setup per `setup.ps1`, Dark-Hardcore-UI mit App-Icon.


### Added
- Windows-Installer (Inno Setup 6, `installer/HCLoader.iss`): `HCLoader-Setup-<version>.exe` installiert
  pro Benutzer nach `%LOCALAPPDATA%\Programs\HCLoader` (ohne Admin-Rechte), mit Startmenü-Eintrag,
  optionaler Desktop-Verknüpfung, «HCLoader starten» am Ende und Deinstallation. Inhalt = Portable-Build
  ohne `portable.txt`, Daten daher in `%APPDATA%\HCLoader`. Ein neueres Setup installiert über die
  bestehende Version (schliesst HCLoader, ersetzt die Programmordner). Die Deinstallation entfernt den
  ganzen Programmordner (auch `_previous*`, Caches) und die geplante Aufgabe dieser Kopie, nie
  `%APPDATA%\HCLoader` oder die Musik. Das Selbst-Update erkennt installierte Kopien (Modus `installed`,
  pip im mitgelieferten Python wie bei der Portable-Version). `portable.yml` baut das Setup aus dem
  Portable-ZIP, prüft die Pfadlänge (MAX_PATH), testet Installation, Upgrade und Deinstallation und
  hängt das Setup bei Tags an das Release (inkl. `SHA256SUMS`).
- Selbst-Update von HCLoader über GitHub-Releases: Prüfung einmal pro Start (abschaltbar,
  `maintenance.check_app_updates_on_start`), Banner «Version x verfügbar – Herunterladen / Änderungen /
  Später», Download und Vorbereitung im Hintergrund erst nach Klick (Fortschritt), «Jetzt neu starten» bzw.
  Einspielen beim Beenden (`maintenance.apply_update_on_exit`). Updater `scripts/apply_update.ps1` mit
  Rollback, pip/`fetch_binaries.ps1` nur bei Bedarf, Daten und Musik bleiben unberührt; Git-Checkouts
  werden nur informiert. Abschnitt «App-Update» im Wartung-Tab, Repo als Setting `maintenance.update_repo`.
  Bridge `get_update_status`, `check_update`, `download_update`, `cancel_update`, `apply_update_now`,
  Events `update`, `update_progress`. Release-Ablauf in `docs/RELEASING.md`; `portable.yml` hängt bei Tags
  Portable-ZIP, Source-ZIP und `SHA256SUMS` an das Release.
- Automatische Sicherung vor jeder Datenbank-Migration (`backups/hcloader-premigrate-v<alt>-to-v<neu>-<ts>.db`,
  die 5 neuesten bleiben, eigene Rotation). Eine neuere Datenbank in einer älteren App zeigt eine klare
  Meldung statt eines Absturzes.
- Version zentral in `app/__init__.py` (`__version__`), `pyproject.toml` liest sie dynamisch.
- Phase 8 Player (Backend): Einstellung `player.mode` (`internal`/`external`, Default `internal`), Bridge
  `get_media(id)` (prozentkodierte `file:`-URL, Cover-Cache unter `cache/covers/`, Kapitel aus Sidecar > ID3 CHAP > CUE)
  und `play_external(id)` (Standardplayer). Nur lokale Dateien innerhalb des Zielordners, kein Netzwerk.
- `--smoke` nimmt SoundCloud-Permalinks an (auflösen über den Throttle, dann Download per ID).
- yt-dlp-Cache im Datenordner (`cache/yt-dlp`); `curl-cffi` als Extra von yt-dlp (Impersonation gegen
  SoundCloud-403).
- Phase 7a SoundCloud als zweite Plattform (Backend): Suche `scsearch` (`search(query, {platform})`),
  Watchlist-Quellen `soundcloud.com/<nutzer>` (liest `/tracks`, neueste zuerst, inkrementell),
  `…/sets/<set>` (inkl. «Neueste stehen hinten») und SoundCloud-Suchquellen, Download mit eigenem
  Throttle (Zähler, Backoff, Pausen, Prozess-Locks pro Plattform; ein 429 von SoundCloud sperrt
  YouTube nicht und umgekehrt, die Warteschlange lädt die freie Plattform weiter). DB-Migration 5
  (`platform`, `url`, `channel_url`, `preview`, `sources.platform`, `sources.name_auto`), IDs `sc:<id>`,
  Dateiname `[sc-<id>]`, Archiv `soundcloud <id>`, Tags `TXXX:SOUNDCLOUD_ID` / `SOURCE=SoundCloud`,
  Platzhalter `{platform}`. Go+-Vorschauen werden verworfen («Nur Vorschau (Go+)»). Vermutliche
  Duplikate über Plattformen (`duplicate_of`, Option `filters.hide_cross_platform_duplicates`), nie
  automatisch geladen. Einstellungen `soundcloud.*`, `download.keep_original_soundcloud`.
  `get_status().platforms`, `clear_backoff(platform?)`, `get_queue().platform_blocked`.
  Erweiterte SoundCloud-Extractoren für flache Listen: Metadaten ohne Zusatz-Request, kein
  HEAD-Request pro Treffer.
- Quellen-Namen automatisch vorschlagen: `suggest_source(url_or_query, type_hint?)` (ohne Netzwerk),
  `sources.name_auto`; die nächste Prüfung ersetzt einen unveränderten Vorschlag durch den echten
  Kanal-/Nutzer-/Playlist-Namen aus der flachen Liste (Event `source` mit `name`).
- Phase 6 Portable-Version: `scripts/build_portable.ps1` baut `dist\HCLoader\` (Windows-embeddable-Python
  3.12 amd64 mit pip, Abhängigkeiten, App, `bin\` mit Deno/ffmpeg/bgutil-Provider, Lizenzen) und mit
  `-Zip` `HCLoader-portable-<version>-win64.zip`. Starter `HCLoader.vbs` (ohne Konsole),
  `HCLoader-Konsole.cmd` (Fehlersuche), `Verknuepfung-erstellen.cmd`. Portable-Modus über
  `portable.txt`: Daten in `<App>\data\` (Reihenfolge `HCLOADER_HOME` > Portable > `%APPDATA%`),
  relativer Zielordner relativ zum App-Ordner. Update-Knopf aktualisiert das eingebettete Python.
  Aufgabenplanung erkennt einen verschobenen App-Ordner (`path_mismatch`, Hinweis + «Aufgabe neu
  anlegen», Toast beim Start). Download-Markierung (Mark of the Web) der .NET-DLLs wird beim Start
  entfernt. `get_versions` liefert `app_dir`/`portable`. Workflow `.github/workflows/portable.yml`
  (Tags `v*`, manuell, Arbeitsbranch) mit Rauchtests vor und nach dem Verschieben, ZIP als Artefakt.
  `fetch_binaries.ps1` mit `-BinDir`/`-Python`/`-LicenseDir`.

### Fixed
- Review Phase 7a/8/Selbst-Update: **M1** ein geo-gesperrter SoundCloud-Track (`policy: BLOCK`) bricht
  Suchen, Nutzer-Listen und Sets nicht mehr ab, er erscheint mit Filtergrund «Nicht verfügbar (Region)»
  (`videos.geo_blocked`, DB-Migration 6); **M2** Fähigkeitsprüfung der yt-dlp-SoundCloud-Interna
  (Methoden, Attribute, Signaturen) und Rückfall auf das Originalverhalten bei Laufzeitabweichungen;
  **M3** SoundCloud-403 nach dem client_id-Refresh (Datadome) gilt als Bot-Prüfung → Backoff nur für
  SoundCloud (404/CDN-403 nicht); **M4** Updater prüft vor jeder Änderung per Rename-Probe, ob alle
  Einträge verschiebbar sind, und trägt Einträge vor dem Verschieben ins Rollback-Journal ein.
  **m1** kein Updater-Start beim Abmelden/Herunterfahren; **m2** Journal `in_progress.json` +
  Wiederherstellung (`-Recover`) beim nächsten Start, `_previous` bleibt nach einem nicht sauberen Lauf
  erhalten; **m3** Updater wartet auf einen laufenden Headless-Lauf (Lauf-Lock); **m4** SoundCloud-`resolve`
  ohne Extractor-Retry; **m5** Backoff-Stufe pro Plattform nach erfolgreicher Watchlist-Prüfung
  zurückgesetzt, Headless-Exit-Code ohne abgeschaltete Plattformen; **m6** Download-Adressen nur https auf
  GitHub-Hosts, `SHA256SUMS` fail-closed, Banner «ohne Prüfsumme»; **m7** fremdes `update_repo` im Banner;
  **m8** Neustart mit `-X utf8`; **m9** `fetch_binaries.ps1`/`build_portable.ps1`: Längenprüfung gegen
  Content-Length, relative Pfade gegen `$PWD`. Nits: `wiki.yml` nur `main`, `portable.yml` ohne
  Arbeitsbranch, Manifest im `try`, `update.lock` als Lebenszeichen, lange Pfade beim Löschen von `_previous`.
- Windows-CI: Prozess-Locks (Named Mutex) nie besessen, Freigabe per `CloseHandle` aus jedem Thread,
  zusätzlich prozessintern exklusiv; Tests plattformneutral (Pfadtrenner, `?` in Dateinamen,
  Gross/Klein-Dateisystem, Loopback, Zeitstempel kurz nach 1970).
- QA 7a/8: `enqueue` lehnt Go+-Vorschauen und regionsgesperrte Tracks ab (`skipped_unloadable`);
  Update-Banner als Leiste über dem Inhalt (verdeckt keine Knöpfe mehr); Meldung «neuere Datenbank»
  nur einmal auf stderr.
- Review Phase 5: **M1** Neu-Taggen behält fremde ID3-Frames (BPM, Key, Rating, ReplayGain, Lyrics …);
  **m1** zu langer Pfad beim Neu-Taggen als saubere Fehlermeldung; **m2** nicht erreichbarer Zielordner
  (`get_library_status`, `unknown`, Banner, Timeout-Prüfung); **m3** «Nur Eintrag entfernen» für Dateien
  ausserhalb des Zielordners; Hinweise n1-n7, n12, n13 (gemeinsamer Dateisperre, .cue vor MP3, Gross/Klein-
  Umbenennung, Aufräumen nach fehlgeschlagenem Verschieben, desktop.ini/Thumbs.db, Backup-Namensmuster,
  lesbarer Job-Name, Sidecar-Name mit Hash, CI `HCLOADER_REQUIRE_NETWORK`). UI: Felder «Zielordner»/«Pfadmuster»
  volle Breite, Trefferzeile ohne Umbruch, Bibliothek-Grösse unter 1 MB in KB.

### Added
- Phase 5 Backend: Bibliothek (`core/library.py`: `get_library(filters)` mit Suche/Genre/Kanal/Jahr/
  `missing`, `open_folder` mit Explorer-Markierung, `retag` ohne Netzwerk inkl. Verschieben nach
  aktuellem Pfad-Template, `delete_library_item` mit Pfadprüfung und Aufräumen), Metadaten-Sidecar
  (`<app_home>/meta/<id>.json`), Protokoll (`get_log(filters)`, Log-Historie aus der Logdatei, `Run.duration`,
  Event `run`), gültige CUE-Dateien (Raster, erster Track 0, max. 99 Tracks, Kapitel hinter dem Ende
  verworfen), DB-Backup-Aufbewahrung (letzte 10), `run_update(executable=…)` auf fremdem venv,
  Abnahmetests (CUE-Validator, echtes venv-Update mit Marker `network`). `next_run` der Aufgabe aus
  `schtasks /Query /XML` (Review Phase 2 n7).
- Phase 4 Backend: Watchlist (`core/watchlist.py`: inkrementelle Prüfung bis zum ersten bekannten
  Video, Filter, Eingang bzw. Auto-Download, Backoff bricht den Lauf ab), API `save_source`,
  `check_sources` (Events `source`, `watchlist_done`), `get_inbox`, In-App-Intervall
  (`WatchlistScheduler`, `Status.next_check`), Headless-Lauf `--headless --run-watchlist`
  (`app/headless.py`, Exit-Codes 0/1/2/3/4, ein `headless`-Run-Eintrag, PO-Token-Server selbst
  starten/stoppen, `max_downloads_per_run`), Watchlist-Lock.
- Aufgabenplanung per XML (`StartWhenAvailable`, Akku erlaubt, `IgnoreNew`, 6 h; Review Phase 2 n6).

- Playlist-Option «Neueste stehen hinten» (`Source.newest_last`, DB-Migration 3): liest die letzten
  N Einträge rückwärts (`playlist_items "-1:-N:-1"`), damit neue Videos am Ende langer Playlists
  gefunden werden; kostet ca. 1 Request pro 100 Einträge (siehe `docs/decisions.md`).

### Changed
- Review Phase 1: **N3** Mutex im Namensraum `Global\` (Rückfall `Local\`, dann Datei-Lock);
  **N5** Request-Abstand, Suchzähler und Backoff-Eskalation prozessübergreifend (DB-State unter
  Datei-Lock).
- Review Phase 3 Runde 2: **R2-m1** Request-Abstand nach dem Warten auf den Metadaten-Lock erneut
  erzwungen; **R2-n1** `url`/`url_transparent` werden abgelehnt; **R2-n2** Metadaten-Lock
  prozessübergreifend; **R2-n3** `redact` für `@` im Passwort und Proxys ohne Schema; **R2-n4**
  Shutdown vor `activation.stop()`; n5/n7 zurückgestellt (docs/decisions.md).

### Fixed
- Review Phase 4:
  - **M1** Die Watchlist bricht nur noch bei Videos ab, die **diese Quelle** schon gesehen hat
    (DB-Migration 4 `source_videos`). Aus einer Suche oder einer anderen Quelle bekannte Videos werden
    übersprungen und, falls noch `new` und passend, in den Eingang bzw. die Queue gelegt. Die erste
    Prüfung einer Quelle bricht nie ab.
  - **m1** Headless (HTTP-Modus) benutzt den PO-Token-Server der offenen GUI mit, statt mit Exit 1 abzubrechen.
  - **m2** Die geplante In-App-Prüfung zeigt keinen Toast, wenn die Aufgabe gerade prüft, sondern wartet
    10 min. Der Laufmarker `watchlist_running_since` wird beim Start gesetzt.
  - **m3** `watchlist_last_run` nur nach mindestens einer erfolgreichen Quelle, sonst neuer Versuch nach 1 h.
  - **m4** `newest_last` mit harter Grenze von 2000 Einträgen (Fehler «Playlist zu lang …»).
    Suchquellen max. 100 Einträge. Der Request-Abstand zählt ab dem Ende einer mehrseitigen Liste.
  - **m5** Kanal-URLs nur Root, `/videos`, `/streams`.
  - **n1–n8** Backoff-Reset unter Prozess-Lock, Mutex-`restype`/`get_last_error`, Toast maskiert,
    `StartBoundary` in der Zukunft, Abbruch erreicht laufende Listen und schliesst den Run, Auto-Download
    zuerst im Eingang, `max_entries` leer = Default aus den Einstellungen, Premieren/Livestreams werden
    neu bewertet.
  - QA: Die Headless-Notiz beim Lauf-Limit lautet «Rest wird beim nächsten Lauf geladen».
  - Tests gehen nie mehr ins Netz: Playwright-Chromium läuft offline, und eine autouse-Sperre für
    Nicht-Loopback-Verbindungen gilt ausser bei Tests mit Marker `network`.
- Review Phase 3:
  - **M1** Das Genre aus dem Such-Chip bleibt bis in Datei, TCON, Zielordner und DB erhalten:
    `YtClient._finish` nimmt das gespeicherte, nicht manuelle Genre, wenn die Keywords nichts
    entscheiden (manuell > Quelle > Keyword > Chip > Unsortiert; unbekannte Genres fallen auf
    «Unsortiert»). Suchen ändern das Genre von Einträgen in `queued`/`downloading`/`done` nicht
    mehr; die Suche berücksichtigt den Quellen-Default (Phase 4).
  - **m1** Einstellungen übernehmen das Ergebnis von `get_task_status` (`true`/`false`) in
    Formular, gespeicherten Stand und `HC.settings.values`; eine extern gelöschte Aufgabe wird
    nicht mehr still neu angelegt. `null` ändert nichts, ungespeicherte Eingaben bleiben.
  - **m2** Lokale Fehler blockieren die Warteschlange statt Einträge `failed` zu setzen:
    PO-Token-Server nicht bereit (`blocked_code: "pot"`), Zielordner nicht erreichbar oder nicht
    beschreibbar (`"target"`). Einträge bleiben `queued`, kein Lauf-Eintrag, nichts gezählt, keine
    Pause. Beim Start im HTTP-Modus wartet die Queue bis 20 s auf den ersten Watchdog-Check.
    Die Pause zwischen Downloads gilt nur noch nach einem echten Request. UI: Hinweise mit Link
    zu den passenden Einstellungen.
  - **m3** Der Download-Client wird vor dem Lauf erzeugt; schlägt das fehl (z.B. defektes
    yt-dlp), blockiert die Queue mit `blocked_code: "error"`, ohne Lauf-Eintrag und ohne
    30-s-Schleife. Neuer Versuch nach «Fortsetzen», `enqueue` oder Speichern der Einstellungen.
  - **m4** YouTube-Metadaten-Lock (`Throttle.metadata_lock`): Suche, Quellenliste, Auflösen und
    die Extraktion eines Downloads laufen nie gleichzeitig. Der Download gibt den Lock vor der
    Medienübertragung frei (`extract_info(process=False)` + `process_ie_result`). Eine Suche wartet
    max. 60 s, sonst «Download-Abfrage läuft gerade – bitte gleich erneut versuchen».
  - **m5** Beim Beenden wartet HCLoader bis 60 s auf den Queue-Thread (laufender Download wird
    abgebrochen, Eintrag bleibt `queued`) und schliesst die DB erst danach. Endet der Thread
    nicht (lange Konvertierung), bleibt die DB offen und der Eintrag wird auf `queued` gesetzt.
  - **m6** `video`-Event auch, wenn der Throttle einen Download ablehnt (Karte zurück auf
    «wartend»).
  - **m7** `enqueue` und `move_in_queue` laufen in einer Transaktion (`Database.transaction`).
  - **n1** `Video.is_live` (bool); die UI erkennt Livestreams nicht mehr am Text von
    `filter_reason`.
  - **n2** `YtdlpGate`: Update und Suche sperren sich gegenseitig ohne Prüf-Lücke.
  - **n3** `queue_cancel` meldet `{ok:false, error:"Download bereits fertig"}`, wenn der
    Download schon fertig ist oder seinen letzten Schritt (Verschieben) erreicht hat.
  - **n4** Zugangsdaten in URLs (Proxy `user:pass@`) werden in Fehlertexten und allen Logs
    maskiert (`app/core/redact.py`, `RedactingFormatter`).
  - **n6** `.part`/`.ytdl`-Reste in `<Ziel>/.tmp`, älter als 7 Tage, werden beim Start
    aufgeräumt, ausser sie gehören zu einem Eintrag in der Warteschlange (wartend, aktiv oder
    fehlgeschlagen).

### Added
- Phase 3b Integration Entdecken & Downloads: `search(query, opts)` über einen eigenen
  Such-Worker (Throttle, deutsche Meldungen inkl. «wieder möglich ab …»), Treffer in der DB
  (Status `new`, Genre-Erkennung, `filter_reason`, `hidden_count`), `get_last_search` aus der DB;
  Download-Warteschlange `worker.DownloadQueue` (ein aktiver Download, eigener Thread, Reihenfolge
  persistent über DB-Migration 2 `videos.queue_pos`/`date_approx`, Pausieren persistent,
  Verschieben, Abbrechen auch während der Throttle-Pause, manuelles Wiederholen, Lauf-/Tageslimit
  und Backoff mit `blocked_reason`/`blocked_code`, Lauf-Einträge `manual`); Events `progress`
  (`sleep` mit Countdown, `download`, `convert`, `tag`), `done`, `failed`, `queue`, `video`;
  `enqueue`, `add_channel_source`; `Throttle.download_wait()`/`wait_between_downloads()`/
  `search_available_at()`; Integrationstest Suche → Filter → Queue → Download → Tags → DB.
- Fixes (Review Phase 2): yt-dlp wird in der GUI erst bei Bedarf importiert, nach einem Update
  mit geladenem yt-dlp blockiert «Neustart nötig» Queue und Suche (m2); Wartungsaufträge melden
  sofort «Wartung läuft gerade (…)» bzw. eine Zeitüberschreitung (m3); nur der Event-Dispatcher
  ist im UI-Log stumm, Worker-/Watchdog-/Queue-Meldungen sind sichtbar (m4);
  `get_task_status` speichert bei unbekanntem Status nichts und liefert `error` (m5);
  Speicherfehler der Config werden deutsch gemeldet, die Windows-Aufgabe wird erst nach
  erfolgreichem Speichern angelegt/entfernt, sonst zurückgerollt (m8); PO-Token-Server mit
  `--host 127.0.0.1`, Windows Job Object (Kill-on-close) gegen verwaiste deno-Prozesse,
  belegter Port wird gemeldet statt übernommen (m11); Worker vergisst erledigte Aufträge vor dem
  Auflösen (n3); Startfehler der GUI landen im Log und unter Windows in einer MessageBox (n4).
- Phase 3a Backend Entdecken: Einstellungen `search.append_year`, `filters.upload_period` (`year`, `custom`),
  `upload_year`, `upload_from`, `upload_to` mit Validierung; Jahr-/Zeitraum-Filter (Jahr im Titel,
  ungefähres Datum ±1 Jahr) in `filters.passes`; `ytclient.search(query, n, genre=, year=)` und
  `build_search_query`; `approximate_date` für flache Abfragen (`date_approx` am Video);
  `YtClient(pot_server=...)` für extern verwalteten PO-Token-Server.
- Fixes (Review Phase 2): Update-Timeout greift wirklich (m1), Aufgabenplanung unterscheidet
  «nicht registriert» von «Status unbekannt» (m6), Datumsparsing tag-zuerst (m7), Update nur in
  venv (n5).
- Projektgerüst, Konfiguration (YAML/pydantic), SQLite-Schema mit Migrationen.
- Kernmodule: Pfade, Filter, Genre-Erkennung, Throttle mit Backoff, Logging.
- CI-Workflow (Windows, ruff, pytest).
- Kern-Download: `ytclient` (Suche, Quellenliste, Auflösen, Download-Pipeline mit Archiv, Throttle,
  Backoff, Abbruch), `binaries` (deno/ffmpeg/Provider-Status, HTTP-Provider-Kindprozess),
  `tagging` (ID3v2.4, Cover quadratisch, CUE, CHAP/CTOC; m4a/opus).
- CLI `python -m app.main --smoke <URL>`; Stub für `--headless --run-watchlist`.
- `scripts/setup.ps1` und `scripts/fetch_binaries.ps1` (venv, deno, ffmpeg, bgutil-Provider, Verknüpfung).
- README.
- Phase 2 Integration: `app/api.py` (js_api, Methoden exakt wie `ui/js/bridge.js`), `app/worker.py`
  (EventBus → `window.mv.emit`, Hintergrund-Worker, `run_session` für Download-Läufe,
  PO-Token-Watchdog, Live-Log als `log`-Events), `run_gui()` mit pywebview-Fenster
  (1440×900, min. 1100×700, `#08080a`), Single-Instance-Aktivierung (zweiter Start holt das Fenster
  nach vorne, `app/instance.py`).
- Einstellungen speichern/zurücksetzen mit deutschen Feldmeldungen (`section.key`,
  `genres.items.<i>.<feld>`), sofort wirksam (Throttle, Log-Stufe, PO-Token-Server).
- Statusleiste mit echten Werten (Versionen, Deno/ffmpeg, PO-Token-Status, Backoff, Zähler, Queue,
  Eingang, nächste geplante Prüfung).
- Wartung: yt-dlp & Plugin per pip aktualisieren, tägliche Update-Prüfung (PyPI), DB-Sicherung
  (`backups/hcloader-<Zeit>.db`), PO-Token-Test ohne YouTube-Request (`app/core/maintenance.py`,
  `app/core/potoken.py`, `app/core/status.py`).
- Windows-Aufgabenplanung anlegen/prüfen/entfernen (`app/core/scheduler.py`,
  `scripts/run_watchlist.pyw`).
- `docs/bridge-api.md`: Methoden, Rückgaben, Events, Phase-Status.

### Fixed
- Review Phase 1: `download()` akzeptiert nur Einzelvideos (Playlist-/Kanal-/Such-URLs werden vor dem Throttle abgelehnt).
- Migrationen atomar (kein `executescript`), Rollback-Test.
- Download-Archiv wird erst nach `done` von HCLoader geschrieben; hängende `downloading`-Zeilen werden beim Start auf `failed` ("Unterbrochen") gesetzt.
- Throttle thread-sicher; Pause zwischen Downloads zentral erzwungen (persistiert, abbrechbar); Fehlversuche zählen gegen Lauf-/Tageslimit; `finish_run(success)` setzt den Backoff zurück.
- 429/Bot-Check als yt-dlp-Warnung löst den Backoff aus; Abbruch setzt den vorherigen Status zurück ("Abgebrochen"); `.part` bleibt für Wiederholungen erhalten; Schritte nach dem Verschieben sind nicht mehr fatal.
- Pfadlänge in UTF-16-Einheiten, `CONIN$`/`CONOUT$` reserviert; CUE mit UTF-8-BOM; unlesbare `config.yaml` wird als `.bak-<Zeitstempel>` gesichert.
- HTTP-PO-Token-Server: Warten auf `/ping` (10 s); TOKEN_TTL in ganzen Stunden.
- Echte Single-Instance und Lauf-Lock (`app/core/locks.py`); `setup.ps1` wählt Python 3.13/3.12/`py -3` (>= 3.12); `fetch_binaries.ps1` prüft SHA256 und kopiert statt zu verschieben; `.gitignore` ergänzt.

### Changed
- `yt-dlp[default]` (enthält yt-dlp-ejs) in den Abhängigkeiten.
- `bridge.js`: Live-Modus erst, wenn die pywebview-API-Funktionen existieren; mit `?host=pywebview`
  kein Mock-Fallback nach 1,2 s (Wartezeit 30 s).
- Validierung: Maximaldauer muss ≥ Mindestdauer sein (0 = unbegrenzt); doppelte Genre-Namen werden
  zusätzlich an der Zeile gemeldet. Live-Log-Einträge tragen optional `ui_level` (z.B. `ok`).
