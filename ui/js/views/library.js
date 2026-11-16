/* =====================================================================
   views/library.js – Bibliothek: alle geladenen Mixes
   Kennzahlen (hochzählend), Suche + Filter (Genre/Kanal/Jahr), Sortierung, optionale
   Gruppierung nach Genre, Liste oder Kacheln. Aktionen: Ordner öffnen, neu taggen, löschen.

   get_library() wird ohne Filter aufgerufen: gefiltert, sortiert und gruppiert wird hier
   (sofortige Reaktion, kein Roundtrip). Grosse Bibliotheken werden in Blöcken gezeichnet.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const PAGE = 120; // Einträge pro Block
  const STORE_KEY = 'hc.library';
  const SORTS = ['newest', 'title', 'channel', 'duration'];

  let el;
  let items = [];
  let loaded = false;
  let limit = PAGE;
  let onlyMissing = false;
  let targetDown = null; // Pfad des nicht erreichbaren Zielordners, sonst null
  let moreObserver = null;
  const busy = new Set(); // IDs, die gerade neu getaggt werden
  const prefs = { view: 'list', sort: 'newest', group: false };

  /* ---------- Einstellungen der Ansicht (bleiben über Neustarts erhalten) ---------- */
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (p.view === 'grid' || p.view === 'list') prefs.view = p.view;
      if (SORTS.includes(p.sort)) prefs.sort = p.sort;
      prefs.group = !!p.group;
    } catch (e) { /* kein Speicher (file://, privat) – Standardwerte */ }
  }
  function savePrefs() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch (e) { /* egal */ }
  }

  /* ---------- Helfer ---------- */
  const year = (l) => (l.year ? String(l.year) : String(l.upload_date || '').slice(0, 4));
  const stamp = (l) => { const d = util.parseDate(l.downloaded_at); return d ? d.getTime() : 0; };
  /** «…\Hardcore\Gabber Vault\2026\» – die letzten drei Ordner des Ablageorts. */
  function shortDir(path) {
    const sep = String(path).includes('\\') ? '\\' : '/';
    const parts = String(path || '').split(/[\\/]/).filter(Boolean);
    parts.pop();
    if (!parts.length) return '';
    const tail = parts.slice(-3);
    return `${parts.length > tail.length ? '…' + sep : ''}${tail.join(sep)}${sep}`;
  }
  const fmtSize = (mb) => (!mb ? '–' : mb >= 1024 ? `${(mb / 1024).toFixed(2)} ${t('library.unit_gb')}` : mb < 1 ? `${Math.max(1, Math.round(mb * 1024))} ${t('library.unit_kb')}` : `${Math.round(mb)} ${t('library.unit_mb')}`);
  const fmtTotal = (sec) => { const h = sec / 3600; return h >= 1 ? `${h.toFixed(1)} ${t('library.unit_h')}` : `${Math.round(sec / 60)} ${t('library.unit_min')}`; };
  const genreOrder = () => {
    const known = HC.genres.names();
    const extra = [...new Set(items.map((l) => l.genre))].filter((g) => g && !known.includes(g)).sort();
    return known.concat(extra);
  };
  const byText = (a, b) => String(a).localeCompare(String(b), 'de', { sensitivity: 'base', numeric: true });

  function filtered() {
    const q = util.norm($('#lib-q', el).value.trim());
    const g = $('#lib-genre', el).value, c = $('#lib-channel', el).value, y = $('#lib-year', el).value;
    const list = items.filter((l) => (!g || l.genre === g) && (!c || l.artist === c) && (!y || year(l) === y)
      && (!onlyMissing || l.missing) && (!q || util.norm(`${l.title} ${l.artist} ${l.file_path}`).includes(q)));
    const cmp = {
      newest: (a, b) => stamp(b) - stamp(a) || byText(a.title, b.title),
      title: (a, b) => byText(a.title, b.title),
      channel: (a, b) => byText(a.artist, b.artist) || stamp(b) - stamp(a),
      duration: (a, b) => (b.duration || 0) - (a.duration || 0),
    }[prefs.sort];
    return list.sort(cmp);
  }
  const filtersActive = () => !!($('#lib-q', el).value.trim() || $('#lib-genre', el).value || $('#lib-channel', el).value || $('#lib-year', el).value || onlyMissing);

  /* ---------- Zeile / Kachel ---------- */
  function actions(l) {
    const working = busy.has(l.id);
    return `<button class="iconbtn" data-act="folder" title="${esc(t('library.open_folder'))}">${I.folder}</button>
      <button class="iconbtn" data-act="retag" title="${esc(t(working ? 'library.retagging' : 'library.retag'))}" ${l.missing || l.unknown || working ? 'disabled' : ''}>${working ? '<span class="spinner"></span>' : I.tag}</button>
      <button class="iconbtn danger" data-act="del" title="${esc(t(l.unknown ? 'library.unknown_title' : l.missing ? 'library.remove' : 'library.delete'))}" ${working || l.unknown ? 'disabled' : ''}>${l.missing ? I.file_x : I.trash}</button>`;
  }
  const cueTag = () => `<span class="cue-tag" title="${esc(t('library.cue_title'))}">CUE</span>`;
  const missTag = () => `<span class="miss-tag" title="${esc(t('library.missing_title'))}">${I.warn}${t('library.missing')}</span>`;
  const cls = (l) => `${l.missing ? ' missing' : ''}${busy.has(l.id) ? ' working' : ''}`;
  function row(l) {
    return `<tr data-id="${esc(l.id)}" class="${cls(l).trim()}">
      <td class="clip"><div class="cell-title">${ui.thumb(l, 'mini')}</div>
        <div><b title="${esc(l.title)}">${esc(l.title)}</b><small title="${esc(l.file_path)}">${l.missing ? missTag() : ''}${l.has_cue && !l.missing ? cueTag() : ''}<span>${esc(shortDir(l.file_path))}</span></small></div></div></td>
      <td class="clip" title="${esc(l.artist)}">${esc(l.artist)}</td>
      <td>${ui.gtag(l.genre)}</td>
      <td class="mono">${esc(year(l) || '–')}</td>
      <td class="mono num">${util.fmtDur(l.duration)}</td>
      <td class="mono num">${l.missing ? '–' : fmtSize(l.size_mb)}</td>
      <td class="mono lib-loaded" title="${esc(util.fmtFull(l.downloaded_at))}">${util.fmtDate(l.downloaded_at)}</td>
      <td class="act">${actions(l)}</td></tr>`;
  }
  function card(l) {
    return `<div class="card lib-card${cls(l)}" data-id="${esc(l.id)}">
      ${ui.thumb(l)}${ui.gtag(l.genre)}<span class="dur">${util.fmtDur(l.duration)}</span>${l.missing ? missTag() : ''}</div>
      <div class="cbody">
        <div class="ctitle" title="${esc(l.title)}">${esc(l.title)}</div>
        <div class="cmeta" title="${esc(l.file_path)}"><span class="ch">${esc(l.artist)}</span><span>·</span><span>${esc(year(l) || '–')}</span><span>·</span><span>${l.missing ? '–' : fmtSize(l.size_mb)}</span></div>
        <div class="cfoot"><span class="lib-date" title="${esc(t('library.col_loaded'))}: ${esc(util.fmtFull(l.downloaded_at))}">${util.fmtDate(l.downloaded_at)}</span>${l.has_cue && !l.missing ? cueTag() : ''}<span class="spacer"></span>${actions(l)}</div>
      </div></div>`;
  }
  const nodeOf = (id) => el.querySelector(`#lib-body [data-id="${CSS.escape(id)}"]`);
  /** Einen Eintrag an Ort und Stelle neu zeichnen (ohne die Liste neu aufzubauen). */
  function repaint(l, flash) {
    const old = nodeOf(l.id);
    if (!old) return null;
    old.insertAdjacentHTML('afterend', prefs.view === 'grid' ? card(l) : row(l));
    const fresh = old.nextElementSibling;
    old.remove();
    if (flash) fx.flash(fresh);
    return fresh;
  }

  /* ---------- Liste ---------- */
  function groupsOf(list) {
    if (!prefs.group) return [{ genre: null, list }];
    return genreOrder().map((g) => ({ genre: g, list: list.filter((l) => l.genre === g) })).filter((x) => x.list.length);
  }
  const groupMeta = (all) => t(all.length === 1 ? 'library.group_meta_one' : 'library.group_meta', { n: all.length, dur: fmtTotal(all.reduce((a, b) => a + (b.duration || 0), 0)) });
  function emptyHtml() {
    if (!items.length) {
      const bars = Array.from({ length: 28 }, (_, i) => `<i style="--h:${Math.round((Math.abs(Math.sin(i * 0.55 + 1)) * 0.75 + 0.2) * 100)}%;--i:${i}"></i>`).join('');
      return `<div class="empty lib-empty"><div class="lib-eq" aria-hidden="true">${bars}</div>
        <h4>${t('library.empty_title')}</h4><p>${t('library.empty_text')}</p>
        <div class="lib-empty-actions"><button class="btn primary" data-go="discover">${I.search}${t('library.empty_discover')}</button><button class="btn ghost" data-go="watchlist">${I.eye}${t('library.empty_watchlist')}</button></div></div>`;
    }
    return `<div class="empty">${I.library}<h4>${t('library.none_title')}</h4><p>${t('library.none_text')}</p>
      <button class="btn" data-clear>${I.x}${t('library.clear')}</button></div>`;
  }
  function render(animate) {
    const body = $('#lib-body', el);
    const all = filtered();
    const shown = all.slice(0, limit);
    const rest = all.length - shown.length;
    if (moreObserver) moreObserver.disconnect();
    el.classList.toggle('lib-none', !items.length);
    $('#lib-top', el).hidden = !items.length;
    $('#lib-tools', el).hidden = !items.length;

    if (!all.length) {
      body.innerHTML = loaded ? emptyHtml() : '';
    } else if (prefs.view === 'grid') {
      body.innerHTML = groupsOf(shown).map((g) => {
        const full = g.genre ? all.filter((l) => l.genre === g.genre) : null;
        return `${g.genre ? `<div class="section-label lib-group" style="--c:${HC.genres.color(g.genre)}"><span class="dot"></span>${esc(g.genre)}<span class="mono">${groupMeta(full)}</span></div>` : ''}
          <div class="grid lib-grid">${g.list.map(card).join('')}</div>`;
      }).join('');
    } else {
      body.innerHTML = `<table class="lib-table">
        <thead><tr><th>${t('library.col_title')}</th><th class="c-ch">${t('library.col_channel')}</th><th class="c-genre">${t('library.col_genre')}</th>
          <th class="c-year">${t('library.col_year')}</th><th class="num c-dur">${t('library.col_duration')}</th><th class="num c-size">${t('library.col_size')}</th>
          <th class="c-loaded lib-loaded">${t('library.col_loaded')}</th><th class="c-act"></th></tr></thead>
        <tbody>${groupsOf(shown).map((g) => {
          const full = g.genre ? all.filter((l) => l.genre === g.genre) : null;
          return `${g.genre ? `<tr class="grp" style="--c:${HC.genres.color(g.genre)}"><td colspan="8"><span class="dot"></span>${esc(g.genre)}<span class="mono">${groupMeta(full)}</span></td></tr>` : ''}${g.list.map(row).join('')}`;
        }).join('')}</tbody></table>`;
    }
    if (rest > 0) {
      body.insertAdjacentHTML('beforeend', `<div class="lib-more"><button class="btn ghost" data-more>${I.down}${t('library.more', { n: Math.min(PAGE, rest) })}</button></div>`);
      if (moreObserver) moreObserver.observe($('.lib-more', body));
    }
    $('#lib-sub', el).textContent = !items.length ? '' : all.length !== items.length
      ? t('library.sub_shown', { n: util.fmtNum(all.length), total: util.fmtNum(items.length) })
      : t(items.length === 1 ? 'library.sub_one' : 'library.sub', { n: util.fmtNum(items.length) });
    $('#lib-clear', el).hidden = !filtersActive();
    if (animate) $$(prefs.view === 'grid' ? '.lib-grid' : 'tbody', body).forEach((c) => fx.stagger(c));
  }

  /* ---------- Kennzahlen ---------- */
  function renderStats(restart) {
    const n = items.length;
    const sec = items.reduce((a, b) => a + (b.duration || 0), 0);
    const mb = items.reduce((a, b) => a + (b.missing ? 0 : b.size_mb || 0), 0);
    const inGb = mb >= 1024, inKb = mb > 0 && mb < 1;
    const counters = [
      ['#ls-count', n, (v) => util.fmtNum(v)],
      ['#ls-dur', sec / 3600, (v) => v.toFixed(1)],
      ['#ls-size', inGb ? mb / 1024 : inKb ? mb * 1024 : mb, (v) => (inGb ? v.toFixed(1) : String(Math.round(v)))],
    ];
    counters.forEach(([sel, to, fmt]) => {
      const node = $(sel, el);
      if (restart) node._n = 0;
      fx.count(node, to, { dur: 700, fmt });
    });
    $('#ls-size-unit', el).textContent = t(inGb ? 'library.unit_gb' : inKb ? 'library.unit_kb' : 'library.unit_mb');

    const active = $('#lib-genre', el).value;
    const per = genreOrder().map((g) => ({ g, n: items.filter((l) => l.genre === g).length })).filter((x) => x.n);
    const bar = $('#ls-bar', el), list = $('#ls-genres', el);
    const sig = per.map((x) => `${x.g}:${x.n}:${HC.genres.color(x.g)}`).join('|');
    if (bar._sig !== sig) {
      bar._sig = sig;
      bar.innerHTML = per.map((x) => `<i style="flex-grow:${x.n};background:${HC.genres.color(x.g)}" title="${esc(x.g)}: ${x.n}"></i>`).join('');
      list.innerHTML = per.map((x) => `<button type="button" class="gstat" data-genre="${esc(x.g)}" title="${esc(x.g)}"><span class="dot" style="background:${HC.genres.color(x.g)}"></span><span class="n">${esc(x.g)}</span><b data-n="${x.n}">0</b></button>`).join('');
      restart = true;
    }
    $$('.gstat', list).forEach((b) => {
      const num = $('b', b);
      if (restart) num._n = 0;
      fx.count(num, +num.dataset.n, { dur: 700 });
      b.classList.toggle('on', b.dataset.genre === active);
      b.setAttribute('aria-pressed', b.dataset.genre === active);
    });
    if (restart) fx.pop(bar, 'grow');

    const miss = items.filter((l) => l.missing).length;
    const chip = $('#lib-missing', el);
    if (!miss) onlyMissing = false;
    chip.hidden = !miss;
    chip.classList.toggle('on', onlyMissing);
    chip.setAttribute('aria-pressed', onlyMissing);
    $('span', chip).textContent = t(miss === 1 ? 'library.missing_chip_one' : 'library.missing_chip', { n: miss });
  }

  function fillSelects() {
    const keep = (sel, html) => { const v = sel.value; sel.innerHTML = html; sel.value = v; if (sel.selectedIndex < 0) sel.value = ''; };
    const opts = (all, list) => `<option value="">${t(all)}</option>` + list.map((x) => `<option>${esc(x)}</option>`).join('');
    keep($('#lib-genre', el), opts('library.all_genres', genreOrder()));
    keep($('#lib-channel', el), opts('library.all_channels', [...new Set(items.map((l) => l.artist).filter(Boolean))].sort(byText)));
    keep($('#lib-year', el), opts('library.all_years', [...new Set(items.map(year).filter(Boolean))].sort().reverse()));
  }
  function paintControls() {
    $$('#lib-view button', el).forEach((b) => { const on = b.dataset.v === prefs.view; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $('#lib-sort', el).value = prefs.sort;
    $('#lib-group', el).checked = prefs.group;
  }
  /** Filter geändert: von vorn zeichnen. */
  function refilter(animate) {
    limit = PAGE;
    renderStats(false);
    render(animate);
    $('#lib-scroll', el).scrollTop = 0;
  }
  function clearFilters() {
    $('#lib-q', el).value = '';
    ['#lib-genre', '#lib-channel', '#lib-year'].forEach((s) => { $(s, el).value = ''; });
    onlyMissing = false;
    refilter(true);
  }

  /** Banner «Zielordner nicht erreichbar» (Einträge darunter haben unknown statt missing). */
  function paintBanner() {
    const box = $('#lib-banner', el);
    box.hidden = !targetDown;
    box.innerHTML = targetDown ? ui.notice('warn', `<b>${esc(t('library.target_down', { path: targetDown }))}</b><br>${esc(t('library.target_down_hint'))}`) : '';
  }
  async function refresh(animate, flashId) {
    const list = await HC.bridge.safe('get_library');
    if (list) { items = list; loaded = true; }
    const st = list && items.some((l) => l.unknown) ? await HC.bridge.safe('get_library_status') : null;
    targetDown = st && st.target_ok === false ? st.target : null;
    paintBanner();
    fillSelects();
    renderStats(!!animate);
    render(animate);
    if (flashId) fx.flash(nodeOf(flashId));
  }

  /* ---------- Aktionen ---------- */
  const fail = (r) => { if (r && !r.ok) ui.toast(r.error || t('err.generic'), 'err'); };
  async function openFolder(l) {
    const r = await HC.bridge.safe('open_folder', l.id);
    if (r && r.ok) ui.toast(t('toast.folder_opening'), 'info', 1600);
    else fail(r);
  }
  async function retag(l) {
    if (busy.has(l.id) || l.missing || l.unknown) return;
    busy.add(l.id);
    repaint(l);
    const r = await HC.bridge.safe('retag', l.id);
    busy.delete(l.id);
    if (r && r.ok) {
      /* Das Ablage-Muster kann die Datei verschieben: die Antwort nennt dann den neuen Pfad. */
      const path = r.path || r.file_path || '';
      const moved = r.moved != null ? !!r.moved : !!path && path !== l.file_path;
      if (path) l.file_path = path;
      if (r.genre && r.genre !== l.genre) { l.genre = r.genre; fillSelects(); $('#ls-bar', el)._sig = null; renderStats(false); }
      if (typeof r.cue === 'boolean') l.has_cue = r.cue;
      repaint(l, true);
      if (moved) ui.toast(t('toast.retagged_moved', { title: l.title, path: shortDir(path) }), 'info', 7000);
      else ui.toast(t('toast.retagged', { title: l.title }));
    } else {
      repaint(l);
      fail(r);
      if (r) refresh(); // z.B. Datei inzwischen verschwunden -> Zustand «Datei fehlt» nachladen
    }
  }
  /** Eintrag aus der Liste nehmen (nach erfolgreichem Backend-Aufruf). */
  function dropItem(l, toastKey) {
    ui.toast(t(toastKey, { title: l.title }), 'warn');
    fx.leave(nodeOf(l.id), () => {
      items = items.filter((x) => x.id !== l.id);
      fillSelects();
      renderStats(false);
      render();
    });
  }
  async function remove(l) {
    if (l.unknown) return; // Zielordner nicht erreichbar: nichts entfernen
    const key = l.missing ? 'remove_mix' : 'del_mix';
    if (l.missing || HC.settings.values.general.confirm_delete) {
      const meta = l.missing ? '' : `<div class="pathmeta">${esc(t('dlg.del_mix.meta', { dur: util.fmtDur(l.duration), size: fmtSize(l.size_mb) }))}</div>`;
      const yes = await ui.modal({
        title: t(`dlg.${key}.title`), okLabel: t(`dlg.${key}.ok`), danger: true, kind: 'del',
        body: `<p>${esc(t(`dlg.${key}.text`, { title: l.title }))}</p><div class="pathbox${l.missing ? ' gone' : ''}">${esc(l.file_path)}</div>${meta}${ui.notice('warn', t(`dlg.${key}.warn`))}`,
      });
      if (!yes) return;
    }
    /* Fehlt die Datei, wird nur der Eintrag entfernt (delete_file = false): es gibt nichts zu löschen. */
    const r = await HC.bridge.safe('delete_library_item', l.id, !l.missing);
    if (r && !r.ok && r.outside) return removeEntryOnly(l, r);
    if (r && !r.ok && r.unreachable) { fail(r); refresh(); return; }
    if (!r || !r.ok) return fail(r);
    dropItem(l, l.missing ? 'toast.removed' : 'toast.deleted');
  }
  /** Datei liegt ausserhalb des (geänderten) Zielordners: Löschen verweigert, Eintrag lässt sich trotzdem entfernen. */
  async function removeEntryOnly(l, refused) {
    const yes = await ui.modal({
      title: t('dlg.outside_mix.title'), okLabel: t('dlg.outside_mix.ok'), danger: true, kind: 'del',
      body: `<p>${esc(t('dlg.outside_mix.text', { title: l.title }))}</p><div class="pathbox">${esc(l.file_path)}</div>${ui.notice('warn', t('dlg.outside_mix.warn'))}<div class="pathmeta">${esc(refused.error || '')}</div>`,
    });
    if (!yes) return;
    const r = await HC.bridge.safe('delete_library_item', l.id, false);
    if (!r || !r.ok) return fail(r);
    dropItem(l, 'toast.removed');
  }

  function init(root) {
    el = root;
    loadPrefs();
    const sel = (id, label, w) => `<select class="select" id="${id}" aria-label="${esc(t(label))}" title="${esc(t(label))}" style="width:${w}px"></select>`;
    el.innerHTML = `
      <div class="view-head"><h2 class="glitch" data-text="${t('library.title')}">${t('library.title')}</h2><span class="sub" id="lib-sub"></span>
        <div class="actions" id="lib-tools">
          <div class="search-wrap lib-search">${I.search}<input class="input" id="lib-q" placeholder="${esc(t('library.search'))}" spellcheck="false" autocomplete="off"></div>
          <div class="seg icon" id="lib-view">
            <button type="button" data-v="list" title="${esc(t('library.view_list'))}" aria-label="${esc(t('library.view_list'))}">${I.list}</button>
            <button type="button" data-v="grid" title="${esc(t('library.view_grid'))}" aria-label="${esc(t('library.view_grid'))}">${I.grid}</button>
          </div>
        </div></div>
      <div id="lib-banner" hidden></div>
      <div class="lib-top" id="lib-top" hidden>
        <div class="lib-stats">
          <div class="stat"><div class="k">${t('library.stat_count')}</div><div class="v"><span id="ls-count">0</span></div></div>
          <div class="stat"><div class="k">${t('library.stat_duration')}</div><div class="v"><span id="ls-dur">0</span> <small>${t('library.unit_h')}</small></div></div>
          <div class="stat"><div class="k">${t('library.stat_size')}</div><div class="v"><span id="ls-size">0</span> <small id="ls-size-unit">${t('library.unit_gb')}</small></div></div>
          <div class="stat genres"><div class="k">${t('library.stat_genres')}</div><div class="gbar" id="ls-bar"></div><div class="glist" id="ls-genres"></div></div>
        </div>
        <div class="lib-bar">
          ${sel('lib-genre', 'library.f_genre', 148)}${sel('lib-channel', 'library.f_channel', 190)}${sel('lib-year', 'library.f_year', 116)}
          <span class="bar-sep"></span>
          <select class="select" id="lib-sort" aria-label="${esc(t('library.f_sort'))}" title="${esc(t('library.f_sort'))}" style="width:170px">${SORTS.map((s) => `<option value="${s}">${t('library.sort_' + s)}</option>`).join('')}</select>
          <label class="check" title="${esc(t('library.group_title'))}"><input type="checkbox" id="lib-group">${t('library.group')}</label>
          <span class="spacer"></span>
          <button type="button" class="linkbtn" id="lib-clear" hidden>${t('library.clear')}</button>
          <button type="button" class="chip warnchip" id="lib-missing" title="${esc(t('library.missing_chip_title'))}" hidden>${I.warn}<span></span></button>
        </div>
      </div>
      <div class="scroll" id="lib-scroll"><div id="lib-body"></div></div>`;
    paintControls();

    if (window.IntersectionObserver) {
      moreObserver = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting) && HC.app.current() === 'library') { limit += PAGE; render(); }
      }, { root: $('#lib-scroll', el), rootMargin: '300px' });
    }

    $('#lib-q', el).addEventListener('input', util.debounce(() => refilter(), 120));
    $('#lib-q', el).addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target.value) { e.target.value = ''; refilter(); } });
    ['#lib-genre', '#lib-channel', '#lib-year'].forEach((s) => $(s, el).addEventListener('change', () => refilter(true)));
    $('#lib-sort', el).addEventListener('change', (e) => { prefs.sort = e.target.value; savePrefs(); refilter(true); });
    $('#lib-group', el).addEventListener('change', (e) => { prefs.group = e.target.checked; savePrefs(); refilter(true); });
    $('#lib-view', el).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b || b.dataset.v === prefs.view) return;
      prefs.view = b.dataset.v;
      savePrefs();
      paintControls();
      limit = PAGE;
      render(true);
    });
    $('#lib-missing', el).addEventListener('click', () => { onlyMissing = !onlyMissing; refilter(true); });
    $('#lib-clear', el).addEventListener('click', clearFilters);
    $('#ls-genres', el).addEventListener('click', (e) => {
      const b = e.target.closest('.gstat');
      if (!b) return;
      const s = $('#lib-genre', el);
      s.value = s.value === b.dataset.genre ? '' : b.dataset.genre;
      refilter(true);
    });
    $('#lib-body', el).addEventListener('click', (e) => {
      if (e.target.closest('[data-more]')) { limit += PAGE; render(); return; }
      if (e.target.closest('[data-clear]')) { clearFilters(); return; }
      const go = e.target.closest('[data-go]');
      if (go) { HC.app.go(go.dataset.go); return; }
      const b = e.target.closest('[data-act]'), node = e.target.closest('[data-id]');
      if (!b || !node || b.disabled) return;
      const l = items.find((x) => x.id === node.dataset.id);
      if (!l) return;
      if (b.dataset.act === 'folder') openFolder(l);
      else if (b.dataset.act === 'retag') retag(l);
      else if (b.dataset.act === 'del') remove(l);
    });
    HC.bridge.on('done', (d) => { if (HC.app.current() === 'library') refresh(false, d.id); });
    HC.bridge.on('settings_changed', () => { if (!loaded) return; fillSelects(); $('#ls-bar', el)._sig = null; renderStats(false); render(); });
  }

  HC.views.library = {
    init,
    show: (arg, changed) => refresh(changed),
    reset() { items = []; loaded = false; targetDown = null; limit = PAGE; onlyMissing = false; busy.clear(); },
  };
})();
