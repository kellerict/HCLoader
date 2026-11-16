/* =====================================================================
   bridge.js – einzige Verbindung zwischen UI und Python (app/api.py)

   Läuft die Seite in pywebview, gehen alle Aufrufe an window.pywebview.api.
   Fehlt pywebview (Browser, Screenshots), antwortet HC.mock (mock.js) mit
   denselben Methodennamen und Datenformen.

   Mock erzwingen:  index.html?mock=1
   app/main.py lädt index.html?host=pywebview: dann wird auf die echte API gewartet
   (pywebview injiziert sie erst nach dem Laden). Kommt sie innert LIVE_WAIT_MS nicht, gibt es
   KEINEN Mock, sondern den Zustand "error" (app.js zeigt «Verbindung zum Backend fehlgeschlagen»
   mit Neu-laden-Knopf); es wird weiter gewartet und bei später API sauber live gestartet.
   Methoden/Events mit Phase-Status: docs/bridge-api.md

   ---------------------------------------------------------------------
   AUFRUFE  UI -> Python        HC.bridge.call('name', ...args) -> Promise
   ---------------------------------------------------------------------
   Einstellungen
     get_settings()                     -> {values, defaults}            (Struktur: docs/settings-schema.md)
     save_settings(values)              -> {ok:true} | {ok:false, errors:{"section.key": "Meldung"}}
                                           Genres: Schlüssel "genres.items" oder "genres.items.<index>.<feld>"
     reset_settings(section?)           -> {ok:true}                     (ohne Argument: alles)

   Status / Wartung
     get_status()                       -> Status (siehe unten)
     get_versions()                     -> {app, ytdlp, plugin, deno, ffmpeg, python, data_dir, db_path,
                                            db_entries, db_size_mb, last_backup, last_update_check}
     update_ytdlp()                     -> {ok, ytdlp, plugin, changed, output, restart_required?} | {ok:false, error, output}
     backup_db()                        -> {ok:true, path} | {ok:false, error}
     open_path(kind)                    -> {ok}       kind: "data" | "target" | "logs"
     pick_folder(current?)              -> {path} | null                 (nativer Ordnerdialog)
     test_po_token()                    -> {ok, state, detail, ms}       state: "active" | "inactive" | "error"
                                           Fehler: {ok:false, state:"error", detail, error, ms:0}
     clear_backoff()                    -> {ok}
     get_task_status()                  -> {registered, name, next_run, time, error}
                                           registered: true | false | null (= unbekannt, error sagt warum)
     create_task(time)                  -> {ok, registered, name, next_run, time} | {ok:false, error}
                                           setzt schedule.task_scheduler_enabled = true und schedule.task_time
     remove_task()                      -> {ok, registered:false}        setzt schedule.task_scheduler_enabled = false
     get_blacklist()                    -> [{channel_id, channel_name, added}]
     unblock_channel(channel_id)        -> {ok}

   Entdecken / Eingang
     get_last_search()                  -> {query, results:[Video]} | null   (ohne Netzwerk, aus DB)
                                           zusätzlich effective_query, genre, year, hidden_count (wie search);
                                           daraus zeigt die UI «Gesucht mit …» und den Hinweis «neu suchen»
     search(query, opts)                -> {ok:true, results:[Video], effective_query, query, genre, year,
                                            hidden_count} | {ok:false, error}
                                           opts = {genre: <Genre-Name>|null, year: <int>|null}
                                           genre: genau ein aktiver Genre-Chip (sonst null); year: nur beim
                                           Upload-Zeitraum «Jahr». Das Backend hängt die Begriffe an
                                           (Genre-Suchbegriffe, Jahr bei search.append_year) und meldet den
                                           tatsächlich gesuchten Text als effective_query zurück.
     get_inbox()                        -> [Video]
     enqueue(ids)                       -> {ok:true, ids:[übernommen], skipped?: n}
     set_video_status(id, status)       -> {ok}       status: "ignored" | "new"
     set_genre(id, genre)               -> {ok}
     open_video(id)                     -> {ok}       öffnet YouTube im Standardbrowser
     add_channel_source(channel_id, channel_name) -> {ok, source} | {ok:false, error, source?}
     block_channel(channel_id, channel_name)      -> {ok}

   Watchlist
     get_sources()                      -> [Source]
     save_source(source)                -> {ok, source} | {ok:false, errors:{feld: "Meldung"}}   (id fehlt = neu)
     delete_source(id)                  -> {ok}
     check_sources(ids?)                -> {ok, started}   Fortschritt über Events "source" / "watchlist_done"

   Downloads
     get_queue()                        -> {paused, items:[QueueItem], blocked_code, blocked_reason}
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
     get_library()                      -> [LibraryItem]
     open_folder(id)                    -> {ok}
     retag(id)                          -> {ok}
     delete_library_item(id)            -> {ok}       löscht Eintrag + Datei

   Protokoll
     get_log()                          -> {lines:[LogLine], runs:[Run]}

   ---------------------------------------------------------------------
   DATENFORMEN
   ---------------------------------------------------------------------
     Video       {id, title, channel_id, channel_name, duration (s), upload_date "YYYY-MM-DD"|"YYYYMMDD"|null,
                  date_approx (bool, optional: Datum aus der flachen Suche, nur ungefähr),
                  filter_reason (nur Suchtreffer: Grund laut gespeicherten Filtern oder ""; die UI filtert
                  selbst live und wertet den Text nicht aus), is_live (bool: Livestream, nur bei
                  Suchtreffern true, sonst false),
                  view_count, thumbnail (URL|null – geladen wird nur https://*.ytimg.com), genre, genre_manual,
                  status: "new"|"inbox"|"queued"|"downloading"|"done"|"ignored"|"failed"}
     Source      {id, type: "channel"|"playlist"|"search", name, url_or_query, default_genre|null,
                  enabled, auto_download, max_entries, last_checked (ISO|null), new_count}
     QueueItem   {id, video: Video, state: "waiting"|"active"|"failed",
                  phase: "waiting"|"sleep"|"download"|"convert"|"tag",
                  pct (0–100), speed (MB/s), eta (s), error|null, target (relativer Ordner)}
                  phase "sleep" = Throttle-Pause vor diesem Eintrag (state bleibt "waiting"),
                  eta = Restsekunden der Pause; optional sleep_total (s) für den Balken.
     LibraryItem {id, title, artist, genre, duration (s), upload_date, downloaded_at (ISO), file_path, size_mb}
     LogLine     {ts (ISO), level: "debug"|"info"|"ok"|"warn"|"error", msg}
     Run         {id, kind: "watchlist"|"headless"|"manual", started (ISO), finished (ISO|null),
                  found, downloaded, errors, note}
     Status      {app_version, ytdlp_version, plugin_version, deno_ok, deno_version, ffmpeg_ok, ffmpeg_version,
                  po_token: {state: "active"|"inactive"|"error", mode: "off"|"script"|"http", detail},
                  backoff: {active, until (ISO|null), level, remaining_s},
                  next_check (ISO|null), queue_length, queue_paused, inbox_count,
                  counters: {downloads_run, downloads_day, searches_hour}}

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
     status          Status                            Statusleiste (Backoff, Zähler, PO-Token, nächste Prüfung …)
     log             LogLine                           neue Protokollzeile (Live-Log)
     source          {id, checking, last_checked?, new_count?, error?}   Watchlist-Quelle wird/wurde geprüft
     watchlist_done  {checked, found}                  Watchlist-Lauf beendet
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
  const hosted = /[?&]host=pywebview(&|$)/.test(location.search);

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
          if (typeof fn !== 'function') throw new Error(`api.${name} fehlt`);
          return await fn(...args);
        }
        if (!HC.mock || typeof HC.mock.api[name] !== 'function') throw new Error(`mock.${name} fehlt`);
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
