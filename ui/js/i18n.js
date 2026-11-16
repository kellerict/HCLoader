/* =====================================================================
   i18n.js – alle UI-Texte (de-CH: «ss» statt Eszett, Guillemets)
   Zugriff: HC.t('bereich.schluessel', {platzhalter})
   ===================================================================== */
(function () {
  'use strict';
  const HC = (window.HC = window.HC || {});

  const DE = {
    app: { title: 'HCLoader', tagline: 'HARD MUSIC ARCHIVE', mock: 'MOCK-MODUS' },

    nav: {
      discover: 'Entdecken', inbox: 'Eingang', watchlist: 'Watchlist', downloads: 'Downloads',
      library: 'Bibliothek', log: 'Protokoll', settings: 'Einstellungen',
    },
    navfoot: { today: 'HEUTE', next: 'NÄCHSTE PRÜFUNG' },

    common: {
      ok: 'OK', cancel: 'Abbrechen', save: 'Speichern', delete: 'Löschen', edit: 'Bearbeiten', remove: 'Entfernen',
      reset: 'Zurücksetzen', on: 'an', off: 'aus', current: 'aktuell', loading: 'lädt …',
      add_chip: '+ hinzufügen', empty: '«leer»', empty_list: '«keine»',
    },

    fmt: {
      today: 'heute', yesterday: 'gestern', never: 'noch nie',
      days_ago: 'vor {n} T.', months_ago: 'vor {n} Mt.', years_ago: 'vor {n} J.',
      today_at: 'heute {t}', tomorrow_at: 'morgen {t}', yesterday_at: 'gestern {t}',
      views: '{n} Aufrufe', views_k: '{n}k Aufrufe', views_m: '{n} Mio. Aufrufe',
    },

    unit: {
      s: 's', h: 'h', minutes: 'Minuten', mbs: 'MB/s', bpm: 'BPM', chars: 'Zeichen',
      results: 'Treffer', entries: 'Einträge', clock: 'Uhr',
    },
    range: { ge_sleep: '≥ Minimum', ge_initial: '≥ Startwert' },

    status: {
      new: 'Neu', inbox: 'Im Eingang', queued: 'In Queue', downloading: 'Lädt', done: 'Geladen',
      ignored: 'Ignoriert', failed: 'Fehler',
    },
    period: { all: 'Alle', '7d': 'Letzte 7 Tage', '30d': 'Letzte 30 Tage', '1y': 'Letztes Jahr' },
    source_type: { channel: 'Kanal', playlist: 'Playlist', search: 'Suche' },
    run_kind: { watchlist: 'Watchlist', headless: 'Aufgabenplanung', manual: 'Manuell' },
    phase: {
      waiting: 'Wartet', sleep: 'Pause (Schonung)', download: 'Laden', convert: 'Konvertieren', tag: 'Taggen', failed: 'Fehlgeschlagen',
    },
    po_mode: { off: 'Aus', script: 'Script', http: 'HTTP' },
    po_mode_long: { off: 'Aus', script: 'Script (Deno)', http: 'HTTP-Server (lokal)' },

    statusbar: {
      ok: 'OK', missing: 'fehlt', po: 'PO-Token', po_active: 'aktiv ({mode})', po_inactive: 'inaktiv', po_error: 'Fehler',
      backoff: 'Backoff', backoff_none: 'keiner', backoff_until: 'bis {t} · noch {rest}',
      queue: 'Queue', queue_empty: 'leer', queue_active: 'aktiv', queue_paused: 'pausiert',
      today: 'Heute', next: 'Nächste Prüfung', next_off: 'aus',
    },

    card: {
      select: 'Auswählen', open: 'Auf YouTube öffnen', ignore: 'Ignorieren', unignore: 'Nicht mehr ignorieren',
      more: 'Weitere Aktionen', download: 'Herunterladen', watch: 'Kanal zur Watchlist', block: 'Kanal blockieren',
      set_genre: 'Genre setzen',
    },

    discover: {
      placeholder: 'Suche nach Mix, Liveset, DJ, Event …', search: 'Suchen', searching_btn: 'Suche …',
      searching: 'Suche läuft – flache Abfrage, schont YouTube …',
      sort: 'Sortierung', sort_rel: 'Relevanz', sort_date: 'Neueste zuerst', sort_dur: 'Längste zuerst', sort_views: 'Meiste Aufrufe',
      quota: 'Suchen diese Stunde: {n} / {max}',
      filters: 'Filter', toggle_filters: 'Filter-Panel ein-/ausblenden',
      f_duration: 'Dauer (Minuten)', f_min: 'Minimum', f_max: 'Maximum (leer = offen)', f_max_ph: 'max',
      f_period: 'Upload-Zeitraum', f_inc: 'Include-Keywords', f_exc: 'Exclude-Keywords', f_show: 'Anzeige',
      f_hide: 'Geladene & ignorierte ausblenden', f_blacklist: 'Kanal-Blacklist anwenden',
      count: '{n} Treffer · {hidden} herausgefiltert', selected: '{n} ausgewählt',
      select_all: 'Alle wählen', download_sel: 'Auswahl laden',
      ready_title: 'Bereit', ready_text: 'Suchbegriff eingeben und mit Enter starten.',
      none_title: 'Nichts gefunden', none_text: 'Filter lockern oder andere Suchbegriffe probieren.',
    },

    inbox: {
      title: 'Eingang', sub: 'Neue Treffer aus der Watchlist, die alle Filter bestehen',
      sub_n: '{n} neue Treffer aus der Watchlist, die alle Filter bestehen',
      ignore_all: 'Alle ignorieren', download_all: 'Alle laden',
      empty_title: 'Eingang leer', empty_text: 'Die Watchlist hat keine neuen Mixes gefunden.',
    },

    watchlist: {
      title: 'Watchlist', sub_n: '{n} Quellen · {active} aktiv',
      add: 'Quelle', check_all: 'Alle jetzt prüfen', check: 'Prüfen', checking: 'prüft …',
      col_active: 'Aktiv', col_name: 'Name', col_type: 'Typ', col_genre: 'Genre', col_auto: 'Neue Treffer',
      col_max: 'Max.', col_last: 'Zuletzt geprüft', col_new: 'Neu',
      genre_auto: 'automatisch', genre_auto_long: 'Automatisch (aus Keywords)',
      auto_on: 'laden', auto_off: 'Eingang',
      empty_title: 'Keine Quellen', empty_text: 'Kanal, Playlist oder gespeicherte Suche hinzufügen.',
      add_title: 'Quelle hinzufügen', edit_title: 'Quelle bearbeiten',
      f_type: 'Typ', f_name: 'Name', f_url: 'URL', f_query: 'Suchbegriff', f_genre: 'Standard-Genre', f_max: 'Max. Einträge',
      f_enabled: 'Aktiv', f_auto: 'Treffer automatisch herunterladen',
      ph_channel: 'https://www.youtube.com/@kanal', ph_playlist: 'https://www.youtube.com/playlist?list=…', ph_search: 'z.B. frenchcore liveset',
    },

    downloads: {
      title: 'Downloads', sub: 'Sequenziell, ein Download gleichzeitig',
      pause: 'Pausieren', resume: 'Fortsetzen', cancel: 'Abbrechen', retry: 'Wiederholen', remove: 'Entfernen',
      up: 'Nach oben', down: 'Nach unten', eta: 'ETA', position: 'Position {n}', sleep_left: 'weiter in',
      steps: 'Laden · Konvertieren · Taggen', unlimited: 'unbegrenzt',
      l_run: 'Dieser Lauf', l_day: 'Heute', l_rate: 'Rate-Limit', l_sleep: 'Pause zw. Downloads',
      sec_queue: 'Warteschlange', sec_failed: 'Fehlgeschlagen',
      empty_title: 'Warteschlange leer', empty_text: 'Mixes unter «Entdecken» oder im «Eingang» auswählen.',
      paused: '<b>Warteschlange pausiert.</b> Der laufende Download wird angehalten, bis du fortsetzt.',
      backoff: '<b>Backoff aktiv bis {t}</b> (noch {rest}). Downloads, Suche und Watchlist sind gesperrt.',
    },

    library: {
      title: 'Bibliothek', sub: '{n} Mixes · {h} Stunden · {gb} GB', shown: '{n} angezeigt',
      search: 'Bibliothek durchsuchen …', all_genres: 'Alle Genres', all_years: 'Alle Jahre',
      col_title: 'Titel', col_artist: 'Artist', col_genre: 'Genre', col_duration: 'Dauer', col_size: 'Grösse',
      col_upload: 'Upload', col_loaded: 'Geladen',
      open_folder: 'Ordner öffnen', retag: 'Datei neu taggen', delete: 'Eintrag + Datei löschen',
      empty_title: 'Noch nichts geladen', empty_text: 'Geladene Mixes erscheinen hier.',
      none_title: 'Keine Treffer', none_text: 'Suche oder Filter anpassen.',
    },

    log: {
      title: 'Protokoll', sub: 'Live-Log und Lauf-Historie', live: 'Live-Log', history: 'Lauf-Historie',
      lvl_info: 'Info', lvl_warn: 'Warn', lvl_error: 'Fehler', follow: 'Mitlaufen',
      lines: '{n} Zeilen', empty: 'Keine Einträge für diese Stufen.', no_runs: 'Noch keine Läufe.',
      found: 'gefunden', downloaded: 'geladen', errors: 'Fehler', running: 'läuft …',
    },

    settings: { title: 'Einstellungen', sub: 'Alles, was die App tut, ist hier einstellbar' },
    tabs: {
      general: 'Allgemein', filters: 'Filter & Keywords', genres: 'Genres', download: 'Download & Qualität',
      storage: 'Ablage & Tags', throttle: 'Schonung', network: 'Netzwerk & PO-Token', schedule: 'Zeitplan',
      appearance: 'Darstellung', maintenance: 'Wartung',
    },
    tabs_hint: {
      general: 'Grundlegendes Verhalten der App.',
      filters: 'Standardfilter für Suche und Watchlist. Im Filter-Panel unter «Entdecken» temporär überschreibbar.',
      genres: 'Reihenfolge = Priorität. Das erste Genre, dessen Keyword im Titel vorkommt, gewinnt. Manuell gesetzte Genres und das Standard-Genre einer Quelle gehen vor.',
      download: 'YouTube liefert meist Opus mit ca. 130–160 kbps. MP3 ist eine Umwandlung und klingt nicht besser als die Quelle – ist aber überall abspielbar.',
      storage: 'Wohin die Dateien kommen und wie sie heissen. Die Struktur ist auf Medienserver wie Plex oder Jellyfin ausgelegt.',
      throttle: 'Begrenzt die Last auf YouTube. Diese Werte gelten für Suche, Watchlist und Downloads gemeinsam.',
      network: 'Der PO-Token weist Requests als echten Browser aus und senkt das Risiko von Bot-Sperren.',
      schedule: 'Wann die Watchlist automatisch geprüft wird – in der App und über die Windows-Aufgabenplanung.',
      appearance: 'Look & Feel. Änderungen sind sofort als Vorschau sichtbar und gelten erst nach dem Speichern dauerhaft.',
      maintenance: 'Versionen, Updates, Datenbank.',
    },

    set: {
      default: 'Standard', range: 'Bereich', browse: 'Wählen',
      saving: 'Speichert …', discard: 'Verwerfen', tab_reset: 'Tab auf Standard', tab_reset_title: 'Alle Felder dieses Tabs auf die Standardwerte setzen (wird erst mit «Speichern» wirksam)',
      state_clean: 'Alles gespeichert', state_dirty_one: '1 ungespeicherte Änderung', state_dirty: '{n} ungespeicherte Änderungen',
      state_error: '1 Fehler – bitte korrigieren', state_errors: '{n} Fehler – bitte korrigieren',
      h: {
        search: 'Suche', duration: 'Dauer & Zeitraum', keywords: 'Keywords', display: 'Anzeige',
        cover: 'Cover', chapters: 'Kapitel & Tracklist', tags: 'Tags',
        pauses: 'Pausen & Bandbreite', limits: 'Limits', backoff: 'Backoff bei Sperre',
        po: 'PO-Token-Provider', fallback: 'Notlösungen',
        in_app: 'In der App', task: 'Windows-Aufgabenplanung',
        updates: 'Updates', database: 'Datenbank', reset: 'Zurücksetzen',
      },

      general: {
        start_view: { label: 'Startansicht', help: 'Welche Ansicht nach dem Start geöffnet wird.' },
        log_level: { label: 'Log-Stufe', help: 'Wie ausführlich die Log-Datei und das Live-Log sind. DEBUG nur zur Fehlersuche.' },
        confirm_delete: { label: 'Löschen bestätigen', help: 'Vor dem Löschen eines Mixes aus der Bibliothek (Eintrag + Datei) nachfragen.' },
      },
      search: {
        results_count: { label: 'Treffer pro Suche', help: 'Anzahl Ergebnisse, die eine Suche flach abfragt. Mehr Treffer = mehr Last für YouTube.' },
      },
      filters: {
        min_duration: { label: 'Mindestlänge', help: 'Kürzere Videos werden nie als Mix behandelt.' },
        max_duration: { label: 'Maximallänge', help: '0 = unbegrenzt.' },
        upload_period: { label: 'Upload-Zeitraum', help: 'Ältere Uploads werden ausgeblendet.' },
        include_keywords: { label: 'Include-Keywords', help: 'Mindestens eines muss im Titel vorkommen. Leer = alles zulassen. Enter oder Komma fügt hinzu.' },
        exclude_keywords: { label: 'Exclude-Keywords', help: 'Kommt eines davon im Titel vor, wird das Video verworfen.' },
        match_description: { label: 'Beschreibung durchsuchen', help: 'Keywords auch in der Videobeschreibung prüfen. Flache Abfragen liefern sie oft nicht.' },
        hide_done_ignored: { label: 'Geladene & ignorierte ausblenden', help: 'Bereits geladene und ignorierte Videos in den Treffern verstecken.' },
        apply_channel_blacklist: { label: 'Kanal-Blacklist anwenden', help: 'Videos blockierter Kanäle nie anzeigen.' },
      },
      blacklist: { label: 'Blockierte Kanäle', help: 'Kanäle blockierst du über das Menü einer Karte. Hier lassen sie sich wieder freigeben.', none: 'Keine Kanäle blockiert', unblock: 'Freigeben' },
      genres: {
        add: 'Genre', up: 'Höhere Priorität', down: 'Tiefere Priorität', delete: 'Genre löschen', color: 'Farbe wählen',
        name_ph: 'Name', kw_ph: '+ Keyword',
        fallback: 'Fallback – greift, wenn kein Keyword passt. Immer vorhanden, immer zuletzt.',
      },
      download: {
        audio_format: { label: 'Ausgabeformat', help: 'MP3 oder das Original von YouTube ohne Umwandlung behalten.' },
        mp3_quality: { label: 'MP3-Qualität', help: '320 kbps CBR ist am kompatibelsten, V0 VBR spart etwas Platz.' },
        embed_cover: { label: 'Cover einbetten', help: 'Thumbnail quadratisch zugeschnitten als Cover in die Datei schreiben.' },
        write_cover_jpg: { label: 'cover.jpg zusätzlich speichern', help: 'Für Medienserver, die Ordner-Cover lesen.' },
        write_cue: { label: '.cue-Datei schreiben', help: 'Tracklist aus Kapiteln oder Zeitstempeln der Beschreibung, neben der Audiodatei.' },
        write_id3_chapters: { label: 'ID3-Kapitel schreiben', help: 'Kapitelmarken (CHAP/CTOC) direkt in die MP3 einbetten.' },
      },
      storage: {
        target_dir: { label: 'Zielordner', help: 'Wurzel der Musikablage. Temporäre Dateien liegen in «.tmp» darunter.' },
        path_template: { label: 'Pfadmuster', help: 'Relativ zum Zielordner, ohne Dateiendung. «/» trennt Ordner. {id} muss enthalten sein.' },
        max_title_length: { label: 'Max. Titellänge', help: 'Längere Titel werden im Dateinamen gekürzt.' },
        max_path_length: { label: 'Max. Pfadlänge', help: 'Gesamtpfad inklusive Zielordner. Windows erlaubt ohne Zusatzeinstellung 259 Zeichen.' },
        artist_from_title: { label: 'Artist aus Titel lesen', help: 'Muster «ARTIST @ EVENT» und «ARTIST - TITEL» erkennen, sonst den Kanalnamen verwenden.' },
        title_cleanup_patterns: { label: 'Titel bereinigen', help: 'Reguläre Ausdrücke, deren Treffer aus dem Titel entfernt werden. Enter fügt hinzu.', ph: '+ Regex' },
      },
      path_preview: { label: 'Vorschau', help: 'Platzhalter anklicken, um sie ins Pfadmuster einzufügen.' },
      throttle: {
        sleep_requests: { label: 'Pause zwischen Requests', help: 'Wartezeit zwischen Metadaten-Abfragen (Suche, Watchlist).' },
        sleep_interval: { label: 'Pause zwischen Downloads – Minimum', help: 'Nach jedem Download wird zufällig zwischen Minimum und Maximum gewartet.' },
        max_sleep_interval: { label: 'Pause zwischen Downloads – Maximum', help: 'Obere Grenze der zufälligen Pause.' },
        limit_rate_mb: { label: 'Download-Rate', help: 'Maximale Bandbreite. 0 = unbegrenzt (nicht empfohlen).' },
        max_downloads_per_run: { label: 'Max. Downloads pro Lauf', help: 'Der Rest bleibt in der Warteschlange.' },
        max_downloads_per_day: { label: 'Max. Downloads pro Tag', help: 'Zähler gilt für manuelle und automatische Downloads zusammen.' },
        max_searches_per_hour: { label: 'Max. Suchen pro Stunde', help: 'Schützt vor versehentlichem Dauersuchen.' },
        backoff_initial_hours: { label: 'Backoff – Startwert', help: 'Sperrzeit nach HTTP 429 oder «confirm you’re not a bot».' },
        backoff_max_hours: { label: 'Backoff – Maximum', help: 'Die Sperrzeit verdoppelt sich bei jeder weiteren Sperre bis zu diesem Wert.' },
      },
      backoff: {
        none: 'Kein Backoff aktiv', none_detail: 'Suche, Watchlist und Downloads sind freigegeben.',
        active: 'Backoff aktiv', active_detail: 'bis {t} · noch {rest} · Stufe {level}',
        blocked: 'YouTube hat eine Sperre signalisiert. Suche, Watchlist und Downloads sind blockiert, bis die Zeit abgelaufen ist.',
        clear: 'Manuell aufheben',
      },
      ladder: { label: 'Stufen', help: 'So steigt die Sperrzeit mit den aktuellen Werten.', reset: 'Reset nach erfolgreichem Lauf', invalid: 'Ungültige Werte' },
      network: {
        po_token_mode: { label: 'Modus', help: 'bgutil-Plugin für yt-dlp. Script startet Deno bei Bedarf, HTTP lässt einen lokalen Server mitlaufen.' },
        po_token_port: { label: 'HTTP-Port', help: 'Nur im HTTP-Modus. Der Server lauscht auf 127.0.0.1.' },
        po_token_ttl_hours: { label: 'Token-Gültigkeit', help: 'Nach dieser Zeit wird ein neuer Token erzeugt.' },
        cookies_from_browser: { label: 'Cookies aus Browser', help: 'Meldet yt-dlp mit deinem Browser-Login an. Nur einschalten, wenn es ohne nicht mehr geht.' },
        proxy: { label: 'Proxy', help: 'Optional, z.B. socks5://127.0.0.1:1080. Leer = direkte Verbindung.', ph: 'kein Proxy' },
      },
      po: {
        active: 'PO-Token aktiv', inactive: 'PO-Token inaktiv', error: 'PO-Token-Fehler', mode: 'Modus',
        test: 'Testen', testing: 'Testet …', test_ok: 'Test erfolgreich.', test_fail: 'Test fehlgeschlagen.',
        unsaved: 'Der Test verwendet die gespeicherten Einstellungen. Änderungen zuerst speichern.',
      },
      cookies: {
        warn_off: '<b>Empfohlen: Aus.</b> PO-Token und Browser-Cookies kombiniert können Probleme machen.',
        warn_on: '<b>Notlösung aktiv.</b> PO-Token und Browser-Cookies kombiniert können zu Fehlern oder Sperren führen, und dein YouTube-Konto wird für die Abfragen verwendet. Sobald es ohne geht, wieder ausschalten. Cookies landen nie im Log.',
      },
      schedule: {
        in_app_check: { label: 'Prüfen, während die App läuft', help: 'Die Watchlist wird im eingestellten Intervall geprüft, solange das Fenster offen ist.' },
        watchlist_interval_hours: { label: 'Intervall', help: 'Abstand zwischen zwei Prüfungen in der App.' },
        entries_per_source: { label: 'Einträge pro Quelle', help: 'Wie viele neueste Einträge pro Prüfung flach abgefragt werden (Standard für neue Quellen).' },
        task_scheduler_enabled: { label: 'Aufgabenplanung verwenden', help: 'Prüft die Watchlist auch bei geschlossener App (headless). Wird durch «Aufgabe anlegen» eingeschaltet.' },
        task_time: { label: 'Uhrzeit', help: 'Tägliche Startzeit der geplanten Aufgabe.' },
      },
      task: {
        loading: 'Aufgabe wird abgefragt …',
        registered: 'Aufgabe registriert', registered_detail: '{name} · täglich {time} · nächster Lauf {next}',
        none: 'Keine Aufgabe registriert', none_detail: 'Legt in Windows eine tägliche Aufgabe um {time} an (schtasks).',
        create: 'Aufgabe anlegen', remove: 'Aufgabe entfernen',
      },
      appearance: {
        reduce_effects: { label: 'Effekte reduzieren', help: 'Schaltet Scanlines, Glitch und alle Animationen ab.' },
        scanlines: { label: 'Scanlines & Rauschen', help: 'Feines Overlay über der ganzen Oberfläche.' },
        pulse_bpm: { label: 'Kick-Puls', help: 'Takt, in dem der Fortschrittsbalken pulsiert.' },
      },
      pulse_preview: { label: 'Vorschau', help: 'So pulsiert ein laufender Download.', off: 'Effekte reduziert' },
      versions: { plugin: 'PO-Token-Plugin' },
      update: {
        label: 'yt-dlp & Plugin', help: 'YouTube ändert sich laufend. Bei Fehlern zuerst aktualisieren (pip im venv).',
        button: 'yt-dlp & Plugin aktualisieren', running: 'Aktualisiert …', last_check: 'Letzte Prüfung',
      },
      maintenance: {
        check_updates_on_start: { label: 'Beim Start nach Updates suchen', help: 'yt-dlp und PO-Token-Plugin, höchstens einmal pro Tag.' },
      },
      db: {
        label: 'Datenbank', help: 'Status aller Videos, Quellen und Läufe. Ein Backup kopiert die Datei in den Ordner «backups».',
        backup: 'DB-Backup erstellen', backing_up: 'Sichert …', open: 'Datenordner öffnen',
        info: '{n} Einträge · {mb} MB · letztes Backup {last}',
      },
      reset_all: { label: 'Alle Einstellungen', help: 'Setzt sämtliche Tabs auf die Standardwerte. Datenbank und Musikdateien bleiben unberührt.', button: 'Alles auf Standard' },
    },

    opt: {
      general: { log_level: { DEBUG: 'DEBUG', INFO: 'INFO', WARNING: 'WARNING', ERROR: 'ERROR' } },
      download: {
        audio_format: { mp3: 'MP3', original: 'Original (Opus/M4A, ohne Umwandlung)' },
        mp3_quality: { 320: '320 kbps CBR', v0: 'V0 VBR' },
      },
      network: { cookies_from_browser: { none: 'Aus', edge: 'Edge', chrome: 'Chrome', firefox: 'Firefox', brave: 'Brave' } },
    },

    dlg: {
      block: { title: 'Kanal blockieren', text: 'Videos von «{ch}» werden künftig nicht mehr angezeigt. Rückgängig unter Einstellungen › Filter & Keywords.', ok: 'Blockieren' },
      ignore_all: { title: 'Alle ignorieren', text: '{n} Treffer im Eingang als ignoriert markieren?' },
      del_source: { title: 'Quelle löschen', text: '«{name}» aus der Watchlist entfernen? Bereits geladene Mixes bleiben erhalten.' },
      del_mix: { title: 'Mix löschen', text: '«{title}» aus der Bibliothek entfernen?', ok: 'Eintrag + Datei löschen', warn: 'Die Audiodatei wird von der Festplatte gelöscht.' },
      backoff: {
        title: 'Backoff aufheben', ok: 'Trotzdem aufheben',
        text: 'Die Sperrzeit schützt dich: YouTube hat signalisiert, dass zu viele Anfragen kamen.',
        warn: '<b>Nur aufheben, wenn du sicher bist, dass die Sperre vorbei ist.</b> Greift die App zu früh wieder zu, kann YouTube deine IP länger oder dauerhaft einschränken.',
      },
      reset_all: { title: 'Alles auf Standard', text: 'Alle Einstellungen in allen Tabs werden sofort auf die Standardwerte gesetzt und gespeichert.', ok: 'Zurücksetzen' },
    },

    toast: {
      enqueued_one: '1 Mix zur Warteschlange hinzugefügt', enqueued: '{n} Mixes zur Warteschlange hinzugefügt',
      ignored: 'Ignoriert: {title}', unignored: 'Wieder sichtbar: {title}', ignored_n: '{n} Treffer ignoriert',
      opening: 'Öffnet YouTube im Browser …', watch_added: 'Zur Watchlist hinzugefügt: {ch}', blocked: 'Kanal blockiert: {ch}',
      genre_set: 'Genre gesetzt: {genre}',
      done: 'Geladen: {title}', failed: 'Fehlgeschlagen: {title} – {error}',
      wl_started: 'Watchlist wird geprüft ({n} Quellen, mit Throttle) …',
      wl_done: 'Watchlist geprüft: {n} Quellen, nichts Neues', wl_done_found: 'Watchlist geprüft: {found} neue Treffer',
      source_added: 'Quelle hinzugefügt: {name}', source_saved: 'Quelle gespeichert: {name}', source_deleted: 'Quelle gelöscht: {name}',
      retagged: 'Neu getaggt: {title}', deleted: 'Gelöscht: {title}',
      settings_saved: 'Einstellungen gespeichert', settings_error: '1 Eingabe ist ungültig', settings_errors: '{n} Eingaben sind ungültig',
      backoff_cleared: 'Backoff manuell aufgehoben',
      task_created: 'Aufgabe in der Windows-Aufgabenplanung angelegt', task_removed: 'Aufgabe entfernt',
      updated: 'Aktualisiert auf yt-dlp {v}', up_to_date: 'Bereits aktuell (yt-dlp {v})', update_failed: 'Aktualisierung fehlgeschlagen',
      backup_done: 'Backup erstellt: {path}', reset_all: 'Alle Einstellungen zurückgesetzt',
    },

    err: {
      generic: 'Unbekannter Fehler', bridge: 'Fehler bei «{name}»: {msg}', boot: 'Start fehlgeschlagen: {msg}',
    },
  };

  HC.i18n = { locale: 'de-CH', strings: DE };
  /** Text holen; fehlende Schlüssel fallen auf (Schlüssel wird angezeigt + Konsole). */
  HC.t = function (key, vars) {
    let s = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), DE);
    if (typeof s !== 'string') {
      console.error(`[i18n] fehlt: ${key}`);
      return key;
    }
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  };
})();
