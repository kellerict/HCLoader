# ruff: noqa: E501
"""v0.7.0 player UI in a real browser against the mock backend (Playwright/Chromium, skipped
if unavailable): waveform seek bar (click, drag, chapter tooltip, lazy computation, fallback,
reduced effects), loudness normalisation gain, sleep timer (minutes with fade-out, end of
set), resume (ask/auto/off), position saving, «continue listening» shelf and the
«Playback» settings tab with the analysis pass."""

from __future__ import annotations

import math

import pytest
from test_festivals_ui import (
    INDEX,
    browser,  # noqa: F401  (fixture)
)

SPY = """
window.__calls = [];
for (const name of ['save_position', 'forget_position', 'get_waveform', 'analyse_library', 'cancel_analyse_library']) {
  const orig = HC.mock.api[name];
  HC.mock.api[name] = (...args) => { window.__calls.push([name, ...args]); return orig(...args); };
}
HC.mock.speed.factor = 0.05;
true;
"""


def _open(browser, reduced=False, clock=False):  # noqa: F811
    context = browser.new_context(
        viewport={"width": 1440, "height": 900},
        locale="en-US",
        reduced_motion="reduce" if reduced else "no-preference",
    )
    p = context.new_page()
    p.messages = []
    p.on("console", lambda m: p.messages.append((m.type, m.text)))
    p.on("pageerror", lambda exc: p.messages.append(("pageerror", str(exc))))
    if clock:
        p.clock.install()
    p.goto(INDEX.as_uri() + "?mock=1&nosim=1&lang=en")
    p.wait_for_function("document.body.classList.contains('ready')")
    p.evaluate(SPY)
    return context, p


def _close(context, p):
    bad = [m for m in p.messages if m[0] in ("error", "pageerror") or "[i18n] missing" in m[1]]
    context.close()
    assert bad == []


@pytest.fixture
def page(browser):  # noqa: F811
    context, p = _open(browser)
    yield p
    _close(context, p)


@pytest.fixture
def clock_page(browser):  # noqa: F811
    context, p = _open(browser, clock=True)
    yield p
    _close(context, p)


@pytest.fixture
def reduced_page(browser):  # noqa: F811
    context, p = _open(browser, reduced=True)
    yield p
    _close(context, p)


def _library(pg):
    pg.click('.nav-item[data-view="library"]')
    pg.wait_for_selector("#lib-body tr[data-id]")


def _play(pg, vid, *, freeze=True):
    pg.click(f'#lib-body tr[data-id="{vid}"] [data-act="play"]')
    pg.wait_for_function(f"HC.player.state().id === '{vid}'")
    if freeze:
        # metadata loaded: a seek lands at once instead of waiting as pendingSeek
        pg.wait_for_function("HC.player.state().playing && HC.player.audio.readyState >= 1")
        pg.evaluate("HC.player.audio.playbackRate = 0")


def _set(pg, section, values):
    pg.evaluate(
        "([s, v]) => { Object.assign(HC.settings.values[s], v); HC.bridge.emit('settings_changed', {}); }",
        [section, values],
    )


def _calls(pg, name):
    return [c[1:] for c in pg.evaluate("window.__calls") if c[0] == name]


# --------------------------------------------------------------------------- waveform


def test_waveform_seek_click_drag_and_tooltip(page):
    _library(page)
    _play(page, "eEuph0ric26")
    page.wait_for_selector("#pl-seek.has-wave")
    assert page.is_hidden("#player .pl-rail")
    assert page.evaluate("HC.player.output().peaks") == 1600
    # the base canvas really has bars drawn on it
    painted = page.evaluate(
        "(() => { const c = document.getElementById('pl-wave'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;"
        " let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n / (d.length / 4); })()"
    )
    assert 0.2 < painted < 0.9
    box = page.locator("#pl-seek").bounding_box()
    page.mouse.click(box["x"] + box["width"] * 0.6, box["y"] + box["height"] / 2)
    page.wait_for_function("Math.abs(HC.player.audio.currentTime - 0.6 * 12) < 0.35")
    # the played part follows (clip-path of the bright canvas)
    clip = page.evaluate("document.getElementById('pl-wave-on').style.clipPath")
    assert clip.startswith("inset(0px 40") or clip.startswith("inset(0 40") or "40." in clip
    # hover: tooltip with the chapter name at that position
    page.mouse.move(box["x"] + box["width"] * 0.3, box["y"] + box["height"] / 2)
    page.wait_for_selector("#pl-tip:not([hidden])")
    assert "Warehouse Anthem" in page.inner_text("#pl-tip")  # 3.6 s: chapter 3 (3.0-4.5 s)
    # drag from 20 % to 45 %
    page.mouse.move(box["x"] + box["width"] * 0.2, box["y"] + 4)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"] * 0.45, box["y"] + 4, steps=5)
    page.mouse.up()
    assert abs(page.evaluate("HC.player.audio.currentTime") - 0.45 * 12) < 0.35
    # chapter marks are drawn on top of the waveform
    assert page.locator("#pl-marks i:not([hidden])").count() == 7


def test_waveform_lazy_pending_event_and_loudness(page):
    _library(page)
    # hold the «waveform» event until the gain before the analysis has been checked
    page.evaluate(
        "(() => { const orig = window.mv.emit; window.__held = [];"
        " window.mv.emit = (t, d) => (t === 'waveform' ? window.__held.push([t, d]) : orig(t, d));"
        " window.__release = () => { window.mv.emit = orig; window.__held.forEach(([t, d]) => orig(t, d)); };"
        " })()"
    )
    _play(page, "tTerrNight1")  # not analysed in the mock: no peaks, no loudness yet
    page.wait_for_function("window.__held.length === 1")
    assert page.evaluate("HC.player.output().gain") == 1
    assert page.is_hidden("#pl-norm")
    page.evaluate("window.__release()")
    page.wait_for_selector("#pl-seek.has-wave")  # arrives via the «waveform» event
    assert _calls(page, "get_waveform") == [["tTerrNight1"]]
    page.wait_for_function("HC.player.output().gain < 1")  # loudness came with it
    assert page.is_visible("#pl-norm")


def test_waveform_setting_off_falls_back_to_bar(page):
    _library(page)
    _play(page, "eEuph0ric26")
    page.wait_for_selector("#pl-seek.has-wave")
    _set(page, "player", {"waveform": False})
    page.wait_for_selector("#pl-seek:not(.has-wave)")
    assert page.is_visible("#player .pl-rail")
    _set(page, "player", {"waveform": True})
    page.wait_for_selector("#pl-seek.has-wave")


def test_waveform_respects_reduced_effects(reduced_page):
    pg = reduced_page
    _library(pg)
    _play(pg, "eEuph0ric26")
    pg.wait_for_selector("#pl-seek.has-wave")
    assert not pg.evaluate("document.getElementById('pl-seek').classList.contains('wave-in')")


# --------------------------------------------------------------------------- loudness


def test_normalisation_gain_target_and_peak_limit(page):
    _library(page)
    _play(page, "eEuph0ric26")
    lo = page.evaluate("HC.mock.api.get_media('eEuph0ric26').then(r => r.loudness)")
    out = page.evaluate("HC.player.output()")
    expected = min(10 ** ((-18 - lo["lufs"]) / 20), 1 / lo["peak"])
    assert out["gain"] == pytest.approx(expected, rel=1e-6)
    db = 20 * math.log10(expected)
    assert page.inner_text("#pl-norm").replace("−", "-").startswith(f"{db:.1f}"[:3])
    _set(page, "player", {"target_lufs": -6})  # louder than the set: limited by the true peak
    assert page.evaluate("HC.player.output().gain") == pytest.approx(1 / lo["peak"], rel=1e-6)
    _set(page, "player", {"normalize": False})
    assert page.evaluate("HC.player.output().gain") == 1
    assert page.is_hidden("#pl-norm")


# --------------------------------------------------------------------------- sleep timer


def test_sleep_timer_minutes_fade_and_stop(clock_page):
    pg = clock_page
    _library(pg)
    _play(pg, "eEuph0ric26")
    pg.click("#player [data-p=sleep]")
    pg.wait_for_selector(".menu")
    labels = pg.locator(".menu button").all_inner_texts()
    assert [x.split("\n")[0] for x in labels] == [
        "15 min",
        "30 min",
        "45 min",
        "60 min",
        "End of this set",
    ]
    pg.click('.menu [data-k="sleep-15"]')
    assert pg.evaluate("HC.player.output().sleep") == 15
    assert pg.inner_text("#player [data-p=sleep] i") == "15′"
    assert "on" in pg.get_attribute("#player [data-p=sleep]", "class")
    pg.clock.fast_forward("14:55")
    pg.wait_for_function("HC.player.output().fade < 1")
    fade = pg.evaluate("HC.player.output().fade")
    assert 0 < fade < 0.6
    pg.clock.fast_forward(6000)
    pg.wait_for_function("HC.player.output().sleep === null")
    assert pg.evaluate("HC.player.audio.paused")
    assert pg.evaluate("HC.player.output().fade") == 1  # next play is at full volume again
    pg.wait_for_selector("#toasts .toast")
    assert "playback stopped" in pg.inner_text("#toasts")
    assert pg.inner_text("#player [data-p=sleep] i") == ""


def test_sleep_timer_end_of_set_and_off(page):
    _library(page)
    _play(page, "eEuph0ric26", freeze=False)
    page.click("#player [data-p=sleep]")
    page.click('.menu [data-k="sleep-end"]')
    assert page.evaluate("HC.player.output().sleep") == "end"
    page.click("#player [data-p=sleep]")
    assert page.locator('.menu [data-k="sleep-end"] .cur').count() == 1
    page.click('.menu [data-k="sleep-off"]')
    assert page.evaluate("HC.player.output().sleep") is None
    page.click("#player [data-p=sleep]")
    page.click('.menu [data-k="sleep-end"]')
    page.evaluate("HC.player.seek(HC.player.audio.duration - 4)")
    page.wait_for_function("HC.player.output().fade < 0.6")
    page.wait_for_function("HC.player.output().sleep === null", timeout=10000)
    assert page.evaluate("HC.player.output().fade") == 1


# --------------------------------------------------------------------------- resume / memory


def test_resume_ask_resume_and_start_over(page):
    _library(page)
    page.click('#lib-body tr[data-id="kRawNation4"] [data-act="play"]')
    page.wait_for_selector("#pl-resume:not([hidden]) [data-r=resume]")
    assert page.evaluate("HC.player.audio.paused")  # waits for the answer
    assert "0:08" in page.inner_text("#pl-resume")
    page.click("#pl-resume [data-r=resume]")
    page.wait_for_function("HC.player.state().playing")
    page.wait_for_function("Math.abs(HC.player.audio.currentTime - 8.05) < 0.5")
    assert page.is_hidden("#pl-resume")
    page.evaluate("HC.player.close()")
    page.click('#lib-body tr[data-id="zZrhPod0006"] [data-act="play"]')
    page.wait_for_selector("#pl-resume:not([hidden]) [data-r=restart]")
    page.click("#pl-resume [data-r=restart]")
    page.wait_for_function("HC.player.state().playing")
    assert page.evaluate("HC.player.audio.currentTime") < 1.5


def test_resume_auto_and_off(page):
    _library(page)
    _set(page, "player", {"resume": "auto"})
    page.click('#lib-body tr[data-id="kRawNation4"] [data-act="play"]')
    page.wait_for_function("HC.player.state().playing")
    page.wait_for_function("Math.abs(HC.player.audio.currentTime - 8.05) < 0.6")
    assert page.evaluate("HC.player.output().resume") == "auto"
    assert page.locator("#pl-resume [data-r=resume]").count() == 0
    assert "Resumed at" in page.inner_text("#pl-resume")
    page.evaluate("HC.player.close(); window.__calls = []")
    _set(page, "player", {"resume": "off"})
    page.click('#lib-body tr[data-id="zZrhPod0006"] [data-act="play"]')
    page.wait_for_function("HC.player.state().playing")
    assert page.is_hidden("#pl-resume")
    assert page.evaluate("HC.player.audio.currentTime") < 1.5
    page.evaluate("HC.player.pause()")
    page.wait_for_timeout(200)
    assert _calls(page, "save_position") == []  # «off» remembers nothing


def test_jump_from_tracklist_skips_the_prompt(page):
    _library(page)
    page.evaluate("HC.player.playAt({id: 'kRawNation4'}, 3)")
    page.wait_for_function("HC.player.state().playing")
    assert page.is_hidden("#pl-resume")
    page.wait_for_function("Math.abs(HC.player.audio.currentTime - 3) < 0.5")


def test_position_saved_on_pause_and_close(page):
    _library(page)
    _play(page, "eEuph0ric26", freeze=False)
    page.evaluate("HC.player.seek(6.5)")
    page.evaluate("HC.player.pause()")
    page.wait_for_function("window.__calls.some(c => c[0] === 'save_position')")
    vid, at, dur = _calls(page, "save_position")[-1]
    assert vid == "eEuph0ric26" and abs(at - 6.5) < 0.5 and dur == pytest.approx(12, abs=0.1)
    page.evaluate("HC.player.close()")
    assert len(_calls(page, "save_position")) >= 2


# --------------------------------------------------------------------------- continue listening


def test_continue_listening_shelf(page):
    _library(page)
    page.wait_for_selector("#lib-continue:not([hidden]) .cl-card")
    ids = page.eval_on_selector_all("#lib-continue [data-cl]", "n => n.map(x => x.dataset.cl)")
    assert ids == ["gGabbClassM", "kRawNation4", "zZrhPod0006", "rIndoorCls2", "cIndVol016"]
    first = page.locator("#lib-continue .cl-card").first
    assert "1:12:43" in first.inner_text() and "left" in first.inner_text()
    # one row only (horizontal), never wraps under the first card
    tops = page.eval_on_selector_all("#lib-continue .cl-card", "n => n.map(x => x.offsetTop)")
    assert len(set(tops)) == 1
    # forget
    first.hover()
    first.locator("[data-forget]").click()
    assert _calls(page, "forget_position") == [["gGabbClassM"]]
    page.wait_for_function("document.querySelectorAll('#lib-continue [data-cl]').length === 5")
    assert page.locator('#lib-continue [data-cl="gGabbClassM"]').count() == 0
    # click = resume without asking
    page.click('#lib-continue [data-cl="kRawNation4"]')
    page.wait_for_function("HC.player.state().playing")
    assert page.is_hidden("#pl-resume")
    page.wait_for_function("Math.abs(HC.player.audio.currentTime - 8.05) < 0.6")
    # hidden while searching
    page.fill("#lib-q", "gabber")
    page.wait_for_selector("#lib-continue", state="hidden")
    page.fill("#lib-q", "")
    page.wait_for_selector("#lib-continue:not([hidden])")
    # hidden with resume «off»
    _set(page, "player", {"resume": "off"})
    page.wait_for_selector("#lib-continue", state="hidden")


# --------------------------------------------------------------------------- settings tab


def test_playback_settings_tab_and_analysis_pass(page):
    page.click('.nav-item[data-view="settings"]')
    page.click('.stab[data-tab="playback"]')
    page.wait_for_selector('[data-custom=analysis] [data-an="new"]')
    for k in (
        "player.mode",
        "player.normalize",
        "player.target_lufs",
        "player.resume",
        "player.waveform",
        "loudness.analyse_after_download",
        "loudness.write_tags",
        "loudness.waveforms",
    ):
        assert page.locator(f'.field[data-k="{k}"]').count() == 1, k
    assert page.locator('.stab[data-tab="general"]').count() == 1
    assert "3" in page.inner_text('[data-custom=analysis] [data-an="new"]')
    page.click('[data-custom=analysis] [data-an="new"]')
    page.wait_for_selector("#toasts .toast.ok")
    assert _calls(page, "analyse_library") == [[{"scope": "new"}]]
    assert "3 files" in page.inner_text("#toasts")
    page.wait_for_function(
        "document.querySelector('[data-custom=analysis] .st-title').textContent.includes('75 of 75')"
    )
    # target loudness out of range -> field error from validation
    inp = page.locator('.field[data-k="player.target_lufs"] input')
    inp.fill("-40")
    inp.dispatch_event("change")
    page.click("#btn-save")
    page.wait_for_selector('.field[data-k="player.target_lufs"].has-error')


# --------------------------------------------------------------------------- review v0.7.0 M1/M2

SILENT_GRAPH_STUB = """
window.__gains = [];
window.__atSource = null;
const AC = window.AudioContext;
const cg = AC.prototype.createGain;
AC.prototype.createGain = function () { const g = cg.call(this); window.__gains.push(g); return g; };
const cms = AC.prototype.createMediaElementSource;
AC.prototype.createMediaElementSource = function (el) {
  window.__atSource = window.__gains.map((g) => g.gain.value);
  return cms.call(this, el);
};
if (window.__silent) {
  const ca = AC.prototype.createAnalyser;
  AC.prototype.createAnalyser = function () {
    const a = ca.call(this);
    a.getFloatTimeDomainData = (buf) => buf.fill(0);  // tainted source: only zeros
    return a;
  };
}
true;
"""


def test_silence_verdict_decision_logic(page):
    v = page.evaluate(
        """() => {
      const f = HC.player.silenceVerdict, L = HC.player.SILENT_MS, out = {};
      const run = (samples) => { const st = { silent: 0, verified: false }; return samples.map(([s, dt]) => f(st, s, dt)); };
      const play = { rms: 0, playing: true, muted: false, advanced: true };
      out.limit = L;
      out.silent = run([[play, 500], [play, 500], [play, 500]]);
      out.signal = run([[play, 500], [{ ...play, rms: 0.01 }, 500], [play, 5000]]);
      out.paused = run([[{ ...play, playing: false }, 5000], [{ ...play, muted: true }, 5000], [{ ...play, advanced: false }, 5000]]);
      out.mixed = run([[play, 1000], [{ ...play, playing: false }, 9000], [play, 400], [play, 100]]);
      return out;
    }"""
    )
    assert v["limit"] == 1500
    assert v["silent"] == ["wait", "wait", "broken"]
    assert v["signal"] == ["wait", "ok", "ok"]  # once verified, never dropped
    assert v["paused"] == ["wait", "wait", "wait"]  # pause/mute/stalled say nothing
    assert v["mixed"] == ["wait", "wait", "wait", "broken"]  # only playing time counts


def _graph_page(browser, silent):  # noqa: F811
    context, p = _open(browser)
    p.evaluate(f"window.__silent = {'true' if silent else 'false'}; true")
    p.evaluate(SILENT_GRAPH_STUB)
    return context, p


def test_graph_starts_at_target_gain_and_stays_when_audio_flows(browser):  # noqa: F811
    context, p = _graph_page(browser, silent=False)
    try:
        _library(p)
        _play(p, "eEuph0ric26", freeze=False)
        p.wait_for_function("HC.player.output().mode === 'webaudio'")
        out = p.evaluate("HC.player.output()")
        vol = p.evaluate("HC.player.audio.volume")
        # m1: both gains already at their targets when the source is connected (no loud blip)
        at = p.evaluate("window.__atSource")
        assert at[0] == pytest.approx(out["gain"], rel=1e-5) and at[0] < 1
        assert at[1] == pytest.approx(0.8, rel=1e-5) and vol == 1
        p.wait_for_function("!HC.player.output().watching", timeout=5000)
        assert p.evaluate("HC.player.output()")["fallback"] is False
        assert p.evaluate("HC.player.output().mode") == "webaudio"
    finally:
        _close(context, p)


def test_silent_graph_falls_back_to_plain_element(browser):  # noqa: F811
    """M2: a graph that only outputs zeros is replaced by a new element at the same spot."""
    context, p = _graph_page(browser, silent=True)
    try:
        _library(p)
        _play(p, "eEuph0ric26", freeze=False)
        p.wait_for_function("HC.player.output().mode === 'webaudio'")
        p.evaluate("window.__first = HC.player.audio; true")
        p.wait_for_function("HC.player.output().fallback === true", timeout=6000)
        out = p.evaluate("HC.player.output()")
        assert out["mode"] == "volume" and not out["watching"]
        assert p.evaluate("HC.player.audio !== window.__first")
        assert p.evaluate("!window.__first.getAttribute('src')")  # old element released
        p.wait_for_function("HC.player.state().playing && HC.player.audio.currentTime > 0.5")
        assert p.evaluate("HC.player.state().id") == "eEuph0ric26"
        # volume mode only attenuates: element volume = volume x min(gain, 1) <= 1
        assert p.evaluate("HC.player.audio.volume") == pytest.approx(
            0.8 * min(out["gain"], 1), rel=1e-5
        )
        assert p.is_visible(".toast")
        # pause/play on the new element still works; the graph is not built again
        p.evaluate("HC.player.toggle()")
        p.wait_for_function("!HC.player.state().playing")
        p.evaluate("HC.player.toggle()")
        p.wait_for_function("HC.player.state().playing")
        assert p.evaluate("HC.player.output().mode") == "volume"
    finally:
        _close(context, p)


def test_player_reports_the_loaded_set_to_the_backend(page):
    """M1: the backend learns which file is open (no tag write into it)."""
    page.evaluate(
        "(() => { const o = HC.mock.api.set_now_playing; HC.mock.api.set_now_playing = (...a) => { window.__calls.push(['set_now_playing', ...a]); return o(...a); }; })()"
    )
    _library(page)
    _play(page, "eEuph0ric26")
    page.evaluate("HC.player.toggle()")  # pause: still loaded, nothing new reported
    page.evaluate("HC.player.close()")
    page.wait_for_function("window.__calls.filter(c => c[0] === 'set_now_playing').length >= 2")
    assert _calls(page, "set_now_playing") == [["eEuph0ric26"], [None]]
