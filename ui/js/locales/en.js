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
    "settings": "Settings",
    "stats": "Statistics"
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
    "empty_list": "“none”",
    "undo": "Undo"
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
    "clock": "o’clock",
    "req_h": "req./h",
    "lufs": "LUFS",
    "db": "dB",
    "pct": "%"
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
    "sc_off": "SoundCloud is turned off – turn it on under Settings › SoundCloud.",
    "mixcloud": "Mixcloud",
    "hearthis": "hearthis.at",
    "p_off": "{p} is turned off – turn it on under Settings › More sources.",
    "all": "All"
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
    "backoff_tip": "{p}: backoff until {t} ({rest} left)",
    "p_tip": "{p} · downloaded today {day}/{day_max} · {s}/{s_max} searches this hour"
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
    "select": "Subscribers only (Select)",
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
    "preview_title": "SoundCloud only provides a 30-second preview (Go+) for this track. It cannot be downloaded.",
    "select_title": "This Mixcloud upload is only available to subscribers of the creator (Mixcloud Select). It cannot be downloaded."
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
    "none_year": "No result from {year}. Search again so the year is included in the search term – or change the year.",
    "quota_p": "{p} searches this hour: {n} / {max}",
    "placeholder_p": "Search {p}: mix, set, DJ, podcast …",
    "searching_p": "Searching – flat query, easy on {p} …",
    "ready_text_p": "Enter a search term and press Enter to search {p}.",
    "previews_mc": "{n} subscribers only (Select)",
    "previews_mc_title": "Mixcloud Select uploads are only for paying subscribers and can never be downloaded. Visible when “Hide downloaded & ignored” is off.",
    "placeholder_all": "Search all platforms: mix, live set, DJ, event …",
    "searching_all": "Searching {p} ({i} of {n}) – one platform after another …",
    "ready_text_all": "Enter a search term and press Enter – every enabled platform is searched, one after another.",
    "quota_all": "Searches this hour: {list}",
    "platform_current": "Platform: {p}",
    "platform_all_title": "Searches every enabled platform, one after another. Each platform keeps its own pauses and its own “searches per hour” limit.",
    "platform_backoff": "{p}: backoff until {t} – skipped by “All”",
    "platform_backoff_short": "backoff",
    "skipped": "Skipped: {list}",
    "skipped_title": "These platforms were not searched this time.",
    "skip_backoff": "backoff until {t}",
    "skip_error": "no answer",
    "all_none": "No platform could be searched.",
    "kw_clear": "Remove all",
    "kw_cleared_inc": "Include keywords removed",
    "kw_cleared_exc": "Exclude keywords removed",
    "kw_sugg_title": "Add again (from your saved settings)",
    "kw_sugg_label": "Suggestions from the saved settings",
    "kw_session_hint": "Applies to this session only – nothing is saved here. Starting values: Settings › Filters & keywords."
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
    "hint_channel": "YouTube channel (…/@name or …/channel/UC…, optionally /videos or /streams), SoundCloud profile (soundcloud.com/name), Mixcloud user (mixcloud.com/name) or hearthis.at user (hearthis.at/name).",
    "hint_playlist": "YouTube playlist with “list=…”, SoundCloud set (soundcloud.com/name/sets/set), Mixcloud playlist (mixcloud.com/name/playlists/list) or hearthis.at set (hearthis.at/name/set/set). The newest entries are checked.",
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
    "form_error": "The source could not be saved.",
    "backoff_link_p": "Open {p}",
    "why_p_off": "{p} is turned off"
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
    "local_link_error": "Maintenance",
    "summary_p": "{p} {day}/{day_max}"
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
    "none_text": "No entry matches the search and filters.",
    "group_by": "Group by",
    "group_none": "None",
    "group_genre": "Genre",
    "group_festival": "Festival",
    "group_artist": "Artist",
    "group_year": "Year",
    "group_unknown": "Unknown",
    "continue": "Continue listening",
    "continue_title": "Continue “{title}” at {t}",
    "continue_left": "{t} left",
    "continue_forget": "Remove from “Continue listening”",
    "export": "M3U",
    "export_title": "Export what is shown as an M3U8 playlist",
    "export_continue": "Export “Continue listening” as a playlist"
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
    "external": "Opening in the default player …",
    "norm_title": "Loudness normalised: {lufs} LUFS → target {target} LUFS ({gain})",
    "norm_capped": "only lowered – boosting needs the audio engine",
    "norm_fallback": "Loudness normalisation: the audio engine stays silent here – playing without it (only lowering the volume, no boosting)",
    "resume_q": "Continue where you left off?",
    "resume_at": "at {t}",
    "resume": "Resume",
    "restart": "Start over",
    "resumed_at": "Resumed at {t}",
    "sleep": "Sleep timer",
    "sleep_min": "{n} min",
    "sleep_end": "End of this set",
    "sleep_end_short": "end",
    "sleep_off": "Turn off",
    "sleep_on": "Sleep timer: stops in {t}",
    "sleep_end_on": "Sleep timer: stops at the end of this set",
    "sleep_done": "Sleep timer: playback stopped",
    "queue_pos": "{i}/{n}",
    "queue_title": "Play all · {label}: set {i} of {n}"
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
    "maintenance": "Maintenance",
    "festivals": "Festivals & series",
    "playback": "Playback",
    "notifications": "Notifications",
    "mediaserver": "Media server",
    "sources": "More sources",
    "reupload": "Re-uploads"
  },
  "tabs_hint": {
    "general": "Basic app behaviour.",
    "filters": "Default filters for search and watchlist. Can be overridden temporarily in the filter panel under “Discover”.",
    "genres": "Order = priority. The first genre whose keyword appears in the title wins. Manually set genres and a source’s default genre take precedence.",
    "download": "YouTube usually delivers Opus at about 130–160 kbps. MP3 is a conversion and does not sound better than the source – but it plays everywhere.",
    "storage": "Where the files go and how they are named. The structure is designed for media servers such as Plex or Jellyfin.",
    "throttle": "Limits the load on YouTube. These values apply to search, watchlist and downloads together. SoundCloud has its own values in the “SoundCloud” tab, Mixcloud and hearthis.at in “More sources”.",
    "soundcloud": "SoundCloud as a second source for search, watchlist and downloads – with its own limits, counters and backoff, independent of YouTube.",
    "network": "The PO token identifies requests as a real browser and lowers the risk of bot blocks.",
    "schedule": "When the watchlist is checked automatically – in the app and via the Windows Task Scheduler.",
    "appearance": "Look & feel. Changes are previewed immediately and only become permanent after saving.",
    "maintenance": "Versions, updates, database.",
    "festivals": "Recognizes festival or series, year, stage and set type from the stored titles – offline, without a single extra request.",
    "playback": "Built-in player, loudness normalisation, remembered positions and the offline analysis of your files.",
    "notifications": "Windows notifications for new sets in the inbox and finished or failed downloads – bundled into one message, never a flood. A click opens the app at the right view.",
    "mediaserver": "After downloads, ask your Plex or Jellyfin server to scan its library – bundled, local network only. The token is stored in the Windows Credential Manager, never in config.yaml.",
    "sources": "Mixcloud and hearthis.at as further sources for search, watchlist and downloads – each with its own limits, counters and backoff, independent of YouTube and SoundCloud.",
    "reupload": "Recognises the same mix uploaded again (another channel, another platform, a new id) by a compact audio fingerprint – computed offline from your files, no network."
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
      "collector": "Festival collector",
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
      "reset": "Reset",
      "detection": "Detection",
      "series": "Series",
      "backfill": "Read everything (once)",
      "loudness": "Loudness",
      "memory": "Memory & waveform",
      "analysis": "Analysis (offline, ffmpeg)",
      "playlists": "Playlists (M3U8)",
      "notify_events": "Notify me about",
      "quiet": "Quiet hours",
      "ms_paths": "Paths & timing",
      "more_sources": "Mixcloud & hearthis.at",
      "fingerprint": "Fingerprint"
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
      },
      "normalize": {
        "label": "Normalise loudness",
        "help": "Plays every set at the same perceived loudness (ReplayGain from the offline analysis or existing tags). Never clips: the gain is limited by the measured true peak."
      },
      "target_lufs": {
        "label": "Target loudness",
        "help": "−18 LUFS is the ReplayGain 2.0 reference. Higher (e.g. −14) = louder, but more sets reach their peak limit."
      },
      "resume": {
        "label": "Remember position",
        "help": "Per set, outside the first and last 30 seconds. «Ask» offers to resume, «Automatic» continues silently. The library shows the last five unfinished sets."
      },
      "waveform": {
        "label": "Waveform seek bar",
        "help": "Shows the set as a waveform with the tracklist marks. Computed once per file with ffmpeg (on first play or in the analysis); otherwise the plain bar."
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
      },
      "keep_original_mixcloud": {
        "label": "Keep Mixcloud original",
        "help": "Save Mixcloud audio unchanged (AAC, usually 64–128 kbps, as .m4a) – no second lossy conversion. Off: like “Output format”."
      },
      "keep_original_hearthis": {
        "label": "Keep hearthis.at original",
        "help": "Save the hearthis.at stream unchanged (MP3) – no second lossy conversion. Off: like “Output format”."
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
      },
      "album_from_edition": {
        "label": "Album = edition",
        "help": "Writes the edition (e.g. “Defqon.1 2024”) as album tag, so Plex and Jellyfin show all sets of a festival as one album. Off: album = title, as before."
      }
    },
    "path_preview": {
      "label": "Preview",
      "help": "Click placeholders to insert them into the path pattern.",
      "fest": "{festival}, {event_year} and {stage} are only filled when a festival is assigned. Otherwise they drop out, together with leftover separators and empty folders."
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
      "sc_off_detail": "No SoundCloud search, no watchlist checks and no downloads from SoundCloud.",
      "p_off": "{p} is turned off",
      "p_off_detail": "No {p} search, no watchlist checks and no downloads from {p}."
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
    },
    "festivals": {
      "collector_searches_per_hour": {
        "label": "Searches per hour",
        "help": "“Find missing sets” spreads its searches evenly (10 = one every 6 min). The global limit of searches per hour applies as well."
      },
      "collector_results_per_search": {
        "label": "Results per search",
        "help": "How many results one search for a missing set looks at (one request per search)."
      },
      "collector_auto_confirm": {
        "label": "Confirm automatically from",
        "help": "From this confidence a hit counts without your confirmation – only with DJ, festival and year in the title. Everything below waits for a click."
      },
      "detect": {
        "label": "Detect automatically",
        "help": "Assign festival or series, year, stage and set type to new hits and downloads. Manually set values are never overwritten."
      },
      "min_confidence": {
        "label": "Detection threshold",
        "help": "Confidence from which a match is assigned. Below it, the match only appears as a suggestion that you can accept."
      },
      "year_from_upload_date": {
        "label": "Year from upload date",
        "help": "If the title contains no year, use the upload year (counts as less certain)."
      },
      "match_description": {
        "label": "Search description too",
        "help": "Also look for festival names in the stored description."
      },
      "extra_stages": {
        "label": "Additional stages",
        "help": "Stage names besides the built-in ones (RED, BLUE, BLACK, UV, Mainstage …).",
        "ph": "+ stage"
      }
    },
    "fest_types": {
      "label": "Own set type terms",
      "help": "Words in the title that indicate a set type. They are checked before the built-in terms.",
      "ph": "Term in the title",
      "add": "Term"
    },
    "fest_test": {
      "label": "Test a title",
      "help": "Shows what the detection finds in a title. Nothing is stored; the saved settings apply.",
      "ph": "e.g. Defqon.1 2024 | RED | Closing Ceremony",
      "none": "Nothing detected",
      "assigned": "would be assigned",
      "suggested": "suggestion only"
    },
    "fest_status": {
      "title": "{assigned} of {total} mixes assigned",
      "last": "Last pass",
      "help": "Runs offline over the existing library. Manual values stay; files are not retagged or moved.",
      "button": "Assign festivals now",
      "running": "Assigning … {done} / {total}"
    },
    "series": {
      "hint": "Known festivals, radio shows and podcasts. Changes to this list are saved immediately.",
      "add": "Series",
      "show_hidden": "Show hidden",
      "reset_all": "Reset built-in series",
      "builtin": "built-in",
      "own": "own",
      "modified": "modified",
      "hidden": "hidden",
      "no_aliases": "no aliases",
      "enable": "Detect this series",
      "hide": "Hide",
      "restore": "Restore",
      "new_title": "New series",
      "edit_title": "Edit series",
      "name": "Name",
      "kind": "Kind",
      "default_genre": "Default genre",
      "aliases": "Aliases",
      "aliases_help": "Other spellings. One hit in the title is enough.",
      "weak_aliases": "Weak aliases",
      "weak_help": "Everyday words that only count together with a year.",
      "variants": "Variants",
      "variants_help": "Editions of their own, e.g. Australia or at Home.",
      "channels": "Organiser channels",
      "channels_help": "Channel name, ID or URL. Raises the confidence only."
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "Maximum entries per source",
        "help": "“Read everything (once)” in the watchlist reads at most this many entries of a channel or playlist."
      },
      "backfill_requests_per_hour": {
        "label": "Requests per hour",
        "help": "Page requests of “Read everything” are spread evenly (120 = one every 30 s); the normal spacing and the backoff apply as well. A scheduled run (Task Scheduler) continues for at most this many requests."
      }
    },
    "loudness": {
      "analyse_after_download": {
        "label": "Analyse after each download",
        "help": "Measures loudness (EBU R128) and computes the waveform right after a download – offline, at low priority, one file at a time."
      },
      "write_tags": {
        "label": "Write ReplayGain tags",
        "help": "Writes REPLAYGAIN_TRACK_GAIN/PEAK (MP3, M4A) or R128_TRACK_GAIN (Opus) into the file so other players can use it too. The audio is never re-encoded."
      },
      "waveforms": {
        "label": "Precompute waveforms",
        "help": "Computes waveforms during the analysis as well. Off: only when a set is played for the first time."
      }
    },
    "analysis": {
      "title": "{done} of {total} files analysed",
      "counts": "{tagged} tagged · {waves} waveforms · {failed} failed",
      "help": "Runs offline over the library, one file at a time at low priority – no network, the audio stays untouched. Can be cancelled at any time.",
      "button": "Analyse new files",
      "button_n": "Analyse {n} new",
      "all": "Analyse all again",
      "all_title": "Measure every file again (e.g. after replacing files outside the app)",
      "running": "Analysing … {done} / {total}",
      "no_ffmpeg_title": "ffmpeg missing",
      "no_ffmpeg": "Loudness and waveforms need ffmpeg (bin\\ffmpeg.exe, installed by setup.ps1). Settings › Maintenance shows its status."
    },
    "playlists": {
      "folder": {
        "label": "Playlist folder",
        "help": "Where exported playlists are saved. Empty = “Playlists” inside the target folder.",
        "ph": "“Playlists” in the target folder"
      },
      "relative_paths": {
        "label": "Relative paths",
        "help": "Entries relative to the playlist, so it keeps working when the music folder moves (e.g. to a USB stick). Files on another drive always get their full path."
      },
      "sync_after_download": {
        "label": "Update saved playlists after downloads",
        "help": "Playlists exported with “Keep up to date” are rewritten after each download – local only, no network."
      }
    },
    "playlists_saved": {
      "label": "Saved playlists",
      "help": "Every export is remembered here. “Keep up to date” rewrites it after downloads.",
      "none": "No playlists exported yet – use “M3U” in the library, on a DJ page or in a checklist.",
      "gone": "file missing",
      "sync": "Keep up to date",
      "sync_title": "Rewrite this playlist after downloads",
      "forget": "Remove from the list (the file stays)",
      "now": "Update now"
    },
    "notifications": {
      "enabled": {
        "label": "Windows notifications",
        "help": "Show a notification in the Windows notification centre – also after a scheduled check while the app is closed."
      },
      "new_sets": {
        "label": "New sets in the inbox",
        "help": "A watchlist check (in the app or scheduled) found new sets."
      },
      "downloads_done": {
        "label": "Downloads finished",
        "help": "One message per download run with the number of sets and their titles."
      },
      "downloads_failed": {
        "label": "Downloads failed",
        "help": "One message per run if a download failed. Details stay under Downloads."
      },
      "quiet_hours": {
        "label": "Quiet hours",
        "help": "No notifications during this time. Whatever happened is shown afterwards as one summary."
      },
      "quiet_from": {
        "label": "From",
        "help": "Start of the quiet hours (24 h)."
      },
      "quiet_to": {
        "label": "To",
        "help": "End of the quiet hours. Earlier than the start = over midnight (e.g. 22:00–07:00)."
      }
    },
    "notify": {
      "on": "Notifications on",
      "off": "Notifications off",
      "detail": "Shown through {backend}. Several events in a short time become one notification.",
      "backend_powershell": "Windows PowerShell (built into Windows)",
      "backend_winrt": "the Windows notification API (pywinrt)",
      "test": "Send test",
      "testing": "Sending …",
      "test_sent": "Test notification sent – look at the bottom right of the screen.",
      "unavailable": "Windows notifications not available",
      "unavailable_detail": "This system cannot show them (Windows PowerShell missing or blocked). Events are only written to the log."
    },
    "media_server": {
      "type": {
        "label": "Media server",
        "help": "Which server should rescan its library after downloads. Off = HCLoader does not contact any media server."
      },
      "url": {
        "label": "Server address",
        "help": "Address in your home network, e.g. http://192.168.1.10:32400 (Plex) or http://nas:8096 (Jellyfin). Only this address is contacted.",
        "ph": "http://192.168.1.10:32400"
      },
      "server_root": {
        "label": "Folder on the server",
        "help": "Where the server sees your target folder (NAS, Docker), e.g. /data/music/HCLoader. Empty = the same path as here. Needed to scan only the new folders.",
        "ph": "same path as the target folder"
      },
      "delay_seconds": {
        "label": "Wait before scanning",
        "help": "After the last download, wait this long – several downloads then become one scan."
      },
      "verify_tls": {
        "label": "Verify certificate",
        "help": "For https:// addresses. Switch off only for a self-signed certificate in your home network."
      }
    },
    "ms": {
      "off": "No media server",
      "off_detail": "Choose Plex or Jellyfin below to have its library rescanned after downloads.",
      "unsaved": "Unsaved changes – the scan uses the saved settings.",
      "on": "{server} is updated after downloads",
      "last_ok": "Last scan {t} ({n} new files)",
      "last_fail": "Last scan {t} failed",
      "never": "No scan yet",
      "all_libraries": "All libraries",
      "no_secret": "No token / API key stored yet – enter it below and test the connection.",
      "scan_now": "Scan now",
      "scanning": "Scanning …",
      "scan_sent": "Scan requested – the server reads the library in the background.",
      "secret_plex": {
        "label": "Plex token",
        "help": "Your X-Plex-Token (Plex Web › any item › Get Info › View XML: “X-Plex-Token=” in the address). Stored in the Windows Credential Manager after a successful test – never in config.yaml or the log."
      },
      "secret_jellyfin": {
        "label": "Jellyfin API key",
        "help": "Dashboard › API Keys › “+”. Stored in the Windows Credential Manager after a successful test – never in config.yaml or the log."
      },
      "secret_ph": "paste here",
      "secret_kept": "stored – leave empty to keep it",
      "stored_short": "stored",
      "stored_title": "Stored in the Windows Credential Manager",
      "forget": "Remove",
      "forgotten": "Token removed from the Windows Credential Manager",
      "connect": {
        "label": "Connection",
        "help": "Checks the address and the token and loads the list of libraries. Two short requests to your server, nothing else."
      },
      "test": "Test connection",
      "testing": "Testing …",
      "test_ok": "Connected to {name} (version {v}).",
      "test_libs": "{n} libraries found.",
      "stored": "Token stored.",
      "library": {
        "label": "Library",
        "help": "Which library to scan. “All libraries” scans everything (slower on big servers)."
      },
      "lib_paths": "Folders on the server: {p}"
    },
    "platform": {
      "enabled": {
        "label": "Use {p}",
        "help": "Off: no {p} search, no checks of {p} sources and no {p} downloads. Already downloaded items stay in the library."
      },
      "sleep_requests": {
        "label": "Pause between requests",
        "help": "Waiting time between metadata queries to {p} (search, watchlist)."
      },
      "sleep_interval": {
        "label": "Download pause – minimum",
        "help": "After each {p} download, a random pause between minimum and maximum follows."
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
        "help": "Separate counter for {p}. The rest stays in the queue."
      },
      "max_downloads_per_day": {
        "label": "Max. downloads per day",
        "help": "Separate counter for {p}, manual and automatic downloads together."
      },
      "max_searches_per_hour": {
        "label": "Max. searches per hour",
        "help": "Separate counter for {p}."
      },
      "backoff_initial_hours": {
        "label": "Backoff – initial value",
        "help": "Block time after {p} reported too many requests (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Backoff – maximum",
        "help": "The block time doubles with each further block up to this value."
      }
    },
    "reupload": {
      "enabled": {
        "label": "Detect re-uploads",
        "help": "Computes a compact audio fingerprint per set offline with ffmpeg and compares new downloads with your library. A match is marked “Probable re-upload of …” – nothing is deleted automatically."
      },
      "fingerprint_after_download": {
        "label": "Fingerprint after each download",
        "help": "One file at a time at low priority, after the loudness analysis. Off: only the library pass below."
      },
      "precheck": {
        "label": "Check before downloading",
        "help": "Also compares duration (±5 s) and title with the library on the same platform before a download – no extra request. Hits go to the inbox instead of the queue and show “Probably already downloaded”."
      },
      "head_minutes": {
        "label": "Minutes from the start",
        "help": "How much of the beginning goes into the fingerprint. More = safer for sets with a long identical intro, a little slower."
      },
      "windows": {
        "label": "Extra windows",
        "help": "30-second windows at fixed times: half from the start (5, 10, 15 … min), half before the end (2, 6, 12 … min), so a copy with a longer intro or outro still lines up. Two different sets that open with the same track are told apart by these. 0 = start only."
      },
      "min_score": {
        "label": "Match threshold",
        "help": "Share of matching fingerprint hashes from which a set counts as re-upload. Lower = finds more, but more false hits."
      },
      "title": "{done} of {total} files fingerprinted",
      "marks": "{open} open · {linked} linked · {kept} kept",
      "help": "Runs offline over the library, one file at a time at low priority – no network, the audio stays untouched. Can be cancelled at any time.",
      "button": "Fingerprint new files",
      "button_n": "Fingerprint {n} new",
      "all": "Fingerprint all again",
      "all_title": "Compute every fingerprint again (e.g. after changing the windows) – your decisions stay",
      "running": "Comparing … {done} / {total} · {found} found",
      "show": "Show {n} in the library",
      "no_ffmpeg": "Fingerprints need ffmpeg (bin\\ffmpeg.exe, installed by setup.ps1). Settings › Maintenance shows its status."
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
      },
      "resume": {
        "ask": "Ask",
        "auto": "Automatic",
        "off": "Off"
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
    },
    "media_server": {
      "type": {
        "off": "Off",
        "plex": "Plex",
        "jellyfin": "Jellyfin"
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
    },
    "series_delete": {
      "title": "Delete series?",
      "text": "“{name}” and its editions are deleted.",
      "warn": {
        "one": "{n} mix loses its assignment.",
        "other": "{n} mixes lose their assignment."
      }
    },
    "series_hide": {
      "title": "Hide series?",
      "text": "“{name}” is no longer detected. You can bring it back with “Show hidden”."
    },
    "series_reset": {
      "title": "Reset built-in series?",
      "text": "All built-in series return to their original state, hidden ones come back. Your own series stay.",
      "ok": "Reset"
    },
    "reupload_del": {
      "title": "Delete re-upload?",
      "ok": "Delete file",
      "text": "“{title}” is probably the same mix as “{of}”. Delete this newer file?",
      "note": "The original stays. The entry is set to “ignored” and is not downloaded again."
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
    "reset_all": "All settings reset",
    "festival_entry_only": "“{name}” saved in the entry only – the file is not reachable",
    "series_saved": "Series “{name}” saved",
    "series_deleted": "Series “{name}” deleted",
    "series_hidden": "Series “{name}” hidden",
    "series_reset": "Built-in series restored",
    "assign_done": "Festivals assigned: {assigned} new, {suggested} suggestions",
    "assign_cancelled": "Assignment cancelled: {assigned} new, {suggested} suggestions",
    "analysis_done": "Loudness analysed: {n} files ({failed} failed)",
    "analysis_cancelled": "Analysis cancelled after {n} files",
    "fp_done": "Library compared: {n} files, {found} probable re-uploads",
    "fp_cancelled": "Comparison cancelled after {n} files"
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
    "rn_version": "Version",
    "notes_more": "more"
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
  },
  "fest": {
    "all": "All series",
    "other": "Other / unassigned",
    "other_hint": "No festival",
    "sets": {
      "one": "{n} set",
      "other": "{n} sets"
    },
    "editions": {
      "one": "{n} edition",
      "other": "{n} editions"
    },
    "suggestions": {
      "one": "{n} suggestion",
      "other": "{n} suggestions"
    },
    "all_years": "All",
    "no_stage": "No stage",
    "kind": {
      "festival": "Festival",
      "radio": "Radio show",
      "podcast": "Podcast"
    },
    "set_type": {
      "live_set": "Live set",
      "closing_ceremony": "Closing ceremony",
      "opening": "Opening",
      "endshow": "Endshow",
      "full_show": "Full show",
      "warm_up": "Warm-up",
      "anthem": "Anthem",
      "episode": "Episode"
    },
    "change": "change festival",
    "change_manual": "set manually, click to change",
    "add": "Set festival or series",
    "suggested": "Uncertain suggestion: {name}",
    "accept": "Accept suggestion",
    "p_title": "Festival / series",
    "p_search": "Search series …",
    "p_none": "No festival",
    "p_no_match": "No series found",
    "p_year": "Year",
    "p_variant": "Variant",
    "p_stage": "Stage",
    "p_type": "Set type",
    "p_apply": "Apply",
    "p_auto": "Reset to automatic"
  },
  "backfill": {
    "action": "Read everything (once)",
    "action_title": "Read the complete list of this source once, page by page – new hits go to the inbox",
    "again_title": "Read everything again – only entries that are not known yet are added",
    "search_title": "Not for saved searches – a search returns at most 100 results",
    "why_open": "Reading has already started – pause or cancel it below the name",
    "st_pending": "Waiting",
    "st_running": "Reading …",
    "st_paused": "Paused",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / max. {cap}",
    "added": "+{n} in the inbox",
    "done_short": "All read {date}",
    "done_title": "Read completely: {date} · {n} entries",
    "note_title": "Last interruption",
    "pause": "Pause",
    "resume": "Resume",
    "cancel": "Cancel",
    "keep": "Keep reading",
    "dlg_title": "Read everything from “{name}”?",
    "dlg_text": "Reads the complete list of this source once, page by page – flat and cheap, through the throttle; nothing is downloaded. Hits that pass your filters go to the <b>inbox</b>, also for sources with automatic download. Videos you already know are never added twice.",
    "dlg_requests": "requests",
    "dlg_time": "duration",
    "dlg_entries": "entries",
    "dlg_known": "Known from the last check: <b>{n}</b> entries.",
    "dlg_unknown": "The size is unknown – estimated conservatively for the maximum of {cap} entries.",
    "dlg_capped": "Only the first {cap} entries are read (Settings › Schedule).",
    "dlg_resume": "Continues after {n} entries already read; their pages are requested again first.",
    "dlg_headless": "Too large for a scheduled run ({n} requests per hour): if the app is closed before it finishes, it only continues in the app.",
    "dlg_pace": "At most {n} requests per hour, evenly spread. A backoff (HTTP 429 / bot check), closing the app or an error only interrupts it – it continues automatically later. You can pause or cancel it at any time.",
    "dlg_ok": "Start reading",
    "dlg_ok_resume": "Continue reading",
    "dlg_cancel_title": "Cancel reading?",
    "dlg_cancel_text": "Reading “{name}” stops and its progress is discarded. Hits already in the inbox stay.",
    "toast_started": "Reading “{name}” completely – runs in the background",
    "toast_done": "“{name}” read completely – +{n} in the inbox",
    "toast_paused": "“{name}” paused – continue with “Resume”",
    "toast_cancelled": "Reading “{name}” cancelled"
  },
  "collector": {
    "nav": "Collector",
    "open_title": "Festival collector: gather all sets of a festival edition with a checklist",
    "title": "Festival collector",
    "sub": "All sets of one festival edition – from its timetable, with a checklist",
    "back_library": "Back to the library",
    "back_list": "All checklists",
    "collect": "Collect this edition",
    "collect_title": "Checklist of all sets of {name}: find missing sets and download them",
    "open_checklist": "Checklist {n} / {total}",
    "sets": "Sets",
    "lists": "Checklists",
    "card_empty": "No sets yet",
    "new_title": "New checklist",
    "new_text": "Pick a festival and a year. The sets come from the organiser’s playlist, a pasted timetable or a shipped file.",
    "new_ok": "Open checklist",
    "f_series": "Festival / series",
    "f_series_ph": "Choose …",
    "f_series_other": "Radio shows & podcasts",
    "err_series": "Choose a festival or series.",
    "err_year": "Enter the year of the edition.",
    "empty_title": "No checklist yet",
    "empty_text": "A checklist lists every set of one festival edition and shows what you already have.",
    "step1": "Choose the festival and the year above.",
    "step2": "Import the organiser’s playlist or paste the timetable.",
    "step3": "Untick what you don’t want, find the missing sets and download.",
    "delete": "Delete checklist",
    "dlg_delete_title": "Delete checklist?",
    "dlg_delete_text": "The checklist of “{name}” with all its rows is removed. A running search stops.",
    "dlg_delete_keep": "Downloaded files, library entries and saved hits stay.",
    "toast_deleted": "Checklist “{name}” deleted",
    "in_library": "{n} in the library",
    "show_library": "Show in the library ({n})",
    "more": "More",
    "st": {
      "found": "Found",
      "queued": "Queued",
      "downloaded": "Downloaded",
      "missing": "Missing",
      "ignored": "Ignored"
    },
    "filter_status": "Show only: {name}",
    "sources": "Sources",
    "src_playlist": "Import organiser playlist",
    "src_paste": "Paste timetable (Beta)",
    "files": "Shipped timetables",
    "src_add": "Add row",
    "all_stages": "All stages",
    "all_days": "All days",
    "no_day": "No day",
    "search": "Filter by DJ …",
    "col_dj": "DJ / set",
    "col_when": "Day / time",
    "col_status": "Status",
    "col_match": "Matched video",
    "source": {
      "playlist": "Playlist",
      "timetable": "Timetable",
      "file": "Timetable file",
      "manual": "Added by hand"
    },
    "edited": "Edited by hand – these values win over later imports",
    "check_title": "Collect this set",
    "all_title": "Select all / none (shown rows)",
    "m_none": "Not searched yet",
    "m_searched": "Nothing found ({date})",
    "confirm": "Confirm",
    "confirm_title": "Uncertain hit – confirm that this is the right set",
    "reject_title": "Not this video – never suggest it for this row again",
    "reject": "Discard match",
    "candidates": "Other hits: {n}",
    "candidates_head": "Use another hit",
    "ignore": "Ignore this set",
    "unignore": "Stop ignoring",
    "delete_row": "Delete row",
    "f_artist": "DJ / artist",
    "f_day": "Day",
    "f_start": "Start",
    "f_end": "End",
    "add_ok": "Add",
    "err_artist": "DJ / artist is required.",
    "none_title": "No rows match",
    "none_text": "No row fits the current filters.",
    "rows_empty_title": "This checklist is empty",
    "rows_empty_text": "Start with the official playlist of the organiser – one flat listing usually covers most sets. Or paste the timetable as text.",
    "checked_of": "of {total} checked",
    "select_all": "Select all",
    "select_none": "None",
    "shown": "{n} of {total} rows shown",
    "to_confirm": "To confirm: {n}",
    "to_confirm_title": "Uncertain hits wait for your confirmation – click to show only them",
    "find": "Find missing sets ({n})",
    "find_again": "Search again ({n})",
    "find_title": "Search checked sets without a hit, one by one and paced – shows an estimate first",
    "find_again_title": "Every set was searched already – search those without a hit again",
    "find_none": "Nothing to search – every checked set has a hit",
    "find_running": "The search is running",
    "queue": "Download checked ({n})",
    "queue_title": "Add all checked, confirmed sets to the download queue",
    "queue_none": "Nothing to download – no checked set with a confirmed hit that is not loaded yet",
    "job_pending": "Waiting",
    "job_running": "Searching …",
    "job_paused": "Paused",
    "job_hits": "Found: {n}",
    "job_cancel": "Stop",
    "job_resume": "Resume",
    "imp_running": "Reading playlist …",
    "imp_entries": "Entries: {n}",
    "imp_hint": "flat listing, page by page",
    "imp_busy": "A playlist is already being read",
    "imp_added": "new: {n}",
    "imp_merged": "merged: {n}",
    "imp_matched": "found in the library: {n}",
    "imp_unchecked": "unchecked (too short / aftermovie): {n}",
    "imp_invalid": "invalid: {n}",
    "pl_title": "Import organiser playlist",
    "pl_text": "The official liveset playlist of the organiser is the cheapest source: one flat listing, nothing is downloaded. Every entry becomes a confirmed row; DJ, stage and set type come from the title.",
    "pl_url": "Playlist link",
    "pl_hint": "YouTube playlist or SoundCloud set. Entries that are too short, aftermovies and trailers are added unchecked. Rows from a timetable get the matching video.",
    "pl_ok": "Import",
    "pl_err_empty": "Paste the link of a playlist.",
    "toast_pl_started": "Reading the playlist – runs in the background",
    "toast_pl_done": "Playlist read –",
    "toast_pl_cancelled": "Playlist import stopped –",
    "tt_title": "Paste timetable – {name} (Beta)",
    "tt_text": "Paste the timetable as text or CSV. Headings set the day and the stage, every other line is a set. Nothing is saved until you import. Check the preview and correct rows before importing.",
    "tt_input": "Timetable",
    "tt_preview": "Preview",
    "tt_placeholder": "Saturday – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
    "tt_empty": "The recognised sets appear here.",
    "tt_nothing": "No set recognised yet.",
    "tt_sum": "Sets: {n}",
    "tt_days": "Days: {n}",
    "tt_stages": "Stages: {n}",
    "tt_skipped": "Lines not understood: {n}",
    "tt_more": "… and {n} more",
    "tt_ok": "Import ({n})",
    "tt_edit_hint": "Correct or remove sets here before importing. Changing the text on the left reads it again.",
    "toast_tt": "Timetable imported –",
    "files_text": "Timetables curated in the HCLoader repository and shipped with updates. Importing one creates the checklist of its edition.",
    "files_empty_title": "No timetables shipped yet",
    "files_empty": "Only timetables that are verifiably correct are shipped – this version comes without any. Paste the timetable as text instead.",
    "files_how_title": "Contribute a timetable",
    "files_how": "One JSON file per edition with the sets (artist, stage, day, start, end) and a link to the official timetable as its source. Send it as an issue or pull request on GitHub; the README next to the files describes the format.",
    "files_meta": "Sets: {n} · updated {date}",
    "files_source": "official source",
    "files_import": "Import",
    "files_broken": "Invalid file: {error}",
    "files_unknown": "Series unknown or hidden here",
    "est_title": "Find missing sets – {name}",
    "est_text": "Searches every checked set without a hit, one by one: <b>DJ + festival + year</b> as a flat search through the throttle. Nothing is downloaded.",
    "est_requests": "searches",
    "est_left": "free this hour",
    "est_again": "Every set was searched before – this searches the ones without a hit again.",
    "est_offline": "Just matched with your library for free: {n}.",
    "est_resume": "Continues the interrupted search.",
    "est_wait": "The search limit of this hour is used up – the first search starts {t}.",
    "est_backoff": "Backoff active until {t} – no search can start before that.",
    "est_pace": "At most {n} searches per hour, evenly spread (about one every {min} min). Uncertain hits wait for your confirmation. A backoff, closing the app or an error only interrupts the search – it continues automatically.",
    "est_ok": "Start search",
    "est_ok_resume": "Continue search",
    "toast_find_started": "Searching the missing sets of “{name}” – runs in the background",
    "toast_find_done": "Search finished – found {n} of {total}",
    "toast_find_cancelled": "Search stopped – “Find missing sets” continues it",
    "toast_offline": "Matched with your library: {n} – no search needed",
    "toast_confirmed": "“{name}” confirmed",
    "toast_rejected": "Match of “{name}” discarded",
    "toast_ignored": "“{name}” ignored",
    "toast_unignored": "“{name}” is collected again",
    "toast_row_added": "“{name}” added",
    "toast_row_added_hit": "“{name}” added – found in the library",
    "toast_row_saved": "“{name}” saved",
    "toast_row_retag": "“{name}” saved – the file is being retagged",
    "toast_row_deleted": "Row “{name}” deleted",
    "q_none": "Nothing added to the queue",
    "q_unconfirmed": "unconfirmed: {n}",
    "q_missing": "without a hit: {n}",
    "q_other": "not loadable: {n}",
    "q_retag": "retagged: {n}",
    "export": "Playlist",
    "export_title": "Export the downloaded sets of this checklist as an M3U8 playlist"
  },
  "tracks": {
    "nav": "Tracks",
    "open_title": "Which sets play a track? Search the tracklists of your library",
    "title": "Tracks",
    "sub": "Which sets play this track?",
    "back": "Back to the library",
    "search": "Artist or title, e.g. Dragonborn",
    "n_tracks": {
      "one": "{n} track",
      "other": "{n} tracks"
    },
    "n_sets": {
      "one": "{n} set",
      "other": "{n} sets"
    },
    "status": "{tracks} in {sets}",
    "status_last": "Read:",
    "scan": "Read tracklists",
    "scan_title": "Read the tracklists of all sets (offline: chapters, descriptions, CUE files)",
    "rescan": "Re-read all",
    "rescan_title": "Read the tracklists of all sets again",
    "scan_new": "Read new",
    "scan_new_title": "Read only sets that are new or changed since the last pass",
    "running": "Reading tracklists … {done} / {total}",
    "engine_like": "Simple search: this SQLite has no full-text index",
    "top_title": "Most played tracks",
    "top_sub": "in the most sets",
    "top_sets": {
      "one": "{n} set",
      "other": "{n} sets"
    },
    "top_find": "Show the sets with this track",
    "top_empty": "No track appears in more than one set yet.",
    "results": {
      "one": "{n} set with “{q}”",
      "other": "{n} sets with “{q}”"
    },
    "truncated": "first {n} – refine the search",
    "more_hits": {
      "one": "+ {n} more hit",
      "other": "+ {n} more hits"
    },
    "no_results_title": "No set plays “{q}”",
    "no_results_text": "Try part of the artist or title. Only sets with a tracklist (chapters, description, CUE file) can be found.",
    "empty_title": "No tracklists yet",
    "empty_text": "HCLoader reads tracklists from the chapters, descriptions and CUE files of your sets – offline, without asking YouTube.",
    "empty_none_title": "None of your sets has a tracklist",
    "empty_none_text": "Tracklists come from chapters, timestamped descriptions and CUE files. Sets without them cannot be searched.",
    "library_empty": "Download a few sets first – their tracklists show up here.",
    "jump": "Play from {time}",
    "jump_external": "Opened in the default player – jump to {time} there",
    "no_time": "No timestamp in the tracklist",
    "tracklist": "Tracklist",
    "tracklist_title": "Show the whole tracklist of this set",
    "panel_source": "Source: {source}",
    "source_chapters": "chapters",
    "source_description": "description",
    "source_id3": "ID3 chapters",
    "source_cue": "CUE file",
    "source_none": "none",
    "panel_empty": "This set has no tracklist",
    "panel_empty_hint": "Neither chapters, a description with a tracklist nor a CUE file were found.",
    "close": "Close",
    "id_track": "Unreleased or unidentified track (ID)",
    "play_set": "Play the set from the start",
    "toast_done": "Tracklists read: {sets}, {tracks}",
    "toast_cancelled": "Reading tracklists cancelled"
  },
  "pl": {
    "title": "Export playlist",
    "export": "Export",
    "overwrite": "Overwrite",
    "exists": "A playlist with this name already exists in this folder. Click “Overwrite” to replace it.",
    "nothing": "Nothing to export – there are no downloaded sets here.",
    "missing": "{n} files missing – they are skipped",
    "name": "File name",
    "folder": "Folder",
    "browse": "Browse …",
    "paths": "Paths in the playlist",
    "relative": "Relative",
    "absolute": "Absolute",
    "relative_help": "Relative to the playlist – keeps working when you move the whole music folder. Files on another drive are written with their full path.",
    "absolute_help": "Full paths – the playlist can be stored anywhere, but breaks when the music moves.",
    "sync": "Keep up to date after downloads",
    "sync_help": "Rewritten automatically after each download.",
    "sync_off": "Remembered – takes effect once “Update saved playlists after downloads” is on (Settings › Storage).",
    "done": "Playlist saved ({sets}): {path}",
    "skipped": "{n} missing skipped",
    "fallback": "{n} on another drive written with full path",
    "synced": "Playlists updated: {n}",
    "sync_failed": "Playlists not updated: {n} (see log)"
  },
  "djs": {
    "nav": "DJs",
    "open_title": "DJ pages: every artist in your library, with aliases and b2b sets",
    "title": "DJs",
    "sub": "Artists in your library",
    "back_library": "Back to the library",
    "back": "All DJs",
    "add": "Add DJ / act",
    "search": "Search DJs or aliases",
    "sort": "Sort",
    "sort_sets": "Sets",
    "sort_recent": "Recent",
    "sort_name": "Name",
    "hidden_chip": "Hidden: {n}",
    "n_festivals": "Festivals: {n}",
    "n_b2b": "b2b: {n}",
    "aka": "aka {names}",
    "unhide": "Show in the list again",
    "none_title": "No DJ found",
    "none_text": "Try another name or alias.",
    "empty_title": "No DJs yet",
    "empty_text": "DJs are recognised offline from the titles of your downloaded sets, from festival checklists and from artist channels.",
    "b2b_title": "Played together (b2b) – the set counts for every artist",
    "b2b_with": "b2b with {names}",
    "aliases": "Aliases",
    "no_aliases": "No aliases",
    "split_title": "Split off “{alias}” – count it as its own DJ",
    "play_all": "Play all",
    "export": "Export M3U",
    "export_title": "Export playlist: {name}",
    "watch": "Add to watchlist",
    "discover": "Search in Discover",
    "stat_sets": "Sets",
    "stat_hours": "Hours",
    "stat_festivals": "Festivals",
    "stat_years": "Years",
    "stat_b2b": "b2b",
    "other_sets": "Other sets · {year}",
    "tracks": "Most played in their sets",
    "track_sets": "{n}×",
    "tracks_none": "No tracklists for these sets yet – Library › Tracks reads them offline.",
    "play_all_external": "“Play all” needs the built-in player (Settings › Playback).",
    "watch_exists": "Already in the watchlist: {name}",
    "watch_title": "Watch {name}",
    "watch_ok": "Add to watchlist",
    "watch_channel": "New sets from {name}’s own channel will appear in your inbox:",
    "watch_search": "No own channel known – the watchlist will regularly search YouTube for:",
    "watch_note": "Nothing is downloaded automatically. You can change or remove the source in the watchlist at any time.",
    "watch_added": "Added to the watchlist: {name}",
    "split_q_title": "Split off alias",
    "split_q": "Count sets credited as “{alias}” as a separate DJ instead of {name}?",
    "split_ok": "Split off",
    "split_done": "“{alias}” is its own DJ again",
    "edit": "Edit name and aliases",
    "edit_title": "Edit {name}",
    "add_title": "Add DJ or act",
    "f_name": "Name",
    "f_aliases": "Aliases",
    "f_aliases_help": "Other spellings and short names (e.g. “HH”). Sets credited with an alias count for this DJ.",
    "f_act_help": "Optional. A duo with “&” in its name (e.g. “D-Block & S-te-Fan”) is then counted as one act instead of a b2b.",
    "f_alias_add": "+ alias",
    "f_channel": "Own channel (optional)",
    "f_channel_help": "YouTube or SoundCloud channel URL – used by “Add to watchlist”.",
    "saved": "Saved",
    "merge": "Merge with another DJ …",
    "merge_title": "Merge {name}",
    "merge_text": "All sets and spellings of {name} will count for the DJ you choose. You can split it off again later.",
    "merge_into": "Merge into",
    "merge_ok": "Merge",
    "merge_none": "There is no other DJ to merge with.",
    "merged": "{name} merged",
    "hide": "Not a DJ – hide",
    "hidden_done": "Hidden from the DJ list",
    "unhidden_done": "Shown in the DJ list again",
    "sub_n": {
      "one": "{n} DJ",
      "other": "{n} DJs"
    }
  },
  "stats": {
    "title": "Statistics",
    "sub": "Your library in numbers – offline, from the database",
    "range": "Period",
    "p_all": "All time",
    "p_12m": "12 months",
    "p_30d": "30 days",
    "p_year": "This year",
    "p_custom": "Custom",
    "from": "From",
    "to": "To",
    "n_sets": {
      "one": "{n} set",
      "other": "{n} sets"
    },
    "sets_word": {
      "one": "set",
      "other": "sets"
    },
    "k_sets": "Sets",
    "k_hours": "Playing time",
    "k_size": "On disk",
    "k_avg": "Average set",
    "of_library": "of {n} in the library",
    "since": "since {d}",
    "days_nonstop": "{n} days non-stop",
    "last_dl": "last download {d}",
    "avg_size": "{s} per set",
    "sizes_missing": {
      "one": "{n} file not measured yet",
      "other": "{n} files not measured yet"
    },
    "measuring": "Measuring file sizes … {done} / {total}",
    "h_months": "Downloads per month",
    "h_years_dl": "Downloads per year",
    "best_month": "Best: {m} ({n})",
    "h_genres": "By genre",
    "h_sources": "Sources",
    "h_festivals": "Top festivals",
    "editions": {
      "one": "{n} edition",
      "other": "{n} editions"
    },
    "festivals_other": "+ {n} sets from {f} other festivals",
    "no_festivals": "No festival sets in this period – Settings › Festivals & series assigns them.",
    "h_djs": "Top DJs",
    "open_dj": "Open the DJ page of {name}",
    "no_djs": "No DJs recognised in this period.",
    "h_years": "By year of the set",
    "year_unknown": "{n} without a known year",
    "h_tracks": "Most played tracks",
    "no_tracks": "No track appears in two sets yet – tracklists come from chapters and descriptions (Library › Tracks).",
    "h_watchlist": "Watchlist activity",
    "w_checks": "Checks",
    "w_scheduled": "of them scheduled",
    "w_found": "Found",
    "w_inbox": "In the inbox",
    "w_library": "In the library",
    "w_source": "Source",
    "w_found_n": "{n} found",
    "w_checks_n": "{n} checks",
    "w_last": "last check {t}",
    "w_none_range": "No source found anything in this period.",
    "w_no_sources": "No watchlist sources yet.",
    "none": "Nothing in this period.",
    "range_empty": "Nothing was downloaded in this period – choose a longer one.",
    "error": "Statistics not available",
    "empty_title": "No sets yet",
    "empty_text": "As soon as the first sets are in your library, you will see here what you collect – genres, festivals, DJs, hours.",
    "empty_go": "Discover sets"
  },
  "reupload": {
    "tag": "Re-upload?",
    "tag_title": "Probably a re-upload of “{title}” ({p}, {score} % match) – click to decide",
    "linked": "Same mix",
    "linked_title": "Linked as the same mix as “{title}” ({p})",
    "chip": "Re-uploads ({n})",
    "chip_title": "Show only sets marked as probable re-upload",
    "menu_head": "Probable re-upload of “{title}” · {score} %",
    "menu_head_linked": "Same mix as “{title}”",
    "keep": "Keep both",
    "link": "Link as the same mix",
    "undo": "Undo decision",
    "show_original": "Show the original",
    "delete_new": "Delete this newer file",
    "toast_keep": "Both kept – the mark is gone",
    "toast_link": "Linked as the same mix",
    "toast_open": "Decision undone",
    "toast_found": "Probable re-upload: “{title}” matches “{of}” – see Library",
    "dl_notice": "Recent downloads that are probably re-uploads of sets you already have ({n}):",
    "review": "Review in the library",
    "adopt": "Original missing – keep this copy",
    "toast_adopt": "This copy now replaces the missing original",
    "original_missing_head": "The original file is missing – this copy is the last one and cannot be deleted here",
    "original_unknown_head": "Target folder not reachable – the original cannot be checked"
  },
  "catchup": {
    "cancel": "Stop the background catch-up",
    "tip": "Older library items are processed offline in the background. If you stop it, it continues at the next start.",
    "step": {
      "festivals": "Assigning festivals",
      "tracklists": "Reading tracklists",
      "analysis": "Analysing loudness",
      "fingerprints": "Fingerprinting"
    }
  }
});
