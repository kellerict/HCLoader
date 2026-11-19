/* =====================================================================
   views/watchlist.js – Quellen (Kanal, Playlist, gespeicherte Suche)

   Live-Zustand einer Prüfung kommt über die Events «source» / «watchlist_done»:
     pending  = angefordert, wartet auf ihren Platz (Throttle zwischen den Quellen)
     checking = wird gerade geprüft
     errors   = letzte Prüfung fehlgeschlagen (nur im Speicher, bis zur nächsten Prüfung)

   Phase 7a: Quellen von YouTube und SoundCloud. Backoff gilt pro Plattform – die andere
   läuft weiter. Der Dialog schlägt Typ, Plattform und Namen aus der URL vor (suggest_source).

   v0.4.0 «Alles einlesen (einmalig)»: Knopf pro Kanal/Playlist (nicht bei Suchen), Bestätigung
   mit Schätzung (estimate_backfill), Fortschritt unter dem Namen (Event «backfill»), Pause /
   Fortsetzen / Abbrechen, Abschluss mit Datum und Anzahl im Eingang.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, $$, util, fx, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;

  let el;
  let sources = [];
  const checking = new Set();
  const pending = new Set();
  const errors = new Map();
  const flash = new Set(); // Zeilen, die beim nächsten Zeichnen kurz aufleuchten
  let run = null; // {total, done} – laufende Prüfung (total = 0: von aussen gestartet, Umfang unbekannt)

  const FIELDS = ['type', 'name', 'url_or_query', 'default_genre', 'enabled', 'auto_download', 'max_entries', 'newest_last', 'platform', 'name_auto'];
  /** «Neueste stehen hinten» gibt es nur bei Playlists. */
  /** Obergrenze pro Prüfung: Suchquellen 100, sonst 200 (wie das Backend). */
  const maxLimit = (type) => (type === 'search' ? 100 : 200);
  /** Wert, der bei leerem Feld (max_entries null) gilt: schedule.entries_per_source, begrenzt auf die Obergrenze. */
  const defaultMax = (type) => Math.min(HC.settings.values.schedule.entries_per_source, maxLimit(type));
  const reversed = (s) => s.type === 'playlist' && !!s.newest_last;
  const payload = (s) => FIELDS.reduce((o, k) => { o[k] = k === 'newest_last' ? reversed(s) : k === 'platform' ? HC.platform.of(s) : k === 'name_auto' ? !!s.name_auto : s[k]; return o; }, s.id != null ? { id: s.id } : {});
  /** Backoff der Plattform dieser Quelle (oder null). */
  const boOf = (s) => HC.platform.backoff(HC.platform.of(s));
  /** «SoundCloud ist ausgeschaltet» bzw. v0.10.0 «Mixcloud/hearthis.at ist ausgeschaltet». */
  const offWhy = (s) => { const p = HC.platform.of(s); return p === 'soundcloud' ? t('watchlist.why_sc_off') : t('watchlist.why_p_off', { p: HC.platform.label(p) }); };
  /** Einstellungs-Tab und Linktext zur Schonung einer Plattform. */
  const setLink = (p) => {
    const tab = { youtube: 'throttle', soundcloud: 'soundcloud' }[p] || 'sources';
    const text = p === 'youtube' ? t('watchlist.backoff_link') : p === 'soundcloud' ? t('watchlist.backoff_link_sc') : t('watchlist.backoff_link_p', { p: esc(HC.platform.label(p)) });
    return `<button class="linkbtn" data-goto="settings/${tab}">${text}</button>`;
  };
  /** Jede Plattform mit aktiver Quelle ist im Backoff -> es gibt nichts zu prüfen. */
  const allBlocked = () => { const act = sources.filter((s) => s.enabled); return act.length > 0 && act.every(boOf); };
  const busy = () => checking.size > 0 || pending.size > 0;

  /* ---------- «Alles einlesen (einmalig)» ---------- */
  const BF_OPEN = ['pending', 'running'];
  const canBackfill = (s) => s.type === 'channel' || s.type === 'playlist';
  const bfOf = (s) => (s.backfill && s.backfill.state !== 'cancelled' ? s.backfill : null);
  /** «240 / ~500» (Grösse bekannt) bzw. «240 / max. 2000». */
  function bfCount(b) {
    const n = util.fmtNum(b.position || 0);
    return b.target != null ? t('backfill.progress', { n, total: util.fmtNum(b.target) }) : t('backfill.progress_cap', { n, cap: util.fmtNum(b.cap) });
  }
  const bfPct = (b) => { const of = b.target != null ? b.target : b.cap; return of ? Math.max(2, Math.min(100, Math.round((100 * (b.position || 0)) / of))) : 0; };
  /** Fertig: kurze Zeile unter dem Namen (Datum + Anzahl im Eingang, Details im Tooltip). */
  function bfDone(s) {
    const b = bfOf(s);
    if (!b || b.state !== 'done') return '';
    return `<small class="wl-bf done" title="${esc(t('backfill.done_title', { date: util.fmtFull(b.finished), n: util.fmtNum(b.position) }))} · ${esc(t('backfill.added', { n: util.fmtNum(b.added) }))}">${I.layers}<span>${esc(t('backfill.done_short', { date: util.fmtDate(b.finished) }))} · +${esc(util.fmtNum(b.added))}</span></small>`;
  }
  /** Läuft / wartet / angehalten: eigene Zeile unter der Quelle über die ganze Breite
      (Fortschritt «Liest ein … 240 / ~500», Balken, Anzahl im Eingang, Anhalten/Fortsetzen, Abbrechen). */
  function bfRow(s) {
    const b = bfOf(s);
    if (!b || b.state === 'done') return '';
    const label = b.state === 'running' ? t('backfill.st_running') : b.state === 'paused' ? t('backfill.st_paused') : t('backfill.st_pending');
    const btns = b.state === 'paused'
      ? `<button type="button" class="linkbtn" data-bf="resume">${I.play}${t('backfill.resume')}</button>`
      : `<button type="button" class="linkbtn" data-bf="pause">${I.pause}${t('backfill.pause')}</button>`;
    const note = b.note && b.state !== 'running' ? `<span class="bf-note" title="${esc(t('backfill.note_title'))}">${I.info}<span>${esc(b.note)}</span></span>` : '';
    return `<tr class="wl-bf-row bf-${esc(b.state)}${s.enabled ? '' : ' off'}" data-bf-id="${s.id}"><td></td><td colspan="8" class="bf-cell"><div class="wl-bf bf-${esc(b.state)}">
      ${b.state === 'running' ? '<span class="spinner"></span>' : b.state === 'paused' ? I.pause : I.clock}
      <span class="bf-lbl">${esc(label)}</span><span class="bf-n mono">${esc(bfCount(b))}</span>
      <span class="progress" aria-hidden="true"><span class="bar${b.state === 'running' ? '' : ' idle'}" style="--p:${bfPct(b)}"></span></span>
      <span class="bf-add">${esc(t('backfill.added', { n: util.fmtNum(b.added) }))}</span>${note}
      <span class="bf-btns">${btns}<button type="button" class="linkbtn danger" data-bf="cancel">${I.x}${t('backfill.cancel')}</button></span></div></td></tr>`;
  }
  function bfButton(s) {
    if (!canBackfill(s)) return `<button class="iconbtn" data-act="bf" title="${esc(t('backfill.search_title'))}" disabled>${I.layers}</button>`;
    const b = bfOf(s);
    const open = b && (BF_OPEN.includes(b.state) || b.state === 'paused');
    const why = open ? t('backfill.why_open') : HC.platform.enabled(HC.platform.of(s)) ? '' : offWhy(s);
    const title = why || t(b && b.state === 'done' ? 'backfill.again_title' : 'backfill.action_title');
    return `<button class="iconbtn${open ? ' on' : ''}" data-act="bf" title="${esc(title)}" aria-label="${esc(t('backfill.action'))}"${why ? ' disabled' : ''}>${I.layers}</button>`;
  }
  /** Warum «Prüfen» gerade nicht geht (Text für den Tooltip) oder ''. s = null: «Alle prüfen». */
  function lockReason(s) {
    if (!s) return allBlocked() ? t('watchlist.why_backoff') : busy() ? t('watchlist.why_running') : '';
    if (boOf(s)) return t('watchlist.why_backoff_p', { p: HC.platform.label(HC.platform.of(s)) });
    if (busy()) return t('watchlist.why_running');
    if (!s.enabled) return t('watchlist.why_off');
    return HC.platform.enabled(HC.platform.of(s)) ? '' : offWhy(s);
  }

  function lastCell(s) {
    if (checking.has(s.id)) return `<span class="wl-state on"><span class="spinner"></span>${t('watchlist.checking')}</span>`;
    if (pending.has(s.id)) return `<span class="wl-state">${I.clock}${t('watchlist.queued')}</span>`;
    return s.last_checked ? `<span data-rel="${esc(s.last_checked)}" title="${esc(util.fmtFull(s.last_checked))}">${esc(util.fmtRel(s.last_checked))}</span>` : t('fmt.never');
  }
  function row(s) {
    const err = errors.get(s.id);
    const lock = lockReason(s);
    const cls = [s.enabled ? '' : 'off', bfRow(s) ? 'has-bf' : '', checking.has(s.id) ? 'checking' : '', pending.has(s.id) ? 'pending' : '', err ? 'has-error' : '', flash.has(s.id) ? 'flash' : ''].filter(Boolean).join(' ');
    return `<tr data-id="${s.id}" class="${cls}">
      <td>${ui.toggle(s.enabled, `data-k="enabled" title="${esc(t('watchlist.col_active'))}"`)}</td>
      <td class="clip"><div class="cell-title"><div><b${s.name_auto ? ' class="auto"' : ''} title="${esc(s.name_auto ? t('watchlist.name_auto_title') : `${t('source_type.' + s.type)} · ${s.name}`)}">${esc(s.name)}</b>${err
    ? `<small class="src-err" title="${esc(`${t('watchlist.error_title')}: ${err}`)}">${ui.pbadge(s)}${I.warn}<span>${esc(err)}</span></small>`
    : `<small class="has-rev">${ui.pbadge(s)}${reversed(s) ? `<span class="wl-rev" title="${esc(t('watchlist.rev_title'))}">${I.up}${t('watchlist.rev_short')}</span>` : ''}<span title="${esc(s.url_or_query)}">${esc(s.url_or_query)}</span></small>`}${bfDone(s)}</div></div></td>
      <td class="mono">${esc(t('source_type.' + s.type))}</td>
      <td>${s.default_genre ? ui.genreDot(s.default_genre) : `<span class="unit">${t('watchlist.genre_auto')}</span>`}</td>
      <td><span class="okline" title="${esc(t(s.auto_download ? 'watchlist.auto_title_on' : 'watchlist.auto_title_off'))}">${ui.toggle(s.auto_download, 'data-k="auto_download"')}<span class="toggle-label">${t(s.auto_download ? 'watchlist.auto_on' : 'watchlist.auto_off')}</span></span></td>
      <td class="mono num"${s.max_entries == null ? ` title="${esc(t('watchlist.max_default_title'))}"` : ''}>${s.max_entries == null ? `${esc(defaultMax(s.type))} <span class="std">${t('watchlist.max_default')}</span>` : esc(s.max_entries)}</td>
      <td class="mono">${lastCell(s)}</td>
      <td class="num">${s.new_count ? `<button type="button" class="badge" data-act="inbox" title="${esc(t('watchlist.new_title'))}">${esc(s.new_count)}</button>` : '<span class="mono muted">–</span>'}</td>
      <td class="act">
        <button class="btn sm ghost" data-act="check" title="${esc(lock || t('watchlist.check_title'))}" ${lock ? 'disabled' : ''}>${t('watchlist.check')}</button>
        ${bfButton(s)}
        <button class="iconbtn" data-act="edit" title="${esc(t('common.edit'))}">${I.edit}</button>
        <button class="iconbtn danger" data-act="del" title="${esc(t('common.delete'))}">${I.trash}</button>
      </td></tr>${bfRow(s)}`;
  }

  /* Kopf: Zähler, nächste Prüfung, «Alle prüfen» mit Fortschritt, Backoff-Hinweis. */
  let headKey = '';
  function renderHead() {
    const active = sources.filter((s) => s.enabled).length;
    const nx = HC.schedule.next();
    /* Backoff nur melden, wenn es die Plattform betrifft: YouTube immer, SoundCloud sobald es Quellen dafür gibt. */
    const bos = HC.platform.backoffs().filter(([p]) => p === 'youtube' || sources.some((s) => HC.platform.of(s) === p));
    const key = [sources.length, active, bos.map(([p, b]) => `${p}:${b.until}:${Math.round(b.remaining_s / 60)}`).join(','), allBlocked(), HC.platform.active().join(','), nx.at, nx.kind, nx.due, busy(), run ? `${run.done}/${run.total}` : ''].join('|');
    if (key === headKey) return;
    headKey = key;
    $('#wl-sub', el).textContent = t('watchlist.sub_n', { n: sources.length, active }) + (nx.at && !allBlocked() ? ` · ${t('watchlist.sub_next', { t: HC.schedule.label(nx) })}` : '');
    const btn = $('#wl-check', el);
    const lock = !active ? t('watchlist.none_active') : lockReason(null);
    btn.disabled = !!lock;
    btn.title = lock;
    btn.classList.toggle('busy', busy());
    btn.innerHTML = busy()
      ? `<span class="spinner"></span>${run && run.total > 1 ? t('watchlist.running_n', { i: Math.min(run.total, run.done + 1), n: run.total }) : t('watchlist.running')}`
      : `${I.refresh}${t('watchlist.check_all')}`;
    const box = $('#wl-notice', el);
    /* Gibt es nur YouTube-Quellen, bleibt der bekannte Text; sonst pro Plattform mit dem Hinweis, dass die andere weiterläuft. */
    const mixed = HC.platform.all.filter((p) => sources.some((s) => HC.platform.of(s) === p)).length > 1;
    box.hidden = !bos.length;
    box.innerHTML = bos.map(([p, bo]) => {
      const otherP = HC.platform.all.find((o) => o !== p && sources.some((x) => HC.platform.of(x) === o)) || 'youtube';
      const v = { t: esc(util.fmtWhen(bo.until)), rest: esc(util.fmtSpan(bo.remaining_s)), p: HC.platform.label(p), other: HC.platform.label(otherP) };
      const link = setLink(p);
      return ui.notice(mixed && !allBlocked() ? 'warn' : 'error', `${t(mixed ? 'watchlist.backoff_p' : 'watchlist.backoff', v)} ${link}`);
    }).join('');
  }
  function render(animate) {
    const body = $('#wl-body', el);
    body.innerHTML = sources.length ? sources.map(row).join('')
      : `<tr class="none"><td colspan="9"><div class="empty">${I.eye}<h4>${t('watchlist.empty_title')}</h4>${t('watchlist.empty_text')}</div></td></tr>`;
    flash.clear();
    renderHead();
    if (animate) fx.stagger(body);
  }
  async function refresh(animate) {
    const list = await HC.bridge.safe('get_sources');
    if (list) {
      sources = list;
      const ids = new Set(list.map((s) => s.id));
      [checking, pending, errors].forEach((c) => [...c.keys()].forEach((id) => { if (!ids.has(id)) c.delete(id); }));
    }
    render(animate);
  }
  const endRun = () => { checking.clear(); pending.clear(); run = null; };

  async function check(ids) {
    const targets = sources.filter((s) => s.enabled && !boOf(s) && (!ids || ids.includes(s.id)));
    if (!targets.length || lockReason(null)) return;
    /* Sofort sichtbar machen – die Events der einzelnen Quellen folgen. */
    targets.forEach((s) => { pending.add(s.id); errors.delete(s.id); });
    run = { total: targets.length, done: 0 };
    render();
    const r = await HC.bridge.safe('check_sources', ids || null);
    if (r && r.ok && r.started > 0) {
      run.total = r.started;
      ui.toast(targets.length === 1 && ids ? t('toast.wl_started_one', { name: targets[0].name }) : t('toast.wl_started', { n: r.started }), 'info');
      renderHead();
      return;
    }
    /* Nicht gestartet (Backoff, läuft bereits, keine aktive Quelle …). */
    targets.forEach((s) => pending.delete(s.id));
    if (!checking.size) run = null;
    if (r && !r.ok) ui.toast(r.error || t('err.generic'), 'err');
    else if (r) ui.toast(t('toast.wl_none'), 'info');
    render();
    if (r && !r.ok) HC.app.refreshStatus(); // z.B. Backoff inzwischen aktiv -> Banner
  }

  /* ---------- Dialog: Quelle anlegen / bearbeiten ---------- */
  function edit(src) {
    const isNew = !src;
    const s = Object.assign({ type: 'channel', name: '', url_or_query: '', default_genre: null, enabled: true, auto_download: false, newest_last: false, max_entries: null, platform: 'youtube', name_auto: false }, src);
    const genres = HC.genres.names().filter((g) => g !== 'Unsortiert');
    if (s.default_genre && !genres.includes(s.default_genre)) genres.push(s.default_genre);
    const err = (k) => `<div class="field-error" data-e="${k}" hidden></div>`;
    const plat = HC.platform.of(s);
    const offP = (k) => (k === 'soundcloud' ? t('platform.sc_off') : t('platform.p_off', { p: HC.platform.label(k) }));
    const body = `
      <div data-form-error hidden></div>
      <div class="frow"><label class="lbl">${t('watchlist.f_type')}</label>
        <div class="seg wide" data-seg="type">${['channel', 'playlist', 'search'].map((k) => `<button type="button" data-v="${k}" class="${s.type === k ? 'on' : ''}" aria-pressed="${s.type === k}">${t('source_type.' + k)}</button>`).join('')}</div>${err('type')}</div>
      <div class="frow"><div class="lblrow"><label class="lbl" data-l="url">${t('watchlist.f_url')}</label><span class="detected" data-det hidden></span></div>
        <input class="input mono" data-f="url_or_query" value="${esc(s.url_or_query)}" spellcheck="false" autocomplete="off">
        <div class="fhint" data-h="url"></div>${err('url_or_query')}</div>
      <div class="frow" data-only="search" hidden><label class="lbl">${t('watchlist.f_platform')}</label>
        <div class="seg wide pseg" data-seg="platform">${HC.platform.all.map((k) => `<button type="button" data-v="${k}" data-p="${k}" class="${plat === k ? 'on' : ''}" aria-pressed="${plat === k}"${!HC.platform.enabled(k) && plat !== k ? ` disabled title="${esc(offP(k))}"` : ''}>${k !== 'youtube' ? I.wave : ''}${HC.platform.label(k)}</button>`).join('')}</div>${err('platform')}</div>
      <div class="frow"><div class="lblrow"><label class="lbl">${t('watchlist.f_name')}</label><span class="sugg-tag" data-sugg title="${esc(t('watchlist.suggested_title'))}" hidden>${t('watchlist.suggested')}</span></div>
        <input class="input" data-f="name" value="${esc(s.name)}" placeholder="${esc(t('watchlist.ph_name'))}" maxlength="120" autocomplete="off">
        <div class="fhint" data-h="name" hidden></div>${err('name')}</div>
      <div class="frow" data-only="playlist" hidden><label class="check"><input type="checkbox" data-f="newest_last"${s.newest_last ? ' checked' : ''}>${t('watchlist.f_newest_last')}</label>
        <div class="fhint indent">${t('watchlist.hint_newest_last')}</div>${err('newest_last')}</div>
      <div class="frow inline">
        <div style="flex:1;min-width:0"><label class="lbl">${t('watchlist.f_genre')}</label>
          <select class="select" data-f="default_genre"><option value="">${t('watchlist.genre_auto_long')}</option>${genres.map((g) => `<option${s.default_genre === g ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select>${err('default_genre')}</div>
        <div style="width:168px;flex:none"><label class="lbl">${t('watchlist.f_max')}</label>
          <div class="with-unit"><input class="input mono" type="number" min="1" max="${maxLimit(s.type)}" step="1" data-f="max_entries" value="${esc(s.max_entries == null ? '' : s.max_entries)}" placeholder="${esc(defaultMax(s.type))}" title="${esc(t('watchlist.max_title'))}"><span class="unit">${t('watchlist.hint_max')}</span></div>${err('max_entries')}</div>
      </div>
      <div class="frow"><label class="lbl">${t('watchlist.f_hits')}</label>
        <div class="seg wide" data-seg="auto">${[['0', 'hits_inbox'], ['1', 'hits_auto']].map(([v, k]) => `<button type="button" data-v="${v}" class="${String(+s.auto_download) === v ? 'on' : ''}" aria-pressed="${String(+s.auto_download) === v}">${t('watchlist.' + k)}</button>`).join('')}</div>
        <div class="fhint" data-h="auto"></div>${err('auto_download')}</div>
      <div class="frow"><label class="check"><input type="checkbox" data-f="enabled"${s.enabled ? ' checked' : ''}>${t('watchlist.f_enabled')}</label>${err('enabled')}</div>`;
    /* Namensvorschlag: lastSugg = zuletzt eingesetzter Vorschlag (null = keiner). Der Name gilt als «automatisch»,
       solange das Feld leer ist oder noch genau diesen Vorschlag enthält. */
    let lastSugg = s.name_auto ? s.name : null;
    let detected = null; // letzte Antwort von suggest_source
    let typeManual = null; // vom User angeklickter Typ
    const segVal = (m, name) => ($(`[data-seg=${name}] .on`, m) || {}).dataset.v;
    const showErrors = (m, errs, general) => {
      let first = null, rest = [];
      Object.keys(errs || {}).forEach((k) => { if (!$(`[data-e="${k}"]`, m)) rest.push(errs[k]); });
      $$('[data-e]', m).forEach((e) => {
        const msg = errs && errs[e.dataset.e];
        e.hidden = !msg;
        e.textContent = msg || '';
        const ctl = $(`[data-f="${e.dataset.e}"]`, m);
        if (ctl) { ctl.classList.toggle('invalid', !!msg); if (msg && !first) first = ctl; }
      });
      const box = $('[data-form-error]', m);
      const text = [general].concat(rest).filter(Boolean).join(' ');
      box.hidden = !text;
      box.innerHTML = text ? ui.notice('error', esc(text)) : '';
      if (first) first.focus();
    };
    ui.modal({
      title: t(isNew ? 'watchlist.add_title' : 'watchlist.edit_title'), body, okLabel: t('common.save'),
      onOpen(m) {
        const url = $('[data-f=url_or_query]', m), name = $('[data-f=name]', m);
        const setSeg = (seg, v) => $$(`[data-seg=${seg}] button`, m).forEach((x) => { x.classList.toggle('on', x.dataset.v === v); x.setAttribute('aria-pressed', x.dataset.v === v); });
        const nameIsAuto = () => name.value.trim() === '' || (lastSugg != null && name.value === lastSugg);
        /** Vorschlag sichtbar als Vorschlag kennzeichnen, bis der User tippt; leerer Name -> «kommt bei der ersten Prüfung». */
        const paintName = () => {
          const type = segVal(m, 'type');
          const sugg = !!lastSugg && name.value === lastSugg;
          const later = !name.value.trim() && type !== 'search' && !!url.value.trim() && (!detected || !!detected.type);
          name.classList.toggle('suggested', sugg);
          $('[data-sugg]', m).hidden = !sugg;
          name.placeholder = t(later ? 'watchlist.ph_name_later' : 'watchlist.ph_name');
          const h = $('[data-h=name]', m);
          h.textContent = sugg && type !== 'search' ? t('watchlist.hint_name_auto') : later ? t('watchlist.hint_name_later') : '';
          h.hidden = !h.textContent;
        };
        const paintDetected = () => {
          const box = $('[data-det]', m), type = segVal(m, 'type');
          const show = !!detected && type !== 'search' && !!url.value.trim();
          box.hidden = !show;
          if (!show) return;
          box.classList.toggle('bad', !detected.type);
          box.innerHTML = detected.type ? `${ui.pbadge(detected.platform, true)}<span>${esc(t('watchlist.detected', { p: HC.platform.label(detected.platform), type: t('source_type.' + detected.type) }))}</span>` : `<span>${esc(t('watchlist.not_detected'))}</span>`;
        };
        const sync = () => {
          const type = segVal(m, 'type');
          paintName();
          paintDetected();
          $('[data-l=url]', m).textContent = t(type === 'search' ? 'watchlist.f_query' : 'watchlist.f_url');
          $('[data-f=url_or_query]', m).placeholder = t('watchlist.ph_' + type);
          $('[data-h=url]', m).textContent = t('watchlist.hint_' + type);
          $$('[data-only]', m).forEach((n) => { n.hidden = n.dataset.only !== type; });
          const mx = $('[data-f=max_entries]', m);
          mx.max = maxLimit(type);
          mx.placeholder = defaultMax(type); // leer = Standard aus den Einstellungen
          $('[data-h=auto]', m).textContent = t(segVal(m, 'auto') === '1' ? 'watchlist.hint_auto' : 'watchlist.hint_inbox');
        };
        /* suggest_source: ohne Netzwerk, nur aus der URL. Typ und Plattform folgen der Eingabe, der Name nur als Vorschlag. */
        let seq = 0;
        const ask = async () => {
          const text = url.value.trim(), my = ++seq;
          if (!text) {
            detected = null;
            if (lastSugg != null && name.value === lastSugg) name.value = '';
            lastSugg = null;
            sync();
            return;
          }
          let r = null;
          try {
            r = typeManual === 'search' ? await HC.bridge.call('suggest_source', text, 'search') : await HC.bridge.call('suggest_source', text);
          } catch (e) { console.warn('[watchlist] suggest_source:', e); }
          if (my !== seq || !m.isConnected || !r) return;
          detected = r;
          const isUrlType = r.type === 'channel' || r.type === 'playlist';
          /* Eine angefangene URL («htt…») sieht zuerst wie ein Suchbegriff aus -> nicht vorschnell auf «Suche» springen. */
          const asSearch = r.type === 'search' && (typeManual === 'search' || (typeManual == null && !/^(h|ht|htt|http|https|w|ww|www|y|s)[:/.]*$/i.test(text) && (text.length >= 4 || /\s/.test(text))));
          if (isUrlType || asSearch) {
            if (r.type !== segVal(m, 'type')) setSeg('type', r.type);
            if (isUrlType && r.platform) setSeg('platform', r.platform);
            if (nameIsAuto()) {
              name.value = r.name || '';
              lastSugg = r.name || '';
              const eb = $('[data-e="name"]', m);
              if (eb && !eb.hidden) { eb.hidden = true; name.classList.remove('invalid'); }
            }
          }
          sync();
        };
        const askSoon = util.debounce(ask, 300);
        url.addEventListener('input', askSoon);
        name.addEventListener('input', paintName);
        m.addEventListener('click', (e) => {
          const b = e.target.closest('[data-seg] button');
          if (!b || b.disabled) return;
          $$('button', b.parentElement).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
          if (b.parentElement.dataset.seg === 'type') { typeManual = b.dataset.v; if (url.value.trim()) ask(); }
          sync();
        });
        /* Fehler am Feld verschwindet, sobald man es korrigiert. */
        m.addEventListener('input', (e) => {
          const k = e.target.dataset && e.target.dataset.f;
          const box = k && $(`[data-e="${k}"]`, m);
          if (box && !box.hidden) { box.hidden = true; e.target.classList.remove('invalid'); }
        });
        sync();
      },
      async onOk(m) {
        const okBtn = $('[data-act=ok]', m);
        if (okBtn.disabled) return false;
        const val = (k) => $(`[data-f=${k}]`, m);
        const max = val('max_entries').value.trim();
        const type = segVal(m, 'type'), text = val('url_or_query').value.trim();
        let name = val('name').value.trim();
        /* name_auto: unveränderter Vorschlag oder leer -> die erste Prüfung setzt den echten Namen. Das Backend verlangt
           trotzdem einen Namen: bei leerem Feld geht vorläufig die URL ohne Protokoll mit. */
        const auto = type !== 'search' && (name === '' ? !!text : !!lastSugg && name === lastSugg.trim());
        if (!name && type !== 'search' && text) name = text.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '').slice(0, 120);
        const out = Object.assign({}, s, {
          type, name, url_or_query: text, name_auto: auto,
          platform: type === 'search' ? segVal(m, 'platform') || 'youtube' : (detected && detected.type && detected.platform) || HC.platform.of(s),
          default_genre: val('default_genre').value || null, max_entries: max === '' ? null : +max,
          enabled: val('enabled').checked, auto_download: segVal(m, 'auto') === '1', newest_last: val('newest_last').checked,
        });
        ui.busy(okBtn, true);
        const r = await HC.bridge.safe('save_source', payload(out));
        ui.busy(okBtn, false);
        if (!r) return false;
        if (!r.ok) {
          const errs = r.errors || {};
          showErrors(m, errs, r.error || (Object.keys(errs).length ? '' : t('watchlist.form_error')));
          return false;
        }
        ui.toast(t(isNew ? 'toast.source_added' : 'toast.source_saved', { name: out.name }));
        if (r.source && r.source.id != null) flash.add(r.source.id);
        refresh();
        return true;
      },
    });
  }

  /* Bestätigung mit Schätzung (ohne Netzwerk), dann Start im Hintergrund. */
  async function backfillAsk(s) {
    const e = await HC.bridge.safe('estimate_backfill', s.id);
    if (!e) return;
    if (!e.ok) { ui.toast(e.error || t('err.generic'), 'err'); return; }
    const facts = [
      e.known_total != null ? t('backfill.dlg_known', { n: util.fmtNum(e.known_total) }) : esc(t('backfill.dlg_unknown', { cap: util.fmtNum(e.cap) })),
      e.known_total != null && e.known_total > e.cap ? esc(t('backfill.dlg_capped', { cap: util.fmtNum(e.cap) })) : '',
      e.resume ? esc(t('backfill.dlg_resume', { n: util.fmtNum(e.position) })) : '',
      e.headless_ok === false ? esc(t('backfill.dlg_headless', { n: util.fmtNum(e.per_hour) })) : '',
    ].filter(Boolean);
    const body = `<p>${t('backfill.dlg_text')}</p>
      <div class="bf-est">
        <div class="bf-big"><b class="mono">~${esc(util.fmtNum(e.requests))}</b><span>${esc(t('backfill.dlg_requests'))}</span></div>
        <div class="bf-big"><b class="mono">~${esc(util.fmtSpan(e.seconds))}</b><span>${esc(t('backfill.dlg_time'))}</span></div>
        <div class="bf-big"><b class="mono">${e.conservative ? '≤ ' : ''}${esc(util.fmtNum(e.entries))}</b><span>${esc(t('backfill.dlg_entries'))}</span></div>
      </div>
      <p class="bf-facts">${facts.join('<br>')}</p>
      ${ui.notice('info', esc(t('backfill.dlg_pace', { n: e.per_hour })))}`;
    const yes = await ui.modal({ title: t('backfill.dlg_title', { name: s.name }), body, kind: 'bf-dlg', okLabel: t(e.resume ? 'backfill.dlg_ok_resume' : 'backfill.dlg_ok') });
    if (yes) backfillStart(s);
  }
  async function backfillStart(s, quiet) {
    const r = await HC.bridge.safe('start_backfill', s.id);
    if (!r) return;
    if (!r.ok) { ui.toast(r.error || t('err.generic'), 'err'); return; }
    s.backfill = r.backfill;
    if (!quiet) ui.toast(t('backfill.toast_started', { name: s.name }), 'info');
    render();
  }
  async function backfillAct(s, act) {
    if (act === 'resume') return backfillStart(s, true);
    if (act === 'cancel') {
      const yes = await ui.confirm(t('backfill.dlg_cancel_title'), t('backfill.dlg_cancel_text', { name: s.name }), { okLabel: t('backfill.cancel'), cancelLabel: t('backfill.keep'), danger: true });
      if (!yes) return;
    }
    const r = await HC.bridge.safe(act === 'pause' ? 'pause_backfill' : 'cancel_backfill', s.id);
    if (!r) return;
    if (!r.ok) { ui.toast(r.error || t('err.generic'), 'err'); return; }
    s.backfill = r.backfill;
    ui.toast(t(act === 'pause' ? 'backfill.toast_paused' : 'backfill.toast_cancelled', { name: s.name }), 'info');
    render();
  }

  function init(root) {
    el = root;
    el.innerHTML = `
      <div class="view-head"><h2 class="glitch" data-text="${t('watchlist.title')}">${t('watchlist.title')}</h2><span class="sub" id="wl-sub"></span>
        <div class="actions">
          <button class="btn" id="wl-add">${I.plus}${t('watchlist.add')}</button>
          <button class="btn primary" id="wl-check">${I.refresh}${t('watchlist.check_all')}</button>
        </div></div>
      <div class="scroll">
        <div id="wl-notice" hidden></div>
        <table class="wl-table">
          <thead><tr><th style="width:62px">${t('watchlist.col_active')}</th><th>${t('watchlist.col_name')}</th><th style="width:84px">${t('watchlist.col_type')}</th>
            <th style="width:124px">${t('watchlist.col_genre')}</th><th style="width:132px">${t('watchlist.col_auto')}</th><th class="num" style="width:62px">${t('watchlist.col_max')}</th>
            <th style="width:148px">${t('watchlist.col_last')}</th><th class="num" style="width:58px">${t('watchlist.col_new')}</th><th style="width:200px"></th></tr></thead>
          <tbody id="wl-body"></tbody>
        </table>
      </div>`;
    $('#wl-add', el).onclick = () => edit(null);
    $('#wl-check', el).onclick = () => check(null);
    $('#wl-notice', el).addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto]');
      if (go) { const [view, arg] = go.dataset.goto.split('/'); HC.app.go(view, arg); }
    });
    $('#wl-body', el).addEventListener('click', async (e) => {
      const tr = e.target.closest('tr[data-id], tr[data-bf-id]');
      if (!tr) return;
      const s = sources.find((x) => x.id === +(tr.dataset.id || tr.dataset.bfId));
      if (!s) return;
      const tog = e.target.closest('.toggle');
      const bf = e.target.closest('[data-bf]');
      if (bf) { if (!bf.disabled) backfillAct(s, bf.dataset.bf); return; }
      const b = e.target.closest('[data-act]');
      const act = b && !b.disabled ? b.dataset.act : null;
      if (tog) {
        const k = tog.dataset.k;
        if (tog.disabled) return;
        tog.disabled = true;
        s[k] = !s[k];
        ui.setToggle(tog, s[k]);
        const r = await HC.bridge.safe('save_source', payload(s));
        if (!r || !r.ok) {
          s[k] = !s[k];
          if (r) ui.toast(r.error || Object.values(r.errors || {})[0] || t('watchlist.form_error'), 'err');
        }
        setTimeout(() => render(), HC.fx.reduced() ? 0 : 180);
      } else if (act === 'check') {
        check([s.id]);
      } else if (act === 'bf') {
        backfillAsk(s);
      } else if (act === 'inbox') {
        HC.app.go('inbox', `src-${s.id}`);
      } else if (act === 'edit') {
        edit(s);
      } else if (act === 'del') {
        const yes = await ui.confirm(t('dlg.del_source.title'), t('dlg.del_source.text', { name: s.name }), { okLabel: t('common.delete'), danger: true });
        if (!yes) return;
        const r = await HC.bridge.safe('delete_source', s.id);
        if (r && r.ok) { ui.toast(t('toast.source_deleted', { name: s.name }), 'info'); refresh(); }
        else if (r) ui.toast(r.error || t('err.generic'), 'err');
      }
    });

    HC.bridge.on('source', (d) => {
      const s = sources.find((x) => x.id === d.id);
      if (d.checking) {
        if (!run) run = { total: 0, done: 0 };
        pending.delete(d.id);
        checking.add(d.id);
        errors.delete(d.id);
      } else {
        if (checking.delete(d.id) && run) run.done++;
        pending.delete(d.id);
        if (d.error) errors.set(d.id, String(d.error)); else errors.delete(d.id);
        if (s) {
          if (typeof d.name === 'string' && d.name && d.name !== s.name) { s.name = d.name; s.name_auto = false; flash.add(d.id); } // name_auto: echter Name
          if (d.last_checked) s.last_checked = d.last_checked;
          if (d.new_count != null) { if (d.new_count > (s.new_count || 0)) flash.add(d.id); s.new_count = d.new_count; }
        }
      }
      render();
    });
    HC.bridge.on('watchlist_done', () => { endRun(); refresh(); });
    const bfResync = util.debounce(() => { if (HC.app.current() === 'watchlist' && !busy()) refresh(); }, 1500);
    HC.bridge.on('backfill', (d) => {
      const s = sources.find((x) => x.id === d.source_id);
      if (!s) return;
      const before = s.backfill && s.backfill.state;
      if (d.added > ((s.backfill && s.backfill.added) || 0)) bfResync(); // «Neu» der Quelle zählt mit
      s.backfill = d.state === 'none' ? null : d;
      if (d.state === 'done' && before && before !== 'done') {
        ui.toast(t('backfill.toast_done', { name: s.name, n: d.added }), 'ok');
        flash.add(s.id);
      }
      if (HC.app.current() !== 'watchlist') return;
      const tr = $(`#wl-body tr[data-id="${s.id}"]`, el);
      /* Nur die eine Quelle neu zeichnen (Zeile + Fortschrittszeile): der Fortschritt kommt pro Seite. */
      const sub = $(`#wl-body tr[data-bf-id="${s.id}"]`, el);
      const b = bfOf(s);
      if (sub && b && sub.classList.contains(`bf-${b.state}`) && !b.note) {
        /* Gleicher Zustand: nur Zahlen und Balken nachziehen – die Knöpfe bleiben stehen (klickbar). */
        $('.bf-n', sub).textContent = bfCount(b);
        $('.bf-add', sub).textContent = t('backfill.added', { n: util.fmtNum(b.added) });
        $('.progress .bar', sub).style.setProperty('--p', bfPct(b)); // nur transform, kein Layout
        return;
      }
      if (tr && !flash.has(s.id)) {
        if (sub) sub.remove();
        tr.insertAdjacentHTML('afterend', row(s));
        tr.remove();
      } else render();
    });
    HC.bridge.on('sources_changed', () => refresh());
    /* Eingang geleert/geladen -> «Neu» pro Quelle stimmt nicht mehr. */
    const resync = util.debounce(() => { if (HC.app.current() === 'watchlist' && !busy()) refresh(); }, 400);
    HC.bridge.on('video', resync);
    HC.bridge.on('status_rendered', () => {
      if (allBlocked() && pending.size && !checking.size) endRun(); // Lauf wegen Backoff abgebrochen
      const before = headKey;
      renderHead();
      if (before !== headKey && sources.length) $('#wl-body', el).innerHTML = sources.map(row).join(''); // Sperre der Knöpfe
    });
    HC.bridge.on('settings_changed', () => { headKey = ''; render(); });
    /* Relative Zeiten («vor 12 Min.») frisch halten. */
    setInterval(() => {
      if (HC.app.current() !== 'watchlist' || document.hidden) return;
      $$('[data-rel]', el).forEach((n) => { n.textContent = util.fmtRel(n.dataset.rel); });
    }, 30000);
  }

  HC.views.watchlist = {
    init,
    show: (arg, changed) => refresh(changed),
    reset() { sources = []; endRun(); errors.clear(); headKey = ''; },
  };
})();
