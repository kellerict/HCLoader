/* =====================================================================
   i18n.js – translation engine (no texts here; see ui/js/locales/<code>.js)
   Guide for translators: docs/TRANSLATING.md

   - Every locale file calls HC.i18n.register(meta, dict). All files are
     loaded via <script> tags (works under file:// in WebView2 and in the
     browser mock – no fetch).
   - HC.t('area.key', {name: 'x'}) → text with {name} replaced.
   - Plurals: the value is an object with CLDR categories
     ({one: '…', other: '…'}, Arabic also zero/two/few/many). The category is
     chosen with Intl.PluralRules from params.count, else params.n.
   - Lookup: active language → its meta.fallback (e.g. de-x-frk → de) → en (reference)
     → the key itself (console.warn once).
   - Private-use dialects (code with "-x-", e.g. de-x-frk) are only chosen explicitly,
     never by 'auto'.
   - Numbers passed as params are formatted with Intl.NumberFormat (no grouping).
   ===================================================================== */
(function () {
  'use strict';
  const HC = (window.HC = window.HC || {});

  /** Supported languages in picker order. Data (genre names, folders, tags) never depends on this. */
  const SUPPORTED = ['en', 'de', 'zh-CN', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'nl',
    'sv', 'nb', 'fi', 'lt', 'lv', 'et', 'de-x-frk'];
  /** Fun dialects / private-use tags: selectable, never picked by 'auto' or a base-language match. */
  const isDialect = (c) => /-x-/i.test(c);
  const REFERENCE = 'en';
  const CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'];
  const PARAM_NUM = { useGrouping: false, maximumFractionDigits: 2 };

  const catalogs = {}; // code -> {meta, dict}
  const warned = new Set();
  let lang = REFERENCE;
  let fmtCache = {};

  const isPlural = (v) => v != null && typeof v === 'object' && typeof v.other === 'string'
    && Object.keys(v).every((k) => CATEGORIES.includes(k));

  function lookup(code, key) {
    const c = catalogs[code];
    if (!c) return undefined;
    const v = key.split('.').reduce((o, k) => (o == null || typeof o !== 'object' ? undefined : o[k]), c.dict);
    return typeof v === 'string' || isPlural(v) ? v : undefined;
  }

  /** Map any BCP-47 tag (e.g. "pt-PT", "zh-Hans-CN", "de-CH") onto a supported code, or null. */
  function match(tag) {
    if (!tag || typeof tag !== 'string') return null;
    const t = tag.trim().replace(/_/g, '-').toLowerCase();
    if (!t) return null;
    const exact = SUPPORTED.find((c) => c.toLowerCase() === t);
    if (exact) return exact;
    if (isDialect(t)) return null; // unknown private-use tag
    const base = t.split('-')[0];
    if (base === 'zh') return /hant|-tw|-hk|-mo/.test(t) ? null : 'zh-CN';
    if (base === 'in') return 'id'; // legacy code for Indonesian
    if (base === 'no' || base === 'nn') return 'nb'; // Norwegian (macro language, Nynorsk) -> Bokmål
    return SUPPORTED.find((c) => !isDialect(c) && c.split('-')[0] === base) || null;
  }

  /** 'auto' → first supported entry of `prefs` (navigator.languages by default), fallback en. */
  function resolve(setting, prefs) {
    if (setting && setting !== 'auto') return match(setting) || REFERENCE;
    const list = prefs || (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]);
    for (const p of list || []) {
      const m = match(p);
      if (m) return isDialect(m) ? parentOf(m) : m;
    }
    return REFERENCE;
  }

  /** Parent language of a dialect (meta.fallback, else the base code) – used by 'auto' and lookup. */
  function parentOf(code) {
    const m = catalogs[code] && catalogs[code].meta;
    const f = (m && m.fallback) || code.split('-')[0];
    return SUPPORTED.includes(f) && !isDialect(f) ? f : REFERENCE;
  }

  const meta = (code) => (catalogs[code] && catalogs[code].meta) || { code, name: code, dir: 'ltr', intl: code };

  const i18n = (HC.i18n = {
    SUPPORTED,
    REFERENCE,
    isDialect,
    register(m, dict) {
      if (!m || !m.code) throw new Error('i18n.register: meta.code missing');
      catalogs[m.code] = { meta: { dir: 'ltr', intl: m.code, ...m }, dict: dict || {} };
    },
    catalogs: () => catalogs,
    meta,
    match,
    resolve,
    /** Active language code (e.g. 'de'), its Intl locale (e.g. 'de-CH') and direction. */
    get lang() { return lang; },
    get locale() { return meta(lang).intl; },
    get dir() { return meta(lang).dir; },
    /** Switch language; sets <html lang/dir>. `code` may be 'auto'. Returns the resolved code. */
    set(code, prefs) {
      const next = resolve(code, prefs);
      lang = catalogs[next] ? next : REFERENCE;
      fmtCache = {};
      const root = document.documentElement;
      if (root) {
        root.lang = meta(lang).intl;
        root.dir = meta(lang).dir === 'rtl' ? 'rtl' : 'ltr';
      }
      return lang;
    },
    /** Native names for the language picker: [{code, name}] */
    choices: () => SUPPORTED.filter((c) => catalogs[c]).map((c) => ({ code: c, name: meta(c).name })),
    /** Cached Intl formatters for the active locale. */
    nf(opts) { return cached('n', opts, () => new Intl.NumberFormat(i18n.locale, opts)); },
    df(opts) { return cached('d', opts, () => new Intl.DateTimeFormat(i18n.locale, opts)); },
    rtf(opts) { return cached('r', opts, () => new Intl.RelativeTimeFormat(i18n.locale, opts)); },
    plural(n) { return cached('p', null, () => new Intl.PluralRules(i18n.locale)).select(n); },
  });

  function cached(kind, opts, make) {
    const k = kind + JSON.stringify(opts || {});
    if (!fmtCache[k]) {
      try { fmtCache[k] = make(); } catch (e) {
        /* unknown locale/option in an old engine -> English */
        fmtCache[k] = kind === 'n' ? new Intl.NumberFormat('en', opts) : kind === 'd' ? new Intl.DateTimeFormat('en', opts)
          : kind === 'r' ? new Intl.RelativeTimeFormat('en', opts) : new Intl.PluralRules('en');
      }
    }
    return fmtCache[k];
  }

  const escKey = (key) => String(key).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  /** Text for `key` in the active language. Placeholders {name}; numbers are locale-formatted. */
  HC.t = function (key, params) {
    let v = lookup(lang, key);
    const fb = catalogs[lang] && catalogs[lang].meta.fallback;
    if (v === undefined && fb && fb !== lang && fb !== REFERENCE) v = lookup(fb, key);
    if (v === undefined && lang !== REFERENCE) v = lookup(REFERENCE, key);
    if (v === undefined) {
      if (!warned.has(key)) { warned.add(key); console.warn(`[i18n] missing: ${key}`); }
      /* The key can contain data (e.g. 'phase.' + value) and often ends up in innerHTML -> escape. */
      return escKey(key);
    }
    if (typeof v !== 'string') {
      const c = params && (typeof params.count === 'number' ? params.count : typeof params.n === 'number' ? params.n : null);
      const cat = c == null ? 'other' : i18n.plural(c);
      v = v[cat] != null ? v[cat] : v.other;
    }
    if (params) {
      v = v.replace(/\{(\w+)\}/g, (m, k) => {
        const x = params[k];
        if (x == null) return m;
        /* no grouping: years, ports and counters stay "2013"; use util.fmtNum for big counts */
        return typeof x === 'number' && Number.isFinite(x) ? i18n.nf(PARAM_NUM).format(x) : x;
      });
    }
    return v;
  };
})();
