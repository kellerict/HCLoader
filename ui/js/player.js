/* =====================================================================
   player.js – Mini-Player (Phase 8, SPEC §3.4 «Abspielen»)
   Leiste über der Statusleiste, nur sichtbar, wenn etwas geladen ist. Globales Modul
   (HC.player), an keine Ansicht gebunden: spielt beim Ansichtswechsel weiter.
   Abgespielt werden nur lokale Dateien (get_media liefert file:-URLs) – kein Streaming.

   Kapitel (aus CUE/Sidecar): Marker auf der Zeitleiste mit Tooltip, aufklappbare Trackliste,
   ⏮/⏭ = vorheriger/nächster Track, aktueller Track neben dem Titel.

   v0.7.0:
   - Lautheit angleichen (player.normalize, player.target_lufs): Web Audio (Quelle → ReplayGain-Gain → Lautstärke-Gain),
     Verstärkung = Ziel − gemessene Lautheit, begrenzt durch den True Peak (kein Übersteuern; Peak unbekannt = nur
     absenken). Ohne laufenden AudioContext (keine Nutzergeste, Fehler) nur absenken über audio.volume.
     Stille-Wächter (Review v0.7.0 M2): bleibt der Graph-Eingang (AnalyserNode) bei laufender, nicht stummer
     Wiedergabe ~1.5 s exakt 0 (z.B. file:-Quelle als cross-origin «tainted»), wird der Graph verworfen und ein
     neues Audio-Element an derselben Stelle übernimmt – Lautstärke dann über audio.volume (nur absenken).
     Der Graph startet mit den Ziel-Gains (kein lauter Moment beim Aufbau).
   - Geladenes Set ans Backend (set_now_playing): seine Datei wird nie getaggt (Review v0.7.0 M1).
   - Wellenform (player.waveform): Peaks aus get_media/get_waveform als Zeitleiste (2 Canvas: Grund + gespielter Teil,
     per clip-path), Kapitel als feine Linien; ohne Peaks der bisherige Balken.
   - Gedächtnis (player.resume ask|auto|off): Position alle 15 s, bei Pause/Sprung/Schliessen per save_position;
     beim Laden mit gemerkter Position fragt der Player (ask) oder springt (auto).
   - Schlaf-Timer: 15/30/45/60 min oder Ende des Sets, die letzten 10 s blenden aus.
   Tastatur: Leertaste = Play/Pause, ←/→ = ±10 s (nicht in Eingabefeldern, nicht bei Tastaturfokus
   auf einem Bedienelement, nicht bei offenem Dialog/Menü).

   Event (UI-intern):  HC.bridge.on('player', ({id, playing}) => …)   id null = nichts geladen
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const { $, util, fx, ui } = HC;
  const { esc, pad } = util;
  const t = (k, v) => HC.t(k, v);
  const I = HC.icons;
  const STORE_KEY = 'hc.player';
  const SNAP_PX = 5; // so nah an einem Kapitel-Marker rastet der Zeiger ein
  const SAVE_EVERY_MS = 15000; // Position merken: höchstens so oft während der Wiedergabe
  const FADE_S = 10; // Schlaf-Timer: so lange wird ausgeblendet
  const SLEEP_MIN = [15, 30, 45, 60];
  const AUTO_HINT_MS = 6000;
  const WAVE_BAR = 2, WAVE_GAP = 1;
  const SILENT_MS = 1500; // so lange exakt 0 am Graph-Eingang bei laufender Wiedergabe = Graph liefert nichts
  const WATCH_MS = 250;

  let el = null;
  let audio = null;
  let media = null; // Antwort von get_media (+ item der Bibliothek)
  let chapters = [];
  let curCh = -2; // -1 = vor dem ersten Kapitel, -2 = noch nicht gezeichnet
  let listOpen = false;
  let dragging = false;
  let dragTime = 0;
  let raf = 0;
  let loadSeq = 0;
  let seekW = 0;
  let lastSec = -1;
  let pendingSeek = null; // Position, die nach dem Laden der Metadaten gesetzt wird
  let swallowSpaceUp = false;
  const prefs = { volume: 0.8, muted: false };
  /* v0.7.0 */
  let graph = null; // {ctx, rg, vol} – Web Audio, sobald einmal erfolgreich aufgebaut (bleibt für das Element)
  let graphBroken = false; // AudioContext nicht verfügbar/Fehler/stumm: nur noch audio.volume
  let watch = null; // Stille-Wächter {timer, t, ct, st:{silent, verified}}
  let reportedId; // zuletzt an set_now_playing gemeldet (undefined = noch nie)
  let gainNow = 1; // angewandte Normalisierung (linear)
  let fade = 1; // Schlaf-Timer-Ausblendung 0..1
  let peaks = null; // Wellenform des geladenen Sets (0..255) oder null
  let waveSeq = 0;
  let lastSave = 0;
  let resumeBox = null; // {mode, at} – offene Frage «Fortsetzen?» bzw. Hinweis «Fortgesetzt»
  let resumeTimer = 0;
  let sleep = null; // {mode:'min', minutes, until} | {mode:'end'}
  let sleepTimer = 0;

  /* ---------- Lautstärke merken ---------- */
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (typeof p.volume === 'number' && p.volume >= 0 && p.volume <= 1) prefs.volume = p.volume;
      prefs.muted = !!p.muted;
    } catch (e) { /* kein Speicher (file://, privat) – Standardwerte */ }
  }
  function savePrefs() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch (e) { /* egal */ }
  }

  /* ---------- Helfer ---------- */
  const playing = () => !!audio && !!media && !audio.paused && !audio.ended;
  const dur = () => {
    const d = audio ? audio.duration : NaN;
    return isFinite(d) && d > 0 ? d : (media && +media.duration > 0 ? +media.duration : 0);
  };
  const pos = () => (dragging ? dragTime : pendingSeek != null ? pendingSeek : audio ? audio.currentTime || 0 : 0);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const chLabel = (c, i) => `${pad(i + 1)} · ${c.performer ? `${c.performer} – ` : ''}${c.title}`;
  /** Index des Kapitels, das bei Sekunde x läuft (-1 = vor dem ersten). */
  function chapterAt(x) {
    let i = -1;
    for (let k = 0; k < chapters.length; k++) { if (chapters[k].start <= x + 0.05) i = k; else break; }
    return i;
  }
  /** Nur lokale Dateien: file:-URL vom Backend; data:audio/ einzig im Mock-Modus (synthetische Tonfolge). */
  function safeSrc(src) {
    if (typeof src !== 'string') return null;
    if (/^file:\/\//i.test(src)) return src;
    if (!HC.bridge.live && /^data:audio\//i.test(src)) return src;
    return null;
  }
  function emit() {
    const id = media ? media.id : null;
    HC.bridge.emit('player', { id, playing: playing() });
    if (id !== reportedId) { // Datei offen -> Backend schreibt keine Tags hinein (aufgeschoben)
      reportedId = id;
      HC.bridge.call('set_now_playing', id).catch(() => { /* egal */ });
    }
  }
  const plSet = () => (HC.settings && HC.settings.values && HC.settings.values.player) || {};
  const resumeMode = () => { const m = plSet().resume; return m === 'auto' || m === 'off' ? m : 'ask'; };
  const waveOn = () => plSet().waveform !== false;

  /* ---------- Lautheit (ReplayGain) und Ausgang ---------- */
  /** Lineare Verstärkung für das geladene Set: Ziel − Lautheit, höchstens 1/Peak; ohne Peak nie verstärken. */
  function normGain() {
    const pl = plSet(), lo = media && media.loudness;
    if (pl.normalize === false || !lo || !isFinite(+lo.lufs)) return 1;
    const target = isFinite(+pl.target_lufs) ? +pl.target_lufs : -18;
    let g = Math.pow(10, (target - +lo.lufs) / 20);
    const pk = +lo.peak;
    g = pk > 0 ? Math.min(g, 1 / pk) : Math.min(g, 1);
    return isFinite(g) && g > 0 ? g : 1;
  }
  /** Lautstärke × Ausblendung × Normalisierung auf den Ausgang legen. */
  function applyOutput() {
    if (!audio) return;
    gainNow = normGain();
    const v = (prefs.muted ? 0 : prefs.volume) * fade;
    if (graph) {
      const t0 = graph.ctx.currentTime;
      try { graph.rg.gain.setTargetAtTime(gainNow, t0, 0.04); graph.vol.gain.setTargetAtTime(v, t0, 0.04); } catch (e) { graph.rg.gain.value = gainNow; graph.vol.gain.value = v; }
      audio.volume = 1;
      audio.muted = false;
    } else {
      audio.volume = clamp(v * Math.min(gainNow, 1), 0, 1);
      audio.muted = prefs.muted;
    }
    paintNorm();
  }
  /** Web-Audio-Graph einmal aufbauen – nur mit laufendem AudioContext (sonst bliebe das Element stumm). */
  async function ensureGraph() {
    if (graph) { if (graph.ctx.state === 'suspended') { try { await graph.ctx.resume(); } catch (e) { /* egal */ } } return; }
    if (graphBroken || plSet().normalize === false) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { graphBroken = true; return; }
    let ctx = null;
    const el0 = audio;
    try {
      ctx = new AC();
      if (ctx.state !== 'running') await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 400))]);
      if (ctx.state !== 'running' || graph || graphBroken || el0 !== audio) { ctx.close(); return; } // keine Nutzergeste: später nochmals
      /* Gains zuerst auf ihre Zielwerte, dann verbinden: kein kurzer Moment mit voller Lautstärke. */
      const rg = ctx.createGain(), vol = ctx.createGain(), an = ctx.createAnalyser();
      rg.gain.value = normGain();
      vol.gain.value = (prefs.muted ? 0 : prefs.volume) * fade;
      an.fftSize = 2048;
      const src = ctx.createMediaElementSource(audio);
      src.connect(an); // Wächter-Abgriff vor allen Gains (Lautstärke 0 ist keine Stille der Quelle)
      src.connect(rg).connect(vol).connect(ctx.destination);
      graph = { ctx, rg, vol, an, buf: new Float32Array(an.fftSize) };
    } catch (e) {
      graphBroken = true;
      if (ctx) { try { ctx.close(); } catch (err) { /* egal */ } }
    }
    applyOutput();
    if (graph) startWatch();
  }

  /* ---------- Stille-Wächter (M2) ---------- */
  /** Reine Entscheidung je Messung. st {silent (ms), verified}; s {rms, playing, muted, advanced}; dt (ms).
      -> 'ok' (Signal gesehen: Graph funktioniert), 'wait' (noch offen) oder 'broken' (Graph liefert nur Nullen). */
  function silenceVerdict(st, s, dt) {
    if (st.verified) return 'ok';
    if (s.rms > 0) { st.verified = true; st.silent = 0; return 'ok'; }
    if (!s.playing || s.muted || !s.advanced) return 'wait'; // Pause, stumm, steht: sagt nichts aus
    st.silent += Math.max(0, +dt || 0);
    return st.silent >= SILENT_MS ? 'broken' : 'wait';
  }
  function rms(g) {
    try {
      g.an.getFloatTimeDomainData(g.buf);
      let sum = 0;
      for (let i = 0; i < g.buf.length; i++) sum += g.buf[i] * g.buf[i];
      return Math.sqrt(sum / g.buf.length);
    } catch (e) { return 1; } // nicht messbar: nicht verwerfen
  }
  function stopWatch() { if (watch) { clearInterval(watch.timer); watch = null; } }
  function startWatch() {
    if (!graph || graph.ok || watch) return; // einmal Signal gesehen = Graph funktioniert für dieses Element
    watch = { t: performance.now(), ct: audio.currentTime || 0, st: { silent: 0, verified: false } };
    watch.timer = setInterval(watchTick, WATCH_MS);
  }
  function watchTick() {
    if (!graph || !watch || !audio) { stopWatch(); return; }
    const now = performance.now(), ct = audio.currentTime || 0;
    const v = silenceVerdict(watch.st, { rms: rms(graph), playing: playing(), muted: audio.muted, advanced: ct > watch.ct + 0.01 }, now - watch.t);
    watch.t = now;
    watch.ct = ct;
    if (v === 'ok') { graph.ok = true; stopWatch(); }
    else if (v === 'broken') dropGraph();
  }
  /** Graph liefert nur Nullen: verwerfen (nicht rückgängig zu machen -> neues Element an derselben Stelle). */
  function dropGraph() {
    stopWatch();
    if (!graph) return;
    const old = audio, src = old.getAttribute('src'), at = old.currentTime || 0, was = playing();
    graphBroken = true;
    try { graph.ctx.close(); } catch (e) { /* egal */ }
    graph = null;
    audio = makeAudio();
    old.pause();
    old.removeAttribute('src');
    try { old.load(); } catch (e) { /* egal */ }
    applyOutput();
    if (src) {
      pendingSeek = at > 0 ? at : null;
      audio.src = src;
      if (was) { const p = audio.play(); if (p && p.catch) p.catch(() => paintState()); } else audio.load();
    }
    paintState();
    ui.toast(t('player.norm_fallback'), 'warn', 6000);
  }
  function paintNorm() {
    const n = el && $('#pl-norm', el);
    if (!n) return;
    const lo = media && media.loudness, on = plSet().normalize !== false && lo && isFinite(+lo.lufs);
    n.hidden = !on;
    if (!on) return;
    const db = 20 * Math.log10(gainNow), full = graph || gainNow <= 1;
    n.textContent = `${db > 0.05 ? '+' : db < -0.05 ? '−' : '±'}${util.fmtDec(Math.abs(db), 1, true)} ${t('unit.db')}`;
    n.classList.toggle('capped', !full);
    n.title = t('player.norm_title', { lufs: util.fmtDec(+lo.lufs, 1, true), target: util.fmtDec(isFinite(+plSet().target_lufs) ? +plSet().target_lufs : -18, 1), gain: n.textContent }) + (full ? '' : ` · ${t('player.norm_capped')}`);
  }

  /* ---------- Wellenform ---------- */
  function setPeaks(p) {
    peaks = Array.isArray(p) && p.length ? p.map((x) => clamp(+x || 0, 0, 255)) : null;
    drawWave(true);
  }
  function requestWave(id) {
    if (!waveOn() || peaks) return;
    const seq = ++waveSeq;
    HC.bridge.call('get_waveform', id).then((r) => {
      if (seq !== waveSeq || !media || media.id !== id || !r || !r.ok) return;
      if (r.status === 'ready') setPeaks(r.peaks); // pending: Event «waveform» folgt
    }).catch(() => { /* ohne Wellenform: einfacher Balken */ });
  }
  /** Peaks auf n Balken verdichten (Maximum je Abschnitt), 0..1 mit sanfter Kurve gegen «Ziegelstein»-Optik. */
  function bars(n) {
    const src = peaks, len = src.length, out = new Array(n);
    let mx = 1;
    for (let i = 0; i < len; i++) if (src[i] > mx) mx = src[i];
    for (let k = 0; k < n; k++) {
      const a = Math.floor((k * len) / n), b = Math.max(a + 1, Math.floor(((k + 1) * len) / n));
      let m = 0;
      for (let i = a; i < b && i < len; i++) if (src[i] > m) m = src[i];
      out[k] = Math.pow(m / mx, 1.6);
    }
    return out;
  }
  function drawWave(fresh) {
    if (!el) return;
    const sk = $('#pl-seek', el), on = !!(peaks && waveOn());
    const was = sk.classList.contains('has-wave');
    sk.classList.toggle('has-wave', on);
    if (!on) return;
    if (!was && fresh && !fx.reduced()) { sk.classList.remove('wave-in'); void sk.offsetWidth; sk.classList.add('wave-in'); }
    const w = sk.clientWidth, cs = getComputedStyle(sk), h = parseFloat(cs.getPropertyValue('--wave-h')) || 22;
    if (!w) return;
    const dpr = window.devicePixelRatio || 1, n = Math.max(1, Math.floor((w + WAVE_GAP) / (WAVE_BAR + WAVE_GAP)));
    const vals = bars(n), step = w / n;
    [['#pl-wave', cs.getPropertyValue('--wave-base').trim() || '#3a3a45'], ['#pl-wave-on', cs.getPropertyValue('--wave-on').trim() || '#ff1f1f']].forEach(([sel, color]) => {
      const c = $(sel, el), g = c.getContext('2d');
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      g.fillStyle = color;
      for (let k = 0; k < n; k++) {
        const bh = Math.max(2, vals[k] * (h - 2));
        g.fillRect(Math.round(k * step), Math.round((h - bh) / 2), WAVE_BAR, Math.round(bh));
      }
    });
    paint();
  }

  /* ---------- Gedächtnis (Position pro Set) ---------- */
  function savePos(why) {
    if (!media || resumeMode() === 'off' || !audio || audio.readyState < 1 || pendingSeek != null || resumeBox && resumeBox.mode === 'ask') return;
    lastSave = Date.now();
    const id = media.id, at = audio.ended ? dur() : audio.currentTime || 0;
    HC.bridge.call('save_position', id, at, dur() || null)
      .then(() => { if (why) HC.bridge.emit('resume_changed', { id }); })
      .catch(() => { /* egal: beim nächsten Mal */ });
  }
  function showResume(mode, at) {
    clearTimeout(resumeTimer);
    resumeBox = { mode, at };
    const box = $('#pl-resume', el);
    box.innerHTML = mode === 'ask'
      ? `<span class="pl-r-txt"><b>${esc(t('player.resume_q'))}</b><span class="mono">${esc(t('player.resume_at', { t: util.fmtDur(at) }))}</span></span>
         <button type="button" class="btn sm primary" data-r="resume">${I.play}${esc(t('player.resume'))}</button>
         <button type="button" class="btn sm ghost" data-r="restart">${esc(t('player.restart'))}</button>`
      : `<span class="pl-r-txt"><span>${esc(t('player.resumed_at', { t: util.fmtDur(at) }))}</span></span>
         <button type="button" class="linkbtn" data-r="restart">${esc(t('player.restart'))}</button>`;
    box.hidden = false;
    if (!fx.reduced()) { box.classList.remove('enter'); void box.offsetWidth; box.classList.add('enter'); }
    if (mode === 'ask') { const b = $('[data-r=resume]', box); if (b && document.activeElement === document.body) b.focus({ preventScroll: true }); }
    else resumeTimer = setTimeout(hideResume, AUTO_HINT_MS);
  }
  function hideResume() {
    clearTimeout(resumeTimer);
    resumeBox = null;
    if (el) $('#pl-resume', el).hidden = true;
  }
  function answerResume(choice) {
    const rb = resumeBox;
    if (!rb || !media) return;
    hideResume();
    if (choice === 'resume') { seek(rb.at); if (audio.paused) start(); }
    else { seek(0); if (audio.paused) start(); }
  }

  /* ---------- Schlaf-Timer ---------- */
  function setSleep(v) {
    clearInterval(sleepTimer);
    sleep = v == null ? null : v === 'end' ? { mode: 'end' } : { mode: 'min', minutes: v, until: Date.now() + v * 60000 };
    fade = 1;
    if (sleep) sleepTimer = setInterval(sleepTick, 250);
    applyOutput();
    paintSleep();
  }
  function sleepLeft() {
    if (!sleep) return Infinity;
    return sleep.mode === 'end' ? Math.max(0, dur() - pos()) : (sleep.until - Date.now()) / 1000;
  }
  function sleepTick() {
    if (!sleep) return;
    const left = sleepLeft(), was = fade;
    /* «Ende des Sets»: nur ausblenden, solange es läuft; Minuten laufen auch in der Pause ab. */
    fade = left < FADE_S && (sleep.mode === 'min' || playing()) ? clamp(left / FADE_S, 0, 1) : 1;
    if (fade !== was) applyOutput();
    if (left <= 0) {
      const stop = playing();
      if (audio && stop) audio.pause();
      setSleep(null);
      if (stop) ui.toast(t('player.sleep_done'), 'info');
      return;
    }
    paintSleep();
  }
  function paintSleep() {
    if (!el) return;
    const b = $('[data-p=sleep]', el), badge = $('i', b);
    b.classList.toggle('on', !!sleep);
    if (!sleep) { badge.textContent = ''; b.title = t('player.sleep'); b.setAttribute('aria-label', b.title); return; }
    const left = sleepLeft();
    badge.textContent = sleep.mode === 'end' ? t('player.sleep_end_short') : `${Math.max(1, Math.ceil(left / 60))}′`;
    b.title = sleep.mode === 'end' ? t('player.sleep_end_on') : t('player.sleep_on', { t: util.fmtDur(Math.max(0, left)) });
    b.setAttribute('aria-label', b.title);
    b.classList.toggle('fading', fade < 1);
  }
  function sleepMenu(anchor) {
    const cur = sleep ? (sleep.mode === 'end' ? 'end' : sleep.minutes) : null;
    ui.menu(anchor, [{ head: t('player.sleep') }]
      .concat(SLEEP_MIN.map((m) => ({ label: t('player.sleep_min', { n: m }), key: `sleep-${m}`, current: cur === m, onClick: () => setSleep(m) })))
      .concat([{ label: t('player.sleep_end'), key: 'sleep-end', current: cur === 'end', onClick: () => setSleep('end') }])
      .concat(sleep ? ['sep', { label: t('player.sleep_off'), key: 'sleep-off', icon: I.x, onClick: () => setSleep(null) }] : []));
  }

  /* ---------- Zeichnen ---------- */
  function paintState() {
    if (!el) return;
    const on = playing();
    el.classList.toggle('playing', on);
    const b = $('[data-p=toggle]', el);
    b.innerHTML = on ? I.pause : I.play;
    b.title = t(on ? 'player.pause' : 'player.play');
    b.setAttribute('aria-label', b.title);
    if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = media ? (on ? 'playing' : 'paused') : 'none'; } catch (e) { /* egal */ } }
    cancelAnimationFrame(raf);
    /* Weicher Lauf des Balkens nur während der Wiedergabe; sonst genügt «timeupdate». */
    if (on && !fx.reduced()) raf = requestAnimationFrame(tick);
  }
  function tick() {
    paint();
    if (playing() && !fx.reduced() && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function paint() {
    if (!el || !media) return;
    const d = dur(), x = clamp(pos(), 0, d || Infinity), p = d ? clamp(x / d, 0, 1) : 0;
    $('#pl-fill', el).style.transform = `scaleX(${p})`;
    if (peaks) $('#pl-wave-on', el).style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(3)}% 0 0)`;
    $('#pl-knob', el).style.transform = `translateX(${p * seekW}px)`;
    const sec = Math.floor(x);
    if (sec !== lastSec || dragging) {
      lastSec = sec;
      $('#pl-cur', el).textContent = util.fmtDur(x);
      $('#pl-rest', el).textContent = d ? `−${util.fmtDur(Math.max(0, d - x))}` : '–';
      const s = $('#pl-seek', el);
      s.setAttribute('aria-valuenow', sec);
      s.setAttribute('aria-valuetext', `${util.fmtDur(x)}${d ? ` / ${util.fmtDur(d)}` : ''}`);
    }
    const i = chapters.length ? chapterAt(x) : -1;
    if (i !== curCh) { curCh = i; paintChapter(); }
  }
  function paintChapter() {
    const c = chapters[curCh], box = $('#pl-track', el);
    box.hidden = !chapters.length;
    if (chapters.length) {
      $('span', box).textContent = c ? chLabel(c, curCh) : t('player.tracks_n', { n: chapters.length });
      box.title = c ? `${chLabel(c, curCh)} · ${t('player.tracks_toggle')}` : t('player.tracks_toggle');
      if (c) fx.pop(box, 'swap');
    }
    $('#pl-marks', el).querySelectorAll('i').forEach((m, k) => m.classList.toggle('past', k <= curCh));
    $('#pl-tracks', el).querySelectorAll('li').forEach((li, k) => {
      const on = k === curCh;
      li.classList.toggle('cur', on);
      if (on) li.setAttribute('aria-current', 'true'); else li.removeAttribute('aria-current');
      if (on && listOpen) li.scrollIntoView({ block: 'nearest' });
    });
    $('[data-p=prev]', el).disabled = !chapters.length;
    $('[data-p=next]', el).disabled = !chapters.length || curCh >= chapters.length - 1;
  }
  /** Marker und Trackliste aufbauen (einmal pro geladenem Mix; Positionen brauchen die Dauer). */
  function paintChapters() {
    const d = dur();
    $('#pl-marks', el).innerHTML = d ? chapters.map((c) => (c.start > 0.5 && c.start < d ? `<i style="left:${((c.start / d) * 100).toFixed(3)}%"></i>` : '<i hidden></i>')).join('') : '';
    $('#pl-tracks', el).innerHTML = chapters.map((c, i) => `<li data-i="${i}" tabindex="0"><span class="n">${pad(i + 1)}</span>${ui.eq()}<span class="tt"><b title="${esc(c.title)}">${esc(c.title)}</b>${c.performer ? `<small title="${esc(c.performer)}">${esc(c.performer)}</small>` : ''}</span><span class="tm">${util.fmtDur(c.start)}</span></li>`).join('');
    $('#pl-list-n', el).textContent = t('player.tracks_n', { n: chapters.length });
    const lb = $('[data-p=list]', el);
    lb.hidden = !chapters.length;
    $('i', lb).textContent = chapters.length;
    curCh = -2;
    paint();
  }
  function paintVolume() {
    const v = prefs.muted ? 0 : prefs.volume;
    applyOutput();
    const r = $('#pl-vol', el);
    r.value = Math.round(v * 100);
    r.style.setProperty('--p', `${Math.round(v * 100)}%`);
    const b = $('[data-p=mute]', el);
    b.innerHTML = v === 0 ? I.mute : I.volume;
    b.title = t(prefs.muted ? 'player.unmute' : 'player.mute');
    b.classList.toggle('on', v === 0);
  }
  function paintMeta() {
    $('#pl-title', el).textContent = media.title || '';
    $('#pl-title', el).title = media.title || '';
    /* Mit Kapiteln gehört die zweite Zeile dem aktuellen Track; der Kanal steht dann gedimmt hinter dem Titel. */
    $('#pl-artist', el).textContent = chapters.length ? media.artist || '' : '';
    $('#pl-artist2', el).textContent = chapters.length ? '' : media.artist || '';
    $('#pl-artist', el).title = media.artist || '';
    /* Cover: echtes Bild (file:-URL vom Backend), sonst der generierte Platzhalter aus id + Genre-Farbe.
       ui.thumb() lässt sein <div class="thumb"> offen (wie bei allen Aufrufern); das </div> schliesst es,
       der Equalizer liegt danach direkt in #pl-cover. */
    const cover = typeof media.cover === 'string' && /^file:\/\//i.test(media.cover) ? media.cover : null;
    $('#pl-cover', el).innerHTML = `${ui.thumb({ id: media.id, genre: media.genre, thumbnail: null }, 'pl-art')}${cover ? `<img src="${esc(cover)}" alt="" decoding="async">` : ''}</div>${ui.eq('on-cover')}`;
    $('#pl-pbadge', el).innerHTML = ui.pbadge(media);
    $('#pl-rest', el).title = dur() ? t('player.total', { t: util.fmtDur(dur()) }) : '';
    if ('mediaSession' in navigator && window.MediaMetadata) {
      try { navigator.mediaSession.metadata = new window.MediaMetadata({ title: media.title || '', artist: media.artist || '', album: media.genre || '' }); } catch (e) { /* egal */ }
    }
  }
  function measure() { seekW = el ? $('#pl-seek', el).clientWidth : 0; lastSec = -1; if (peaks) drawWave(); else paint(); }

  /* ---------- Trackliste ---------- */
  function setList(open) {
    listOpen = !!open && chapters.length > 0;
    const box = $('#pl-list', el);
    box.hidden = !listOpen;
    $('[data-p=list]', el).classList.toggle('on', listOpen);
    $('[data-p=list]', el).setAttribute('aria-expanded', listOpen);
    $('#pl-track', el).setAttribute('aria-expanded', listOpen);
    if (listOpen) { const cur = $('li.cur', box); if (cur) cur.scrollIntoView({ block: 'center' }); }
  }

  /* ---------- Steuerung ---------- */
  function seek(x) {
    if (!media) return;
    const d = dur(), to = clamp(+x || 0, 0, d ? Math.max(0, d - 0.05) : Infinity);
    if (audio.readyState < 1) pendingSeek = to; // Metadaten noch nicht da -> nach dem Laden springen
    else { try { audio.currentTime = to; } catch (e) { pendingSeek = to; } }
    lastSec = -1;
    paint();
  }
  const seekBy = (delta) => seek(pos() + delta);
  function start() {
    if (resumeBox && resumeBox.mode === 'ask') hideResume(); // ▶/Leertaste statt Antwort = von vorn
    ensureGraph();
    if (graph) startWatch();
    const p = audio.play();
    if (p && p.catch) p.catch(() => paintState()); // z.B. Autoplay-Sperre: bleibt pausiert, ▶ startet
  }
  function toggle() {
    if (!media) return;
    if (audio.paused || audio.ended) { if (audio.ended) seek(0); start(); } else audio.pause();
  }
  function gotoChapter(i, andPlay) {
    const c = chapters[i];
    if (!c) return;
    seek(c.start);
    if (andPlay && (audio.paused || audio.ended)) start();
  }
  function prevChapter() {
    if (!chapters.length) return;
    const i = chapterAt(pos());
    /* Wie bei jedem Player: nach den ersten Sekunden zurück zum Anfang des Tracks, sonst zum vorherigen. */
    if (i <= 0 || pos() - chapters[i].start > 3) gotoChapter(Math.max(0, i));
    else gotoChapter(i - 1);
  }
  function nextChapter() { const i = chapterAt(pos()); if (i < chapters.length - 1) gotoChapter(i + 1); }

  /** Audio-Element von der Datei lösen (gibt die Datei frei). */
  function unload() {
    cancelAnimationFrame(raf);
    stopWatch();
    if (!audio) return;
    if (media && audio.getAttribute('src')) savePos(true);
    hideResume();
    audio.pause();
    audio.removeAttribute('src');
    try { audio.load(); } catch (e) { /* egal */ }
  }
  function show(r, item) {
    media = Object.assign({}, item, r);
    chapters = (Array.isArray(r.chapters) ? r.chapters : [])
      .map((c) => ({ start: +c.start, title: String(c.title || ''), performer: String(c.performer || '') }))
      .filter((c) => isFinite(c.start) && c.start >= 0 && (c.title || c.performer))
      .sort((a, b) => a.start - b.start);
    chapters.forEach((c, i) => { if (!c.title) c.title = `Track ${i + 1}`; });
    peaks = null;
    waveSeq++;
    const fresh = el.hidden;
    el.hidden = false;
    el.classList.remove('leave');
    document.body.classList.add('has-player');
    if (fresh && !fx.reduced()) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
    lastSec = -1;
    paintMeta();
    setList(listOpen);
    measure();
    paintChapters();
    paintVolume();
    if (Array.isArray(r.peaks) && r.peaks.length) setPeaks(r.peaks); else { drawWave(); requestWave(media.id); }
  }
  /** Mix laden und abspielen. item: LibraryItem (mindestens {id}); derselbe Mix nochmals = Play/Pause.
      o: {reload, at (s), paused, resume (an der gemerkten Stelle, ohne Rückfrage)} */
  async function play(item, o) {
    if (!el || !item || item.id == null) return;
    const opt = o || {};
    if (media && media.id === item.id && !opt.reload) { toggle(); return; }
    const seq = ++loadSeq;
    const r = await HC.bridge.safe('get_media', item.id);
    if (seq !== loadSeq || !r) return;
    if (!r.ok) { ui.toast(r.error || t('player.err_load'), 'err'); if (opt.reload) close(true); return; }
    const src = safeSrc(r.src);
    if (!src) { ui.toast(t('player.err_src'), 'err'); if (opt.reload) close(true); return; }
    unload();
    pendingSeek = opt.at > 0 ? opt.at : null;
    show(r, item);
    audio.src = src;
    lastSave = Date.now();
    /* Gemerkte Position: nicht bei Sprung (Tracklist, «Weiterhören») oder Neuladen nach dem Taggen. */
    const rp = r.resume && +r.resume.position > 0 ? +r.resume.position : 0, mode = resumeMode();
    if (rp && opt.resume) { pendingSeek = rp; start(); } // «Weiterhören»: ohne Rückfrage an die gemerkte Stelle
    else if (rp && opt.at == null && !opt.reload && mode !== 'off') {
      if (mode === 'auto') { pendingSeek = rp; start(); showResume('auto', rp); }
      else { audio.load(); paintState(); showResume('ask', rp); }
    } else if (opt.paused) { audio.load(); paintState(); } else start();
    emit();
  }
  /** Mix ab Sekunde `at` spielen (Tracklist-Suche): läuft er schon, nur springen und weiterspielen. */
  function playAt(item, at) {
    if (!el || !item || item.id == null) return Promise.resolve();
    const to = Math.max(0, +at || 0);
    if (media && media.id === item.id && audio.getAttribute('src')) {
      seek(to);
      if (audio.paused || audio.ended) start();
      return Promise.resolve();
    }
    return play(item, { reload: !!media && media.id === item.id, at: to });
  }
  function close(silent) {
    loadSeq++;
    if (!el) return;
    const had = !!media;
    unload();
    media = null;
    chapters = [];
    pendingSeek = null;
    peaks = null;
    if (sleep) setSleep(null);
    drawWave();
    setList(false);
    el.classList.remove('playing');
    document.body.classList.remove('has-player');
    if (had && !silent && !fx.reduced()) fx.leave(el, () => { if (!media) { el.hidden = true; el.classList.remove('leave'); } });
    else el.hidden = true;
    if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } catch (e) { /* egal */ } }
    if (had) emit();
  }
  /** Datei freigeben, weil sie gleich verschoben wird (neu taggen). -> Zustand für resume() oder null. */
  function suspend(id) {
    if (!media || media.id !== id) return null;
    const hold = { item: media, at: audio.currentTime || 0, playing: playing() };
    unload();
    paintState();
    emit();
    return hold;
  }
  /** Nach suspend(): Datei am (neuen) Ort wieder laden, an derselben Stelle weiter. */
  function resume(hold) {
    if (!hold || !media || media.id !== hold.item.id) return;
    play({ id: hold.item.id, title: hold.item.title, artist: hold.item.artist, genre: hold.item.genre, platform: hold.item.platform }, { reload: true, at: hold.at, paused: !hold.playing });
  }
  /** Datei endgültig freigeben (Eintrag wird gelöscht). */
  function release(id) { if (media && media.id === id) close(); }

  /* ---------- Zeitleiste: Zeiger, Tooltip, Ziehen ---------- */
  function atPointer(e) {
    const s = $('#pl-seek', el), r = s.getBoundingClientRect(), d = dur();
    let x = clamp(e.clientX - r.left, 0, r.width), time = r.width ? (x / r.width) * d : 0, snap = -1;
    if (d) {
      chapters.forEach((c, i) => { const cx = (c.start / d) * r.width; if (Math.abs(cx - x) <= SNAP_PX && (snap < 0 || Math.abs(cx - x) < Math.abs((chapters[snap].start / d) * r.width - x))) snap = i; });
      if (snap >= 0) { time = chapters[snap].start; x = (time / d) * r.width; }
    }
    return { x, time, snap, width: r.width };
  }
  function paintTip(e) {
    const tip = $('#pl-tip', el), d = dur();
    if (!d) { tip.hidden = true; return; }
    const a = atPointer(e), i = a.snap >= 0 ? a.snap : chapterAt(a.time), c = chapters[i];
    tip.innerHTML = `<b>${util.fmtDur(a.time)}</b>${c ? `<span>${esc(chLabel(c, i))}</span>` : ''}`;
    tip.hidden = false;
    tip.classList.toggle('snap', a.snap >= 0);
    const half = tip.offsetWidth / 2;
    tip.style.transform = `translateX(${clamp(a.x, Math.min(half, a.width / 2), Math.max(a.width - half, a.width / 2)) - half}px)`;
    $('#pl-marks', el).querySelectorAll('i').forEach((m, k) => m.classList.toggle('hot', k === a.snap));
  }
  function hideTip() {
    $('#pl-tip', el).hidden = true;
    $('#pl-marks', el).querySelectorAll('i.hot').forEach((m) => m.classList.remove('hot'));
  }

  /* ---------- Tastatur ---------- */
  function onKeyDown(e) {
    if (!media || e.ctrlKey || e.altKey || e.metaKey) return;
    const space = e.key === ' ' || e.code === 'Space';
    if (e.key === 'Escape' && listOpen && !$('.modal-back') && !ui._menu) { setList(false); return; }
    if (!space && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if ($('.modal-back') || ui._menu || $('#fatal')) return;
    const a = document.activeElement;
    if (a && a !== document.body) {
      if (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return; // Eingabefeld: die Taste gehört ihm
      /* Tastaturfokus auf einem Bedienelement (sichtbarer Fokusring): Leertaste/Pfeile gehören ihm – ausser der Zeitleiste. */
      if (a.id !== 'pl-seek' && a.matches(':focus-visible')) return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (space) { swallowSpaceUp = true; if (!e.repeat) toggle(); } else seekBy(e.key === 'ArrowLeft' ? -10 : 10);
  }
  function onKeyUp(e) {
    if (swallowSpaceUp && (e.key === ' ' || e.code === 'Space')) { swallowSpaceUp = false; e.preventDefault(); e.stopPropagation(); }
  }

  /* ---------- Aufbau ---------- */
  /** Audio-Element mit allen Listenern; Ereignisse eines ersetzten Elements (dropGraph) werden ignoriert. */
  function makeAudio() {
    const a = new Audio();
    a.preload = 'auto';
    const on = (type, fn) => a.addEventListener(type, (e) => { if (a === audio) fn(e); });
    on('play', () => { paintState(); emit(); });
    on('pause', () => { paintState(); paint(); emit(); if (!audio.ended) savePos(true); });
    on('ended', () => { paintState(); paint(); emit(); savePos(true); if (sleep && sleep.mode === 'end') { setSleep(null); ui.toast(t('player.sleep_done'), 'info'); } });
    on('timeupdate', () => { paint(); if (playing() && Date.now() - lastSave > SAVE_EVERY_MS) savePos(false); });
    on('seeked', () => { lastSec = -1; paint(); if (resumeBox && resumeBox.mode === 'auto' && Math.abs(audio.currentTime - resumeBox.at) > 2) hideResume(); });
    on('loadedmetadata', () => {
      if (pendingSeek != null) { const to = pendingSeek; pendingSeek = null; seek(to); }
      $('#pl-seek', el).setAttribute('aria-valuemax', Math.floor(dur()));
      $('#pl-rest', el).title = t('player.total', { t: util.fmtDur(dur()) });
      paintChapters(); // Marker brauchen die echte Dauer
    });
    on('error', () => {
      if (!media || !audio.getAttribute('src')) return;
      ui.toast(t('player.err_play', { title: media.title || '' }), 'err');
      close();
    });
    return a;
  }

  function init(root) {
    if (el || !root) return;
    el = root;
    loadPrefs();
    el.setAttribute('aria-label', t('player.label'));
    el.innerHTML = `
      <div class="pl-resume" id="pl-resume" role="status" hidden></div>
      <div class="pl-list" id="pl-list" hidden>
        <div class="pl-list-head"><b>${t('player.tracks')}</b><span class="mono" id="pl-list-n"></span><span class="spacer"></span><span class="keys">${esc(t('player.keys'))}</span></div>
        <ol class="pl-tracks" id="pl-tracks"></ol>
      </div>
      <div class="pl-now">
        <div class="pl-cover" id="pl-cover"></div>
        <div class="pl-meta">
          <div class="pl-head"><span class="pl-title" id="pl-title"></span><span class="pl-artist" id="pl-artist"></span></div>
          <div class="pl-sub"><span id="pl-pbadge"></span><span class="pl-artist2" id="pl-artist2"></span><button type="button" class="pl-track" id="pl-track" aria-expanded="false" hidden>${I.play}<span></span></button><span class="pl-norm mono" id="pl-norm" hidden></span></div>
        </div>
      </div>
      <div class="pl-mid">
        <div class="pl-ctl">
          <button type="button" class="iconbtn" data-p="prev" title="${esc(t('player.prev'))}">${I.skip_prev}</button>
          <button type="button" class="iconbtn txt" data-p="back" title="${esc(t('player.back'))}">−30</button>
          <button type="button" class="pl-play" data-p="toggle">${I.play}</button>
          <button type="button" class="iconbtn txt" data-p="fwd" title="${esc(t('player.fwd'))}">+30</button>
          <button type="button" class="iconbtn" data-p="next" title="${esc(t('player.next'))}">${I.skip_next}</button>
        </div>
        <div class="pl-seekrow">
          <span class="pl-time" id="pl-cur">0:00</span>
          <div class="pl-seek" id="pl-seek" role="slider" tabindex="0" aria-label="${esc(t('player.seek'))}" aria-valuemin="0" aria-valuenow="0">
            <div class="pl-rail"><i class="pl-fill" id="pl-fill"></i></div>
            <canvas class="pl-wave" id="pl-wave" aria-hidden="true"></canvas><canvas class="pl-wave on" id="pl-wave-on" aria-hidden="true"></canvas>
            <div class="pl-marks" id="pl-marks"></div>
            <i class="pl-knob" id="pl-knob"></i>
            <div class="pl-tip" id="pl-tip" hidden></div>
          </div>
          <span class="pl-time rest" id="pl-rest">–</span>
        </div>
      </div>
      <div class="pl-side">
        <button type="button" class="iconbtn pl-listbtn" data-p="list" title="${esc(t('player.tracks_toggle'))}" aria-expanded="false" hidden>${I.list}<i></i></button>
        <button type="button" class="iconbtn pl-sleep" data-p="sleep" aria-haspopup="menu">${I.moon}<i></i></button>
        <button type="button" class="iconbtn" data-p="mute"></button>
        <input type="range" class="range pl-vol" id="pl-vol" min="0" max="100" step="1" aria-label="${esc(t('player.volume'))}" title="${esc(t('player.volume'))}">
        <button type="button" class="iconbtn" data-p="close" title="${esc(t('player.close'))}">${I.x}</button>
      </div>`;

    audio = makeAudio();

    el.addEventListener('click', (e) => {
      const r = e.target.closest('[data-r]');
      if (r) { answerResume(r.dataset.r); return; }
      const li = e.target.closest('#pl-tracks li');
      if (li) { gotoChapter(+li.dataset.i, true); return; }
      if (e.target.closest('#pl-track')) { setList(!listOpen); return; }
      const b = e.target.closest('[data-p]');
      if (!b || b.disabled) return;
      const a = b.dataset.p;
      if (a === 'toggle') toggle();
      else if (a === 'back') seekBy(-30);
      else if (a === 'fwd') seekBy(30);
      else if (a === 'prev') prevChapter();
      else if (a === 'next') nextChapter();
      else if (a === 'list') setList(!listOpen);
      else if (a === 'sleep') sleepMenu(b);
      else if (a === 'mute') { prefs.muted = !prefs.muted; if (!prefs.muted && prefs.volume === 0) prefs.volume = 0.5; savePrefs(); paintVolume(); }
      else if (a === 'close') close();
    });
    $('#pl-tracks', el).addEventListener('keydown', (e) => {
      const li = e.target.closest('li');
      if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); gotoChapter(+li.dataset.i, true); }
    });
    /* Klick ausserhalb schliesst die Trackliste. */
    document.addEventListener('mousedown', (e) => { if (listOpen && !el.contains(e.target)) setList(false); });

    const vol = $('#pl-vol', el);
    const setVol = (v) => { prefs.volume = clamp(v, 0, 1); prefs.muted = prefs.volume === 0; savePrefs(); paintVolume(); };
    vol.addEventListener('input', () => setVol(+vol.value / 100));
    $('.pl-side', el).addEventListener('wheel', (e) => { e.preventDefault(); setVol((prefs.muted ? 0 : prefs.volume) + (e.deltaY < 0 ? 0.05 : -0.05)); }, { passive: false });

    const sk = $('#pl-seek', el);
    sk.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !dur()) return;
      dragging = true;
      dragTime = atPointer(e).time;
      try { sk.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      sk.classList.add('drag');
      paint();
      paintTip(e);
    });
    sk.addEventListener('pointermove', (e) => {
      if (dragging) { dragTime = atPointer(e).time; paint(); }
      paintTip(e);
    });
    const drop = (e, apply) => {
      if (!dragging) return;
      dragging = false;
      sk.classList.remove('drag');
      if (apply) seek(dragTime); else paint();
      if (e.pointerType !== 'mouse') hideTip();
    };
    sk.addEventListener('pointerup', (e) => drop(e, true));
    sk.addEventListener('pointercancel', (e) => drop(e, false));
    sk.addEventListener('pointerleave', () => { if (!dragging) hideTip(); });
    sk.addEventListener('keydown', (e) => {
      if (e.key === 'Home') { e.preventDefault(); seek(0); } else if (e.key === 'End') { e.preventDefault(); seek(dur()); }
    });

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('resize', measure);
    if (window.ResizeObserver) new ResizeObserver(measure).observe(sk);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) paintState(); });
    /* Genre-Farben geändert bzw. Effekte ein/aus -> Platzhalter-Cover und Lauf des Balkens anpassen. */
    HC.bridge.on('settings_changed', () => {
      if (!media) return;
      paintMeta();
      paintState();
      applyOutput();
      if (plSet().normalize !== false && !audio.paused) ensureGraph();
      if (waveOn() && !peaks) requestWave(media.id); else drawWave();
      if (resumeMode() === 'off') hideResume();
    });
    /* v0.7.0: Analyse fertig (nach Download/Durchlauf) bzw. angeforderte Wellenform da. */
    HC.bridge.on('waveform', (d) => {
      if (!media || d.id !== media.id || !d.ok) return;
      if (d.loudness) { media.loudness = d.loudness; applyOutput(); }
      if (Array.isArray(d.peaks) && waveOn()) setPeaks(d.peaks);
    });
    HC.bridge.on('media_analysed', (d) => {
      if (!media || d.id !== media.id || !d.ok) return;
      if (d.loudness) { media.loudness = d.loudness; applyOutput(); }
      if (d.peaks && !peaks) requestWave(media.id);
    });
    window.addEventListener('beforeunload', () => savePos(false));
    document.addEventListener('visibilitychange', () => { if (document.hidden && playing()) savePos(false); });

    if ('mediaSession' in navigator) {
      const act = (name, fn) => { try { navigator.mediaSession.setActionHandler(name, fn); } catch (e) { /* nicht unterstützt */ } };
      act('play', () => { if (media && audio.paused) toggle(); });
      act('pause', () => { if (media && !audio.paused) toggle(); });
      act('seekbackward', () => seekBy(-30));
      act('seekforward', () => seekBy(30));
      act('previoustrack', prevChapter);
      act('nexttrack', nextChapter);
    }
    paintVolume();
    paintSleep();
    paintState();
  }

  HC.player = {
    init, play, playAt, toggle, close, seek, suspend, resume, release,
    pause() { if (audio && media) audio.pause(); },
    openList: (open) => { if (el && media) setList(open !== false); },
    /** -> {id, playing} – id null = nichts geladen */
    state: () => ({ id: media ? media.id : null, playing: playing() }),
    get audio() { return audio; },
    /** v0.7.0 (Diagnose/Tests): Ausgang und Zusatzzustand. */
    output: () => ({ mode: graph ? 'webaudio' : 'volume', fallback: graphBroken, watching: !!watch, gain: gainNow, fade, volume: audio ? audio.volume : 1, peaks: peaks ? peaks.length : 0, sleep: sleep ? (sleep.mode === 'end' ? 'end' : sleep.minutes) : null, sleepLeft: sleep ? sleepLeft() : null, resume: resumeBox ? resumeBox.mode : null }),
    sleep: setSleep,
    /** Review v0.7.0 M2 (Tests): reine Entscheidung des Stille-Wächters und Schwelle in ms. */
    silenceVerdict, SILENT_MS,
  };
})();
