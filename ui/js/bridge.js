/* =====================================================================
   bridge.js – einzige Verbindung zwischen UI und Python (app/api.py)

   Läuft die Seite in pywebview, gehen alle Aufrufe an window.pywebview.api.
   Fehlt pywebview (Browser, Screenshots), antwortet HC.mock (mock.js) mit
   denselben Methodennamen und Datenformen.

   Mock erzwingen:  index.html?mock=1
   app/main.py lädt index.html (User-Agent mit «HCLoader-App/») bzw. Tests ?host=pywebview: dann wird auf die echte API gewartet
   (pywebview injiziert sie erst nach dem Laden). Kommt sie innert LIVE_WAIT_MS nicht, gibt es
   KEINEN Mock, sondern den Zustand "error" (app.js zeigt «Verbindung zum Backend fehlgeschlagen»
   mit Neu-laden-Knopf); es wird weiter gewartet und bei später API sauber live gestartet.
   Methoden/Events mit Phase-Status: docs/bridge-api.md

   ---------------------------------------------------------------------
   AUFRUFE  UI -> Python        HC.bridge.call('name', ...args) -> Promise
   ---------------------------------------------------------------------
   Einstellungen
     get_settings()                     -> {values, defaults, language, open_view?}  (Struktur: docs/settings-schema.md;
                                           language = general.language aufgelöst, z.B. "de"; open_view (v0.9.0) =
                                           mit --open gewünschte Startansicht, nur beim ersten Aufruf)
     save_settings(values)              -> {ok:true, values, language} | {ok:false, errors:{"section.key": "Meldung"}}
                                           Meldungen kommen fertig übersetzt (aktive Sprache, docs/TRANSLATING.md)
                                           Genres: Schlüssel "genres.items" oder "genres.items.<index>.<feld>"
     reset_settings(section?)           -> {ok:true}                     (ohne Argument: alles)

   Status / Wartung
     get_status()                       -> Status (siehe unten)
     get_versions()                     -> {app, ytdlp, plugin, deno, ffmpeg, python, data_dir, app_dir, portable,
                                            db_path, db_entries, db_size_mb, last_backup, last_update_check,
                                            backups, restart_required}
                                             portable: bool  (portable.txt im App-Ordner -> Daten in <app_dir>\data)
                                             backups: [{name, path, size_mb, created (ISO)}]  neueste zuerst
                                             restart_required: bool  (yt-dlp aktualisiert, App noch nicht neu gestartet)
     update_ytdlp()                     -> {ok, ytdlp, plugin, changed, output, restart_required?} | {ok:false, error, output}
                                           Während des Aufrufs kommt jede pip-Zeile als "log"-Event: die UI zeigt
                                           sie live in der Konsole (Wartung); output dient nur als Ersatz, wenn
                                           keine Zeile ankam. restart_required -> Hinweis «Neustart nötig».
     backup_db()                        -> {ok:true, path} | {ok:false, error}      (es bleiben die 10 neuesten Backups)
     open_path(kind)                    -> {ok}       kind: "data" | "target" | "logs"
     pick_folder(current?)              -> {path} | null                 (nativer Ordnerdialog)
     test_po_token()                    -> {ok, state, detail, ms}       state: "active" | "inactive" | "error"
                                           Fehler: {ok:false, state:"error", detail, error, ms:0}
     clear_backoff(platform?)           -> {ok} | {ok:false, error}   platform: "youtube" | "soundcloud";
                                           ohne Argument: alle Plattformen (Phase 7a)
     get_task_status()                  -> {registered, name, next_run, time, error, path_mismatch, task_command}
                                           registered: true | false | null (= unbekannt, error sagt warum)
                                           path_mismatch: true = Aufgabe startet einen anderen App-Ordner (App
                                           verschoben) -> Hinweis + «Aufgabe neu anlegen» (create_task);
                                           task_command: eingetragene Befehlszeile oder null
     create_task(time)                  -> {ok, registered, name, next_run, time, path_mismatch, task_command} | {ok:false, error}
                                           setzt schedule.task_scheduler_enabled = true und schedule.task_time
     remove_task()                      -> {ok, registered:false}        setzt schedule.task_scheduler_enabled = false
     get_blacklist()                    -> [{channel_id, channel_name, added}]
     unblock_channel(channel_id)        -> {ok}

   App-Update (Selbst-Update von HCLoader über GitHub-Releases, docs/bridge-api.md)
     get_update_status()                -> UpdateStatus
     check_update()                     -> {ok, ...UpdateStatus} | {ok:false, error, ...UpdateStatus}
                                           manuell (Wartung); die automatische Prüfung beim Start läuft im Backend
     download_update()                  -> {ok, ...UpdateStatus} | {ok:false, error}   startet Download + Vorbereitung
                                           im Hintergrund (Events update / update_progress); erst nach Klick
     cancel_update()                    -> {ok, ...UpdateStatus}   Download abbrechen bzw. bereitgelegtes Update verwerfen
     apply_update_now()                 -> {ok} | {ok:false, error}   schliesst die App; der Updater spielt ein und
                                           startet neu (Downloads werden wie beim Beenden abgebrochen, bleiben in der Queue)
     get_release_notes()                -> {current, releases:[{version, date, notes}]}   aus der CHANGELOG.md der App
                                           (offline), neueste zuerst, ohne [Unreleased]; date "YYYY-MM-DD" | null
     open_url(url)                      -> {ok} | {ok:false, error}   Link im System-Browser; nur https:// auf github.com
                                           bzw. dem Host des Update-Repos. In der App leitet bridge.js jeden Klick auf
                                           <a target="_blank" href="https://…"> hierher um; im Mock bleibt target=_blank.

   Entdecken / Eingang
     get_last_search()                  -> {query, results:[Video]} | null   (ohne Netzwerk, aus DB)
                                           zusätzlich effective_query, genre, year, hidden_count (wie search);
                                           daraus zeigt die UI «Gesucht mit …» und den Hinweis «neu suchen»
     search(query, opts)                -> {ok:true, results:[Video], effective_query, query, genre, year,
                                            hidden_count} | {ok:false, error}
                                           opts = {genre: <Genre-Name>|null, year: <int>|null,
                                                   platform?: "youtube" (Standard) | "soundcloud"}
                                           Antwort zusätzlich platform. SoundCloud ausgeschaltet ->
                                           {ok:false, error}. Genre/Jahr werden auch bei SoundCloud angehängt.
                                           genre: genau ein aktiver Genre-Chip (sonst null); year: nur beim
                                           Upload-Zeitraum «Jahr». Das Backend hängt die Begriffe an
                                           (Genre-Suchbegriffe, Jahr bei search.append_year) und meldet den
                                           tatsächlich gesuchten Text als effective_query zurück.
     get_inbox()                        -> [Video]    Status "inbox"; mit source_id (siehe Video) für Quelle-Badge/-Filter
     enqueue(ids)                       -> {ok:true, ids:[übernommen], skipped?: n, skipped_unloadable?: n (Go+/Region)}
     set_video_status(id, status)       -> {ok}       status: "ignored" | "new"
     set_genre(id, genre)               -> {ok}
     open_video(id)                     -> {ok}       öffnet YouTube bzw. die SoundCloud-Trackseite (Video.url)
     add_channel_source(channel_id, channel_name) -> {ok, source} | {ok:false, error, source?}
                                           SoundCloud: channel_id "sc:<nutzer-id>" (aus Video.channel_id);
                                           die Profil-URL kennt das Backend aus gespeicherten Tracks.
                                           Name = channel_name, name_auto false.
     block_channel(channel_id, channel_name)      -> {ok}

   Watchlist
     get_sources()                      -> [Source]
     suggest_source(url_or_query, type_hint?) -> {type, platform, name, url_normalized}
                                           ohne Netzwerk, nur aus der URL (beim Tippen, entprellt).
                                           type: "channel"|"playlist"|"search"|"" ("" = nicht erkannt);
                                           name "" = kein guter Name aus der URL (z.B. /channel/UC…,
                                           Playlist) -> die erste Prüfung setzt den echten Namen.
                                           type_hint "search" -> Text = Suchbegriff = Name.
     save_source(source)                -> {ok, source} | {ok:false, errors:{feld: "Meldung"}}   (id fehlt = neu)
                                           Die UI schickt nur {id?, type, name, url_or_query, default_genre,
                                           enabled, auto_download, max_entries, newest_last, platform?, name_auto}
                                           (ohne last_checked/new_count). platform zählt nur bei type "search"
                                           (bei URLs erkennt das Backend die Plattform selbst).
                                           name_auto: true, wenn der Name der unveränderte Vorschlag
                                           (suggest_source) ist; die nächste Prüfung ersetzt ihn dann durch
                                           den echten Kanal-/Nutzer-/Playlist-Namen (Event "source" mit name).
                                           errors: Schlüssel = diese Feldnamen -> Meldung am Feld; andere
                                           Schlüssel und ein optionales error (Text) stehen oben im Dialog.
     delete_source(id)                  -> {ok} | {ok:false, error}
     check_sources(ids?)                -> {ok:true, started: n} | {ok:false, error}
                                           ids fehlt/null = alle aktiven Quellen. started = Anzahl Quellen, die
                                           geprüft werden (0 = keine aktive Quelle, dann kein Lauf und kein
                                           "watchlist_done"). {ok:false, error}: Backoff aktiv oder es läuft
                                           schon eine Prüfung -> Fehler-Toast. Fortschritt über die Events
                                           "source" / "watchlist_done"; die UI sperrt «Prüfen» bis "watchlist_done".
     estimate_backfill(id)              -> {ok, source_id, known_total|null, entries, cap, requests, seconds, per_hour,
                                           page_size, conservative, position, resume, reread, headless_ok}
                                           | {ok:false, error}; headless_ok:false = zu gross für einen
                                           geplanten Lauf (geht nur in der App weiter)
                                           v0.4.0 «Alles einlesen (einmalig)», ohne Netzwerk: geschätzte Anfragen
                                           und Dauer für den Bestätigungsdialog. known_total = bekannte Grösse
                                           (letzte Prüfung/früherer Versuch), sonst conservative:true und entries = cap.
                                           resume: es gibt einen Cursor (position) – die gelesenen Seiten werden
                                           erneut (schnell) durchlaufen. Suchquellen -> {ok:false, error}.
     start_backfill(id)                 -> {ok, backfill: Backfill} | {ok:false, error}
                                           startet bzw. setzt fort (pausiert/unterbrochen: ab dem Cursor; fertig/
                                           abgebrochen: von vorne). Läuft im Hintergrund, eins nach dem anderen;
                                           Fortschritt als Event "backfill". Abgelehnt: Suchquelle, SoundCloud aus,
                                           Backoff der Plattform, yt-dlp-Update, Neustart nötig.
     pause_backfill(id)                 -> {ok, backfill} | {ok:false, error}   hält vor der nächsten Anfrage an;
                                           bleibt pausiert bis start_backfill (kein automatisches Fortsetzen)
     cancel_backfill(id)                -> {ok, backfill} | {ok:false, error}   verwirft den Cursor (state
                                           "cancelled"); Treffer im Eingang bleiben

   Downloads
     get_queue()                        -> {paused, items:[QueueItem], blocked_code, blocked_reason, platform_blocked}
                                           platform_blocked (7a): {<platform>: {code, reason}} für Plattformen,
                                           deren wartende Einträge gerade gesperrt sind (Backoff, Limits),
                                           während die andere Plattform weiterlädt. blocked_code/-reason
                                           gelten nur, wenn ALLE wartenden Einträge stehen.
                                           blocked_code: "restart" | "backoff" | "day_limit" | "run_limit" |
                                           "busy" | "pot" | "target" | "error" | null – warum wartende
                                           Einträge gerade nicht laufen (pot/target/error = lokales
                                           Problem: PO-Token-Server, Zielordner, Download-Modul);
                                           blocked_reason: deutsche Meldung dazu (oder null). Fehlt
                                           blocked_code, leitet die UI den Grund aus Status.backoff /
                                           Status.counters und den Throttle-Limits ab.
                                           Nach "run_limit" startet set_queue_paused(false) einen neuen Lauf.
     set_queue_paused(paused)           -> {ok, paused}
     queue_move(id, delta)              -> {ok}       delta: -1 nach oben, +1 nach unten
     queue_cancel(id)                   -> {ok} | {ok:false, error:"Download bereits fertig"} (zu spät)
     queue_retry(id)                    -> {ok}

   Bibliothek
     get_library(filters?)              -> [LibraryItem]   neueste Downloads zuerst
                                           Item: missing = Datei fehlt; unknown = Zielordner nicht erreichbar (Zustand unbekannt, missing false).
     get_library_status()               -> {target_ok, target}   Ergebnis der Zielordner-Prüfung des letzten get_library (Timeout 3 s)
                                           filters = {search?, genre?, channel?, year?, missing?, platform?} (UND-verknüpft).
                                           Die UI ruft OHNE Filter auf und sucht/filtert/sortiert/gruppiert selbst
                                           (sofortige Reaktion; Auswahllisten und Kennzahlen brauchen ohnehin alles).
     open_folder(id)                    -> {ok} | {ok:false, error}      Explorer mit markierter Datei bzw. Ordner
     get_media(id)                      -> {ok:true, id, src, title, artist, genre, platform, duration, cover, chapters:[{start, title, performer}]}
                                           | {ok:false, error}   Phase 8, nur lokal. src/cover = prozentkodierte file:-URLs
                                           (nur für <audio>/<img>; Sonderzeichen wie # % [ ] sind kodiert, nicht umbauen).
                                           cover null ohne Bild; chapters (Sekunden, float) aus Sidecar > ID3 CHAP > .cue,
                                           sortiert, [] ohne Kapitel; duration Sekunden oder null.
                                           error: "Datei fehlt" | "Datei liegt ausserhalb des Zielordners" | "Eintrag ist nicht in der Bibliothek"
     play_external(id)                  -> {ok} | {ok:false, error}      öffnet die Datei im Standardplayer (gleiche Prüfungen)
     retag(id)                          -> {ok:true, path, moved, genre, cue, sidecar} | {ok:false, error}
                                           offline; schreibt Tags/Cover/CUE nach den aktuellen Einstellungen neu und
                                           verschiebt die Datei, wenn das Ablage-Muster einen anderen Pfad ergibt
                                           (moved:true, path = neuer Pfad -> Toast mit dem neuen Ort). Die UI
                                           übernimmt path, genre und cue in den Eintrag. Datei fehlt -> error.
     delete_library_item(id, delete_file?) -> {ok:true, deleted:[Dateinamen]} | {ok:false, error}
                                           delete_file fehlt/true: Datei + .cue löschen; der Eintrag wird "ignored"
                                           und nie wieder geladen (steht im Bestätigungsdialog, der den Pfad zeigt).
                                           Die UI schickt false bei Einträgen mit missing:true («Eintrag entfernen»).
                                           Datei ausserhalb des Zielordners / in Benutzung -> error (Fehler-Toast).

   Festivals & Serien (v0.3.0, offline; Vertrag + Beispiele: docs/bridge-api.md «Festivals & Serien»)
     get_series(include_hidden?)        -> [Series]   Katalog (mitgeliefert + eigene), count = Bibliothekseinträge
     save_series(series)                -> {ok, series: Series} | {ok:false, errors:{feld: "Meldung"}}  (id fehlt = neu)
     set_series_enabled(id, enabled)    -> {ok, series: Series} | {ok:false, error}   nur an/aus, kein «geändert»
     delete_series(id)                  -> {ok, hidden, cleared} | {ok:false, error}   mitgeliefert -> ausgeblendet
     reset_series(id?)                  -> {ok, series:[Series]} | {ok:false, error}   mitgelieferte wiederherstellen
     get_festival_options()             -> {kinds:[..], set_types:[{code, label}], stages:[..]}
     get_library_groups(by)             -> {ok, by, series:[SeriesGroup], unassigned, suggested, total}  (by "festival")
                                           | {ok, by, groups:[{key, count}]}  by: year|event_year|artist|genre|stage|set_type
     set_festival(id, data)             -> {ok, festival, festival_suggestion} | {ok:false, errors, error}
                                           data null = «kein Festival»; sonst {edition_id} oder {series_id, event_year?,
                                           variant?} + stage?, set_type?, episode?; setzt manual (Erkennung lässt es in Ruhe)
     reset_festival(id)                 -> {ok, outcome, festival, festival_suggestion}   zurück auf automatisch
     detect_festival(title, opts?)      -> {ok, detection: Detection|null, assigned}   Test, speichert nichts
     get_festival_status()              -> {series, assigned, suggested, unassigned, total, last_pass, running}
     assign_festivals(opts?)            -> {ok, started, scope} | {ok:false, error}   opts {scope:"library"|"all"};
                                           Fortschritt: Event "festival_assign"
     cancel_assign_festivals()          -> {ok, running}

   Tracklist-Suche (v0.6.0, offline; Vertrag + Beispiele: docs/bridge-api.md «Tracklist search»)
     search_tracks(query, opts?)        -> {ok, query, engine:"fts5"|"like", sets:[TrackSet], hits, truncated} | {ok:false, error}
                                           TrackSet = {id, title, artist, duration, thumbnail, genre, platform, upload_date,
                                           downloaded_at, hits:[Track], more}; neueste Downloads zuerst
     get_tracklist(id)                  -> {ok, video_id, source, extracted, tracks:[Track]} | {ok:false, error}
                                           Track = {position, start (s|null), artist, title, version, label, is_id}
     get_top_tracks(limit?)             -> {ok, tracks:[{key, artist, title, version, sets}]}   «Meistgespielt» (>= 2 Sets)
     get_tracklist_status()             -> {total, scanned, sets, tracks, last_pass, engine, running}
     build_tracklists(opts?)            -> {ok, started, scope} | {ok:false, error}   opts {scope:"new"|"all"} ("new" = nie gelesen/geändert, Alias "missing");
                                           Fortschritt: Event "tracklist_index"
     cancel_build_tracklists()          -> {ok, running}

   Lautheit, Wellenform, Player-Gedächtnis (v0.7.0, offline; Vertrag: docs/bridge-api.md «Loudness, waveform, player memory»)
     get_waveform(id)                   -> {ok, status:"ready", peaks:[0..255], duration} | {ok, status:"pending"}
                                           | {ok:false, status?:"unavailable", error}   pending: Event "waveform" folgt
     save_position(id, position, duration?) -> {ok, stored}   stored false = erste/letzte 30 s (Eintrag entfernt) oder resume off
     forget_position(id)                -> {ok}
     set_now_playing(id|null)           -> {ok}   im Player geladenes Set (Datei offen): wird nie getaggt, aufgeschobene
                                           ReplayGain-Tags folgen nach dem Freigeben (Review v0.7.0 M1)
     get_continue_listening(limit?)     -> {ok, items:[{id, position, duration, updated, title, artist, genre, platform}]}
     get_analysis_status()              -> {total, analysed, tagged, waveforms, failed, pending, last_pass, ffmpeg, running}
     analyse_library(opts?)             -> {ok, started, scope} | {ok, started:false, running:true} | {ok:false, error}
                                           opts {scope:"new"|"all"}; Fortschritt: Event "audio_analysis"
     cancel_analyse_library()           -> {ok, running}
     get_media(id) liefert zusätzlich: loudness {lufs, true_peak, gain, peak, source}|null, resume {position, duration,
                                           updated}|null, peaks [0..255]|null

   DJ-Seiten + Playlist-Export (v0.8.0, offline; Vertrag + Datenformen: docs/bridge-api.md «DJ pages, playlist export»)
     get_artists(opts?)                 -> {ok, artists:[ArtistSummary], hidden}   opts {search, sort:"sets"|"recent"|"name",
                                           hidden:true = nur ausgeblendete}; ArtistSummary = {key, name, initials, aliases,
                                           spellings, channel_url, edited, hidden, sets, b2b, seconds, festivals, years, last}
     get_artist(key)                    -> {ok, artist: ArtistSummary, sets:[LibraryItem + role "solo"|"b2b" + with:[Name]],
                                           tracks:[{artist, title, version, sets}]} | {ok:false, error}   key auch Alias
     save_artist(data)                  -> {ok, key} | {ok:false, errors:{name|aliases|channel_url: "Meldung"}, error}
                                           data {key?, name, aliases:[..], channel_url?}; Alias eines anderen gespeicherten
                                           Artists -> Fehler (zusammenführen); Alias eines abgeleiteten Artists = zusammenführen
     merge_artists(keys, into)          -> {ok, key} | {ok:false, errors, error}   Namen werden Aliasse von into
     split_artist(key, alias)           -> {ok, key, split} | {ok:false, errors, error}   Alias wieder eigener Artist
     hide_artist(key, hidden)           -> {ok, key, hidden} | {ok:false, errors, error}   «kein DJ» (aus der Liste)
     get_artist_watch(key)              -> {ok, source:{type:"channel"|"search", name, url_or_query, platform?},
                                           existing: Source|null}   speichert nichts; nach Bestätigung save_source(source)
     preview_playlist(spec)             -> {ok, spec, name, folder, relative, count, missing, seconds, saved: SavedPlaylist|null}
                                           | {ok:false, error}   spec {kind:"edition"|"series"|"genre"|"artist"|"filter"|
                                           "checklist"|"continue", edition_id|series_id|genre|key|filters+sort}
     export_playlist(spec, opts?)       -> {ok, path, count, skipped, absolute_fallback, relative, sync}
                                           | {ok:false, exists:true, path} (fragen, dann overwrite:true) | {ok:false, error}
                                           opts {name, folder, relative, overwrite, sync}
     get_saved_playlists()              -> {ok, playlists:[SavedPlaylist], sync_enabled}
                                           SavedPlaylist = {id, name, path, kind, relative, sync, count, updated, exists}
     set_playlist_sync(id, sync)        -> {ok} | {ok:false, error}
     forget_playlist(id)                -> {ok} | {ok:false, error}   nur aus der Liste, die Datei bleibt
     sync_playlists(ids?)               -> {ok, synced, failed, paths}   jetzt neu schreiben (ohne ids: alle mit sync)

   Statistik, Benachrichtigungen, Medienserver (v0.9.0; Vertrag + Datenformen: docs/bridge-api.md «Statistics,
   notifications, media server»)
     get_stats(opts?)                   -> {ok, range, totals, genres, festivals, years, djs, months, platforms, tracks,
                                            watchlist, measuring} | {ok:false, error}   offline aus der DB;
                                           opts {from?, to?} lokale Tage YYYY-MM-DD (inklusiv). Fehlende Dateigrössen
                                           (Bibliotheken vor v0.9.0) werden einmal im Hintergrund gemessen -> "stats_sizes"
     get_notification_status()          -> {ok, available, backend: "winrt"|"powershell"|"none", quiet_now, pending}
     test_notification()                -> {ok, backend} | {ok:false, error}   zeigt sofort eine Test-Benachrichtigung
     get_media_server_status()          -> {ok, type, has_secret:{plex, jellyfin}, persistent, last_scan|null, pending}
     test_media_server(data)            -> {ok, name, version, libraries:[{id, name, type, paths, music}], stored, persistent}
                                           | {ok:false, code, error}   data {type, url, secret?, verify_tls?} (Formularwerte,
                                           nicht gespeichert); ein eingetippter secret wird nach Erfolg in der Windows-
                                           Anmeldeinformationsverwaltung gespeichert, leer = gespeicherter
     forget_media_server_secret(kind?)  -> {ok} | {ok:false, error}   kind "plex" | "jellyfin" (Standard: eingestellter)
     scan_media_server()                -> {ok, server, files, requests, partial, at} | {ok:false, code, error}
                                           ganze Bibliothek jetzt einlesen (gespeicherte Einstellungen); auch Event "media_scan"

   Re-Uploads per Audio-Fingerabdruck (v0.10.0; Vertrag: docs/bridge-api.md «Re-upload detection»)
     get_reupload_status()              -> {ok?, total, fingerprinted, failed, pending, open, kept, linked, last_pass,
                                            ffmpeg, running, enabled}
     fingerprint_library(opts?)         -> {ok, started, scope} | {ok, started:false, running:true} | {ok:false, error}
                                           opts {scope:"new"|"all"}; offline, eine Datei nach der anderen, niedrige
                                           Priorität; Fortschritt: Event "fingerprint", Treffer: Event "reupload"
     cancel_fingerprint_library()       -> {ok, running}

   Automatischer Nachlauf (v0.10.1, offline; Vertrag: docs/bridge-api.md «Automatic catch-up passes»)
     get_catchup_status()               -> {ok, running: "festivals"|"tracklists"|"analysis"|"fingerprints"|null}
     cancel_catchup()                   -> {ok, cancelled}   stoppt den Nachlauf für diese Sitzung (nächster Start macht weiter)
     get_reuploads(opts?)               -> {ok, items:[{id, title, platform, channel, file_path, downloaded_at,
                                            reupload: Reupload}]}   opts {state:"open" (Standard) | "all"}
     resolve_reupload(id, action)       -> {ok, id, state, reupload} | {ok, id, removed, reupload:null} (adopt)
                                           | {ok:false, error, original?}
                                           action "keep" (beide behalten) | "link" (gleicher Mix, verknüpft) |
                                           "delete_new" (diese neuere Datei löschen, Eintrag -> ignored; nur wenn
                                           of.present = "ok") | "adopt" (Original fehlt: diese Kopie ersetzt es;
                                           nur wenn of.present = "missing"|"gone") | "open" (rückgängig)

   Festival-Sammler (v0.5.0; Vertrag, Datenformen, Events: docs/bridge-api.md «Festival collector»)
     get_collector_editions()           -> [CollectorEdition]   Ausgaben mit Checkliste (offline)
     open_collector_edition(data)       -> {ok, edition: CollectorEdition} | {ok:false, errors, error}
                                           data {edition_id} | {series_id, year, variant?}
     delete_checklist(edition_id)       -> {ok, deleted} | {ok:false, errors, error}   Videos/Dateien bleiben
     get_checklist(edition_id)          -> {ok, edition: CollectorEdition, rows:[ChecklistRow]} | {ok:false, error}
     parse_timetable(text)              -> {ok, rows:[TimetableRow], skipped:[Zeile], days, stages, csv}  Vorschau
     import_timetable(edition_id, data) -> {ok, added, merged, invalid, skipped, ids, matched} | {ok:false, errors, error}
                                           data = Text oder [TimetableRow] (bearbeitete Vorschau)
     get_timetable_files()              -> [TimetableFile]   mitgelieferte Dateien (app/data/timetables)
     import_timetable_file(file)        -> {ok, edition_id, added, merged, invalid, ids, matched} | {ok:false, errors, error}
     import_checklist_playlist(edition_id, url) -> {ok, started, url} | {ok, started:false, running:true}
                                           | {ok:false, error|errors}   Fortschritt: Event "collector_import"
     add_checklist_row(edition_id, row) -> {ok, row: ChecklistRow} | {ok:false, errors, error}
     update_checklist_row(id, row)      -> {ok, row: ChecklistRow, retag} | {ok:false, errors, error}
     delete_checklist_rows(ids)         -> {ok, deleted}
     set_checklist_checked(ids, checked)-> {ok, changed}      «Alle/keine» = alle ids
     set_checklist_ignored(ids, ignored)-> {ok, changed}
     confirm_checklist_match(id, video_id?, reject?) -> {ok, row} | {ok:false, errors, error}
                                           video_id = Treffer/Kandidat bestätigen; null = Treffer verwerfen
     estimate_checklist_matching(edition_id, opts?) -> {ok, edition_id, rows, requests, per_hour, seconds,
                                           searches_left_hour, available_at, backoff_until, matched_offline, resume}
     start_checklist_matching(edition_id, opts?) -> {ok, job: CollectorJob, nothing?} | {ok:false, error}
                                           opts {restart?}; Fortschritt: Events "collector_job", "collector_rows"
     cancel_checklist_matching(edition_id) -> {ok, job}
     queue_checklist(edition_id, ids?)  -> {ok, queued:[video_id], retag, skipped:{unchecked, unconfirmed, missing, other}}

   Protokoll
     get_log(filters?)                  -> {lines:[LogLine], runs:[Run]}
                                           filters = {level?, levels?, search?, limit?, kind?, runs_limit?}.
                                           Die UI ruft OHNE Filter auf (Backlog 500 Zeilen, 50 Läufe) und filtert
                                           Stufen, Suche und Lauf-Art selbst. Läufe mit finished:null laufen noch.

   ---------------------------------------------------------------------
   DATENFORMEN
   ---------------------------------------------------------------------
     Video       {id, title, channel_id, channel_name, duration (s), upload_date "YYYY-MM-DD"|"YYYYMMDD"|null,
                  date_approx (bool, optional: Datum aus der flachen Suche, nur ungefähr),
                  filter_reason (nur Suchtreffer: Grund laut gespeicherten Filtern oder ""; die UI filtert
                  selbst live und wertet den Text nicht aus), is_live (bool: Livestream, nur bei
                  Suchtreffern true, sonst false),
                  view_count, thumbnail (URL|null – geladen wird nur https://*.ytimg.com), genre, genre_manual,
                  status: "new"|"inbox"|"queued"|"downloading"|"done"|"ignored"|"failed",
                  source_id (int|null, optional: Watchlist-Quelle, über die das Video gefunden wurde = Source.id;
                  die UI zeigt damit im Eingang das Quelle-Badge und den Filter pro Quelle. Fehlt das Feld oder
                  gibt es die Quelle nicht mehr: kein Badge, Gruppe «Ohne Quelle»),
                  platform: "youtube"|"soundcloud" (7a; id bei SoundCloud "sc:<zahl>", channel_id "sc:<zahl>"),
                  url (Seite des Videos/Tracks|null), preview (bool: SoundCloud-Go+-Vorschau, nie ladbar,
                  filter_reason «Nur Vorschau (Go+)»), geo_blocked (bool: SoundCloud-Track in dieser Region
                  gesperrt, filter_reason «Nicht verfügbar (Region)»), duplicate_of ({id, platform, title}|null, nur Suchtreffer
                  und Eingang: vermutlich schon von der anderen Plattform geladen/eingereiht – Hinweis
                  «Vermutlich bereits geladen (YouTube)»; ausgeblendet nur mit filters.hide_cross_platform_duplicates).
                  Thumbnails von SoundCloud: https://*.sndcdn.com}
     Source      {id, type: "channel"|"playlist"|"search", name, url_or_query, default_genre|null,
                  enabled, auto_download, max_entries (int|null), newest_last (bool), last_checked (ISO|null), new_count,
                  platform: "youtube"|"soundcloud", name_auto (bool), item_count (int|null), backfill (Backfill|null)}
                  item_count (v0.4.0): Grösse der Liste laut letzter Prüfung (yt-dlp playlist_count), null = unbekannt.
                  SoundCloud: channel = soundcloud.com/<nutzer> oder …/tracks, playlist = …/<nutzer>/sets/<set>.
                  max_entries: null (Feld im Dialog leer) = Standard schedule.entries_per_source zum Zeitpunkt der
                  Prüfung; die Liste zeigt dann «30 (Standard)», das Feld den Standard als Platzhalter. Obergrenze
                  200, bei Suchquellen 100. Kanal-URL: nur Kanal-Root, /videos oder /streams (andere Tabs -> Fehler).
                  newest_last: nur bei type "playlist" – neue Videos stehen hinten, die Playlist wird von hinten
                  gelesen. Die UI schickt bei Kanal/Suche immer false und wählt es bei neuen Playlists nicht vor.
                  new_count = Treffer dieser Quelle, die noch im Eingang liegen (Status "inbox")
     Backfill    {source_id, state: "pending"|"running"|"paused"|"done"|"cancelled", position, total (int|null),
                  target (min(total, cap)|null), cap, added, found, requests, note|null, started, updated, finished|null}
                  v0.4.0 «Alles einlesen (einmalig)». position = gelesene Einträge (Cursor), added = davon im Eingang,
                  found = neu gespeicherte Videos. pending = wartet bzw. unterbrochen (Backoff, App beendet, Fehler –
                  note sagt warum), setzt automatisch fort (App-Start, nach einer Prüfung, Headless-Lauf);
                  paused = vom User angehalten (oder nach 3 Fehlern in Folge). Anzeige «Liest ein … 240 / ~500»
                  (target bekannt) bzw. «240 / max. 2000»; fertig: Datum (finished) + added.
     QueueItem   {id, video: Video, state: "waiting"|"active"|"failed",
                  phase: "waiting"|"sleep"|"download"|"convert"|"tag",
                  pct (0–100), speed (MB/s), eta (s), error|null, target (relativer Ordner)}
                  phase "sleep" = Throttle-Pause vor diesem Eintrag (state bleibt "waiting"),
                  eta = Restsekunden der Pause; optional sleep_total (s) für den Balken.
     LibraryItem {id, title, artist, channel_id, genre, duration (s|null), upload_date, year, downloaded_at (ISO),
                  file_path, size_mb, missing, has_cue, platform, genre_manual, thumbnail}
                  artist = Kanalname (Spalte/Filter «Kanal»); file_path absolut; missing:true = Datei nicht mehr
                  am Ort (size_mb 0) -> «Datei fehlt»: kein Abspielen/Neu-Taggen, nur «Eintrag entfernen» und «Ordner öffnen».
                  has_cue -> kleines «CUE»-Kennzeichen. thumbnail (URL|null): Cover in Liste und Kacheln, geladen nur
                  von https://*.ytimg.com / https://*.sndcdn.com, sonst Platzhalter aus id + Genre-Farbe.
                  genre_manual -> Punkt am Genre-Badge («manuell gesetzt»). Klick auf das Badge: set_genre(id, genre),
                  danach retag(id) (verschiebt die Datei in den Ordner des Genres); bei missing/unknown nur set_genre.
                  ▶: player.mode "internal" -> get_media(id) + Mini-Player (js/player.js), "external" -> play_external(id).
                  v0.3.0: festival (Festival|null), festival_suggestion (Festival ohne manual|null).
                  v0.10.0: reupload (Reupload|null) – «Vermutlich Re-Upload von X»; Filter get_library({reupload:true})
                  = nur offene Markierungen.
     Reupload    {of: {id, title, platform, channel, in_library, present}, score (0..1), offset_s, state: "open"|"kept"|"linked"}
                 present: "ok" (Datei da + lesbar) | "missing" (Eintrag da, Datei fehlt) | "gone" (nicht mehr in der
                 Bibliothek) | "unknown" (Zielordner nicht erreichbar)
                  Festival-Badge (js/festivals.js): Klick -> Formular -> set_festival(id, data), danach retag(id)
                  (bei missing/unknown nur set_festival). Vorschlag: gestrichelt, «Übernehmen» = set_festival
                  mit {edition_id, stage, set_type, episode}. Die Bibliothek gruppiert selbst aus `festival`
                  (get_library_groups braucht sie nicht); die Serienliste pflegt der Tab «Festivals & Serien».
     Festival    {edition_id, series_id, series_key, series, kind, event_year (int|null), variant, edition, festival,
                  stage|null, set_type (Code)|null, episode|null, manual, confidence (0–1|null)}
     Series      {id, key, name, kind: "festival"|"radio"|"podcast", aliases, weak_aliases, channels,
                  variants:[{name, aliases}], default_genre|null, builtin, user_modified, enabled, count}
     UpdateStatus {current, latest, available, state, notes, url, progress, error, checked, portable, git_checkout,
                  installed, blocked, apply_on_exit}
                  installed = Kopie aus dem Setup (mitgeliefertes Python, Daten in %APPDATA%\HCLoader)
                  state: "idle"|"checking"|"downloading"|"ready"|"applying"|"error"; available = latest > current;
                  notes = Änderungen (Markdown, nie ungeprüft ins DOM: HC.md.render); progress = {phase, pct, bytes, total} | null;
                  optional (Backend liefert sie noch nicht, UI nutzt sie, sobald vorhanden):
                    published = ISO-Datum des neuesten Releases;
                    releases = [{version, published, notes, url}] alle Versionen > current, neueste zuerst
                               (übersprungene Versionen im Notizen-Dialog); fehlt es, zeigt der Dialog nur `notes`;
                  blocked = Text, warum sich diese Installation nicht selbst aktualisiert (Git-Checkout, kein Windows) | null;
                  apply_on_exit = Setting maintenance.apply_update_on_exit
     LogLine     {ts (ISO), level: "debug"|"info"|"ok"|"warn"|"error", msg}
                  "ok" zählt im Filter zur Stufe Info; "debug" ist in der UI standardmässig ausgeblendet.
     Run         {id, kind: "watchlist"|"headless"|"manual", started (ISO), finished (ISO|null),
                  duration (s|null), found, downloaded, errors, note}
                  duration fehlt -> die UI rechnet finished - started. note mit «Backoff»/«429» -> Kennzeichen
                  BACKOFF. Farbe: Fehler ohne Ergebnis rot, Fehler oder Notiz gelb, sonst grün, laufend blau.
     Status      {app_version, ytdlp_version, plugin_version, deno_ok, deno_version, ffmpeg_ok, ffmpeg_version,
                  po_token: {state: "active"|"inactive"|"error", mode: "off"|"script"|"http", detail},
                  backoff: {active, until (ISO|null), level, remaining_s},
                  next_check (ISO|null), queue_length, queue_paused, inbox_count,
                  counters: {downloads_run, downloads_day, searches_hour},
                  platforms: {youtube: P, soundcloud: P, mixcloud: P, hearthis: P}}   (7a, v0.10.0; backoff/counters oben = YouTube)
                  P = {enabled, backoff: {active, until, level, remaining_s, reason},
                       counters: {downloads_run, downloads_day, searches_hour},
                       limits: {downloads_run, downloads_day, searches_hour}}
                  next_check = der frühere Termin von In-App-Intervall und Windows-Aufgabe (null = beides aus
                  bzw. noch nichts geplant). Woher er stammt («App»/«Aufgabe»), leitet die UI aus
                  schedule.in_app_check / task_scheduler_enabled / task_time ab (HC.schedule in app.js).
                  inbox_count treibt das Badge in der Navigation: nach jeder Änderung am Eingang (Prüfung,
                  enqueue, set_video_status) ein "status"-Event schicken.

   ---------------------------------------------------------------------
   EVENTS  Python -> UI         window.mv.emit('typ', daten)   (worker.py via evaluate_js)
   ---------------------------------------------------------------------
     progress        {id, phase, pct, speed, eta}      laufender Download (ca. 2×/s)
                     phase: "sleep"|"download"|"convert"|"tag". "sleep" kommt einmal zu Beginn der Pause
                     ({pct:0, speed:0, eta:<s>, sleep_total:<s>}, id = nächster Eintrag); die UI zählt selbst
                     herunter. Bei "convert"/"tag": pct 100, eta 0.
     Wartungs-Aufrufe können sofort {ok:false, error:"Wartung läuft gerade …"} liefern -> Fehler-Toast.
     done            {id, title}                       Download fertig getaggt und verschoben
     failed          {id, title, error}                Download fehlgeschlagen
     queue           {}                                Warteschlange hat sich geändert -> UI ruft get_queue()
     video           {id, status, genre}               Status/Genre eines Videos geändert (auch "downloading")
                     v0.3.0 nach set_festival/reset_festival zusätzlich festival, festival_suggestion
     status          Status                            Statusleiste (Backoff, Zähler, PO-Token, nächste Prüfung …)
     log             LogLine                           neue Protokollzeile (Live-Log)
     run             Run                               ein Lauf ist zu Ende (GUI-Watchlist-Prüfung, Download-Lauf der
                     Warteschlange). Die UI fügt ihn in die Lauf-Historie ein bzw. ersetzt den laufenden Eintrag
                     gleicher id. Headless-Läufe (anderer Prozess) erscheinen beim nächsten get_log().
     source          {id, checking, name?, last_checked?, new_count?, error?}   Watchlist-Quelle wird/wurde geprüft
                     name (7a): aktueller Name nach der Prüfung (bei name_auto ggf. ersetzt) -> übernehmen.
                     Start: {id, checking:true}. Ende: {id, checking:false, last_checked, new_count} oder bei
                     Fehler {id, checking:false, error:"Meldung"} – die UI zeigt die Meldung an der Quelle, bis
                     sie wieder geprüft wird (nur im Speicher der UI, Source kennt kein Fehlerfeld).
     backfill        Backfill | {source_id, state:"none"}   v0.4.0 «Alles einlesen»: Zustand/Fortschritt einer Quelle
                     (nach jeder Seite, bei Start, Pause, Abbruch, Ende). Die UI zeichnet die Zeile neu und meldet «fertig».
     watchlist_done  {checked, found, inbox}           Watchlist-Lauf beendet (auch bei Abbruch, z.B. Backoff);
                     inbox (v0.9.0) = neu im Eingang
                     checked = geprüfte Quellen, found = neue Treffer insgesamt (Eingang + automatisch geladen).
                     Gilt für jeden Lauf (von Hand, In-App-Intervall); die UI gibt danach «Prüfen» wieder frei,
                     lädt Quellen und Eingang neu und zeigt eine Zusammenfassung als Toast.
     update          UpdateStatus                      Zustand des App-Updates hat sich geändert (Prüfung, Download, bereit …)
     update_progress {phase, pct, bytes, total}        Download/Vorbereitung (ca. 4×/s); phase: "download"|"verify"|"prepare";
                     pct null = Grösse unbekannt (GitHub liefert Quell-ZIPs ohne Länge)
     collector_rows  {edition_id, rows:[ChecklistRow], deleted:[id], reload, stats}   v0.5.0 Checkliste geändert
                     (reload:true = ganze Checkliste per get_checklist neu holen)
     collector_job   CollectorJob + {stats} | {edition_id, state:"none", stats}   v0.5.0 Fortschritt der Suche
     collector_import {phase, kind:"playlist", edition_id, entries, added, merged, unchecked, requests, cancelled, error}
                     phase: "start"|"progress"|"done"|"error" (v0.5.0, Playlist des Veranstalters)
     festival_assign {phase, scope, done?, total?, assigned?, suggested?, none?, manual?, unchanged?, cancelled?}
                     phase: "start"|"progress"|"done"|"error" (v0.3.0, «Festivals zuordnen»)
     tracklist_index {phase, scope, done?, total?, sets?, tracks?, cancelled?, error?}
                     phase: "start"|"progress"|"done"|"error" (v0.6.0, «Tracklisten einlesen»)
     audio_analysis  {phase, scope, done?, total?, analysed?, failed?, cancelled?, error?}
                     phase: "start"|"progress"|"done"|"error" (v0.7.0, «Lautheit & Wellenform analysieren»)
     media_analysed  {id, ok, loudness?, peaks, tagged, error?}   v0.7.0 eine Datei analysiert (nach Download/Durchlauf)
     waveform        {id, ok, peaks?, duration?, loudness?, error?}   v0.7.0 angeforderte Wellenform ist fertig
     fingerprint     {phase, scope, done?, total?, found?, failed?, cancelled?, error?}
                     phase: "start"|"progress"|"done"|"error" (v0.10.0, «Bibliothek abgleichen»)
                     v0.10.1: festival_assign, tracklist_index, audio_analysis, fingerprint tragen auto:true, wenn
                     der automatische Nachlauf sie gestartet hat (UI: dezent in der Statusleiste, kein Toast)
     auto_pass       {phase:"step", step} | {phase:"end", cancelled}   v0.10.1 automatischer Nachlauf beim GUI-Start
     reupload        {id, reupload: Reupload|null, deleted?, adopted?, pass?}   v0.10.0 Markierung neu/geändert/aufgelöst
                     (pass: true = Treffer des Bibliotheks-Abgleichs, die UI zeigt dafür keinen Toast)
     playlists_synced {synced, failed}                 v0.8.0 gespeicherte Playlists nach Downloads neu geschrieben
     stats_sizes     {phase: "progress"|"done", done, total, missing?}   v0.9.0 Dateigrössen werden gemessen
     media_scan      {ok, server, files, requests?, partial?, at, error?, code?}   v0.9.0 Plex/Jellyfin-Scan ausgelöst
     navigate        {view}                            v0.9.0 zweiter Start mit --open / Klick auf Windows-Benachrichtigung
     toast           {msg, kind?}                      kind: "ok"|"info"|"warn"|"err"

   UI-seitig abonnieren:  HC.bridge.on('progress', fn)
   ===================================================================== */
(function () {
  'use strict';
  const HC = (window.HC = window.HC || {});
  const handlers = {};
  const WAIT_MS = 1200; // Browser ohne pywebview: so lange warten, bevor der Mock einspringt
  const LIVE_WAIT_MS = 30000; // in pywebview (?host=pywebview): Geduld beim langsamen Start
  const LATE_POLL_MS = 500; // nach dem Timeout weiter prüfen, ob die API doch noch kommt

  /* "Live" erst, wenn die API-Funktionen wirklich da sind (pywebview legt api:{} früher an). */
  const hasApi = () => !!(window.pywebview && window.pywebview.api && typeof window.pywebview.api.get_settings === 'function');
  const forceMock = /[?&]mock(=1|&|$)/.test(location.search);
  /* In der App: Kennung im User-Agent (app/main.py USER_AGENT); ?host=pywebview bleibt für Tests. */
  const hosted = /[?&]host=pywebview(&|$)/.test(location.search) || /\bHCLoader-App\//.test(navigator.userAgent);

  const bridge = (HC.bridge = {
    live: false,
    /** true: in pywebview gestartet, aber die API kam nicht – kein Mock, alle Aufrufe schlagen fehl. */
    failed: false,
    hosted,
    pending: 0,

    /** Wartet auf pywebview bzw. entscheidet sich für den Mock. -> "live" | "mock" | "error" */
    ready() {
      if (bridge._ready) return bridge._ready;
      bridge._ready = new Promise((resolve) => {
        const go = (mode) => { bridge.live = mode === 'live'; bridge.failed = mode === 'error'; bridge._resolved = true; resolve(mode); };
        if (forceMock) return go('mock');
        if (hasApi()) return go('live');
        let done = false;
        const finish = (live) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          clearInterval(poll);
          if (live) return go('live');
          if (!hosted) return go('mock');
          /* Echte App ohne Backend: nie still in den Mock fallen (Einstellungen gingen verloren). */
          go('error');
          const late = setInterval(() => { if (bridge.live) clearInterval(late); else if (hasApi()) { clearInterval(late); goLive(); } }, LATE_POLL_MS);
        };
        const timer = setTimeout(() => finish(hasApi()), hosted ? LIVE_WAIT_MS : WAIT_MS);
        const poll = setInterval(() => { if (hasApi()) finish(true); }, 100);
        window.addEventListener('pywebviewready', () => finish(true), { once: true });
      });
      return bridge._ready;
    },

    /** Roh-Aufruf; wirft bei Fehlern. */
    async call(name, ...args) {
      bridge.pending++;
      try {
        if (bridge.failed) throw new Error(HC.t ? HC.t('err.no_backend') : 'no backend');
        if (bridge.live) {
          const fn = window.pywebview.api[name];
          if (typeof fn !== 'function') throw new Error(`api.${name} missing`);
          return await fn(...args);
        }
        if (!HC.mock || typeof HC.mock.api[name] !== 'function') throw new Error(`mock.${name} missing`);
        return await HC.mock.api[name](...args);
      } finally {
        bridge.pending--;
      }
    },

    /** Aufruf mit Fehler-Toast; liefert bei Fehlern null. */
    async safe(name, ...args) {
      try {
        return await bridge.call(name, ...args);
      } catch (err) {
        console.error(`[bridge] ${name}:`, err);
        if (HC.ui && HC.ui.toast) HC.ui.toast(HC.t('err.bridge', { name, msg: (err && err.message) || err }), 'err');
        return null;
      }
    },

    on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); return fn; },
    off(type, fn) { handlers[type] = (handlers[type] || []).filter((f) => f !== fn); },
    emit(type, data) {
      (handlers[type] || []).slice().forEach((fn) => {
        try { fn(data || {}); } catch (err) { console.error(`[event] ${type}:`, err); }
      });
    },
  });

  /* Externe Links (<a target="_blank">, z. B. Release-Notizen): WebView2 öffnet sie nicht bzw. in einem
     App-Fenster. Live gehen sie über open_url an den System-Browser (Backend prüft Schema und Host);
     im Mock/Browser bleibt das normale target=_blank. */
  bridge.openUrl = async (url) => {
    const r = await bridge.safe('open_url', url);
    if (r && r.ok === false && r.error && HC.ui && HC.ui.toast) HC.ui.toast(r.error, 'err');
    return r;
  };
  document.addEventListener('click', (ev) => {
    if (!bridge.live || ev.defaultPrevented || ev.button !== 0) return;
    const a = ev.target && ev.target.closest ? ev.target.closest('a[target="_blank"][href]') : null;
    if (!a) return;
    ev.preventDefault();
    if (/^https:\/\//i.test(a.href)) bridge.openUrl(a.href);
  });

  /* Python -> UI. Der Name "mv" ist Teil des Vertrags mit worker.py. */
  window.mv = { emit: (type, data) => bridge.emit(type, data) };

  /* Kommt pywebview erst nach dem Mock-Fallback bzw. nach dem Fehlerzustand, wird sauber neu gestartet. */
  function goLive() {
    if (!bridge._resolved || bridge.live || forceMock) return;
    bridge.live = true;
    bridge.failed = false;
    if (HC.mock) HC.mock.sim.stop();
    if (HC.app) HC.app.reload();
  }
  window.addEventListener('pywebviewready', goLive);
})();
