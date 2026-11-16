/* =====================================================================
   components.js – wiederverwendbare Bausteine (HC.ui) und Video-Aktionen
   Toast, Dialog, Menü, Chip-Editor, Schalter, Mix-Karte.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { esc } = HC.util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const ui = (HC.ui = {});

  /* ---------- Toast ---------- */
  const TOAST_ICON = { ok: I.check, err: I.warn, warn: I.warn, info: I.info };
  ui.toast = function (msg, kind, ms) {
    const host = HC.$('#toasts');
    if (!host) return;
    const k = kind || 'ok';
    const dur = ms || (k === 'err' ? 5200 : 3000);
    const el = document.createElement('div');
    el.className = `toast ${k}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `${TOAST_ICON[k] || I.check}<span>${esc(msg)}</span><i class="timer" style="animation-duration:${dur}ms"></i>`;
    host.appendChild(el);
    while (host.children.length > 4) host.firstChild.remove();
    const close = () => {
      if (!el.isConnected) return;
      el.classList.add('out');
      setTimeout(() => el.remove(), HC.fx.reduced() ? 0 : 190);
    };
    el.addEventListener('click', close);
    setTimeout(close, dur);
  };

  /* ---------- Dialog ---------- */
  /**
   * ui.modal({title, body (HTML), kind, okLabel, cancelLabel, danger, onOpen(el), onOk(el) -> false = offen lassen})
   * -> Promise<boolean>
   */
  ui.modal = function (o) {
    return new Promise((resolve) => {
      const back = document.createElement('div');
      back.className = 'modal-back';
      back.innerHTML = `<div class="modal ${o.kind || ''}" role="dialog" aria-modal="true">
        <h3>${esc(o.title)}</h3>
        <div class="modal-body">${o.body || ''}</div>
        <div class="modal-foot">
          <button class="btn ghost" data-act="cancel">${esc(o.cancelLabel || t('common.cancel'))}</button>
          <button class="btn ${o.danger ? 'danger' : 'primary'}" data-act="ok">${esc(o.okLabel || t('common.ok'))}</button>
        </div></div>`;
      const prev = document.activeElement;
      const done = (val) => {
        document.removeEventListener('keydown', onKey, true);
        back.remove();
        if (prev && prev.focus) prev.focus();
        resolve(val);
      };
      const ok = async () => {
        if (o.onOk && (await o.onOk(back)) === false) return;
        done(true);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); done(false); }
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !e.target.closest('.tags')) { e.preventDefault(); ok(); }
      };
      back.addEventListener('mousedown', (e) => { if (e.target === back) done(false); });
      back.querySelector('[data-act=cancel]').onclick = () => done(false);
      back.querySelector('[data-act=ok]').onclick = ok;
      document.addEventListener('keydown', onKey, true);
      HC.$('#overlays').appendChild(back);
      if (o.onOpen) o.onOpen(back);
      const first = back.querySelector('.modal-body input,.modal-body select') || back.querySelector(o.danger ? '[data-act=cancel]' : '[data-act=ok]');
      first.focus();
    });
  };
  ui.confirm = (title, text, opts) =>
    ui.modal(Object.assign({ title, body: `<p>${esc(text)}</p>${opts && opts.warning ? ui.notice('warn', opts.warning) : ''}` }, opts));

  ui.notice = (kind, html) => `<div class="notice ${kind}">${kind === 'ok' ? I.check : kind === 'info' ? I.info : I.warn}<div>${html}</div></div>`;

  /* ---------- Kontextmenü ---------- */
  /** items: [{label, icon, onClick, danger, current}] | {head} | 'sep' */
  ui.menu = function (anchor, items) {
    ui.closeMenu();
    const el = document.createElement('div');
    el.className = 'menu';
    el.innerHTML = items.map((it, i) => {
      if (it === 'sep') return '<hr>';
      if (it.head) return `<div class="mhead">${esc(it.head)}</div>`;
      return `<button data-i="${i}" class="${it.danger ? 'danger' : ''}">${it.icon || ''}${it.dot ? `<span class="dot" style="background:${esc(it.dot)}"></span>` : ''}<span>${esc(it.label)}</span>${it.current ? `<span class="cur">${t('common.current')}</span>` : ''}</button>`;
    }).join('');
    HC.$('#overlays').appendChild(el);
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
    const top = r.bottom + 4 + h > window.innerHeight - 40 ? Math.max(8, r.top - h - 4) : r.bottom + 4;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const it = items[+b.dataset.i];
      ui.closeMenu();
      if (it && it.onClick) it.onClick();
    });
    setTimeout(() => {
      const off = (e) => {
        if (e.type === 'keydown' && e.key !== 'Escape') return;
        if (e.type === 'mousedown' && el.contains(e.target)) return;
        ui.closeMenu();
      };
      ui._menuOff = () => { document.removeEventListener('mousedown', off, true); document.removeEventListener('keydown', off, true); window.removeEventListener('blur', off); };
      document.addEventListener('mousedown', off, true);
      document.addEventListener('keydown', off, true);
      window.addEventListener('blur', off);
    }, 0);
    ui._menu = el;
  };
  ui.closeMenu = function () {
    if (ui._menu) ui._menu.remove();
    if (ui._menuOff) ui._menuOff();
    ui._menu = ui._menuOff = null;
  };

  /* ---------- Schalter ---------- */
  ui.toggle = (on, attrs) => `<button type="button" class="toggle${on ? ' on' : ''}" role="switch" aria-checked="${on ? 'true' : 'false'}" ${attrs || ''}></button>`;
  ui.setToggle = (el, on) => { el.classList.toggle('on', !!on); el.setAttribute('aria-checked', on ? 'true' : 'false'); };

  /* ---------- Button «beschäftigt» ---------- */
  ui.busy = function (btn, on, label) {
    if (!btn) return;
    if (on) {
      btn._html = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add('busy');
      btn.innerHTML = `<span class="spinner"></span>${esc(label || btn.textContent.trim())}`;
    } else if (btn._html != null) {
      btn.innerHTML = btn._html;
      btn._html = null;
      btn.disabled = false;
      btn.classList.remove('busy');
    }
  };

  /* ---------- Chip-Editor für Listen (Keywords, Regex-Muster) ---------- */
  /**
   * ui.chips(el, {list, kind: 'inc'|'exc'|'', placeholder, lower, commaSplits, onChange(list)})
   * Enter (oder Komma) fügt hinzu, Backspace im leeren Feld entfernt das letzte.
   */
  ui.chips = function (el, o) {
    const opt = Object.assign({ list: [], kind: '', lower: true, commaSplits: true, placeholder: t('common.add_chip') }, o);
    let list = opt.list.slice();
    el.classList.add('tags');
    if (opt.kind) el.classList.add(opt.kind);
    const render = (fresh) => {
      el.innerHTML = list.map((k, i) => `<span class="tag${fresh === i ? ' new' : ''}" title="${esc(k)}"><span>${esc(k)}</span><button type="button" data-i="${i}" aria-label="${esc(t('common.remove'))}">×</button></span>`).join('')
        + `<input type="text" placeholder="${esc(opt.placeholder)}" spellcheck="false" autocomplete="off">`;
    };
    const changed = (fresh, focus) => {
      render(fresh);
      if (focus) el.querySelector('input').focus();
      if (opt.onChange) opt.onChange(list.slice());
    };
    const add = (raw, focus) => {
      let v = String(raw || '').trim();
      if (opt.lower) v = v.toLowerCase();
      if (!v) return false;
      if (list.includes(v)) {
        const dup = el.querySelectorAll('.tag')[list.indexOf(v)];
        HC.fx.pop(dup, 'new');
        el.querySelector('input').value = '';
        return false;
      }
      list.push(v);
      changed(list.length - 1, focus);
      return true;
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]');
      if (b) { list.splice(+b.dataset.i, 1); changed(-1, true); return; }
      el.querySelector('input').focus();
    });
    el.addEventListener('keydown', (e) => {
      const inp = e.target;
      if (inp.tagName !== 'INPUT') return;
      if (e.key === 'Enter' || (opt.commaSplits && e.key === ',')) { e.preventDefault(); add(inp.value, true); }
      else if (e.key === 'Backspace' && !inp.value && list.length) { list.pop(); changed(-1, true); }
    });
    el.addEventListener('focusout', (e) => { if (e.target.tagName === 'INPUT' && e.target.value.trim()) add(e.target.value, false); });
    render(-1);
    return {
      get: () => list.slice(),
      set(next) { list = next.slice(); render(-1); },
    };
  };

  /* ---------- Thumbnail (generiert, falls keine URL) ---------- */
  ui.thumb = function (v, cls) {
    const g = HC.genres.color(v.genre);
    const h = HC.util.hash(v.id);
    const bars = Array.from({ length: 34 }, (_, i) => `<i style="height:${Math.round((Math.abs(Math.sin(i * 0.7 + h)) * 0.8 + 0.15) * 100)}%;--n:${(i * 7 + h) % 11}"></i>`).join('');
    const art = `<div class="art" style="background:linear-gradient(${h % 360}deg,#000 15%,${g}55 60%,#000),radial-gradient(circle at ${h % 100}% 30%,${g}aa,transparent 45%)"></div><div class="wave">${bars}</div>`;
    const img = v.thumbnail ? `<img src="${esc(v.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
    return `<div class="thumb ${cls || ''}">${art}${img}`;
  };
  ui.gtag = (genre) => `<span class="gtag" style="background:${HC.genres.color(genre)};color:${HC.genres.ink(genre)}">${esc(genre)}</span>`;
  ui.genreDot = (genre) => `<span class="okline"><span class="dot" style="background:${HC.genres.color(genre)}"></span>${esc(genre)}</span>`;

  /* ---------- Mix-Karte ---------- */
  const CAN_LOAD = ['new', 'inbox', 'failed'];
  ui.card = function (v, o) {
    const opt = o || {};
    const can = CAN_LOAD.includes(v.status);
    return `<div class="card is-${v.status}${opt.selected ? ' sel' : ''}" data-id="${esc(v.id)}">
      ${ui.thumb(v)}
        ${ui.gtag(v.genre)}
        ${can ? `<span class="selbox" data-act="sel" title="${esc(t('card.select'))}"></span>` : ''}
        <span class="dur">${HC.util.fmtDur(v.duration)}</span></div>
      <div class="cbody">
        <div class="ctitle" title="${esc(v.title)}">${esc(v.title)}</div>
        <div class="cmeta"><span class="ch" title="${esc(v.channel_name)}">${esc(v.channel_name)}</span><span>·</span><span>${HC.util.fmtAgo(v.upload_date)}</span><span>·</span><span>${HC.util.fmtViews(v.view_count)}</span></div>
        <div class="cfoot">
          <span class="status st-${v.status}">${esc(t('status.' + v.status))}</span><span class="spacer"></span>
          <button class="iconbtn" data-act="yt" title="${esc(t('card.open'))}">${I.external}</button>
          <button class="iconbtn" data-act="ign" title="${esc(t(v.status === 'ignored' ? 'card.unignore' : 'card.ignore'))}" ${can || v.status === 'ignored' ? '' : 'disabled'}>${v.status === 'ignored' ? I.retry : I.ban}</button>
          <button class="iconbtn" data-act="more" title="${esc(t('card.more'))}">${I.more}</button>
          <button class="iconbtn dl" data-act="dl" title="${esc(t('card.download'))}" ${can ? '' : 'disabled'}>${I.download}</button>
        </div>
      </div></div>`;
  };
  ui.skeletonCards = (n) => Array.from({ length: n }, () => `<div class="card skeleton"><div class="thumb"><div class="skel"></div></div>
      <div class="cbody"><div class="skel skel-line" style="width:92%;margin-top:2px"></div><div class="skel skel-line" style="width:64%"></div>
      <div class="skel skel-line" style="width:45%;margin-top:14px"></div><div class="skel skel-line" style="width:100%;height:26px;margin-top:12px;opacity:.5"></div></div></div>`).join('');

  /** Klicks einer Karten-Liste verarbeiten (einmal pro Container binden). */
  ui.bindCards = function (root, o) {
    root.addEventListener('click', (e) => {
      const c = e.target.closest('.card[data-id]');
      const a = e.target.closest('[data-act]');
      if (!c || !a || a.disabled) return;
      const v = HC.store.get(c.dataset.id);
      if (!v) return;
      const act = a.dataset.act;
      if (act === 'sel' && o && o.onSelect) o.onSelect(v, c);
      else if (act === 'dl') HC.actions.download([v.id]);
      else if (act === 'ign') HC.actions.ignore(v, v.status !== 'ignored');
      else if (act === 'yt') HC.actions.open(v);
      else if (act === 'more') HC.actions.menu(v, a);
    });
  };

  /* ---------- Video-Aktionen (über die Bridge) ---------- */
  HC.actions = {
    async download(ids) {
      if (!ids.length) return;
      const r = await HC.bridge.safe('enqueue', ids);
      if (r && r.ok) ui.toast(t(r.ids.length === 1 ? 'toast.enqueued_one' : 'toast.enqueued', { n: r.ids.length }));
    },
    async ignore(v, on) {
      const r = await HC.bridge.safe('set_video_status', v.id, on ? 'ignored' : 'new');
      if (r && r.ok) ui.toast(t(on ? 'toast.ignored' : 'toast.unignored', { title: v.title }), 'info');
    },
    async open(v) {
      const r = await HC.bridge.safe('open_video', v.id);
      if (r && r.ok) ui.toast(t('toast.opening'), 'info', 1800);
    },
    async watch(v) {
      const r = await HC.bridge.safe('add_channel_source', v.channel_id, v.channel_name);
      if (r && r.ok) { ui.toast(t('toast.watch_added', { ch: v.channel_name })); HC.bridge.emit('sources_changed', {}); }
    },
    async block(v) {
      const yes = await ui.confirm(t('dlg.block.title'), t('dlg.block.text', { ch: v.channel_name }), { okLabel: t('dlg.block.ok'), danger: true });
      if (!yes) return;
      const r = await HC.bridge.safe('block_channel', v.channel_id, v.channel_name);
      if (r && r.ok) { ui.toast(t('toast.blocked', { ch: v.channel_name }), 'warn'); HC.bridge.emit('blacklist_changed', {}); }
    },
    async genre(v, name) {
      const r = await HC.bridge.safe('set_genre', v.id, name);
      if (r && r.ok) ui.toast(t('toast.genre_set', { genre: name }), 'info', 1800);
    },
    menu(v, anchor) {
      ui.menu(anchor, [
        { label: t('card.watch'), icon: I.eye, onClick: () => HC.actions.watch(v) },
        { label: t('card.block'), icon: I.ban, danger: true, onClick: () => HC.actions.block(v) },
        'sep',
        { head: t('card.set_genre') },
        ...HC.genres.list().map((g) => ({ label: g.name, dot: g.color, current: g.name === v.genre, onClick: () => HC.actions.genre(v, g.name) })),
      ]);
    },
  };
})();
