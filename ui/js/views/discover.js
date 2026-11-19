/* =====================================================================
   views/discover.js – Entdecken: Suche, Genre-Chips, Filter-Panel, Karten
   Die Filter laufen clientseitig auf den Treffern (Spiegel von core/filters.py).
   Plattform-Auswahl (aufklappbar): jede Plattform behält ihre letzten Treffer. «Alle» sucht
   die eingeschalteten Plattformen NACHEINANDER über den normalen Suchaufruf je Plattform
   (Throttle und Suchen/Stunde gelten je Plattform, nie parallel) und mischt die Treffer.
   Die Stichwort-Boxen im Filter-Panel sind ein Sitzungsfilter: Startwert = gespeicherte
   Einstellungen (Filter), Änderungen hier speichern nichts.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx, ui } = HC;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const PERIODS = ['all', '7d', '30d', '1y', 'year', 'custom'];
  const MIN_YEAR = 2005; // wie core/config.MIN_UPLOAD_YEAR
  const FALLBACK_GENRE = 'Unsortiert'; // hat keine Suchbegriffe
  const maxYear = () => new Date().getFullYear();
  const clampYear = (n) => Math.min(maxYear(), Math.max(MIN_YEAR, Math.round(n)));

  let el;
  let results = null; // null = noch keine Suche
  let searching = false;
  let blocked = new Set();
  const sel = new Set();
  const f = { min: 10, max: 0, period: 'all', year: 0, from: '', to: '', inc: [], exc: [], hide: true, blacklist: true, genres: new Set() };
  let incEd, excEd;
  /* Womit die angezeigten Treffer gesucht wurden (für «Gesucht mit …» und den Veraltet-Hinweis). */
  let last = null; // {query, effective, genre, year, known}
  let platform = 'youtube'; // oder ALL
  const ALL = 'all';
  const STORE_KEY = 'hcl.discover.platform';
  let progress = null; // «Alle»: {p, i, n} – welche Plattform gerade gesucht wird
  let menuOpen = false;
  const stash = {}; // Treffer der gerade nicht gezeigten Plattform: {results, last}

  function defaultsFromSettings() {
    const s = HC.settings.values.filters;
    f.min = s.min_duration / 60;
    f.max = s.max_duration / 60;
    f.period = PERIODS.includes(s.upload_period) ? s.upload_period : 'all';
    f.year = s.upload_year ? clampYear(s.upload_year) : maxYear();
    f.from = s.upload_from || '';
    f.to = s.upload_to || '';
    f.inc = s.include_keywords.slice();
    f.exc = s.exclude_keywords.slice();
    f.hide = s.hide_done_ignored;
    f.blacklist = s.apply_channel_blacklist;
    f.genres = new Set(HC.genres.names());
  }
  function syncControls() {
    $('#f-min', el).value = f.min ? util.trimNum(f.min) : 0;
    $('#f-max', el).value = f.max ? util.trimNum(f.max) : '';
    $('#f-date', el).value = f.period;
    $('#f-from', el).value = f.from;
    $('#f-to', el).value = f.to;
    syncPeriod();
    $('#f-hide', el).checked = f.hide;
    $('#f-blacklist', el).checked = f.blacklist;
    incEd.set(f.inc);
    excEd.set(f.exc);
    renderKw('inc');
    renderKw('exc');
    renderChips();
  }

  /** Jahr-/Zeitraum-Felder passend zum gewählten Zeitraum zeigen und füllen. */
  function syncPeriod() {
    const isYear = f.period === 'year', isCustom = f.period === 'custom';
    $('#f-year-box', el).hidden = !isYear;
    $('#f-custom-box', el).hidden = !isCustom;
    const hint = $('#f-date-hint', el);
    hint.hidden = !isYear && !isCustom;
    hint.textContent = isYear ? t('discover.f_hint_year', { year: f.year }) : isCustom ? t('discover.f_hint_custom') : '';
    const inp = $('#f-year', el), rng = $('#f-year-range', el);
    inp.max = rng.max = maxYear();
    if (document.activeElement !== inp || +inp.value !== f.year) inp.value = f.year;
    rng.value = f.year;
    rng.style.setProperty('--p', `${((f.year - MIN_YEAR) / Math.max(1, maxYear() - MIN_YEAR)) * 100}%`);
    $('#f-year-dec', el).disabled = f.year <= MIN_YEAR;
    $('#f-year-inc', el).disabled = f.year >= maxYear();
    $('#f-year-max', el).textContent = maxYear();
  }
  function setYear(n, animate) {
    const y = clampYear(n);
    if (y === f.year) { syncPeriod(); return; }
    f.year = y;
    syncPeriod();
    if (animate) fx.pop($('#f-year', el), 'tick');
    renderScope();
    renderGrid();
  }

  /** Was die nächste Suche mitschickt: genau ein aktiver Genre-Chip und – beim Zeitraum «Jahr» – das Jahr. */
  function searchOpts() {
    const on = [...f.genres];
    return {
      genre: on.length === 1 && on[0] !== FALLBACK_GENRE ? on[0] : null,
      year: f.period === 'year' ? f.year : null,
      platform: platform === ALL ? null : platform,
    };
  }
  /** Das Jahr landet nur im Suchbegriff, wenn search.append_year an ist. */
  const appendYear = () => HC.settings.values.search.append_year !== false;
  const yearInQuery = (o) => (o.year && appendYear() ? o.year : null);

  function passes(v) {
    if (v.is_live) return false; // Livestreams nie (SPEC §4); nur das Backend erkennt sie (Feld is_live)
    /* Go+-Vorschau (30 s, nie ladbar): wie «geladen/ignoriert» behandelt – sichtbar nur ohne «ausblenden», dann mit Hinweis. */
    if (v.preview) { if (f.hide) return false; } else {
      if (v.duration == null || v.duration < f.min * 60) return false;
      if (f.max && v.duration > f.max * 60) return false;
    }
    if (v.duplicate_of && HC.settings.values.filters.hide_cross_platform_duplicates) return false;
    if (!util.inUploadPeriod(v, f)) return false;
    if (!f.genres.has(v.genre)) return false;
    if (f.inc.length && !f.inc.some((k) => util.kwMatch(v.title, k))) return false;
    if (f.exc.some((k) => util.kwMatch(v.title, k))) return false;
    if (f.blacklist && blocked.has(v.channel_id)) return false;
    if (f.hide && (v.status === 'done' || v.status === 'ignored')) return false;
    return true;
  }
  function sorted(list) {
    const by = {
      date: (a, b) => (util.daysAgo(a.upload_date) || 0) - (util.daysAgo(b.upload_date) || 0),
      dur: (a, b) => b.duration - a.duration,
      views: (a, b) => (b.view_count || 0) - (a.view_count || 0),
    }[$('#sort', el).value];
    return by ? list.slice().sort(by) : list;
  }
  const visible = () => (results ? sorted(results.filter(passes)) : []);

  function renderChips() {
    const box = $('#genre-chips', el);
    $$('.chip', box).forEach((c) => c.remove());
    const meta = $('.meta', box);
    HC.genres.list().forEach((g) => {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = `chip${f.genres.has(g.name) ? ' on' : ''}`;
      c.style.setProperty('--c', HC.genres.color(g.name));
      c.style.setProperty('--ink', HC.genres.ink(g.name));
      c.textContent = g.name;
      c.dataset.genre = g.name;
      c.setAttribute('aria-pressed', f.genres.has(g.name));
      c.title = t('discover.chip_title');
      box.insertBefore(c, meta);
    });
    renderScope();
  }
  /** Zeigt, welche Begriffe die nächste Suche anhängt, und ob die Treffer dazu noch passen. */
  function renderScope() {
    const o = searchOpts(), y = yearInQuery(o);
    const parts = [];
    if (o.genre) parts.push(`<span class="scope-tag" style="--c:${HC.genres.color(o.genre)}">${util.esc(o.genre)}</span>`);
    if (y) parts.push(`<span class="scope-tag">${y}</span>`);
    const box = $('#scope', el);
    box.hidden = !parts.length;
    box.innerHTML = parts.length ? `${t('discover.scope')} ${parts.join('')}` : '';
    renderSearchInfo();
  }
  function renderSearchInfo() {
    const box = $('#search-info', el);
    if (!results || !last || searching) { box.hidden = true; return; }
    const o = searchOpts();
    const stale = last.known && (o.genre !== last.genre || (appendYear() && (o.year || null) !== last.year));
    const eff = last.effective;
    const skip = last.skipped && last.skipped.length ? `<span class="skipped" title="${util.esc(t('discover.skipped_title'))}">${I.info}${t('discover.skipped', { list: last.skipped.map(skipText).join(' · ') })}</span>` : '';
    if (!eff && !stale && !skip) { box.hidden = true; return; }
    let q = '';
    if (eff) {
      const base = last.query || '';
      const split = base && eff.toLowerCase().startsWith(base.toLowerCase()) ? base.length : 0;
      q = `<span class="k">${t('discover.searched')}</span><span class="q" title="${util.esc(eff)}">${util.esc(eff.slice(0, split))}<b>${util.esc(eff.slice(split))}</b></span>`;
    }
    box.innerHTML = `${q}${skip}${stale ? `<span class="stale" title="${util.esc(t('discover.re_search_title'))}"><span class="led warn"></span>${t('discover.stale')}<button class="linkbtn" data-re>${t('discover.re_search')}</button></span>` : ''}`;
    box.hidden = false;
  }
  function renderQuota() {
    if (!HC.status) return;
    if (platform === ALL) {
      const list = allTargets().map((p) => { const x = HC.platform.state(p); return `<span title="${util.esc(HC.platform.label(p))}">${HC.platform.short(p)} <b>${util.esc(x.counters.searches_hour || 0)}</b>/${util.esc(x.limits.searches_hour)}</span>`; }).join(' · ');
      $('#quota', el).innerHTML = t('discover.quota_all', { list });
      return;
    }
    const st = HC.platform.state(platform);
    $('#quota', el).innerHTML = t(pkey('discover.quota'), { p: util.esc(HC.platform.label(platform)), n: `<b>${util.esc(st.counters.searches_hour || 0)}</b>`, max: util.esc(st.limits.searches_hour) });
  }
  function renderCount(list) {
    const n = list.length, hidden = results ? results.length - n : 0;
    const prev = results ? results.filter((v) => v.preview).length : 0;
    $('#count', el).innerHTML = searching ? (platform === ALL ? (progress ? `${HC.platform.icon(progress.p)}${t('discover.searching_all', { p: util.esc(HC.platform.label(progress.p)), i: progress.i, n: progress.n })}` : '') : t(pkey('discover.searching'), { p: HC.platform.label(platform) }))
      : !results ? ''
        : t('discover.count', { n: `<b>${util.fmtNum(n)}</b>`, count: n, hidden }) + (prev ? ` · <span class="prevcount" title="${util.esc(t(platform === 'mixcloud' ? 'discover.previews_mc_title' : 'discover.previews_title'))}">${t(platform === 'mixcloud' ? 'discover.previews_mc' : 'discover.previews', { n: prev })}</span>` : '')
          + (sel.size ? ` · ${t('discover.selected', { n: `<b>${sel.size}</b>` })}` : '');
    $('#dl-sel', el).disabled = !sel.size;
    $('#dl-sel-n', el).textContent = sel.size ? ` (${sel.size})` : '';
    $('#sel-all', el).disabled = !list.some(ui.canLoad);
  }
  function renderGrid(animate) {
    const grid = $('#grid', el);
    if (searching) {
      grid.innerHTML = ui.skeletonCards(8);
      renderCount([]);
      return;
    }
    const list = visible();
    [...sel].forEach((id) => { const v = HC.store.get(id); if (!ui.canLoad(v) || !list.includes(v)) sel.delete(id); });
    if (!results) grid.innerHTML = `<div class="empty">${platform !== 'youtube' ? I.wave : I.search}<h4>${t('discover.ready_title')}</h4>${t(pkey('discover.ready_text'), { p: util.esc(plabel(platform)) })}</div>`;
    else if (!list.length) grid.innerHTML = `<div class="empty">${I.filter}<h4>${t('discover.none_title')}</h4>${f.period === 'year' ? t('discover.none_year', { year: f.year }) : t('discover.none_text')}</div>`;
    else grid.innerHTML = list.map((v) => ui.card(v, { selected: sel.has(v.id) })).join('');
    renderCount(list);
    renderSearchInfo();
    if (animate) fx.stagger(grid);
  }

  async function search() {
    if (searching) return;
    const inp = $('#q', el);
    const q = inp.value.trim();
    if (!q) { ui.toast(t('discover.need_query'), 'info'); inp.focus(); return; }
    const opts = searchOpts();
    searching = true;
    const btn = $('#btn-search', el);
    ui.busy(btn, true, t('discover.searching_btn'));
    paintPlatform();
    renderGrid();
    if (platform === ALL) {
      const out = await searchAll(q, opts);
      searching = false;
      progress = null;
      ui.busy(btn, false);
      paintPlatform();
      if (out.ok) {
        results = out.results;
        sel.clear();
        last = { query: q, effective: out.effective, genre: opts.genre, year: opts.year || null, known: true, skipped: out.skipped };
      } else ui.toast(out.error || t('discover.all_none'), 'err');
      renderGrid(true);
      renderQuota();
      return;
    }
    const r = await HC.bridge.safe('search', q, opts);
    searching = false;
    ui.busy(btn, false);
    paintPlatform();
    if (r && r.ok) {
      results = HC.store.put(r.results || []);
      sel.clear();
      last = { query: q, effective: typeof r.effective_query === 'string' ? r.effective_query : '', genre: opts.genre, year: opts.year || null, known: true };
    } else if (r) ui.toast(r.error || t('err.generic'), 'err');
    renderGrid(true);
  }

  /* ---------- «Alle»: eine Plattform nach der anderen ---------- */
  const allTargets = () => HC.platform.active();
  const skipText = (x) => `${util.esc(HC.platform.label(x.p))} (${util.esc(x.why === 'backoff' ? t('discover.skip_backoff', { t: util.fmtTime(x.until) }) : x.error || t('discover.skip_error'))})`;
  /** Treffer je Plattform im Reissverschluss mischen (Rang 1 jeder Plattform zuerst) – «Relevanz» bleibt so je Plattform erhalten. */
  function interleave(lists) {
    const out = [], seen = new Set();
    const n = Math.max(0, ...lists.map((l) => l.length));
    for (let i = 0; i < n; i++) lists.forEach((l) => { const v = l[i]; if (v && !seen.has(v.id)) { seen.add(v.id); out.push(v); } });
    return out;
  }
  /**
   * Sucht alle eingeschalteten Plattformen streng nacheinander: der nächste Aufruf startet erst,
   * wenn der vorige beantwortet ist. Plattformen im Backoff werden gar nicht angefragt.
   */
  async function searchAll(q, opts) {
    const targets = allTargets(), lists = [], skipped = [];
    let effective = '', lastError = '';
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      const bo = HC.platform.backoff(p);
      if (bo) { skipped.push({ p, why: 'backoff', until: bo.until }); continue; }
      progress = { p, i: i + 1, n: targets.length };
      renderCount([]);
      const r = await HC.bridge.safe('search', q, Object.assign({}, opts, { platform: p }));
      if (r && r.ok) {
        lists.push(HC.store.put(r.results || []));
        if (!effective && typeof r.effective_query === 'string') effective = r.effective_query;
      } else {
        lastError = (r && r.error) || '';
        skipped.push({ p, why: 'error', error: lastError });
      }
    }
    if (!lists.length) return { ok: false, error: skipped.length === 1 ? lastError : '' };
    return { ok: true, results: interleave(lists), effective, skipped };
  }

  /* ---------- Plattform-Auswahl (aufklappbar) ---------- */
  /** Text-Schlüssel je Plattform: YouTube ohne Zusatz, SoundCloud «_sc» (Phase 7a), Mixcloud/hearthis.at «_p» mit {p}. */
  const pkey = (base) => (platform === 'youtube' ? base : platform === ALL ? `${base}_all` : platform === 'soundcloud' ? `${base}_sc` : `${base}_p`);
  const plabel = (p) => (p === ALL ? t('platform.all') : HC.platform.label(p));
  const picon = (p) => HC.platform.icon(p === ALL ? 'all' : p);
  const allOk = () => allTargets().length > 1;
  const remember = () => { try { localStorage.setItem(STORE_KEY, platform); } catch (e) { /* egal */ } };
  const remembered = () => { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } };
  const usable = (p) => (p === ALL ? allOk() : HC.platform.enabled(p));
  const offText = (p) => (p === 'soundcloud' ? t('platform.sc_off') : t('platform.p_off', { p: HC.platform.label(p) }));
  function paintPlatform() {
    const btn = $('#plat-btn', el);
    btn.innerHTML = `${picon(platform)}<span class="psel-name">${util.esc(plabel(platform))}</span>${I.down}`;
    btn.setAttribute('aria-label', t('discover.platform_current', { p: plabel(platform) }));
    btn.disabled = searching;
    if (searching) openMenu(false);
    $$('#plat-list [data-p]', el).forEach((b) => {
      const p = b.dataset.p, on = p === platform;
      const off = p !== ALL && !HC.platform.enabled(p);
      const bo = p !== ALL && !off ? HC.platform.backoff(p) : null;
      b.hidden = p === ALL && !allOk();
      b.classList.toggle('on', on);
      b.classList.toggle('off', off);
      b.setAttribute('aria-selected', on);
      b.setAttribute('aria-disabled', off);
      b.title = off ? offText(p) : p === ALL ? t('discover.platform_all_title') : bo ? t('discover.platform_backoff', { p: HC.platform.label(p), t: util.fmtTime(bo.until) }) : '';
      $('.psel-note', b).textContent = off ? t('common.off') : bo ? t('discover.platform_backoff_short') : p === ALL ? String(allTargets().length) : '';
      $('.psel-note', b).classList.toggle('warn', !!bo);
    });
    $('#q', el).placeholder = t(pkey('discover.placeholder'), { p: plabel(platform) });
    el.dataset.platform = platform;
  }
  const options = () => $$('#plat-list [data-p]', el).filter((b) => !b.hidden);
  function openMenu(open, focusBack) {
    if (open === menuOpen) return;
    menuOpen = open;
    const list = $('#plat-list', el), btn = $('#plat-btn', el);
    list.hidden = !open;
    btn.setAttribute('aria-expanded', open);
    $('#plat', el).classList.toggle('open', open);
    if (open) (options().find((b) => b.classList.contains('on')) || options()[0]).focus();
    else if (focusBack) btn.focus();
  }
  function setPlatform(p, keep) {
    if (!usable(p)) p = 'youtube';
    if (p === platform || searching) { paintPlatform(); return; }
    stash[platform] = { results, last, q: $('#q', el).value };
    platform = p;
    if (!keep) remember();
    const x = stash[p] || { results: null, last: null };
    results = x.results;
    last = x.last;
    if (x.q && !$('#q', el).value.trim()) $('#q', el).value = x.q;
    sel.clear();
    paintPlatform();
    renderScope();
    renderGrid(true);
    renderQuota();
  }

  /* ---------- Stichwort-Boxen: «alle entfernen» (mit Rückgängig) und Vorschläge ---------- */
  const KW = { inc: 'include_keywords', exc: 'exclude_keywords' };
  const kwEd = (key) => (key === 'inc' ? incEd : excEd);
  /** Vorschläge = gespeicherte Stichwörter (Einstellungen › Filter), die in der Box gerade fehlen. */
  function renderKw(key) {
    const saved = (HC.settings.values.filters[KW[key]] || []).map((k) => String(k).toLowerCase());
    const miss = saved.filter((k, i) => saved.indexOf(k) === i && !f[key].includes(k));
    const box = $(`#s-${key}`, el);
    box.hidden = !miss.length;
    box.innerHTML = miss.map((k) => `<button type="button" class="kw-sugg" data-k="${util.esc(k)}" title="${util.esc(t('discover.kw_sugg_title'))}"><i>+</i><span>${util.esc(k)}</span></button>`).join('');
    $(`#c-${key}`, el).hidden = !f[key].length;
  }
  function setKw(key, list) {
    f[key] = list.slice();
    kwEd(key).set(f[key]);
    renderKw(key);
    renderGrid();
  }
  function clearKw(key) {
    const before = f[key].slice();
    if (!before.length) return;
    setKw(key, []);
    ui.toast(t(`discover.kw_cleared_${key}`), 'info', 7000, { label: t('common.undo'), fn: () => setKw(key, before.concat(f[key].filter((k) => !before.includes(k)))) });
  }

  async function loadBlacklist() {
    const b = await HC.bridge.safe('get_blacklist');
    blocked = new Set((b || []).map((x) => x.channel_id));
    renderGrid();
  }

  function init(root) {
    el = root;
    el.innerHTML = `
      <div class="searchbar">
        <div class="psel" id="plat">
          <button type="button" class="psel-btn" id="plat-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="plat-list" title="${util.esc(t('discover.platform_title'))}"></button>
          <div class="psel-list" id="plat-list" role="listbox" aria-label="${util.esc(t('platform.label'))}" hidden>
            ${[ALL].concat(HC.platform.all).map((p) => `<button type="button" role="option" tabindex="-1" data-p="${p}">${picon(p)}<span class="psel-name">${util.esc(plabel(p))}</span><small class="psel-note"></small>${I.check}</button>`).join('')}
          </div>
        </div>
        <div class="search-wrap">${I.search}
          <input class="input" id="q" placeholder="${util.esc(t('discover.placeholder'))}" spellcheck="false" autocomplete="off">
        </div>
        <select class="select" id="sort" style="width:180px" title="${util.esc(t('discover.sort'))}">
          <option value="rel">${t('discover.sort_rel')}</option><option value="date">${t('discover.sort_date')}</option>
          <option value="dur">${t('discover.sort_dur')}</option><option value="views">${t('discover.sort_views')}</option>
        </select>
        <button class="btn primary" id="btn-search">${I.search}${t('discover.search')}</button>
      </div>
      <div class="chips" id="genre-chips"><span class="meta"><span class="scope" id="scope" title="${util.esc(t('discover.scope_title'))}" hidden></span><span id="quota"></span></span></div>
      <div class="discover" id="disc">
        <aside class="filters"><div class="filters-inner">
          <h3>${t('discover.filters')} <button class="linkbtn" id="f-reset">${t('common.reset')}</button></h3>
          <div class="fgroup"><label class="lbl">${t('discover.f_duration')}</label>
            <div class="row2">
              <input class="input mono" id="f-min" type="number" min="0" title="${util.esc(t('discover.f_min'))}">
              <input class="input mono" id="f-max" type="number" min="0" placeholder="${util.esc(t('discover.f_max_ph'))}" title="${util.esc(t('discover.f_max'))}">
            </div></div>
          <div class="fgroup"><label class="lbl" for="f-date">${t('discover.f_period')}</label>
            <select class="select" id="f-date">${PERIODS.map((k) => `<option value="${k}">${t('period.' + k)}</option>`).join('')}</select>
            <div class="yearpick" id="f-year-box" hidden>
              <div class="stepper">
                <button type="button" class="iconbtn" id="f-year-dec" title="${util.esc(t('discover.f_year_prev'))}">${I.left}</button>
                <input class="input" id="f-year" type="number" inputmode="numeric" min="${MIN_YEAR}" step="1" aria-label="${util.esc(t('discover.f_year'))}">
                <button type="button" class="iconbtn" id="f-year-inc" title="${util.esc(t('discover.f_year_next'))}">${I.right}</button>
              </div>
              <input class="range" id="f-year-range" type="range" min="${MIN_YEAR}" step="1" aria-label="${util.esc(t('discover.f_year'))}" tabindex="-1">
              <div class="range-ends"><span>${MIN_YEAR}</span><span id="f-year-max"></span></div>
            </div>
            <div class="datepick" id="f-custom-box" hidden>
              <label><span>${t('discover.f_from')}</span><input class="input mono" id="f-from" type="date" min="${MIN_YEAR}-01-01"></label>
              <label><span>${t('discover.f_to')}</span><input class="input mono" id="f-to" type="date" min="${MIN_YEAR}-01-01"></label>
            </div>
            <p class="fhint" id="f-date-hint" hidden></p></div>
          ${['inc', 'exc'].map((k) => `<div class="fgroup"><label class="lbl">${t('discover.f_' + k)}</label>
            <div class="kwbox"><div id="t-${k}"></div><button type="button" class="kw-clear" id="c-${k}" data-clear="${k}" title="${util.esc(t('discover.kw_clear'))}" aria-label="${util.esc(t('discover.kw_clear'))}" hidden>${I.trash}</button></div>
            <div class="kw-suggs" id="s-${k}" data-key="${k}" aria-label="${util.esc(t('discover.kw_sugg_label'))}" hidden></div></div>`).join('')}
          <p class="fhint kw-hint">${t('discover.kw_session_hint')}</p>
          <div class="fgroup"><label class="lbl">${t('discover.f_show')}</label>
            <label class="check"><input type="checkbox" id="f-hide">${t('discover.f_hide')}</label>
            <label class="check"><input type="checkbox" id="f-blacklist">${t('discover.f_blacklist')}</label></div>
        </div></aside>
        <div class="results-wrap">
          <div class="bulkbar">
            <button class="btn sm ghost" id="f-toggle" title="${util.esc(t('discover.toggle_filters'))}">${I.filter}${t('discover.filters')}</button>
            <span class="count" id="count"></span>
            <span class="spacer"></span>
            <button class="btn sm ghost" id="sel-all">${t('discover.select_all')}</button>
            <button class="btn sm primary" id="dl-sel" disabled>${I.download}${t('discover.download_sel')}<span id="dl-sel-n"></span></button>
          </div>
          <div class="search-info" id="search-info" hidden></div>
          <div class="grid" id="grid"></div>
        </div>
      </div>`;

    defaultsFromSettings();
    const onKw = (key) => (list) => { f[key] = list; renderKw(key); renderGrid(); };
    incEd = ui.chips($('#t-inc', el), { list: f.inc, kind: 'inc', onChange: onKw('inc') });
    excEd = ui.chips($('#t-exc', el), { list: f.exc, kind: 'exc', onChange: onKw('exc') });
    syncControls();

    paintPlatform();
    const plat = $('#plat', el);
    $('#plat-btn', el).addEventListener('click', () => openMenu(!menuOpen));
    $('#plat-btn', el).addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openMenu(true); }
    });
    $('#plat-list', el).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-p]');
      if (!b) return;
      if (b.classList.contains('off')) { ui.toast(offText(b.dataset.p), 'info'); return; }
      openMenu(false);
      setPlatform(b.dataset.p);
      $('#q', el).focus();
    });
    /* Pfeile/Pos1/Ende wandern (umlaufend), Esc schliesst und gibt den Fokus zurück, Tab schliesst. */
    $('#plat-list', el).addEventListener('keydown', (e) => {
      const opts = options(), i = opts.indexOf(document.activeElement);
      const go = (n) => { e.preventDefault(); opts[(n + opts.length) % opts.length].focus(); };
      if (e.key === 'ArrowDown') go(i + 1);
      else if (e.key === 'ArrowUp') go(i - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(opts.length - 1);
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); openMenu(false, true); }
      else if (e.key === 'Tab') { e.preventDefault(); openMenu(false, true); }
    });
    document.addEventListener('pointerdown', (e) => { if (menuOpen && !plat.contains(e.target)) openMenu(false); });
    plat.addEventListener('focusout', (e) => { if (menuOpen && e.relatedTarget && !plat.contains(e.relatedTarget)) openMenu(false); });
    $('.filters', el).addEventListener('click', (e) => {
      const c = e.target.closest('[data-clear]');
      if (c) { clearKw(c.dataset.clear); return; }
      const s = e.target.closest('.kw-sugg');
      if (s) { const key = s.parentElement.dataset.key; setKw(key, f[key].concat(s.dataset.k)); }
    });
    $('#btn-search', el).onclick = search;
    $('#q', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
    $('#sort', el).addEventListener('change', () => renderGrid(true));
    $('#f-min', el).addEventListener('input', (e) => { f.min = Math.max(0, +e.target.value || 0); renderGrid(); });
    $('#f-max', el).addEventListener('input', (e) => { f.max = Math.max(0, +e.target.value || 0); renderGrid(); });
    $('#f-date', el).addEventListener('change', (e) => {
      f.period = e.target.value;
      syncPeriod();
      renderScope();
      renderGrid();
      if (f.period === 'year') $('#f-year', el).select();
    });
    /* Jahr: Tippen, Pfeiltasten, Mausrad, Stepper und Schieber – alles filtert sofort. */
    const yearInp = $('#f-year', el);
    yearInp.addEventListener('input', () => { const n = +yearInp.value; if (Number.isInteger(n) && n >= MIN_YEAR && n <= maxYear()) setYear(n); });
    yearInp.addEventListener('change', () => { setYear(+yearInp.value || f.year); yearInp.value = f.year; });
    yearInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { yearInp.blur(); search(); } });
    $('#f-year-dec', el).onclick = () => setYear(f.year - 1, true);
    $('#f-year-inc', el).onclick = () => setYear(f.year + 1, true);
    $('#f-year-range', el).addEventListener('input', (e) => setYear(+e.target.value));
    $('#f-year-box', el).addEventListener('wheel', (e) => { e.preventDefault(); setYear(f.year + (e.deltaY < 0 ? 1 : -1), true); }, { passive: false });
    $('#f-from', el).addEventListener('change', (e) => { f.from = e.target.value; renderGrid(); });
    $('#f-to', el).addEventListener('change', (e) => { f.to = e.target.value; renderGrid(); });
    $('#search-info', el).addEventListener('click', (e) => {
      if (!e.target.closest('[data-re]')) return;
      if (!$('#q', el).value.trim() && last) $('#q', el).value = last.query || '';
      search();
    });
    $('#f-hide', el).addEventListener('change', (e) => { f.hide = e.target.checked; renderGrid(); });
    $('#f-blacklist', el).addEventListener('change', (e) => { f.blacklist = e.target.checked; renderGrid(); });
    $('#f-reset', el).onclick = () => { defaultsFromSettings(); syncControls(); renderGrid(true); };
    $('#f-toggle', el).onclick = () => $('#disc', el).classList.toggle('no-filters');
    $('#genre-chips', el).addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      const g = c.dataset.genre;
      if (f.genres.has(g)) f.genres.delete(g); else f.genres.add(g);
      c.classList.toggle('on', f.genres.has(g));
      c.setAttribute('aria-pressed', f.genres.has(g));
      renderScope();
      renderGrid();
    });
    /* Doppelklick = Solo: nur dieses Genre (wird an die Suche angehängt); nochmals = wieder alle. */
    $('#genre-chips', el).addEventListener('dblclick', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      const g = c.dataset.genre;
      /* Die zwei Klicks davor haben den Chip aus- und wieder eingeschaltet: Zustand = wie vor dem Doppelklick. */
      const solo = f.genres.size === 1 && f.genres.has(g);
      f.genres = solo ? new Set(HC.genres.names()) : new Set([g]);
      renderChips();
      renderGrid();
    });
    $('#sel-all', el).onclick = () => {
      const list = visible().filter(ui.canLoad);
      const all = list.every((v) => sel.has(v.id));
      list.forEach((v) => (all ? sel.delete(v.id) : sel.add(v.id)));
      renderGrid();
    };
    $('#dl-sel', el).onclick = () => { const ids = [...sel]; sel.clear(); HC.actions.download(ids); };
    ui.bindCards($('#grid', el), {
      onSelect(v, card) {
        if (sel.has(v.id)) sel.delete(v.id); else sel.add(v.id);
        card.classList.toggle('sel', sel.has(v.id));
        renderCount(visible());
      },
    });
    document.addEventListener('keydown', (e) => {
      if (HC.app.current() === 'discover' && e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q', el).focus(); }
    });

    HC.bridge.on('video', () => renderGrid());
    HC.bridge.on('status_rendered', renderQuota);
    HC.bridge.on('blacklist_changed', loadBlacklist);
    HC.bridge.on('settings_changed', () => { defaultsFromSettings(); syncControls(); setPlatform(usable(platform) ? platform : 'youtube', true); renderGrid(); renderQuota(); });
    HC.bridge.on('status_rendered', () => { if (!searching && !menuOpen) paintPlatform(); });
    HC.bridge.on('status_rendered', () => { if (maxYear() !== +$('#f-year', el).max) syncPeriod(); }); // Jahreswechsel bei laufender App
  }

  let loaded = false;
  async function show(arg, changed) {
    if (!loaded) {
      loaded = true;
      loadBlacklist();
      const prev = await HC.bridge.safe('get_last_search');
      /* Die gemerkte Auswahl gewinnt, sonst bestimmt die letzte Suche die Plattform beim Start.
         Passt die letzte Suche nicht zur Auswahl (oder ist ihre Plattform aus), wartet sie bei ihrer Plattform. */
      const want = remembered();
      const has = !!(prev && prev.results) && !results;
      const pp = has && HC.platform.all.includes(prev.platform) ? prev.platform : 'youtube';
      const pick = want && usable(want) ? want : HC.platform.enabled(pp) ? pp : 'youtube';
      if (!results) platform = pick;
      if (has) {
        const hits = HC.store.put(prev.results);
        /* genre/year liefert das Backend evtl. nicht mit -> dann kein «veraltet»-Hinweis. */
        const known = 'genre' in prev || 'year' in prev;
        const was = { query: prev.query || '', effective: typeof prev.effective_query === 'string' ? prev.effective_query : '', genre: prev.genre || null, year: prev.year || null, known };
        if (pick === pp) {
          $('#q', el).value = prev.query || '';
          results = hits;
          last = was;
        } else stash[pp] = { results: hits, last: HC.platform.enabled(pp) ? was : null, q: prev.query || '' };
      }
      paintPlatform();
      renderScope();
      renderGrid(true);
    } else if (changed) {
      renderGrid(true);
    }
    renderQuota();
  }

  /** v0.8.0 (DJ-Seite «In Entdecken suchen»): Suchbegriff vorbelegen – gesucht wird erst auf Klick/Enter (Kontingent). */
  function prefill(q) {
    const inp = el && $('#q', el);
    if (!inp) return;
    inp.value = String(q || '');
    inp.focus();
    inp.select();
  }
  HC.views.discover = { init, show, prefill, reset() { loaded = false; results = null; last = null; sel.clear(); Object.keys(stash).forEach((k) => delete stash[k]); } };
})();
