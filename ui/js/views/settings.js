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
  const PLACEHOLDERS = ['genre', 'artist', 'channel', 'year', 'date', 'title', 'id', 'platform', 'festival', 'event_year', 'stage'];
  const MIN_YEAR = 2005; // wie core/config.MIN_UPLOAD_YEAR
  const thisYear = () => new Date().getFullYear();

  /* ---------- Schema der Tabs ----------
     type: bool | int | float | select | seg (Segment-Schalter) | text | time | date | chips
     scale: Anzeige = Wert / scale (z.B. Sekunden -> Minuten)
     enabled(w): Feld nur bedienbar, wenn die Funktion true liefert
     visible(w): Feld nur sichtbar, wenn die Funktion true liefert (Fehler zeigen es trotzdem)
     zeroEmpty: 0 bedeutet «nicht gesetzt» (leeres Feld)
     max: Zahl oder Funktion
     after(w): nach einer Änderung abhängige Werte nachziehen -> Liste der neu zu zeichnenden Schlüssel
     {h: key} = Zwischenüberschrift, {custom: name, arg} = Sonderblock
     Felder, die das Backend (noch) nicht kennt (kein Standardwert), werden nicht gezeigt.          */
  const SC_ON = (w) => !!(w.soundcloud && w.soundcloud.enabled);
  const TABS = [
    { id: 'general', fields: [
      { k: 'general.language', type: 'select', options: ['auto', ...HC.i18n.SUPPORTED],
        optLabel: (v) => (v === 'auto' ? t('opt.general.language.auto') : HC.i18n.meta(v).name) },
      { k: 'general.start_view', type: 'select', options: ['discover', 'inbox', 'watchlist', 'downloads', 'library', 'log'], optLabel: (v) => t('nav.' + v) },
      { k: 'general.log_level', type: 'select', options: ['DEBUG', 'INFO', 'WARNING', 'ERROR'] },
      { k: 'general.confirm_delete', type: 'bool' },
      { h: 'set.h.playback' },
      { k: 'player.mode', type: 'seg', options: ['internal', 'external'] },
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
      { k: 'filters.hide_cross_platform_duplicates', type: 'bool' },
    ] },
    { id: 'genres', fields: [{ custom: 'genres' }], keys: ['genres.items'] },
    { id: 'festivals', fields: [
      { custom: 'festStatus' },
      { h: 'set.h.detection' },
      { k: 'festivals.detect', type: 'bool' },
      { k: 'festivals.min_confidence', type: 'float', min: 0.3, max: 1, enabled: (w) => w.festivals.detect },
      { k: 'festivals.year_from_upload_date', type: 'bool', enabled: (w) => w.festivals.detect },
      { k: 'festivals.match_description', type: 'bool', enabled: (w) => w.festivals.detect },
      { k: 'festivals.extra_stages', type: 'chips', lower: false, placeholder: 'set.festivals.extra_stages.ph' },
      { custom: 'festTypes' },
      { custom: 'festTest' },
      { h: 'set.h.tags' },
      { k: 'storage.album_from_edition', type: 'bool' },
      { h: 'set.h.series' },
      { custom: 'series' },
    ], keys: ['festivals.detect', 'festivals.min_confidence', 'festivals.year_from_upload_date', 'festivals.match_description', 'festivals.extra_stages', 'festivals.extra_set_types', 'storage.album_from_edition'] },
    { id: 'download', fields: [
      { k: 'download.audio_format', type: 'select', options: ['mp3', 'original'] },
      { k: 'download.mp3_quality', type: 'select', options: ['320', 'v0'], enabled: (w) => w.download.audio_format === 'mp3' },
      { h: 'set.h.cover' },
      { k: 'download.embed_cover', type: 'bool' },
      { k: 'download.write_cover_jpg', type: 'bool' },
      { h: 'set.h.chapters' },
      { k: 'download.write_cue', type: 'bool' },
      { k: 'download.write_id3_chapters', type: 'bool', enabled: (w) => w.download.audio_format === 'mp3' },
      { h: 'set.h.soundcloud' },
      { k: 'download.keep_original_soundcloud', type: 'bool' },
    ] },
    { id: 'storage', fields: [
      { k: 'storage.target_dir', type: 'text', mono: true, wide: true, browse: true },
      { k: 'storage.path_template', type: 'text', mono: true, wide: true },
      { custom: 'pathPreview' },
      { k: 'storage.max_title_length', type: 'int', min: 20, max: 200, unit: 'unit.chars' },
      { k: 'storage.max_path_length', type: 'int', min: 100, max: 259, unit: 'unit.chars' },
      { h: 'set.h.tags' },
      { k: 'storage.artist_from_title', type: 'bool' },
      { k: 'storage.album_from_edition', type: 'bool' },
      { k: 'storage.title_cleanup_patterns', type: 'chips', lower: false, commaSplits: false, placeholder: 'set.storage.title_cleanup_patterns.ph' },
    ] },
    { id: 'throttle', fields: [
      { custom: 'backoff', arg: 'youtube' },
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
      { custom: 'ladder', arg: 'throttle' },
    ] },
    { id: 'soundcloud', fields: [
      { custom: 'backoff', arg: 'soundcloud' },
      { k: 'soundcloud.enabled', type: 'bool' },
      { h: 'set.h.pauses' },
      { k: 'soundcloud.sleep_requests', type: 'float', min: 0, max: 60, unit: 'unit.s', enabled: SC_ON },
      { k: 'soundcloud.sleep_interval', type: 'int', min: 0, max: 3600, unit: 'unit.s', enabled: SC_ON },
      { k: 'soundcloud.max_sleep_interval', type: 'int', min: 0, unit: 'unit.s', rangeKey: 'range.ge_sleep', enabled: SC_ON },
      { k: 'soundcloud.limit_rate_mb', type: 'float', min: 0, unit: 'unit.mbs', enabled: SC_ON },
      { h: 'set.h.limits' },
      { k: 'soundcloud.max_downloads_per_run', type: 'int', min: 1, max: 100, enabled: SC_ON },
      { k: 'soundcloud.max_downloads_per_day', type: 'int', min: 1, max: 500, enabled: SC_ON },
      { k: 'soundcloud.max_searches_per_hour', type: 'int', min: 1, max: 200, enabled: SC_ON },
      { h: 'set.h.backoff' },
      { k: 'soundcloud.backoff_initial_hours', type: 'float', min: 0.5, max: 168, unit: 'unit.h', enabled: SC_ON },
      { k: 'soundcloud.backoff_max_hours', type: 'float', min: 0.5, unit: 'unit.h', rangeKey: 'range.ge_initial', enabled: SC_ON },
      { custom: 'ladder', arg: 'soundcloud' },
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
      { h: 'set.h.app_update' },
      { custom: 'appUpdate' },
      { k: 'maintenance.check_app_updates_on_start', type: 'bool' },
      { k: 'maintenance.apply_update_on_exit', type: 'bool' },
      { k: 'maintenance.update_repo', type: 'text', mono: true },
      { h: 'set.h.release_notes' },
      { custom: 'releaseNotes' },
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
  const cache = { task: null, versions: null, blacklist: null, poTest: null, update: null, before: null, restart: false, backups: [], freshBackup: '', fest: null, assign: null, series: null, seriesHidden: false };

  const isDirtyKey = (k) => !eq(get(work, k), get(saved, k));
  const dirtyKeys = () => [...new Set(TABS.flatMap(tabKeys))].filter(isDirtyKey); // ein Feld kann in zwei Tabs stehen
  const errorsOf = (tab) => Object.keys(errors).filter((e) => tabKeys(tab).some((k) => e === k || e.startsWith(k + '.')));

  /* ---------- Anzeige von Werten ---------- */
  const optLabel = (def, v) => (def.optLabel ? def.optLabel(v) : t(`opt.${def.k}.${v === '' ? 'none' : v}`));
  function fmtValue(def, v) {
    if (def.type === 'bool') return t(v ? 'common.on' : 'common.off');
    if (def.type === 'select' || def.type === 'seg') return optLabel(def, v);
    if (def.type === 'chips') return v.length ? (v.length > 5 ? `${v.slice(0, 5).join(', ')} … (+${v.length - 5})` : v.join(', ')) : t('common.empty_list');
    if ((def.type === 'int' || def.type === 'float') && def.zeroEmpty && !v) return t('set.not_set');
    if (def.type === 'int' || def.type === 'float') return `${util.showNum(v / (def.scale || 1))}${def.unit ? ' ' + t(def.unit) : ''}`;
    if (def.type === 'date') return v ? util.fmtDate(v) : t('common.empty');
    return v === '' ? t('common.empty') : String(v);
  }
  const maxOf = (def) => (typeof def.max === 'function' ? def.max() : def.max);
  function rangeText(def) {
    if (def.rangeKey) return t(def.rangeKey);
    const s = def.scale || 1, max = maxOf(def);
    if (def.min != null && max != null) return `${util.showNum(def.min / s)}–${util.showNum(max / s)}`;
    if (def.min != null) return `≥ ${util.showNum(def.min / s)}`;
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
      case 'seg':
        return `<div class="seg wide optseg" data-c role="radiogroup">${def.options.map((o) => `<button type="button" role="radio" data-v="${esc(o)}" class="${o === v ? 'on' : ''}" aria-checked="${o === v}">${esc(optLabel(def, o))}</button>`).join('')}</div>`;
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
    } else if (def.type === 'seg') {
      c.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-v]');
        if (!b || b.disabled || b.dataset.v === get(work, def.k)) return;
        $$('button', c).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
        commit(b.dataset.v);
      });
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
    $$('[data-c],[data-step],.optseg button', d).forEach((c) => { c.disabled = !on; });
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
      const sample = { genre: 'Hardcore', artist: 'Gabber Vault', channel: 'Gabber Vault', year: '2026', date: '2026-10-03', title: 'Millennium Hardcore Continuous Mix (Official Video) [HQ]', id: 'gMill3nnium', platform: 'YouTube', festival: 'Dominator', event_year: '2026', stage: 'Mainstage' };
      host.innerHTML = `<div class="field plain"><div class="fl"><b>${t('set.path_preview.label')}</b><span class="help">${t('set.path_preview.help')}</span></div>
        <div class="fc"><div class="fc-main"><div class="ph-list">${PLACEHOLDERS.map((p) => `<button type="button" class="ph" data-ph="{${p}}">{${p}}</button>`).join('')}</div><div class="preview" data-out></div><div class="fhint">${t('set.path_preview.fest')}</div></div></div></div>`;
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

    /* Backoff-Zustand + manuelles Aufheben, pro Plattform (clear_backoff(platform)) */
    backoff(host, platform) {
      const p = platform || 'youtube', name = HC.platform.label(p);
      host._update = () => {
        const bo = HC.platform.backoff(p);
        const html = p === 'soundcloud' && !HC.platform.scEnabled()
          ? box('off', t('set.backoff.sc_off'), t('set.backoff.sc_off_detail'), '', '', 'off')
          : bo
            ? box('warn', t('set.backoff.active', { p: name }), t('set.backoff.active_detail', { t: `<b>${esc(util.fmtWhen(bo.until))}</b>`, rest: `<b>${esc(util.fmtSpan(bo.remaining_s))}</b>`, level: `<b>${esc(bo.level)}</b>` }) + (bo.reason ? ` · ${esc(bo.reason)}` : ''),
              `<button class="btn sm danger" data-clear>${I.bolt}${t('set.backoff.clear')}</button>`, ui.notice('warn', t('set.backoff.blocked', { p: name })), 'warn blink')
            : box('ok', t('set.backoff.none', { p: name }), t('set.backoff.none_detail', { p: name }), `<button class="btn sm" disabled>${I.bolt}${t('set.backoff.clear')}</button>`, '', '');
        if (host._html !== html) { host.innerHTML = html; host._html = html; }
      };
      host.addEventListener('click', async (e) => {
        if (!e.target.closest('[data-clear]')) return;
        const yes = await ui.modal({
          title: t('dlg.backoff.title'), kind: 'warn', okLabel: t('dlg.backoff.ok'), danger: true,
          body: `<p>${t('dlg.backoff.text', { p: name })}</p>${ui.notice('warn', t('dlg.backoff.warn', { p: name }))}`,
        });
        if (!yes) return;
        const r = await HC.bridge.safe('clear_backoff', p);
        if (r && r.ok) { ui.toast(t('toast.backoff_cleared', { p: name }), 'warn'); HC.app.refreshStatus(); }
        else if (r) ui.toast(r.error || t('err.generic'), 'err');
      });
      host._update();
    },
    /* Backoff-Stufen als Leiter (section: "throttle" = YouTube | "soundcloud") */
    ladder(host, section) {
      const sec = section || 'throttle', p = sec === 'soundcloud' ? 'soundcloud' : 'youtube';
      host._update = () => {
        const a = +work[sec].backoff_initial_hours, m = +work[sec].backoff_max_hours;
        const steps = [];
        if (a > 0 && m >= a) { for (let h = a; steps.length < 8; h *= 2) { steps.push(Math.min(h, m)); if (h >= m) break; } }
        const bo = HC.platform.backoff(p);
        const level = (bo && bo.level) || 0;
        host.innerHTML = row('set.ladder', steps.length
          ? `<div class="ph-list" style="align-items:center">${steps.map((h, i) => `${i ? `<span class="unit">›</span>` : ''}<span class="tag" style="padding:1px 8px;${i + 1 === level ? 'border-color:var(--warn);color:var(--warn);background:var(--warn-soft)' : ''}"><span>${util.showNum(h)} ${t('unit.h')}</span></span>`).join('')}<span class="unit">· ${t('set.ladder.reset')}</span></div>`
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
        const h = util.showNum(+sc.watchlist_interval_hours || 0);
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
        /* Phase 6: Aufgabe zeigt auf einen anderen App-Ordner (App verschoben, z.B. Portable auf USB-Stick).
           «Neu anlegen» = create_task mit der aktuellen Uhrzeit; schtasks /F überschreibt die alte Aufgabe. */
        if (s.registered && s.path_mismatch) {
          host.innerHTML = box('warn', t('set.task.moved'),
            t('set.task.moved_detail', { cmd: `<code>${esc(s.task_command || '')}</code>` }),
            `<button class="btn sm primary" data-task="create">${I.clock}${t('set.task.recreate')}</button>`
            + `<button class="btn sm danger" data-task="remove">${I.trash}${t('set.task.remove')}</button>`, '', 'warn');
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
    /* App-Update (Selbst-Update): Inhalt und Logik in js/updater.js */
    appUpdate(host) { if (HC.updater) HC.updater.section(host); },
    /* Versionshinweise aus der CHANGELOG.md der App (js/updater.js) */
    releaseNotes(host) { if (HC.updater) HC.updater.historySection(host); },
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
            <div class="dbinfo" title="${esc(t('set.db.keep'))}"><span>${v ? t('set.db.info', { n: util.fmtNum(v.db_entries), count: v.db_entries, mb: v.db_size_mb }) : '–'}</span>
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
        HC.app.settingsSaved(s.values, s.language);
        ui.toast(t('toast.reset_all'), 'warn');
        render();
      });
    },

    /* ---------- Festivals & Serien (v0.3.0) ---------- */
    /* Stand der Zuordnung + «Festivals jetzt zuordnen» (assign_festivals, Fortschritt: Event festival_assign) */
    festStatus(host) {
      const paint = () => {
        const s = cache.fest, a = cache.assign;
        if (!s) { host.innerHTML = box('off', t('common.loading'), '&nbsp;', '', '', 'off'); return; }
        const running = a ? !!a.running : !!s.running;
        const pct = a && a.total ? Math.round(((a.done || 0) / a.total) * 100) : 0;
        const detail = `${esc(t('fest.suggestions', { n: s.suggested }))} · ${t('set.fest_status.last')}: <b>${esc(s.last_pass ? util.fmtWhen(s.last_pass) : t('fmt.never'))}</b><br>${t('set.fest_status.help')}`;
        const actions = running
          ? `<button class="btn sm danger" data-fest="cancel"${a && a.cancelling ? ' disabled' : ''}>${I.x}${t('common.cancel')}</button>`
          : `<button class="btn sm primary" data-fest="assign"${s.total ? '' : ' disabled'}>${I.flag}${t('set.fest_status.button')}</button>`;
        const res = a && a.result;
        const extra = running
          ? `<div class="fest-prog"><div class="progress${a && a.total ? '' : ' indet'}"><div class="bar kick" style="width:${pct}%;--p:${pct}"></div></div><span class="unit">${esc(t('set.fest_status.running', { done: util.fmtNum((a && a.done) || 0), total: a && a.total ? util.fmtNum(a.total) : '…' }))}</span></div>`
          : res ? ui.notice(res.ok === false ? 'error' : res.cancelled ? 'warn' : 'ok', esc(res.ok === false ? res.error || t('err.generic') : t(res.cancelled ? 'toast.assign_cancelled' : 'toast.assign_done', { assigned: res.assigned || 0, suggested: res.suggested || 0 }))) : '';
        host.innerHTML = box(running ? 'warn' : s.assigned ? 'ok' : 'off', esc(t('set.fest_status.title', { assigned: util.fmtNum(s.assigned), total: util.fmtNum(s.total) })), detail, actions, extra, running ? 'warn blink' : s.assigned ? '' : 'off');
      };
      const load = async () => { const s = await HC.bridge.safe('get_festival_status'); if (s) { cache.fest = s; if (!s.running && cache.assign && cache.assign.running) cache.assign = null; if (host.isConnected) paint(); } };
      host._paint = paint;
      host._load = load;
      host.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-fest]');
        if (!b || b.disabled) return;
        if (b.dataset.fest === 'cancel') {
          if (cache.assign) cache.assign.cancelling = true;
          paint();
          await HC.bridge.safe('cancel_assign_festivals');
          return;
        }
        ui.busy(b, true);
        const r = await HC.bridge.safe('assign_festivals', { scope: 'library' });
        if (r && r.ok) { if (!cache.assign || !cache.assign.running) cache.assign = { running: true, done: 0, total: 0 }; }
        else if (r) ui.toast(r.error || t('err.generic'), 'err');
        paint();
      });
      paint();
      load();
    },
    /* Eigene Begriffe für Set-Arten: festivals.extra_set_types = [{keyword, set_type}] */
    festTypes(host) {
      const K = 'festivals.extra_set_types';
      const list = () => get(work, K) || [];
      const sync = () => { Object.keys(errors).forEach((k) => { if (k.startsWith(K)) delete errors[k]; }); onChange(K); };
      const paint = (focus) => {
        const rows = list().map((x, i) => {
          const err = errors[`${K}.${i}.keyword`] || errors[`${K}.${i}.set_type`] || errors[`${K}.${i}`];
          return `<div class="kwrow${err ? ' has-error' : ''}" data-i="${i}"><input class="input mono" data-kw value="${esc(x.keyword)}" maxlength="60" placeholder="${esc(t('set.fest_types.ph'))}" spellcheck="false" autocomplete="off">
            <span class="unit">→</span><select class="select" data-st>${HC.fest.SET_TYPES.map((c) => `<option value="${c}"${c === x.set_type ? ' selected' : ''}>${esc(HC.fest.setType(c))}</option>`).join('')}</select>
            <button type="button" class="iconbtn danger" data-del title="${esc(t('common.remove'))}">${I.trash}</button>${err ? `<div class="row-error">${esc(err)}</div>` : ''}</div>`;
        }).join('');
        const top = errors[K];
        host.innerHTML = `<div class="field plain${isDirtyKey(K) ? ' dirty' : ''}"><div class="fl"><b>${t('set.fest_types.label')}</b><span class="help">${t('set.fest_types.help')}</span></div>
          <div class="fc"><div class="fc-main kwlist">${rows}<button type="button" class="btn sm" data-add>${I.plus}${t('set.fest_types.add')}</button>${top ? `<div class="row-error">${esc(top)}</div>` : ''}</div></div></div>`;
        if (focus != null) { const inp = $(`.kwrow[data-i="${focus}"] [data-kw]`, host); if (inp) inp.focus(); }
      };
      host.addEventListener('click', (e) => {
        const r = e.target.closest('.kwrow');
        if (e.target.closest('[data-add]')) { set(work, K, list().concat([{ keyword: '', set_type: 'live_set' }])); sync(); paint(list().length - 1); }
        else if (r && e.target.closest('[data-del]')) { set(work, K, list().filter((x, i) => i !== +r.dataset.i)); sync(); paint(); }
      });
      const edit = (e) => {
        const r = e.target.closest('.kwrow');
        if (!r) return;
        const x = list()[+r.dataset.i];
        if (e.target.matches('[data-kw]')) x.keyword = e.target.value;
        else if (e.target.matches('[data-st]')) x.set_type = e.target.value;
        else return;
        sync();
        $('.field', host).classList.toggle('dirty', isDirtyKey(K));
      };
      host.addEventListener('input', edit);
      host.addEventListener('change', edit);
      paint();
    },
    /* Testfeld: detect_festival(titel) – speichert nichts, gilt mit den gespeicherten Einstellungen */
    festTest(host) {
      host.innerHTML = row('set.fest_test', `<input class="input wide" data-title placeholder="${esc(t('set.fest_test.ph'))}" spellcheck="false" autocomplete="off"><div class="fest-test" data-out hidden></div>`, 'fest-testrow');
      let seq = 0;
      const run = util.debounce(async () => {
        const my = ++seq, title = $('[data-title]', host).value.trim(), out = $('[data-out]', host);
        if (!title) { out.hidden = true; return; }
        const r = await HC.bridge.safe('detect_festival', title);
        if (my !== seq || !host.isConnected || !r) return;
        const d = r.detection;
        out.hidden = false;
        out.className = `fest-test ${d ? (r.assigned ? 'ok' : 'sugg') : 'none'}`;
        out.innerHTML = d
          ? `${HC.fest.kindIcon(d.kind)}<b>${esc(d.edition || d.series)}${d.episode ? ` #${esc(d.episode)}` : ''}</b>${d.stage ? `<span>${HC.fest.stageDot(d.stage)}${esc(d.stage)}</span>` : ''}${d.set_type ? `<span>${esc(HC.fest.setType(d.set_type))}</span>` : ''}<span class="mono">${Math.round((d.confidence || 0) * 100)} %</span><em>${t(r.assigned ? 'set.fest_test.assigned' : 'set.fest_test.suggested')}</em>`
          : `<em>${t('set.fest_test.none')}</em>`;
      }, 250);
      host.addEventListener('input', run);
    },
    /* Serien-Katalog (liegt in der DB): mitgelieferte + eigene. Jede Änderung wird sofort gespeichert. */
    series(host) {
      const fail = (r) => { if (r && !r.ok) ui.toast(r.error || t('err.generic'), 'err'); };
      const changed = () => { HC.bridge.emit('series_changed', {}); const st = $('[data-custom=festStatus]', el); if (st && st._load) st._load(); };
      const load = async () => {
        const l = await HC.bridge.safe('get_series', cache.seriesHidden);
        if (l) { cache.series = l; if (host.isConnected) paint(); }
      };
      const rowHtml = (s) => {
        const state = s.hidden ? 'hidden' : s.builtin ? (s.user_modified ? 'modified' : 'builtin') : 'own';
        const al = (s.aliases || []).concat(s.weak_aliases || []);
        const shown = al.slice(0, 6);
        return `<div class="series-row k-${esc(s.kind)}${s.hidden ? ' gone' : ''}${s.enabled === false ? ' off' : ''}" data-sid="${esc(s.id)}">
          <span class="sr-kind" title="${esc(HC.fest.kindLabel(s.kind))}">${HC.fest.kindIcon(s.kind)}</span>
          <div class="sr-main"><div class="sr-name"><b title="${esc(s.name)}">${esc(s.name)}</b><span class="rtag ${state}">${t('set.series.' + state)}</span>${s.default_genre ? `<span class="sr-genre">${ui.genreDot(s.default_genre)}</span>` : ''}</div>
            <div class="sr-al">${shown.length ? shown.map((a) => `<span title="${esc(a)}">${esc(a)}</span>`).join('') + (al.length > shown.length ? `<span class="more">+${al.length - shown.length}</span>` : '') : `<span class="more">${t('set.series.no_aliases')}</span>`}</div></div>
          <span class="sr-count mono" title="${esc(t('fest.sets', { n: s.count || 0 }))}">${util.fmtNum(s.count || 0)}</span>
          ${s.hidden ? `<span></span><button type="button" class="btn sm" data-s="restore">${I.retry}${t('set.series.restore')}</button>`
            : `${ui.toggle(s.enabled !== false, `data-s="enable" title="${esc(t('set.series.enable'))}" aria-label="${esc(t('set.series.enable'))}"`)}
              <span class="sr-act"><button type="button" class="iconbtn" data-s="edit" title="${esc(t('common.edit'))}">${I.edit}</button>${s.builtin && s.user_modified ? `<button type="button" class="iconbtn" data-s="reset" title="${esc(t('set.series.restore'))}">${I.retry}</button>` : ''}<button type="button" class="iconbtn danger" data-s="del" title="${esc(t(s.builtin ? 'set.series.hide' : 'common.delete'))}">${s.builtin ? I.ban : I.trash}</button></span>`}</div>`;
      };
      const paint = () => {
        const list = cache.series;
        host.innerHTML = `<p class="hint series-hint">${t('set.series.hint')}</p>
          <div class="series-bar"><button type="button" class="btn sm" data-s="add">${I.plus}${t('set.series.add')}</button>
            <label class="check"><input type="checkbox" data-s="hidden"${cache.seriesHidden ? ' checked' : ''}>${t('set.series.show_hidden')}</label><span class="spacer"></span>
            <button type="button" class="linkbtn" data-s="reset-all">${t('set.series.reset_all')}</button></div>
          <div class="series-list">${!list ? `<span class="unit">${t('common.loading')}</span>` : list.map(rowHtml).join('')}</div>`;
      };
      const editDialog = (s0) => {
        const isNew = !s0, s = s0 ? clone(s0) : { name: '', kind: 'festival', aliases: [], weak_aliases: [], channels: [], variants: [], default_genre: null, enabled: true };
        const err = (k) => `<div class="field-error" data-e="${k}" hidden></div>`;
        const genres = HC.genres.names();
        const chipsets = {};
        return ui.modal({
          title: t(isNew ? 'set.series.new_title' : 'set.series.edit_title'), okLabel: t('common.save'),
          body: `<div data-form-error hidden></div>
            <div class="frow inline"><div style="flex:1;min-width:0"><label class="lbl">${t('set.series.name')}</label><input class="input" data-f="name" value="${esc(s.name)}" maxlength="80" autocomplete="off" spellcheck="false">${err('name')}</div>
              <div style="width:150px;flex:none"><label class="lbl">${t('set.series.default_genre')}</label><select class="select" data-f="default_genre"><option value="">–</option>${genres.map((g) => `<option${s.default_genre === g ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select>${err('default_genre')}</div></div>
            <div class="frow"><label class="lbl">${t('set.series.kind')}</label><div class="seg wide" data-seg="kind">${HC.fest.KINDS.map((k) => `<button type="button" data-v="${k}" class="${s.kind === k ? 'on' : ''}" aria-pressed="${s.kind === k}">${HC.fest.kindIcon(k)}${esc(HC.fest.kindLabel(k))}</button>`).join('')}</div>${err('kind')}</div>
            ${[['aliases', 'aliases_help'], ['weak_aliases', 'weak_help'], ['variants', 'variants_help'], ['channels', 'channels_help']].map(([k, h]) => `<div class="frow"><label class="lbl">${t('set.series.' + k)}</label><div data-chips="${k}"></div><div class="fhint">${t('set.series.' + h)}</div>${err(k)}</div>`).join('')}`,
          onOpen(m) {
            m.querySelector('.modal').classList.add('series-modal');
            chipsets.aliases = ui.chips($('[data-chips=aliases]', m), { list: s.aliases || [], lower: false });
            chipsets.weak_aliases = ui.chips($('[data-chips=weak_aliases]', m), { list: s.weak_aliases || [], lower: false });
            chipsets.variants = ui.chips($('[data-chips=variants]', m), { list: (s.variants || []).map((v) => v.name), lower: false });
            chipsets.channels = ui.chips($('[data-chips=channels]', m), { list: s.channels || [], lower: false, commaSplits: false });
            m.addEventListener('click', (e) => {
              const b = e.target.closest('[data-seg] button');
              if (b) $$('button', b.parentElement).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
            });
          },
          async onOk(m) {
            const old = new Map((s.variants || []).map((v) => [v.name, v]));
            const data = {
              name: $('[data-f=name]', m).value.trim(), kind: $('[data-seg=kind] .on', m).dataset.v,
              aliases: chipsets.aliases.get(), weak_aliases: chipsets.weak_aliases.get(), channels: chipsets.channels.get(),
              variants: chipsets.variants.get().map((n) => old.get(n) || { name: n, aliases: [] }),
              default_genre: $('[data-f=default_genre]', m).value || null, enabled: s.enabled !== false,
            };
            if (!isNew) data.id = s.id;
            const okBtn = $('[data-act=ok]', m);
            ui.busy(okBtn, true);
            const r = await HC.bridge.safe('save_series', data);
            ui.busy(okBtn, false);
            if (r && r.ok) { ui.toast(t('toast.series_saved', { name: r.series.name })); changed(); load(); return true; }
            const errs = (r && r.errors) || {};
            let rest = [];
            Object.keys(errs).forEach((k) => { if (!$(`[data-e="${k}"]`, m)) rest.push(errs[k]); });
            $$('[data-e]', m).forEach((e) => { const msg = errs[e.dataset.e]; e.hidden = !msg; e.textContent = msg || ''; });
            const text = rest.concat(r && r.error && !Object.keys(errs).length ? [r.error] : []).join(' ');
            const fe = $('[data-form-error]', m);
            fe.hidden = !text;
            fe.innerHTML = text ? ui.notice('error', esc(text)) : '';
            return false;
          },
        });
      };
      host.addEventListener('change', (e) => { if (e.target.matches('[data-s=hidden]')) { cache.seriesHidden = e.target.checked; load(); } });
      host.addEventListener('click', async (e) => {
        const b = e.target.closest('button[data-s]');
        if (!b || b.disabled) return;
        const act = b.dataset.s, r0 = b.closest('.series-row');
        const s = r0 && (cache.series || []).find((x) => String(x.id) === r0.dataset.sid);
        if (act === 'add') return editDialog(null);
        if (act === 'reset-all') {
          const yes = await ui.confirm(t('dlg.series_reset.title'), t('dlg.series_reset.text'), { okLabel: t('dlg.series_reset.ok'), kind: 'warn', danger: true });
          if (!yes) return;
          const r = await HC.bridge.safe('reset_series');
          if (r && r.ok) { ui.toast(t('toast.series_reset'), 'warn'); changed(); load(); } else fail(r);
          return;
        }
        if (!s) return;
        if (act === 'edit') return editDialog(s);
        if (act === 'enable') {
          const on = s.enabled === false;
          ui.setToggle(b, on);
          const r = await HC.bridge.safe('set_series_enabled', s.id, on);
          if (r && r.ok) changed(); else fail(r);
          return load();
        }
        if (act === 'restore' || act === 'reset') {
          const r = await HC.bridge.safe('reset_series', s.id);
          if (r && r.ok) { ui.toast(t('toast.series_reset'), 'info'); changed(); load(); } else fail(r);
          return;
        }
        if (act === 'del') {
          const key = s.builtin ? 'series_hide' : 'series_delete';
          const yes = await ui.confirm(t(`dlg.${key}.title`), t(`dlg.${key}.text`, { name: s.name }), { okLabel: t(s.builtin ? 'set.series.hide' : 'common.delete'), danger: true, kind: 'del', warning: s.count ? esc(t('dlg.series_delete.warn', { n: s.count })) : '' });
          if (!yes) return;
          const r = await HC.bridge.safe('delete_series', s.id);
          if (r && r.ok) { ui.toast(t(r.hidden ? 'toast.series_hidden' : 'toast.series_deleted', { name: s.name }), 'warn'); changed(); load(); } else fail(r);
        }
      });
      host.addEventListener('repaint', paint);
      paint();
      load();
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
    $('#stabs', el).innerHTML = TABS.filter((tab) => !tab.hidden).map((tab) => {
      const nErr = errorsOf(tab).length, dirty = tabKeys(tab).some(isDirtyKey);
      return `<div class="stab${tab.id === cur ? ' active' : ''}" data-tab="${tab.id}" tabindex="0" role="tab" aria-selected="${tab.id === cur}">${t('tabs.' + tab.id)}${nErr ? `<span class="mark err">${nErr}</span>` : dirty ? '<span class="mark dirty"></span>' : ''}</div>`;
    }).join('');
    const n = dirtyKeys().length, nErr = Object.keys(errors).length;
    const bar = $('#savebar', el);
    bar.classList.toggle('dirty', n > 0 && !nErr);
    bar.classList.toggle('errors', nErr > 0);
    $('#save-state', el).innerHTML = `<span class="led ${nErr || n ? '' : 'off'}"></span><span>${nErr ? t('set.state_errors', { n: nErr }) : n ? t('set.state_dirty', { n }) : t('set.state_clean')}</span>`;
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
        CUSTOM[def.custom](host, def.arg);
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
    /* Felder ohne Standardwert kennt dieses Backend nicht -> weglassen; ein Tab ohne eigene Felder verschwindet. */
    TABS.forEach((tab) => {
      tab.all = tab.all || tab.fields;
      tab.fields = tab.all.filter((f) => !f.k || get(defaults, f.k) !== undefined);
      tab.hidden = !tab.keys && tab.all.some((f) => f.k) && !tab.fields.some((f) => f.k);
    });
    if (TABS.find((x) => x.id === cur).hidden) cur = 'general';
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
      HC.app.settingsSaved(saved, r.language);
      ui.toast(t('toast.settings_saved'));
      render(false);
      return;
    }
    errors = r.errors || {};
    const firstTab = TABS.find((tab) => errorsOf(tab).length);
    const n = Object.keys(errors).length;
    ui.toast(t('toast.settings_errors', { n }), 'err');
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
    /* «Festivals zuordnen»: Fortschritt in den Tab, Ergebnis als Toast (auch wenn ein anderer Tab offen ist). */
    HC.bridge.on('festival_assign', (d) => {
      const host = $('[data-custom=festStatus]', el);
      if (d.phase === 'start' || d.phase === 'progress') cache.assign = Object.assign(cache.assign && cache.assign.running ? cache.assign : { running: true, done: 0, total: 0 }, d.done != null ? { done: d.done } : {}, d.total != null ? { total: d.total } : {});
      else {
        cache.assign = { running: false, result: d };
        if (d.phase === 'error' || d.ok === false) ui.toast(d.error || t('err.generic'), 'err');
        else ui.toast(t(d.cancelled ? 'toast.assign_cancelled' : 'toast.assign_done', { assigned: d.assigned || 0, suggested: d.suggested || 0 }), d.cancelled ? 'warn' : 'ok', 5000);
        const sr = $('[data-custom=series]', el);
        if (host && host._load) host._load();
        if (sr) HC.bridge.safe('get_series', cache.seriesHidden).then((l) => { if (l && sr.isConnected) { cache.series = l; sr.dispatchEvent(new CustomEvent('repaint')); } });
      }
      if (host && host._paint) host._paint();
    });
    HC.bridge.on('status_rendered', () => { if (HC.app.current() === 'settings') $$('[data-custom]', el).forEach((h) => h._update && h._update()); });
  }

  function show(arg) {
    if (!saved || (!dirtyKeys().length && !eq(saved, HC.settings.values))) adopt(HC.settings.values);
    if (arg && TABS.some((x) => x.id === arg && !x.hidden)) cur = arg;
    render();
  }

  HC.views.settings = { init, show, reset() { saved = null; Object.assign(cache, { task: null, versions: null, blacklist: null, poTest: null, update: null, before: null, restart: false, backups: [], freshBackup: '', fest: null, assign: null, series: null, seriesHidden: false }); } };
})();
