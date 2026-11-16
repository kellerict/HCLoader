/* =====================================================================
   views/downloads.js – Warteschlange mit Live-Fortschritt
   Struktur kommt über get_queue() (Event "queue"), Fortschritt über "progress".
   Elemente werden per ID wiederverwendet, damit Balken weich weiterlaufen.
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

  const canUp = (items, i) => i > 0 && items[i].state === 'waiting' && items[i - 1].state === 'waiting';
  const canDown = (items, i) => i < items.length - 1 && items[i].state === 'waiting' && items[i + 1].state === 'waiting';
  const sig = (q, i, items) => `${q.state}|${q.phase}|${i}|${canUp(items, i)}|${canDown(items, i)}`;

  function inner(q, i, items) {
    const v = q.video, active = q.state === 'active', failed = q.state === 'failed';
    let info;
    if (failed) {
      info = `<span class="phase">${t('phase.failed')}</span><span class="err" title="${esc(q.error || '')}">${esc(q.error || '')}</span>`;
    } else if (active) {
      const step = STEPS.indexOf(q.phase);
      info = `<span class="phase">${t('phase.' + q.phase)}</span>
        <span class="steps" title="${esc(t('downloads.steps'))}">${STEPS.map((s, k) => `<i class="${k <= step ? 'on' : ''}"></i>`).join('')}</span>
        <span><b data-f="pct"></b></span><span data-w="speed"><b data-f="speed"></b> MB/s</span><span data-w="eta">${t('downloads.eta')} <b data-f="eta"></b></span>`;
    } else if (q.phase === 'sleep') {
      info = `<span class="phase">${t('phase.sleep')}</span><span>${t('downloads.sleep_left')} <b data-f="eta"></b></span>`;
    } else {
      info = `<span class="phase">${t('phase.waiting')}</span><span>${t('downloads.position', { n: i + 1 })}</span>`;
    }
    const actions = failed
      ? `<button class="btn sm" data-act="retry">${I.retry}${t('downloads.retry')}</button><button class="iconbtn danger" data-act="cancel" title="${esc(t('downloads.remove'))}">${I.x}</button>`
      : `${active ? '' : `<button class="iconbtn" data-act="up" title="${esc(t('downloads.up'))}" ${canUp(items, i) ? '' : 'disabled'}>${I.up}</button><button class="iconbtn" data-act="down" title="${esc(t('downloads.down'))}" ${canDown(items, i) ? '' : 'disabled'}>${I.down}</button>`}
         <button class="btn sm ghost danger" data-act="cancel">${t('downloads.cancel')}</button>`;
    return `${ui.thumb(v)}<span class="dur">${util.fmtDur(v.duration)}</span></div>
      <div style="min-width:0"><div class="qtitle" title="${esc(v.title)}">${esc(v.title)}</div>
        <div class="progress"><div class="bar ${failed ? 'fail' : active ? 'kick' : 'idle'}" style="width:${failed || active ? q.pct : 0}%"></div></div>
        <div class="qinfo">${info}<span class="path" title="${esc(q.target || '')}">${ui.genreDot(v.genre)} · ${esc(v.channel_name)}</span></div></div>
      <div class="qactions">${actions}</div>`;
  }
  function patch(node, q) {
    const set = (f, val) => { const e = node.querySelector(`[data-f=${f}]`); if (e) e.textContent = val; };
    const bar = node.querySelector('.bar');
    if (q.state === 'active' && bar) bar.style.width = `${q.pct}%`;
    set('pct', `${Math.floor(q.pct)}%`);
    set('speed', (q.speed || 0).toFixed(1));
    set('eta', q.phase === 'sleep' ? `${q.eta} s` : util.fmtSpan(q.eta || 0));
    const dl = q.phase === 'download';
    node.querySelectorAll('[data-w]').forEach((e) => { e.hidden = !dl; });
  }

  function renderList(host, items, emptyHtml) {
    const have = new Map(Array.from(host.children).filter((c) => c.dataset.id).map((c) => [c.dataset.id, c]));
    const keep = new Set();
    host.querySelectorAll('.empty').forEach((e) => e.remove());
    items.forEach((q, i) => {
      let node = have.get(q.id);
      const s = sig(q, i, items);
      if (!node) {
        node = document.createElement('div');
        node.dataset.id = q.id;
        if (!first) node.classList.add('enter');
      }
      node.className = `qitem ${q.state}${node.classList.contains('enter') ? ' enter' : ''}`;
      if (node._sig !== s) { node.innerHTML = inner(q, i, items); node._sig = s; }
      patch(node, q);
      if (host.children[i] !== node) host.insertBefore(node, host.children[i] || null);
      keep.add(q.id);
    });
    have.forEach((node, id) => {
      if (keep.has(id) || node.classList.contains('leave')) return;
      node.classList.add('leave');
      delete node.dataset.id;
      setTimeout(() => node.remove(), fx.reduced() ? 0 : 210);
    });
    if (!items.length && emptyHtml && !host.querySelector('.empty')) host.insertAdjacentHTML('beforeend', emptyHtml);
  }

  function render() {
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
    renderNotice();
    first = false;
  }
  function renderNotice() {
    const s = HC.status, box = $('#q-notice', el);
    let html = '';
    if (s && s.backoff && s.backoff.active) html = ui.notice('error', t('downloads.backoff', { t: util.fmtWhen(s.backoff.until), rest: util.fmtSpan(s.backoff.remaining_s) }));
    else if (queue.paused) html = ui.notice('warn', t('downloads.paused'));
    if (box._html !== html) { box.innerHTML = html; box._html = html; }
    box.hidden = !html;
  }
  function renderLimits() {
    const s = HC.status, th = HC.settings.values.throttle;
    if (!s) return;
    const meter = (id, n, max) => {
      const m = $(id, el);
      m.firstElementChild.style.transform = `scaleX(${Math.min(1, n / max)})`;
      m.classList.toggle('full', n >= max);
    };
    fx.count($('#l-run', el), s.counters.downloads_run);
    $('#l-run-max', el).textContent = `/ ${th.max_downloads_per_run}`;
    meter('#m-run', s.counters.downloads_run, th.max_downloads_per_run);
    fx.count($('#l-day', el), s.counters.downloads_day);
    $('#l-day-max', el).textContent = `/ ${th.max_downloads_per_day}`;
    meter('#m-day', s.counters.downloads_day, th.max_downloads_per_day);
    $('#l-rate', el).innerHTML = th.limit_rate_mb ? `${th.limit_rate_mb.toFixed(1)} <small>MB/s</small>` : `<small>${t('downloads.unlimited')}</small>`;
    $('#l-sleep', el).innerHTML = `${th.sleep_interval}–${th.max_sleep_interval} <small>s</small>`;
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
          ${tile('downloads.l_sleep', '<div class="v" id="l-sleep"></div>')}
        </div>
        <div id="q-notice" hidden style="margin-bottom:16px"></div>
        <div class="section-label">${t('downloads.sec_queue')} <span class="mono" id="q-count" style="font-size:12px"></span></div>
        <div id="q-list"></div>
        <div id="q-failed-wrap" hidden>
          <div class="section-label">${t('downloads.sec_failed')} <span class="mono" id="q-failed-count" style="font-size:12px"></span></div>
          <div id="q-failed"></div>
        </div>
      </div>`;
    $('#q-pause', el).onclick = () => HC.bridge.safe('set_queue_paused', !queue.paused);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'), node = e.target.closest('.qitem');
      if (!b || !node || b.disabled || !node.dataset.id) return;
      const id = node.dataset.id, a = b.dataset.act;
      if (a === 'up') HC.bridge.safe('queue_move', id, -1);
      else if (a === 'down') HC.bridge.safe('queue_move', id, 1);
      else if (a === 'retry') HC.bridge.safe('queue_retry', id);
      else if (a === 'cancel') HC.bridge.safe('queue_cancel', id);
    });
    HC.bridge.on('queue', refresh);
    HC.bridge.on('progress', (d) => {
      const q = queue.items.find((x) => x.id === d.id);
      if (!q) return;
      const phase = q.phase;
      Object.assign(q, d);
      if (d.phase !== 'sleep' && d.phase !== 'waiting') q.state = 'active';
      if (phase !== q.phase) return render();
      const node = el.querySelector(`.qitem[data-id="${CSS.escape(d.id)}"]`);
      if (node) patch(node, q);
    });
    HC.bridge.on('status_rendered', renderLimits);
    HC.bridge.on('settings_changed', renderLimits);
  }

  HC.views.downloads = { init, show() { renderLimits(); refresh(); }, reset() { first = true; } };
})();
