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
    /** 1234567 → 1’234’567 (de-CH) */
    fmtNum: (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '’'),
    fmtViews(v) {
      if (v == null) return '';
      if (v >= 1e6) return HC.t('fmt.views_m', { n: (v / 1e6).toFixed(1) });
      if (v >= 1e3) return HC.t('fmt.views_k', { n: (v / 1e3).toFixed(v >= 1e5 ? 0 : 1) });
      return HC.t('fmt.views', { n: v });
    },
    fmtAgo(dateStr) {
      const d = util.daysAgo(dateStr);
      if (d == null) return '';
      if (d === 0) return HC.t('fmt.today');
      if (d === 1) return HC.t('fmt.yesterday');
      if (d < 30) return HC.t('fmt.days_ago', { n: d });
      if (d < 365) return HC.t('fmt.months_ago', { n: Math.round(d / 30) });
      return HC.t('fmt.years_ago', { n: Math.round(d / 365) });
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
    /** Thumbnails nur vom YouTube-Bild-CDN (https://i.ytimg.com, https://*.ytimg.com) – sonst Platzhalter. */
    safeThumb(url) {
      if (typeof url !== 'string' || !url) return null;
      try {
        const u = new URL(url);
        return u.protocol === 'https:' && !u.username && !u.port && /(^|\.)ytimg\.com$/i.test(u.hostname) ? u.href : null;
      } catch (e) {
        return null;
      }
    },
    /** 2026-11-14 → 14.11.2026 */
    fmtDate(s) {
      const d = parseDate(s);
      return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : '–';
    },
    fmtTime(s) {
      const d = parseDate(s);
      return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '–';
    },
    /** ISO → «heute 03:00» / «morgen 03:00» / «14.11. 03:00» */
    fmtWhen(s) {
      const d = parseDate(s);
      if (!d) return HC.t('fmt.never');
      const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      if (diff === 0) return HC.t('fmt.today_at', { t: time });
      if (diff === 1) return HC.t('fmt.tomorrow_at', { t: time });
      if (diff === -1) return HC.t('fmt.yesterday_at', { t: time });
      if (diff < 0 && diff > -30) return HC.t('fmt.days_ago', { n: -diff });
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${time}`;
    },
    /** Sekunden → «5 h 12 min» / «42 s» */
    fmtSpan(sec) {
      sec = Math.max(0, Math.round(sec));
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
      if (h) return `${h} h ${pad(m)} min`;
      if (m) return `${m} min ${pad(sec % 60)} s`;
      return `${sec} s`;
    },
    /** Zahl ohne unnötige Nachkommastellen */
    trimNum: (n) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2))),
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
