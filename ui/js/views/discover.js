/* =====================================================================
   views/discover.js – Entdecken: Suche, Genre-Chips, Filter-Panel, Karten
   Die Filter laufen clientseitig auf den Treffern (Spiegel von core/filters.py).
   Plattform-Umschalter YouTube | SoundCloud (Phase 7a): jede Plattform behält ihre
   letzten Treffer; gesucht wird immer nur auf der gewählten.
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
  let platform = 'youtube';
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
      platform,
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
    if (!eff && !stale) { box.hidden = true; return; }
    let q = '';
    if (eff) {
      const base = last.query || '';
      const split = base && eff.toLowerCase().startsWith(base.toLowerCase()) ? base.length : 0;
      q = `<span class="k">${t('discover.searched')}</span><span class="q" title="${util.esc(eff)}">${util.esc(eff.slice(0, split))}<b>${util.esc(eff.slice(split))}</b></span>`;
    }
    box.innerHTML = `${q}${stale ? `<span class="stale" title="${util.esc(t('discover.re_search_title'))}"><span class="led warn"></span>${t('discover.stale')}<button class="linkbtn" data-re>${t('discover.re_search')}</button></span>` : ''}`;
    box.hidden = false;
  }
  function renderQuota() {
    if (!HC.status) return;
    const st = HC.platform.state(platform);
    $('#quota', el).innerHTML = t(platform === 'soundcloud' ? 'discover.quota_sc' : 'discover.quota', { n: `<b>${util.esc(st.counters.searches_hour || 0)}</b>`, max: util.esc(st.limits.searches_hour) });
  }
  function renderCount(list) {
    const n = list.length, hidden = results ? results.length - n : 0;
    const prev = results ? results.filter((v) => v.preview).length : 0;
    $('#count', el).innerHTML = searching ? t(platform === 'soundcloud' ? 'discover.searching_sc' : 'discover.searching')
      : !results ? ''
        : t('discover.count', { n: `<b>${util.fmtNum(n)}</b>`, count: n, hidden }) + (prev ? ` · <span class="prevcount" title="${util.esc(t('discover.previews_title'))}">${t('discover.previews', { n: prev })}</span>` : '')
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
    if (!results) grid.innerHTML = `<div class="empty">${platform === 'soundcloud' ? I.wave : I.search}<h4>${t('discover.ready_title')}</h4>${t(platform === 'soundcloud' ? 'discover.ready_text_sc' : 'discover.ready_text')}</div>`;
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

  /* ---------- Plattform-Umschalter ---------- */
  function paintPlatform() {
    const scOn = HC.platform.scEnabled();
    $$('#plat button', el).forEach((b) => {
      const on = b.dataset.p === platform, off = b.dataset.p === 'soundcloud' && !scOn;
      b.classList.toggle('on', on);
      b.classList.toggle('off', off);
      b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-disabled', off);
      b.title = off ? t('platform.sc_off') : t('discover.platform_title');
      b.disabled = searching && !on;
    });
    $('#q', el).placeholder = t(platform === 'soundcloud' ? 'discover.placeholder_sc' : 'discover.placeholder');
    el.dataset.platform = platform;
  }
  function setPlatform(p) {
    if (p === 'soundcloud' && !HC.platform.scEnabled()) p = 'youtube';
    if (p === platform || searching) { paintPlatform(); return; }
    stash[platform] = { results, last, q: $('#q', el).value };
    platform = p;
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

  async function loadBlacklist() {
    const b = await HC.bridge.safe('get_blacklist');
    blocked = new Set((b || []).map((x) => x.channel_id));
    renderGrid();
  }

  function init(root) {
    el = root;
    el.innerHTML = `
      <div class="searchbar">
        <div class="seg pseg" id="plat" role="group" aria-label="${util.esc(t('platform.label'))}">
          <button type="button" data-p="youtube">${t('platform.youtube')}</button><button type="button" data-p="soundcloud">${I.wave}${t('platform.soundcloud')}</button>
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
          <div class="fgroup"><label class="lbl">${t('discover.f_inc')}</label><div id="t-inc"></div></div>
          <div class="fgroup"><label class="lbl">${t('discover.f_exc')}</label><div id="t-exc"></div></div>
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
    const onKw = (key) => (list) => { f[key] = list; renderGrid(); };
    incEd = ui.chips($('#t-inc', el), { list: f.inc, kind: 'inc', onChange: onKw('inc') });
    excEd = ui.chips($('#t-exc', el), { list: f.exc, kind: 'exc', onChange: onKw('exc') });
    syncControls();

    paintPlatform();
    $('#plat', el).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-p]');
      if (!b) return;
      if (b.classList.contains('off')) { ui.toast(t('platform.sc_off'), 'info'); return; }
      setPlatform(b.dataset.p);
      $('#q', el).focus();
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
    HC.bridge.on('settings_changed', () => { defaultsFromSettings(); syncControls(); setPlatform(platform); renderGrid(); renderQuota(); });
    HC.bridge.on('status_rendered', () => { if (maxYear() !== +$('#f-year', el).max) syncPeriod(); }); // Jahreswechsel bei laufender App
  }

  let loaded = false;
  async function show(arg, changed) {
    if (!loaded) {
      loaded = true;
      loadBlacklist();
      const prev = await HC.bridge.safe('get_last_search');
      if (prev && prev.results && !results) {
        /* Die letzte Suche bestimmt die Plattform beim Start (SoundCloud nur, wenn eingeschaltet). */
        const pp = prev.platform === 'soundcloud' ? 'soundcloud' : 'youtube';
        if (HC.platform.enabled(pp)) platform = pp;
        else { stash[pp] = { results: HC.store.put(prev.results), last: null, q: prev.query || '' }; prev.results = null; }
        paintPlatform();
      }
      if (prev && prev.results && !results) {
        $('#q', el).value = prev.query || '';
        results = HC.store.put(prev.results);
        /* genre/year liefert das Backend evtl. nicht mit -> dann kein «veraltet»-Hinweis. */
        const known = 'genre' in prev || 'year' in prev;
        last = { query: prev.query || '', effective: typeof prev.effective_query === 'string' ? prev.effective_query : '', genre: prev.genre || null, year: prev.year || null, known };
      }
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
