/* =====================================================================
   views/watchlist.js – Quellen (Kanal, Playlist, gespeicherte Suche)

   Live-Zustand einer Prüfung kommt über die Events «source» / «watchlist_done»:
     pending  = angefordert, wartet auf ihren Platz (Throttle zwischen den Quellen)
     checking = wird gerade geprüft
     errors   = letzte Prüfung fehlgeschlagen (nur im Speicher, bis zur nächsten Prüfung)
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

  const FIELDS = ['type', 'name', 'url_or_query', 'default_genre', 'enabled', 'auto_download', 'max_entries'];
  const payload = (s) => FIELDS.reduce((o, k) => { o[k] = s[k]; return o; }, s.id != null ? { id: s.id } : {});
  const backoff = () => (HC.status && HC.status.backoff && HC.status.backoff.active ? HC.status.backoff : null);
  const busy = () => checking.size > 0 || pending.size > 0;
  /** Warum «Prüfen» gerade nicht geht (Text für den Tooltip) oder ''. */
  const lockReason = (s) => (backoff() ? t('watchlist.why_backoff') : busy() ? t('watchlist.why_running') : s && !s.enabled ? t('watchlist.why_off') : '');

  function lastCell(s) {
    if (checking.has(s.id)) return `<span class="wl-state on"><span class="spinner"></span>${t('watchlist.checking')}</span>`;
    if (pending.has(s.id)) return `<span class="wl-state">${I.clock}${t('watchlist.queued')}</span>`;
    return s.last_checked ? `<span data-rel="${esc(s.last_checked)}" title="${esc(util.fmtFull(s.last_checked))}">${esc(util.fmtRel(s.last_checked))}</span>` : t('fmt.never');
  }
  function row(s) {
    const err = errors.get(s.id);
    const lock = lockReason(s);
    const cls = [s.enabled ? '' : 'off', checking.has(s.id) ? 'checking' : '', pending.has(s.id) ? 'pending' : '', err ? 'has-error' : '', flash.has(s.id) ? 'flash' : ''].filter(Boolean).join(' ');
    return `<tr data-id="${s.id}" class="${cls}">
      <td>${ui.toggle(s.enabled, `data-k="enabled" title="${esc(t('watchlist.col_active'))}"`)}</td>
      <td class="clip"><div class="cell-title"><div><b title="${esc(`${t('source_type.' + s.type)} · ${s.name}`)}">${esc(s.name)}</b>${err
    ? `<small class="src-err" title="${esc(`${t('watchlist.error_title')}: ${err}`)}">${I.warn}<span>${esc(err)}</span></small>`
    : `<small title="${esc(s.url_or_query)}">${esc(s.url_or_query)}</small>`}</div></div></td>
      <td class="mono">${esc(t('source_type.' + s.type))}</td>
      <td>${s.default_genre ? ui.genreDot(s.default_genre) : `<span class="unit">${t('watchlist.genre_auto')}</span>`}</td>
      <td><span class="okline" title="${esc(t(s.auto_download ? 'watchlist.auto_title_on' : 'watchlist.auto_title_off'))}">${ui.toggle(s.auto_download, 'data-k="auto_download"')}<span class="toggle-label">${t(s.auto_download ? 'watchlist.auto_on' : 'watchlist.auto_off')}</span></span></td>
      <td class="mono num">${esc(s.max_entries)}</td>
      <td class="mono">${lastCell(s)}</td>
      <td class="num">${s.new_count ? `<button type="button" class="badge" data-act="inbox" title="${esc(t('watchlist.new_title'))}">${esc(s.new_count)}</button>` : '<span class="mono muted">–</span>'}</td>
      <td class="act">
        <button class="btn sm ghost" data-act="check" title="${esc(lock || t('watchlist.check_title'))}" ${lock ? 'disabled' : ''}>${t('watchlist.check')}</button>
        <button class="iconbtn" data-act="edit" title="${esc(t('common.edit'))}">${I.edit}</button>
        <button class="iconbtn danger" data-act="del" title="${esc(t('common.delete'))}">${I.trash}</button>
      </td></tr>`;
  }

  /* Kopf: Zähler, nächste Prüfung, «Alle prüfen» mit Fortschritt, Backoff-Hinweis. */
  let headKey = '';
  function renderHead() {
    const active = sources.filter((s) => s.enabled).length;
    const bo = backoff(), nx = HC.schedule.next();
    const key = [sources.length, active, bo ? bo.until : '', bo ? Math.round(bo.remaining_s / 60) : '', nx.at, nx.kind, nx.due, busy(), run ? `${run.done}/${run.total}` : ''].join('|');
    if (key === headKey) return;
    headKey = key;
    $('#wl-sub', el).textContent = t('watchlist.sub_n', { n: sources.length, active }) + (nx.at && !bo ? ` · ${t('watchlist.sub_next', { t: HC.schedule.label(nx) })}` : '');
    const btn = $('#wl-check', el);
    const lock = !active ? t('watchlist.none_active') : lockReason(null);
    btn.disabled = !!lock;
    btn.title = lock;
    btn.classList.toggle('busy', busy());
    btn.innerHTML = busy()
      ? `<span class="spinner"></span>${run && run.total > 1 ? t('watchlist.running_n', { i: Math.min(run.total, run.done + 1), n: run.total }) : t('watchlist.running')}`
      : `${I.refresh}${t('watchlist.check_all')}`;
    const box = $('#wl-notice', el);
    box.hidden = !bo;
    box.innerHTML = bo ? ui.notice('error', `${t('watchlist.backoff', { t: esc(util.fmtWhen(bo.until)), rest: esc(util.fmtSpan(bo.remaining_s)) })} <button class="linkbtn" data-goto="settings/throttle">${t('watchlist.backoff_link')}</button>`) : '';
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
    const targets = sources.filter((s) => s.enabled && (!ids || ids.includes(s.id)));
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
    const s = Object.assign({ type: 'channel', name: '', url_or_query: '', default_genre: null, enabled: true, auto_download: false, max_entries: HC.settings.values.schedule.entries_per_source }, src);
    const genres = HC.genres.names().filter((g) => g !== 'Unsortiert');
    if (s.default_genre && !genres.includes(s.default_genre)) genres.push(s.default_genre);
    const err = (k) => `<div class="field-error" data-e="${k}" hidden></div>`;
    const body = `
      <div data-form-error hidden></div>
      <div class="frow"><label class="lbl">${t('watchlist.f_type')}</label>
        <div class="seg wide" data-seg="type">${['channel', 'playlist', 'search'].map((k) => `<button type="button" data-v="${k}" class="${s.type === k ? 'on' : ''}" aria-pressed="${s.type === k}">${t('source_type.' + k)}</button>`).join('')}</div>${err('type')}</div>
      <div class="frow"><label class="lbl">${t('watchlist.f_name')}</label><input class="input" data-f="name" value="${esc(s.name)}" placeholder="${esc(t('watchlist.ph_name'))}" maxlength="120" autocomplete="off">${err('name')}</div>
      <div class="frow"><label class="lbl" data-l="url">${t('watchlist.f_url')}</label><input class="input mono" data-f="url_or_query" value="${esc(s.url_or_query)}" spellcheck="false" autocomplete="off">
        <div class="fhint" data-h="url"></div>${err('url_or_query')}</div>
      <div class="frow inline">
        <div style="flex:1;min-width:0"><label class="lbl">${t('watchlist.f_genre')}</label>
          <select class="select" data-f="default_genre"><option value="">${t('watchlist.genre_auto_long')}</option>${genres.map((g) => `<option${s.default_genre === g ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select>${err('default_genre')}</div>
        <div style="width:168px;flex:none"><label class="lbl">${t('watchlist.f_max')}</label>
          <div class="with-unit"><input class="input mono" type="number" min="1" max="200" step="1" data-f="max_entries" value="${esc(s.max_entries)}"><span class="unit">${t('watchlist.hint_max')}</span></div>${err('max_entries')}</div>
      </div>
      <div class="frow"><label class="lbl">${t('watchlist.f_hits')}</label>
        <div class="seg wide" data-seg="auto">${[['0', 'hits_inbox'], ['1', 'hits_auto']].map(([v, k]) => `<button type="button" data-v="${v}" class="${String(+s.auto_download) === v ? 'on' : ''}" aria-pressed="${String(+s.auto_download) === v}">${t('watchlist.' + k)}</button>`).join('')}</div>
        <div class="fhint" data-h="auto"></div>${err('auto_download')}</div>
      <div class="frow"><label class="check"><input type="checkbox" data-f="enabled"${s.enabled ? ' checked' : ''}>${t('watchlist.f_enabled')}</label>${err('enabled')}</div>`;
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
        const sync = () => {
          const type = segVal(m, 'type');
          $('[data-l=url]', m).textContent = t(type === 'search' ? 'watchlist.f_query' : 'watchlist.f_url');
          $('[data-f=url_or_query]', m).placeholder = t('watchlist.ph_' + type);
          $('[data-h=url]', m).textContent = t('watchlist.hint_' + type);
          $('[data-h=auto]', m).textContent = t(segVal(m, 'auto') === '1' ? 'watchlist.hint_auto' : 'watchlist.hint_inbox');
        };
        m.addEventListener('click', (e) => {
          const b = e.target.closest('[data-seg] button');
          if (!b) return;
          $$('button', b.parentElement).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
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
        const out = Object.assign({}, s, {
          type: segVal(m, 'type'), name: val('name').value.trim(), url_or_query: val('url_or_query').value.trim(),
          default_genre: val('default_genre').value || null, max_entries: max === '' ? null : +max,
          enabled: val('enabled').checked, auto_download: segVal(m, 'auto') === '1',
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
            <th style="width:148px">${t('watchlist.col_last')}</th><th class="num" style="width:58px">${t('watchlist.col_new')}</th><th style="width:166px"></th></tr></thead>
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
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      const s = sources.find((x) => x.id === +tr.dataset.id);
      if (!s) return;
      const tog = e.target.closest('.toggle');
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
          if (d.last_checked) s.last_checked = d.last_checked;
          if (d.new_count != null) { if (d.new_count > (s.new_count || 0)) flash.add(d.id); s.new_count = d.new_count; }
        }
      }
      render();
    });
    HC.bridge.on('watchlist_done', () => { endRun(); refresh(); });
    HC.bridge.on('sources_changed', () => refresh());
    /* Eingang geleert/geladen -> «Neu» pro Quelle stimmt nicht mehr. */
    const resync = util.debounce(() => { if (HC.app.current() === 'watchlist' && !busy()) refresh(); }, 400);
    HC.bridge.on('video', resync);
    HC.bridge.on('status_rendered', () => {
      if (backoff() && pending.size && !checking.size) endRun(); // Lauf wegen Backoff abgebrochen
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
