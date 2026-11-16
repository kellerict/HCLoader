/* =====================================================================
   views/watchlist.js – Quellen (Kanal, Playlist, gespeicherte Suche)
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, util, fx, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;

  let el;
  let sources = [];
  const checking = new Set();

  function row(s) {
    return `<tr data-id="${s.id}" class="${s.enabled ? '' : 'off'}${checking.has(s.id) ? ' checking' : ''}">
      <td>${ui.toggle(s.enabled, `data-k="enabled" title="${esc(t('watchlist.col_active'))}"`)}</td>
      <td class="clip"><div class="cell-title"><div><b>${esc(s.name)}</b><small title="${esc(s.url_or_query)}">${esc(s.url_or_query)}</small></div></div></td>
      <td class="mono">${t('source_type.' + s.type)}</td>
      <td>${s.default_genre ? ui.genreDot(s.default_genre) : `<span class="unit">${t('watchlist.genre_auto')}</span>`}</td>
      <td><span class="okline">${ui.toggle(s.auto_download, 'data-k="auto_download"')}<span class="toggle-label">${t(s.auto_download ? 'watchlist.auto_on' : 'watchlist.auto_off')}</span></span></td>
      <td class="mono num">${s.max_entries}</td>
      <td class="mono">${checking.has(s.id) ? `<span style="color:var(--warn)">${t('watchlist.checking')}</span>` : s.last_checked ? util.fmtWhen(s.last_checked) : t('fmt.never')}</td>
      <td class="num">${s.new_count ? `<span class="badge">${s.new_count}</span>` : '<span class="mono muted">–</span>'}</td>
      <td class="act">
        <button class="btn sm ghost" data-act="check" ${s.enabled && !checking.has(s.id) ? '' : 'disabled'}>${t('watchlist.check')}</button>
        <button class="iconbtn" data-act="edit" title="${esc(t('common.edit'))}">${I.edit}</button>
        <button class="iconbtn danger" data-act="del" title="${esc(t('common.delete'))}">${I.trash}</button>
      </td></tr>`;
  }
  function render(animate) {
    const body = $('#wl-body', el);
    body.innerHTML = sources.length ? sources.map(row).join('')
      : `<tr><td colspan="9"><div class="empty">${I.eye}<h4>${t('watchlist.empty_title')}</h4>${t('watchlist.empty_text')}</div></td></tr>`;
    const active = sources.filter((s) => s.enabled).length;
    $('#wl-sub', el).textContent = t('watchlist.sub_n', { n: sources.length, active });
    $('#wl-check', el).disabled = !active || checking.size > 0;
    if (animate) fx.stagger(body);
  }
  async function refresh(animate) {
    const list = await HC.bridge.safe('get_sources');
    if (list) sources = list;
    render(animate);
  }

  function edit(src) {
    const isNew = !src;
    const s = Object.assign({ type: 'channel', name: '', url_or_query: '', default_genre: null, enabled: true, auto_download: false, max_entries: HC.settings.values.schedule.entries_per_source }, src);
    const genres = HC.genres.names().filter((g) => g !== 'Unsortiert');
    const body = `
      <div class="frow"><label class="lbl">${t('watchlist.f_type')}</label>
        <select class="select" data-f="type">${['channel', 'playlist', 'search'].map((k) => `<option value="${k}"${s.type === k ? ' selected' : ''}>${t('source_type.' + k)}</option>`).join('')}</select></div>
      <div class="frow"><label class="lbl">${t('watchlist.f_name')}</label><input class="input" data-f="name" value="${esc(s.name)}"><div class="field-error" data-e="name" hidden></div></div>
      <div class="frow"><label class="lbl" data-l="url">${t('watchlist.f_url')}</label><input class="input mono" data-f="url_or_query" value="${esc(s.url_or_query)}" spellcheck="false"><div class="field-error" data-e="url_or_query" hidden></div></div>
      <div class="frow inline">
        <div style="flex:1"><label class="lbl">${t('watchlist.f_genre')}</label>
          <select class="select" data-f="default_genre"><option value="">${t('watchlist.genre_auto_long')}</option>${genres.map((g) => `<option${s.default_genre === g ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select></div>
        <div style="width:150px"><label class="lbl">${t('watchlist.f_max')}</label><input class="input mono" type="number" min="1" max="200" data-f="max_entries" value="${s.max_entries}"><div class="field-error" data-e="max_entries" hidden></div></div>
      </div>
      <div class="frow inline">
        <label class="check"><input type="checkbox" data-f="enabled"${s.enabled ? ' checked' : ''}>${t('watchlist.f_enabled')}</label>
        <label class="check"><input type="checkbox" data-f="auto_download"${s.auto_download ? ' checked' : ''}>${t('watchlist.f_auto')}</label>
      </div>`;
    ui.modal({
      title: t(isNew ? 'watchlist.add_title' : 'watchlist.edit_title'), body, okLabel: t('common.save'),
      onOpen(m) {
        const type = $('[data-f=type]', m);
        const sync = () => {
          $('[data-l=url]', m).textContent = t(type.value === 'search' ? 'watchlist.f_query' : 'watchlist.f_url');
          $('[data-f=url_or_query]', m).placeholder = t('watchlist.ph_' + type.value);
        };
        type.addEventListener('change', sync);
        sync();
      },
      async onOk(m) {
        const val = (k) => $(`[data-f=${k}]`, m);
        const out = Object.assign({}, s, {
          type: val('type').value, name: val('name').value.trim(), url_or_query: val('url_or_query').value.trim(),
          default_genre: val('default_genre').value || null, max_entries: +val('max_entries').value,
          enabled: val('enabled').checked, auto_download: val('auto_download').checked,
        });
        const r = await HC.bridge.safe('save_source', out);
        if (!r) return false;
        m.querySelectorAll('[data-e]').forEach((e) => { const msg = r.errors && r.errors[e.dataset.e]; e.hidden = !msg; e.textContent = msg || ''; });
        if (!r.ok) return false;
        ui.toast(t(isNew ? 'toast.source_added' : 'toast.source_saved', { name: out.name }));
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
        <table>
          <thead><tr><th style="width:62px">${t('watchlist.col_active')}</th><th>${t('watchlist.col_name')}</th><th style="width:90px">${t('watchlist.col_type')}</th>
            <th style="width:124px">${t('watchlist.col_genre')}</th><th style="width:136px">${t('watchlist.col_auto')}</th><th class="num" style="width:70px">${t('watchlist.col_max')}</th>
            <th style="width:136px">${t('watchlist.col_last')}</th><th class="num" style="width:60px">${t('watchlist.col_new')}</th><th style="width:170px"></th></tr></thead>
          <tbody id="wl-body"></tbody>
        </table>
      </div>`;
    $('#wl-add', el).onclick = () => edit(null);
    $('#wl-check', el).onclick = async () => {
      const r = await HC.bridge.safe('check_sources', null);
      if (r && r.ok) ui.toast(t('toast.wl_started', { n: r.started }), 'info');
    };
    $('#wl-body', el).addEventListener('click', async (e) => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      const s = sources.find((x) => x.id === +tr.dataset.id);
      const tog = e.target.closest('.toggle');
      const act = (e.target.closest('[data-act]') || {}).dataset;
      if (tog) {
        s[tog.dataset.k] = !s[tog.dataset.k];
        ui.setToggle(tog, s[tog.dataset.k]);
        const r = await HC.bridge.safe('save_source', s);
        if (!r || !r.ok) s[tog.dataset.k] = !s[tog.dataset.k];
        setTimeout(() => render(), HC.fx.reduced() ? 0 : 180);
      } else if (act && act.act === 'check') {
        HC.bridge.safe('check_sources', [s.id]);
      } else if (act && act.act === 'edit') {
        edit(s);
      } else if (act && act.act === 'del') {
        const yes = await ui.confirm(t('dlg.del_source.title'), t('dlg.del_source.text', { name: s.name }), { okLabel: t('common.delete'), danger: true });
        if (!yes) return;
        const r = await HC.bridge.safe('delete_source', s.id);
        if (r && r.ok) { ui.toast(t('toast.source_deleted', { name: s.name }), 'info'); refresh(); }
      }
    });
    HC.bridge.on('source', (d) => {
      const s = sources.find((x) => x.id === d.id);
      if (d.checking) checking.add(d.id); else checking.delete(d.id);
      if (s && !d.checking) { if (d.last_checked) s.last_checked = d.last_checked; if (d.new_count != null) s.new_count = d.new_count; }
      render();
    });
    HC.bridge.on('sources_changed', () => refresh());
  }

  HC.views.watchlist = { init, show: (arg, changed) => refresh(changed) };
})();
