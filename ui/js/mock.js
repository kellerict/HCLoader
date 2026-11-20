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
    download: { audio_format: 'mp3', mp3_quality: '320', embed_cover: true, write_cover_jpg: false, write_cue: true, write_id3_chapters: true, keep_original_soundcloud: true, keep_original_mixcloud: true, keep_original_hearthis: true },
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
    /* v0.10.0: weitere Quellen mit eigener Schonung */
    mixcloud: {
      enabled: true, sleep_requests: 3, sleep_interval: 30, max_sleep_interval: 120, limit_rate_mb: 3.0,
      max_downloads_per_run: 10, max_downloads_per_day: 25, max_searches_per_hour: 20,
      backoff_initial_hours: 6, backoff_max_hours: 48,
    },
    hearthis: {
      enabled: true, sleep_requests: 3, sleep_interval: 30, max_sleep_interval: 120, limit_rate_mb: 3.0,
      max_downloads_per_run: 10, max_downloads_per_day: 25, max_searches_per_hour: 20,
      backoff_initial_hours: 6, backoff_max_hours: 48,
    },
    reupload: { enabled: true, fingerprint_after_download: true, head_minutes: 3, windows: 3, min_score: 15, precheck: false },
    player: { mode: 'internal', normalize: true, target_lufs: -18, resume: 'ask', waveform: true },
    loudness: { analyse_after_download: true, write_tags: true, waveforms: true },
    playlists: { folder: '', relative_paths: true, sync_after_download: false },
    notifications: { enabled: true, new_sets: true, downloads_done: true, downloads_failed: true, quiet_hours: false, quiet_from: '22:00', quiet_to: '07:00' },
    media_server: { type: 'off', url: '', library: '', library_name: '', server_root: '', delay_seconds: 120, verify_tls: true },
    festivals: { detect: true, min_confidence: 0.65, year_from_upload_date: true, match_description: true, extra_stages: [], extra_set_types: [], collector_searches_per_hour: 10, collector_results_per_search: 10, collector_auto_confirm: 0.85 },
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
    'general.start_view': { oneOf: ['discover', 'inbox', 'watchlist', 'downloads', 'library', 'stats', 'log'] },
    'notifications.enabled': { bool: 1 },
    'notifications.new_sets': { bool: 1 },
    'notifications.downloads_done': { bool: 1 },
    'notifications.downloads_failed': { bool: 1 },
    'notifications.quiet_hours': { bool: 1 },
    'notifications.quiet_from': { time: 1 },
    'notifications.quiet_to': { time: 1 },
    'media_server.type': { oneOf: ['off', 'plex', 'jellyfin'] },
    'media_server.delay_seconds': { int: 1, min: 10, max: 3600 },
    'media_server.verify_tls': { bool: 1 },
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
    'download.keep_original_mixcloud': { bool: 1 },
    'download.keep_original_hearthis': { bool: 1 },
    'mixcloud.enabled': { bool: 1 },
    'hearthis.enabled': { bool: 1 },
    'reupload.enabled': { bool: 1 },
    'reupload.fingerprint_after_download': { bool: 1 },
    'reupload.precheck': { bool: 1 },
    'reupload.head_minutes': { int: 1, min: 1, max: 10 },
    'reupload.windows': { int: 1, min: 0, max: 8 },
    'reupload.min_score': { int: 1, min: 5, max: 90 },
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
    'festivals.collector_searches_per_hour': { int: 1, min: 1, max: 200 },
    'festivals.collector_results_per_search': { int: 1, min: 1, max: 20 },
    'festivals.collector_auto_confirm': { min: 0.5, max: 1 },
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
    'player.normalize': { bool: 1 },
    'player.target_lufs': { min: -30, max: -6 },
    'player.resume': { oneOf: ['ask', 'auto', 'off'] },
    'player.waveform': { bool: 1 },
    'loudness.analyse_after_download': { bool: 1 },
    'loudness.write_tags': { bool: 1 },
    'loudness.waveforms': { bool: 1 },
    'playlists.folder': { str: 1 },
    'playlists.relative_paths': { bool: 1 },
    'playlists.sync_after_download': { bool: 1 },
  };
  /* Abschnitt «soundcloud» erbt die Schonungs-Felder (gleiche Grenzen und Meldungen wie «throttle»). */
  Object.keys(RULES).filter((k) => k.startsWith('throttle.')).forEach((k) => { ['soundcloud', 'mixcloud', 'hearthis'].forEach((sec) => { RULES[k.replace('throttle.', `${sec}.`)] = RULES[k]; }); });
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
    ['throttle', 'soundcloud', 'mixcloud', 'hearthis'].forEach((sec) => {
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
    /* v0.9.0 Medienserver: Adresse nötig, sobald Plex/Jellyfin gewählt ist (wie core/config.MediaServerSettings) */
    const ms = v.media_server || {};
    const url = String(ms.url || '').trim();
    if (ms.type && ms.type !== 'off' && !url) errors['media_server.url'] = 'Enter the server address (e.g. http://192.168.1.10:32400)';
    else if (url && !/^https?:\/\/[^\s/?#@]+(:\d+)?(\/[^\s?#]*)?$/i.test(url)) errors['media_server.url'] = 'Invalid address – http:// or https:// with host and optional port, no user name, query or #';
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
  const CVIDEOS = []; // v0.5.0 Festival-Sammler: gespeicherte Treffer der Checklisten (weder Suche noch Eingang)
  const byId = (id) => VIDEOS.find((v) => v.id === id) || CVIDEOS.find((v) => v.id === id);
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

  /* ---------- Mixcloud / hearthis.at (v0.10.0): IDs «mc:<user>_<slug>» / «ht:<zahl>», Seite in url ---------- */
  const MCU = { thera: ['mc:DJ_Thera', 'DJ Thera', 'DJ_Thera'], raw: ['mc:rawstyle_radio', 'Rawstyle Radio', 'rawstyle_radio'] };
  const HTU = { fab: ['ht:frenchcore-fabrik', 'Frenchcore Fabrik', 'frenchcore-fabrik'], ug: ['ht:uptempo-ug', 'Uptempo Underground', 'uptempo-ug'] };
  const MC = (slug, title, u, min, sec, days, plays, genre, extra) => Object.assign({
    id: `mc:${MCU[u][2]}_${slug}`, title, channel_id: MCU[u][0], channel_name: MCU[u][1], duration: min * 60 + sec,
    upload_date: isoDay(days), view_count: plays, thumbnail: null, genre, genre_manual: false, status: 'new',
    platform: 'mixcloud', url: `https://www.mixcloud.com/${MCU[u][2]}/${slug}/`, preview: false,
  }, extra);
  const HT = (num, slug, title, u, min, sec, days, plays, genre, extra) => Object.assign({
    id: `ht:${num}`, title: `${HTU[u][1]} - ${title}`, channel_id: HTU[u][0], channel_name: HTU[u][1], duration: min * 60 + sec,
    upload_date: isoDay(days), view_count: plays, thumbnail: null, genre, genre_manual: false, status: 'new',
    platform: 'hearthis', url: `https://hearthis.at/${HTU[u][2]}/${slug}/`, preview: false,
  }, extra);
  const MC_VIDEOS = [
    MC('hardcore-session-14', 'Hardcore Session #14 – Uptempo Special', 'thera', 62, 18, 3, 1840, 'Uptempo'),
    MC('euphoric-yearmix-2026-reupload', 'Euphoric Hardstyle Yearmix 2026 (Re-Upload)', 'raw', 95, 41, 1, 260, 'Hardstyle', { duplicate_of: dupOf('eEuph0ric26') }),
    MC('rawstyle-radio-200', 'Rawstyle Radio Episode 200 – 2 Hour Special', 'raw', 120, 0, 9, 5100, 'Hardstyle'),
    MC('select-exclusive-mix', 'Select Exclusive: Hardcore Vinyl Set', 'thera', 71, 5, 14, 380, 'Hardcore', { preview: true, filter_reason: 'Subscribers only (Mixcloud Select)' }),
    MC('frenchcore-warmup', 'Frenchcore Warm Up – Club Edition', 'thera', 58, 40, 21, 990, 'Hardcore'),
  ];
  const HT_VIDEOS = [
    HT(4001, 'frenchcore-podcast-31', 'Frenchcore Podcast 31', 'fab', 60, 10, 2, 812, 'Hardcore'),
    HT(4002, 'uptempo-underground-12', 'Uptempo Underground 12 – 250 BPM Mix', 'ug', 54, 33, 6, 420, 'Uptempo'),
    HT(4003, 'frenchcore-podcast-30', 'Frenchcore Podcast 30', 'fab', 61, 2, 16, 1300, 'Hardcore'),
    HT(4004, 'raw-and-dirty-liveset', 'Raw & Dirty Liveset (Basement)', 'ug', 66, 50, 30, 210, 'Hardstyle', { status: 'inbox', source_id: 11 }),
  ];
  VIDEOS.push(...MC_VIDEOS, ...HT_VIDEOS);
  const MC_SEARCH_IDS = MC_VIDEOS.map((v) => v.id);
  const HT_SEARCH_IDS = HT_VIDEOS.filter((v) => v.status !== 'inbox').map((v) => v.id);
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
    /* v0.10.0: Mixcloud-Nutzer und hearthis.at-Nutzer */
    { id: 10, type: 'channel', name: 'DJ Thera', url_or_query: 'https://www.mixcloud.com/DJ_Thera/', default_genre: null, enabled: true, auto_download: false, max_entries: null, last_checked: isoAt(1, 21, 48), platform: 'mixcloud' },
    { id: 11, type: 'channel', name: 'Uptempo Underground', url_or_query: 'https://hearthis.at/uptempo-ug/', default_genre: 'Uptempo', enabled: true, auto_download: false, max_entries: null, last_checked: isoAt(1, 21, 49), platform: 'hearthis' },
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
  /* v0.10.0 Re-Uploads (Audio-Fingerabdruck): ein Mixcloud-Download ist vermutlich derselbe Mix wie ein YouTube-Set
     (offen), ein hearthis.at-Download ist als «gleicher Mix» verknüpft. */
  const otherLib = (v, dlDays, kbps, ext, platform) => Object.assign(scLib(v, dlDays, kbps), {
    platform, file_path: `${TARGET}\${v.genre}\${v.channel_name}\${v.upload_date.slice(0, 4)}\${v.upload_date} - ${v.title} [${v.id.replace(':', '-')}].${ext}`,
  });
  const ruOf = (id, score, state) => { const o = LIBRARY.find((x) => x.id === id); return { of: { id, title: o.title, platform: o.platform, channel: o.artist, in_library: true, present: 'ok' }, score, offset_s: 3.4, state }; };
  const mcReup = byId('mc:rawstyle_radio_euphoric-yearmix-2026-reupload');
  mcReup.status = 'done';
  LIBRARY.splice(0, 0, Object.assign(otherLib(mcReup, 0, 128, 'm4a', 'mixcloud'), { reupload: ruOf('eEuph0ric26', 0.47, 'open') }));
  const htLinked = byId('ht:4003');
  htLinked.status = 'done';
  LIBRARY.splice(5, 0, Object.assign(otherLib(htLinked, 4, 192, 'mp3', 'hearthis'), { reupload: ruOf('rIndoorCls2', 0.31, 'linked') }));
  LIBRARY.forEach((l) => { if (!('reupload' in l)) l.reupload = null; });
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
  /* v0.8.0 DJ-Seiten: ein b2b-Set, Alias-Schreibweisen («HH», «SubZero Project») – zählen für denselben DJ. */
  LIBRARY.push(
    FL('aDom22AngMk', 'Angerfist b2b Miss K8 | Dominator 2022 | Mainstage', 'aod', 'Hardcore', 62, 'dominator', 2022, 'Mainstage', 'live_set', { md: '07-18' }),
    FL('bRvz23HHzLv', 'HH @ Reverze 2023 (Live)', 'b2s', 'Hardstyle', 60, 'reverze', 2023, null, 'live_set', { md: '03-06' }),
    FL('bRvz22SZPrj', 'SubZero Project | Reverze 2022', 'b2s', 'Hardstyle', 58, 'reverze', 2022, null, 'live_set', { md: '03-02' }),
    FL('iInt23Headh', 'Headhunterz | Intents Festival 2023 | Mainstage', 'b2s', 'Hardstyle', 61, 'intents', 2023, 'Mainstage', 'live_set', { md: '06-05' }),
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

  /* ---------- Festival-Sammler (v0.5.0, docs/bridge-api.md «Festival collector») ---------- */
  /* Checkliste pro Ausgabe: edition_id -> {playlist_url, rows, job, created, updated}. Zeilen wie die Tabelle
     checklist_rows; status/video/candidates/needs_confirmation leitet clRowView ab (wie collector.row_view). */
  const CL = new Map();
  let clRowSeq = 0, cvSeq = 0;
  const clTimers = {};
  let TT_FILES = []; // v0.5.0 liefert keine Timetable-Dateien aus (demo.timetableFiles() zeigt Beispiele)
  const nowIso = () => new Date().toISOString();
  function clVideo(id) {
    const v = byId(id);
    if (v) return v;
    const l = libById(id);
    return l ? { id: l.id, title: l.title, status: 'done', duration: l.duration, channel_name: l.artist, upload_date: l.upload_date, thumbnail: null, url: `https://www.youtube.com/watch?v=${l.id}`, platform: l.platform || 'youtube' } : null;
  }
  const clVideoView = (id) => {
    const v = clVideo(id);
    return v ? { id: v.id, title: v.title, status: v.status, duration: v.duration, channel_name: v.channel_name, upload_date: v.upload_date, thumbnail: v.thumbnail || null, url: v.url, platform: v.platform || 'youtube' } : null;
  };
  /** Ein gespeicherter Treffer (Status «new»), der noch nicht geladen ist – nie Eingang, nie Queue. */
  function clNewVideo(title, min, o) {
    const x = o || {};
    const id = `qCl${String(++cvSeq).padStart(3, '0')}${foldName(title).slice(0, 5)}`;
    const v = V(id, title, x.ch || 'qd', min, (cvSeq * 17) % 60, 1, 38000 + cvSeq * 3100, x.genre || 'Hardstyle', x.status || 'new');
    v.upload_date = x.date || '2024-07-02';
    CVIDEOS.push(v);
    return id;
  }
  function clStatus(r) {
    if (r.ignored) return 'ignored';
    const v = r.video_id ? clVideo(r.video_id) : null;
    if (!v) return 'missing';
    if (v.status === 'queued' || v.status === 'downloading') return 'queued';
    return v.status === 'done' ? 'downloaded' : 'found';
  }
  function clRowView(r) {
    const o = clone(r);
    delete o.rejected;
    return Object.assign(o, {
      status: clStatus(r), video: r.video_id ? clVideoView(r.video_id) : null,
      candidates: r.candidates.map((c) => ({ confidence: c.confidence, video: clVideoView(c.id) || { id: c.id } })),
      needs_confirmation: !!r.video_id && !r.confirmed && !r.ignored,
    });
  }
  function clStats(eid) {
    const s = { total: 0, missing: 0, found: 0, queued: 0, downloaded: 0, ignored: 0, checked: 0, to_confirm: 0, ready: 0, to_search: 0 };
    const cl = CL.get(eid);
    (cl ? cl.rows : []).forEach((r) => {
      const st = clStatus(r);
      s.total++;
      s[st]++;
      if (!r.checked || r.ignored) return;
      s.checked++;
      if (r.video_id && !r.confirmed) s.to_confirm++;
      else if (st === 'found') s.ready++;
      if (!r.video_id && !r.searched) s.to_search++;
    });
    return s;
  }
  const clEd = (eid) => EDITIONS.find((e) => e.id === +eid);
  function clEdition(eid) {
    const e = clEd(eid), cl = CL.get(+eid);
    if (!e) return null;
    const f = festivalOf(e);
    return {
      edition_id: e.id, series_id: f.series_id, series_key: f.series_key, series: f.series, kind: f.kind, year: e.event_year, variant: e.variant, edition: f.edition,
      playlist_url: cl ? cl.playlist_url : null, stats: clStats(e.id), job: cl && cl.job ? clone(cl.job) : null,
      library: LIBRARY.filter((l) => l.festival && l.festival.edition_id === e.id).length, created: cl ? cl.created : null, updated: cl ? cl.updated : null,
    };
  }
  function clOpen(eid) {
    if (!CL.has(eid)) CL.set(eid, { playlist_url: null, rows: [], job: null, created: nowIso(), updated: nowIso() });
    return CL.get(eid);
  }
  function clAdd(eid, fields) {
    const cl = CL.get(eid);
    const r = Object.assign({
      id: ++clRowSeq, edition_id: eid, artist: '', stage: null, day: null, start: null, end: null, set_type: null, source: 'manual',
      video_id: null, confidence: null, candidates: [], rejected: [], confirmed: false, checked: true, ignored: false, edited: false, searched: null,
      position: cl.rows.reduce((n, x) => Math.max(n, x.position), 0) + 1,
    }, fields);
    cl.rows.push(r);
    return r;
  }
  const clRow = (id) => { for (const cl of CL.values()) { const r = cl.rows.find((x) => x.id === +id); if (r) return r; } return null; };
  const clEmitRows = (eid, rows, deleted) => emit('collector_rows', { edition_id: eid, rows: (rows || []).map(clRowView), deleted: deleted || [], reload: !rows && !deleted, stats: clStats(eid) });
  const clEmitJob = (eid) => { const cl = CL.get(eid); emit('collector_job', Object.assign(cl && cl.job ? clone(cl.job) : { edition_id: eid, state: 'none' }, { stats: clStats(eid) })); };
  /* Die Download-Queue ändert den Status eines Videos (queued -> downloaded): betroffene Zeilen melden. */
  function clVideoChanged(id) {
    CL.forEach((cl, eid) => { const rows = cl.rows.filter((r) => r.video_id === id); if (rows.length) clEmitRows(eid, rows); });
  }
  /** Festival-Werte der Checkliste für ein frisch geladenes Video (manuell = massgebend). */
  function clFestivalOf(id) {
    for (const [eid, cl] of CL) {
      const r = cl.rows.find((x) => x.video_id === id && x.confirmed);
      if (r) return festivalOf(clEd(eid), { stage: r.stage, set_type: r.set_type, manual: true });
    }
    return null;
  }
  /** Gratis-Abgleich gegen die Bibliothek dieser Ausgabe (Artist im Titel). -> Anzahl neuer Treffer */
  function clMatchOffline(eid, rows) {
    const cl = CL.get(eid), taken = new Set(cl.rows.map((r) => r.video_id).filter(Boolean));
    let n = 0;
    (rows || cl.rows).forEach((r) => {
      const key = foldName(r.artist);
      if (r.video_id || r.ignored || !key) return;
      const l = LIBRARY.find((x) => x.festival && x.festival.edition_id === eid && !taken.has(x.id) && foldName(x.title).includes(key));
      if (!l) return;
      Object.assign(r, { video_id: l.id, confidence: 0.95, confirmed: true });
      taken.add(l.id);
      n++;
    });
    return n;
  }
  const clKey = (r) => [r.artist, r.stage, r.day].map(foldName).join('|');
  /** Zeilen eines Timetables/einer Playlist zusammenführen (gleiche Zeile nie doppelt). */
  function clMerge(eid, list, source) {
    const cl = CL.get(eid), out = { added: 0, merged: 0, invalid: 0, ids: [] };
    const fresh = [];
    list.forEach((x) => {
      const artist = String((x && x.artist) || '').trim();
      if (!artist) { out.invalid++; return; }
      const row = { artist, stage: x.stage || null, day: x.day || null, start: x.start || null, end: x.end || null, set_type: x.set_type || null };
      const same = cl.rows.find((r) => clKey(r) === clKey(row)) || cl.rows.find((r) => foldName(r.artist) === foldName(artist) && (!r.day || !row.day) && (!r.stage || !row.stage || foldName(r.stage) === foldName(row.stage)));
      if (same) {
        if (!same.edited) ['stage', 'day', 'start', 'end', 'set_type'].forEach((k) => { if (!same[k] && row[k]) same[k] = row[k]; });
        if (x.video_id && !same.video_id) Object.assign(same, { video_id: x.video_id, confidence: 1, confirmed: true });
        out.merged++;
        out.ids.push(same.id);
        return;
      }
      const r = clAdd(eid, Object.assign(row, { source }, x.video_id ? { video_id: x.video_id, confidence: 1, confirmed: true, checked: x.checked !== false } : {}));
      fresh.push(r);
      out.added++;
      out.ids.push(r.id);
    });
    out.matched = clMatchOffline(eid, fresh);
    cl.updated = nowIso();
    return out;
  }

  /* Timetable-Parser (vereinfacht nach core/timetable.parse): Tag-/Bühnen-Überschriften, Zeitbereiche, Zellen mit |, CSV. */
  const TT_RANGE = /(\d{1,2})[:.h](\d{2})\s*(?:-|–|—|to)\s*(\d{1,2})[:.h](\d{2})/i;
  const TT_ONE = /(?:^|\s)(\d{1,2})[:.h](\d{2})(?=\s|$)/;
  function clParse(text) {
    const rows = [], skipped = [], seen = new Set();
    const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const stageOf = (s) => STAGES.concat(settings.festivals.extra_stages || []).find((x) => x.toLowerCase() === String(s || '').trim().toLowerCase()) || null;
    const hm = (h, m) => (+h < 24 && +m < 60 ? `${pad(+h)}:${m}` : null);
    const tm = (s) => { const m = /^(\d{1,2})[:.h](\d{2})$/.exec(String(s || '').trim()); return m ? hm(m[1], m[2]) : null; };
    const push = (r) => { const k = `${clKey(r)}|${r.start || ''}`; if (!seen.has(k) && rows.length < 2000) { seen.add(k); rows.push(r); } };
    let day = null, stage = null, csv = false;
    const head = lines.length ? lines[0].split(/[;,\t]/).map((c) => c.trim().toLowerCase()) : [];
    if (head.length > 1 && head.some((c) => ['artist', 'dj', 'act', 'name'].includes(c))) {
      csv = true;
      const col = (names) => head.findIndex((c) => names.includes(c));
      const ia = col(['artist', 'dj', 'act', 'name']), is = col(['stage', 'area']), idy = col(['day', 'date']), i0 = col(['start', 'from']), i1 = col(['end', 'to']), it = col(['type', 'set type']);
      lines.slice(1).forEach((l) => {
        const c = l.split(/[;,\t]/).map((x) => x.trim());
        if (!c[ia]) { skipped.push(l); return; }
        push({ artist: c[ia], stage: c[is] || null, day: c[idy] || null, start: tm(c[i0]), end: tm(c[i1]), set_type: SET_TYPES.some((x) => x.code === c[it]) ? c[it] : null });
      });
    } else {
      lines.forEach((raw) => {
        const l = raw.replace(/^[-*•·]\s+/, '');
        const timed = TT_RANGE.test(l) || TT_ONE.test(l);
        if (!timed && /timetable|line-?up|schedule/i.test(l)) return;
        const bare = l.replace(/^#+\s*/, '').replace(/^=+\s*|\s*=+$/g, '').replace(/^\[(.+)\]$/, '$1').replace(/:$/, '').trim();
        const dm = !timed && /^((?:mon|tues|wednes|thurs|fri|satur|sun)day|day\s*\d+)(?:\s*(?:-|–|—|,)\s*(.+))?$/i.exec(bare);
        if (dm) {
          day = dm[1].slice(0, 1).toUpperCase() + dm[1].slice(1).toLowerCase();
          stage = dm[2] ? stageOf(dm[2]) : null;
          if (dm[2] && !stage) day = `${day}, ${dm[2].trim()}`;
          return;
        }
        const sm = !timed && /^(?:stage|area)\s*:?\s*(.+)$/i.exec(bare);
        if (sm || (!timed && stageOf(bare))) { stage = sm ? stageOf(sm[1]) || sm[1].trim() : stageOf(bare); return; }
        let start = null, end = null, st = stage, type = null;
        const names = [];
        l.split(/\s*[|\t]\s*/).filter(Boolean).forEach((cell, i, cells) => {
          let rest = cell;
          const m = TT_RANGE.exec(rest), one = m ? null : TT_ONE.exec(rest);
          if (m) { start = hm(m[1], m[2]); end = hm(m[3], m[4]); rest = rest.replace(m[0], ' '); }
          else if (one) { start = hm(one[1], one[2]); rest = rest.replace(one[0], ' '); }
          rest = rest.replace(/\(\s*live\s*\)/i, () => { type = 'live_set'; return ''; });
          rest = rest.replace(/(?:\(([^)]+)\)|@\s*(\S+))\s*$/, (all, a, b) => { const s = stageOf(a || b); if (s) { st = s; return ''; } return all; });
          rest = rest.replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim();
          if (cells.length > 1 && stageOf(rest)) st = stageOf(rest);
          else if (rest) names.push(rest);
        });
        if (!names.length || !/[\p{L}\p{N}]/u.test(names.join(''))) { skipped.push(raw); return; }
        push({ artist: names.join(' '), stage: st, day, start, end, set_type: type });
      });
    }
    const uniq = (k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))];
    return { ok: true, rows, skipped, days: uniq('day'), stages: uniq('stage'), csv };
  }

  /* Suchauftrag (wie collector.run_job, im Zeitraffer): eine Zeile pro Schritt, 2 von 3 mit Treffer. */
  const clTodo = (cl, restart) => cl.rows.filter((r) => r.checked && !r.ignored && !r.video_id && (restart || !r.searched));
  const clPerHour = () => Math.min(settings.festivals.collector_searches_per_hour, settings.throttle.max_searches_per_hour);
  function clRun(eid) {
    clearTimeout(clTimers[eid]);
    const cl = CL.get(eid), job = cl && cl.job;
    if (!job || !['pending', 'running'].includes(job.state)) return;
    if (state.backoff.active) { Object.assign(job, { state: 'pending', note: `Backoff until ${hhmm(state.backoff.until)} – continues automatically`, updated: nowIso() }); clEmitJob(eid); return; }
    const r = clTodo(cl, job.restart)[0];
    if (!r || job.done >= job.total) {
      Object.assign(job, { state: 'done', note: null, finished: nowIso(), updated: nowIso() });
      pushLog('ok', `Festival collector: ${clEdition(eid).edition} – search finished, ${job.hits} of ${job.total} set(s) found`);
      clEmitJob(eid);
      return;
    }
    if (job.state === 'pending') pushLog('info', `Festival collector: ${clEdition(eid).edition} – searching ${job.total - job.done} missing set(s), ${clPerHour()} searches per hour`);
    job.state = 'running';
    job.note = null;
    const ed = clEdition(eid), n = job.searches;
    r.searched = nowIso();
    state.counters.searches_hour++;
    if (n % 3 !== 2) {
      const sure = n % 3 === 0;
      r.video_id = clNewVideo(sure ? `${r.artist} | ${ed.edition}${r.stage ? ` | ${r.stage}` : ''}` : `${r.artist} live @ ${ed.series} (full set)`, 57 + (n % 5), { ch: sure ? 'qd' : 'rave', date: `${ed.year}-07-03` });
      Object.assign(r, { confidence: sure ? 0.95 : 0.66, confirmed: sure });
      job.hits++;
    }
    job.done++;
    job.searches++;
    job.updated = nowIso();
    if (job.done < job.total) job.note = `Next search at ${hhmm(Date.now() + 3600000 / clPerHour())}`;
    clEmitRows(eid, [r]);
    clEmitJob(eid);
    pushStatus();
    clTimers[eid] = setTimeout(() => clRun(eid), 900 * speed.factor);
  }

  /* Demo-Daten: Defqon.1 2024 (gemischte Zustände), Qlimax 2024 (Suche wartet), Decibel outdoor 2025 (frisch importiert).
     Die Zeiten sind erfunden. Zustand: lib:<id> = geladen, found, queued, ask:<Sicherheit> = braucht Bestätigung,
     searched = gesucht ohne Treffer, missing, ignored, off = Haken entfernt. */
  (function seedCollector() {
    const seed = (key, year, list, title) => {
      const e = editionOf(seriesByKey(key).id, year, ''), cl = clOpen(e.id), name = festivalOf(e).edition;
      list.forEach(([artist, stage, day, start, end, setType, source, st, min, extra]) => {
        const r = clAdd(e.id, Object.assign({ artist, stage, day, start, end, set_type: setType, source }, extra));
        const genre = stage === 'BLACK' ? 'Hardcore' : 'Hardstyle', own = title ? title(artist, stage, setType) : `${artist} | ${name}${stage ? ` | ${stage}` : ''}`;
        if (st.startsWith('lib:')) Object.assign(r, { video_id: st.slice(4), confidence: 0.97, confirmed: true });
        else if (st === 'found' || st === 'queued' || st === 'off') Object.assign(r, { video_id: clNewVideo(own, min, { genre, status: st === 'queued' ? 'queued' : 'new', date: `${year}-07-02` }), confidence: source === 'playlist' ? 1 : 0.93, confirmed: true, checked: st !== 'off' });
        else if (st.startsWith('ask:')) {
          const second = clNewVideo(`${artist} | ${seriesByKey(key).name} ${year - 1}${stage ? ` | ${stage}` : ''}`, min + 2, { genre, date: `${year - 1}-07-01` });
          Object.assign(r, { video_id: clNewVideo(`${artist} LIVE @ ${seriesByKey(key).name} Weekend (full set)`, min, { genre, ch: 'rave', date: `${year}-07-09` }), confidence: +st.slice(4), candidates: [{ id: second, confidence: 0.52 }], searched: isoAt(1, 21, 30) });
        } else if (st === 'searched') r.searched = isoAt(1, 21, 36);
        else if (st === 'ignored') r.ignored = true;
      });
      return cl;
    };
    const dq = seed('defqon1', 2024, [
      ['The Opening Ceremony', 'RED', 'Friday', '11:00', '11:30', 'opening', 'playlist', 'found', 28],
      ['Sound Rush', 'RED', 'Friday', '17:00', '18:00', null, 'timetable', 'missing'],
      ['D-Block & S-te-Fan', 'RED', 'Saturday', '19:00', '20:00', null, 'playlist', 'queued', 61],
      ['Sub Zero Project', 'RED', 'Saturday', '20:00', '21:00', 'live_set', 'playlist', 'lib:qDq24RedSZP'],
      ['Headhunterz', 'RED', 'Saturday', '21:00', '22:00', null, 'playlist', 'found', 60],
      ['Saturday Endshow', 'RED', 'Saturday', '23:00', '23:30', 'endshow', 'playlist', 'lib:qDq24RedEnd'],
      ['Ran-D', 'RED', 'Sunday', '19:00', '20:00', null, 'timetable', 'ask:0.72', 59],
      ['The Closing Ceremony', 'RED', 'Sunday', '22:30', '23:00', 'closing_ceremony', 'playlist', 'lib:qDq24RedCls'],
      ['Rooler', 'BLUE', 'Friday', '18:00', '19:00', null, 'timetable', 'searched'],
      ['Vertile', 'BLUE', 'Saturday', '20:00', '21:00', null, 'playlist', 'lib:qDq24BluVer'],
      ['Rebelion', 'BLUE', 'Saturday', '21:00', '22:00', null, 'playlist', 'lib:qDq24BluRwx'],
      ['D-Sturb b2b Act of Rage', 'BLUE', 'Saturday', '22:00', '23:00', null, 'timetable', 'ask:0.64', 58],
      ['Mutilator', 'BLUE', 'Sunday', '18:00', '19:00', null, 'playlist', 'queued', 57],
      ['Warface', 'BLUE', 'Sunday', '20:00', '21:00', null, 'playlist', 'found', 60],
      ['N-Vitral', 'BLACK', 'Friday', '19:00', '20:00', null, 'playlist', 'found', 59],
      ['Dr. Peacock', 'BLACK', 'Saturday', '21:00', '22:00', null, 'playlist', 'lib:qDq24BlkDrS'],
      ['Angerfist', 'BLACK', 'Saturday', '22:00', '23:00', null, 'playlist', 'lib:qDq24BlkAng'],
      ['Partyraiser', 'BLACK', 'Saturday', '23:00', '00:00', null, 'timetable', 'missing'],
      ['Miss K8', 'BLACK', 'Sunday', '20:00', '21:00', null, 'playlist', 'found', 61],
      ['Sefa', 'BLACK', 'Sunday', '21:00', '22:00', 'live_set', 'timetable', 'missing'],
      ['Demi Kanon', 'UV', 'Friday', '16:00', '17:00', null, 'timetable', 'ignored'],
      ['Primeshock', 'UV', 'Saturday', '15:00', '16:00', null, 'playlist', 'off', 56],
      ['Devin Wild', 'UV', 'Saturday', '18:00', '19:00', null, 'playlist', 'found', 60],
      ['KELTEK', 'UV', 'Sunday', '17:00', '18:00', null, 'timetable', 'missing'],
      ['POWER HOUR', null, 'Saturday', '12:00', '13:00', 'full_show', 'manual', 'lib:qDq24PwrHr1', 0, { edited: true }],
      ['Official Aftermovie', null, null, null, null, null, 'playlist', 'off', 4],
    ], (artist, stage, setType) => (setType && setType !== 'live_set' ? `Defqon.1 2024${stage ? ` | ${stage}` : ''} | ${artist}` : `${artist} | Defqon.1 2024${stage ? ` | ${stage}` : ''}`));
    Object.assign(dq, { playlist_url: 'https://www.youtube.com/playlist?list=PLmockDefqon2024Livesets', created: isoAt(6, 20, 12), updated: isoAt(1, 21, 40) });
    dq.job = { edition_id: dq.rows[0].edition_id, state: 'done', total: 3, done: 3, searches: 3, hits: 2, note: null, started: isoAt(1, 21, 24), updated: isoAt(1, 21, 36), finished: isoAt(1, 21, 36) };

    const ql = seed('qlimax', 2024, [
      ['Ncrypta', null, 'Saturday', '21:00', '22:00', null, 'timetable', 'found', 58],
      ['Sound Rush', null, 'Saturday', '22:00', '23:00', null, 'timetable', 'found', 60],
      ['D-Block & S-te-Fan', null, 'Saturday', '23:00', '00:00', null, 'timetable', 'searched'],
      ['Sub Zero Project', null, 'Saturday', '00:00', '01:00', null, 'timetable', 'missing'],
      ['Rebelion', null, 'Saturday', '01:00', '02:00', null, 'timetable', 'missing'],
      ['Vertile', null, 'Saturday', '02:00', '03:00', null, 'timetable', 'missing'],
      ['Warface', null, 'Saturday', '03:00', '04:00', null, 'timetable', 'missing'],
      ['The Purge', null, 'Saturday', '04:00', '05:00', null, 'timetable', 'missing'],
    ]);
    const qid = ql.rows[0].edition_id;
    clMatchOffline(qid);
    ql.rows.slice(0, 3).forEach((r) => { r.searched = r.searched || isoAt(0, 7, 50); });
    Object.assign(ql, { created: isoAt(0, 7, 30), updated: isoAt(0, 8, 2) });
    ql.job = { edition_id: qid, state: 'pending', total: clTodo(ql).length + 3, done: 3, searches: 3, hits: 2, note: 'Next search at 09:20 – 10 searches per hour', started: isoAt(0, 7, 44), updated: isoAt(0, 8, 2), finished: null };

    const db = seed('decibel', 2025, ['Act of Rage', 'Rooler', 'Vertile', 'Mutilator', 'Rebelion', 'Warface', 'D-Sturb', 'Sefa', 'Dr. Peacock', 'Angerfist', 'N-Vitral', 'Miss K8']
      .map((a, i) => [a, i < 7 ? 'Mainstage' : 'BLACK', i % 2 ? 'Sunday' : 'Saturday', `${14 + (i % 8)}:00`, `${15 + (i % 8)}:00`, null, 'timetable', 'missing']));
    Object.assign(db, { created: isoAt(0, 8, 5), updated: isoAt(0, 8, 5) });
  })();

  /** Eingaben einer Zeile prüfen (wie collector.clean_row). -> {values} | {errors} */
  function clClean(data, partial) {
    const d = data || {}, values = {}, errors = {};
    const text = (k, max) => { if (k in d) values[k] = String(d[k] == null ? '' : d[k]).trim().slice(0, max) || null; };
    if (!partial || 'artist' in d) { const a = String(d.artist == null ? '' : d.artist).trim().slice(0, 200); if (a) values.artist = a; else errors.artist = 'DJ / artist is required'; }
    text('stage', 40);
    text('day', 40);
    ['start', 'end'].forEach((k) => {
      if (!(k in d)) return;
      const raw = String(d[k] == null ? '' : d[k]).trim(), m = /^(\d{1,2})[:.](\d{2})$/.exec(raw);
      if (!raw) values[k] = null;
      else if (m && +m[1] < 24 && +m[2] < 60) values[k] = `${pad(+m[1])}:${m[2]}`;
      else errors[k] = `Invalid time: ${raw} (HH:MM)`;
    });
    if ('set_type' in d) { if (!d.set_type) values.set_type = null; else if (SET_TYPES.some((x) => x.code === d.set_type)) values.set_type = d.set_type; else errors.set_type = `Unknown set type: ${d.set_type}`; }
    return Object.keys(errors).length ? { errors } : { values };
  }
  function clFlag(ids, flag, value) {
    const hit = {};
    (ids || []).forEach((id) => { const r = clRow(id); if (r && r[flag] !== !!value) { r[flag] = !!value; (hit[r.edition_id] = hit[r.edition_id] || []).push(r); } });
    Object.entries(hit).forEach(([eid, rows]) => clEmitRows(+eid, rows));
    return { ok: true, changed: Object.values(hit).reduce((n, l) => n + l.length, 0) };
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
    mc: { backoff: { active: false, until: null, level: 0 }, counters: { downloads_run: 0, downloads_day: 1, searches_hour: 1 } }, // v0.10.0 Mixcloud
    ht: { backoff: { active: false, until: null, level: 0 }, counters: { downloads_run: 0, downloads_day: 0, searches_hour: 0 } }, // v0.10.0 hearthis.at
    reup: { running: false, cancel: false, timer: null, lastPass: null, done: new Set() }, // v0.10.0 Fingerabdrücke
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
  const PLATS = ['youtube', 'soundcloud', 'mixcloud', 'hearthis'];
  const PLABEL = { youtube: 'YouTube', soundcloud: 'SoundCloud', mixcloud: 'Mixcloud', hearthis: 'hearthis.at' };
  const PSTATE = { soundcloud: 'sc', mixcloud: 'mc', hearthis: 'ht' };
  const platOf = (x) => { const v = byId(x.id || x); return v && PLATS.includes(v.platform) ? v.platform : 'youtube'; };
  const boOf = (p) => (PSTATE[p] ? state[PSTATE[p]].backoff : state.backoff);
  const cntOf = (p) => (PSTATE[p] ? state[PSTATE[p]].counters : state.counters);
  const thOf = (p) => (PSTATE[p] ? settings[p] : settings.throttle);
  const hhmm = (iso) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const boView = (p) => {
    const b = boOf(p);
    return { active: b.active, until: b.until, level: b.level, remaining_s: b.active ? Math.max(0, Math.round((new Date(b.until) - Date.now()) / 1000)) : 0, reason: b.active ? 'HTTP 429 – too many requests' : '' };
  };
  const platformView = (p) => {
    const th = thOf(p);
    return {
      enabled: p === 'youtube' || !!settings[p].enabled, backoff: boView(p), counters: clone(cntOf(p)),
      limits: { downloads_run: th.max_downloads_per_run, downloads_day: th.max_downloads_per_day, searches_hour: th.max_searches_per_hour },
    };
  };
  function status() {
    const mode = settings.network.po_token_mode;
    return {
      app_version: '0.2.0', ytdlp_version: state.versions.ytdlp, plugin_version: state.versions.plugin,
      deno_ok: !(state.tools && state.tools.deno_ok === false), deno_version: '2.5.4', ffmpeg_ok: !(state.tools && state.tools.ffmpeg_ok === false), ffmpeg_version: '7.1',
      po_token: mode === 'off' ? { state: 'inactive', mode, detail: 'Provider turned off' } : { state: state.po.state, mode, detail: state.po.detail },
      backoff: {
        active: state.backoff.active, until: state.backoff.until, level: state.backoff.level,
        remaining_s: state.backoff.active ? Math.max(0, Math.round((new Date(state.backoff.until) - Date.now()) / 1000)) : 0,
      },
      next_check: nextCheck(),
      queue_length: activeQueue().length, queue_paused: state.paused,
      inbox_count: VIDEOS.filter((v) => v.status === 'inbox').length,
      counters: clone(state.counters),
      platforms: Object.fromEntries(PLATS.map((p) => [p, platformView(p)])),
    };
  }
  const pushStatus = () => emit('status', status());
  const targetOf = (v) => `${v.genre}\\${v.channel_name}\\${(v.upload_date || '').slice(0, 4)}\\`;
  /** Wie worker.DownloadQueue.blocked(): (code, Meldung), warum wartende Einträge nicht laufen. */
  function blockOf(p) {
    const th = thOf(p), c = cntOf(p), pre = p !== 'youtube' ? `${PLABEL[p]}: ` : '';
    if (boOf(p).active) return ['backoff', p !== 'youtube' ? `${PLABEL[p]}: backoff until ${hhmm(boOf(p).until)} – the rest stays in the queue` : 'Backoff active – the rest stays in the queue'];
    if (c.downloads_day >= th.max_downloads_per_day) return ['day_limit', `${pre}Daily limit reached (${c.downloads_day}/${th.max_downloads_per_day}) – the rest stays in the queue`];
    if (c.downloads_run >= th.max_downloads_per_run) return ['run_limit', `${pre}Run limit reached (${th.max_downloads_per_run}/${th.max_downloads_per_run}) – the rest stays in the queue; “Resume” starts a new run`];
    if (state.local) return state.local.slice();
    return null;
  }
  /* blocked_code/-reason nur, wenn ALLE wartenden Einträge stehen; sonst platform_blocked pro Plattform. */
  function blocked() {
    const waiting = state.queue.filter((q) => q.state === 'waiting');
    const per = {};
    PLATS.forEach((p) => {
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
  const setStatus = (v, st) => { v.status = st; emit('video', { id: v.id, status: st, genre: v.genre }); clVideoChanged(v.id); };

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
        festival: clFestivalOf(v.id), festival_suggestion: null,
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
    const looksUrl = /^(https?:\/\/|www\.|m\.|youtube\.com|soundcloud\.com|youtu\.be|mixcloud\.com|hearthis\.at)/i.test(text);
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
    if (host === 'mixcloud.com' || host === 'hearthis.at') {
      const mc = host === 'mixcloud.com';
      out.platform = mc ? 'mixcloud' : 'hearthis';
      const base = mc ? `https://www.mixcloud.com/${parts[0]}/` : `https://hearthis.at/${parts[0]}/`;
      const listSeg = mc ? 'playlists' : 'set';
      if (parts.length === 3 && parts[1] === listSeg) return Object.assign(out, { type: 'playlist', name: `${fromSlug(parts[0])} – ${fromSlug(parts[2])}`, url_normalized: `${base}${listSeg}/${parts[2]}/` });
      if (parts.length === 1 || (mc && parts.length === 2 && parts[1] === 'uploads')) return Object.assign(out, { type: 'channel', name: fromSlug(parts[0]), url_normalized: base });
      out.url_normalized = '';
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

  /* ---------- v0.7.0 Lautheit, Wellenform, Gedächtnis ----------
     Die Tonfolge dauert TONE_S; gemerkte Positionen stehen in echten Sekunden des Sets (Bibliothek) und werden
     linear auf die Tonfolge umgerechnet – so zeigen «Weiterhören» und Player plausible Werte. */
  const TONE_S = CHAPTERS.length * CHAPTER_S, MARGIN_S = 30, PEAK_N = 1600;
  const NOT_ANALYSED = new Set(['tTerrNight1', 'nNightShift', 'dTerrMega25']);
  const analysed = new Set();
  const anState = { running: false, cancel: false, timer: 0, lastPass: null };
  const PB = new Map([
    ['gGabbClassM', { at: 4363, h: 1 }], ['kRawNation4', { at: 2470, h: 5 }], ['zZrhPod0006', { at: 1325, h: 26 }],
    ['rIndoorCls2', { at: 3105, h: 49 }], ['cIndVol016', { at: 1980, h: 75 }], ['bBunkerSet2', { at: 5000, h: 98 }],
  ].map(([id, x]) => [id, { position: x.at, updated: new Date(Date.now() - x.h * 3600000).toISOString() }]));
  const seeded = (id) => { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909); return ((h >>>= 0) % 10000) / 10000; }; };
  function loudnessOf(id) {
    if (NOT_ANALYSED.has(id) && !analysed.has(id)) return null;
    const r = seeded(id + ':lufs'), lufs = +(-6.4 - r() * 3.4).toFixed(1), tp = +(0.2 + r() * 1.3).toFixed(1);
    return { lufs, true_peak: tp, gain: +(-18 - lufs).toFixed(2), peak: +Math.pow(10, tp / 20).toFixed(6), source: 'analysis' };
  }
  /** Hardstyle-artige Hüllkurve: pro Track Intro, Kick-Teil, Breakdown in der Mitte, Aufbau, Kick-Teil. */
  function peaksOf(id) {
    const r = seeded(id + ':peaks'), l = LIBRARY.find((x) => x.id === id) || {};
    const tracks = l.has_cue ? CHAPTERS.length : 9 + Math.floor(r() * 10), out = new Array(PEAK_N);
    for (let i = 0; i < PEAK_N; i++) {
      const pos = (i / PEAK_N) * tracks, f = pos - Math.floor(pos);
      let v = 0.86 + r() * 0.14;
      if (f < 0.04) v *= 0.35 + f * 14; // Übergang
      else if (f > 0.42 && f < 0.56) v *= 0.3 + 0.12 * Math.sin(i * 0.9) + r() * 0.08; // Breakdown
      else if (f >= 0.56 && f < 0.62) v *= 0.45 + (f - 0.56) * 9; // Aufbau
      if (i < 12) v *= i / 12;
      if (i > PEAK_N - 18) v *= (PEAK_N - i) / 18;
      out[i] = Math.max(0, Math.min(255, Math.round(v * 248)));
    }
    return out;
  }
  const hasPeaks = (id) => !NOT_ANALYSED.has(id) || analysed.has(id);
  const realDur = (id) => { const l = LIBRARY.find((x) => x.id === id); return l ? l.duration : TONE_S; };
  const resumeOn = () => settings.player.resume !== 'off';
  function resumeFor(id) {
    const x = PB.get(id), d = realDur(id);
    if (!x || !resumeOn() || x.position < MARGIN_S || x.position > d - MARGIN_S) return null;
    return { position: +((x.position / d) * TONE_S).toFixed(2), duration: TONE_S, updated: x.updated, real: x.position };
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

  /* ---------- Tracklisten (v0.6.0, «Tracklist-Suche») ----------
     Pro Set eine erfundene Trackliste aus einem gemeinsamen Pool (manche Tracks in vielen Sets -> «Meistgespielt»).
     Einige Sets: nummerierte Liste ohne Zeitstempel (Quelle Beschreibung), einige ganz ohne Trackliste. */
  const TRACK_POOL = [
    ['Kernschmelze', 'Concrete Pressure', '', 'Bunker Tapes'], ['Pulsewerk', 'Warehouse Anthem', 'Raw Edit', ''], ['Distortion Unit', 'Static Overdrive', '', 'Overdrive Records'],
    ['Hardfloor Zürich', 'No Sleep Till Sunrise', '', ''], ['Bunker 303 & NRG Tapes', 'Bassdrum Ritual', '', ''], ['Overdrive', 'Terror Transmission 303', 'VIP', ''],
    ['Stahlwerk feat. MC Rawdog', 'Iron Lung', '', 'Stahlwerk Audio'], ['Riot Engine', 'Molotov Melody', 'Pulsewerk Remix', ''], ['Nocturnal Pressure', 'Dead Hours', '', ''],
    ['Vandal Frequency x Kick Assassins', 'Sirens Of The City', '', ''], ['Toxic Tempo', '250 BPM Club', 'Extended Mix', ''], ['Zero Gravity Crew', 'Free Fall', '', 'Antigrav'],
    ['Black Mamba Sound', 'Venom', '', ''], ['Kick Assassins', 'Contract Killer', 'Kernschmelze Remix', ''], ['Mainframe Rebels', 'System Override', '', ''],
    ['Pulsewerk vs. Riot Engine', 'Collision Course', '', ''], ['Euphoric Theory', 'Golden Hour', '', 'Lightyear'], ['Euphoric Theory feat. Mila', 'Wings Of Glass', 'Radio Edit', ''],
    ['Raw Nation', 'Bloodline', '', ''], ['Speedfreak Society', 'Gabber Forever', '', ''], ['Distortion Unit', 'Feedback Loop', '', ''],
    ['Rotterdam Ravers', 'Maasvlakte ’96', '', ''], ['Terror Sisters', 'Hyperdrive', '', ''], ['Iron Curtain', 'Kicks From The East', 'Bootleg', ''],
    ['Neon Psycho', 'Laser Cult', '', ''], ['Vandal Frequency', 'Hooligan Hymn', '', ''], ['Kernschmelze', 'Fallout', 'Toxic Tempo Remix', ''],
    ['Mainframe Rebels', 'Kernel Panic', '', ''], ['Noise Doctrine', 'Sermon Of Distortion', '', 'Doctrine Audio'], ['Stahlwerk', 'Schmiede', 'Hardcore Edit', ''],
    ['Lunar Kicks', 'Moonquake', '', ''], ['Sub Basement', 'Concrete Jungle 2026', '', ''], ['Rave Reaktor & Toxic Tempo', 'Meltdown', '', ''],
    ['Pulsewerk', 'Night Drive', '', ''], ['Velvet Violence', 'Soft Kill', 'Uptempo Mix', ''], ['Raw Nation', 'Brotherhood', 'Live Edit', ''],
    ['Glitch Militia', 'Payload', '', ''], ['Tempo Tyrant', 'Crown Of Kicks', '', ''], ['Hardfloor Zürich', 'Langstrasse 4AM', '', ''],
  ];
  const TRACK_HOT = [0, 1, 2, 5, 10, 13]; // kommen in vielen Sets vor
  const TRACKLISTS = {};
  (() => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    LIBRARY.forEach((l, i) => {
      if (i % 7 === 5) return; // ohne Trackliste
      const n = 7 + Math.floor(rnd() * 9), dur = (l.duration || 3600), picks = [];
      TRACK_HOT.forEach((h, j) => { if (rnd() < 0.5 - j * 0.06) picks.push(h); });
      while (picks.length < n) { const k = Math.floor(rnd() * TRACK_POOL.length); if (!picks.includes(k)) picks.push(k); }
      picks.sort(() => rnd() - 0.5);
      const timed = i % 6 !== 4;
      const tracks = picks.slice(0, n).map((k, j) => {
        const [artist, title, version, label] = TRACK_POOL[k];
        return { start: timed ? Math.round((dur * j) / n) - (j ? Math.floor(rnd() * 20) : 0) : null, artist, title, version, label, is_id: false };
      });
      if (n > 9) tracks.splice(Math.floor(n / 2), 0, { start: null, artist: 'ID', title: 'ID', version: '', label: '', is_id: true });
      if (n > 12) tracks.splice(n - 2, 0, { start: null, artist: 'Riot Engine', title: 'ID', version: '', label: '', is_id: true });
      if (timed) tracks.forEach((x, j) => { if (x.start == null) x.start = Math.round(((tracks[j - 1] || {}).start + ((tracks[j + 1] || {}).start || dur)) / 2); });
      tracks.forEach((x, j) => { x.position = j + 1; });
      TRACKLISTS[l.id] = { source: timed ? (i % 3 ? 'chapters' : 'description') : 'description', tracks };
    });
  })();
  const tlState = { lastPass: isoAt(1, 9, 12), running: false, cancel: false, timer: null };
  const tlFold = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const tlIndexed = () => (tlState.lastPass ? LIBRARY.filter((l) => TRACKLISTS[l.id]) : []);
  const tlSearchText = (x) => (x.is_id && x.artist === 'ID' ? '' : tlFold(`${x.artist === 'ID' ? '' : x.artist} ${x.is_id ? '' : x.title} ${x.version}`));

  /* ---------- DJ-Seiten + Playlist-Export (v0.8.0, docs/bridge-api.md «DJ pages, playlist export») ---------- */
  /* Vereinfachte Nachbildung von core/artists.py: Titel-Segmente ohne Serie/Jahr/Bühne/Set-Art, «… by DJ»,
     b2b/vs/x und «&» trennen (bekannte Acts nicht), Kanal als Rückfall ausser Veranstalter-Kanälen. */
  let ART_ROWS = [['Headhunterz', ['HH']], ['Sub Zero Project', ['SZP']], ['D-Block & S-te-Fan', []], ['Angerfist', []], ['Miss K8', []],
    ['Dr. Peacock', ['Dr Peacock']], ['Coone', []], ['Partyraiser', []], ['N-Vitral', []]]
    .map(([name, aliases]) => ({ key: foldName(name), name, aliases, channel_url: null, hidden: false, builtin: true }));
  ART_ROWS.push({ key: 'kickdrumcollective', name: 'Kickdrum Collective', aliases: [], channel_url: null, hidden: true, builtin: false });
  const ART_GENERIC = new Set(('mix mixes yearmix megamix podcast radio fm episode session sessions classics classic anthems anthem tribute special edition vol marathon continuous '
    + 'hour hours minute minutes bpm show livestream stream recording recorded full warmup liveset closing opening ceremony endshow official music records tv festival '
    + 'hardstyle hardcore uptempo frenchcore rawstyle gabber gabba terror terrorcore speedcore industrial euphoric oldschool mainstream rave underground vault archive '
    + 'afterhours weekend tape tapes power').split(' '));
  let artSig = 0, artCache = null;
  const artWords = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  const artRow = (k) => ART_ROWS.find((r) => r.key === k || foldName(r.name) === k || r.aliases.some((a) => foldName(a) === k));
  const artClean = (x) => String(x || '').replace(/\s*[([{][^)\]}]*[)\]}]\s*/g, ' ').replace(/\s+(feat\.?|ft\.?|featuring|with|hosted by)\s+.*$/i, '')
    .replace(/\s+(live( ?set)?|liveset|dj ?set|full set|set)$/i, '').replace(/\s+/g, ' ').trim();
  const artPlausible = (n) => !!n && /[a-z]/i.test(n) && n.length <= 80 && !artWords(n).some((w) => ART_GENERIC.has(w)) && !artWords(n).every((w) => /^\d+$/.test(w));
  function artSplit(text) {
    const whole = artClean(text), out = [];
    if (artRow(foldName(whole))) return [whole];
    whole.split(/\s+(?:b2b|b3b|vs\.?|x)\s+/i).forEach((p0) => {
      const p = artClean(p0);
      if (!p) return;
      if (artRow(foldName(p))) { out.push(p); return; }
      const parts = p.split(/\s*(?:&|\+|,)\s*/).map(artClean).filter(Boolean);
      if (parts.length > 1 && parts.every(artPlausible)) out.push(...parts);
      else if (artPlausible(p)) out.push(p);
    });
    return out.filter((n, i, a) => a.findIndex((m) => foldName(m) === foldName(n)) === i);
  }
  function artCredit(l) {
    const series = SERIES.flatMap((x) => [x.name, ...x.aliases, ...(x.weak_aliases || [])]).map((a) => artWords(a).join(' ')).filter(Boolean);
    const tw = ` ${artWords(l.title).join(' ')} `, hasSeries = !!l.festival || series.some((a) => tw.includes(` ${a} `));
    if (/\b(full show|anthem show|full stream|livestream)\b/i.test(l.title)) return null;
    for (const seg of String(l.title).split(/\s+[|@~•·]\s+|\s+[-–—]\s+/)) {
      const by = /\b(?:mix|mixed|hosted|presented|set)\s+by\s+(.+)$/i.exec(seg);
      if (by) return artClean(by[1]);
      const w = artWords(seg).join(' ');
      if (!w || series.some((a) => ` ${w} `.includes(` ${a} `)) || /^(19|20)\d\d$/.test(w) || STAGES.some((x) => x.toLowerCase() === w)) continue;
      if (/^(the )?(closing|opening) ceremony|^(saturday |sunday )?endshow|^power hour/.test(w)) continue;
      const n = artClean(seg), parts = artSplit(n);
      if (!parts.length) continue;
      if (hasSeries || parts.some((x) => artRow(foldName(x))) || parts.some((x) => foldName(x) === foldName(l.artist))) return n;
      break;
    }
    /* Kanal als Artist: kein Veranstalter, kein Festival-Set, und der Kanalname steht im Titel. */
    if (!l.festival && artPlausible(l.artist) && !SERIES.some((x) => (x.channels || []).includes(l.artist))
      && (artRow(foldName(l.artist)) || foldName(l.title).includes(foldName(l.artist)))) return l.artist;
    return null;
  }
  function artIndex() {
    if (artCache && artCache.n === LIBRARY.length && artCache.sig === artSig) return artCache;
    const A = new Map(), byVid = new Map();
    ART_ROWS.forEach((r) => A.set(r.key, { key: r.key, row: r, spell: {}, vids: new Map() }));
    LIBRARY.forEach((l) => {
      const c = artCredit(l), keys = [];
      (c ? artSplit(c) : []).forEach((n) => {
        const r = artRow(foldName(n)), k = r ? r.key : foldName(n);
        if (!k || keys.includes(k)) return;
        if (!A.has(k)) A.set(k, { key: k, row: null, spell: {}, vids: new Map() });
        A.get(k).spell[n] = (A.get(k).spell[n] || 0) + 1;
        keys.push(k);
      });
      keys.forEach((k) => A.get(k).vids.set(l.id, keys.length > 1 ? 'b2b' : 'solo'));
      if (keys.length) byVid.set(l.id, keys);
    });
    artCache = { n: LIBRARY.length, sig: artSig, A, byVid };
    return artCache;
  }
  const artName = (a) => (a.row ? a.row.name : Object.entries(a.spell).sort((x, y) => y[1] - x[1])[0][0]);
  function artInitials(name) {
    const w = String(name).split(/[^\p{L}\p{N}]+/u).filter((x) => x && !/^\d+$/.test(x));
    if (!w.length) return '?';
    return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + (w.length === 2 ? w[1][0] : w[1][0])).toUpperCase();
  }
  function artSummary(a) {
    const ls = [...a.vids.keys()].map(libById).filter(Boolean), name = artName(a);
    const years = [...new Set(ls.map((l) => (l.festival && l.festival.event_year) || +String(l.upload_date).slice(0, 4)).filter(Boolean))].sort();
    return {
      key: a.key, name, initials: artInitials(name), aliases: a.row ? a.row.aliases.slice() : [], spellings: Object.keys(a.spell),
      channel_url: (a.row && a.row.channel_url) || null, edited: !!(a.row && !a.row.builtin), hidden: !!(a.row && a.row.hidden),
      sets: ls.length, b2b: [...a.vids.values()].filter((r) => r === 'b2b').length, seconds: ls.reduce((n, l) => n + (l.duration || 0), 0),
      festivals: new Set(ls.filter((l) => l.festival && l.festival.kind === 'festival').map((l) => l.festival.series_id)).size, years,
      last: ls.map((l) => String(l.upload_date || '')).sort().pop() || null,
    };
  }
  const artFind = (key) => { const A = artIndex().A; const r = artRow(foldName(key)); return A.get(key) || (r && A.get(r.key)) || A.get(foldName(key)) || null; };
  const artErr = (errors) => ({ ok: false, errors, error: Object.values(errors)[0] });
  const artTaken = (except) => new Set(ART_ROWS.filter((r) => r.key !== except).flatMap((r) => [r.key, foldName(r.name), ...r.aliases.map(foldName)]));
  function artSets(a) {
    return [...a.vids.keys()].map(libById).filter(Boolean).sort((x, y) => String(y.upload_date).localeCompare(String(x.upload_date)));
  }

  /* Playlists: «Dateien» nur im Speicher; ein Ordner auf einem anderen Laufwerk als die Musik = absolute Pfade. */
  const PL_FILES = new Set();
  let PLAYLISTS = [], plSeq = 0;
  const plFolder = () => (settings.playlists && settings.playlists.folder) || `${TARGET}\\Playlists`;
  const plKinds = ['edition', 'series', 'genre', 'artist', 'filter', 'checklist', 'continue'];
  function plItems(spec) {
    const done = (l) => l;
    switch (spec.kind) {
      case 'edition': return LIBRARY.filter((l) => l.festival && l.festival.edition_id === +spec.edition_id).map(done);
      case 'series': return LIBRARY.filter((l) => l.festival && l.festival.series_id === +spec.series_id);
      case 'genre': return LIBRARY.filter((l) => l.genre === spec.genre);
      case 'artist': { const a = artFind(spec.key); return a ? artSets(a) : []; }
      case 'checklist': { const c = CL.get(+spec.edition_id); return c ? c.rows.map(clRowView).filter((r) => r.status === 'downloaded' && r.video_id).map((r) => libById(r.video_id)).filter(Boolean) : []; }
      case 'continue': return [...PB.keys()].map(libById).filter(Boolean);
      default: {
        const f = spec.filters || {}, q = foldName(f.search);
        return LIBRARY.filter((l) => (!f.genre || l.genre === f.genre) && (!f.channel || l.artist === f.channel) && (!f.year || String(l.year) === String(f.year))
          && (!f.edition_id || (l.festival && l.festival.edition_id === +f.edition_id)) && (!f.series_id || (l.festival && l.festival.series_id === +f.series_id))
          && (!q || foldName(`${l.title} ${l.artist} ${l.genre} ${l.festival ? l.festival.edition : ''}`).includes(q)));
      }
    }
  }
  function plName(spec) {
    const ed = (id) => { const l = LIBRARY.find((x) => x.festival && x.festival.edition_id === +id); return l ? l.festival.edition : 'Festival'; };
    switch (spec.kind) {
      case 'edition': return ed(spec.edition_id);
      case 'checklist': return `${ed(spec.edition_id)} – checklist`;
      case 'series': { const x = seriesById(spec.series_id); return x ? x.name : 'Festival'; }
      case 'genre': return spec.genre;
      case 'artist': { const a = artFind(spec.key); return a ? artName(a) : spec.key; }
      case 'continue': return 'Continue listening';
      default: { const f = spec.filters || {}; const parts = [f.edition_id ? ed(f.edition_id) : '', f.search, f.genre, f.channel, f.year].filter(Boolean); return parts.length ? parts.join(' · ') : 'Library'; }
    }
  }
  const plSpecKey = (spec) => JSON.stringify(Object.keys(spec).sort().reduce((o, k) => { o[k] = spec[k]; return o; }, {}));
  const plSaved = (p) => ({ id: p.id, name: p.name, path: p.path, kind: p.spec.kind, relative: p.relative, sync: p.sync, count: p.count, updated: p.updated, exists: PL_FILES.has(p.path) });
  const plSan = (n) => String(n || '').replace(/[:/\\|]/g, '-').replace(/"/g, "'").replace(/[<>?*]/g, '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');


  /* ---------- v0.9.0 Statistik (Beispieldaten), Benachrichtigungen, Medienserver ---------- */
  const notifyState = { available: true };
  const msState = { secret: { plex: false, jellyfin: false }, last: null };
  const STAT_MONTHS = 22;
  const hfrac = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return (h % 10007) / 10007; };
  const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  function statMonths() {
    const out = [], now = new Date();
    for (let i = STAT_MONTHS - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1), key = monthKey(d);
      const k = STAT_MONTHS - 1 - i;
      let n = Math.round(14 + k * 2.1 + hfrac(key) * 16 + (d.getMonth() === 11 ? 22 : 0) + (d.getMonth() === 6 || d.getMonth() === 7 ? 12 : 0));
      if (i === 0) n = Math.round(n * Math.min(1, now.getDate() / 30));
      const avg = 3900 + Math.round(hfrac(key + 's') * 1500);
      out.push({ month: key, sets: n, seconds: n * avg, bytes: n * avg * 40000 });
    }
    return out;
  }
  const FEST = [['Defqon.1', 0.11, 9], ['Qlimax', 0.07, 11], ['Dominator', 0.06, 8], ['Thunderdome', 0.05, 7], ['Masters of Hardcore', 0.045, 9], ['Reverze', 0.04, 6], ['Hard Bass', 0.03, 5], ['Intents Festival', 0.028, 6], ['Decibel outdoor', 0.025, 7], ['Rebirth Festival', 0.02, 5], ['Supremacy', 0.018, 4], ['Ground Zero', 0.015, 4], ['Harmony of Hardcore', 0.012, 3]];
  const DJS = [['Headhunterz', 'HE', 0.034], ['Angerfist', 'AN', 0.031], ['Sub Zero Project', 'SZ', 0.027], ['Miss K8', 'MK', 0.024], ['Sefa', 'SE', 0.021], ['D-Block & S-te-Fan', 'DS', 0.019], ['Warface', 'WA', 0.017], ['Dr. Peacock', 'DP', 0.015], ['Rooler', 'RO', 0.013], ['Mad Dog', 'MD', 0.012]];
  const TRACKS = [['Angerfist', 'Raise & Revolt', '', 0.021], ['Headhunterz', 'Dragonborn', 'Part 2', 0.018], ['Sub Zero Project', 'The Project', '', 0.016], ['Sefa', 'Calling Out', '', 0.014], ['Miss K8', 'Mayhem', '', 0.013], ['Dr. Peacock', 'Trip to Ireland', '', 0.012], ['Warface', 'Rave Is My Life', 'Defqon.1 Edit', 0.011], ['D-Block & S-te-Fan', 'Feel Inside', '', 0.0105], ['Rooler', 'Dance with the Devil', '', 0.01], ['Mad Dog', 'Here We Go Again', '', 0.009]];
  function mockStats(from, to) {
    const empty = !LIBRARY.length;
    const all = empty ? [] : statMonths();
    const fm = from ? from.slice(0, 7) : null, tm = to ? to.slice(0, 7) : null;
    let months = all.filter((m) => (!fm || m.month >= fm) && (!tm || m.month <= tm)).map((m) => Object.assign({}, m));
    if (from && months.length && months[0].month === fm) { // erster Monat nur anteilig
      const d = new Date(from), dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const f = Math.max(0, (dim - d.getDate() + 1) / dim);
      const m0 = months[0];
      if (months.length > 1 || !to) { m0.sets = Math.round(m0.sets * f); m0.seconds = Math.round(m0.seconds * f); m0.bytes = Math.round(m0.bytes * f); }
    }
    const sum = (k) => months.reduce((a, m) => a + m[k], 0);
    const n = sum('sets'), sec = sum('seconds'), bytes = sum('bytes'), libN = all.reduce((a, m) => a + m.sets, 0);
    const share = (f) => Math.round(n * f);
    const genres = [['Hardstyle', 0.38], ['Hardcore', 0.33], ['Uptempo', 0.21], ['Unsortiert', 0.08]].map(([g, f]) => ({ name: g, sets: share(f), seconds: Math.round(sec * f), bytes: Math.round(bytes * f) }))
      .map((g) => Object.assign(g, { color: (settings.genres.items.find((x) => x.name === g.name) || {}).color || null })).filter((g) => g.sets);
    const fest = FEST.map(([name, f, ed]) => ({ key: name.toLowerCase().replace(/[^a-z0-9]/g, ''), name, sets: share(f), seconds: Math.round(sec * f), editions: Math.max(1, Math.min(ed, Math.round(ed * Math.min(1, n / 600)))) })).filter((x) => x.sets);
    const yNow = new Date().getFullYear();
    const years = [];
    for (let y = 2011; y <= yNow; y++) { const w = Math.pow(1.22, y - 2011) * (0.7 + hfrac('y' + y) * 0.6); years.push([y, w]); }
    const wsum = years.reduce((a, x) => a + x[1], 0);
    const yrs = years.map(([y, w]) => ({ year: y, sets: Math.round((n * 0.97 * w) / wsum), seconds: Math.round((sec * 0.97 * w) / wsum) })).filter((y) => y.sets);
    if (n) yrs.push({ year: null, sets: Math.round(n * 0.03), seconds: 0 });
    const wl = months.map((m) => ({ month: m.month, checks: Math.round(30 * 1.4 + hfrac(m.month + 'c') * 6), found: Math.round(m.sets * 1.7 + hfrac(m.month + 'f') * 9) }));
    const found = wl.reduce((a, m) => a + m.found, 0);
    const src = SOURCES.filter((x) => x.enabled).map((x, i) => ({ id: x.id, name: x.name, type: x.type, platform: x.platform, found: Math.round(found * [0.24, 0.19, 0.15, 0.12, 0.09, 0.08, 0.07, 0.06][i % 8]), downloaded: 0, inbox: 0 }))
      .map((x) => Object.assign(x, { downloaded: Math.round(x.found * 0.58), inbox: Math.round(x.found * 0.06) })).sort((a, b) => b.found - a.found);
    const fItems = fest.slice(0, 10);
    return {
      range: { from: from || null, to: to || null },
      totals: { sets: n, seconds: sec, bytes, sizes_missing: 0, avg_seconds: n ? Math.round(sec / n) : 0, first: months.length ? `${months[0].month}-03T19:12:00+00:00` : null, last: n ? isoAt(0, 6, 12) : null, library_sets: libN },
      genres,
      festivals: { items: fItems, other: fest.slice(10).reduce((a, x) => a + x.sets, 0), festivals: fest.length },
      years: n ? yrs : [],
      djs: DJS.map(([name, ini, f]) => ({ key: name.toLowerCase().replace(/[^a-z0-9]/g, ''), name, initials: ini, sets: share(f), seconds: Math.round(sec * f) })).filter((x) => x.sets),
      months: n || from ? months.map((m) => ({ month: m.month, sets: m.sets, seconds: m.seconds, bytes: m.bytes })) : [],
      platforms: n ? [{ platform: 'youtube', sets: n - share(0.14) - share(0.05) - share(0.03), seconds: Math.round(sec * 0.78), bytes: Math.round(bytes * 0.78) }, { platform: 'soundcloud', sets: share(0.14), seconds: Math.round(sec * 0.14), bytes: Math.round(bytes * 0.14) },
        { platform: 'mixcloud', sets: share(0.05), seconds: Math.round(sec * 0.05), bytes: Math.round(bytes * 0.05) }, { platform: 'hearthis', sets: share(0.03), seconds: Math.round(sec * 0.03), bytes: Math.round(bytes * 0.03) }] : [],
      tracks: TRACKS.map(([artist, title, version, f]) => ({ key: `${artist}|${title}`.toLowerCase(), artist, title, version, sets: Math.round(n * f) })).filter((x) => x.sets >= 2),
      watchlist: { checks: wl.reduce((a, m) => a + m.checks, 0), scheduled: Math.round(wl.reduce((a, m) => a + m.checks, 0) * 0.64), found, downloaded: Math.round(found * 0.21), last: isoAt(0, 3, 0), months: wl, sources: empty ? [] : src.slice(0, 10), source_count: SOURCES.length, enabled_sources: SOURCES.filter((x) => x.enabled).length, inbox: 12 },
      series_count: 0,
    };
  }

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
        if (platform && !PLATS.includes(platform)) return { ok: false, error: 'Unbekannte Plattform.' };
        if (!platform || platform === 'youtube') state.backoff = { active: false, until: null, level: 0 };
        Object.entries(PSTATE).forEach(([p, k]) => { if (!platform || platform === p) state[k].backoff = { active: false, until: null, level: 0 }; });
        pushLog('warn', `Backoff${platform ? ` (${PLABEL[platform]})` : ''} lifted manually`);
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
        if (!PLATS.includes(p)) return { ok: false, error: 'Unbekannte Plattform.' };
        if (p !== 'youtube' && !settings[p].enabled) return { ok: false, error: `${PLABEL[p]} is turned off (Settings › ${PLABEL[p]})` };
        if (boOf(p).active) return { ok: false, error: p !== 'youtube' ? `Backoff (${PLABEL[p]}) active until ${hhmm(boOf(p).until)} – search blocked` : 'Backoff active – search is blocked.' };
        if (cntOf(p).searches_hour >= thOf(p).max_searches_per_hour) return { ok: false, error: 'Limit “searches per hour” reached.' };
        const effective = effectiveQuery(query, o);
        const ids = sc ? SC_SEARCH_IDS : p === 'mixcloud' ? MC_SEARCH_IDS : p === 'hearthis' ? HT_SEARCH_IDS : o.year ? yearHits(o.year) : SEARCH_IDS;
        lastSearch = { query, effective_query: effective, genre: o.genre, year: o.year || null, ids, platform: p };
        cntOf(p).searches_hour++;
        pushLog('info', `Search${p !== 'youtube' ? ` (${PLABEL[p]})` : ''} “${effective}” · ${ids.length} results (flat)`);
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
        else if (src.type !== 'search' && !/^https?:\/\/((www\.|music\.|m\.)?youtube\.com|(www\.|m\.)?soundcloud\.com|(www\.)?mixcloud\.com|(www\.)?hearthis\.at)\//.test(url)) errors.url_or_query = 'Unsupported URL – expected a channel or playlist URL of YouTube, a user or set URL of SoundCloud, or a user or playlist URL of Mixcloud or hearthis.at.';
        else if (src.type !== 'search' && /mixcloud\.com/.test(url) && !settings.mixcloud.enabled) errors.url_or_query = 'Mixcloud is turned off (Settings › Mixcloud).';
        else if (src.type !== 'search' && /hearthis\.at/.test(url) && !settings.hearthis.enabled) errors.url_or_query = 'hearthis.at is turned off (Settings › hearthis.at).';
        else if (src.type !== 'search' && /soundcloud\.com/.test(url) && !settings.soundcloud.enabled) errors.url_or_query = 'SoundCloud is turned off (Settings › SoundCloud).';
        else if (src.type === 'channel' && /soundcloud\.com\/[^/]+\/sets\//.test(url)) errors.url_or_query = 'Choose the type “Playlist” for a set.';
        else if (src.type === 'playlist' && /soundcloud\.com/.test(url) && !/\/sets\/[^/]+/.test(url)) errors.url_or_query = 'SoundCloud playlist URL expected (…/<user>/sets/<set>).';
        else if (src.type === 'channel' && /\/(playlists|releases|featured|shorts|community|podcasts|about)\/?$/.test(url)) errors.url_or_query = 'Only the channel URL itself, /videos or /streams – other tabs are not supported.';
        else if (src.type === 'playlist' && !/soundcloud\.com/.test(url) && !/[?&]list=[\w-]+/.test(url)) errors.url_or_query = 'Playlist URL expected (…/playlist?list=…).';
        if (src.type === 'search' && src.platform != null && !PLATS.includes(src.platform)) errors.platform = 'Unknown platform.';
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
        return { ok: true, source_id: id, known_total: known, entries, cap, requests, seconds: Math.round(requests * interval), per_hour: perHour, page_size: page, conservative: known == null, position, resume: position > 0, reread: Math.ceil(position / page), headless_ok: requests <= perHour };
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
        return { ok: true, id, src: demoTone(), title: l.title, artist: l.artist, genre: l.genre, platform: l.platform || 'youtube', duration: CHAPTERS.length * CHAPTER_S, cover: null, chapters,
          loudness: loudnessOf(id), resume: resumeFor(id), peaks: hasPeaks(id) ? peaksOf(id) : null };
      });
    },
    /* v0.7.0 Wellenform (lazy), Gedächtnis, Analyse-Durchlauf */
    get_waveform(id) {
      return later(30, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l || l.missing) return { ok: false, error: 'Entry is not in the library' };
        if (hasPeaks(id)) return { ok: true, status: 'ready', peaks: peaksOf(id), duration: l.duration };
        setTimeout(() => { analysed.add(id); emit('waveform', { id, ok: true, peaks: peaksOf(id), duration: l.duration, loudness: loudnessOf(id) }); }, 1400 * speed.factor);
        return { ok: true, status: 'pending' };
      });
    },
    save_position(id, position, duration) {
      return later(10, () => {
        if (!resumeOn()) return { ok: true, stored: false };
        const d = realDur(id), real = ((+position || 0) / (+duration || TONE_S)) * d;
        if (!(real >= MARGIN_S && real <= d - MARGIN_S)) { PB.delete(id); return { ok: true, stored: false }; }
        PB.set(id, { position: Math.round(real), updated: new Date().toISOString() });
        return { ok: true, stored: true };
      });
    },
    forget_position: (id) => later(10, () => { PB.delete(id); return { ok: true }; }),
    set_now_playing: () => later(5, () => ({ ok: true })),
    get_continue_listening(limit) {
      return later(20, () => {
        if (!resumeOn()) return { ok: true, items: [] };
        const items = [...PB.entries()].map(([id, x]) => ({ id, x, l: LIBRARY.find((v) => v.id === id) }))
          .filter((e) => e.l && !e.l.missing && e.x.position >= MARGIN_S && e.x.position <= e.l.duration - MARGIN_S)
          .sort((a, b) => b.x.updated.localeCompare(a.x.updated))
          .slice(0, Math.max(1, Math.min(20, +limit || 5)))
          .map((e) => ({ id: e.id, position: e.x.position, duration: e.l.duration, updated: e.x.updated, title: e.l.title, artist: e.l.artist, genre: e.l.genre, platform: e.l.platform || 'youtube' }));
        return { ok: true, items };
      });
    },
    get_analysis_status: () => later(30, () => {
      const lib = LIBRARY.filter((l) => !l.missing), done = lib.filter((l) => hasPeaks(l.id)).length;
      return { total: lib.length, analysed: done, tagged: done, waveforms: done, failed: 0, pending: lib.length - done, last_pass: anState.lastPass, ffmpeg: true, running: anState.running };
    }),
    analyse_library(opts) {
      return later(60, () => {
        const scope = opts && opts.scope === 'all' ? 'all' : 'new';
        if (anState.running) return { ok: true, started: false, running: true };
        const todo = LIBRARY.filter((l) => !l.missing && (scope === 'all' || !hasPeaks(l.id)));
        Object.assign(anState, { running: true, cancel: false });
        emit('audio_analysis', { phase: 'start', scope });
        pushLog('info', 'Analysing loudness and waveforms (offline, one file at a time) …');
        let done = 0;
        const total = todo.length;
        const step = () => {
          if (!anState.cancel && done < total) {
            const l = todo[done++];
            analysed.add(l.id);
            emit('media_analysed', { id: l.id, ok: true, loudness: loudnessOf(l.id), peaks: true, tagged: true });
            emit('audio_analysis', { phase: 'progress', scope, done, total, analysed: done, failed: 0 });
          }
          if (!anState.cancel && done < total) { anState.timer = setTimeout(step, 700 * speed.factor); return; }
          anState.running = false;
          if (!anState.cancel) anState.lastPass = new Date().toISOString();
          pushLog('ok', `Loudness analysed: ${done} files, ${done} done, 0 failed`);
          emit('audio_analysis', { phase: 'done', scope, ok: true, cancelled: anState.cancel, total, done, analysed: done, failed: 0 });
        };
        anState.timer = setTimeout(step, 300 * speed.factor);
        return { ok: true, started: true, scope };
      });
    },
    cancel_analyse_library: () => later(20, () => { anState.cancel = true; return { ok: true, running: anState.running }; }),
    /* ---------- v0.10.0 Re-Uploads per Audio-Fingerabdruck (offline) ---------- */
    get_reupload_status: () => later(30, () => {
      const lib = LIBRARY.filter((l) => !l.missing);
      const done = Math.min(lib.length, 18 + state.reup.done.size);
      const marks = LIBRARY.filter((l) => l.reupload);
      const n = (st) => marks.filter((l) => l.reupload.state === st).length;
      return { total: lib.length, fingerprinted: done, failed: 0, pending: lib.length - done, open: n('open'), kept: n('kept'), linked: n('linked'), last_pass: state.reup.lastPass, ffmpeg: true, running: state.reup.running, enabled: !!settings.reupload.enabled };
    }),
    fingerprint_library(opts) {
      return later(60, () => {
        const scope = opts && opts.scope === 'all' ? 'all' : 'new';
        if (!settings.reupload.enabled) return { ok: false, error: 'Re-upload detection is turned off (Settings › Re-uploads)' };
        if (state.reup.running) return { ok: true, started: false, running: true };
        const lib = LIBRARY.filter((l) => !l.missing);
        const total = scope === 'all' ? lib.length : Math.max(0, lib.length - 18 - state.reup.done.size);
        Object.assign(state.reup, { running: true, cancel: false });
        emit('fingerprint', { phase: 'start', scope });
        pushLog('info', 'Fingerprinting the library (offline, one file at a time) …');
        let done = 0;
        const step = () => {
          if (!state.reup.cancel && done < total) {
            state.reup.done.add(lib[lib.length - 1 - (done % lib.length)].id);
            done++;
            emit('fingerprint', { phase: 'progress', scope, done, total, found: 0, failed: 0 });
          }
          if (!state.reup.cancel && done < total) { state.reup.timer = setTimeout(step, 600 * speed.factor); return; }
          state.reup.running = false;
          if (!state.reup.cancel) state.reup.lastPass = new Date().toISOString();
          pushLog('ok', `Library fingerprinted: ${done} files, 0 probable re-uploads, 0 failed`);
          emit('fingerprint', { phase: 'done', scope, ok: true, cancelled: state.reup.cancel, total, done, found: 0, failed: 0 });
        };
        state.reup.timer = setTimeout(step, 300 * speed.factor);
        return { ok: true, started: true, scope };
      });
    },
    cancel_fingerprint_library: () => later(20, () => { state.reup.cancel = true; return { ok: true, running: state.reup.running }; }),
    get_catchup_status: () => later(10, () => ({ ok: true, running: null })),
    cancel_catchup: () => later(10, () => ({ ok: true, cancelled: false })),
    get_reuploads: (opts) => later(30, () => ({
      ok: true,
      items: LIBRARY.filter((l) => l.reupload && ((opts && opts.state === 'all') || l.reupload.state === 'open'))
        .map((l) => ({ id: l.id, title: l.title, platform: l.platform, channel: l.artist, file_path: l.file_path, downloaded_at: l.downloaded_at, reupload: clone(l.reupload) })),
    })),
    resolve_reupload(id, action) {
      return later(80, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l || !l.reupload) return { ok: false, error: 'This set is not marked as a re-upload' };
        const present = l.reupload.of.present || 'ok';
        if (action === 'delete_new' && present !== 'ok') return { ok: false, error: 'The original file is missing – this copy is the last one and was not deleted.', original: present };
        if (action === 'adopt') {
          if (present === 'ok') return { ok: false, error: 'The original file is still there – nothing to replace', original: present };
          const removed = present === 'missing' ? l.reupload.of.id : null;
          if (removed) { LIBRARY = LIBRARY.filter((x) => x.id !== removed); emit('video', { id: removed, status: 'ignored', genre: null }); }
          l.reupload = null;
          emit('reupload', { id, reupload: null, adopted: true });
          return { ok: true, id, removed, reupload: null };
        }
        if (action === 'delete_new') {
          LIBRARY = LIBRARY.filter((x) => x !== l);
          const v = byId(id);
          if (v) v.status = 'ignored';
          emit('video', { id, status: 'ignored', genre: null });
          emit('reupload', { id, reupload: null, deleted: true });
          pushStatus();
          return { ok: true };
        }
        const st = { keep: 'kept', link: 'linked', open: 'open' }[action];
        if (!st) return { ok: false, error: 'Unknown action (allowed: keep, link, delete_new, adopt, open)' };
        l.reupload.state = st;
        emit('reupload', { id, reupload: clone(l.reupload) });
        return { ok: true, id, state: st, reupload: clone(l.reupload) };
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

    /* Tracklist-Suche (v0.6.0) */
    search_tracks(query) {
      return later(70, () => {
        const ws = tlFold(query).split(' ').filter(Boolean);
        const out = { ok: true, query, engine: 'fts5', sets: [], hits: 0, truncated: false };
        if (!ws.length) return out;
        const has = (txt, w) => txt.split(' ').some((x) => x.startsWith(w));
        tlIndexed().slice().sort((a, b) => String(b.downloaded_at).localeCompare(String(a.downloaded_at))).forEach((l) => {
          const hits = TRACKLISTS[l.id].tracks.filter((x) => { const txt = tlSearchText(x); return txt && ws.every((w) => has(txt, w)); });
          if (!hits.length) return;
          out.hits += hits.length;
          out.sets.push({ id: l.id, title: l.title, artist: l.artist, duration: l.duration, thumbnail: l.thumbnail, genre: l.genre, platform: l.platform || 'youtube', upload_date: l.upload_date, downloaded_at: l.downloaded_at, hits: clone(hits.slice(0, 12)), more: Math.max(0, hits.length - 12) });
        });
        return out;
      });
    },
    get_tracklist(id) {
      return later(50, () => {
        const l = LIBRARY.find((x) => x.id === id);
        if (!l) return { ok: false, error: 'This set is not in the library' };
        const tl = TRACKLISTS[id];
        return { ok: true, video_id: id, source: tl ? tl.source : 'none', extracted: tlState.lastPass, tracks: tl ? clone(tl.tracks) : [] };
      });
    },
    get_top_tracks(limit) {
      return later(50, () => {
        const counts = new Map();
        tlIndexed().forEach((l) => {
          const seen = new Set();
          TRACKLISTS[l.id].tracks.forEach((x) => {
            if (x.is_id || !x.artist) return;
            const key = `${tlFold(x.artist)}|${tlFold(x.title)}|${tlFold(x.version.replace(/extended mix|radio edit/i, ''))}`;
            if (seen.has(key)) return;
            seen.add(key);
            const c = counts.get(key) || { key, artist: x.artist, title: x.title, version: /extended mix|radio edit/i.test(x.version) ? '' : x.version, sets: 0 };
            c.sets++;
            counts.set(key, c);
          });
        });
        const tracks = [...counts.values()].filter((c) => c.sets >= 2).sort((a, b) => b.sets - a.sets || a.key.localeCompare(b.key)).slice(0, limit || 20);
        return { ok: true, tracks };
      });
    },
    get_tracklist_status: () => later(30, () => {
      const idx = tlIndexed();
      return { total: LIBRARY.length, scanned: tlState.lastPass ? LIBRARY.length : 0, sets: idx.length, tracks: idx.reduce((a, l) => a + TRACKLISTS[l.id].tracks.length, 0), last_pass: tlState.lastPass, engine: 'fts5', running: tlState.running };
    }),
    build_tracklists(opts) {
      return later(60, () => {
        const scope = opts && opts.scope === 'all' ? 'all' : 'new';
        if (tlState.running) return { ok: true, started: false, running: true };
        Object.assign(tlState, { running: true, cancel: false });
        const total = LIBRARY.length;
        let done = 0, sets = 0, tracks = 0;
        emit('tracklist_index', { phase: 'start', scope });
        pushLog('info', 'Reading tracklists (offline) …');
        const step = () => {
          const end = Math.min(total, done + 6);
          for (; done < end && !tlState.cancel; done++) { const tl = TRACKLISTS[LIBRARY[done].id]; if (tl) { sets++; tracks += tl.tracks.length; } }
          const finished = done >= total || tlState.cancel;
          emit('tracklist_index', { phase: 'progress', scope, done, total, sets, tracks });
          if (!finished) { tlState.timer = setTimeout(step, 240 * speed.factor); return; }
          tlState.running = false;
          if (!tlState.cancel) tlState.lastPass = new Date().toISOString();
          pushLog('ok', `Tracklists read: ${done} checked, ${sets} sets with tracklist, ${tracks} tracks`);
          emit('tracklist_index', { phase: 'done', scope, ok: true, cancelled: tlState.cancel, total, done, sets, tracks });
        };
        tlState.timer = setTimeout(step, 200 * speed.factor);
        return { ok: true, started: true, scope };
      });
    },
    cancel_build_tracklists: () => later(20, () => { tlState.cancel = true; return { ok: true, running: tlState.running }; }),

    /* Festival-Sammler (v0.5.0) */
    get_collector_editions: () => later(40, () => [...CL.keys()].map(clEdition).sort((a, b) => (b.year || 0) - (a.year || 0) || a.edition.localeCompare(b.edition))),
    open_collector_edition(data) {
      return later(80, () => {
        const d = data || {}, errors = {};
        let e = null;
        if (d.edition_id != null && d.edition_id !== '') {
          e = clEd(d.edition_id);
          if (!e) errors.edition_id = 'Unknown edition.';
          else if (!e.event_year) errors.year = 'A year is required';
        } else {
          const s = seriesById(d.series_id), y = +d.year || 0;
          if (!s || s.hidden) errors.series_id = 'Unknown series.';
          if (!Number.isInteger(y) || y < 1985 || y > new Date().getFullYear() + 1) errors.year = 'A year is required';
          if (!Object.keys(errors).length) e = editionOf(s.id, y, String(d.variant || '').trim());
        }
        if (Object.keys(errors).length) return { ok: false, errors, error: Object.values(errors)[0] };
        clOpen(e.id);
        return { ok: true, edition: clEdition(e.id) };
      });
    },
    delete_checklist(eid) {
      return later(60, () => {
        clearTimeout(clTimers[eid]);
        const deleted = CL.delete(+eid);
        emit('collector_job', { edition_id: +eid, state: 'none', stats: clStats(+eid) });
        return { ok: true, deleted };
      });
    },
    get_checklist(eid) {
      return later(50, () => {
        if (!clEd(eid)) return { ok: false, errors: { edition_id: 'Unknown edition.' }, error: 'Unknown edition.' };
        return { ok: true, edition: clEdition(+eid), rows: (CL.get(+eid) || { rows: [] }).rows.slice().sort((a, b) => a.position - b.position).map(clRowView) };
      });
    },
    parse_timetable: (text) => later(50, () => clParse(text)),
    import_timetable(eid, data) {
      return later(120, () => {
        if (!clEd(eid)) return { ok: false, errors: { edition_id: 'Unknown edition.' }, error: 'Unknown edition.' };
        const parsed = Array.isArray(data) ? { rows: data, skipped: [] } : clParse(data);
        clOpen(+eid);
        const out = clMerge(+eid, parsed.rows, 'timetable');
        pushLog('info', `Festival collector: ${clEdition(+eid).edition} – timetable imported, ${out.added} new row(s), ${out.merged} merged`);
        clEmitRows(+eid);
        return Object.assign({ ok: true, skipped: parsed.skipped }, out);
      });
    },
    get_timetable_files: () => later(40, () => clone(TT_FILES)),
    import_timetable_file(file) {
      return later(140, () => {
        const f = TT_FILES.find((x) => x.file === file);
        if (!f || f.error || !f.series) { const msg = !f ? 'Timetable file not found' : f.error ? `Timetable file is invalid: ${f.error}` : 'The series of this file is unknown or hidden here'; return { ok: false, errors: { file: msg }, error: msg }; }
        const e = editionOf(f.series_id, f.year, f.variant || '');
        clOpen(e.id);
        const pool = ['Sound Rush', 'Ran-D', 'Rooler', 'Partyraiser', 'Sefa', 'KELTEK', 'Phuture Noize', 'Aversion', 'Adaro', 'Frequencerz', 'B-Front', 'Radical Redemption', 'Deadly Guns', 'Unresolved'];
        const stages = ['RED', 'BLUE', 'BLACK', 'UV'], days = ['Friday', 'Saturday', 'Sunday'];
        const list = Array.from({ length: f.sets }, (_, i) => ({ artist: pool[i % pool.length] + (i >= pool.length ? ` (${Math.floor(i / pool.length) + 1})` : ''), stage: stages[i % 4], day: days[i % 3], start: `${pad(12 + (i % 10))}:00`, end: `${pad(13 + (i % 10))}:00`, set_type: null }));
        const out = clMerge(e.id, list, 'file');
        clEmitRows(e.id);
        return Object.assign({ ok: true, edition_id: e.id, skipped: [] }, out);
      });
    },
    import_checklist_playlist(eid, url) {
      return later(120, () => {
        const id = +eid, cl = CL.get(id);
        if (!cl) return { ok: false, errors: { edition_id: 'Unknown edition.' }, error: 'Unknown edition.' };
        const u = String(url || '').trim();
        const yt = /^https:\/\/(?:www\.|music\.)?youtube\.com\/(?:playlist|watch)\?(?:.*&)?list=([\w-]+)/.exec(u), sc = /^https:\/\/soundcloud\.com\/[^/]+\/sets\/[^/?#]+/.exec(u);
        if (!yt && !sc) { const msg = 'Not a playlist: paste the link of a YouTube playlist or a SoundCloud set'; return { ok: false, errors: { url: msg }, error: msg }; }
        if (boOf(sc ? 'soundcloud' : 'youtube').active) return { ok: false, error: `Backoff active until ${hhmm(boOf(sc ? 'soundcloud' : 'youtube').until)} – no requests until then` };
        if (cl.importing) return { ok: true, started: false, running: true };
        cl.importing = true;
        cl.playlist_url = yt ? `https://www.youtube.com/playlist?list=${yt[1]}` : sc[0];
        const ed = clEdition(id), base = { kind: 'playlist', edition_id: id, entries: 0, added: 0, merged: 0, unchecked: 0, requests: 0, cancelled: false, error: null };
        const names = [...new Set(cl.rows.filter((r) => !r.video_id).map((r) => r.artist).slice(0, 5).concat(['Phuture Noize', 'Aversion', 'Adaro', 'Official Trailer']))];
        const step = (n) => {
          if (!CL.has(id)) return;
          if (n < 2) { emit('collector_import', Object.assign({}, base, { phase: 'progress', entries: (n + 1) * 100, requests: n + 1 })); cl.timer = setTimeout(() => step(n + 1), 500 * speed.factor); return; }
          const list = names.map((artist) => {
            const off = /trailer|aftermovie/i.test(artist), row = cl.rows.find((r) => foldName(r.artist) === foldName(artist));
            return { artist, stage: off || row ? null : 'RED', checked: !off, video_id: clNewVideo(`${artist} | ${ed.edition}${row && row.stage ? ` | ${row.stage}` : ''}`, off ? 3 : 59, { date: `${ed.year}-07-04` }) };
          });
          const out = clMerge(id, list, 'playlist');
          cl.importing = false;
          pushLog('ok', `Festival collector: ${ed.edition} – playlist read, ${out.added} new row(s), ${out.merged} matched to existing rows`);
          clEmitRows(id);
          emit('collector_import', Object.assign({}, base, { phase: 'done', entries: 240 + list.length, added: out.added, merged: out.merged, unchecked: list.filter((x) => !x.checked).length, requests: 3 }));
          pushStatus();
        };
        emit('collector_import', Object.assign({}, base, { phase: 'start' }));
        cl.timer = setTimeout(() => step(0), 400 * speed.factor);
        return { ok: true, started: true, url: cl.playlist_url };
      });
    },
    add_checklist_row(eid, row) {
      return later(60, () => {
        const id = +eid;
        if (!CL.has(id)) return { ok: false, errors: { edition_id: 'Unknown edition.' }, error: 'Unknown edition.' };
        const c = clClean(row, false);
        if (c.errors) return { ok: false, errors: c.errors, error: Object.values(c.errors)[0] };
        const r = clAdd(id, Object.assign(c.values, { source: 'manual', checked: !row || row.checked !== false }));
        clMatchOffline(id, [r]);
        CL.get(id).updated = nowIso();
        clEmitRows(id, [r]);
        return { ok: true, row: clRowView(r) };
      });
    },
    update_checklist_row(id, row) {
      return later(60, () => {
        const r = clRow(id);
        if (!r) return { ok: false, errors: { id: 'Unknown row.' }, error: 'Unknown row.' };
        const c = clClean(row, true);
        if (c.errors) return { ok: false, errors: c.errors, error: Object.values(c.errors)[0] };
        Object.assign(r, c.values, { edited: true });
        const retag = r.confirmed && clStatus(r) === 'downloaded' ? 1 : 0;
        clEmitRows(r.edition_id, [r]);
        return { ok: true, row: clRowView(r), retag };
      });
    },
    delete_checklist_rows(ids) {
      return later(60, () => {
        const gone = {};
        (ids || []).forEach((id) => { const r = clRow(id); if (!r) return; const cl = CL.get(r.edition_id); cl.rows = cl.rows.filter((x) => x !== r); (gone[r.edition_id] = gone[r.edition_id] || []).push(r.id); });
        Object.entries(gone).forEach(([eid, list]) => clEmitRows(+eid, [], list));
        return { ok: true, deleted: Object.values(gone).reduce((n, l) => n + l.length, 0) };
      });
    },
    set_checklist_checked: (ids, checked) => later(40, () => clFlag(ids, 'checked', checked)),
    set_checklist_ignored: (ids, ignored) => later(40, () => clFlag(ids, 'ignored', ignored)),
    confirm_checklist_match(id, videoId, reject) {
      return later(60, () => {
        const r = clRow(id);
        if (!r) return { ok: false, errors: { id: 'Unknown row.' }, error: 'Unknown row.' };
        if (videoId == null || videoId === '') {
          if (reject && r.video_id && !r.rejected.includes(r.video_id)) r.rejected.push(r.video_id);
          Object.assign(r, { video_id: null, confidence: null, confirmed: false, searched: null, candidates: r.candidates.filter((c) => !r.rejected.includes(c.id)) });
        } else {
          const cand = r.candidates.find((c) => c.id === videoId);
          if (videoId !== r.video_id && !cand) { const msg = 'This video is not a candidate of the row'; return { ok: false, errors: { video_id: msg }, error: msg }; }
          const rest = r.candidates.filter((c) => c.id !== videoId);
          if (r.video_id && r.video_id !== videoId) rest.unshift({ id: r.video_id, confidence: r.confidence });
          Object.assign(r, { video_id: videoId, confidence: cand ? cand.confidence : r.confidence, confirmed: true, candidates: rest.slice(0, 5) });
        }
        clEmitRows(r.edition_id, [r]);
        return { ok: true, row: clRowView(r) };
      });
    },
    estimate_checklist_matching(eid, opts) {
      return later(60, () => {
        const id = +eid, cl = CL.get(id);
        if (!cl) return { ok: false, errors: { edition_id: 'Unknown edition.' }, error: 'Unknown edition.' };
        const matched = clMatchOffline(id);
        if (matched) clEmitRows(id);
        const rows = clTodo(cl, opts && opts.restart).length, per = clPerHour();
        return {
          ok: true, edition_id: id, rows, requests: rows, per_hour: per, seconds: Math.round(Math.max(0, rows - 1) * (3600 / per)),
          searches_left_hour: Math.max(0, settings.throttle.max_searches_per_hour - state.counters.searches_hour), available_at: null,
          backoff_until: state.backoff.active ? state.backoff.until : null, matched_offline: matched,
          resume: !!(cl.job && ['pending', 'running', 'paused', 'cancelled'].includes(cl.job.state)),
        };
      });
    },
    start_checklist_matching(eid, opts) {
      return later(80, () => {
        const id = +eid, cl = CL.get(id);
        if (!cl) return { ok: false, error: 'Unknown edition.' };
        if (state.backoff.active) return { ok: false, error: `Backoff active until ${hhmm(state.backoff.until)} – no search until then` };
        if (state.restart) return { ok: false, error: 'yt-dlp was updated – restart HCLoader first' };
        const restart = !!(opts && opts.restart) || !!(cl.job && cl.job.state === 'done' && !clTodo(cl).length);
        const todo = clTodo(cl, restart).length, old = cl.job, cont = old && ['pending', 'running', 'paused', 'cancelled'].includes(old.state) && !restart;
        if (!todo) return { ok: true, job: old ? clone(old) : { edition_id: id, state: 'done', total: 0, done: 0, searches: 0, hits: 0, note: null, started: nowIso(), updated: nowIso(), finished: nowIso() }, nothing: true };
        if (restart) cl.rows.forEach((r) => { if (!r.video_id) r.searched = null; });
        cl.job = cont ? Object.assign(old, { state: 'pending', note: null, total: old.done + todo, finished: null, updated: nowIso() })
          : { edition_id: id, state: 'pending', total: todo, done: 0, searches: 0, hits: 0, note: null, started: nowIso(), updated: nowIso(), finished: null };
        clEmitJob(id);
        clTimers[id] = setTimeout(() => clRun(id), 500 * speed.factor);
        return { ok: true, job: clone(cl.job) };
      });
    },
    cancel_checklist_matching(eid) {
      return later(40, () => {
        const id = +eid, cl = CL.get(id);
        if (!cl || !cl.job) return { ok: false, error: 'No search is running for this edition' };
        clearTimeout(clTimers[id]);
        if (['pending', 'running', 'paused'].includes(cl.job.state)) Object.assign(cl.job, { state: 'cancelled', note: null, updated: nowIso() });
        clEmitJob(id);
        return { ok: true, job: clone(cl.job) };
      });
    },
    queue_checklist(eid, ids) {
      return later(80, () => {
        const id = +eid, cl = CL.get(id);
        if (!cl) return { ok: false, errors: { edition_id: 'Unknown edition.' }, error: 'Unknown edition.' };
        const queued = [], skipped = { unchecked: 0, unconfirmed: 0, missing: 0, other: 0 };
        let retag = 0;
        cl.rows.filter((r) => !ids || ids.includes(r.id)).forEach((r) => {
          if (r.ignored || !r.checked) { skipped.unchecked++; return; }
          const v = r.video_id ? clVideo(r.video_id) : null;
          if (!v) { skipped.missing++; return; }
          if (!r.confirmed) { skipped.unconfirmed++; return; }
          if (v.status === 'done') { if (r.edited) retag++; return; }
          if (!['new', 'inbox', 'failed'].includes(v.status)) { if (!['queued', 'downloading'].includes(v.status)) skipped.other++; return; }
          const failedAt = state.queue.findIndex((q) => q.state === 'failed');
          state.queue.splice(failedAt < 0 ? state.queue.length : failedAt, 0, { id: v.id, state: 'waiting', phase: 'waiting', pct: 0, speed: 0, eta: 0, error: null });
          setStatus(v, 'queued');
          queued.push(v.id);
        });
        if (queued.length) pushLog('info', `Festival collector: ${queued.length} set(s) of ${clEdition(id).edition} added to the queue`);
        emit('queue', {});
        pushStatus();
        return { ok: true, queued, retag, skipped };
      });
    },

    /* v0.8.0 DJ-Seiten */
    get_artists(opts) {
      return later(60, () => {
        const o = opts || {}, q = foldName(o.search);
        let list = [...artIndex().A.values()].filter((a) => a.vids.size).map(artSummary);
        const hidden = list.filter((a) => a.hidden).length;
        list = list.filter((a) => a.hidden === !!o.hidden && (!q || foldName([a.name, ...a.aliases, ...a.spellings].join(' ')).includes(q)));
        const sort = o.sort || 'sets';
        list.sort(sort === 'recent' ? (a, b) => String(b.last).localeCompare(String(a.last)) || b.sets - a.sets
          : sort === 'name' ? (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) : (a, b) => b.sets - a.sets || b.seconds - a.seconds || a.name.localeCompare(b.name));
        return { ok: true, artists: list, hidden };
      });
    },
    get_artist(key) {
      return later(60, () => {
        const a = artFind(key);
        if (!a || !a.vids.size) return { ok: false, error: 'Artist not found (library changed?)' };
        const idx = artIndex(), sets = artSets(a).map((l) => Object.assign(clone(l), { role: a.vids.get(l.id), with: (idx.byVid.get(l.id) || []).filter((k) => k !== a.key).map((k) => artName(idx.A.get(k))) }));
        const count = new Map();
        sets.forEach((l) => (TRACKLISTS[l.id] ? TRACKLISTS[l.id].tracks : []).filter((x) => !x.is_id).forEach((x) => {
          const k = foldName(`${x.artist}|${x.title}|${x.version}`), c = count.get(k) || { artist: x.artist, title: x.title, version: x.version || '', sets: new Set() };
          c.sets.add(l.id); count.set(k, c);
        }));
        const tracks = [...count.values()].map((c) => ({ artist: c.artist, title: c.title, version: c.version, sets: c.sets.size })).sort((x, y) => y.sets - x.sets || x.title.localeCompare(y.title)).slice(0, 10);
        return { ok: true, artist: artSummary(a), sets, tracks };
      });
    },
    save_artist(data) {
      return later(80, () => {
        const d = data || {}, errors = {}, name = String(d.name || '').replace(/\s+/g, ' ').trim();
        if (!name) errors.name = 'Please enter a name';
        else if (name.length > 80) errors.name = 'The name may have at most 80 characters';
        if (d.channel_url && !/^https:\/\/(www\.youtube\.com\/(channel\/|@)|soundcloud\.com\/)[^/?#]+/.test(d.channel_url)) errors.channel_url = 'This is not a channel URL';
        const key = String(d.key || '') || foldName(name);
        const aliases = (Array.isArray(d.aliases) ? d.aliases : []).map((x) => String(x).trim()).filter((x) => x && foldName(x) !== key && foldName(x) !== foldName(name));
        const taken = artTaken(key);
        [[name, 'name'], ...aliases.map((x) => [x, 'aliases'])].some(([n, f]) => {
          if (!taken.has(foldName(n))) return false;
          const owner = ART_ROWS.find((r) => r.key === foldName(n) || foldName(r.name) === foldName(n) || r.aliases.some((x) => foldName(x) === foldName(n)));
          errors[f] = `“${n}” already belongs to ${owner ? owner.name : n} – merge the two artists instead`;
          return true;
        });
        if (Object.keys(errors).length) return artErr(errors);
        const row = ART_ROWS.find((r) => r.key === key);
        if (row) Object.assign(row, { name, aliases, channel_url: d.channel_url || null, builtin: false });
        else ART_ROWS.push({ key, name, aliases, channel_url: d.channel_url || null, hidden: false, builtin: false });
        artSig++;
        return { ok: true, key };
      });
    },
    merge_artists(keys, into) {
      return later(80, () => {
        const A = artIndex().A, target = A.get(into);
        if (!target) return artErr({ key: 'Artist not found (library changed?)' });
        const src = (keys || []).filter((k) => k !== into).map((k) => A.get(k)).filter(Boolean);
        if (!src.length) return artErr({ keys: 'Choose at least one other artist to merge' });
        let row = ART_ROWS.find((r) => r.key === into);
        if (!row) ART_ROWS.push((row = { key: into, name: artName(target), aliases: [], channel_url: null, hidden: false, builtin: false }));
        src.forEach((a) => {
          [artName(a), ...(a.row ? a.row.aliases : []), ...Object.keys(a.spell)].forEach((n) => { if (foldName(n) !== into && !row.aliases.some((x) => foldName(x) === foldName(n))) row.aliases.push(n); });
          ART_ROWS = ART_ROWS.filter((r) => r.key !== a.key);
        });
        row.builtin = false;
        artSig++;
        return { ok: true, key: into };
      });
    },
    split_artist(key, alias) {
      return later(80, () => {
        const row = ART_ROWS.find((r) => r.key === key);
        if (!row || !row.aliases.some((x) => foldName(x) === foldName(alias))) return artErr({ alias: `“${alias}” is not an alias of this artist` });
        row.aliases = row.aliases.filter((x) => foldName(x) !== foldName(alias));
        row.builtin = false;
        artSig++;
        return { ok: true, key, split: foldName(alias) };
      });
    },
    hide_artist(key, hidden) {
      return later(60, () => {
        const a = artIndex().A.get(key);
        if (!a) return artErr({ key: 'Artist not found (library changed?)' });
        if (a.row) a.row.hidden = !!hidden;
        else ART_ROWS.push({ key, name: artName(a), aliases: [], channel_url: null, hidden: !!hidden, builtin: false });
        artSig++;
        return { ok: true, key, hidden: !!hidden };
      });
    },
    get_artist_watch(key) {
      return later(60, () => {
        const a = artFind(key);
        if (!a) return { ok: false, error: 'Artist not found (library changed?)' };
        const name = artName(a), names = new Set([a.key, foldName(name), ...(a.row ? a.row.aliases.map(foldName) : [])]);
        let url = a.row && a.row.channel_url;
        if (!url) { const own = artSets(a).find((l) => names.has(foldName(l.artist)) && /^UC/.test(l.channel_id || '')); if (own) url = `https://www.youtube.com/channel/${own.channel_id}`; }
        const source = url ? { type: 'channel', name, url_or_query: url } : { type: 'search', name: `${name} live set`, url_or_query: `${name} live set`, platform: 'youtube' };
        const ex = SOURCES.find((x) => x.type === source.type && String(x.url_or_query).toLowerCase().replace(/\/$/, '') === source.url_or_query.toLowerCase().replace(/\/$/, ''));
        return { ok: true, source, existing: ex ? sourceView(ex) : null };
      });
    },
    /* v0.8.0 Playlist-Export */
    preview_playlist(spec) {
      return later(60, () => {
        if (!spec || !plKinds.includes(spec.kind)) return { ok: false, error: 'Unknown playlist type' };
        const all = plItems(spec), ok = all.filter((l) => !l.missing), saved = PLAYLISTS.filter((p) => plSpecKey(p.spec) === plSpecKey(spec)).pop();
        return { ok: true, spec: clone(spec), name: plName(spec), folder: plFolder(), relative: settings.playlists ? settings.playlists.relative_paths : true,
          count: ok.length, missing: all.length - ok.length, seconds: ok.reduce((n, l) => n + (l.duration || 0), 0), saved: saved ? plSaved(saved) : null };
      });
    },
    export_playlist(spec, opts) {
      return later(220, () => {
        const o = opts || {};
        if (!spec || !plKinds.includes(spec.kind)) return { ok: false, error: 'Unknown playlist type' };
        const folder = String(o.folder || '').trim() || plFolder();
        if (!/^([a-z]:\\|\\\\)/i.test(folder)) return { ok: false, error: 'Please choose a full folder path (e.g. D:\\Music\\Playlists)' };
        const base = plSan(o.name || plName(spec));
        if (!base) return { ok: false, error: 'Please enter a file name' };
        const path = `${folder.replace(/\\+$/, '')}\\${base}.m3u8`;
        if (PL_FILES.has(path) && !o.overwrite) return { ok: false, exists: true, path };
        const all = plItems(spec), ok = all.filter((l) => !l.missing), relative = o.relative !== false;
        const other = relative && folder.slice(0, 2).toLowerCase() !== TARGET.slice(0, 2).toLowerCase();
        PL_FILES.add(path);
        let p = PLAYLISTS.find((x) => x.path === path);
        if (!p) PLAYLISTS.push((p = { id: ++plSeq, path }));
        Object.assign(p, { name: base, spec: clone(spec), relative, sync: !!o.sync, count: ok.length, updated: nowIso() });
        return { ok: true, path, count: ok.length, skipped: all.length - ok.length, absolute_fallback: other ? ok.length : 0, relative, sync: !!o.sync };
      });
    },
    get_saved_playlists: () => later(40, () => ({ ok: true, playlists: PLAYLISTS.slice().sort((a, b) => b.updated.localeCompare(a.updated)).map(plSaved), sync_enabled: !!(settings.playlists && settings.playlists.sync_after_download) })),
    set_playlist_sync(id, sync) {
      return later(30, () => { const p = PLAYLISTS.find((x) => x.id === id); if (!p) return { ok: false, error: 'Playlist not found' }; p.sync = !!sync; return { ok: true }; });
    },
    forget_playlist(id) {
      return later(30, () => { const n = PLAYLISTS.length; PLAYLISTS = PLAYLISTS.filter((x) => x.id !== id); return n === PLAYLISTS.length ? { ok: false, error: 'Playlist not found' } : { ok: true }; });
    },
    sync_playlists(ids) {
      return later(200, () => {
        const list = PLAYLISTS.filter((p) => (ids ? ids.includes(p.id) : p.sync));
        list.forEach((p) => { p.count = plItems(p.spec).filter((l) => !l.missing).length; p.updated = nowIso(); PL_FILES.add(p.path); });
        emit('playlists_synced', { synced: list.length, failed: 0 });
        return { ok: true, synced: list.length, failed: 0, paths: list.map((p) => p.path) };
      });
    },

    /* v0.9.0 Statistik: deterministische Beispiel-Bibliothek (eigener Zufall, ändert keine anderen Mock-Daten) */
    get_stats(opts) {
      return later(60, () => {
        const o = opts || {};
        const bad = (x) => x != null && x !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(x);
        if (bad(o.from) || bad(o.to)) return { ok: false, error: 'Invalid date range (YYYY-MM-DD)' };
        return Object.assign({ ok: true }, mockStats(o.from || null, o.to || null), { measuring: false });
      });
    },
    get_notification_status: () => later(30, () => ({ ok: true, available: notifyState.available, backend: notifyState.available ? 'powershell' : 'none', quiet_now: false, pending: 0 })),
    test_notification() {
      return later(300, () => (notifyState.available ? { ok: true, backend: 'powershell' } : { ok: false, error: 'Windows notifications are not available on this system', backend: 'none' }));
    },
    get_media_server_status: () => later(30, () => ({ ok: true, type: settings.media_server.type, has_secret: clone(msState.secret), persistent: true, last_scan: clone(msState.last), pending: 0 })),
    test_media_server(data) {
      return later(400, () => {
        const d = data || {};
        if (!['plex', 'jellyfin'].includes(d.type)) return { ok: false, code: 'config', error: 'Choose Plex or Jellyfin and enter the server address' };
        const url = String(d.url || '').trim();
        if (!url) return { ok: false, code: 'config', error: 'Enter the server address (e.g. http://192.168.1.10:32400)' };
        if (!d.secret && !msState.secret[d.type]) return { ok: false, code: 'no_secret', error: 'No token / API key stored – enter it and test the connection' };
        if (/offline|unreachable/.test(url)) return { ok: false, code: 'unreachable', error: 'Server not reachable (Connection refused)' };
        if (d.secret && /wrong|bad/.test(d.secret)) return { ok: false, code: 'auth', error: 'The server rejected the token / API key' };
        const stored = !!d.secret;
        if (stored) msState.secret[d.type] = true;
        const libs = d.type === 'plex'
          ? [{ id: '3', name: 'Hard Music', type: 'artist', paths: ['/data/music/HCLoader'], music: true }, { id: '4', name: 'DJ Sets', type: 'artist', paths: ['/data/sets'], music: true }, { id: '1', name: 'Movies', type: 'movie', paths: ['/data/movies'], music: false }]
          : [{ id: 'f137a2dd21bbc1b99aa5c0f6bf02a805', name: 'Music', type: 'music', paths: ['/media/music'], music: true }, { id: '9d7ad6afe9afa2dab1a2f6e00ad28fa6', name: 'Shows', type: 'tvshows', paths: ['/media/tv'], music: false }];
        return { ok: true, name: d.type === 'plex' ? 'Basement NAS' : 'jellyfin-nas', version: d.type === 'plex' ? '1.42.2.10156' : '10.11.3', libraries: libs, stored, persistent: true };
      });
    },
    forget_media_server_secret(kind) {
      return later(30, () => { const k = kind || settings.media_server.type; if (!['plex', 'jellyfin'].includes(k)) return { ok: false, error: 'Choose Plex or Jellyfin and enter the server address' }; msState.secret[k] = false; return { ok: true }; });
    },
    scan_media_server() {
      return later(300, () => {
        const m = settings.media_server;
        let r;
        if (m.type === 'off' || !m.url) r = { ok: false, code: 'config', error: 'Media server scan failed: Choose Plex or Jellyfin and enter the server address' };
        else if (!msState.secret[m.type]) r = { ok: false, code: 'no_secret', error: 'Media server scan failed: No token / API key stored – enter it and test the connection' };
        else r = { ok: true, server: m.type, files: 0, requests: 1, partial: false };
        msState.last = Object.assign({ at: new Date().toISOString(), server: m.type, files: 0 }, r);
        emit('media_scan', clone(msState.last));
        return clone(msState.last);
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
      /** Re-Upload: Zustand des Originals erzwingen ("ok"|"missing"|"gone"|"unknown"; Review v0.10.0 M1). */
      reuploadOriginal(id, present) {
        const l = LIBRARY.find((x) => x.id === id);
        if (l && l.reupload) l.reupload.of.present = present;
      },
      /** Fehlende Werkzeuge simulieren – die Statusleiste zeigt dann wieder die Einzelwerte: tools({deno_ok: false}); tools() setzt zurück. */
      tools(o) {
        state.tools = o || null;
        pushStatus();
      },
      /** Backoff einer Plattform auslösen (platform: "youtube" (Standard) | "soundcloud" | "mixcloud" | "hearthis"). */
      backoff(hours, platform) {
        const h = hours || 6, pk = PSTATE[platform];
        const bo = { active: true, until: new Date(Date.now() + h * 3600000 - 47 * 60000).toISOString(), level: 1 };
        if (pk) state[pk].backoff = bo; else state.backoff = bo;
        pushLog('error', `HTTP 429 von ${pk ? PLABEL[platform] : 'YouTube'} – Backoff ${h} h aktiviert`);
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
      /** Tracklisten noch nie eingelesen (on = false: wieder eingelesen); running = true: Einlesen läuft (Screenshots). */
      tracksFresh(on) { clearTimeout(tlState.timer); Object.assign(tlState, { lastPass: on === false ? isoAt(1, 9, 12) : null, running: false, cancel: false }); },
      /** v0.9.0: Windows-Benachrichtigungen (nicht) verfügbar; Medienserver mit gespeichertem Token. */
      notifyAvailable(on) { notifyState.available = on !== false; },
      mediaServer(type, secret) { if (type) { settings.media_server = Object.assign(settings.media_server, { type, url: type === 'plex' ? 'http://192.168.1.10:32400' : 'http://nas:8096', library: type === 'plex' ? '3' : '', library_name: type === 'plex' ? 'Hard Music' : '', server_root: '/data/music/HCLoader' }); } msState.secret[type || 'plex'] = secret !== false; msState.last = { ok: true, at: isoAt(0, 6, 14), server: type || 'plex', files: 3, requests: 1, partial: true }; },
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
      /** v0.5.0: mitgelieferte Timetable-Dateien zeigen (Beispiele; on = false: keine, wie ausgeliefert). */
      timetableFiles(on) {
        const f = (key, year, sets, extra) => {
          const s = seriesByKey(key);
          return Object.assign({ file: `${key}/${year}.json`, series_key: key, series_id: s ? s.id : null, series: s ? s.name : null, edition: s ? `${s.name} ${year}` : null, year, variant: '', source: `https://example.org/${key}/${year}/timetable`, updated: `${year}-06-20`, sets }, extra);
        };
        TT_FILES = on === false ? [] : [
          f('defqon1', 2024, 38), f('qlimax', 2024, 9), f('dominator', 2025, 24),
          f('ghostfest', 2025, 12),
          { file: 'intents/2025.json', series_key: 'intents', series_id: seriesByKey('intents').id, series: 'Intents Festival', edition: null, error: '“sets” is empty' },
        ];
      },
      /** v0.5.0: edition_id einer Demo-Checkliste, z.B. collectorEdition('defqon1', 2024). */
      collectorEdition: (key, year) => editionOf(seriesByKey(key).id, year, '').id,
      /** v0.5.0: Suchauftrag einer Checkliste setzen (Screenshots), z.B. collectorJob(id, {state: 'running', total: 6, done: 2});
          run = true lässt die Simulation weiterlaufen. */
      collectorJob(eid, fields, run) {
        const cl = CL.get(eid);
        clearTimeout(clTimers[eid]);
        cl.job = Object.assign({ edition_id: eid, state: 'running', total: clTodo(cl).length, done: 0, searches: 0, hits: 0, note: null, started: nowIso(), updated: nowIso(), finished: null }, fields);
        clEmitJob(eid);
        if (run) clTimers[eid] = setTimeout(() => clRun(eid), 500 * speed.factor);
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
