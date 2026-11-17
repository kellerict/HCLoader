"""Release notes in the update dialog (ui/js/markdown.js, ui/js/updater.js) in a real browser
(Playwright/Chromium, skipped if unavailable): safe Markdown rendering and the short view."""

import os
from pathlib import Path

import pytest

from tests.test_bridge_js import CHROMIUM_OFFLINE_ARGS

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "ui" / "index.html"


@pytest.fixture(scope="module")
def page():
    sync_api = pytest.importorskip("playwright.sync_api")
    candidates = []
    if os.environ.get("HCLOADER_CHROMIUM"):
        candidates.append({"executable_path": os.environ["HCLOADER_CHROMIUM"]})
    if Path("/opt/pw-browsers/chromium").exists():
        candidates.append({"executable_path": "/opt/pw-browsers/chromium"})
    candidates += [{}, {"channel": "msedge"}]
    env = {k: v for k, v in os.environ.items() if "proxy" not in k.lower()}
    with sync_api.sync_playwright() as pw:
        browser = None
        for kw in candidates:
            try:
                browser = pw.chromium.launch(**kw, args=CHROMIUM_OFFLINE_ARGS, env=env)
                break
            except Exception:
                continue
        if browser is None:
            pytest.skip("no Chromium for Playwright")
        pg = browser.new_page()
        pg.problems = []
        pg.on("pageerror", lambda e: pg.problems.append(str(e)))
        pg.on(
            "console",
            lambda m: pg.problems.append(m.text) if "[i18n] missing" in m.text else None,
        )
        pg.on("dialog", lambda d: (pg.problems.append(f"dialog: {d.message}"), d.dismiss()))
        pg.goto(INDEX.as_uri() + "?mock=1&nosim=1&lang=en")
        pg.wait_for_function("document.body.classList.contains('ready')")
        yield pg
        browser.close()


def render(page, md: str) -> str:
    return page.evaluate("md => HC.md.render(md)", md)


# Renders into a detached-from-layout but live container, so that anything executable would run.
PROBE = """md => {
  window.__xss = 0;
  const host = document.createElement('div');
  host.innerHTML = HC.md.render(md);
  document.body.appendChild(host);
  const all = Array.from(host.querySelectorAll('*'));
  const uniq = list => Array.from(new Set(list)).sort();
  const out = {
    tags: uniq(all.map(e => e.tagName.toLowerCase())),
    attrs: uniq(all.flatMap(e => e.getAttributeNames())),
    hrefs: Array.from(host.querySelectorAll('a')).map(a => a.getAttribute('href')),
    text: host.textContent,
  };
  host.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => e.preventDefault());
    a.click();
  });
  return new Promise(r => setTimeout(() => { host.remove(); out.xss = window.__xss; r(out); }, 50));
}"""

ALLOWED_TAGS = {
    *("a", "blockquote", "code", "del", "div", "em", "h3", "h4", "h5", "hr", "li", "ol", "p"),
    *("pre", "strong", "table", "tbody", "td", "th", "thead", "tr", "ul"),
}
ALLOWED_ATTRS = {"class", "href", "target", "rel", "start"}

XSS_CASES = [
    "<script>window.__xss = 1</script>",
    '- item <img src=x onerror="window.__xss=1">',
    "## <svg onload=window.__xss=1>",
    "[click](javascript:window.__xss=1)",
    "[click](JaVaScRiPt:window.__xss=1)",
    "[click](  javascript:window.__xss=1 )",
    "[click](data:text/html,<script>window.__xss=1</script>)",
    "[click](vbscript:x)",
    "[click](http://example.com/plain)",
    "[click](//example.com/protocol-relative)",
    "[click](https://user:pw@example.com/)",
    '[click](https://example.com/" onmouseover="window.__xss=1)',
    '[click](https://example.com/ "t" onclick=window.__xss=1)',
    "[click](https://example.com/'onclick='window.__xss=1)",
    '[x" onclick="window.__xss=1](https://example.com/)',
    '<https://example.com/"onclick="window.__xss=1>',
    'https://example.com/"><script>window.__xss=1</script>',
    '![img](https://example.com/x.png" onerror="window.__xss=1)',
    "`<script>window.__xss=1</script>`",
    "```\n<script>window.__xss=1</script>\n```",
    "| a | b |\n|---|---|\n| <script>window.__xss=1</script> | <b onclick=window.__xss=1>x</b> |",
    "> <iframe src=javascript:window.__xss=1></iframe>",
    "**<a href=javascript:window.__xss=1>x</a>**",
    "1. <style>*{display:none}</style>",
    "<!-- c --><script>window.__xss=1</script><!-- open <script>window.__xss=1</script>",
    "[a](https://example.com/)<script>window.__xss=1</script>[b](javascript:window.__xss=1)",
    "&lt;script&gt;window.__xss=1&lt;/script&gt; &#60;script&#62;",
]


@pytest.mark.parametrize("md", XSS_CASES)
def test_markdown_never_emits_foreign_markup(page, md):
    out = page.evaluate(PROBE, md)
    assert out["xss"] == 0
    assert set(out["tags"]) <= ALLOWED_TAGS, out["tags"]
    assert set(out["attrs"]) <= ALLOWED_ATTRS, out["attrs"]
    for href in out["hrefs"]:
        assert href.startswith("https://example.com/"), href
    assert page.problems == []


def test_markdown_escapes_html_as_text(page):
    html = render(page, "Hello <b>bold</b> & <script>alert(1)</script> \"q\" 'a'")
    assert html == (
        "<p>Hello &lt;b&gt;bold&lt;/b&gt; &amp; &lt;script&gt;alert(1)&lt;/script&gt; "
        "&quot;q&quot; &#39;a&#39;</p>"
    )


def test_markdown_blocks(page):
    md = "\n".join(
        [
            "## Version",
            "### Added",
            "- one **bold** and `code <x>`",
            "- two",
            "  continued",
            "  - nested",
            "* three",
            "",
            "1. first",
            "2. second",
            "",
            "> quoted *text*",
            "",
            "---",
            "",
            "plain",
            "text",
        ]
    )
    assert render(page, md) == (
        "<h3>Version</h3><h4>Added</h4>"
        "<ul><li>one <strong>bold</strong> and <code>code &lt;x&gt;</code></li>"
        "<li>two continued<ul><li>nested</li></ul></li><li>three</li></ul>"
        "<ol><li>first</li><li>second</li></ol>"
        "<blockquote><p>quoted <em>text</em></p></blockquote><hr><p>plain text</p>"
    )


def test_markdown_table(page):
    md = "| Setting | Now |\n|---|--:|\n| `a.b` | 12 |\n| x \\| y | **3** |\n\nafter"
    assert render(page, md) == (
        '<div class="md-table"><table><thead><tr><th>Setting</th><th class="md-r">Now</th></tr>'
        '</thead><tbody><tr><td><code>a.b</code></td><td class="md-r">12</td></tr>'
        '<tr><td>x | y</td><td class="md-r"><strong>3</strong></td></tr></tbody></table></div>'
        "<p>after</p>"
    )


def test_markdown_links_https_only_and_external(page):
    html = render(page, "See [the docs](https://example.com/a?b=1&c=2) or https://example.com/x.")
    assert html == (
        '<p>See <a class="md-link" href="https://example.com/a?b=1&amp;c=2" target="_blank" '
        'rel="noopener noreferrer">the docs</a> or <a class="md-link" href="https://example.com/x" '
        'target="_blank" rel="noopener noreferrer">https://example.com/x</a>.</p>'
    )
    assert render(page, "[local](docs/RELEASING.md) [mail](mailto:a@b.c)") == "<p>local mail</p>"
    assert render(page, "snake_case_name and 2*3*4 stay") == "<p>snake_case_name and 2*3*4 stay</p>"


def test_summary_prefers_highlights_and_limits_bullets(page):
    md = "Intro text.\n\n### Added\n- a1\n\n### Highlights\n" + "\n".join(
        f"- h{i}" for i in range(1, 12)
    )
    out = page.evaluate("md => HC.md.summary(md, 8)", md)
    assert out["partial"] is True
    assert out["html"] == "<ul>" + "".join(f"<li>h{i}</li>" for i in range(1, 9)) + "</ul>"
    # bold line as heading (v0.2.0 style), nested details are left out of the short view
    out = page.evaluate(
        "md => HC.md.summary(md, 8)",
        "Text\n\n**Highlights**\n- a\n  - detail\n- b\n\n### Fixed\n- c",
    )
    assert out == {"html": "<ul><li>a</li><li>b</li></ul>", "partial": True}
    # no highlights section: first list; a lone short list is the whole text
    assert page.evaluate("HC.md.summary('### Fixed\\n- x\\n- y\\n\\n### Added\\n- z', 8)") == {
        "html": "<ul><li>x</li><li>y</li></ul>",
        "partial": True,
    }
    assert page.evaluate("HC.md.summary('- x\\n- y', 8)")["partial"] is False
    assert page.evaluate("HC.md.summary('Just a sentence.', 8)") == {
        "html": "<p>Just a sentence.</p>",
        "partial": False,
    }
    assert page.evaluate("HC.md.summary('', 8)") is None


def _open_notes(page, skipped: bool):
    page.evaluate("document.querySelector('#overlays').replaceChildren()")
    page.evaluate(f"HC.mock.demo.update('idle', null, {'true' if skipped else 'false'})")
    page.click(".upd-banner [data-upd=notes]")
    page.wait_for_selector(".upd-notes")


def test_dialog_shows_highlights_first_and_expands(page):
    _open_notes(page, skipped=False)
    visible = (
        "Array.from(document.querySelectorAll('.upd-notes li')).filter(e => e.offsetParent).length"
    )
    assert page.evaluate("document.querySelectorAll('.upd-rel').length") == 1
    assert page.inner_text(".upd-ver") == "v0.3.0"
    assert 1 <= page.evaluate(visible) <= 8
    assert not page.is_visible(".upd-notes table")
    assert page.inner_text("[data-upd-toggle]").strip().lower() == "show all changes"
    page.click("[data-upd-toggle]")
    assert page.get_attribute("[data-upd-toggle]", "aria-expanded") == "true"
    assert page.inner_text("[data-upd-toggle]").strip().lower() == "show highlights only"
    assert page.is_visible(".upd-notes table")
    assert page.evaluate(visible) > 8
    link = page.locator(".upd-gh")
    assert link.get_attribute("href") == "https://github.com/kellerict/HCLoader/releases/tag/v0.3.0"
    assert link.get_attribute("target") == "_blank"
    assert "noopener" in link.get_attribute("rel")
    # the dialog fits the window and scrolls inside
    box = page.evaluate(
        "(() => { const m = document.querySelector('.modal').getBoundingClientRect();"
        " const n = document.querySelector('.upd-notes');"
        " return {top: m.top, bottom: m.bottom, h: innerHeight,"
        " scrolls: n.scrollHeight > n.clientHeight}; })()"
    )
    assert box["top"] >= 0 and box["bottom"] <= box["h"]
    assert box["scrolls"] is True
    # Enter on the toggle must not trigger «Download»
    page.focus("[data-upd-toggle]")
    page.keyboard.press("Enter")
    assert page.is_visible(".upd-notes")
    assert page.evaluate("HC.updater.status().state") == "idle"
    page.keyboard.press("Escape")
    assert page.problems == []


def test_dialog_lists_skipped_versions_newest_first(page):
    _open_notes(page, skipped=True)
    assert page.evaluate(
        "Array.from(document.querySelectorAll('.upd-ver')).map(e => e.textContent)"
    ) == ["v0.3.0", "v0.2.2", "v0.2.1"]
    assert page.evaluate("document.querySelectorAll('.upd-date').length") == 3
    page.keyboard.press("Escape")
    page.evaluate("HC.mock.demo.update('idle')")
    assert page.problems == []


HOSTILE = """skipped => {
  window.__xss = 0;
  const x = 'window.__xss=1';
  const st = {
    state: 'idle', available: true, current: '0.2.0', url: 'javascript:' + x,
    latest: '9.9.9"><img src=x onerror=' + x + '>',
    notes: '### Highlights\\n- <img src=x onerror=' + x + '>\\n- [x](javascript:' + x + ')',
    releases: null,
  };
  if (skipped) st.releases = [{
    version: '9.9.9<script>' + x + '</script>', url: 'javascript:' + x,
    published: '<b>', notes: '<script>' + x + '</script>',
  }];
  HC.bridge.emit('update', st);
}"""


@pytest.mark.parametrize("skipped", [False, True])
def test_dialog_with_hostile_notes(page, skipped):
    page.evaluate("document.querySelector('#overlays').replaceChildren()")
    page.evaluate(HOSTILE, skipped)
    page.click(".upd-banner [data-upd=notes]")
    page.wait_for_selector(".upd-notes")
    page.wait_for_timeout(100)
    assert page.evaluate("window.__xss") == 0
    assert page.evaluate("document.querySelectorAll('.modal :is(img, script, a)').length") == 0
    assert "onerror" in page.inner_text(".modal")  # shown as text
    page.keyboard.press("Escape")
    page.evaluate("HC.mock.demo.update('idle')")
    assert page.problems == []


LINK_CLICK = """async (live) => {
  const was = HC.bridge.live;
  const hadPw = 'pywebview' in window;
  const pw = window.pywebview;
  window.__opened = [];
  window.__popups = [];
  const realOpen = window.open;
  window.open = (u) => { window.__popups.push(u); return null; };
  const openUrl = (u) => { window.__opened.push(u); return { ok: true }; };
  window.pywebview = { api: { open_url: openUrl } };
  HC.bridge.live = live;
  const host = document.createElement('div');
  host.innerHTML = HC.md.render('[notes](https://github.com/o/r/releases/tag/v1)');
  document.body.appendChild(host);
  let prevented = null;
  const spy = (e) => { prevented = e.defaultPrevented; e.preventDefault(); };
  window.addEventListener('click', spy);
  host.querySelector('a').click();
  await new Promise((r) => setTimeout(r, 50));
  window.removeEventListener('click', spy);
  host.remove();
  HC.bridge.live = was;
  window.open = realOpen;
  if (hadPw) window.pywebview = pw; else delete window.pywebview;
  return { opened: window.__opened, prevented };
}"""


def test_links_open_via_backend_in_the_app(page):
    """Hosted (live bridge): a click on a notes link goes to open_url, the WebView does not
    navigate itself. Mock/browser: the normal target=_blank stays untouched."""
    live = page.evaluate(LINK_CLICK, True)
    assert live == {"opened": ["https://github.com/o/r/releases/tag/v1"], "prevented": True}
    mock = page.evaluate(LINK_CLICK, False)
    assert mock == {"opened": [], "prevented": False}
    assert page.problems == []


HISTORY = """async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  HC.updater.historySection(host);
  await new Promise((r) => setTimeout(r, 300));
  const snap = () => ({
    ver: host.querySelector('.upd-ver').textContent,
    pos: host.querySelector('.upd-rn-pos').textContent,
    cur: !!host.querySelector('.upd-cur'),
    older: host.querySelector('[data-rn=older]').disabled,
    newer: host.querySelector('[data-rn=newer]').disabled,
    sum: host.querySelector('.upd-sum').textContent,
  });
  const opts = Array.from(host.querySelectorAll('option')).map((o) => o.textContent);
  const out = { start: snap(), opts };
  host.querySelector('[data-rn=newer]').click();
  out.newer = snap();
  const pick = host.querySelector('[data-rn-pick]');
  pick.value = '2';
  pick.dispatchEvent(new Event('change', { bubbles: true }));
  out.oldest = snap();
  host.querySelector('[data-rn=newer]').click();
  const toggle = host.querySelector('[data-rn-toggle]');
  toggle.click();
  out.expanded = host.querySelector('[data-rn-box]').classList.contains('all');
  host.remove();
  return out;
}"""


def test_settings_release_notes_browse_versions(page):
    """Maintenance › Release notes (mock get_release_notes): newest first, installed version
    selected and marked, ‹ Older / Newer › and the dropdown switch versions."""
    out = page.evaluate(HISTORY)
    assert out["opts"] == ["v0.2.1", "v0.2.0 · installed", "v0.1.0"]
    assert out["start"]["ver"] == "v0.2.0" and out["start"]["pos"] == "2 of 3"
    assert out["start"]["cur"] and "19 languages" in out["start"]["sum"]
    assert out["newer"]["ver"] == "v0.2.1" and out["newer"]["newer"] is True
    assert not out["newer"]["cur"] and "Readable release notes" in out["newer"]["sum"]
    assert out["oldest"]["ver"] == "v0.1.0" and out["oldest"]["older"] is True
    assert out["expanded"] is True
    assert page.problems == []
