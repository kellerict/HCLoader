/* =====================================================================
   views/discover.js – Entdecken: Suche, Genre-Chips, Filter-Panel, Karten
   Die Filter laufen clientseitig auf den Treffern (Spiegel von core/filters.py).
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx, ui } = HC;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const PERIOD_DAYS = { all: 0, '7d': 7, '30d': 30, '1y': 365 };
  const CAN_LOAD = ['new', 'inbox', 'failed'];

  let el;
  let results = null; // null = noch keine Suche
  let searching = false;
  let blocked = new Set();
  const sel = new Set();
  const f = { min: 10, max: 0, period: 'all', inc: [], exc: [], hide: true, blacklist: true, genres: new Set() };
  let incEd, excEd;

  function defaultsFromSettings() {
    const s = HC.settings.values.filters;
    f.min = s.min_duration / 60;
    f.max = s.max_duration / 60;
    f.period = s.upload_period;
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
    $('#f-hide', el).checked = f.hide;
    $('#f-blacklist', el).checked = f.blacklist;
    incEd.set(f.inc);
    excEd.set(f.exc);
    renderChips();
  }

  function passes(v) {
    if (v.duration == null || v.duration < f.min * 60) return false;
    if (f.max && v.duration > f.max * 60) return false;
    const days = PERIOD_DAYS[f.period];
    if (days) { const ago = util.daysAgo(v.upload_date); if (ago != null && ago > days) return false; }
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
      box.insertBefore(c, meta);
    });
  }
  function renderQuota() {
    const s = HC.status;
    if (!s) return;
    $('#quota', el).innerHTML = t('discover.quota', { n: `<b>${s.counters.searches_hour}</b>`, max: HC.settings.values.throttle.max_searches_per_hour });
  }
  function renderCount(list) {
    const n = list.length, hidden = results ? results.length - n : 0;
    $('#count', el).innerHTML = searching ? t('discover.searching')
      : !results ? ''
        : t('discover.count', { n: `<b>${n}</b>`, hidden }) + (sel.size ? ` · ${t('discover.selected', { n: `<b>${sel.size}</b>` })}` : '');
    $('#dl-sel', el).disabled = !sel.size;
    $('#dl-sel-n', el).textContent = sel.size ? ` (${sel.size})` : '';
    $('#sel-all', el).disabled = !list.some((v) => CAN_LOAD.includes(v.status));
  }
  function renderGrid(animate) {
    const grid = $('#grid', el);
    if (searching) {
      grid.innerHTML = ui.skeletonCards(8);
      renderCount([]);
      return;
    }
    const list = visible();
    [...sel].forEach((id) => { const v = HC.store.get(id); if (!v || !CAN_LOAD.includes(v.status) || !list.includes(v)) sel.delete(id); });
    if (!results) grid.innerHTML = `<div class="empty">${I.search}<h4>${t('discover.ready_title')}</h4>${t('discover.ready_text')}</div>`;
    else if (!list.length) grid.innerHTML = `<div class="empty">${I.filter}<h4>${t('discover.none_title')}</h4>${t('discover.none_text')}</div>`;
    else grid.innerHTML = list.map((v) => ui.card(v, { selected: sel.has(v.id) })).join('');
    renderCount(list);
    if (animate) fx.stagger(grid);
  }

  async function search() {
    const q = $('#q', el).value.trim();
    if (!q || searching) return;
    searching = true;
    const btn = $('#btn-search', el);
    ui.busy(btn, true, t('discover.searching_btn'));
    renderGrid();
    const r = await HC.bridge.safe('search', q);
    searching = false;
    ui.busy(btn, false);
    if (r && r.ok) { results = HC.store.put(r.results); sel.clear(); }
    else if (r) ui.toast(r.error || t('err.generic'), 'err');
    renderGrid(true);
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
        <div class="search-wrap">${I.search}
          <input class="input" id="q" placeholder="${util.esc(t('discover.placeholder'))}" spellcheck="false" autocomplete="off">
        </div>
        <select class="select" id="sort" style="width:180px" title="${util.esc(t('discover.sort'))}">
          <option value="rel">${t('discover.sort_rel')}</option><option value="date">${t('discover.sort_date')}</option>
          <option value="dur">${t('discover.sort_dur')}</option><option value="views">${t('discover.sort_views')}</option>
        </select>
        <button class="btn primary" id="btn-search">${I.search}${t('discover.search')}</button>
      </div>
      <div class="chips" id="genre-chips"><span class="meta" id="quota"></span></div>
      <div class="discover" id="disc">
        <aside class="filters"><div class="filters-inner">
          <h3>${t('discover.filters')} <button class="linkbtn" id="f-reset">${t('common.reset')}</button></h3>
          <div class="fgroup"><label class="lbl">${t('discover.f_duration')}</label>
            <div class="row2">
              <input class="input mono" id="f-min" type="number" min="0" title="${util.esc(t('discover.f_min'))}">
              <input class="input mono" id="f-max" type="number" min="0" placeholder="${util.esc(t('discover.f_max_ph'))}" title="${util.esc(t('discover.f_max'))}">
            </div></div>
          <div class="fgroup"><label class="lbl" for="f-date">${t('discover.f_period')}</label>
            <select class="select" id="f-date">${Object.keys(PERIOD_DAYS).map((k) => `<option value="${k}">${t('period.' + k)}</option>`).join('')}</select></div>
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
          <div class="grid" id="grid"></div>
        </div>
      </div>`;

    defaultsFromSettings();
    const onKw = (key) => (list) => { f[key] = list; renderGrid(); };
    incEd = ui.chips($('#t-inc', el), { list: f.inc, kind: 'inc', onChange: onKw('inc') });
    excEd = ui.chips($('#t-exc', el), { list: f.exc, kind: 'exc', onChange: onKw('exc') });
    syncControls();

    $('#btn-search', el).onclick = search;
    $('#q', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
    $('#sort', el).addEventListener('change', () => renderGrid(true));
    $('#f-min', el).addEventListener('input', (e) => { f.min = Math.max(0, +e.target.value || 0); renderGrid(); });
    $('#f-max', el).addEventListener('input', (e) => { f.max = Math.max(0, +e.target.value || 0); renderGrid(); });
    $('#f-date', el).addEventListener('change', (e) => { f.period = e.target.value; renderGrid(); });
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
      renderGrid();
    });
    $('#sel-all', el).onclick = () => {
      const list = visible().filter((v) => CAN_LOAD.includes(v.status));
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
    HC.bridge.on('settings_changed', () => { defaultsFromSettings(); syncControls(); renderGrid(); renderQuota(); });
  }

  let loaded = false;
  async function show(arg, changed) {
    if (!loaded) {
      loaded = true;
      loadBlacklist();
      const last = await HC.bridge.safe('get_last_search');
      if (last && last.results && !results) {
        $('#q', el).value = last.query || '';
        results = HC.store.put(last.results);
      }
      renderGrid(true);
    } else if (changed) {
      renderGrid(true);
    }
    renderQuota();
  }

  HC.views.discover = { init, show, reset() { loaded = false; results = null; sel.clear(); } };
})();
