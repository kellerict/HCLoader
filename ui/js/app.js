/* =====================================================================
   app.js – Start, Router/Navigation, Statusleiste, gemeinsamer Zustand
   Ansichten registrieren sich unter HC.views.<name> = {init(el), show(arg)}.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx } = HC;
  const t = (k, v) => HC.t(k, v);

  const VIEWS = ['discover', 'inbox', 'watchlist', 'downloads', 'library', 'stats', 'log', 'settings'];
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

  /* ---------- Zeitplan: nächste Watchlist-Prüfung ---------- */
  /* Status.next_check ist das frühere von In-App-Intervall und Windows-Aufgabe. Woher der Termin
     stammt, leitet die UI aus den Einstellungen ab: sind beide aktiv, ist es die Aufgabe, wenn der
     Termin auf die nächste tägliche Uhrzeit (schedule.task_time) fällt – sonst die App. */
  HC.schedule = {
    /** -> {at: ISO|null, kind: "app"|"task"|null, due: bool, blocked: bool (Backoff aktiv)} */
    next() {
      const st = HC.status, sc = HC.settings.values && HC.settings.values.schedule;
      const d = st && util.parseDate(st.next_check);
      const blocked = !!(st && st.backoff && st.backoff.active);
      if (!d || !sc) return { at: null, kind: null, due: false, blocked };
      let kind = sc.in_app_check ? 'app' : sc.task_scheduler_enabled ? 'task' : null;
      if (sc.in_app_check && sc.task_scheduler_enabled) {
        const m = /^(\d{1,2}):(\d{2})$/.exec(sc.task_time || '');
        if (m) {
          const daily = new Date(d);
          daily.setHours(+m[1], +m[2], 0, 0);
          if (Math.abs(daily - d) < 90000) kind = 'task';
        }
      }
      return { at: st.next_check, kind, due: d.getTime() <= Date.now(), blocked };
    },
    /** «heute 21:45 · App» / «fällig» / «aus» */
    label(n, short) {
      const x = n || HC.schedule.next();
      if (!x.at) return t('statusbar.next_off');
      const when = x.due ? t('schedule.due') : util.fmtWhen(x.at);
      return x.kind && !short ? `${when} · ${t('schedule.kind_' + x.kind)}` : when;
    },
    title(n) {
      const x = n || HC.schedule.next();
      if (!x.at) return t('schedule.tip_off');
      return t(x.kind ? 'schedule.tip_' + x.kind : 'schedule.tip_any', { t: util.fmtFull(x.at) }) + (x.blocked ? ` ${t('schedule.tip_backoff')}` : '');
    },
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
    $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.title = t('app.title');
  }
  function applyIcons() {
    $$('[data-icon]').forEach((el) => { el.insertAdjacentHTML('afterbegin', HC.icons[el.dataset.icon] || ''); });
  }
  /** Language from the settings: the backend resolves 'auto' (Windows UI language) and sends it as
      `language`; without it (old backend) the browser languages decide. Sets <html lang/dir>. */
  function applyLanguage(s) {
    const g = s && s.values && s.values.general;
    HC.i18n.set((s && s.language) || (g && g.language) || 'auto');
    applyI18n();
  }

  /* ---------- Navigation ---------- */
  let current = null;
  function moveIndicator() {
    const ind = $('#nav-ind'), item = $('.nav-item.active');
    if (!ind || !item) return;
    if (ind._h !== item.offsetHeight) { ind._h = item.offsetHeight; ind.style.height = `${ind._h}px`; }
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
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key >= '1' && e.key <= '8') { e.preventDefault(); go(VIEWS[+e.key - 1]); }
    });
    $('#sb-sys').addEventListener('click', toggleSysPop);
    /* window/capture läuft vor dem «Klick daneben» der Overlays: merken, ob der Knopf sein eigenes Popover schliesst */
    window.addEventListener('mousedown', (e) => { sysWasOpen = !!sysPop && $('#sb-sys').contains(e.target); }, true);
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
  /* «System»-Popover der Statusleiste: dieselben Einzelwerte wie früher in der Leiste. */
  let sysPop = null, sysWasOpen = false;
  function sysRows() {
    const s = HC.status || {}, po = s.po_token || {}, bo = s.backoff || {};
    const okTxt = (ok) => t(ok ? 'statusbar.ok' : 'statusbar.missing');
    return [
      ['yt-dlp', s.ytdlp_version || t('statusbar.missing'), s.ytdlp_version ? '' : 'err'],
      ['Deno', okTxt(s.deno_ok), s.deno_ok ? '' : 'err'],
      ['ffmpeg', okTxt(s.ffmpeg_ok), s.ffmpeg_ok ? '' : 'err'],
      [t('statusbar.po'), po.state === 'active' ? t('statusbar.po_active', { mode: t(`po_mode.${po.mode}`) }) : t(`statusbar.po_${po.state || 'inactive'}`), po.state === 'active' ? '' : po.state === 'error' ? 'err' : 'off'],
      [t('statusbar.backoff'), bo.active ? t('statusbar.backoff_until', { t: util.fmtWhen(bo.until), rest: util.fmtSpan(bo.remaining_s) }) : t('statusbar.backoff_none'), bo.active ? 'warn' : 'off'],
    ];
  }
  function paintSysPop() {
    if (!sysPop) return;
    const html = `<div class="mhead">${util.esc(t('statusbar.system'))}</div>` + sysRows().map((r) => `<div class="sb-row"><span class="led ${r[2]}"></span><span class="k">${util.esc(r[0])}</span><b>${util.esc(r[1])}</b></div>`).join('');
    if (sysPop._html !== html) { sysPop.innerHTML = sysPop._html = html; if (sysPop._place) sysPop._place(); }
  }
  function toggleSysPop() {
    const btn = $('#sb-sys');
    if (sysWasOpen) { sysWasOpen = false; return; } // der Klick, der das offene Popover gerade geschlossen hat
    if (sysPop) { HC.ui.closeMenu(); return; }
    sysPop = HC.ui.popover(btn, '', { align: 'left', cls: 'sb-pop', label: t('statusbar.system_title') });
    sysPop._onClose = () => { sysPop = null; btn.setAttribute('aria-expanded', 'false'); };
    btn.setAttribute('aria-expanded', 'true');
    paintSysPop();
  }
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
    $('#sb-pot').innerHTML = po.state === 'active' ? util.esc(t('statusbar.po_active', { mode: t(`po_mode.${po.mode}`) })).replace(/ \(/, '<span class="sb-x"> (') + '</span>' : util.esc(t(`statusbar.po_${po.state || 'inactive'}`));
    led($('#sb-pot-led'), po.state === 'active' ? '' : po.state === 'error' ? 'err blink' : 'off');
    $('#sb-pot-it').title = po.detail || '';

    const bo = s.backoff || {};
    $('#sb-backoff').textContent = bo.active ? t('statusbar.backoff_until', { t: util.fmtWhen(bo.until), rest: util.fmtSpan(bo.remaining_s) }) : t('statusbar.backoff_none');
    led($('#sb-backoff-led'), bo.active ? 'warn blink' : 'off');
    $('#sb-backoff-it').classList.toggle('alert', !!bo.active);
    $('#sb-backoff-it').hidden = !bo.active; // «Backoff none» sagt nichts – der Eintrag erscheint nur, wenn einer läuft

    /* Werkzeuge: solange nichts fehlt, ein Eintrag «System OK» (Einzelwerte per Klick/Tooltip); sonst alle einzeln. */
    const sysOk = !!s.ytdlp_version && !!s.deno_ok && !!s.ffmpeg_ok && po.state !== 'error';
    $$('footer .sb-tool').forEach((it) => { it.hidden = sysOk; });
    $('#sb-sys').hidden = !sysOk;
    $('#sb-sys-state').textContent = t('statusbar.ok');
    led($('#sb-sys-led'), '');
    $('#sb-sys').title = sysRows().map((r) => `${r[0]} ${r[1]}`).join(' · ');
    if (!sysOk && sysPop) HC.ui.closeMenu();
    paintSysPop();

    /* Pro Plattform (Phase 7a, v0.10.0): «Backoff» oben = YouTube; SoundCloud, Mixcloud und hearthis.at bekommen je
       einen eigenen, kompakten Punkt – nur wenn eingeschaltet. */
    const tip = (p, key) => { const x = HC.platform.state(p); return t(key, { p: HC.platform.label(p), day: x.counters.downloads_day || 0, day_max: x.limits.downloads_day, s: x.counters.searches_hour || 0, s_max: x.limits.searches_hour }); };
    const ytTip = HC.platform.anyOther() ? tip('youtube', 'statusbar.yt_tip') : '';
    $('#sb-backoff-it').title = ytTip;
    $('#sb-day-it').title = ytTip;
    HC.platform.others.forEach((p) => {
      const cls = { soundcloud: 'sc', mixcloud: 'mc', hearthis: 'ht' }[p];
      const it = $(`#sb-${cls}-it`);
      if (!it) return;
      const x = HC.platform.state(p), pbo = x.backoff && x.backoff.active ? x.backoff : null;
      /* SoundCloud wie bisher, sobald eingeschaltet; Mixcloud/hearthis.at nur bei Aktivität heute oder Backoff (Platz). */
      const on = HC.platform.enabled(p) && (p === 'soundcloud' || !!pbo || (x.counters.downloads_day || 0) > 0 || (x.counters.searches_hour || 0) > 0);
      it.hidden = !on;
      if (!on) return;
      $(`#sb-${cls}`).textContent = pbo ? t('statusbar.sc_backoff', { t: util.parseDate(pbo.until) && util.parseDate(pbo.until).toDateString() === new Date().toDateString() ? util.fmtTime(pbo.until) : util.fmtWhen(pbo.until) }) : t('statusbar.sc_today', { n: x.counters.downloads_day || 0, max: x.limits.downloads_day });
      led($(`#sb-${cls}-led`), pbo ? 'warn blink' : cls);
      it.classList.toggle('alert', !!pbo);
      it.title = tip(p, p === 'soundcloud' ? 'statusbar.sc_tip' : 'statusbar.p_tip') + (pbo ? ` · ${t('statusbar.backoff_tip', { p: HC.platform.label(p), t: util.fmtWhen(pbo.until), rest: util.fmtSpan(pbo.remaining_s) })}` : '');
    });

    const qn = s.queue_length || 0;
    fx.count($('#sb-queue'), qn);
    $('#sb-queue-sfx').textContent = s.queue_paused && qn ? ` ${t('statusbar.queue_paused')}` : qn ? ` ${t('statusbar.queue_active')}` : '';
    $('#sb-queue').hidden = !qn;
    $('#sb-queue-empty').hidden = !!qn;
    led($('#sb-queue-led'), !qn ? 'off' : s.queue_paused ? 'warn' : 'live');

    fx.count($('#sb-day'), s.counters.downloads_day);
    $('#sb-day-max').textContent = th.max_downloads_per_day;
    const nx = HC.schedule.next();
    $('#sb-next').innerHTML = util.esc(HC.schedule.label(nx, true)) + (nx.at && nx.kind ? `<span class="sb-kind"> · ${util.esc(t('schedule.kind_' + nx.kind))}</span>` : '');
    $('#sb-next').classList.toggle('held', !!nx.at && nx.blocked);
    $('#sb-next').parentElement.title = HC.schedule.title(nx);

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
    /* Einstellungen geändert, Status noch der alte (z.B. SoundCloud ein/aus) -> Statusleiste nachziehen. */
    B.on('settings_changed', () => HC.app.refreshStatus());
    B.on('done', (d) => HC.ui.toast(t('toast.done', { title: d.title })));
    B.on('failed', (d) => HC.ui.toast(t('toast.failed', { title: d.title, error: d.error }), 'err'));
    B.on('toast', (d) => HC.ui.toast(d.msg, d.kind));
    /* v0.10.0: Re-Upload nach einem Download erkannt (nicht während des Abgleichs der ganzen Bibliothek) */
    B.on('reupload', (d) => {
      const r = d && d.reupload;
      if (!r || r.state !== 'open' || d.pass) return;
      HC.ui.toast(t('reupload.toast_found', { title: (HC.store.get(d.id) || {}).title || d.id, of: r.of.title || r.of.id }), 'warn', 7000);
    });
    /* v0.9.0: zweiter Start mit --open bzw. Klick auf eine Windows-Benachrichtigung */
    B.on('navigate', (d) => { if (d && VIEWS.includes(d.view)) go(d.view); });
    /* Watchlist-Lauf: Fehler pro Quelle mitzählen, am Ende eine Zusammenfassung. */
    let wlErrors = 0;
    B.on('source', (d) => { if (!d.checking && d.error) wlErrors++; });
    B.on('watchlist_done', (d) => {
      const found = +d.found || 0, errors = wlErrors;
      wlErrors = 0;
      if (!d.checked && !found && !errors) return; // nichts geprüft (z.B. anderer Lauf aktiv) – das Backend meldet den Grund selbst
      let msg = found ? t('toast.wl_done_found', { n: found }) : t('toast.wl_done', { n: d.checked });
      if (errors) msg += ` · ${t('toast.wl_errors', { n: errors })}`;
      HC.ui.toast(msg, errors ? 'warn' : found ? 'ok' : 'info', errors ? 5200 : 0);
    });
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
    if (!inited) applyLanguage(s);
    applyAppearance();
    if (!inited) {
      wireEvents(); // vor den Ansichten: der Store ist aktuell, wenn sie auf Events reagieren
      if (HC.player) HC.player.init($('#player'));
      VIEWS.forEach((name) => { const v = HC.views[name]; if (v && v.init) v.init($(`#v-${name}`)); });
      inited = true;
    }
    setStatus(await HC.bridge.safe('get_status'));
    const m = /^#([a-z]+)(?:\/([\w%.-]+))?/.exec(location.hash || ''); // v0.8.0: dj-<key> (encodeURIComponent)
    /* v0.9.0: open_view = --open / Klick auf eine Windows-Benachrichtigung (nur beim ersten Laden) */
    go(m && VIEWS.includes(m[1]) ? m[1] : s.open_view && VIEWS.includes(s.open_view) ? s.open_view : s.values.general.start_view, m ? m[2] : undefined);
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
    HC.i18n.set('auto'); // until the settings arrive (fatal screen, boot errors)
    applyI18n();
    applyIcons();
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
    /** Status neu holen (z.B. Eingang-Zähler nach einer Aktion, falls das Backend kein Event schickt). */
    refreshStatus: util.debounce(async () => setStatus(await HC.bridge.safe('get_status')), 250),
    /** Nach dem Speichern: neue Werte übernehmen und alles Abhängige auffrischen. */
    settingsSaved(values, language) {
      const g0 = HC.settings.values && HC.settings.values.general;
      const before = g0 && g0.language;
      HC.settings.values = util.clone(values);
      const now = values.general && values.general.language;
      if (now !== before && HC.i18n.resolve(language || now) !== HC.i18n.lang) {
        /* New language: rebuild the whole UI in place (no app restart; queue and runs live in the backend). */
        HC.i18n.set(language || now);
        document.body.classList.remove('ready'); // «ready» again only after the reload (tests and screenshots wait on it)
        let url = null;
        try { url = new URL(location.href); } catch (e) { /* egal */ }
        if (url && url.searchParams.has('lang')) { // mock/screenshots: ?lang= must not win again
          url.searchParams.delete('lang');
          location.replace(url.href);
        } else location.reload();
        return;
      }
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
      if (HC.player) HC.player.close(true);
      await load();
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
