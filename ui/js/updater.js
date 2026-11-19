/* =====================================================================
   updater.js – App-Update (Selbst-Update von HCLoader, docs/bridge-api.md «App-Update»)

   - Banner oben rechts: «Version x verfügbar – Herunterladen / Änderungen / Später»,
     während des Downloads Fortschrittsbalken (Acid-Grün) + «Abbrechen»,
     danach «Bereit – Jetzt neu starten / Beim Beenden».
   - Änderungen (Release-Notizen, Markdown): Dialog mit den Highlights je Version, «Alle Änderungen
     anzeigen» klappt die vollständigen Notizen auf (js/markdown.js, alles escaped; Styles in components.css).
   - Abschnitt «App-Update» im Wartung-Tab (HC.updater.section(host), aus views/settings.js).
   - Abschnitt «Versionshinweise» im Wartung-Tab (HC.updater.historySection(host)): alle Versionen aus der
     CHANGELOG.md der App (get_release_notes, offline), blättern ‹ Älter / Neuer ›, installierte markiert.
   Die Prüfung beim Start macht das Backend (Setting maintenance.check_app_updates_on_start);
   heruntergeladen wird erst nach einem Klick. Events: update (UpdateStatus), update_progress.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { util, ui } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;

  let st = null; // letzter UpdateStatus
  let hidden = ''; // «Später»: Banner für diesen Zustand+Version ausblenden
  let banner = null;
  const sections = new Set(); // offene Wartung-Abschnitte (Neuzeichnen bei Events)

  /* Eigene, kleine Styles (nur .upd-*; Farben aus theme.css). */
  const CSS = `
/* Schmale Leiste oben im Inhaltsbereich (erstes Kind von <main>): schiebt die Ansicht nach unten,
   verdeckt also nie Kopfzeilen-Knöpfe (QA 7a/8: «Suchen»/Sortierung in «Entdecken»). */
.upd-banner{position:relative;flex:none;z-index:5;margin:10px 20px 0;background:var(--panel-2);
  border:1px solid var(--line-2,var(--line));border-left:3px solid var(--acid);border-radius:var(--radius-sm,2px);
  padding:8px 36px 8px 14px;font-size:13px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 16px}
.upd-banner .upd-sub{margin-top:0}
.upd-banner .upd-actions{margin-top:0;margin-left:auto}
.upd-banner .upd-prog{margin-top:0;flex:1 1 220px;min-width:180px}
.upd-banner.err{border-left-color:var(--error)} .upd-banner.warn{border-left-color:var(--warn)}
.upd-banner .upd-title{font:var(--w-head) condensed 17px/1.1 var(--f-head);text-transform:var(--tt-head);letter-spacing:calc(1.2px * var(--ls));text-transform:uppercase;display:flex;align-items:center;gap:8px}
.upd-banner .upd-title svg{width:16px;height:16px;stroke:var(--acid);fill:none;stroke-width:2.2;flex:none}
.upd-banner.err .upd-title svg{stroke:var(--error)}
.upd-sub{color:var(--muted);font:12px/1.5 var(--f-mono);margin-top:4px;overflow-wrap:anywhere}
.upd-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.upd-prog{margin-top:9px}
.upd-prog .progress{height:6px}
.upd-prog .upd-num{display:flex;justify-content:space-between;color:var(--muted);font:11px var(--f-mono);margin-top:4px;letter-spacing:calc(.5px * var(--ls))}
.upd-x{position:absolute;top:50%;right:8px;transform:translateY(-50%);background:none;border:0;color:var(--muted);cursor:pointer;padding:2px;line-height:0}
.upd-x svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.2}
.upd-x:hover{color:var(--text)}
.upd-kv{display:flex;flex-wrap:wrap;gap:6px 18px;font:12px var(--f-mono);color:var(--muted);margin:8px 0 2px}
.upd-kv b{color:var(--text);font-weight:600}
.fc-main.upd-rn{flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:10px;min-width:0;width:100%}
.upd-rn>.upd-notes,.upd-rn>.upd-notes-foot{width:100%}
.upd-rn-nav{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.upd-rn-nav .select{width:auto;min-width:9em}
.upd-rn-pos{color:var(--muted);font:12px var(--f-mono)}
.upd-notes.upd-history{max-height:min(48vh,460px);margin-top:0}
@media (prefers-reduced-motion:reduce){.upd-banner{transition:none}}
`;
  function injectCss() {
    if (document.getElementById('upd-css')) return;
    const s = document.createElement('style');
    s.id = 'upd-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- Release-Notizen: Highlights je Version, auf Wunsch alles (HC.md, escaped) ---------- */
  /** Alt-Schnittstelle (Tests, Review): vollständige Notizen als sicheres HTML. */
  const notesHtml = (md) => HC.md.render(md);

  /** Versionen im Dialog, neueste zuerst: `releases` (übersprungene Versionen, falls das Backend
      sie liefert), sonst nur die neueste aus `notes`/`url`/`published`. */
  function releaseList(s) {
    const num = (v) => String(v || '').replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0);
    const cmp = (a, b) => { const x = num(a.version), y = num(b.version); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; };
    const list = (Array.isArray(s.releases) ? s.releases : [])
      .filter((r) => r && r.version)
      .map((r) => ({ version: String(r.version).replace(/^v/i, ''), published: r.published || null, notes: String(r.notes || ''), url: r.url || '' }))
      .sort(cmp)
      .slice(0, 12);
    if (list.length) return list;
    return [{ version: String(s.latest || s.current || '').replace(/^v/i, ''), published: s.published || null, notes: String(s.notes || ''), url: s.url || '' }];
  }
  const extLink = (url, html, cls) => {
    const href = HC.md.safeUrl(url);
    return href ? `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${html}</a>` : '';
  };
  /** Sicherheitsnetz (v0.10.1): sichtbare Punkte, die mehr als drei Zeilen bräuchten, als
      abgeschnitten markieren (CSS line-clamp); Klick oder Enter/Leertaste klappt einen auf. */
  function clampLong(root) {
    if (!root || !root.isConnected) return;
    root.querySelectorAll('.upd-sum li, .upd-sum > p, .upd-full li').forEach((li) => {
      if (li.classList.contains('md-open') || !li.offsetParent) return;
      const cut = li.scrollHeight > li.clientHeight + 2;
      li.classList.toggle('md-clamped', cut);
      if (cut) {
        li.dataset.more = t('upd.notes_more');
        li.dataset.ownEnter = '1'; // Enter expands the bullet, the dialog must not confirm
        li.tabIndex = 0;
        li.setAttribute('aria-expanded', 'false');
      }
    });
  }
  function wireClamp(root) {
    const open = (li) => {
      li.classList.add('md-open');
      li.setAttribute('aria-expanded', 'true');
    };
    root.addEventListener('click', (e) => {
      const li = e.target.closest('.md-clamped:not(.md-open)');
      if (li && !e.target.closest('a')) open(li);
    });
    root.addEventListener('keydown', (e) => {
      const li = e.target.closest && e.target.closest('.md-clamped:not(.md-open)');
      if (li && e.target === li && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation(); // Enter must not confirm the dialog («Download»)
        open(li);
      }
    });
  }
  const afterPaint = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

  function notesBody(s) {
    const rels = releaseList(s);
    let partial = false;
    const sections = rels.map((r, i) => {
      const blocks = HC.md.parse(r.notes);
      const sum = HC.md.summary(blocks, 8);
      if (sum && sum.partial) partial = true;
      const date = r.published ? util.fmtDate(r.published) : '';
      const ver = `v${esc(r.version)}`;
      const head = `<div class="upd-rel-head"><span class="upd-ver">${(rels.length > 1 && extLink(r.url, ver, 'upd-ver-link')) || ver}</span>${
        date ? `<span class="upd-date">${esc(date)}</span>` : ''}${
        i === 0 && s.current ? `<span class="upd-cur">${esc(t('upd.available_sub', { cur: s.current }))}</span>` : ''}</div>`;
      const empty = `<p class="upd-none">${esc(t('upd.notes_empty'))}</p>`;
      return `<section class="upd-rel">${head}<div class="md upd-sum">${sum ? sum.html : empty}</div><div class="md upd-full">${blocks.length ? HC.md.render(blocks) : empty}</div></section>`;
    }).join('');
    const toggle = partial ? `<button type="button" class="btn sm ghost upd-toggle" data-upd-toggle aria-expanded="false"><span class="upd-chev" aria-hidden="true"></span><span data-upd-toggle-label>${esc(t('upd.notes_all'))}</span></button>` : '';
    const link = extLink(s.url, `${esc(t('upd.notes_link'))}${I.external}`, 'upd-gh');
    return `${trustHtml(s)}<div class="upd-notes${rels.length > 1 ? ' multi' : ''}" tabindex="0">${sections}</div>${toggle || link ? `<div class="upd-notes-foot">${toggle}${link}</div>` : ''}`;
  }

  function showNotes() {
    if (!st) return;
    const v = st.latest || st.current;
    const canDownload = st.available && !st.blocked && (st.state === 'idle' || st.state === 'error');
    ui.modal({
      title: t('upd.notes_title', { v }),
      kind: 'upd-modal',
      body: notesBody(st),
      okLabel: canDownload ? t('upd.download') : t('upd.close'),
      cancelLabel: t('upd.close'),
      onOpen(el) {
        const box = el.querySelector('.upd-notes');
        const btn = el.querySelector('[data-upd-toggle]');
        if (box) {
          wireClamp(box);
          afterPaint(() => clampLong(box));
        }
        if (!btn) return;
        btn.addEventListener('click', () => {
          const all = !box.classList.contains('all');
          box.classList.toggle('all', all);
          btn.setAttribute('aria-expanded', String(all));
          btn.querySelector('[data-upd-toggle-label]').textContent = t(all ? 'upd.notes_less' : 'upd.notes_all');
          box.scrollTop = 0;
          afterPaint(() => clampLong(box));
        });
      },
    }).then((ok) => { if (ok && canDownload) download(); });
  }

  /* ---------- Aktionen ---------- */
  const fail = (r) => { if (r && r.ok === false && r.error) ui.toast(r.error, 'err'); };
  async function download() {
    hidden = '';
    const r = await HC.bridge.safe('download_update');
    if (r && r.state) set(r);
    fail(r);
  }
  async function cancel() {
    const r = await HC.bridge.safe('cancel_update');
    if (r && r.state) set(r);
  }
  async function check(btn) {
    if (btn) ui.busy(btn, true, t('upd.checking'));
    const r = await HC.bridge.safe('check_update');
    if (btn) ui.busy(btn, false);
    if (!r) return;
    if (r.state) set(r);
    if (r.ok === false) { fail(r); return; }
    if (!r.available) ui.toast(t('upd.up_to_date', { v: r.current }), 'ok');
    else hidden = '';
    paint();
  }
  async function restartNow() {
    const yes = await ui.confirm(t('upd.confirm_title'), t('upd.confirm_text'), { okLabel: t('upd.confirm_ok'), kind: 'warn' });
    if (!yes) return;
    const r = await HC.bridge.safe('apply_update_now');
    fail(r);
  }
  function later() {
    hidden = key();
    if (st && st.state === 'ready') ui.toast(t(st.apply_on_exit ? 'upd.on_exit_toast' : 'upd.later_toast'), 'info', 4200);
    paint();
  }
  const key = () => (st ? `${st.state}:${st.latest}:${st.available}` : '');

  /* ---------- Hinweise: fremde Quelle (m7), ohne Prüfsumme (m6) ---------- */
  function trustHtml(s) {
    const notes = [];
    if (s && s.foreign_repo && s.repo) notes.push(t('upd.from_repo', { repo: s.repo }));
    if (s && s.verified === false) notes.push(t('upd.unverified'));
    return notes.length ? `<div class="upd-sub upd-trust">${I.warn}${esc(notes.join(' · '))}</div>` : '';
  }

  /* ---------- Banner ---------- */
  function bannerHtml() {
    if (!st) return '';
    const v = st.latest || '';
    const btn = (act, label, cls, icon) => `<button type="button" class="btn sm ${cls || ''}" data-upd="${act}">${icon || ''}${esc(label)}</button>`;
    const x = `<button type="button" class="upd-x" data-upd="later" title="${esc(t('upd.later'))}">${I.x}</button>`;
    if (st.state === 'downloading') {
      const p = st.progress || {};
      const pct = p.pct == null ? null : Math.max(0, Math.min(100, p.pct));
      const mb = (n) => util.fmtSize(Number(n || 0) / 1048576);
      const phase = t(`upd.phase_${p.phase || 'download'}`);
      return `<div class="upd-title">${I.download}${esc(t('upd.downloading', { v }))}</div>
        <div class="upd-prog"><div class="progress"><div class="bar" style="--p:${pct == null ? 100 : pct}${pct == null ? ';opacity:.45' : ''}"></div></div>
          <div class="upd-num"><span>${esc(phase)}</span><span>${pct == null ? esc(mb(p.bytes)) : `${util.fmtPct(pct)} · ${esc(mb(p.bytes))}${p.total ? ` / ${esc(mb(p.total))}` : ''}`}</span></div></div>
        <div class="upd-actions">${btn('cancel', t('upd.cancel'), 'ghost')}</div>`;
    }
    if (st.state === 'ready') {
      return `${x}<div class="upd-title">${I.check}${esc(t('upd.ready', { v }))}</div><div class="upd-sub">${esc(t('upd.ready_sub'))}</div>${trustHtml(st)}
        <div class="upd-actions">${btn('restart', t('upd.restart_now'), 'primary', I.refresh)}${btn('later', t(st.apply_on_exit ? 'upd.on_exit' : 'upd.later'), 'ghost')}${btn('notes', t('upd.notes'), 'ghost')}</div>`;
    }
    if (st.state === 'applying') {
      return `<div class="upd-title">${I.refresh}${esc(t('upd.applying'))}</div><div class="upd-sub">${esc(t('upd.applying_sub'))}</div>`;
    }
    if (st.state === 'error') {
      return `${x}<div class="upd-title">${I.warn}${esc(t('upd.error'))}</div><div class="upd-sub">${esc(st.error || '')}</div>
        <div class="upd-actions">${st.available && !st.blocked ? btn('download', t('upd.retry'), 'primary', I.retry) : ''}${btn('later', t('upd.close'), 'ghost')}</div>`;
    }
    if (st.available && (st.state === 'idle' || st.state === 'checking')) {
      if (st.blocked) {
        return `${x}<div class="upd-title">${I.info}${esc(t('upd.available', { v }))}</div><div class="upd-sub">${esc(st.blocked)}</div>
          <div class="upd-actions">${btn('notes', t('upd.notes'), 'ghost')}${btn('later', t('upd.later'), 'ghost')}</div>`;
      }
      return `${x}<div class="upd-title">${I.download}${esc(t('upd.available', { v }))}</div><div class="upd-sub">${esc(t('upd.available_sub', { cur: st.current }))}</div>${trustHtml(st)}
        <div class="upd-actions">${btn('download', t('upd.download'), 'primary', I.download)}${btn('notes', t('upd.notes'), 'ghost')}${btn('later', t('upd.later'), 'ghost')}</div>`;
    }
    return '';
  }
  function paintBanner() {
    const html = hidden && hidden === key() ? '' : bannerHtml();
    if (!html) { if (banner) { banner.remove(); banner = null; } return; }
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'upd-banner';
      banner.setAttribute('role', 'status');
      banner.addEventListener('click', onAction);
      const host = document.querySelector('main');
      if (host) host.prepend(banner);
      else document.body.appendChild(banner);
    }
    banner.classList.toggle('err', st.state === 'error');
    banner.classList.toggle('warn', !!st.blocked && st.state !== 'error');
    banner.innerHTML = html;
  }
  function onAction(e) {
    const b = e.target.closest('[data-upd]');
    if (!b) return;
    const act = b.dataset.upd;
    if (act === 'download') download();
    else if (act === 'cancel') cancel();
    else if (act === 'notes') showNotes();
    else if (act === 'restart') restartNow();
    else if (act === 'later') later();
    else if (act === 'check') check(b);
  }

  /* ---------- Abschnitt im Wartung-Tab ---------- */
  function sectionHtml() {
    const s = st || {};
    const state = !st ? 'unknown' : s.state === 'idle' ? (s.available ? 'available' : s.checked ? 'idle' : 'unknown') : s.state;
    const led = state === 'error' ? 'err' : state === 'available' || state === 'ready' ? 'warn' : state === 'unknown' ? 'off' : '';
    const kind = s.portable ? t('upd.portable') : s.installed ? t('upd.installed') : s.git_checkout ? t('upd.git') : '';
    const btn = (act, label, cls, icon, dis) => `<button type="button" class="btn ${cls || ''}" data-upd="${act}"${dis ? ' disabled' : ''}>${icon || ''}${esc(label)}</button>`;
    const busy = s.state === 'checking' || s.state === 'downloading' || s.state === 'applying';
    let actions = btn('check', t(s.state === 'checking' ? 'upd.checking' : 'upd.check_now'), '', I.refresh, busy);
    if (s.available && !s.blocked && (s.state === 'idle' || s.state === 'error')) actions += btn('download', t('upd.download'), 'primary', I.download);
    if (s.state === 'downloading') actions += btn('cancel', t('upd.cancel'), 'ghost');
    if (s.state === 'ready') actions += btn('restart', t('upd.restart_now'), 'primary', I.refresh) + btn('discard', t('upd.cancel'), 'ghost');
    if (s.latest && s.notes) actions += btn('notes', t('upd.notes'), 'ghost');
    const p = s.progress;
    const prog = s.state === 'downloading' && p ? `<div class="upd-prog" style="max-width:420px"><div class="progress"><div class="bar" style="--p:${p.pct == null ? 100 : p.pct}"></div></div>
      <div class="upd-num"><span>${esc(t(`upd.phase_${p.phase || 'download'}`))}</span><span>${p.pct == null ? '' : util.fmtPct(Number(p.pct))}</span></div></div>` : '';
    const note = s.blocked ? ui.notice('warn', esc(s.blocked)) : s.state === 'error' && s.error ? ui.notice('error', esc(s.error)) : '';
    return `<div class="field plain"><div class="fl"><b>${esc(t('upd.section_label'))}</b><span class="help">${esc(t('upd.section_help'))}</span></div>
      <div class="fc"><div class="fc-main" style="flex-direction:column;align-items:flex-start;gap:8px">
        <div class="upd-kv"><span>${esc(t('upd.current'))}: <b>v${esc(s.current || '–')}</b>${kind ? ` · ${esc(kind)}` : ''}</span>
          <span>${esc(t('upd.latest'))}: <b>${s.latest ? `v${esc(s.latest)}` : '–'}</b></span>
          <span>${esc(t('upd.checked'))}: <b>${s.checked ? esc(util.fmtRel(s.checked)) : '–'}</b></span>
          <span><span class="led ${led}"></span> <b>${esc(t(`upd.st_${state}`))}</b></span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${actions}</div>${prog}${note}
      </div></div></div>`;
  }
  function section(host) {
    injectCss();
    const paintSection = () => { if (host.isConnected) host.innerHTML = sectionHtml(); else sections.delete(host); };
    host._paint = paintSection;
    sections.add(host);
    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-upd]');
      if (!b) return;
      if (b.dataset.upd === 'discard') cancel();
      else onAction(e);
    });
    paintSection();
    if (!st) refresh();
  }

  /* ---------- Versionshinweise im Wartung-Tab (CHANGELOG.md der App, offline) ---------- */
  /** Eine Version wie im Notizen-Dialog: Highlights, «Alle Änderungen» klappt alles auf. */
  function historyRelHtml(r, current) {
    const blocks = HC.md.parse(r.notes);
    const sum = HC.md.summary(blocks, 8);
    const empty = `<p class="upd-none">${esc(t('upd.notes_empty'))}</p>`;
    const date = r.date ? `<span class="upd-date">${esc(util.fmtDate(r.date))}</span>` : '';
    const mine = current && r.version === current ? `<span class="upd-cur">${esc(t('upd.rn_installed'))}</span>` : '';
    const head = `<div class="upd-rel-head"><span class="upd-ver">v${esc(r.version)}</span>${date}${mine}</div>`;
    const toggle = sum && sum.partial ? `<button type="button" class="btn sm ghost upd-toggle" data-rn-toggle aria-expanded="false"><span class="upd-chev" aria-hidden="true"></span><span data-rn-toggle-label>${esc(t('upd.notes_all'))}</span></button>` : '';
    return `<div class="upd-notes upd-history" tabindex="0" data-rn-box><section class="upd-rel">${head}<div class="md upd-sum">${sum ? sum.html : empty}</div><div class="md upd-full">${blocks.length ? HC.md.render(blocks) : empty}</div></section></div>${toggle ? `<div class="upd-notes-foot">${toggle}</div>` : ''}`;
  }
  /** Abschnitt «Versionshinweise»: blättern mit ‹ Älter / Neuer ›, Auswahlliste, «x von n». */
  function historySection(host) {
    injectCss();
    const view = { list: null, current: '', i: 0 };
    const paintHistory = () => {
      if (!host.isConnected) return;
      const list = view.list;
      let body;
      if (list == null) body = `<span class="spinner"></span>`;
      else if (!list.length) body = `<p class="upd-none">${esc(t('upd.rn_empty'))}</p>`;
      else {
        const n = list.length, i = view.i, r = list[i];
        const opts = list.map((x, k) => `<option value="${k}"${k === i ? ' selected' : ''}>v${esc(x.version)}${x.version === view.current ? ` · ${esc(t('upd.rn_installed'))}` : ''}</option>`).join('');
        body = `<div class="upd-rn-nav">
            <button type="button" class="btn sm ghost" data-rn="older"${i >= n - 1 ? ' disabled' : ''}>‹ ${esc(t('upd.rn_older'))}</button>
            <select class="select" data-rn-pick aria-label="${esc(t('upd.rn_version'))}">${opts}</select>
            <span class="upd-rn-pos">${esc(t('upd.rn_pos', { i: i + 1, n }))}</span>
            <button type="button" class="btn sm ghost" data-rn="newer"${i <= 0 ? ' disabled' : ''}>${esc(t('upd.rn_newer'))} ›</button>
          </div>${historyRelHtml(r, view.current)}`;
      }
      host.innerHTML = `<div class="field plain"><div class="fl"><b>${esc(t('upd.rn_label'))}</b><span class="help">${esc(t('upd.rn_help'))}</span></div>
        <div class="fc"><div class="fc-main upd-rn">${body}</div></div></div>`;
      afterPaint(() => clampLong(host.querySelector('[data-rn-box]')));
    };
    wireClamp(host);
    const go = (i) => {
      if (!view.list || i < 0 || i >= view.list.length || i === view.i) return;
      view.i = i;
      paintHistory();
    };
    host.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-rn]');
      if (nav) { go(view.i + (nav.dataset.rn === 'older' ? 1 : -1)); return; }
      const btn = e.target.closest('[data-rn-toggle]');
      if (!btn) return;
      const box = host.querySelector('[data-rn-box]');
      const all = !box.classList.contains('all');
      box.classList.toggle('all', all);
      btn.setAttribute('aria-expanded', String(all));
      btn.querySelector('[data-rn-toggle-label]').textContent = t(all ? 'upd.notes_less' : 'upd.notes_all');
      box.scrollTop = 0;
      afterPaint(() => clampLong(box));
    });
    host.addEventListener('change', (e) => {
      if (e.target.matches('[data-rn-pick]')) go(parseInt(e.target.value, 10) || 0);
    });
    paintHistory();
    HC.bridge.safe('get_release_notes').then((r) => {
      const list = (r && Array.isArray(r.releases) ? r.releases : []).filter((x) => x && x.version)
        .map((x) => ({ version: String(x.version).replace(/^v/i, ''), date: x.date || null, notes: String(x.notes || '') }));
      view.list = list;
      view.current = String((r && r.current) || '').replace(/^v/i, '');
      const mine = list.findIndex((x) => x.version === view.current);
      view.i = mine >= 0 ? mine : 0; // installierte Version zuerst, sonst die neueste
      paintHistory();
    });
  }

  /* ---------- Zustand ---------- */
  function paint() {
    paintBanner();
    sections.forEach((h) => h._paint && h._paint());
  }
  function set(next) {
    if (!next || !next.state) return;
    st = Object.assign({}, st || {}, next);
    paint();
  }
  async function refresh() {
    const r = await HC.bridge.safe('get_update_status');
    if (r) set(r);
  }

  function init() {
    injectCss();
    HC.bridge.on('update', (data) => set(data));
    HC.bridge.on('update_progress', (p) => {
      if (!st) return;
      st = Object.assign({}, st, { progress: p });
      paint();
    });
    HC.bridge.on('settings_changed', (values) => {
      if (st && values && values.maintenance) { st.apply_on_exit = !!values.maintenance.apply_update_on_exit; paint(); }
    });
    HC.bridge.ready().then((mode) => {
      if (mode === 'error') return;
      const wait = () => (document.body.classList.contains('ready') ? refresh() : setTimeout(wait, 200));
      wait();
    });
  }

  HC.updater = { init, section, historySection, refresh, notesHtml, status: () => st };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
