/* =====================================================================
   views/settings.js – Einstellungen (SPEC §10.1, docs/settings-schema.md)
   Schema-getrieben: jedes Feld hat Label, Hilfe, Standardwert und
   «Zurücksetzen». Gespeichert wird über bridge.save_settings(values);
   Fehler der Validierung erscheinen direkt am Feld.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx, ui } = HC;
  const { esc, get, set, clone, eq } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const FALLBACK_GENRE = 'Unsortiert';
  const PALETTE = ['#00e5ff', '#ff7a00', '#ff3bd4', '#ffe600', '#3bff9d', '#7a8cff'];
  const PLACEHOLDERS = ['genre', 'artist', 'channel', 'year', 'date', 'title', 'id'];
  const MIN_YEAR = 2005; // wie core/config.MIN_UPLOAD_YEAR
  const thisYear = () => new Date().getFullYear();

  /* ---------- Schema der Tabs ----------
     type: bool | int | float | select | text | time | date | chips
     scale: Anzeige = Wert / scale (z.B. Sekunden -> Minuten)
     enabled(w): Feld nur bedienbar, wenn die Funktion true liefert
     visible(w): Feld nur sichtbar, wenn die Funktion true liefert (Fehler zeigen es trotzdem)
     zeroEmpty: 0 bedeutet «nicht gesetzt» (leeres Feld)
     max: Zahl oder Funktion
     after(w): nach einer Änderung abhängige Werte nachziehen -> Liste der neu zu zeichnenden Schlüssel
     {h: key} = Zwischenüberschrift, {custom: name} = Sonderblock          */
  const TABS = [
    { id: 'general', fields: [
      { k: 'general.start_view', type: 'select', options: ['discover', 'inbox', 'watchlist', 'downloads', 'library', 'log'], optLabel: (v) => t('nav.' + v) },
      { k: 'general.log_level', type: 'select', options: ['DEBUG', 'INFO', 'WARNING', 'ERROR'] },
      { k: 'general.confirm_delete', type: 'bool' },
    ] },
    { id: 'filters', fields: [
      { h: 'set.h.search' },
      { k: 'search.results_count', type: 'int', min: 1, max: 100, unit: 'unit.results' },
      { k: 'search.append_year', type: 'bool' },
      { h: 'set.h.duration' },
      { k: 'filters.min_duration', type: 'int', min: 0, scale: 60, unit: 'unit.minutes' },
      { k: 'filters.max_duration', type: 'int', min: 0, scale: 60, unit: 'unit.minutes' },
      { k: 'filters.upload_period', type: 'select', options: ['all', '7d', '30d', '1y', 'year', 'custom'], optLabel: (v) => t('period.' + v),
        /* «Bestimmtes Jahr» braucht ein Jahr (Pflicht im Schema) -> aktuelles Jahr vorschlagen. */
        after: (w) => (w.filters.upload_period === 'year' && !w.filters.upload_year ? ((w.filters.upload_year = thisYear()), ['filters.upload_year']) : []) },
      { k: 'filters.upload_year', type: 'int', min: MIN_YEAR, max: thisYear, zeroEmpty: true, stepper: true, visible: (w) => w.filters.upload_period === 'year' },
      { k: 'filters.upload_from', type: 'date', visible: (w) => w.filters.upload_period === 'custom' },
      { k: 'filters.upload_to', type: 'date', visible: (w) => w.filters.upload_period === 'custom' },
      { h: 'set.h.keywords' },
      { k: 'filters.include_keywords', type: 'chips', kind: 'inc' },
      { k: 'filters.exclude_keywords', type: 'chips', kind: 'exc' },
      { k: 'filters.match_description', type: 'bool' },
      { h: 'set.h.display' },
      { k: 'filters.hide_done_ignored', type: 'bool' },
      { k: 'filters.apply_channel_blacklist', type: 'bool' },
      { custom: 'blacklist' },
    ] },
    { id: 'genres', fields: [{ custom: 'genres' }], keys: ['genres.items'] },
    { id: 'download', fields: [
      { k: 'download.audio_format', type: 'select', options: ['mp3', 'original'] },
      { k: 'download.mp3_quality', type: 'select', options: ['320', 'v0'], enabled: (w) => w.download.audio_format === 'mp3' },
      { h: 'set.h.cover' },
      { k: 'download.embed_cover', type: 'bool' },
      { k: 'download.write_cover_jpg', type: 'bool' },
      { h: 'set.h.chapters' },
      { k: 'download.write_cue', type: 'bool' },
      { k: 'download.write_id3_chapters', type: 'bool', enabled: (w) => w.download.audio_format === 'mp3' },
    ] },
    { id: 'storage', fields: [
      { k: 'storage.target_dir', type: 'text', mono: true, wide: true, browse: true },
      { k: 'storage.path_template', type: 'text', mono: true, wide: true },
      { custom: 'pathPreview' },
      { k: 'storage.max_title_length', type: 'int', min: 20, max: 200, unit: 'unit.chars' },
      { k: 'storage.max_path_length', type: 'int', min: 100, max: 259, unit: 'unit.chars' },
      { h: 'set.h.tags' },
      { k: 'storage.artist_from_title', type: 'bool' },
      { k: 'storage.title_cleanup_patterns', type: 'chips', lower: false, commaSplits: false, placeholder: 'set.storage.title_cleanup_patterns.ph' },
    ] },
    { id: 'throttle', fields: [
      { custom: 'backoff' },
      { h: 'set.h.pauses' },
      { k: 'throttle.sleep_requests', type: 'float', min: 0, max: 60, unit: 'unit.s' },
      { k: 'throttle.sleep_interval', type: 'int', min: 0, max: 3600, unit: 'unit.s' },
      { k: 'throttle.max_sleep_interval', type: 'int', min: 0, unit: 'unit.s', rangeKey: 'range.ge_sleep' },
      { k: 'throttle.limit_rate_mb', type: 'float', min: 0, unit: 'unit.mbs' },
      { h: 'set.h.limits' },
      { k: 'throttle.max_downloads_per_run', type: 'int', min: 1, max: 100 },
      { k: 'throttle.max_downloads_per_day', type: 'int', min: 1, max: 500 },
      { k: 'throttle.max_searches_per_hour', type: 'int', min: 1, max: 200 },
      { h: 'set.h.backoff' },
      { k: 'throttle.backoff_initial_hours', type: 'float', min: 0.5, max: 168, unit: 'unit.h' },
      { k: 'throttle.backoff_max_hours', type: 'float', min: 0.5, unit: 'unit.h', rangeKey: 'range.ge_initial' },
      { custom: 'ladder' },
    ] },
    { id: 'network', fields: [
      { custom: 'poStatus' },
      { h: 'set.h.po' },
      { k: 'network.po_token_mode', type: 'select', options: ['off', 'script', 'http'], optLabel: (v) => t('po_mode_long.' + v) },
      { k: 'network.po_token_port', type: 'int', min: 1024, max: 65535, enabled: (w) => w.network.po_token_mode === 'http' },
      { k: 'network.po_token_ttl_hours', type: 'float', min: 0.5, max: 48, unit: 'unit.h', enabled: (w) => w.network.po_token_mode !== 'off' },
      { h: 'set.h.fallback' },
      { k: 'network.cookies_from_browser', type: 'select', options: ['', 'edge', 'chrome', 'firefox', 'brave'] },
      { custom: 'cookieWarn' },
      { k: 'network.proxy', type: 'text', mono: true, placeholder: 'set.network.proxy.ph' },
    ] },
    { id: 'schedule', fields: [
      { custom: 'nextCheck' },
      { h: 'set.h.in_app' },
      { k: 'schedule.in_app_check', type: 'bool' },
      { k: 'schedule.watchlist_interval_hours', type: 'float', min: 1, max: 168, unit: 'unit.h' },
      { k: 'schedule.entries_per_source', type: 'int', min: 1, max: 200, unit: 'unit.entries' },
      { h: 'set.h.task' },
      { k: 'schedule.task_scheduler_enabled', type: 'bool' },
      { k: 'schedule.task_time', type: 'time' },
      { custom: 'task' },
    ] },
    { id: 'appearance', fields: [
      { k: 'appearance.reduce_effects', type: 'bool' },
      { k: 'appearance.scanlines', type: 'bool', enabled: (w) => !w.appearance.reduce_effects },
      { k: 'appearance.pulse_bpm', type: 'int', min: 60, max: 300, unit: 'unit.bpm', enabled: (w) => !w.appearance.reduce_effects },
      { custom: 'pulsePreview' },
    ] },
    { id: 'maintenance', fields: [
      { custom: 'versions' },
      { h: 'set.h.updates' },
      { custom: 'update' },
      { k: 'maintenance.check_updates_on_start', type: 'bool' },
      { h: 'set.h.database' },
      { custom: 'database' },
      { h: 'set.h.reset' },
      { custom: 'resetAll' },
    ] },
  ];
  const tabKeys = (tab) => tab.keys || tab.fields.filter((f) => f.k).map((f) => f.k);

  let el;
  let saved = null, work = null, defaults = null;
  let errors = {};
  let cur = 'general';
  let genreKeys = []; // stabile Schlüssel für die Genre-Zeilen (FLIP)
  let gk = 0;
  const cache = { task: null, versions: null, blacklist: null, poTest: null, update: null, before: null, restart: false, backups: [], freshBackup: '' };

  const isDirtyKey = (k) => !eq(get(work, k), get(saved, k));
  const dirtyKeys = () => TABS.flatMap(tabKeys).filter(isDirtyKey);
  const errorsOf = (tab) => Object.keys(errors).filter((e) => tabKeys(tab).some((k) => e === k || e.startsWith(k + '.')));

  /* ---------- Anzeige von Werten ---------- */
  const optLabel = (def, v) => (def.optLabel ? def.optLabel(v) : t(`opt.${def.k}.${v === '' ? 'none' : v}`));
  function fmtValue(def, v) {
    if (def.type === 'bool') return t(v ? 'common.on' : 'common.off');
    if (def.type === 'select') return optLabel(def, v);
    if (def.type === 'chips') return v.length ? (v.length > 5 ? `${v.slice(0, 5).join(', ')} … (+${v.length - 5})` : v.join(', ')) : t('common.empty_list');
    if ((def.type === 'int' || def.type === 'float') && def.zeroEmpty && !v) return t('set.not_set');
    if (def.type === 'int' || def.type === 'float') return `${util.trimNum(v / (def.scale || 1))}${def.unit ? ' ' + t(def.unit) : ''}`;
    if (def.type === 'date') return v ? util.fmtDate(v) : t('common.empty');
    return v === '' ? t('common.empty') : String(v);
  }
  const maxOf = (def) => (typeof def.max === 'function' ? def.max() : def.max);
  function rangeText(def) {
    if (def.rangeKey) return t(def.rangeKey);
    const s = def.scale || 1, max = maxOf(def);
    if (def.min != null && max != null) return `${util.trimNum(def.min / s)}–${util.trimNum(max / s)}`;
    if (def.min != null) return `≥ ${util.trimNum(def.min / s)}`;
    return '';
  }

  /* ---------- Ein Feld ---------- */
  function controlHtml(def) {
    const v = get(work, def.k);
    switch (def.type) {
      case 'bool':
        return `${ui.toggle(v, 'data-c')}<span class="toggle-label" data-tl>${t(v ? 'common.on' : 'common.off')}</span>`;
      case 'select':
        return `<select class="select" data-c>${def.options.map((o) => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${esc(optLabel(def, o))}</option>`).join('')}</select>`;
      case 'int':
      case 'float':
        return `${def.stepper ? `<button type="button" class="iconbtn" data-step="-1" title="${esc(t('discover.f_year_prev'))}">${I.left}</button>` : ''}<input class="input mono num" data-c type="number" inputmode="decimal" step="${def.type === 'int' && !def.scale ? 1 : 'any'}" value="${v == null || (def.zeroEmpty && !v) ? '' : util.trimNum(v / (def.scale || 1))}"${def.zeroEmpty ? ` placeholder="${esc(t('set.not_set'))}"` : ''}>${def.stepper ? `<button type="button" class="iconbtn" data-step="1" title="${esc(t('discover.f_year_next'))}">${I.right}</button>` : ''}${def.unit ? `<span class="unit">${t(def.unit)}</span>` : ''}`;
      case 'date':
        return `<input class="input mono" data-c type="date" value="${esc(v || '')}" min="${MIN_YEAR}-01-01" style="width:170px">`;
      case 'time':
        return `<input class="input mono" data-c type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM" value="${esc(v)}" style="width:92px" spellcheck="false" autocomplete="off"><span class="unit">${t('unit.clock')}</span>`;
      case 'chips':
        return '<div data-chips></div>';
      default:
        return `<input class="input${def.mono ? ' mono' : ''}${def.wide ? ' wide' : ''}" data-c type="text" value="${esc(v)}" spellcheck="false" autocomplete="off"${def.placeholder ? ` placeholder="${esc(t(def.placeholder))}"` : ''}>${def.browse ? `<button class="btn sm" data-browse title="${esc(t('set.browse'))}">${I.folder}${t('set.browse')}</button>` : ''}`;
    }
  }
  function fieldEl(def) {
    const d = document.createElement('div');
    d.className = 'field';
    d.dataset.k = def.k;
    const range = rangeText(def);
    d.innerHTML = `
      <div class="fl"><b>${esc(t(`set.${def.k}.label`))}</b><span class="help">${t(`set.${def.k}.help`)}</span>
        <em>${t('set.default')}: ${esc(fmtValue(def, get(defaults, def.k)))}${range ? ` · ${t('set.range')} ${esc(range)}` : ''}</em></div>
      <div class="fc"><div class="fc-main">${controlHtml(def)}</div>
        <button type="button" class="linkbtn reset" data-reset>${t('common.reset')}</button>
        <div class="field-error" hidden></div></div>`;
    bindField(d, def);
    paintField(d, def);
    return d;
  }
  function bindField(d, def) {
    const c = $('[data-c]', d);
    const commit = (val) => {
      set(work, def.k, val);
      delete errors[def.k];
      const redo = def.after ? def.after(work) : [];
      onChange(def.k);
      redo.forEach((k) => { delete errors[k]; refreshField(k); });
      if (redo.length) paintChrome();
    };
    if (def.type === 'bool') {
      c.addEventListener('click', () => {
        const v = !get(work, def.k);
        ui.setToggle(c, v);
        $('[data-tl]', d).textContent = t(v ? 'common.on' : 'common.off');
        commit(v);
      });
    } else if (def.type === 'select') {
      c.addEventListener('change', () => commit(c.value));
    } else if (def.type === 'int' || def.type === 'float') {
      c.addEventListener('input', () => {
        if (c.value.trim() === '') return commit(def.zeroEmpty ? 0 : null);
        let n = Number(c.value.replace(',', '.')) * (def.scale || 1);
        if (def.scale && def.type === 'int') n = Math.round(n);
        commit(n);
      });
      $$('[data-step]', d).forEach((b) => b.addEventListener('click', () => {
        const curV = +get(work, def.k) || 0, max = maxOf(def);
        const n = Math.min(max, Math.max(def.min, (curV || (b.dataset.step > 0 ? def.min - 1 : max + 1)) + +b.dataset.step));
        c.value = n;
        commit(n);
      }));
    } else if (def.type === 'chips') {
      const o = { list: get(work, def.k), kind: def.kind, lower: def.lower !== false, commaSplits: def.commaSplits !== false, onChange: (list) => commit(list) };
      if (def.placeholder) o.placeholder = t(def.placeholder);
      ui.chips($('[data-chips]', d), o);
    } else {
      c.addEventListener('input', () => commit(c.value));
    }
    const br = $('[data-browse]', d);
    if (br) br.addEventListener('click', async () => {
      const r = await HC.bridge.safe('pick_folder', get(work, def.k));
      if (r && r.path) { c.value = r.path; commit(r.path); }
    });
    $('[data-reset]', d).addEventListener('click', () => {
      set(work, def.k, clone(get(defaults, def.k)));
      delete errors[def.k];
      const fresh = fieldEl(def);
      d.replaceWith(fresh);
      onChange(def.k);
    });
  }
  /** Feld neu aufbauen (z.B. wenn ein anderes Feld seinen Wert gesetzt hat). */
  function refreshField(k) {
    const def = TABS.flatMap((x) => x.fields).find((x) => x.k === k), d = $(`.field[data-k="${k}"]`, el);
    if (def && d) d.replaceWith(fieldEl(def));
  }
  /** Zustand eines Feldes (geändert, Fehler, bedienbar) ohne Neuaufbau aktualisieren. */
  function paintField(d, def) {
    d.classList.toggle('dirty', isDirtyKey(def.k));
    const err = errors[def.k];
    d.classList.toggle('has-error', !!err);
    const e = $('.field-error', d);
    e.hidden = !err;
    e.textContent = err || '';
    $('[data-reset]', d).disabled = eq(get(work, def.k), get(defaults, def.k));
    d.hidden = !!def.visible && !def.visible(work) && !err;
    const on = !def.enabled || def.enabled(work);
    $$('[data-c],[data-step]', d).forEach((c) => { c.disabled = !on; });
    const chips = $('[data-chips]', d);
    if (chips) chips.classList.toggle('disabled', !on);
  }

  /* ---------- Sonderblöcke ---------- */
  const row = (key, mainHtml, cls) => `<div class="field plain ${cls || ''}"><div class="fl"><b>${t(`${key}.label`)}</b><span class="help">${t(`${key}.help`)}</span></div><div class="fc"><div class="fc-main">${mainHtml}</div></div></div>`;
  const box = (cls, title, detail, actions, extra, ledCls) => `<div class="statebox ${cls}"><div><div class="st-title"><span class="led ${ledCls || ''}"></span>${title}</div><div class="st-detail">${detail}</div></div><div class="st-actions">${actions || ''}</div>${extra || ''}</div>`;

  /* ---------- Wartung: Versionen laden, Update mit Live-Ausgabe ---------- */
  const repaintCustoms = () => $$('[data-custom]', el).forEach((h) => h._paint && h._paint());
  async function loadVersions() {
    const v = await HC.bridge.safe('get_versions');
    if (!v) return;
    cache.versions = v;
    if (v.restart_required) cache.restart = true;
    repaintCustoms();
  }
  const consoleLine = (l) => `<div class="cl ${esc(l.level || 'info')}">${esc(l.msg)}</div>`;
  /** Während des Updates schickt das Backend jede pip-Zeile als «log»-Event: live in die Konsole. */
  function onUpdateLog(l) {
    const u = cache.update;
    if (!u || u.state !== 'live' || !l || l.level === 'debug') return;
    u.lines.push({ level: l.level, msg: l.msg });
    if (u.lines.length > 400) u.lines.shift();
    const box = $('[data-custom=update] [data-console]', el);
    if (!box) return;
    if (u.lines.length === 1) box.innerHTML = '';
    box.insertAdjacentHTML('beforeend', consoleLine(l));
    box.scrollTop = box.scrollHeight;
  }
  async function runUpdate() {
    if (cache.update && cache.update.state === 'live') return;
    const before = cache.versions ? { ytdlp: cache.versions.ytdlp, plugin: cache.versions.plugin } : null;
    cache.update = { state: 'live', start: Date.now(), end: 0, lines: [] };
    repaintCustoms();
    const timer = setInterval(() => { const h = $('[data-custom=update]', el); if (h && h._tick) h._tick(); }, 1000);
    const r = await HC.bridge.safe('update_ytdlp');
    clearInterval(timer);
    const u = cache.update;
    u.end = Date.now();
    u.state = r && r.ok ? 'done' : 'failed';
    if (r) {
      /* Kamen keine Live-Zeilen an (z.B. sofort abgelehnt), die gesammelte Ausgabe zeigen. */
      if (!u.lines.length) String(r.output || '').split('\n').filter((x) => x.trim()).forEach((msg) => u.lines.push({ level: 'info', msg }));
      if (r.ok) {
        Object.assign(cache.versions || (cache.versions = {}), { ytdlp: r.ytdlp, plugin: r.plugin, last_update_check: new Date().toISOString() });
        if (r.changed && before) cache.before = before;
        cache.restart = cache.restart || !!r.restart_required;
        if (r.restart_required) ui.toast(t('toast.restart_required'), 'warn', 8000);
        else ui.toast(t(r.changed ? 'toast.updated' : 'toast.up_to_date', { v: r.ytdlp }));
      } else {
        const msg = r.error || t('toast.update_failed');
        if (!u.lines.some((x) => x.msg === msg)) u.lines.push({ level: 'error', msg });
        ui.toast(msg, 'err');
      }
    }
    repaintCustoms();
    if (r && r.ok && r.changed) fx.flash($('[data-custom=versions] .kv', el), 'flash');
  }

  const CUSTOM = {
    /* Kanal-Blacklist (liegt in der DB, nicht in config.yaml) */
    blacklist(host) {
      const paint = () => {
        const list = cache.blacklist;
        host.innerHTML = row('set.blacklist', !list ? `<span class="unit">${t('common.loading')}</span>`
          : list.length ? `<div class="tags exc" style="cursor:default">${list.map((b) => `<span class="tag" title="${esc(b.channel_id)}"><span>${esc(b.channel_name)}</span><button type="button" data-ch="${esc(b.channel_id)}" title="${esc(t('set.blacklist.unblock'))}">×</button></span>`).join('')}</div>`
            : `<span class="unit">${t('set.blacklist.none')}</span>`);
      };
      host.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-ch]');
        if (!b) return;
        const r = await HC.bridge.safe('unblock_channel', b.dataset.ch);
        if (r && r.ok) { cache.blacklist = cache.blacklist.filter((x) => x.channel_id !== b.dataset.ch); paint(); HC.bridge.emit('blacklist_changed', {}); }
      });
      paint();
      HC.bridge.safe('get_blacklist').then((l) => { if (l) { cache.blacklist = l; paint(); } });
    },

    /* Vorschau des Ablagepfads */
    pathPreview(host) {
      const sample = { genre: 'Hardcore', artist: 'Gabber Vault', channel: 'Gabber Vault', year: '2026', date: '2026-10-03', title: 'Millennium Hardcore Continuous Mix (Official Video) [HQ]', id: 'gMill3nnium' };
      host.innerHTML = `<div class="field plain"><div class="fl"><b>${t('set.path_preview.label')}</b><span class="help">${t('set.path_preview.help')}</span></div>
        <div class="fc"><div class="fc-main"><div class="ph-list">${PLACEHOLDERS.map((p) => `<button type="button" class="ph" data-ph="{${p}}">{${p}}</button>`).join('')}</div><div class="preview" data-out></div></div></div></div>`;
      host.addEventListener('click', (e) => {
        const b = e.target.closest('[data-ph]');
        const inp = $('.field[data-k="storage.path_template"] [data-c]', el);
        if (!b || !inp) return;
        const a = inp.selectionStart == null ? inp.value.length : inp.selectionStart, z = inp.selectionEnd == null ? a : inp.selectionEnd;
        inp.value = inp.value.slice(0, a) + b.dataset.ph + inp.value.slice(z);
        inp.focus();
        inp.setSelectionRange(a + b.dataset.ph.length, a + b.dataset.ph.length);
        inp.dispatchEvent(new Event('input'));
      });
      host._update = () => {
        const s = work.storage;
        let title = sample.title;
        (s.title_cleanup_patterns || []).forEach((p) => { try { title = title.replace(new RegExp(p, 'gi'), ''); } catch (e) { /* Fehler meldet die Validierung */ } });
        title = title.replace(/\s+/g, ' ').trim().slice(0, Math.max(1, s.max_title_length || 120));
        const rel = String(s.path_template || '').replace(/\{(\w+)\}/g, (m, k) => (k === 'title' ? title : sample[k] != null ? sample[k] : m)).replace(/\//g, '\\');
        $('[data-out]', host).textContent = `${String(s.target_dir || '').replace(/[\\/]+$/, '')}\\${rel}.${work.download.audio_format === 'mp3' ? 'mp3' : 'opus'}`;
      };
      host._update();
    },

    /* Backoff-Zustand + manuelles Aufheben */
    backoff(host) {
      host._update = () => {
        const bo = (HC.status && HC.status.backoff) || {};
        host.innerHTML = bo.active
          ? box('warn', t('set.backoff.active'), t('set.backoff.active_detail', { t: `<b>${esc(util.fmtWhen(bo.until))}</b>`, rest: `<b>${esc(util.fmtSpan(bo.remaining_s))}</b>`, level: `<b>${bo.level}</b>` }),
            `<button class="btn sm danger" data-clear>${I.bolt}${t('set.backoff.clear')}</button>`, ui.notice('warn', t('set.backoff.blocked')), 'warn blink')
          : box('ok', t('set.backoff.none'), t('set.backoff.none_detail'), `<button class="btn sm" disabled>${I.bolt}${t('set.backoff.clear')}</button>`, '', '');
      };
      host.addEventListener('click', async (e) => {
        if (!e.target.closest('[data-clear]')) return;
        const yes = await ui.modal({
          title: t('dlg.backoff.title'), kind: 'warn', okLabel: t('dlg.backoff.ok'), danger: true,
          body: `<p>${t('dlg.backoff.text')}</p>${ui.notice('warn', t('dlg.backoff.warn'))}`,
        });
        if (!yes) return;
        const r = await HC.bridge.safe('clear_backoff');
        if (r && r.ok) ui.toast(t('toast.backoff_cleared'), 'warn');
      });
      host._update();
    },
    /* Backoff-Stufen als Leiter */
    ladder(host) {
      host._update = () => {
        const a = +work.throttle.backoff_initial_hours, m = +work.throttle.backoff_max_hours;
        const steps = [];
        if (a > 0 && m >= a) { for (let h = a; steps.length < 8; h *= 2) { steps.push(Math.min(h, m)); if (h >= m) break; } }
        const level = (HC.status && HC.status.backoff && HC.status.backoff.active && HC.status.backoff.level) || 0;
        host.innerHTML = row('set.ladder', steps.length
          ? `<div class="ph-list" style="align-items:center">${steps.map((h, i) => `${i ? `<span class="unit">›</span>` : ''}<span class="tag" style="padding:1px 8px;${i + 1 === level ? 'border-color:var(--warn);color:var(--warn);background:var(--warn-soft)' : ''}"><span>${util.trimNum(h)} h</span></span>`).join('')}<span class="unit">· ${t('set.ladder.reset')}</span></div>`
          : `<span class="unit">${t('set.ladder.invalid')}</span>`);
      };
      host._update();
    },

    /* PO-Token: Status + Test */
    poStatus(host) {
      host._update = () => {
        const po = (HC.status && HC.status.po_token) || { state: 'inactive', mode: 'off' };
        const cls = po.state === 'active' ? 'ok' : po.state === 'error' ? 'error' : 'off';
        const res = cache.poTest;
        const note = res ? ui.notice(res.ok ? 'ok' : 'error', `<b>${t(res.ok ? 'set.po.test_ok' : 'set.po.test_fail')}</b> ${esc(res.detail || res.error || '')}${res.ms ? ` (${res.ms} ms)` : ''}`)
          : isDirtyKey('network.po_token_mode') || isDirtyKey('network.po_token_port') ? ui.notice('info', t('set.po.unsaved')) : '';
        host.innerHTML = box(cls, t(`set.po.${po.state}`), `${t('set.po.mode')}: <b>${t('po_mode_long.' + po.mode)}</b>${po.detail ? ` · ${esc(po.detail)}` : ''}`,
          `<button class="btn sm" data-test>${I.bolt}${t('set.po.test')}</button>`, note, po.state === 'active' ? '' : po.state === 'error' ? 'err blink' : 'off');
      };
      host.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-test]');
        if (!b) return;
        cache.poTest = null;
        ui.busy(b, true, t('set.po.testing'));
        const r = await HC.bridge.safe('test_po_token');
        cache.poTest = r || { ok: false, detail: t('err.generic') };
        host._update();
      });
      host._update();
    },
    cookieWarn(host) {
      host._update = () => {
        const on = !!work.network.cookies_from_browser;
        host.innerHTML = `<div class="field plain" style="padding-top:0"><div class="fl"></div><div class="fc"><div class="fc-main">${ui.notice(on ? 'warn' : 'info', t(on ? 'set.cookies.warn_on' : 'set.cookies.warn_off'))}</div></div></div>`;
      };
      host._update();
    },

    /* Zeitplan: wann wird als Nächstes geprüft – in der App oder über die Windows-Aufgabe? */
    nextCheck(host) {
      host._update = () => {
        const sc = HC.settings.values.schedule, n = HC.schedule.next();
        const bo = HC.status && HC.status.backoff;
        const h = util.trimNum(+sc.watchlist_interval_hours || 0);
        const dirty = ['in_app_check', 'watchlist_interval_hours', 'task_scheduler_enabled', 'task_time'].some((k) => isDirtyKey('schedule.' + k));
        let extra = bo && bo.active && (n.at || sc.in_app_check || sc.task_scheduler_enabled) ? ui.notice('warn', t('set.next.backoff', { t: esc(util.fmtWhen(bo.until)) })) : '';
        if (dirty) extra += ui.notice('info', t('set.next.unsaved'));
        let html;
        if (n.at) {
          const detail = n.kind === 'task' ? t('set.next.task_detail', { time: `<b>${esc(sc.task_time)}</b>` }) + (sc.in_app_check ? ` ${t('set.next.also_app', { h })}` : '')
            : n.kind === 'app' ? t('set.next.app_detail', { h: `<b>${h}</b>` }) + (sc.task_scheduler_enabled ? ` ${t('set.next.also_task', { time: esc(sc.task_time) })}` : '')
              : t('set.next.any_detail');
          const when = n.due ? t('set.next.due') : util.fmtWhen(n.at);
          html = box(bo && bo.active ? 'warn' : 'ok', `${t('set.next.title')}: ${esc(when)}`, detail, `<span class="st-kind">${n.kind ? esc(t('schedule.kind_' + n.kind)) : ''}</span>`, extra, bo && bo.active ? 'warn' : 'live');
        } else if (sc.in_app_check || sc.task_scheduler_enabled) {
          html = box('off', `${t('set.next.title')}: ${t('set.next.pending')}`, t('set.next.pending_detail'), '', extra, 'off');
        } else {
          html = box('off', t('set.next.off'), t('set.next.off_detail'), '', extra, 'off');
        }
        if (host._html !== html) { host.innerHTML = html; host._html = html; }
      };
      host._update();
    },

    /* Windows-Aufgabenplanung */
    task(host) {
      /* Review Phase 3 m1: get_task_status gleicht bei sicherem Ergebnis (true/false) die Einstellung
         im Backend an (z.B. Aufgabe ausserhalb gelöscht). Das Formular übernimmt den Wert, sonst
         würde das nächste Speichern mit dem alten «true» die Aufgabe still neu anlegen.
         registered === null (unbekannt): nichts ändern. Ungespeicherte Änderung am Schalter bleibt. */
      const adoptTask = (s) => {
        if (!s || typeof s.registered !== 'boolean') return;
        const k = 'schedule.task_scheduler_enabled';
        const was = get(saved, k);
        if (was === s.registered) return;
        if (eq(get(work, k), was)) set(work, k, s.registered);
        set(saved, k, s.registered);
        set(HC.settings.values, k, s.registered);
        if (host.isConnected) renderPane(false); // Schalter im Formular neu zeichnen
        paintChrome();
      };
      const paint = () => {
        const s = cache.task;
        if (!s) { host.innerHTML = box('off', t('set.task.loading'), '&nbsp;', '', '', 'off'); return; }
        /* registered === null: schtasks gab keine Auskunft -> nichts behaupten, Schalter nicht anfassen. */
        if (s.registered == null) {
          host.innerHTML = box('warn', t('set.task.unknown'), esc(s.error || t('set.task.unknown_detail')),
            `<button class="btn sm" data-task="refresh">${I.refresh}${t('set.task.recheck')}</button>`, '', 'warn');
          return;
        }
        host.innerHTML = s.registered
          ? box('ok', t('set.task.registered'), t('set.task.registered_detail', { name: `<b>${esc(s.name)}</b>`, time: `<b>${esc(s.time)}</b>`, next: `<b>${esc(util.fmtWhen(s.next_run))}</b>` }),
            `<button class="btn sm danger" data-task="remove">${I.trash}${t('set.task.remove')}</button>`)
          : box('off', t('set.task.none'), t('set.task.none_detail', { time: `<b>${esc(work.schedule.task_time)}</b>` }),
            `<button class="btn sm primary" data-task="create">${I.clock}${t('set.task.create')}</button>`, '', 'off');
      };
      host._update = () => { if (cache.task && !cache.task.registered) paint(); };
      host.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-task]');
        if (!b) return;
        ui.busy(b, true);
        if (b.dataset.task === 'refresh') {
          const st = await HC.bridge.safe('get_task_status');
          if (st) cache.task = st;
          paint();
          adoptTask(st);
          return;
        }
        const create = b.dataset.task === 'create';
        const r = create ? await HC.bridge.safe('create_task', work.schedule.task_time) : await HC.bridge.safe('remove_task');
        if (r && r.ok && typeof r.registered === 'boolean') {
          cache.task = Object.assign({}, cache.task, r, { error: null });
          /* Das Backend hat diese beiden Werte bereits gespeichert. */
          [['schedule.task_scheduler_enabled', create]].concat(create ? [['schedule.task_time', work.schedule.task_time]] : []).forEach(([k, v]) => { set(work, k, v); set(saved, k, v); set(HC.settings.values, k, v); });
          ui.toast(t(create ? 'toast.task_created' : 'toast.task_removed'), create ? 'ok' : 'info');
          renderPane(false);
          paintChrome();
        } else {
          if (r && r.error) ui.toast(r.error, 'err');
          paint();
        }
      });
      paint();
      HC.bridge.safe('get_task_status').then((s) => { if (s) { cache.task = s; paint(); adoptTask(s); } });
    },

    /* Vorschau Kick-Puls */
    pulsePreview(host) {
      host.innerHTML = row('set.pulse_preview', `<div style="width:100%;max-width:360px"><div class="progress"><div class="bar kick" style="--p:64"></div></div></div><span class="unit" data-bpm></span>`);
      host._update = () => { $('[data-bpm]', host).textContent = work.appearance.reduce_effects ? t('set.pulse_preview.off') : `${work.appearance.pulse_bpm || '–'} ${t('unit.bpm')}`; };
      host._update();
    },

    /* Wartung */
    versions(host) {
      const paint = () => {
        const v = cache.versions, s = HC.status || {}, was = cache.before || {};
        const cell = (k, val, ok, old) => {
          const changed = !!old && !!val && old !== val;
          return `<div class="${changed ? 'changed' : ''}"><div class="k"><span class="led ${ok === false ? 'err' : ok === true ? '' : 'off'}"></span>${k}</div>
            <div class="v" title="${esc(val || '')}">${esc(val || '–')}${changed ? `<small>${esc(t('set.versions.was', { v: old }))}</small>` : ''}</div></div>`;
        };
        host.innerHTML = `${cache.restart ? `<div class="statebox warn restart" role="alert"><div><div class="st-title"><span class="led warn"></span>${t('set.update.restart_title')}</div>
            <div class="st-detail">${t('set.update.restart_text')}</div></div></div>` : ''}
          <div class="kv">${cell('HCLoader', v && v.app)}${cell('yt-dlp', v && v.ytdlp, v ? !!v.ytdlp : undefined, was.ytdlp)}${cell(t('set.versions.plugin'), v && v.plugin, v ? !!v.plugin : undefined, was.plugin)}
          ${cell('Deno', v && v.deno, v ? s.deno_ok !== false : undefined)}${cell('ffmpeg', v && v.ffmpeg, v ? s.ffmpeg_ok !== false : undefined)}${cell('Python', v && v.python)}</div>`;
      };
      host._paint = paint;
      paint();
      loadVersions();
    },
    update(host) {
      const head = () => {
        const u = cache.update;
        if (!u) return '';
        const span = util.fmtDur(Math.round(((u.end || Date.now()) - u.start) / 1000));
        const text = u.state === 'live' ? t('set.update.out_live', { t: span }) : u.state === 'failed' ? t('set.update.out_failed') : t('set.update.out_done', { t: span });
        return `${u.state === 'live' ? '<span class="spinner"></span>' : `<span class="led ${u.state === 'failed' ? 'err' : ''}"></span>`}<span>${esc(text)}</span>`;
      };
      const paint = () => {
        const v = cache.versions, u = cache.update, live = !!u && u.state === 'live';
        host.innerHTML = `<div class="field plain"><div class="fl"><b>${t('set.update.label')}</b><span class="help">${t('set.update.help')}</span>
          <em>${t('set.update.last_check')}: ${v ? esc(util.fmtWhen(v.last_update_check)) : '–'}</em></div>
          <div class="fc"><div class="fc-main"><button class="btn primary${live ? ' busy' : ''}" data-update ${live ? 'disabled' : ''}>${live ? '<span class="spinner"></span>' : I.refresh}${t(live ? 'set.update.running' : 'set.update.button')}</button>
          ${u ? `<div class="console-wrap ${u.state}"><div class="console-head" data-console-head>${head()}</div>
            <div class="console" data-console>${u.lines.length ? u.lines.map(consoleLine).join('') : `<span class="wait">${t('set.update.waiting')}</span>`}</div></div>` : ''}</div></div></div>`;
        const box = $('[data-console]', host);
        if (box) box.scrollTop = box.scrollHeight;
      };
      host._paint = paint;
      host._tick = () => { const h = $('[data-console-head]', host); if (h) h.innerHTML = head(); };
      host.addEventListener('click', (e) => { if (e.target.closest('[data-update]')) runUpdate(); });
      paint();
    },
    database(host) {
      const paint = () => {
        const v = cache.versions;
        const list = (v && Array.isArray(v.backups) ? v.backups : cache.backups).slice().sort((x, y) => String(y.created || '').localeCompare(String(x.created || '')));
        const last = (v && v.last_backup) || (list[0] && list[0].created) || null;
        const shown = list.slice(0, 5);
        host.innerHTML = `<div class="field plain"><div class="fl"><b>${t('set.db.label')}</b><span class="help">${t('set.db.help')}</span>
          <em>${v ? esc(v.db_path) : '–'}</em></div>
          <div class="fc"><div class="fc-main"><button class="btn" data-db="backup">${I.db}${t('set.db.backup')}</button>
            <button class="btn ghost" data-db="data" title="${esc(t('set.db.open_title'))}">${I.folder}${t('set.db.open')}</button>
            <button class="btn ghost" data-db="logs" title="${esc(t('set.db.open_logs_title'))}">${I.folder}${t('set.db.open_logs')}</button>
            <div class="dbinfo" title="${esc(t('set.db.keep'))}"><span>${v ? t('set.db.info', { n: util.fmtNum(v.db_entries), mb: v.db_size_mb }) : '–'}</span>
              <span>${t('set.db.last')}: <b title="${esc(util.fmtFull(last))}">${last ? esc(util.fmtRel(last)) : t('set.db.never')}</b></span></div>
            ${shown.length ? `<div class="backups"><div class="lbl">${t('set.db.backups')}</div>
              ${shown.map((b) => `<div class="bk${b.name === cache.freshBackup ? ' fresh' : ''}" title="${esc(b.path || b.name || '')}">${I.db}<span class="name">${esc(b.name || '')}${b.name === cache.freshBackup ? `<span class="rtag ok">${t('set.db.fresh')}</span>` : ''}</span>
                <span class="sz">${b.size_mb != null ? `${esc(b.size_mb)} MB` : ''}</span><span class="when">${esc(util.fmtFull(b.created))}</span></div>`).join('')}
              ${list.length > shown.length ? `<div class="bk-more">${t('set.db.backups_more', { n: list.length - shown.length })}</div>` : ''}</div>` : ''}
            <div class="fhint dbkeep">${t('set.db.keep')}</div>
          </div></div></div>`;
      };
      host._paint = paint;
      host.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-db]');
        if (!b) return;
        if (b.dataset.db !== 'backup') {
          const r = await HC.bridge.safe('open_path', b.dataset.db);
          if (r && r.ok) ui.toast(t('toast.folder_opening'), 'info', 1600);
          else if (r) ui.toast(r.error || t('err.generic'), 'err');
          return;
        }
        ui.busy(b, true, t('set.db.backing_up'));
        const r = await HC.bridge.safe('backup_db');
        if (r && r.ok) {
          const name = String(r.path || '').split(/[\\/]/).pop();
          const now = new Date().toISOString();
          if (cache.versions) cache.versions.last_backup = now;
          cache.backups.unshift({ name, path: r.path, created: now });
          cache.freshBackup = name;
          ui.toast(t('toast.backup_done', { path: r.path }), 'ok', 5000);
          await loadVersions(); // Liste und Grössen vom Backend, falls es sie liefert
        } else if (r) ui.toast(r.error || t('err.generic'), 'err');
        paint();
      });
      paint();
    },
    resetAll(host) {
      host.innerHTML = row('set.reset_all', `<button class="btn danger" data-reset-all>${I.retry}${t('set.reset_all.button')}</button>`);
      host.addEventListener('click', async (e) => {
        if (!e.target.closest('[data-reset-all]')) return;
        const yes = await ui.confirm(t('dlg.reset_all.title'), t('dlg.reset_all.text'), { okLabel: t('dlg.reset_all.ok'), danger: true, kind: 'warn' });
        if (!yes) return;
        const r = await HC.bridge.safe('reset_settings');
        if (!r || !r.ok) return;
        const s = await HC.bridge.safe('get_settings');
        if (!s) return;
        HC.settings.defaults = s.defaults;
        adopt(s.values);
        HC.app.settingsSaved(s.values);
        ui.toast(t('toast.reset_all'), 'warn');
        render();
      });
    },

    /* Genre-Editor */
    genres(host) {
      const items = () => work.genres.items;
      const isFallback = (g) => g.name === FALLBACK_GENRE;
      const sync = () => { items().forEach((g, i) => { g.priority = i + 1; }); Object.keys(errors).forEach((k) => { if (k.startsWith('genres.')) delete errors[k]; }); onChange('genres.items'); };
      const rowHtml = (g, i, n) => {
        const fb = isFallback(g), last = i >= n - 1 || isFallback(items()[i + 1] || {});
        const eName = errors[`genres.items.${i}.name`], eColor = errors[`genres.items.${i}.color`];
        return `<div class="genre-row${eName || eColor ? ' has-error' : ''}" data-key="${genreKeys[i]}" data-i="${i}" style="--c:${esc(g.color)}">
          <div class="prio"><button type="button" class="iconbtn" data-g="up" title="${esc(t('set.genres.up'))}" ${fb || i === 0 ? 'disabled' : ''}>${I.up}</button><span>${i + 1}</span>
            <button type="button" class="iconbtn" data-g="down" title="${esc(t('set.genres.down'))}" ${fb || last ? 'disabled' : ''}>${I.down}</button></div>
          <label class="swatch" title="${esc(t('set.genres.color'))}"><input type="color" data-g="color" value="${esc(g.color)}"></label>
          <div class="gname"><input class="input" data-g="name" value="${esc(g.name)}" placeholder="${esc(t('set.genres.name_ph'))}" ${fb ? 'disabled' : ''} spellcheck="false"><small data-hex>${esc(g.color)}</small></div>
          ${fb ? `<div class="unit" style="padding:9px 2px;white-space:normal">${t('set.genres.fallback')}</div>` : '<div data-kw></div>'}
          ${fb ? '<span></span>' : `<button type="button" class="iconbtn danger del" data-g="del" title="${esc(t('set.genres.delete'))}">${I.trash}</button>`}
          ${eName || eColor ? `<div class="row-error">${esc(eName || eColor)}</div>` : ''}</div>`;
      };
      const paint = (animateNew) => {
        while (genreKeys.length < items().length) genreKeys.push(`g${gk++}`);
        const list = $('.genre-list', host);
        list.innerHTML = items().map((g, i) => rowHtml(g, i, items().length)).join('');
        $$('[data-kw]', list).forEach((k) => {
          const i = +k.closest('.genre-row').dataset.i;
          ui.chips(k, { list: items()[i].keywords, placeholder: t('set.genres.kw_ph'), onChange: (l) => { items()[i].keywords = l; sync(); } });
        });
        const top = errors['genres.items'];
        $('[data-gerr]', host).innerHTML = top ? ui.notice('error', esc(top)) : '';
        $('[data-greset]', host).disabled = eq(items(), defaults.genres.items);
        if (animateNew != null) { const r = list.children[animateNew]; if (r) { fx.pop(r, 'moved'); const inp = $('[data-g=name]', r); if (inp && !inp.value) inp.focus(); } }
      };
      host.innerHTML = `<div data-gerr></div><div class="genre-list"></div>
        <div style="display:flex;align-items:center;gap:14px;margin-top:12px"><button class="btn sm" data-gadd>${I.plus}${t('set.genres.add')}</button>
          <span class="spacer"></span><span class="unit">${t('set.default')}: ${esc(defaults.genres.items.map((g) => g.name).join(', '))}</span>
          <button type="button" class="linkbtn" data-greset>${t('common.reset')}</button></div>`;
      const move = (i, d) => {
        const j = i + d;
        const list = $('.genre-list', host);
        fx.flip(list, () => {
          [items()[i], items()[j]] = [items()[j], items()[i]];
          [genreKeys[i], genreKeys[j]] = [genreKeys[j], genreKeys[i]];
          sync();
          paint(j);
        });
      };
      host.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        const r = b.closest('.genre-row'), i = r ? +r.dataset.i : -1;
        if (b.dataset.g === 'up') move(i, -1);
        else if (b.dataset.g === 'down') move(i, 1);
        else if (b.dataset.g === 'del') { items().splice(i, 1); genreKeys.splice(i, 1); sync(); paint(); }
        else if (b.hasAttribute('data-gadd')) {
          const at = Math.max(0, items().findIndex(isFallback));
          const pos = items().some(isFallback) ? at : items().length;
          const used = items().map((g) => g.color.toLowerCase());
          items().splice(pos, 0, { name: '', color: PALETTE.find((c) => !used.includes(c)) || '#ffffff', keywords: [], priority: pos + 1 });
          genreKeys.splice(pos, 0, `g${gk++}`);
          sync();
          paint(pos);
        } else if (b.hasAttribute('data-greset')) { work.genres.items = clone(defaults.genres.items); genreKeys = []; sync(); paint(); }
      });
      host.addEventListener('input', (e) => {
        const r = e.target.closest('.genre-row');
        if (!r) return;
        const g = items()[+r.dataset.i], k = e.target.dataset.g;
        if (k === 'name') g.name = e.target.value;
        else if (k === 'color') { g.color = e.target.value; r.style.setProperty('--c', g.color); $('[data-hex]', r).textContent = g.color; }
        else return;
        r.classList.remove('has-error');
        const re = $('.row-error', r);
        if (re) re.remove();
        sync();
        $('[data-greset]', host).disabled = eq(items(), defaults.genres.items);
      });
      paint();
    },
  };

  /* ---------- Rahmen: Tabs, Pane, Savebar ---------- */
  function onChange(key) {
    if (key.startsWith('appearance.')) HC.app.applyAppearance(work.appearance);
    const tab = TABS.find((x) => x.id === cur);
    tab.fields.forEach((def) => { if (def.k) { const d = $(`.field[data-k="${def.k}"]`, el); if (d) paintField(d, def); } });
    $$('[data-custom]', el).forEach((h) => h._update && h._update());
    paintChrome();
  }
  function paintChrome() {
    $('#stabs', el).innerHTML = TABS.map((tab) => {
      const nErr = errorsOf(tab).length, dirty = tabKeys(tab).some(isDirtyKey);
      return `<div class="stab${tab.id === cur ? ' active' : ''}" data-tab="${tab.id}" tabindex="0" role="tab" aria-selected="${tab.id === cur}">${t('tabs.' + tab.id)}${nErr ? `<span class="mark err">${nErr}</span>` : dirty ? '<span class="mark dirty"></span>' : ''}</div>`;
    }).join('');
    const n = dirtyKeys().length, nErr = Object.keys(errors).length;
    const bar = $('#savebar', el);
    bar.classList.toggle('dirty', n > 0 && !nErr);
    bar.classList.toggle('errors', nErr > 0);
    $('#save-state', el).innerHTML = `<span class="led ${nErr || n ? '' : 'off'}"></span><span>${nErr ? t(nErr === 1 ? 'set.state_error' : 'set.state_errors', { n: nErr }) : n ? t(n === 1 ? 'set.state_dirty_one' : 'set.state_dirty', { n }) : t('set.state_clean')}</span>`;
    $('#btn-save', el).disabled = !n;
    $('#btn-discard', el).disabled = !n;
    const tab = TABS.find((x) => x.id === cur);
    $('#btn-tab-reset', el).disabled = tabKeys(tab).length === 0 || tabKeys(tab).every((k) => eq(get(work, k), get(defaults, k)));
  }
  function renderPane(animate) {
    const tab = TABS.find((x) => x.id === cur);
    const body = $('#spane-body', el);
    const scroller = $('#spane-scroll', el);
    const top = animate ? 0 : scroller.scrollTop;
    body.innerHTML = `<h3 class="glitch" data-text="${esc(t('tabs.' + tab.id))}">${t('tabs.' + tab.id)}</h3><p class="hint">${t(`tabs_hint.${tab.id}`)}</p>`;
    tab.fields.forEach((def) => {
      if (def.h) { body.insertAdjacentHTML('beforeend', `<h4>${t(def.h)}</h4>`); return; }
      if (def.custom) {
        const host = document.createElement('div');
        host.dataset.custom = def.custom;
        body.appendChild(host);
        CUSTOM[def.custom](host);
        return;
      }
      body.appendChild(fieldEl(def));
    });
    scroller.scrollTop = top;
    if (animate && !fx.reduced()) { body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter'); }
  }
  function render(animate) {
    renderPane(animate !== false);
    paintChrome();
  }
  function adopt(values) {
    saved = clone(values);
    work = clone(values);
    defaults = HC.settings.defaults;
    errors = {};
    genreKeys = [];
  }

  async function save() {
    const btn = $('#btn-save', el);
    ui.busy(btn, true, t('set.saving'));
    const r = await HC.bridge.safe('save_settings', clone(work));
    ui.busy(btn, false);
    if (!r) return;
    if (r.ok) {
      saved = clone(work);
      errors = {};
      HC.app.settingsSaved(saved);
      ui.toast(t('toast.settings_saved'));
      render(false);
      return;
    }
    errors = r.errors || {};
    const firstTab = TABS.find((tab) => errorsOf(tab).length);
    const n = Object.keys(errors).length;
    ui.toast(t(n === 1 ? 'toast.settings_error' : 'toast.settings_errors', { n }), 'err');
    if (firstTab && !errorsOf(TABS.find((x) => x.id === cur)).length) cur = firstTab.id;
    render(false);
    const bad = $('.field.has-error, .genre-row.has-error, [data-gerr] .notice', el);
    if (bad) bad.scrollIntoView({ block: 'center', behavior: fx.reduced() ? 'auto' : 'smooth' });
  }

  function init(root) {
    el = root;
    el.innerHTML = `
      <div class="view-head"><h2 class="glitch" data-text="${t('settings.title')}">${t('settings.title')}</h2><span class="sub">${t('settings.sub')}</span></div>
      <div class="settings">
        <div class="stabs" id="stabs" role="tablist"></div>
        <div class="spane">
          <div class="spane-scroll" id="spane-scroll"><div class="spane-body" id="spane-body"></div></div>
          <div class="savebar" id="savebar">
            <div class="state" id="save-state"></div>
            <button class="btn ghost" id="btn-tab-reset" title="${esc(t('set.tab_reset_title'))}">${t('set.tab_reset')}</button>
            <button class="btn ghost" id="btn-discard">${t('set.discard')}</button>
            <button class="btn primary" id="btn-save">${I.check}${t('common.save')}</button>
          </div>
        </div>
      </div>`;
    const pick = (e) => {
      const s = e.target.closest('.stab');
      if (!s || s.dataset.tab === cur) return;
      cur = s.dataset.tab;
      render();
      try { history.replaceState(null, '', `#settings/${cur}`); } catch (err) { /* file:// */ }
    };
    $('#stabs', el).addEventListener('click', pick);
    $('#stabs', el).addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); $(`.stab[data-tab="${cur}"]`, el).focus(); } });
    $('#btn-save', el).onclick = save;
    $('#btn-discard', el).onclick = () => { work = clone(saved); errors = {}; genreKeys = []; HC.app.applyAppearance(saved.appearance); render(false); };
    $('#btn-tab-reset', el).onclick = () => {
      const tab = TABS.find((x) => x.id === cur);
      tabKeys(tab).forEach((k) => { set(work, k, clone(get(defaults, k))); });
      Object.keys(errors).forEach((e) => { if (tabKeys(tab).some((k) => e === k || e.startsWith(k + '.'))) delete errors[e]; });
      genreKeys = [];
      if (tab.id === 'appearance') HC.app.applyAppearance(work.appearance);
      render(false);
    };
    document.addEventListener('keydown', (e) => {
      if (HC.app.current() === 'settings' && e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); if (!$('#btn-save', el).disabled) save(); }
    });
    HC.bridge.on('log', onUpdateLog);
    HC.bridge.on('status_rendered', () => { if (HC.app.current() === 'settings') $$('[data-custom]', el).forEach((h) => h._update && h._update()); });
  }

  function show(arg) {
    if (!saved || (!dirtyKeys().length && !eq(saved, HC.settings.values))) adopt(HC.settings.values);
    if (arg && TABS.some((x) => x.id === arg)) cur = arg;
    render();
  }

  HC.views.settings = { init, show, reset() { saved = null; Object.assign(cache, { task: null, versions: null, blacklist: null, poTest: null, update: null, before: null, restart: false, backups: [], freshBackup: '' }); } };
})();
