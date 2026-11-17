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
    general: { language: 'en', start_view: 'discover', log_level: 'INFO', confirm_delete: true },
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
      max_title_length: 120, max_path_length: 240, artist_from_title: false, album_from_edition: true,
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
    festivals: { detect: true, min_confidence: 0.65, year_from_upload_date: true, match_description: true, extra_stages: [], extra_set_types: [] },
    schedule: { watchlist_interval_hours: 24, in_app_check: true, task_scheduler_enabled: false, task_time: '03:00', entries_per_source: 30 },
    watchlist: { backfill_max_entries: 2000, backfill_requests_per_hour: 120 },
    appearance: { reduce_effects: false, scanlines: true, pulse_bpm: 200 },
    maintenance: { check_updates_on_start: true, check_app_updates_on_start: true, apply_update_on_exit: true, update_repo: 'kellerict/HCLoader' },
  };
  let settings = clone(DEFAULTS);
  /* Language survives the UI reload after a language change (sessionStorage); ?lang=xx wins (screenshots). */
  const LANG_KEY = 'hc.mock.language';
  const langChoices = () => ['auto', ...HC.i18n.SUPPORTED];
  (function initLanguage() {
    let lang = null;
    try { lang = new URLSearchParams(location.search).get('lang') || sessionStorage.getItem(LANG_KEY); } catch (e) { /* file:// without storage */ }
    if (lang && langChoices().includes(lang)) settings.general.language = lang;
  })();
  const rememberLanguage = () => { try { sessionStorage.setItem(LANG_KEY, settings.general.language); } catch (e) { /* egal */ } };
  /** Like the backend: 'auto' resolved (here from navigator.languages). */
  const resolvedLanguage = () => HC.i18n.resolve(settings.general.language);

  /* Stellvertreter für die pydantic-Validierung */
  const M = {
    num: 'Number expected.',
    int: 'Whole number expected.',
    range: (a, b) => `Value must be between ${a} and ${b}.`,
    min: (a) => `Value must be at least ${a}.`,
    oneOf: (l) => `Allowed: ${l.map((x) => x || '(empty)').join(', ')}.`,
  };
  const RULES = {
    'general.language': { oneOf: ['auto', ...HC.i18n.SUPPORTED] },
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
    'storage.album_from_edition': { bool: 1 },
    'festivals.detect': { bool: 1 },
    'festivals.min_confidence': { min: 0.3, max: 1 },
    'festivals.year_from_upload_date': { bool: 1 },
    'festivals.match_description': { bool: 1 },
    'festivals.extra_stages': { list: 1 },
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
    'watchlist.backfill_max_entries': { int: 1, min: 100, max: 10000 },
    'watchlist.backfill_requests_per_hour': { int: 1, min: 10, max: 600 },
    'appearance.reduce_effects': { bool: 1 },
    'appearance.scanlines': { bool: 1 },
    'appearance.pulse_bpm': { int: 1, min: 60, max: 300 },
    'maintenance.check_updates_on_start': { bool: 1 },
    'maintenance.check_app_updates_on_start': { bool: 1 },
    'maintenance.apply_update_on_exit': { bool: 1 },
    'maintenance.update_repo': { str: 1, required: 1 },
    'soundcloud.enabled': { bool: 1 },
    'player.mode': { oneOf: ['internal', 'external'] },
  };
  /* Abschnitt «soundcloud» erbt die Schonungs-Felder (gleiche Grenzen und Meldungen wie «throttle»). */
  Object.keys(RULES).filter((k) => k.startsWith('throttle.')).forEach((k) => { RULES[k.replace('throttle.', 'soundcloud.')] = RULES[k]; });
  const PLACEHOLDERS = ['genre', 'artist', 'channel', 'year', 'date', 'title', 'id', 'platform', 'festival', 'event_year', 'stage'];
  const MIN_YEAR = 2005;

  /* Set-Arten: Code + sprachneutrales Label (TXXX:SET_TYPE), wie app/core/festivals.py */
  const SET_TYPES = [['live_set', 'Live Set'], ['closing_ceremony', 'Closing Ceremony'], ['opening', 'Opening'], ['endshow', 'Endshow'], ['full_show', 'Full Show'],
    ['warm_up', 'Warm-Up'], ['anthem', 'Anthem'], ['episode', 'Episode']].map(([code, label]) => ({ code, label }));

  function validate(v) {
    const errors = {};
    const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), v);
    Object.entries(RULES).forEach(([key, r]) => {
      const val = get(key);
      const fail = (msg) => { errors[key] = msg; };
      if (r.bool) { if (typeof val !== 'boolean') fail('Yes/no expected.'); return; }
      if (r.oneOf) { if (!r.oneOf.includes(val)) fail(M.oneOf(r.oneOf)); return; }
      if (r.list) {
        if (!Array.isArray(val)) return fail('List expected.');
        if (r.regex) {
          for (const p of val) {
            try { new RegExp(p); } catch (e) { return fail(`Invalid regular expression: ${p}`); }
          }
        }
        return;
      }
      if (r.str) { if (typeof val !== 'string' || (r.required && !val.trim())) fail('Must not be empty.'); return; }
      if (r.time) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(val || '')) fail('Time expected as HH:MM.'); return; }
      if (typeof val !== 'number' || !isFinite(val)) return fail(M.num);
      if (r.int && !Number.isInteger(val)) return fail(M.int);
      if (r.min != null && r.max != null && (val < r.min || val > r.max)) return fail(M.range(r.min, r.max));
      if (r.min != null && val < r.min) return fail(M.min(r.min));
    });
    const f = v.filters || {}, s = v.storage || {};
    ['throttle', 'soundcloud'].forEach((sec) => {
      const x = v[sec] || {};
      if (!errors[`${sec}.max_sleep_interval`] && !errors[`${sec}.sleep_interval`] && x.max_sleep_interval < x.sleep_interval)
        errors[`${sec}.max_sleep_interval`] = `Must be at least the minimum (${x.sleep_interval} s).`;
      if (!errors[`${sec}.backoff_max_hours`] && !errors[`${sec}.backoff_initial_hours`] && x.backoff_max_hours < x.backoff_initial_hours)
        errors[`${sec}.backoff_max_hours`] = `Must be at least the initial value (${x.backoff_initial_hours} h).`;
    });
    if (!errors['filters.max_duration'] && !errors['filters.min_duration'] && f.max_duration > 0 && f.max_duration < f.min_duration)
      errors['filters.max_duration'] = 'Maximum is below the minimum length (0 = unlimited).';
    if (!errors['storage.path_template']) {
      const bad = (s.path_template.match(/\{([^}]*)\}/g) || []).map((x) => x.slice(1, -1)).filter((x) => !PLACEHOLDERS.includes(x));
      if (bad.length) errors['storage.path_template'] = `Unknown placeholder: {${bad[0]}}`;
      else if (!s.path_template.includes('{id}')) errors['storage.path_template'] = 'The placeholder {id} must be included (unique file names).';
    }
    /* Jahr-/Zeitraum-Filter (docs/settings-schema.md, Phase 3) */
    const yNow = new Date().getFullYear(), isDay = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(new Date(x));
    if (!Number.isInteger(f.upload_year)) errors['filters.upload_year'] = M.int;
    else if (f.upload_year !== 0 && (f.upload_year < MIN_YEAR || f.upload_year > yNow)) errors['filters.upload_year'] = `Year must be between ${MIN_YEAR} and ${yNow}.`;
    else if (f.upload_year === 0 && f.upload_period === 'year') errors['filters.upload_year'] = 'Year missing (required for the period “Specific year”).';
    ['upload_from', 'upload_to'].forEach((k) => {
      if (typeof f[k] !== 'string' || (f[k] && !isDay(f[k]))) errors[`filters.${k}`] = 'Invalid date (format YYYY-MM-DD).';
    });
    if (!errors['filters.upload_from'] && !errors['filters.upload_to'] && f.upload_from && f.upload_to && f.upload_to < f.upload_from)
      errors['filters.upload_to'] = 'To date is before the from date.';
    const items = (v.genres && v.genres.items) || [];
    const seen = new Set();
    items.forEach((g, i) => {
      const name = String(g.name || '').trim();
      if (!name) errors[`genres.items.${i}.name`] = 'Name missing.';
      else if (seen.has(name.toLowerCase())) errors[`genres.items.${i}.name`] = `Name “${name}” is used twice.`;
      seen.add(name.toLowerCase());
      if (!/^#[0-9a-f]{6}$/i.test(g.color || '')) errors[`genres.items.${i}.color`] = 'Colour expected as #rrggbb.';
    });
    if (!seen.has('unsortiert')) errors['genres.items'] = 'The genre “Unsortiert” must exist.';
    const fs = v.festivals || {};
    (Array.isArray(fs.extra_stages) ? fs.extra_stages : []).forEach((x) => { if (String(x).length > 40) errors['festivals.extra_stages'] = `Stage name too long: ${String(x).slice(0, 40)}`; });
    if (!Array.isArray(fs.extra_set_types)) errors['festivals.extra_set_types'] = 'List expected.';
    else fs.extra_set_types.forEach((x, i) => {
      if (!String((x && x.keyword) || '').trim()) errors[`festivals.extra_set_types.${i}.keyword`] = 'Keyword missing.';
      else if (!SET_TYPES.some((st) => st.code === x.set_type)) errors[`festivals.extra_set_types.${i}.set_type`] = `Unknown set type: ${x.set_type}`;
    });
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
    qd: ['UCqdan0013', 'Q-dance'], aod: ['UCaodn0014', 'Art of Dance'], b2s: ['UCb2s00015', 'b2s'],
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
  const PREVIEW = { preview: true, filter_reason: 'Preview only (Go+)' };
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
  /* v0.4.0 «Alles einlesen»: bekannte Grösse der Liste (letzte Prüfung) und Zustand pro Quelle. */
  const ITEM_COUNT = { 2: 486, 6: 312, 9: 74 };
  const BACKFILLS = {}; // source_id -> Backfill (wie core/backfill.view)
  const bfTimers = {};
  /* new_count = Treffer dieser Quelle, die noch im Eingang liegen (wie api.get_sources). */
  const sourceView = (x) => Object.assign({ newest_last: false }, clone(x), {
    new_count: VIDEOS.filter((v) => v.status === 'inbox' && v.source_id === x.id).length,
    item_count: ITEM_COUNT[x.id] == null ? null : ITEM_COUNT[x.id],
    backfill: BACKFILLS[x.id] ? bfView(x.id) : null,
  });
  function bfView(id) {
    const b = BACKFILLS[id], cap = settings.watchlist.backfill_max_entries;
    return Object.assign({}, b, { source_id: id, cap, target: b.total == null ? null : Math.min(b.total, cap) });
  }
  const bfEmit = (id) => emit('backfill', BACKFILLS[id] ? bfView(id) : { source_id: id, state: 'none' });
  /* Simulation: eine «Seite» pro Tick, ca. 1 von 6 Einträgen landet im Eingang. */
  function bfRun(id) {
    clearTimeout(bfTimers[id]);
    const s = SOURCES.find((x) => x.id === id), b = BACKFILLS[id];
    if (!s || !b || !['pending', 'running'].includes(b.state)) return;
    const others = Object.entries(BACKFILLS).some(([k, x]) => +k !== id && x.state === 'running');
    if (others) { bfTimers[id] = setTimeout(() => bfRun(id), 1500 * speed.factor); return; } // eins nach dem anderen
    if (boOf(s.platform).active) { b.state = 'pending'; b.note = `Backoff (${s.platform === 'soundcloud' ? 'SoundCloud' : 'YouTube'}) until ${hhmm(boOf(s.platform).until)} – continues automatically`; bfEmit(id); return; }
    if (b.state === 'pending') pushLog('info', b.position ? `Read everything: ${s.name} – continuing after ${b.position} entries` : `Read everything: ${s.name} – reading up to ${settings.watchlist.backfill_max_entries} entries page by page`);
    b.state = 'running';
    b.note = null;
    const page = s.platform === 'soundcloud' ? 200 : s.type === 'playlist' ? 100 : 30;
    const end = Math.min(b.total == null ? settings.watchlist.backfill_max_entries : b.total, settings.watchlist.backfill_max_entries);
    const got = Math.min(page, end - b.position);
    b.position += got;
    b.requests += 1;
    b.added += Math.round(got / 6);
    b.found += Math.round(got / 3);
    b.updated = new Date().toISOString();
    if (b.position >= end) {
      Object.assign(b, { state: 'done', finished: new Date().toISOString(), total: b.total == null ? b.position : b.total });
      pushLog('ok', `Read everything: ${s.name} finished – ${b.position} entries read, ${b.added} new in the inbox`);
      pushStatus();
    } else bfTimers[id] = setTimeout(() => bfRun(id), 700 * speed.factor);
    bfEmit(id);
  }
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
      platform: 'youtube', thumbnail: null, genre_manual: false,
    }, extra);
  };
  let LIBRARY = [
    L('eEuph0ric26', 'Euphoric Hardstyle Yearmix 2026', 'euph', 'Hardstyle', 95, 40, 2),
    L('gGabbClassM', 'Gabber Classics Marathon – 3 Hours Oldschool', 'vault', 'Hardcore', 180, 31, 2),
    L('tTerrNight1', 'Terror Night Live Recording', 'terror', 'Uptempo', 66, 20, 3),
    L('kRawNation4', 'Raw Nation Podcast #4', 'kick', 'Hardstyle', 61, 26, 3, { genre_manual: true }),
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
    downloaded_at: isoAt(dlDays, 20, 26), size_mb: +((v.duration * kbps) / 8 / 1024).toFixed(1), missing: false, has_cue: true, platform: 'soundcloud', thumbnail: null, genre_manual: false,
    file_path: `${TARGET}\\${v.genre}\\${v.channel_name}\\${v.upload_date.slice(0, 4)}\\${v.upload_date} - ${v.title} [${v.id.replace(':', '-')}].m4a`,
  });
  LIBRARY.splice(2, 0, scLib(byId('sc:880114208'), 2, 160));
  /* Diese Dateien liegen noch am Ort eines älteren Ablage-Musters: «Neu taggen» verschiebt sie (neuer Pfad in der Antwort). */
  const STALE = { cIndVol016: 'Concrete Noise', gMillClass2: 'Gabber Vault Archive' };
  Object.entries(STALE).forEach(([id, folder]) => {
    const l = LIBRARY.find((x) => x.id === id);
    l.file_path = libPath(l.genre, folder, l.upload_date, l.title, l.id);
  });

  /* ---------- Festivals & Serien (v0.3.0, docs/bridge-api.md) ---------- */
  const STAGES = ['RED', 'BLUE', 'BLACK', 'UV', 'YELLOW', 'INDIGO', 'MAGENTA', 'GOLD', 'SILVER', 'PURPLE', 'GREEN', 'ORANGE', 'WHITE', 'PINK', 'Mainstage'];
  let seriesSeq = 0;
  const SR = (key, name, kind, aliases, extra) => Object.assign({
    id: ++seriesSeq, key, name, kind, aliases, weak_aliases: [], channels: [], variants: [], default_genre: null,
    builtin: true, user_modified: false, enabled: true, hidden: false,
  }, extra);
  const SERIES_BUILTIN = [
    SR('defqon1', 'Defqon.1', 'festival', ['DQ1', 'Defqon 1', 'Defqon.1 Weekend Festival'], { channels: ['Q-dance'], variants: [{ name: 'Australia', aliases: ['Sydney'] }, { name: 'Chile', aliases: [] }, { name: 'at Home', aliases: [] }] }),
    SR('qlimax', 'Qlimax', 'festival', ['Qlimax The Source'], { channels: ['Q-dance'], default_genre: 'Hardstyle' }),
    SR('decibel', 'Decibel outdoor', 'festival', ['Decibel Outdoor Festival', 'Decibel'], { channels: ['b2s'] }),
    SR('intents', 'Intents Festival', 'festival', ['Intents']),
    SR('dominator', 'Dominator', 'festival', ['Dominator Festival'], { channels: ['Art of Dance'], default_genre: 'Hardcore' }),
    SR('moh', 'Masters of Hardcore', 'festival', ['MOH'], { channels: ['Art of Dance'], default_genre: 'Hardcore' }),
    SR('thunderdome', 'Thunderdome', 'festival', ['Thunderdome Die Hard'], { default_genre: 'Hardcore' }),
    SR('reverze', 'Reverze', 'festival', []),
    SR('hardbass', 'Hard Bass', 'festival', [], { weak_aliases: ['Hard Bass'], channels: ['b2s'] }),
    SR('qbase', 'Q-BASE', 'festival', ['QBASE', 'Q Base'], { channels: ['Q-dance'] }),
    SR('supremacy', 'Supremacy', 'festival', [], { weak_aliases: ['Supremacy'], channels: ['Art of Dance'] }),
    SR('rebirth', 'REBiRTH Festival', 'festival', [], { weak_aliases: ['Rebirth'] }),
    SR('groundzero', 'Ground Zero Festival', 'festival', ['Ground Zero'], { default_genre: 'Hardcore' }),
    SR('hardshock', 'Hardshock Festival', 'festival', ['Hardshock'], { default_genre: 'Hardcore' }),
    SR('qdanceradio', 'Q-dance Radio', 'radio', ['Qdance Radio', 'Q-dance presents'], { channels: ['Q-dance'] }),
    SR('hardstylemag', 'Hardstyle Mag Podcast', 'podcast', ['Hardstyle Mag']),
  ];
  let SERIES = clone(SERIES_BUILTIN);
  SERIES.push(SR('u-hardfloor-zurich-podcast', 'Hardfloor Zürich Podcast', 'podcast', ['Hardfloor Zurich Podcast'], { builtin: false, channels: ['Hardfloor Zürich'], default_genre: 'Hardstyle' }));
  SERIES.find((x) => x.key === 'thunderdome').aliases.push('Thunderdome Tribute');
  SERIES.find((x) => x.key === 'thunderdome').user_modified = true;
  const EDITIONS = [];
  const seriesByKey = (key) => SERIES.find((x) => x.key === key);
  const seriesById = (id) => SERIES.find((x) => x.id === +id);
  function editionOf(sid, year, variant) {
    const v = variant || '';
    let e = EDITIONS.find((x) => x.series_id === sid && x.event_year === (year || null) && x.variant === v);
    if (!e) EDITIONS.push((e = { id: EDITIONS.length + 1, series_id: sid, event_year: year || null, variant: v }));
    return e;
  }
  /** Festival-Objekt eines Eintrags (Form wie LibraryItem.festival). */
  function festivalOf(edition, o) {
    const s = seriesById(edition.series_id), x = o || {};
    const festival = [s.name, edition.variant].filter(Boolean).join(' ');
    return {
      edition_id: edition.id, series_id: s.id, series_key: s.key, series: s.name, kind: s.kind, event_year: edition.event_year, variant: edition.variant,
      edition: [festival, edition.event_year].filter(Boolean).join(' '), festival,
      stage: x.stage || null, set_type: x.set_type || null, episode: x.episode || null, manual: !!x.manual, confidence: x.manual ? null : x.confidence == null ? 0.92 : x.confidence,
    };
  }
  const fest = (key, year, o) => festivalOf(editionOf(seriesByKey(key).id, year, o && o.variant), o);
  /* Sets: [id, Titel, Kanal, Genre, Minuten, Serie, Jahr, Bühne, Set-Art, Zusatz] – das Upload-Datum liegt im Sommer des Jahres. */
  const FL = (id, title, ch, genre, min, key, year, stage, setType, o) => {
    const x = o || {}, date = `${year}-${x.md || '07-02'}`, duration = min * 60 + (id.charCodeAt(1) % 60), artist = CH[ch][1];
    const dl = 1 + [...id].reduce((n, c) => (n * 7 + c.charCodeAt(0)) % 997, 3) % 34;
    return Object.assign({
      id, title, artist, channel_id: CH[ch][0], genre, duration, upload_date: date, year,
      downloaded_at: isoAt(dl, dl % 3 ? 21 : 9, 5 + (id.charCodeAt(3) % 50)),
      file_path: libPath(genre, artist, date, title, id), size_mb: sizeOf(duration), missing: false, has_cue: id.charCodeAt(3) % 4 !== 0,
      platform: 'youtube', thumbnail: null, genre_manual: false,
      festival: x.assign === false ? null : fest(key, year, { stage, set_type: setType, variant: x.variant, episode: x.episode, manual: x.manual, confidence: x.confidence }),
      festival_suggestion: null,
    }, x.extra);
  };
  LIBRARY.push(
    FL('qDq24RedCls', 'Defqon.1 2024 | RED | The Closing Ceremony', 'qd', 'Hardstyle', 34, 'defqon1', 2024, 'RED', 'closing_ceremony'),
    FL('qDq24RedSZP', 'Sub Zero Project | Defqon.1 2024 | RED', 'qd', 'Hardstyle', 61, 'defqon1', 2024, 'RED', 'live_set'),
    FL('qDq24RedEnd', 'Defqon.1 2024 | RED | Saturday Endshow', 'qd', 'Hardstyle', 22, 'defqon1', 2024, 'RED', 'endshow'),
    FL('qDq24BluRwx', 'Rebelion | Defqon.1 2024 | BLUE', 'qd', 'Hardstyle', 59, 'defqon1', 2024, 'BLUE', 'live_set'),
    FL('qDq24BluVer', 'Vertile | Defqon.1 2024 | BLUE', 'qd', 'Hardstyle', 58, 'defqon1', 2024, 'BLUE', 'live_set'),
    FL('qDq24BlkDrS', 'Dr. Peacock | Defqon.1 2024 | BLACK', 'qd', 'Hardcore', 60, 'defqon1', 2024, 'BLACK', 'live_set'),
    FL('qDq24BlkAng', 'Angerfist | Defqon.1 2024 | BLACK', 'qd', 'Hardcore', 62, 'defqon1', 2024, 'BLACK', 'live_set', { manual: true }),
    FL('qDq24PwrHr1', 'Defqon.1 2024 | POWER HOUR', 'qd', 'Hardstyle', 63, 'defqon1', 2024, null, 'full_show'),
    FL('qDq23RedHhz', 'Headhunterz | Defqon.1 2023 | RED', 'qd', 'Hardstyle', 60, 'defqon1', 2023, 'RED', 'live_set'),
    FL('qDq23RedCls', 'Defqon.1 2023 | RED | The Closing Ceremony', 'qd', 'Hardstyle', 31, 'defqon1', 2023, 'RED', 'closing_ceremony'),
    FL('qDq23BluDst', 'D-Sturb | Defqon.1 2023 | BLUE', 'qd', 'Hardstyle', 57, 'defqon1', 2023, 'BLUE', 'live_set'),
    FL('qDq23BlkMhP', 'Miss K8 | Defqon.1 2023 | BLACK', 'qd', 'Hardcore', 59, 'defqon1', 2023, 'BLACK', 'live_set'),
    FL('qDq22RedOpn', 'Defqon.1 2022 | RED | The Opening Ceremony', 'qd', 'Hardstyle', 28, 'defqon1', 2022, 'RED', 'opening'),
    FL('qDq22BluWar', 'Warface | Defqon.1 2022 | BLUE', 'qd', 'Hardstyle', 60, 'defqon1', 2022, 'BLUE', 'live_set'),
    FL('qDq22BlkPrt', 'Partyraiser | Defqon.1 2022 | BLACK', 'qd', 'Uptempo', 58, 'defqon1', 2022, 'BLACK', 'live_set'),
    FL('qDq21HomeRd', 'Defqon.1 at Home 2021 | RED | Saturday Livestream', 'qd', 'Hardstyle', 182, 'defqon1', 2021, 'RED', 'full_show', { variant: 'at Home' }),
    FL('qDq20HomeBk', 'Defqon.1 at Home 2020 | BLACK | Full Stream', 'qd', 'Hardcore', 176, 'defqon1', 2020, 'BLACK', 'full_show', { variant: 'at Home' }),
    FL('qDq19RedCls', 'Defqon.1 2019 | RED | The Closing Ceremony', 'qd', 'Hardstyle', 33, 'defqon1', 2019, 'RED', 'closing_ceremony'),
    FL('qDq19RedCoo', 'Coone | Defqon.1 2019 | RED', 'qd', 'Hardstyle', 59, 'defqon1', 2019, 'RED', 'live_set'),
    FL('qDq19BlkNSD', 'N-Vitral | Defqon.1 2019 | BLACK', 'qd', 'Hardcore', 57, 'defqon1', 2019, 'BLACK', 'live_set'),
    FL('qQlx24Full1', 'Qlimax 2024 | Rise of the Celestials | Full Show', 'qd', 'Hardstyle', 372, 'qlimax', 2024, null, 'full_show', { md: '11-25' }),
    FL('qQlx23Anth1', 'Qlimax 2023 | The Anthem Show', 'qd', 'Hardstyle', 18, 'qlimax', 2023, null, 'anthem', { md: '11-27' }),
    FL('qQlx23Ran-D', 'Ran-D | Qlimax 2023', 'qd', 'Hardstyle', 58, 'qlimax', 2023, null, 'live_set', { md: '11-27' }),
    FL('qQlx22SndR', 'Sound Rush | Qlimax 2022 | The Reawakening', 'qd', 'Hardstyle', 55, 'qlimax', 2022, null, 'live_set', { md: '11-28' }),
    FL('aDom24MainA', 'Dominator 2024 | Mainstage | Angerfist', 'aod', 'Hardcore', 61, 'dominator', 2024, 'Mainstage', 'live_set', { md: '07-22' }),
    FL('aDom24MainS', 'Dominator 2024 | Mainstage | Sefa – Closing Set', 'aod', 'Hardcore', 64, 'dominator', 2024, 'Mainstage', 'closing_ceremony', { md: '07-22' }),
    FL('aDom23MainD', 'Dominator 2023 | Mainstage | D-Fence', 'aod', 'Hardcore', 59, 'dominator', 2023, 'Mainstage', 'live_set', { md: '07-17' }),
    FL('aDom23Warm1', 'Dominator 2023 | Warm-Up Mix by Never Surrender', 'aod', 'Hardcore', 47, 'dominator', 2023, null, 'warm_up', { md: '06-30' }),
    FL('qRad24Ep512', 'Q-dance Radio 512 | Hosted by Villain', 'qd', 'Hardstyle', 60, 'qdanceradio', 2024, null, 'episode', { md: '03-14', episode: 512 }),
    FL('qRad24Ep520', 'Q-dance Radio 520 | Road to Defqon.1', 'qd', 'Hardstyle', 61, 'qdanceradio', 2024, null, 'episode', { md: '05-09', episode: 520 }),
    FL('qRad24Ep531', 'Q-dance Radio 531 | Raw Special', 'qd', 'Hardstyle', 60, 'qdanceradio', 2024, null, 'episode', { md: '07-25', episode: 531 }),
    FL('qRad23Ep480', 'Q-dance Radio 480 | Yearmix Preview', 'qd', 'Hardstyle', 62, 'qdanceradio', 2023, null, 'episode', { md: '12-07', episode: 480 }),
    /* Noch nicht zugeordnet: «Festivals zuordnen» erkennt sie (assign_festivals). */
    FL('aMoh24MainM', 'Masters of Hardcore 2024 | Mainstage | Mad Dog', 'aod', 'Hardcore', 60, 'moh', 2024, 'Mainstage', 'live_set', { md: '03-25', assign: false }),
    FL('aMoh24MainE', 'Masters of Hardcore 2024 | The Endshow', 'aod', 'Hardcore', 21, 'moh', 2024, null, 'endshow', { md: '03-25', assign: false }),
    FL('bHrdBss19Gr', 'Hard Bass Team Green – Full Liveset', 'b2s', 'Hardstyle', 88, 'hardbass', 2019, null, 'full_show', { md: '02-11', assign: false }),
    FL('bDcb23MainR', 'Decibel outdoor 2023 | Mainstage | Rooler', 'b2s', 'Hardstyle', 58, 'decibel', 2023, 'Mainstage', 'live_set', { md: '08-21', assign: false }),
  );
  /* Bestehende Einträge: Podcast-Folgen der eigenen Serie, ein unsicherer Vorschlag (Tribute-Mix). */
  const libById = (id) => LIBRARY.find((x) => x.id === id);
  LIBRARY.forEach((l) => { if (l.festival === undefined) { l.festival = null; l.festival_suggestion = null; } });
  [['zZrhPod0006', 6], ['zZrhPod0005', 5], ['zZrhPod0001', 1]].forEach(([id, ep]) => {
    const l = libById(id);
    l.festival = fest('u-hardfloor-zurich-podcast', l.year, { set_type: 'episode', episode: ep, confidence: 0.81 });
  });
  libById('gThunder98x').festival_suggestion = (() => { const f = fest('thunderdome', 1998, { confidence: 0.48 }); delete f.manual; return f; })();
  libById('bHrdBss19Gr').festival_suggestion = (() => { const f = fest('hardbass', 2019, { set_type: 'full_show', confidence: 0.58 }); delete f.manual; return f; })();
  const seriesCount = (sid) => LIBRARY.filter((l) => l.festival && l.festival.series_id === sid).length;
  const seriesOut = (s) => { const o = clone(s); o.count = seriesCount(s.id); return o; };
  const foldName = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  /** Stellvertreter für app/core/festivals.detect: Alias im Titel, Jahr, Bühne, Set-Art. */
  function detect(title, o) {
    const text = String(title || ''), folded = foldName(text), x = o || {};
    let best = null;
    SERIES.filter((s) => !s.hidden && s.enabled).forEach((s) => {
      (s.weak_aliases.includes(s.name) ? [] : [s.name]).concat(s.aliases).forEach((a) => { const f = foldName(a); if (f && folded.includes(f) && (!best || f.length > best.len)) best = { s, alias: a, len: f.length, weak: false }; });
      s.weak_aliases.forEach((a) => { const f = foldName(a); if (f && folded.includes(f) && !best) best = { s, alias: a, len: f.length, weak: true }; });
    });
    if (!best) return null;
    const s = best.s, fs = settings.festivals;
    const y4 = text.match(/(?:^|\D)((?:19[89]|20[0-3])\d)(?!\d)/), y2 = text.match(/[’'](\d\d)(?!\d)/);
    const fromTitle = y4 ? +y4[1] : y2 ? (+y2[1] > 80 ? 1900 : 2000) + +y2[1] : null;
    const year = fromTitle || (fs.year_from_upload_date && x.upload_date ? +String(x.upload_date).slice(0, 4) : null);
    const stage = STAGES.concat(fs.extra_stages || []).find((st) => new RegExp(`(^|[^A-Za-z])${st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z])`, st === st.toUpperCase() ? '' : 'i').test(text)) || null;
    const low = text.toLowerCase();
    const custom = (fs.extra_set_types || []).find((k) => k.keyword && low.includes(String(k.keyword).toLowerCase()));
    const setType = custom ? custom.set_type : /closing/.test(low) ? 'closing_ceremony' : /opening/.test(low) ? 'opening' : /endshow/.test(low) ? 'endshow' : /anthem/.test(low) ? 'anthem'
      : /warm.?up/.test(low) ? 'warm_up' : /full (show|stream|set)|registration|power hour/.test(low) ? 'full_show' : s.kind !== 'festival' ? 'episode' : /\||@|live ?set/.test(low) ? 'live_set' : null;
    const ep = s.kind !== 'festival' ? (text.match(/(?:#|episode |ep\.? ?)(\d{1,4})\b/i) || text.match(/\b(\d{2,4})\b(?!.*\b(?:19|20)\d\d)/) || [])[1] : null;
    const variant = (s.variants.find((v) => [v.name].concat(v.aliases).some((a) => foldName(a) && folded.includes(foldName(a)))) || {}).name || '';
    let conf = best.weak ? 0.35 : 0.6;
    if (fromTitle) conf += 0.2; else if (year) conf += 0.08;
    if (stage) conf += 0.08;
    if (setType) conf += 0.05;
    if (x.channel_name && s.channels.includes(x.channel_name)) conf += 0.1;
    if (/tribute|reaction|aftermovie/.test(low)) conf -= 0.3;
    conf = Math.max(0.05, Math.min(0.99, +conf.toFixed(2)));
    const festival = [s.name, variant].filter(Boolean).join(' ');
    return {
      series_key: s.key, series_id: s.id, series: s.name, kind: s.kind, year, year_source: fromTitle ? 'title' : year ? 'upload' : null, variant,
      edition: [festival, year].filter(Boolean).join(' '), stage, set_type: setType, episode: ep ? +ep : null, confidence: conf, alias: best.alias, reasons: ['alias'],
    };
  }
  /** Erkennung auf einen Bibliothekseintrag anwenden -> "assigned" | "suggested" | "none" | "unchanged" | "manual". */
  function assignOne(l) {
    if (l.festival && l.festival.manual) return 'manual';
    const d = detect(l.title, { channel_name: l.artist, upload_date: l.upload_date });
    const before = JSON.stringify([l.festival && [l.festival.edition_id, l.festival.stage, l.festival.set_type], l.festival_suggestion && l.festival_suggestion.edition_id]);
    if (l.festival && !d) return 'unchanged'; // der Mock erkennt weniger als das Backend: Bestehendes bleibt
    if (!d) { l.festival = null; l.festival_suggestion = null; }
    else {
      const f = festivalOf(editionOf(d.series_id, d.year, d.variant), { stage: d.stage, set_type: d.set_type, episode: d.episode, confidence: d.confidence });
      if (d.confidence >= settings.festivals.min_confidence) { l.festival = f; l.festival_suggestion = null; }
      else { delete f.manual; l.festival = null; l.festival_suggestion = f; }
    }
    const after = JSON.stringify([l.festival && [l.festival.edition_id, l.festival.stage, l.festival.set_type], l.festival_suggestion && l.festival_suggestion.edition_id]);
    return before === after ? 'unchanged' : l.festival ? 'assigned' : l.festival_suggestion ? 'suggested' : 'none';
  }
  const festState = { running: false, cancel: false, lastPass: isoAt(9, 21, 40), timer: null };
  /** Zuordnungen/Vorschläge einer Serie entfernen (Serie gelöscht/ausgeblendet) -> Anzahl. */
  function clearSeries(sid) {
    let n = 0;
    LIBRARY.forEach((l) => {
      if (l.festival && l.festival.series_id === sid) { l.festival = null; n++; }
      if (l.festival_suggestion && l.festival_suggestion.series_id === sid) { l.festival_suggestion = null; n++; }
    });
    return n;
  }
  /** Namen einer geänderten Serie in die Einträge nachziehen. */
  function renameSeries(s) {
    LIBRARY.forEach((l) => ['festival', 'festival_suggestion'].forEach((k) => {
      const f = l[k];
      if (!f || f.series_id !== s.id) return;
      const fresh = festivalOf(editionOf(s.id, f.event_year, f.variant), f);
      if (k === 'festival_suggestion') delete fresh.manual;
      fresh.confidence = f.confidence;
      l[k] = fresh;
    }));
  }

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
    [1, 20, 2, 'info', 'Watchlist check started · 6 source(s)'],
    [1, 20, 3, 'ok', 'Watchlist · Kickdrum Collective: 2 new hit(s) → inbox'],
    [1, 20, 4, 'ok', 'Watchlist check finished · 6 source(s) · 3 new hits'],
    [1, 20, 14, 'info', '3 mix(es) added to the queue'],
    [1, 20, 14, 'info', 'Starting download: Gabber Classics Marathon – 3 Hours Oldschool'],
    [1, 20, 14, 'debug', 'yt-dlp: format=bestaudio · client=web · PO token from cache (age 12 min)'],
    [1, 20, 31, 'debug', 'ffmpeg: MP3 320 kbps CBR · Gabber Classics Marathon – 3 Hours Oldschool'],
    [1, 20, 32, 'ok', 'Finished: Gabber Classics Marathon – 3 Hours Oldschool · 421.9 MB'],
    [1, 20, 32, 'debug', 'Throttle: 74 s pause until the next download'],
    [1, 20, 34, 'info', 'Starting download: Euphoric Hardstyle Yearmix 2026'],
    [1, 20, 43, 'warn', 'Chapters: no chapters and no timestamps in the description – no .cue for “Euphoric Hardstyle Yearmix 2026”'],
    [1, 20, 43, 'ok', 'Finished: Euphoric Hardstyle Yearmix 2026 · 223.1 MB'],
    [1, 20, 52, 'ok', 'Finished: Terror Night Live Recording · 155.2 MB'],
    [1, 20, 52, 'info', 'Download run finished · 3 downloaded · 0 errors'],
    [0, 3, 0, 'info', 'Watchlist run started (headless) · 6 active sources'],
    [0, 3, 0, 'debug', 'Throttle: sleep_requests=3s · limit_rate=3.0 MB/s'],
    [0, 3, 1, 'info', 'Source “Kickdrum Collective”: 30 entries checked (flat), 2 new'],
    [0, 3, 1, 'info', 'Source “Gabber Vault”: stopped at the first known video, 0 new'],
    [0, 3, 2, 'info', 'Source “Distortion Unit”: 1 new'],
    [0, 3, 3, 'info', 'Source “Rave Archive CH”: 2 new'],
    [0, 3, 4, 'warn', 'Source “Hard Classics Playlist” disabled, skipped'],
    [0, 3, 4, 'info', 'Filter: 7 hits checked · 5 pass · 2 discarded (duration < 10 min, exclude “aftermovie”)'],
    [0, 3, 5, 'ok', 'Auto download “Raw Nation Podcast #4” finished · 140.2 MB'],
    [0, 3, 6, 'debug', 'Throttle: 58 s pause until the next download'],
    [0, 3, 9, 'error', 'Download failed “Gabba Nation Liveset”: HTTP 403 – members only'],
    [0, 3, 9, 'ok', 'Watchlist run finished · 5 found · 1 downloaded · 1 error'],
    [0, 9, 12, 'info', 'HCLoader started · config %APPDATA%\\HCLoader\\config.yaml'],
    [0, 9, 12, 'info', 'yt-dlp 2026.11.02 · Deno 2.5.4 · ffmpeg 7.1 · bgutil-Plugin 1.3.0'],
    [0, 9, 12, 'ok', 'PO token provider (script/Deno) ready'],
    [0, 9, 12, 'warn', 'Library: 2 files not found (moved or deleted?)'],
    [0, 9, 13, 'info', 'yt-dlp and plugin are up to date'],
    [0, 9, 14, 'info', 'Search “hardcore liveset 2026” · 30 results (flat) · 19 after filter'],
    [0, 9, 14, 'debug', 'Throttle: 4/20 searches this hour'],
    [0, 9, 14, 'info', 'Starting download: Xtra Raw Liveset – Reverse Bass Only'],
  ].forEach(([d, h, m, lvl, msg]) => pushLog(lvl, msg, isoAt(d, h, m)));

  /* Läufe: neueste zuerst. Der oberste läuft noch (finished null) – es ist der Lauf der aktiven Warteschlange. */
  const RUNS = [
    { id: 42, kind: 'manual', started: new Date(Date.now() - 60000).toISOString(), finished: null, found: 0, downloaded: 0, errors: 0, note: '' },
    { id: 41, kind: 'headless', started: isoAt(0, 3, 0), finished: isoAt(0, 3, 9), found: 5, downloaded: 1, errors: 1, note: '1 download failed (HTTP 403)' },
    { id: 40, kind: 'manual', started: isoAt(1, 20, 14), finished: isoAt(1, 20, 52), found: 0, downloaded: 3, errors: 0, note: '' },
    { id: 39, kind: 'watchlist', started: isoAt(1, 20, 2), finished: isoAt(1, 20, 4), found: 3, downloaded: 0, errors: 0, note: '' },
    { id: 38, kind: 'headless', started: isoAt(1, 3, 0), finished: isoAt(1, 3, 4), found: 0, downloaded: 0, errors: 0, note: '' },
    { id: 37, kind: 'manual', started: isoAt(2, 21, 10), finished: isoAt(2, 21, 10), found: 0, downloaded: 0, errors: 0, note: 'Backoff active until 09:01 – the rest stays in the queue' },
    { id: 36, kind: 'headless', started: isoAt(2, 3, 0), finished: isoAt(2, 3, 1), found: 0, downloaded: 0, errors: 1, note: 'HTTP 429 – backoff 6 h until 09:01, run aborted' },
    { id: 35, kind: 'manual', started: isoAt(3, 18, 40), finished: isoAt(3, 20, 51), found: 0, downloaded: 10, errors: 0, note: 'Run limit reached (10/10) – the rest stays in the queue' },
    { id: 34, kind: 'watchlist', started: isoAt(3, 18, 30), finished: isoAt(3, 18, 33), found: 12, downloaded: 0, errors: 2, note: '2 source(s) with errors' },
    { id: 33, kind: 'headless', started: isoAt(3, 3, 0), finished: isoAt(3, 3, 22), found: 2, downloaded: 2, errors: 0, note: '' },
    { id: 32, kind: 'headless', started: isoAt(4, 3, 0), finished: isoAt(4, 3, 3), found: 0, downloaded: 0, errors: 0, note: '' },
    { id: 31, kind: 'manual', started: isoAt(5, 19, 5), finished: isoAt(5, 19, 58), found: 0, downloaded: 4, errors: 1, note: '1 download failed' },
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
      { id: 'cGabb4Fail1', state: 'failed', phase: 'download', pct: 12, speed: 0, eta: 0, error: 'HTTP 403 – video only available to channel members' },
    ],
    counters: { downloads_run: 1, downloads_day: 3, searches_hour: 4 },
    po: { state: 'active', detail: 'Token generated 4 min ago', created: Date.now() - 4 * 60000 },
    backoff: { active: false, until: null, level: 0 }, // YouTube
    sc: { backoff: { active: false, until: null, level: 0 }, counters: { downloads_run: 0, downloads_day: 1, searches_hour: 2 } }, // SoundCloud: eigene Zähler
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
  /* Pro Plattform getrennt: Backoff, Zähler, Limits (throttle = YouTube, soundcloud = SoundCloud). */
  const platOf = (x) => { const v = byId(x.id || x); return v && v.platform === 'soundcloud' ? 'soundcloud' : 'youtube'; };
  const boOf = (p) => (p === 'soundcloud' ? state.sc.backoff : state.backoff);
  const cntOf = (p) => (p === 'soundcloud' ? state.sc.counters : state.counters);
  const thOf = (p) => (p === 'soundcloud' ? settings.soundcloud : settings.throttle);
  const hhmm = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const boView = (p) => {
    const b = boOf(p);
    return { active: b.active, until: b.until, level: b.level, remaining_s: b.active ? Math.max(0, Math.round((new Date(b.until) - Date.now()) / 1000)) : 0, reason: b.active ? 'HTTP 429 – too many requests' : '' };
  };
  const platformView = (p) => {
    const th = thOf(p);
    return {
      enabled: p === 'youtube' || !!settings.soundcloud.enabled, backoff: boView(p), counters: clone(cntOf(p)),
      limits: { downloads_run: th.max_downloads_per_run, downloads_day: th.max_downloads_per_day, searches_hour: th.max_searches_per_hour },
    };
  };
  function status() {
    const mode = settings.network.po_token_mode;
    return {
      app_version: '0.2.0', ytdlp_version: state.versions.ytdlp, plugin_version: state.versions.plugin,
      deno_ok: true, deno_version: '2.5.4', ffmpeg_ok: true, ffmpeg_version: '7.1',
      po_token: mode === 'off' ? { state: 'inactive', mode, detail: 'Provider turned off' } : { state: state.po.state, mode, detail: state.po.detail },
      backoff: {
        active: state.backoff.active, until: state.backoff.until, level: state.backoff.level,
        remaining_s: state.backoff.active ? Math.max(0, Math.round((new Date(state.backoff.until) - Date.now()) / 1000)) : 0,
      },
      next_check: nextCheck(),
      queue_length: activeQueue().length, queue_paused: state.paused,
      inbox_count: VIDEOS.filter((v) => v.status === 'inbox').length,
      counters: clone(state.counters),
      platforms: { youtube: platformView('youtube'), soundcloud: platformView('soundcloud') },
    };
  }
  const pushStatus = () => emit('status', status());
  const targetOf = (v) => `${v.genre}\\${v.channel_name}\\${(v.upload_date || '').slice(0, 4)}\\`;
  /** Wie worker.DownloadQueue.blocked(): (code, Meldung), warum wartende Einträge nicht laufen. */
  function blockOf(p) {
    const th = thOf(p), c = cntOf(p), pre = p === 'soundcloud' ? 'SoundCloud: ' : '';
    if (boOf(p).active) return ['backoff', p === 'soundcloud' ? `SoundCloud: backoff until ${hhmm(boOf(p).until)} – the rest stays in the queue` : 'Backoff active – the rest stays in the queue'];
    if (c.downloads_day >= th.max_downloads_per_day) return ['day_limit', `${pre}Daily limit reached (${c.downloads_day}/${th.max_downloads_per_day}) – the rest stays in the queue`];
    if (c.downloads_run >= th.max_downloads_per_run) return ['run_limit', `${pre}Run limit reached (${th.max_downloads_per_run}/${th.max_downloads_per_run}) – the rest stays in the queue; “Resume” starts a new run`];
    if (state.local) return state.local.slice();
    return null;
  }
  /* blocked_code/-reason nur, wenn ALLE wartenden Einträge stehen; sonst platform_blocked pro Plattform. */
  function blocked() {
    const waiting = state.queue.filter((q) => q.state === 'waiting');
    const per = {};
    ['youtube', 'soundcloud'].forEach((p) => {
      const b = waiting.some((q) => platOf(q) === p) ? blockOf(p) : null;
      if (b) per[p] = { code: b[0], reason: b[1] };
    });
    const all = waiting.length > 0 && waiting.every((q) => per[platOf(q)]);
    const first = all ? per[platOf(waiting[0])] : null;
    return [first ? first.code : null, first ? first.reason : null, all ? {} : per];
  }
  const queueView = () => {
    const [code, msg, per] = blocked();
    return {
      paused: state.paused,
      items: state.queue.map((q) => Object.assign({}, q, { video: clone(byId(q.id)), target: targetOf(byId(q.id)) })),
      blocked_code: code, blocked_reason: msg, platform_blocked: per,
    };
  };
  const setStatus = (v, st) => { v.status = st; emit('video', { id: v.id, status: st, genre: v.genre }); };

  /* ---------- Simulation von worker.py ---------- */
  const limitHit = (p) => cntOf(p || 'youtube').downloads_day >= thOf(p || 'youtube').max_downloads_per_day || cntOf(p || 'youtube').downloads_run >= thOf(p || 'youtube').max_downloads_per_run;
  const unsleep = (except) => state.queue.forEach((x) => { if (x !== except && x.phase === 'sleep') { x.phase = 'waiting'; x.eta = 0; } });
  function tick() {
    if (state.paused) return;
    /* Eine Plattform im Backoff/Limit hält nur ihre eigenen Einträge an – die andere lädt weiter. */
    const q = state.queue.find((x) => x.state === 'active') || state.queue.find((x) => x.state !== 'failed' && !boOf(platOf(x)).active && !limitHit(platOf(x)));
    if (!q || boOf(platOf(q)).active) return;
    const v = byId(q.id);
    const plat = platOf(q);
    unsleep(q);
    if (q.phase === 'waiting') {
      if (limitHit(plat)) return; // Rest bleibt in der Warteschlange
      if (state.sleepLeft > 0) { q.phase = 'sleep'; q.eta = state.sleepLeft; q.sleep_total = state.sleepTotal; emit('queue', {}); return; }
      q.phase = 'download'; q.state = 'active';
      if (!openRun()) RUNS.unshift({ id: ++runSeq, kind: 'manual', started: new Date().toISOString(), finished: null, found: 0, downloaded: 0, errors: 0, note: '', duration: null });
      setStatus(v, 'downloading');
      pushLog('info', `Starting download: ${v.title}`);
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
      cntOf(plat).downloads_run++; cntOf(plat).downloads_day++;
      const artist = v.channel_name;
      LIBRARY.unshift({
        festival: null, festival_suggestion: null,
        id: v.id, title: v.title, artist, channel_id: v.channel_id, genre: v.genre, duration: v.duration, upload_date: v.upload_date, year: +v.upload_date.slice(0, 4),
        downloaded_at: new Date().toISOString(),
        file_path: libPath(v.genre, artist, v.upload_date, v.title, v.id), size_mb: sizeOf(v.duration), missing: false, has_cue: true,
        platform: v.platform || 'youtube', thumbnail: v.thumbnail || null, genre_manual: !!v.genre_manual,
      });
      if (openRun()) openRun().downloaded++;
      setStatus(v, 'done');
      pushLog('ok', `Finished: ${v.title} · ${LIBRARY[0].size_mb} MB`);
      if (activeQueue().length && !limitHit(plat)) {
        const th = thOf(plat);
        state.sleepTotal = state.sleepLeft = Math.round(th.sleep_interval + rnd() * Math.max(0, th.max_sleep_interval - th.sleep_interval));
        if (state.sleepLeft) pushLog('debug', `Throttle: ${state.sleepLeft} s pause until the next download`);
      } else state.sleepLeft = 0;
      if (activeQueue().length && limitHit(plat)) pushLog('warn', 'Download limit reached – the rest stays in the queue');
      emit('done', { id: v.id, title: v.title });
      if (!activeQueue().length) closeRun();
      else if (limitHit(plat)) closeRun('Download limit reached – the rest stays in the queue');
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

  /* ---------- Watchlist: Namensvorschlag aus der URL (wie core/watchlist.suggest_source, ohne Netzwerk) ---------- */
  const titleCase = (t) => (t && t === t.toLowerCase() && /[a-zäöü]/.test(t) ? t.split(' ').map((w) => w.slice(0, 1).toUpperCase() + w.slice(1)).join(' ') : t);
  const fromSlug = (slug) => titleCase(decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim());
  function suggest(input, hint) {
    const text = String(input || '').replace(/\s+/g, ' ').trim();
    const out = { type: '', platform: 'youtube', name: '', url_normalized: '' };
    if (!text) { out.type = hint || ''; return out; }
    const looksUrl = /^(https?:\/\/|www\.|m\.|youtube\.com|soundcloud\.com|youtu\.be)/i.test(text);
    if (hint === 'search' || !looksUrl) return Object.assign(out, { type: 'search', name: text });
    const url = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    let u;
    try { u = new URL(url); } catch (e) { return out; }
    const host = u.hostname.replace(/^(www|m|music)\./, ''), parts = u.pathname.split('/').filter(Boolean);
    out.url_normalized = `https://${host === 'soundcloud.com' ? '' : 'www.'}${host}${u.pathname.replace(/\/$/, '')}${host === 'youtube.com' && u.searchParams.get('list') ? `?list=${u.searchParams.get('list')}` : ''}`;
    if (host === 'soundcloud.com') {
      out.platform = 'soundcloud';
      if (parts.length >= 3 && parts[1] === 'sets') return Object.assign(out, { type: 'playlist', name: `${fromSlug(parts[0])} – ${fromSlug(parts[2])}` });
      if (parts.length === 1 || (parts.length === 2 && parts[1] === 'tracks')) return Object.assign(out, { type: 'channel', name: fromSlug(parts[0]) });
      return out;
    }
    if (host !== 'youtube.com') return out;
    if (u.searchParams.get('list')) return Object.assign(out, { type: 'playlist' });
    if (parts[0] && parts[0].startsWith('@')) return Object.assign(out, { type: 'channel', name: decodeURIComponent(parts[0].slice(1)) });
    if (parts[0] === 'channel' && parts[1]) return Object.assign(out, { type: 'channel' });
    if ((parts[0] === 'c' || parts[0] === 'user') && parts[1]) return Object.assign(out, { type: 'channel', name: decodeURIComponent(parts[1]) });
    return out;
  }

  /* ---------- Mini-Player: synthetische Audioquelle (data:-WAV, 8 Bit mono, < 50 KB) ---------- */
  const CHAPTER_S = 1.5, TONE_RATE = 4000;
  const CHAPTERS = [
    ['Intro – Countdown to Zero', ''], ['Concrete Pressure', 'Kernschmelze'], ['Warehouse Anthem (Raw Edit)', 'Pulsewerk'], ['Static Overdrive', 'Distortion Unit'],
    ['No Sleep Till Sunrise', 'Hardfloor Zürich'], ['Bassdrum Ritual', 'Bunker 303 & NRG Tapes'], ['Terror Transmission 303', 'Overdrive'], ['Outro – Last Kick Standing', ''],
  ];
  let toneUrl = null;
  function demoTone() {
    if (toneUrl) return toneUrl;
    const per = Math.round(TONE_RATE * CHAPTER_S), n = per * CHAPTERS.length;
    const b = new Uint8Array(44 + n), dv = new DataView(b.buffer);
    const str = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, TONE_RATE, true); dv.setUint32(28, TONE_RATE, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); str(36, 'data'); dv.setUint32(40, n, true);
    const notes = [110, 131, 147, 165, 131, 175, 196, 220];
    for (let i = 0; i < n; i++) {
      const k = i % per, env = Math.min(1, k / 200, (per - k) / 400); // leise, weich ein- und ausgeblendet
      b[44 + i] = 128 + Math.round(Math.sin((2 * Math.PI * notes[Math.floor(i / per)] * i) / TONE_RATE) * 9 * env);
    }
    let bin = '';
    for (let i = 0; i < b.length; i += 8192) bin += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
    toneUrl = `data:audio/wav;base64,${btoa(bin)}`;
    return toneUrl;
  }

  /* ---------- API ---------- */
  /* ---------- App-Update (Selbst-Update, wie core/selfupdate.py) ---------- */
  /* Release-Notizen wie ein echtes GitHub-Release (CHANGELOG-Abschnitt + Signing-Hinweis der Release-Automatik). */
  const UPD_NOTES = [
    '### Highlights',
    '- Release notes in the app: short highlights first, all details on demand',
    '- Faster start: the library loads in pages instead of all at once',
    '- New filter **“Only new since last visit”** in the inbox',
    '- Watchlist runs can be paused and resumed',
    '- Three new languages: Polish, Italian and Turkish',
    '',
    '### Added',
    '- Release notes dialog with Markdown: headings, lists, tables, `code` and links ([docs](https://github.com/kellerict/HCLoader/wiki)).',
    '- Inbox filter “Only new since last visit” (`filters.only_new`, off by default).',
    '- Watchlist: pause and resume a running pass; the state survives a restart.',
    '  - Paused runs show up in Log › Runs with the note “paused”.',
    '  - A headless run is never paused.',
    '',
    '### Changed',
    '- Gentler defaults for long sessions:',
    '',
    '| Setting | Before | Now |',
    '|---|--:|--:|',
    '| `throttle.sleep_min_s` | 8 | 12 |',
    '| `throttle.sleep_max_s` | 20 | 30 |',
    '| `throttle.max_downloads_per_day` | 40 | 30 |',
    '',
    '- The library reads 200 entries per page (was: everything).',
    '',
    '### Fixed',
    '- Mini player: the seek tooltip no longer jumps at the right edge.',
    '- Cover art with a transparent border is cropped correctly.',
    '',
    '> **Note:** Windows SmartScreen may warn about the setup. Choose “More info” › “Run anyway”.',
    '',
    '---',
    '',
    'Code signing policy: https://github.com/kellerict/HCLoader/blob/main/CODE_SIGNING.md',
  ].join('\n');
  const UPD_URL = 'https://github.com/kellerict/HCLoader/releases/tag/v0.3.0';
  /* Mehrere übersprungene Versionen (0.2.0 → 0.3.0): nur über demo.update(.., .., true); das Backend
     liefert `releases`/`published` noch nicht (siehe bridge.js «UpdateStatus»). */
  const UPD_RELEASES = [
    { version: '0.3.0', published: '2026-12-08T18:30:00Z', url: UPD_URL, notes: UPD_NOTES },
    { version: '0.2.2', published: '2026-11-29T09:10:00Z', url: 'https://github.com/kellerict/HCLoader/releases/tag/v0.2.2',
      notes: '### Highlights\n- SoundCloud: private playlists of your own account can be added as a source\n- Fewer bot checks: the PO token is reused for the whole session\n\n### Fixed\n- Scheduled runs no longer start twice after standby.' },
    { version: '0.2.1', published: '2026-11-21T20:45:00Z', url: 'https://github.com/kellerict/HCLoader/releases/tag/v0.2.1',
      notes: '### Fixed\n- Portable version: the update no longer fails on paths with spaces\n- Hindi and Bengali: clipped headings in the settings\n- Log: the search field keeps its text when new lines arrive' },
  ];
  const upd = { current: '0.2.0', latest: null, state: 'idle', notes: '', url: null, releases: null, published: null, progress: null, error: null, checked: null, startChecked: false, timer: null };
  const updStatus = () => ({
    current: upd.current, latest: upd.latest, available: !!upd.latest && upd.latest !== upd.current, state: upd.state,
    notes: upd.notes, url: upd.url, ...(upd.releases ? { releases: clone(upd.releases), published: upd.published } : {}), progress: upd.progress ? clone(upd.progress) : null, error: upd.error, checked: upd.checked,
    portable: false, git_checkout: false, installed: false, blocked: null, apply_on_exit: !!settings.maintenance.apply_update_on_exit,
    verified: upd.state === 'ready' ? true : null, repo: settings.maintenance.update_repo,
    foreign_repo: settings.maintenance.update_repo.toLowerCase() !== 'kellerict/hcloader',
  });
  const updSet = (fields) => { Object.assign(upd, fields); emit('update', updStatus()); return updStatus(); };
  const updCheck = () => {
    updSet({ state: 'checking' });
    return later(700, () => {
      pushLog('info', 'HCLoader 0.3.0 is available (installed: 0.2.0)');
      return Object.assign({ ok: true }, updSet({ state: upd.state === 'checking' ? 'idle' : upd.state, latest: '0.3.0', notes: UPD_NOTES, url: UPD_URL, checked: new Date().toISOString(), error: null }));
    });
  };
  const updDownload = () => {
    const total = 2457600;
    let done = 0;
    updSet({ state: 'downloading', error: null, progress: { phase: 'download', pct: 0, bytes: 0, total } });
    clearInterval(upd.timer);
    upd.timer = setInterval(() => {
      done = Math.min(total, done + 98304);
      upd.progress = { phase: 'download', pct: Math.round((1000 * done) / total) / 10, bytes: done, total };
      emit('update_progress', clone(upd.progress));
      if (done < total) return;
      clearInterval(upd.timer);
      upd.progress = { phase: 'prepare', pct: null, bytes: 0, total: 0 };
      emit('update_progress', clone(upd.progress));
      upd.timer = setTimeout(() => { pushLog('ok', 'HCLoader 0.3.0 is ready'); updSet({ state: 'ready', progress: null }); }, 900 * speed.factor);
    }, 120 * speed.factor);
  };

  const api = {
    /* Einstellungen */
    get_settings: () => later(30, () => ({ values: clone(settings), defaults: clone(DEFAULTS), language: resolvedLanguage() })),
    save_settings(values) {
      return later(220, () => {
        const errors = validate(values);
        if (Object.keys(errors).length) return { ok: false, errors };
        settings = clone(values);
        settings.genres.items.forEach((g, i) => { g.priority = i + 1; });
        rememberLanguage();
        pushLog('info', 'Settings saved');
        pushStatus();
        return { ok: true, values: clone(settings), language: resolvedLanguage() };
      });
    },
    reset_settings(section) {
      return later(120, () => {
        if (section) settings[section] = clone(DEFAULTS[section]);
        else settings = clone(DEFAULTS);
        rememberLanguage();
        pushLog('warn', section ? `Settings “${section}” reset to defaults` : 'All settings reset to defaults');
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
      const out = ['> python -m pip install -U "yt-dlp[default,curl-cffi]" bgutil-ytdlp-pot-provider'].concat(fresh ? [
        'Requirement already satisfied: yt-dlp[default,curl-cffi] in .venv\\lib\\site-packages (2026.11.2)',
        'Collecting yt-dlp[default,curl-cffi]',
        '  Downloading yt_dlp-2026.11.14-py3-none-any.whl (3.3 MB)',
        'Collecting bgutil-ytdlp-pot-provider',
        '  Downloading bgutil_ytdlp_pot_provider-1.3.1-py3-none-any.whl (18 kB)',
        'Installing collected packages: yt-dlp, bgutil-ytdlp-pot-provider',
        '  Attempting uninstall: yt-dlp',
        '      Successfully uninstalled yt-dlp-2026.11.2',
        'Successfully installed bgutil-ytdlp-pot-provider-1.3.1 yt-dlp-2026.11.14',
      ] : [
        'Requirement already satisfied: yt-dlp[default,curl-cffi] in .venv\\lib\\site-packages (2026.11.14)',
        'Requirement already satisfied: bgutil-ytdlp-pot-provider in .venv\\lib\\site-packages (1.3.1)',
      ]);
      pushLog('info', 'Updating yt-dlp & plugin …');
      out.forEach((line, i) => setTimeout(() => pushLog('info', line), (150 + i * (2100 / out.length)) * speed.factor));
      return later(2400, () => {
        state.versions = { ytdlp: '2026.11.14', plugin: '1.3.1' };
        if (fresh) state.restart = true;
        pushLog('ok', `Update finished: yt-dlp ${state.versions.ytdlp}, plugin ${state.versions.plugin}${fresh ? ' (new)' : ' (already up to date)'}`);
        pushStatus();
        return Object.assign({ ok: true, ytdlp: state.versions.ytdlp, plugin: state.versions.plugin, changed: fresh, output: out.join('\n') }, fresh ? { restart_required: true } : {});
      });
    },
    /* App-Update (Mock: simuliert Prüfung, Download mit Fortschritt, Neustart) */
    get_update_status() {
      if (!upd.startChecked && !/[?&]nosim/.test(location.search) && settings.maintenance.check_app_updates_on_start) {
        upd.startChecked = true;
        setTimeout(updCheck, 1500 * speed.factor);
      }
      return later(15, updStatus);
    },
    check_update: () => (['checking', 'downloading', 'applying'].includes(upd.state) ? later(10, () => Object.assign({ ok: false, error: 'Update already running' }, updStatus())) : updCheck()),
    download_update() {
      return later(40, () => {
        if (!upd.latest || upd.latest === upd.current) return Object.assign({ ok: false, error: 'No newer update known – please check first' }, updStatus());
        if (upd.state !== 'idle' && upd.state !== 'error') return Object.assign({ ok: false, error: upd.state === 'ready' ? 'The update is already ready' : 'The update is already being downloaded' }, updStatus());
        updDownload();
        return Object.assign({ ok: true }, updStatus());
      });
    },
    get_release_notes: () => later(40, () => ({
      current: upd.current,
      releases: [
        { version: '0.2.1', date: '2026-11-17', notes: '### Highlights\n- Readable release notes in the app\n- Skipped versions listed\n- Links open in the browser\n\n### Added\n- `open_url` bridge method\n\n### Fixed\n- Enter in dialogs' },
        { version: '0.2.0', date: '2026-11-17', notes: '**Highlights**\n- 19 languages, English default\n- Installer privacy page\n\n### Added\n- Language picker' },
        { version: '0.1.0', date: '2026-11-17', notes: '### Added\n- First release' },
      ],
    })),
    open_url(url) {
      const ok = /^https:\/\/([a-z0-9-]+\.)*github\.com(\/|$)/i.test(String(url || ''));
      if (ok) window.open(url, '_blank', 'noopener');
      return later(30, ok ? { ok: true } : { ok: false, error: `Link not allowed: ${url}` });
    },
    cancel_update() {
      return later(40, () => { clearInterval(upd.timer); clearTimeout(upd.timer); return Object.assign({ ok: true }, updSet({ state: 'idle', progress: null, error: null })); });
    },
    apply_update_now() {
      return later(60, () => {
        if (upd.state !== 'ready') return { ok: false, error: 'No update ready' };
        updSet({ state: 'applying' });
        /* Mock: kein echter Neustart – nach einer Pause «neu gestartet» melden */
        setTimeout(() => {
          updSet({ state: 'idle', current: upd.latest, progress: null });
          emit('toast', { msg: `HCLoader updated to v${upd.current}`, kind: 'ok' });
        }, 2500 * speed.factor);
        return { ok: true };
      });
    },
    backup_db() {
      return later(700, () => {
        const d = new Date();
        state.lastBackup = d.toISOString();
        const name = `hcloader-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.db`;
        const path = `%APPDATA%\\HCLoader\\backups\\${name}`;
        state.backups.unshift({ name, size_mb: 1.8, created: state.lastBackup });
        pushLog('ok', `Database backed up: ${path}`);
        return { ok: true, path };
      });
    },
    open_path: () => later(30, { ok: true }),
    pick_folder: () => later(300, { path: 'D:\\Musik\\HCLoader' }),
    test_po_token() {
      return later(1300, () => {
        if (settings.network.po_token_mode === 'off') return { ok: false, state: 'inactive', detail: 'Provider is turned off.', error: 'Provider is turned off.', ms: 0 };
        state.po = { state: 'active', detail: 'Token generated a few seconds ago', created: Date.now() };
        pushLog('ok', 'PO-Token-Test erfolgreich (840 ms)');
        pushStatus();
        return { ok: true, state: 'active', detail: 'New token generated and accepted by YouTube.', ms: 840 };
      });
    },
    clear_backoff(platform) {
      return later(150, () => {
        if (platform && !['youtube', 'soundcloud'].includes(platform)) return { ok: false, error: 'Unbekannte Plattform.' };
        if (!platform || platform === 'youtube') state.backoff = { active: false, until: null, level: 0 };
        if (!platform || platform === 'soundcloud') state.sc.backoff = { active: false, until: null, level: 0 };
        pushLog('warn', `Backoff${platform === 'soundcloud' ? ' (SoundCloud)' : platform === 'youtube' ? ' (YouTube)' : ''} lifted manually`);
        emit('queue', {});
        pushStatus();
        return { ok: true };
      });
    },
    get_task_status: () => later(60, () => (state.task.unknown ? { registered: null, name: '\\HCLoader\\Watchlist', time: settings.schedule.task_time, next_run: null, error: 'schtasks does not respond (timeout after 20 s)', path_mismatch: false, task_command: null } : {
      registered: state.task.registered, name: '\\HCLoader\\Watchlist', time: settings.schedule.task_time,
      next_run: state.task.registered ? nextTask() : null, error: null,
      path_mismatch: !!(state.task.registered && state.task.moved),
      task_command: state.task.registered ? (state.task.moved ? '"E:\\HCLoader\\python\\pythonw.exe" "E:\\HCLoader\\scripts\\run_watchlist.pyw"' : '"C:\\Tools\\HCLoader\\python\\pythonw.exe" "C:\\Tools\\HCLoader\\scripts\\run_watchlist.pyw"') : null,
    })),
    create_task(time) {
      return later(600, () => {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return { ok: false, error: 'Time expected as HH:MM.' };
        state.task.registered = true;
        state.task.moved = false;
        settings.schedule.task_scheduler_enabled = true;
        settings.schedule.task_time = time;
        pushLog('ok', `Task Scheduler: \\HCLoader\\Watchlist created daily at ${time}`);
        pushStatus();
        return { ok: true, registered: true, name: '\\HCLoader\\Watchlist', time, next_run: nextTask(), path_mismatch: false, task_command: '"C:\\Tools\\HCLoader\\python\\pythonw.exe" "C:\\Tools\\HCLoader\\scripts\\run_watchlist.pyw"' };
      });
    },
    remove_task() {
      return later(400, () => {
        state.task.registered = false;
        settings.schedule.task_scheduler_enabled = false;
        pushLog('info', 'Task Scheduler: \\HCLoader\\Watchlist removed');
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
      platform: lastSearch.platform, hidden_count: 0,
      results: lastSearch.ids.map((id) => asSearchHit(byId(id))),
    })),
    /* opts = {genre: <Name>|null, year: <int>|null} – das Backend hängt die Begriffe an (siehe bridge.js). */
    search(query, opts) {
      return later(1100, () => {
        const o = Object.assign({ genre: null, year: null, platform: 'youtube' }, opts);
        const p = o.platform, sc = p === 'soundcloud';
        if (!['youtube', 'soundcloud'].includes(p)) return { ok: false, error: 'Unbekannte Plattform.' };
        if (sc && !settings.soundcloud.enabled) return { ok: false, error: 'SoundCloud is turned off (Settings › SoundCloud)' };
        if (boOf(p).active) return { ok: false, error: sc ? `Backoff (SoundCloud) active until ${hhmm(boOf(p).until)} – search blocked` : 'Backoff active – search is blocked.' };
        if (cntOf(p).searches_hour >= thOf(p).max_searches_per_hour) return { ok: false, error: 'Limit “searches per hour” reached.' };
        const effective = effectiveQuery(query, o);
        const ids = sc ? SC_SEARCH_IDS : o.year ? yearHits(o.year) : SEARCH_IDS;
        lastSearch = { query, effective_query: effective, genre: o.genre, year: o.year || null, ids, platform: p };
        cntOf(p).searches_hour++;
        pushLog('info', `Search${sc ? ' (SoundCloud)' : ''} “${effective}” · ${ids.length} results (flat)`);
        pushStatus();
        return { ok: true, results: ids.map((id) => asSearchHit(byId(id))), effective_query: effective, query, genre: o.genre, year: o.year || null, hidden_count: 0, platform: p };
      });
    },
    get_inbox: () => later(40, () => clone(VIDEOS.filter((v) => v.status === 'inbox'))),
    enqueue(ids) {
      return later(60, () => {
        const done = [];
        ids.forEach((id) => {
          const v = byId(id);
          if (!v || v.preview || !['new', 'inbox', 'failed'].includes(v.status)) return;
          state.queue = state.queue.filter((q) => q.id !== id);
          const failedAt = state.queue.findIndex((q) => q.state === 'failed');
          const item = { id, state: 'waiting', phase: 'waiting', pct: 0, speed: 0, eta: 0, error: null };
          if (failedAt < 0) state.queue.push(item); else state.queue.splice(failedAt, 0, item);
          setStatus(v, 'queued');
          done.push(id);
        });
        if (done.length) pushLog('info', `${done.length} mix(es) added to the queue`);
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
        const l = LIBRARY.find((x) => x.id === id);
        if (!v && !l) return { ok: false, error: 'Invalid video ID' };
        if (!settings.genres.items.some((g) => g.name === genre)) return { ok: false, error: 'This genre does not exist (any more).' };
        if (v) { v.genre = genre; v.genre_manual = true; emit('video', { id, status: v.status, genre }); }
        if (l) { l.genre = genre; l.genre_manual = true; } // die Datei zieht erst mit retag() in den Ordner des Genres um
        return { ok: true };
      });
    },
    open_video: () => later(30, { ok: true }),
    add_channel_source(channelId, channelName) {
      return later(80, () => {
        const sc = String(channelId).startsWith('sc:');
        const user = sc && Object.values(SCU).find((u) => u[0] === channelId);
        if (sc && !user) return { ok: false, error: 'SoundCloud user unknown (no profile URL)' };
        const url = sc ? `https://soundcloud.com/${user[2]}` : `https://www.youtube.com/channel/${channelId}`;
        let s = SOURCES.find((x) => x.name === channelName || x.url_or_query === url);
        if (s) return { ok: false, error: 'Channel is already in the watchlist', source: sourceView(s) };
        s = { id: nextSourceId++, type: 'channel', name: channelName, url_or_query: url, default_genre: null, enabled: true, auto_download: false, max_entries: null, last_checked: null, platform: sc ? 'soundcloud' : 'youtube', name_auto: false };
        SOURCES.push(s);
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
    suggest_source: (text, hint) => later(15, () => suggest(text, hint)),
    save_source(src) {
      return later(120, () => {
        const errors = {};
        const url = String(src.url_or_query || '').trim();
        const name = String(src.name || '').trim();
        if (!['channel', 'playlist', 'search'].includes(src.type)) errors.type = 'Unbekannter Typ.';
        if (!name) errors.name = 'Name missing.';
        else if (SOURCES.some((x) => x.id !== src.id && x.name.toLowerCase() === name.toLowerCase())) errors.name = 'A source with this name already exists.';
        if (!url) errors.url_or_query = src.type === 'search' ? 'Search term missing.' : 'URL missing.';
        else if (src.type !== 'search' && !/^https?:\/\/((www\.|music\.|m\.)?youtube\.com|(www\.|m\.)?soundcloud\.com)\//.test(url)) errors.url_or_query = 'Unsupported URL – expected a YouTube URL (https://www.youtube.com/…) or a SoundCloud URL (https://soundcloud.com/…).';
        else if (src.type !== 'search' && /soundcloud\.com/.test(url) && !settings.soundcloud.enabled) errors.url_or_query = 'SoundCloud is turned off (Settings › SoundCloud).';
        else if (src.type === 'channel' && /soundcloud\.com\/[^/]+\/sets\//.test(url)) errors.url_or_query = 'Choose the type “Playlist” for a set.';
        else if (src.type === 'playlist' && /soundcloud\.com/.test(url) && !/\/sets\/[^/]+/.test(url)) errors.url_or_query = 'SoundCloud playlist URL expected (…/<user>/sets/<set>).';
        else if (src.type === 'channel' && /\/(playlists|releases|featured|shorts|community|podcasts|about)\/?$/.test(url)) errors.url_or_query = 'Only the channel URL itself, /videos or /streams – other tabs are not supported.';
        else if (src.type === 'playlist' && !/soundcloud\.com/.test(url) && !/[?&]list=[\w-]+/.test(url)) errors.url_or_query = 'Playlist URL expected (…/playlist?list=…).';
        if (src.type === 'search' && src.platform != null && !['youtube', 'soundcloud'].includes(src.platform)) errors.platform = 'Platform must be YouTube or SoundCloud.';
        const cap = src.type === 'search' ? 100 : 200; // leer (null) = Standard schedule.entries_per_source
        if (src.max_entries != null && !(Number.isInteger(src.max_entries) && src.max_entries >= 1 && src.max_entries <= cap)) errors.max_entries = `Whole number between 1 and ${cap} expected (empty = default).`;
        if (src.default_genre && !settings.genres.items.some((g) => g.name === src.default_genre)) errors.default_genre = 'This genre does not exist (any more).';
        if (Object.keys(errors).length) return { ok: false, errors };
        const platform = src.type === 'search' ? src.platform || 'youtube' : /soundcloud\.com/.test(url) ? 'soundcloud' : 'youtube';
        const fields = { type: src.type, name, url_or_query: url, default_genre: src.default_genre || null, enabled: !!src.enabled, auto_download: !!src.auto_download, max_entries: src.max_entries == null ? null : src.max_entries, newest_last: src.type === 'playlist' && !!src.newest_last, platform, name_auto: !!src.name_auto };
        let s = SOURCES.find((x) => x.id === src.id);
        if (s) Object.assign(s, fields);
        else { s = Object.assign({ id: nextSourceId++, last_checked: null }, fields); SOURCES.push(s); }
        return { ok: true, source: sourceView(s) };
      });
    },
    delete_source(id) {
      return later(60, () => { SOURCES = SOURCES.filter((s) => s.id !== id); clearTimeout(bfTimers[id]); delete BACKFILLS[id]; return { ok: true }; });
    },
    /* v0.4.0 «Alles einlesen (einmalig)» – wie core/backfill.estimate (ohne Netzwerk) */
    estimate_backfill(id) {
      return later(60, () => {
        const s = SOURCES.find((x) => x.id === id);
        if (!s) return { ok: false, error: 'Source no longer exists' };
        if (s.type === 'search') return { ok: false, error: 'Search sources cannot be read completely – a search returns at most 100 results' };
        const cap = settings.watchlist.backfill_max_entries, b = BACKFILLS[id];
        const known = b && b.total != null ? b.total : ITEM_COUNT[id] == null ? null : ITEM_COUNT[id];
        const entries = known == null ? cap : Math.min(known, cap);
        const sc = s.platform === 'soundcloud', page = sc ? (s.type === 'playlist' ? 50 : 200) : s.type === 'playlist' ? 100 : 30;
        const requests = (sc ? 3 : 1) + Math.max(1, Math.ceil(entries / page));
        const perHour = settings.watchlist.backfill_requests_per_hour;
        const interval = Math.max(3600 / perHour, (sc ? settings.soundcloud : settings.throttle).sleep_requests);
        const position = b && ['pending', 'running', 'paused'].includes(b.state) ? b.position : 0;
        return { ok: true, source_id: id, known_total: known, entries, cap, requests, seconds: Math.round(requests * interval), per_hour: perHour, page_size: page, conservative: known == null, position, resume: position > 0 };
      });
    },
    start_backfill(id) {
      return later(80, () => {
        const s = SOURCES.find((x) => x.id === id);
        if (!s) return { ok: false, error: 'Source no longer exists' };
        if (s.type === 'search') return { ok: false, error: 'Search sources cannot be read completely – a search returns at most 100 results' };
        if (boOf(s.platform).active) return { ok: false, error: `Backoff active until ${hhmm(boOf(s.platform).until)} – the watchlist check is blocked` };
        const b = BACKFILLS[id];
        if (b && ['pending', 'running', 'paused'].includes(b.state)) Object.assign(b, { state: 'pending', note: null });
        else BACKFILLS[id] = { state: 'pending', position: 0, total: ITEM_COUNT[id] == null ? null : ITEM_COUNT[id], added: 0, found: 0, requests: 0, note: null, started: new Date().toISOString(), updated: new Date().toISOString(), finished: null };
        bfTimers[id] = setTimeout(() => bfRun(id), 400 * speed.factor);
        return { ok: true, backfill: bfView(id) };
      });
    },
    pause_backfill(id) {
      return later(40, () => {
        const b = BACKFILLS[id];
        if (!b) return { ok: false, error: 'No “Read everything” for this source' };
        if (['pending', 'running'].includes(b.state)) { clearTimeout(bfTimers[id]); b.state = 'paused'; b.note = null; }
        bfEmit(id);
        return { ok: true, backfill: bfView(id) };
      });
    },
    cancel_backfill(id) {
      return later(40, () => {
        const b = BACKFILLS[id];
        if (!b) return { ok: false, error: 'No “Read everything” for this source' };
        if (['pending', 'running', 'paused'].includes(b.state)) { clearTimeout(bfTimers[id]); Object.assign(b, { state: 'cancelled', position: 0, finished: new Date().toISOString() }); }
        bfEmit(id);
        return { ok: true, backfill: bfView(id) };
      });
    },
    check_sources(ids) {
      if (state.checking) return later(30, { ok: false, error: 'The watchlist is already being checked.' });
      const list = SOURCES.filter((s) => s.enabled && (!ids || ids.includes(s.id)));
      if (!list.length) return later(30, { ok: true, started: 0 });
      /* Abgelehnt nur, wenn JEDE Plattform mit aktiver Quelle im Backoff ist. */
      if (list.every((s) => boOf(s.platform).active)) return later(30, { ok: false, error: 'Backoff active – the watchlist check is blocked.' });
      state.checking = true;
      pushLog('info', `Watchlist check started · ${list.length} source(s)`);
      (async () => {
        let found = 0, errors = 0, queued = 0;
        for (const s of list) {
          if (!SOURCES.includes(s)) continue; // inzwischen gelöscht
          if (boOf(s.platform).active) {
            errors++;
            emit('source', { id: s.id, checking: false, error: `Backoff (${s.platform === 'soundcloud' ? 'SoundCloud' : 'YouTube'}) active until ${hhmm(boOf(s.platform).until)} – skipped` });
            continue;
          }
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
          if (hits.length) pushLog('ok', `Watchlist · ${s.name}: ${hits.length} new hit(s)${s.auto_download ? ' → queue' : ' → inbox'}`);
          /* name_auto: der Vorschlag aus der URL wird durch den echten Namen ersetzt. */
          if (s.name_auto && REAL_NAMES[s.url_or_query]) { s.name = REAL_NAMES[s.url_or_query]; s.name_auto = false; }
          emit('source', { id: s.id, checking: false, name: s.name, last_checked: s.last_checked, new_count: sourceView(s).new_count });
          if (hits.length) { if (queued) emit('queue', {}); pushStatus(); }
        }
        state.checking = false;
        if (!ids) state.appNext = new Date(Date.now() + settings.schedule.watchlist_interval_hours * 3600000).toISOString();
        const run = { id: ++runSeq, kind: 'watchlist', started: new Date(Date.now() - list.length * 900).toISOString(), finished: new Date().toISOString(), found, downloaded: 0, errors, note: errors ? `${errors} source(s) with errors` : '' };
        RUNS.unshift(withDuration(run));
        emit('run', clone(run));
        pushLog(errors ? 'warn' : 'ok', `Watchlist check finished · ${list.length} source(s) · ${found} new hits${errors ? ` · ${errors} errors` : ''}`);
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
        if (!paused && state.counters.downloads_run >= settings.throttle.max_downloads_per_run) { state.counters.downloads_run = 0; pushLog('info', 'New download run started'); }
        pushLog('info', paused ? 'Queue paused' : 'Queue resumed');
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
        return l ? { ok: true } : { ok: false, error: 'No file for this entry' };
      });
    },
    get_media(id) {
      return later(60, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l) return { ok: false, error: 'Entry is not in the library' };
        if (l.missing) return { ok: false, error: 'File missing' };
        /* Kurze synthetische Tonfolge statt einer echten Datei: ein Abschnitt pro Kapitel. */
        const chapters = l.has_cue ? CHAPTERS.map(([title, performer], i) => ({ start: i * CHAPTER_S, title, performer })) : [];
        return { ok: true, id, src: demoTone(), title: l.title, artist: l.artist, genre: l.genre, platform: l.platform || 'youtube', duration: CHAPTERS.length * CHAPTER_S, cover: null, chapters };
      });
    },
    play_external(id) {
      return later(60, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l) return { ok: false, error: 'Entry is not in the library' };
        if (l.missing) return { ok: false, error: 'File missing' };
        pushLog('info', `Opened in the default player: ${l.title}`);
        return { ok: true };
      });
    },
    retag(id) {
      return later(900, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l) return { ok: false, error: 'Entry not found' };
        if (l.missing) return { ok: false, error: `File missing: ${l.file_path}` };
        /* Zielpfad nach dem aktuellen Genre: ein geändertes Genre (set_genre) verschiebt die Datei. */
        const parts = l.file_path.split('\\');
        const want = STALE[id] ? libPath(l.genre, l.artist, l.upload_date, l.title, l.id) : parts.map((x, i) => (i === parts.length - 4 ? l.genre : x)).join('\\');
        const moved = want !== l.file_path;
        if (moved) {
          delete STALE[id];
          l.file_path = want;
          pushLog('info', `Verschoben (Ablage-Muster): ${l.file_path}`);
        }
        pushLog('ok', `Retagged: ${l.title}`);
        return { ok: true, path: l.file_path, moved, genre: l.genre, cue: !!l.has_cue, sidecar: true };
      });
    },
    delete_library_item(id, deleteFile) {
      return later(160, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l) return { ok: false, error: 'Entry not found' };
        if (targetDown) return { ok: false, error: `Target folder unreachable: ${TARGET}`, unreachable: true };
        const file = deleteFile !== false && !l.missing;
        LIBRARY = LIBRARY.filter((x) => x.id !== id);
        pushLog('warn', file ? `Deleted: ${l.file_path}` : `Entry removed (file kept or missing): ${l.title}`);
        const v = byId(id);
        if (v) setStatus(v, 'ignored'); // wird nicht erneut geladen
        const name = l.file_path.split('\\').pop();
        return { ok: true, deleted: file ? [name].concat(l.has_cue ? [name.replace(/\.mp3$/, '.cue')] : []) : [] };
      });
    },

    /* Festivals & Serien (v0.3.0) */
    get_series: (includeHidden) => later(40, () => SERIES.filter((s) => includeHidden || !s.hidden).map((s) => { const o = seriesOut(s); if (!includeHidden) delete o.hidden; return o; })
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))),
    save_series(data) {
      return later(180, () => {
        const d = data || {}, errors = {};
        const cur = d.id != null ? seriesById(d.id) : null;
        const name = String(d.name || '').trim();
        if (d.id != null && !cur) errors.id = 'Unknown series.';
        if (!name) errors.name = 'Name missing.';
        else if (name.length > 80) errors.name = 'Name is too long (max. 80 characters).';
        else if (SERIES.some((s) => s !== cur && !s.hidden && foldName(s.name) === foldName(name))) errors.name = `“${name}” already exists.`;
        if (!['festival', 'radio', 'podcast'].includes(d.kind)) errors.kind = 'Allowed: festival, radio, podcast.';
        ['aliases', 'weak_aliases', 'channels'].forEach((k) => {
          const list = d[k] == null ? [] : d[k];
          if (!Array.isArray(list) || list.length > 40) { errors[k] = 'List with at most 40 entries expected.'; return; }
          if (k === 'channels') return;
          list.forEach((a) => {
            const other = SERIES.find((s) => s !== cur && !s.hidden && [s.name].concat(s.aliases, s.weak_aliases).some((x) => foldName(x) === foldName(a)));
            if (other && !errors[k]) errors[k] = `“${a}” already belongs to “${other.name}”.`;
          });
        });
        if (d.default_genre && !settings.genres.items.some((g) => g.name === d.default_genre)) errors.default_genre = `Unknown genre: ${d.default_genre}`;
        if (Object.keys(errors).length) return { ok: false, errors };
        const clean = (l) => [...new Set((l || []).map((x) => String(x).trim()).filter(Boolean))];
        const fields = {
          name, kind: d.kind, aliases: clean(d.aliases), weak_aliases: clean(d.weak_aliases), channels: clean(d.channels),
          variants: (d.variants || []).map((v) => ({ name: String(v.name || '').trim(), aliases: clean(v.aliases) })).filter((v) => v.name),
          default_genre: d.default_genre || null, enabled: d.enabled !== false,
        };
        let s = cur;
        if (s) { Object.assign(s, fields); if (s.builtin) s.user_modified = true; renameSeries(s); }
        else SERIES.push((s = SR(`u-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'series'}`, name, d.kind, [], Object.assign(fields, { builtin: false }))));
        pushLog('info', `Series saved: ${s.name}`);
        return { ok: true, series: seriesOut(s) };
      });
    },
    set_series_enabled(id, enabled) {
      return later(80, () => {
        const s = seriesById(id);
        if (!s) return { ok: false, error: 'Unknown series.' };
        s.enabled = !!enabled; // kein user_modified: nur an/aus
        return { ok: true, series: seriesOut(s) };
      });
    },
    delete_series(id) {
      return later(140, () => {
        const s = seriesById(id);
        if (!s) return { ok: false, error: 'Unknown series.' };
        const cleared = clearSeries(s.id);
        if (s.builtin) s.hidden = true; else SERIES = SERIES.filter((x) => x !== s);
        pushLog('warn', `${s.builtin ? 'Series hidden' : 'Series deleted'}: ${s.name} · ${cleared} assignment(s) removed`);
        return { ok: true, hidden: !!s.builtin, cleared };
      });
    },
    reset_series(id) {
      return later(160, () => {
        const one = id != null ? seriesById(id) : null;
        if (id != null && (!one || !one.builtin)) return { ok: false, error: 'Only built-in series can be reset.' };
        SERIES.filter((s) => s.builtin && (!one || s === one)).forEach((s) => {
          Object.assign(s, clone(SERIES_BUILTIN.find((b) => b.key === s.key)), { id: s.id });
          renameSeries(s);
        });
        pushLog('info', one ? `Series reset: ${one.name}` : 'Built-in series restored');
        return { ok: true, series: SERIES.filter((s) => s.builtin && (!one || s === one)).map(seriesOut) };
      });
    },
    get_festival_options: () => later(20, () => ({ kinds: ['festival', 'radio', 'podcast'], set_types: clone(SET_TYPES), stages: STAGES.concat(settings.festivals.extra_stages || []) })),
    get_library_groups(by) {
      return later(40, () => {
        const mode = by || 'festival';
        if (mode === 'festival') {
          const series = SERIES.map((s) => {
            const mine = LIBRARY.filter((l) => l.festival && l.festival.series_id === s.id);
            const tally = (list, key) => { const m = new Map(); list.forEach((l) => m.set(l.festival[key] || null, (m.get(l.festival[key] || null) || 0) + 1)); return [...m].sort((a, b) => !a[0] - !b[0] || b[1] - a[1]).map(([k, count]) => ({ [key]: k, count })); };
            const editions = [...new Set(mine.map((l) => l.festival.edition_id))].map((eid) => {
              const list = mine.filter((l) => l.festival.edition_id === eid), f = list[0].festival;
              return { id: eid, event_year: f.event_year, variant: f.variant, edition: f.edition, festival: f.festival, count: list.length, stages: tally(list, 'stage'), set_types: tally(list, 'set_type') };
            }).sort((a, b) => (b.event_year || 0) - (a.event_year || 0));
            return { id: s.id, key: s.key, name: s.name, kind: s.kind, count: mine.length, editions };
          }).filter((s) => s.count).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
          const rest = LIBRARY.filter((l) => !l.festival);
          return { ok: true, by: mode, series, unassigned: rest.length, suggested: rest.filter((l) => l.festival_suggestion).length, total: LIBRARY.length };
        }
        const keyOf = {
          year: (l) => String(l.year || ''), event_year: (l) => String((l.festival && l.festival.event_year) || ''), artist: (l) => l.artist || '', genre: (l) => l.genre || '',
          stage: (l) => (l.festival && l.festival.stage) || '', set_type: (l) => (l.festival && l.festival.set_type) || '',
        }[mode];
        if (!keyOf) return { ok: false, error: `Unknown grouping: ${mode}` };
        const m = new Map();
        LIBRARY.forEach((l) => m.set(keyOf(l), (m.get(keyOf(l)) || 0) + 1));
        const years = mode === 'year' || mode === 'event_year';
        return { ok: true, by: mode, groups: [...m].map(([key, count]) => ({ key, count })).sort((a, b) => !a.key - !b.key || (years ? b.key.localeCompare(a.key) : b.count - a.count)) };
      });
    },
    set_festival(id, data) {
      return later(140, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l) return { ok: false, errors: { id: 'Unknown video.' }, error: 'Unknown video.' };
        const errors = {};
        let f = null;
        if (data) {
          let ed = null;
          if (data.edition_id != null) { ed = EDITIONS.find((e) => e.id === +data.edition_id); if (!ed) errors.edition_id = 'Unknown edition.'; }
          else {
            const s = seriesById(data.series_id), y = data.event_year;
            if (!s) errors.series_id = 'Unknown series.';
            if (y != null && (!Number.isInteger(y) || y < 1985 || y > new Date().getFullYear() + 1)) errors.event_year = `Invalid year: ${y}`;
            if (!Object.keys(errors).length) ed = editionOf(s.id, y || null, data.variant);
          }
          if (data.set_type && !SET_TYPES.some((x) => x.code === data.set_type)) errors.set_type = `Unknown set type: ${data.set_type}`;
          if (data.episode != null && (!Number.isInteger(data.episode) || data.episode < 1)) errors.episode = 'Episode must be a positive number.';
          if (Object.keys(errors).length) return { ok: false, errors, error: Object.values(errors)[0] };
          f = festivalOf(ed, { stage: data.stage, set_type: data.set_type, episode: data.episode, manual: true });
        }
        l.festival = f || null;
        l.festival_suggestion = null;
        l.festival_none = !f; // «kein Festival» von Hand: die Erkennung lässt es in Ruhe
        pushLog('info', f ? `Festival set: ${l.title} → ${f.edition}${f.stage ? ` · ${f.stage}` : ''}` : `Festival removed: ${l.title}`);
        emit('video', { id, status: 'done', genre: l.genre, festival: clone(l.festival), festival_suggestion: null });
        return { ok: true, festival: clone(l.festival), festival_suggestion: null };
      });
    },
    reset_festival(id) {
      return later(140, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l) return { ok: false, error: 'Unknown video.' };
        if (l.festival) l.festival.manual = false;
        delete l.festival_none;
        const had = !!l.festival;
        let outcome = assignOne(l);
        if (outcome === 'unchanged' && had && !detect(l.title)) { l.festival = null; outcome = 'none'; }
        emit('video', { id, status: 'done', genre: l.genre, festival: clone(l.festival), festival_suggestion: clone(l.festival_suggestion) });
        return { ok: true, outcome, festival: clone(l.festival), festival_suggestion: clone(l.festival_suggestion) };
      });
    },
    detect_festival: (title, opts) => later(60, () => { const d = detect(title, opts); return { ok: true, detection: d, assigned: !!d && d.confidence >= settings.festivals.min_confidence }; }),
    get_festival_status: () => later(30, () => {
      const rest = LIBRARY.filter((l) => !l.festival);
      return { series: SERIES.filter((s) => !s.hidden).length, assigned: LIBRARY.length - rest.length, suggested: rest.filter((l) => l.festival_suggestion).length, unassigned: rest.length, total: LIBRARY.length, last_pass: festState.lastPass, running: festState.running };
    }),
    assign_festivals(opts) {
      return later(60, () => {
        const scope = opts && opts.scope === 'all' ? 'all' : 'library';
        if (festState.running) return { ok: true, started: false, running: true };
        Object.assign(festState, { running: true, cancel: false });
        const todo = LIBRARY.filter((l) => !l.festival_none), total = todo.length;
        const counts = { assigned: 0, suggested: 0, none: 0, manual: 0, unchanged: 0 };
        let done = 0;
        emit('festival_assign', { phase: 'start', scope });
        pushLog('info', 'Assigning festivals …');
        const step = () => {
          const end = Math.min(total, done + 9);
          for (; done < end && !festState.cancel; done++) counts[assignOne(todo[done])]++;
          const finished = done >= total || festState.cancel;
          emit('festival_assign', Object.assign({ phase: 'progress', scope, done, total }, counts));
          if (!finished) { festState.timer = setTimeout(step, 260 * speed.factor); return; }
          Object.assign(festState, { running: false, lastPass: new Date().toISOString() });
          pushLog('ok', `Festivals assigned: ${counts.assigned} new, ${counts.suggested} suggestion(s), ${counts.unchanged} unchanged`);
          emit('festival_assign', Object.assign({ phase: 'done', scope, ok: true, cancelled: festState.cancel, total, done }, counts));
        };
        festState.timer = setTimeout(step, 200 * speed.factor);
        return { ok: true, started: true, scope };
      });
    },
    cancel_assign_festivals: () => later(20, () => { festState.cancel = true; return { ok: true, running: festState.running }; }),

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
      /** App-Update-Zustand erzwingen (Screenshots): state "idle"|"downloading"|"ready"|"error", optional pct;
          skipped = true: mehrere übersprungene Versionen (`releases`, `published`). */
      update(state, pct, skipped) {
        clearInterval(upd.timer);
        const base = { latest: '0.3.0', notes: UPD_NOTES, url: UPD_URL, checked: new Date().toISOString(), error: null, progress: null };
        if (state === 'downloading') base.progress = { phase: 'download', pct: pct == null ? 42 : pct, bytes: 1032192, total: 2457600 };
        if (state === 'error') base.error = 'Checksum mismatch (HCLoader-0.3.0.zip)';
        Object.assign(base, skipped ? { releases: UPD_RELEASES, published: UPD_RELEASES[0].published } : { releases: null, published: null });
        updSet(Object.assign(base, { state: state || 'idle' }));
      },
      /** Backoff einer Plattform auslösen (platform: "youtube" (Standard) | "soundcloud"). */
      backoff(hours, platform) {
        const h = hours || 6, sc = platform === 'soundcloud';
        const bo = { active: true, until: new Date(Date.now() + h * 3600000 - 47 * 60000).toISOString(), level: 1 };
        if (sc) state.sc.backoff = bo; else state.backoff = bo;
        pushLog('error', `HTTP 429 von ${sc ? 'SoundCloud' : 'YouTube'} – Backoff ${h} h aktiviert`);
        emit('queue', {});
        pushStatus();
      },
      /** SoundCloud-Tracks in die Warteschlange (für «platform_blocked»: SoundCloud steht, YouTube lädt weiter). */
      scQueue() {
        ['sc:880114203', 'sc:880114207'].forEach((id) => {
          const v = byId(id);
          if (state.queue.some((q) => q.id === id)) return;
          const failedAt = state.queue.findIndex((q) => q.state === 'failed');
          state.queue.splice(failedAt < 0 ? state.queue.length : failedAt, 0, { id, state: 'waiting', phase: 'waiting', pct: 0, speed: 0, eta: 0, error: null });
          setStatus(v, 'queued');
        });
        emit('queue', {});
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
      /** v0.4.0: Zustand «Alles einlesen» einer Quelle setzen (Screenshots), z.B.
          backfill(2, {state: 'running', position: 240, added: 37}); run = true lässt die Simulation weiterlaufen. */
      backfill(id, fields, run) {
        clearTimeout(bfTimers[id]);
        const now = new Date().toISOString();
        BACKFILLS[id] = Object.assign({ state: 'running', position: 0, total: ITEM_COUNT[id] == null ? null : ITEM_COUNT[id], added: 0, found: 0, requests: 0, note: null, started: now, updated: now, finished: null }, BACKFILLS[id] || {}, fields);
        bfEmit(id);
        if (run) bfTimers[id] = setTimeout(() => bfRun(id), 500 * speed.factor);
      },
      /** Die nächste Prüfung dieser Quelle schlägt mit der Meldung fehl. */
      sourceError(id, msg) { state.sourceErrors[id] = msg || 'Channel not found (HTTP 404)'; },
      /** Lokale Sperre der Warteschlange (code "pot" | "target" | "error", null = aufheben). */
      local(code, msg) {
        const texts = {
          pot: 'PO token server not ready – downloads wait until it runs – the rest stays in the queue',
          target: 'Target folder unreachable or not writable (M:\\Music\\HCLoader): The device is not ready – the rest stays in the queue',
          error: 'The download module (yt-dlp) could not be loaded: No module named yt_dlp.extractor – next attempt after “Resume”, new entries or saving the settings',
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
        state.po = { state: 'error', detail: 'Deno script returned no token (timeout after 15 s)', created: 0 };
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
        pushLog('warn', 'Download limit reached – the rest stays in the queue');
        emit('queue', {});
        pushStatus();
      },
    },
  };
  /* Die Simulation startet app.js – und nur im Mock-Modus. */
})();
