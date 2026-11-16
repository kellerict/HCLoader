/* =====================================================================
   views/log.js – Protokoll: Live-Log und Lauf-Historie
   Live-Log: Stufen-Filter (Debug optional), Suche, Auto-Scroll mit Pause beim Hochscrollen,
   sichtbare Zeilen kopieren. Lauf-Historie: Zeitachse oder Tabelle, Filter nach Art;
   das Event «run» trägt beendete Läufe live nach.

   get_log() wird ohne Filter aufgerufen – gefiltert wird hier (Backlog ≤ 500 Zeilen).
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx, ui } = HC;
  const { esc, pad } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const MAX = 1000; // Zeilen im Speicher / im DOM
  const MAX_RUNS = 100;
  const LEVELS = ['debug', 'info', 'warn', 'error'];
  const KINDS = ['manual', 'watchlist', 'headless'];
  const TAG = { debug: 'DBG ', info: 'INFO', ok: ' OK ', warn: 'WARN', error: 'FEHL' };
  const STORE_KEY = 'hc.log';
  /* «ok» gehört zur Stufe Info */
  const group = (lvl) => (LEVELS.includes(lvl) ? lvl : 'info');

  let el;
  let lines = [];
  let runs = [];
  let follow = true;
  let unseen = 0; // neue Zeilen seit dem Pausieren
  let settling = false; // Ansicht wird gerade aufgebaut: Scroll-Ereignisse nicht als «hochgescrollt» werten
  let query = '';
  let lastDay = '';
  let kind = '';
  let runsView = 'timeline';
  const on = new Set(['info', 'warn', 'error']); // Debug ist optional
  let box;

  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (p.runs === 'table' || p.runs === 'timeline') runsView = p.runs;
      if (p.debug) on.add('debug');
    } catch (e) { /* Standardwerte */ }
  }
  function savePrefs() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ runs: runsView, debug: on.has('debug') })); } catch (e) { /* egal */ }
  }

  /* ---------- Zeit ---------- */
  const clock = (iso) => { const d = util.parseDate(iso); return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : '--:--:--'; };
  const dayKey = (iso) => { const d = util.parseDate(iso); return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : ''; };
  function dayLabel(iso) {
    const ago = util.daysAgo(iso);
    const date = util.fmtDate(iso);
    return ago === 0 ? `${t('log.today')} · ${date}` : ago === 1 ? `${t('log.yesterday')} · ${date}` : date;
  }

  /* ---------- Live-Log ---------- */
  const visible = (l) => on.has(group(l.level)) && (!query || util.norm(l.msg).includes(query));
  /** Meldung escapen und Treffer der Suche markieren (Suche ohne Gross-/Kleinschreibung und Akzente). */
  function mark(msg) {
    const s = String(msg == null ? '' : msg);
    if (!query) return esc(s);
    const hay = util.norm(s);
    if (hay.length !== s.length) return esc(s); // Normalisierung hat die Länge geändert – lieber nicht markieren
    let out = '', i = 0, at;
    while ((at = hay.indexOf(query, i)) >= 0) {
      out += `${esc(s.slice(i, at))}<mark>${esc(s.slice(at, at + query.length))}</mark>`;
      i = at + query.length;
    }
    return out + esc(s.slice(i));
  }
  function lineHtml(l, fresh) {
    const day = dayKey(l.ts);
    const sep = day && day !== lastDay ? `<div class="log-day"><span>${esc(dayLabel(l.ts))}</span></div>` : '';
    if (day) lastDay = day;
    const lvl = TAG[l.level] ? l.level : 'info';
    return `${sep}<div class="log-line ${lvl}${fresh ? ' new' : ''}"><span class="t">${clock(l.ts)}</span><span class="l">[${TAG[lvl]}]</span><span class="m">${mark(l.msg)}</span></div>`;
  }
  const shownCount = () => box.querySelectorAll('.log-line').length;
  function paintCount() {
    const n = shownCount();
    $('#log-count', el).textContent = n === lines.length ? t('log.lines', { n }) : t('log.lines_of', { n, total: lines.length });
    const per = { debug: 0, info: 0, warn: 0, error: 0 };
    lines.forEach((l) => { per[group(l.level)]++; });
    $$('#log-levels button', el).forEach((b) => { $('i', b).textContent = per[b.dataset.lvl]; });
  }
  function paintFollow() {
    const b = $('#log-follow', el);
    b.classList.toggle('on', follow);
    b.setAttribute('aria-pressed', follow);
    $('span:last-child', b).textContent = t(follow ? 'log.following' : 'log.paused');
    const jump = $('#log-jump', el);
    jump.hidden = follow;
    $('span', jump).textContent = unseen ? t(unseen === 1 ? 'log.jump_new_one' : 'log.jump_new', { n: unseen }) : t('log.jump');
    jump.classList.toggle('has-new', unseen > 0);
  }
  const toEnd = () => { box.scrollTop = box.scrollHeight; };
  function setFollow(next) {
    follow = next;
    if (follow) { unseen = 0; toEnd(); }
    paintFollow();
  }
  function renderLog() {
    lastDay = '';
    const list = lines.filter(visible);
    box.innerHTML = list.length ? list.map((l) => lineHtml(l)).join('')
      : `<div class="log-none">${query ? esc(t('log.empty_search', { q: $('#log-q', el).value.trim() })) : t('log.empty')}</div>`;
    if (follow) toEnd();
    paintCount();
    paintFollow();
  }
  function append(l) {
    lines.push(l);
    if (lines.length > MAX) lines.shift();
    if (visible(l)) {
      const none = box.querySelector('.log-none');
      if (none) none.remove();
      box.insertAdjacentHTML('beforeend', lineHtml(l, true));
      while (shownCount() > MAX) {
        box.firstElementChild.remove();
        if (box.firstElementChild && box.firstElementChild.classList.contains('log-day') && box.children[1] && box.children[1].classList.contains('log-day')) box.firstElementChild.remove();
      }
      if (follow) toEnd();
      else { unseen++; paintFollow(); }
    }
    paintCount();
  }
  function plainText() {
    return lines.filter(visible).map((l) => `${dayKey(l.ts)} ${clock(l.ts)} [${(TAG[l.level] || TAG.info).trim()}] ${l.msg}`).join('\n');
  }
  async function copyVisible() {
    const n = lines.filter(visible).length;
    if (!n) { ui.toast(t('toast.copy_none'), 'info', 1800); return; }
    const ok = await util.copyText(plainText());
    if (ok) { ui.toast(t(n === 1 ? 'toast.copied_one' : 'toast.copied', { n }), 'ok', 2200); fx.pop($('#log-copy', el), 'done'); }
    else ui.toast(t('toast.copy_failed'), 'err');
  }

  /* ---------- Lauf-Historie ---------- */
  function runDur(r) {
    const a = util.parseDate(r.started), b = util.parseDate(r.finished);
    if (typeof r.duration !== 'number' && (!a || !b)) return null;
    const sec = Math.max(0, Math.round(typeof r.duration === 'number' ? r.duration : (b - a) / 1000));
    return sec < 60 ? `${sec} s` : sec < 3600 ? `${Math.round(sec / 60)} min` : `${Math.floor(sec / 3600)} h ${pad(Math.round((sec % 3600) / 60))} min`;
  }
  const isBackoff = (r) => /backoff|429|bot-pr/i.test(r.note || '');
  const runCls = (r) => (!r.finished ? 'live' : r.errors ? (r.downloaded || r.found ? 'warn' : 'error') : r.note ? 'warn' : 'ok');
  const num = (n, bad) => `<b class="${!n ? 'zero' : bad ? 'bad' : ''}">${util.fmtNum(n || 0)}</b>`;
  const kindLabel = (r) => esc(t('run_kind.' + (KINDS.includes(r.kind) ? r.kind : 'manual')));
  const boTag = (r) => (isBackoff(r) ? `<span class="rtag">${t('log.backoff')}</span>` : '');
  const durHtml = (r) => (r.finished ? esc(runDur(r) || '–') : `<span class="running"><span class="spinner"></span>${t('log.running')}</span>`);

  function timelineHtml(list) {
    let day = '';
    return list.map((r) => {
      const k = dayKey(r.started);
      const head = k !== day ? `<div class="run-day">${esc(dayLabel(r.started))}</div>` : '';
      day = k;
      return `${head}<div class="run ${runCls(r)}" data-id="${esc(r.id)}"><span class="node"></span>
        <div class="run-top"><b>${kindLabel(r)}</b>${boTag(r)}<span class="when">${util.fmtTime(r.started)}</span></div>
        <div class="run-stats"><span>${t('log.found')} ${num(r.found)}</span><span>${t('log.downloaded')} ${num(r.downloaded)}</span><span>${t('log.errors')} ${num(r.errors, true)}</span><span class="dur">${durHtml(r)}</span></div>
        ${r.note ? `<div class="run-note">${esc(r.note)}</div>` : ''}</div>`;
    }).join('');
  }
  function tableHtml(list) {
    return `<table class="runs-table"><thead><tr><th>${t('log.col_kind')}</th><th>${t('log.col_start')}</th><th class="num">${t('log.col_duration')}</th>
      <th class="num">${t('log.col_found')}</th><th class="num">${t('log.col_downloaded')}</th><th class="num">${t('log.col_errors')}</th><th class="c-note">${t('log.col_note')}</th></tr></thead>
      <tbody>${list.map((r) => `<tr class="${runCls(r)}" data-id="${esc(r.id)}">
        <td><span class="rk"><span class="node"></span>${kindLabel(r)}</span></td>
        <td class="mono">${esc(util.fmtFull(r.started))}</td><td class="mono num">${durHtml(r)}</td>
        <td class="mono num">${num(r.found)}</td><td class="mono num">${num(r.downloaded)}</td><td class="mono num">${num(r.errors, true)}</td>
        <td class="note" title="${esc(r.note || '')}">${boTag(r)}${esc(r.note || '')}</td></tr>`).join('')}</tbody></table>`;
  }
  function renderRuns(animate, flashId) {
    const host = $('#runs', el);
    const list = runs.filter((r) => !kind || r.kind === kind);
    const wide = runsView === 'table';
    $('#logwrap', el).classList.toggle('runs-wide', wide);
    host.classList.toggle('timeline', !wide);
    host.innerHTML = list.length ? (wide ? tableHtml(list) : timelineHtml(list))
      : `<div class="log-none">${t(runs.length ? 'log.no_runs_kind' : 'log.no_runs')}</div>`;
    $('#runs-sum', el).textContent = list.length ? t(list.length === 1 ? 'log.runs_sum_one' : 'log.runs_sum', {
      n: list.length, dl: util.fmtNum(list.reduce((a, r) => a + (r.downloaded || 0), 0)), err: util.fmtNum(list.reduce((a, r) => a + (r.errors || 0), 0)),
    }) : '';
    $$('#runs-view button', el).forEach((b) => { const sel = b.dataset.v === runsView; b.classList.toggle('on', sel); b.setAttribute('aria-pressed', sel); });
    $$('#runs-kind button', el).forEach((b) => { const sel = b.dataset.kind === kind; b.classList.toggle('on', sel); b.setAttribute('aria-pressed', sel); });
    if (animate) fx.stagger(wide ? $('tbody', host) : host);
    if (flashId != null) fx.flash(host.querySelector(`[data-id="${CSS.escape(String(flashId))}"]`));
  }
  /** Lauf einfügen oder aktualisieren (Event «run»). */
  function upsertRun(r) {
    if (!r || r.id == null) return;
    const i = runs.findIndex((x) => x.id === r.id);
    if (i >= 0) runs[i] = r; else runs.unshift(r);
    runs.sort((a, b) => (util.parseDate(b.started) || 0) - (util.parseDate(a.started) || 0) || b.id - a.id);
    if (runs.length > MAX_RUNS) runs.length = MAX_RUNS;
    renderRuns(false, r.id);
  }

  async function refresh(animate) {
    const r = await HC.bridge.safe('get_log');
    if (r) { lines = (r.lines || []).slice(-MAX); runs = (r.runs || []).slice(0, MAX_RUNS); }
    renderLog();
    renderRuns(animate);
    requestAnimationFrame(() => { if (follow) toEnd(); settling = false; });
  }
  const refreshRuns = util.debounce(async () => {
    if (HC.app.current() !== 'log') return;
    const r = await HC.bridge.safe('get_log');
    if (r) { runs = (r.runs || []).slice(0, MAX_RUNS); renderRuns(); }
  }, 400);

  function init(root) {
    el = root;
    loadPrefs();
    el.innerHTML = `
      <div class="view-head"><h2 class="glitch" data-text="${t('log.title')}">${t('log.title')}</h2><span class="sub">${t('log.sub')}</span>
        <div class="actions"><button class="btn ghost" id="log-open" title="${esc(t('log.open_logs_title'))}">${I.folder}${t('log.open_logs')}</button></div></div>
      <div class="logwrap" id="logwrap">
        <div class="logcol" id="log-col">
          <div class="colhead"><h3>${t('log.live')}</h3><span class="mono muted colmeta" id="log-count"></span>
            <button type="button" class="follow on" id="log-follow" title="${esc(t('log.follow_title'))}" aria-pressed="true"><span class="led"></span><span></span></button>
          </div>
          <div class="logtools">
            <div class="seg" id="log-levels">${LEVELS.map((l) => `<button type="button" class="${on.has(l) ? 'on' : ''}" data-lvl="${l}" aria-pressed="${on.has(l)}" title="${esc(t('log.lvl_title', { lvl: t('log.lvl_' + l) }))}">${t('log.lvl_' + l)}<i>0</i></button>`).join('')}</div>
            <div class="search-wrap log-search">${I.search}<input class="input" id="log-q" placeholder="${esc(t('log.search'))}" spellcheck="false" autocomplete="off"></div>
            <button type="button" class="btn sm ghost" id="log-copy" title="${esc(t('log.copy_title'))}">${I.copy}${t('log.copy')}</button>
          </div>
          <div class="logframe">
            <div class="log" id="logbox" tabindex="0" role="log" aria-label="${esc(t('log.live'))}"></div>
            <button type="button" class="log-jump" id="log-jump" hidden>${I.down}<span></span></button>
          </div>
        </div>
        <div class="logcol" id="runs-col">
          <div class="colhead"><h3>${t('log.history')}</h3><span class="mono muted colmeta" id="runs-sum"></span>
            <div class="seg icon" id="runs-view" title="${esc(t('log.view_title'))}">
              <button type="button" data-v="timeline" title="${esc(t('log.timeline'))}" aria-label="${esc(t('log.timeline'))}">${I.timeline}</button>
              <button type="button" data-v="table" title="${esc(t('log.table'))}" aria-label="${esc(t('log.table'))}">${I.table}</button>
            </div>
          </div>
          <div class="logtools"><div class="seg" id="runs-kind"><button type="button" data-kind="">${t('log.kind_all')}</button>${KINDS.map((k) => `<button type="button" data-kind="${k}">${t('run_kind.' + k)}</button>`).join('')}</div></div>
          <div class="runs" id="runs"></div>
        </div>
      </div>`;
    box = $('#logbox', el);

    $('#log-levels', el).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const l = b.dataset.lvl;
      if (on.has(l)) on.delete(l); else on.add(l);
      b.classList.toggle('on', on.has(l));
      b.setAttribute('aria-pressed', on.has(l));
      savePrefs();
      renderLog();
    });
    $('#log-q', el).addEventListener('input', util.debounce(() => { query = util.norm($('#log-q', el).value.trim()); renderLog(); }, 120));
    $('#log-q', el).addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target.value) { e.target.value = ''; query = ''; renderLog(); } });
    $('#log-copy', el).addEventListener('click', copyVisible);
    $('#log-open', el).addEventListener('click', async () => {
      const r = await HC.bridge.safe('open_path', 'logs');
      if (r && r.ok) ui.toast(t('toast.folder_opening'), 'info', 1600);
      else if (r) ui.toast(r.error || t('err.generic'), 'err');
    });
    $('#log-follow', el).addEventListener('click', () => setFollow(!follow));
    $('#log-jump', el).addEventListener('click', () => setFollow(true));
    /* Hochscrollen pausiert das Mitlaufen, zurück am Ende läuft es weiter. */
    box.addEventListener('scroll', () => {
      if (settling || !box.clientHeight) return;
      const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 24;
      if (atEnd !== follow) setFollow(atEnd);
    }, { passive: true });
    box.addEventListener('keydown', (e) => { if (e.key === 'End') setFollow(true); });

    $('#runs-view', el).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b || b.dataset.v === runsView) return;
      runsView = b.dataset.v;
      savePrefs();
      renderRuns(true);
      if (follow) toEnd();
    });
    $('#runs-kind', el).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-kind]');
      if (!b) return;
      kind = b.dataset.kind;
      renderRuns(true);
    });

    HC.bridge.on('log', append);
    HC.bridge.on('run', upsertRun);
    /* Laufende Läufe zählen im Backend weiter: Zahlen nachladen, solange die Ansicht offen ist. */
    ['watchlist_done', 'done', 'failed'].forEach((ev) => HC.bridge.on(ev, refreshRuns));
  }

  HC.views.log = {
    init,
    /** arg «runs» öffnet die Lauf-Historie als Tabelle (#log/runs). */
    show(arg, changed) {
      if (arg === 'runs') runsView = 'table';
      settling = true;
      if (follow) toEnd();
      refresh(changed);
    },
    reset() { lines = []; runs = []; follow = true; unseen = 0; },
  };
})();
