/* =====================================================================
   views/inbox.js – Eingang: neue Watchlist-Treffer, die alle Filter bestehen
   Gleiche Karte wie «Entdecken», zusätzlich mit Quelle-Badge (Video.source_id).
   Sammelaktionen gelten für die Auswahl – ohne Auswahl für alle sichtbaren Treffer.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;

  let el;
  let items = [];
  let sources = new Map(); // id -> Source
  let loaded = false;
  let filter = null; // null = alle | Quelle-ID | 'none' (Treffer ohne bekannte Quelle)
  const sel = new Set();
  const known = new Set(); // schon gezeigte IDs – neue leuchten kurz auf
  const fresh = new Set();

  const srcKey = (v) => (v.source_id != null && sources.has(v.source_id) ? v.source_id : 'none');
  const srcName = (k) => (sources.get(k) ? String(sources.get(k).name) : '');
  const open = () => items.filter((v) => v.status === 'inbox');
  const visible = () => { const list = open(); return filter == null ? list : list.filter((v) => srcKey(v) === filter); };
  /** Worauf die Kopf-Knöpfe wirken: Auswahl, sonst alles Sichtbare. */
  const targets = () => { const list = visible(); return sel.size ? list.filter((v) => sel.has(v.id)) : list; };

  function renderBar(all, list) {
    const groups = new Map();
    all.forEach((v) => { const k = srcKey(v); groups.set(k, (groups.get(k) || 0) + 1); });
    const keys = [...groups.keys()].sort((a, b) => (a === 'none') - (b === 'none') || srcName(a).localeCompare(srcName(b), 'de'));
    const chip = (k, label, n) => `<button type="button" class="chip src${filter === k ? ' on' : ''}" data-src="${k == null ? '' : esc(k)}" aria-pressed="${filter === k}"${k == null ? '' : ` title="${esc(t('inbox.src_title'))}"`}><span>${esc(label)}</span><i>${n}</i></button>`;
    const showChips = keys.length > 1 || (keys.length === 1 && keys[0] !== 'none') || filter != null;
    const chips = showChips ? chip(null, t('inbox.src_all'), all.length) + keys.map((k) => chip(k, k === 'none' ? t('inbox.src_none') : srcName(k), groups.get(k))).join('') : '';
    const allSel = list.length > 0 && list.every((v) => sel.has(v.id));
    const count = filter != null ? t('inbox.count_of', { n: `<b>${list.length}</b>`, total: all.length }) : t('inbox.count', { n: `<b>${list.length}</b>` });
    const bar = $('#inbox-bar', el);
    bar.hidden = !all.length;
    bar.innerHTML = `${chips}<span class="meta"><span>${count}${sel.size ? ` · ${t('inbox.selected', { n: `<b>${sel.size}</b>` })}` : ''}</span>
      <button type="button" class="btn sm ghost" id="inbox-selall" ${list.length ? '' : 'disabled'}>${t(allSel ? 'inbox.select_none' : 'inbox.select_all')}</button></span>`;
  }
  function renderHead(all, list) {
    const n = sel.size;
    $('#inbox-sub', el).textContent = !all.length ? t('inbox.sub') : all.length === 1 ? t('inbox.sub_one') : t('inbox.sub_n', { n: all.length });
    const dl = $('#inbox-all', el), ig = $('#inbox-ignore', el);
    dl.disabled = ig.disabled = !list.length;
    dl.innerHTML = `${I.download}${t(n ? 'inbox.download_sel' : 'inbox.download_all')}${n ? ` (${n})` : ''}`;
    ig.innerHTML = `${I.ban}${t(n ? 'inbox.ignore_sel' : 'inbox.ignore_all')}${n ? ` (${n})` : ''}`;
  }
  function emptyHtml() {
    const nx = HC.schedule.next();
    const text = !sources.size ? t('inbox.empty_nosrc') : `${t('inbox.empty_text')}${nx.at ? ` ${t('inbox.empty_next', { t: esc(HC.schedule.label(nx)) })}` : ''}`;
    return `<div class="empty">${I.inbox}<h4>${t('inbox.empty_title')}</h4><p>${text}</p>
      <button type="button" class="btn sm" data-goto="watchlist">${I.eye}${t('inbox.to_watchlist')}</button></div>`;
  }
  function render(animate) {
    const all = open();
    if (filter != null && !all.some((v) => srcKey(v) === filter)) filter = null; // Quelle leer -> zurück zu «Alle»
    const list = visible();
    [...sel].forEach((id) => { if (!list.some((v) => v.id === id)) sel.delete(id); });
    const grid = $('#grid-inbox', el);
    grid.innerHTML = list.length
      ? list.map((v) => ui.card(v, { selected: sel.has(v.id), source: srcKey(v) === 'none' ? '' : srcName(v.source_id) })).join('')
      : emptyHtml();
    if (fresh.size && HC.app.current() === 'inbox') {
      $$('.card[data-id]', grid).forEach((c) => { if (fresh.has(c.dataset.id)) c.classList.add('flash'); });
      fresh.clear();
    }
    renderBar(all, list);
    renderHead(all, list);
    if (animate) fx.stagger(grid);
  }
  const paintChrome = () => { const all = open(), list = visible(); renderBar(all, list); renderHead(all, list); };

  /* Karten, die den Eingang verlassen (geladen/ignoriert), blenden kurz aus – dann neu zeichnen. */
  let leaveTimer = null;
  function onVideo() {
    if (!loaded) return;
    let leaving = false;
    $$('#grid-inbox .card[data-id]', el).forEach((c) => {
      const v = HC.store.get(c.dataset.id);
      if (v && v.status !== 'inbox') { c.classList.add('leave'); leaving = true; }
    });
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => render(), leaving && !fx.reduced() && HC.app.current() === 'inbox' ? 190 : 0);
  }

  async function load(animate) {
    const [list, srcs] = await Promise.all([HC.bridge.safe('get_inbox'), HC.bridge.safe('get_sources')]);
    if (srcs) sources = new Map(srcs.map((s) => [s.id, s]));
    if (list) {
      items = HC.store.put(list);
      if (loaded) items.forEach((v) => { if (!known.has(v.id)) fresh.add(v.id); });
      items.forEach((v) => known.add(v.id));
      loaded = true;
    }
    render(animate);
  }
  const reload = util.debounce(() => { if (loaded) load(false); }, 150);

  async function ignore(list) {
    if (!list.length) return;
    if (list.length > 1) {
      const yes = await ui.confirm(t('dlg.ignore_all.title'), t('dlg.ignore_all.text', { n: list.length }), { okLabel: t('dlg.ignore_all.ok'), danger: true });
      if (!yes) return;
    }
    const res = await Promise.all(list.map((v) => HC.bridge.safe('set_video_status', v.id, 'ignored')));
    const n = res.filter((r) => r && r.ok).length;
    const bad = res.find((r) => r && !r.ok);
    if (n) ui.toast(n === 1 ? t('toast.ignored_one') : t('toast.ignored_n', { n }), 'info');
    if (bad) ui.toast(bad.error || t('err.generic'), 'err');
    HC.app.refreshStatus();
  }

  function init(root) {
    el = root;
    el.innerHTML = `
      <div class="view-head"><h2 class="glitch" data-text="${t('inbox.title')}">${t('inbox.title')}</h2><span class="sub" id="inbox-sub"></span>
        <div class="actions">
          <button class="btn" id="inbox-ignore">${I.ban}${t('inbox.ignore_all')}</button>
          <button class="btn primary" id="inbox-all">${I.download}${t('inbox.download_all')}</button>
        </div></div>
      <div class="chips inbox-bar" id="inbox-bar" hidden></div>
      <div class="scroll"><div class="grid" id="grid-inbox"></div></div>`;
    ui.bindCards($('#grid-inbox', el), {
      onSelect(v, card) {
        if (sel.has(v.id)) sel.delete(v.id); else sel.add(v.id);
        card.classList.toggle('sel', sel.has(v.id));
        paintChrome();
      },
    });
    $('#grid-inbox', el).addEventListener('click', (e) => { if (e.target.closest('[data-goto]')) HC.app.go('watchlist'); });
    $('#inbox-bar', el).addEventListener('click', (e) => {
      const chip = e.target.closest('[data-src]');
      if (chip) {
        const k = chip.dataset.src;
        filter = k === '' ? null : k === 'none' ? 'none' : +k;
        sel.clear();
        render(true);
        return;
      }
      if (e.target.closest('#inbox-selall')) {
        const list = visible();
        const all = list.every((v) => sel.has(v.id));
        list.forEach((v) => (all ? sel.delete(v.id) : sel.add(v.id)));
        render();
      }
    });
    $('#inbox-all', el).onclick = async () => {
      const ids = targets().map((v) => v.id);
      sel.clear();
      await HC.actions.download(ids);
      HC.app.refreshStatus();
    };
    $('#inbox-ignore', el).onclick = () => ignore(targets());

    HC.bridge.on('video', onVideo);
    /* Neue Treffer: nach jeder geprüften Quelle mit Fund und am Ende des Laufs neu laden. */
    HC.bridge.on('source', (d) => { if (!d.checking && d.new_count) reload(); });
    HC.bridge.on('watchlist_done', (d) => { if (d.found) reload(); });
    HC.bridge.on('sources_changed', reload);
    HC.bridge.on('settings_changed', () => { if (loaded) render(); }); // Genre-Farben
    /* Zähler der Statusleiste höher als die Liste (z.B. Prüfung über die Aufgabenplanung) -> nachladen. */
    let seen = -1;
    HC.bridge.on('status_rendered', (s) => {
      const n = typeof s.inbox_count === 'number' ? s.inbox_count : -1;
      if (loaded && HC.app.current() === 'inbox' && n !== seen && n > open().length) reload();
      seen = n;
    });
  }

  async function show(arg, changed) {
    const m = /^src-(\d+)$/.exec(arg || '');
    if (m) { filter = +m[1]; sel.clear(); }
    await load(changed);
  }

  HC.views.inbox = { init, show, reset() { items = []; sources = new Map(); loaded = false; filter = null; sel.clear(); known.clear(); fresh.clear(); } };
})();
