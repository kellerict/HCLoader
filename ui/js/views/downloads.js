/* =====================================================================
   views/downloads.js – Warteschlange mit Live-Fortschritt
   Struktur kommt über get_queue() (Event "queue"), Fortschritt über "progress".
   Elemente werden per ID wiederverwendet, damit Balken weich weiterlaufen.

   Throttle sichtbar machen:
   - Phase "sleep": Pause (30–120 s) vor dem nächsten Download mit Countdown. Die UI zählt
     selbst herunter (ein Event zu Beginn genügt), weitere Events korrigieren die Restzeit.
   - Blockiert: Backoff, Tages- oder Lauf-Limit, Neustart nötig, anderer Lauf aktiv,
     lokale Probleme (PO-Token-Server «pot», Zielordner «target», Download-Modul «error»)
     -> Hinweis «Rest bleibt in der Warteschlange».
     Quelle: queue.blocked_code (+ blocked_reason als Text), sonst Status + Limits.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, util, fx, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const STEPS = ['download', 'convert', 'tag'];

  let el;
  let queue = { paused: false, items: [] };
  let first = true;
  let sleep = null; // {id, end (ms, Date.now-Basis), total (s)}
  let ticker = null;

  /* ---------- Pause zwischen Downloads ---------- */
  const sleepLeft = () => (sleep ? Math.max(0, Math.ceil((sleep.end - Date.now()) / 1000)) : 0);
  function setSleep(id, eta, total) {
    const left = Math.max(0, +eta || 0);
    const same = sleep && sleep.id === id;
    sleep = { id, end: Date.now() + left * 1000, total: Math.max(left, +total || 0, same ? sleep.total : 0) || 1 };
    if (!ticker) ticker = setInterval(tickSleep, 500);
  }
  function clearSleep() {
    sleep = null;
    clearInterval(ticker);
    ticker = null;
  }
  function tickSleep() {
    if (!sleep) return clearSleep();
    const q = queue.items.find((x) => x.id === sleep.id);
    if (!q || q.phase !== 'sleep') { clearSleep(); renderLimits(); return; }
    q.eta = sleepLeft();
    const node = el.querySelector(`.qitem[data-id="${CSS.escape(q.id)}"]`);
    if (node) patch(node, q);
    paintSleepTile();
  }
  /** Sleep-Zustand aus einer frisch geladenen Queue übernehmen. */
  function adoptSleep() {
    const q = queue.items.find((x) => x.state !== 'failed' && x.phase === 'sleep');
    if (!q) return clearSleep();
    /* Läuft der Countdown schon für diesen Eintrag, nur bei deutlicher Abweichung neu setzen. */
    if (!sleep || sleep.id !== q.id || Math.abs(sleepLeft() - (q.eta || 0)) > 2) setSleep(q.id, q.eta, q.sleep_total);
    q.eta = sleepLeft();
  }

  /* ---------- Warum läuft nichts? ---------- */
  const CODES = ['restart', 'backoff', 'day_limit', 'run_limit', 'busy', 'pot', 'target', 'error'];
  /* Lokale Sperren: Text-Schlüssel und Einstellungs-Tab, in dem man sie behebt. */
  const LOCAL = { pot: 'settings/network', target: 'settings/storage', error: 'settings/maintenance' };
  const waitingCount = () => queue.items.filter((q) => q.state === 'waiting').length;
  function blockedReason() {
    const s = HC.status, th = HC.settings.values.throttle;
    if (CODES.includes(queue.blocked_code)) return queue.blocked_code;
    if (s && s.backoff && s.backoff.active && waitingCount()) return 'backoff';
    if ('blocked_code' in queue || !s) return null; // Backend sagt ausdrücklich: nicht blockiert
    const busy = queue.items.some((q) => q.state === 'active' || q.phase === 'sleep');
    if (busy || !waitingCount()) return null;
    if (s.counters.downloads_day >= th.max_downloads_per_day) return 'day_limit';
    if (s.counters.downloads_run >= th.max_downloads_per_run) return 'run_limit';
    return null;
  }

  const canUp = (items, i) => i > 0 && items[i].state === 'waiting' && items[i - 1].state === 'waiting';
  const canDown = (items, i) => i < items.length - 1 && items[i].state === 'waiting' && items[i + 1].state === 'waiting';
  const WHY = { restart: 'why_restart', backoff: 'why_backoff', day_limit: 'why_day', run_limit: 'why_run', busy: 'why_busy', paused: 'why_paused', pot: 'why_pot', target: 'why_target', error: 'why_error' };
  let why = null; // Grund, der bei wartenden Einträgen steht
  const sig = (q, i, items) => `${q.state}|${q.phase}|${i}|${canUp(items, i)}|${canDown(items, i)}|${why}`;

  function inner(q, i, items) {
    const v = q.video, active = q.state === 'active', failed = q.state === 'failed';
    let info;
    if (failed) {
      info = `<span class="phase">${t('phase.failed')}</span><span class="err" title="${esc(q.error || '')}">${esc(q.error || '')}</span>`;
    } else if (active) {
      const step = STEPS.indexOf(q.phase);
      info = `<span class="phase">${esc(t('phase.' + q.phase))}</span>
        <span class="steps" title="${esc(t('downloads.steps'))}">${STEPS.map((s, k) => `<i class="${k <= step ? 'on' : ''}"></i>`).join('')}</span>
        <span><b data-f="pct"></b></span><span data-w="speed"><b data-f="speed"></b> MB/s</span><span data-w="eta">${t('downloads.eta')} <b data-f="eta"></b></span>`;
    } else if (q.phase === 'sleep') {
      const th = HC.settings.values.throttle;
      info = `<span class="phase" title="${esc(t('downloads.sleep_why', { min: th.sleep_interval, max: th.max_sleep_interval }))}">${I.clock}${t('phase.sleep')}</span><span class="countdown">${t('downloads.sleep_left')} <b data-f="eta"></b></span>`;
    } else {
      info = `<span class="phase">${why ? t('downloads.blocked_wait', { why: t('downloads.' + WHY[why]) }) : t('phase.waiting')}</span><span>${t('downloads.position', { n: i + 1 })}</span>`;
    }
    const sleeping = !active && !failed && q.phase === 'sleep';
    const actions = failed
      ? `<button class="btn sm" data-act="retry">${I.retry}${t('downloads.retry')}</button><button class="iconbtn danger" data-act="cancel" title="${esc(t('downloads.remove'))}">${I.x}</button>`
      : `${active ? '' : `<button class="iconbtn" data-act="up" title="${esc(t('downloads.up'))}" ${canUp(items, i) ? '' : 'disabled'}>${I.up}</button><button class="iconbtn" data-act="down" title="${esc(t('downloads.down'))}" ${canDown(items, i) ? '' : 'disabled'}>${I.down}</button>`}
         <button class="btn sm ghost danger" data-act="cancel">${t('downloads.cancel')}</button>`;
    return `${ui.thumb(v)}<span class="dur">${util.fmtDur(v.duration)}</span></div>
      <div style="min-width:0"><div class="qtitle" title="${esc(v.title)}">${esc(v.title)}</div>
        <div class="progress"><div class="bar ${failed ? 'fail' : active ? 'kick' : sleeping ? 'sleep' : 'idle'}" style="--p:${failed || active ? q.pct : 0}"></div></div>
        <div class="qinfo">${info}<span class="path" title="${esc(q.target || '')}">${ui.genreDot(v.genre)} · ${esc(v.channel_name)}</span></div></div>
      <div class="qactions">${actions}</div>`;
  }
  function patch(node, q) {
    const set = (f, val) => { const e = node.querySelector(`[data-f=${f}]`); if (e) e.textContent = val; };
    const bar = node.querySelector('.bar');
    const sleeping = q.state !== 'active' && q.phase === 'sleep';
    /* Der Balken ist immer 100 % breit und wird nur verschoben (--p -> transform, kein Layout). */
    if (q.state === 'active' && bar) bar.style.setProperty('--p', q.pct);
    else if (sleeping && bar) bar.style.setProperty('--p', sleep && sleep.id === q.id ? Math.min(100, (sleepLeft() / sleep.total) * 100) : 0);
    set('pct', `${Math.floor(q.pct)}%`);
    set('speed', (q.speed || 0).toFixed(1));
    set('eta', sleeping ? util.fmtDur(q.eta || 0) : util.fmtSpan(q.eta || 0));
    const dl = q.phase === 'download';
    node.querySelectorAll('[data-w]').forEach((e) => { e.hidden = !dl; });
  }

  function renderList(host, items, emptyHtml) {
    const kids = Array.from(host.children).filter((c) => c.dataset.id);
    const have = new Map(kids.map((c) => [c.dataset.id, c]));
    const keep = new Set(items.map((q) => q.id));
    const animate = !first && !fx.reduced() && host.offsetParent !== null;
    const before = animate ? new Map(kids.map((c) => [c, c.offsetTop])) : null;
    host.querySelectorAll('.empty').forEach((e) => e.remove());
    /* Einträge, die verschwinden, zuerst aus dem Fluss nehmen: Sie blenden an ihrem Platz aus, während die
       übrigen sofort nachrücken (FLIP unten). So steht nie eine halb ausgeblendete Zeile neben der nächsten. */
    have.forEach((node, id) => {
      if (keep.has(id)) return;
      delete node.dataset.id;
      if (!animate) { node.remove(); return; }
      const v = HC.store.get(id);
      node.style.cssText = `position:absolute;left:${node.offsetLeft}px;top:${node.offsetTop}px;width:${node.offsetWidth}px;margin:0`;
      if (v && v.status === 'done') {
        /* fertig geladen: als «Geladen» verabschieden, nicht in der letzten Zwischenphase */
        node.classList.add('done');
        const ph = node.querySelector('.phase'), bar = node.querySelector('.bar');
        if (ph) ph.textContent = t('status.done');
        if (bar) bar.style.setProperty('--p', 100);
      }
      host.appendChild(node);
      void node.offsetWidth;
      node.classList.add('leave');
      setTimeout(() => node.remove(), 240);
    });
    items.forEach((q, i) => {
      let node = have.get(q.id);
      const s = sig(q, i, items);
      if (!node) {
        node = document.createElement('div');
        node.dataset.id = q.id;
        if (!first) node.classList.add('enter');
      }
      node.className = `qitem ${q.state === 'active' ? 'active' : q.state === 'failed' ? 'failed' : 'waiting'}${q.state === 'waiting' && q.phase === 'sleep' ? ' sleep' : ''}${node.classList.contains('enter') ? ' enter' : ''}`;
      if (node._sig !== s) { node.innerHTML = inner(q, i, items); node._sig = s; }
      patch(node, q);
      if (host.children[i] !== node) host.insertBefore(node, host.children[i] || null);
    });
    if (before) {
      before.forEach((top, node) => {
        if (!node.dataset.id) return;
        const dy = top - node.offsetTop;
        if (dy && node.animate) node.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    }
    if (!items.length && emptyHtml && !host.querySelector('.empty')) host.insertAdjacentHTML('beforeend', emptyHtml);
  }

  function render() {
    adoptSleep();
    why = blockedReason() || (queue.paused ? 'paused' : null);
    const act = queue.items.filter((q) => q.state !== 'failed');
    const failed = queue.items.filter((q) => q.state === 'failed');
    renderList($('#q-list', el), act, `<div class="empty">${I.download}<h4>${t('downloads.empty_title')}</h4>${t('downloads.empty_text')}</div>`);
    renderList($('#q-failed', el), failed);
    $('#q-failed-wrap', el).hidden = !failed.length;
    $('#q-count', el).textContent = act.length;
    $('#q-failed-count', el).textContent = failed.length;
    const pb = $('#q-pause', el);
    pb.innerHTML = `${queue.paused ? I.play : I.pause}${t(queue.paused ? 'downloads.resume' : 'downloads.pause')}`;
    pb.classList.toggle('primary', queue.paused);
    $('#q-list', el).classList.toggle('paused', queue.paused);
    $('#q-list', el).classList.toggle('blocked', !!why && why !== 'paused');
    renderNotice();
    paintSleepTile();
    first = false;
  }
  function renderNotice() {
    const s = HC.status, th = HC.settings.values.throttle, box = $('#q-notice', el);
    const reason = blockedReason(), rest = waitingCount();
    const link = `<button class="linkbtn" data-goto="settings/throttle">${t('downloads.limits_link')}</button>`;
    let html = '';
    const bo = s && s.backoff && s.backoff.active ? s.backoff : null;
    if (bo && (reason === 'backoff' || !rest)) {
      html = ui.notice('error', t(rest ? 'downloads.backoff_rest' : 'downloads.backoff', { t: esc(util.fmtWhen(bo.until)), rest: esc(util.fmtSpan(bo.remaining_s)), n: `<b>${rest}</b>` }));
    } else if (reason === 'day_limit' && s) {
      html = ui.notice('warn', `${t(rest ? 'downloads.limit_day_rest' : 'downloads.limit_day', { n: s.counters.downloads_day, max: th.max_downloads_per_day, rest: `<b>${rest}</b>` })} ${link}`);
    } else if (reason === 'run_limit' && s) {
      /* «Fortsetzen» (set_queue_paused(false)) startet im Backend einen neuen Lauf. */
      html = ui.notice('warn', `<div class="notice-row"><span>${t(rest ? 'downloads.limit_run_rest' : 'downloads.limit_run', { max: th.max_downloads_per_run, rest: `<b>${rest}</b>` })} ${link}</span>
        <button class="btn sm" data-newrun ${queue.paused ? 'disabled' : ''}>${I.play}${t('downloads.new_run')}</button></div>`);
    } else if (reason === 'restart') {
      html = ui.notice('error', t('downloads.need_restart'));
    } else if (LOCAL[reason]) {
      /* Lokales Problem (kein YouTube-Request): Einträge bleiben wartend; Details vom Backend. */
      const fix = `<button class="linkbtn" data-goto="${LOCAL[reason]}">${t('downloads.local_link_' + reason)}</button>`;
      const detail = queue.blocked_reason ? `<br>${esc(queue.blocked_reason)}` : '';
      html = ui.notice(reason === 'error' ? 'error' : 'warn', `${t('downloads.local_' + reason, { rest: `<b>${rest}</b>` })} ${fix}${detail}`);
    } else if (reason) {
      /* busy, Backoff ohne Status-Details oder künftige Gründe: Text des Backends, sonst eigener. */
      html = ui.notice(reason === 'backoff' ? 'error' : 'info', queue.blocked_reason ? esc(queue.blocked_reason) : t('downloads.busy'));
    }
    if (queue.paused) html += ui.notice('warn', t('downloads.paused'));
    if (box._html !== html) { box.innerHTML = html; box._html = html; }
    box.hidden = !html;
    /* Der Grund steht auch an den wartenden Einträgen -> bei Wechsel neu zeichnen. */
    const next = reason || (queue.paused ? 'paused' : null);
    if (next !== why && !first) render();
  }
  /** Kachel «Pause zw. Downloads»: Bereich aus den Einstellungen, während der Pause der Countdown. */
  function paintSleepTile() {
    const th = HC.settings.values.throttle, tile = $('#l-sleep-tile', el);
    if (!tile) return;
    const on = !!sleep && queue.items.some((q) => q.id === sleep.id && q.phase === 'sleep');
    tile.classList.toggle('counting', on);
    $('.k', tile).textContent = t(on ? 'downloads.sleeping' : 'downloads.l_sleep');
    $('#l-sleep', el).innerHTML = on
      ? `${util.fmtDur(sleepLeft())} <small>${t('downloads.sleep_range', { min: th.sleep_interval, max: th.max_sleep_interval })}</small>`
      : `${th.sleep_interval}–${th.max_sleep_interval} <small>s</small>`;
    $('#m-sleep', el).firstElementChild.style.transform = `scaleX(${on ? Math.min(1, sleepLeft() / sleep.total) : 0})`;
  }
  function renderLimits() {
    const s = HC.status, th = HC.settings.values.throttle;
    if (!s) return;
    const meter = (id, n, max) => {
      const m = $(id, el);
      m.firstElementChild.style.transform = `scaleX(${Math.min(1, n / max)})`;
      m.classList.toggle('full', n >= max);
      m.parentElement.classList.toggle('full', n >= max);
    };
    fx.count($('#l-run', el), s.counters.downloads_run);
    $('#l-run-max', el).textContent = `/ ${th.max_downloads_per_run}`;
    meter('#m-run', s.counters.downloads_run, th.max_downloads_per_run);
    fx.count($('#l-day', el), s.counters.downloads_day);
    $('#l-day-max', el).textContent = `/ ${th.max_downloads_per_day}`;
    meter('#m-day', s.counters.downloads_day, th.max_downloads_per_day);
    $('#l-rate', el).innerHTML = th.limit_rate_mb ? `${th.limit_rate_mb.toFixed(1)} <small>MB/s</small>` : `<small>${t('downloads.unlimited')}</small>`;
    $('#q-summary', el).textContent = t('downloads.summary', { day: s.counters.downloads_day, day_max: th.max_downloads_per_day, run: s.counters.downloads_run, run_max: th.max_downloads_per_run });
    paintSleepTile();
    renderNotice();
  }
  async function refresh() {
    const q = await HC.bridge.safe('get_queue');
    if (q) { queue = q; HC.store.put(q.items.map((x) => x.video)); render(); }
  }

  function init(root) {
    el = root;
    const tile = (k, body) => `<div class="limit"><div class="k">${t(k)}</div>${body}</div>`;
    el.innerHTML = `
      <div class="view-head"><h2 class="glitch" data-text="${t('downloads.title')}">${t('downloads.title')}</h2><span class="sub">${t('downloads.sub')}</span>
        <div class="actions"><button class="btn" id="q-pause"></button></div></div>
      <div class="scroll">
        <div class="limits">
          ${tile('downloads.l_run', '<div class="v"><span id="l-run">0</span> <small id="l-run-max"></small></div><div class="meter" id="m-run"><i style="transform:scaleX(0)"></i></div>')}
          ${tile('downloads.l_day', '<div class="v"><span id="l-day">0</span> <small id="l-day-max"></small></div><div class="meter" id="m-day"><i style="transform:scaleX(0)"></i></div>')}
          ${tile('downloads.l_rate', '<div class="v" id="l-rate"></div>')}
          <div class="limit" id="l-sleep-tile"><div class="k">${t('downloads.l_sleep')}</div><div class="v" id="l-sleep"></div><div class="meter sleep" id="m-sleep"><i style="transform:scaleX(0)"></i></div></div>
        </div>
        <div id="q-notice" hidden style="margin-bottom:16px"></div>
        <div class="section-label">${t('downloads.sec_queue')} <span class="mono" id="q-count" style="font-size:12px"></span><span class="mono q-summary" id="q-summary"></span></div>
        <div id="q-list"></div>
        <div id="q-failed-wrap" hidden>
          <div class="section-label">${t('downloads.sec_failed')} <span class="mono" id="q-failed-count" style="font-size:12px"></span></div>
          <div id="q-failed"></div>
        </div>
      </div>`;
    /* Aktion ausführen, Rückmeldung als Toast; die Liste selbst kommt über das Event «queue» (sicherheitshalber auch direkt). */
    const act = async (name, args, okMsg, kind) => {
      const r = await HC.bridge.safe(name, ...args);
      if (r && r.ok) { if (okMsg) ui.toast(okMsg, kind || 'info', 2200); } else if (r) ui.toast(r.error || t('err.generic'), 'err');
      if (r) refresh();
      return r;
    };
    $('#q-pause', el).onclick = async () => {
      const to = !queue.paused, b = $('#q-pause', el);
      b.disabled = true;
      const r = await act('set_queue_paused', [to], t(to ? 'toast.queue_paused' : 'toast.queue_resumed'), to ? 'warn' : 'ok');
      b.disabled = false;
      if (r && r.ok && typeof r.paused === 'boolean') { queue.paused = r.paused; render(); }
    };
    el.addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto]');
      if (go) { const [view, arg] = go.dataset.goto.split('/'); HC.app.go(view, arg); return; }
      const nr = e.target.closest('[data-newrun]');
      if (nr && !nr.disabled) { nr.disabled = true; act('set_queue_paused', [false], t('toast.new_run'), 'ok'); return; }
      const b = e.target.closest('[data-act]'), node = e.target.closest('.qitem');
      if (!b || !node || b.disabled || !node.dataset.id) return;
      const id = node.dataset.id, a = b.dataset.act;
      const q = queue.items.find((x) => x.id === id);
      const title = (q && q.video && q.video.title) || id;
      if (a === 'up') act('queue_move', [id, -1]);
      else if (a === 'down') act('queue_move', [id, 1]);
      else if (a === 'retry') act('queue_retry', [id], t('toast.queue_retry', { title }), 'ok');
      else if (a === 'cancel') act('queue_cancel', [id], t(q && q.state === 'failed' ? 'toast.queue_removed' : 'toast.queue_cancelled', { title }), 'warn');
    });
    HC.bridge.on('queue', refresh);
    HC.bridge.on('progress', (d) => {
      const q = queue.items.find((x) => x.id === d.id);
      if (!q) return;
      const phase = q.phase, state = q.state;
      Object.assign(q, d);
      if (d.phase === 'sleep') { q.state = 'waiting'; setSleep(q.id, d.eta, d.sleep_total); q.eta = sleepLeft(); }
      else if (d.phase !== 'waiting') { q.state = 'active'; if (sleep && sleep.id === q.id) clearSleep(); }
      if (phase !== q.phase || state !== q.state) return render();
      const node = el.querySelector(`.qitem[data-id="${CSS.escape(d.id)}"]`);
      if (node) patch(node, q);
      if (q.phase === 'sleep') paintSleepTile();
    });
    HC.bridge.on('done', refresh);
    HC.bridge.on('failed', refresh);
    HC.bridge.on('status_rendered', renderLimits);
    HC.bridge.on('settings_changed', renderLimits);
  }

  HC.views.downloads = { init, show() { renderLimits(); refresh(); }, reset() { first = true; clearSleep(); queue = { paused: false, items: [] }; } };
})();
