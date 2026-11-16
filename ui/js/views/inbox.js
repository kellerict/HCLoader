/* =====================================================================
   views/inbox.js – Eingang: neue Watchlist-Treffer, die alle Filter bestehen
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, fx, ui } = HC;
  const t = (k, v) => HC.t(k, v);

  let el;
  let items = [];
  const open = () => items.filter((v) => v.status === 'inbox');

  function render(animate) {
    const list = open();
    const grid = $('#grid-inbox', el);
    grid.innerHTML = list.length ? list.map((v) => ui.card(v)).join('')
      : `<div class="empty">${HC.icons.inbox}<h4>${t('inbox.empty_title')}</h4>${t('inbox.empty_text')}</div>`;
    $('#inbox-sub', el).textContent = list.length ? t('inbox.sub_n', { n: list.length }) : t('inbox.sub');
    $('#inbox-all', el).disabled = $('#inbox-ignore', el).disabled = !list.length;
    if (animate) fx.stagger(grid);
  }

  function init(root) {
    el = root;
    el.innerHTML = `
      <div class="view-head"><h2 class="glitch" data-text="${t('inbox.title')}">${t('inbox.title')}</h2><span class="sub" id="inbox-sub"></span>
        <div class="actions">
          <button class="btn" id="inbox-ignore">${HC.icons.ban}${t('inbox.ignore_all')}</button>
          <button class="btn primary" id="inbox-all">${HC.icons.download}${t('inbox.download_all')}</button>
        </div></div>
      <div class="scroll"><div class="grid" id="grid-inbox"></div></div>`;
    ui.bindCards($('#grid-inbox', el));
    $('#inbox-all', el).onclick = () => HC.actions.download(open().map((v) => v.id));
    $('#inbox-ignore', el).onclick = async () => {
      const list = open();
      const yes = await ui.confirm(t('dlg.ignore_all.title'), t('dlg.ignore_all.text', { n: list.length }), { okLabel: t('inbox.ignore_all'), danger: true });
      if (!yes) return;
      await Promise.all(list.map((v) => HC.bridge.safe('set_video_status', v.id, 'ignored')));
      ui.toast(t('toast.ignored_n', { n: list.length }), 'info');
    };
    HC.bridge.on('video', () => render());
  }

  async function show(arg, changed) {
    const list = await HC.bridge.safe('get_inbox');
    if (list) items = HC.store.put(list);
    render(changed);
  }

  HC.views.inbox = { init, show };
})();
