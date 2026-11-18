/* =====================================================================
   views/stats.js – Statistik (v0.9.0)
   Bibliothek in Zahlen, offline aus der Datenbank (bridge: get_stats).
   Diagramme ohne Bibliotheken: Balken in HTML/CSS, Kreis (Quellen) als
   SVG; jede Grafik hat eine Textalternative (aria-label bzw. Tabelle für
   Screenreader). Bewegung nur ohne «Effekte reduzieren».
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, util } = HC;
  const { esc } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const STORE_KEY = 'hc.stats';
  const PRESETS = ['all', '12m', '30d', 'year', 'custom'];
  const MAX_BARS = 36; // mehr Monate -> pro Jahr zusammengefasst

  let el;
  let data = null;
  let loading = false;
  let seq = 0;
  let measuring = null; // {done, total} während Dateigrössen gemessen werden
  let range = { preset: 'all', from: '', to: '' };

  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (PRESETS.includes(p.preset)) range = { preset: p.preset, from: p.from || '', to: p.to || '' };
    } catch (e) { /* Standard */ }
  }
  function savePrefs() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(range)); } catch (e) { /* egal */ }
  }

  /* ---------- Zeitraum ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  /** Preset -> {from, to} (lokale Tage, inklusiv; '' = offen) */
  function bounds() {
    const now = new Date();
    if (range.preset === '30d') return { from: ymd(new Date(now.getTime() - 29 * 864e5)), to: '' };
    if (range.preset === '12m') { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); d.setDate(d.getDate() + 1); return { from: ymd(d), to: '' }; }
    if (range.preset === 'year') return { from: `${now.getFullYear()}-01-01`, to: '' };
    if (range.preset === 'custom') return { from: range.from || '', to: range.to || '' };
    return { from: '', to: '' };
  }

  /* ---------- Formate ---------- */
  const num = (n) => util.fmtNum(n || 0);
  const hours = (sec) => HC.i18n.nf({ style: 'unit', unit: 'hour', unitDisplay: 'short', maximumFractionDigits: sec && sec < 36000 ? 1 : 0 }).format((sec || 0) / 3600);
  const size = (bytes) => (bytes ? util.fmtSize(bytes / 1048576) : '–');
  /** «Mar» / «Jan 26» (Januar und erster Balken mit Jahr) / lang «March 2026» */
  const monthLabel = (key, long, withYear) => {
    const [y, m] = key.split('-').map(Number);
    const o = long ? { month: 'long', year: 'numeric' } : withYear || m === 1 ? { month: 'short', year: '2-digit' } : { month: 'short' };
    return HC.i18n.df(o).format(new Date(y, m - 1, 1));
  };
  const sets = (n) => t('stats.n_sets', { n: num(n), count: n || 0 });
  const pct = (part, whole) => (whole ? Math.max(0, Math.min(100, (100 * part) / whole)) : 0);

  /* ---------- Bausteine ---------- */
  const card = (id, title, body, extra) => `<section class="st-card${extra ? ` ${extra}` : ''}" id="st-${id}" aria-labelledby="st-${id}-h">
      <h3 class="st-h" id="st-${id}-h">${esc(title)}</h3>${body}</section>`;
  const empty = (msg) => `<p class="st-none">${esc(msg)}</p>`;
  /** Rangliste mit horizontalen Balken (HTML, von Haus aus lesbar). */
  function hbars(items, o) {
    if (!items.length) return empty(o.none);
    const max = Math.max(...items.map((x) => x.value), 1);
    return `<ol class="st-hbars${o.rank ? ' ranked' : ''}">${items.map((x, i) => `<li${x.attrs || ''}>
        ${o.rank ? `<span class="st-rank mono">${i + 1}</span>` : ''}
        <span class="st-hl" title="${esc(x.title || x.label)}">${x.pre || ''}<span class="st-lt">${esc(x.label)}</span>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span>
        <span class="st-hv mono">${esc(x.text)}</span>
        <span class="st-track" aria-hidden="true"><span class="st-fill" style="--w:${pct(x.value, max).toFixed(1)}%;${x.color ? `--c:${esc(x.color)}` : ''}"></span></span>
      </li>`).join('')}</ol>`;
  }
  /** Senkrechte Balken (Monate, Jahre): fokussierbar, Wert als Tooltip, Tabelle für Screenreader. */
  function vbars(items, o) {
    if (!items.length) return empty(o.none);
    const max = Math.max(...items.map((x) => x.value), 1);
    const every = Math.max(1, Math.ceil(items.length / (o.maxLabels || 12)));
    const ticks = [1, 0.5].map((f) => `<span class="st-gl" style="--y:${f * 100}%"><i class="mono">${esc(o.fmtTick(max * f))}</i></span>`).join('');
    const bars = items.map((x, i) => `<div class="st-col${x.value ? '' : ' zero'}${x.hl ? ' hl' : ''}" style="--h:${pct(x.value, max).toFixed(1)}%" tabindex="0" role="img" aria-label="${esc(`${x.long}: ${x.tip}`)}">
        <span class="st-bar"></span>
        <span class="st-tip mono" aria-hidden="true"><b>${esc(x.long)}</b>${esc(x.tip)}</span>
        <span class="st-x mono" aria-hidden="true">${i % every === 0 || i === items.length - 1 ? esc(x.label) : ''}</span></div>`).join('');
    const table = `<table class="sr-only"><caption>${esc(o.caption)}</caption><tbody>${items.map((x) => `<tr><th scope="row">${esc(x.long)}</th><td>${esc(x.tip)}</td></tr>`).join('')}</tbody></table>`;
    return `<div class="st-vbars${o.cls ? ` ${o.cls}` : ''}"><div class="st-plot">${ticks}${bars}</div></div>${table}`;
  }
  /** Kreisdiagramm (SVG) mit Legende – für zwei bis drei Anteile. */
  function donut(parts, centre, label) {
    const total = parts.reduce((a, p) => a + p.value, 0);
    if (!total) return empty(t('stats.none'));
    const R = 42, C = 2 * Math.PI * R;
    let off = 0;
    const rings = parts.filter((p) => p.value).map((p) => {
      const len = (C * p.value) / total;
      const s = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${esc(p.color)}" stroke-width="14" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"></circle>`;
      off += len;
      return s;
    }).join('');
    return `<div class="st-donut"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(label)}" focusable="false">
        <circle r="${R}" cx="60" cy="60" fill="none" stroke="var(--panel-3)" stroke-width="14"></circle>
        <g transform="rotate(-90 60 60)">${rings}</g>
        <text x="60" y="58" text-anchor="middle" class="st-dn">${esc(centre[0])}</text><text x="60" y="74" text-anchor="middle" class="st-dl">${esc(centre[1])}</text></svg>
      <ul class="st-legend">${parts.map((p) => `<li><span class="st-sw" style="--c:${esc(p.color)}"></span><span>${esc(p.label)}</span><b class="mono">${esc(util.fmtPct(pct(p.value, total)))}</b><small class="mono">${esc(p.sub)}</small></li>`).join('')}</ul></div>`;
  }

  /* ---------- Abschnitte ---------- */
  function kpis(d) {
    const tt = d.totals;
    const filtered = !!(d.range.from || d.range.to);
    const k = (id, label, value, sub) => `<div class="st-kpi" id="st-kpi-${id}"><span class="st-kl">${esc(label)}</span><b class="st-kv">${esc(value)}</b><small>${sub || '&nbsp;'}</small></div>`;
    const sizeNote = measuring ? esc(t('stats.measuring', { done: num(measuring.done), total: num(measuring.total) }))
      : tt.sizes_missing ? esc(t('stats.sizes_missing', { n: num(tt.sizes_missing), count: tt.sizes_missing })) : esc(t('stats.avg_size', { s: size(tt.sets ? tt.bytes / tt.sets : 0) }));
    return `<div class="st-kpis">
      ${k('sets', t('stats.k_sets'), num(tt.sets), filtered ? esc(t('stats.of_library', { n: num(tt.library_sets) })) : esc(t('stats.since', { d: tt.first ? util.fmtDate(tt.first) : '–' })))}
      ${k('hours', t('stats.k_hours'), hours(tt.seconds), esc(t('stats.days_nonstop', { n: util.fmtDec(tt.seconds / 86400, 1) })))}
      ${k('size', t('stats.k_size'), size(tt.bytes), sizeNote)}
      ${k('avg', t('stats.k_avg'), util.fmtDur(tt.avg_seconds), esc(t('stats.last_dl', { d: tt.last ? util.fmtWhen(tt.last) : '–' })))}
    </div>`;
  }
  function monthsChart(d) {
    let rows = d.months;
    let byYear = false;
    if (rows.length > MAX_BARS) { // zu viele Monate: pro Jahr
      byYear = true;
      const agg = new Map();
      rows.forEach((m) => { const y = m.month.slice(0, 4); const a = agg.get(y) || { month: y, sets: 0, seconds: 0, bytes: 0 }; a.sets += m.sets; a.seconds += m.seconds; a.bytes += m.bytes; agg.set(y, a); });
      rows = [...agg.values()];
    }
    const nowKey = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}`;
    const items = rows.map((m, i) => ({
      value: m.sets,
      label: byYear ? m.month : monthLabel(m.month, false, i === 0),
      long: byYear ? m.month : monthLabel(m.month, true),
      tip: `${sets(m.sets)} · ${hours(m.seconds)}${m.bytes ? ` · ${size(m.bytes)}` : ''}`,
      hl: !byYear && m.month === nowKey,
    }));
    const best = rows.reduce((a, m) => (m.sets > (a ? a.sets : 0) ? m : a), null);
    const meta = best ? `<span class="st-meta mono">${esc(t('stats.best_month', { m: byYear ? best.month : monthLabel(best.month, true), n: num(best.sets) }))}</span>` : '';
    return card('months', t(byYear ? 'stats.h_years_dl' : 'stats.h_months'),
      meta + vbars(items, { none: t('stats.none'), caption: t('stats.h_months'), fmtTick: (v) => num(Math.round(v)), maxLabels: 12, cls: 'months' }), 'wide');
  }
  function genres(d) {
    const total = d.genres.reduce((a, g) => a + g.sets, 0);
    return card('genres', t('stats.h_genres'), hbars(d.genres.map((g) => ({
      label: g.name, value: g.sets, color: g.color || HC.genres.color(g.name),
      text: `${num(g.sets)} · ${util.fmtPct(pct(g.sets, total))}`, sub: hours(g.seconds),
      pre: `<span class="st-sw" style="--c:${esc(g.color || HC.genres.color(g.name))}"></span>`,
    })), { none: t('stats.none') }));
  }
  function platforms(d) {
    const by = Object.fromEntries(d.platforms.map((p) => [p.platform, p]));
    const parts = ['youtube', 'soundcloud'].map((p) => ({ label: HC.platform.label(p), value: (by[p] || {}).sets || 0, color: p === 'soundcloud' ? 'var(--sc)' : 'var(--accent)', sub: `${num((by[p] || {}).sets || 0)} · ${hours((by[p] || {}).seconds || 0)}` }));
    const total = parts.reduce((a, p) => a + p.value, 0);
    const label = parts.map((p) => `${p.label}: ${num(p.value)}`).join(', ');
    return card('sources', t('stats.h_sources'), donut(parts, [num(total), t('stats.sets_word', { count: total })], label));
  }
  function festivals(d) {
    const f = d.festivals;
    const items = f.items.map((x) => ({ label: x.name, value: x.sets, text: num(x.sets), sub: t('stats.editions', { n: num(x.editions), count: x.editions }) }));
    const foot = f.other ? `<p class="st-foot mono">${esc(t('stats.festivals_other', { n: num(f.other), f: num(f.festivals - f.items.length) }))}</p>` : '';
    return card('festivals', t('stats.h_festivals'), hbars(items, { none: t('stats.no_festivals'), rank: true }) + foot);
  }
  function djs(d) {
    const items = d.djs.map((x) => ({ label: x.name, value: x.sets, text: num(x.sets), sub: hours(x.seconds),
      pre: `<span class="st-ini mono" aria-hidden="true">${esc(x.initials)}</span>`,
      attrs: ` data-dj="${esc(x.key)}" tabindex="0" role="link" title="${esc(t('stats.open_dj', { name: x.name }))}"` }));
    return card('djs', t('stats.h_djs'), hbars(items, { none: t('stats.no_djs'), rank: true }));
  }
  function years(d) {
    const items = d.years.filter((y) => y.year).map((y) => ({ value: y.sets, label: `’${String(y.year).slice(2)}`, long: String(y.year), tip: `${sets(y.sets)} · ${hours(y.seconds)}` }));
    const unknown = d.years.find((y) => !y.year);
    const foot = unknown ? `<p class="st-foot mono">${esc(t('stats.year_unknown', { n: num(unknown.sets) }))}</p>` : '';
    return card('years', t('stats.h_years'), vbars(items, { none: t('stats.none'), caption: t('stats.h_years'), fmtTick: (v) => num(Math.round(v)), maxLabels: 14, cls: 'years' }) + foot);
  }
  function tracks(d) {
    const items = d.tracks.map((x) => ({ label: `${x.artist}${x.artist && x.title ? ' – ' : ''}${x.title}`, value: x.sets, text: sets(x.sets), sub: x.version || '' }));
    return card('tracks', t('stats.h_tracks'), hbars(items, { none: t('stats.no_tracks'), rank: true }));
  }
  function watchlist(d) {
    const w = d.watchlist;
    const k = (label, value) => `<div class="st-mini"><b class="mono">${esc(value)}</b><span>${esc(label)}</span></div>`;
    const minis = `<div class="st-minis">${k(t('stats.w_checks'), num(w.checks))}${k(t('stats.w_scheduled'), num(w.scheduled))}${k(t('stats.w_found'), num(w.found))}${k(t('stats.w_inbox'), num(w.inbox))}</div>`;
    const items = w.months.map((m, i) => ({ value: m.found, label: monthLabel(m.month, false, i === 0), long: monthLabel(m.month, true), tip: `${t('stats.w_found_n', { n: num(m.found) })} · ${t('stats.w_checks_n', { n: num(m.checks) })}` }));
    const chart = w.months.length > 1 ? vbars(items.slice(-MAX_BARS), { none: t('stats.none'), caption: t('stats.h_watchlist'), fmtTick: (v) => num(Math.round(v)), maxLabels: 12, cls: 'mini' }) : '';
    const src = w.sources.length ? `<table class="st-table"><thead><tr><th>${esc(t('stats.w_source'))}</th><th class="num">${esc(t('stats.w_found'))}</th><th class="num">${esc(t('stats.w_library'))}</th><th class="num">${esc(t('stats.w_inbox'))}</th></tr></thead>
        <tbody>${w.sources.map((s) => `<tr><td><span class="st-pdot${s.platform === 'soundcloud' ? ' sc' : ''}" aria-hidden="true"></span>${esc(s.name)}<small class="muted"> · ${esc(t('source_type.' + s.type))}</small></td><td class="num mono">${num(s.found)}</td><td class="num mono">${num(s.downloaded)}</td><td class="num mono">${num(s.inbox)}</td></tr>`).join('')}</tbody></table>`
      : empty(w.source_count ? t('stats.w_none_range') : t('stats.w_no_sources'));
    const last = w.last ? `<span class="st-meta mono">${esc(t('stats.w_last', { t: util.fmtWhen(w.last) }))}</span>` : '';
    return card('watchlist', t('stats.h_watchlist'), last + minis + chart + src, 'wide');
  }

  /* ---------- Aufbau ---------- */
  function filterHtml() {
    const b = bounds();
    return `<div class="st-filter" role="group" aria-label="${esc(t('stats.range'))}">
        <div class="seg" id="st-preset">${PRESETS.map((p) => `<button type="button" data-p="${p}" class="${range.preset === p ? 'on' : ''}" aria-pressed="${range.preset === p}">${esc(t('stats.p_' + p))}</button>`).join('')}</div>
        <span class="st-custom" id="st-custom"${range.preset === 'custom' ? '' : ' hidden'}>
          <label><span class="sr-only">${esc(t('stats.from'))}</span><input class="input mono" type="date" id="st-from" value="${esc(b.from)}" aria-label="${esc(t('stats.from'))}"></label>
          <span class="muted">–</span>
          <label><span class="sr-only">${esc(t('stats.to'))}</span><input class="input mono" type="date" id="st-to" value="${esc(b.to)}" aria-label="${esc(t('stats.to'))}"></label>
        </span></div>`;
  }
  function render() {
    const body = $('#st-body', el);
    if (!data) { body.innerHTML = `<div class="st-loading" aria-busy="true">${esc(t('common.loading'))}</div>`; return; }
    if (data.error) { body.innerHTML = `<div class="empty">${I.warn}<h4>${esc(t('stats.error'))}</h4><p>${esc(data.error)}</p></div>`; return; }
    if (!data.totals.library_sets) {
      body.innerHTML = `<div class="empty" id="st-empty">${I.chart}<h4>${esc(t('stats.empty_title'))}</h4><p>${esc(t('stats.empty_text'))}</p><button class="btn primary" data-go="discover">${I.search}${esc(t('stats.empty_go'))}</button></div>`;
      return;
    }
    const zero = !data.totals.sets;
    body.innerHTML = `${kpis(data)}
      ${zero ? `<p class="st-zero" id="st-zero">${I.info}${esc(t('stats.range_empty'))}</p>` : ''}
      <div class="st-grid">
        ${monthsChart(data)}
        ${genres(data)}${platforms(data)}
        ${festivals(data)}${djs(data)}
        ${years(data)}${tracks(data)}
        ${watchlist(data)}
      </div>`;
    el.classList.toggle('st-anim', !document.body.classList.contains('reduced'));
    requestAnimationFrame(() => body.classList.add('drawn'));
  }
  async function load() {
    const my = ++seq;
    loading = true;
    el.setAttribute('aria-busy', 'true');
    const b = bounds();
    const r = await HC.bridge.safe('get_stats', { from: b.from || null, to: b.to || null });
    if (my !== seq) return;
    loading = false;
    el.removeAttribute('aria-busy');
    $('#st-body', el).classList.remove('drawn');
    if (!r) return;
    data = r.ok ? r : { error: r.error || t('err.generic') };
    if (r.ok && !r.measuring) measuring = null;
    else if (r.ok && r.measuring && !measuring) measuring = { done: 0, total: r.totals.sizes_missing };
    render();
    el.dataset.loaded = String(my);
  }
  const reload = util.debounce(() => { if (HC.app.current() === 'stats') load(); }, 1500);

  function init(root) {
    el = root;
    loadPrefs();
    el.innerHTML = `
      <div class="view-head"><h2 class="glitch" data-text="${esc(t('stats.title'))}">${esc(t('stats.title'))}</h2><span class="sub">${esc(t('stats.sub'))}</span>
        <div class="actions" id="st-actions">${filterHtml()}</div></div>
      <div class="scroll" id="st-scroll"><div class="st-body" id="st-body"></div></div>`;
    $('#st-actions', el).addEventListener('click', (e) => {
      const b = e.target.closest('#st-preset button[data-p]');
      if (!b || b.dataset.p === range.preset) return;
      if (b.dataset.p === 'custom') { const cur = bounds(); range = { preset: 'custom', from: cur.from, to: cur.to }; } else range = { preset: b.dataset.p, from: '', to: '' };
      savePrefs();
      $('#st-actions', el).innerHTML = filterHtml();
      wireFilter();
      load();
    });
    wireFilter();
    $('#st-body', el).addEventListener('click', (e) => {
      const dj = e.target.closest('[data-dj]'), go = e.target.closest('[data-go]');
      if (dj) HC.app.go('library', `dj-${encodeURIComponent(dj.dataset.dj)}`);
      else if (go) HC.app.go(go.dataset.go);
    });
    $('#st-body', el).addEventListener('keydown', (e) => {
      const dj = e.target.closest('[data-dj]');
      if (dj && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); HC.app.go('library', `dj-${encodeURIComponent(dj.dataset.dj)}`); }
    });
    HC.bridge.on('stats_sizes', (d) => {
      if (!d) return;
      if (d.phase === 'progress') {
        measuring = { done: d.done, total: d.total };
        const kv = $('#st-kpi-size small', el);
        if (kv) kv.textContent = t('stats.measuring', { done: num(d.done), total: num(d.total) });
      } else if (d.phase === 'done') { measuring = null; if (HC.app.current() === 'stats') load(); }
    });
    HC.bridge.on('done', reload);
    HC.bridge.on('watchlist_done', reload);
    HC.bridge.on('settings_changed', () => { if (data && !loading) render(); });
  }
  function wireFilter() {
    const from = $('#st-from', el), to = $('#st-to', el);
    const apply = () => {
      range = { preset: 'custom', from: from.value || '', to: to.value || '' };
      savePrefs();
      load();
    };
    from.addEventListener('change', apply);
    to.addEventListener('change', apply);
  }
  function show() { load(); }
  function reset() { data = null; measuring = null; if (el) render(); }

  HC.views.stats = { init, show, reset, reload: load };
  /* Tests: aktueller Stand ohne Timing */
  HC.views.stats.state = () => ({ loaded: !!data && !loading, range: Object.assign({}, range, bounds()), data });
})();
