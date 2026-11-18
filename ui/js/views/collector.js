/* =====================================================================
   views/collector.js – Festival-Sammler (v0.5.0): Unteransicht der Bibliothek (HC.collector)
   Übersicht aller Checklisten (#library/collector) und die Checkliste einer Ausgabe
   (#library/collector-<edition_id>): Kennzahlen (= Statusfilter), Quellen (Playlist des Veranstalters,
   Timetable einfügen, mitgelieferte Dateien, Zeile von Hand), Tabelle mit Haken, Treffer bestätigen/
   verwerfen, Bearbeiten in der Zeile, Suchauftrag mit Schätzung und Fortschritt, «Angehakte laden».

   Vertrag: docs/bridge-api.md «Festival collector». Zeilen und Kennzahlen kommen vom Backend
   (Events collector_rows / collector_job / collector_import); lokal wird nur sofort nachgezeichnet.
   DJ-Namen, Titel und eingefügter Text sind fremde Daten: alles läuft durch esc().
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const STATUSES = ['found', 'queued', 'downloaded', 'missing', 'ignored'];
  const ACTIVE = ['pending', 'running', 'paused'];
  const NO = '__none__'; // Filterwert «ohne Bühne / ohne Tag»

  let el = null;
  let hooks = {};
  let mode = null; // null = zu | 'list' | 'edition'
  let editions = [];
  let series = [];
  let ed = null, rows = [], stats = null, job = null;
  let imp = null; // laufender Playlist-Import (Event collector_import)
  let editing = null; // Zeilen-id | 'new'
  let seq = 0; // verwirft Antworten einer verlassenen Ansicht
  const filter = { stage: '', day: '', status: '', q: '' };
  const known = new Map(); // edition_id -> ChecklistStats (Knopf in der Festival-Ansicht)

  /* ---------- Helfer ---------- */
  const fail = (r) => { if (r && !r.ok) ui.toast(r.error || t('err.generic'), 'err'); };
  const byPos = (a, b) => a.position - b.position || a.id - b.id;
  const pct = (c) => (c == null ? '' : util.fmtPct(Math.round(c * 100)));
  const isActive = (j) => !!j && ACTIVE.includes(j.state);
  const uniq = (key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))];
  const setHash = (arg) => { try { history.replaceState(null, '', `#library/${arg}`); } catch (e) { /* file:// – egal */ } };
  const timeOf = (r) => (r.start && r.end ? `${r.start}–${r.end}` : r.start || '');

  /** Kennzahlen aus den Zeilen (wie collector.stats) – nur bis das Backend seine schickt. */
  function localStats() {
    const s = { total: 0, missing: 0, found: 0, queued: 0, downloaded: 0, ignored: 0, checked: 0, to_confirm: 0, ready: 0, to_search: 0 };
    rows.forEach((r) => {
      s.total++;
      if (s[r.status] != null) s[r.status]++;
      if (!r.checked || r.ignored) return;
      s.checked++;
      if (r.needs_confirmation) s.to_confirm++;
      else if (r.status === 'found') s.ready++;
      if (!r.video && !r.searched) s.to_search++;
    });
    return s;
  }
  const searchedMissing = () => rows.filter((r) => r.checked && !r.ignored && !r.video && r.searched).length;

  function visible() {
    const q = util.norm(filter.q.trim());
    return rows.filter((r) => (!filter.stage || (filter.stage === NO ? !r.stage : r.stage === filter.stage))
      && (!filter.day || (filter.day === NO ? !r.day : r.day === filter.day))
      && (!filter.status || (filter.status === 'to_confirm' ? r.needs_confirmation : r.status === filter.status))
      && (!q || util.norm(`${r.artist} ${r.video ? r.video.title : ''}`).includes(q)));
  }
  const filtersOn = () => !!(filter.stage || filter.day || filter.status || filter.q.trim());

  /* ---------- Gemeinsamer Kopf ---------- */
  function shell(o) {
    el.innerHTML = `
      <div class="view-head co-head">
        <button type="button" class="iconbtn co-back" data-co="back" title="${esc(o.back)}" aria-label="${esc(o.back)}">${I.left}</button>
        <h2 class="glitch" data-text="${esc(o.title)}">${esc(o.title)}</h2><span class="sub" id="co-sub">${esc(o.sub || '')}</span>
        <div class="actions">${o.actions || ''}</div>
      </div>
      ${o.top ? `<div class="co-top" id="co-top">${o.top}</div>` : ''}
      <div class="scroll" id="co-scroll"><div id="co-body"></div></div>
      ${o.bar ? '<div class="co-actionbar" id="co-bar"></div>' : ''}`;
  }

  /* =====================================================================
     Übersicht: neue Checkliste + vorhandene Checklisten
     ===================================================================== */
  const segs = (s) => STATUSES.filter((k) => s[k]).map((k) => `<i class="s-${k}" style="flex-grow:${s[k]}" title="${esc(t('collector.st.' + k))}: ${s[k]}"></i>`).join('');
  const jobLine = (j) => {
    if (!isActive(j)) return '';
    const label = t(`collector.job_${j.state}`);
    return `<span class="co-job st-${esc(j.state)}">${j.state === 'running' ? '<span class="spinner"></span>' : j.state === 'paused' ? I.pause : I.clock}<span>${esc(label)} ${esc(`${j.done} / ${j.total}`)}</span></span>`;
  };
  function cardHtml(e) {
    const s = e.stats || {};
    const meta = STATUSES.filter((k) => s[k]).map((k) => `<span class="s-${k}"><b>${s[k]}</b> ${esc(t('collector.st.' + k))}</span>`).join('');
    return `<div class="co-card k-${esc(e.kind)}" data-eid="${esc(e.edition_id)}">
      <button type="button" class="co-card-main" data-co="open">
        <span class="ft-kind">${HC.fest.kindIcon(e.kind)}${esc(HC.fest.kindLabel(e.kind))}</span>
        <span class="ft-name" title="${esc(e.edition)}">${esc(e.edition)}</span>
        <span class="co-seg" aria-hidden="true">${s.total ? segs(s) : ''}</span>
        <span class="co-meta">${s.total ? `<span class="tot"><b>${s.total}</b> ${esc(t('collector.sets'))}</span>${meta}` : `<span>${esc(t('collector.card_empty'))}</span>`}</span>
        ${jobLine(e.job)}
      </button>
      <button type="button" class="iconbtn danger co-card-del" data-co="del" title="${esc(t('collector.delete'))}" aria-label="${esc(t('collector.delete'))}">${I.trash}</button>
    </div>`;
  }
  function newFormHtml() {
    const year = new Date().getFullYear();
    const fest = series.filter((s) => s.kind === 'festival'), other = series.filter((s) => s.kind !== 'festival');
    const opt = (s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`;
    return `<div class="co-new" id="co-new">
      <div class="co-new-t"><b>${esc(t('collector.new_title'))}</b><span>${esc(t('collector.new_text'))}</span></div>
      <label class="co-f grow"><span class="lbl">${esc(t('collector.f_series'))}</span>
        <select class="select" id="co-series"><option value="">${esc(t('collector.f_series_ph'))}</option>${fest.map(opt).join('')}${other.length ? `<optgroup label="${esc(t('collector.f_series_other'))}">${other.map(opt).join('')}</optgroup>` : ''}</select></label>
      <label class="co-f"><span class="lbl">${esc(t('fest.p_year'))}</span><input class="input mono" id="co-year" type="number" min="1985" max="${year + 1}" step="1" placeholder="${year}"></label>
      <label class="co-f" id="co-variant-f" hidden><span class="lbl">${esc(t('fest.p_variant'))}</span><select class="select" id="co-variant"></select></label>
      <button type="button" class="btn primary" data-co="create">${I.plus}${esc(t('collector.new_ok'))}</button>
      <div class="field-error" id="co-new-err" hidden></div>
    </div>`;
  }
  function listBody() {
    const cards = editions.length
      ? `<div class="section-label">${esc(t('collector.lists'))}<span class="q-summary mono">${editions.length}</span></div><div class="co-cards">${editions.map(cardHtml).join('')}</div>`
      : `<div class="empty co-empty">${I.flag}<h4>${esc(t('collector.empty_title'))}</h4><p>${esc(t('collector.empty_text'))}</p>
          <ol class="co-steps"><li><b>1</b><span>${esc(t('collector.step1'))}</span></li><li><b>2</b><span>${esc(t('collector.step2'))}</span></li><li><b>3</b><span>${esc(t('collector.step3'))}</span></li></ol></div>`;
    return newFormHtml() + cards;
  }
  async function showList(animate) {
    const my = ++seq;
    mode = 'list';
    ed = null;
    rows = [];
    editing = null;
    setHash('collector');
    if (!$('#co-new', el)) {
      shell({ back: t('collector.back_library'), title: t('collector.title'), sub: t('collector.sub'), actions: `<button type="button" class="btn ghost" data-co="files">${I.layers}${esc(t('collector.files'))}</button>` });
    }
    const [list, ser] = await Promise.all([HC.bridge.safe('get_collector_editions'), HC.fest.series()]);
    if (my !== seq) return;
    editions = list || [];
    series = ser || [];
    known.clear();
    editions.forEach((e) => known.set(e.edition_id, e.stats));
    const keep = { s: ($('#co-series', el) || {}).value, y: ($('#co-year', el) || {}).value };
    $('#co-body', el).innerHTML = listBody();
    if (keep.s) { $('#co-series', el).value = keep.s; paintVariants(); }
    if (keep.y) $('#co-year', el).value = keep.y;
    if (animate) fx.stagger($('.co-cards', el));
  }
  function paintVariants() {
    const s = series.find((x) => String(x.id) === $('#co-series', el).value);
    const names = ((s && s.variants) || []).map((v) => v.name);
    $('#co-variant', el).innerHTML = `<option value="">–</option>${names.map((n) => `<option>${esc(n)}</option>`).join('')}`;
    $('#co-variant-f', el).hidden = !names.length;
  }
  async function createEdition(btn) {
    const err = $('#co-new-err', el);
    const show = (msg, bad) => {
      err.hidden = !msg;
      err.textContent = msg || '';
      $$('.invalid', $('#co-new', el)).forEach((x) => x.classList.remove('invalid'));
      if (bad) { bad.classList.add('invalid'); bad.focus(); }
    };
    const sid = $('#co-series', el).value, year = $('#co-year', el).value.trim();
    if (!sid) return show(t('collector.err_series'), $('#co-series', el));
    if (!year) return show(t('collector.err_year'), $('#co-year', el));
    show('');
    ui.busy(btn, true);
    const r = await HC.bridge.safe('open_collector_edition', { series_id: +sid, year: +year, variant: $('#co-variant', el).value || '' });
    ui.busy(btn, false);
    if (r && r.ok) return openEdition(r.edition.edition_id, true);
    if (!r || mode !== 'list') return;
    const errs = r.errors || {};
    show(Object.values(errs)[0] || r.error || t('err.generic'), errs.year ? $('#co-year', el) : errs.series_id ? $('#co-series', el) : null);
  }
  async function removeChecklist(e) {
    const yes = await ui.modal({
      title: t('collector.dlg_delete_title'), okLabel: t('collector.delete'), danger: true, kind: 'del',
      body: `<p>${esc(t('collector.dlg_delete_text', { name: e.edition }))}</p>${ui.notice('info', esc(t('collector.dlg_delete_keep')))}`,
    });
    if (!yes) return;
    const r = await HC.bridge.safe('delete_checklist', e.edition_id);
    if (!r || !r.ok) return fail(r);
    known.delete(e.edition_id);
    ui.toast(t('collector.toast_deleted', { name: e.edition }), 'warn');
    showList();
  }

  /* =====================================================================
     Checkliste einer Ausgabe
     ===================================================================== */
  function statsHtml() {
    const s = stats || localStats();
    const tile = (k) => `<button type="button" class="stat co-stat s-${k}${filter.status === k ? ' on' : ''}" data-status="${k}" aria-pressed="${filter.status === k}" title="${esc(t('collector.filter_status', { name: t('collector.st.' + k) }))}">
        <span class="k">${esc(t('collector.st.' + k))}</span><span class="v">${s[k] || 0}</span></button>`;
    return `<div class="stat co-total"><span class="k">${esc(t('collector.sets'))}</span><span class="v">${s.total}</span><span class="co-seg" aria-hidden="true">${s.total ? segs(s) : ''}</span></div>${STATUSES.map(tile).join('')}`;
  }
  function selectHtml(key, all, none) {
    const list = uniq(key), blank = rows.some((r) => !r[key]) && list.length;
    if (filter[key] && filter[key] !== NO && !list.includes(filter[key])) filter[key] = '';
    if (filter[key] === NO && !blank) filter[key] = '';
    const sel = (v) => (filter[key] === v ? ' selected' : '');
    return `<select class="select" data-filter="${key}" aria-label="${esc(t(all))}"${list.length ? '' : ' disabled'}><option value="">${esc(t(all))}</option>${list.map((x) => `<option value="${esc(x)}"${sel(x)}>${esc(x)}</option>`).join('')}${blank ? `<option value="${NO}"${sel(NO)}>${esc(t(none))}</option>` : ''}</select>`;
  }
  function stripHtml() {
    if (imp) {
      return `<div class="co-strip run"><span class="spinner"></span><span class="lbl">${esc(t('collector.imp_running'))}</span>
        <span class="n">${esc(t('collector.imp_entries', { n: util.fmtNum(imp.entries || 0) }))}</span><span class="note"><span>${esc(t('collector.imp_hint'))}</span></span></div>`;
    }
    if (!isActive(job)) return '';
    const p = job.total ? Math.min(100, (job.done / job.total) * 100) : 0;
    const icon = job.state === 'running' ? '<span class="spinner"></span>' : job.state === 'paused' ? I.pause : I.clock;
    const resume = job.state === 'paused' ? `<button type="button" class="linkbtn" data-co="job-resume">${I.play}${esc(t('collector.job_resume'))}</button>` : '';
    return `<div class="co-strip ${job.state === 'running' ? 'run' : job.state === 'paused' ? 'hold' : 'wait'}">${icon}<span class="lbl">${esc(t(`collector.job_${job.state}`))}</span>
      <span class="n mono">${esc(`${job.done} / ${job.total}`)}</span>
      <span class="progress"><span class="bar${job.state === 'running' ? '' : ' idle'}" style="--p:${p}"></span></span>
      <span class="hits">${esc(t('collector.job_hits', { n: job.hits || 0 }))}</span>
      ${job.note ? `<span class="note" title="${esc(job.note)}">${I.info}<span>${esc(job.note)}</span></span>` : ''}
      <span class="btns">${resume}<button type="button" class="linkbtn danger" data-co="job-cancel">${I.x}${esc(t('collector.job_cancel'))}</button></span></div>`;
  }
  function topHtml() {
    const b = (act, icon, key, cls) => `<button type="button" class="btn sm${cls || ''}" data-co="${act}">${icon}${esc(t(key))}</button>`;
    return `<div class="co-stats" id="co-stats">${statsHtml()}</div>
      <div class="co-tools">
        <span class="bar-lbl">${esc(t('collector.sources'))}</span>
        ${b('playlist', I.list, 'collector.src_playlist')}${b('paste', I.copy, 'collector.src_paste')}${b('files', I.layers, 'collector.files')}${b('add', I.plus, 'collector.src_add')}
        <span class="spacer"></span>
        <span class="co-filters" id="co-filters"></span>
      </div>
      <div id="co-strip"></div>`;
  }
  function paintFilters() {
    const host = $('#co-filters', el);
    if (!host) return;
    const q = $('input', host), had = q && document.activeElement === q;
    host.innerHTML = `${selectHtml('stage', 'collector.all_stages', 'fest.no_stage')}${selectHtml('day', 'collector.all_days', 'collector.no_day')}
      <span class="search-wrap co-search">${I.search}<input class="input" data-filter="q" value="${esc(filter.q)}" placeholder="${esc(t('collector.search'))}" spellcheck="false" autocomplete="off"></span>`;
    if (had) { const n = $('input', host); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
  }

  /* ---------- Zeilen ---------- */
  const SRC_ICON = { playlist: I.list, timetable: I.copy, file: I.layers, manual: I.edit };
  function matchHtml(r) {
    const v = r.video;
    if (!v) {
      if (r.ignored) return '<span class="co-none">–</span>';
      return `<span class="co-none">${esc(r.searched ? t('collector.m_searched', { date: util.fmtDate(r.searched) }) : t('collector.m_none'))}</span>`;
    }
    /* Unsichere Treffer: Kanal nur im Tooltip, damit Dauer und Sicherheit neben den Knöpfen sichtbar bleiben. */
    const meta = [util.fmtDur(v.duration), pct(r.confidence), r.needs_confirmation ? '' : v.channel_name].filter((x) => x && x !== '–');
    const others = (r.candidates || []).filter((c) => c.video && c.video.title);
    const ask = r.needs_confirmation ? `<span class="co-ask">
        <button type="button" class="btn sm" data-co="confirm" title="${esc(t('collector.confirm_title'))}">${I.check}${esc(t('collector.confirm'))}</button>
        <button type="button" class="iconbtn danger" data-co="reject" title="${esc(t('collector.reject_title'))}" aria-label="${esc(t('collector.reject_title'))}">${I.x}</button></span>` : '';
    const more = others.length && !r.ignored ? `<button type="button" class="linkbtn co-cand" data-co="candidates" aria-haspopup="menu">${esc(t('collector.candidates', { n: others.length }))}${I.down}</button>` : '';
    return `<div class="co-match${r.needs_confirmation ? ' ask' : ''}"><div class="co-mt"><b title="${esc([v.title, v.channel_name].filter(Boolean).join(' · '))}">${esc(v.title || v.id)}</b>
      <small>${ui.pbadge(v)}<span>${esc(meta.join(' · '))}</span>${more}</small></div>${ask}</div>`;
  }
  function rowHtml(r) {
    const off = !r.checked || r.ignored;
    const sub = [r.set_type ? HC.fest.setType(r.set_type) : '', t(`collector.source.${SRC_ICON[r.source] ? r.source : 'manual'}`)].filter(Boolean);
    const ign = r.ignored ? 'collector.unignore' : 'collector.ignore';
    return `<tr data-id="${esc(r.id)}" class="co-row is-${esc(r.status)}${off ? ' off' : ''}${r.needs_confirmation ? ' ask' : ''}">
      <td class="c-chk"><label class="check" title="${esc(t('collector.check_title'))}"><input type="checkbox" data-co="chk"${r.checked ? ' checked' : ''}${r.ignored ? ' disabled' : ''} aria-label="${esc(t('collector.check_title'))}"></label></td>
      <td class="clip"><div class="co-dj"><b title="${esc(r.artist)}">${esc(r.artist)}</b><small>${esc(sub.join(' · '))}${r.edited ? `<i class="gm" title="${esc(t('collector.edited'))}"></i>` : ''}</small></div></td>
      <td class="clip c-stage">${r.stage ? `<span class="co-stage" title="${esc(r.stage)}">${HC.fest.stageDot(r.stage)}<span>${esc(r.stage)}</span></span>` : '<span class="co-none">–</span>'}</td>
      <td class="clip c-day">${r.day || r.start ? `<div class="co-when"><span title="${esc(r.day || '')}">${esc(r.day || '')}</span><small class="mono">${esc(timeOf(r))}</small></div>` : '<span class="co-none">–</span>'}</td>
      <td class="c-status"><span class="status cst-${esc(r.status)}">${esc(t('collector.st.' + (STATUSES.includes(r.status) ? r.status : 'missing')))}</span></td>
      <td class="clip c-match">${matchHtml(r)}</td>
      <td class="act"><button type="button" class="iconbtn" data-co="edit" title="${esc(t('common.edit'))}" aria-label="${esc(t('common.edit'))}">${I.edit}</button><button type="button" class="iconbtn${r.ignored ? ' on' : ''}" data-co="ignore" title="${esc(t(ign))}" aria-label="${esc(t(ign))}">${r.ignored ? I.retry : I.ban}</button><button type="button" class="iconbtn" data-co="more" title="${esc(t('collector.more'))}" aria-label="${esc(t('collector.more'))}" aria-haspopup="menu">${I.more}</button></td></tr>`;
  }
  function editHtml(r) {
    const x = r || {}, types = HC.fest.SET_TYPES;
    const f = (key, label, html, cls) => `<label class="co-f${cls ? ` ${cls}` : ''}"><span class="lbl">${esc(t(label))}</span>${html}</label>`;
    const dl = (id, list) => `<datalist id="${id}">${list.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>`;
    const inp = (key, extra) => `<input class="input${/start|end/.test(key) ? ' mono' : ''}" data-f="${key}" value="${esc(x[key] || '')}" spellcheck="false" autocomplete="off" ${extra || ''}>`;
    return `<tr class="co-edit" data-id="${esc(r ? r.id : 'new')}"><td colspan="7"><div class="co-form">
      ${f('artist', 'collector.f_artist', inp('artist', 'maxlength="200"'), 'grow')}
      ${f('stage', 'fest.p_stage', inp('stage', 'list="co-dl-stage" maxlength="40"') + dl('co-dl-stage', uniq('stage')))}
      ${f('day', 'collector.f_day', inp('day', 'list="co-dl-day" maxlength="40"') + dl('co-dl-day', uniq('day')))}
      ${f('start', 'collector.f_start', inp('start', 'placeholder="18:00" maxlength="5" inputmode="numeric"'), 'time')}
      ${f('end', 'collector.f_end', inp('end', 'placeholder="19:00" maxlength="5" inputmode="numeric"'), 'time')}
      ${f('set_type', 'fest.p_type', `<select class="select" data-f="set_type"><option value="">–</option>${types.map((c) => `<option value="${esc(c)}"${x.set_type === c ? ' selected' : ''}>${esc(HC.fest.setType(c))}</option>`).join('')}</select>`)}
      <span class="co-form-btns"><button type="button" class="btn sm ghost" data-co="edit-cancel">${esc(t('common.cancel'))}</button><button type="button" class="btn sm primary" data-co="edit-save">${I.check}${esc(t(r ? 'common.save' : 'collector.add_ok'))}</button></span>
      <div class="field-error" data-err hidden></div></div></td></tr>`;
  }
  const nodeOf = (id) => el.querySelector(`#co-rows tr[data-id="${CSS.escape(String(id))}"]`);

  function emptyRows() {
    if (rows.length) {
      return `<div class="empty">${I.filter}<h4>${esc(t('collector.none_title'))}</h4><p>${esc(t('collector.none_text'))}</p><button type="button" class="btn" data-co="clear">${I.x}${esc(t('library.clear'))}</button></div>`;
    }
    const b = (act, icon, key, cls) => `<button type="button" class="btn${cls || ''}" data-co="${act}">${icon}${esc(t(key))}</button>`;
    return `<div class="empty co-empty">${I.flag}<h4>${esc(t('collector.rows_empty_title'))}</h4><p>${esc(t('collector.rows_empty_text'))}</p>
      <div class="co-empty-actions">${b('playlist', I.list, 'collector.src_playlist', ' primary')}${b('paste', I.copy, 'collector.src_paste')}${b('files', I.layers, 'collector.files', ' ghost')}${b('add', I.plus, 'collector.src_add', ' ghost')}</div></div>`;
  }
  function renderRows(animate) {
    const body = $('#co-body', el);
    const list = visible();
    if (!list.length && editing !== 'new') { body.innerHTML = emptyRows(); paintBar(); return; }
    body.innerHTML = `<table class="co-table">
      <thead><tr><th class="c-chk"><label class="check" title="${esc(t('collector.all_title'))}"><input type="checkbox" id="co-master" aria-label="${esc(t('collector.all_title'))}"></label></th>
        <th>${esc(t('collector.col_dj'))}</th><th class="c-stage">${esc(t('fest.p_stage'))}</th><th class="c-day">${esc(t('collector.col_when'))}</th>
        <th class="c-status">${esc(t('collector.col_status'))}</th><th class="c-match">${esc(t('collector.col_match'))}</th><th class="c-act"></th></tr></thead>
      <tbody id="co-rows">${editing === 'new' ? editHtml(null) : ''}${list.map((r) => (editing === r.id ? editHtml(r) : rowHtml(r))).join('')}</tbody></table>`;
    paintBar();
    if (animate) fx.stagger($('#co-rows', el));
  }
  /** Eine Zeile an Ort und Stelle neu zeichnen; fällt sie aus dem Filter (oder ist neu), wird die Liste neu gebaut. */
  function repaint(r, flash) {
    const old = nodeOf(r.id);
    if (!old || !visible().includes(r) || old.classList.contains('co-edit')) { if (editing !== r.id) renderRows(); return; }
    old.insertAdjacentHTML('afterend', rowHtml(r));
    const fresh = old.nextElementSibling;
    old.remove();
    if (flash) fx.flash(fresh);
  }
  function paintStats() {
    const host = $('#co-stats', el);
    if (host) host.innerHTML = statsHtml();
    const top = $('#co-top', el);
    if (top) top.classList.toggle('blank', !rows.length);
    const sub = $('#co-sub', el);
    if (sub && ed) sub.textContent = [t('collector.title'), ed.library ? t('collector.in_library', { n: ed.library }) : ''].filter(Boolean).join(' · ');
  }
  function paintStrip() {
    const host = $('#co-strip', el);
    if (!host) return;
    const html = stripHtml();
    const cur = host.firstElementChild;
    if (cur && html) {
      // same strip (state, buttons): patch the changing parts in place, so the buttons stay
      // the same nodes while progress events arrive (a click never hits a detached button)
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      const next = tpl.content.firstElementChild;
      const acts = (n) => [...n.querySelectorAll('[data-co]')].map((b) => b.dataset.co).join();
      if (next && next.className === cur.className && acts(next) === acts(cur) && !!$('.note', next) === !!$('.note', cur)) {
        for (const sel of ['.lbl', '.n', '.hits', '.note']) {
          const a = $(sel, cur), b = $(sel, next);
          if (a && b && a.innerHTML !== b.innerHTML) a.innerHTML = b.innerHTML;
          if (a && b && a.title !== b.title) a.title = b.title;
        }
        const bar = $('.progress .bar', cur), nbar = $('.progress .bar', next);
        if (bar && nbar) { bar.className = nbar.className; bar.setAttribute('style', nbar.getAttribute('style') || ''); }
        return;
      }
    }
    host.innerHTML = html;
  }
  function paintBar() {
    const bar = $('#co-bar', el);
    if (!bar) return;
    const s = stats || localStats(), list = visible();
    const pool = list.filter((r) => !r.ignored), on = pool.filter((r) => r.checked).length;
    const master = $('#co-master', el);
    if (master) { master.checked = !!pool.length && on === pool.length; master.indeterminate = on > 0 && on < pool.length; master.disabled = !pool.length; }
    const again = !s.to_search ? searchedMissing() : 0;
    const busy = isActive(job);
    const findN = s.to_search || again;
    const findTitle = busy ? t('collector.find_running') : findN ? t(s.to_search ? 'collector.find_title' : 'collector.find_again_title') : t('collector.find_none');
    bar.innerHTML = `
      <span class="co-count"><b>${s.checked}</b> ${esc(t('collector.checked_of', { total: s.total }))}</span>
      <button type="button" class="linkbtn" data-co="all"${pool.length && on < pool.length ? '' : ' disabled'}>${esc(t('collector.select_all'))}</button>
      <button type="button" class="linkbtn" data-co="none"${on ? '' : ' disabled'}>${esc(t('collector.select_none'))}</button>
      ${filtersOn() ? `<span class="co-filtered">${esc(t('collector.shown', { n: list.length, total: rows.length }))}</span><button type="button" class="linkbtn" data-co="clear">${esc(t('library.clear'))}</button>` : ''}
      ${s.to_confirm ? `<button type="button" class="chip warnchip${filter.status === 'to_confirm' ? ' on' : ''}" data-co="to-confirm" aria-pressed="${filter.status === 'to_confirm'}" title="${esc(t('collector.to_confirm_title'))}">${I.warn}<span>${esc(t('collector.to_confirm', { n: s.to_confirm }))}</span></button>` : ''}
      <span class="co-go"><button type="button" class="btn" data-co="find" title="${esc(findTitle)}"${busy || !findN ? ' disabled' : ''}>${I.search}${esc(t(s.to_search || !again ? 'collector.find' : 'collector.find_again', { n: findN }))}</button>
      <button type="button" class="btn primary" data-co="queue" title="${esc(t(s.ready ? 'collector.queue_title' : 'collector.queue_none'))}"${s.ready ? '' : ' disabled'}>${I.download}${esc(t('collector.queue', { n: s.ready }))}</button></span>`;
  }
  function paintAll(animate) {
    paintStats();
    paintFilters();
    paintStrip();
    renderRows(animate);
  }

  async function openEdition(id, animate) {
    const my = ++seq;
    mode = 'edition';
    editing = null;
    imp = null;
    Object.assign(filter, { stage: '', day: '', status: '', q: '' });
    setHash(`collector-${id}`);
    const r = await HC.bridge.safe('get_checklist', id);
    if (my !== seq) return;
    if (!r || !r.ok) { fail(r); return showList(); }
    adopt(r);
    shell({
      back: t('collector.back_list'), title: ed.edition, top: topHtml(), bar: true,
      actions: `<button type="button" class="iconbtn" data-co="menu" title="${esc(t('collector.more'))}" aria-label="${esc(t('collector.more'))}" aria-haspopup="menu">${I.more}</button>`,
    });
    paintAll(animate);
  }
  function adopt(r) {
    ed = r.edition;
    rows = (r.rows || []).slice().sort(byPos);
    stats = ed.stats || null;
    job = ed.job || null;
    known.set(ed.edition_id, stats);
  }
  async function reload() {
    if (mode !== 'edition' || !ed) return;
    const my = seq, r = await HC.bridge.safe('get_checklist', ed.edition_id);
    if (my !== seq || !r || !r.ok) return;
    adopt(r);
    if (editing != null && editing !== 'new' && !rows.some((x) => x.id === editing)) editing = null;
    paintAll();
  }
  /** Zeilen aus einer Antwort/einem Event übernehmen. -> geänderte Zeilen */
  function merge(list) {
    const out = [];
    (list || []).forEach((n) => {
      const i = rows.findIndex((x) => x.id === n.id);
      if (i < 0) rows.push(n); else rows[i] = n;
      out.push(n);
    });
    rows.sort(byPos);
    return out;
  }
  function applyRows(list, newStats, flash) {
    const fresh = merge(list);
    stats = newStats || localStats();
    if (ed) known.set(ed.edition_id, stats);
    paintStats();
    paintFilters();
    const structural = fresh.some((r) => !nodeOf(r.id) || !visible().includes(r));
    if (structural) renderRows(); else { fresh.forEach((r) => { if (editing !== r.id) repaint(r, flash); }); paintBar(); }
  }

  /* ---------- Aktionen an Zeilen ---------- */
  async function setChecked(ids, on) {
    if (!ids.length) return;
    const before = rows.filter((r) => ids.includes(r.id)).map((r) => [r, r.checked]);
    before.forEach(([r]) => { r.checked = on; });
    applyRows(before.map(([r]) => r), null);
    const res = await HC.bridge.safe('set_checklist_checked', ids, on);
    if (res && res.ok) return;
    before.forEach(([r, old]) => { r.checked = old; });
    applyRows(before.map(([r]) => r), null);
    fail(res);
  }
  async function setIgnored(r) {
    const on = !r.ignored;
    const res = await HC.bridge.safe('set_checklist_ignored', [r.id], on);
    if (!res || !res.ok) return fail(res);
    r.ignored = on;
    r.status = on ? 'ignored' : r.status === 'ignored' ? (r.video ? 'found' : 'missing') : r.status;
    r.needs_confirmation = !!r.video && !r.confirmed && !on;
    applyRows([r], null, true);
    ui.toast(t(on ? 'collector.toast_ignored' : 'collector.toast_unignored', { name: r.artist }), 'info', 2200);
  }
  async function confirmMatch(r, videoId, reject) {
    const res = await HC.bridge.safe('confirm_checklist_match', r.id, videoId, !!reject);
    if (!res || !res.ok) return fail(res);
    applyRows([res.row], null, true);
    if (videoId) ui.toast(t('collector.toast_confirmed', { name: r.artist }), 'ok', 2200);
    else ui.toast(t('collector.toast_rejected', { name: r.artist }), 'info', 2600);
  }
  function candidatesMenu(r, anchor) {
    const list = (r.candidates || []).filter((c) => c.video && c.video.title);
    ui.menu(anchor, [{ head: t('collector.candidates_head') }].concat(list.map((c) => ({
      label: [c.video.title, util.fmtDur(c.video.duration), pct(c.confidence)].filter((x) => x && x !== '–').join(' · '), icon: I.check, key: `cand-${c.video.id}`,
      onClick: () => confirmMatch(r, c.video.id),
    }))), { align: 'left' });
  }
  function rowMenu(r, anchor) {
    const v = r.video;
    ui.menu(anchor, [
      { label: t('card.open', { p: HC.platform.label(HC.platform.of(v || {})) }), icon: I.external, key: 'open', disabled: !v, onClick: () => HC.actions.open(v) },
      { label: t('collector.reject'), icon: I.x, key: 'drop', disabled: !v || r.status === 'downloaded' || r.status === 'queued', onClick: () => confirmMatch(r, null, true) },
      'sep',
      { label: t('collector.delete_row'), icon: I.trash, danger: true, key: 'del', onClick: () => deleteRow(r) },
    ]);
  }
  async function deleteRow(r) {
    const res = await HC.bridge.safe('delete_checklist_rows', [r.id]);
    if (!res || !res.ok) return fail(res);
    const drop = () => { rows = rows.filter((x) => x.id !== r.id); stats = null; paintStats(); paintFilters(); renderRows(); };
    if (rows.includes(r)) fx.leave(nodeOf(r.id), drop);
    ui.toast(t('collector.toast_row_deleted', { name: r.artist }), 'warn', 2600);
  }

  /* ---------- Bearbeiten in der Zeile ---------- */
  function startEdit(id) {
    if (editing != null) return focusEdit();
    editing = id;
    if (id === 'new') Object.assign(filter, { status: '', q: '' });
    if (id === 'new') { paintStats(); paintFilters(); }
    renderRows();
    if (id === 'new') $('#co-scroll', el).scrollTop = 0;
    focusEdit();
  }
  function focusEdit() {
    const f = $('.co-edit [data-f=artist]', el);
    if (f) { f.focus(); f.select(); }
  }
  function cancelEdit() {
    editing = null;
    renderRows();
  }
  async function saveEdit(btn) {
    const tr = $('.co-edit', el);
    if (!tr || (btn && btn.disabled)) return;
    const val = (k) => $(`[data-f=${k}]`, tr).value.trim();
    const cur = editing === 'new' ? null : rows.find((r) => r.id === editing);
    const data = { artist: val('artist'), stage: val('stage') || null, day: val('day') || null, start: val('start') || null, end: val('end') || null, set_type: val('set_type') || null };
    const err = $('[data-err]', tr);
    const show = (msg, key) => {
      err.hidden = !msg;
      err.textContent = msg || '';
      $$('.invalid', tr).forEach((x) => x.classList.remove('invalid'));
      const bad = key && $(`[data-f=${key}]`, tr);
      if (bad) { bad.classList.add('invalid'); bad.focus(); }
    };
    if (!data.artist) return show(t('collector.err_artist'), 'artist');
    let patch = data;
    if (cur) {
      patch = {};
      Object.keys(data).forEach((k) => { if ((data[k] || null) !== (cur[k] || null)) patch[k] = data[k]; });
      if (!Object.keys(patch).length) return cancelEdit();
    }
    show('');
    const save = btn || $('[data-co=edit-save]', tr);
    ui.busy(save, true);
    const res = cur ? await HC.bridge.safe('update_checklist_row', cur.id, patch) : await HC.bridge.safe('add_checklist_row', ed.edition_id, data);
    if (!tr.isConnected) return;
    ui.busy(save, false);
    if (!res) return;
    if (!res.ok) { const errs = res.errors || {}; return show(Object.values(errs)[0] || res.error || t('err.generic'), Object.keys(errs)[0]); }
    editing = null;
    merge([res.row]);
    stats = null;
    paintStats();
    paintFilters();
    renderRows();
    const node = nodeOf(res.row.id);
    if (node) { fx.flash(node); if (!cur) node.scrollIntoView({ block: 'nearest' }); }
    if (cur) ui.toast(res.retag ? t('collector.toast_row_retag', { name: res.row.artist }) : t('collector.toast_row_saved', { name: res.row.artist }), 'ok', res.retag ? 4200 : 2200);
    else ui.toast(t(res.row.video ? 'collector.toast_row_added_hit' : 'collector.toast_row_added', { name: res.row.artist }), 'ok', 2600);
  }

  /* ---------- Quellen ---------- */
  const importSummary = (r) => [t('collector.imp_added', { n: r.added || 0 }), r.merged ? t('collector.imp_merged', { n: r.merged }) : '', r.matched ? t('collector.imp_matched', { n: r.matched }) : '',
    r.unchecked ? t('collector.imp_unchecked', { n: r.unchecked }) : '', r.invalid ? t('collector.imp_invalid', { n: r.invalid }) : ''].filter(Boolean).join(' · ');

  async function playlistDialog() {
    if (imp) return ui.toast(t('collector.imp_busy'), 'info');
    let started = null;
    const yes = await ui.modal({
      title: t('collector.pl_title'), kind: 'co-dlg', okLabel: t('collector.pl_ok'),
      body: `<p>${esc(t('collector.pl_text'))}</p>
        <div class="frow"><div class="lbl">${esc(t('collector.pl_url'))}</div><input class="input mono" data-f="url" value="${esc(ed.playlist_url || '')}" placeholder="https://www.youtube.com/playlist?list=…" spellcheck="false" autocomplete="off"></div>
        <div class="field-error" data-err hidden></div>
        ${ui.notice('info', esc(t('collector.pl_hint')))}`,
      onOpen: (back) => { const f = $('[data-f=url]', back); f.select(); },
      onOk: async (back) => {
        const f = $('[data-f=url]', back), err = $('[data-err]', back), ok = $('[data-act=ok]', back);
        const show = (msg) => { err.hidden = !msg; err.textContent = msg || ''; f.classList.toggle('invalid', !!msg); if (msg) f.focus(); };
        if (!f.value.trim()) { show(t('collector.pl_err_empty')); return false; }
        show('');
        ui.busy(ok, true);
        const r = await HC.bridge.safe('import_checklist_playlist', ed.edition_id, f.value.trim());
        ui.busy(ok, false);
        if (!r) return false;
        if (!r.ok) { show((r.errors && Object.values(r.errors)[0]) || r.error || t('err.generic')); return false; }
        started = r;
        return true;
      },
    });
    if (!yes || !started || mode !== 'edition') return;
    if (started.url) ed.playlist_url = started.url;
    if (started.started === false) return ui.toast(t('collector.imp_busy'), 'info');
    if (!imp) { imp = { phase: 'start', entries: 0 }; paintStrip(); }
    ui.toast(t('collector.toast_pl_started'), 'info');
  }

  async function pasteDialog() {
    // `edited`: the user changed or removed rows in the preview -> those rows are imported
    // instead of the text (QA v0.5.0: correct the parse before it is stored)
    let parsed = null, n = 0, result = null, edited = false;
    const live = () => ((parsed && parsed.rows) || []).filter((r) => String(r.artist || '').trim());
    const yes = await ui.modal({
      title: t('collector.tt_title', { name: ed.edition }), kind: 'co-tt', okLabel: t('collector.tt_ok', { n: 0 }),
      body: `<p>${esc(t('collector.tt_text'))}</p>
        <div class="co-tt-grid">
          <div class="co-tt-in"><div class="lbl">${esc(t('collector.tt_input'))}</div><textarea class="input mono" data-f="text" spellcheck="false" placeholder="${esc(t('collector.tt_placeholder'))}"></textarea></div>
          <div class="co-tt-out"><div class="lbl">${esc(t('collector.tt_preview'))}<span class="mono" data-sum></span></div><div class="co-tt-prev" data-prev></div></div>
        </div>
        <div class="field-error" data-err hidden></div>`,
      onOpen: (back) => {
        const ta = $('[data-f=text]', back), prev = $('[data-prev]', back), sum = $('[data-sum]', back), ok = $('[data-act=ok]', back);
        const count = () => {
          const k = live().length;
          ok.disabled = !k;
          ok.textContent = t('collector.tt_ok', { n: k });
        };
        const paint = () => {
          const list = (parsed && parsed.rows) || [], skipped = (parsed && parsed.skipped) || [];
          count();
          sum.textContent = list.length ? [t('collector.tt_sum', { n: list.length }), parsed.days.length ? t('collector.tt_days', { n: parsed.days.length }) : '', parsed.stages.length ? t('collector.tt_stages', { n: parsed.stages.length }) : '', parsed.csv ? 'CSV' : ''].filter(Boolean).join(' · ') : '';
          if (!list.length && !skipped.length) { prev.innerHTML = `<div class="co-tt-empty">${I.copy}<span>${esc(t(ta.value.trim() ? 'collector.tt_nothing' : 'collector.tt_empty'))}</span></div>`; return; }
          const inp = (k, v, max, label, ph) => `<input class="input sm${k === 'time' ? ' mono' : ''}" data-k="${k}" value="${esc(v || '')}" maxlength="${max}" aria-label="${esc(t(label))}" title="${esc(t(label))}"${ph ? ` placeholder="${esc(ph)}"` : ''} spellcheck="false">`;
          const tr = (r, i) => `<tr data-i="${i}"><td class="clip">${inp('artist', r.artist, 120, 'collector.f_artist')}${r.set_type ? `<small>${esc(HC.fest.setType(r.set_type))}</small>` : ''}</td>
              <td>${inp('stage', r.stage, 40, 'fest.p_stage')}</td><td>${inp('day', r.day, 40, 'collector.f_day')}</td><td>${inp('time', timeOf(r), 13, 'collector.col_when', '18:00–19:00')}</td>
              <td class="co-tt-rm"><button type="button" class="iconbtn danger" data-rm title="${esc(t('collector.delete_row'))}" aria-label="${esc(t('collector.delete_row'))}">${I.x}</button></td></tr>`;
          prev.innerHTML = `${list.length ? `<div class="co-tt-hint">${esc(t('collector.tt_edit_hint'))}</div><table><tbody>${list.slice(0, 300).map(tr).join('')}</tbody></table>` : ''}
            ${list.length > 300 ? `<div class="co-tt-more">${esc(t('collector.tt_more', { n: list.length - 300 }))}</div>` : ''}
            ${skipped.length ? `<div class="co-tt-skip"><b>${I.warn}${esc(t('collector.tt_skipped', { n: skipped.length }))}</b>${skipped.slice(0, 20).map((x) => `<code title="${esc(x)}">${esc(x)}</code>`).join('')}${skipped.length > 20 ? `<code>${esc(t('collector.tt_more', { n: skipped.length - 20 }))}</code>` : ''}</div>` : ''}`;
        };
        prev.addEventListener('input', (e) => {
          const el = e.target.closest('[data-k]'), row = el && parsed && parsed.rows[+el.closest('tr').dataset.i];
          if (!row) return;
          edited = true;
          if (el.dataset.k === 'time') {
            const [s, e2] = el.value.trim().split(/\s*[-–—]\s*/);
            row.start = s || null;
            row.end = e2 || null;
          } else {
            row[el.dataset.k] = el.dataset.k === 'artist' ? el.value : el.value.trim() || null;
          }
          count();
        });
        prev.addEventListener('click', (e) => {
          const b = e.target.closest('[data-rm]');
          if (!b || !parsed) return;
          parsed.rows.splice(+b.closest('tr').dataset.i, 1);
          edited = true;
          paint();
        });
        const parse = async () => {
          const my = ++n, r = await HC.bridge.safe('parse_timetable', ta.value);
          if (my !== n || !back.isConnected) return;
          parsed = r && r.ok ? r : null;
          edited = false; // the text was read again: its rows replace the edited ones
          paint();
        };
        ta.addEventListener('input', util.debounce(parse, 220));
        back._parse = parse;
        paint();
        ta.focus();
      },
      onOk: async (back) => {
        const ta = $('[data-f=text]', back), err = $('[data-err]', back), ok = $('[data-act=ok]', back);
        if (ok.disabled || !ta.value.trim()) return false;
        const data = edited ? live().map((r) => ({ ...r, artist: r.artist.trim() })) : ta.value;
        ui.busy(ok, true);
        const r = await HC.bridge.safe('import_timetable', ed.edition_id, data);
        ui.busy(ok, false);
        if (!r) return false;
        if (!r.ok) { err.hidden = false; err.textContent = (r.errors && Object.values(r.errors)[0]) || r.error || t('err.generic'); return false; }
        result = r;
        return true;
      },
    });
    if (!yes || !result) return;
    ui.toast(`${t('collector.toast_tt')} ${importSummary(result)}`, 'ok', 5200);
    reload();
  }

  async function filesDialog() {
    const files = await HC.bridge.safe('get_timetable_files');
    if (!files) return;
    const mine = (f) => ed && f.series_id === ed.series_id && f.year === ed.year && (f.variant || '') === (ed.variant || '');
    const bad = (f) => !!f.error || !f.series;
    const list = files.slice().sort((a, b) => mine(b) - mine(a) || bad(a) - bad(b) || String(a.edition || a.file).localeCompare(String(b.edition || b.file)));
    const link = (f) => (/^https:\/\//i.test(f.source || '') ? `<a href="${esc(f.source)}" target="_blank" rel="noopener noreferrer">${esc(t('collector.files_source'))}</a>` : '');
    const item = (f) => {
      const why = f.error ? t('collector.files_broken', { error: f.error }) : !f.series ? t('collector.files_unknown') : '';
      return `<div class="co-file${why ? ' bad' : ''}${mine(f) ? ' mine' : ''}" data-file="${esc(f.file)}">
        <div class="cf-main"><b>${esc(f.edition || f.file)}</b>
          <small>${why ? `${I.warn}<span>${esc(why)}</span>` : `<span>${esc(t('collector.files_meta', { n: f.sets || 0, date: util.fmtDate(f.updated) }))}</span>${link(f)}`}<code>${esc(f.file)}</code></small></div>
        <button type="button" class="btn sm${mine(f) ? ' primary' : ''}" data-file-import${why ? ' disabled' : ''}>${I.download}${esc(t('collector.files_import'))}</button></div>`;
    };
    const how = `<div class="co-files-how"><b>${esc(t('collector.files_how_title'))}</b><p>${esc(t('collector.files_how'))}</p><code>app/data/timetables/&lt;series&gt;/&lt;year&gt;.json</code></div>`;
    let done = null;
    await ui.modal({
      title: t('collector.files'), kind: 'co-files', okLabel: t('common.ok'),
      body: `<p>${esc(t('collector.files_text'))}</p>
        ${list.length ? `<div class="co-file-list">${list.map(item).join('')}</div>` : `<div class="co-files-empty">${I.layers}<h4>${esc(t('collector.files_empty_title'))}</h4><p>${esc(t('collector.files_empty'))}</p></div>`}
        ${how}<div class="field-error" data-err hidden></div>`,
      onOpen: (back) => {
        back.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-file-import]');
          if (!b || b.disabled) return;
          const err = $('[data-err]', back);
          err.hidden = true;
          ui.busy(b, true);
          const r = await HC.bridge.safe('import_timetable_file', b.closest('[data-file]').dataset.file);
          if (!back.isConnected) return;
          ui.busy(b, false);
          if (!r) return;
          if (!r.ok) { err.hidden = false; err.textContent = (r.errors && Object.values(r.errors)[0]) || r.error || t('err.generic'); return; }
          done = r;
          $('[data-act=cancel]', back).click();
        });
      },
    });
    if (!done) return;
    ui.toast(`${t('collector.toast_tt')} ${importSummary(done)}`, 'ok', 5200);
    if (mode === 'edition' && ed && ed.edition_id === done.edition_id) reload(); else openEdition(done.edition_id, true);
  }

  /* ---------- Suchauftrag ---------- */
  async function findAsk() {
    let e = await HC.bridge.safe('estimate_checklist_matching', ed.edition_id);
    if (!e || !e.ok) return fail(e);
    let restart = false;
    if (!e.rows) {
      if (e.matched_offline) ui.toast(t('collector.toast_offline', { n: e.matched_offline }), 'ok', 4200);
      if (!searchedMissing()) { if (!e.matched_offline) ui.toast(t('collector.find_none'), 'info'); return; }
      restart = true;
      e = await HC.bridge.safe('estimate_checklist_matching', ed.edition_id, { restart: true });
      if (!e || !e.ok) return fail(e);
      if (!e.rows) return;
    }
    const gap = Math.max(1, Math.round(60 / Math.max(1, e.per_hour)));
    const facts = [
      restart ? esc(t('collector.est_again')) : '',
      e.matched_offline ? esc(t('collector.est_offline', { n: e.matched_offline })) : '',
      e.resume && !restart ? esc(t('collector.est_resume')) : '',
      e.available_at && !e.backoff_until ? esc(t('collector.est_wait', { t: util.fmtWhen(e.available_at) })) : '',
    ].filter(Boolean).map((x) => `<p>${x}</p>`).join('');
    const body = `<p>${t('collector.est_text')}</p>
      <div class="bf-est">
        <div class="bf-big"><b class="mono">${esc(util.fmtNum(e.requests))}</b><span>${esc(t('collector.est_requests'))}</span></div>
        <div class="bf-big"><b class="mono">~${esc(util.fmtSpan(e.seconds))}</b><span>${esc(t('backfill.dlg_time'))}</span></div>
        <div class="bf-big"><b class="mono">${esc(util.fmtNum(e.searches_left_hour))}</b><span>${esc(t('collector.est_left'))}</span></div>
      </div>
      ${facts ? `<div class="bf-facts">${facts}</div>` : ''}
      ${e.backoff_until ? ui.notice('warn', esc(t('collector.est_backoff', { t: util.fmtWhen(e.backoff_until) }))) : ''}
      ${ui.notice('info', esc(t('collector.est_pace', { n: e.per_hour, min: gap })))}`;
    const yes = await ui.modal({
      title: t('collector.est_title', { name: ed.edition }), body, kind: 'bf-dlg co-est', okLabel: t(e.resume && !restart ? 'collector.est_ok_resume' : 'collector.est_ok'),
      onOpen: (back) => { if (e.backoff_until) $('[data-act=ok]', back).disabled = true; },
    });
    if (yes) findStart(restart);
  }
  async function findStart(restart, quiet) {
    const r = await HC.bridge.safe('start_checklist_matching', ed.edition_id, restart ? { restart: true } : {});
    if (!r || !r.ok) return fail(r);
    if (r.nothing) return ui.toast(t('collector.find_none'), 'info');
    job = r.job;
    paintStrip();
    paintBar();
    if (!quiet) ui.toast(t('collector.toast_find_started', { name: ed.edition }), 'info');
  }
  async function findCancel() {
    const r = await HC.bridge.safe('cancel_checklist_matching', ed.edition_id);
    if (!r || !r.ok) return fail(r);
    job = r.job;
    paintStrip();
    paintBar();
    ui.toast(t('collector.toast_find_cancelled'), 'info');
  }
  async function queueChecked(btn) {
    ui.busy(btn, true);
    const r = await HC.bridge.safe('queue_checklist', ed.edition_id);
    if (btn.isConnected) ui.busy(btn, false);
    if (!r || !r.ok) return fail(r);
    const n = (r.queued || []).length, sk = r.skipped || {};
    const extra = [sk.unconfirmed ? t('collector.q_unconfirmed', { n: sk.unconfirmed }) : '', sk.missing ? t('collector.q_missing', { n: sk.missing }) : '', sk.other ? t('collector.q_other', { n: sk.other }) : '', r.retag ? t('collector.q_retag', { n: r.retag }) : ''].filter(Boolean).join(' · ');
    ui.toast((n ? t('toast.enqueued', { n }) : t('collector.q_none')) + (extra ? ` · ${extra}` : ''), n ? 'ok' : 'info', extra ? 5200 : 0);
    /* Sofort sichtbar, auch falls das Event erst später kommt. */
    const hit = rows.filter((x) => x.video && (r.queued || []).includes(x.video.id));
    hit.forEach((x) => { x.status = 'queued'; x.video.status = 'queued'; });
    if (hit.length) applyRows(hit, null, true);
    HC.app.refreshStatus();
  }
  function editionMenu(anchor) {
    ui.menu(anchor, [
      { label: t('collector.show_library', { n: ed.library || 0 }), icon: I.library, key: 'lib', disabled: !ed.library, onClick: () => { const e = ed; close(true); if (hooks.showEdition) hooks.showEdition(e); } },
      'sep',
      { label: t('collector.delete'), icon: I.trash, danger: true, key: 'del', onClick: () => removeChecklist(ed) },
    ]);
  }
  function clearFilters() {
    Object.assign(filter, { stage: '', day: '', status: '', q: '' });
    paintStats();
    paintFilters();
    renderRows(true);
  }

  /* ---------- Klicks / Eingaben ---------- */
  function onClick(e) {
    const st = e.target.closest('[data-status]');
    if (st && mode === 'edition') {
      filter.status = filter.status === st.dataset.status ? '' : st.dataset.status;
      paintStats();
      renderRows(true);
      return;
    }
    const b = e.target.closest('[data-co]');
    if (!b || b.disabled || b.tagName === 'INPUT') return;
    const act = b.dataset.co;
    if (act === 'back') return mode === 'edition' ? showList(true) : close();
    if (act === 'files') return filesDialog();
    if (mode === 'list') {
      const card = b.closest('[data-eid]'), item = card && editions.find((x) => String(x.edition_id) === card.dataset.eid);
      if (act === 'create') createEdition(b);
      else if (act === 'open' && item) openEdition(item.edition_id, true);
      else if (act === 'del' && item) removeChecklist(item);
      return;
    }
    if (act === 'playlist') return playlistDialog();
    if (act === 'paste') return pasteDialog();
    if (act === 'add') return startEdit('new');
    if (act === 'menu') return editionMenu(b);
    if (act === 'clear') return clearFilters();
    if (act === 'find') return findAsk();
    if (act === 'queue') return queueChecked(b);
    if (act === 'job-cancel') return findCancel();
    if (act === 'job-resume') return findStart(false, true);
    if (act === 'edit-cancel') return cancelEdit();
    if (act === 'edit-save') return saveEdit(b);
    if (act === 'all' || act === 'none') {
      const on = act === 'all';
      return setChecked(visible().filter((r) => !r.ignored && r.checked !== on).map((r) => r.id), on);
    }
    if (act === 'to-confirm') {
      filter.status = filter.status === 'to_confirm' ? '' : 'to_confirm';
      paintStats();
      renderRows(true);
      return;
    }
    const tr = b.closest('tr[data-id]'), r = tr && rows.find((x) => String(x.id) === tr.dataset.id);
    if (!r) return;
    if (act === 'edit') startEdit(r.id);
    else if (act === 'ignore') setIgnored(r);
    else if (act === 'more') rowMenu(r, b);
    else if (act === 'confirm') confirmMatch(r, r.video.id);
    else if (act === 'reject') confirmMatch(r, null, true);
    else if (act === 'candidates') candidatesMenu(r, b);
  }
  function onChange(e) {
    const x = e.target;
    if (x.id === 'co-series') return paintVariants();
    if (x.id === 'co-master') return setChecked(visible().filter((r) => !r.ignored && r.checked !== x.checked).map((r) => r.id), x.checked);
    if (x.dataset.co === 'chk') {
      const tr = x.closest('tr[data-id]'), r = tr && rows.find((y) => String(y.id) === tr.dataset.id);
      if (r) setChecked([r.id], x.checked);
      return;
    }
    if (x.dataset.filter && x.tagName === 'SELECT') { filter[x.dataset.filter] = x.value; renderRows(true); }
  }
  const onSearch = util.debounce(() => { if (mode === 'edition') renderRows(); }, 120);
  function onInput(e) {
    if (e.target.dataset.filter === 'q') { filter.q = e.target.value; onSearch(); }
  }
  function onKey(e) {
    if (e.target.closest('.co-edit')) {
      if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); saveEdit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    } else if (e.target.closest('#co-new') && e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      createEdition($('[data-co=create]', el));
    } else if (e.target.dataset.filter === 'q' && e.key === 'Escape' && e.target.value) {
      e.target.value = filter.q = '';
      renderRows();
    }
  }

  /* ---------- Events vom Backend ---------- */
  const listSoon = util.debounce(() => { if (mode === 'list') showList(); }, 250);
  function wire() {
    const B = HC.bridge;
    B.on('collector_rows', (d) => {
      if (d.stats) known.set(d.edition_id, d.stats);
      if (mode === 'list') return listSoon();
      if (mode !== 'edition' || !ed || d.edition_id !== ed.edition_id) return;
      if (d.reload) return reload();
      const gone = d.deleted || [];
      if (gone.length) {
        rows = rows.filter((r) => !gone.includes(r.id));
        if (gone.includes(editing)) editing = null;
        gone.forEach((id) => { const n = nodeOf(id); if (n) n.remove(); });
      }
      applyRows(d.rows || [], d.stats || null, true);
    });
    B.on('collector_job', (d) => {
      if (d.stats) known.set(d.edition_id, d.stats);
      if (mode === 'list') return listSoon();
      if (mode !== 'edition' || !ed || d.edition_id !== ed.edition_id) return;
      const before = job && job.state;
      job = d.state === 'none' ? null : d;
      if (d.stats) { stats = d.stats; paintStats(); }
      paintStrip();
      paintBar();
      if (job && job.state === 'done' && ACTIVE.includes(before)) ui.toast(t('collector.toast_find_done', { n: job.hits || 0, total: job.total || 0 }), 'ok', 5200);
      if (job && job.state === 'paused' && before !== 'paused') ui.toast(job.note || t('collector.job_paused'), 'warn', 5200);
    });
    B.on('collector_import', (d) => {
      if (mode !== 'edition' || !ed || d.edition_id !== ed.edition_id) return;
      if (d.phase === 'start' || d.phase === 'progress') imp = d;
      else {
        imp = null;
        if (d.phase === 'error') ui.toast(d.error || t('err.generic'), 'err');
        else ui.toast(`${t(d.cancelled ? 'collector.toast_pl_cancelled' : 'collector.toast_pl_done')} ${importSummary(d)}`, d.cancelled ? 'warn' : 'ok', 5200);
      }
      paintStrip();
    });
    B.on('series_changed', () => { if (mode === 'list') showList(); });
  }

  function close(silent) {
    if (mode == null) return;
    seq++;
    mode = null;
    ed = null;
    rows = [];
    editing = null;
    el.hidden = true;
    el.innerHTML = '';
    if (hooks.closed) hooks.closed(silent);
  }

  HC.collector = {
    /** root = Container in der Bibliothek; h = {opened(), closed(silent), showEdition(edition)} */
    init(root, h) {
      el = root;
      hooks = h || {};
      el.addEventListener('click', onClick);
      el.addEventListener('change', onChange);
      el.addEventListener('input', onInput);
      el.addEventListener('keydown', onKey);
      wire();
    },
    /** arg: 'collector' = Übersicht, 'collector-<edition_id>' = Checkliste. */
    open(arg) {
      const m = /^collector-(\d+)$/.exec(String(arg || ''));
      el.hidden = false;
      if (hooks.opened) hooks.opened();
      return m ? openEdition(+m[1], true) : showList(true);
    },
    /** Checkliste einer Ausgabe (legt sie an), z.B. aus der Festival-Ansicht. */
    async collect(editionId) {
      const r = await HC.bridge.safe('open_collector_edition', { edition_id: editionId });
      if (!r || !r.ok) return fail(r);
      el.hidden = false;
      if (hooks.opened) hooks.opened();
      return openEdition(r.edition.edition_id, true);
    },
    /** Zurück in die offene Unteransicht (Wechsel aus einer anderen Ansicht): Daten auffrischen. */
    resume() {
      if (mode === 'edition' && ed) { setHash(`collector-${ed.edition_id}`); reload(); } else if (mode === 'list') showList();
    },
    close,
    active: () => mode != null,
    /** Kennzahlen der Checkliste einer Ausgabe oder null (für den Knopf in der Festival-Ansicht). */
    statsOf: (editionId) => known.get(editionId) || null,
    async preload() {
      const list = await HC.bridge.safe('get_collector_editions');
      if (!list) return;
      known.clear();
      list.forEach((e) => known.set(e.edition_id, e.stats));
    },
    reset() { known.clear(); if (el) close(true); },
  };
})();
