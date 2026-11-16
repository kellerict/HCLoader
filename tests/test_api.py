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
from app.core import config, maintenance
from app.core.logging_setup import live_handler
from app.core.scheduler import TaskScheduler
from app.worker import EventBus

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
        self.registered = False
        self.fail = False

    def __call__(self, args):
        args = list(args)
        self.calls.append(args)
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
    assert set(s) == {"values", "defaults"}
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
    assert env.schtasks.calls[1][:6] == ["schtasks", "/Create", "/SC", "DAILY", "/ST", "05:45"]
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
    assert env.schtasks.calls[-2][5] == "02:45"
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
    }
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
    }
    assert a.open_folder("abcdefghijk") == {"ok": True} and env.opened == [f.parent]


PLACEHOLDER_CALLS = {
    "save_source": ({"name": "x"},),
    "check_sources": (None,),
    "retag": ("abcdefghijk",),
    "delete_library_item": ("abcdefghijk",),
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


@pytest.mark.parametrize("name", sorted(PLACEHOLDER_CALLS))
def test_placeholders_are_neutral(env, name):
    res = getattr(env.make(), name)(*PLACEHOLDER_CALLS[name])
    json.dumps(res)
    assert res["ok"] is False and res["error"].startswith("Folgt in Phase")


def test_phase3_methods_on_empty_db(env):
    a = env.make()
    assert a.get_last_search() is None
    assert a.get_queue() == {
        "paused": False,
        "items": [],
        "blocked_reason": None,
        "blocked_code": None,
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
        **PLACEHOLDER_CALLS,
        **PHASE3_CALLS,
        "save_settings": (a.get_settings()["values"],),
        "reset_settings": (None,),
        "open_path": ("data",),
        "pick_folder": (None,),
        "create_task": ("03:00",),
        "unblock_channel": ("UC1",),
        "set_video_status": ("abcdefghijk", "ignored"),
        "set_genre": ("abcdefghijk", "Hardcore"),
        "open_video": ("abcdefghijk",),
        "block_channel": ("UC1", "x"),
        "delete_source": (1,),
        "open_folder": ("abcdefghijk",),
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
    assert res["source"]["max_entries"] == 30 and res["source"]["name"] == "Partyraiser"
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
