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
      match_description: false, hide_done_ignored: true, apply_channel_blacklist: true, hide_cross_platform_duplicates: false,
    },
    genres: {
      items: [
        { name: 'Uptempo', color: '#b6ff00', keywords: ['uptempo', 'up-tempo', 'terror', 'terrorcore', 'speedcore'], priority: 1 },
        { name: 'Hardcore', color: '#ff1f1f', keywords: ['hardcore', 'gabber', 'gabba', 'frenchcore', 'industrial', 'early hardcore', 'millennium', 'mainstream hardcore'], priority: 2 },
        { name: 'Hardstyle', color: '#a43bff', keywords: ['hardstyle', 'rawstyle', 'raw', 'euphoric', 'xtra raw', 'reverse bass'], priority: 3 },
        { name: 'Unsortiert', color: '#6b6b78', keywords: [], priority: 4 },
      ],
    },
    download: { audio_format: 'mp3', mp3_quality: '320', embed_cover: true, write_cover_jpg: false, write_cue: true, write_id3_chapters: true, keep_original_soundcloud: true },
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
    soundcloud: {
      enabled: true, sleep_requests: 3, sleep_interval: 30, max_sleep_interval: 120, limit_rate_mb: 3.0,
      max_downloads_per_run: 10, max_downloads_per_day: 25, max_searches_per_hour: 20,
      backoff_initial_hours: 6, backoff_max_hours: 48,
    },
    player: { mode: 'internal' },
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
    'filters.hide_cross_platform_duplicates': { bool: 1 },
    'download.audio_format': { oneOf: ['mp3', 'original'] },
    'download.mp3_quality': { oneOf: ['320', 'v0'] },
    'download.embed_cover': { bool: 1 },
    'download.write_cover_jpg': { bool: 1 },
    'download.write_cue': { bool: 1 },
    'download.write_id3_chapters': { bool: 1 },
    'download.keep_original_soundcloud': { bool: 1 },
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
    'soundcloud.enabled': { bool: 1 },
    'player.mode': { oneOf: ['internal', 'external'] },
  };
  /* Abschnitt «soundcloud» erbt die Schonungs-Felder (gleiche Grenzen und Meldungen wie «throttle»). */
  Object.keys(RULES).filter((k) => k.startsWith('throttle.')).forEach((k) => { RULES[k.replace('throttle.', 'soundcloud.')] = RULES[k]; });
  const PLACEHOLDERS = ['genre', 'artist', 'channel', 'year', 'date', 'title', 'id', 'platform'];
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
    const f = v.filters || {}, s = v.storage || {};
    ['throttle', 'soundcloud'].forEach((sec) => {
      const x = v[sec] || {};
      if (!errors[`${sec}.max_sleep_interval`] && !errors[`${sec}.sleep_interval`] && x.max_sleep_interval < x.sleep_interval)
        errors[`${sec}.max_sleep_interval`] = `Muss mindestens so gross sein wie das Minimum (${x.sleep_interval} s).`;
      if (!errors[`${sec}.backoff_max_hours`] && !errors[`${sec}.backoff_initial_hours`] && x.backoff_max_hours < x.backoff_initial_hours)
        errors[`${sec}.backoff_max_hours`] = `Muss mindestens so gross sein wie der Startwert (${x.backoff_initial_hours} h).`;
    });
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
    platform: 'youtube', url: `https://www.youtube.com/watch?v=${id}`,
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
  /* Eingang: Treffer kennen ihre Watchlist-Quelle (Video.source_id, siehe bridge.js). */
  Object.entries({ cN1ndstr017: 5, rFr3nchC0re: 5, dP0dcast042: 3, rMainstrHC1: 4, zUpt3mpoZH2: 7 }).forEach(([id, src]) => { VIDEOS.find((v) => v.id === id).source_id = src; });
  /* Was die nächste simulierte Watchlist-Prüfung pro Quelle neu findet (einmalig). */
  const FRESH = {
    1: [V('kRawSunday9', 'Raw Sunday Session #9 – Full Liveset', 'kick', 71, 8, 0, 640, 'Hardstyle')],
    2: [V('gThunderd96', 'Thunderdome ’96 Tribute Mix – Oldschool Gabber', 'vault', 67, 21, 0, 2100, 'Hardcore')],
    4: [V('rAfterh0urs', 'Afterhours Hardcore Set – Recorded Live in Basel', 'rave', 92, 14, 1, 980, 'Hardcore'),
      V('rTekn0Raid4', 'Hardtekno Raid Vol. 4 – Liveset', 'rave', 54, 30, 0, 310, 'Unsortiert')],
  };
  const byId = (id) => VIDEOS.find((v) => v.id === id);
  const SEARCH_IDS = VIDEOS.filter((v) => v.id !== 'cGabb4Fail1').map((v) => v.id);

  /* ---------- SoundCloud (Phase 7a): IDs «sc:<zahl>», Thumbnails kämen von *.sndcdn.com ---------- */
  const SCU = {
    pulse: ['sc:5101', 'Pulsewerk', 'pulsewerk-audio'], nrg: ['sc:5102', 'NRG Tapes', 'nrg-tapes'], kern: ['sc:5103', 'Kernschmelze', 'kernschmelze'],
    zrh: ['sc:5104', 'Hardfloor Zürich', 'hardfloor-zrh'], bunker: ['sc:5105', 'Bunker 303', 'bunker303'], euph: ['sc:5106', 'Euphoria Sounds', 'euphoria-sounds'],
    radio: ['sc:5107', 'Hard Dance Radio', 'harddance-radio'],
  };
  const S = (num, slug, title, u, min, sec, days, plays, genre, extra) => Object.assign({
    id: `sc:${num}`, title, channel_id: SCU[u][0], channel_name: SCU[u][1], duration: min * 60 + sec,
    upload_date: isoDay(days), view_count: plays, thumbnail: null, genre, genre_manual: false, status: 'new',
    platform: 'soundcloud', url: `https://soundcloud.com/${SCU[u][2]}/${slug}`, preview: false,
  }, extra);
  const dupOf = (id) => { const v = byId(id); return { id: v.id, platform: v.platform, title: v.title }; };
  const PREVIEW = { preview: true, filter_reason: 'Nur Vorschau (Go+)' };
  const SC_VIDEOS = [
    S(880114201, 'raw-set-kesselhaus', 'Pulsewerk – Raw Hardstyle Set @ Kesselhaus (Full Recording)', 'pulse', 78, 12, 2, 5400, 'Hardstyle'),
    S(880114202, 'euphoric-yearmix-2026', 'Euphoric Hardstyle Yearmix 2026', 'euph', 95, 3, 39, 31200, 'Hardstyle', { duplicate_of: dupOf('eEuph0ric26') }),
    S(880114203, 'nrg-tapes-014', 'NRG Tapes 014 – Uptempo Guest Mix', 'nrg', 61, 30, 5, 2100, 'Uptempo'),
    S(880114204, 'podcast-21', 'Kernschmelze Podcast #21 – Industrial Hardcore Mix', 'kern', 64, 5, 9, 3900, 'Hardcore'),
    S(880114205, 'frenchcore-warm-up', 'Frenchcore Warm Up Mix – Mainstage Edition', 'kern', 0, 30, 12, 18400, 'Hardcore', PREVIEW),
    S(880114206, 'bunker-sessions-3', 'Bunker Sessions #3 – 3 Hour Hardcore Marathon Set', 'bunker', 181, 2, 4, 8700, 'Hardcore', { duplicate_of: dupOf('bBunkerSet3') }),
    S(880114207, 'podcast-008', 'Hardfloor Zürich Podcast 008 – Rawstyle Mix', 'zrh', 58, 44, 0, 640, 'Hardstyle'),
    S(880114208, 'terror-tape-9', 'Terror Tape Vol. 9 – 300 BPM Liveset', 'nrg', 42, 10, 21, 4400, 'Uptempo', { status: 'done' }),
    S(880114209, 'oldschool-vinyl-session', 'Oldschool Gabber Vinyl Session 1994–1997 (Continuous Mix)', 'kern', 88, 20, 60, 12800, 'Hardcore'),
    S(880114210, 'hdr-112', 'Hard Dance Radio Show 112 – Guest Mix', 'radio', 119, 0, 3, 1500, 'Unsortiert'),
    S(880114211, 'millennium-anthems', 'Millennium Hardcore Anthems – Megamix', 'radio', 0, 30, 150, 96000, 'Hardcore', PREVIEW),
    S(880114212, 'afterhour-raw', 'Pulsewerk – Afterhour Set (Raw & Uptempo Mix)', 'pulse', 66, 48, 1, 820, 'Hardstyle', { status: 'inbox', source_id: 8 }),
  ];
  VIDEOS.push(...SC_VIDEOS);
  const SC_SEARCH_IDS = SC_VIDEOS.filter((v) => v.status !== 'inbox').map((v) => v.id);
  /* Die flache Suche liefert das Datum nur ungefähr («vor 3 Monaten») -> date_approx. */
  const asSearchHit = (v) => Object.assign(clone(v), v.date_approx == null && v.upload_date && (Date.now() - new Date(v.upload_date)) / 86400000 >= 30 ? { date_approx: true } : {});
  let lastSearch = { query: 'hardcore liveset 2026', effective_query: 'hardcore liveset 2026', genre: null, year: null, ids: SEARCH_IDS, platform: 'youtube' };

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
          platform: 'youtube', url: `https://www.youtube.com/watch?v=${id}`,
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
    { id: 1, type: 'channel', name: 'Kickdrum Collective', url_or_query: 'https://www.youtube.com/@kickdrumcollective', default_genre: 'Hardstyle', enabled: true, auto_download: true, max_entries: 30, last_checked: isoAt(1, 21, 40) },
    { id: 2, type: 'channel', name: 'Gabber Vault', url_or_query: 'https://www.youtube.com/@gabbervault', default_genre: 'Hardcore', enabled: true, auto_download: false, max_entries: null, last_checked: isoAt(1, 21, 41) },
    { id: 3, type: 'channel', name: 'Distortion Unit', url_or_query: 'https://www.youtube.com/@distortionunit/videos', default_genre: 'Uptempo', enabled: true, auto_download: false, max_entries: null, last_checked: isoAt(1, 21, 42) },
    { id: 4, type: 'channel', name: 'Rave Archive CH', url_or_query: 'https://www.youtube.com/@ravearchivech', default_genre: null, enabled: true, auto_download: false, max_entries: 50, last_checked: isoAt(1, 21, 43) },
    { id: 5, type: 'search', name: 'Frenchcore Livesets', url_or_query: 'frenchcore liveset', default_genre: 'Hardcore', enabled: true, auto_download: false, max_entries: 20, last_checked: isoAt(1, 21, 44) },
    { id: 6, type: 'playlist', name: 'Hard Classics Playlist', url_or_query: 'https://www.youtube.com/playlist?list=PLhardclassics', default_genre: 'Hardcore', enabled: false, auto_download: false, max_entries: 30, newest_last: true, last_checked: isoAt(6, 3, 0) },
    { id: 7, type: 'search', name: 'Uptempo Podcasts', url_or_query: 'uptempo podcast mix', default_genre: 'Uptempo', enabled: true, auto_download: false, max_entries: 15, last_checked: isoAt(1, 21, 45) },
    /* SoundCloud: Name ist noch der Vorschlag aus der URL (name_auto) – die nächste Prüfung setzt den echten. */
    { id: 8, type: 'channel', name: 'Pulsewerk Audio', url_or_query: 'https://soundcloud.com/pulsewerk-audio', default_genre: null, enabled: true, auto_download: false, max_entries: null, last_checked: isoAt(1, 21, 46), platform: 'soundcloud', name_auto: true },
    { id: 9, type: 'playlist', name: 'Hardfloor Zürich – Podcast', url_or_query: 'https://soundcloud.com/hardfloor-zrh/sets/podcast', default_genre: 'Hardstyle', enabled: true, auto_download: false, max_entries: 20, last_checked: isoAt(1, 21, 47), platform: 'soundcloud' },
  ];
  SOURCES.forEach((s) => { s.platform = s.platform || 'youtube'; s.name_auto = !!s.name_auto; });
  /* Echte Namen, die eine Prüfung liefert (name_auto). */
  const REAL_NAMES = { 'https://soundcloud.com/pulsewerk-audio': 'Pulsewerk' };
  /* new_count = Treffer dieser Quelle, die noch im Eingang liegen (wie api.get_sources). */
  const sourceView = (x) => Object.assign({ newest_last: false }, clone(x), { new_count: VIDEOS.filter((v) => v.status === 'inbox' && v.source_id === x.id).length });
  let nextSourceId = 10;
  let BLACKLIST = [
    { channel_id: 'UCreact0001', channel_name: 'Reaction Bros', added: isoDay(34) },
    { channel_id: 'UClab00006', channel_name: 'Producer Lab', added: isoDay(12) },
  ];

  /* ---------- Bibliothek ---------- */
  /* Absolute Pfade wie im Backend (Zielordner + Ordnerstruktur aus storage.path_template). */
  const TARGET = 'D:\\Musik\\HCLoader';
  const libPath = (genre, artist, date, title, id) => `${TARGET}\\${genre}\\${artist}\\${date.slice(0, 4)}\\${date} - ${title} [${id}].mp3`;
  const sizeOf = (sec) => +((sec * 320) / 8 / 1024).toFixed(1); // 320 kbps CBR
  const L = (id, title, ch, genre, min, upDays, dlDays, extra) => {
    const duration = min * 60 + (id.charCodeAt(1) % 60), date = isoDay(upDays), artist = CH[ch][1];
    return Object.assign({
      id, title, artist, channel_id: CH[ch][0], genre, duration, upload_date: date, year: +date.slice(0, 4),
      downloaded_at: isoAt(dlDays, dlDays % 3 ? 3 : 20, 10 + (id.charCodeAt(2) % 40)),
      file_path: libPath(genre, artist, date, title, id), size_mb: sizeOf(duration), missing: false, has_cue: id.charCodeAt(3) % 3 !== 0,
      platform: 'youtube',
    }, extra);
  };
  let LIBRARY = [
    L('eEuph0ric26', 'Euphoric Hardstyle Yearmix 2026', 'euph', 'Hardstyle', 95, 40, 2),
    L('gGabbClassM', 'Gabber Classics Marathon – 3 Hours Oldschool', 'vault', 'Hardcore', 180, 31, 2),
    L('tTerrNight1', 'Terror Night Live Recording', 'terror', 'Uptempo', 66, 20, 3),
    L('kRawNation4', 'Raw Nation Podcast #4', 'kick', 'Hardstyle', 61, 26, 3),
    L('rIndoorCls2', 'Indoor Closing Set – Frenchcore Special', 'rave', 'Hardcore', 74, 44, 4),
    L('dOverdrive1', 'Overdrive – 1 Hour Uptempo Mix', 'dist', 'Uptempo', 60, 52, 4),
    L('cIndVol016', 'Industrial Hardcore Mix Vol. 16', 'concrete', 'Hardcore', 63, 70, 5),
    L('zZrhPod0006', 'Hardfloor Zürich Podcast 006', 'zrh', 'Hardstyle', 58, 33, 6),
    L('nNightShift', 'Night Shift FM – Hard Dance Session 12', 'night', 'Unsortiert', 90, 95, 6),
    L('bBunkerSet2', 'Bunker Sessions #2 – Early Rave Set', 'bunker', 'Hardcore', 122, 60, 7),
    L('kRawNation3', 'Raw Nation Podcast #3 – Guest Mix', 'kick', 'Hardstyle', 59, 57, 8, { missing: true, size_mb: 0 }),
    L('dP0dcast041', 'Uptempo Podcast #41 – 240 BPM Special', 'dist', 'Uptempo', 61, 38, 9),
    L('gEarlyTp094', 'Early Hardcore Tape ’94 – Vinyl Rip', 'vault', 'Hardcore', 88, 150, 10),
    L('eEuphSumm26', 'Euphoric Summer Mix 2026', 'euph', 'Hardstyle', 72, 130, 11),
    L('rFrenchVol8', 'Frenchcore Session Vol. 8', 'rave', 'Hardcore', 65, 88, 12),
    L('tSpeedRad08', 'Speedcore Radio Show Episode 8', 'terror', 'Uptempo', 119, 49, 13),
    L('cIndVol015', 'Industrial Hardcore Mix Vol. 15', 'concrete', 'Hardcore', 64, 101, 14),
    L('zZrhPod0005', 'Hardfloor Zürich Podcast 005 – Rawstyle', 'zrh', 'Hardstyle', 60, 64, 15),
    L('bBunkerSet1', 'Bunker Sessions #1 – Opening Night', 'bunker', 'Hardcore', 96, 121, 16),
    L('kXtraRaw054', 'Xtra Raw Liveset – Warehouse Edition', 'kick', 'Hardstyle', 54, 92, 17),
    L('nNightShf11', 'Night Shift FM – Hard Dance Session 11', 'night', 'Unsortiert', 91, 126, 18),
    L('dTerrMega25', 'UPTEMPO TERROR MEGAMIX 2025 – 250+ BPM', 'dist', 'Uptempo', 47, 380, 19),
    L('gMillClass2', 'Millennium Hardcore Classics Vol. 2', 'vault', 'Hardcore', 88, 410, 21),
    L('eReverse001', 'Reverse Bass Anthems Megamix', 'euph', 'Hardstyle', 77, 380, 22),
    L('rMainIndoor', 'Mainstream Hardcore Set – Indoor Edition 2025', 'rave', 'Hardcore', 68, 395, 23),
    L('eEuph0ric25', 'Euphoric Hardstyle Yearmix 2025', 'euph', 'Hardstyle', 98, 405, 24),
    L('tTerrClos25', 'Terrorcore Closing Set – 300 BPM', 'terror', 'Uptempo', 42, 330, 25),
    L('cGabbaNat04', 'Gabba Nation Liveset #4', 'concrete', 'Hardcore', 66, 290, 26),
    L('zWinterWarm', 'Uptempo Warm Up Mix – Winter Edition 2025', 'zrh', 'Uptempo', 38, 350, 27),
    L('kRawPress01', 'Raw Pressure – 90 Minute Rawstyle Liveset', 'kick', 'Hardstyle', 92, 310, 28),
    L('gThunder98x', 'Thunderdome ’98 Tribute Mix', 'vault', 'Hardcore', 70, 520, 30),
    L('bBunkerXmas', 'Bunker 303 – Xmas Hardcore Marathon (4 Hours)', 'bunker', 'Hardcore', 241, 325, 31),
    L('nHardDnc010', 'Night Shift FM – Hard Dance Session 10', 'night', 'Unsortiert', 89, 440, 33),
    L('dOverdrive0', 'Overdrive – Uptempo Mix (First Edition)', 'dist', 'Uptempo', 55, 470, 35),
    L('eClassics08', 'Hardstyle Classics Mix 2008–2010', 'euph', 'Hardstyle', 104, 610, 38),
    L('rAfterhrs24', 'Afterhours Hardcore Set – Recorded Live in Basel', 'rave', 'Hardcore', 93, 700, 41, { missing: true, size_mb: 0 }),
    L('cIndVol012', 'Industrial Hardcore Mix Vol. 12', 'concrete', 'Hardcore', 62, 730, 44),
    L('zZrhPod0001', 'Hardfloor Zürich Podcast 001', 'zrh', 'Hardstyle', 57, 760, 47),
    L('tSpeedRad01', 'Speedcore Radio Show Episode 1', 'terror', 'Uptempo', 118, 790, 52),
    L('gGabber1995', 'Gabber 1995 – Rotterdam Tapes Continuous Mix', 'vault', 'Hardcore', 84, 1150, 60),
  ];
  /* SoundCloud-Downloads: Original behalten (download.keep_original_soundcloud) -> .m4a, Dateiname mit [sc-<id>]. */
  const scLib = (v, dlDays, kbps) => ({
    id: v.id, title: v.title, artist: v.channel_name, channel_id: v.channel_id, genre: v.genre, duration: v.duration, upload_date: v.upload_date, year: +v.upload_date.slice(0, 4),
    downloaded_at: isoAt(dlDays, 20, 26), size_mb: +((v.duration * kbps) / 8 / 1024).toFixed(1), missing: false, has_cue: true, platform: 'soundcloud',
    file_path: `${TARGET}\\${v.genre}\\${v.channel_name}\\${v.upload_date.slice(0, 4)}\\${v.upload_date} - ${v.title} [${v.id.replace(':', '-')}].m4a`,
  });
  LIBRARY.splice(2, 0, scLib(byId('sc:880114208'), 2, 160));
  /* Diese Dateien liegen noch am Ort eines älteren Ablage-Musters: «Neu taggen» verschiebt sie (neuer Pfad in der Antwort). */
  const STALE = { cIndVol016: 'Concrete Noise', gMillClass2: 'Gabber Vault Archive' };
  Object.entries(STALE).forEach(([id, folder]) => {
    const l = LIBRARY.find((x) => x.id === id);
    l.file_path = libPath(l.genre, folder, l.upload_date, l.title, l.id);
  });
  let libraryBackup = null;
  let targetDown = false; // demo.targetDown(): Zielordner nicht erreichbar

  /* ---------- Protokoll ---------- */
  const LOG = [];
  const pushLog = (level, msg, ts) => {
    const line = { ts: ts || new Date().toISOString(), level, msg };
    LOG.push(line);
    if (LOG.length > 500) LOG.shift();
    if (!ts) emit('log', line);
  };
  [
    [1, 20, 2, 'info', 'Watchlist-Prüfung gestartet · 6 Quelle(n)'],
    [1, 20, 3, 'ok', 'Watchlist · Kickdrum Collective: 2 neue(r) Treffer → Eingang'],
    [1, 20, 4, 'ok', 'Watchlist-Prüfung beendet · 6 Quelle(n) · 3 neue Treffer'],
    [1, 20, 14, 'info', '3 Mix(es) zur Warteschlange hinzugefügt'],
    [1, 20, 14, 'info', 'Starte Download: Gabber Classics Marathon – 3 Hours Oldschool'],
    [1, 20, 14, 'debug', 'yt-dlp: format=bestaudio · client=web · PO-Token aus Cache (Alter 12 min)'],
    [1, 20, 31, 'debug', 'ffmpeg: MP3 320 kbps CBR · Gabber Classics Marathon – 3 Hours Oldschool'],
    [1, 20, 32, 'ok', 'Fertig: Gabber Classics Marathon – 3 Hours Oldschool · 421.9 MB'],
    [1, 20, 32, 'debug', 'Throttle: 74 s Pause bis zum nächsten Download'],
    [1, 20, 34, 'info', 'Starte Download: Euphoric Hardstyle Yearmix 2026'],
    [1, 20, 43, 'warn', 'Kapitel: keine Kapitel und keine Zeitstempel in der Beschreibung – keine .cue für «Euphoric Hardstyle Yearmix 2026»'],
    [1, 20, 43, 'ok', 'Fertig: Euphoric Hardstyle Yearmix 2026 · 223.1 MB'],
    [1, 20, 52, 'ok', 'Fertig: Terror Night Live Recording · 155.2 MB'],
    [1, 20, 52, 'info', 'Download-Lauf beendet · 3 geladen · 0 Fehler'],
    [0, 3, 0, 'info', 'Watchlist-Lauf gestartet (headless) · 6 aktive Quellen'],
    [0, 3, 0, 'debug', 'Throttle: sleep_requests=3s · limit_rate=3.0 MB/s'],
    [0, 3, 1, 'info', 'Quelle «Kickdrum Collective»: 30 Einträge flach geprüft, 2 neu'],
    [0, 3, 1, 'info', 'Quelle «Gabber Vault»: beim ersten bekannten Video abgebrochen, 0 neu'],
    [0, 3, 2, 'info', 'Quelle «Distortion Unit»: 1 neu'],
    [0, 3, 3, 'info', 'Quelle «Rave Archive CH»: 2 neu'],
    [0, 3, 4, 'warn', 'Quelle «Hard Classics Playlist» deaktiviert, übersprungen'],
    [0, 3, 4, 'info', 'Filter: 7 Treffer geprüft · 5 bestehen · 2 verworfen (Dauer < 10 min, Exclude «aftermovie»)'],
    [0, 3, 5, 'ok', 'Auto-Download «Raw Nation Podcast #4» fertig · 140.2 MB'],
    [0, 3, 6, 'debug', 'Throttle: 58 s Pause bis zum nächsten Download'],
    [0, 3, 9, 'error', 'Download fehlgeschlagen «Gabba Nation Liveset»: HTTP 403 – nur für Kanalmitglieder'],
    [0, 3, 9, 'ok', 'Watchlist-Lauf beendet · 5 gefunden · 1 geladen · 1 Fehler'],
    [0, 9, 12, 'info', 'HCLoader gestartet · Config %APPDATA%\\HCLoader\\config.yaml'],
    [0, 9, 12, 'info', 'yt-dlp 2026.11.02 · Deno 2.5.4 · ffmpeg 7.1 · bgutil-Plugin 1.3.0'],
    [0, 9, 12, 'ok', 'PO-Token-Provider (Script/Deno) bereit'],
    [0, 9, 12, 'warn', 'Bibliothek: 2 Dateien nicht gefunden (verschoben oder gelöscht?)'],
    [0, 9, 13, 'info', 'yt-dlp und Plugin sind aktuell'],
    [0, 9, 14, 'info', 'Suche «hardcore liveset 2026» · 30 Treffer (flach) · 19 nach Filter'],
    [0, 9, 14, 'debug', 'Throttle: 4/20 Suchen diese Stunde'],
    [0, 9, 14, 'info', 'Starte Download: Xtra Raw Liveset – Reverse Bass Only'],
  ].forEach(([d, h, m, lvl, msg]) => pushLog(lvl, msg, isoAt(d, h, m)));

  /* Läufe: neueste zuerst. Der oberste läuft noch (finished null) – es ist der Lauf der aktiven Warteschlange. */
  const RUNS = [
    { id: 42, kind: 'manual', started: new Date(Date.now() - 60000).toISOString(), finished: null, found: 0, downloaded: 0, errors: 0, note: '' },
    { id: 41, kind: 'headless', started: isoAt(0, 3, 0), finished: isoAt(0, 3, 9), found: 5, downloaded: 1, errors: 1, note: '1 Download fehlgeschlagen (HTTP 403)' },
    { id: 40, kind: 'manual', started: isoAt(1, 20, 14), finished: isoAt(1, 20, 52), found: 0, downloaded: 3, errors: 0, note: '' },
    { id: 39, kind: 'watchlist', started: isoAt(1, 20, 2), finished: isoAt(1, 20, 4), found: 3, downloaded: 0, errors: 0, note: '' },
    { id: 38, kind: 'headless', started: isoAt(1, 3, 0), finished: isoAt(1, 3, 4), found: 0, downloaded: 0, errors: 0, note: '' },
    { id: 37, kind: 'manual', started: isoAt(2, 21, 10), finished: isoAt(2, 21, 10), found: 0, downloaded: 0, errors: 0, note: 'Backoff aktiv bis 09:01 – Rest bleibt in der Warteschlange' },
    { id: 36, kind: 'headless', started: isoAt(2, 3, 0), finished: isoAt(2, 3, 1), found: 0, downloaded: 0, errors: 1, note: 'HTTP 429 – Backoff 6 h bis 09:01, Lauf abgebrochen' },
    { id: 35, kind: 'manual', started: isoAt(3, 18, 40), finished: isoAt(3, 20, 51), found: 0, downloaded: 10, errors: 0, note: 'Limit pro Lauf erreicht (10/10) – Rest bleibt in der Warteschlange' },
    { id: 34, kind: 'watchlist', started: isoAt(3, 18, 30), finished: isoAt(3, 18, 33), found: 12, downloaded: 0, errors: 2, note: '2 Quelle(n) mit Fehler' },
    { id: 33, kind: 'headless', started: isoAt(3, 3, 0), finished: isoAt(3, 3, 22), found: 2, downloaded: 2, errors: 0, note: '' },
    { id: 32, kind: 'headless', started: isoAt(4, 3, 0), finished: isoAt(4, 3, 3), found: 0, downloaded: 0, errors: 0, note: '' },
    { id: 31, kind: 'manual', started: isoAt(5, 19, 5), finished: isoAt(5, 19, 58), found: 0, downloaded: 4, errors: 1, note: '1 Download fehlgeschlagen' },
  ];
  const withDuration = (r) => Object.assign(r, { duration: r.finished ? Math.round((new Date(r.finished) - new Date(r.started)) / 1000) : null });
  RUNS.forEach(withDuration);
  let runSeq = RUNS[0].id;
  const openRun = () => RUNS.find((r) => r.kind === 'manual' && !r.finished);
  /** Lauf der Warteschlange beenden -> Event «run» (wie worker.py am Laufende). */
  const closeRun = (note) => {
    const r = openRun();
    if (!r) return;
    r.finished = new Date().toISOString();
    if (note) r.note = note;
    emit('run', clone(withDuration(r)));
  };

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
    appNext: isoAt(0, 21, 45), // nächste In-App-Prüfung = letzte Prüfung + Intervall
    checking: false, // läuft gerade eine Watchlist-Prüfung?
    hold: null, // Demo: {id, release} – Prüfung hält bei dieser Quelle an
    sourceErrors: {}, // Demo: {id: Meldung} – nächste Prüfung dieser Quelle schlägt fehl
    local: null, // [code, Meldung] – lokale Sperre «pot» / «target» / «error» (nur Demo)
    versions: { ytdlp: '2026.11.02', plugin: '1.3.0' },
    lastBackup: isoAt(5, 19, 2),
    backups: [
      { name: 'hcloader-20261111-190200.db', size_mb: 1.7, created: isoAt(5, 19, 2) },
      { name: 'hcloader-20261028-214410.db', size_mb: 1.5, created: isoAt(19, 21, 44) },
      { name: 'hcloader-20261003-081530.db', size_mb: 1.2, created: isoAt(44, 8, 15) },
    ],
    restart: false, // nach einem Update mit neuer Version: «Neustart nötig»
    sleepLeft: 0, // Sekunden bis zum nächsten Download (Throttle-Pause)
    sleepTotal: 0,
    convertTicks: 0,
  };
  const SLEEP_STEP = 2; // Zeitraffer: ein Tick (450 ms) = 2 s Pause

  const nextTask = () => {
    const [hh, mm] = settings.schedule.task_time.split(':').map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    if (d <= new Date()) d.setDate(d.getDate() + 1);
    return d.toISOString();
  };
  /* Wie core/status.next_check: das frühere von Aufgabe (falls registriert) und In-App-Intervall. */
  const nextCheck = () => {
    const c = [];
    if (state.task.registered) c.push(nextTask());
    if (settings.schedule.in_app_check && state.appNext) c.push(state.appNext);
    return c.length ? c.sort()[0] : null;
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
      next_check: nextCheck(),
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
      if (!openRun()) RUNS.unshift({ id: ++runSeq, kind: 'manual', started: new Date().toISOString(), finished: null, found: 0, downloaded: 0, errors: 0, note: '', duration: null });
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
        id: v.id, title: v.title, artist, channel_id: v.channel_id, genre: v.genre, duration: v.duration, upload_date: v.upload_date, year: +v.upload_date.slice(0, 4),
        downloaded_at: new Date().toISOString(),
        file_path: libPath(v.genre, artist, v.upload_date, v.title, v.id), size_mb: sizeOf(v.duration), missing: false, has_cue: true,
        platform: v.platform || 'youtube',
      });
      if (openRun()) openRun().downloaded++;
      setStatus(v, 'done');
      pushLog('ok', `Fertig: ${v.title} · ${LIBRARY[0].size_mb} MB`);
      if (activeQueue().length && !limitHit()) {
        const th = settings.throttle;
        state.sleepTotal = state.sleepLeft = Math.round(th.sleep_interval + rnd() * Math.max(0, th.max_sleep_interval - th.sleep_interval));
        if (state.sleepLeft) pushLog('debug', `Throttle: ${state.sleepLeft} s Pause bis zum nächsten Download`);
      } else state.sleepLeft = 0;
      if (activeQueue().length && limitHit()) pushLog('warn', 'Download-Limit erreicht – der Rest bleibt in der Warteschlange');
      emit('done', { id: v.id, title: v.title });
      if (!activeQueue().length) closeRun();
      else if (limitHit()) closeRun('Download-Limit erreicht – Rest bleibt in der Warteschlange');
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
      data_dir: '%APPDATA%\\HCLoader', app_dir: 'C:\\Tools\\HCLoader', portable: false, db_path: '%APPDATA%\\HCLoader\\hcloader.db', db_entries: 1234, db_size_mb: 1.8,
      last_backup: state.lastBackup, last_update_check: isoAt(0, 9, 12),
      backups: clone(state.backups), restart_required: state.restart,
    })),
    update_ytdlp() {
      const before = state.versions.ytdlp, fresh = before !== '2026.11.14';
      /* Wie das Backend: jede Zeile der pip-Ausgabe kommt als «log»-Event, die Antwort erst am Schluss. */
      const out = ['> python -m pip install -U "yt-dlp[default]" bgutil-ytdlp-pot-provider'].concat(fresh ? [
        'Requirement already satisfied: yt-dlp[default] in .venv\\lib\\site-packages (2026.11.2)',
        'Collecting yt-dlp[default]',
        '  Downloading yt_dlp-2026.11.14-py3-none-any.whl (3.3 MB)',
        'Collecting bgutil-ytdlp-pot-provider',
        '  Downloading bgutil_ytdlp_pot_provider-1.3.1-py3-none-any.whl (18 kB)',
        'Installing collected packages: yt-dlp, bgutil-ytdlp-pot-provider',
        '  Attempting uninstall: yt-dlp',
        '      Successfully uninstalled yt-dlp-2026.11.2',
        'Successfully installed bgutil-ytdlp-pot-provider-1.3.1 yt-dlp-2026.11.14',
      ] : [
        'Requirement already satisfied: yt-dlp[default] in .venv\\lib\\site-packages (2026.11.14)',
        'Requirement already satisfied: bgutil-ytdlp-pot-provider in .venv\\lib\\site-packages (1.3.1)',
      ]);
      pushLog('info', 'yt-dlp & Plugin werden aktualisiert …');
      out.forEach((line, i) => setTimeout(() => pushLog('info', line), (150 + i * (2100 / out.length)) * speed.factor));
      return later(2400, () => {
        state.versions = { ytdlp: '2026.11.14', plugin: '1.3.1' };
        if (fresh) state.restart = true;
        pushLog('ok', `Aktualisierung fertig: yt-dlp ${state.versions.ytdlp}, Plugin ${state.versions.plugin}${fresh ? ' (neu)' : ' (bereits aktuell)'}`);
        pushStatus();
        return Object.assign({ ok: true, ytdlp: state.versions.ytdlp, plugin: state.versions.plugin, changed: fresh, output: out.join('\n') }, fresh ? { restart_required: true } : {});
      });
    },
    backup_db() {
      return later(700, () => {
        const d = new Date();
        state.lastBackup = d.toISOString();
        const name = `hcloader-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.db`;
        const path = `%APPDATA%\\HCLoader\\backups\\${name}`;
        state.backups.unshift({ name, size_mb: 1.8, created: state.lastBackup });
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
    get_task_status: () => later(60, () => (state.task.unknown ? { registered: null, name: '\\HCLoader\\Watchlist', time: settings.schedule.task_time, next_run: null, error: 'schtasks antwortet nicht (Zeitüberschreitung nach 20 s)', path_mismatch: false, task_command: null } : {
      registered: state.task.registered, name: '\\HCLoader\\Watchlist', time: settings.schedule.task_time,
      next_run: state.task.registered ? nextTask() : null, error: null,
      path_mismatch: !!(state.task.registered && state.task.moved),
      task_command: state.task.registered ? (state.task.moved ? '"E:\\HCLoader\\python\\pythonw.exe" "E:\\HCLoader\\scripts\\run_watchlist.pyw"' : '"C:\\Tools\\HCLoader\\python\\pythonw.exe" "C:\\Tools\\HCLoader\\scripts\\run_watchlist.pyw"') : null,
    })),
    create_task(time) {
      return later(600, () => {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return { ok: false, error: 'Uhrzeit im Format HH:MM erwartet.' };
        state.task.registered = true;
        state.task.moved = false;
        settings.schedule.task_scheduler_enabled = true;
        settings.schedule.task_time = time;
        pushLog('ok', `Aufgabenplanung: \\HCLoader\\Watchlist täglich ${time} angelegt`);
        pushStatus();
        return { ok: true, registered: true, name: '\\HCLoader\\Watchlist', time, next_run: nextTask(), path_mismatch: false, task_command: '"C:\\Tools\\HCLoader\\python\\pythonw.exe" "C:\\Tools\\HCLoader\\scripts\\run_watchlist.pyw"' };
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
          s = { id: nextSourceId++, type: 'channel', name: channelName, url_or_query: `https://www.youtube.com/channel/${channelId}`, default_genre: null, enabled: true, auto_download: false, max_entries: null, last_checked: null };
          SOURCES.push(s);
        }
        return { ok: true, source: sourceView(s) };
      });
    },
    block_channel(channelId, channelName) {
      return later(60, () => {
        if (!BLACKLIST.some((b) => b.channel_id === channelId)) BLACKLIST.push({ channel_id: channelId, channel_name: channelName, added: isoDay(0) });
        return { ok: true };
      });
    },

    /* Watchlist */
    get_sources: () => later(40, () => SOURCES.map(sourceView)),
    save_source(src) {
      return later(120, () => {
        const errors = {};
        const url = String(src.url_or_query || '').trim();
        const name = String(src.name || '').trim();
        if (!['channel', 'playlist', 'search'].includes(src.type)) errors.type = 'Unbekannter Typ.';
        if (!name) errors.name = 'Name fehlt.';
        else if (SOURCES.some((x) => x.id !== src.id && x.name.toLowerCase() === name.toLowerCase())) errors.name = 'Eine Quelle mit diesem Namen gibt es bereits.';
        if (!url) errors.url_or_query = src.type === 'search' ? 'Suchbegriff fehlt.' : 'URL fehlt.';
        else if (src.type !== 'search' && !/^https?:\/\/(www\.|music\.)?youtube\.com\//.test(url)) errors.url_or_query = 'YouTube-URL erwartet (https://www.youtube.com/…).';
        else if (src.type === 'channel' && /\/(playlists|releases|featured|shorts|community|podcasts|about)\/?$/.test(url)) errors.url_or_query = 'Nur die Kanal-URL selbst, /videos oder /streams – andere Tabs werden nicht unterstützt.';
        else if (src.type === 'playlist' && !/[?&]list=[\w-]+/.test(url)) errors.url_or_query = 'Playlist-URL erwartet (…/playlist?list=…).';
        const cap = src.type === 'search' ? 100 : 200; // leer (null) = Standard schedule.entries_per_source
        if (src.max_entries != null && !(Number.isInteger(src.max_entries) && src.max_entries >= 1 && src.max_entries <= cap)) errors.max_entries = `Ganze Zahl zwischen 1 und ${cap} erwartet (leer = Standard).`;
        if (src.default_genre && !settings.genres.items.some((g) => g.name === src.default_genre)) errors.default_genre = 'Dieses Genre gibt es nicht (mehr).';
        if (Object.keys(errors).length) return { ok: false, errors };
        const fields = { type: src.type, name, url_or_query: url, default_genre: src.default_genre || null, enabled: !!src.enabled, auto_download: !!src.auto_download, max_entries: src.max_entries == null ? null : src.max_entries, newest_last: src.type === 'playlist' && !!src.newest_last };
        let s = SOURCES.find((x) => x.id === src.id);
        if (s) Object.assign(s, fields);
        else { s = Object.assign({ id: nextSourceId++, last_checked: null }, fields); SOURCES.push(s); }
        return { ok: true, source: sourceView(s) };
      });
    },
    delete_source(id) {
      return later(60, () => { SOURCES = SOURCES.filter((s) => s.id !== id); return { ok: true }; });
    },
    check_sources(ids) {
      if (state.backoff.active) return later(30, { ok: false, error: 'Backoff aktiv – die Watchlist-Prüfung ist gesperrt.' });
      if (state.checking) return later(30, { ok: false, error: 'Die Watchlist wird bereits geprüft.' });
      const list = SOURCES.filter((s) => s.enabled && (!ids || ids.includes(s.id)));
      if (!list.length) return later(30, { ok: true, started: 0 });
      state.checking = true;
      pushLog('info', `Watchlist-Prüfung gestartet · ${list.length} Quelle(n)`);
      (async () => {
        let found = 0, errors = 0, queued = 0;
        for (const s of list) {
          if (!SOURCES.includes(s)) continue; // inzwischen gelöscht
          emit('source', { id: s.id, checking: true });
          await later(900);
          if (state.hold && state.hold.id === s.id) await new Promise((r) => { state.hold.release = r; });
          const err = state.sourceErrors[s.id];
          if (err) {
            delete state.sourceErrors[s.id];
            errors++;
            pushLog('error', `Watchlist · ${s.name}: ${err}`);
            emit('source', { id: s.id, checking: false, error: err });
            continue;
          }
          const hits = FRESH[s.id] || [];
          delete FRESH[s.id];
          hits.forEach((v) => {
            Object.assign(v, { source_id: s.id, status: 'inbox' });
            if (s.default_genre) v.genre = s.default_genre;
            VIDEOS.push(v);
            if (s.auto_download) {
              state.queue.push({ id: v.id, state: 'waiting', phase: 'waiting', pct: 0, speed: 0, eta: 0, error: null });
              v.status = 'queued';
              queued++;
            }
          });
          found += hits.length;
          s.last_checked = new Date().toISOString();
          if (hits.length) pushLog('ok', `Watchlist · ${s.name}: ${hits.length} neue(r) Treffer${s.auto_download ? ' → Warteschlange' : ' → Eingang'}`);
          emit('source', { id: s.id, checking: false, last_checked: s.last_checked, new_count: sourceView(s).new_count });
          if (hits.length) { if (queued) emit('queue', {}); pushStatus(); }
        }
        state.checking = false;
        if (!ids) state.appNext = new Date(Date.now() + settings.schedule.watchlist_interval_hours * 3600000).toISOString();
        const run = { id: ++runSeq, kind: 'watchlist', started: new Date(Date.now() - list.length * 900).toISOString(), finished: new Date().toISOString(), found, downloaded: 0, errors, note: errors ? `${errors} Quelle(n) mit Fehler` : '' };
        RUNS.unshift(withDuration(run));
        emit('run', clone(run));
        pushLog(errors ? 'warn' : 'ok', `Watchlist-Prüfung beendet · ${list.length} Quelle(n) · ${found} neue Treffer${errors ? ` · ${errors} Fehler` : ''}`);
        emit('watchlist_done', { checked: list.length, found });
        pushStatus();
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
    /* filters (optional, Backend): die UI ruft ohne Argument auf und filtert selbst. */
    get_library: () => later(40, () => clone(LIBRARY).map((l) => (targetDown ? Object.assign(l, { missing: false, unknown: true, size_mb: 0, has_cue: false }) : l))),
    get_library_status: () => later(20, () => ({ target_ok: !targetDown, target: TARGET })),
    open_folder(id) {
      return later(30, () => {
        const l = LIBRARY.find((x) => x.id === id);
        return l ? { ok: true } : { ok: false, error: 'Keine Datei zu diesem Eintrag' };
      });
    },
    retag(id) {
      return later(900, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l) return { ok: false, error: 'Eintrag nicht gefunden' };
        if (l.missing) return { ok: false, error: `Datei fehlt: ${l.file_path}` };
        const moved = !!STALE[id];
        if (moved) {
          delete STALE[id];
          l.file_path = libPath(l.genre, l.artist, l.upload_date, l.title, l.id);
          pushLog('info', `Verschoben (Ablage-Muster): ${l.file_path}`);
        }
        pushLog('ok', `Neu getaggt: ${l.title}`);
        return { ok: true, path: l.file_path, moved, genre: l.genre, cue: !!l.has_cue, sidecar: true };
      });
    },
    delete_library_item(id, deleteFile) {
      return later(160, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l) return { ok: false, error: 'Eintrag nicht gefunden' };
        if (targetDown) return { ok: false, error: `Zielordner nicht erreichbar: ${TARGET}`, unreachable: true };
        const file = deleteFile !== false && !l.missing;
        LIBRARY = LIBRARY.filter((x) => x.id !== id);
        pushLog('warn', file ? `Gelöscht: ${l.file_path}` : `Eintrag entfernt (Datei bleibt bzw. fehlte): ${l.title}`);
        const v = byId(id);
        if (v) setStatus(v, 'ignored'); // wird nicht erneut geladen
        const name = l.file_path.split('\\').pop();
        return { ok: true, deleted: file ? [name].concat(l.has_cue ? [name.replace(/\.mp3$/, '.cue')] : []) : [] };
      });
    },

    /* Protokoll */
    /* filters (optional, Backend): die UI ruft ohne Argument auf und filtert selbst. */
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
      /** Zielordner nicht erreichbar (Banner, «Eintrag entfernen» gesperrt); on = false hebt auf. */
      targetDown(on) { targetDown = on !== false; },
      taskUnknown(on) { state.task.unknown = on !== false; },
      /** Registrierte Aufgabe zeigt auf einen alten App-Ordner (App verschoben); on = false hebt auf. */
      taskMoved(on) { state.task.moved = on !== false; if (state.task.moved) { state.task.registered = true; settings.schedule.task_scheduler_enabled = true; } },
      /** Leere Bibliothek zeigen (on = false stellt sie wieder her). */
      libraryEmpty(on) {
        if (on === false) { if (libraryBackup) LIBRARY = libraryBackup; libraryBackup = null; return; }
        if (!libraryBackup) libraryBackup = LIBRARY;
        LIBRARY = [];
      },
      /** Einen beendeten Lauf melden (Event «run»), z.B. demo.run({kind: 'headless', found: 4, downloaded: 2}). */
      run(fields) {
        const now = Date.now();
        const run = Object.assign({ id: ++runSeq, kind: 'headless', started: new Date(now - 4 * 60000).toISOString(), finished: new Date(now).toISOString(), found: 0, downloaded: 0, errors: 0, note: '' }, fields);
        RUNS.unshift(withDuration(run));
        emit('run', clone(run));
        return run;
      },
      /** Eine Protokollzeile erzeugen (Event «log»). */
      log(level, msg) { pushLog(level || 'info', msg || 'Testzeile'); },
      /** Watchlist-Prüfung hält bei dieser Quelle im Zustand «prüft …» an, bis checkRelease(). */
      checkHold(id) { state.hold = { id, release: null }; },
      checkRelease() { const h = state.hold; state.hold = null; if (h && h.release) h.release(); },
      /** Die nächste Prüfung dieser Quelle schlägt mit der Meldung fehl. */
      sourceError(id, msg) { state.sourceErrors[id] = msg || 'Kanal nicht gefunden (HTTP 404)'; },
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
