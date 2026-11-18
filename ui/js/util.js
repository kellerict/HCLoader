/* =====================================================================
   util.js – Helfer, Icons, Effekt-Funktionen (HC.util, HC.icons, HC.fx)
   ===================================================================== */
(function () {
  'use strict';
  const HC = (window.HC = window.HC || {});

  HC.$ = (sel, root) => (root || document).querySelector(sel);
  HC.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const pad = (n) => String(n).padStart(2, '0');
  const DAY = 86400000;

  function parseDate(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    const str = String(s);
    const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(str);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(str);
    return isNaN(d) ? null : d;
  }
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const util = (HC.util = {
    pad,
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    clone: (o) => JSON.parse(JSON.stringify(o)),
    eq: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    get: (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj),
    set(obj, path, val) {
      const ks = path.split('.');
      const last = ks.pop();
      const o = ks.reduce((a, k) => (a[k] = a[k] == null ? {} : a[k]), obj);
      o[last] = val;
    },
    parseDate,
    daysAgo(s) {
      const d = parseDate(s);
      return d ? Math.max(0, Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY)) : null;
    },
    /** Sekunden → 1:02:03 / 48:10 */
    fmtDur(sec) {
      if (sec == null) return '–';
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
      return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
    },
    /** 1234567 → 1’234’567 (de-CH) / 1,234,567 (en) – Intl with the active locale */
    fmtNum: (n) => HC.i18n.nf({ maximumFractionDigits: 0 }).format(Math.round(n)),
    /** Number with up to `d` decimals (fixed when `fixed`), locale separators */
    fmtDec: (n, d, fixed) => HC.i18n.nf({ maximumFractionDigits: d, minimumFractionDigits: fixed ? d : 0 }).format(n),
    /** 12345 → «12K views» (compact, plural-aware) */
    fmtViews(v) {
      if (v == null) return '';
      const compact = v >= 1e3 ? HC.i18n.nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v) : util.fmtNum(v);
      return HC.t('fmt.views', { count: v, v: compact });
    },
    /** Relative day distance with Intl.RelativeTimeFormat: «heute», «gestern», «vor 3 Tagen», «vor 5 Monaten» */
    fmtAgo(dateStr) {
      const d = util.daysAgo(dateStr);
      if (d == null) return '';
      if (d === 0) return HC.t('fmt.today');
      if (d === 1) return HC.t('fmt.yesterday');
      const rtf = HC.i18n.rtf({ numeric: 'always', style: 'short' });
      if (d < 30) return rtf.format(-d, 'day');
      if (d < 365) return rtf.format(-Math.round(d / 30), 'month');
      return rtf.format(-Math.round(d / 365), 'year');
    },
    /** Upload-Datum einer Karte: genau → «vor 3 T.», aus der flachen Suche (date_approx) → «~vor 5 Mt.» / «~2013».
        -> {text, approx, known} */
    uploadLabel(v) {
      const d = parseDate(v.upload_date), ago = util.daysAgo(v.upload_date);
      if (!d) return { text: HC.t('fmt.no_date'), approx: false, known: false };
      if (!v.date_approx || ago < 30) return { text: util.fmtAgo(v.upload_date), approx: false, known: true };
      return { text: `~${ago < 365 ? util.fmtAgo(v.upload_date) : d.getFullYear()}`, approx: true, known: true };
    },
    /** Jahreszahl steht als eigenes Wort im Titel (wie core/filters.title_has_year). */
    titleHasYear(title, year) {
      if (!title || !year) return false;
      return new RegExp(`(?<![\\p{L}\\p{N}])${Math.trunc(year)}(?![\\p{L}\\p{N}])`, 'u').test(String(title));
    },
    /** Upload-Zeitraum wie core/filters.within_upload_period (docs/settings-schema.md, Phase 3).
        p = {period, year, from, to}; unbekanntes Datum besteht nur bei «all» bzw. per Jahreszahl im Titel. */
    inUploadPeriod(v, p) {
      if (!p || p.period === 'all') return true;
      const d = parseDate(v.upload_date), approx = !!v.date_approx;
      if (p.period === 'year') {
        if (util.titleHasYear(v.title, p.year)) return true;
        if (!d || !p.year) return false;
        return approx ? Math.abs(d.getFullYear() - p.year) <= 1 : d.getFullYear() === p.year;
      }
      if (!d) return false;
      if (p.period === 'custom') {
        let a = parseDate(p.from), z = parseDate(p.to);
        if (approx) {
          if (a) a = new Date(a.getTime() - 365 * DAY);
          if (z) z = new Date(z.getTime() + 365 * DAY);
        }
        return !((a && d < a) || (z && d > z));
      }
      const days = { '7d': 7, '30d': 30, '1y': 365 }[p.period];
      return days ? util.daysAgo(v.upload_date) <= days : true;
    },
    /** Thumbnails nur von den Bild-CDNs von YouTube (https://*.ytimg.com) und SoundCloud (https://*.sndcdn.com) – sonst Platzhalter. */
    safeThumb(url) {
      if (typeof url !== 'string' || !url) return null;
      try {
        const u = new URL(url);
        return u.protocol === 'https:' && !u.username && !u.port && /(^|\.)(ytimg|sndcdn)\.com$/i.test(u.hostname) ? u.href : null;
      } catch (e) {
        return null;
      }
    },
    /** 2026-11-14 → 14.11.2026 (de-CH) / 11/14/2026 (en) */
    fmtDate(s) {
      const d = parseDate(s);
      return d ? HC.i18n.df({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(d) : '–';
    },
    /** → 03:00 (24 h in de, 3:00 AM in en – as the locale prefers) */
    fmtTime(s) {
      const d = parseDate(s);
      return d ? HC.i18n.df({ hour: '2-digit', minute: '2-digit' }).format(d) : '–';
    },
    /** ISO → «heute 03:00» / «morgen 03:00» / «14.11. 03:00» */
    fmtWhen(s) {
      const d = parseDate(s);
      if (!d) return HC.t('fmt.never');
      const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
      const time = util.fmtTime(d);
      if (diff === 0) return HC.t('fmt.today_at', { t: time });
      if (diff === 1) return HC.t('fmt.tomorrow_at', { t: time });
      if (diff === -1) return HC.t('fmt.yesterday_at', { t: time });
      if (diff < 0 && diff > -30) return HC.i18n.rtf({ numeric: 'always', style: 'short' }).format(diff, 'day');
      return HC.i18n.df({ day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
    },
    /** ISO → «gerade eben» / «vor 12 Min.» / «vor 6 Std.», älter wie fmtWhen («gestern 03:00», «vor 6 T.») */
    fmtRel(s) {
      const d = parseDate(s);
      if (!d) return HC.t('fmt.never');
      const sec = (Date.now() - d) / 1000;
      if (sec < 0 || sec >= 86400) return util.fmtWhen(s);
      if (sec < 90) return HC.t('fmt.just_now');
      const rtf = HC.i18n.rtf({ numeric: 'always', style: 'short' });
      if (sec < 3600) return rtf.format(-Math.round(sec / 60), 'minute');
      return rtf.format(-Math.floor(sec / 3600), 'hour');
    },
    /** ISO → «16.11.2026 03:00» (für Tooltips) */
    fmtFull(s) {
      const d = parseDate(s);
      return d ? `${util.fmtDate(d)} ${util.fmtTime(d)}` : '';
    },
    /** Sekunden → «5 h 12 min» / «42 s» (Intl unit names of the active locale) */
    fmtSpan(sec) {
      sec = Math.max(0, Math.round(sec));
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
      const u = (n, unit) => HC.i18n.nf({ style: 'unit', unit, unitDisplay: 'narrow' }).format(n);
      if (h) return `${u(h, 'hour')} ${u(m, 'minute')}`;
      if (m) return `${u(m, 'minute')} ${u(sec % 60, 'second')}`;
      return u(sec, 'second');
    },
    /** Zahl ohne unnötige Nachkommastellen – raw ("1.5"), for <input type=number> values */
    trimNum: (n) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2))),
    /** 42.4 → «42 %» / «42%» (locale percent format) */
    fmtPct: (p) => HC.i18n.nf({ style: 'percent', maximumFractionDigits: 0 }).format(Math.floor(p) / 100),
    /** Same for display: locale digits/separators, no grouping («1,5» in de) */
    showNum: (n) => HC.i18n.nf({ useGrouping: false, maximumFractionDigits: 2 }).format(n),
    /** File size in MB → «1.4 GB» / «512 MB» / «12 kB» (Intl units) */
    fmtSize(mb) {
      if (!mb) return '–';
      const u = (n, unit, d) => HC.i18n.nf({ style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: d }).format(n);
      if (mb >= 1024) return u(mb / 1024, 'gigabyte', 2);
      if (mb < 1) return u(Math.max(1, Math.round(mb * 1024)), 'kilobyte', 0);
      return u(Math.round(mb), 'megabyte', 0);
    },
    /** Normalisieren wie core/filters.py: Kleinbuchstaben, Akzente/Umlaute entfernt */
    norm: (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss'),
    kwMatch(text, kw) {
      const k = util.norm(kw).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      if (!k) return false;
      return new RegExp(`(^|[^a-z0-9])${k}($|[^a-z0-9])`).test(util.norm(text));
    },
    /** Schwarze oder weisse Schrift auf einer Farbfläche */
    inkFor(hex) {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
      if (!m) return '#000';
      const n = parseInt(m[1], 16);
      const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      return lum > 0.42 ? '#000' : '#fff';
    },
    hash(str) {
      let h = 0;
      for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      return h;
    },
    /** Text in die Zwischenablage (Clipboard-API, sonst unsichtbares Textfeld + execCommand). -> Promise<bool> */
    async copyText(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
      } catch (e) { /* nicht erlaubt (z.B. file:// ohne Fokus) -> Ausweichweg */ }
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      const prev = document.activeElement;
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (prev && prev.focus) prev.focus();
      return ok;
    },
    debounce(fn, ms) {
      let h;
      return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); };
    },
  });

  /* ---------- Icons (Inline-SVG, 24er-Raster, Strich) ---------- */
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  HC.icons = {
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    inbox: svg('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
    eye: svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    download: svg('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>'),
    library: svg('<path d="M4 4v16M9 4v16"/><path d="M14 4l6 16"/>'),
    log: svg('<path d="M4 6h16M4 12h10M4 18h13"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"/>'),
    external: svg('<path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v7H3V3h7"/>'),
    ban: svg('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'),
    more: svg('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
    left: svg('<path d="M15 6l-6 6 6 6"/>'),
    right: svg('<path d="M9 6l6 6-6 6"/>'),
    up: svg('<path d="M6 15l6-6 6 6"/>'),
    down: svg('<path d="M6 9l6 6 6-6"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    check: svg('<path d="M4 12l5 5L20 6"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    trash: svg('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>'),
    folder: svg('<path d="M3 6h7l2 3h9v10H3z"/>'),
    tag: svg('<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.2"/>'),
    retry: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/>'),
    refresh: svg('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>'),
    pause: svg('<path d="M8 5v14M16 5v14"/>'),
    play: svg('<path d="M7 4l13 8-13 8z"/>'),
    warn: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.5"/>'),
    filter: svg('<path d="M3 5h18l-7 8v6l-4-2v-4z"/>'),
    edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
    bolt: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    db: svg('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    grid: svg('<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>'),
    list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h1M4 12h1M4 18h1"/>'),
    table: svg('<path d="M3 5h18v14H3z"/><path d="M3 10h18M3 15h18M9 5v14"/>'),
    timeline: svg('<path d="M6 3v18"/><circle cx="6" cy="7" r="2"/><circle cx="6" cy="16" r="2"/><path d="M12 7h8M12 16h6"/>'),
    copy: svg('<path d="M9 9h11v11H9z"/><path d="M5 15H4V4h11v1"/>'),
    wave: svg('<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 10v4"/>'),
    /* v0.7.0 Schlaf-Timer, Weiterhören */
    moon: svg('<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>'),
    resume: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/><path d="M10.5 9.5l4 2.5-4 2.5z"/>'),
    skip_prev: svg('<path d="M6 5v14"/><path d="M19 5l-10 7 10 7z"/>'),
    skip_next: svg('<path d="M18 5v14"/><path d="M5 5l10 7-10 7z"/>'),
    volume: svg('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 010 7"/><path d="M19.2 6a8.5 8.5 0 010 12"/>'),
    mute: svg('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>'),
    file_x: svg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9.5 12.5l5 5M14.5 12.5l-5 5"/>'),
    /* v0.3.0 Festivals & Serien: Art der Serie */
    flag: svg('<path d="M5 21V4"/><path d="M5 4h13l-3 4.5 3 4.5H5"/>'),
    radio: svg('<circle cx="12" cy="12" r="1.6"/><path d="M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5.6 5.6a9 9 0 000 12.8M18.4 5.6a9 9 0 010 12.8"/>'),
    /* v0.4.0 «Alles einlesen (einmalig)»: Stapel = ganze Liste */
    layers: svg('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/>'),
    /* v0.8.0: DJ (Kopfhörer), Playlist-Export, zusammenführen */
    dj: svg('<path d="M4 15v-3a8 8 0 0116 0v3"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/>'),
    playlist: svg('<path d="M4 6h12M4 11h12M4 16h7"/><path d="M15 15l3 3 3-3"/><path d="M18 11v7"/>'),
    merge: svg('<path d="M6 4v5a6 6 0 006 6h0a6 6 0 016 6"/><path d="M18 4v5a6 6 0 01-3 5.2"/><path d="M3 7l3-3 3 3"/><path d="M15 7l3-3 3 3"/>'),
    mic: svg('<path d="M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z"/><path d="M5.5 11a6.5 6.5 0 0013 0"/><path d="M12 17.5V21"/>'),
  };

  /* ---------- Plattformen (Phase 7a): YouTube | SoundCloud ---------- */
  const PLATFORMS = ['youtube', 'soundcloud'];
  HC.platform = {
    all: PLATFORMS,
    of: (x) => (x && x.platform === 'soundcloud' ? 'soundcloud' : 'youtube'),
    label: (p) => HC.t(`platform.${p === 'soundcloud' ? 'soundcloud' : 'youtube'}`),
    /** SoundCloud eingeschaltet? (gespeicherte Einstellung, sonst der Status) */
    scEnabled() {
      const s = HC.settings && HC.settings.values && HC.settings.values.soundcloud;
      if (s) return s.enabled !== false;
      const st = HC.status && HC.status.platforms && HC.status.platforms.soundcloud;
      return !!(st && st.enabled);
    },
    enabled: (p) => p !== 'soundcloud' || HC.platform.scEnabled(),
    /** -> {enabled, backoff, counters, limits} – Status.platforms, für YouTube ersatzweise die alten Felder. */
    state(p) {
      const st = HC.status || {}, v = (HC.settings && HC.settings.values) || {};
      const x = st.platforms && st.platforms[p];
      const th = (p === 'soundcloud' ? v.soundcloud : v.throttle) || {};
      const limits = { downloads_run: th.max_downloads_per_run, downloads_day: th.max_downloads_per_day, searches_hour: th.max_searches_per_hour };
      if (x) return { enabled: x.enabled !== false, backoff: x.backoff || {}, counters: x.counters || {}, limits: Object.assign(limits, x.limits) };
      if (p === 'youtube') return { enabled: true, backoff: st.backoff || {}, counters: st.counters || {}, limits };
      return { enabled: false, backoff: {}, counters: {}, limits };
    },
    /** Aktiver Backoff der Plattform oder null. */
    backoff(p) { const b = HC.platform.state(p).backoff; return b && b.active ? b : null; },
    /** Plattformen mit aktivem Backoff: [[platform, backoff], …] */
    backoffs: () => PLATFORMS.map((p) => [p, HC.platform.backoff(p)]).filter((x) => x[1]),
  };

  /* ---------- Effekte ---------- */
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const fx = (HC.fx = {
    reduced: () => document.body.classList.contains('reduced') || mq.matches,

    /** Zahl hochzählen. el._n merkt sich den letzten Wert. */
    count(el, to, opts) {
      if (!el) return;
      const o = Object.assign({ dur: 480, fmt: (n) => String(Math.round(n)) }, opts);
      const from = typeof el._n === 'number' ? el._n : 0;
      el._n = to;
      cancelAnimationFrame(el._raf);
      if (fx.reduced() || from === to || document.hidden) { el.textContent = o.fmt(to); return; }
      let t0 = null;
      const step = (ts) => {
        if (t0 == null) t0 = ts;
        const p = Math.min(1, (ts - t0) / o.dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = o.fmt(from + (to - from) * e);
        if (p < 1) el._raf = requestAnimationFrame(step);
      };
      el._raf = requestAnimationFrame(step);
    },

    /** Kurzes Aufpoppen (Badge bei neuer Zahl). */
    pop(el, cls) {
      if (!el || fx.reduced()) return;
      const c = cls || 'pop';
      el.classList.remove(c);
      void el.offsetWidth;
      el.classList.add(c);
      setTimeout(() => el.classList.remove(c), 700);
    },

    /** FLIP: Kinder gleiten an ihre neue Position (z.B. Genre-Priorität). */
    flip(container, mutate) {
      if (fx.reduced() || !container.animate) { mutate(); return; }
      const before = new Map(Array.from(container.children).map((el) => [el.dataset.key, el.getBoundingClientRect()]));
      mutate();
      Array.from(container.children).forEach((el) => {
        const a = before.get(el.dataset.key);
        if (!a) return;
        const b = el.getBoundingClientRect();
        const dy = a.top - b.top;
        if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    },

    /** Ein Element kurz aufleuchten lassen (z.B. neue oder geänderte Zeile). cls: CSS-Klasse mit der Animation. */
    flash(el, cls) { fx.pop(el, cls || 'flash'); },

    /** Element ausblenden (Klasse «leave»), danach cb. Ohne Effekte sofort. */
    leave(el, cb, ms) {
      if (!el || fx.reduced()) { if (cb) cb(); return; }
      el.classList.add('leave');
      setTimeout(() => { if (cb) cb(); }, ms || 190);
    },

    /** Stagger-Klasse nur für das erste Einblenden setzen. */
    stagger(container) {
      if (!container || fx.reduced()) return;
      Array.from(container.children).forEach((el, i) => el.style.setProperty('--i', i));
      container.classList.add('stagger');
      clearTimeout(container._st);
      container._st = setTimeout(() => container.classList.remove('stagger'), 900);
    },
  });

  /* Ripple auf Buttons (delegiert) */
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('.btn,.iconbtn');
    if (!b || b.disabled || fx.reduced()) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    b.appendChild(s);
    setTimeout(() => s.remove(), 450);
  });
})();
