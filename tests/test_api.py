"""js_api bridge (app/api.py): settings round trip ("nach Neustart erhalten"), German errors,
status shape = bridge.js contract, maintenance jobs, task scheduler, placeholders."""

import inspect
import json
import logging
import re
import sqlite3
import subprocess
import sys
import threading
import types
from pathlib import Path

import pytest

from app import api as api_mod
from app.api import Api
from app.core import config, i18n, maintenance
from app.core.logging_setup import live_handler
from app.core.scheduler import TaskScheduler
from app.worker import EventBus

# pre-v0.2.0 behaviour tests assert the German texts (pins the de catalog)
pytestmark = pytest.mark.usefixtures("german_messages")

ROOT = Path(__file__).resolve().parents[1]
BRIDGE = (ROOT / "ui" / "js" / "bridge.js").read_text(encoding="utf-8")


# --------------------------------------------------------------------------- fakes


class FakeWindow:
    def __init__(self):
        self.scripts = []
        self.dialogs = []
        self.dialog_result = ("D:\\Musik\\HCLoader",)

    def evaluate_js(self, script):
        self.scripts.append(script)

    def create_file_dialog(self, dialog_type, directory="", **kw):
        self.dialogs.append((dialog_type, directory))
        return self.dialog_result

    def events_of(self, etype):
        out = []
        for s in self.scripts:
            m = re.match(r'^window\.mv && window\.mv\.emit\(("(?:[^"\\]|\\.)*"), (.*)\)$', s, re.S)
            if m and json.loads(m.group(1)) == etype:
                out.append(json.loads(m.group(2)))
        return out


class FakeWatchdog:
    def __init__(self):
        self.applied = 0
        self.alive = False

    def running(self):
        return self.alive

    def apply(self):
        self.applied += 1

    def start(self):
        pass

    def stop(self):
        pass


class FakeSchtasks:
    def __init__(self):
        self.calls = []
        self.xml = []  # text of the task XML of every /Create (temp file is removed afterwards)
        self.registered = False
        self.fail = False

    def times(self):
        """HH:MM of every created task (StartBoundary in the XML)."""
        return [re.search(r"<StartBoundary>[^T]+T(\d\d:\d\d)", x).group(1) for x in self.xml]

    def __call__(self, args):
        args = list(args)
        self.calls.append(args)
        if args[1] == "/Create":
            self.xml.append(Path(args[args.index("/XML") + 1]).read_bytes().decode("utf-16"))
        if self.fail:
            return subprocess.CompletedProcess(args, 1, b"", b"FEHLER: Zugriff verweigert")
        if args[1] == "/Create":
            self.registered = True
        elif args[1] == "/Delete":
            self.registered = False
        elif args[1] == "/Query" and not self.registered:
            return subprocess.CompletedProcess(
                args, 1, b"", b"FEHLER: Das System kann die angegebene Datei nicht finden."
            )
        elif args[1] == "/Query":
            out = b'"Host","Name","Next"\r\n"PC","\\HCLoader-Watchlist","N/A"\r\n'
            return subprocess.CompletedProcess(args, 0, out, b"")
        return subprocess.CompletedProcess(args, 0, b"OK", b"")


class FakeLock:
    def release(self):
        pass


class NullClient:
    """Stands in for YtClient: no yt-dlp, no network."""

    def search(self, query, n=None, *, genre=None, year=None):
        return []

    def download(self, *a, **kw):
        raise AssertionError("no downloads in API unit tests")

    def close(self):
        pass


@pytest.fixture
def env():
    """Factory for Api instances sharing one config/db (like two app starts)."""
    made = []
    state = types.SimpleNamespace(
        window=FakeWindow(),
        schtasks=FakeSchtasks(),
        platform="win32",
        opened=[],
        browsed=[],
        probe_calls=[],
        update_calls=[],
        lock_free=True,
    )

    def probe(mode, port):
        state.probe_calls.append((mode, port))
        if mode == "off":
            return {"ok": False, "state": "inactive", "detail": "aus", "ms": 0}
        return {"ok": True, "state": "active", "detail": "Provider bereit", "ms": 12}

    def updater(on_line=None):
        state.update_calls.append(1)
        on_line("Successfully installed yt-dlp-2099.1.1")
        return {"ok": True, "ytdlp": "2099.1.1", "plugin": "9.9", "changed": True, "output": "x"}

    def make(**kw):
        bus = EventBus()
        a = Api(
            bus=bus,
            task_scheduler=TaskScheduler(run=state.schtasks, platform=state.platform),
            watchdog=kw.pop("watchdog", FakeWatchdog()),
            opener=state.opened.append,
            browser=state.browsed.append,
            probe=probe,
            update_runner=updater,
            update_checker=kw.pop("update_checker", lambda: {"ok": True, "packages": {}}),
            run_lock=lambda: FakeLock() if state.lock_free else None,
            client_factory=kw.pop("client_factory", NullClient),
            configure_logging=False,
            **kw,
        )
        bus.attach(state.window, ready=True)
        made.append(a)
        return a

    state.make = make
    yield state
    for a in made:
        a.shutdown()


def flush(api):
    assert api._bus.flush(5)


# --------------------------------------------------------------------------- bridge contract


def _bridge_comment_methods():
    block = BRIDGE[BRIDGE.index("AUFRUFE") : BRIDGE.index("DATENFORMEN")]
    return set(re.findall(r"^\s{5}([a-z_]+)\(", block, re.M))


def _ui_called_methods():
    names = set()
    for f in (ROOT / "ui" / "js").rglob("*.js"):
        if f.name == "mock.js":
            continue
        names |= set(re.findall(r"\b(?:call|safe)\('([a-z_]+)'", f.read_text(encoding="utf-8")))
    names.discard("name")  # documentation example in bridge.js
    return names


def _mock_methods():
    text = (ROOT / "ui" / "js" / "mock.js").read_text(encoding="utf-8")
    block = text[text.index("const api = {") : text.index("HC.mock = {")]
    return set(re.findall(r"^\s{4}([a-z_]+)(?:\(|: )", block, re.M))


def _exposed(api_cls):
    """What pywebview exposes: public callables without `_serializable = False`."""
    out = set()
    for name in dir(api_cls):
        if name.startswith("_"):
            continue
        attr = getattr(api_cls, name)
        if callable(attr) and getattr(attr, "_serializable", True):
            out.add(name)
    return out


def test_every_bridge_method_exists_on_api():
    documented = _bridge_comment_methods()
    used = _ui_called_methods()
    assert len(documented) >= 35 and used
    assert used <= documented, f"UI ruft undokumentierte Methoden: {used - documented}"
    missing = sorted(n for n in documented | used | _mock_methods() if not hasattr(Api, n))
    assert not missing, f"Api fehlt: {missing}"


def test_exposed_methods_equal_bridge_contract():
    assert _exposed(Api) == _bridge_comment_methods()


def test_pywebview_does_not_expose_internals(env):
    webview_util = pytest.importorskip("webview.util")
    a = env.make()
    src = inspect.getsource(webview_util.inject_pywebview)
    assert "get_functions" in src  # pywebview walks public attributes of the js_api object
    assert not [k for k in vars(a) if not k.startswith("_")]


def _parse_shape(text):
    """'{a, b: {c, d}, e (ISO|null)}' -> {'a': None, 'b': {'c': None, 'd': None}, 'e': None}."""
    text = re.sub(r'"[^"]*"', "", text)
    while re.search(r"\([^()]*\)", text):
        text = re.sub(r"\([^()]*\)", "", text)
    tokens = re.findall(r"[A-Za-z_]\w*|[{}:,]", text)
    pos = 0

    def obj():
        nonlocal pos
        assert tokens[pos] == "{"
        pos += 1
        out = {}
        while tokens[pos] != "}":
            key = tokens[pos]
            pos += 1
            out[key] = None
            if tokens[pos] == ":":
                pos += 1
                if tokens[pos] == "{":
                    out[key] = obj()
                else:
                    while tokens[pos] not in (",", "}"):
                        pos += 1
            if tokens[pos] == ",":
                pos += 1
        pos += 1
        return out

    return obj()


def _keys(shape, data, path=""):
    assert isinstance(data, dict), path
    assert set(data) == set(shape), f"{path}: {set(data) ^ set(shape)}"
    for k, sub in shape.items():
        if sub:
            _keys(sub, data[k], f"{path}.{k}")


def test_status_shape_matches_bridge(env):
    m = re.search(r"^\s+Status\s+(\{.*?\}\})\s*$", BRIDGE, re.M | re.S)
    shape = _parse_shape(m.group(1))
    assert {"po_token", "backoff", "counters", "queue_length"} <= set(shape)
    st = env.make().get_status()
    _keys(shape, st)
    json.dumps(st)
    assert st["po_token"]["state"] in ("active", "inactive", "error")
    assert st["po_token"]["mode"] == "script"
    assert st["backoff"] == {"active": False, "until": None, "level": 0, "remaining_s": 0}
    assert st["app_version"] == maintenance.app_version()


def test_versions_shape_matches_bridge(env):
    m = re.search(r"get_versions\(\)\s+->\s+(\{.*?\})", BRIDGE, re.S)
    shape = _parse_shape(m.group(1).replace("\n", " "))
    v = env.make().get_versions()
    _keys(shape, v)
    assert v["db_entries"] == 0 and v["data_dir"] == str(config.app_home())


# --------------------------------------------------------------------------- settings


CHANGES = {
    "general": {"start_view": "library", "log_level": "DEBUG", "confirm_delete": False},
    "search": {"results_count": 55},
    "filters": {
        "min_duration": 900,
        "max_duration": 7200,
        "upload_period": "30d",
        "include_keywords": ["mix", "liveset"],
        "exclude_keywords": ["trailer"],
        "match_description": True,
        "hide_done_ignored": False,
        "apply_channel_blacklist": False,
    },
    "download": {
        "audio_format": "original",
        "mp3_quality": "v0",
        "embed_cover": False,
        "write_cover_jpg": True,
        "write_cue": False,
        "write_id3_chapters": False,
    },
    "storage": {
        "target_dir": "D:\\Musik\\HC",
        "path_template": "{genre}/{channel}/{title} [{id}]",
        "max_title_length": 80,
        "max_path_length": 200,
        "artist_from_title": True,
        "title_cleanup_patterns": [r"\[4K\]"],
    },
    "throttle": {
        "sleep_requests": 5.5,
        "sleep_interval": 60,
        "max_sleep_interval": 180,
        "limit_rate_mb": 1.5,
        "max_downloads_per_run": 5,
        "max_downloads_per_day": 12,
        "max_searches_per_hour": 7,
        "backoff_initial_hours": 3,
        "backoff_max_hours": 24,
    },
    "network": {
        "po_token_mode": "http",
        "po_token_port": 4500,
        "po_token_ttl_hours": 12,
        "cookies_from_browser": "firefox",
        "proxy": "http://127.0.0.1:8080",
    },
    "schedule": {
        "watchlist_interval_hours": 12,
        "in_app_check": False,
        "entries_per_source": 50,
    },
    "appearance": {"reduce_effects": True, "scanlines": False, "pulse_bpm": 175},
    "maintenance": {"check_updates_on_start": False},
}


def _with(values, section, changes):
    out = json.loads(json.dumps(values))
    out[section].update(changes)
    return out


def test_get_settings_shape(env):
    s = env.make().get_settings()
    assert set(s) == {"values", "defaults", "language"}
    assert s["language"] in i18n.SUPPORTED
    assert s["values"] == s["defaults"] == config.defaults_dict()
    assert set(s["values"]) == set(config.SECTIONS)
    json.dumps(s)


@pytest.mark.parametrize("section", sorted(CHANGES))
def test_each_section_survives_restart(env, section):
    first = env.make()
    values = _with(first.get_settings()["values"], section, CHANGES[section])
    res = first.save_settings(values)
    assert res["ok"] is True, res
    restarted = env.make()  # new instance reads config.yaml again
    got = restarted.get_settings()["values"]
    for key, value in CHANGES[section].items():
        assert got[section][key] == value, f"{section}.{key}"
    others = {k: v for k, v in got.items() if k != section}
    assert others == {k: v for k, v in config.defaults_dict().items() if k != section}


def test_all_sections_and_genres_survive_restart(env):
    first = env.make()
    values = first.get_settings()["values"]
    for section, changes in CHANGES.items():
        values[section].update(changes)
    values["genres"]["items"] = [
        {"name": "Frenchcore", "color": "#00aaff", "keywords": ["frenchcore"], "priority": 1},
        {"name": "Hardcore", "color": "#ff1f1f", "keywords": ["gabber"], "priority": 2},
        {"name": "Unsortiert", "color": "#6b6b78", "keywords": [], "priority": 3},
    ]
    assert first.save_settings(values)["ok"]
    assert config.config_path().exists()
    got = env.make().get_settings()["values"]
    assert got == values


def test_appearance_reaches_ui_via_get_settings(env):
    a = env.make()
    v = _with(a.get_settings()["values"], "appearance", CHANGES["appearance"])
    a.save_settings(v)
    assert env.make().get_settings()["values"]["appearance"] == CHANGES["appearance"]


def test_save_returns_normalized_values_and_emits_status(env):
    a = env.make()
    v = a.get_settings()["values"]
    v["filters"]["include_keywords"] = [" mix ", "", "set"]
    v["genres"]["items"] = [g for g in v["genres"]["items"] if g["name"] != "Unsortiert"]
    res = a.save_settings(v)
    assert res["ok"]
    assert res["values"]["filters"]["include_keywords"] == ["mix", "set"]
    assert any(g["name"] == "Unsortiert" for g in res["values"]["genres"]["items"])
    flush(a)
    assert env.window.events_of("status")


@pytest.mark.parametrize(
    ("section", "changes", "key", "pattern"),
    [
        ("search", {"results_count": 0}, "search.results_count", "mindestens 1"),
        ("search", {"results_count": 101}, "search.results_count", "höchstens 100"),
        ("search", {"results_count": "viele"}, "search.results_count", "ganze Zahl"),
        ("filters", {"upload_period": "2w"}, "filters.upload_period", "Erlaubte Werte"),
        ("filters", {"min_duration": 900, "max_duration": 600}, "filters.max_duration", "Mindest"),
        (
            "throttle",
            {"sleep_interval": 100, "max_sleep_interval": 50},
            "throttle.max_sleep_interval",
            "grösser",
        ),
        (
            "throttle",
            {"backoff_initial_hours": 10, "backoff_max_hours": 5},
            "throttle.backoff_max_hours",
            "grösser",
        ),
        ("network", {"po_token_port": 80}, "network.po_token_port", "mindestens 1024"),
        ("network", {"cookies_from_browser": "opera"}, "network.cookies_from_browser", "Erlaubte"),
        ("schedule", {"task_time": "25:00"}, "schedule.task_time", "HH:MM"),
        ("storage", {"path_template": "{genre}/{title}"}, "storage.path_template", "{id}"),
        (
            "storage",
            {"path_template": "{foo} [{id}]"},
            "storage.path_template",
            "Unbekannte Platzhalter",
        ),
        (
            "storage",
            {"title_cleanup_patterns": ["("]},
            "storage.title_cleanup_patterns",
            "regulärer Ausdruck",
        ),
        ("storage", {"target_dir": ""}, "storage.target_dir", "leer"),
        ("appearance", {"pulse_bpm": 400}, "appearance.pulse_bpm", "höchstens 300"),
        ("general", {"confirm_delete": "vielleicht"}, "general.confirm_delete", "ja oder nein"),
    ],
)
def test_validation_errors_are_german_and_keyed(env, section, changes, key, pattern):
    a = env.make()
    res = a.save_settings(_with(a.get_settings()["values"], section, changes))
    assert res["ok"] is False
    assert key in res["errors"], res["errors"]
    assert re.search(pattern, res["errors"][key]), res["errors"][key]
    assert not config.config_path().exists()  # nothing saved


def test_genre_errors_point_at_rows(env):
    a = env.make()
    v = a.get_settings()["values"]
    v["genres"]["items"] = [
        {"name": "Hardcore", "color": "red", "keywords": [], "priority": 1},
        {"name": "hardcore", "color": "#ffffff", "keywords": [], "priority": 2},
        {"name": "", "color": "#ffffff", "keywords": [], "priority": 3},
    ]
    errors = a.save_settings(v)["errors"]
    assert errors["genres.items.0.color"] == "Ungültiges Format"
    assert "doppelt" in errors["genres.items.1.name"]
    assert errors["genres.items.2.name"] == "Darf nicht leer sein"


def test_save_makes_throttle_and_logging_effective(env, monkeypatch):
    calls = []
    monkeypatch.setattr(api_mod, "setup_logging", lambda level: calls.append(level))
    a = env.make()
    a._configure_logging = True
    v = _with(a.get_settings()["values"], "throttle", {"max_searches_per_hour": 3})
    v["general"]["log_level"] = "WARNING"
    a.save_settings(v)
    assert a._throttle.status()["max_searches_per_hour"] == 3
    assert calls == ["WARNING"]


def test_network_change_triggers_watchdog(env):
    wd = FakeWatchdog()
    a = env.make(watchdog=wd)
    a.save_settings(_with(a.get_settings()["values"], "appearance", {"pulse_bpm": 150}))
    assert wd.applied == 0
    a.save_settings(_with(a.get_settings()["values"], "network", {"po_token_mode": "http"}))
    assert wd.applied == 1
    assert a.get_status()["po_token"] == {
        "state": "error",
        "mode": "http",
        "detail": a.get_status()["po_token"]["detail"],
    }


def test_reset_section_and_all(env):
    a = env.make()
    v = a.get_settings()["values"]
    v["search"]["results_count"] = 77
    v["appearance"]["pulse_bpm"] = 99
    a.save_settings(v)
    assert a.reset_settings("search") == {"ok": True}
    got = env.make().get_settings()["values"]
    assert got["search"]["results_count"] == 30 and got["appearance"]["pulse_bpm"] == 99
    assert a.reset_settings() == {"ok": True}
    assert env.make().get_settings()["values"] == config.defaults_dict()
    assert a.reset_settings("nope")["ok"] is False


def test_reset_keeps_scheduled_task_state(env):
    a = env.make()
    assert a.create_task("04:30")["ok"]
    a.reset_settings()
    sched = env.make().get_settings()["values"]["schedule"]
    assert sched["task_scheduler_enabled"] is True and sched["task_time"] == "04:30"


# --------------------------------------------------------------------------- scheduler via api


def test_create_get_remove_task(env):
    a = env.make()
    st = a.get_task_status()
    assert st["registered"] is False and st["time"] == "03:00"
    res = a.create_task("05:45")
    assert res["ok"] and res["registered"] and res["time"] == "05:45"
    assert {"name", "next_run"} <= set(res)
    assert env.schtasks.calls[1][:5] == ["schtasks", "/Create", "/TN", "HCLoader-Watchlist", "/XML"]
    assert env.schtasks.times() == ["05:45"]
    saved = env.make().get_settings()["values"]["schedule"]
    assert saved["task_scheduler_enabled"] is True and saved["task_time"] == "05:45"
    assert a.get_status()["next_check"] is not None
    assert a.remove_task() == {"ok": True, "registered": False}
    assert env.make().get_settings()["values"]["schedule"]["task_scheduler_enabled"] is False


def test_task_errors(env):
    a = env.make()
    assert a.create_task("7 Uhr") == {"ok": False, "error": "Uhrzeit im Format HH:MM erwartet."}
    env.schtasks.fail = True
    res = a.create_task("03:00")
    assert res["ok"] is False and "Zugriff verweigert" in res["error"]


def test_task_only_on_windows(env):
    env.platform = "linux"
    a = env.make()
    assert "nur unter Windows" in a.create_task("03:00")["error"]
    st = a.get_task_status()
    assert st["registered"] is False and "nur unter Windows" in st["error"]
    assert a.remove_task()["ok"] is False


def test_task_switch_in_settings_form_syncs_windows_task(env):
    a = env.make()
    v = a.get_settings()["values"]
    v["schedule"].update(task_scheduler_enabled=True, task_time="02:15")
    assert a.save_settings(v)["ok"]
    assert env.schtasks.registered
    v["schedule"]["task_time"] = "02:45"
    assert a.save_settings(v)["ok"]
    assert env.schtasks.times() == ["02:15", "02:45"]
    v["schedule"]["task_scheduler_enabled"] = False
    assert a.save_settings(v)["ok"]
    assert not env.schtasks.registered


def test_task_switch_fails_with_field_error_off_windows(env):
    env.platform = "linux"
    a = env.make()
    v = a.get_settings()["values"]
    v["schedule"]["task_scheduler_enabled"] = True
    res = a.save_settings(v)
    assert res == {
        "ok": False,
        "errors": {
            "schedule.task_scheduler_enabled": "Die Aufgabenplanung gibt es nur unter Windows."
        },
    }


def test_task_removed_outside_app_is_synced(env):
    a = env.make()
    a.create_task("03:00")
    env.schtasks.registered = False  # deleted in the Windows task scheduler
    assert a.get_task_status()["registered"] is False
    assert env.make().get_settings()["values"]["schedule"]["task_scheduler_enabled"] is False


# --------------------------------------------------------------------------- maintenance


def test_update_ytdlp_runs_in_worker_and_logs(env):
    a = env.make()
    root = logging.getLogger()
    root.addHandler(live_handler())
    old = root.level
    root.setLevel(logging.INFO)
    a.start()
    try:
        res = a.update_ytdlp()
    finally:
        root.removeHandler(live_handler())
        root.setLevel(old)
    assert res["ok"] and res["ytdlp"] == "2099.1.1" and res["changed"]
    assert env.update_calls == [1]
    assert a.get_versions()["last_update_check"]
    flush(a)
    msgs = [e["msg"] for e in env.window.events_of("log")]
    assert "Successfully installed yt-dlp-2099.1.1" in msgs
    assert any(e["level"] == "ok" for e in env.window.events_of("log"))
    assert env.window.events_of("status")


def test_update_refused_during_download_run(env):
    env.lock_free = False
    res = env.make().update_ytdlp()
    assert res["ok"] is False and "Download-Lauf" in res["error"] and env.update_calls == []


def test_update_job_runs_in_worker_thread(env):
    a = env.make()
    seen = []
    a._update_runner = lambda on_line=None: (
        seen.append(threading.current_thread().name) or {"ok": True}
    )
    a.update_ytdlp()
    assert seen == ["hcloader-worker"]


def test_startup_update_check_once_per_day(env):
    checks = []

    def checker():
        checks.append(1)
        return {
            "ok": True,
            "available": True,
            "packages": {"ytdlp": {"installed": "2026.1.1", "latest": "2026.2.2", "newer": True}},
        }

    a = env.make(update_checker=checker)
    a._on_loaded()
    a._worker.submit("sync", lambda: None).result(5)
    assert checks == [1]
    flush(a)
    toasts = env.window.events_of("toast")
    assert toasts and "2026.2.2" in toasts[-1]["msg"]
    b = env.make(update_checker=checker)  # same day: no second check
    b._on_loaded()
    b._worker.submit("sync", lambda: None).result(5)
    assert checks == [1]


def test_startup_update_check_respects_setting(env):
    a = env.make()
    v = _with(a.get_settings()["values"], "maintenance", {"check_updates_on_start": False})
    a.save_settings(v)
    checks = []
    b = env.make(update_checker=lambda: checks.append(1) or {"ok": True, "packages": {}})
    b._on_loaded()
    b._worker.submit("sync", lambda: None).result(5)
    assert checks == []


def test_backup_db(env):
    a = env.make()
    a._db.add_to_blacklist("UC1", "Kanal")
    res = a.backup_db()
    assert res["ok"]
    path = Path(res["path"])
    assert path.parent == config.app_home() / "backups"
    assert re.match(r"hcloader-\d{8}-\d{6}\.db$", path.name)
    con = sqlite3.connect(path)
    try:
        assert con.execute("SELECT channel_id FROM channel_blacklist").fetchall() == [("UC1",)]
    finally:
        con.close()
    assert a.get_versions()["last_backup"]


def test_po_token_test_updates_status(env):
    a = env.make()
    res = a.test_po_token()
    assert res == {"ok": True, "state": "active", "detail": "Provider bereit", "ms": 12}
    assert env.probe_calls == [("script", 4416)]


def test_po_token_off(env):
    a = env.make()
    a.save_settings(_with(a.get_settings()["values"], "network", {"po_token_mode": "off"}))
    assert a.test_po_token()["state"] == "inactive"
    assert a.get_status()["po_token"]["state"] == "inactive"


def test_backoff_status_and_clear(env):
    a = env.make()
    a._throttle.trigger_backoff("HTTP Error 429")
    st = a.get_status()["backoff"]
    assert st["active"] and st["level"] == 1 and st["remaining_s"] > 5 * 3600 and st["until"]
    assert a.clear_backoff() == {"ok": True}
    assert a.get_status()["backoff"]["active"] is False


def test_status_counts_from_db(env):
    a = env.make()
    for i, status in enumerate(["inbox", "inbox", "queued", "downloading", "done"]):
        a._db.upsert_video({"id": f"vid{i:08d}", "title": "t", "status": status})
    st = a.get_status()
    assert st["inbox_count"] == 2 and st["queue_length"] == 2


def test_blacklist(env):
    a = env.make()
    a._db.add_to_blacklist("UC1", "Reaction Bros")
    bl = a.get_blacklist()
    assert [b["channel_id"] for b in bl] == ["UC1"] and set(bl[0]) == {
        "channel_id",
        "channel_name",
        "added",
    }
    assert a.unblock_channel("UC1") == {"ok": True}
    assert a.get_blacklist() == []


def test_open_path_and_pick_folder(env, monkeypatch):
    a = env.make()
    assert a.open_path("data") == {"ok": True}
    assert a.open_path("logs") == {"ok": True}
    assert env.opened == [config.app_home(), config.logs_dir()]
    assert a.open_path("x")["ok"] is False
    assert a.pick_folder() is None  # no window yet
    fake = types.ModuleType("webview")
    fake.FileDialog = types.SimpleNamespace(FOLDER=20)
    monkeypatch.setitem(sys.modules, "webview", fake)
    a.attach_window(env.window)
    assert a.pick_folder("%USERPROFILE%\\Music") == {"path": "D:\\Musik\\HCLoader"}
    assert env.window.dialogs[0][0] == 20
    env.window.dialog_result = None
    assert a.pick_folder() is None


def test_get_log_backlog_and_runs(env):
    a = env.make()
    root = logging.getLogger()
    root.addHandler(live_handler())
    old = root.level
    root.setLevel(logging.INFO)
    try:
        logging.getLogger("hcloader.test").warning("Etwas ist komisch")
    finally:
        root.removeHandler(live_handler())
        root.setLevel(old)
    run_id = a._db.start_run("headless")
    a._db.finish_run(run_id, found=3, downloaded=1, errors=0, note="")
    a._db.start_run("smoke")
    log = a.get_log()
    assert {"ts", "level", "msg"} == set(log["lines"][-1])
    assert log["lines"][-1]["level"] == "warn" and log["lines"][-1]["msg"] == "Etwas ist komisch"
    assert [r["kind"] for r in log["runs"]] == ["manual", "headless"]
    assert set(log["runs"][1]) == {
        "id",
        "kind",
        "started",
        "finished",
        "duration",
        "found",
        "downloaded",
        "errors",
        "note",
    }


# --------------------------------------------------------------------------- other methods


def test_db_backed_reads_and_simple_actions(env):
    a = env.make()
    db = a._db
    sid = db.add_source("channel", "Kanal", "https://www.youtube.com/@kanal")
    db.upsert_video(
        {
            "id": "abcdefghijk",
            "title": "Mix",
            "channel_id": "UC1",
            "status": "inbox",
            "source_id": sid,
        }
    )
    inbox = a.get_inbox()
    assert inbox[0]["id"] == "abcdefghijk" and inbox[0]["genre_manual"] is False
    assert set(inbox[0]) == {
        "id",
        "title",
        "channel_id",
        "channel_name",
        "duration",
        "upload_date",
        "date_approx",
        "view_count",
        "thumbnail",
        "genre",
        "genre_manual",
        "status",
        "is_live",
        "source_id",
        "platform",
        "url",
        "preview",
        "geo_blocked",
        "duplicate_of",
        # v0.3.0 festivals & series
        "edition_id",
        "suggested_edition_id",
        "stage",
        "set_type",
        "episode",
        "festival_manual",
        "festival_confidence",
    }
    assert inbox[0]["platform"] == "youtube" and inbox[0]["duplicate_of"] is None
    assert inbox[0]["source_id"] == sid
    src = a.get_sources()[0]
    assert src["new_count"] == 1 and src["enabled"] is True
    assert a.set_genre("abcdefghijk", "Hardcore") == {"ok": True}
    assert a.set_genre("abcdefghijk", "Polka")["ok"] is False
    assert a.set_video_status("abcdefghijk", "ignored") == {"ok": True}
    assert a.set_video_status("abcdefghijk", "done")["ok"] is False
    assert a.open_video("abcdefghijk") == {"ok": True}
    assert env.browsed == ["https://www.youtube.com/watch?v=abcdefghijk"]
    assert a.open_video("javascript:alert(1)")["ok"] is False
    assert a.block_channel("UC1", "Kanal") == {"ok": True}
    assert a.get_blacklist()[0]["channel_id"] == "UC1"
    assert a.delete_source(sid) == {"ok": True} and a.get_sources() == []
    flush(a)
    assert env.window.events_of("video")[-1]["status"] == "ignored"


def test_library_from_db(env, tmp_path):
    a = env.make()
    f = tmp_path / "Hardcore" / "x.mp3"
    f.parent.mkdir()
    f.write_bytes(b"0" * 2048)
    a._db.upsert_video({"id": "abcdefghijk", "title": "Mix", "channel_name": "DJ"})
    a._db.set_status("abcdefghijk", "done", file_path=str(f))
    lib = a.get_library()
    assert lib[0]["artist"] == "DJ" and lib[0]["file_path"] == str(f)
    assert set(lib[0]) == {
        "id",
        "title",
        "artist",
        "genre",
        "duration",
        "upload_date",
        "downloaded_at",
        "file_path",
        "size_mb",
        "channel_id",
        "year",
        "missing",
        "unknown",
        "has_cue",
        "platform",
        "genre_manual",
        "thumbnail",
        "festival",
        "festival_suggestion",
    }
    assert lib[0]["missing"] is False and lib[0]["has_cue"] is False
    from app.core import library

    # platform-neutral: on Windows the real revealer would start explorer.exe /select
    a._reveal = lambda p: library.reveal(p, opener=env.opened.append, platform="linux")
    assert a.open_folder("abcdefghijk") == {"ok": True} and env.opened == [f.parent]


LIBRARY_CALLS = {
    "retag": ("abcdefghijk",),
    "delete_library_item": ("abcdefghijk",),
}
PHASE4_CALLS = {
    "save_source": ({"name": "x"},),
    "check_sources": (None,),
}
PHASE3_CALLS = {
    "get_last_search": (),
    "search": ("hardcore", {"genre": None, "year": None}),
    "enqueue": (["abcdefghijk"],),
    "add_channel_source": ("UC1abcdefgh", "Kanal"),
    "get_queue": (),
    "set_queue_paused": (True,),
    "queue_move": ("abcdefghijk", 1),
    "queue_cancel": ("abcdefghijk",),
    "queue_retry": ("abcdefghijk",),
}


@pytest.mark.parametrize("name", sorted(LIBRARY_CALLS))
def test_library_actions_on_unknown_id_fail_cleanly(env, name):
    res = getattr(env.make(), name)(*LIBRARY_CALLS[name])
    json.dumps(res)
    assert res["ok"] is False and res["error"] == "Eintrag ist nicht in der Bibliothek"


def test_phase3_methods_on_empty_db(env):
    a = env.make()
    assert a.get_last_search() is None
    assert a.get_queue() == {
        "paused": False,
        "items": [],
        "blocked_reason": None,
        "blocked_code": None,
        "platform_blocked": {},
    }
    assert a.enqueue(["abcdefghijk"]) == {"ok": True, "ids": [], "skipped": 1}
    for name in ("queue_move", "queue_cancel", "queue_retry"):
        res = getattr(a, name)(*PHASE3_CALLS[name])
        assert res["ok"] is False and res["error"], name
    res = a.search("hardcore", {"genre": None, "year": None})
    assert res["ok"] is True and res["results"] == []
    assert a.set_queue_paused(True) == {"ok": True, "paused": True}
    assert a.get_status()["queue_paused"] is True


def test_every_method_json_serializable(env):
    a = env.make()
    args = {
        **LIBRARY_CALLS,
        **PHASE3_CALLS,
        **PHASE4_CALLS,
        "save_settings": (a.get_settings()["values"],),
        "reset_settings": (None,),
        "open_path": ("data",),
        "pick_folder": (None,),
        "create_task": ("03:00",),
        "unblock_channel": ("UC1",),
        "set_video_status": ("abcdefghijk", "ignored"),
        "set_genre": ("abcdefghijk", "Hardcore"),
        "open_video": ("abcdefghijk",),
        "open_url": ("https://github.com/kellerict/HCLoader/releases",),
        "block_channel": ("UC1", "x"),
        "delete_source": (1,),
        "open_folder": ("abcdefghijk",),
        "get_media": ("abcdefghijk",),
        "play_external": ("abcdefghijk",),
        "suggest_source": ("https://soundcloud.com/dj-x",),
        # v0.3.0 festivals & series
        "save_series": ({"name": "My Rave", "kind": "festival", "aliases": ["MyRave"]},),
        "delete_series": (999,),
        "set_festival": ("abcdefghijk", None),
        "reset_festival": ("abcdefghijk",),
        "detect_festival": ("Defqon.1 2019 | RED",),
    }
    for name in sorted(_bridge_comment_methods()):
        res = getattr(a, name)(*args.get(name, ()))
        json.dumps(res)


# ------------------------------------------------------------------ review minors (phase 3)


def test_task_status_unknown_is_not_persisted(env):
    """m5: schtasks failing for another reason (registered None) never changes the config."""
    a = env.make()
    assert a.create_task("03:00")["ok"]
    env.schtasks.fail = True  # e.g. access denied, not "task not found"
    st = a.get_task_status()
    assert st["registered"] is None and "Zugriff verweigert" in st["error"]
    assert env.make().get_settings()["values"]["schedule"]["task_scheduler_enabled"] is True


def test_config_write_errors_are_reported_and_task_not_created(env, monkeypatch):
    """m8: OSError while saving -> German error; the Windows task is created only after saving."""
    a = env.make()

    def boom(*args, **kw):
        raise PermissionError("gesperrt")

    monkeypatch.setattr(config, "save", boom)
    res = a.create_task("03:00")
    assert res["ok"] is False and res["error"].startswith("Speichern fehlgeschlagen")
    assert not any(c[1] == "/Create" for c in env.schtasks.calls)
    v = a.get_settings()["values"]
    v["schedule"]["task_scheduler_enabled"] = True
    res = a.save_settings(v)
    assert res["ok"] is False and not any(c[1] == "/Create" for c in env.schtasks.calls)
    res = a.reset_settings()
    assert res["ok"] is False and res["error"].startswith("Speichern fehlgeschlagen")
    assert a.remove_task()["ok"] is False


def test_failed_task_creation_rolls_config_back(env):
    a = env.make()
    env.schtasks.fail = True
    assert a.create_task("05:00")["ok"] is False
    sched = env.make().get_settings()["values"]["schedule"]
    assert sched["task_scheduler_enabled"] is False and sched["task_time"] == "03:00"


def test_maintenance_job_refused_while_another_runs(env):
    """m3: immediate German answer instead of a silent timeout behind a long update."""
    a = env.make()
    release = threading.Event()
    started = threading.Event()

    def slow():
        with a._ytdlp_gate.update():  # what _do_update holds while pip runs (n2)
            started.set()
            release.wait(5)
        return {"ok": True}

    fut = a._worker.submit("update", slow)
    assert started.wait(5)
    try:
        res = a.backup_db()
        assert res == {"ok": False, "error": "Wartung läuft gerade (Update) – bitte später erneut"}
        res = a.test_po_token()
        assert res["ok"] is False and res["state"] == "error" and "Update" in res["detail"]
        assert a.search("hardcore")["error"].startswith("Wartung läuft gerade")
    finally:
        release.set()
    assert fut.result(5) == {"ok": True}
    assert a.backup_db()["ok"] is True


def test_maintenance_job_timeout_is_reported(env, monkeypatch):
    a = env.make()
    monkeypatch.setattr(api_mod, "PO_TEST_TIMEOUT_S", 0.05)
    release = threading.Event()
    a._probe = lambda mode, port: release.wait(5) and {"ok": True, "state": "active"}
    try:
        res = a.test_po_token()
        assert res["ok"] is False and res["error"].startswith("Zeitüberschreitung")
    finally:
        release.set()


def test_update_without_loaded_ytdlp_needs_no_restart(env, monkeypatch):
    """m2: yt-dlp not imported in this process yet -> the update takes effect without restart."""
    a = env.make()
    monkeypatch.delitem(sys.modules, "yt_dlp", raising=False)
    res = a.update_ytdlp()
    assert res["ok"] and "restart_required" not in res
    assert a.get_queue()["blocked_code"] is None


def test_update_with_loaded_ytdlp_blocks_queue(env, monkeypatch):
    a = env.make()
    monkeypatch.setitem(sys.modules, "yt_dlp", types.ModuleType("yt_dlp"))
    res = a.update_ytdlp()
    assert res["ok"] and res["restart_required"] is True
    a._db.upsert_video({"id": "abcdefghijk", "title": "Mix"})
    a.enqueue(["abcdefghijk"])
    q = a.get_queue()
    assert q["blocked_code"] == "restart" and "neu starten" in q["blocked_reason"]
    flush(a)
    assert any("neu starten" in t["msg"] for t in env.window.events_of("toast"))


def test_add_channel_source(env):
    a = env.make()
    res = a.add_channel_source("UCabcdefgh123", "Partyraiser")
    assert res["ok"] and res["source"]["type"] == "channel"
    assert res["source"]["url_or_query"] == "https://www.youtube.com/channel/UCabcdefgh123"
    # n7: NULL = schedule.entries_per_source at check time
    assert res["source"]["max_entries"] is None and res["source"]["name"] == "Partyraiser"
    again = a.add_channel_source("UCabcdefgh123", "x")
    assert again["ok"] is False and "bereits" in again["error"]
    assert a.add_channel_source("../evil", "x")["ok"] is False


def test_search_validates_options_and_query(env):
    a = env.make()
    seen = []

    class Client:
        def search(self, query, n=None, *, genre=None, year=None):
            seen.append((query, genre, year))
            return []

        def close(self):
            pass

    a._client_factory = Client
    assert a.search("  ")["ok"] is False
    res = a.search("hardcore", {"genre": "Polka", "year": 1800})
    assert res["ok"] and seen[-1] == ("hardcore", None, None)
    res = a.search("hardcore", {"genre": "Uptempo", "year": "2024"})
    assert seen[-1] == ("hardcore", "Uptempo", 2024)
    assert res["effective_query"].startswith("hardcore uptempo") and res[
        "effective_query"
    ].endswith("2024")
    last = a.get_last_search()
    assert last["query"] == "hardcore" and last["genre"] == "Uptempo" and last["year"] == 2024


# --------------------------------------------------------------------------- Review Phase 3


def _queued(a, vid="abcdefghijk"):
    a._db.upsert_video({"id": vid, "title": "Mix"})
    assert a.enqueue([vid])["ids"] == [vid]
    return vid


def test_m3_broken_client_blocks_without_run_until_user_action(env):
    calls = []

    def broken():
        calls.append(1)
        raise ImportError("No module named 'yt_dlp.extractor' (proxy http://u:pw@p:1)")

    a = env.make(client_factory=broken)
    vid = _queued(a)
    a._queue.run_pending()
    q = a.get_queue()
    assert q["blocked_code"] == "error"
    assert q["blocked_reason"].startswith("Download-Modul (yt-dlp) konnte nicht geladen werden")
    assert "pw@" not in q["blocked_reason"]
    assert a._db.list_runs() == [] and calls == [1]
    a._queue.run_pending()
    a._queue.run_pending()
    assert calls == [1]  # no retry loop
    a.set_queue_paused(False)  # user action
    a._queue.run_pending()
    assert calls == [1, 1]
    assert a.save_settings(a.get_settings()["values"])["ok"]  # user action
    a._queue.run_pending()
    assert calls == [1, 1, 1]
    assert a._db.get_video(vid)["status"] == "queued" and a._db.list_runs() == []


class _RaisingClient:
    def __init__(self, exc):
        self.exc = exc

    def download(self, vid, **kw):
        assert "on_commit" in kw
        raise self.exc

    def close(self):
        pass


def test_m6_throttle_refusal_sends_video_event(env):
    from datetime import UTC, datetime, timedelta

    from app.core.throttle import BackoffActive

    exc = BackoffActive(datetime.now(UTC) + timedelta(hours=1))
    a = env.make(client_factory=lambda: _RaisingClient(exc))
    vid = _queued(a)
    a._queue.run_pending()
    flush(a)
    statuses = [e["status"] for e in env.window.events_of("video") if e["id"] == vid]
    assert statuses[-2:] == ["downloading", "queued"]
    assert not env.window.events_of("failed")


def test_m2_local_error_during_download_blocks_queue(env):
    from app.core.preflight import LocalError

    exc = LocalError("pot", "PO-Token-Server läuft nicht (wird vom Watchdog neu gestartet)")
    a = env.make(client_factory=lambda: _RaisingClient(exc))
    vid = _queued(a)
    a._queue.run_pending()
    q = a.get_queue()
    assert q["blocked_code"] == "pot"
    assert q["blocked_reason"] == (
        "PO-Token-Server läuft nicht (wird vom Watchdog neu gestartet) – "
        "Rest bleibt in der Warteschlange"
    )
    assert a._db.get_video(vid)["status"] == "queued"
    flush(a)
    assert not env.window.events_of("failed")
    assert [e["status"] for e in env.window.events_of("video") if e["id"] == vid][-1] == "queued"


def test_m2_queue_waits_for_watchdog_at_start(env):
    class SlowWatchdog:
        """First check completes after 0.2 s and finds the server running."""

        def __init__(self):
            self.ready = threading.Event()
            self.calls = []

        def running(self):
            return self.ready.is_set()

        def wait_ready(self, timeout, stop=None):
            self.calls.append(timeout)
            return self.ready.wait(timeout)

        apply = start = stop = lambda self, *a: None

    wd = SlowWatchdog()
    seen = []
    holder = {}

    class Client:
        def download(self, vid, **kw):
            seen.append(wd.running())
            holder["a"]._db.set_status(vid, "done")
            return types.SimpleNamespace(status="done", title="Mix")

        def close(self):
            pass

    a = holder["a"] = env.make(watchdog=wd, client_factory=Client)
    data = a.get_settings()["values"]
    data["network"]["po_token_mode"] = "http"
    assert a.save_settings(data)["ok"]
    _queued(a)
    threading.Timer(0.2, wd.ready.set).start()
    a._queue.run_pending()
    assert wd.calls == [api_mod.POT_START_WAIT_S] and seen == [True]


def test_n1_search_results_carry_is_live(env):
    a = env.make()

    class Client:
        def search(self, query, n=None, *, genre=None, year=None):
            base = {"title": "Hardcore Mix", "channel_name": "C", "duration": 3600}
            return [
                {**base, "id": "live1234567", "live_status": "is_live"},
                {**base, "id": "vod12345678", "live_status": "not_live"},
            ]

        def close(self):
            pass

    a._client_factory = Client
    res = a.search("hardcore")
    by_id = {v["id"]: v for v in res["results"]}
    assert by_id["live1234567"]["is_live"] is True
    assert by_id["live1234567"]["filter_reason"] == "Livestream"
    assert by_id["vod12345678"]["is_live"] is False
    last = {v["id"]: v for v in a.get_last_search()["results"]}
    assert last["live1234567"]["is_live"] is True


def test_n2_update_and_search_exclude_each_other(env):
    a = env.make()
    with a._ytdlp_gate.search():
        res = a.update_ytdlp()
    assert res["ok"] is False and res["error"].startswith("Eine Suche läuft gerade")
    assert env.update_calls == []
    with a._ytdlp_gate.update():
        assert a.search("x")["error"] == "Wartung läuft gerade (Update) – bitte später erneut"
        # a search job that was already queued when the update began is refused, too
        assert a._do_search("x", None, None)["error"].startswith("Wartung läuft gerade")


def test_n3_cancel_unknown_and_done(env):
    a = env.make()
    a._db.upsert_video({"id": "abcdefghijk", "title": "Mix", "status": "done"})
    assert a.queue_cancel("abcdefghijk") == {"ok": False, "error": "Download bereits fertig"}
    assert a.queue_cancel("zzzzzzzzzzz")["error"].startswith("Eintrag ist nicht")


def test_n4_search_error_masks_proxy_credentials(env):
    a = env.make()

    class Client:
        def search(self, *a, **k):
            raise OSError("Unable to connect to proxy http://hans:geheim@10.0.0.1:3128")

        def close(self):
            pass

    a._client_factory = Client
    root = logging.getLogger()
    root.addHandler(live_handler())
    try:
        res = a.search("hardcore")
    finally:
        root.removeHandler(live_handler())
    assert res["ok"] is False and "geheim" not in res["error"]
    assert "http://***@10.0.0.1:3128" in res["error"]
    assert all("geheim" not in e["message"] for e in live_handler().backlog)


def test_m5_shutdown_closes_db_only_after_queue_thread(env):
    a = env.make()
    order = []
    real_stop = a._queue.stop

    def stop(timeout):
        order.append(("queue", timeout))
        return real_stop(timeout)

    a._queue.stop = stop
    a._own_db = True
    real_close = a._db.close
    a._db.close = lambda: (order.append("db"), real_close())[1]
    assert a.shutdown() is True
    assert order == [("queue", api_mod.QUEUE_STOP_TIMEOUT_S), "db"]

    b = env.make()
    b._own_db = True
    b._queue.stop = lambda timeout: False  # thread did not end in time
    closed = []
    b._db.close = lambda: closed.append(1)
    b._db.upsert_video({"id": "abcdefghijk", "title": "Mix", "status": "downloading"})
    assert b.shutdown() is False
    assert closed == [] and b._db.get_video("abcdefghijk")["status"] == "queued"


# ------------------------------------------------------------------ Phase 4: watchlist


class ListClient(NullClient):
    def __init__(self, entries=None, error=None):
        self.entries, self.error = entries or {}, error

    def list_source(self, url, max_entries=None, **kw):
        if self.error:
            raise self.error
        return list(self.entries.get(url, []))


def _wait_watchlist_done(a, window, n=1):
    import time

    for _ in range(200):
        a._bus.flush(2)
        if len(window.events_of("watchlist_done")) >= n:
            return
        time.sleep(0.02)
    raise AssertionError("watchlist_done fehlt")


def test_save_source_validates_and_persists(env):
    a = env.make()
    res = a.save_source({"type": "channel", "name": "", "url_or_query": "https://x.com/a"})
    assert res["ok"] is False and set(res["errors"]) == {"name", "url_or_query"}
    ok = a.save_source(
        {
            "type": "channel",
            "name": "DJ",
            "url_or_query": "https://www.youtube.com/@dj",
            "default_genre": "Hardcore",
            "max_entries": 12,
            "auto_download": True,
        }
    )
    assert ok["ok"] and ok["source"]["max_entries"] == 12 and ok["source"]["auto_download"] is True
    assert set(ok["source"]) == {
        "id", "type", "name", "url_or_query", "default_genre", "enabled", "auto_download",
        "max_entries", "newest_last", "last_checked", "new_count", "platform", "name_auto",
    }  # fmt: skip
    assert ok["source"]["platform"] == "youtube" and ok["source"]["name_auto"] is False
    assert ok["source"]["newest_last"] is False
    pl = a.save_source(
        {
            "type": "playlist",
            "name": "PL",
            "url_or_query": "https://www.youtube.com/playlist?list=PL1",
            "newest_last": True,
        }
    )
    assert pl["ok"] and pl["source"]["newest_last"] is True
    a.delete_source(pl["source"]["id"])
    sid = ok["source"]["id"]
    # edit (extra UI fields ignored), toggle enabled
    upd = a.save_source({**ok["source"], "enabled": False, "new_count": 99, "name": "DJ2"})
    assert upd["ok"] and upd["source"]["enabled"] is False and upd["source"]["name"] == "DJ2"
    assert len(a.get_sources()) == 1 and a.get_sources()[0]["id"] == sid
    dup = a.save_source(
        {"type": "channel", "name": "B", "url_or_query": "https://www.youtube.com/@dj"}
    )
    assert "existiert bereits" in dup["errors"]["url_or_query"]
    assert a.save_source({**ok["source"], "id": 999})["ok"] is False
    assert a.save_source("x")["ok"] is False


def test_check_sources_runs_job_with_events_and_inbox(env):
    a = env.make(
        client_factory=lambda: ListClient(
            {
                "https://www.youtube.com/@dj": [
                    {
                        "id": "newvideo001",
                        "title": "Hardcore Mix",
                        "duration": 3600,
                        "channel_id": "UC1",
                    }
                ]
            }
        )
    )
    sid = a.save_source(
        {"type": "channel", "name": "DJ", "url_or_query": "https://www.youtube.com/@dj"}
    )["source"]["id"]
    res = a.check_sources(None)
    assert res == {"ok": True, "started": 1}
    _wait_watchlist_done(a, env.window)
    src = [e for e in env.window.events_of("source") if e["id"] == sid]
    assert [e["checking"] for e in src] == [True, False] and src[1]["new_count"] == 1
    assert src[1]["last_checked"]
    assert env.window.events_of("watchlist_done")[-1] == {"checked": 1, "found": 1}
    assert [v["id"] for v in a.get_inbox()] == ["newvideo001"]
    assert a.get_status()["inbox_count"] == 1
    assert a._db.list_runs()[0]["kind"] == "watchlist"
    a._wl_worker.stop()


def test_check_sources_refusals_and_empty(env):
    a = env.make()
    assert a.check_sources(None) == {"ok": True, "started": 0}
    assert a.check_sources("x")["ok"] is False and a.check_sources(["a"])["ok"] is False
    a.save_source({"type": "search", "name": "S", "url_or_query": "hardcore"})
    a._throttle.trigger_backoff("429")
    res = a.check_sources(None)
    assert res["ok"] is False and "Backoff aktiv bis" in res["error"] and res["started"] == 0


def test_check_during_headless_run_is_refused_by_watchlist_lock(env):
    a = env.make(watchlist_lock=lambda: None, client_factory=lambda: ListClient())
    a.save_source({"type": "search", "name": "S", "url_or_query": "hardcore"})
    assert a.check_sources(None)["started"] == 1
    _wait_watchlist_done(a, env.window)
    assert env.window.events_of("watchlist_done")[-1] == {"checked": 0, "found": 0}
    assert any("anderen Lauf" in t["msg"] for t in env.window.events_of("toast"))
    assert env.window.events_of("source") == []


def test_backoff_during_check_aborts_and_toasts(env):
    from datetime import UTC, datetime, timedelta

    from app.core.throttle import BackoffActive

    exc = BackoffActive(datetime.now(UTC) + timedelta(hours=6))
    a = env.make(client_factory=lambda: ListClient(error=exc))
    a.save_source({"type": "channel", "name": "A", "url_or_query": "https://www.youtube.com/@a"})
    a.save_source({"type": "channel", "name": "B", "url_or_query": "https://www.youtube.com/@b"})
    a.check_sources(None)
    _wait_watchlist_done(a, env.window)
    assert len([e for e in env.window.events_of("source") if e["checking"]]) == 1
    assert env.window.events_of("watchlist_done")[-1]["found"] == 0
    assert a._db.list_runs()[0]["note"].startswith("Backoff")


def test_in_app_next_feeds_status_and_scheduler_triggers(env):
    a = env.make(schedule_options={"start_delay": 0})
    assert a.get_status()["next_check"] is None  # no source yet
    a.save_source({"type": "search", "name": "S", "url_or_query": "hardcore"})
    assert a.get_status()["next_check"] is not None
    # settings: in_app_check off -> nothing planned
    v = a.get_settings()["values"]
    v["schedule"]["in_app_check"] = False
    assert a.save_settings(v)["ok"] and a.get_status()["next_check"] is None
    v["schedule"]["in_app_check"] = True
    a.save_settings(v)
    started = []
    a._submit_check = lambda ids, **kw: started.append((ids, kw))
    assert a._wl_sched.check_now() is True and started == [(None, {"scheduled": True})]
    a._throttle.trigger_backoff("429")
    assert a._wl_sched.check_now() is False and a._wl_sched.next_check() > a._wl_sched._clock()


def test_scheduled_check_with_busy_lock_is_silent_and_deferred(env):
    """Review Phase 4 m2: the headless task holds the watchlist lock - no toast, no
    watchlist_done, the in-app check waits 10 min and is re-evaluated then."""
    import time

    a = env.make(watchlist_lock=lambda: None, client_factory=lambda: ListClient())
    a.save_source({"type": "search", "name": "S", "url_or_query": "hardcore"})
    assert a._trigger_scheduled_check() is True
    for _ in range(100):
        if a._wl_sched._deferred is not None:
            break
        time.sleep(0.02)
    a._bus.flush(2)
    assert a._wl_sched._deferred is not None
    assert a._wl_sched.next_check() >= a._wl_sched._deferred
    assert env.window.events_of("watchlist_done") == [] and env.window.events_of("toast") == []


def test_watchlist_failure_toast_is_redacted(env):
    """n3: an unexpected error text never shows proxy credentials in the toast."""

    def boom():
        raise RuntimeError("Proxy http://user:geheim@proxy:3128 weg")

    a = env.make(client_factory=boom)
    a.save_source({"type": "search", "name": "S", "url_or_query": "hardcore"})
    a.check_sources(None)
    _wait_watchlist_done(a, env.window)
    toasts = [t["msg"] for t in env.window.events_of("toast")]
    assert any("fehlgeschlagen" in t for t in toasts)
    assert not any("geheim" in t for t in toasts)


def test_shutdown_closes_run_of_a_stuck_check(env, monkeypatch):
    """n5: the cancel event reaches the client; a check stuck in a request gets its run
    entry finished at shutdown."""
    import threading

    import app.api as api_mod

    monkeypatch.setattr(api_mod, "WATCHLIST_STOP_TIMEOUT_S", 0.2)
    entered, release = threading.Event(), threading.Event()
    got = []

    class Stuck(ListClient):
        def list_source(self, url, max_entries=None, **kw):
            got.append(kw.get("cancel_event"))
            entered.set()
            release.wait(5)  # ignores the cancel (a request without timeout)
            return []

    a = env.make(client_factory=lambda: Stuck())
    a._own_db = False  # keep the DB open for the assertions
    a.save_source({"type": "channel", "name": "A", "url_or_query": "https://www.youtube.com/@a"})
    a.check_sources(None)
    assert entered.wait(5)
    a.shutdown(queue_timeout=1)
    try:
        assert got and got[0] is a._wl_cancel and got[0].is_set()
        run = [r for r in a._db.list_runs() if r["kind"] == "watchlist"][0]
        assert run["finished"] and "App beendet" in run["note"]
    finally:
        release.set()


def test_search_then_channel_to_watchlist_first_check_finds_older_videos(env):
    """Review Phase 4 M1, end to end through the bridge: a mix found by a search is the 2nd
    newest video of its channel. «Kanal zur Watchlist» + first check must store the older
    videos behind it as well, and put the searched mix into the inbox for this source."""
    channel = "UCabcdefgh123"
    base = {"channel_id": channel, "channel_name": "DJ", "duration": 3600}
    listing = [
        {**base, "id": "newest00001", "title": "Hardcore Mix 4"},
        {**base, "id": "searched001", "title": "Hardcore Mix 3"},
        {**base, "id": "older000001", "title": "Hardcore Mix 2"},
        {**base, "id": "older000002", "title": "Hardcore Mix 1"},
    ]

    class Client(ListClient):
        def search(self, query, n=None, *, genre=None, year=None):
            return [{**listing[1], "live_status": "not_live"}]

    url = f"https://www.youtube.com/channel/{channel}"
    a = env.make(client_factory=lambda: Client({url: listing}))
    assert a.search("hardcore")["ok"]
    assert a._db.get_video("searched001")["status"] == "new"  # stored flat by the search
    src = a.add_channel_source(channel, "DJ")["source"]
    assert src["max_entries"] is None
    assert a.check_sources([src["id"]])["started"] == 1
    _wait_watchlist_done(a, env.window)
    assert env.window.events_of("watchlist_done")[-1] == {"checked": 1, "found": 3}
    inbox = {v["id"] for v in a._db.list_videos(status="inbox", source_id=src["id"])}
    assert inbox == {"newest00001", "searched001", "older000001", "older000002"}
    assert a.get_sources()[0]["new_count"] == 4
