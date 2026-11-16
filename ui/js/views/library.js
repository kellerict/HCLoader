/* =====================================================================
   views/library.js – Bibliothek: alle geladenen Mixes
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, util, fx, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;

  let el;
  let items = [];
  const year = (l) => (l.upload_date || '').slice(0, 4);

  function filtered() {
    const q = util.norm($('#lib-q', el).value.trim());
    const g = $('#lib-genre', el).value, y = $('#lib-year', el).value;
    return items.filter((l) => (!g || l.genre === g) && (!y || year(l) === y)
      && (!q || util.norm(`${l.title} ${l.artist}`).includes(q)));
  }
  function row(l) {
    const dir = l.file_path.replace(/[^\\/]*$/, '');
    return `<tr data-id="${esc(l.id)}">
      <td class="clip"><div class="cell-title">${ui.thumb({ id: l.id, genre: l.genre }, 'mini')}</div>
        <div><b title="${esc(l.title)}">${esc(l.title)}</b><small title="${esc(l.file_path)}">…\\${esc(dir)}</small></div></div></td>
      <td class="clip">${esc(l.artist)}</td>
      <td>${ui.genreDot(l.genre)}</td>
      <td class="mono num">${util.fmtDur(l.duration)}</td>
      <td class="mono num">${l.size_mb != null ? `${l.size_mb.toFixed(0)} MB` : '–'}</td>
      <td class="mono">${util.fmtDate(l.upload_date)}</td>
      <td class="mono">${util.fmtDate(l.downloaded_at)}</td>
      <td class="act">
        <button class="iconbtn" data-act="folder" title="${esc(t('library.open_folder'))}">${I.folder}</button>
        <button class="iconbtn" data-act="retag" title="${esc(t('library.retag'))}">${I.tag}</button>
        <button class="iconbtn danger" data-act="del" title="${esc(t('library.delete'))}">${I.trash}</button>
      </td></tr>`;
  }
  function render(animate) {
    const list = filtered();
    const body = $('#lib-body', el);
    body.innerHTML = list.length ? list.map(row).join('')
      : `<tr><td colspan="8"><div class="empty">${I.library}<h4>${t(items.length ? 'library.none_title' : 'library.empty_title')}</h4>${t(items.length ? 'library.none_text' : 'library.empty_text')}</div></td></tr>`;
    const hours = items.reduce((a, b) => a + b.duration, 0) / 3600;
    const gb = items.reduce((a, b) => a + (b.size_mb || 0), 0) / 1024;
    $('#lib-sub', el).textContent = t('library.sub', { n: items.length, h: hours.toFixed(1), gb: gb.toFixed(1) })
      + (list.length !== items.length ? ` · ${t('library.shown', { n: list.length })}` : '');
    if (animate) fx.stagger(body);
  }
  function fillSelects() {
    const keep = (sel, html) => { const v = sel.value; sel.innerHTML = html; sel.value = v; if (sel.selectedIndex < 0) sel.value = ''; };
    keep($('#lib-genre', el), `<option value="">${t('library.all_genres')}</option>` + HC.genres.names().map((g) => `<option>${esc(g)}</option>`).join(''));
    const years = [...new Set(items.map(year).filter(Boolean))].sort().reverse();
    keep($('#lib-year', el), `<option value="">${t('library.all_years')}</option>` + years.map((y) => `<option>${y}</option>`).join(''));
  }
  async function refresh(animate) {
    const list = await HC.bridge.safe('get_library');
    if (list) items = list;
    fillSelects();
    render(animate);
  }

  function init(root) {
    el = root;
    el.innerHTML = `
      <div class="view-head"><h2 class="glitch" data-text="${t('library.title')}">${t('library.title')}</h2><span class="sub" id="lib-sub"></span>
        <div class="actions">
          <select class="select" id="lib-genre" style="width:150px"></select>
          <select class="select" id="lib-year" style="width:120px"></select>
          <div class="search-wrap" style="width:250px">${I.search}<input class="input" id="lib-q" placeholder="${esc(t('library.search'))}" style="padding:7px 10px 7px 36px;font-size:14px" spellcheck="false"></div>
        </div></div>
      <div class="scroll">
        <table>
          <thead><tr><th>${t('library.col_title')}</th><th style="width:17%">${t('library.col_artist')}</th><th style="width:120px">${t('library.col_genre')}</th>
            <th class="num" style="width:84px">${t('library.col_duration')}</th><th class="num" style="width:84px">${t('library.col_size')}</th>
            <th style="width:104px">${t('library.col_upload')}</th><th style="width:104px">${t('library.col_loaded')}</th><th style="width:116px"></th></tr></thead>
          <tbody id="lib-body"></tbody>
        </table>
      </div>`;
    $('#lib-q', el).addEventListener('input', util.debounce(() => render(), 120));
    $('#lib-genre', el).addEventListener('change', () => render(true));
    $('#lib-year', el).addEventListener('change', () => render(true));
    $('#lib-body', el).addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'), tr = e.target.closest('tr[data-id]');
      if (!b || !tr) return;
      const l = items.find((x) => x.id === tr.dataset.id);
      if (b.dataset.act === 'folder') {
        HC.bridge.safe('open_folder', l.id);
      } else if (b.dataset.act === 'retag') {
        b.disabled = true;
        const r = await HC.bridge.safe('retag', l.id);
        b.disabled = false;
        if (r && r.ok) ui.toast(t('toast.retagged', { title: l.title }));
      } else if (b.dataset.act === 'del') {
        if (HC.settings.values.general.confirm_delete) {
          const yes = await ui.confirm(t('dlg.del_mix.title'), t('dlg.del_mix.text', { title: l.title }), { okLabel: t('dlg.del_mix.ok'), danger: true, warning: t('dlg.del_mix.warn') });
          if (!yes) return;
        }
        const r = await HC.bridge.safe('delete_library_item', l.id);
        if (r && r.ok) { ui.toast(t('toast.deleted', { title: l.title }), 'warn'); refresh(); }
      }
    });
    HC.bridge.on('done', () => { if (HC.app.current() === 'library') refresh(); });
    HC.bridge.on('settings_changed', () => { fillSelects(); render(); });
  }

  HC.views.library = { init, show: (arg, changed) => refresh(changed) };
})();
