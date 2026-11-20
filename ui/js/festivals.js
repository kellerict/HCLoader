/* =====================================================================
   festivals.js – Festivals & Serien (v0.3.0): gemeinsame Bausteine (HC.fest)
   Badge am Bibliothekseintrag (Ausgabe + Bühne), Formular zum Zuordnen,
   Katalog-Cache (get_series / get_festival_options), Bühnenfarben, Icons.
   Vertrag: docs/bridge-api.md «Festivals & Serien». Alles offline.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { esc, norm } = HC.util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const ui = HC.ui;

  const KINDS = ['festival', 'radio', 'podcast'];
  const SET_TYPES = ['live_set', 'closing_ceremony', 'opening', 'endshow', 'full_show', 'warm_up', 'anthem', 'episode'];
  const KIND_ICON = { festival: I.flag, radio: I.radio, podcast: I.mic };
  /* Bühnen, die wie eine Farbe heissen (Defqon.1 RED/BLUE/BLACK …), bekommen einen Farbpunkt. */
  const STAGE_COLOR = {
    red: '#ff2a2a', blue: '#2f7dff', black: '#050506', uv: '#8a3dff', yellow: '#ffe600', indigo: '#5a4bff', magenta: '#ff3bd4',
    gold: '#e0b040', silver: '#b9bcc6', purple: '#a43bff', green: '#3bd16f', orange: '#ff7a00', white: '#f2f2f2', pink: '#ff7ab8',
  };

  const cache = { series: null, options: null };
  const fest = (HC.fest = {
    KINDS,
    SET_TYPES,
    kindIcon: (kind) => KIND_ICON[kind] || I.flag,
    kindLabel: (kind) => t(`fest.kind.${KINDS.includes(kind) ? kind : 'festival'}`),
    /** Übersetzter Name eines Set-Art-Codes (unbekannte Codes unverändert). */
    setType: (code) => (SET_TYPES.includes(code) ? t(`fest.set_type.${code}`) : String(code || '')),
    stageColor: (stage) => STAGE_COLOR[String(stage || '').trim().toLowerCase()] || null,
    stageDot(stage) {
      const c = fest.stageColor(stage);
      return c ? `<span class="sdot" style="background:${c}"></span>` : '';
    },
    /** «Defqon.1 2024» bzw. «Q-dance Radio 2024 #512». */
    label: (f) => (f ? `${f.edition || f.festival || f.series || ''}${f.episode ? ` #${f.episode}` : ''}` : ''),
    /** Ganzer Text fürs title-Attribut: Ausgabe · Bühne · Set-Art. */
    full: (f) => [fest.label(f), f.stage, f.set_type ? fest.setType(f.set_type) : ''].filter(Boolean).join(' · '),

    /** Katalog (sichtbare Serien) – einmal laden, nach Änderungen neu (Event «series_changed»). */
    series() {
      if (!cache.series) cache.series = HC.bridge.safe('get_series').then((l) => { if (!l) cache.series = null; return l || []; });
      return cache.series;
    },
    options() {
      if (!cache.options) cache.options = HC.bridge.safe('get_festival_options').then((o) => { if (!o) cache.options = null; return o || { kinds: KINDS, set_types: SET_TYPES.map((code) => ({ code })), stages: [] }; });
      return cache.options;
    },
    invalidate() { cache.series = cache.options = null; },

    /**
     * Badge eines Bibliothekseintrags. Zugeordnet: Ausgabe + Bühne (Klick = ändern). Vorschlag (unsicher erkannt):
     * gestrichelt mit «Übernehmen». Nichts: dezentes «+», erst beim Überfahren sichtbar (o.add).
     */
    badge(l, o) {
      const opt = o || {}, f = l.festival, s = l.festival_suggestion;
      const dis = opt.busy ? ' disabled' : '';
      if (f) {
        const stage = f.stage ? `<span class="fstage">${fest.stageDot(f.stage)}${esc(f.stage)}</span>` : '';
        return `<button type="button" class="ftag" data-act="fest" title="${esc(`${fest.full(f)} – ${t(f.manual ? 'fest.change_manual' : 'fest.change')}`)}" aria-haspopup="dialog"${dis}>${fest.kindIcon(f.kind)}<span class="fname">${esc(fest.label(f))}</span>${stage}${f.manual ? '<i class="gm"></i>' : ''}</button>`;
      }
      if (s) {
        return `<span class="ftag sugg" title="${esc(t('fest.suggested', { name: fest.full(s) }))}"><button type="button" data-act="fest" aria-haspopup="dialog"${dis}>${fest.kindIcon(s.kind)}<span class="fname">${esc(fest.label(s))}</span><span class="q">?</span></button><button type="button" class="acc" data-act="fest-accept" title="${esc(t('fest.accept'))}" aria-label="${esc(t('fest.accept'))}"${dis}>${I.check}</button></span>`;
      }
      return opt.add ? `<button type="button" class="ftag add" data-act="fest" title="${esc(t('fest.add'))}" aria-label="${esc(t('fest.add'))}" aria-haspopup="dialog"${dis}>${I.plus}${I.flag}</button>` : '';
    },

    /**
     * Formular am Badge: Serie (mit Suche), Jahr, Variante, Bühne, Set-Art (+ Folge bei Radio/Podcast).
     * o.save(data) -> Antwort von set_festival (data null = «kein Festival»); o.reset() -> Antwort von reset_festival;
     * o.done(antwort) nach Erfolg. Bei {ok:false} bleibt das Formular offen und zeigt die Meldung.
     */
    async popover(anchor, l, o) {
      const [list, opts] = await Promise.all([fest.series(), fest.options()]);
      if (!anchor.isConnected) return null;
      const cur = l.festival || null, sugg = !cur ? l.festival_suggestion || null : null, init = cur || sugg || {};
      const yearNow = new Date().getFullYear();
      const stages = [...new Set((opts.stages || []).concat(init.stage || []))];
      const types = (opts.set_types || []).map((x) => x.code || x);
      const fld = (key, label, html) => `<label class="pf" data-pf="${key}"><span class="lbl">${t(label)}</span>${html}</label>`;
      const el = ui.popover(anchor, `
        <div class="mhead">${t('fest.p_title')}</div>
        <div class="search-wrap">${I.search}<input class="input" data-f="q" placeholder="${esc(t('fest.p_search'))}" spellcheck="false" autocomplete="off"></div>
        <div class="fpop-list" role="listbox" data-list></div>
        <div class="fpop-grid">
          ${fld('year', 'fest.p_year', `<input class="input mono" data-f="year" type="number" min="1985" max="${yearNow + 1}" step="1" value="${esc(init.event_year || l.year || '')}">`)}
          ${fld('variant', 'fest.p_variant', '<select class="select" data-f="variant"></select>')}
          ${fld('stage', 'fest.p_stage', `<input class="input" data-f="stage" list="fpop-stages" value="${esc(init.stage || '')}" maxlength="40" spellcheck="false" autocomplete="off"><datalist id="fpop-stages">${stages.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>`)}
          ${fld('set_type', 'fest.p_type', `<select class="select" data-f="set_type"><option value="">–</option>${types.map((c) => `<option value="${esc(c)}"${init.set_type === c ? ' selected' : ''}>${esc(fest.setType(c))}</option>`).join('')}</select>`)}
          ${fld('episode', 'fest.set_type.episode', `<input class="input mono" data-f="episode" type="number" min="1" step="1" value="${esc(init.episode || '')}">`)}
        </div>
        <div class="field-error" data-err hidden></div>
        <div class="fpop-foot">
          <button type="button" class="linkbtn" data-f="auto"${cur || o.canReset ? '' : ' hidden'}>${t('fest.p_auto')}</button><span class="spacer"></span>
          <button type="button" class="btn sm ghost" data-f="cancel">${t('common.cancel')}</button>
          <button type="button" class="btn sm primary" data-f="ok">${I.check}${t('fest.p_apply')}</button>
        </div>`, { align: 'left', cls: 'fpop', label: t('fest.p_title') });
      if (!el) return null; // zweiter Klick auf denselben Anker: nur geschlossen (Umschalten)
      const q = (k) => el.querySelector(`[data-f="${k}"]`);
      const box = el.querySelector('[data-list]');
      let sel = init.series_id != null ? init.series_id : null; // null = kein Festival
      /* Die aktuelle Serie bleibt wählbar, auch wenn sie inzwischen ausgeblendet ist. */
      const all = list.slice();
      if (sel != null && !all.some((s) => s.id === sel)) all.unshift({ id: sel, name: init.series, kind: init.kind, aliases: [], variants: [], count: 0 });
      const paintList = () => {
        const needle = norm(q('q').value.trim());
        const hits = all.filter((s) => !needle || norm([s.name].concat(s.aliases || []).join(' ')).includes(needle));
        const item = (id, icon, name, n) => `<button type="button" role="option" data-sid="${id}" class="${String(sel == null ? '' : sel) === String(id) ? 'on' : ''}" aria-selected="${String(sel == null ? '' : sel) === String(id)}">${icon}<span>${esc(name)}</span>${n ? `<small>${n}</small>` : ''}</button>`;
        box.innerHTML = (needle ? '' : item('', I.ban, t('fest.p_none'), 0)) + hits.map((s) => item(s.id, fest.kindIcon(s.kind), s.name, s.count)).join('')
          || `<div class="none">${t('fest.p_no_match')}</div>`;
        const on = box.querySelector('.on');
        if (on) box.scrollTop = Math.max(0, on.offsetTop - box.clientHeight / 2 + on.offsetHeight / 2);
      };
      const paintForm = () => {
        const s = all.find((x) => x.id === sel);
        const variants = (s && s.variants) || [];
        const keep = sel === init.series_id ? init.variant || '' : '';
        const names = variants.map((v) => v.name);
        if (keep && !names.includes(keep)) names.push(keep);
        q('variant').innerHTML = `<option value="">–</option>${names.map((n) => `<option${n === keep ? ' selected' : ''}>${esc(n)}</option>`).join('')}`;
        el.querySelector('[data-pf=variant]').hidden = !names.length;
        el.querySelector('[data-pf=episode]').hidden = !s || s.kind === 'festival';
        el.querySelector('.fpop-grid').classList.toggle('off', !s);
        el.querySelectorAll('.fpop-grid input,.fpop-grid select').forEach((c) => { c.disabled = !s; });
      };
      const showError = (msg) => { const e = el.querySelector('[data-err]'); e.hidden = !msg; e.textContent = msg || ''; };
      const finish = (r) => {
        if (r && r.ok) { ui.closeMenu(); if (o.done) o.done(r); return; }
        if (!el.isConnected) return;
        ui.busy(q('ok'), false);
        const errs = (r && r.errors) || {};
        showError(Object.values(errs)[0] || (r && r.error) || t('err.generic'));
        const bad = { event_year: 'year', series_id: 'q' }[Object.keys(errs)[0]] || Object.keys(errs)[0];
        if (bad && q(bad)) { q(bad).classList.add('invalid'); q(bad).focus(); }
      };
      const apply = async () => {
        if (q('ok').disabled) return;
        showError('');
        el.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
        let data = null;
        if (sel != null) {
          data = { series_id: sel };
          const y = q('year').value.trim(), ep = q('episode').value.trim();
          if (y) data.event_year = +y;
          if (q('variant').value) data.variant = q('variant').value;
          if (q('stage').value.trim()) data.stage = q('stage').value.trim();
          if (q('set_type').value) data.set_type = q('set_type').value;
          if (ep && !el.querySelector('[data-pf=episode]').hidden) data.episode = +ep;
        }
        ui.busy(q('ok'), true);
        finish(await o.save(data));
      };
      box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-sid]');
        if (!b) return;
        sel = b.dataset.sid === '' ? null : all.find((s) => String(s.id) === b.dataset.sid).id;
        paintList();
        paintForm();
        showError('');
      });
      q('q').addEventListener('input', paintList);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
          e.preventDefault();
          /* In der Suche wählt Enter den einzigen bzw. ersten Treffer, sonst übernimmt es. */
          const first = e.target === q('q') && q('q').value.trim() ? box.querySelector('[data-sid]') : null;
          if (first && !first.classList.contains('on')) { first.click(); q('q').value = ''; paintList(); } else apply();
        }
      });
      q('ok').addEventListener('click', apply);
      q('cancel').addEventListener('click', () => ui.closeMenu());
      q('auto').addEventListener('click', async () => { showError(''); finish(await o.reset()); });
      paintList();
      paintForm();
      el._place();
      q('q').focus();
      return el;
    },
  });

  HC.bridge.on('series_changed', fest.invalidate);
})();
