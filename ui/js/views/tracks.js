/* =====================================================================
   views/tracks.js – Tracklist-Suche (v0.6.0): Unteransicht der Bibliothek (HC.tracks, #library/tracks)
   «Welche Sets spielen Track X?»: Suchfeld (Artist/Titel) -> Sets mit Treffer und Zeitstempel. Klick auf den
   Zeitstempel spielt das Set im Mini-Player ab dieser Stelle (player.mode «external»: Standardplayer + Hinweis
   auf die Zeit). Ohne Suche: «Meistgespielt» (Top 20 nach Anzahl Sets). Pro Set: Panel «Trackliste»
   (HC.tracks.panel, auch aus dem Menü ⋯ der Bibliothek) mit klickbaren Zeitstempeln.

   Tracklisten kommen offline aus Kapiteln, Beschreibungen, ID3-Kapiteln und CUE-Dateien (core/tracklist.py).
   Einlesen: build_tracklists / Event tracklist_index (einmalig automatisch beim ersten Öffnen, danach per Knopf:
   «Neue einlesen» = nur neue/geänderte Sets, «Alle neu einlesen» = alles).
   «ID – ID» (unveröffentlicht/unbekannt) erscheint gedämpft. Titel, Artists und Labels sind fremde Daten:
   alles läuft durch esc(); Hervorhebungen werden aus escapten Teilstücken gebaut.
   Vertrag: docs/bridge-api.md «Tracklist search».
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, util, fx, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const SOURCES = ['chapters', 'description', 'id3', 'cue'];

  let el = null;
  let hooks = {};
  let open = false;
  let status = null; // get_tracklist_status
  let pass = null; // laufendes Einlesen {done, total} | null
  let top = null; // get_top_tracks().tracks
  let result = null; // search_tracks-Antwort
  let query = '';
  let seq = 0; // verwirft veraltete Suchantworten
  let autoStarted = false;

  /* ---------- Helfer ---------- */
  const fail = (r) => { if (r && !r.ok) ui.toast(r.error || t('err.generic'), 'err'); };
  const playerMode = () => { const pl = HC.settings.values.player; return pl && pl.mode === 'external' ? 'external' : 'internal'; };
  const words = (q) => util.norm(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const nTracks = (n) => t('tracks.n_tracks', { n: util.fmtNum(n), count: n });
  const nSets = (n) => t('tracks.n_sets', { n: util.fmtNum(n), count: n });

  /** Text escapen und die Suchwörter markieren (<mark>), diakritik- und gross/klein-unabhängig.
      Wie das Backend nur am Wortanfang (Präfix pro Wort), nicht mitten im Wort. */
  const WORD_CH = /[\p{L}\p{N}]/u;
  function mark(text, ws) {
    const s = String(text || '');
    if (!ws || !ws.length || !s) return esc(s);
    /* Zeichenweise falten, Positionskarte gefaltet -> Original (Länge kann sich ändern, z.B. ß -> ss). */
    const map = [];
    let f = '';
    for (let i = 0; i < s.length; i++) {
      const part = util.norm(s[i]);
      for (let j = 0; j < part.length; j++) { f += part[j]; map.push(i); }
    }
    const hit = new Array(s.length).fill(false);
    ws.forEach((w) => {
      let at = f.indexOf(w);
      while (at >= 0) {
        if (at === 0 || !WORD_CH.test(f[at - 1])) {
          for (let k = at; k < at + w.length; k++) hit[map[k]] = true;
        }
        at = f.indexOf(w, at + 1);
      }
    });
    let out = '', on = false;
    for (let i = 0; i < s.length; i++) {
      if (hit[i] !== on) { out += hit[i] ? '<mark>' : '</mark>'; on = hit[i]; }
      out += esc(s[i]);
    }
    return on ? `${out}</mark>` : out;
  }
  /** «Artist – Titel (Version)» als HTML; ID-Tracks gedämpft. */
  function trackHtml(tr, ws) {
    if (tr.is_id && (!tr.artist || tr.artist === 'ID')) return `<span class="tk-id" title="${esc(t('tracks.id_track'))}">ID – ID${tr.version ? ` <span class="tk-ver">(${esc(tr.version)})</span>` : ''}</span>`;
    const artist = tr.artist ? `<span class="tk-artist">${mark(tr.artist, ws)}</span><span class="tk-dash"> – </span>` : '';
    const title = tr.is_id ? `<span class="tk-id" title="${esc(t('tracks.id_track'))}">ID</span>` : `<span class="tk-title">${mark(tr.title, ws)}</span>`;
    const ver = tr.version ? ` <span class="tk-ver">(${mark(tr.version, ws)})</span>` : '';
    const label = tr.label ? ` <span class="tk-label">[${esc(tr.label)}]</span>` : '';
    return `${artist}${title}${ver}${label}`;
  }
  const timeBtn = (setId, tr) => (tr.start == null
    ? `<span class="tk-time none" title="${esc(t('tracks.no_time'))}">–:–</span>`
    : `<button type="button" class="tk-time" data-jump="${esc(setId)}" data-at="${+tr.start}" title="${esc(t('tracks.jump', { time: util.fmtDur(tr.start) }))}">${I.play}<span>${esc(util.fmtDur(tr.start))}</span></button>`);

  /* ---------- Abspielen ab Zeitstempel ---------- */
  /** set: {id, title, artist, genre, platform}; at: Sekunden. */
  async function jump(set, at) {
    if (playerMode() === 'internal') { HC.player.playAt(set, at); return; }
    const r = await HC.bridge.safe('play_external', set.id);
    if (r && r.ok) ui.toast(t('tracks.jump_external', { time: util.fmtDur(at) }), 'info', 6000);
    else fail(r);
  }

  /* ---------- Panel «Trackliste» ---------- */
  async function panel(item) {
    if (!item || item.id == null) return;
    const r = await HC.bridge.safe('get_tracklist', item.id);
    if (!r) return;
    if (!r.ok) { fail(r); return; }
    ui.closeMenu();
    const old = HC.$('#overlays .tl-back');
    if (old) old.remove();
    const back = document.createElement('div');
    back.className = 'modal-back tl-back';
    const src = SOURCES.includes(r.source) ? r.source : 'none';
    const rows = r.tracks.map((tr) => `<li class="tl-row${tr.is_id ? ' is-id' : ''}"><span class="tl-pos">${util.pad(tr.position)}</span>${timeBtn(item.id, tr)}<span class="tl-text">${trackHtml(tr)}</span></li>`).join('');
    back.innerHTML = `<div class="modal tl-panel" role="dialog" aria-modal="true" aria-labelledby="tl-h">
      <div class="tl-head"><div class="tl-head-t"><span class="tl-kicker">${I.list}${esc(t('tracks.tracklist'))}</span>
        <h3 id="tl-h" title="${esc(item.title)}">${esc(item.title || '')}</h3>
        <div class="tl-meta"><span>${esc(item.artist || '')}</span>${r.tracks.length ? `<span>${esc(nTracks(r.tracks.length))}</span>` : ''}<span class="tl-src src-${esc(src)}">${esc(t('tracks.panel_source', { source: t(`tracks.source_${src}`) }))}</span></div></div>
        <button type="button" class="iconbtn" data-tl="close" title="${esc(t('tracks.close'))}" aria-label="${esc(t('tracks.close'))}">${I.x}</button></div>
      <div class="tl-body">${r.tracks.length ? `<ol class="tl-list">${rows}</ol>` : `<div class="empty tl-empty">${I.list}<h4>${esc(t('tracks.panel_empty'))}</h4><p>${esc(t('tracks.panel_empty_hint'))}</p></div>`}</div>
      <div class="modal-foot"><button type="button" class="btn ghost" data-tl="close">${esc(t('tracks.close'))}</button></div></div>`;
    const prev = document.activeElement;
    const close = () => { document.removeEventListener('keydown', onKey, true); back.remove(); if (prev && prev.focus && prev.isConnected) prev.focus(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    back.addEventListener('click', (e) => {
      if (e.target.closest('[data-tl=close]')) { close(); return; }
      const b = e.target.closest('[data-jump]');
      if (b) jump(item, +b.dataset.at);
    });
    document.addEventListener('keydown', onKey, true);
    HC.$('#overlays').appendChild(back);
    const first = back.querySelector('.tk-time:not(.none)') || back.querySelector('[data-tl=close]');
    if (first) first.focus();
  }

  /* ---------- Kopf, Status, Einlesen ---------- */
  function shell() {
    el.innerHTML = `
      <div class="view-head co-head tr-head">
        <button type="button" class="iconbtn co-back" data-tr="back" title="${esc(t('tracks.back'))}" aria-label="${esc(t('tracks.back'))}">${I.left}</button>
        <h2 class="glitch" data-text="${esc(t('tracks.title'))}">${esc(t('tracks.title'))}</h2><span class="sub">${esc(t('tracks.sub'))}</span>
      </div>
      <div class="tr-top">
        <div class="search-wrap tr-search">${I.search}<input class="input" id="tr-q" placeholder="${esc(t('tracks.search'))}" aria-label="${esc(t('tracks.search'))}" spellcheck="false" autocomplete="off" maxlength="200"></div>
        <div class="tr-status" id="tr-status"></div>
      </div>
      <div class="scroll" id="tr-scroll"><div id="tr-body"></div></div>`;
  }
  function paintStatus() {
    const box = $('#tr-status', el);
    if (!box) return;
    const s = status;
    if (pass) {
      const pct = pass.total ? Math.round(((pass.done || 0) / pass.total) * 100) : 0;
      box.innerHTML = `<div class="tr-prog"><div class="progress${pass.total ? '' : ' indet'}"><div class="bar kick" style="width:${pct}%;--p:${pct}"></div></div>
        <span class="unit">${esc(t('tracks.running', { done: util.fmtNum(pass.done || 0), total: pass.total ? util.fmtNum(pass.total) : '…' }))}</span>
        <button type="button" class="btn sm danger" data-tr="cancel"${pass.cancelling ? ' disabled' : ''}>${I.x}${esc(t('common.cancel'))}</button></div>`;
      return;
    }
    if (!s) { box.innerHTML = `<span class="unit">${esc(t('common.loading'))}</span>`; return; }
    const line = s.sets ? t('tracks.status', { tracks: nTracks(s.tracks), sets: nSets(s.sets) }) : '';
    const when = `${esc(t('tracks.status_last'))} <b>${esc(s.last_pass ? util.fmtWhen(s.last_pass) : t('fmt.never'))}</b>`;
    const like = s.engine === 'like' ? `<span class="tr-like" title="${esc(t('tracks.engine_like'))}">${I.info}</span>` : '';
    box.innerHTML = `<span class="tr-line">${line ? `<b>${esc(line)}</b><span class="sep">·</span>` : ''}<span>${when}</span>${like}</span>
      ${s.last_pass
        ? `<span class="tr-acts"><button type="button" class="btn sm ghost" data-tr="scan" title="${esc(t('tracks.scan_new_title'))}"${s.total ? '' : ' disabled'}>${I.refresh}${esc(t('tracks.scan_new'))}</button><button type="button" class="iconbtn" data-tr="rescan" title="${esc(`${t('tracks.rescan')} – ${t('tracks.rescan_title')}`)}" aria-label="${esc(t('tracks.rescan'))}"${s.total ? '' : ' disabled'}>${I.retry}</button></span>`
        : `<button type="button" class="btn sm primary" data-tr="scan" title="${esc(t('tracks.scan_title'))}"${s.total ? '' : ' disabled'}>${I.list}${esc(t('tracks.scan'))}</button>`}`;
  }
  async function loadStatus() {
    const s = await HC.bridge.safe('get_tracklist_status');
    if (!s || !open) return null;
    status = s;
    if (s.running && !pass) pass = { done: 0, total: 0 };
    if (!s.running && pass && !pass.live) pass = null;
    paintStatus();
    return s;
  }
  async function scan(scope) {
    const r = await HC.bridge.safe('build_tracklists', { scope: scope || 'new' });
    if (r && r.ok) { if (!pass) pass = { done: 0, total: 0 }; }
    else fail(r);
    paintStatus();
    paintBody();
  }

  /* ---------- Inhalt ---------- */
  function emptyHtml(icon, title, text, action) {
    return `<div class="empty tr-empty">${icon}<h4>${title}</h4><p>${text}</p>${action || ''}</div>`;
  }
  function topHtml() {
    const s = status || {};
    if (!s.total) return emptyHtml(I.library, esc(t('tracks.empty_title')), esc(t('tracks.library_empty')), `<button class="btn primary" data-tr="discover">${I.search}${esc(t('library.empty_discover'))}</button>`);
    if (pass && !s.sets) return emptyHtml(I.list, esc(t('tracks.empty_title')), esc(t('tracks.empty_text')));
    if (!s.last_pass && !s.sets) return emptyHtml(I.list, esc(t('tracks.empty_title')), esc(t('tracks.empty_text')), `<button class="btn primary" data-tr="scan">${I.list}${esc(t('tracks.scan'))}</button>`);
    if (!s.sets) return emptyHtml(I.list, esc(t('tracks.empty_none_title')), esc(t('tracks.empty_none_text')));
    const list = top || [];
    const max = list.reduce((a, x) => Math.max(a, x.sets), 1);
    const rows = list.map((x, i) => `<li><button type="button" class="tr-top-row" data-find="${esc(`${x.artist} ${x.title}`)}" title="${esc(t('tracks.top_find'))}">
        <span class="tr-rank">${util.pad(i + 1)}</span><span class="tr-top-t">${trackHtml(x)}</span>
        <span class="tr-top-n"><i style="--w:${Math.round((x.sets / max) * 100)}%"></i><b>${esc(t('tracks.top_sets', { n: util.fmtNum(x.sets), count: x.sets }))}</b></span></button></li>`).join('');
    return `<div class="section-label tr-label">${I.bolt}${esc(t('tracks.top_title'))}<span class="mono">${esc(t('tracks.top_sub'))}</span></div>
      ${list.length ? `<ol class="tr-top-list">${rows}</ol>` : `<p class="tr-hint">${esc(t('tracks.top_empty'))}</p>`}`;
  }
  function resultsHtml() {
    const r = result;
    const ws = words(query);
    if (!r.sets.length) return emptyHtml(I.search, t('tracks.no_results_title', { q: esc(query) }), esc(t('tracks.no_results_text')));
    const cards = r.sets.map((s) => `<article class="tr-set" data-set="${esc(s.id)}">
        <div class="tr-set-h">${ui.thumb(s, 'mini')}</div>
          <div class="tr-set-t"><b title="${esc(s.title)}">${esc(s.title)}</b>
            <small>${ui.pbadge(s)}<span>${esc(s.artist)}</span><span class="sep">·</span><span class="mono">${esc(util.fmtDur(s.duration))}</span>${s.upload_date ? `<span class="sep">·</span><span class="mono">${esc(String(s.upload_date).slice(0, 4))}</span>` : ''}</small></div>
          <div class="tr-set-a"><button type="button" class="btn sm ghost" data-tr="panel" title="${esc(t('tracks.tracklist_title'))}">${I.list}${esc(t('tracks.tracklist'))}</button>
            <button type="button" class="iconbtn play" data-tr="play" title="${esc(t('tracks.play_set'))}" aria-label="${esc(t('tracks.play_set'))}">${I.play}</button></div></div>
        <ul class="tr-hits">${s.hits.map((tr) => `<li class="${tr.is_id ? 'is-id' : ''}">${timeBtn(s.id, tr)}<span class="tl-text">${trackHtml(tr, ws)}</span></li>`).join('')}
          ${s.more ? `<li class="tr-more"><button type="button" class="linkbtn" data-tr="panel">${esc(t('tracks.more_hits', { n: util.fmtNum(s.more), count: s.more }))}</button></li>` : ''}</ul>
      </article>`).join('');
    const head = `<div class="section-label tr-label">${I.search}${t('tracks.results', { n: util.fmtNum(r.sets.length), count: r.sets.length, q: esc(query) })}${r.truncated ? `<span class="mono">${esc(t('tracks.truncated', { n: util.fmtNum(r.sets.length) }))}</span>` : ''}</div>`;
    return `${head}<div class="tr-sets">${cards}</div>`;
  }
  function paintBody(animate) {
    const body = $('#tr-body', el);
    if (!body) return;
    body.innerHTML = query && result ? resultsHtml() : topHtml();
    if (animate) fx.stagger(body.querySelector('.tr-sets, .tr-top-list') || body);
  }
  async function loadTop() {
    const r = await HC.bridge.safe('get_top_tracks', 20);
    if (r && r.ok && open) top = r.tracks;
  }
  async function runSearch() {
    const inp = open ? $('#tr-q', el) : null;
    if (!inp) return; // Ansicht inzwischen geschlossen (verzögerte Eingabe)
    const q = inp.value.trim();
    query = q;
    const my = ++seq;
    if (!q) { result = null; paintBody(true); return; }
    const r = await HC.bridge.safe('search_tracks', q);
    if (my !== seq || !open) return;
    if (!r) return;
    if (!r.ok) { fail(r); return; }
    result = r;
    paintBody(true);
  }
  const setOf = (id) => (result ? result.sets.find((s) => s.id === id) : null);

  function onClick(e) {
    const b = e.target.closest('[data-tr],[data-jump],[data-find]');
    if (!b || b.disabled) return;
    if (b.dataset.jump != null) {
      const s = setOf(b.dataset.jump);
      if (s) jump(s, +b.dataset.at);
      return;
    }
    if (b.dataset.find != null) {
      const inp = $('#tr-q', el);
      inp.value = b.dataset.find;
      inp.focus();
      runSearch();
      return;
    }
    const a = b.dataset.tr;
    if (a === 'back') { HC.app.go('library'); return; }
    if (a === 'discover') { HC.app.go('discover'); return; }
    if (a === 'scan') { scan('new'); return; }
    if (a === 'rescan') { scan('all'); return; }
    if (a === 'cancel') { if (pass) pass.cancelling = true; paintStatus(); HC.bridge.safe('cancel_build_tracklists'); return; }
    const card = b.closest('[data-set]');
    const s = card && setOf(card.dataset.set);
    if (!s) return;
    if (a === 'panel') panel(s);
    else if (a === 'play') jump(s, 0);
  }

  function wire() {
    HC.bridge.on('tracklist_index', (d) => {
      if (d.phase === 'start' || d.phase === 'progress') {
        pass = Object.assign(pass || { done: 0, total: 0 }, { live: true }, d.done != null ? { done: d.done } : {}, d.total != null ? { total: d.total } : {});
        if (open) paintStatus();
        return;
      }
      pass = null;
      if (d.auto) { /* v0.10.1 automatischer Nachlauf: kein Toast (Statusleiste) */ } else if (d.phase === 'error' || d.ok === false) ui.toast(d.error || t('err.generic'), 'err');
      else ui.toast(d.cancelled ? t('tracks.toast_cancelled') : t('tracks.toast_done', { sets: nSets(d.sets || 0), tracks: nTracks(d.tracks || 0) }), d.cancelled ? 'warn' : 'ok', 5200);
      if (open) refresh();
    });
    /* Neuer Download: dessen Trackliste ist schon da – Kennzahlen und Treffer auffrischen. */
    HC.bridge.on('done', () => { if (open && !pass) refresh(); });
  }

  async function refresh() {
    const s = await loadStatus();
    if (!s) return;
    await loadTop();
    if (query) await runSearch();
    else paintBody();
  }

  HC.tracks = {
    /** root = Container in der Bibliothek; h = {opened(), closed(silent)} */
    init(root, h) {
      el = root;
      hooks = h || {};
      el.addEventListener('click', onClick);
      wire();
    },
    async open() {
      const fresh = !open;
      open = true;
      el.hidden = false;
      if (hooks.opened) hooks.opened();
      if (fresh) {
        shell();
        const inp = $('#tr-q', el);
        inp.value = query;
        inp.addEventListener('input', util.debounce(runSearch, 160));
        inp.addEventListener('keydown', (e) => { if (e.key === 'Escape' && inp.value) { e.stopPropagation(); inp.value = ''; runSearch(); } });
        paintStatus();
      }
      const s = await loadStatus();
      if (!s) return;
      /* Einmalig: noch nie eingelesen -> offline einlesen (Fortschritt + Abbrechen im Kopf). */
      if (!s.last_pass && !s.running && s.total && !autoStarted) { autoStarted = true; scan('new'); }
      await loadTop();
      if (query) await runSearch();
      else paintBody(true);
      if (fresh) $('#tr-q', el).focus();
    },
    close(silent) {
      if (!open) return;
      open = false;
      seq++;
      el.hidden = true;
      el.innerHTML = '';
      if (hooks.closed) hooks.closed(silent);
    },
    active: () => open,
    panel,
    jump,
    reset() { status = null; top = null; result = null; query = ''; pass = null; autoStarted = false; if (el) HC.tracks.close(true); },
  };
})();
