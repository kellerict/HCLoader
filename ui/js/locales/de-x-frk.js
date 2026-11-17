/* HCLoader UI texts – Franconian dialect (Fränggisch, de-x-frk; «ss» instead of ß, guillemets «»).
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "de-x-frk", "name": "Fränggisch", "dir": "ltr", "intl": "de-DE", "fallback": "de"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "HARD MUSIC ARCHIVE",
    "mock": "MOCK-MODUS"
  },
  "nav": {
    "discover": "Entdeggn",
    "inbox": "Eigang",
    "watchlist": "Watchlist",
    "downloads": "Downloads",
    "library": "Biggerei",
    "log": "Brodokoll",
    "settings": "Einstellungen"
  },
  "navfoot": {
    "today": "HEID",
    "next": "NÄCHSDE PRÜFUNG"
  },
  "common": {
    "ok": "Basst",
    "cancel": "Abbrechn",
    "save": "Speichern",
    "delete": "Lösch'n",
    "edit": "Ändern",
    "remove": "Wegdoa",
    "reset": "Zurücksetzn",
    "on": "an",
    "off": "aus",
    "current": "aktuell",
    "loading": "ladd …",
    "add_chip": "+ dazu",
    "empty": "«leer»",
    "empty_list": "«kanner»"
  },
  "fmt": {
    "today": "heid",
    "yesterday": "gesdern",
    "never": "noch nie",
    "no_date": "Dadum unbekannd",
    "just_now": "grad eben",
    "today_at": "heid {t}",
    "tomorrow_at": "morng {t}",
    "yesterday_at": "gesdern {t}",
    "views": {
      "one": "{v} Aufruf",
      "other": "{v} Aufrufe"
    }
  },
  "unit": {
    "s": "s",
    "h": "h",
    "minutes": "Minudn",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "Zeichn",
    "results": "Treffer",
    "entries": "Einträch",
    "clock": "Uhr"
  },
  "range": {
    "ge_sleep": "≥ Minimum",
    "ge_initial": "≥ Startwert"
  },
  "status": {
    "new": "Neu",
    "inbox": "Im Eigang",
    "queued": "In der Schlang",
    "downloading": "Ladd",
    "done": "Gladn",
    "ignored": "Ignoriert",
    "failed": "Fehler"
  },
  "period": {
    "all": "Alle",
    "7d": "Letzde 7 Dooch",
    "30d": "Letzde 30 Dooch",
    "1y": "Letzde 12 Monad",
    "year": "A bestimmds Jahr",
    "custom": "Selber eistelln"
  },
  "source_type": {
    "channel": "Kanal",
    "playlist": "Playlist",
    "search": "Suche"
  },
  "platform": {
    "youtube": "YouTube",
    "soundcloud": "SoundCloud",
    "label": "Plattform",
    "sc_off": "SoundCloud is ausgschalt – eischalten unter Einstellungen › SoundCloud."
  },
  "genre": {
    "change": "Genre ändern",
    "manual": "Genre vo Hand gsetzt",
    "change_manual": "Genre ändern (vo Hand gsetzt)"
  },
  "run_kind": {
    "watchlist": "Watchlist",
    "headless": "Aufgabnplanung",
    "manual": "Vo Hand"
  },
  "phase": {
    "waiting": "Wardet",
    "sleep": "Pause bis zum nächsdn Download",
    "download": "Ladn",
    "convert": "Umwandln",
    "tag": "Daggn",
    "failed": "Fehlgschlong"
  },
  "po_mode": {
    "off": "Aus",
    "script": "Script",
    "http": "HTTP"
  },
  "po_mode_long": {
    "off": "Aus",
    "script": "Script (Deno)",
    "http": "HTTP-Server (lokal)"
  },
  "statusbar": {
    "ok": "Basst",
    "missing": "fehld",
    "po": "PO-Token",
    "po_active": "aktiv ({mode})",
    "po_inactive": "inaktiv",
    "po_error": "Fehler",
    "backoff": "Backoff",
    "backoff_none": "kanner",
    "backoff_until": "bis {t} · noch {rest}",
    "queue": "Schlang",
    "queue_empty": "leer",
    "queue_active": "aktiv",
    "queue_paused": "pausierd",
    "today": "Heid",
    "next": "Nächsde Prüfung",
    "next_off": "aus",
    "backoff_until_short": "bis {t}",
    "sc_backoff": "Backoff bis {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · heid {day}/{day_max} gladn · {s}/{s_max} Suchen diese Stund",
    "sc_tip": "SoundCloud · heid {day}/{day_max} gladn · {s}/{s_max} Suchen diese Stund",
    "backoff_tip": "{p}: Backoff bis {t} (noch {rest})"
  },
  "schedule": {
    "due": "fällich",
    "kind_app": "App",
    "kind_task": "Aufgabe",
    "tip_app": "Nächsde Watchlist-Prüfung in der App: {t} (solang HCLoader läuft).",
    "tip_task": "Nächsde Watchlist-Prüfung über die Windows-Aufgabnplanung: {t}.",
    "tip_any": "Nächsde Watchlist-Prüfung: {t}.",
    "tip_off": "Kanne automadische Prüfung – weder in der App noch über die Windows-Aufgabnplanung.",
    "tip_backoff": "Solang der Backoff aktiv is, wird nix geprüft."
  },
  "card": {
    "source": "Gfunden über die Watchlist-Quelln «{name}»",
    "select": "Auswähln",
    "open": "Auf {p} öffnen",
    "ignore": "Ignorieren",
    "unignore": "Nimmer ignorieren",
    "more": "Weidere Aktionen",
    "download": "Runterladn",
    "watch": "Kanal zur Watchlist",
    "block": "Kanal sperrn",
    "set_genre": "Genre setzn",
    "date_approx": "Ungefähres Dadum – YouTube liefert in der Suche bloss «vor X Jahrn»",
    "date_unknown": "Kans Upload-Dadum gliefert",
    "duplicate": "Wahrscheinlich scho gladn ({p})",
    "duplicate_title": "Sehr ähnlicher Titel und gleiche Dauer wie «{title}» vo {p} – dort scho gladn oder eigereiht. Ladn gehd drotzdem.",
    "preview": "Bloss Vorschau (Go+) – ned ladbar",
    "preview_title": "SoundCloud liefert für den Track bloss a 30-Sekunden-Vorschau (Go+). Der kann ned gladn werdn."
  },
  "discover": {
    "placeholder": "Suche nach Mix, Liveset, DJ, Event …",
    "search": "Suchen",
    "searching_btn": "Suche …",
    "searching": "Suche läuft – flache Abfrage, schond YouTube …",
    "sort": "Sordierung",
    "sort_rel": "Relevanz",
    "sort_date": "Neuesde zuerschd",
    "sort_dur": "Längsde zuerschd",
    "sort_views": "Meisde Aufrufe",
    "quota": "Suchen diese Stund: {n} / {max}",
    "quota_sc": "SoundCloud-Suchen diese Stund: {n} / {max}",
    "placeholder_sc": "Auf SoundCloud suchen: Mix, Set, DJ, Podcast …",
    "platform_title": "Wo gsuchd wird",
    "searching_sc": "Suche läuft – flache Abfrage, schond SoundCloud …",
    "ready_text_sc": "Suchbegriff eigeben und mit Enter auf SoundCloud suchen.",
    "previews": "{n} bloss Vorschau (Go+)",
    "previews_title": "Go+-Vorschaun sin nie ladbar. Sichtbar, wenn «Gladne & ignorierde ausblenden» aus is.",
    "filters": "Filder",
    "toggle_filters": "Filder-Panel ein-/ausblenden",
    "f_duration": "Dauer (Minudn)",
    "f_min": "Minimum",
    "f_max": "Maximum (leer = offen)",
    "f_max_ph": "max",
    "f_period": "Upload-Zeitraum",
    "f_year": "Jahr",
    "f_year_prev": "A Jahr zurück",
    "f_year_next": "A Jahr vor",
    "f_from": "Von",
    "f_to": "Bis",
    "f_hint_year": "YouTube liefert das Dadum in der Suche bloss ungefähr («vor 13 Jahrn»). Drum zählt ±1 Jahr – und genauso jeder Mix mit «{year}» im Titel.",
    "f_hint_custom": "YouTube liefert das Dadum in der Suche bloss ungefähr. Bei ungefährem Dadum gild an beedn Rändern ±1 Jahr Toleranz.",
    "chip_title": "Klick: Genre ein-/ausblenden · Doppelklick: bloss dieses Genre (seine Begriffe werdn an die Suche angehängd)",
    "scope": "Suche ergänzd um",
    "scope_title": "Diese Begriffe hängd die nächsde Suche an dein Suchtext an.",
    "searched": "Gsuchd mit",
    "stale": "Filder seitdem gändert",
    "re_search": "Neu suchen",
    "re_search_title": "Die Treffer stammen aus der letzdn Suche. Neu suchen, damit Genre und Jahr in den Suchbegriff eifliessn (zählt als a Suche).",
    "need_query": "Bidde erschd an Suchbegriff eigeben.",
    "f_inc": "Include-Keywords",
    "f_exc": "Exclude-Keywords",
    "f_show": "Anzeige",
    "f_hide": "Gladne & ignorierde ausblenden",
    "f_blacklist": "Kanal-Blacklist anwenden",
    "count": {
      "one": "{n} Treffer · {hidden} rausgfiltert",
      "other": "{n} Treffer · {hidden} rausgfiltert"
    },
    "selected": "{n} ausgwählt",
    "select_all": "Alle wähln",
    "download_sel": "Auswahl ladn",
    "ready_title": "Bereid",
    "ready_text": "Suchbegriff eigeben und mit Enter starddn.",
    "none_title": "Nix gfunden",
    "none_text": "Filder lockern oder andere Suchbegriffe probiern.",
    "none_year": "Kann Treffer aus {year}. Neu suchen, damit die Jahreszahl in den Suchbegriff eifliesst – oder das Jahr ändern."
  },
  "inbox": {
    "title": "Eigang",
    "sub": "Neue Treffer aus der Watchlist, die alle Filder bestehn",
    "sub_n": {
      "one": "{n} neuer Treffer aus der Watchlist, der alle Filder besteht",
      "other": "{n} neue Treffer aus der Watchlist, die alle Filder bestehn"
    },
    "ignore_all": "Alle ignorieren",
    "download_all": "Alle ladn",
    "ignore_sel": "Auswahl ignorieren",
    "download_sel": "Auswahl ladn",
    "select_all": "Alle wähln",
    "select_none": "Auswahl aufheben",
    "src_all": "Alle Quelln",
    "src_none": "Ohne Quelln",
    "src_title": "Bloss Treffer von dera Quelln zeign",
    "count": {
      "one": "{n} Treffer",
      "other": "{n} Treffer"
    },
    "count_of": "{n} von {total} Treffern",
    "selected": "{n} ausgwählt",
    "empty_title": "Eigang leer",
    "empty_text": "Die Watchlist hod kane neuen Mixes gfunden.",
    "empty_nosrc": "Noch kane Quelln in der Watchlist – Kanal, Playlist oder Suche dazutun, dann landen neue Mixes hier.",
    "empty_next": "Nächsde Prüfung: {t}.",
    "to_watchlist": "Zur Watchlist"
  },
  "watchlist": {
    "title": "Watchlist",
    "sub_n": {
      "one": "{n} Quelln · {active} aktiv",
      "other": "{n} Quelln · {active} aktiv"
    },
    "sub_next": "nächsde Prüfung {t}",
    "add": "Quelln",
    "check_all": "Alle etz prüfn",
    "check": "Prüfn",
    "checking": "prüfd …",
    "queued": "wardet …",
    "running": "Prüfd …",
    "running_n": "Prüfd {i} / {n} …",
    "col_active": "Aktiv",
    "col_name": "Name",
    "col_type": "Dyp",
    "col_genre": "Genre",
    "col_auto": "Neue Treffer",
    "col_max": "Max.",
    "col_last": "Zuletzt gprüft",
    "col_new": "Neu",
    "genre_auto": "automadisch",
    "genre_auto_long": "Automadisch (aus Keywords)",
    "auto_on": "ladn",
    "auto_off": "Eigang",
    "auto_title_on": "Neue Treffer werdn automadisch runtergladn",
    "auto_title_off": "Neue Treffer landen bloss im Eigang",
    "new_title": "Im Eigang anzeign",
    "check_title": "Die Quelln etz prüfn",
    "why_off": "Quelln is ned aktiv",
    "why_running": "A Prüfung läuft scho",
    "why_backoff": "Backoff aktiv – Prüfn is gsperrt",
    "why_backoff_p": "Backoff ({p}) aktiv – Prüfn is gsperrt",
    "why_sc_off": "SoundCloud is ausgschalt",
    "error_title": "Letzde Prüfung fehlgschlong",
    "backoff": "<b>Backoff aktiv bis {t}</b> (noch {rest}). Die Watchlist kann ned gprüft werdn – a gplande Prüfungen setzn solang aus.",
    "backoff_p": "<b>Backoff ({p}) aktiv bis {t}</b> (noch {rest}). Quelln vo {p} werdn solang übersprungen – {other} läuft weider.",
    "backoff_link_sc": "SoundCloud öffnen",
    "backoff_link": "Schonung öffnen",
    "none_active": "Kane aktive Quelln zum Prüfn",
    "empty_title": "Kane Quelln",
    "empty_text": "Kanal, Playlist oder gspeicherde Suche dazutun.",
    "add_title": "Quelln hinzufügn",
    "edit_title": "Quelln ändern",
    "f_type": "Dyp",
    "f_name": "Name",
    "f_url": "URL",
    "f_query": "Suchbegriff",
    "f_genre": "Standard-Genre",
    "f_max": "Max. Einträch",
    "f_newest_last": "Neuesde stehn hinden (Playlist rückwärts lesn)",
    "hint_newest_last": "YouTube hängd neue Videos bei vielen Playlists hinden an. Liest die ganze Playlist (ca. 1 Abfrage pro 100 Videos, max. 2000 Einträch).",
    "rev_title": "Neuesde stehn hinden – die Playlist wird vo hinden gleesn",
    "rev_short": "rückwärts",
    "f_enabled": "Aktiv – bei «Alle prüfn» und im Zeitplan berücksichdigen",
    "f_hits": "Neue Treffer",
    "hits_inbox": "In den Eigang",
    "hits_auto": "Automadisch ladn",
    "hint_inbox": "Treffer wardn im Eigang, bis du sie lädsd oder ignorierst.",
    "hint_auto": "Treffer, die alle Filder bestehn, gehn direkd in die Warteschlang.",
    "hint_channel": "YouTube-Kanal (…/@name oder …/channel/UC…, wahlweise /videos oder /streams) oder SoundCloud-Profil (soundcloud.com/name).",
    "hint_playlist": "YouTube-Playlist mit «list=…» oder SoundCloud-Set (soundcloud.com/name/sets/set). Gprüft werdn die neuesdn Einträch.",
    "f_platform": "Suchen auf",
    "detected": "erkannd: {p} · {type}",
    "not_detected": "URL ned erkannd",
    "suggested": "Vorschlag",
    "suggested_title": "Aus der URL vorgschlong. Unverändert ersetzd ihn die erschde Prüfung durch den echdn Namen – oder einfach überschreibn.",
    "hint_name_auto": "Vorschlag aus der URL – frei änderbar. Unverändert setzd die erschde Prüfung den echdn Namen.",
    "hint_name_later": "Name kummd bei der erschdn Prüfung – oder hier selber eidraggn.",
    "name_auto_title": "Vorläufiger Name – die nächsde Prüfung setzd den echdn",
    "hint_search": "Gspeicherde Suche, wie unter «Entdeggn» – zählt bei jeder Prüfung als a Suche.",
    "hint_max": "pro Prüfung",
    "max_default": "(Standard)",
    "max_default_title": "Kan eignen Wert: es gild «Einträch pro Quelln» aus Einstellungen › Zeitplan",
    "max_title": "Leer = Standard aus Einstellungen › Zeitplan. Höchsdens 200, bei Suchquelln 100.",
    "ph_name": "z.B. Gabber Vault",
    "ph_name_later": "kummd bei der erschdn Prüfung",
    "ph_channel": "https://www.youtube.com/@kanal  oder  https://soundcloud.com/name",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  oder  https://soundcloud.com/name/sets/…",
    "ph_search": "z.B. frenchcore liveset",
    "form_error": "Die Quelln konnd ned gspeichert werdn."
  },
  "downloads": {
    "title": "Downloads",
    "sub": "Der Reihe nach, immer bloss aaner af amol",
    "pause": "Pausiern",
    "resume": "Weidermachn",
    "cancel": "Abbrechn",
    "retry": "Nochmal",
    "remove": "Wegdoa",
    "up": "Nach obn",
    "down": "Nach undn",
    "eta": "ETA",
    "position": "Position {n}",
    "sleep_left": "weider in",
    "sleep_why": "Schonung: zufällige Pause vo {min}–{max} s zwischn zwaa Downloads",
    "next_up": "Als Nächsdes",
    "sleeping": "Pause läuft",
    "sleep_range": "vo {min}–{max} s",
    "blocked_wait": "Wardet – {why}",
    "why_backoff": "Backoff",
    "why_day": "Dageslimid",
    "why_run": "Lauf-Limid",
    "why_paused": "pausierd",
    "why_restart": "Neustart nödig",
    "why_busy": "anderer Lauf aktiv",
    "why_pot": "PO-Token-Server ned bereid",
    "why_target": "Zielordner ned erreichbar",
    "why_error": "Download-Modul fehld",
    "summary": "Heid {day}/{day_max} · Lauf {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} ladd weider.",
    "steps": "Ladn · Umwandln · Daggn",
    "unlimited": "unbegrenzd",
    "l_run": "Dieser Lauf",
    "l_day": "Heid",
    "l_rate": "Rate-Limit",
    "l_sleep": "Pause zw. Downloads",
    "sec_queue": "Warteschlang",
    "sec_failed": "Fehlgschlong",
    "empty_title": "Warteschlang leer",
    "empty_text": "Mixes unter «Entdeggn» oder im «Eigang» auswähln.",
    "paused": "<b>Warteschlang pausierd.</b> Der laufende Download wird angehaltn, bis du weidermachsd.",
    "backoff": "<b>Backoff aktiv bis {t}</b> (noch {rest}). Downloads, Suche und Watchlist sin gsperrt.",
    "backoff_rest": {
      "one": "<b>Backoff aktiv bis {t}</b> (noch {rest}). Downloads, Suche und Watchlist sin gsperrt – {n} bleibd in der Warteschlang.",
      "other": "<b>Backoff aktiv bis {t}</b> (noch {rest}). Downloads, Suche und Watchlist sin gsperrt – {n} bleibn in der Warteschlang."
    },
    "limit_day": "<b>Dageslimid erreichd ({n}/{max}).</b> Der Rest bleibd in der Warteschlang und läuft morng weider.",
    "limit_day_rest": {
      "one": "<b>Dageslimid erreichd ({n}/{max}).</b> {rest} bleibd in der Warteschlang und läuft morng weider.",
      "other": "<b>Dageslimid erreichd ({n}/{max}).</b> {rest} bleibn in der Warteschlang und laufn morng weider."
    },
    "limit_run": "<b>Limid erreichd – {max}/{max} in dem Lauf.</b> Der Rest bleibd in der Warteschlang und läuft im nächsdn Lauf weider.",
    "limit_run_rest": {
      "one": "<b>Limid erreichd – {max}/{max} in dem Lauf.</b> {rest} bleibd in der Warteschlang und läuft im nächsdn Lauf weider.",
      "other": "<b>Limid erreichd – {max}/{max} in dem Lauf.</b> {rest} bleibn in der Warteschlang und laufn im nächsdn Lauf weider."
    },
    "limits_link": "Limits ändern",
    "new_run": "Neuen Lauf starddn",
    "need_restart": "<b>Neustart nödig.</b> yt-dlp wurde aktualisierd – bidde HCLoader neu starddn. Die Warteschlang bleibd erhaldn.",
    "busy": "A anderer Download-Lauf is aktiv (z.B. die gplande Prüfung). Die Warteschlang wardet, bis er fertig is.",
    "local_pot": {
      "one": "<b>PO-Token-Server ned bereid.</b> {rest} bleibd in der Warteschlang und läuft weider, sobald er läuft.",
      "other": "<b>PO-Token-Server ned bereid.</b> {rest} bleibn in der Warteschlang und laufn weider, sobald er läuft."
    },
    "local_target": {
      "one": "<b>Zielordner ned erreichbar oder ned beschreibbar.</b> {rest} bleibd in der Warteschlang und läuft weider, sobald er wieder da is.",
      "other": "<b>Zielordner ned erreichbar oder ned beschreibbar.</b> {rest} bleibn in der Warteschlang und laufn weider, sobald er wieder da is."
    },
    "local_error": {
      "one": "<b>Download-Modul (yt-dlp) konnd ned gladn werdn.</b> {rest} bleibd in der Warteschlang. Neuer Versuch nach «Weidermachn», neuen Einträchn oder dem Speichern der Einstellungen.",
      "other": "<b>Download-Modul (yt-dlp) konnd ned gladn werdn.</b> {rest} bleibn in der Warteschlang. Neuer Versuch nach «Weidermachn», neuen Einträchn oder dem Speichern der Einstellungen."
    },
    "local_link_pot": "Netzwerk-Einstellungen",
    "local_link_target": "Speicherord ändern",
    "local_link_error": "Wartung"
  },
  "library": {
    "title": "Biggerei",
    "sub": {
      "one": "{n} Mix",
      "other": "{n} Mixes"
    },
    "sub_shown": "{n} von {total} angezeigd",
    "search": "Titel, Kanal oder Pfad …",
    "all_genres": "Alle Genres",
    "all_channels": "Alle Kanäle",
    "all_years": "Alle Jahre",
    "f_genre": "Genre",
    "f_channel": "Kanal",
    "f_year": "Jahr",
    "f_sort": "Sordierung",
    "sort_newest": "Neuesde zuerschd",
    "sort_title": "Titel A–Z",
    "sort_channel": "Kanal A–Z",
    "sort_duration": "Längsde zuerschd",
    "group": "Nach Genre",
    "group_title": "Einträch nach Genre gruppiern",
    "view_list": "Lisdn",
    "view_grid": "Kachln",
    "clear": "Filder zurücksetzn",
    "col_title": "Titel",
    "col_channel": "Kanal",
    "col_genre": "Genre",
    "col_year": "Jahr",
    "col_duration": "Dauer",
    "col_size": "Grösse",
    "col_loaded": "Gladn",
    "play": "Abspieln",
    "pause": "Pause",
    "play_external": "Im Standardplayer öffnen",
    "play_internal": "Im App-Player abspieln",
    "play_missing": "Datei fehld – Abspieln gehd ned",
    "more": "Weidere {n} anzeign",
    "now_playing": "Läuft grad",
    "retag_short": "Neu daggn",
    "genre_working": "Genre wird gsetzt …",
    "open_folder": "Ordner öffnen",
    "retag": "Neu daggn (Tags, Cover und Ablageord nach den aktuellen Einstellungen)",
    "delete": "Datei lösch'n",
    "remove": "Eintrag wegdoa",
    "retagging": "Wird neu gdaggd …",
    "cue_title": "Trackliste als .cue-Datei nebn der MP3",
    "missing": "Datei fehld",
    "missing_title": "Die Datei wurde am gspeicherdn Ord ned gfunden (verschobn oder glöscht?)",
    "missing_chip": {
      "one": "{n} fehld",
      "other": "{n} fehln"
    },
    "missing_chip_title": "Bloss Einträch zeign, wo die Datei fehld",
    "stat_count": "Mixes",
    "stat_duration": "Gesamtdauer",
    "stat_size": "Grösse",
    "stat_genres": "Nach Genre",
    "unit_h": "Std.",
    "unit_min": "Min.",
    "unit_gb": "GB",
    "unit_mb": "MB",
    "unit_kb": "KB",
    "group_meta": {
      "one": "{n} Mix · {dur}",
      "other": "{n} Mixes · {dur}"
    },
    "empty_title": "Noch nix gladn",
    "empty_text": "Hier landed jeder Mix, sobald er fertig gladn und gdaggd is – mit Cover, Genre und Ablageord.",
    "empty_discover": "Mixes entdeggn",
    "empty_watchlist": "Watchlist einrichdn",
    "target_down": "Zielordner ned erreichbar: {path}",
    "target_down_hint": "Laufwerk oder Netzfreigabe prüfn. Solang er fehld, is der Zustand der Dateien unbekannd: «Neu daggn» und «Eintrag wegdoa» sin gsperrt.",
    "unknown_title": "Zielordner ned erreichbar – Zustand der Datei unbekannd",
    "none_title": "Kane Treffer",
    "none_text": "Kan Eintrag basst zu Suche und Fildern."
  },
  "player": {
    "label": "Mini-Player",
    "play": "Abspieln (Leertaste)",
    "pause": "Pause (Leertaste)",
    "back": "30 Sekundn zurück",
    "fwd": "30 Sekundn vor",
    "prev": "Vorherigr Track",
    "next": "Nächsder Track",
    "seek": "Position",
    "mute": "Stumm",
    "unmute": "Ton an",
    "volume": "Lautsdärke",
    "close": "Player zumachn",
    "tracks": "Trackliste",
    "tracks_n": {
      "one": "{n} Track",
      "other": "{n} Tracks"
    },
    "tracks_toggle": "Trackliste ein-/ausblenden",
    "no_tracks": "Kane Kapidel in dera Datei",
    "total": "Gesamtdauer {t}",
    "keys": "Leertaste: Play/Pause · ←/→: 10 s",
    "err_load": "Abspieln gehd ned",
    "err_src": "Abspieln gehd ned: ungüldige Dateiadresse",
    "err_play": "Die Datei kann ned abgspield werdn: {title}",
    "external": "Wird im Standardplayer gööffnet …"
  },
  "log": {
    "title": "Brodokoll",
    "sub": "Live-Log und Lauf-Hisdorie",
    "live": "Live-Log",
    "history": "Lauf-Hisdorie",
    "lvl_debug": "Debug",
    "lvl_info": "Info",
    "lvl_warn": "Warn",
    "lvl_error": "Fehler",
    "lvl_title": "Schdufe «{lvl}» ein-/ausblenden",
    "search": "Im Log suchen …",
    "following": "Live",
    "paused": "Pausierd",
    "follow_title": "Automadisch zur neuesdn Zeile scrolln (pausierd beim Hochscrolln)",
    "jump": "Zum End",
    "jump_new": {
      "one": "{n} neue Zeile",
      "other": "{n} neue Zeiln"
    },
    "copy": "Kopiern",
    "copy_title": "Sichtbare Zeiln in die Zwischenablage kopiern",
    "open_logs": "Log-Ordner",
    "open_logs_title": "Ordner mit den vollschdändichn Log-Dateien öffnen",
    "lines": {
      "one": "{n} Zeile",
      "other": "{n} Zeiln"
    },
    "lines_of": "{n} von {total} Zeiln",
    "empty": "Kane Zeiln für diese Schdufen.",
    "empty_search": "Kane Zeile enthäld «{q}».",
    "no_runs": "Noch kane Läufe.",
    "no_runs_kind": "Kane Läufe von dera Ard.",
    "found": "gfunden",
    "downloaded": "gladn",
    "errors": "Fehler",
    "running": "läuft …",
    "kind_all": "Alle",
    "timeline": "Zeidachse",
    "table": "Dabelle",
    "view_title": "Darstellung der Lauf-Hisdorie",
    "col_kind": "Ard",
    "col_start": "Start",
    "col_duration": "Dauer",
    "col_found": "Gfunden",
    "col_downloaded": "Gladn",
    "col_errors": "Fehler",
    "col_note": "Notiz",
    "backoff": "Backoff",
    "runs_sum": {
      "one": "{n} Lauf · {dl} gladn · {err} Fehler",
      "other": "{n} Läufe · {dl} gladn · {err} Fehler"
    },
    "today": "Heid",
    "yesterday": "Gesdern"
  },
  "settings": {
    "title": "Einstellungen",
    "sub": "Alles, was die App machd, kannsd hier eistelln"
  },
  "tabs": {
    "general": "Allgemein",
    "filters": "Filder & Keywords",
    "genres": "Genres",
    "download": "Download & Qualidäd",
    "storage": "Ablage & Tags",
    "throttle": "Schonung",
    "soundcloud": "SoundCloud",
    "network": "Netzwerk & PO-Token",
    "schedule": "Zeitplan",
    "appearance": "Darstellung",
    "maintenance": "Wartung"
  },
  "tabs_hint": {
    "general": "Grundlegends Verhalden vo der App.",
    "filters": "Standardfilder für Suche und Watchlist. Im Filder-Panel unter «Entdeggn» vorübergehend überschreibbar.",
    "genres": "Reihenfolge = Priorität. Des erschde Genre, dessen Keyword im Titel vorkummd, gwinnd. Vo Hand gsetzde Genres und des Standard-Genre vo ener Quelln gehn vor.",
    "download": "YouTube liefert meisdns Opus mit ca. 130–160 kbps. MP3 is a Umwandlung und klingd ned besser als die Quelln – is aber überall abspielbar.",
    "storage": "Wohin die Dateien kummn und wie sie haissn. Die Struktur is auf Medienserver wie Plex oder Jellyfin ausgelechd.",
    "throttle": "Begrenzd die Lasd auf YouTube. Diese Werte gelden für Suche, Watchlist und Downloads zusammen. SoundCloud hod eigene Werte im Tab «SoundCloud».",
    "soundcloud": "SoundCloud als zwaide Quelln für Suche, Watchlist und Downloads – mit eignen Limits, eignen Zählern und eignem Backoff, unabhängig von YouTube.",
    "network": "Der PO-Token weisd Requests als echdn Browser aus und senkd des Risiko vo Bot-Sperrn.",
    "schedule": "Wann die Watchlist automadisch gprüft wird – in der App und über die Windows-Aufgabnplanung.",
    "appearance": "Look & Feel. Änderungen sin sofort als Vorschau sichtbar und gelden erschd nach dem Speichern dauerhaft.",
    "maintenance": "Versionen, Updates, Dadenbank."
  },
  "set": {
    "default": "Standard",
    "range": "Bereich",
    "browse": "Auswähln",
    "not_set": "ned gsetzt",
    "saving": "Speichert …",
    "discard": "Verwerfen",
    "tab_reset": "Tab auf Standard",
    "tab_reset_title": "Alle Felder von dem Tab auf die Standardwerte setzn (wird erschd mit «Speichern» wirksam)",
    "state_clean": "Alles gspeichert",
    "state_dirty": {
      "one": "{n} ungspeicherde Änderung",
      "other": "{n} ungspeicherde Änderungen"
    },
    "state_errors": {
      "one": "{n} Fehler – bidde korrigiern",
      "other": "{n} Fehler – bidde korrigiern"
    },
    "h": {
      "search": "Suche",
      "duration": "Dauer & Zeitraum",
      "keywords": "Keywords",
      "display": "Anzeige",
      "cover": "Cover",
      "chapters": "Kapidel & Trackliste",
      "tags": "Tags",
      "soundcloud": "SoundCloud",
      "playback": "Wiedergabe",
      "pauses": "Pausen & Bandbreide",
      "limits": "Limits",
      "backoff": "Backoff bei Sperre",
      "po": "PO-Token-Provider",
      "fallback": "Nodlösungen",
      "in_app": "In der App",
      "task": "Windows-Aufgabnplanung",
      "updates": "Updates",
      "app_update": "App-Update",
      "database": "Dadenbank",
      "reset": "Zurücksetzn"
    },
    "general": {
      "start_view": {
        "label": "Startansicht",
        "help": "Welche Ansicht nach dem Start gööffnet wird."
      },
      "log_level": {
        "label": "Log-Stufe",
        "help": "Wie ausführlich die Log-Datei und des Live-Log sin. DEBUG bloss zur Fehlersuche."
      },
      "confirm_delete": {
        "label": "Löschn bestädigen",
        "help": "Vor dem Löschn vo ahm Mix aus der Biggerei (Eintrag + Datei) nachfrong."
      },
      "language": {
        "label": "Sprache",
        "help": "Sprache vo der Oberfläche und vo den Meldungen. «Automadisch» übernimmd die Windows-Sprache (sonsd Englisch). Die Ansicht wird nach dem Speichern sofort neu aufgebaud."
      }
    },
    "player": {
      "mode": {
        "label": "Abspieln mit",
        "help": "Womit ▶ in der Biggerei abspield. Der eigebaute Player zeigd Kapidel als Sprungmarken und spield beim Ansichtswechsel weider. Die andere Variante stehd pro Eintrag im Menü."
      }
    },
    "search": {
      "results_count": {
        "label": "Treffer pro Suche",
        "help": "Anzahl Ergebnisse, die a Suche flach abfrochd. Mehr Treffer = mehr Lasd für YouTube."
      },
      "append_year": {
        "label": "Jahreszahl an Suche anhängn",
        "help": "Beim Upload-Zeitraum «A bestimmds Jahr» wird die Jahreszahl an den Suchbegriff angehängd (z.B. «hardcore liveset 2013»). So findd YouTube mehr Mixes aus dem Jahr."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Mindestlänge",
        "help": "Kürzere Videos werdn nie als Mix behandeld."
      },
      "max_duration": {
        "label": "Maximallänge",
        "help": "0 = unbegrenzd."
      },
      "upload_period": {
        "label": "Upload-Zeitraum",
        "help": "Welche Uploads standardmässich angezeigd werdn. «A bestimmds Jahr» zeigd bloss Mixes aus ahm Jahr, «Selber eistelln» an Bereich vo/bis."
      },
      "upload_year": {
        "label": "Jahr",
        "help": "A Mix zähld, wenn des Upload-Jahr basst oder die Jahreszahl im Titel stehd. YouTube liefert des Dadum in der Suche bloss ungefähr – dort gild ±1 Jahr."
      },
      "upload_from": {
        "label": "Von",
        "help": "Früheschdes Upload-Dadum. Leer = offen."
      },
      "upload_to": {
        "label": "Bis",
        "help": "Späteschdes Upload-Dadum. Leer = offen. Bei ungefährem Dadum gild an beedn Rändern ±1 Jahr Toleranz."
      },
      "include_keywords": {
        "label": "Include-Keywords",
        "help": "Mindesdns aans muss im Titel vorkummn. Leer = alles zulassn. Enter oder Komma fügd hinzu."
      },
      "exclude_keywords": {
        "label": "Exclude-Keywords",
        "help": "Kummd aans davon im Titel vor, wird des Video verworfn."
      },
      "match_description": {
        "label": "Beschreibung durchsuchn",
        "help": "Keywords a in der Videobeschreibung prüfn. Flache Abfragen liefern sie oft ned."
      },
      "hide_done_ignored": {
        "label": "Gladne & ignorierde ausblenden",
        "help": "Scho gladne und ignorierde Videos in den Treffern verstegga."
      },
      "apply_channel_blacklist": {
        "label": "Kanal-Blacklist anwenden",
        "help": "Videos vo gsperrdn Kanälen nie anzeign."
      },
      "hide_cross_platform_duplicates": {
        "label": "Plattform-Duplikate ausblenden",
        "help": "Treffer verstegga, die wahrscheinlich scho vo der andern Plattform (YouTube bzw. SoundCloud) gladn oder eigereiht sin – gleiche Dauer (±5 s) und sehr ähnlicher Titel. Aus: sie erscheinen mit dem Hinweis «Wahrscheinlich scho gladn»."
      }
    },
    "blacklist": {
      "label": "Gsperrde Kanäle",
      "help": "Kanäle sperrsd über des Menü vo ener Karde. Hier lassn sie sich wieder freigeben.",
      "none": "Kane Kanäle gsperrd",
      "unblock": "Freigeben"
    },
    "genres": {
      "add": "Genre",
      "up": "Höhere Priorität",
      "down": "Niedrigere Priorität",
      "delete": "Genre lösch'n",
      "color": "Farb auswähln",
      "name_ph": "Name",
      "kw_ph": "+ Keyword",
      "fallback": "Fallback – greifd, wenn kans vo de Keywords basst. Immer da, immer ganz hinden."
    },
    "download": {
      "audio_format": {
        "label": "Ausgabeformat",
        "help": "MP3 oder des Original vo YouTube ohne Umwandlung behaldn."
      },
      "mp3_quality": {
        "label": "MP3-Qualidäd",
        "help": "320 kbps CBR is am kompadibelsdn, V0 VBR spard a weng Platz."
      },
      "embed_cover": {
        "label": "Cover eibettn",
        "help": "Thumbnail quadradisch zugschnidden als Cover in die Datei schreibn."
      },
      "write_cover_jpg": {
        "label": "cover.jpg zusätzlich speichern",
        "help": "Für Medienserver, die Ordner-Cover lesn."
      },
      "write_cue": {
        "label": ".cue-Datei schreibn",
        "help": "Trackliste aus Kapideln oder Zeidstempeln der Beschreibung, nebn der Audiodatei."
      },
      "write_id3_chapters": {
        "label": "ID3-Kapidel schreibn",
        "help": "Kapidelmarken (CHAP/CTOC) direkd in die MP3 eibettn."
      },
      "keep_original_soundcloud": {
        "label": "SoundCloud-Original behaldn",
        "help": "SoundCloud-Audio unverändert speichern (AAC 160 kbps als .m4a, MP3 128 kbps als .mp3) – kane zwaide verlusdbehafdede Umwandlung. Aus: wie «Ausgabeformat»."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Zielordner",
        "help": "Wurzel vo der Musikablage. Temporäre Dateien liegn in «.tmp» drunder. In der Portable-Version wird a relatiwer Pfad wie «.\\Music» relativ zum App-Ordner aufgelöst (z.B. auf dem USB-Stick)."
      },
      "path_template": {
        "label": "Pfadmusder",
        "help": "Relativ zum Zielordner, ohne Dateiendung. «/» drennd Ordner. {id} muss drin sei (bei SoundCloud «sc-<id>»). {platform} ergibd «YouTube» bzw. «SoundCloud» – z.B. als oberschder Ordner, um die Quelln zu drennen."
      },
      "max_title_length": {
        "label": "Max. Titellänge",
        "help": "Längere Titel werdn im Dateinamen gekürzd."
      },
      "max_path_length": {
        "label": "Max. Pfadlänge",
        "help": "Gesamtpfad inklusive Zielordner. Windows erlaubd ohne Zusatzeinstellung 259 Zeichn."
      },
      "artist_from_title": {
        "label": "Artist aus Titel lesn",
        "help": "Musder «ARTIST @ EVENT» und «ARTIST - TITEL» erkennen, sonsd den Kanalnamen verwenden."
      },
      "title_cleanup_patterns": {
        "label": "Titel bereinigen",
        "help": "Reguläre Ausdrücke, deren Treffer aus dem Titel entfernd werdn. Enter fügd hinzu.",
        "ph": "+ Regex"
      }
    },
    "path_preview": {
      "label": "Vorschau",
      "help": "Plazhaldr anklickn, um sie ins Pfadmusder eizufügn."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Pause zwischn Requests",
        "help": "Wardezeid zwischn Metadaten-Abfragen (Suche, Watchlist)."
      },
      "sleep_interval": {
        "label": "Download-Pause – Minimum",
        "help": "Nach jedem Download wird zufällich zwischn Minimum und Maximum gewardet."
      },
      "max_sleep_interval": {
        "label": "Download-Pause – Maximum",
        "help": "Obere Grenze vo der zufälligen Pause."
      },
      "limit_rate_mb": {
        "label": "Download-Rate",
        "help": "Maximale Bandbreide. 0 = unbegrenzd (ned empfohln)."
      },
      "max_downloads_per_run": {
        "label": "Max. Downloads pro Lauf",
        "help": "Der Rest bleibd in der Warteschlang."
      },
      "max_downloads_per_day": {
        "label": "Max. Downloads pro Dooch",
        "help": "Zähler gild für manuelle und automadische Downloads zusammen."
      },
      "max_searches_per_hour": {
        "label": "Max. Suchen pro Stund",
        "help": "Schützd vor versehendlichem Dauersuchen."
      },
      "backoff_initial_hours": {
        "label": "Backoff – Startwert",
        "help": "Sperrzeid nach HTTP 429 oder «confirm you’re not a bot»."
      },
      "backoff_max_hours": {
        "label": "Backoff – Maximum",
        "help": "Die Sperrzeid verdoppeld sich bei jeder weidern Sperre bis zu dem Wert."
      }
    },
    "backoff": {
      "none": "Kan Backoff aktiv ({p})",
      "none_detail": "Suche, Watchlist und Downloads vo {p} sin freigegeben.",
      "active": "Backoff aktiv ({p})",
      "active_detail": "bis {t} · noch {rest} · Stufe {level}",
      "blocked": "{p} hod a Sperre signalisierd. Suche, Watchlist und Downloads vo {p} sin blockierd, bis die Zeid abgelaufn is.",
      "clear": "Vo Hand aufheben",
      "sc_off": "SoundCloud is ausgschalt",
      "sc_off_detail": "Kane Suche, kane Watchlist-Prüfung und kane Downloads vo SoundCloud."
    },
    "soundcloud": {
      "enabled": {
        "label": "SoundCloud verwenden",
        "help": "Aus: kane SoundCloud-Suche, kane Prüfung vo SoundCloud-Quelln und kane SoundCloud-Downloads. Scho Gladnes bleibd in der Biggerei."
      },
      "sleep_requests": {
        "label": "Pause zwischn Requests",
        "help": "Wardezeid zwischn Metadaten-Abfragen an SoundCloud (Suche, Watchlist)."
      },
      "sleep_interval": {
        "label": "Download-Pause – Minimum",
        "help": "Nach jedem SoundCloud-Download wird zufällich zwischn Minimum und Maximum gewardet."
      },
      "max_sleep_interval": {
        "label": "Download-Pause – Maximum",
        "help": "Obere Grenze vo der zufälligen Pause."
      },
      "limit_rate_mb": {
        "label": "Download-Rate",
        "help": "Maximale Bandbreide. 0 = unbegrenzd (ned empfohln)."
      },
      "max_downloads_per_run": {
        "label": "Max. Downloads pro Lauf",
        "help": "Eigener Zähler für SoundCloud. Der Rest bleibd in der Warteschlang."
      },
      "max_downloads_per_day": {
        "label": "Max. Downloads pro Dooch",
        "help": "Eigener Zähler für SoundCloud, manuelle und automadische Downloads zusammen."
      },
      "max_searches_per_hour": {
        "label": "Max. Suchen pro Stund",
        "help": "Eigener Zähler für SoundCloud."
      },
      "backoff_initial_hours": {
        "label": "Backoff – Startwert",
        "help": "Sperrzeid, nachdem SoundCloud zu viele Anfragen gmeldet hod (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Backoff – Maximum",
        "help": "Die Sperrzeid verdoppeld sich bei jeder weidern Sperre bis zu dem Wert."
      }
    },
    "ladder": {
      "label": "Stufen",
      "help": "So steigd die Sperrzeid mit den aktuellen Werten.",
      "reset": "Reset nach erfolgreichem Lauf",
      "invalid": "Ungüldige Werte"
    },
    "network": {
      "po_token_mode": {
        "label": "Modus",
        "help": "bgutil-Plugin für yt-dlp. Script starded Deno bei Bedarf, HTTP lässd an lokalen Server mitlaufn."
      },
      "po_token_port": {
        "label": "HTTP-Port",
        "help": "Bloss im HTTP-Modus. Der Server lauschd auf 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Token-Gülddichkeid",
        "help": "Nach dera Zeid wird a neuer Token erzeugd. Der Wert wird auf ganze Stundn gerundd (mindesdns 1 h)."
      },
      "cookies_from_browser": {
        "label": "Cookies aus Browser",
        "help": "Meldd yt-dlp mit deim Browser-Login o. Bloss eischalten, wenn's ohne nimmer gehd."
      },
      "proxy": {
        "label": "Proxy",
        "help": "Optional, z.B. socks5://127.0.0.1:1080. Leer = direkde Verbindung.",
        "ph": "kan Proxy"
      }
    },
    "po": {
      "active": "PO-Token aktiv",
      "inactive": "PO-Token inaktiv",
      "error": "PO-Token-Fehler",
      "mode": "Modus",
      "test": "Test",
      "testing": "Testet …",
      "test_ok": "Test erfolgreich.",
      "test_fail": "Test fehlgschlong.",
      "unsaved": "Der Test verwended die gspeicherden Einstellungen. Änderungen erschd speichern."
    },
    "cookies": {
      "warn_off": "<b>Empfohln: Aus.</b> PO-Token und Browser-Cookies zusammen kenna Probleme machn.",
      "warn_on": "<b>Nodlösung aktiv.</b> PO-Token und Browser-Cookies zusammen kenna zu Fehlern oder Sperrn führn, und dei YouTube-Konto wird für die Abfragen verwended. Sobald's ohne gehd, wieder ausschalden. Cookies landn nie im Log."
    },
    "schedule": {
      "in_app_check": {
        "label": "Prüfn, solang die App läuft",
        "help": "Die Watchlist wird im eigestelldn Intervall gprüft, solang des Fensder offen is."
      },
      "watchlist_interval_hours": {
        "label": "Intervall",
        "help": "Abstand zwischn zwaa Prüfungen in der App."
      },
      "entries_per_source": {
        "label": "Einträch pro Quelln",
        "help": "Wie viele neuesde Einträch pro Prüfung flach abgfrochd werdn (Standard für neue Quelln)."
      },
      "task_scheduler_enabled": {
        "label": "Aufgabnplanung verwenden",
        "help": "Prüfd die Watchlist a bei zugemachder App (headless). Wird durch «Aufgabe anlegen» eigeschaldt."
      },
      "task_time": {
        "label": "Uhrzeid",
        "help": "Dägliche Startzeid vo der gplandn Aufgabe."
      }
    },
    "next": {
      "title": "Nächsde Prüfung",
      "off": "Kane automadische Prüfung",
      "off_detail": "Weder die Prüfung in der App noch die Windows-Aufgabe is aktiv. Die Watchlist wird bloss vo Hand gprüft.",
      "app_detail": "In der App, alle {h} h – solang HCLoader läuft.",
      "task_detail": "Über die Windows-Aufgabnplanung, dägli um {time} – a bei zugemachder App.",
      "any_detail": "Der früherer Dermin vo App-Intervall und Windows-Aufgabe.",
      "also_task": "Zusätzlich: Windows-Aufgabe dägli um {time}.",
      "also_app": "Zusätzlich in der App alle {h} h.",
      "pending": "Noch ned gplant",
      "pending_detail": "Die App legd den nächsdn Dermin fesd, sobald sie die Watchlist des erschde Mal gprüft hod.",
      "due": "Fällich – fängd glei o",
      "backoff": "<b>Backoff aktiv.</b> Bis {t} wird ned gprüft; der Dermin wird danach nachgholt bzw. übersprungen.",
      "unsaved": "Ungspeicherde Änderungen am Zeitplan wirkn erschd nach dem Speichern."
    },
    "task": {
      "loading": "Aufgabe wird abgfrochd …",
      "registered": "Aufgabe registrierd",
      "registered_detail": "{name} · dägli {time} · nächsder Lauf {next}",
      "none": "Kane Aufgabe registrierd",
      "none_detail": "Legd in Windows a dägliche Aufgabe um {time} o (schtasks).",
      "create": "Aufgabe anlegn",
      "remove": "Aufgabe wegdoa",
      "moved": "App wurde verschobn – Aufgabe neu anlegn",
      "moved_detail": "Die gplande Aufgabe starded noch {cmd}. Neu anlegn übernimmd den aktuellen App-Ordner.",
      "recreate": "Aufgabe neu anlegn",
      "unknown": "Status vo der Aufgabe unbekannd",
      "unknown_detail": "Die Windows-Aufgabnplanung hod ned gandwortet. Die Einstellung bleibd unverändert.",
      "recheck": "Nomal prüfn"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Effekte reduziern",
        "help": "Schaldet Scanlines, Glitch und alle Animationen aus."
      },
      "scanlines": {
        "label": "Scanlines & Rauschn",
        "help": "Feines Overlay über der ganzn Oberfläche."
      },
      "pulse_bpm": {
        "label": "Kick-Puls",
        "help": "Daggd, in dem der Fortschrittsbalken pulsierd."
      }
    },
    "pulse_preview": {
      "label": "Vorschau",
      "help": "So pulsierd a laufender Download.",
      "off": "Effekte reduzierd"
    },
    "versions": {
      "plugin": "PO-Token-Plugin",
      "was": "vorher {v}"
    },
    "update": {
      "label": "yt-dlp & Plugin",
      "help": "YouTube ändert sich laufend. Bei Fehlern erschd aktualisiern (pip im venv).",
      "button": "yt-dlp & Plugin aktualisiern",
      "running": "Aktualisierd …",
      "last_check": "Letzde Prüfung",
      "restart": "<b>Neustart nödig.</b> yt-dlp wurde aktualisierd. Bis zum Neustart vo HCLoader sin Suche und Downloads gsperrd, die Warteschlang bleibd erhaldn.",
      "restart_title": "Neustart nödig",
      "restart_text": "yt-dlp wurde aktualisierd. Bidde HCLoader zumachn und neu starddn – bis dahin sin Suche und Downloads gsperrd, die Warteschlang bleibd erhaldn.",
      "out_live": "Ausgabe · läuft seid {t}",
      "out_done": "Ausgabe · fertich nach {t}",
      "out_failed": "Ausgabe · fehlgschlong",
      "out_last": "Ausgabe",
      "waiting": "pip wird gstarded …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Beim Start nach Updates suchn",
        "help": "yt-dlp und PO-Token-Plugin, höchsdns amol pro Dooch."
      },
      "check_app_updates_on_start": {
        "label": "Beim Start nach HCLoader-Updates suchn",
        "help": "Frächd amol pro Start bei GitHub nach ana neuen Version. Gladn wird erschd nach deim Klick."
      },
      "apply_update_on_exit": {
        "label": "Update beim Beendn eispieln",
        "help": "A runtergladnes Update wird beim Zumachn vo HCLoader eigspield («Später»). Aus: es wird beim nächsdn Start wieder angebodn."
      },
      "update_repo": {
        "label": "Update-Quelln (GitHub)",
        "help": "Repo im Format «besitzer/repo». Bloss für Forks ändern."
      }
    },
    "db": {
      "label": "Dadenbank",
      "help": "Status vo allen Videos, Quelln und Läufen. A Backup kopierd die Datei in den Ordner «backups».",
      "backup": "DB-Backup erstelln",
      "backing_up": "Sichert …",
      "open": "Dadenordner",
      "open_logs": "Log-Ordner",
      "open_title": "Ordner mit Dadenbank, Konfiguration und Backups öffnen",
      "open_logs_title": "Ordner mit den Log-Dateien öffnen",
      "info": {
        "one": "{n} Eintrag · {mb} MB",
        "other": "{n} Einträch · {mb} MB"
      },
      "last": "Letzds Backup",
      "never": "noch kans",
      "keep": "Es bleibn die 10 neuesdn Backups erhaldn, ältere werdn beim nächsdn Backup glöscht.",
      "backups": "Backups",
      "backups_more": "+ {n} ältere im Ordner «backups»",
      "fresh": "neu"
    },
    "reset_all": {
      "label": "Alle Einstellungen",
      "help": "Setzd sämdliche Tabs auf die Standardwerte. Dadenbank und Musikdateien bleibn unberührd.",
      "button": "Alles auf Standard"
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
        "auto": "Automadisch (Systemsprache)"
      }
    },
    "player": {
      "mode": {
        "internal": "Eigebauder Player (empfohln)",
        "external": "Windows-Standardplayer"
      }
    },
    "download": {
      "audio_format": {
        "mp3": "MP3",
        "original": "Original (Opus/M4A, ohne Umwandlung)"
      },
      "mp3_quality": {
        "320": "320 kbps CBR",
        "v0": "V0 VBR"
      }
    },
    "network": {
      "cookies_from_browser": {
        "none": "Aus",
        "edge": "Edge",
        "chrome": "Chrome",
        "firefox": "Firefox",
        "brave": "Brave"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Kanal sperrn",
      "text": "Videos vo «{ch}» werdn künfdich nimmer angezeigd. Rückgängich machn unter Einstellungen › Filder & Keywords.",
      "ok": "Sperrn"
    },
    "ignore_all": {
      "title": "Treffer ignorieren",
      "text": {
        "one": "{n} Treffer im Eigang als ignorierd markiern? Er wird ned gladn und daucht im Eigang nimmer auf.",
        "other": "{n} Treffer im Eigang als ignorierd markiern? Sie werdn ned gladn und dauchn im Eigang nimmer auf."
      },
      "ok": "Ignorieren"
    },
    "del_source": {
      "title": "Quelln lösch'n",
      "text": "«{name}» aus der Watchlist wegdoa? Scho gladne Mixes bleibn erhaldn."
    },
    "del_mix": {
      "title": "Mix lösch'n",
      "text": "«{title}» wird aus der Biggerei entfernd und die Datei vo der Festplatte glöscht:",
      "ok": "Datei lösch'n",
      "warn": "<b>Des lässd sich ned rückgängich machn.</b> Die Audiodatei und a dazugehörige .cue-Datei werdn glöscht. Der Mix wird als «ignorierd» markierd und <b>ned nomal gladn</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Bloss Eintrag wegdoa",
      "text": "Die Datei zu «{title}» liegd ausserhalb vom aktuellen Zielordner und wird drum ned glöscht:",
      "ok": "Bloss Eintrag wegdoa",
      "warn": "Die Datei bleibd unberührd an ihrm Ord liegn. Der Eintrag verschwindd aus der Biggerei, der Mix wird als «ignorierd» markierd und <b>ned nomal gladn</b>."
    },
    "remove_mix": {
      "title": "Eintrag wegdoa",
      "text": "Die Datei zu «{title}» wurde am gspeicherdn Ord ned gfunden:",
      "ok": "Eintrag wegdoa",
      "warn": "Der Eintrag verschwindd aus der Biggerei. Der Mix wird als «ignorierd» markierd und <b>ned nomal gladn</b>. Liegd die Datei woanders, bleibd sie unberührd."
    },
    "backoff": {
      "title": "Backoff aufheben",
      "ok": "Drotzdem aufheben",
      "text": "Die Sperrzeid schützd dich: {p} hod signalisierd, dass zu viele Anfragen kamen.",
      "warn": "<b>Bloss aufheben, wennsd dir sicher bisd, dass die Sperre vorbei is.</b> Greifd die App zu früh wieder zu, kann {p} deine IP länger oder dauerhaft einschränkn."
    },
    "reset_all": {
      "title": "Alles auf Standard",
      "text": "Alle Einstellungen in allen Tabs werdn sofort auf die Standardwerte gsetzt und gspeichert.",
      "ok": "Zurücksetzn"
    }
  },
  "toast": {
    "enqueued": {
      "one": "{n} Mix zur Warteschlang hinzugfügd",
      "other": "{n} Mixes zur Warteschlang hinzugfügd"
    },
    "enqueued_none": "Nix hinzugfügd – scho in der Warteschlang oder gladn",
    "enqueued_skipped": "{n} übersprungen",
    "queue_cancelled": "Abgebrochn: {title}",
    "queue_removed": "Wegdoa: {title}",
    "queue_retry": "Nomal eigereiht: {title}",
    "queue_paused": "Warteschlang pausierd",
    "queue_resumed": "Warteschlang läuft weider",
    "new_run": "Neuer Lauf gstarded",
    "ignored": "Ignorierd: {title}",
    "unignored": "Wieder sichdbar: {title}",
    "ignored_n": {
      "one": "{n} Treffer ignorierd",
      "other": "{n} Treffer ignorierd"
    },
    "opening": "Machd {p} im Browser auf …",
    "watch_added": "Zur Watchlist hinzugfügd: {ch}",
    "blocked": "Kanal gsperrd: {ch}",
    "genre_set": "Genre gsetzt: {genre}",
    "done": "Gladn: {title}",
    "failed": "Fehlgschlong: {title} – {error}",
    "wl_started": {
      "one": "Watchlist wird gprüft ({n} Quelln, mit Throttle) …",
      "other": "Watchlist wird gprüft ({n} Quelln, mit Throttle) …"
    },
    "wl_started_one": "«{name}» wird gprüft …",
    "wl_none": "Kane aktive Quelln – nix zu prüfn",
    "wl_done": {
      "one": "Quelln gprüft: nix Neues",
      "other": "Watchlist gprüft: {n} Quelln, nix Neues"
    },
    "wl_done_found": {
      "one": "Watchlist gprüft: {n} neuer Treffer",
      "other": "Watchlist gprüft: {n} neue Treffer"
    },
    "wl_errors": {
      "one": "{n} Quelln mit Fehler",
      "other": "{n} Quelln mit Fehler"
    },
    "source_added": "Quelln hinzugfügd: {name}",
    "source_saved": "Quelln gspeichert: {name}",
    "source_deleted": "Quelln glöscht: {name}",
    "retagged": "Neu gdaggd: {title}",
    "retagged_moved": "Neu gdaggd und verschobn: {title} → {path}",
    "deleted": "Glöscht: {title}",
    "removed": "Eintrag wegdoa: {title}",
    "folder_opening": "Ordner wird gööffnet …",
    "copied": {
      "one": "{n} Zeile kopierd",
      "other": "{n} Zeiln kopierd"
    },
    "copy_failed": "Kopiern gehd ned",
    "copy_none": "Kane sichdbaren Zeiln",
    "settings_saved": "Einstellungen gspeichert",
    "settings_errors": {
      "one": "{n} Eingabe is ungüldich",
      "other": "{n} Eingaben sin ungüldich"
    },
    "backoff_cleared": "Backoff ({p}) vo Hand aufghobn",
    "genre_moved": "Genre: {genre} – verschobn nach {path}",
    "genre_retagged": "Genre: {genre} – Tags angepasst",
    "genre_entry_only": "Genre: {genre} – bloss der Eintrag wurde gändert, die Datei is ned erreichbar",
    "genre_failed": "Genre konnd ned gsetzt werdn: {error}",
    "task_created": "Aufgabe in der Windows-Aufgabnplanung angelechd",
    "task_removed": "Aufgabe wegdoa",
    "updated": "Aktualisierd auf yt-dlp {v}",
    "up_to_date": "Scho aktuell (yt-dlp {v})",
    "update_failed": "Aktualisierung fehlgschlong",
    "restart_required": "Aktualisierd – bidde HCLoader neu starddn, damid Suche und Downloads wieder laufn",
    "backup_done": "Backup erstelld: {path}",
    "reset_all": "Alle Einstellungen zurückgsetzd"
  },
  "upd": {
    "available": "Version {v} verfügbar",
    "available_sub": "Installierd: {cur}",
    "download": "Runterladn",
    "notes": "Änderungen",
    "later": "Später",
    "close": "Zumachn",
    "cancel": "Abbrechn",
    "retry": "Nomal versuchn",
    "downloading": "Update {v} wird gladn",
    "phase_download": "Download",
    "phase_verify": "Prüfn",
    "phase_prepare": "Vorbereidn",
    "ready": "Update {v} bereid",
    "ready_sub": "Zum Eispieln wird HCLoader kurz zugmachd und neu gstarded.",
    "restart_now": "Etz neu starddn",
    "on_exit": "Beim Beendn",
    "applying": "Update wird eigspield …",
    "applying_sub": "HCLoader machd sich zu und starded glei neu.",
    "error": "App-Update fehlgschlong",
    "blocked": "Automadisches Update ned möglich",
    "notes_title": "Änderungen in Version {v}",
    "notes_empty": "Kane Änderungsnodizen vorhandn.",
    "notes_link": "Release auf GitHub",
    "confirm_title": "Etz neu starddn?",
    "confirm_ok": "Neu starddn",
    "confirm_text": "HCLoader wird zugmachd, des Update eigspield und die App neu gstarded. A laufender Download wird abgebrochn und bleibd in der Warteschlang. Musik, Einstellungen und Dadenbank bleibn unverändert.",
    "on_exit_toast": "Des Update wird beim Beendn vo HCLoader eigspield.",
    "later_toast": "Des Update bleibd bereid und wird beim nächsdn Start wieder angebodn.",
    "section_label": "HCLoader-Version",
    "section_help": "Neue Versionen kummn vo GitHub. Dadn, Einstellungen und die Musik bleibn beim Update unberührd; vor ana Dadenbank-Migration wird automadisch a Sicherung angelechd.",
    "current": "Installierd",
    "latest": "Neuesde",
    "checked": "Letzde Prüfung",
    "check_now": "Etz prüfn",
    "checking": "Prüfd …",
    "st_idle": "Aktuell",
    "st_available": "Neue Version verfügbar",
    "st_checking": "Prüfung läuft …",
    "st_downloading": "Wird gladn …",
    "st_ready": "Bereid zum Eispieln",
    "st_applying": "Wird eigspield …",
    "st_error": "Fehler",
    "st_unknown": "Noch ned gprüft",
    "up_to_date": "HCLoader is aktuell (v{v})",
    "portable": "Portable-Version",
    "installed": "Installierd (Setup)",
    "git": "Git-Checkout",
    "from_repo": "aus {repo} (ned die offizielle Quelln)",
    "unverified": "ohne Prüfsumme (bloss ZIP-Integrität gprüft)"
  },
  "err": {
    "generic": "Unbekannder Fehler",
    "bridge": "Fehler bei «{name}»: {msg}",
    "boot": "Start fehlgschlong: {msg}",
    "no_backend": "Kane Verbindung zum Backend"
  },
  "fatal": {
    "title": "Verbindung zum Backend fehlgschlong",
    "text": "Die Oberfläche hod kane Andwort vom Python-Deil vo HCLoader grichd. Es wird nix angezeigd oder gspeichert, was ned echt is.",
    "waiting": "Wardet weider auf des Backend …",
    "reload": "Neu ladn"
  }
});
