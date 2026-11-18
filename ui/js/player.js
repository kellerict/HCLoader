/* =====================================================================
   player.js – Mini-Player (Phase 8, SPEC §3.4 «Abspielen»)
   Leiste über der Statusleiste, nur sichtbar, wenn etwas geladen ist. Globales Modul
   (HC.player), an keine Ansicht gebunden: spielt beim Ansichtswechsel weiter.
   Abgespielt werden nur lokale Dateien (get_media liefert file:-URLs) – kein Streaming.

   Kapitel (aus CUE/Sidecar): Marker auf der Zeitleiste mit Tooltip, aufklappbare Trackliste,
   ⏮/⏭ = vorheriger/nächster Track, aktueller Track neben dem Titel.
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
  const emit = () => HC.bridge.emit('player', { id: media ? media.id : null, playing: playing() });

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
    if (audio) { audio.volume = prefs.volume; audio.muted = prefs.muted; }
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
  function measure() { seekW = el ? $('#pl-seek', el).clientWidth : 0; lastSec = -1; paint(); }

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
    if (!audio) return;
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
  }
  /** Mix laden und abspielen. item: LibraryItem (mindestens {id}); derselbe Mix nochmals = Play/Pause. */
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
    if (opt.paused) { audio.load(); paintState(); } else start();
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
  function init(root) {
    if (el || !root) return;
    el = root;
    loadPrefs();
    el.setAttribute('aria-label', t('player.label'));
    el.innerHTML = `
      <div class="pl-list" id="pl-list" hidden>
        <div class="pl-list-head"><b>${t('player.tracks')}</b><span class="mono" id="pl-list-n"></span><span class="spacer"></span><span class="keys">${esc(t('player.keys'))}</span></div>
        <ol class="pl-tracks" id="pl-tracks"></ol>
      </div>
      <div class="pl-now">
        <div class="pl-cover" id="pl-cover"></div>
        <div class="pl-meta">
          <div class="pl-head"><span class="pl-title" id="pl-title"></span><span class="pl-artist" id="pl-artist"></span></div>
          <div class="pl-sub"><span id="pl-pbadge"></span><span class="pl-artist2" id="pl-artist2"></span><button type="button" class="pl-track" id="pl-track" aria-expanded="false" hidden>${I.play}<span></span></button></div>
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
            <div class="pl-marks" id="pl-marks"></div>
            <i class="pl-knob" id="pl-knob"></i>
            <div class="pl-tip" id="pl-tip" hidden></div>
          </div>
          <span class="pl-time rest" id="pl-rest">–</span>
        </div>
      </div>
      <div class="pl-side">
        <button type="button" class="iconbtn pl-listbtn" data-p="list" title="${esc(t('player.tracks_toggle'))}" aria-expanded="false" hidden>${I.list}<i></i></button>
        <button type="button" class="iconbtn" data-p="mute"></button>
        <input type="range" class="range pl-vol" id="pl-vol" min="0" max="100" step="1" aria-label="${esc(t('player.volume'))}" title="${esc(t('player.volume'))}">
        <button type="button" class="iconbtn" data-p="close" title="${esc(t('player.close'))}">${I.x}</button>
      </div>`;

    audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('play', () => { paintState(); emit(); });
    audio.addEventListener('pause', () => { paintState(); paint(); emit(); });
    audio.addEventListener('ended', () => { paintState(); paint(); emit(); });
    audio.addEventListener('timeupdate', paint);
    audio.addEventListener('seeked', () => { lastSec = -1; paint(); });
    audio.addEventListener('loadedmetadata', () => {
      if (pendingSeek != null) { const to = pendingSeek; pendingSeek = null; seek(to); }
      $('#pl-seek', el).setAttribute('aria-valuemax', Math.floor(dur()));
      $('#pl-rest', el).title = t('player.total', { t: util.fmtDur(dur()) });
      paintChapters(); // Marker brauchen die echte Dauer
    });
    audio.addEventListener('error', () => {
      if (!media || !audio.getAttribute('src')) return;
      ui.toast(t('player.err_play', { title: media.title || '' }), 'err');
      close();
    });

    el.addEventListener('click', (e) => {
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
    HC.bridge.on('settings_changed', () => { if (media) { paintMeta(); paintState(); } });

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
    paintState();
  }

  HC.player = {
    init, play, playAt, toggle, close, seek, suspend, resume, release,
    pause() { if (audio && media) audio.pause(); },
    openList: (open) => { if (el && media) setList(open !== false); },
    /** -> {id, playing} – id null = nichts geladen */
    state: () => ({ id: media ? media.id : null, playing: playing() }),
    get audio() { return audio; },
  };
})();
