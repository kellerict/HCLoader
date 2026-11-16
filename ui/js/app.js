/* =====================================================================
   app.js – Start, Router/Navigation, Statusleiste, gemeinsamer Zustand
   Ansichten registrieren sich unter HC.views.<name> = {init(el), show(arg)}.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx } = HC;
  const t = (k, v) => HC.t(k, v);

  const VIEWS = ['discover', 'inbox', 'watchlist', 'downloads', 'library', 'log', 'settings'];
  HC.views = HC.views || {};
  HC.settings = { values: null, defaults: null };
  HC.status = null;

  /* ---------- Gemeinsamer Video-Speicher (gleiche Objekte in allen Ansichten) ---------- */
  const videos = new Map();
  HC.store = {
    put(list) {
      return (list || []).map((v) => {
        const cur = videos.get(v.id);
        if (cur) return Object.assign(cur, v);
        videos.set(v.id, v);
        return v;
      });
    },
    get: (id) => videos.get(id),
    patch(id, fields) {
      const v = videos.get(id);
      if (v) Object.assign(v, fields);
      return v;
    },
  };

  /* ---------- Genres aus den Einstellungen ---------- */
  const FALLBACK = '#6b6b78';
  HC.genres = {
    list: () => (HC.settings.values ? HC.settings.values.genres.items : []),
    names: () => HC.genres.list().map((g) => g.name),
    color(name) {
      const g = HC.genres.list().find((x) => x.name === name);
      return g && /^#[0-9a-f]{6}$/i.test(g.color) ? g.color : FALLBACK;
    },
    ink: (name) => util.inkFor(HC.genres.color(name)),
  };

  /* ---------- Darstellung (appearance.*) ---------- */
  function applyAppearance(a) {
    const ap = a || HC.settings.values.appearance;
    document.body.classList.toggle('reduced', !!ap.reduce_effects);
    document.body.classList.toggle('no-scanlines', !ap.scanlines);
    const bpm = Math.min(300, Math.max(60, +ap.pulse_bpm || 200));
    document.documentElement.style.setProperty('--bpm', bpm);
  }

  /* ---------- Statische Texte/Icons aus i18n ins Markup ---------- */
  function applyI18n() {
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    $$('[data-icon]').forEach((el) => { el.insertAdjacentHTML('afterbegin', HC.icons[el.dataset.icon] || ''); });
    document.title = t('app.title');
  }

  /* ---------- Navigation ---------- */
  let current = null;
  function moveIndicator() {
    const ind = $('#nav-ind'), item = $('.nav-item.active');
    if (!ind || !item) return;
    ind.style.height = `${item.offsetHeight}px`;
    ind.style.transform = `translateY(${item.offsetTop}px)`;
    ind.classList.add('on');
  }
  function go(name, arg) {
    if (!VIEWS.includes(name)) name = 'discover';
    HC.ui.closeMenu();
    const changed = current !== name;
    current = name;
    document.body.dataset.view = name;
    $$('.nav-item').forEach((n) => {
      const on = n.dataset.view === name;
      n.classList.toggle('active', on);
      if (on) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current');
    });
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `v-${name}`));
    moveIndicator();
    const view = HC.views[name];
    if (view && view.show) view.show(arg, changed);
    try { history.replaceState(null, '', `#${name}${arg ? `/${arg}` : ''}`); } catch (e) { /* file:// – egal */ }
  }
  function wireNav() {
    $('#nav').addEventListener('click', (e) => {
      const n = e.target.closest('.nav-item');
      if (n) go(n.dataset.view);
    });
    $('#nav').addEventListener('keydown', (e) => {
      const n = e.target.closest('.nav-item');
      if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(n.dataset.view); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key >= '1' && e.key <= '7') { e.preventDefault(); go(VIEWS[+e.key - 1]); }
    });
    window.addEventListener('resize', moveIndicator);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);
  }

  /* ---------- Badges ---------- */
  function setBadge(el, n) {
    if (!el) return;
    const prev = el._n;
    el._n = n;
    el.textContent = n;
    el.hidden = !n;
    if (prev != null && n > prev) fx.pop(el);
  }

  /* ---------- Statusleiste ---------- */
  const led = (el, cls) => { if (el) el.className = `led ${cls || ''}`; };
  function renderStatus() {
    const s = HC.status, th = HC.settings.values.throttle;
    if (!s) return;
    $('#sb-ytdlp').textContent = s.ytdlp_version || t('statusbar.missing');
    led($('#sb-ytdlp-led'), s.ytdlp_version ? '' : 'err');
    $('#sb-deno').textContent = s.deno_ok ? t('statusbar.ok') : t('statusbar.missing');
    led($('#sb-deno-led'), s.deno_ok ? '' : 'err');
    $('#sb-ffmpeg').textContent = s.ffmpeg_ok ? t('statusbar.ok') : t('statusbar.missing');
    led($('#sb-ffmpeg-led'), s.ffmpeg_ok ? '' : 'err');

    const po = s.po_token || {};
    $('#sb-pot').textContent = po.state === 'active' ? t('statusbar.po_active', { mode: t(`po_mode.${po.mode}`) }) : t(`statusbar.po_${po.state || 'inactive'}`);
    led($('#sb-pot-led'), po.state === 'active' ? 'live' : po.state === 'error' ? 'err blink' : 'off');
    $('#sb-pot-it').title = po.detail || '';

    const bo = s.backoff || {};
    $('#sb-backoff').textContent = bo.active ? t('statusbar.backoff_until', { t: util.fmtWhen(bo.until), rest: util.fmtSpan(bo.remaining_s) }) : t('statusbar.backoff_none');
    led($('#sb-backoff-led'), bo.active ? 'warn blink' : 'off');
    $('#sb-backoff-it').classList.toggle('alert', !!bo.active);

    const qn = s.queue_length || 0;
    fx.count($('#sb-queue'), qn);
    $('#sb-queue-sfx').textContent = s.queue_paused && qn ? ` ${t('statusbar.queue_paused')}` : qn ? ` ${t('statusbar.queue_active')}` : '';
    $('#sb-queue').hidden = !qn;
    $('#sb-queue-empty').hidden = !!qn;
    led($('#sb-queue-led'), !qn ? 'off' : s.queue_paused ? 'warn' : 'live');

    fx.count($('#sb-day'), s.counters.downloads_day);
    $('#sb-day-max').textContent = th.max_downloads_per_day;
    $('#sb-next').textContent = s.next_check ? util.fmtWhen(s.next_check) : t('statusbar.next_off');

    fx.count($('#nf-today'), s.counters.downloads_day);
    $('#nf-today-max').textContent = th.max_downloads_per_day;
    $('#nf-next').textContent = s.next_check ? util.fmtTime(s.next_check) : '–';

    setBadge($('#b-inbox'), s.inbox_count || 0);
    setBadge($('#b-queue'), qn);
  }
  function setStatus(s) {
    if (!s) return;
    HC.status = s;
    renderStatus();
    HC.bridge.emit('status_rendered', s);
  }

  /* ---------- Events von Python ---------- */
  function wireEvents() {
    const B = HC.bridge;
    B.on('status', setStatus);
    B.on('video', (d) => { HC.store.patch(d.id, d.genre ? { status: d.status, genre: d.genre } : { status: d.status }); });
    B.on('done', (d) => HC.ui.toast(t('toast.done', { title: d.title })));
    B.on('failed', (d) => HC.ui.toast(t('toast.failed', { title: d.title, error: d.error }), 'err'));
    B.on('toast', (d) => HC.ui.toast(d.msg, d.kind));
    B.on('watchlist_done', (d) => HC.ui.toast(t(d.found ? 'toast.wl_done_found' : 'toast.wl_done', { n: d.checked, found: d.found }), d.found ? 'ok' : 'info'));
  }

  /* ---------- Start ---------- */
  let inited = false;
  async function load() {
    let s;
    try {
      s = await HC.bridge.call('get_settings');
    } catch (err) {
      console.error(err);
      HC.ui.toast(t('err.boot', { msg: (err && err.message) || err }), 'err', 15000);
      return;
    }
    HC.settings.values = s.values;
    HC.settings.defaults = s.defaults;
    applyAppearance();
    if (!inited) {
      wireEvents(); // vor den Ansichten: der Store ist aktuell, wenn sie auf Events reagieren
      VIEWS.forEach((name) => { const v = HC.views[name]; if (v && v.init) v.init($(`#v-${name}`)); });
      inited = true;
    }
    setStatus(await HC.bridge.safe('get_status'));
    const m = /^#([a-z]+)(?:\/([a-z_-]+))?/.exec(location.hash || '');
    go(m && VIEWS.includes(m[1]) ? m[1] : s.values.general.start_view, m ? m[2] : undefined);
    document.body.classList.add('ready');
  }
  /* ---------- Fehlerzustand: in pywebview gestartet, Backend antwortet nicht (kein Mock!) ---------- */
  function showBackendError(on) {
    document.body.classList.toggle('no-backend', !!on);
    let box = $('#fatal');
    if (!on) { if (box) box.remove(); return; }
    if (box) return;
    box = document.createElement('div');
    box.id = 'fatal';
    box.className = 'fatal';
    box.setAttribute('role', 'alertdialog');
    box.innerHTML = `<div class="fatal-box">${HC.icons.warn}
      <h2>${t('fatal.title')}</h2>
      <p>${t('fatal.text')}</p>
      <p class="fatal-wait"><span class="led warn blink"></span>${t('fatal.waiting')}</p>
      <button class="btn primary" id="fatal-reload">${HC.icons.refresh}${t('fatal.reload')}</button></div>`;
    document.body.appendChild(box);
    $('#fatal-reload').onclick = () => location.reload();
    $('#fatal-reload').focus();
  }

  async function boot() {
    applyI18n();
    wireNav();
    const mode = await HC.bridge.ready();
    if (mode === 'error') { showBackendError(true); return; }
    document.body.classList.toggle('is-mock', mode === 'mock');
    $('#mock-flag').hidden = mode !== 'mock';
    if (mode === 'mock' && !/[?&]nosim/.test(location.search)) HC.mock.sim.start();
    await load();
  }

  HC.app = {
    boot,
    go,
    current: () => current,
    applyAppearance,
    /** Nach dem Speichern: neue Werte übernehmen und alles Abhängige auffrischen. */
    settingsSaved(values) {
      HC.settings.values = util.clone(values);
      applyAppearance();
      renderStatus();
      HC.bridge.emit('settings_changed', HC.settings.values);
    },
    /** Kompletter Neuaufbau der Daten (z.B. wenn pywebview erst spät bereit ist). */
    async reload() {
      document.body.classList.remove('is-mock');
      $('#mock-flag').hidden = true;
      showBackendError(false);
      VIEWS.forEach((name) => { const v = HC.views[name]; if (v && v.reset) v.reset(); });
      await load();
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
