/* =====================================================================
   views/log.js – Protokoll: Live-Log (filterbar) und Lauf-Historie
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx } = HC;
  const { esc, pad } = util;
  const t = (k, v) => HC.t(k, v);
  const MAX = 500;
  const LEVELS = ['info', 'warn', 'error'];
  const TAG = { debug: 'DBG ', info: 'INFO', ok: ' OK ', warn: 'WARN', error: 'FEHL' };
  /* «ok» und «debug» gehören zur Stufe Info */
  const group = (lvl) => (lvl === 'warn' || lvl === 'error' ? lvl : 'info');

  let el;
  let lines = [];
  let runs = [];
  let follow = true;
  const on = new Set(LEVELS);

  const ts = (iso) => { const d = util.parseDate(iso); return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : '--:--:--'; };
  const lineHtml = (l, fresh) => `<div class="log-line ${esc(l.level)}${fresh ? ' new' : ''}"><span class="t">${ts(l.ts)}</span><span class="l">[${TAG[l.level] || 'INFO'}]</span><span class="m">${esc(l.msg)}</span></div>`;

  function renderLog() {
    const box = $('#logbox', el);
    const list = lines.filter((l) => on.has(group(l.level)));
    box.innerHTML = list.length ? list.map((l) => lineHtml(l)).join('') : `<div class="muted">${t('log.empty')}</div>`;
    if (follow) box.scrollTop = box.scrollHeight;
    $('#log-count', el).textContent = t('log.lines', { n: list.length });
  }
  function append(l) {
    lines.push(l);
    if (lines.length > MAX) lines.shift();
    if (!on.has(group(l.level))) return;
    const box = $('#logbox', el);
    if (!box.querySelector('.log-line')) box.innerHTML = '';
    box.insertAdjacentHTML('beforeend', lineHtml(l, true));
    while (box.children.length > MAX) box.firstChild.remove();
    if (follow) box.scrollTop = box.scrollHeight;
    $('#log-count', el).textContent = t('log.lines', { n: box.children.length });
  }
  function renderRuns(animate) {
    const box = $('#runs', el);
    box.innerHTML = runs.length ? runs.map((r) => {
      const a = util.parseDate(r.started), b = util.parseDate(r.finished);
      const sec = a && b ? Math.round((b - a) / 1000) : null;
      const dur = sec == null ? t('log.running') : sec < 60 ? `${sec} s` : sec < 3600 ? `${Math.round(sec / 60)} min` : `${Math.floor(sec / 3600)} h ${pad(Math.round((sec % 3600) / 60))} min`;
      const cls = r.errors ? (r.downloaded || r.found ? 'warn' : 'error') : '';
      return `<div class="run ${cls}">
        <div class="run-top"><b>${util.esc(t('run_kind.' + r.kind))}</b><span>${util.fmtDate(r.started)} · ${util.fmtTime(r.started)}</span></div>
        <div class="run-stats"><span>${t('log.found')} <b>${r.found}</b></span><span>${t('log.downloaded')} <b>${r.downloaded}</b></span><span class="${r.errors ? 'bad' : ''}">${t('log.errors')} <b>${r.errors}</b></span><span class="dur">${dur}</span></div>
        ${r.note ? `<div class="run-note">${esc(r.note)}</div>` : ''}</div>`;
    }).join('') : `<div class="muted" style="font-size:13px">${t('log.no_runs')}</div>`;
    if (animate) fx.stagger(box);
  }
  async function refresh(animate) {
    const r = await HC.bridge.safe('get_log');
    if (r) { lines = r.lines.slice(-MAX); runs = r.runs; }
    renderLog();
    renderRuns(animate);
  }

  function init(root) {
    el = root;
    el.innerHTML = `
      <div class="view-head"><h2 class="glitch" data-text="${t('log.title')}">${t('log.title')}</h2><span class="sub">${t('log.sub')}</span></div>
      <div class="logwrap">
        <div class="logcol">
          <div class="colhead"><h3>${t('log.live')}</h3><span class="mono muted" id="log-count" style="font-size:12px"></span>
            <div class="seg" id="log-levels">${LEVELS.map((l) => `<button type="button" class="on" data-lvl="${l}" aria-pressed="true">${t('log.lvl_' + l)}</button>`).join('')}</div>
            <label class="check" style="padding:0"><input type="checkbox" id="log-follow" checked>${t('log.follow')}</label>
          </div>
          <div class="log" id="logbox" tabindex="0"></div>
        </div>
        <div class="logcol">
          <div class="colhead"><h3>${t('log.history')}</h3></div>
          <div class="runs" id="runs"></div>
        </div>
      </div>`;
    $('#log-levels', el).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const l = b.dataset.lvl;
      if (on.has(l)) on.delete(l); else on.add(l);
      $$('button', $('#log-levels', el)).forEach((x) => { x.classList.toggle('on', on.has(x.dataset.lvl)); x.setAttribute('aria-pressed', on.has(x.dataset.lvl)); });
      renderLog();
    });
    $('#log-follow', el).addEventListener('change', (e) => { follow = e.target.checked; if (follow) renderLog(); });
    HC.bridge.on('log', append);
    HC.bridge.on('watchlist_done', () => { if (HC.app.current() === 'log') refresh(); });
  }

  HC.views.log = { init, show: (arg, changed) => refresh(changed) };
})();
