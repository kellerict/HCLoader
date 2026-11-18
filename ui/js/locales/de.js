/* HCLoader UI texts – German (de-CH: «ss» instead of ß, guillemets «»).
   Guide: docs/TRANSLATING.md. Both arguments must stay strict JSON
   (double quotes, no comments, no trailing commas) – tests parse them with Python.
*/
HC.i18n.register({"code": "de", "name": "Deutsch", "dir": "ltr", "intl": "de-CH"}, {
  "app": {
    "title": "HCLoader",
    "tagline": "HARD MUSIC ARCHIVE",
    "mock": "MOCK-MODUS"
  },
  "nav": {
    "discover": "Entdecken",
    "inbox": "Eingang",
    "watchlist": "Watchlist",
    "downloads": "Downloads",
    "library": "Bibliothek",
    "log": "Protokoll",
    "settings": "Einstellungen",
    "stats": "Statistik"
  },
  "navfoot": {
    "today": "HEUTE",
    "next": "NÄCHSTE PRÜFUNG"
  },
  "common": {
    "ok": "OK",
    "cancel": "Abbrechen",
    "save": "Speichern",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "remove": "Entfernen",
    "reset": "Zurücksetzen",
    "on": "an",
    "off": "aus",
    "current": "aktuell",
    "loading": "lädt …",
    "add_chip": "+ hinzufügen",
    "empty": "«leer»",
    "empty_list": "«keine»"
  },
  "fmt": {
    "today": "heute",
    "yesterday": "gestern",
    "never": "noch nie",
    "no_date": "Datum unbekannt",
    "just_now": "gerade eben",
    "today_at": "heute {t}",
    "tomorrow_at": "morgen {t}",
    "yesterday_at": "gestern {t}",
    "views": {
      "one": "{v} Aufruf",
      "other": "{v} Aufrufe"
    }
  },
  "unit": {
    "s": "s",
    "h": "h",
    "minutes": "Minuten",
    "mbs": "MB/s",
    "bpm": "BPM",
    "chars": "Zeichen",
    "results": "Treffer",
    "entries": "Einträge",
    "clock": "Uhr",
    "req_h": "Anfr./h",
    "lufs": "LUFS",
    "db": "dB"
  },
  "range": {
    "ge_sleep": "≥ Minimum",
    "ge_initial": "≥ Startwert"
  },
  "status": {
    "new": "Neu",
    "inbox": "Im Eingang",
    "queued": "In Queue",
    "downloading": "Lädt",
    "done": "Geladen",
    "ignored": "Ignoriert",
    "failed": "Fehler"
  },
  "period": {
    "all": "Alle",
    "7d": "Letzte 7 Tage",
    "30d": "Letzte 30 Tage",
    "1y": "Letzte 12 Monate",
    "year": "Bestimmtes Jahr",
    "custom": "Benutzerdefiniert"
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
    "sc_off": "SoundCloud ist ausgeschaltet – einschalten unter Einstellungen › SoundCloud."
  },
  "genre": {
    "change": "Genre ändern",
    "manual": "Genre manuell gesetzt",
    "change_manual": "Genre ändern (manuell gesetzt)"
  },
  "run_kind": {
    "watchlist": "Watchlist",
    "headless": "Aufgabenplanung",
    "manual": "Manuell"
  },
  "phase": {
    "waiting": "Wartet",
    "sleep": "Pause bis zum nächsten Download",
    "download": "Laden",
    "convert": "Konvertieren",
    "tag": "Taggen",
    "failed": "Fehlgeschlagen"
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
    "ok": "OK",
    "missing": "fehlt",
    "po": "PO-Token",
    "po_active": "aktiv ({mode})",
    "po_inactive": "inaktiv",
    "po_error": "Fehler",
    "backoff": "Backoff",
    "backoff_none": "keiner",
    "backoff_until": "bis {t} · noch {rest}",
    "queue": "Queue",
    "queue_empty": "leer",
    "queue_active": "aktiv",
    "queue_paused": "pausiert",
    "today": "Heute",
    "next": "Nächste Prüfung",
    "next_off": "aus",
    "backoff_until_short": "bis {t}",
    "sc_backoff": "Backoff bis {t}",
    "sc_today": "{n} / {max}",
    "yt_tip": "YouTube · heute {day}/{day_max} geladen · {s}/{s_max} Suchen diese Stunde",
    "sc_tip": "SoundCloud · heute {day}/{day_max} geladen · {s}/{s_max} Suchen diese Stunde",
    "backoff_tip": "{p}: Backoff bis {t} (noch {rest})"
  },
  "schedule": {
    "due": "fällig",
    "kind_app": "App",
    "kind_task": "Aufgabe",
    "tip_app": "Nächste Watchlist-Prüfung in der App: {t} (solange HCLoader läuft).",
    "tip_task": "Nächste Watchlist-Prüfung über die Windows-Aufgabenplanung: {t}.",
    "tip_any": "Nächste Watchlist-Prüfung: {t}.",
    "tip_off": "Keine automatische Prüfung – weder in der App noch über die Windows-Aufgabenplanung.",
    "tip_backoff": "Solange der Backoff aktiv ist, wird nicht geprüft."
  },
  "card": {
    "source": "Gefunden über die Watchlist-Quelle «{name}»",
    "select": "Auswählen",
    "open": "Auf {p} öffnen",
    "ignore": "Ignorieren",
    "unignore": "Nicht mehr ignorieren",
    "more": "Weitere Aktionen",
    "download": "Herunterladen",
    "watch": "Kanal zur Watchlist",
    "block": "Kanal blockieren",
    "set_genre": "Genre setzen",
    "date_approx": "Ungefähres Datum – YouTube liefert in der Suche nur «vor X Jahren»",
    "date_unknown": "Kein Upload-Datum geliefert",
    "duplicate": "Vermutlich bereits geladen ({p})",
    "duplicate_title": "Sehr ähnlicher Titel und gleiche Dauer wie «{title}» von {p} – dort schon geladen oder eingereiht. Laden ist trotzdem möglich.",
    "preview": "Nur Vorschau (Go+) – nicht ladbar",
    "preview_title": "SoundCloud liefert für diesen Track nur eine 30-Sekunden-Vorschau (Go+). Er kann nicht geladen werden."
  },
  "discover": {
    "placeholder": "Suche nach Mix, Liveset, DJ, Event …",
    "search": "Suchen",
    "searching_btn": "Suche …",
    "searching": "Suche läuft – flache Abfrage, schont YouTube …",
    "sort": "Sortierung",
    "sort_rel": "Relevanz",
    "sort_date": "Neueste zuerst",
    "sort_dur": "Längste zuerst",
    "sort_views": "Meiste Aufrufe",
    "quota": "Suchen diese Stunde: {n} / {max}",
    "quota_sc": "SoundCloud-Suchen diese Stunde: {n} / {max}",
    "placeholder_sc": "Auf SoundCloud suchen: Mix, Set, DJ, Podcast …",
    "platform_title": "Wo gesucht wird",
    "searching_sc": "Suche läuft – flache Abfrage, schont SoundCloud …",
    "ready_text_sc": "Suchbegriff eingeben und mit Enter auf SoundCloud suchen.",
    "previews": "{n} nur Vorschau (Go+)",
    "previews_title": "Go+-Vorschauen sind nie ladbar. Sichtbar, wenn «Geladene & ignorierte ausblenden» aus ist.",
    "filters": "Filter",
    "toggle_filters": "Filter-Panel ein-/ausblenden",
    "f_duration": "Dauer (Minuten)",
    "f_min": "Minimum",
    "f_max": "Maximum (leer = offen)",
    "f_max_ph": "max",
    "f_period": "Upload-Zeitraum",
    "f_year": "Jahr",
    "f_year_prev": "Ein Jahr zurück",
    "f_year_next": "Ein Jahr vor",
    "f_from": "Von",
    "f_to": "Bis",
    "f_hint_year": "YouTube liefert das Datum in der Suche nur ungefähr («vor 13 Jahren»). Darum zählt ±1 Jahr – und ebenso jeder Mix mit «{year}» im Titel.",
    "f_hint_custom": "YouTube liefert das Datum in der Suche nur ungefähr. Bei ungefährem Datum gilt an beiden Rändern ±1 Jahr Toleranz.",
    "chip_title": "Klick: Genre ein-/ausblenden · Doppelklick: nur dieses Genre (seine Begriffe werden an die Suche angehängt)",
    "scope": "Suche ergänzt um",
    "scope_title": "Diese Begriffe hängt die nächste Suche an deinen Suchtext an.",
    "searched": "Gesucht mit",
    "stale": "Filter seither geändert",
    "re_search": "Neu suchen",
    "re_search_title": "Die Treffer stammen aus der letzten Suche. Neu suchen, damit Genre und Jahr in den Suchbegriff einfliessen (zählt als eine Suche).",
    "need_query": "Bitte zuerst einen Suchbegriff eingeben.",
    "f_inc": "Include-Keywords",
    "f_exc": "Exclude-Keywords",
    "f_show": "Anzeige",
    "f_hide": "Geladene & ignorierte ausblenden",
    "f_blacklist": "Kanal-Blacklist anwenden",
    "count": {
      "one": "{n} Treffer · {hidden} herausgefiltert",
      "other": "{n} Treffer · {hidden} herausgefiltert"
    },
    "selected": "{n} ausgewählt",
    "select_all": "Alle wählen",
    "download_sel": "Auswahl laden",
    "ready_title": "Bereit",
    "ready_text": "Suchbegriff eingeben und mit Enter starten.",
    "none_title": "Nichts gefunden",
    "none_text": "Filter lockern oder andere Suchbegriffe probieren.",
    "none_year": "Kein Treffer aus {year}. Neu suchen, damit die Jahreszahl in den Suchbegriff einfliesst – oder das Jahr ändern."
  },
  "inbox": {
    "title": "Eingang",
    "sub": "Neue Treffer aus der Watchlist, die alle Filter bestehen",
    "sub_n": {
      "one": "{n} neuer Treffer aus der Watchlist, der alle Filter besteht",
      "other": "{n} neue Treffer aus der Watchlist, die alle Filter bestehen"
    },
    "ignore_all": "Alle ignorieren",
    "download_all": "Alle laden",
    "ignore_sel": "Auswahl ignorieren",
    "download_sel": "Auswahl laden",
    "select_all": "Alle wählen",
    "select_none": "Auswahl aufheben",
    "src_all": "Alle Quellen",
    "src_none": "Ohne Quelle",
    "src_title": "Nur Treffer dieser Quelle zeigen",
    "count": {
      "one": "{n} Treffer",
      "other": "{n} Treffer"
    },
    "count_of": "{n} von {total} Treffern",
    "selected": "{n} ausgewählt",
    "empty_title": "Eingang leer",
    "empty_text": "Die Watchlist hat keine neuen Mixes gefunden.",
    "empty_nosrc": "Noch keine Quellen in der Watchlist – Kanal, Playlist oder Suche hinzufügen, dann landen neue Mixes hier.",
    "empty_next": "Nächste Prüfung: {t}.",
    "to_watchlist": "Zur Watchlist"
  },
  "watchlist": {
    "title": "Watchlist",
    "sub_n": {
      "one": "{n} Quelle · {active} aktiv",
      "other": "{n} Quellen · {active} aktiv"
    },
    "sub_next": "nächste Prüfung {t}",
    "add": "Quelle",
    "check_all": "Alle jetzt prüfen",
    "check": "Prüfen",
    "checking": "prüft …",
    "queued": "wartet …",
    "running": "Prüft …",
    "running_n": "Prüft {i} / {n} …",
    "col_active": "Aktiv",
    "col_name": "Name",
    "col_type": "Typ",
    "col_genre": "Genre",
    "col_auto": "Neue Treffer",
    "col_max": "Max.",
    "col_last": "Zuletzt geprüft",
    "col_new": "Neu",
    "genre_auto": "automatisch",
    "genre_auto_long": "Automatisch (aus Keywords)",
    "auto_on": "laden",
    "auto_off": "Eingang",
    "auto_title_on": "Neue Treffer werden automatisch heruntergeladen",
    "auto_title_off": "Neue Treffer landen nur im Eingang",
    "new_title": "Im Eingang anzeigen",
    "check_title": "Diese Quelle jetzt prüfen",
    "why_off": "Quelle ist nicht aktiv",
    "why_running": "Eine Prüfung läuft bereits",
    "why_backoff": "Backoff aktiv – Prüfen ist gesperrt",
    "why_backoff_p": "Backoff ({p}) aktiv – Prüfen ist gesperrt",
    "why_sc_off": "SoundCloud ist ausgeschaltet",
    "error_title": "Letzte Prüfung fehlgeschlagen",
    "backoff": "<b>Backoff aktiv bis {t}</b> (noch {rest}). Die Watchlist kann nicht geprüft werden – auch geplante Prüfungen setzen so lange aus.",
    "backoff_p": "<b>Backoff ({p}) aktiv bis {t}</b> (noch {rest}). Quellen von {p} werden so lange übersprungen – {other} läuft weiter.",
    "backoff_link_sc": "SoundCloud öffnen",
    "backoff_link": "Schonung öffnen",
    "none_active": "Keine aktive Quelle zum Prüfen",
    "empty_title": "Keine Quellen",
    "empty_text": "Kanal, Playlist oder gespeicherte Suche hinzufügen.",
    "add_title": "Quelle hinzufügen",
    "edit_title": "Quelle bearbeiten",
    "f_type": "Typ",
    "f_name": "Name",
    "f_url": "URL",
    "f_query": "Suchbegriff",
    "f_genre": "Standard-Genre",
    "f_max": "Max. Einträge",
    "f_newest_last": "Neueste stehen hinten (Playlist rückwärts lesen)",
    "hint_newest_last": "YouTube hängt neue Videos bei vielen Playlists hinten an. Liest die ganze Playlist (ca. 1 Abfrage pro 100 Videos, max. 2000 Einträge).",
    "rev_title": "Neueste stehen hinten – die Playlist wird von hinten gelesen",
    "rev_short": "rückwärts",
    "f_enabled": "Aktiv – bei «Alle prüfen» und im Zeitplan berücksichtigen",
    "f_hits": "Neue Treffer",
    "hits_inbox": "In den Eingang",
    "hits_auto": "Automatisch laden",
    "hint_inbox": "Treffer warten im Eingang, bis du sie lädst oder ignorierst.",
    "hint_auto": "Treffer, die alle Filter bestehen, gehen direkt in die Warteschlange.",
    "hint_channel": "YouTube-Kanal (…/@name oder …/channel/UC…, wahlweise /videos oder /streams) oder SoundCloud-Profil (soundcloud.com/name).",
    "hint_playlist": "YouTube-Playlist mit «list=…» oder SoundCloud-Set (soundcloud.com/name/sets/set). Geprüft werden die neuesten Einträge.",
    "f_platform": "Suchen auf",
    "detected": "erkannt: {p} · {type}",
    "not_detected": "URL nicht erkannt",
    "suggested": "Vorschlag",
    "suggested_title": "Aus der URL vorgeschlagen. Unverändert ersetzt ihn die erste Prüfung durch den echten Namen – oder einfach überschreiben.",
    "hint_name_auto": "Vorschlag aus der URL – frei änderbar. Unverändert setzt die erste Prüfung den echten Namen.",
    "hint_name_later": "Name kommt bei der ersten Prüfung – oder hier selbst eintragen.",
    "name_auto_title": "Vorläufiger Name – die nächste Prüfung setzt den echten",
    "hint_search": "Gespeicherte Suche, wie unter «Entdecken» – zählt bei jeder Prüfung als eine Suche.",
    "hint_max": "pro Prüfung",
    "max_default": "(Standard)",
    "max_default_title": "Kein eigener Wert: es gilt «Einträge pro Quelle» aus Einstellungen › Zeitplan",
    "max_title": "Leer = Standard aus Einstellungen › Zeitplan. Höchstens 200, bei Suchquellen 100.",
    "ph_name": "z.B. Gabber Vault",
    "ph_name_later": "kommt bei der ersten Prüfung",
    "ph_channel": "https://www.youtube.com/@kanal  oder  https://soundcloud.com/name",
    "ph_playlist": "https://www.youtube.com/playlist?list=…  oder  https://soundcloud.com/name/sets/…",
    "ph_search": "z.B. frenchcore liveset",
    "form_error": "Die Quelle konnte nicht gespeichert werden."
  },
  "downloads": {
    "title": "Downloads",
    "sub": "Sequenziell, ein Download gleichzeitig",
    "pause": "Pausieren",
    "resume": "Fortsetzen",
    "cancel": "Abbrechen",
    "retry": "Wiederholen",
    "remove": "Entfernen",
    "up": "Nach oben",
    "down": "Nach unten",
    "eta": "ETA",
    "position": "Position {n}",
    "sleep_left": "weiter in",
    "sleep_why": "Schonung: zufällige Pause von {min}–{max} s zwischen zwei Downloads",
    "next_up": "Als Nächstes",
    "sleeping": "Pause läuft",
    "sleep_range": "von {min}–{max} s",
    "blocked_wait": "Wartet – {why}",
    "why_backoff": "Backoff",
    "why_day": "Tageslimit",
    "why_run": "Lauf-Limit",
    "why_paused": "pausiert",
    "why_restart": "Neustart nötig",
    "why_busy": "anderer Lauf aktiv",
    "why_pot": "PO-Token-Server nicht bereit",
    "why_target": "Zielordner nicht erreichbar",
    "why_error": "Download-Modul fehlt",
    "summary": "Heute {day}/{day_max} · Lauf {run}/{run_max}",
    "summary_sc": "SoundCloud {day}/{day_max}",
    "platform_blocked": "{reason}",
    "platform_other": "{p} lädt weiter.",
    "steps": "Laden · Konvertieren · Taggen",
    "unlimited": "unbegrenzt",
    "l_run": "Dieser Lauf",
    "l_day": "Heute",
    "l_rate": "Rate-Limit",
    "l_sleep": "Pause zw. Downloads",
    "sec_queue": "Warteschlange",
    "sec_failed": "Fehlgeschlagen",
    "empty_title": "Warteschlange leer",
    "empty_text": "Mixes unter «Entdecken» oder im «Eingang» auswählen.",
    "paused": "<b>Warteschlange pausiert.</b> Der laufende Download wird angehalten, bis du fortsetzt.",
    "backoff": "<b>Backoff aktiv bis {t}</b> (noch {rest}). Downloads, Suche und Watchlist sind gesperrt.",
    "backoff_rest": {
      "one": "<b>Backoff aktiv bis {t}</b> (noch {rest}). Downloads, Suche und Watchlist sind gesperrt – {n} bleibt in der Warteschlange.",
      "other": "<b>Backoff aktiv bis {t}</b> (noch {rest}). Downloads, Suche und Watchlist sind gesperrt – {n} bleiben in der Warteschlange."
    },
    "limit_day": "<b>Tageslimit erreicht ({n}/{max}).</b> Der Rest bleibt in der Warteschlange und läuft morgen weiter.",
    "limit_day_rest": {
      "one": "<b>Tageslimit erreicht ({n}/{max}).</b> {rest} bleibt in der Warteschlange und läuft morgen weiter.",
      "other": "<b>Tageslimit erreicht ({n}/{max}).</b> {rest} bleiben in der Warteschlange und laufen morgen weiter."
    },
    "limit_run": "<b>Limit erreicht – {max}/{max} in diesem Lauf.</b> Der Rest bleibt in der Warteschlange und läuft im nächsten Lauf weiter.",
    "limit_run_rest": {
      "one": "<b>Limit erreicht – {max}/{max} in diesem Lauf.</b> {rest} bleibt in der Warteschlange und läuft im nächsten Lauf weiter.",
      "other": "<b>Limit erreicht – {max}/{max} in diesem Lauf.</b> {rest} bleiben in der Warteschlange und laufen im nächsten Lauf weiter."
    },
    "limits_link": "Limits ändern",
    "new_run": "Neuen Lauf starten",
    "need_restart": "<b>Neustart nötig.</b> yt-dlp wurde aktualisiert – bitte HCLoader neu starten. Die Warteschlange bleibt erhalten.",
    "busy": "Ein anderer Download-Lauf ist aktiv (z.B. die geplante Prüfung). Die Warteschlange wartet, bis er fertig ist.",
    "local_pot": {
      "one": "<b>PO-Token-Server nicht bereit.</b> {rest} bleibt in der Warteschlange und läuft weiter, sobald er läuft.",
      "other": "<b>PO-Token-Server nicht bereit.</b> {rest} bleiben in der Warteschlange und laufen weiter, sobald er läuft."
    },
    "local_target": {
      "one": "<b>Zielordner nicht erreichbar oder nicht beschreibbar.</b> {rest} bleibt in der Warteschlange und läuft weiter, sobald er wieder verfügbar ist.",
      "other": "<b>Zielordner nicht erreichbar oder nicht beschreibbar.</b> {rest} bleiben in der Warteschlange und laufen weiter, sobald er wieder verfügbar ist."
    },
    "local_error": {
      "one": "<b>Download-Modul (yt-dlp) konnte nicht geladen werden.</b> {rest} bleibt in der Warteschlange. Neuer Versuch nach «Fortsetzen», neuen Einträgen oder dem Speichern der Einstellungen.",
      "other": "<b>Download-Modul (yt-dlp) konnte nicht geladen werden.</b> {rest} bleiben in der Warteschlange. Neuer Versuch nach «Fortsetzen», neuen Einträgen oder dem Speichern der Einstellungen."
    },
    "local_link_pot": "Netzwerk-Einstellungen",
    "local_link_target": "Speicherort ändern",
    "local_link_error": "Wartung"
  },
  "library": {
    "title": "Bibliothek",
    "sub": {
      "one": "{n} Mix",
      "other": "{n} Mixes"
    },
    "sub_shown": "{n} von {total} angezeigt",
    "search": "Titel, Kanal oder Pfad …",
    "all_genres": "Alle Genres",
    "all_channels": "Alle Kanäle",
    "all_years": "Alle Jahre",
    "f_genre": "Genre",
    "f_channel": "Kanal",
    "f_year": "Jahr",
    "f_sort": "Sortierung",
    "sort_newest": "Neueste zuerst",
    "sort_title": "Titel A–Z",
    "sort_channel": "Kanal A–Z",
    "sort_duration": "Längste zuerst",
    "view_list": "Liste",
    "view_grid": "Kacheln",
    "clear": "Filter zurücksetzen",
    "col_title": "Titel",
    "col_channel": "Kanal",
    "col_genre": "Genre",
    "col_year": "Jahr",
    "col_duration": "Dauer",
    "col_size": "Grösse",
    "col_loaded": "Geladen",
    "play": "Abspielen",
    "pause": "Pause",
    "play_external": "Im Standardplayer öffnen",
    "play_internal": "Im App-Player abspielen",
    "play_missing": "Datei fehlt – Abspielen nicht möglich",
    "more": "Weitere {n} anzeigen",
    "now_playing": "Läuft gerade",
    "retag_short": "Neu taggen",
    "genre_working": "Genre wird gesetzt …",
    "open_folder": "Ordner öffnen",
    "retag": "Neu taggen (Tags, Cover und Ablageort nach den aktuellen Einstellungen)",
    "delete": "Datei löschen",
    "remove": "Eintrag entfernen",
    "retagging": "Wird neu getaggt …",
    "cue_title": "Tracklist als .cue-Datei neben der MP3",
    "missing": "Datei fehlt",
    "missing_title": "Die Datei wurde am gespeicherten Ort nicht gefunden (verschoben oder gelöscht?)",
    "missing_chip": {
      "one": "{n} fehlt",
      "other": "{n} fehlen"
    },
    "missing_chip_title": "Nur Einträge zeigen, deren Datei fehlt",
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
    "empty_title": "Noch nichts geladen",
    "empty_text": "Hier landet jeder Mix, sobald er fertig geladen und getaggt ist – mit Cover, Genre und Ablageort.",
    "empty_discover": "Mixes entdecken",
    "empty_watchlist": "Watchlist einrichten",
    "target_down": "Zielordner nicht erreichbar: {path}",
    "target_down_hint": "Laufwerk oder Netzfreigabe prüfen. Solange er fehlt, ist der Zustand der Dateien unbekannt: «Neu taggen» und «Eintrag entfernen» sind gesperrt.",
    "unknown_title": "Zielordner nicht erreichbar – Zustand der Datei unbekannt",
    "none_title": "Keine Treffer",
    "none_text": "Kein Eintrag passt zu Suche und Filtern.",
    "group_by": "Gruppieren",
    "group_none": "Keine",
    "group_genre": "Genre",
    "group_festival": "Festival",
    "group_artist": "Artist",
    "group_year": "Jahr",
    "group_unknown": "Unbekannt",
    "continue": "Weiterhören",
    "continue_title": "«{title}» bei {t} fortsetzen",
    "continue_left": "noch {t}",
    "continue_forget": "Aus «Weiterhören» entfernen",
    "export": "M3U",
    "export_title": "Das Angezeigte als M3U8-Playlist exportieren",
    "export_continue": "«Weiterhören» als Playlist exportieren"
  },
  "player": {
    "label": "Mini-Player",
    "play": "Abspielen (Leertaste)",
    "pause": "Pause (Leertaste)",
    "back": "30 Sekunden zurück",
    "fwd": "30 Sekunden vor",
    "prev": "Vorheriger Track",
    "next": "Nächster Track",
    "seek": "Position",
    "mute": "Stumm",
    "unmute": "Ton ein",
    "volume": "Lautstärke",
    "close": "Player schliessen",
    "tracks": "Trackliste",
    "tracks_n": {
      "one": "{n} Track",
      "other": "{n} Tracks"
    },
    "tracks_toggle": "Trackliste ein-/ausblenden",
    "no_tracks": "Keine Kapitel in dieser Datei",
    "total": "Gesamtdauer {t}",
    "keys": "Leertaste: Play/Pause · ←/→: 10 s",
    "err_load": "Abspielen nicht möglich",
    "err_src": "Abspielen nicht möglich: ungültige Dateiadresse",
    "err_play": "Die Datei kann nicht abgespielt werden: {title}",
    "external": "Wird im Standardplayer geöffnet …",
    "norm_title": "Lautheit angeglichen: {lufs} LUFS → Ziel {target} LUFS ({gain})",
    "norm_capped": "nur abgesenkt – Anheben braucht die Audio-Engine",
    "norm_fallback": "Lautheit angleichen: Die Audio-Engine bleibt hier stumm – Wiedergabe ohne sie (nur absenken, kein Anheben)",
    "resume_q": "Dort weiterhören, wo du aufgehört hast?",
    "resume_at": "bei {t}",
    "resume": "Fortsetzen",
    "restart": "Von vorn",
    "resumed_at": "Fortgesetzt bei {t}",
    "sleep": "Schlaf-Timer",
    "sleep_min": "{n} Min.",
    "sleep_end": "Ende dieses Sets",
    "sleep_end_short": "Ende",
    "sleep_off": "Ausschalten",
    "sleep_on": "Schlaf-Timer: stoppt in {t}",
    "sleep_end_on": "Schlaf-Timer: stoppt am Ende dieses Sets",
    "sleep_done": "Schlaf-Timer: Wiedergabe gestoppt",
    "queue_pos": "{i}/{n}",
    "queue_title": "Alle abspielen · {label}: Set {i} von {n}"
  },
  "log": {
    "title": "Protokoll",
    "sub": "Live-Log und Lauf-Historie",
    "live": "Live-Log",
    "history": "Lauf-Historie",
    "lvl_debug": "Debug",
    "lvl_info": "Info",
    "lvl_warn": "Warn",
    "lvl_error": "Fehler",
    "lvl_title": "Stufe «{lvl}» ein-/ausblenden",
    "search": "Im Log suchen …",
    "following": "Live",
    "paused": "Pausiert",
    "follow_title": "Automatisch zur neuesten Zeile scrollen (pausiert beim Hochscrollen)",
    "jump": "Zum Ende",
    "jump_new": {
      "one": "{n} neue Zeile",
      "other": "{n} neue Zeilen"
    },
    "copy": "Kopieren",
    "copy_title": "Sichtbare Zeilen in die Zwischenablage kopieren",
    "open_logs": "Log-Ordner",
    "open_logs_title": "Ordner mit den vollständigen Log-Dateien öffnen",
    "lines": {
      "one": "{n} Zeile",
      "other": "{n} Zeilen"
    },
    "lines_of": "{n} von {total} Zeilen",
    "empty": "Keine Zeilen für diese Stufen.",
    "empty_search": "Keine Zeile enthält «{q}».",
    "no_runs": "Noch keine Läufe.",
    "no_runs_kind": "Keine Läufe dieser Art.",
    "found": "gefunden",
    "downloaded": "geladen",
    "errors": "Fehler",
    "running": "läuft …",
    "kind_all": "Alle",
    "timeline": "Zeitachse",
    "table": "Tabelle",
    "view_title": "Darstellung der Lauf-Historie",
    "col_kind": "Art",
    "col_start": "Start",
    "col_duration": "Dauer",
    "col_found": "Gefunden",
    "col_downloaded": "Geladen",
    "col_errors": "Fehler",
    "col_note": "Notiz",
    "backoff": "Backoff",
    "runs_sum": {
      "one": "{n} Lauf · {dl} geladen · {err} Fehler",
      "other": "{n} Läufe · {dl} geladen · {err} Fehler"
    },
    "today": "Heute",
    "yesterday": "Gestern"
  },
  "settings": {
    "title": "Einstellungen",
    "sub": "Alles, was die App tut, ist hier einstellbar"
  },
  "tabs": {
    "general": "Allgemein",
    "filters": "Filter & Keywords",
    "genres": "Genres",
    "download": "Download & Qualität",
    "storage": "Ablage & Tags",
    "throttle": "Schonung",
    "soundcloud": "SoundCloud",
    "network": "Netzwerk & PO-Token",
    "schedule": "Zeitplan",
    "appearance": "Darstellung",
    "maintenance": "Wartung",
    "festivals": "Festivals & Serien",
    "playback": "Wiedergabe",
    "notifications": "Benachrichtigungen",
    "mediaserver": "Medienserver"
  },
  "tabs_hint": {
    "general": "Grundlegendes Verhalten der App.",
    "filters": "Standardfilter für Suche und Watchlist. Im Filter-Panel unter «Entdecken» temporär überschreibbar.",
    "genres": "Reihenfolge = Priorität. Das erste Genre, dessen Keyword im Titel vorkommt, gewinnt. Manuell gesetzte Genres und das Standard-Genre einer Quelle gehen vor.",
    "download": "YouTube liefert meist Opus mit ca. 130–160 kbps. MP3 ist eine Umwandlung und klingt nicht besser als die Quelle – ist aber überall abspielbar.",
    "storage": "Wohin die Dateien kommen und wie sie heissen. Die Struktur ist auf Medienserver wie Plex oder Jellyfin ausgelegt.",
    "throttle": "Begrenzt die Last auf YouTube. Diese Werte gelten für Suche, Watchlist und Downloads gemeinsam. SoundCloud hat eigene Werte im Tab «SoundCloud».",
    "soundcloud": "SoundCloud als zweite Quelle für Suche, Watchlist und Downloads – mit eigenen Limits, eigenen Zählern und eigenem Backoff, unabhängig von YouTube.",
    "network": "Der PO-Token weist Requests als echten Browser aus und senkt das Risiko von Bot-Sperren.",
    "schedule": "Wann die Watchlist automatisch geprüft wird – in der App und über die Windows-Aufgabenplanung.",
    "appearance": "Look & Feel. Änderungen sind sofort als Vorschau sichtbar und gelten erst nach dem Speichern dauerhaft.",
    "maintenance": "Versionen, Updates, Datenbank.",
    "festivals": "Erkennt Festival oder Serie, Jahr, Bühne und Set-Art aus den gespeicherten Titeln – offline, ohne eine einzige Zusatzanfrage.",
    "playback": "Eingebauter Player, Lautheitsangleichung, gemerkte Positionen und die Offline-Analyse deiner Dateien.",
    "notifications": "Windows-Benachrichtigungen für neue Sets im Eingang und fertige oder fehlgeschlagene Downloads – gebündelt zu einer Meldung, nie eine Flut. Ein Klick öffnet die App an der richtigen Stelle.",
    "mediaserver": "Nach Downloads deinen Plex- oder Jellyfin-Server die Bibliothek neu einlesen lassen – gebündelt, nur im Heimnetz. Das Token liegt in der Windows-Anmeldeinformationsverwaltung, nie in config.yaml."
  },
  "set": {
    "default": "Standard",
    "range": "Bereich",
    "browse": "Wählen",
    "not_set": "nicht gesetzt",
    "saving": "Speichert …",
    "discard": "Verwerfen",
    "tab_reset": "Tab auf Standard",
    "tab_reset_title": "Alle Felder dieses Tabs auf die Standardwerte setzen (wird erst mit «Speichern» wirksam)",
    "state_clean": "Alles gespeichert",
    "state_dirty": {
      "one": "{n} ungespeicherte Änderung",
      "other": "{n} ungespeicherte Änderungen"
    },
    "state_errors": {
      "one": "{n} Fehler – bitte korrigieren",
      "other": "{n} Fehler – bitte korrigieren"
    },
    "h": {
      "collector": "Festival-Sammler",
      "search": "Suche",
      "duration": "Dauer & Zeitraum",
      "keywords": "Keywords",
      "display": "Anzeige",
      "cover": "Cover",
      "chapters": "Kapitel & Tracklist",
      "tags": "Tags",
      "soundcloud": "SoundCloud",
      "playback": "Wiedergabe",
      "pauses": "Pausen & Bandbreite",
      "limits": "Limits",
      "backoff": "Backoff bei Sperre",
      "po": "PO-Token-Provider",
      "fallback": "Notlösungen",
      "in_app": "In der App",
      "task": "Windows-Aufgabenplanung",
      "updates": "Updates",
      "app_update": "App-Update",
      "release_notes": "Versionshinweise",
      "database": "Datenbank",
      "reset": "Zurücksetzen",
      "detection": "Erkennung",
      "series": "Serien",
      "backfill": "Alles einlesen (einmalig)",
      "loudness": "Lautheit",
      "memory": "Gedächtnis & Wellenform",
      "analysis": "Analyse (offline, ffmpeg)",
      "playlists": "Playlists (M3U8)",
      "notify_events": "Benachrichtigen bei",
      "quiet": "Ruhezeit",
      "ms_paths": "Pfade & Zeitpunkt"
    },
    "general": {
      "start_view": {
        "label": "Startansicht",
        "help": "Welche Ansicht nach dem Start geöffnet wird."
      },
      "log_level": {
        "label": "Log-Stufe",
        "help": "Wie ausführlich die Log-Datei und das Live-Log sind. DEBUG nur zur Fehlersuche."
      },
      "confirm_delete": {
        "label": "Löschen bestätigen",
        "help": "Vor dem Löschen eines Mixes aus der Bibliothek (Eintrag + Datei) nachfragen."
      },
      "language": {
        "label": "Sprache",
        "help": "Sprache der Oberfläche und der Meldungen. «Automatisch» übernimmt die Windows-Sprache (sonst Englisch). Die Ansicht wird nach dem Speichern sofort neu aufgebaut."
      }
    },
    "player": {
      "mode": {
        "label": "Abspielen mit",
        "help": "Womit ▶ in der Bibliothek abspielt. Der eingebaute Player zeigt Kapitel als Sprungmarken und spielt beim Ansichtswechsel weiter. Die andere Variante steht pro Eintrag im Menü."
      },
      "normalize": {
        "label": "Lautheit angleichen",
        "help": "Spielt jedes Set gleich laut (ReplayGain aus der Offline-Analyse oder vorhandenen Tags). Übersteuert nie: die Verstärkung ist durch den gemessenen True Peak begrenzt."
      },
      "target_lufs": {
        "label": "Ziel-Lautheit",
        "help": "−18 LUFS ist die ReplayGain-2.0-Referenz. Höher (z. B. −14) = lauter, aber mehr Sets stossen an ihre Peak-Grenze."
      },
      "resume": {
        "label": "Position merken",
        "help": "Pro Set, ausserhalb der ersten und letzten 30 Sekunden. «Nachfragen» bietet das Fortsetzen an, «Automatisch» setzt still fort. Die Bibliothek zeigt die letzten fünf unfertigen Sets."
      },
      "waveform": {
        "label": "Wellenform als Zeitleiste",
        "help": "Zeigt das Set als Wellenform mit den Tracklist-Marken. Wird pro Datei einmal mit ffmpeg berechnet (beim ersten Abspielen oder in der Analyse); sonst der einfache Balken."
      }
    },
    "search": {
      "results_count": {
        "label": "Treffer pro Suche",
        "help": "Anzahl Ergebnisse, die eine Suche flach abfragt. Mehr Treffer = mehr Last für YouTube."
      },
      "append_year": {
        "label": "Jahreszahl an Suche anhängen",
        "help": "Beim Upload-Zeitraum «Bestimmtes Jahr» wird die Jahreszahl an den Suchbegriff angehängt (z.B. «hardcore liveset 2013»). So findet YouTube mehr Mixes aus diesem Jahr."
      }
    },
    "filters": {
      "min_duration": {
        "label": "Mindestlänge",
        "help": "Kürzere Videos werden nie als Mix behandelt."
      },
      "max_duration": {
        "label": "Maximallänge",
        "help": "0 = unbegrenzt."
      },
      "upload_period": {
        "label": "Upload-Zeitraum",
        "help": "Welche Uploads standardmässig angezeigt werden. «Bestimmtes Jahr» zeigt nur Mixes aus einem Jahr, «Benutzerdefiniert» einen Bereich von/bis."
      },
      "upload_year": {
        "label": "Jahr",
        "help": "Ein Mix zählt, wenn das Upload-Jahr passt oder die Jahreszahl im Titel steht. YouTube liefert das Datum in der Suche nur ungefähr – dort gilt ±1 Jahr."
      },
      "upload_from": {
        "label": "Von",
        "help": "Frühestes Upload-Datum. Leer = offen."
      },
      "upload_to": {
        "label": "Bis",
        "help": "Spätestes Upload-Datum. Leer = offen. Bei ungefährem Datum gilt an beiden Rändern ±1 Jahr Toleranz."
      },
      "include_keywords": {
        "label": "Include-Keywords",
        "help": "Mindestens eines muss im Titel vorkommen. Leer = alles zulassen. Enter oder Komma fügt hinzu."
      },
      "exclude_keywords": {
        "label": "Exclude-Keywords",
        "help": "Kommt eines davon im Titel vor, wird das Video verworfen."
      },
      "match_description": {
        "label": "Beschreibung durchsuchen",
        "help": "Keywords auch in der Videobeschreibung prüfen. Flache Abfragen liefern sie oft nicht."
      },
      "hide_done_ignored": {
        "label": "Geladene & ignorierte ausblenden",
        "help": "Bereits geladene und ignorierte Videos in den Treffern verstecken."
      },
      "apply_channel_blacklist": {
        "label": "Kanal-Blacklist anwenden",
        "help": "Videos blockierter Kanäle nie anzeigen."
      },
      "hide_cross_platform_duplicates": {
        "label": "Plattform-Duplikate ausblenden",
        "help": "Treffer verstecken, die vermutlich schon von der anderen Plattform (YouTube bzw. SoundCloud) geladen oder eingereiht sind – gleiche Dauer (±5 s) und sehr ähnlicher Titel. Aus: sie erscheinen mit dem Hinweis «Vermutlich bereits geladen»."
      }
    },
    "blacklist": {
      "label": "Blockierte Kanäle",
      "help": "Kanäle blockierst du über das Menü einer Karte. Hier lassen sie sich wieder freigeben.",
      "none": "Keine Kanäle blockiert",
      "unblock": "Freigeben"
    },
    "genres": {
      "add": "Genre",
      "up": "Höhere Priorität",
      "down": "Tiefere Priorität",
      "delete": "Genre löschen",
      "color": "Farbe wählen",
      "name_ph": "Name",
      "kw_ph": "+ Keyword",
      "fallback": "Fallback – greift, wenn kein Keyword passt. Immer vorhanden, immer zuletzt."
    },
    "download": {
      "audio_format": {
        "label": "Ausgabeformat",
        "help": "MP3 oder das Original von YouTube ohne Umwandlung behalten."
      },
      "mp3_quality": {
        "label": "MP3-Qualität",
        "help": "320 kbps CBR ist am kompatibelsten, V0 VBR spart etwas Platz."
      },
      "embed_cover": {
        "label": "Cover einbetten",
        "help": "Thumbnail quadratisch zugeschnitten als Cover in die Datei schreiben."
      },
      "write_cover_jpg": {
        "label": "cover.jpg zusätzlich speichern",
        "help": "Für Medienserver, die Ordner-Cover lesen."
      },
      "write_cue": {
        "label": ".cue-Datei schreiben",
        "help": "Tracklist aus Kapiteln oder Zeitstempeln der Beschreibung, neben der Audiodatei."
      },
      "write_id3_chapters": {
        "label": "ID3-Kapitel schreiben",
        "help": "Kapitelmarken (CHAP/CTOC) direkt in die MP3 einbetten."
      },
      "keep_original_soundcloud": {
        "label": "SoundCloud-Original behalten",
        "help": "SoundCloud-Audio unverändert speichern (AAC 160 kbps als .m4a, MP3 128 kbps als .mp3) – keine zweite verlustbehaftete Umwandlung. Aus: wie «Ausgabeformat»."
      }
    },
    "storage": {
      "target_dir": {
        "label": "Zielordner",
        "help": "Wurzel der Musikablage. Temporäre Dateien liegen in «.tmp» darunter. In der Portable-Version wird ein relativer Pfad wie «.\\Music» relativ zum App-Ordner aufgelöst (z.B. auf dem USB-Stick)."
      },
      "path_template": {
        "label": "Pfadmuster",
        "help": "Relativ zum Zielordner, ohne Dateiendung. «/» trennt Ordner. {id} muss enthalten sein (bei SoundCloud «sc-<id>»). {platform} ergibt «YouTube» bzw. «SoundCloud» – z.B. als oberster Ordner, um die Quellen zu trennen."
      },
      "max_title_length": {
        "label": "Max. Titellänge",
        "help": "Längere Titel werden im Dateinamen gekürzt."
      },
      "max_path_length": {
        "label": "Max. Pfadlänge",
        "help": "Gesamtpfad inklusive Zielordner. Windows erlaubt ohne Zusatzeinstellung 259 Zeichen."
      },
      "artist_from_title": {
        "label": "Artist aus Titel lesen",
        "help": "Muster «ARTIST @ EVENT» und «ARTIST - TITEL» erkennen, sonst den Kanalnamen verwenden."
      },
      "title_cleanup_patterns": {
        "label": "Titel bereinigen",
        "help": "Reguläre Ausdrücke, deren Treffer aus dem Titel entfernt werden. Enter fügt hinzu.",
        "ph": "+ Regex"
      },
      "album_from_edition": {
        "label": "Album = Ausgabe",
        "help": "Schreibt die Ausgabe (z.B. «Defqon.1 2024») als Album-Tag, damit Plex und Jellyfin alle Sets eines Festivals als ein Album zeigen. Aus: Album = Titel, wie bisher."
      }
    },
    "path_preview": {
      "label": "Vorschau",
      "help": "Platzhalter anklicken, um sie ins Pfadmuster einzufügen.",
      "fest": "{festival}, {event_year} und {stage} sind nur gefüllt, wenn ein Festival zugeordnet ist. Sonst entfallen sie samt übrig gebliebenen Trennzeichen und leeren Ordnern."
    },
    "throttle": {
      "sleep_requests": {
        "label": "Pause zwischen Requests",
        "help": "Wartezeit zwischen Metadaten-Abfragen (Suche, Watchlist)."
      },
      "sleep_interval": {
        "label": "Download-Pause – Minimum",
        "help": "Nach jedem Download wird zufällig zwischen Minimum und Maximum gewartet."
      },
      "max_sleep_interval": {
        "label": "Download-Pause – Maximum",
        "help": "Obere Grenze der zufälligen Pause."
      },
      "limit_rate_mb": {
        "label": "Download-Rate",
        "help": "Maximale Bandbreite. 0 = unbegrenzt (nicht empfohlen)."
      },
      "max_downloads_per_run": {
        "label": "Max. Downloads pro Lauf",
        "help": "Der Rest bleibt in der Warteschlange."
      },
      "max_downloads_per_day": {
        "label": "Max. Downloads pro Tag",
        "help": "Zähler gilt für manuelle und automatische Downloads zusammen."
      },
      "max_searches_per_hour": {
        "label": "Max. Suchen pro Stunde",
        "help": "Schützt vor versehentlichem Dauersuchen."
      },
      "backoff_initial_hours": {
        "label": "Backoff – Startwert",
        "help": "Sperrzeit nach HTTP 429 oder «confirm you’re not a bot»."
      },
      "backoff_max_hours": {
        "label": "Backoff – Maximum",
        "help": "Die Sperrzeit verdoppelt sich bei jeder weiteren Sperre bis zu diesem Wert."
      }
    },
    "backoff": {
      "none": "Kein Backoff aktiv ({p})",
      "none_detail": "Suche, Watchlist und Downloads von {p} sind freigegeben.",
      "active": "Backoff aktiv ({p})",
      "active_detail": "bis {t} · noch {rest} · Stufe {level}",
      "blocked": "{p} hat eine Sperre signalisiert. Suche, Watchlist und Downloads von {p} sind blockiert, bis die Zeit abgelaufen ist.",
      "clear": "Manuell aufheben",
      "sc_off": "SoundCloud ist ausgeschaltet",
      "sc_off_detail": "Keine Suche, keine Watchlist-Prüfung und keine Downloads von SoundCloud."
    },
    "soundcloud": {
      "enabled": {
        "label": "SoundCloud verwenden",
        "help": "Aus: keine SoundCloud-Suche, keine Prüfung von SoundCloud-Quellen und keine SoundCloud-Downloads. Bereits Geladenes bleibt in der Bibliothek."
      },
      "sleep_requests": {
        "label": "Pause zwischen Requests",
        "help": "Wartezeit zwischen Metadaten-Abfragen an SoundCloud (Suche, Watchlist)."
      },
      "sleep_interval": {
        "label": "Download-Pause – Minimum",
        "help": "Nach jedem SoundCloud-Download wird zufällig zwischen Minimum und Maximum gewartet."
      },
      "max_sleep_interval": {
        "label": "Download-Pause – Maximum",
        "help": "Obere Grenze der zufälligen Pause."
      },
      "limit_rate_mb": {
        "label": "Download-Rate",
        "help": "Maximale Bandbreite. 0 = unbegrenzt (nicht empfohlen)."
      },
      "max_downloads_per_run": {
        "label": "Max. Downloads pro Lauf",
        "help": "Eigener Zähler für SoundCloud. Der Rest bleibt in der Warteschlange."
      },
      "max_downloads_per_day": {
        "label": "Max. Downloads pro Tag",
        "help": "Eigener Zähler für SoundCloud, manuelle und automatische Downloads zusammen."
      },
      "max_searches_per_hour": {
        "label": "Max. Suchen pro Stunde",
        "help": "Eigener Zähler für SoundCloud."
      },
      "backoff_initial_hours": {
        "label": "Backoff – Startwert",
        "help": "Sperrzeit, nachdem SoundCloud zu viele Anfragen gemeldet hat (HTTP 429)."
      },
      "backoff_max_hours": {
        "label": "Backoff – Maximum",
        "help": "Die Sperrzeit verdoppelt sich bei jeder weiteren Sperre bis zu diesem Wert."
      }
    },
    "ladder": {
      "label": "Stufen",
      "help": "So steigt die Sperrzeit mit den aktuellen Werten.",
      "reset": "Reset nach erfolgreichem Lauf",
      "invalid": "Ungültige Werte"
    },
    "network": {
      "po_token_mode": {
        "label": "Modus",
        "help": "bgutil-Plugin für yt-dlp. Script startet Deno bei Bedarf, HTTP lässt einen lokalen Server mitlaufen."
      },
      "po_token_port": {
        "label": "HTTP-Port",
        "help": "Nur im HTTP-Modus. Der Server lauscht auf 127.0.0.1."
      },
      "po_token_ttl_hours": {
        "label": "Token-Gültigkeit",
        "help": "Nach dieser Zeit wird ein neuer Token erzeugt. Der Wert wird auf ganze Stunden gerundet (mindestens 1 h)."
      },
      "cookies_from_browser": {
        "label": "Cookies aus Browser",
        "help": "Meldet yt-dlp mit deinem Browser-Login an. Nur einschalten, wenn es ohne nicht mehr geht."
      },
      "proxy": {
        "label": "Proxy",
        "help": "Optional, z.B. socks5://127.0.0.1:1080. Leer = direkte Verbindung.",
        "ph": "kein Proxy"
      }
    },
    "po": {
      "active": "PO-Token aktiv",
      "inactive": "PO-Token inaktiv",
      "error": "PO-Token-Fehler",
      "mode": "Modus",
      "test": "Testen",
      "testing": "Testet …",
      "test_ok": "Test erfolgreich.",
      "test_fail": "Test fehlgeschlagen.",
      "unsaved": "Der Test verwendet die gespeicherten Einstellungen. Änderungen zuerst speichern."
    },
    "cookies": {
      "warn_off": "<b>Empfohlen: Aus.</b> PO-Token und Browser-Cookies kombiniert können Probleme machen.",
      "warn_on": "<b>Notlösung aktiv.</b> PO-Token und Browser-Cookies kombiniert können zu Fehlern oder Sperren führen, und dein YouTube-Konto wird für die Abfragen verwendet. Sobald es ohne geht, wieder ausschalten. Cookies landen nie im Log."
    },
    "schedule": {
      "in_app_check": {
        "label": "Prüfen, während die App läuft",
        "help": "Die Watchlist wird im eingestellten Intervall geprüft, solange das Fenster offen ist."
      },
      "watchlist_interval_hours": {
        "label": "Intervall",
        "help": "Abstand zwischen zwei Prüfungen in der App."
      },
      "entries_per_source": {
        "label": "Einträge pro Quelle",
        "help": "Wie viele neueste Einträge pro Prüfung flach abgefragt werden (Standard für neue Quellen)."
      },
      "task_scheduler_enabled": {
        "label": "Aufgabenplanung verwenden",
        "help": "Prüft die Watchlist auch bei geschlossener App (headless). Wird durch «Aufgabe anlegen» eingeschaltet."
      },
      "task_time": {
        "label": "Uhrzeit",
        "help": "Tägliche Startzeit der geplanten Aufgabe."
      }
    },
    "next": {
      "title": "Nächste Prüfung",
      "off": "Keine automatische Prüfung",
      "off_detail": "Weder die Prüfung in der App noch die Windows-Aufgabe ist aktiv. Die Watchlist wird nur von Hand geprüft.",
      "app_detail": "In der App, alle {h} h – solange HCLoader läuft.",
      "task_detail": "Über die Windows-Aufgabenplanung, täglich um {time} – auch bei geschlossener App.",
      "any_detail": "Der frühere Termin von App-Intervall und Windows-Aufgabe.",
      "also_task": "Zusätzlich: Windows-Aufgabe täglich um {time}.",
      "also_app": "Zusätzlich in der App alle {h} h.",
      "pending": "Noch nicht geplant",
      "pending_detail": "Die App legt den nächsten Termin fest, sobald sie die Watchlist das erste Mal geprüft hat.",
      "due": "Fällig – startet in Kürze",
      "backoff": "<b>Backoff aktiv.</b> Bis {t} wird nicht geprüft; der Termin wird danach nachgeholt bzw. übersprungen.",
      "unsaved": "Ungespeicherte Änderungen am Zeitplan wirken erst nach dem Speichern."
    },
    "task": {
      "loading": "Aufgabe wird abgefragt …",
      "registered": "Aufgabe registriert",
      "registered_detail": "{name} · täglich {time} · nächster Lauf {next}",
      "none": "Keine Aufgabe registriert",
      "none_detail": "Legt in Windows eine tägliche Aufgabe um {time} an (schtasks).",
      "create": "Aufgabe anlegen",
      "remove": "Aufgabe entfernen",
      "moved": "App wurde verschoben – Aufgabe neu anlegen",
      "moved_detail": "Die geplante Aufgabe startet noch {cmd}. Neu anlegen übernimmt den aktuellen App-Ordner.",
      "recreate": "Aufgabe neu anlegen",
      "unknown": "Status der Aufgabe unbekannt",
      "unknown_detail": "Die Windows-Aufgabenplanung hat nicht geantwortet. Die Einstellung bleibt unverändert.",
      "recheck": "Erneut prüfen"
    },
    "appearance": {
      "reduce_effects": {
        "label": "Effekte reduzieren",
        "help": "Schaltet Scanlines, Glitch und alle Animationen ab."
      },
      "scanlines": {
        "label": "Scanlines & Rauschen",
        "help": "Feines Overlay über der ganzen Oberfläche."
      },
      "pulse_bpm": {
        "label": "Kick-Puls",
        "help": "Takt, in dem der Fortschrittsbalken pulsiert."
      }
    },
    "pulse_preview": {
      "label": "Vorschau",
      "help": "So pulsiert ein laufender Download.",
      "off": "Effekte reduziert"
    },
    "versions": {
      "plugin": "PO-Token-Plugin",
      "was": "vorher {v}"
    },
    "update": {
      "label": "yt-dlp & Plugin",
      "help": "YouTube ändert sich laufend. Bei Fehlern zuerst aktualisieren (pip im venv).",
      "button": "yt-dlp & Plugin aktualisieren",
      "running": "Aktualisiert …",
      "last_check": "Letzte Prüfung",
      "restart": "<b>Neustart nötig.</b> yt-dlp wurde aktualisiert. Bis zum Neustart von HCLoader sind Suche und Downloads gesperrt, die Warteschlange bleibt erhalten.",
      "restart_title": "Neustart nötig",
      "restart_text": "yt-dlp wurde aktualisiert. Bitte HCLoader schliessen und neu starten – bis dahin sind Suche und Downloads gesperrt, die Warteschlange bleibt erhalten.",
      "out_live": "Ausgabe · läuft seit {t}",
      "out_done": "Ausgabe · fertig nach {t}",
      "out_failed": "Ausgabe · fehlgeschlagen",
      "out_last": "Ausgabe",
      "waiting": "pip wird gestartet …"
    },
    "maintenance": {
      "check_updates_on_start": {
        "label": "Beim Start nach Updates suchen",
        "help": "yt-dlp und PO-Token-Plugin, höchstens einmal pro Tag."
      },
      "check_app_updates_on_start": {
        "label": "Beim Start nach HCLoader-Updates suchen",
        "help": "Fragt einmal pro Start bei GitHub nach einer neuen Version. Geladen wird erst nach deinem Klick."
      },
      "apply_update_on_exit": {
        "label": "Update beim Beenden einspielen",
        "help": "Ein heruntergeladenes Update wird beim Schliessen von HCLoader eingespielt («Später»). Aus: es wird beim nächsten Start wieder angeboten."
      },
      "update_repo": {
        "label": "Update-Quelle (GitHub)",
        "help": "Repo im Format «besitzer/repo». Nur für Forks ändern."
      }
    },
    "db": {
      "label": "Datenbank",
      "help": "Status aller Videos, Quellen und Läufe. Ein Backup kopiert die Datei in den Ordner «backups».",
      "backup": "DB-Backup erstellen",
      "backing_up": "Sichert …",
      "open": "Datenordner",
      "open_logs": "Log-Ordner",
      "open_title": "Ordner mit Datenbank, Konfiguration und Backups öffnen",
      "open_logs_title": "Ordner mit den Log-Dateien öffnen",
      "info": {
        "one": "{n} Eintrag · {mb} MB",
        "other": "{n} Einträge · {mb} MB"
      },
      "last": "Letztes Backup",
      "never": "noch keines",
      "keep": "Es bleiben die 10 neuesten Backups erhalten, ältere werden beim nächsten Backup gelöscht.",
      "backups": "Backups",
      "backups_more": "+ {n} ältere im Ordner «backups»",
      "fresh": "neu"
    },
    "reset_all": {
      "label": "Alle Einstellungen",
      "help": "Setzt sämtliche Tabs auf die Standardwerte. Datenbank und Musikdateien bleiben unberührt.",
      "button": "Alles auf Standard"
    },
    "festivals": {
      "collector_searches_per_hour": {
        "label": "Suchen pro Stunde",
        "help": "«Fehlende Sets suchen» verteilt die Suchen gleichmässig (10 = alle 6 Min.). Zusätzlich gilt das globale Limit der Suchen pro Stunde."
      },
      "collector_results_per_search": {
        "label": "Treffer pro Suche",
        "help": "Wie viele Treffer eine Suche nach einem fehlenden Set anschaut (eine Anfrage pro Suche)."
      },
      "collector_auto_confirm": {
        "label": "Automatisch bestätigen ab",
        "help": "Ab dieser Sicherheit gilt ein Treffer ohne deine Bestätigung – nur mit DJ, Festival und Jahr im Titel. Alles darunter wartet auf einen Klick."
      },
      "detect": {
        "label": "Automatisch erkennen",
        "help": "Festival oder Serie, Jahr, Bühne und Set-Art bei neuen Treffern und Downloads zuordnen. Manuell gesetzte Werte werden nie überschrieben."
      },
      "min_confidence": {
        "label": "Erkennungsschwelle",
        "help": "Sicherheit, ab der ein Treffer zugeordnet wird. Darunter erscheint er nur als Vorschlag, den du übernehmen kannst."
      },
      "year_from_upload_date": {
        "label": "Jahr aus dem Upload-Datum",
        "help": "Steht im Titel keine Jahreszahl, gilt das Upload-Jahr (zählt als weniger sicher)."
      },
      "match_description": {
        "label": "Auch Beschreibung durchsuchen",
        "help": "Festivalnamen auch in der gespeicherten Beschreibung suchen."
      },
      "extra_stages": {
        "label": "Zusätzliche Bühnen",
        "help": "Bühnennamen neben den eingebauten (RED, BLUE, BLACK, UV, Mainstage …).",
        "ph": "+ Bühne"
      }
    },
    "fest_types": {
      "label": "Eigene Begriffe für Set-Arten",
      "help": "Wörter im Titel, die auf eine Set-Art hinweisen. Sie werden vor den eingebauten Begriffen geprüft.",
      "ph": "Begriff im Titel",
      "add": "Begriff"
    },
    "fest_test": {
      "label": "Titel testen",
      "help": "Zeigt, was die Erkennung in einem Titel findet. Es wird nichts gespeichert; es gelten die gespeicherten Einstellungen.",
      "ph": "z.B. Defqon.1 2024 | RED | Closing Ceremony",
      "none": "Nichts erkannt",
      "assigned": "würde zugeordnet",
      "suggested": "nur Vorschlag"
    },
    "fest_status": {
      "title": "{assigned} von {total} Mixes zugeordnet",
      "last": "Letzter Durchlauf",
      "help": "Läuft offline über die bestehende Bibliothek. Manuelle Werte bleiben; Dateien werden weder neu getaggt noch verschoben.",
      "button": "Festivals jetzt zuordnen",
      "running": "Ordne zu … {done} / {total}"
    },
    "series": {
      "hint": "Bekannte Festivals, Radioshows und Podcasts. Änderungen an dieser Liste werden sofort gespeichert.",
      "add": "Serie",
      "show_hidden": "Ausgeblendete zeigen",
      "reset_all": "Mitgelieferte zurücksetzen",
      "builtin": "mitgeliefert",
      "own": "eigene",
      "modified": "angepasst",
      "hidden": "ausgeblendet",
      "no_aliases": "keine Aliase",
      "enable": "Diese Serie erkennen",
      "hide": "Ausblenden",
      "restore": "Wiederherstellen",
      "new_title": "Neue Serie",
      "edit_title": "Serie bearbeiten",
      "name": "Name",
      "kind": "Art",
      "default_genre": "Standard-Genre",
      "aliases": "Aliase",
      "aliases_help": "Andere Schreibweisen. Ein Treffer im Titel genügt.",
      "weak_aliases": "Schwache Aliase",
      "weak_help": "Allerweltswörter, die nur zusammen mit einer Jahreszahl zählen.",
      "variants": "Varianten",
      "variants_help": "Eigene Ausgaben, z.B. Australia oder at Home.",
      "channels": "Kanäle des Veranstalters",
      "channels_help": "Kanalname, ID oder URL. Erhöht nur die Sicherheit."
    },
    "watchlist": {
      "backfill_max_entries": {
        "label": "Maximale Einträge pro Quelle",
        "help": "«Alles einlesen (einmalig)» in der Watchlist liest höchstens so viele Einträge eines Kanals oder einer Playlist."
      },
      "backfill_requests_per_hour": {
        "label": "Anfragen pro Stunde",
        "help": "Seiten-Anfragen von «Alles einlesen» werden gleichmässig verteilt (120 = alle 30 s); der normale Abstand und der Backoff gelten zusätzlich. Ein geplanter Lauf (Aufgabenplanung) macht höchstens so viele Anfragen weiter."
      }
    },
    "loudness": {
      "analyse_after_download": {
        "label": "Nach jedem Download analysieren",
        "help": "Misst die Lautheit (EBU R128) und berechnet die Wellenform direkt nach einem Download – offline, mit niedriger Priorität, eine Datei nach der anderen."
      },
      "write_tags": {
        "label": "ReplayGain-Tags schreiben",
        "help": "Schreibt REPLAYGAIN_TRACK_GAIN/PEAK (MP3, M4A) bzw. R128_TRACK_GAIN (Opus) in die Datei, damit auch andere Player sie nutzen. Das Audio wird nie neu kodiert."
      },
      "waveforms": {
        "label": "Wellenformen vorberechnen",
        "help": "Berechnet die Wellenformen auch bei der Analyse. Aus: erst wenn ein Set zum ersten Mal abgespielt wird."
      }
    },
    "analysis": {
      "title": "{done} von {total} Dateien analysiert",
      "counts": "{tagged} getaggt · {waves} Wellenformen · {failed} fehlgeschlagen",
      "help": "Läuft offline über die Bibliothek, eine Datei nach der anderen mit niedriger Priorität – kein Netzwerk, das Audio bleibt unverändert. Jederzeit abbrechbar.",
      "button": "Neue Dateien analysieren",
      "button_n": "{n} neue analysieren",
      "all": "Alle neu analysieren",
      "all_title": "Jede Datei nochmals messen (z. B. nach dem Ersetzen von Dateien ausserhalb der App)",
      "running": "Analysiere … {done} / {total}",
      "no_ffmpeg_title": "ffmpeg fehlt",
      "no_ffmpeg": "Lautheit und Wellenformen brauchen ffmpeg (bin\\ffmpeg.exe, installiert von setup.ps1). Einstellungen › Wartung zeigt den Stand."
    },
    "playlists": {
      "folder": {
        "label": "Playlist-Ordner",
        "help": "Hier landen exportierte Playlists. Leer = «Playlists» im Zielordner.",
        "ph": "«Playlists» im Zielordner"
      },
      "relative_paths": {
        "label": "Relative Pfade",
        "help": "Einträge relativ zur Playlist, damit sie weiter funktioniert, wenn der Musikordner umzieht (z.B. auf einen USB-Stick). Dateien auf einem anderen Laufwerk bekommen immer den vollen Pfad."
      },
      "sync_after_download": {
        "label": "Gespeicherte Playlists nach Downloads aktualisieren",
        "help": "Mit «Aktuell halten» exportierte Playlists werden nach jedem Download neu geschrieben – nur lokal, kein Netzwerk."
      }
    },
    "playlists_saved": {
      "label": "Gespeicherte Playlists",
      "help": "Jeder Export wird hier gemerkt. «Aktuell halten» schreibt ihn nach Downloads neu.",
      "none": "Noch keine Playlists exportiert – mit «M3U» in der Bibliothek, auf einer DJ-Seite oder in einer Checkliste.",
      "gone": "Datei fehlt",
      "sync": "Aktuell halten",
      "sync_title": "Diese Playlist nach Downloads neu schreiben",
      "forget": "Aus der Liste nehmen (die Datei bleibt)",
      "now": "Jetzt aktualisieren"
    },
    "notifications": {
      "enabled": {
        "label": "Windows-Benachrichtigungen",
        "help": "Eine Benachrichtigung im Windows-Infocenter zeigen – auch nach einer geplanten Prüfung bei geschlossener App."
      },
      "new_sets": {
        "label": "Neue Sets im Eingang",
        "help": "Eine Watchlist-Prüfung (in der App oder geplant) hat neue Sets gefunden."
      },
      "downloads_done": {
        "label": "Downloads fertig",
        "help": "Eine Meldung pro Download-Lauf mit Anzahl und Titeln."
      },
      "downloads_failed": {
        "label": "Downloads fehlgeschlagen",
        "help": "Eine Meldung pro Lauf, wenn ein Download fehlschlug. Details bleiben unter Downloads."
      },
      "quiet_hours": {
        "label": "Ruhezeit",
        "help": "In dieser Zeit keine Benachrichtigungen. Was passiert ist, kommt danach als eine Zusammenfassung."
      },
      "quiet_from": {
        "label": "Von",
        "help": "Beginn der Ruhezeit (24 h)."
      },
      "quiet_to": {
        "label": "Bis",
        "help": "Ende der Ruhezeit. Früher als der Beginn = über Mitternacht (z.B. 22:00–07:00)."
      }
    },
    "notify": {
      "on": "Benachrichtigungen ein",
      "off": "Benachrichtigungen aus",
      "detail": "Angezeigt über {backend}. Mehrere Ereignisse kurz hintereinander werden zu einer Benachrichtigung.",
      "backend_powershell": "Windows PowerShell (in Windows enthalten)",
      "backend_winrt": "die Windows-Benachrichtigungs-API (pywinrt)",
      "test": "Test senden",
      "testing": "Sende …",
      "test_sent": "Test-Benachrichtigung gesendet – schau unten rechts auf den Bildschirm.",
      "unavailable": "Windows-Benachrichtigungen nicht verfügbar",
      "unavailable_detail": "Dieses System kann sie nicht anzeigen (Windows PowerShell fehlt oder ist gesperrt). Ereignisse landen nur im Protokoll."
    },
    "media_server": {
      "type": {
        "label": "Medienserver",
        "help": "Welcher Server nach Downloads seine Bibliothek neu einlesen soll. Aus = HCLoader kontaktiert keinen Medienserver."
      },
      "url": {
        "label": "Adresse des Servers",
        "help": "Adresse im Heimnetz, z.B. http://192.168.1.10:32400 (Plex) oder http://nas:8096 (Jellyfin). Nur diese Adresse wird kontaktiert.",
        "ph": "http://192.168.1.10:32400"
      },
      "server_root": {
        "label": "Ordner auf dem Server",
        "help": "Wo der Server deinen Zielordner sieht (NAS, Docker), z.B. /data/music/HCLoader. Leer = derselbe Pfad wie hier. Nötig, um nur die neuen Ordner einzulesen.",
        "ph": "gleicher Pfad wie der Zielordner"
      },
      "delay_seconds": {
        "label": "Warten vor dem Einlesen",
        "help": "Nach dem letzten Download so lange warten – mehrere Downloads ergeben dann einen Scan."
      },
      "verify_tls": {
        "label": "Zertifikat prüfen",
        "help": "Für https://-Adressen. Nur bei einem selbst signierten Zertifikat im Heimnetz ausschalten."
      }
    },
    "ms": {
      "off": "Kein Medienserver",
      "off_detail": "Unten Plex oder Jellyfin wählen, damit dessen Bibliothek nach Downloads neu eingelesen wird.",
      "unsaved": "Ungespeicherte Änderungen – der Scan nutzt die gespeicherten Einstellungen.",
      "on": "{server} wird nach Downloads aktualisiert",
      "last_ok": "Letzter Scan {t} ({n} neue Dateien)",
      "last_fail": "Letzter Scan {t} fehlgeschlagen",
      "never": "Noch kein Scan",
      "all_libraries": "Alle Bibliotheken",
      "no_secret": "Noch kein Token / API-Schlüssel gespeichert – unten eingeben und Verbindung testen.",
      "scan_now": "Jetzt einlesen",
      "scanning": "Wird angestossen …",
      "scan_sent": "Scan angestossen – der Server liest die Bibliothek im Hintergrund ein.",
      "secret_plex": {
        "label": "Plex-Token",
        "help": "Dein X-Plex-Token (Plex Web › beliebiger Eintrag › Informationen › XML anzeigen: «X-Plex-Token=» in der Adresse). Nach erfolgreichem Test in der Windows-Anmeldeinformationsverwaltung gespeichert – nie in config.yaml oder im Protokoll."
      },
      "secret_jellyfin": {
        "label": "Jellyfin-API-Schlüssel",
        "help": "Dashboard › API-Schlüssel › «+». Nach erfolgreichem Test in der Windows-Anmeldeinformationsverwaltung gespeichert – nie in config.yaml oder im Protokoll."
      },
      "secret_ph": "hier einfügen",
      "secret_kept": "gespeichert – leer lassen, um es zu behalten",
      "stored_short": "gespeichert",
      "stored_title": "In der Windows-Anmeldeinformationsverwaltung gespeichert",
      "forget": "Entfernen",
      "forgotten": "Token aus der Windows-Anmeldeinformationsverwaltung entfernt",
      "connect": {
        "label": "Verbindung",
        "help": "Prüft Adresse und Token und lädt die Liste der Bibliotheken. Zwei kurze Anfragen an deinen Server, sonst nichts."
      },
      "test": "Verbindung testen",
      "testing": "Teste …",
      "test_ok": "Verbunden mit {name} (Version {v}).",
      "test_libs": "{n} Bibliotheken gefunden.",
      "stored": "Token gespeichert.",
      "library": {
        "label": "Bibliothek",
        "help": "Welche Bibliothek eingelesen wird. «Alle Bibliotheken» liest alles ein (auf grossen Servern langsamer)."
      },
      "lib_paths": "Ordner auf dem Server: {p}"
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
        "auto": "Automatisch (Systemsprache)"
      }
    },
    "player": {
      "mode": {
        "internal": "Eingebauter Player (empfohlen)",
        "external": "Windows-Standardplayer"
      },
      "resume": {
        "ask": "Nachfragen",
        "auto": "Automatisch",
        "off": "Aus"
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
    },
    "media_server": {
      "type": {
        "off": "Aus",
        "plex": "Plex",
        "jellyfin": "Jellyfin"
      }
    }
  },
  "dlg": {
    "block": {
      "title": "Kanal blockieren",
      "text": "Videos von «{ch}» werden künftig nicht mehr angezeigt. Rückgängig unter Einstellungen › Filter & Keywords.",
      "ok": "Blockieren"
    },
    "ignore_all": {
      "title": "Treffer ignorieren",
      "text": {
        "one": "{n} Treffer im Eingang als ignoriert markieren? Er wird nicht geladen und taucht im Eingang nicht mehr auf.",
        "other": "{n} Treffer im Eingang als ignoriert markieren? Sie werden nicht geladen und tauchen im Eingang nicht mehr auf."
      },
      "ok": "Ignorieren"
    },
    "del_source": {
      "title": "Quelle löschen",
      "text": "«{name}» aus der Watchlist entfernen? Bereits geladene Mixes bleiben erhalten."
    },
    "del_mix": {
      "title": "Mix löschen",
      "text": "«{title}» wird aus der Bibliothek entfernt und die Datei von der Festplatte gelöscht:",
      "ok": "Datei löschen",
      "warn": "<b>Lässt sich nicht rückgängig machen.</b> Die Audiodatei und eine zugehörige .cue-Datei werden gelöscht. Der Mix wird als «ignoriert» markiert und <b>nicht erneut geladen</b>.",
      "meta": "{dur} · {size}"
    },
    "outside_mix": {
      "title": "Nur Eintrag entfernen",
      "text": "Die Datei zu «{title}» liegt ausserhalb des aktuellen Zielordners und wird deshalb nicht gelöscht:",
      "ok": "Nur Eintrag entfernen",
      "warn": "Die Datei bleibt unberührt an ihrem Ort liegen. Der Eintrag verschwindet aus der Bibliothek, der Mix wird als «ignoriert» markiert und <b>nicht erneut geladen</b>."
    },
    "remove_mix": {
      "title": "Eintrag entfernen",
      "text": "Die Datei zu «{title}» wurde am gespeicherten Ort nicht gefunden:",
      "ok": "Eintrag entfernen",
      "warn": "Der Eintrag verschwindet aus der Bibliothek. Der Mix wird als «ignoriert» markiert und <b>nicht erneut geladen</b>. Liegt die Datei woanders, bleibt sie unberührt."
    },
    "backoff": {
      "title": "Backoff aufheben",
      "ok": "Trotzdem aufheben",
      "text": "Die Sperrzeit schützt dich: {p} hat signalisiert, dass zu viele Anfragen kamen.",
      "warn": "<b>Nur aufheben, wenn du sicher bist, dass die Sperre vorbei ist.</b> Greift die App zu früh wieder zu, kann {p} deine IP länger oder dauerhaft einschränken."
    },
    "reset_all": {
      "title": "Alles auf Standard",
      "text": "Alle Einstellungen in allen Tabs werden sofort auf die Standardwerte gesetzt und gespeichert.",
      "ok": "Zurücksetzen"
    },
    "series_delete": {
      "title": "Serie löschen?",
      "text": "«{name}» und ihre Ausgaben werden gelöscht.",
      "warn": {
        "one": "{n} Mix verliert seine Zuordnung.",
        "other": "{n} Mixes verlieren ihre Zuordnung."
      }
    },
    "series_hide": {
      "title": "Serie ausblenden?",
      "text": "«{name}» wird nicht mehr erkannt. Mit «Ausgeblendete zeigen» holst du sie zurück."
    },
    "series_reset": {
      "title": "Mitgelieferte Serien zurücksetzen?",
      "text": "Alle mitgelieferten Serien kehren in den Lieferzustand zurück, ausgeblendete kommen wieder. Eigene Serien bleiben.",
      "ok": "Zurücksetzen"
    }
  },
  "toast": {
    "enqueued": {
      "one": "{n} Mix zur Warteschlange hinzugefügt",
      "other": "{n} Mixes zur Warteschlange hinzugefügt"
    },
    "enqueued_none": "Nichts hinzugefügt – bereits in der Warteschlange oder geladen",
    "enqueued_skipped": "{n} übersprungen",
    "queue_cancelled": "Abgebrochen: {title}",
    "queue_removed": "Entfernt: {title}",
    "queue_retry": "Erneut eingereiht: {title}",
    "queue_paused": "Warteschlange pausiert",
    "queue_resumed": "Warteschlange läuft weiter",
    "new_run": "Neuer Lauf gestartet",
    "ignored": "Ignoriert: {title}",
    "unignored": "Wieder sichtbar: {title}",
    "ignored_n": {
      "one": "{n} Treffer ignoriert",
      "other": "{n} Treffer ignoriert"
    },
    "opening": "Öffnet {p} im Browser …",
    "watch_added": "Zur Watchlist hinzugefügt: {ch}",
    "blocked": "Kanal blockiert: {ch}",
    "genre_set": "Genre gesetzt: {genre}",
    "done": "Geladen: {title}",
    "failed": "Fehlgeschlagen: {title} – {error}",
    "wl_started": {
      "one": "Watchlist wird geprüft ({n} Quelle, mit Throttle) …",
      "other": "Watchlist wird geprüft ({n} Quellen, mit Throttle) …"
    },
    "wl_started_one": "«{name}» wird geprüft …",
    "wl_none": "Keine aktive Quelle – nichts zu prüfen",
    "wl_done": {
      "one": "Quelle geprüft: nichts Neues",
      "other": "Watchlist geprüft: {n} Quellen, nichts Neues"
    },
    "wl_done_found": {
      "one": "Watchlist geprüft: {n} neuer Treffer",
      "other": "Watchlist geprüft: {n} neue Treffer"
    },
    "wl_errors": {
      "one": "{n} Quelle mit Fehler",
      "other": "{n} Quellen mit Fehler"
    },
    "source_added": "Quelle hinzugefügt: {name}",
    "source_saved": "Quelle gespeichert: {name}",
    "source_deleted": "Quelle gelöscht: {name}",
    "retagged": "Neu getaggt: {title}",
    "retagged_moved": "Neu getaggt und verschoben: {title} → {path}",
    "deleted": "Gelöscht: {title}",
    "removed": "Eintrag entfernt: {title}",
    "folder_opening": "Ordner wird geöffnet …",
    "copied": {
      "one": "{n} Zeile kopiert",
      "other": "{n} Zeilen kopiert"
    },
    "copy_failed": "Kopieren nicht möglich",
    "copy_none": "Keine sichtbaren Zeilen",
    "settings_saved": "Einstellungen gespeichert",
    "settings_errors": {
      "one": "{n} Eingabe ist ungültig",
      "other": "{n} Eingaben sind ungültig"
    },
    "backoff_cleared": "Backoff ({p}) manuell aufgehoben",
    "genre_moved": "Genre: {genre} – verschoben nach {path}",
    "genre_retagged": "Genre: {genre} – Tags angepasst",
    "genre_entry_only": "Genre: {genre} – nur der Eintrag wurde geändert, die Datei ist nicht erreichbar",
    "genre_failed": "Genre konnte nicht gesetzt werden: {error}",
    "task_created": "Aufgabe in der Windows-Aufgabenplanung angelegt",
    "task_removed": "Aufgabe entfernt",
    "updated": "Aktualisiert auf yt-dlp {v}",
    "up_to_date": "Bereits aktuell (yt-dlp {v})",
    "update_failed": "Aktualisierung fehlgeschlagen",
    "restart_required": "Aktualisiert – bitte HCLoader neu starten, damit Suche und Downloads wieder laufen",
    "backup_done": "Backup erstellt: {path}",
    "reset_all": "Alle Einstellungen zurückgesetzt",
    "festival_entry_only": "«{name}» nur im Eintrag gespeichert – die Datei ist nicht erreichbar",
    "series_saved": "Serie «{name}» gespeichert",
    "series_deleted": "Serie «{name}» gelöscht",
    "series_hidden": "Serie «{name}» ausgeblendet",
    "series_reset": "Mitgelieferte Serien wiederhergestellt",
    "assign_done": "Festivals zugeordnet: {assigned} neu, {suggested} Vorschläge",
    "assign_cancelled": "Zuordnung abgebrochen: {assigned} neu, {suggested} Vorschläge",
    "analysis_done": "Lautheit analysiert: {n} Dateien ({failed} fehlgeschlagen)",
    "analysis_cancelled": "Analyse nach {n} Dateien abgebrochen"
  },
  "upd": {
    "available": "Version {v} verfügbar",
    "available_sub": "Installiert: {cur}",
    "download": "Herunterladen",
    "notes": "Änderungen",
    "later": "Später",
    "close": "Schliessen",
    "cancel": "Abbrechen",
    "retry": "Erneut versuchen",
    "downloading": "Update {v} wird geladen",
    "phase_download": "Download",
    "phase_verify": "Prüfen",
    "phase_prepare": "Vorbereiten",
    "ready": "Update {v} bereit",
    "ready_sub": "Zum Einspielen wird HCLoader kurz geschlossen und neu gestartet.",
    "restart_now": "Jetzt neu starten",
    "on_exit": "Beim Beenden",
    "applying": "Update wird eingespielt …",
    "applying_sub": "HCLoader schliesst sich und startet gleich neu.",
    "error": "App-Update fehlgeschlagen",
    "blocked": "Automatisches Update nicht möglich",
    "notes_title": "Änderungen in Version {v}",
    "notes_empty": "Keine Änderungsnotizen vorhanden.",
    "notes_link": "Release auf GitHub",
    "notes_all": "Alle Änderungen anzeigen",
    "notes_less": "Nur Highlights anzeigen",
    "confirm_title": "Jetzt neu starten?",
    "confirm_ok": "Neu starten",
    "confirm_text": "HCLoader wird geschlossen, das Update eingespielt und die App neu gestartet. Ein laufender Download wird abgebrochen und bleibt in der Warteschlange. Musik, Einstellungen und Datenbank bleiben unverändert.",
    "on_exit_toast": "Das Update wird beim Beenden von HCLoader eingespielt.",
    "later_toast": "Das Update bleibt bereit und wird beim nächsten Start wieder angeboten.",
    "section_label": "HCLoader-Version",
    "section_help": "Neue Versionen kommen von GitHub. Daten, Einstellungen und die Musik bleiben beim Update unberührt; vor einer Datenbank-Migration wird automatisch eine Sicherung angelegt.",
    "current": "Installiert",
    "latest": "Neueste",
    "checked": "Letzte Prüfung",
    "check_now": "Jetzt prüfen",
    "checking": "Prüft …",
    "st_idle": "Aktuell",
    "st_available": "Neue Version verfügbar",
    "st_checking": "Prüfung läuft …",
    "st_downloading": "Wird geladen …",
    "st_ready": "Bereit zum Einspielen",
    "st_applying": "Wird eingespielt …",
    "st_error": "Fehler",
    "st_unknown": "Noch nicht geprüft",
    "up_to_date": "HCLoader ist aktuell (v{v})",
    "portable": "Portable-Version",
    "installed": "Installiert (Setup)",
    "git": "Git-Checkout",
    "from_repo": "aus {repo} (nicht die offizielle Quelle)",
    "unverified": "ohne Prüfsumme (nur ZIP-Integrität geprüft)",
    "rn_label": "Versionshinweise",
    "rn_help": "Was sich in jeder Version geändert hat – aus den mitgelieferten Notizen (auch offline).",
    "rn_older": "Älter",
    "rn_newer": "Neuer",
    "rn_pos": "{i} von {n}",
    "rn_installed": "installiert",
    "rn_empty": "Keine Versionshinweise gefunden.",
    "rn_version": "Version"
  },
  "err": {
    "generic": "Unbekannter Fehler",
    "bridge": "Fehler bei «{name}»: {msg}",
    "boot": "Start fehlgeschlagen: {msg}",
    "no_backend": "Keine Verbindung zum Backend"
  },
  "fatal": {
    "title": "Verbindung zum Backend fehlgeschlagen",
    "text": "Die Oberfläche hat keine Antwort vom Python-Teil von HCLoader erhalten. Es wird nichts angezeigt oder gespeichert, was nicht echt ist.",
    "waiting": "Wartet weiter auf das Backend …",
    "reload": "Neu laden"
  },
  "fest": {
    "all": "Alle Serien",
    "other": "Übrige / nicht zugeordnet",
    "other_hint": "Kein Festival",
    "sets": {
      "one": "{n} Set",
      "other": "{n} Sets"
    },
    "editions": {
      "one": "{n} Ausgabe",
      "other": "{n} Ausgaben"
    },
    "suggestions": {
      "one": "{n} Vorschlag",
      "other": "{n} Vorschläge"
    },
    "all_years": "Alle",
    "no_stage": "Ohne Bühne",
    "kind": {
      "festival": "Festival",
      "radio": "Radioshow",
      "podcast": "Podcast"
    },
    "set_type": {
      "live_set": "Live-Set",
      "closing_ceremony": "Closing Ceremony",
      "opening": "Opening",
      "endshow": "Endshow",
      "full_show": "Ganze Show",
      "warm_up": "Warm-up",
      "anthem": "Anthem",
      "episode": "Folge"
    },
    "change": "Festival ändern",
    "change_manual": "manuell gesetzt, Klick zum Ändern",
    "add": "Festival oder Serie setzen",
    "suggested": "Unsicherer Vorschlag: {name}",
    "accept": "Vorschlag übernehmen",
    "p_title": "Festival / Serie",
    "p_search": "Serie suchen …",
    "p_none": "Kein Festival",
    "p_no_match": "Keine Serie gefunden",
    "p_year": "Jahr",
    "p_variant": "Variante",
    "p_stage": "Bühne",
    "p_type": "Set-Art",
    "p_apply": "Übernehmen",
    "p_auto": "Zurück auf automatisch"
  },
  "backfill": {
    "action": "Alles einlesen (einmalig)",
    "action_title": "Die komplette Liste dieser Quelle einmal seitenweise einlesen – neue Treffer kommen in den Eingang",
    "again_title": "Nochmals alles einlesen – nur noch Unbekanntes kommt dazu",
    "search_title": "Nicht für gespeicherte Suchen – eine Suche liefert höchstens 100 Treffer",
    "why_open": "Einlesen läuft bereits – unter dem Namen anhalten oder abbrechen",
    "st_pending": "Wartet",
    "st_running": "Liest ein …",
    "st_paused": "Angehalten",
    "progress": "{n} / ~{total}",
    "progress_cap": "{n} / max. {cap}",
    "added": "+{n} im Eingang",
    "done_short": "Alles eingelesen {date}",
    "done_title": "Komplett eingelesen: {date} · {n} Einträge",
    "note_title": "Letzte Unterbrechung",
    "pause": "Anhalten",
    "resume": "Fortsetzen",
    "cancel": "Abbrechen",
    "keep": "Weiter einlesen",
    "dlg_title": "Alles von «{name}» einlesen?",
    "dlg_text": "Liest die komplette Liste dieser Quelle einmal seitenweise ein – flach und günstig, durch die Drosselung; geladen wird nichts. Treffer, die deine Filter bestehen, kommen in den <b>Eingang</b>, auch bei Quellen mit automatischem Download. Bekannte Videos kommen nie doppelt.",
    "dlg_requests": "Anfragen",
    "dlg_time": "Dauer",
    "dlg_entries": "Einträge",
    "dlg_known": "Bekannt aus der letzten Prüfung: <b>{n}</b> Einträge.",
    "dlg_unknown": "Die Grösse ist unbekannt – vorsichtig geschätzt für das Maximum von {cap} Einträgen.",
    "dlg_capped": "Eingelesen werden nur die ersten {cap} Einträge (Einstellungen › Zeitplan).",
    "dlg_resume": "Macht nach {n} bereits gelesenen Einträgen weiter; deren Seiten werden zuerst nochmals abgefragt.",
    "dlg_headless": "Zu gross für einen geplanten Lauf ({n} Anfragen pro Stunde): Wird die App vorher geschlossen, geht es nur in der App weiter.",
    "dlg_pace": "Höchstens {n} Anfragen pro Stunde, gleichmässig verteilt. Ein Backoff (HTTP 429 / Bot-Prüfung), das Schliessen der App oder ein Fehler unterbrechen nur – es geht später automatisch weiter. Anhalten oder abbrechen kannst du jederzeit.",
    "dlg_ok": "Einlesen starten",
    "dlg_ok_resume": "Weiter einlesen",
    "dlg_cancel_title": "Einlesen abbrechen?",
    "dlg_cancel_text": "Das Einlesen von «{name}» stoppt, der Fortschritt wird verworfen. Treffer im Eingang bleiben.",
    "toast_started": "«{name}» wird komplett eingelesen – läuft im Hintergrund",
    "toast_done": "«{name}» komplett eingelesen – +{n} im Eingang",
    "toast_paused": "«{name}» angehalten – weiter mit «Fortsetzen»",
    "toast_cancelled": "Einlesen von «{name}» abgebrochen"
  },
  "collector": {
    "nav": "Sammler",
    "open_title": "Festival-Sammler: alle Sets einer Festival-Ausgabe mit einer Checkliste zusammentragen",
    "title": "Festival-Sammler",
    "sub": "Alle Sets einer Festival-Ausgabe – nach Timetable, mit Checkliste",
    "back_library": "Zurück zur Bibliothek",
    "back_list": "Alle Checklisten",
    "collect": "Diese Ausgabe sammeln",
    "collect_title": "Checkliste aller Sets von {name}: fehlende Sets finden und laden",
    "open_checklist": "Checkliste {n} / {total}",
    "sets": "Sets",
    "lists": "Checklisten",
    "card_empty": "Noch keine Sets",
    "new_title": "Neue Checkliste",
    "new_text": "Festival und Jahr wählen. Die Sets kommen aus der Playlist des Veranstalters, einem eingefügten Timetable oder einer mitgelieferten Datei.",
    "new_ok": "Checkliste öffnen",
    "f_series": "Festival / Serie",
    "f_series_ph": "Wählen …",
    "f_series_other": "Radioshows & Podcasts",
    "err_series": "Bitte ein Festival oder eine Serie wählen.",
    "err_year": "Bitte das Jahr der Ausgabe eingeben.",
    "empty_title": "Noch keine Checkliste",
    "empty_text": "Eine Checkliste führt jedes Set einer Festival-Ausgabe auf und zeigt, was du schon hast.",
    "step1": "Oben Festival und Jahr wählen.",
    "step2": "Playlist des Veranstalters importieren oder den Timetable einfügen.",
    "step3": "Abhaken, was du nicht willst, fehlende Sets suchen und laden.",
    "delete": "Checkliste löschen",
    "dlg_delete_title": "Checkliste löschen?",
    "dlg_delete_text": "Die Checkliste von «{name}» wird mit allen Zeilen entfernt. Eine laufende Suche stoppt.",
    "dlg_delete_keep": "Geladene Dateien, Bibliothekseinträge und gespeicherte Treffer bleiben erhalten.",
    "toast_deleted": "Checkliste «{name}» gelöscht",
    "in_library": "{n} in der Bibliothek",
    "show_library": "In der Bibliothek zeigen ({n})",
    "more": "Mehr",
    "st": {
      "found": "Gefunden",
      "queued": "In Queue",
      "downloaded": "Geladen",
      "missing": "Fehlt",
      "ignored": "Ignoriert"
    },
    "filter_status": "Nur zeigen: {name}",
    "sources": "Quellen",
    "src_playlist": "Playlist des Veranstalters",
    "src_paste": "Timetable einfügen (Beta)",
    "files": "Mitgelieferte Timetables",
    "src_add": "Zeile hinzufügen",
    "all_stages": "Alle Bühnen",
    "all_days": "Alle Tage",
    "no_day": "Ohne Tag",
    "search": "Nach DJ filtern …",
    "col_dj": "DJ / Set",
    "col_when": "Tag / Zeit",
    "col_status": "Status",
    "col_match": "Gefundenes Video",
    "source": {
      "playlist": "Playlist",
      "timetable": "Timetable",
      "file": "Timetable-Datei",
      "manual": "Von Hand"
    },
    "edited": "Von Hand geändert – diese Werte gelten auch nach späteren Importen",
    "check_title": "Dieses Set sammeln",
    "all_title": "Alle / keine auswählen (angezeigte Zeilen)",
    "m_none": "Noch nicht gesucht",
    "m_searched": "Nichts gefunden ({date})",
    "confirm": "Bestätigen",
    "confirm_title": "Unsicherer Treffer – bestätigen, dass es das richtige Set ist",
    "reject_title": "Nicht dieses Video – für diese Zeile nie mehr vorschlagen",
    "reject": "Treffer verwerfen",
    "candidates": "Weitere Treffer: {n}",
    "candidates_head": "Anderen Treffer verwenden",
    "ignore": "Dieses Set ignorieren",
    "unignore": "Nicht mehr ignorieren",
    "delete_row": "Zeile löschen",
    "f_artist": "DJ / Artist",
    "f_day": "Tag",
    "f_start": "Start",
    "f_end": "Ende",
    "add_ok": "Hinzufügen",
    "err_artist": "DJ / Artist ist Pflicht.",
    "none_title": "Keine Zeilen",
    "none_text": "Keine Zeile passt zu den aktuellen Filtern.",
    "rows_empty_title": "Diese Checkliste ist leer",
    "rows_empty_text": "Am besten mit der offiziellen Playlist des Veranstalters beginnen – eine flache Abfrage deckt meist die meisten Sets ab. Oder den Timetable als Text einfügen.",
    "checked_of": "von {total} angehakt",
    "select_all": "Alle auswählen",
    "select_none": "Keine",
    "shown": "{n} von {total} Zeilen angezeigt",
    "to_confirm": "Zu bestätigen: {n}",
    "to_confirm_title": "Unsichere Treffer warten auf deine Bestätigung – Klick zeigt nur diese",
    "find": "Fehlende Sets suchen ({n})",
    "find_again": "Erneut suchen ({n})",
    "find_title": "Angehakte Sets ohne Treffer einzeln und gedrosselt suchen – zeigt zuerst eine Schätzung",
    "find_again_title": "Alle Sets wurden schon gesucht – die ohne Treffer erneut suchen",
    "find_none": "Nichts zu suchen – jedes angehakte Set hat einen Treffer",
    "find_running": "Die Suche läuft",
    "queue": "Angehakte laden ({n})",
    "queue_title": "Alle angehakten, bestätigten Sets in die Download-Warteschlange stellen",
    "queue_none": "Nichts zu laden – kein angehaktes Set mit bestätigtem, noch nicht geladenem Treffer",
    "job_pending": "Wartet",
    "job_running": "Sucht …",
    "job_paused": "Angehalten",
    "job_hits": "Gefunden: {n}",
    "job_cancel": "Stoppen",
    "job_resume": "Fortsetzen",
    "imp_running": "Playlist wird gelesen …",
    "imp_entries": "Einträge: {n}",
    "imp_hint": "flache Abfrage, Seite für Seite",
    "imp_busy": "Es wird bereits eine Playlist gelesen",
    "imp_added": "neu: {n}",
    "imp_merged": "zusammengeführt: {n}",
    "imp_matched": "in der Bibliothek gefunden: {n}",
    "imp_unchecked": "ohne Haken (zu kurz / Aftermovie): {n}",
    "imp_invalid": "ungültig: {n}",
    "pl_title": "Playlist des Veranstalters importieren",
    "pl_text": "Die offizielle Liveset-Playlist des Veranstalters ist die günstigste Quelle: eine flache Abfrage, nichts wird geladen. Jeder Eintrag wird zu einer bestätigten Zeile; DJ, Bühne und Set-Art kommen aus dem Titel.",
    "pl_url": "Link zur Playlist",
    "pl_hint": "YouTube-Playlist oder SoundCloud-Set. Zu kurze Einträge, Aftermovies und Trailer kommen ohne Haken dazu. Zeilen aus einem Timetable erhalten das passende Video.",
    "pl_ok": "Importieren",
    "pl_err_empty": "Bitte den Link einer Playlist einfügen.",
    "toast_pl_started": "Playlist wird gelesen – läuft im Hintergrund",
    "toast_pl_done": "Playlist gelesen –",
    "toast_pl_cancelled": "Playlist-Import gestoppt –",
    "tt_title": "Timetable einfügen – {name} (Beta)",
    "tt_text": "Den Timetable als Text oder CSV einfügen. Überschriften setzen Tag und Bühne, jede andere Zeile ist ein Set. Gespeichert wird erst beim Importieren. Der Text-Import ist eine Beta: Vorschau prüfen und Zeilen vor dem Import korrigieren.",
    "tt_input": "Timetable",
    "tt_preview": "Vorschau",
    "tt_placeholder": "Samstag – RED\n18:00 – 19:00 Headhunterz\n19:00 – 20:00 Sub Zero Project (Live)\n\nBLUE\nRebelion | 21:00–22:00",
    "tt_empty": "Hier erscheinen die erkannten Sets.",
    "tt_nothing": "Noch kein Set erkannt.",
    "tt_sum": "Sets: {n}",
    "tt_days": "Tage: {n}",
    "tt_stages": "Bühnen: {n}",
    "tt_skipped": "Nicht verstandene Zeilen: {n}",
    "tt_more": "… und {n} weitere",
    "tt_ok": "Importieren ({n})",
    "tt_edit_hint": "Sets hier vor dem Import korrigieren oder entfernen. Eine Änderung am Text links liest ihn neu ein.",
    "toast_tt": "Timetable importiert –",
    "files_text": "Timetables, die im HCLoader-Repository gepflegt und mit Updates ausgeliefert werden. Ein Import legt die Checkliste der jeweiligen Ausgabe an.",
    "files_empty_title": "Noch keine Timetables mitgeliefert",
    "files_empty": "Ausgeliefert wird nur, was nachweislich stimmt – diese Version bringt noch keine mit. Füge den Timetable stattdessen als Text ein.",
    "files_how_title": "Timetable beisteuern",
    "files_how": "Eine JSON-Datei pro Ausgabe mit den Sets (Artist, Bühne, Tag, Start, Ende) und einem Link zum offiziellen Timetable als Quelle. Einreichen als Issue oder Pull Request auf GitHub; das README neben den Dateien beschreibt das Format.",
    "files_meta": "Sets: {n} · Stand {date}",
    "files_source": "offizielle Quelle",
    "files_import": "Importieren",
    "files_broken": "Ungültige Datei: {error}",
    "files_unknown": "Serie hier unbekannt oder ausgeblendet",
    "est_title": "Fehlende Sets suchen – {name}",
    "est_text": "Sucht jedes angehakte Set ohne Treffer einzeln: <b>DJ + Festival + Jahr</b> als flache Suche über den Throttle. Es wird nichts geladen.",
    "est_requests": "Suchen",
    "est_left": "frei in dieser Stunde",
    "est_again": "Alle Sets wurden schon gesucht – jetzt werden die ohne Treffer erneut gesucht.",
    "est_offline": "Soeben gratis mit der Bibliothek abgeglichen: {n}.",
    "est_resume": "Setzt die unterbrochene Suche fort.",
    "est_wait": "Das Suchlimit dieser Stunde ist aufgebraucht – die erste Suche startet {t}.",
    "est_backoff": "Backoff aktiv bis {t} – vorher kann keine Suche starten.",
    "est_pace": "Höchstens {n} Suchen pro Stunde, gleichmässig verteilt (etwa alle {min} Min.). Unsichere Treffer warten auf deine Bestätigung. Ein Backoff, das Schliessen der App oder ein Fehler unterbricht die Suche nur – sie geht automatisch weiter.",
    "est_ok": "Suche starten",
    "est_ok_resume": "Suche fortsetzen",
    "toast_find_started": "Fehlende Sets von «{name}» werden gesucht – läuft im Hintergrund",
    "toast_find_done": "Suche beendet – {n} von {total} gefunden",
    "toast_find_cancelled": "Suche gestoppt – «Fehlende Sets suchen» setzt sie fort",
    "toast_offline": "Mit der Bibliothek abgeglichen: {n} – keine Suche nötig",
    "toast_confirmed": "«{name}» bestätigt",
    "toast_rejected": "Treffer von «{name}» verworfen",
    "toast_ignored": "«{name}» ignoriert",
    "toast_unignored": "«{name}» wird wieder gesammelt",
    "toast_row_added": "«{name}» hinzugefügt",
    "toast_row_added_hit": "«{name}» hinzugefügt – in der Bibliothek gefunden",
    "toast_row_saved": "«{name}» gespeichert",
    "toast_row_retag": "«{name}» gespeichert – die Datei wird neu getaggt",
    "toast_row_deleted": "Zeile «{name}» gelöscht",
    "q_none": "Nichts in die Warteschlange gestellt",
    "q_unconfirmed": "unbestätigt: {n}",
    "q_missing": "ohne Treffer: {n}",
    "q_other": "nicht ladbar: {n}",
    "q_retag": "neu getaggt: {n}",
    "export": "Playlist",
    "export_title": "Die geladenen Sets dieser Checkliste als M3U8-Playlist exportieren"
  },
  "tracks": {
    "nav": "Tracks",
    "open_title": "Welche Sets spielen einen Track? Tracklisten der Bibliothek durchsuchen",
    "title": "Tracks",
    "sub": "Welche Sets spielen diesen Track?",
    "back": "Zurück zur Bibliothek",
    "search": "Artist oder Titel, z.B. Dragonborn",
    "n_tracks": {
      "one": "{n} Track",
      "other": "{n} Tracks"
    },
    "n_sets": {
      "one": "{n} Set",
      "other": "{n} Sets"
    },
    "status": "{tracks} in {sets}",
    "status_last": "Eingelesen:",
    "scan": "Tracklisten einlesen",
    "scan_title": "Tracklisten aller Sets einlesen (offline: Kapitel, Beschreibungen, CUE-Dateien)",
    "rescan": "Alle neu einlesen",
    "rescan_title": "Tracklisten aller Sets nochmals einlesen",
    "scan_new": "Neue einlesen",
    "scan_new_title": "Nur neue oder seit dem letzten Durchgang geänderte Sets einlesen",
    "running": "Tracklisten werden eingelesen … {done} / {total}",
    "engine_like": "Einfache Suche: dieses SQLite hat keinen Volltextindex",
    "top_title": "Meistgespielte Tracks",
    "top_sub": "in den meisten Sets",
    "top_sets": {
      "one": "{n} Set",
      "other": "{n} Sets"
    },
    "top_find": "Sets mit diesem Track zeigen",
    "top_empty": "Noch kein Track kommt in mehr als einem Set vor.",
    "results": {
      "one": "{n} Set mit «{q}»",
      "other": "{n} Sets mit «{q}»"
    },
    "truncated": "die ersten {n} – Suche verfeinern",
    "more_hits": {
      "one": "+ {n} weiterer Treffer",
      "other": "+ {n} weitere Treffer"
    },
    "no_results_title": "Kein Set spielt «{q}»",
    "no_results_text": "Versuch es mit einem Teil von Artist oder Titel. Gefunden werden nur Sets mit Trackliste (Kapitel, Beschreibung, CUE-Datei).",
    "empty_title": "Noch keine Tracklisten",
    "empty_text": "HCLoader liest Tracklisten aus Kapiteln, Beschreibungen und CUE-Dateien deiner Sets – offline, ohne YouTube zu fragen.",
    "empty_none_title": "Keins deiner Sets hat eine Trackliste",
    "empty_none_text": "Tracklisten stammen aus Kapiteln, Beschreibungen mit Zeitstempeln und CUE-Dateien. Sets ohne lassen sich nicht durchsuchen.",
    "library_empty": "Lade zuerst ein paar Sets – ihre Tracklisten erscheinen dann hier.",
    "jump": "Ab {time} abspielen",
    "jump_external": "Im Standardplayer geöffnet – dort zu {time} springen",
    "no_time": "Kein Zeitstempel in der Trackliste",
    "tracklist": "Trackliste",
    "tracklist_title": "Ganze Trackliste dieses Sets zeigen",
    "panel_source": "Quelle: {source}",
    "source_chapters": "Kapitel",
    "source_description": "Beschreibung",
    "source_id3": "ID3-Kapitel",
    "source_cue": "CUE-Datei",
    "source_none": "keine",
    "panel_empty": "Dieses Set hat keine Trackliste",
    "panel_empty_hint": "Weder Kapitel noch eine Beschreibung mit Trackliste noch eine CUE-Datei gefunden.",
    "close": "Schliessen",
    "id_track": "Unveröffentlichter oder unbekannter Track (ID)",
    "play_set": "Set von Anfang an abspielen",
    "toast_done": "Tracklisten eingelesen: {sets}, {tracks}",
    "toast_cancelled": "Tracklisten einlesen abgebrochen"
  },
  "pl": {
    "title": "Playlist exportieren",
    "export": "Exportieren",
    "overwrite": "Überschreiben",
    "exists": "In diesem Ordner gibt es schon eine Playlist mit diesem Namen. «Überschreiben» ersetzt sie.",
    "nothing": "Nichts zu exportieren – hier gibt es keine geladenen Sets.",
    "missing": "{n} Dateien fehlen – sie werden übersprungen",
    "name": "Dateiname",
    "folder": "Ordner",
    "browse": "Durchsuchen …",
    "paths": "Pfade in der Playlist",
    "relative": "Relativ",
    "absolute": "Absolut",
    "relative_help": "Relativ zur Playlist – funktioniert weiter, wenn du den ganzen Musikordner verschiebst. Dateien auf einem anderen Laufwerk werden mit vollem Pfad geschrieben.",
    "absolute_help": "Volle Pfade – die Playlist kann überall liegen, passt aber nicht mehr, wenn die Musik umzieht.",
    "sync": "Nach Downloads aktuell halten",
    "sync_help": "Wird nach jedem Download automatisch neu geschrieben.",
    "sync_off": "Vorgemerkt – wirkt, sobald «Gespeicherte Playlists nach Downloads aktualisieren» an ist (Einstellungen › Ablage).",
    "done": "Playlist gespeichert ({sets}): {path}",
    "skipped": "{n} fehlende übersprungen",
    "fallback": "{n} auf anderem Laufwerk mit vollem Pfad",
    "synced": "Playlists aktualisiert: {n}",
    "sync_failed": "Playlists nicht aktualisiert: {n} (siehe Protokoll)"
  },
  "djs": {
    "nav": "DJs",
    "open_title": "DJ-Seiten: alle Artists deiner Bibliothek, mit Aliassen und b2b-Sets",
    "title": "DJs",
    "sub": "Artists in deiner Bibliothek",
    "back_library": "Zurück zur Bibliothek",
    "back": "Alle DJs",
    "add": "DJ / Act hinzufügen",
    "search": "DJs oder Aliasse suchen",
    "sort": "Sortieren",
    "sort_sets": "Sets",
    "sort_recent": "Zuletzt",
    "sort_name": "Name",
    "hidden_chip": "Ausgeblendet: {n}",
    "n_festivals": "Festivals: {n}",
    "n_b2b": "b2b: {n}",
    "aka": "alias {names}",
    "unhide": "Wieder in der Liste zeigen",
    "none_title": "Kein DJ gefunden",
    "none_text": "Versuch es mit einem anderen Namen oder Alias.",
    "empty_title": "Noch keine DJs",
    "empty_text": "DJs werden offline aus den Titeln deiner geladenen Sets, aus Festival-Checklisten und aus Artist-Kanälen erkannt.",
    "b2b_title": "Zusammen gespielt (b2b) – das Set zählt für jeden Artist",
    "b2b_with": "b2b mit {names}",
    "aliases": "Aliasse",
    "no_aliases": "Keine Aliasse",
    "split_title": "«{alias}» abtrennen – als eigenen DJ zählen",
    "play_all": "Alle abspielen",
    "export": "M3U exportieren",
    "export_title": "Playlist exportieren: {name}",
    "watch": "Zur Watchlist",
    "discover": "In Entdecken suchen",
    "stat_sets": "Sets",
    "stat_hours": "Stunden",
    "stat_festivals": "Festivals",
    "stat_years": "Jahre",
    "stat_b2b": "b2b",
    "other_sets": "Weitere Sets · {year}",
    "tracks": "Am meisten gespielt in diesen Sets",
    "track_sets": "{n}×",
    "tracks_none": "Für diese Sets gibt es noch keine Tracklisten – Bibliothek › Tracks liest sie offline ein.",
    "play_all_external": "«Alle abspielen» braucht den eingebauten Player (Einstellungen › Wiedergabe).",
    "watch_exists": "Schon in der Watchlist: {name}",
    "watch_title": "{name} beobachten",
    "watch_ok": "Zur Watchlist hinzufügen",
    "watch_channel": "Neue Sets aus dem eigenen Kanal von {name} landen in deinem Eingang:",
    "watch_search": "Kein eigener Kanal bekannt – die Watchlist sucht regelmässig auf YouTube nach:",
    "watch_note": "Es wird nichts automatisch geladen. Du kannst die Quelle in der Watchlist jederzeit ändern oder entfernen.",
    "watch_added": "Zur Watchlist hinzugefügt: {name}",
    "split_q_title": "Alias abtrennen",
    "split_q": "Sets mit «{alias}» als eigenen DJ zählen statt für {name}?",
    "split_ok": "Abtrennen",
    "split_done": "«{alias}» ist wieder ein eigener DJ",
    "edit": "Name und Aliasse bearbeiten",
    "edit_title": "{name} bearbeiten",
    "add_title": "DJ oder Act hinzufügen",
    "f_name": "Name",
    "f_aliases": "Aliasse",
    "f_aliases_help": "Andere Schreibweisen und Kurznamen (z.B. «HH»). Sets mit einem Alias zählen für diesen DJ.",
    "f_act_help": "Optional. Ein Duo mit «&» im Namen (z.B. «D-Block & S-te-Fan») zählt dann als ein Act statt als b2b.",
    "f_alias_add": "+ Alias",
    "f_channel": "Eigener Kanal (optional)",
    "f_channel_help": "URL des YouTube- oder SoundCloud-Kanals – für «Zur Watchlist».",
    "saved": "Gespeichert",
    "merge": "Mit anderem DJ zusammenführen …",
    "merge_title": "{name} zusammenführen",
    "merge_text": "Alle Sets und Schreibweisen von {name} zählen dann für den gewählten DJ. Du kannst ihn später wieder abtrennen.",
    "merge_into": "Zusammenführen mit",
    "merge_ok": "Zusammenführen",
    "merge_none": "Es gibt keinen anderen DJ zum Zusammenführen.",
    "merged": "{name} zusammengeführt",
    "hide": "Kein DJ – ausblenden",
    "hidden_done": "Aus der DJ-Liste ausgeblendet",
    "unhidden_done": "Wieder in der DJ-Liste",
    "sub_n": {
      "one": "{n} DJ",
      "other": "{n} DJs"
    }
  },
  "stats": {
    "title": "Statistik",
    "sub": "Deine Bibliothek in Zahlen – offline, aus der Datenbank",
    "range": "Zeitraum",
    "p_all": "Gesamt",
    "p_12m": "12 Monate",
    "p_30d": "30 Tage",
    "p_year": "Dieses Jahr",
    "p_custom": "Eigener",
    "from": "Von",
    "to": "Bis",
    "n_sets": {
      "one": "{n} Set",
      "other": "{n} Sets"
    },
    "sets_word": {
      "one": "Set",
      "other": "Sets"
    },
    "k_sets": "Sets",
    "k_hours": "Spielzeit",
    "k_size": "Auf der Platte",
    "k_avg": "Set im Schnitt",
    "of_library": "von {n} in der Bibliothek",
    "since": "seit {d}",
    "days_nonstop": "{n} Tage nonstop",
    "last_dl": "letzter Download {d}",
    "avg_size": "{s} pro Set",
    "sizes_missing": {
      "one": "{n} Datei noch nicht gemessen",
      "other": "{n} Dateien noch nicht gemessen"
    },
    "measuring": "Dateigrössen werden gemessen … {done} / {total}",
    "h_months": "Downloads pro Monat",
    "h_years_dl": "Downloads pro Jahr",
    "best_month": "Bester: {m} ({n})",
    "h_genres": "Nach Genre",
    "h_sources": "Quellen",
    "h_festivals": "Top-Festivals",
    "editions": {
      "one": "{n} Ausgabe",
      "other": "{n} Ausgaben"
    },
    "festivals_other": "+ {n} Sets von {f} weiteren Festivals",
    "no_festivals": "Keine Festival-Sets in diesem Zeitraum – Einstellungen › Festivals & Serien ordnet sie zu.",
    "h_djs": "Top-DJs",
    "open_dj": "DJ-Seite von {name} öffnen",
    "no_djs": "Keine DJs in diesem Zeitraum erkannt.",
    "h_years": "Nach Jahr des Sets",
    "year_unknown": "{n} ohne bekanntes Jahr",
    "h_tracks": "Meistgespielte Tracks",
    "no_tracks": "Noch kein Track kommt in zwei Sets vor – Tracklisten stammen aus Kapiteln und Beschreibungen (Bibliothek › Tracks).",
    "h_watchlist": "Watchlist-Aktivität",
    "w_checks": "Prüfungen",
    "w_scheduled": "davon geplant",
    "w_found": "Gefunden",
    "w_inbox": "Im Eingang",
    "w_library": "In der Bibliothek",
    "w_source": "Quelle",
    "w_found_n": "{n} gefunden",
    "w_checks_n": "{n} Prüfungen",
    "w_last": "letzte Prüfung {t}",
    "w_none_range": "Keine Quelle hat in diesem Zeitraum etwas gefunden.",
    "w_no_sources": "Noch keine Watchlist-Quellen.",
    "none": "Nichts in diesem Zeitraum.",
    "range_empty": "In diesem Zeitraum wurde nichts geladen – wähle einen längeren.",
    "error": "Statistik nicht verfügbar",
    "empty_title": "Noch keine Sets",
    "empty_text": "Sobald die ersten Sets in der Bibliothek sind, siehst du hier, was du sammelst – Genres, Festivals, DJs, Stunden.",
    "empty_go": "Sets entdecken"
  }
});
