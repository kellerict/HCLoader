/* =====================================================================
   playlist.js – Playlist-Export (v0.8.0): Dialog «Playlist exportieren» (HC.playlist.export(spec))
   spec wie docs/bridge-api.md «DJ pages, playlist export»: {kind: "edition"|"series"|"genre"|"artist"|"filter"|
   "checklist"|"continue", …}. preview_playlist liefert Name, Ordner, Anzahl und eine gespeicherte Playlist
   desselben Inhalts; export_playlist schreibt. Existiert die Datei, bleibt der Dialog offen und fragt im Dialog
   selbst («Überschreiben») – kein zweites Modal darüber. Ordnerwahl über pick_folder (nativer Dialog).
   Pfade relativ (Standard, playlists.relative_paths) oder absolut; «Aktuell halten» merkt die Playlist für
   playlists.sync_after_download vor (Hinweis, wenn die Einstellung aus ist).
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, util, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;

  const fmtHours = (sec) => (sec >= 3600 ? `${util.fmtDec(sec / 3600, 1, true)} ${t('library.unit_h')}` : `${util.fmtNum(Math.round(sec / 60))} ${t('library.unit_min')}`);

  function body(p, st) {
    const syncOn = !!(HC.settings.values.playlists && HC.settings.values.playlists.sync_after_download);
    return `<div class="pl-dlg">
      <div class="pl-sum"><span class="pl-ic">${I.playlist}</span><div><b>${esc(t('tracks.n_sets', { n: util.fmtNum(p.count), count: p.count }))}</b>
        <span class="mono">${esc(fmtHours(p.seconds || 0))}</span>${p.missing ? `<small class="pl-miss">${I.warn}${esc(t('pl.missing', { n: util.fmtNum(p.missing) }))}</small>` : ''}</div></div>
      <label class="pl-f"><span>${esc(t('pl.name'))}</span><div class="pl-name"><input class="input" id="pl-name" value="${esc(st.name)}" maxlength="120" spellcheck="false" autocomplete="off"><span class="mono">.m3u8</span></div></label>
      <label class="pl-f"><span>${esc(t('pl.folder'))}</span><div class="pl-folder"><input class="input mono" id="pl-folder" value="${esc(st.folder)}" spellcheck="false" autocomplete="off">
        <button type="button" class="btn sm ghost" id="pl-browse">${I.folder}${esc(t('pl.browse'))}</button></div></label>
      <div class="pl-f"><span>${esc(t('pl.paths'))}</span><div class="seg" id="pl-rel" role="radiogroup" aria-label="${esc(t('pl.paths'))}">
        <button type="button" role="radio" data-rel="1" aria-checked="${st.relative}" class="${st.relative ? 'on' : ''}">${esc(t('pl.relative'))}</button>
        <button type="button" role="radio" data-rel="0" aria-checked="${!st.relative}" class="${st.relative ? '' : 'on'}">${esc(t('pl.absolute'))}</button></div>
        <small class="pl-help" id="pl-rel-help">${esc(t(st.relative ? 'pl.relative_help' : 'pl.absolute_help'))}</small></div>
      <div class="pl-f pl-sync"><span>${esc(t('pl.sync'))}</span>${ui.toggle(st.sync, 'id="pl-sync"')}
        <small class="pl-help">${esc(t(syncOn ? 'pl.sync_help' : 'pl.sync_off'))}</small></div>
      <div id="pl-msg" aria-live="polite"></div></div>`;
  }

  /** Dialog öffnen. o: {title} (Kopfzeile, sonst «Playlist exportieren»). -> Promise<Ergebnis|null> */
  async function exportDialog(spec, o) {
    const p = await HC.bridge.safe('preview_playlist', spec);
    if (!p) return null;
    if (!p.ok) { ui.toast(p.error || t('err.generic'), 'err'); return null; }
    if (!p.count) { ui.toast(t('pl.nothing'), 'warn'); return null; }
    const saved = p.saved;
    const st = { name: saved ? saved.name : p.name, folder: p.folder, relative: saved ? saved.relative : p.relative, sync: saved ? saved.sync : false, overwrite: false };
    if (saved && saved.path) st.folder = saved.path.replace(/[\\/][^\\/]*$/, '');
    let result = null;
    const yes = await ui.modal({
      title: (o && o.title) || t('pl.title'),
      kind: 'pl-modal',
      okLabel: t('pl.export'),
      body: body(p, st),
      onOpen(back) {
        const okBtn = back.querySelector('[data-act=ok]');
        const msg = $('#pl-msg', back);
        const resetAsk = () => { if (!st.overwrite) return; st.overwrite = false; okBtn.textContent = t('pl.export'); okBtn.classList.remove('danger'); okBtn.classList.add('primary'); msg.innerHTML = ''; };
        $('#pl-name', back).addEventListener('input', resetAsk);
        $('#pl-folder', back).addEventListener('input', resetAsk);
        $('#pl-browse', back).addEventListener('click', async () => {
          const r = await HC.bridge.safe('pick_folder', $('#pl-folder', back).value);
          if (r && r.path) { $('#pl-folder', back).value = r.path; resetAsk(); }
        });
        $('#pl-rel', back).addEventListener('click', (e) => {
          const b = e.target.closest('[data-rel]');
          if (!b) return;
          st.relative = b.dataset.rel === '1';
          back.querySelectorAll('#pl-rel [data-rel]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
          $('#pl-rel-help', back).textContent = t(st.relative ? 'pl.relative_help' : 'pl.absolute_help');
        });
        $('#pl-sync', back).addEventListener('click', (e) => { st.sync = !st.sync; ui.setToggle(e.currentTarget, st.sync); });
      },
      async onOk(back) {
        const okBtn = back.querySelector('[data-act=ok]');
        const msg = $('#pl-msg', back);
        const opts = { name: $('#pl-name', back).value.trim(), folder: $('#pl-folder', back).value.trim(), relative: st.relative, sync: st.sync, overwrite: st.overwrite };
        ui.busy(okBtn, true);
        const r = await HC.bridge.safe('export_playlist', spec, opts);
        ui.busy(okBtn, false);
        if (r && r.exists) {
          /* Datei existiert: im Dialog fragen, der zweite Klick überschreibt. */
          st.overwrite = true;
          okBtn.textContent = t('pl.overwrite');
          okBtn.classList.remove('primary');
          okBtn.classList.add('danger');
          msg.innerHTML = ui.notice('warn', `${esc(t('pl.exists'))}<div class="pathbox">${esc(r.path)}</div>`);
          return false;
        }
        if (!r || !r.ok) { msg.innerHTML = ui.notice('warn', esc((r && r.error) || t('err.generic'))); return false; }
        result = r;
        return true;
      },
    });
    if (!yes || !result) return null;
    const notes = [];
    if (result.skipped) notes.push(t('pl.skipped', { n: util.fmtNum(result.skipped) }));
    if (result.absolute_fallback) notes.push(t('pl.fallback', { n: util.fmtNum(result.absolute_fallback) }));
    ui.toast(`${t('pl.done', { sets: t('tracks.n_sets', { n: util.fmtNum(result.count), count: result.count }), path: result.path })}${notes.length ? ` · ${notes.join(' · ')}` : ''}`, notes.length ? 'warn' : 'ok', notes.length ? 9000 : 6000);
    HC.bridge.emit('playlists_changed', result);
    return result;
  }

  HC.playlist = { export: exportDialog };

  /* Nach Downloads neu geschrieben (playlists.sync_after_download): leiser Hinweis. */
  HC.bridge.on('playlists_synced', (d) => {
    if (d && d.failed) ui.toast(t('pl.sync_failed', { n: util.fmtNum(d.failed) }), 'warn', 6000);
    else if (d && d.synced) ui.toast(t('pl.synced', { n: util.fmtNum(d.synced) }), 'info', 2600);
    HC.bridge.emit('playlists_changed', d);
  });
})();
