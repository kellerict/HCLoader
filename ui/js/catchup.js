/* =====================================================================
   catchup.js – automatischer Nachlauf für bestehende Bibliotheken (v0.10.1)

   Nach dem GUI-Start holt das Backend einmalige Durchläufe für ältere Einträge nach
   (Festivals zuordnen, Tracklisten, Lautheit, Fingerabdrücke; docs/bridge-api.md
   «Automatic catch-up passes»). Die UI zeigt das dezent in der Statusleiste: Name des Durchlaufs
   + «n / total», ein «×» stoppt den Nachlauf für diese Sitzung (cancel_catchup). Keine Toasts.
   Events: auto_pass {phase:"step"|"end"}, plus festival_assign / tracklist_index /
   audio_analysis / fingerprint mit auto:true für den Fortschritt.
   ===================================================================== */
(function () {
  'use strict';
  const HC = window.HC;
  const t = (k, v) => HC.t(k, v);
  const EVENTS = { festival_assign: 'festivals', tracklist_index: 'tracklists', audio_analysis: 'analysis', fingerprint: 'fingerprints' };
  const cur = { step: null, done: 0, total: 0 };

  const $ = (id) => document.getElementById(id);
  function paint() {
    const it = $('sb-auto-it');
    if (!it) return;
    it.hidden = !cur.step;
    if (!cur.step) return;
    const label = t(`catchup.step.${cur.step}`);
    const num = cur.total ? ` ${Math.min(cur.done, cur.total)} / ${cur.total}` : '';
    $('sb-auto').textContent = label + num;
    it.title = t('catchup.tip');
  }

  function init() {
    HC.bridge.on('auto_pass', (d) => {
      if (!d) return;
      if (d.phase === 'step') Object.assign(cur, { step: d.step || null, done: 0, total: 0 });
      else if (d.phase === 'end') Object.assign(cur, { step: null, done: 0, total: 0 });
      paint();
    });
    Object.keys(EVENTS).forEach((ev) => {
      HC.bridge.on(ev, (d) => {
        if (!d || !d.auto) return;
        if (d.phase === 'start' || d.phase === 'progress') {
          cur.step = EVENTS[ev];
          if (d.done != null) cur.done = d.done;
          if (d.total != null) cur.total = d.total;
        } else if (cur.step === EVENTS[ev]) {
          Object.assign(cur, { done: 0, total: 0 }); // next step or «end» follows
        }
        paint();
      });
    });
    const x = $('sb-auto-x');
    if (x) {
      x.addEventListener('click', async () => {
        x.disabled = true;
        await HC.bridge.safe('cancel_catchup');
        Object.assign(cur, { step: null, done: 0, total: 0 });
        x.disabled = false;
        paint();
      });
    }
    HC.bridge.ready().then((mode) => {
      if (mode === 'error') return;
      HC.bridge.safe('get_catchup_status').then((r) => {
        if (r && r.running && !cur.step) { cur.step = r.running; paint(); }
      });
    });
  }

  HC.catchup = { state: () => Object.assign({}, cur) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
