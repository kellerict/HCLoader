/* =====================================================================
   mock.js – Mock-Backend für Browser/Screenshots (kein pywebview)
   Gleiche Methodennamen und Datenformen wie app/api.py (siehe bridge.js).
   Simuliert ausserdem worker.py: Fortschritt, Phasen, Events.
   ===================================================================== */
(function () {
  'use strict';
  const HC = (window.HC = window.HC || {});
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const emit = (type, data) => window.mv.emit(type, data);

  /* Deterministischer Zufall, damit Screenshots stabil bleiben */
  let seed = 20261116;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const speed = { factor: 1 };
  const later = (ms, val) => new Promise((r) => setTimeout(() => r(typeof val === 'function' ? val() : val), ms * speed.factor));

  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (daysAgo) => {
    const d = new Date(Date.now() - daysAgo * 86400000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const isoAt = (daysAgo, hh, mm) => {
    const d = new Date(Date.now() - daysAgo * 86400000);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  };

  /* ---------- Einstellungen (docs/settings-schema.md) ---------- */
  const DEFAULTS = {
    general: { start_view: 'discover', log_level: 'INFO', confirm_delete: true },
    search: { results_count: 30, append_year: true },
    filters: {
      min_duration: 600, max_duration: 0, upload_period: 'all', upload_year: 0, upload_from: '', upload_to: '',
      include_keywords: ['mix', 'set', 'liveset', 'live set', 'podcast', 'continuous', 'megamix', 'yearmix', 'radio show', 'session', 'warm up', 'closing'],
      exclude_keywords: ['reaction', 'tutorial', 'how to', 'shorts', 'trailer', 'aftermovie', 'teaser', 'preview', 'lyrics', 'karaoke', 'sample pack', 'ableton', 'fl studio'],
      match_description: false, hide_done_ignored: true, apply_channel_blacklist: true,
    },
    genres: {
      items: [
        { name: 'Uptempo', color: '#b6ff00', keywords: ['uptempo', 'up-tempo', 'terror', 'terrorcore', 'speedcore'], priority: 1 },
        { name: 'Hardcore', color: '#ff1f1f', keywords: ['hardcore', 'gabber', 'gabba', 'frenchcore', 'industrial', 'early hardcore', 'millennium', 'mainstream hardcore'], priority: 2 },
        { name: 'Hardstyle', color: '#a43bff', keywords: ['hardstyle', 'rawstyle', 'raw', 'euphoric', 'xtra raw', 'reverse bass'], priority: 3 },
        { name: 'Unsortiert', color: '#6b6b78', keywords: [], priority: 4 },
      ],
    },
    download: { audio_format: 'mp3', mp3_quality: '320', embed_cover: true, write_cover_jpg: false, write_cue: true, write_id3_chapters: true },
    storage: {
      target_dir: '%USERPROFILE%\\Music\\HCLoader',
      path_template: '{genre}/{artist}/{year}/{date} - {title} [{id}]',
      max_title_length: 120, max_path_length: 240, artist_from_title: false,
      title_cleanup_patterns: ['\\(Official[^)]*\\)', '\\[HQ\\]', '\\[HD\\]', '\\(HQ\\)', '\\(HD\\)', '\\[Official[^\\]]*\\]'],
    },
    throttle: {
      sleep_requests: 3, sleep_interval: 30, max_sleep_interval: 120, limit_rate_mb: 3.0,
      max_downloads_per_run: 10, max_downloads_per_day: 25, max_searches_per_hour: 20,
      backoff_initial_hours: 6, backoff_max_hours: 48,
    },
    network: { po_token_mode: 'script', po_token_port: 4416, po_token_ttl_hours: 6, cookies_from_browser: '', proxy: '' },
    schedule: { watchlist_interval_hours: 24, in_app_check: true, task_scheduler_enabled: false, task_time: '03:00', entries_per_source: 30 },
    appearance: { reduce_effects: false, scanlines: true, pulse_bpm: 200 },
    maintenance: { check_updates_on_start: true },
  };
  let settings = clone(DEFAULTS);

  /* Stellvertreter für die pydantic-Validierung */
  const M = {
    num: 'Zahl erwartet.',
    int: 'Ganze Zahl erwartet.',
    range: (a, b) => `Wert muss zwischen ${a} und ${b} liegen.`,
    min: (a) => `Wert muss mindestens ${a} sein.`,
    oneOf: (l) => `Erlaubt: ${l.map((x) => x || '«leer»').join(', ')}.`,
  };
  const RULES = {
    'general.start_view': { oneOf: ['discover', 'inbox', 'watchlist', 'downloads', 'library', 'log'] },
    'general.log_level': { oneOf: ['DEBUG', 'INFO', 'WARNING', 'ERROR'] },
    'general.confirm_delete': { bool: 1 },
    'search.results_count': { int: 1, min: 1, max: 100 },
    'filters.min_duration': { int: 1, min: 0 },
    'filters.max_duration': { int: 1, min: 0 },
    'search.append_year': { bool: 1 },
    'filters.upload_period': { oneOf: ['all', '7d', '30d', '1y', 'year', 'custom'] },
    'filters.include_keywords': { list: 1 },
    'filters.exclude_keywords': { list: 1 },
    'filters.match_description': { bool: 1 },
    'filters.hide_done_ignored': { bool: 1 },
    'filters.apply_channel_blacklist': { bool: 1 },
    'download.audio_format': { oneOf: ['mp3', 'original'] },
    'download.mp3_quality': { oneOf: ['320', 'v0'] },
    'download.embed_cover': { bool: 1 },
    'download.write_cover_jpg': { bool: 1 },
    'download.write_cue': { bool: 1 },
    'download.write_id3_chapters': { bool: 1 },
    'storage.target_dir': { str: 1, required: 1 },
    'storage.path_template': { str: 1, required: 1 },
    'storage.max_title_length': { int: 1, min: 20, max: 200 },
    'storage.max_path_length': { int: 1, min: 100, max: 259 },
    'storage.artist_from_title': { bool: 1 },
    'storage.title_cleanup_patterns': { list: 1, regex: 1 },
    'throttle.sleep_requests': { min: 0, max: 60 },
    'throttle.sleep_interval': { int: 1, min: 0, max: 3600 },
    'throttle.max_sleep_interval': { int: 1, min: 0 },
    'throttle.limit_rate_mb': { min: 0 },
    'throttle.max_downloads_per_run': { int: 1, min: 1, max: 100 },
    'throttle.max_downloads_per_day': { int: 1, min: 1, max: 500 },
    'throttle.max_searches_per_hour': { int: 1, min: 1, max: 200 },
    'throttle.backoff_initial_hours': { min: 0.5, max: 168 },
    'throttle.backoff_max_hours': { min: 0.5 },
    'network.po_token_mode': { oneOf: ['off', 'script', 'http'] },
    'network.po_token_port': { int: 1, min: 1024, max: 65535 },
    'network.po_token_ttl_hours': { min: 0.5, max: 48 },
    'network.cookies_from_browser': { oneOf: ['', 'edge', 'chrome', 'firefox', 'brave'] },
    'network.proxy': { str: 1 },
    'schedule.watchlist_interval_hours': { min: 1, max: 168 },
    'schedule.in_app_check': { bool: 1 },
    'schedule.task_scheduler_enabled': { bool: 1 },
    'schedule.task_time': { time: 1 },
    'schedule.entries_per_source': { int: 1, min: 1, max: 200 },
    'appearance.reduce_effects': { bool: 1 },
    'appearance.scanlines': { bool: 1 },
    'appearance.pulse_bpm': { int: 1, min: 60, max: 300 },
    'maintenance.check_updates_on_start': { bool: 1 },
  };
  const PLACEHOLDERS = ['genre', 'artist', 'channel', 'year', 'date', 'title', 'id'];
  const MIN_YEAR = 2005;

  function validate(v) {
    const errors = {};
    const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), v);
    Object.entries(RULES).forEach(([key, r]) => {
      const val = get(key);
      const fail = (msg) => { errors[key] = msg; };
      if (r.bool) { if (typeof val !== 'boolean') fail('Ja/Nein erwartet.'); return; }
      if (r.oneOf) { if (!r.oneOf.includes(val)) fail(M.oneOf(r.oneOf)); return; }
      if (r.list) {
        if (!Array.isArray(val)) return fail('Liste erwartet.');
        if (r.regex) {
          for (const p of val) {
            try { new RegExp(p); } catch (e) { return fail(`Ungültiger regulärer Ausdruck: ${p}`); }
          }
        }
        return;
      }
      if (r.str) { if (typeof val !== 'string' || (r.required && !val.trim())) fail('Darf nicht leer sein.'); return; }
      if (r.time) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(val || '')) fail('Uhrzeit im Format HH:MM erwartet.'); return; }
      if (typeof val !== 'number' || !isFinite(val)) return fail(M.num);
      if (r.int && !Number.isInteger(val)) return fail(M.int);
      if (r.min != null && r.max != null && (val < r.min || val > r.max)) return fail(M.range(r.min, r.max));
      if (r.min != null && val < r.min) return fail(M.min(r.min));
    });
    const t = v.throttle || {}, f = v.filters || {}, s = v.storage || {};
    if (!errors['throttle.max_sleep_interval'] && !errors['throttle.sleep_interval'] && t.max_sleep_interval < t.sleep_interval)
      errors['throttle.max_sleep_interval'] = `Muss mindestens so gross sein wie das Minimum (${t.sleep_interval} s).`;
    if (!errors['throttle.backoff_max_hours'] && !errors['throttle.backoff_initial_hours'] && t.backoff_max_hours < t.backoff_initial_hours)
      errors['throttle.backoff_max_hours'] = `Muss mindestens so gross sein wie der Startwert (${t.backoff_initial_hours} h).`;
    if (!errors['filters.max_duration'] && !errors['filters.min_duration'] && f.max_duration > 0 && f.max_duration < f.min_duration)
      errors['filters.max_duration'] = 'Maximum liegt unter der Mindestlänge (0 = unbegrenzt).';
    if (!errors['storage.path_template']) {
      const bad = (s.path_template.match(/\{([^}]*)\}/g) || []).map((x) => x.slice(1, -1)).filter((x) => !PLACEHOLDERS.includes(x));
      if (bad.length) errors['storage.path_template'] = `Unbekannter Platzhalter: {${bad[0]}}`;
      else if (!s.path_template.includes('{id}')) errors['storage.path_template'] = 'Der Platzhalter {id} muss enthalten sein (eindeutige Dateinamen).';
    }
    /* Jahr-/Zeitraum-Filter (docs/settings-schema.md, Phase 3) */
    const yNow = new Date().getFullYear(), isDay = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(new Date(x));
    if (!Number.isInteger(f.upload_year)) errors['filters.upload_year'] = M.int;
    else if (f.upload_year !== 0 && (f.upload_year < MIN_YEAR || f.upload_year > yNow)) errors['filters.upload_year'] = `Jahr muss zwischen ${MIN_YEAR} und ${yNow} liegen.`;
    else if (f.upload_year === 0 && f.upload_period === 'year') errors['filters.upload_year'] = 'Jahr fehlt (Pflicht beim Zeitraum «Bestimmtes Jahr»).';
    ['upload_from', 'upload_to'].forEach((k) => {
      if (typeof f[k] !== 'string' || (f[k] && !isDay(f[k]))) errors[`filters.${k}`] = 'Ungültiges Datum (Format JJJJ-MM-TT).';
    });
    if (!errors['filters.upload_from'] && !errors['filters.upload_to'] && f.upload_from && f.upload_to && f.upload_to < f.upload_from)
      errors['filters.upload_to'] = 'Bis-Datum liegt vor dem Von-Datum.';
    const items = (v.genres && v.genres.items) || [];
    const seen = new Set();
    items.forEach((g, i) => {
      const name = String(g.name || '').trim();
      if (!name) errors[`genres.items.${i}.name`] = 'Name fehlt.';
      else if (seen.has(name.toLowerCase())) errors[`genres.items.${i}.name`] = `Name «${name}» ist doppelt vergeben.`;
      seen.add(name.toLowerCase());
      if (!/^#[0-9a-f]{6}$/i.test(g.color || '')) errors[`genres.items.${i}.color`] = 'Farbe im Format #rrggbb erwartet.';
    });
    if (!seen.has('unsortiert')) errors['genres.items'] = 'Das Genre «Unsortiert» muss vorhanden sein.';
    return errors;
  }

  /* ---------- Videos ---------- */
  const CH = {
    kick: ['UCkick0001', 'Kickdrum Collective'], concrete: ['UCconc0002', 'Concrete Noise Records'],
    dist: ['UCdist0003', 'Distortion Unit'], rave: ['UCrave0004', 'Rave Archive CH'],
    euph: ['UCeuph0005', 'Euphoria Sounds'], lab: ['UClab00006', 'Producer Lab'],
    vault: ['UCvaul0007', 'Gabber Vault'], stage: ['UCstag0008', 'Big Stage Events'],
    terror: ['UCterr0009', 'Terror Transmission'], night: ['UCnigh0010', 'Night Shift FM'],
    bunker: ['UCbunk0011', 'Bunker 303'], zrh: ['UCzrh00012', 'Hardfloor Zürich'],
  };
  const V = (id, title, ch, min, sec, days, views, genre, status) => ({
    id, title, channel_id: CH[ch][0], channel_name: CH[ch][1], duration: min * 60 + sec,
    upload_date: isoDay(days), view_count: views, thumbnail: null, genre, genre_manual: false, status: status || 'new',
  });
  const VIDEOS = [
    V('kR4wPr3ss01', 'Raw Pressure – 2 Hour Rawstyle Liveset @ Warehouse Night', 'kick', 124, 12, 3, 48200, 'Hardstyle'),
    V('cN1ndstr017', 'Industrial Hardcore Mix Vol. 17 | 180–200 BPM', 'concrete', 62, 40, 9, 12900, 'Hardcore', 'inbox'),
    V('dUpt3mp0T26', 'UPTEMPO TERROR MEGAMIX 2026 – 250+ BPM', 'dist', 48, 5, 15, 30410, 'Uptempo'),
    V('rFr3nchC0re', 'Frenchcore Session – Closing Set Mainstage', 'rave', 71, 33, 22, 8800, 'Hardcore', 'inbox'),
    V('eEuph0ric26', 'Euphoric Hardstyle Yearmix 2026', 'euph', 95, 2, 40, 212000, 'Hardstyle', 'done'),
    V('pTut0rial10', 'Hardcore Tutorial: How to make a kick in 10 minutes', 'lab', 14, 20, 5, 51000, 'Hardcore'),
    V('gEarlyHC90s', 'Early Hardcore Classics Warm Up Mix (90s Gabber)', 'vault', 58, 47, 120, 77400, 'Hardcore'),
    V('dP0dcast042', 'Uptempo Podcast #42 – Guest Mix by Overdrive', 'dist', 60, 0, 7, 9200, 'Uptempo', 'inbox'),
    V('bAfterm0vie', 'Festival Aftermovie 2026 | Official', 'stage', 6, 12, 30, 980000, 'Unsortiert'),
    V('kXtraRaw055', 'Xtra Raw Liveset – Reverse Bass Only', 'kick', 55, 18, 2, 15800, 'Hardstyle', 'downloading'),
    V('gMill3nnium', 'Millennium Hardcore Continuous Mix', 'vault', 83, 9, 200, 40300, 'Hardcore'),
    V('tSp33dc0re9', 'Speedcore Radio Show Episode 9', 'terror', 120, 0, 18, 3100, 'Uptempo', 'ignored'),
    V('rMainstrHC1', 'Mainstream Hardcore Set – Indoor Edition', 'rave', 64, 51, 45, 18600, 'Hardcore', 'inbox'),
    V('nMixedBag75', 'Mixed Bag: Hard Dance Session (no genre)', 'night', 75, 26, 12, 2400, 'Unsortiert'),
    V('bBunkerSet3', 'Bunker Sessions #3 – 3 Hour Hardcore Marathon Set', 'bunker', 181, 4, 4, 22100, 'Hardcore', 'queued'),
    V('zHardfloor7', 'Hardfloor Zürich Podcast 007 – Raw Hardstyle Mix', 'zrh', 59, 38, 1, 4300, 'Hardstyle'),
    V('tTerr0rLive', 'Terrorcore Liveset – 300 BPM Closing Madness', 'terror', 44, 15, 6, 6900, 'Uptempo', 'queued'),
    V('eReverseB4s', 'Reverse Bass Classics Mix – Hardstyle 2008–2012', 'euph', 102, 44, 60, 133500, 'Hardstyle'),
    V('cGabb4Fail1', 'Gabba Nation Liveset (Full Set, Members Only)', 'concrete', 66, 2, 11, 5200, 'Hardcore', 'failed'),
    V('zUpt3mpoZH2', 'Uptempo Warm Up Mix – Road to Winter Edition', 'zrh', 37, 52, 0, 1200, 'Uptempo', 'inbox'),
  ];
  const byId = (id) => VIDEOS.find((v) => v.id === id);
  const SEARCH_IDS = VIDEOS.filter((v) => v.id !== 'cGabb4Fail1').map((v) => v.id);
  /* Die flache Suche liefert das Datum nur ungefähr («vor 3 Monaten») -> date_approx. */
  const asSearchHit = (v) => Object.assign(clone(v), v.date_approx == null && v.upload_date && (Date.now() - new Date(v.upload_date)) / 86400000 >= 30 ? { date_approx: true } : {});
  let lastSearch = { query: 'hardcore liveset 2026', effective_query: 'hardcore liveset 2026', genre: null, year: null, ids: SEARCH_IDS };

  /* Treffer einer Suche mit Jahr (z.B. «hardcore liveset 2013»): Jahr im Titel, ungefähres Datum im Jahr,
     ±1 Jahr daneben, weit daneben, ohne Datum – damit der Jahr-Filter alle Fälle zeigt. */
  const YEAR_HITS = [
    ['Yearmix0', (y) => `Hardcore Yearmix ${y} – Best of Gabber & Mainstream`, 'vault', 92, 14, [0, 11, 28], true, 184300, 'Hardcore'],
    ['Thunder1', (y) => `Thunder Arena ${y} | Full Liveset – Raw Hardstyle`, 'kick', 61, 40, [1, 0, 15], true, 96100, 'Hardstyle'],
    ['EarlyRv2', () => 'Early Rave Classics Mix (Vinyl Only)', 'vault', 74, 3, [0, 5, 10], true, 41800, 'Hardcore'],
    ['FrenchC3', () => 'Frenchcore Session – Closing Set Indoor', 'rave', 58, 20, [-1, 10, 2], true, 22700, 'Hardcore'],
    ['UptWarm4', () => 'Uptempo Warm Up Mix Vol. 3', 'dist', 45, 11, [1, 2, 9], true, 8700, 'Uptempo'],
    ['IndPod05', () => 'Industrial Hardcore Podcast #12', 'concrete', 63, 0, [0, 2, 22], false, 15200, 'Hardcore'],
    ['Top100x6', (y) => `Hardstyle Top 100 ${y} Megamix`, 'euph', 118, 30, null, false, 310500, 'Hardstyle'],
    ['Classic7', (y) => `Hardcore Classics Liveset ${y} (Members Night)`, 'rave', 80, 0, [0, 8, 14], true, 12400, 'Hardcore', 'done'],
    ['MillBst8', (y) => `Millennium Hardcore Mix – Best of ${y - 3}`, 'vault', 66, 45, [4, 3, 1], true, 59000, 'Hardcore'],
    ['TerrLv09', () => 'Terror Liveset @ Bunker 303', 'terror', 49, 50, [3, 6, 20], true, 4100, 'Uptempo'],
    ['RawWarmA', (y) => `Raw Hardstyle Mix ${y + 1} | Warm Up`, 'kick', 52, 8, [2, 1, 5], true, 27900, 'Hardstyle'],
    ['SpeedTpB', () => 'Speedcore Session (old tape rip)', 'terror', 39, 27, null, false, 1900, 'Uptempo'],
  ];
  function yearHits(year) {
    return YEAR_HITS.map(([sfx, title, ch, min, sec, date, approx, views, genre, status]) => {
      const id = `y${String(year).slice(2)}${sfx}`;
      let v = byId(id);
      if (!v) {
        v = {
          id, title: title(year), channel_id: CH[ch][0], channel_name: CH[ch][1], duration: min * 60 + sec,
          upload_date: date ? `${year + date[0]}-${pad(date[1] + 1)}-${pad(date[2])}` : null,
          view_count: views, thumbnail: null, genre, genre_manual: false, status: status || 'new',
        };
        v.date_approx = !!approx;
        VIDEOS.push(v);
      }
      return id;
    });
  }
  /** Stellvertreter für das Backend: Genre-Begriffe und Jahr an den Suchtext hängen. */
  function effectiveQuery(query, opts) {
    const parts = [query], has = (w) => query.toLowerCase().includes(String(w).toLowerCase());
    const g = opts.genre && settings.genres.items.find((x) => x.name === opts.genre);
    if (g) g.keywords.slice(0, 2).filter((k) => !has(k)).forEach((k) => parts.push(k));
    if (opts.year && settings.search.append_year && !has(opts.year)) parts.push(String(opts.year));
    return parts.join(' ');
  }

  /* ---------- Watchlist ---------- */
  let SOURCES = [
    { id: 1, type: 'channel', name: 'Kickdrum Collective', url_or_query: 'https://www.youtube.com/@kickdrumcollective', default_genre: 'Hardstyle', enabled: true, auto_download: true, max_entries: 30, last_checked: isoAt(0, 3, 0), new_count: 2 },
    { id: 2, type: 'channel', name: 'Gabber Vault', url_or_query: 'https://www.youtube.com/@gabbervault', default_genre: 'Hardcore', enabled: true, auto_download: false, max_entries: 30, last_checked: isoAt(0, 3, 1), new_count: 0 },
    { id: 3, type: 'channel', name: 'Distortion Unit', url_or_query: 'https://www.youtube.com/@distortionunit', default_genre: 'Uptempo', enabled: true, auto_download: false, max_entries: 30, last_checked: isoAt(0, 3, 2), new_count: 1 },
    { id: 4, type: 'channel', name: 'Rave Archive CH', url_or_query: 'https://www.youtube.com/@ravearchivech', default_genre: null, enabled: true, auto_download: false, max_entries: 50, last_checked: isoAt(0, 3, 3), new_count: 2 },
    { id: 5, type: 'search', name: 'Frenchcore Livesets', url_or_query: 'frenchcore liveset', default_genre: 'Hardcore', enabled: true, auto_download: false, max_entries: 20, last_checked: isoAt(0, 3, 4), new_count: 0 },
    { id: 6, type: 'playlist', name: 'Hard Classics Playlist', url_or_query: 'https://www.youtube.com/playlist?list=PLhardclassics', default_genre: 'Hardcore', enabled: false, auto_download: false, max_entries: 30, last_checked: isoAt(6, 3, 0), new_count: 0 },
    { id: 7, type: 'search', name: 'Uptempo Podcasts', url_or_query: 'uptempo podcast mix', default_genre: 'Uptempo', enabled: true, auto_download: true, max_entries: 15, last_checked: null, new_count: 0 },
  ];
  let nextSourceId = 8;
  let BLACKLIST = [
    { channel_id: 'UCreact0001', channel_name: 'Reaction Bros', added: isoDay(34) },
    { channel_id: 'UClab00006', channel_name: 'Producer Lab', added: isoDay(12) },
  ];

  /* ---------- Bibliothek ---------- */
  const L = (id, title, artist, genre, min, upDays, dlDays, size) => ({
    id, title, artist, genre, duration: min * 60 + (id.charCodeAt(1) % 60), upload_date: isoDay(upDays), downloaded_at: isoAt(dlDays, 3, 10 + (id.charCodeAt(2) % 40)),
    file_path: `${genre}\\${artist}\\${isoDay(upDays).slice(0, 4)}\\${isoDay(upDays)} - ${title} [${id}].mp3`, size_mb: size,
  });
  let LIBRARY = [
    L('eEuph0ric26', 'Euphoric Hardstyle Yearmix 2026', 'Euphoria Sounds', 'Hardstyle', 95, 40, 2, 218.4),
    L('gGabbClassM', 'Gabber Classics Marathon', 'Gabber Vault', 'Hardcore', 180, 31, 4, 412.6),
    L('tTerrNight1', 'Terror Night Live Recording', 'Terror Transmission', 'Uptempo', 66, 20, 6, 151.9),
    L('kRawNation4', 'Raw Nation Podcast #4', 'Kickdrum Collective', 'Hardstyle', 61, 26, 6, 140.2),
    L('rIndoorCls2', 'Indoor Closing Set – Frenchcore Special', 'Rave Archive CH', 'Hardcore', 74, 44, 9, 170.3),
    L('dOverdrive1', 'Overdrive – 1 Hour Uptempo Mix', 'Distortion Unit', 'Uptempo', 60, 52, 12, 138.0),
    L('cIndVol016', 'Industrial Hardcore Mix Vol. 16', 'Concrete Noise Records', 'Hardcore', 63, 70, 14, 145.1),
    L('zZrhPod0006', 'Hardfloor Zürich Podcast 006', 'Hardfloor Zürich', 'Hardstyle', 58, 33, 16, 133.7),
    L('nNightShift', 'Night Shift FM – Hard Dance Session 12', 'Night Shift FM', 'Unsortiert', 90, 95, 21, 206.8),
    L('gMillClass2', 'Millennium Hardcore Classics Vol. 2', 'Gabber Vault', 'Hardcore', 88, 410, 30, 202.2),
    L('eReverse001', 'Reverse Bass Anthems Megamix', 'Euphoria Sounds', 'Hardstyle', 77, 380, 41, 177.0),
    L('bBunkerSet2', 'Bunker Sessions #2 – Early Rave Set', 'Bunker 303', 'Hardcore', 122, 60, 48, 280.5),
  ];

  /* ---------- Protokoll ---------- */
  const LOG = [];
  const pushLog = (level, msg, ts) => {
    const line = { ts: ts || new Date().toISOString(), level, msg };
    LOG.push(line);
    if (LOG.length > 500) LOG.shift();
    if (!ts) emit('log', line);
  };
  [
    [3, 0, 'info', 'Watchlist-Lauf gestartet (headless) · 6 aktive Quellen'],
    [3, 0, 'debug', 'Throttle: sleep_requests=3s · limit_rate=3.0 MB/s'],
    [3, 1, 'info', 'Quelle «Kickdrum Collective»: 30 Einträge flach geprüft, 2 neu'],
    [3, 1, 'info', 'Quelle «Gabber Vault»: beim ersten bekannten Video abgebrochen, 0 neu'],
    [3, 2, 'info', 'Quelle «Distortion Unit»: 1 neu'],
    [3, 3, 'info', 'Quelle «Rave Archive CH»: 2 neu'],
    [3, 4, 'warn', 'Quelle «Hard Classics Playlist» deaktiviert, übersprungen'],
    [3, 4, 'info', 'Filter: 7 Treffer geprüft · 5 bestehen · 2 verworfen (Dauer < 10 min, Exclude «aftermovie»)'],
    [3, 5, 'ok', 'Auto-Download «Raw Nation Podcast #4» fertig · 140.2 MB'],
    [3, 9, 'error', 'Download fehlgeschlagen «Gabba Nation Liveset»: HTTP 403 – nur für Kanalmitglieder'],
    [3, 9, 'ok', 'Watchlist-Lauf beendet · 5 gefunden · 1 geladen · 1 Fehler'],
    [9, 12, 'info', 'HCLoader gestartet · Config %APPDATA%\\HCLoader\\config.yaml'],
    [9, 12, 'info', 'yt-dlp 2026.11.02 · Deno 2.5.4 · ffmpeg 7.1 · bgutil-Plugin 1.3.0'],
    [9, 12, 'ok', 'PO-Token-Provider (Script/Deno) bereit'],
    [9, 14, 'info', 'Suche «hardcore liveset 2026» · 30 Treffer (flach) · 19 nach Filter'],
    [9, 14, 'debug', 'Throttle: 4/20 Suchen diese Stunde'],
  ].forEach(([h, m, lvl, msg]) => pushLog(lvl, msg, isoAt(0, h, m)));

  const RUNS = [
    { id: 41, kind: 'headless', started: isoAt(0, 3, 0), finished: isoAt(0, 3, 9), found: 5, downloaded: 1, errors: 1, note: '1 Download fehlgeschlagen (HTTP 403)' },
    { id: 40, kind: 'manual', started: isoAt(1, 20, 14), finished: isoAt(1, 20, 52), found: 3, downloaded: 3, errors: 0, note: '' },
    { id: 39, kind: 'headless', started: isoAt(1, 3, 0), finished: isoAt(1, 3, 4), found: 0, downloaded: 0, errors: 0, note: '' },
    { id: 38, kind: 'headless', started: isoAt(2, 3, 0), finished: isoAt(2, 3, 1), found: 0, downloaded: 0, errors: 1, note: 'HTTP 429 – Backoff 6 h aktiviert, Lauf abgebrochen' },
    { id: 37, kind: 'watchlist', started: isoAt(3, 18, 30), finished: isoAt(3, 19, 41), found: 9, downloaded: 6, errors: 0, note: '' },
    { id: 36, kind: 'headless', started: isoAt(3, 3, 0), finished: isoAt(3, 3, 22), found: 2, downloaded: 2, errors: 0, note: '' },
    { id: 35, kind: 'headless', started: isoAt(4, 3, 0), finished: isoAt(4, 3, 3), found: 0, downloaded: 0, errors: 0, note: '' },
  ];

  /* ---------- Laufzeit-Zustand ---------- */
  const state = {
    paused: false,
    queue: [
      { id: 'kXtraRaw055', state: 'active', phase: 'download', pct: 37, speed: 2.8, eta: 46, error: null },
      { id: 'bBunkerSet3', state: 'waiting', phase: 'waiting', pct: 0, speed: 0, eta: 0, error: null },
      { id: 'tTerr0rLive', state: 'waiting', phase: 'waiting', pct: 0, speed: 0, eta: 0, error: null },
      { id: 'cGabb4Fail1', state: 'failed', phase: 'download', pct: 12, speed: 0, eta: 0, error: 'HTTP 403 – Video nur für Kanalmitglieder verfügbar' },
    ],
    counters: { downloads_run: 1, downloads_day: 3, searches_hour: 4 },
    po: { state: 'active', detail: 'Token erzeugt vor 4 min', created: Date.now() - 4 * 60000 },
    backoff: { active: false, until: null, level: 0 },
    task: { registered: false },
    local: null, // [code, Meldung] – lokale Sperre «pot» / «target» / «error» (nur Demo)
    versions: { ytdlp: '2026.11.02', plugin: '1.3.0' },
    lastBackup: isoAt(5, 19, 2),
    sleepLeft: 0, // Sekunden bis zum nächsten Download (Throttle-Pause)
    sleepTotal: 0,
    convertTicks: 0,
  };
  const SLEEP_STEP = 2; // Zeitraffer: ein Tick (450 ms) = 2 s Pause

  const nextCheck = () => {
    const [hh, mm] = settings.schedule.task_time.split(':').map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    if (d <= new Date()) d.setDate(d.getDate() + 1);
    return d.toISOString();
  };
  const activeQueue = () => state.queue.filter((q) => q.state !== 'failed');
  function status() {
    const mode = settings.network.po_token_mode;
    return {
      app_version: '0.2.0', ytdlp_version: state.versions.ytdlp, plugin_version: state.versions.plugin,
      deno_ok: true, deno_version: '2.5.4', ffmpeg_ok: true, ffmpeg_version: '7.1',
      po_token: mode === 'off' ? { state: 'inactive', mode, detail: 'Provider ausgeschaltet' } : { state: state.po.state, mode, detail: state.po.detail },
      backoff: {
        active: state.backoff.active, until: state.backoff.until, level: state.backoff.level,
        remaining_s: state.backoff.active ? Math.max(0, Math.round((new Date(state.backoff.until) - Date.now()) / 1000)) : 0,
      },
      next_check: settings.schedule.in_app_check || state.task.registered ? nextCheck() : null,
      queue_length: activeQueue().length, queue_paused: state.paused,
      inbox_count: VIDEOS.filter((v) => v.status === 'inbox').length,
      counters: clone(state.counters),
    };
  }
  const pushStatus = () => emit('status', status());
  const targetOf = (v) => `${v.genre}\\${v.channel_name}\\${(v.upload_date || '').slice(0, 4)}\\`;
  /** Wie worker.DownloadQueue.blocked(): (code, Meldung), warum wartende Einträge nicht laufen. */
  function blocked() {
    const th = settings.throttle, c = state.counters;
    if (!state.queue.some((q) => q.state === 'waiting')) return [null, null];
    if (state.backoff.active) return ['backoff', 'Backoff aktiv – Rest bleibt in der Warteschlange'];
    if (c.downloads_day >= th.max_downloads_per_day) return ['day_limit', `Tageslimit erreicht (${c.downloads_day}/${th.max_downloads_per_day}) – Rest bleibt in der Warteschlange`];
    if (c.downloads_run >= th.max_downloads_per_run) return ['run_limit', `Limit pro Lauf erreicht (${th.max_downloads_per_run}/${th.max_downloads_per_run}) – Rest bleibt in der Warteschlange; «Fortsetzen» startet einen neuen Lauf`];
    if (state.local) return state.local.slice();
    return [null, null];
  }
  const queueView = () => {
    const [code, msg] = blocked();
    return {
      paused: state.paused,
      items: state.queue.map((q) => Object.assign({}, q, { video: clone(byId(q.id)), target: targetOf(byId(q.id)) })),
      blocked_code: code, blocked_reason: msg,
    };
  };
  const setStatus = (v, st) => { v.status = st; emit('video', { id: v.id, status: st, genre: v.genre }); };

  /* ---------- Simulation von worker.py ---------- */
  const limitHit = () => state.counters.downloads_day >= settings.throttle.max_downloads_per_day || state.counters.downloads_run >= settings.throttle.max_downloads_per_run;
  const unsleep = (except) => state.queue.forEach((x) => { if (x !== except && x.phase === 'sleep') { x.phase = 'waiting'; x.eta = 0; } });
  function tick() {
    if (state.paused || state.backoff.active) return;
    const q = state.queue.find((x) => x.state !== 'failed');
    if (!q) return;
    const v = byId(q.id);
    unsleep(q);
    if (q.phase === 'waiting') {
      if (limitHit()) return; // Rest bleibt in der Warteschlange
      if (state.sleepLeft > 0) { q.phase = 'sleep'; q.eta = state.sleepLeft; q.sleep_total = state.sleepTotal; emit('queue', {}); return; }
      q.phase = 'download'; q.state = 'active';
      setStatus(v, 'downloading');
      pushLog('info', `Starte Download: ${v.title}`);
      emit('queue', {});
    } else if (q.phase === 'sleep') {
      state.sleepLeft = Math.max(0, state.sleepLeft - SLEEP_STEP); q.eta = state.sleepLeft;
      emit('progress', { id: q.id, phase: 'sleep', pct: 0, speed: 0, eta: q.eta });
      if (state.sleepLeft <= 0) q.phase = 'waiting';
      return;
    }
    if (q.phase === 'download') {
      q.state = 'active';
      q.pct = Math.min(100, q.pct + 3 + rnd() * 5);
      q.speed = 2.4 + rnd() * 0.6;
      q.eta = Math.round(((100 - q.pct) / 5.5) * 0.45 * 4);
      if (q.pct >= 100) { q.phase = 'convert'; q.pct = 100; q.speed = 0; q.eta = 0; state.convertTicks = 3; pushLog('debug', `ffmpeg: MP3 ${settings.download.mp3_quality === 'v0' ? 'V0 VBR' : '320 kbps CBR'} · ${v.title}`); }
    } else if (q.phase === 'convert') {
      if (--state.convertTicks <= 0) q.phase = 'tag';
    } else if (q.phase === 'tag') {
      state.queue = state.queue.filter((x) => x.id !== q.id);
      state.counters.downloads_run++; state.counters.downloads_day++;
      const artist = v.channel_name;
      LIBRARY.unshift({
        id: v.id, title: v.title, artist, genre: v.genre, duration: v.duration, upload_date: v.upload_date, downloaded_at: new Date().toISOString(),
        file_path: `${v.genre}\\${artist}\\${v.upload_date.slice(0, 4)}\\${v.upload_date} - ${v.title} [${v.id}].mp3`, size_mb: +((v.duration * 320) / 8 / 1024).toFixed(1),
      });
      setStatus(v, 'done');
      pushLog('ok', `Fertig: ${v.title} · ${LIBRARY[0].size_mb} MB`);
      if (activeQueue().length && !limitHit()) {
        const th = settings.throttle;
        state.sleepTotal = state.sleepLeft = Math.round(th.sleep_interval + rnd() * Math.max(0, th.max_sleep_interval - th.sleep_interval));
        if (state.sleepLeft) pushLog('debug', `Throttle: ${state.sleepLeft} s Pause bis zum nächsten Download`);
      } else state.sleepLeft = 0;
      if (activeQueue().length && limitHit()) pushLog('warn', 'Download-Limit erreicht – der Rest bleibt in der Warteschlange');
      emit('done', { id: v.id, title: v.title });
      emit('queue', {});
      pushStatus();
      return;
    }
    emit('progress', { id: q.id, phase: q.phase, pct: q.pct, speed: q.speed, eta: q.eta });
  }
  let timer = null;
  const sim = {
    start() { if (!timer) timer = setInterval(tick, 450); },
    stop() { clearInterval(timer); timer = null; },
    tick(n) { for (let i = 0; i < (n || 1); i++) tick(); },
  };

  /* ---------- API ---------- */
  const api = {
    /* Einstellungen */
    get_settings: () => later(30, () => ({ values: clone(settings), defaults: clone(DEFAULTS) })),
    save_settings(values) {
      return later(220, () => {
        const errors = validate(values);
        if (Object.keys(errors).length) return { ok: false, errors };
        settings = clone(values);
        settings.genres.items.forEach((g, i) => { g.priority = i + 1; });
        pushLog('info', 'Einstellungen gespeichert');
        pushStatus();
        return { ok: true };
      });
    },
    reset_settings(section) {
      return later(120, () => {
        if (section) settings[section] = clone(DEFAULTS[section]);
        else settings = clone(DEFAULTS);
        pushLog('warn', section ? `Einstellungen «${section}» auf Standard zurückgesetzt` : 'Alle Einstellungen auf Standard zurückgesetzt');
        pushStatus();
        return { ok: true };
      });
    },

    /* Status / Wartung */
    get_status: () => later(20, status),
    get_versions: () => later(40, () => ({
      app: '0.2.0', ytdlp: state.versions.ytdlp, plugin: state.versions.plugin, deno: '2.5.4', ffmpeg: '7.1', python: '3.13.1',
      data_dir: '%APPDATA%\\HCLoader', db_path: '%APPDATA%\\HCLoader\\hcloader.db', db_entries: 1234, db_size_mb: 1.8,
      last_backup: state.lastBackup, last_update_check: isoAt(0, 9, 12),
    })),
    update_ytdlp() {
      return later(2400, () => {
        const before = state.versions.ytdlp;
        state.versions = { ytdlp: '2026.11.14', plugin: '1.3.1' };
        pushLog('ok', `yt-dlp ${before} → ${state.versions.ytdlp} · Plugin → ${state.versions.plugin}`);
        pushStatus();
        return {
          ok: true, ytdlp: state.versions.ytdlp, plugin: state.versions.plugin, changed: before !== state.versions.ytdlp,
          output: [
            '> pip install -U yt-dlp bgutil-ytdlp-pot-provider',
            before !== state.versions.ytdlp ? `Successfully installed yt-dlp-${state.versions.ytdlp} bgutil-ytdlp-pot-provider-${state.versions.plugin}` : 'Requirement already satisfied: yt-dlp, bgutil-ytdlp-pot-provider',
          ].join('\n'),
        };
      });
    },
    backup_db() {
      return later(700, () => {
        const d = new Date();
        state.lastBackup = d.toISOString();
        const path = `%APPDATA%\\HCLoader\\backups\\hcloader-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.db`;
        pushLog('ok', `Datenbank gesichert: ${path}`);
        return { ok: true, path };
      });
    },
    open_path: () => later(30, { ok: true }),
    pick_folder: () => later(300, { path: 'D:\\Musik\\HCLoader' }),
    test_po_token() {
      return later(1300, () => {
        if (settings.network.po_token_mode === 'off') return { ok: false, state: 'inactive', detail: 'Provider ist ausgeschaltet.', error: 'Provider ist ausgeschaltet.', ms: 0 };
        state.po = { state: 'active', detail: 'Token erzeugt vor wenigen Sekunden', created: Date.now() };
        pushLog('ok', 'PO-Token-Test erfolgreich (840 ms)');
        pushStatus();
        return { ok: true, state: 'active', detail: 'Neuer Token erzeugt und von YouTube akzeptiert.', ms: 840 };
      });
    },
    clear_backoff() {
      return later(150, () => {
        state.backoff = { active: false, until: null, level: 0 };
        pushLog('warn', 'Backoff manuell aufgehoben');
        pushStatus();
        return { ok: true };
      });
    },
    get_task_status: () => later(60, () => (state.task.unknown ? { registered: null, name: '\\HCLoader\\Watchlist', time: settings.schedule.task_time, next_run: null, error: 'schtasks antwortet nicht (Zeitüberschreitung nach 20 s)' } : {
      registered: state.task.registered, name: '\\HCLoader\\Watchlist', time: settings.schedule.task_time,
      next_run: state.task.registered ? nextCheck() : null, error: null,
    })),
    create_task(time) {
      return later(600, () => {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return { ok: false, error: 'Uhrzeit im Format HH:MM erwartet.' };
        state.task.registered = true;
        settings.schedule.task_scheduler_enabled = true;
        settings.schedule.task_time = time;
        pushLog('ok', `Aufgabenplanung: \\HCLoader\\Watchlist täglich ${time} angelegt`);
        pushStatus();
        return { ok: true, registered: true, name: '\\HCLoader\\Watchlist', time, next_run: nextCheck() };
      });
    },
    remove_task() {
      return later(400, () => {
        state.task.registered = false;
        settings.schedule.task_scheduler_enabled = false;
        pushLog('info', 'Aufgabenplanung: \\HCLoader\\Watchlist entfernt');
        pushStatus();
        return { ok: true, registered: false };
      });
    },
    get_blacklist: () => later(40, () => clone(BLACKLIST)),
    unblock_channel(channelId) {
      return later(60, () => { BLACKLIST = BLACKLIST.filter((b) => b.channel_id !== channelId); return { ok: true }; });
    },

    /* Entdecken / Eingang */
    get_last_search: () => later(60, () => ({
      query: lastSearch.query, effective_query: lastSearch.effective_query, genre: lastSearch.genre, year: lastSearch.year,
      results: lastSearch.ids.map((id) => asSearchHit(byId(id))),
    })),
    /* opts = {genre: <Name>|null, year: <int>|null} – das Backend hängt die Begriffe an (siehe bridge.js). */
    search(query, opts) {
      return later(1100, () => {
        const o = Object.assign({ genre: null, year: null }, opts);
        if (state.backoff.active) return { ok: false, error: 'Backoff aktiv – Suche ist gesperrt.' };
        if (state.counters.searches_hour >= settings.throttle.max_searches_per_hour) return { ok: false, error: 'Limit «Suchen pro Stunde» erreicht.' };
        const effective = effectiveQuery(query, o);
        const ids = o.year ? yearHits(o.year) : SEARCH_IDS;
        lastSearch = { query, effective_query: effective, genre: o.genre, year: o.year || null, ids };
        state.counters.searches_hour++;
        pushLog('info', `Suche «${effective}» · ${ids.length} Treffer (flach)`);
        pushStatus();
        return { ok: true, results: ids.map((id) => asSearchHit(byId(id))), effective_query: effective, query, genre: o.genre, year: o.year || null, hidden_count: 0 };
      });
    },
    get_inbox: () => later(40, () => clone(VIDEOS.filter((v) => v.status === 'inbox'))),
    enqueue(ids) {
      return later(60, () => {
        const done = [];
        ids.forEach((id) => {
          const v = byId(id);
          if (!v || !['new', 'inbox', 'failed'].includes(v.status)) return;
          state.queue = state.queue.filter((q) => q.id !== id);
          const failedAt = state.queue.findIndex((q) => q.state === 'failed');
          const item = { id, state: 'waiting', phase: 'waiting', pct: 0, speed: 0, eta: 0, error: null };
          if (failedAt < 0) state.queue.push(item); else state.queue.splice(failedAt, 0, item);
          setStatus(v, 'queued');
          done.push(id);
        });
        if (done.length) pushLog('info', `${done.length} Mix(es) zur Warteschlange hinzugefügt`);
        emit('queue', {});
        pushStatus();
        return Object.assign({ ok: true, ids: done }, done.length < ids.length ? { skipped: ids.length - done.length } : {});
      });
    },
    set_video_status(id, st) {
      return later(40, () => { const v = byId(id); if (v) setStatus(v, st); pushStatus(); return { ok: true }; });
    },
    set_genre(id, genre) {
      return later(40, () => {
        const v = byId(id);
        if (v) { v.genre = genre; v.genre_manual = true; emit('video', { id, status: v.status, genre }); }
        return { ok: true };
      });
    },
    open_video: () => later(30, { ok: true }),
    add_channel_source(channelId, channelName) {
      return later(80, () => {
        let s = SOURCES.find((x) => x.name === channelName);
        if (!s) {
          s = { id: nextSourceId++, type: 'channel', name: channelName, url_or_query: `https://www.youtube.com/channel/${channelId}`, default_genre: null, enabled: true, auto_download: false, max_entries: settings.schedule.entries_per_source, last_checked: null, new_count: 0 };
          SOURCES.push(s);
        }
        return { ok: true, source: clone(s) };
      });
    },
    block_channel(channelId, channelName) {
      return later(60, () => {
        if (!BLACKLIST.some((b) => b.channel_id === channelId)) BLACKLIST.push({ channel_id: channelId, channel_name: channelName, added: isoDay(0) });
        return { ok: true };
      });
    },

    /* Watchlist */
    get_sources: () => later(40, () => clone(SOURCES)),
    save_source(src) {
      return later(120, () => {
        const errors = {};
        if (!String(src.name || '').trim()) errors.name = 'Name fehlt.';
        if (!String(src.url_or_query || '').trim()) errors.url_or_query = src.type === 'search' ? 'Suchbegriff fehlt.' : 'URL fehlt.';
        else if (src.type !== 'search' && !/^https?:\/\/(www\.)?youtube\.com\//.test(src.url_or_query)) errors.url_or_query = 'YouTube-URL erwartet (https://www.youtube.com/…).';
        if (!(src.max_entries >= 1 && src.max_entries <= 200)) errors.max_entries = 'Wert muss zwischen 1 und 200 liegen.';
        if (Object.keys(errors).length) return { ok: false, errors };
        let s = SOURCES.find((x) => x.id === src.id);
        if (s) Object.assign(s, src);
        else { s = Object.assign({ last_checked: null, new_count: 0 }, src, { id: nextSourceId++ }); SOURCES.push(s); }
        return { ok: true, source: clone(s) };
      });
    },
    delete_source(id) {
      return later(60, () => { SOURCES = SOURCES.filter((s) => s.id !== id); return { ok: true }; });
    },
    check_sources(ids) {
      const list = SOURCES.filter((s) => s.enabled && (!ids || ids.includes(s.id)));
      pushLog('info', `Watchlist-Prüfung gestartet · ${list.length} Quelle(n)`);
      (async () => {
        for (const s of list) {
          emit('source', { id: s.id, checking: true });
          await later(650);
          s.last_checked = new Date().toISOString();
          emit('source', { id: s.id, checking: false, last_checked: s.last_checked, new_count: s.new_count });
        }
        pushLog('ok', `Watchlist-Prüfung beendet · ${list.length} Quelle(n) · 0 neue Treffer`);
        emit('watchlist_done', { checked: list.length, found: 0 });
      })();
      return later(30, { ok: true, started: list.length });
    },

    /* Downloads */
    get_queue: () => later(30, queueView),
    set_queue_paused(paused) {
      return later(40, () => {
        state.paused = !!paused;
        /* «Fortsetzen» nach dem Lauf-Limit = neuer Lauf (Zähler des Laufs beginnt neu). */
        if (!paused && state.counters.downloads_run >= settings.throttle.max_downloads_per_run) { state.counters.downloads_run = 0; pushLog('info', 'Neuer Download-Lauf gestartet'); }
        pushLog('info', paused ? 'Warteschlange pausiert' : 'Warteschlange fortgesetzt');
        emit('queue', {});
        pushStatus();
        return { ok: true, paused: state.paused };
      });
    },
    queue_move(id, delta) {
      return later(30, () => {
        const i = state.queue.findIndex((q) => q.id === id), j = i + delta;
        if (i < 0 || j < 0 || j >= state.queue.length) return { ok: false };
        if (state.queue[i].state !== 'waiting' || state.queue[j].state !== 'waiting') return { ok: false };
        [state.queue[i], state.queue[j]] = [state.queue[j], state.queue[i]];
        /* Die Pause gilt für den Eintrag, der als Nächstes dran ist. */
        const sleeping = state.queue.some((x) => x.phase === 'sleep');
        unsleep(null);
        const head = state.queue.find((x) => x.state !== 'failed');
        if (sleeping && head && head.phase === 'waiting') Object.assign(head, { phase: 'sleep', eta: state.sleepLeft, sleep_total: state.sleepTotal });
        emit('queue', {});
        return { ok: true };
      });
    },
    queue_cancel(id) {
      return later(40, () => {
        const q = state.queue.find((x) => x.id === id);
        state.queue = state.queue.filter((x) => x.id !== id);
        const v = byId(id);
        if (v) setStatus(v, 'new');
        if (q) pushLog('warn', `Abgebrochen: ${v.title}`);
        emit('queue', {});
        pushStatus();
        return { ok: true };
      });
    },
    queue_retry(id) {
      return later(40, () => {
        const q = state.queue.find((x) => x.id === id);
        if (q) {
          Object.assign(q, { state: 'waiting', phase: 'waiting', pct: 0, error: null });
          state.queue = state.queue.filter((x) => x !== q);
          const failedAt = state.queue.findIndex((x) => x.state === 'failed');
          if (failedAt < 0) state.queue.push(q); else state.queue.splice(failedAt, 0, q);
          setStatus(byId(id), 'queued');
        }
        emit('queue', {});
        pushStatus();
        return { ok: true };
      });
    },

    /* Bibliothek */
    get_library: () => later(40, () => clone(LIBRARY)),
    open_folder: () => later(30, { ok: true }),
    retag(id) {
      return later(500, () => { const l = LIBRARY.find((x) => x.id === id); if (l) pushLog('ok', `Neu getaggt: ${l.title}`); return { ok: true }; });
    },
    delete_library_item(id) {
      return later(80, () => {
        const l = LIBRARY.find((x) => x.id === id);
        LIBRARY = LIBRARY.filter((x) => x.id !== id);
        if (l) pushLog('warn', `Gelöscht: ${l.title}`);
        const v = byId(id);
        if (v) setStatus(v, 'new');
        return { ok: true };
      });
    },

    /* Protokoll */
    get_log: () => later(30, () => ({ lines: clone(LOG), runs: clone(RUNS) })),
  };

  HC.mock = {
    api,
    sim,
    speed,
    validate,
    /** Nur für Demo/Screenshots: Zustände erzwingen. */
    demo: {
      backoff(hours) {
        const h = hours || 6;
        state.backoff = { active: true, until: new Date(Date.now() + h * 3600000 - 47 * 60000).toISOString(), level: 1 };
        pushLog('error', `HTTP 429 von YouTube – Backoff ${h} h aktiviert`);
        pushStatus();
      },
      taskUnknown(on) { state.task.unknown = on !== false; },
      /** Lokale Sperre der Warteschlange (code "pot" | "target" | "error", null = aufheben). */
      local(code, msg) {
        const texts = {
          pot: 'PO-Token-Server nicht bereit – Downloads warten, bis er läuft – Rest bleibt in der Warteschlange',
          target: 'Zielordner nicht erreichbar oder nicht beschreibbar (M:\\Musik\\HCLoader): Das Gerät ist nicht bereit – Rest bleibt in der Warteschlange',
          error: 'Download-Modul (yt-dlp) konnte nicht geladen werden: No module named yt_dlp.extractor – neuer Versuch nach «Fortsetzen», neuen Einträgen oder dem Speichern der Einstellungen',
        };
        state.local = code ? [code, msg || texts[code] || ''] : null;
        if (code) {
          state.queue.forEach((q) => { if (q.state === 'active') Object.assign(q, { state: 'waiting', phase: 'waiting', pct: 0, speed: 0, eta: 0 }); });
          VIDEOS.filter((v) => v.status === 'downloading').forEach((v) => setStatus(v, 'queued'));
          unsleep(null);
          state.sleepLeft = 0;
          state.counters.downloads_run = 0;
        }
        emit('queue', {});
        pushStatus();
      },
      poError() {
        state.po = { state: 'error', detail: 'Deno-Script lieferte keinen Token (Timeout nach 15 s)', created: 0 };
        pushStatus();
      },
      /** Der laufende Download ist fertig, der nächste wartet in der Throttle-Pause. */
      sleep(left, total) {
        state.queue = state.queue.filter((q) => q.state !== 'active');
        VIDEOS.filter((v) => v.status === 'downloading').forEach((v) => setStatus(v, 'done'));
        unsleep(null);
        const head = state.queue.find((q) => q.state !== 'failed');
        state.sleepLeft = left || 47;
        state.sleepTotal = total || 74;
        if (head) Object.assign(head, { phase: 'sleep', eta: state.sleepLeft, sleep_total: state.sleepTotal });
        state.counters.downloads_run = Math.max(2, state.counters.downloads_run);
        state.counters.downloads_day = Math.max(4, state.counters.downloads_day);
        emit('queue', {});
        pushStatus();
      },
      /** Limit erreicht: kind = "run" | "day". Die wartenden Einträge bleiben stehen. */
      limit(kind) {
        const th = settings.throttle;
        state.queue = state.queue.filter((q) => q.state !== 'active');
        VIDEOS.filter((v) => v.status === 'downloading').forEach((v) => setStatus(v, 'done'));
        unsleep(null);
        state.sleepLeft = 0;
        if (kind === 'day') { state.counters.downloads_day = th.max_downloads_per_day; state.counters.downloads_run = Math.min(th.max_downloads_per_run, 7); }
        else { state.counters.downloads_run = th.max_downloads_per_run; state.counters.downloads_day = Math.max(state.counters.downloads_day, th.max_downloads_per_run + 2); }
        pushLog('warn', 'Download-Limit erreicht – der Rest bleibt in der Warteschlange');
        emit('queue', {});
        pushStatus();
      },
    },
  };
  /* Die Simulation startet app.js – und nur im Mock-Modus. */
})();
