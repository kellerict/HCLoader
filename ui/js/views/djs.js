/* =====================================================================
   views/djs.js – DJ-Seiten (v0.8.0): Unteransicht der Bibliothek (HC.djs, #library/djs, #library/dj-<key>)
   Liste: Suche (Name/Alias), Sortierung Sets · Zuletzt · Name, Ausgeblendete, «DJ/Act hinzufügen».
   Seite eines DJs: Initialen-Badge (kein Foto), Kennzahlen (Sets, Stunden, Festivals, Jahre), Aliasse (✕ = abtrennen),
   Sets gruppiert nach Festival und Jahr (b2b mit Partnern), meistgespielte Tracks (aus den Tracklisten),
   Knöpfe: Alle abspielen (Warteschlange im Player), M3U exportieren, Zur Watchlist (Bestätigung, dann save_source),
   In Entdecken suchen; Menü: Bearbeiten, Zusammenführen, Ausblenden.
   Wer ein Set gespielt hat, leitet das Backend offline ab (core/artists.py). Namen sind fremde Daten: alles via esc().
   Vertrag: docs/bridge-api.md «DJ pages, playlist export».
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const SORTS = ['sets', 'recent', 'name'];
  const STORE_KEY = 'hc.djs';

  let el = null;
  let hooks = {};
  let open = false;
  let list = null; // get_artists().artists
  let hiddenCount = 0;
  let page = null; // get_artist()-Antwort der offenen DJ-Seite
  let seq = 0;
  const prefs = { sort: 'sets', hidden: false, q: '' };

  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    if (SORTS.includes(p.sort)) prefs.sort = p.sort;
  } catch (e) { /* kein Speicher */ }
  const savePrefs = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify({ sort: prefs.sort })); } catch (e) { /* egal */ } };

  /* ---------- Helfer ---------- */
  const fail = (r) => { if (r && !r.ok) ui.toast(r.error || t('err.generic'), 'err'); };
  const hours = (sec) => util.fmtDec((sec || 0) / 3600, 1, true);
  const nSets = (n) => t('tracks.n_sets', { n: util.fmtNum(n), count: n });
  const years = (ys) => (!ys || !ys.length ? '–' : ys.length === 1 ? String(ys[0]) : `${ys[0]}–${ys[ys.length - 1]}`);
  /** Ruhige Farbe pro DJ (Hash des Schlüssels -> Farbton), passend zum dunklen Thema. */
  function hue(key) {
    let h = 0;
    for (const c of String(key)) h = (h * 31 + c.codePointAt(0)) % 360;
    return h;
  }
  const badge = (a, cls) => `<span class="dj-badge ${cls || ''}" style="--h:${hue(a.key)}" aria-hidden="true">${esc(a.initials || '?')}</span>`;
  const playerMode = () => { const pl = HC.settings.values.player; return pl && pl.mode === 'external' ? 'external' : 'internal'; };
  const route = (key) => { try { history.replaceState(null, '', key ? `#library/dj-${encodeURIComponent(key)}` : '#library/djs'); } catch (e) { /* file:// */ } };

  /* ---------- Gerüst ---------- */
  function shell() {
    el.innerHTML = `
      <div class="view-head co-head dj-head" id="dj-head"></div>
      <div class="dj-bar" id="dj-bar"></div>
      <div class="scroll" id="dj-scroll"><div id="dj-body"></div></div>`;
  }

  /* ---------- Liste ---------- */
  function paintListHead() {
    $('#dj-head', el).innerHTML = `
      <button type="button" class="iconbtn co-back" data-dj="back" title="${esc(t('djs.back_library'))}" aria-label="${esc(t('djs.back_library'))}">${I.left}</button>
      <h2 class="glitch" data-text="${esc(t('djs.title'))}">${esc(t('djs.title'))}</h2><span class="sub" id="dj-sub">${esc(t('djs.sub'))}</span>
      <div class="actions"><button type="button" class="btn ghost" data-dj="add">${I.plus}${esc(t('djs.add'))}</button></div>`;
    $('#dj-bar', el).innerHTML = `
      <div class="search-wrap dj-search">${I.search}<input class="input" id="dj-q" placeholder="${esc(t('djs.search'))}" aria-label="${esc(t('djs.search'))}" spellcheck="false" autocomplete="off" maxlength="80"></div>
      <div class="bar-group"><span class="bar-lbl" id="dj-sort-l">${esc(t('djs.sort'))}</span>
        <div class="seg" id="dj-sort" role="radiogroup" aria-labelledby="dj-sort-l">${SORTS.map((s) => `<button type="button" role="radio" data-sort="${s}">${esc(t('djs.sort_' + s))}</button>`).join('')}</div></div>
      <span class="spacer"></span>
      <button type="button" class="chip" id="dj-hidden" hidden>${I.eye}<span></span></button>`;
    const q = $('#dj-q', el);
    q.value = prefs.q;
    q.addEventListener('input', util.debounce(() => { prefs.q = q.value.trim(); loadList(); }, 140));
    q.addEventListener('keydown', (e) => { if (e.key === 'Escape' && q.value) { e.stopPropagation(); q.value = ''; prefs.q = ''; loadList(); } });
    paintBar();
  }
  function paintBar() {
    $$('#dj-sort [data-sort]', el).forEach((b) => { const on = b.dataset.sort === prefs.sort; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    const chip = $('#dj-hidden', el);
    if (!chip) return;
    chip.hidden = !hiddenCount && !prefs.hidden;
    chip.classList.toggle('on', prefs.hidden);
    chip.setAttribute('aria-pressed', prefs.hidden);
    $('span', chip).textContent = t('djs.hidden_chip', { n: util.fmtNum(hiddenCount) });
  }
  async function loadList(animate) {
    const my = ++seq;
    const r = await HC.bridge.safe('get_artists', { search: prefs.q, sort: prefs.sort, hidden: prefs.hidden });
    if (my !== seq || !open || page) return;
    if (!r) return;
    if (!r.ok) { fail(r); return; }
    list = r.artists;
    hiddenCount = r.hidden || 0;
    if (!hiddenCount && prefs.hidden) prefs.hidden = false;
    paintBar();
    paintList(animate);
  }
  function card(a) {
    const meta = [nSets(a.sets), `${hours(a.seconds)} ${t('library.unit_h')}`, years(a.years)];
    return `<button type="button" class="dj-card" data-key="${esc(a.key)}" title="${esc(a.name)}">
      ${badge(a)}<span class="dj-c-t"><b>${esc(a.name)}</b>
        <small>${meta.map((x) => `<span>${esc(x)}</span>`).join('<span class="sep">·</span>')}</small>
        <span class="dj-c-tags">${a.festivals ? `<span class="dj-tag">${I.flag}${esc(t('djs.n_festivals', { n: util.fmtNum(a.festivals) }))}</span>` : ''}${a.b2b ? `<span class="dj-tag b2b">${esc(t('djs.n_b2b', { n: util.fmtNum(a.b2b) }))}</span>` : ''}${a.aliases.length ? `<span class="dj-tag alias" title="${esc(a.aliases.join(', '))}">${esc(t('djs.aka', { names: a.aliases.slice(0, 2).join(', ') }))}</span>` : ''}</span></span>
      ${a.hidden ? `<span class="dj-unhide" data-unhide="${esc(a.key)}" role="button" tabindex="0" title="${esc(t('djs.unhide'))}">${I.eye}</span>` : ''}</button>`;
  }
  function paintList(animate) {
    const body = $('#dj-body', el);
    if (!list) { body.innerHTML = ''; return; }
    const total = list.length;
    $('#dj-sub', el).textContent = total ? t('djs.sub_n', { n: util.fmtNum(total), count: total }) : t('djs.sub');
    if (!total) {
      body.innerHTML = prefs.q
        ? `<div class="empty">${I.search}<h4>${esc(t('djs.none_title'))}</h4><p>${esc(t('djs.none_text'))}</p></div>`
        : `<div class="empty dj-empty">${I.dj}<h4>${esc(t('djs.empty_title'))}</h4><p>${esc(t('djs.empty_text'))}</p><button class="btn primary" data-dj="discover">${I.search}${esc(t('library.empty_discover'))}</button></div>`;
      return;
    }
    body.innerHTML = `<div class="dj-grid">${list.map(card).join('')}</div>`;
    if (animate) fx.stagger($('.dj-grid', body));
  }

  /* ---------- DJ-Seite ---------- */
  async function openArtist(key, animate) {
    const my = ++seq;
    const r = await HC.bridge.safe('get_artist', key);
    if (my !== seq || !open) return;
    if (!r) return;
    if (!r.ok) { fail(r); page = null; route(null); paintListHead(); loadList(); return; }
    page = r;
    HC.store.put(r.sets);
    route(r.artist.key);
    paintPage(animate !== false);
    $('#dj-scroll', el).scrollTop = 0;
  }
  function stat(k, v, unit) {
    return `<div class="stat"><div class="k">${esc(k)}</div><div class="v">${esc(v)}${unit ? ` <small>${esc(unit)}</small>` : ''}</div></div>`;
  }
  /** Gruppen: pro Festival (meiste Sets zuerst), darin nach Jahr absteigend; danach übrige Sets nach Jahr. */
  function groups(sets) {
    const fest = new Map(), other = new Map();
    sets.forEach((s) => {
      const f = s.festival;
      const y = (f && f.event_year) || +String(s.upload_date || '').slice(0, 4) || 0;
      if (f && f.kind === 'festival') {
        if (!fest.has(f.series_id)) fest.set(f.series_id, { label: f.series, list: [] });
        fest.get(f.series_id).list.push(Object.assign({ _y: y }, s));
      } else {
        if (!other.has(y)) other.set(y, { label: y ? String(y) : t('library.group_unknown'), list: [] });
        other.get(y).list.push(Object.assign({ _y: y }, s));
      }
    });
    const out = [...fest.values()].sort((a, b) => b.list.length - a.list.length || a.label.localeCompare(b.label));
    out.forEach((g) => g.list.sort((a, b) => b._y - a._y));
    const rest = [...other.entries()].sort((a, b) => b[0] - a[0]).map(([, g]) => Object.assign(g, { other: true }));
    return out.concat(rest);
  }
  function setRow(s) {
    const f = s.festival;
    const where = f ? [f.kind === 'festival' ? String(f.event_year || '') : f.edition, f.stage, f.variant].filter(Boolean).join(' · ') : String(s._y || '');
    const role = s.role === 'b2b' ? `<span class="dj-role" title="${esc(t('djs.b2b_title'))}">${esc(t('djs.b2b_with', { names: s.with.join(', ') || '?' }))}</span>` : '';
    const now = HC.player.state(), cur = now.id === s.id;
    return `<li class="dj-set${s.missing ? ' missing' : ''}${cur ? ' now' : ''}" data-id="${esc(s.id)}">
      <span class="dj-when mono">${esc(where || '–')}</span>
      <span class="dj-s-t"><b title="${esc(s.title)}">${esc(s.title)}</b><small>${ui.pbadge(s)}${role}<span class="mono">${esc(util.fmtDur(s.duration))}</span>${s.missing ? `<span class="miss-tag">${I.warn}${esc(t('library.missing'))}</span>` : ''}</small></span>
      <button type="button" class="iconbtn play${cur && now.playing ? ' on' : ''}" data-play="${esc(s.id)}" title="${esc(t(s.missing ? 'library.play_missing' : 'library.play'))}" aria-label="${esc(t('library.play'))}"${s.missing ? ' disabled' : ''}>${cur && now.playing ? I.pause : I.play}</button></li>`;
  }
  function paintPage(animate) {
    const a = page.artist, sets = page.sets;
    const playable = sets.filter((s) => !s.missing).length;
    $('#dj-head', el).innerHTML = `
      <button type="button" class="iconbtn co-back" data-dj="list" title="${esc(t('djs.back'))}" aria-label="${esc(t('djs.back'))}">${I.left}</button>
      ${badge(a, 'lg')}
      <div class="dj-title"><h2 title="${esc(a.name)}">${esc(a.name)}</h2>
        <div class="dj-aliases">${a.aliases.length ? `<span class="dj-aka">${esc(t('djs.aliases'))}</span>${a.aliases.map((x) => `<span class="dj-alias">${esc(x)}<button type="button" data-split="${esc(x)}" title="${esc(t('djs.split_title', { alias: x }))}" aria-label="${esc(t('djs.split_title', { alias: x }))}">×</button></span>`).join('')}` : `<span class="dj-aka">${esc(t('djs.no_aliases'))}</span>`}</div></div>
      <div class="actions dj-acts">
        <button type="button" class="btn primary" data-dj="playall"${playable ? '' : ' disabled'}>${I.play}${esc(t('djs.play_all'))}</button>
        <button type="button" class="btn ghost" data-dj="export">${I.playlist}${esc(t('djs.export'))}</button>
        <button type="button" class="btn ghost" data-dj="watch">${I.eye}${esc(t('djs.watch'))}</button>
        <button type="button" class="iconbtn" data-dj="more" title="${esc(t('card.more'))}" aria-label="${esc(t('card.more'))}" aria-haspopup="menu">${I.more}</button>
      </div>`;
    $('#dj-bar', el).innerHTML = `<div class="lib-stats dj-stats">
        ${stat(t('djs.stat_sets'), util.fmtNum(a.sets))}${stat(t('djs.stat_hours'), hours(a.seconds), t('library.unit_h'))}
        ${stat(t('djs.stat_festivals'), util.fmtNum(a.festivals))}${stat(t('djs.stat_years'), years(a.years))}
        ${a.b2b ? stat(t('djs.stat_b2b'), util.fmtNum(a.b2b)) : ''}</div>
        <button type="button" class="linkbtn dj-disc" data-dj="discover-name">${I.search}${esc(t('djs.discover'))}</button>`;
    const gs = groups(sets);
    const tracks = page.tracks || [];
    $('#dj-body', el).innerHTML = `<div class="dj-page">
      <div class="dj-sets">${gs.map((g) => `<section class="dj-group${g.other ? ' other' : ''}">
          <div class="section-label">${g.other ? I.clock : I.flag}<span>${esc(g.other ? t('djs.other_sets', { year: g.label }) : g.label)}</span><span class="mono">${esc(nSets(g.list.length))}</span></div>
          <ul>${g.list.map(setRow).join('')}</ul></section>`).join('')}</div>
      <aside class="dj-side">${tracks.length ? `<div class="section-label">${I.bolt}<span>${esc(t('djs.tracks'))}</span></div>
        <ol class="dj-tracks">${tracks.map((x, i) => `<li><span class="tr-rank">${util.pad(i + 1)}</span><span class="dj-tk"><span class="tk-artist">${esc(x.artist)}</span><span class="tk-dash"> – </span><span class="tk-title">${esc(x.title)}</span>${x.version ? ` <span class="tk-ver">(${esc(x.version)})</span>` : ''}</span><span class="mono">${esc(t('djs.track_sets', { n: util.fmtNum(x.sets) }))}</span></li>`).join('')}</ol>`
        : `<div class="section-label">${I.bolt}<span>${esc(t('djs.tracks'))}</span></div><p class="tr-hint">${esc(t('djs.tracks_none'))}</p>`}</aside></div>`;
    if (animate) fx.stagger($('.dj-sets', el));
  }

  /* ---------- Aktionen ---------- */
  function playAll() {
    const sets = page.sets.filter((s) => !s.missing);
    if (!sets.length) return;
    if (playerMode() === 'external') { ui.toast(t('djs.play_all_external'), 'info', 5000); return; }
    HC.player.playAll(sets, page.artist.name);
  }
  async function playOne(id) {
    const s = page && page.sets.find((x) => x.id === id);
    if (!s || s.missing) return;
    if (playerMode() === 'internal' || HC.player.state().id === id) { HC.player.play(s); return; }
    const r = await HC.bridge.safe('play_external', id);
    if (r && r.ok) ui.toast(t('player.external'), 'info', 1800);
    else fail(r);
  }
  async function watch() {
    const a = page.artist;
    const r = await HC.bridge.safe('get_artist_watch', a.key);
    if (!r) return;
    if (!r.ok) { fail(r); return; }
    if (r.existing) { ui.toast(t('djs.watch_exists', { name: r.existing.name }), 'info', 5000); return; }
    const src = r.source, isChannel = src.type === 'channel';
    const yes = await ui.modal({
      title: t('djs.watch_title', { name: a.name }),
      okLabel: t('djs.watch_ok'),
      body: `<p>${esc(t(isChannel ? 'djs.watch_channel' : 'djs.watch_search', { name: a.name }))}</p>
        <div class="pathbox dj-target">${esc(src.url_or_query)}</div>${ui.notice('info', esc(t('djs.watch_note')))}`,
    });
    if (!yes) return;
    const s = await HC.bridge.safe('save_source', Object.assign({ enabled: true, auto_download: false, max_entries: null, default_genre: null }, src));
    if (s && s.ok) ui.toast(t('djs.watch_added', { name: s.source.name }), 'ok', 5200);
    else if (s) ui.toast((s.errors && Object.values(s.errors)[0]) || s.error || t('err.generic'), 'err');
  }
  function discover(q) {
    HC.app.go('discover');
    if (HC.views.discover.prefill) HC.views.discover.prefill(q);
  }
  async function split(alias) {
    const a = page.artist;
    const yes = await ui.confirm(t('djs.split_q_title'), t('djs.split_q', { alias, name: a.name }), { okLabel: t('djs.split_ok') });
    if (!yes) return;
    const r = await HC.bridge.safe('split_artist', a.key, alias);
    if (!r || !r.ok) { fail(r); return; }
    ui.toast(t('djs.split_done', { alias }), 'ok');
    openArtist(a.key, false);
  }

  /** Bearbeiten (Name, Aliasse, eigener Kanal) bzw. neuer DJ/Act (a = null). */
  async function edit(a) {
    let chips = null;
    const yes = await ui.modal({
      title: a ? t('djs.edit_title', { name: a.name }) : t('djs.add_title'),
      okLabel: t('common.save'),
      kind: 'dj-modal',
      body: `<div class="pl-dlg"><label class="pl-f"><span>${esc(t('djs.f_name'))}</span><input class="input" id="dj-f-name" maxlength="80" value="${esc(a ? a.name : '')}" spellcheck="false" autocomplete="off"></label>
        <div class="pl-f"><span>${esc(t('djs.f_aliases'))}</span><div id="dj-f-aliases"></div><small class="pl-help">${esc(t(a ? 'djs.f_aliases_help' : 'djs.f_act_help'))}</small></div>
        <label class="pl-f"><span>${esc(t('djs.f_channel'))}</span><input class="input mono" id="dj-f-channel" value="${esc((a && a.channel_url) || '')}" placeholder="https://www.youtube.com/@…" spellcheck="false" autocomplete="off"><small class="pl-help">${esc(t('djs.f_channel_help'))}</small></label>
        <div id="dj-f-msg" aria-live="polite"></div></div>`,
      onOpen(back) { chips = ui.chips($('#dj-f-aliases', back), { list: a ? a.aliases : [], lower: false, commaSplits: false, placeholder: t('djs.f_alias_add') }); },
      async onOk(back) {
        const data = { name: $('#dj-f-name', back).value, aliases: chips.get(), channel_url: $('#dj-f-channel', back).value.trim() };
        if (a) data.key = a.key;
        const r = await HC.bridge.safe('save_artist', data);
        if (r && r.ok) { a = Object.assign({}, a, { key: r.key }); return true; }
        $('#dj-f-msg', back).innerHTML = ui.notice('warn', esc((r && r.error) || t('err.generic')));
        return false;
      },
    });
    if (!yes) return;
    ui.toast(t('djs.saved'), 'ok');
    if (page) openArtist(a.key, false);
    else loadList();
  }
  async function merge() {
    const a = page.artist;
    const r = await HC.bridge.safe('get_artists', { sort: 'name' });
    if (!r || !r.ok) { fail(r); return; }
    const others = r.artists.filter((x) => x.key !== a.key);
    if (!others.length) { ui.toast(t('djs.merge_none'), 'info'); return; }
    let into = null;
    const yes = await ui.modal({
      title: t('djs.merge_title', { name: a.name }),
      okLabel: t('djs.merge_ok'),
      body: `<p>${esc(t('djs.merge_text', { name: a.name }))}</p>
        <label class="pl-f dj-merge-f"><span>${esc(t('djs.merge_into'))}</span><select class="select" id="dj-merge">${others.map((x) => `<option value="${esc(x.key)}">${esc(x.name)} · ${esc(nSets(x.sets))}</option>`).join('')}</select></label>`,
      onOk(back) { into = $('#dj-merge', back).value; return true; },
    });
    if (!yes || !into) return;
    const m = await HC.bridge.safe('merge_artists', [a.key], into);
    if (!m || !m.ok) { fail(m); return; }
    ui.toast(t('djs.merged', { name: a.name }), 'ok');
    openArtist(m.key, true);
  }
  async function hide(key, hidden) {
    const r = await HC.bridge.safe('hide_artist', key, hidden);
    if (!r || !r.ok) { fail(r); return; }
    ui.toast(t(hidden ? 'djs.hidden_done' : 'djs.unhidden_done'), 'info');
    if (page && hidden) backToList();
    else loadList();
  }
  function more(anchor) {
    const a = page.artist;
    ui.menu(anchor, [
      { label: t('djs.edit'), icon: I.edit, key: 'edit', onClick: () => edit(a) },
      { label: t('djs.merge'), icon: I.merge, key: 'merge', onClick: merge },
      { label: t('djs.discover'), icon: I.search, key: 'discover', onClick: () => discover(a.name) },
      'sep',
      { label: t('djs.hide'), icon: I.ban, key: 'hide', onClick: () => hide(a.key, true) },
    ]);
  }
  function backToList() {
    page = null;
    route(null);
    paintListHead();
    loadList(true);
  }

  function onClick(e) {
    const unh = e.target.closest('[data-unhide]');
    if (unh) { e.stopPropagation(); hide(unh.dataset.unhide, false); return; }
    const cardEl = e.target.closest('.dj-card[data-key]');
    if (cardEl) { openArtist(cardEl.dataset.key); return; }
    const sp = e.target.closest('[data-split]');
    if (sp) { split(sp.dataset.split); return; }
    const pl = e.target.closest('[data-play]');
    if (pl && !pl.disabled) { playOne(pl.dataset.play); return; }
    const so = e.target.closest('#dj-sort [data-sort]');
    if (so) { if (so.dataset.sort !== prefs.sort) { prefs.sort = so.dataset.sort; savePrefs(); paintBar(); loadList(true); } return; }
    if (e.target.closest('#dj-hidden')) { prefs.hidden = !prefs.hidden; paintBar(); loadList(true); return; }
    const b = e.target.closest('[data-dj]');
    if (!b || b.disabled) return;
    const act = b.dataset.dj;
    if (act === 'back') HC.app.go('library');
    else if (act === 'list') backToList();
    else if (act === 'add') edit(null);
    else if (act === 'discover') HC.app.go('discover');
    else if (act === 'playall') playAll();
    else if (act === 'export') HC.playlist.export({ kind: 'artist', key: page.artist.key }, { title: t('djs.export_title', { name: page.artist.name }) });
    else if (act === 'watch') watch();
    else if (act === 'discover-name') discover(page.artist.name);
    else if (act === 'more') more(b);
  }

  HC.djs = {
    /** root = Container in der Bibliothek; h = {opened(), closed(silent)} */
    init(root, h) {
      el = root;
      hooks = h || {};
      el.addEventListener('click', onClick);
      el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-unhide]')) { e.preventDefault(); onClick(e); } });
      HC.bridge.on('player', () => { if (open && page) $$('.dj-set', el).forEach((li) => { const s = page.sets.find((x) => x.id === li.dataset.id); if (s) { li.insertAdjacentHTML('afterend', setRow(Object.assign({ _y: +String(s.upload_date || '').slice(0, 4) }, s))); li.remove(); } }); });
      HC.bridge.on('done', () => { if (open && !page) loadList(); });
    },
    /** arg: undefined/«djs» = Liste, «dj-<key>» = Seite eines DJs. */
    open(arg) {
      const fresh = !open;
      open = true;
      el.hidden = false;
      if (hooks.opened) hooks.opened();
      if (fresh) shell();
      const m = /^dj-(.+)$/.exec(arg || '');
      if (m) { let key = m[1]; try { key = decodeURIComponent(key); } catch (e) { /* roh */ } return openArtist(key); }
      if (page && !fresh && arg !== 'djs') return Promise.resolve();
      page = null;
      paintListHead();
      return loadList(true);
    },
    /** DJ-Seite direkt öffnen (z.B. aus der Bibliothek). */
    show(key) { HC.app.go('library', `dj-${encodeURIComponent(key)}`); },
    close(silent) {
      if (!open) return;
      open = false;
      seq++;
      page = null;
      el.hidden = true;
      el.innerHTML = '';
      if (hooks.closed) hooks.closed(silent);
    },
    active: () => open,
    reset() { list = null; page = null; prefs.q = ''; prefs.hidden = false; if (el) HC.djs.close(true); },
  };
})();
