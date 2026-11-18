/* =====================================================================
   views/library.js – Bibliothek: alle geladenen Mixes
   Kennzahlen (hochzählend), Suche + Filter (Genre/Kanal/Jahr), Sortierung, «Gruppieren nach»
   (Genre · Festival/Serie · Artist · Jahr), Liste oder Kacheln. Aktionen: Abspielen, Ordner öffnen, neu taggen, löschen.

   Festivals & Serien (v0.3.0): Gruppierung «Festival» zeigt eine Kachel pro Serie -> Ausgaben als Jahres-Zeitleiste
   -> Sets nach Bühne. Gruppiert wird hier aus LibraryItem.festival (kein Roundtrip, Filter und Suche wirken weiter).
   Festival-Badge am Eintrag: Klick -> Formular (HC.fest.popover) -> set_festival + retag; Vorschläge mit «Übernehmen».
   Festival-Sammler (v0.5.0): Unteransicht (views/collector.js, #library/collector[-<edition_id>]) – Knopf «Sammler»
   im Kopf, «Diese Ausgabe sammeln» an der gewählten Ausgabe der Festival-Ansicht.

   Abspielen (Phase 8): ▶ nutzt die Einstellung player.mode – «internal» = Mini-Player (js/player.js),
   «external» = Standardplayer (play_external). Die jeweils andere Variante steht im Menü (⋯).
   Der Eintrag, der gerade läuft, ist markiert (Equalizer-Balken).
   Genre: Klick auf das Genre-Badge -> set_genre + retag (verschiebt die Datei in den Ordner des Genres).

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
  const GROUPS = ['none', 'genre', 'festival', 'artist', 'year'];
  const prefs = { view: 'list', sort: 'newest', group: 'none' };
  /* Festival-Ansicht: series null = Kacheln, Zahl = Serie, 'none' = ohne Zuordnung; edition null = neueste, 'all' = alle. */
  const nav = { series: null, edition: null };

  /* ---------- Einstellungen der Ansicht (bleiben über Neustarts erhalten) ---------- */
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (p.view === 'grid' || p.view === 'list') prefs.view = p.view;
      if (SORTS.includes(p.sort)) prefs.sort = p.sort;
      prefs.group = GROUPS.includes(p.group) ? p.group : p.group === true ? 'genre' : 'none'; // true = alter Schalter «Nach Genre»
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
  const fmtSize = (mb) => util.fmtSize(mb);
  const fmtTotal = (sec) => { const h = sec / 3600; return h >= 1 ? `${util.fmtDec(h, 1, true)} ${t('library.unit_h')}` : `${util.fmtNum(sec / 60)} ${t('library.unit_min')}`; };
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
      && (!onlyMissing || l.missing) && (!q || util.norm(`${l.title} ${l.artist} ${l.file_path} ${HC.platform.label(HC.platform.of(l))} ${l.festival ? HC.fest.full(l.festival) : ''}`).includes(q)));
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
  const playerMode = () => { const pl = HC.settings.values.player; return pl && pl.mode === 'external' ? 'external' : 'internal'; };
  let now = { id: null, playing: false }; // was der Mini-Player gerade geladen hat
  const isNow = (l) => now.id != null && now.id === l.id;
  function actions(l) {
    const cur = isNow(l), on = cur && now.playing;
    return `<button class="iconbtn play${cur ? ' on' : ''}" data-act="play" title="${esc(t(l.missing ? 'library.play_missing' : on ? 'library.pause' : 'library.play'))}" ${l.missing ? 'disabled' : ''}>${on ? I.pause : I.play}</button>
      <button class="iconbtn" data-act="folder" title="${esc(t('library.open_folder'))}">${I.folder}</button>
      <button class="iconbtn" data-act="more" title="${esc(t('library.more'))}" aria-haspopup="menu">${I.more}</button>`;
  }
  const cueTag = () => `<span class="cue-tag" title="${esc(t('library.cue_title'))}">CUE</span>`;
  const missTag = () => `<span class="miss-tag" title="${esc(t('library.missing_title'))}">${I.warn}${t('library.missing')}</span>`;
  const cls = (l) => `${l.missing ? ' missing' : ''}${busy.has(l.id) ? ' working' : ''}${isNow(l) ? ` now${now.playing ? '' : ' paused'}` : ''}`;
  const genreTag = (l) => ui.gtag(l.genre, { edit: true, manual: !!l.genre_manual, busy: busy.has(l.id) });
  const festTag = (l, add) => HC.fest.badge(l, { add, busy: busy.has(l.id) });
  const nowMark = (l) => (isNow(l) ? `<span class="nowplay" title="${esc(t('library.now_playing'))}">${ui.eq()}</span>` : '');
  function row(l) {
    return `<tr data-id="${esc(l.id)}" class="${cls(l).trim()}">
      <td class="clip"><div class="cell-title">${ui.thumb(l, 'mini')}${nowMark(l)}</div>
        <div><b title="${esc(l.title)}">${esc(l.title)}</b><small title="${esc(l.file_path)}">${ui.pbadge(l)}${l.missing ? missTag() : ''}${l.has_cue && !l.missing ? cueTag() : ''}${festTag(l, true)}<span>${esc(shortDir(l.file_path))}</span></small></div></div></td>
      <td class="clip" title="${esc(l.artist)}">${esc(l.artist)}</td>
      <td>${genreTag(l)}</td>
      <td class="mono">${esc(year(l) || '–')}</td>
      <td class="mono num">${util.fmtDur(l.duration)}</td>
      <td class="mono num">${l.missing ? '–' : fmtSize(l.size_mb)}</td>
      <td class="mono lib-loaded" title="${esc(util.fmtFull(l.downloaded_at))}">${util.fmtDate(l.downloaded_at)}</td>
      <td class="act">${actions(l)}</td></tr>`;
  }
  function card(l) {
    return `<div class="card lib-card${cls(l)}" data-id="${esc(l.id)}">
      ${ui.thumb(l)}<span class="tl">${genreTag(l)}${ui.pbadge(l)}</span><span class="dur">${util.fmtDur(l.duration)}</span>${l.missing ? missTag() : ''}${nowMark(l)}</div>
      <div class="cbody">
        <div class="ctitle" title="${esc(l.title)}">${esc(l.title)}</div>
        <div class="cmeta" title="${esc(l.file_path)}"><span class="ch">${esc(l.artist)}</span><span>·</span><span>${esc(year(l) || '–')}</span><span>·</span><span>${l.missing ? '–' : fmtSize(l.size_mb)}</span></div>
        ${l.festival || l.festival_suggestion ? `<div class="cfest">${festTag(l)}</div>` : ''}
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

  /* ---------- Gruppen ---------- */
  const inSeries = () => prefs.group === 'festival' && nav.series != null && nav.series !== 'none';
  /** -> [{key, label, color, icon, list}] in Anzeige-Reihenfolge (list ist schon sortiert). */
  function groupsOf(list) {
    const bucket = (keyOf) => {
      const map = new Map();
      list.forEach((l) => { const k = keyOf(l); if (!map.has(k)) map.set(k, []); map.get(k).push(l); });
      return map;
    };
    const g = prefs.group;
    if (g === 'genre') return genreOrder().map((name) => ({ key: name, label: name, color: HC.genres.color(name), list: list.filter((l) => l.genre === name) })).filter((x) => x.list.length);
    if (g === 'artist' || g === 'year') {
      const map = bucket(g === 'artist' ? (l) => l.artist || '' : year);
      const keys = [...map.keys()].sort((a, b) => !a - !b || (g === 'year' ? b.localeCompare(a) : byText(a, b)));
      return keys.map((k) => ({ key: k, label: k || t('library.group_unknown'), list: map.get(k) }));
    }
    if (inSeries() && nav.edition === 'all') {
      const map = bucket((l) => l.festival.edition_id);
      return [...map.values()].sort((a, b) => (b[0].festival.event_year || 0) - (a[0].festival.event_year || 0) || byText(a[0].festival.edition, b[0].festival.edition))
        .map((x) => ({ key: x[0].festival.edition_id, label: x[0].festival.edition, icon: HC.fest.kindIcon(x[0].festival.kind), list: x }));
    }
    if (inSeries()) {
      const map = bucket((l) => l.festival.stage || '');
      const keys = [...map.keys()].sort((a, b) => !a - !b || map.get(b).length - map.get(a).length || byText(a, b));
      /* dot = Farbe der Bühne; die Linie darunter bleibt bei BLACK sichtbar. */
      return keys.map((k) => { const c = HC.fest.stageColor(k); return { key: k, label: k || t('fest.no_stage'), color: c && /^black$/i.test(k) ? 'var(--line-2)' : c, dot: c, list: map.get(k) }; });
    }
    return [{ key: null, list }];
  }
  const groupMeta = (all) => t('library.group_meta', { n: all.length, dur: fmtTotal(all.reduce((a, b) => a + (b.duration || 0), 0)) });
  const groupHead = (g) => `${g.dot ? `<span class="dot ring" style="background:${g.dot}"></span>` : g.color ? '<span class="dot"></span>' : g.icon ? `<span class="gicon">${g.icon}</span>` : ''}${esc(g.label)}<span class="mono">${groupMeta(g.all)}</span>`;

  /* ---------- Festivals & Serien: Kacheln -> Zeitleiste -> Bühnen ---------- */
  /** Serien der (gefilterten) Liste mit ihren Ausgaben; meiste Sets zuerst. */
  function seriesOf(list) {
    const map = new Map();
    list.forEach((l) => {
      const f = l.festival;
      if (!f) return;
      let s = map.get(f.series_id);
      if (!s) map.set(f.series_id, (s = { id: f.series_id, name: f.series, kind: f.kind, list: [], editions: new Map() }));
      s.list.push(l);
      let e = s.editions.get(f.edition_id);
      if (!e) s.editions.set(f.edition_id, (e = { id: f.edition_id, year: f.event_year, variant: f.variant || '', name: f.edition, list: [] }));
      e.list.push(l);
    });
    return [...map.values()].sort((a, b) => b.list.length - a.list.length || byText(a.name, b.name));
  }
  /** Ausgaben chronologisch (ohne Jahr zuletzt). */
  const editionsOf = (s) => [...s.editions.values()].sort((a, b) => !a.year - !b.year || (a.year || 0) - (b.year || 0) || byText(a.variant, b.variant));
  function yearRange(s) {
    const ys = [...s.editions.values()].map((e) => e.year).filter(Boolean);
    if (!ys.length) return '';
    const a = Math.min(...ys), b = Math.max(...ys);
    return a === b ? String(a) : `${a}–${b}`;
  }
  function tilesHtml(all) {
    const series = seriesOf(all), rest = all.filter((l) => !l.festival);
    const tile = (s) => {
      const eds = editionsOf(s), max = Math.max(...eds.map((e) => e.list.length));
      const spark = eds.slice(-14).map((e) => `<i style="--h:${Math.round((e.list.length / max) * 100)}%" title="${esc(e.name)}: ${e.list.length}"></i>`).join('');
      return `<button type="button" class="fest-tile k-${esc(s.kind)}" data-series="${esc(s.id)}">
        <span class="ft-kind">${HC.fest.kindIcon(s.kind)}${esc(HC.fest.kindLabel(s.kind))}</span>
        <span class="ft-name" title="${esc(s.name)}">${esc(s.name)}</span>
        <span class="ft-meta"><b>${esc(t('fest.sets', { n: s.list.length }))}</b>${[yearRange(s), t('fest.editions', { n: eds.length })].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('')}</span>
        <span class="ft-spark" aria-hidden="true">${spark}</span></button>`;
    };
    const sugg = rest.filter((l) => l.festival_suggestion).length;
    const other = rest.length ? `<button type="button" class="fest-tile other" data-series="none">
        <span class="ft-kind">${I.library}${esc(t('fest.other_hint'))}</span>
        <span class="ft-name">${esc(t('fest.other'))}</span>
        <span class="ft-meta"><b>${esc(t('library.sub', { n: util.fmtNum(rest.length), count: rest.length }))}</b>${sugg ? `<span class="sg">${esc(t('fest.suggestions', { n: sugg }))}</span>` : ''}</span></button>` : '';
    return `<div class="fest-tiles">${series.map(tile).join('')}${other}</div>`;
  }
  /** Kopf einer Serie (zurück, Name, Zeitleiste der Ausgaben) und die Einträge der gewählten Ausgabe. */
  function seriesView(all) {
    const back = `<button type="button" class="btn sm ghost" data-fest-back>${I.left}${t('fest.all')}</button>`;
    if (nav.series === 'none') {
      const list = all.filter((l) => !l.festival);
      return { list, head: `<div class="fest-head">${back}<span class="fh-name">${esc(t('fest.other'))}</span><span class="mono">${list.length ? groupMeta(list) : ''}</span></div>` };
    }
    const s = seriesOf(all).find((x) => x.id === nav.series);
    if (!s) return { list: [], head: `<div class="fest-head">${back}</div>` };
    const eds = editionsOf(s);
    if (eds.length === 1) nav.edition = null; // eine einzige Ausgabe: keine Auswahl «Alle»
    let cur = nav.edition === 'all' ? null : eds.find((e) => e.id === nav.edition);
    if (!cur && nav.edition !== 'all') cur = eds.filter((e) => e.year).pop() || eds[eds.length - 1];
    const node = (id, on, big, n, sub, title) => `<button type="button" role="tab" data-edition="${esc(id)}" class="${on ? 'on' : ''}" aria-selected="${on}" title="${esc(title)}"><b>${esc(big)}</b>${sub ? `<em>${esc(sub)}</em>` : ''}<small>${n}</small></button>`;
    const line = `<div class="fest-line" role="tablist">${eds.length > 1 ? node('all', !cur, t('fest.all_years'), s.list.length, '', s.name) : ''}${eds.map((e) => node(e.id, cur === e, e.year || '–', e.list.length, e.variant, e.name)).join('')}</div>`;
    /* Festival-Sammler: Checkliste der gewählten Ausgabe (nur mit Jahr – eine Ausgabe ohne Jahr hat keinen Timetable). */
    const cs = cur && cur.year ? HC.collector.statsOf(cur.id) : null;
    const collect = cur && cur.year ? `<button type="button" class="btn sm fh-collect" data-collect="${esc(cur.id)}" title="${esc(t('collector.collect_title', { name: cur.name }))}">${I.flag}${esc(cs ? t('collector.open_checklist', { n: cs.downloaded, total: cs.total }) : t('collector.collect'))}</button>` : '';
    return {
      list: cur ? cur.list : s.list,
      head: `<div class="fest-head">${back}<span class="fh-name">${HC.fest.kindIcon(s.kind)}${esc(s.name)}</span><span class="mono">${groupMeta(s.list)}</span><span class="spacer"></span>${collect}</div>${line}`,
    };
  }

  /* ---------- Liste ---------- */
  function emptyHtml() {
    if (!items.length) {
      const bars = Array.from({ length: 28 }, (_, i) => `<i style="--h:${Math.round((Math.abs(Math.sin(i * 0.55 + 1)) * 0.75 + 0.2) * 100)}%;--i:${i}"></i>`).join('');
      return `<div class="empty lib-empty"><div class="lib-eq" aria-hidden="true">${bars}</div>
        <h4>${t('library.empty_title')}</h4><p>${t('library.empty_text')}</p>
        <div class="lib-empty-actions"><button class="btn primary" data-go="discover">${I.search}${t('library.empty_discover')}</button><button class="btn ghost" data-go="watchlist">${I.eye}${t('library.empty_watchlist')}</button></div></div>`;
    }
    return `<div class="empty">${I.library}<h4>${t('library.none_title')}</h4><p>${t('library.none_text')}</p>
      ${filtersActive() ? `<button class="btn" data-clear>${I.x}${t('library.clear')}</button>` : ''}</div>`;
  }
  /** Gruppenzeilen über genau die sichtbaren Spalten spannen (schmale Fenster blenden Spalten aus;
      ein zu grosses colspan erzeugt bei table-layout:fixed leere Zusatzspalten). */
  function fixSpans() {
    const heads = $$('.lib-table thead th', el);
    if (!heads.length) return;
    const n = heads.filter((th) => getComputedStyle(th).display !== 'none').length;
    $$('.lib-table tr.grp td', el).forEach((td) => { if (td.colSpan !== n) td.colSpan = n; });
  }
  function render(animate) {
    const body = $('#lib-body', el);
    const all = filtered();
    const tiles = prefs.group === 'festival' && nav.series == null;
    const sv = prefs.group === 'festival' && !tiles ? seriesView(all) : null;
    const list = sv ? sv.list : all;
    /* Blockweise zeichnen: die Grenze läuft Gruppe für Gruppe durch die Liste. */
    let left = limit;
    const groups = tiles ? [] : groupsOf(list).map((g) => { const part = g.list.slice(0, Math.max(0, left)); left -= part.length; return Object.assign({}, g, { all: g.list, list: part }); }).filter((g) => g.list.length);
    const rest = tiles ? 0 : list.length - groups.reduce((a, g) => a + g.list.length, 0);
    const style = (g) => (g.color ? ` style="--c:${g.color}"` : '');
    if (moreObserver) moreObserver.disconnect();
    el.classList.toggle('lib-none', !items.length);
    $('#lib-top', el).hidden = !items.length;
    $('#lib-tools', el).hidden = !items.length;

    if (!all.length) {
      body.innerHTML = loaded ? emptyHtml() : '';
    } else if (tiles) {
      body.innerHTML = tilesHtml(all);
    } else if (!list.length) {
      body.innerHTML = sv.head + emptyHtml();
    } else if (prefs.view === 'grid') {
      body.innerHTML = (sv ? sv.head : '') + groups.map((g) => `${g.key != null ? `<div class="section-label lib-group"${style(g)}>${groupHead(g)}</div>` : ''}
          <div class="grid lib-grid">${g.list.map(card).join('')}</div>`).join('');
    } else {
      body.innerHTML = `${sv ? sv.head : ''}<table class="lib-table">
        <thead><tr><th>${t('library.col_title')}</th><th class="c-ch">${t('library.col_channel')}</th><th class="c-genre">${t('library.col_genre')}</th>
          <th class="c-year">${t('library.col_year')}</th><th class="num c-dur">${t('library.col_duration')}</th><th class="num c-size">${t('library.col_size')}</th>
          <th class="c-loaded lib-loaded">${t('library.col_loaded')}</th><th class="c-act"></th></tr></thead>
        <tbody>${groups.map((g) => `${g.key != null ? `<tr class="grp"${style(g)}><td colspan="8">${groupHead(g)}</td></tr>` : ''}${g.list.map(row).join('')}`).join('')}</tbody></table>`;
    }
    fixSpans();
    if (rest > 0) {
      body.insertAdjacentHTML('beforeend', `<div class="lib-more"><button class="btn ghost" data-more>${I.down}${t('library.more', { n: Math.min(PAGE, rest) })}</button></div>`);
      if (moreObserver) moreObserver.observe($('.lib-more', body));
    }
    $('#lib-sub', el).textContent = !items.length ? '' : all.length !== items.length
      ? t('library.sub_shown', { n: util.fmtNum(all.length), total: util.fmtNum(items.length) })
      : t('library.sub', { n: util.fmtNum(items.length), count: items.length });
    $('#lib-clear', el).hidden = !filtersActive();
    if (animate) $$(tiles ? '.fest-tiles' : prefs.view === 'grid' ? '.lib-grid' : 'tbody', body).forEach((c) => fx.stagger(c));
  }

  /* ---------- Kennzahlen ---------- */
  function renderStats(restart) {
    const n = items.length;
    const sec = items.reduce((a, b) => a + (b.duration || 0), 0);
    const mb = items.reduce((a, b) => a + (b.missing ? 0 : b.size_mb || 0), 0);
    const inGb = mb >= 1024, inKb = mb > 0 && mb < 1;
    const counters = [
      ['#ls-count', n, (v) => util.fmtNum(v)],
      ['#ls-dur', sec / 3600, (v) => util.fmtDec(v, 1, true)],
      ['#ls-size', inGb ? mb / 1024 : inKb ? mb * 1024 : mb, (v) => (inGb ? util.fmtDec(v, 1, true) : util.fmtNum(v))],
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
    $('span', chip).textContent = t('library.missing_chip', { n: miss });
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
    $$('#lib-groupby button', el).forEach((b) => { const on = b.dataset.g === prefs.group; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
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
    const [list] = await Promise.all([HC.bridge.safe('get_library'), HC.collector.preload()]);
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
  /** Abspielen: internal = Mini-Player, sonst Standardplayer des Systems. */
  async function play(l, internal) {
    if (l.missing) return;
    if (internal) { HC.player.play(l); return; }
    const r = await HC.bridge.safe('play_external', l.id);
    if (r && r.ok) ui.toast(t('player.external'), 'info', 1800);
    else fail(r);
  }
  /** Menü (⋯): die andere Abspiel-Variante, neu taggen, löschen. */
  function more(l, anchor) {
    const internal = playerMode() === 'internal', working = busy.has(l.id);
    ui.menu(anchor, [
      { label: t(internal ? 'library.play_external' : 'library.play_internal'), icon: internal ? I.external : I.play, key: 'play-alt', disabled: !!l.missing, onClick: () => play(l, !internal) },
      'sep',
      { label: t('fest.p_title'), icon: I.flag, key: 'fest', disabled: working, onClick: () => festMenu(l, anchor) },
      { label: t('library.retag_short'), icon: I.tag, key: 'retag', disabled: !!(l.missing || l.unknown || working), onClick: () => retag(l) },
      { label: t(l.missing ? 'library.remove' : 'library.delete'), icon: l.missing ? I.file_x : I.trash, danger: true, key: 'del', disabled: !!(working || l.unknown), onClick: () => remove(l) },
    ]);
  }
  /** Kennzahlen und Auswahllisten nach einer Genre-Änderung nachziehen. */
  function genreChanged() {
    fillSelects();
    $('#ls-bar', el)._sig = null;
    renderStats(false);
  }
  /** Genre per Klick: set_genre (manuell), danach retag – die Datei wandert in den Ordner des neuen Genres. */
  async function setGenre(l, name) {
    if (busy.has(l.id) || !name || name === l.genre) return;
    const old = { genre: l.genre, manual: !!l.genre_manual };
    const offline = !!(l.missing || l.unknown);
    const settle = (flash) => { busy.delete(l.id); genreChanged(); render(); if (flash) fx.flash(nodeOf(l.id)); };
    const revert = (msg) => {
      l.genre = old.genre;
      l.genre_manual = old.manual;
      settle(false);
      ui.toast(t('toast.genre_failed', { error: msg || t('err.generic') }), 'err');
    };
    /* Optimistisch: Badge sofort umstellen, Spinner bis das Neu-Taggen fertig ist. */
    l.genre = name;
    l.genre_manual = true;
    busy.add(l.id);
    repaint(l);
    const r0 = await HC.bridge.safe('set_genre', l.id, name);
    if (!r0 || !r0.ok) return revert(r0 && r0.error);
    const v = HC.store.get(l.id);
    if (v) { HC.store.patch(l.id, { genre: name, genre_manual: true }); HC.bridge.emit('video', { id: l.id, status: v.status, genre: name }); }
    if (offline) {
      settle(true);
      ui.toast(t('toast.genre_entry_only', { genre: name }), 'warn', 5200);
      return;
    }
    /* Die Datei wird verschoben: der Mini-Player gibt sie so lange frei und spielt danach an derselben Stelle weiter. */
    const hold = HC.player.suspend(l.id);
    const r = await HC.bridge.safe('retag', l.id);
    if (r && r.ok) {
      const path = r.path || r.file_path || '';
      const moved = r.moved != null ? !!r.moved : !!path && path !== l.file_path;
      if (path) l.file_path = path;
      if (typeof r.cue === 'boolean') l.has_cue = r.cue;
      settle(true);
      ui.toast(moved ? t('toast.genre_moved', { genre: name, path: shortDir(path) }) : t('toast.genre_retagged', { genre: name }), 'ok', moved ? 6000 : 0);
    } else {
      await HC.bridge.safe('set_genre', l.id, old.genre); // auch im Backend zurück
      if (v) { HC.store.patch(l.id, { genre: old.genre }); HC.bridge.emit('video', { id: l.id, status: v.status, genre: old.genre }); }
      revert(r && r.error);
    }
    HC.player.resume(hold);
  }
  /* ---------- Festival eines Eintrags ---------- */
  /** Formular am Badge (bzw. am Menü ⋯): set_festival / reset_festival, danach afterFestival. */
  function festMenu(l, anchor) {
    if (busy.has(l.id)) return;
    HC.fest.popover(anchor, l, {
      canReset: !!l.festival_suggestion,
      save: (data) => HC.bridge.safe('set_festival', l.id, data),
      reset: () => HC.bridge.safe('reset_festival', l.id),
      done: (r) => afterFestival(l, r),
    });
  }
  /** Vorschlag übernehmen (docs/bridge-api.md: set_festival mit der vorgeschlagenen Ausgabe). */
  async function acceptFestival(l) {
    const s = l.festival_suggestion;
    if (!s || busy.has(l.id)) return;
    const r = await HC.bridge.safe('set_festival', l.id, { edition_id: s.edition_id, stage: s.stage, set_type: s.set_type, episode: s.episode });
    if (r && r.ok) afterFestival(l, r);
    else fail(r);
  }
  /** Zuordnung geändert: Eintrag übernehmen und die Datei neu taggen (Tags und Ablage folgen erst mit retag). */
  function afterFestival(l, r) {
    l.festival = r.festival || null;
    l.festival_suggestion = r.festival_suggestion || null;
    render();
    if (l.missing || l.unknown) {
      fx.flash(nodeOf(l.id));
      ui.toast(t('toast.festival_entry_only', { name: l.festival ? HC.fest.label(l.festival) : t('fest.p_none') }), 'warn', 5200);
      return;
    }
    retag(l);
  }
  async function retag(l) {
    if (busy.has(l.id) || l.missing || l.unknown) return;
    busy.add(l.id);
    repaint(l);
    const hold = HC.player.suspend(l.id); // die Datei kann verschoben werden
    const r = await HC.bridge.safe('retag', l.id);
    busy.delete(l.id);
    HC.player.resume(hold);
    if (r && r.ok) {
      /* Das Ablage-Muster kann die Datei verschieben: die Antwort nennt dann den neuen Pfad. */
      const path = r.path || r.file_path || '';
      const moved = r.moved != null ? !!r.moved : !!path && path !== l.file_path;
      if (path) l.file_path = path;
      if (r.genre && r.genre !== l.genre) { l.genre = r.genre; genreChanged(); }
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
    HC.player.release(l.id); // eine Datei, die gerade läuft, liesse sich unter Windows nicht löschen
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
        <div class="actions">
          <button type="button" class="btn ghost lib-collector" id="lib-collector-btn" title="${esc(t('collector.open_title'))}">${I.flag}${esc(t('collector.nav'))}</button>
          <div class="lib-tools" id="lib-tools">
            <div class="search-wrap lib-search">${I.search}<input class="input" id="lib-q" placeholder="${esc(t('library.search'))}" spellcheck="false" autocomplete="off"></div>
            <div class="seg icon" id="lib-view">
              <button type="button" data-v="list" title="${esc(t('library.view_list'))}" aria-label="${esc(t('library.view_list'))}">${I.list}</button>
              <button type="button" data-v="grid" title="${esc(t('library.view_grid'))}" aria-label="${esc(t('library.view_grid'))}">${I.grid}</button>
            </div>
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
          ${sel('lib-genre', 'library.f_genre', 138)}${sel('lib-channel', 'library.f_channel', 168)}${sel('lib-year', 'library.f_year', 112)}
          <select class="select" id="lib-sort" aria-label="${esc(t('library.f_sort'))}" title="${esc(t('library.f_sort'))}" style="width:160px">${SORTS.map((s) => `<option value="${s}">${t('library.sort_' + s)}</option>`).join('')}</select>
          <span class="bar-sep"></span>
          <div class="bar-group"><span class="bar-lbl" id="lib-groupby-l">${t('library.group_by')}</span>
            <div class="seg" id="lib-groupby" role="radiogroup" aria-labelledby="lib-groupby-l">${GROUPS.map((g) => `<button type="button" role="radio" data-g="${g}">${t('library.group_' + g)}</button>`).join('')}</div></div>
          <span class="spacer"></span>
          <button type="button" class="linkbtn" id="lib-clear" hidden>${t('library.clear')}</button>
          <button type="button" class="chip warnchip" id="lib-missing" title="${esc(t('library.missing_chip_title'))}" hidden>${I.warn}<span></span></button>
        </div>
      </div>
      <div class="scroll" id="lib-scroll"><div id="lib-body"></div></div>
      <div class="collector" id="lib-collector" hidden></div>`;
    paintControls();
    HC.collector.init($('#lib-collector', el), {
      opened: () => el.classList.add('collecting'),
      closed(silent) {
        el.classList.remove('collecting');
        try { history.replaceState(null, '', '#library'); } catch (e) { /* file:// – egal */ }
        if (!silent) refresh(true);
      },
      /* «In der Bibliothek zeigen»: Festival-Ansicht dieser Ausgabe. */
      showEdition(ed) {
        prefs.group = 'festival';
        nav.series = ed.series_id;
        nav.edition = ed.edition_id;
        savePrefs();
        paintControls();
        clearFilters();
        refresh(true);
      },
    });
    $('#lib-collector-btn', el).addEventListener('click', () => HC.app.go('library', 'collector'));

    if (window.IntersectionObserver) {
      moreObserver = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting) && HC.app.current() === 'library') { limit += PAGE; render(); }
      }, { root: $('#lib-scroll', el), rootMargin: '300px' });
    }

    $('#lib-q', el).addEventListener('input', util.debounce(() => refilter(), 120));
    $('#lib-q', el).addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target.value) { e.target.value = ''; refilter(); } });
    ['#lib-genre', '#lib-channel', '#lib-year'].forEach((s) => $(s, el).addEventListener('change', () => refilter(true)));
    $('#lib-sort', el).addEventListener('change', (e) => { prefs.sort = e.target.value; savePrefs(); refilter(true); });
    $('#lib-groupby', el).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-g]');
      if (!b || b.dataset.g === prefs.group) return;
      prefs.group = b.dataset.g;
      nav.series = nav.edition = null;
      savePrefs();
      paintControls();
      refilter(true);
    });
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
      const co = e.target.closest('[data-collect]');
      if (co) { HC.collector.collect(+co.dataset.collect); return; }
      /* Festival-Ansicht: Kachel -> Serie, Zeitleiste -> Ausgabe, zurück -> Kacheln */
      const tile = e.target.closest('[data-series]'), ed = e.target.closest('[data-edition]');
      if (tile || ed || e.target.closest('[data-fest-back]')) {
        if (tile) { nav.series = tile.dataset.series === 'none' ? 'none' : +tile.dataset.series; nav.edition = null; }
        else if (ed) nav.edition = ed.dataset.edition === 'all' ? 'all' : +ed.dataset.edition;
        else nav.series = nav.edition = null;
        limit = PAGE;
        render(!ed);
        if (!ed) $('#lib-scroll', el).scrollTop = 0;
        return;
      }
      const go = e.target.closest('[data-go]');
      if (go) { HC.app.go(go.dataset.go); return; }
      const b = e.target.closest('[data-act]'), node = e.target.closest('[data-id]');
      if (!b || !node || b.disabled) return;
      const l = items.find((x) => x.id === node.dataset.id);
      if (!l) return;
      if (b.dataset.act === 'folder') openFolder(l);
      else if (b.dataset.act === 'play') play(l, playerMode() === 'internal' || isNow(l));
      else if (b.dataset.act === 'more') more(l, b);
      else if (b.dataset.act === 'genre') ui.genreMenu(b, l.genre, (name) => setGenre(l, name));
      else if (b.dataset.act === 'fest') festMenu(l, b);
      else if (b.dataset.act === 'fest-accept') acceptFestival(l);
    });
    /* Mini-Player: den laufenden Eintrag markieren (nur die betroffenen Zeilen neu zeichnen). */
    HC.bridge.on('player', (d) => {
      const prev = now;
      now = { id: d.id == null ? null : d.id, playing: !!d.playing };
      if (!loaded) return;
      [prev.id, now.id].filter((id, i, a) => id != null && a.indexOf(id) === i).forEach((id) => { const l = items.find((x) => x.id === id); if (l) repaint(l); });
    });
    window.addEventListener('resize', util.debounce(() => { if (loaded && HC.app.current() === 'library') fixSpans(); }, 120));
    HC.bridge.on('done', (d) => { if (HC.app.current() === 'library') refresh(false, d.id); });
    /* «Festivals zuordnen» ist durch (Einstellungen): Zuordnungen neu laden. */
    HC.bridge.on('festival_assign', (d) => { if (d.phase === 'done' && loaded && HC.app.current() === 'library') refresh(); });
    HC.bridge.on('settings_changed', () => { if (!loaded) return; fillSelects(); $('#ls-bar', el)._sig = null; renderStats(false); render(); });
  }

  HC.views.library = {
    init,
    /* arg «collector» / «collector-<edition_id>» öffnet den Festival-Sammler. Ohne arg bleibt eine offene Unteransicht
       stehen, wenn man aus einer anderen Ansicht zurückkommt; ein Klick auf «Bibliothek» in der Bibliothek schliesst sie. */
    show(arg, changed) {
      const C = HC.collector;
      if (/^collector(-\d+)?$/.test(arg || '')) return C.open(arg);
      if (C.active() && changed) return C.resume();
      if (C.active()) C.close(true);
      return refresh(changed);
    },
    reset() { items = []; loaded = false; targetDown = null; limit = PAGE; onlyMissing = false; busy.clear(); nav.series = nav.edition = null; HC.collector.reset(); },
  };
})();
