/* HCLoader UI texts – English (reference catalog – every key starts here).
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "en", "name": "English", "dir": "ltr", "intl": "en"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "HARD MUSIC ARCHIVE",
    "mock": "MOCK MODE"
  },
  "nav": {
    "discover": "Discover",
    "inbox": "Inbox",
    "watchlist": "Watchlist",
    "downloads": "Downloads",
    "library": "Library",
    "log": "Log",
    "settings": "Settings"
  },
  "navfoot": {
    "today": "TODAY",
    "next": "NEXT CHECK"
  },
  "common": {
    "ok": "OK",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "remove": "Remove",
    "reset": "Reset",
    "on": "on",
    "off": "off",
    "current": "current",
    "loading": "loading …",
    "add_chip": "+ add",
    "empty": "“empty”",
    "empty_list": "“none”"
  },
  "fmt": {
    "today": "today",
    "yesterday": "yesterday",
    "never": "never",
    "no_date": "Date unknown",
    "just_now": "just now",
    "today_at": "today {t}",
    "tomorrow_at": "tomorrow {t}",
    "yesterday_at": "yesterday {t}",
    "views": {
      "one": "{v} view",
      "other": "{v} views"
    }
  },
  "unit": {
    "s": "s",
    "h": "h",
    "minutes": "minutes",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "characters",
    "results": "results",
    "entries": "entries",
    "clock": "o’clock"
  },
  "range": {
    "ge_sleep": "≥ minimum",
    "ge_initial": "≥ initial value"
  },
  "status": {
    "new": "New",
    "inbox": "In inbox",
    "queued": "Queued",
    "downloading": "Downloading",
    "done": "Downloaded",
    "ignored": "Ignored",
    "failed": "Error"
  },
  "period": {
    "all": "All",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "1y": "Last 12 months",
    "year": "Specific year",
    "custom": "Custom"
  },
  "source_type": {
    "channel": "Channel",
    "playlist": "Playlist",
    "search": "Search"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Platform",
    "sc_off": "SoundCloud is turned off – turn it on under Settings › SoundCloud."
  },
  "genre": {
    "change": "Change genre",
    "manual": "Genre set manually",
    "change_manual": "Change genre (set manually)"
  },
  "run_kind": {
    "watchlist": "Watchlist",
    "headless": "Task Scheduler",
    "manual": "Manual"
  },
  "phase": {
    "waiting": "Waiting",
    "sleep": "Pause until the next download",
    "download": "Downloading",
    "convert": "Converting",
    "tag": "Tagging",
    "failed": "Failed"
  },
  "po_mode": {
    "off": "Off",
    "script": "Script",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "Off",
    "script": "Script (Deno)",
    "http": "HTTP server (local)"
  },
  "statusbar": {
    "ok": "OK",
    "missing": "missing",
    "po": "PO token",
    "po_active": "active ({mode})",
    "po_inactive": "inactive",
    "po_error": "Error",
    "backoff": "Backoff",
    "backoff_none": "none",
    "backoff_until": "until {t} · {rest} left",
    "queue": "Queue",
    "queue_empty": "empty",
    "queue_active": "active",
    "queue_paused": "paused",
    "today": "Today",
    "next": "Next check",
    "next_off": "off",
    "backoff_until_short": "until {t}",
    "sc_backoff": "Backoff until {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · downloaded today {day}/{day_max} · {s}/{s_max} searches this hour",
    "sc_tip": "SoundCloud · downloaded today {day}/{day_max} · {s}/{s_max} searches this hour",
    "backoff_tip": "{p}: backoff until {t} ({rest} left)"
  },
  "schedule": {
    "due": "due",
    "kind_app": "App",
    "kind_task": "Task",
    "tip_app": "Next watchlist check in the app: {t} (while HCLoader is running).",
    "tip_task": "Next watchlist check via the Windows Task Scheduler: {t}.",
    "tip_any": "Next watchlist check: {t}.",
    "tip_off": "No automatic check – neither in the app nor via the Windows Task Scheduler.",
    "tip_backoff": "No checks while the backoff is active."
  },
  "card": {
    "source": "Found via the watchlist source “{name}”",
    "select": "Select",
    "open": "Open on {p}",
    "ignore": "Ignore",
    "unignore": "Stop ignoring",
    "more": "More actions",
    "download": "Download",
    "watch": "Add channel to watchlist",
    "block": "Block channel",
    "set_genre": "Set genre",
    "date_approx": "Approximate date – YouTube search only returns “X years ago”",
    "date_unknown": "No upload date provided",
    "duplicate": "Probably already downloaded ({p})",
    "duplicate_title": "Very similar title and same duration as “{title}” from {p} – already downloaded or queued there. You can still download it.",
    "preview": "Preview only (Go+) – cannot be downloaded",
    "preview_title": "SoundCloud only provides a 30-second preview (Go+) for this track. It cannot be downloaded."
  },
  "discover": {
    "placeholder": "Search for mix, live set, DJ, event …",
    "search": "Search",
    "searching_btn": "Searching …",
    "searching": "Searching – flat query, easy on YouTube …",
    "sort": "Sort",
    "sort_rel": "Relevance",
    "sort_date": "Newest first",
    "sort_dur": "Longest first",
    "sort_views": "Most views",
    "quota": "Searches this hour: {n} / {max}",
    "quota_sc": "SoundCloud searches this hour: {n} / {max}",
    "placeholder_sc": "Search SoundCloud: mix, set, DJ, podcast …",
    "platform_title": "Where to search",
    "searching_sc": "Searching – flat query, easy on SoundCloud …",
    "ready_text_sc": "Enter a search term and press Enter to search SoundCloud.",
    "previews": "{n} preview only (Go+)",
    "previews_title": "Go+ previews can never be downloaded. Visible when “Hide downloaded & ignored” is off.",
    "filters": "Filters",
    "toggle_filters": "Show/hide filter panel",
    "f_duration": "Duration (minutes)",
    "f_min": "Minimum",
    "f_max": "Maximum (empty = no limit)",
    "f_max_ph": "max",
    "f_period": "Upload period",
    "f_year": "Year",
    "f_year_prev": "One year back",
    "f_year_next": "One year forward",
    "f_from": "From",
    "f_to": "To",
    "f_hint_year": "YouTube search only returns an approximate date (“13 years ago”). So ±1 year counts – and so does every mix with “{year}” in the title.",
    "f_hint_custom": "YouTube search only returns an approximate date. For approximate dates, ±1 year tolerance applies at both ends.",
    "chip_title": "Click: show/hide genre · Double-click: this genre only (its terms are appended to the search)",
    "scope": "Search extended by",
    "scope_title": "The next search appends these terms to your search text.",
    "searched": "Searched with",
    "stale": "Filters changed since",
    "re_search": "Search again",
    "re_search_title": "The results come from the last search. Search again so genre and year are included in the search term (counts as one search).",
    "need_query": "Please enter a search term first.",
    "f_inc": "Include keywords",
    "f_exc": "Exclude keywords",
    "f_show": "Display",
    "f_hide": "Hide downloaded & ignored",
    "f_blacklist": "Apply channel blacklist",
    "count": {
      "one": "{n} result · {hidden} filtered out",
      "other": "{n} results · {hidden} filtered out"
    },
    "selected": "{n} selected",
    "select_all": "Select all",
    "download_sel": "Download selection",
    "ready_title": "Ready",
    "ready_text": "Enter a search term and press Enter.",
    "none_title": "Nothing found",
    "none_text": "Loosen the filters or try other search terms.",
    "none_year": "No result from {year}. Search again so the year is included in the search term – or change the year."
  },
  "inbox": {
    "title": "Inbox",
    "sub": "New watchlist hits that pass all filters",
    "sub_n": {
      "one": "{n} new watchlist hit that passes all filters",
      "other": "{n} new watchlist hits that pass all filters"
    },
    "ignore_all": "Ignore all",
    "download_all": "Download all",
    "ignore_sel": "Ignore selection",
    "download_sel": "Download selection",
    "select_all": "Select all",
    "select_none": "Clear selection",
    "src_all": "All sources",
    "src_none": "No source",
    "src_title": "Only show hits from this source",
    "count": {
      "one": "{n} hit",
      "other": "{n} hits"
    },
    "count_of": "{n} of {total} hits",
    "selected": "{n} selected",
    "empty_title": "Inbox empty",
    "empty_text": "The watchlist has not found any new mixes.",
    "empty_nosrc": "No sources in the watchlist yet – add a channel, playlist or search and new mixes will land here.",
    "empty_next": "Next check: {t}.",
    "to_watchlist": "Go to watchlist"
  },
  "watchlist": {
    "title": "Watchlist",
    "sub_n": {
      "one": "{n} source · {active} active",
      "other": "{n} sources · {active} active"
    },
    "sub_next": "next check {t}",
    "add": "Source",
    "check_all": "Check all now",
    "check": "Check",
    "checking": "checking …",
    "queued": "waiting …",
    "running": "Checking …",
    "running_n": "Checking {i} / {n} …",
    "col_active": "Active",
    "col_name": "Name",
    "col_type": "Type",
    "col_genre": "Genre",
    "col_auto": "New hits",
    "col_max": "Max.",
    "col_last": "Last checked",
    "col_new": "New",
    "genre_auto": "automatic",
    "genre_auto_long": "Automatic (from keywords)",
    "auto_on": "download",
    "auto_off": "inbox",
    "auto_title_on": "New hits are downloaded automatically",
    "auto_title_off": "New hits only go to the inbox",
    "new_title": "Show in inbox",
    "check_title": "Check this source now",
    "why_off": "Source is not active",
    "why_running": "A check is already running",
    "why_backoff": "Backoff active – checking is blocked",
    "why_backoff_p": "Backoff ({p}) active – checking is blocked",
    "why_sc_off": "SoundCloud is turned off",
    "error_title": "Last check failed",
    "backoff": "<b>Backoff active until {t}</b> ({rest} left). The watchlist cannot be checked – scheduled checks are paused as well.",
    "backoff_p": "<b>Backoff ({p}) active until {t}</b> ({rest} left). {p} sources are skipped until then – {other} keeps running.",
    "backoff_link_sc": "Open SoundCloud",
    "backoff_link": "Open Throttling",
    "none_active": "No active source to check",
    "empty_title": "No sources",
    "empty_text": "Add a channel, playlist or saved search.",
    "add_title": "Add source",
    "edit_title": "Edit source",
    "f_type": "Type",
    "f_name": "Name",
    "f_url": "URL",
    "f_query": "Search term",
    "f_genre": "Default genre",
    "f_max": "Max. entries",
    "f_newest_last": "Newest are at the end (read playlist backwards)",
    "hint_newest_last": "For many playlists YouTube appends new videos at the end. Reads the whole playlist (about 1 request per 100 videos, max. 2000 entries).",
    "rev_title": "Newest are at the end – the playlist is read from the end",
    "rev_short": "backwards",
    "f_enabled": "Active – include in “Check all” and in the schedule",
    "f_hits": "New hits",
    "hits_inbox": "To the inbox",
    "hits_auto": "Download automatically",
    "hint_inbox": "Hits wait in the inbox until you download or ignore them.",
    "hint_auto": "Hits that pass all filters go straight to the queue.",
    "hint_channel": "YouTube channel (…/@name or …/channel/UC…, optionally /videos or /streams) or SoundCloud profile (soundcloud.com/name).",
    "hint_playlist": "YouTube playlist with “list=…” or SoundCloud set (soundcloud.com/name/sets/set). The newest entries are checked.",
    "f_platform": "Search on",
    "detected": "detected: {p} · {type}",
    "not_detected": "URL not recognized",
    "suggested": "Suggestion",
    "suggested_title": "Suggested from the URL. If left unchanged, the first check replaces it with the real name – or simply overwrite it.",
    "hint_name_auto": "Suggested from the URL – feel free to change it. If unchanged, the first check sets the real name.",
    "hint_name_later": "The name is set by the first check – or enter it here yourself.",
    "name_auto_title": "Provisional name – the next check sets the real one",
    "hint_search": "Saved search, like under “Discover” – counts as one search per check.",
    "hint_max": "per check",
    "max_default": "(default)",
    "max_default_title": "No own value: “Entries per source” from Settings › Schedule applies",
    "max_title": "Empty = default from Settings › Schedule. At most 200, 100 for search sources.",
    "ph_name": "e.g. Gabber Vault",
    "ph_name_later": "set by the first check",
    "ph_channel": "https://www.youtube.com/@channel  or  https://soundcloud.com/name",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  or  https://soundcloud.com/name/sets/…",
    "ph_search": "e.g. frenchcore liveset",
    "form_error": "The source could not be saved."
  },
  "downloads": {
    "title": "Downloads",
    "sub": "Sequential, one download at a time",
    "pause": "Pause",
    "resume": "Resume",
    "cancel": "Cancel",
    "retry": "Retry",
    "remove": "Remove",
    "up": "Move up",
    "down": "Move down",
    "eta": "ETA",
    "position": "Position {n}",
    "sleep_left": "continues in",
    "sleep_why": "Throttling: random pause of {min}–{max} s between two downloads",
    "next_up": "Up next",
    "sleeping": "Pausing",
    "sleep_range": "of {min}–{max} s",
    "blocked_wait": "Waiting – {why}",
    "why_backoff": "Backoff",
    "why_day": "Daily limit",
    "why_run": "Run limit",
    "why_paused": "paused",
    "why_restart": "Restart required",
    "why_busy": "another run active",
    "why_pot": "PO token server not ready",
    "why_target": "Target folder unreachable",
    "why_error": "Download module missing",
    "summary": "Today {day}/{day_max} · Run {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} keeps downloading.",
    "steps": "Download · Convert · Tag",
    "unlimited": "unlimited",
    "l_run": "This run",
    "l_day": "Today",
    "l_rate": "Rate limit",
    "l_sleep": "Pause between downloads",
    "sec_queue": "Queue",
    "sec_failed": "Failed",
    "empty_title": "Queue empty",
    "empty_text": "Select mixes under “Discover” or in the “Inbox”.",
    "paused": "<b>Queue paused.</b> The current download is halted until you resume.",
    "backoff": "<b>Backoff active until {t}</b> ({rest} left). Downloads, search and watchlist are blocked.",
    "backoff_rest": {
      "one": "<b>Backoff active until {t}</b> ({rest} left). Downloads, search and watchlist are blocked – {n} stays in the queue.",
      "other": "<b>Backoff active until {t}</b> ({rest} left). Downloads, search and watchlist are blocked – {n} stay in the queue."
    },
    "limit_day": "<b>Daily limit reached ({n}/{max}).</b> The rest stays in the queue and continues tomorrow.",
    "limit_day_rest": {
      "one": "<b>Daily limit reached ({n}/{max}).</b> {rest} stays in the queue and continues tomorrow.",
      "other": "<b>Daily limit reached ({n}/{max}).</b> {rest} stay in the queue and continue tomorrow."
    },
    "limit_run": "<b>Limit reached – {max}/{max} in this run.</b> The rest stays in the queue and continues in the next run.",
    "limit_run_rest": {
      "one": "<b>Limit reached – {max}/{max} in this run.</b> {rest} stays in the queue and continues in the next run.",
      "other": "<b>Limit reached – {max}/{max} in this run.</b> {rest} stay in the queue and continue in the next run."
    },
    "limits_link": "Change limits",
    "new_run": "Start new run",
    "need_restart": "<b>Restart required.</b> yt-dlp was updated – please restart HCLoader. The queue is kept.",
    "busy": "Another download run is active (e.g. the scheduled check). The queue waits until it has finished.",
    "local_pot": {
      "one": "<b>PO token server not ready.</b> {rest} stays in the queue and continues as soon as it is running.",
      "other": "<b>PO token server not ready.</b> {rest} stay in the queue and continue as soon as it is running."
    },
    "local_target": {
      "one": "<b>Target folder unreachable or not writable.</b> {rest} stays in the queue and continues as soon as it is available again.",
      "other": "<b>Target folder unreachable or not writable.</b> {rest} stay in the queue and continue as soon as it is available again."
    },
    "local_error": {
      "one": "<b>The download module (yt-dlp) could not be loaded.</b> {rest} stays in the queue. Next attempt after “Resume”, new entries or saving the settings.",
      "other": "<b>The download module (yt-dlp) could not be loaded.</b> {rest} stay in the queue. Next attempt after “Resume”, new entries or saving the settings."
    },
    "local_link_pot": "Network settings",
    "local_link_target": "Change storage location",
    "local_link_error": "Maintenance"
  },
  "library": {
    "title": "Library",
    "sub": {
      "one": "{n} mix",
      "other": "{n} mixes"
    },
    "sub_shown": "{n} of {total} shown",
    "search": "Title, channel or path …",
    "all_genres": "All genres",
    "all_channels": "All channels",
    "all_years": "All years",
    "f_genre": "Genre",
    "f_channel": "Channel",
    "f_year": "Year",
    "f_sort": "Sort",
    "sort_newest": "Newest first",
    "sort_title": "Title A–Z",
    "sort_channel": "Channel A–Z",
    "sort_duration": "Longest first",
    "group": "By genre",
    "group_title": "Group entries by genre",
    "view_list": "List",
    "view_grid": "Tiles",
    "clear": "Reset filters",
    "col_title": "Title",
    "col_channel": "Channel",
    "col_genre": "Genre",
    "col_year": "Year",
    "col_duration": "Duration",
    "col_size": "Size",
    "col_loaded": "Downloaded",
    "play": "Play",
    "pause": "Pause",
    "play_external": "Open in default player",
    "play_internal": "Play in app player",
    "play_missing": "File missing – cannot play",
    "more": "Show {n} more",
    "now_playing": "Now playing",
    "retag_short": "Retag",
    "genre_working": "Setting genre …",
    "open_folder": "Open folder",
    "retag": "Retag (tags, cover and location according to the current settings)",
    "delete": "Delete file",
    "remove": "Remove entry",
    "retagging": "Retagging …",
    "cue_title": "Tracklist as .cue file next to the MP3",
    "missing": "File missing",
    "missing_title": "The file was not found at the stored location (moved or deleted?)",
    "missing_chip": {
      "one": "{n} missing",
      "other": "{n} missing"
    },
    "missing_chip_title": "Only show entries whose file is missing",
    "stat_count": "Mixes",
    "stat_duration": "Total duration",
    "stat_size": "Size",
    "stat_genres": "By genre",
    "unit_h": "h",
    "unit_min": "min",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "one": "{n} mix · {dur}",
      "other": "{n} mixes · {dur}"
    },
    "empty_title": "Nothing downloaded yet",
    "empty_text": "Every mix lands here as soon as it is downloaded and tagged – with cover, genre and location.",
    "empty_discover": "Discover mixes",
    "empty_watchlist": "Set up watchlist",
    "target_down": "Target folder unreachable: {path}",
    "target_down_hint": "Check the drive or network share. While it is missing, the state of the files is unknown: “Retag” and “Remove entry” are disabled.",
    "unknown_title": "Target folder unreachable – state of the file unknown",
    "none_title": "No results",
    "none_text": "No entry matches the search and filters."
  },
  "player": {
    "label": "Mini player",
    "play": "Play (Space)",
    "pause": "Pause (Space)",
    "back": "Back 30 seconds",
    "fwd": "Forward 30 seconds",
    "prev": "Previous track",
    "next": "Next track",
    "seek": "Position",
    "mute": "Mute",
    "unmute": "Unmute",
    "volume": "Volume",
    "close": "Close player",
    "tracks": "Tracklist",
    "tracks_n": {
      "one": "{n} track",
      "other": "{n} tracks"
    },
    "tracks_toggle": "Show/hide tracklist",
    "no_tracks": "No chapters in this file",
    "total": "Total duration {t}",
    "keys": "Space: play/pause · ←/→: 10 s",
    "err_load": "Cannot play",
    "err_src": "Cannot play: invalid file address",
    "err_play": "The file cannot be played: {title}",
    "external": "Opening in the default player …"
  },
  "log": {
    "title": "Log",
    "sub": "Live log and run history",
    "live": "Live log",
    "history": "Run history",
    "lvl_debug": "Debug",
    "lvl_info": "Info",
    "lvl_warn": "Warn",
    "lvl_error": "Error",
    "lvl_title": "Show/hide level “{lvl}”",
    "search": "Search the log …",
    "following": "Live",
    "paused": "Paused",
    "follow_title": "Automatically scroll to the newest line (pauses when scrolling up)",
    "jump": "Jump to end",
    "jump_new": {
      "one": "{n} new line",
      "other": "{n} new lines"
    },
    "copy": "Copy",
    "copy_title": "Copy visible lines to the clipboard",
    "open_logs": "Log folder",
    "open_logs_title": "Open the folder with the full log files",
    "lines": {
      "one": "{n} line",
      "other": "{n} lines"
    },
    "lines_of": "{n} of {total} lines",
    "empty": "No lines for these levels.",
    "empty_search": "No line contains “{q}”.",
    "no_runs": "No runs yet.",
    "no_runs_kind": "No runs of this kind.",
    "found": "found",
    "downloaded": "downloaded",
    "errors": "errors",
    "running": "running …",
    "kind_all": "All",
    "timeline": "Timeline",
    "table": "Table",
    "view_title": "Run history display",
    "col_kind": "Kind",
    "col_start": "Start",
    "col_duration": "Duration",
    "col_found": "Found",
    "col_downloaded": "Downloaded",
    "col_errors": "Errors",
    "col_note": "Note",
    "backoff": "Backoff",
    "runs_sum": {
      "one": "{n} run · {dl} downloaded · {err} errors",
      "other": "{n} runs · {dl} downloaded · {err} errors"
    },
    "today": "Today",
    "yesterday": "Yesterday"
  },
  "settings": {
    "title": "Settings",
    "sub": "Everything the app does can be configured here"
  },
  "tabs": {
    "general": "General",
    "filters": "Filters & keywords",
    "genres": "Genres",
    "download": "Download & quality",
    "storage": "Storage & tags",
    "throttle": "Throttling",
    "soundcloud": "SoundCloud",
    "network": "Network & PO token",
    "schedule": "Schedule",
    "appearance": "Appearance",
    "maintenance": "Maintenance"
  },
  "tabs_hint": {
    "general": "Basic app behaviour.",
    "filters": "Default filters for search and watchlist. Can be overridden temporarily in the filter panel under “Discover”.",
    "genres": "Order = priority. The first genre whose keyword appears in the title wins. Manually set genres and a source’s default genre take precedence.",
    "download": "YouTube usually delivers Opus at about 130–160 kbps. MP3 is a conversion and does not sound better than the source – but it plays everywhere.",
    "storage": "Where the files go and how they are named. The structure is designed for media servers such as Plex or Jellyfin.",
    "throttle": "Limits the load on YouTube. These values apply to search, watchlist and downloads together. SoundCloud has its own values in the “SoundCloud” tab.",
    "soundcloud": "SoundCloud as a second source for search, watchlist and downloads – with its own limits, counters and backoff, independent of YouTube.",
    "network": "The PO token identifies requests as a real browser and lowers the risk of bot blocks.",
    "schedule": "When the watchlist is checked automatically – in the app and via the Windows Task Scheduler.",
    "appearance": "Look & feel. Changes are previewed immediately and only become permanent after saving.",
    "maintenance": "Versions, updates, database."
  },
  "set": {
    "default": "Default",
    "range": "Range",
    "browse": "Browse",
    "not_set": "not set",
    "saving": "Saving …",
    "discard": "Discard",
    "tab_reset": "Reset tab",
    "tab_reset_title": "Set all fields of this tab to their defaults (takes effect only after “Save”)",
    "state_clean": "All saved",
    "state_dirty": {
      "one": "{n} unsaved change",
      "other": "{n} unsaved changes"
    },
    "state_errors": {
      "one": "{n} error – please correct",
      "other": "{n} errors – please correct"
    },
    "h": {
      "search": "Search",
      "duration": "Duration & period",
      "keywords": "Keywords",
      "display": "Display",
      "cover": "Cover",
      "chapters": "Chapters & tracklist",
      "tags": "Tags",
      "soundcloud": "SoundCloud",
      "playback": "Playback",
      "pauses": "Pauses & bandwidth",
      "limits": "Limits",
      "backoff": "Backoff when blocked",
      "po": "PO token provider",
      "fallback": "Workarounds",
      "in_app": "In the app",
      "task": "Windows Task Scheduler",
      "updates": "Updates",
      "app_update": "App update",
      "release_notes": "Release notes",
      "database": "Database",
      "reset": "Reset"
    },
    "general": {
      "language": {
        "label": "Language",
        "help": "Language of the interface and messages. “Automatic” follows the Windows display language (otherwise English). The view is rebuilt right after saving."
      },
      "start_view": {
        "label": "Start view",
        "help": "Which view opens after start."
      },
      "log_level": {
        "label": "Log level",
        "help": "How detailed the log file and the live log are. DEBUG only for troubleshooting."
      },
      "confirm_delete": {
        "label": "Confirm deletion",
        "help": "Ask before deleting a mix from the library (entry + file)."
      }
    },
    "player": {
      "mode": {
        "label": "Play with",
        "help": "What ▶ in the library uses. The built-in player shows chapters as jump marks and keeps playing when you switch views. The other option is available per entry in the menu."
      }
    },
    "search": {
      "results_count": {
        "label": "Results per search",
        "help": "Number of results a search fetches (flat). More results = more load on YouTube."
      },
      "append_year": {
        "label": "Append year to search",
        "help": "With the upload period “Specific year”, the year is appended to the search term (e.g. “hardcore liveset 2013”). This way YouTube finds more mixes from that year."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Minimum length",
        "help": "Shorter videos are never treated as a mix."
      },
      "max_duration": {
        "label": "Maximum length",
        "help": "0 = unlimited."
      },
      "upload_period": {
        "label": "Upload period",
        "help": "Which uploads are shown by default. “Specific year” only shows mixes from one year, “Custom” a from/to range."
      },
      "upload_year": {
        "label": "Year",
        "help": "A mix counts if the upload year matches or the year is in the title. YouTube search only returns an approximate date – ±1 year applies there."
      },
      "upload_from": {
        "label": "From",
        "help": "Earliest upload date. Empty = open."
      },
      "upload_to": {
        "label": "To",
        "help": "Latest upload date. Empty = open. For approximate dates, ±1 year tolerance applies at both ends."
      },
      "include_keywords": {
        "label": "Include keywords",
        "help": "At least one must appear in the title. Empty = allow everything. Enter or comma adds."
      },
      "exclude_keywords": {
        "label": "Exclude keywords",
        "help": "If one of them appears in the title, the video is discarded."
      },
      "match_description": {
        "label": "Search description",
        "help": "Also check keywords in the video description. Flat queries often do not provide it."
      },
      "hide_done_ignored": {
        "label": "Hide downloaded & ignored",
        "help": "Hide already downloaded and ignored videos in the results."
      },
      "apply_channel_blacklist": {
        "label": "Apply channel blacklist",
        "help": "Never show videos from blocked channels."
      },
      "hide_cross_platform_duplicates": {
        "label": "Hide platform duplicates",
        "help": "Hide hits that were probably already downloaded or queued from the other platform (YouTube or SoundCloud) – same duration (±5 s) and very similar title. Off: they appear with the note “Probably already downloaded”."
      }
    },
    "blacklist": {
      "label": "Blocked channels",
      "help": "You block channels via a card’s menu. Here you can unblock them again.",
      "none": "No channels blocked",
      "unblock": "Unblock"
    },
    "genres": {
      "add": "Genre",
      "up": "Higher priority",
      "down": "Lower priority",
      "delete": "Delete genre",
      "color": "Choose colour",
      "name_ph": "Name",
      "kw_ph": "+ keyword",
      "fallback": "Fallback – applies when no keyword matches. Always present, always last."
    },
    "download": {
      "audio_format": {
        "label": "Output format",
        "help": "MP3, or keep YouTube’s original without conversion."
      },
      "mp3_quality": {
        "label": "MP3 quality",
        "help": "320 kbps CBR is the most compatible, V0 VBR saves a little space."
      },
      "embed_cover": {
        "label": "Embed cover",
        "help": "Write the thumbnail, cropped square, into the file as cover."
      },
      "write_cover_jpg": {
        "label": "Also save cover.jpg",
        "help": "For media servers that read folder covers."
      },
      "write_cue": {
        "label": "Write .cue file",
        "help": "Tracklist from chapters or timestamps in the description, next to the audio file."
      },
      "write_id3_chapters": {
        "label": "Write ID3 chapters",
        "help": "Embed chapter marks (CHAP/CTOC) directly in the MP3."
      },
      "keep_original_soundcloud": {
        "label": "Keep SoundCloud original",
        "help": "Save SoundCloud audio unchanged (AAC 160 kbps as .m4a, MP3 128 kbps as .mp3) – no second lossy conversion. Off: like “Output format”."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Target folder",
        "help": "Root of the music storage. Temporary files are kept in “.tmp” below it. In the portable version, a relative path such as “.\\Music” is resolved relative to the app folder (e.g. on a USB stick)."
      },
      "path_template": {
        "label": "Path pattern",
        "help": "Relative to the target folder, without file extension. “/” separates folders. {id} must be included (for SoundCloud “sc-<id>”). {platform} becomes “YouTube” or “SoundCloud” – e.g. as top folder to separate the sources."
      },
      "max_title_length": {
        "label": "Max. title length",
        "help": "Longer titles are shortened in the file name."
      },
      "max_path_length": {
        "label": "Max. path length",
        "help": "Full path including the target folder. Without extra configuration Windows allows 259 characters."
      },
      "artist_from_title": {
        "label": "Read artist from title",
        "help": "Recognize the patterns “ARTIST @ EVENT” and “ARTIST - TITLE”, otherwise use the channel name."
      },
      "title_cleanup_patterns": {
        "label": "Clean up title",
        "help": "Regular expressions whose matches are removed from the title. Enter adds.",
        "ph": "+ regex"
      }
    },
    "path_preview": {
      "label": "Preview",
      "help": "Click placeholders to insert them into the path pattern."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Pause between requests",
        "help": "Waiting time between metadata queries (search, watchlist)."
      },
      "sleep_interval": {
        "label": "Download pause – minimum",
        "help": "After each download, a random pause between minimum and maximum follows."
      },
      "max_sleep_interval": {
        "label": "Download pause – maximum",
        "help": "Upper bound of the random pause."
      },
      "limit_rate_mb": {
        "label": "Download rate",
        "help": "Maximum bandwidth. 0 = unlimited (not recommended)."
      },
      "max_downloads_per_run": {
        "label": "Max. downloads per run",
        "help": "The rest stays in the queue."
      },
      "max_downloads_per_day": {
        "label": "Max. downloads per day",
        "help": "The counter covers manual and automatic downloads together."
      },
      "max_searches_per_hour": {
        "label": "Max. searches per hour",
        "help": "Protects against accidental non-stop searching."
      },
      "backoff_initial_hours": {
        "label": "Backoff – initial value",
        "help": "Block time after HTTP 429 or “confirm you’re not a bot”."
      },
      "backoff_max_hours": {
        "label": "Backoff – maximum",
        "help": "The block time doubles with each further block up to this value."
      }
    },
    "backoff": {
      "none": "No backoff active ({p})",
      "none_detail": "Search, watchlist and downloads from {p} are allowed.",
      "active": "Backoff active ({p})",
      "active_detail": "until {t} · {rest} left · level {level}",
      "blocked": "{p} signalled a block. Search, watchlist and downloads from {p} are blocked until the time has expired.",
      "clear": "Lift manually",
      "sc_off": "SoundCloud is turned off",
      "sc_off_detail": "No SoundCloud search, no watchlist checks and no downloads from SoundCloud."
    },
    "soundcloud": {
      "enabled": {
        "label": "Use SoundCloud",
        "help": "Off: no SoundCloud search, no checks of SoundCloud sources and no SoundCloud downloads. Already downloaded items stay in the library."
      },
      "sleep_requests": {
        "label": "Pause between requests",
        "help": "Waiting time between metadata queries to SoundCloud (search, watchlist)."
      },
      "sleep_interval": {
        "label": "Download pause – minimum",
        "help": "After each SoundCloud download, a random pause between minimum and maximum follows."
      },
      "max_sleep_interval": {
        "label": "Download pause – maximum",
        "help": "Upper bound of the random pause."
      },
      "limit_rate_mb": {
        "label": "Download rate",
        "help": "Maximum bandwidth. 0 = unlimited (not recommended)."
      },
      "max_downloads_per_run": {
        "label": "Max. downloads per run",
        "help": "Separate counter for SoundCloud. The rest stays in the queue."
      },
      "max_downloads_per_day": {
        "label": "Max. downloads per day",
        "help": "Separate counter for SoundCloud, manual and automatic downloads together."
      },
      "max_searches_per_hour": {
        "label": "Max. searches per hour",
        "help": "Separate counter for SoundCloud."
      },
      "backoff_initial_hours": {
        "label": "Backoff – initial value",
        "help": "Block time after SoundCloud reported too many requests (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Backoff – maximum",
        "help": "The block time doubles with each further block up to this value."
      }
    },
    "ladder": {
      "label": "Levels",
      "help": "How the block time grows with the current values.",
      "reset": "Reset after a successful run",
      "invalid": "Invalid values"
    },
    "network": {
      "po_token_mode": {
        "label": "Mode",
        "help": "bgutil plugin for yt-dlp. Script starts Deno when needed, HTTP keeps a local server running."
      },
      "po_token_port": {
        "label": "HTTP port",
        "help": "HTTP mode only. The server listens on 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Token validity",
        "help": "After this time a new token is generated. The value is rounded to whole hours (at least 1 h)."
      },
      "cookies_from_browser": {
        "label": "Cookies from browser",
        "help": "Signs yt-dlp in with your browser login. Only turn on if it no longer works without."
      },
      "proxy": {
        "label": "Proxy",
        "help": "Optional, e.g. socks5://127.0.0.1:1080. Empty = direct connection.",
        "ph": "no proxy"
      }
    },
    "po": {
      "active": "PO token active",
      "inactive": "PO token inactive",
      "error": "PO token error",
      "mode": "Mode",
      "test": "Test",
      "testing": "Testing …",
      "test_ok": "Test successful.",
      "test_fail": "Test failed.",
      "unsaved": "The test uses the saved settings. Save your changes first."
    },
    "cookies": {
      "warn_off": "<b>Recommended: off.</b> PO token and browser cookies combined can cause problems.",
      "warn_on": "<b>Workaround active.</b> PO token and browser cookies combined can lead to errors or blocks, and your YouTube account is used for the requests. Turn it off again as soon as it works without. Cookies never end up in the log."
    },
    "schedule": {
      "in_app_check": {
        "label": "Check while the app is running",
        "help": "The watchlist is checked at the configured interval while the window is open."
      },
      "watchlist_interval_hours": {
        "label": "Interval",
        "help": "Time between two checks in the app."
      },
      "entries_per_source": {
        "label": "Entries per source",
        "help": "How many of the newest entries are fetched (flat) per check (default for new sources)."
      },
      "task_scheduler_enabled": {
        "label": "Use Task Scheduler",
        "help": "Also checks the watchlist when the app is closed (headless). Turned on by “Create task”."
      },
      "task_time": {
        "label": "Time",
        "help": "Daily start time of the scheduled task."
      }
    },
    "next": {
      "title": "Next check",
      "off": "No automatic check",
      "off_detail": "Neither the in-app check nor the Windows task is active. The watchlist is only checked manually.",
      "app_detail": "In the app, every {h} h – while HCLoader is running.",
      "task_detail": "Via the Windows Task Scheduler, daily at {time} – even when the app is closed.",
      "any_detail": "The earlier of the app interval and the Windows task.",
      "also_task": "Also: Windows task daily at {time}.",
      "also_app": "Also in the app every {h} h.",
      "pending": "Not scheduled yet",
      "pending_detail": "The app sets the next date as soon as it has checked the watchlist for the first time.",
      "due": "Due – starting shortly",
      "backoff": "<b>Backoff active.</b> No checks until {t}; the date is made up for or skipped afterwards.",
      "unsaved": "Unsaved schedule changes only take effect after saving."
    },
    "task": {
      "loading": "Querying task …",
      "registered": "Task registered",
      "registered_detail": "{name} · daily {time} · next run {next}",
      "none": "No task registered",
      "none_detail": "Creates a daily Windows task at {time} (schtasks).",
      "create": "Create task",
      "remove": "Remove task",
      "moved": "App was moved – recreate the task",
      "moved_detail": "The scheduled task still starts {cmd}. Recreating it uses the current app folder.",
      "recreate": "Recreate task",
      "unknown": "Task status unknown",
      "unknown_detail": "The Windows Task Scheduler did not respond. The setting stays unchanged.",
      "recheck": "Check again"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Reduce effects",
        "help": "Turns off scanlines, glitch and all animations."
      },
      "scanlines": {
        "label": "Scanlines & noise",
        "help": "Fine overlay over the whole interface."
      },
      "pulse_bpm": {
        "label": "Kick pulse",
        "help": "The beat at which the progress bar pulses."
      }
    },
    "pulse_preview": {
      "label": "Preview",
      "help": "This is how a running download pulses.",
      "off": "Effects reduced"
    },
    "versions": {
      "plugin": "PO token plugin",
      "was": "previously {v}"
    },
    "update": {
      "label": "yt-dlp & plugin",
      "help": "YouTube changes constantly. When errors occur, update first (pip in the venv).",
      "button": "Update yt-dlp & plugin",
      "running": "Updating …",
      "last_check": "Last check",
      "restart": "<b>Restart required.</b> yt-dlp was updated. Search and downloads are blocked until HCLoader is restarted; the queue is kept.",
      "restart_title": "Restart required",
      "restart_text": "yt-dlp was updated. Please close and restart HCLoader – until then search and downloads are blocked, the queue is kept.",
      "out_live": "Output · running for {t}",
      "out_done": "Output · finished after {t}",
      "out_failed": "Output · failed",
      "out_last": "Output",
      "waiting": "Starting pip …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Check for updates on start",
        "help": "yt-dlp and PO token plugin, at most once per day."
      },
      "check_app_updates_on_start": {
        "label": "Check for HCLoader updates on start",
        "help": "Asks GitHub once per start for a new version. Nothing is downloaded until you click."
      },
      "apply_update_on_exit": {
        "label": "Install update on exit",
        "help": "A downloaded update is installed when HCLoader closes (“Later”). Off: it is offered again at the next start."
      },
      "update_repo": {
        "label": "Update source (GitHub)",
        "help": "Repo in the format “owner/repo”. Only change for forks."
      }
    },
    "db": {
      "label": "Database",
      "help": "Status of all videos, sources and runs. A backup copies the file into the “backups” folder.",
      "backup": "Create DB backup",
      "backing_up": "Backing up …",
      "open": "Data folder",
      "open_logs": "Log folder",
      "open_title": "Open the folder with database, configuration and backups",
      "open_logs_title": "Open the folder with the log files",
      "info": {
        "one": "{n} entry · {mb} MB",
        "other": "{n} entries · {mb} MB"
      },
      "last": "Last backup",
      "never": "none yet",
      "keep": "The 10 newest backups are kept, older ones are deleted with the next backup.",
      "backups": "Backups",
      "backups_more": "+ {n} older in the “backups” folder",
      "fresh": "new"
    },
    "reset_all": {
      "label": "All settings",
      "help": "Resets all tabs to their defaults. Database and music files stay untouched.",
      "button": "Reset everything"
    }
  },
  "opt": {
    "general": {
      "log_level": {
        "DEBUG": "DEBUG",
        "INFO": "INFO",
        "WARNING": "WARNING",
        "ERROR": "ERROR"
      },
      "language": {
        "auto": "Automatic (system language)"
      }
    },
    "player": {
      "mode": {
        "internal": "Built-in player (recommended)",
        "external": "Windows default player"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "Original (Opus/M4A, no conversion)"
      },
      "mp3_quality": {
        "320": "320 kbps CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "Off",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Block channel",
      "text": "Videos from “{ch}” will no longer be shown. Undo under Settings › Filters & keywords.",
      "ok": "Block"
    },
    "ignore_all": {
      "title": "Ignore hits",
      "text": {
        "one": "Mark {n} hit in the inbox as ignored? It will not be downloaded and no longer appears in the inbox.",
        "other": "Mark {n} hits in the inbox as ignored? They will not be downloaded and no longer appear in the inbox."
      },
      "ok": "Ignore"
    },
    "del_source": {
      "title": "Delete source",
      "text": "Remove “{name}” from the watchlist? Mixes already downloaded are kept."
    },
    "del_mix": {
      "title": "Delete mix",
      "text": "“{title}” is removed from the library and the file is deleted from disk:",
      "ok": "Delete file",
      "warn": "<b>This cannot be undone.</b> The audio file and a related .cue file are deleted. The mix is marked as “ignored” and <b>will not be downloaded again</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Remove entry only",
      "text": "The file for “{title}” is outside the current target folder and will therefore not be deleted:",
      "ok": "Remove entry only",
      "warn": "The file stays untouched where it is. The entry disappears from the library, the mix is marked as “ignored” and <b>will not be downloaded again</b>."
    },
    "remove_mix": {
      "title": "Remove entry",
      "text": "The file for “{title}” was not found at the stored location:",
      "ok": "Remove entry",
      "warn": "The entry disappears from the library. The mix is marked as “ignored” and <b>will not be downloaded again</b>. If the file is somewhere else, it stays untouched."
    },
    "backoff": {
      "title": "Lift backoff",
      "ok": "Lift anyway",
      "text": "The block time protects you: {p} signalled that too many requests came in.",
      "warn": "<b>Only lift it if you are sure the block is over.</b> If the app accesses it again too early, {p} may restrict your IP for longer or permanently."
    },
    "reset_all": {
      "title": "Reset everything",
      "text": "All settings in all tabs are immediately set to their defaults and saved.",
      "ok": "Reset"
    }
  },
  "toast": {
    "enqueued": {
      "one": "{n} mix added to the queue",
      "other": "{n} mixes added to the queue"
    },
    "enqueued_none": "Nothing added – already queued or downloaded",
    "enqueued_skipped": "{n} skipped",
    "queue_cancelled": "Cancelled: {title}",
    "queue_removed": "Removed: {title}",
    "queue_retry": "Queued again: {title}",
    "queue_paused": "Queue paused",
    "queue_resumed": "Queue resumed",
    "new_run": "New run started",
    "ignored": "Ignored: {title}",
    "unignored": "Visible again: {title}",
    "ignored_n": {
      "one": "{n} hit ignored",
      "other": "{n} hits ignored"
    },
    "opening": "Opening {p} in the browser …",
    "watch_added": "Added to watchlist: {ch}",
    "blocked": "Channel blocked: {ch}",
    "genre_set": "Genre set: {genre}",
    "done": "Downloaded: {title}",
    "failed": "Failed: {title} – {error}",
    "wl_started": {
      "one": "Checking watchlist ({n} source, throttled) …",
      "other": "Checking watchlist ({n} sources, throttled) …"
    },
    "wl_started_one": "Checking “{name}” …",
    "wl_none": "No active source – nothing to check",
    "wl_done": {
      "one": "Source checked: nothing new",
      "other": "Watchlist checked: {n} sources, nothing new"
    },
    "wl_done_found": {
      "one": "Watchlist checked: {n} new hit",
      "other": "Watchlist checked: {n} new hits"
    },
    "wl_errors": {
      "one": "{n} source with errors",
      "other": "{n} sources with errors"
    },
    "source_added": "Source added: {name}",
    "source_saved": "Source saved: {name}",
    "source_deleted": "Source deleted: {name}",
    "retagged": "Retagged: {title}",
    "retagged_moved": "Retagged and moved: {title} → {path}",
    "deleted": "Deleted: {title}",
    "removed": "Entry removed: {title}",
    "folder_opening": "Opening folder …",
    "copied": {
      "one": "{n} line copied",
      "other": "{n} lines copied"
    },
    "copy_failed": "Copying not possible",
    "copy_none": "No visible lines",
    "settings_saved": "Settings saved",
    "settings_errors": {
      "one": "{n} input is invalid",
      "other": "{n} inputs are invalid"
    },
    "backoff_cleared": "Backoff ({p}) lifted manually",
    "genre_moved": "Genre: {genre} – moved to {path}",
    "genre_retagged": "Genre: {genre} – tags updated",
    "genre_entry_only": "Genre: {genre} – only the entry was changed, the file is not reachable",
    "genre_failed": "Genre could not be set: {error}",
    "task_created": "Task created in the Windows Task Scheduler",
    "task_removed": "Task removed",
    "updated": "Updated to yt-dlp {v}",
    "up_to_date": "Already up to date (yt-dlp {v})",
    "update_failed": "Update failed",
    "restart_required": "Updated – please restart HCLoader so search and downloads work again",
    "backup_done": "Backup created: {path}",
    "reset_all": "All settings reset"
  },
  "upd": {
    "available": "Version {v} available",
    "available_sub": "Installed: {cur}",
    "download": "Download",
    "notes": "Changes",
    "later": "Later",
    "close": "Close",
    "cancel": "Cancel",
    "retry": "Try again",
    "downloading": "Downloading update {v}",
    "phase_download": "Download",
    "phase_verify": "Verify",
    "phase_prepare": "Prepare",
    "ready": "Update {v} ready",
    "ready_sub": "To install it, HCLoader is closed briefly and restarted.",
    "restart_now": "Restart now",
    "on_exit": "On exit",
    "applying": "Installing update …",
    "applying_sub": "HCLoader closes and restarts in a moment.",
    "error": "App update failed",
    "blocked": "Automatic update not possible",
    "notes_title": "Changes in version {v}",
    "notes_empty": "No release notes available.",
    "notes_link": "Release on GitHub",
    "notes_all": "Show all changes",
    "notes_less": "Show highlights only",
    "confirm_title": "Restart now?",
    "confirm_ok": "Restart",
    "confirm_text": "HCLoader is closed, the update installed and the app restarted. A running download is cancelled and stays in the queue. Music, settings and database stay unchanged.",
    "on_exit_toast": "The update will be installed when HCLoader exits.",
    "later_toast": "The update stays ready and will be offered again at the next start.",
    "section_label": "HCLoader version",
    "section_help": "New versions come from GitHub. Data, settings and music stay untouched by updates; a backup is created automatically before a database migration.",
    "current": "Installed",
    "latest": "Latest",
    "checked": "Last check",
    "check_now": "Check now",
    "checking": "Checking …",
    "st_idle": "Up to date",
    "st_available": "New version available",
    "st_checking": "Checking …",
    "st_downloading": "Downloading …",
    "st_ready": "Ready to install",
    "st_applying": "Installing …",
    "st_error": "Error",
    "st_unknown": "Not checked yet",
    "up_to_date": "HCLoader is up to date (v{v})",
    "portable": "Portable version",
    "installed": "Installed (setup)",
    "git": "Git checkout",
    "from_repo": "from {repo} (not the official source)",
    "unverified": "without checksum (only ZIP integrity verified)",
    "rn_label": "Release notes",
    "rn_help": "What changed in each version, from the notes shipped with this copy (works offline).",
    "rn_older": "Older",
    "rn_newer": "Newer",
    "rn_pos": "{i} of {n}",
    "rn_installed": "installed",
    "rn_empty": "No release notes found.",
    "rn_version": "Version"
  },
  "err": {
    "generic": "Unknown error",
    "bridge": "Error in “{name}”: {msg}",
    "boot": "Start failed: {msg}",
    "no_backend": "No connection to the backend"
  },
  "fatal": {
    "title": "Connection to the backend failed",
    "text": "The interface received no response from the Python part of HCLoader. Nothing that is not real is shown or saved.",
    "waiting": "Still waiting for the backend …",
    "reload": "Reload"
  }
});
