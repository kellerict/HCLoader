"""v0.9.0 Windows notifications (core/notify.py, worker.NotificationService): aggregation, quiet
hours, minimum gap, toast content/XML, the PowerShell backend (command only, never run), the
per-user registration (fake winreg), queue/watchlist hooks, the headless run and `--open`.
No real toast is ever shown (conftest replaces the sender)."""

from __future__ import annotations

import base64
import types
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from app import headless
from app import main as app_main
from app.core import config, notify
from app.core.db import Database
from app.core.notify import ensure_registered as real_ensure_registered  # before the conftest patch
from app.instance import ActivationServer, request_activation
from app.worker import NotificationService


def cfg(**kw):
    c = config.defaults().notifications
    for k, v in kw.items():
        setattr(c, k, v)
    return c


def at(hh, mm=0):
    return datetime(2026, 11, 18, hh, mm).astimezone()


class Recorder:
    name = "test"

    def __init__(self, available=True, fail=False):
        self.shown, self._available, self.fail = [], available, fail

    def available(self):
        return self._available

    def show(self, xml):
        if self.fail:
            raise RuntimeError("blocked by policy")
        self.shown.append(xml)


@pytest.mark.parametrize(
    ("start", "end", "hour", "quiet"),
    [
        ("22:00", "07:00", 23, True),
        ("22:00", "07:00", 3, True),
        ("22:00", "07:00", 7, False),
        ("22:00", "07:00", 12, False),
        ("13:00", "14:00", 13, True),
        ("13:00", "14:00", 14, False),
        ("08:00", "08:00", 17, True),  # from == to: all day
    ],
)
def test_quiet_hours(start, end, hour, quiet):
    c = cfg(quiet_hours=True, quiet_from=start, quiet_to=end)
    assert notify.in_quiet_hours(c, at(hour)) is quiet
    assert notify.in_quiet_hours(cfg(quiet_hours=False), at(hour)) is False


def test_next_quiet_end():
    c = cfg(quiet_hours=True, quiet_from="22:00", quiet_to="07:00")
    assert notify.next_quiet_end(c, at(23)) == at(7) + timedelta(days=1)
    assert notify.next_quiet_end(c, at(3)) == at(7)
    assert notify.next_quiet_end(c, at(12)) is None


def test_add_aggregates_and_respects_switches(db):
    c = cfg()
    assert notify.add(db, c, new_sets=2)
    assert notify.add(db, c, downloaded=2, titles=["A", "B"])
    assert notify.add(db, c, downloaded=3, titles=["C", "D", "E"], failed=1, failed_titles=["X"])
    p = notify.pending(db)
    assert (p["new_sets"], p["downloaded"], p["failed"]) == (2, 5, 1)
    assert p["titles"] == ["C", "D", "E"]  # newest MAX_TITLES
    assert not notify.add(db, cfg(new_sets=False), new_sets=4)
    assert not notify.add(db, cfg(enabled=False), downloaded=1)
    assert not notify.add(db, c)
    assert notify.add(db, cfg(downloads_done=False), downloaded=9, failed=1)
    assert notify.pending(db)["downloaded"] == 5 and notify.pending(db)["failed"] == 2
    db.set_state(notify.STATE_PENDING, "{broken")
    assert notify.has_pending(notify.pending(db)) is False


def test_build_single_and_combined_messages():
    one = notify.build({**notify._empty(), "new_sets": 1})
    assert one.title == "1 new set in the inbox" and one.view == "inbox"
    done = notify.build({**notify._empty(), "downloaded": 5, "titles": ["A  set", "B", "C"]})
    assert done.title == "5 sets downloaded" and done.view == "library"
    assert done.body == "A set · B · C +2 more"
    fail = notify.build({**notify._empty(), "failed": 2, "failed_titles": ["Bad"]})
    assert fail.title == "2 downloads failed" and fail.view == "downloads"
    assert fail.body.startswith("Bad – ")
    both = notify.build({**notify._empty(), "new_sets": 3, "downloaded": 1, "failed": 1})
    assert both.title == "3 new sets in the inbox · 1 set downloaded · 1 download failed"
    assert both.view == "inbox" and both.body == "Click to open the inbox."


def test_toast_xml_is_escaped_and_launches_the_view():
    xml = notify.toast_xml(notify.Toast('A <b>&"x"', "Body & more", "downloads"))
    assert 'launch="hcloader://open/downloads" activationType="protocol"' in xml
    assert 'A &lt;b&gt;&amp;"x"' in xml and "Body &amp; more" in xml
    assert notify.launch_uri("evil://x") == "hcloader://open/inbox"


def test_flush_quiet_gap_disabled_unavailable_error(db):
    c = cfg(quiet_hours=True, quiet_from="22:00", quiet_to="07:00")
    rec = Recorder()
    assert notify.flush(db, c, rec, now=at(23))["reason"] == "empty"
    notify.add(db, c, new_sets=2)
    assert notify.flush(db, c, rec, now=at(23))["reason"] == "quiet"
    notify.add(db, c, downloaded=1, titles=["T"])  # the batch grows during the quiet hours
    res = notify.flush(db, c, rec, now=at(8))
    assert res["sent"] and len(rec.shown) == 1 and "2 new sets in the inbox · 1 set" in rec.shown[0]
    assert notify.has_pending(notify.pending(db)) is False
    notify.add(db, c, failed=1)
    gap = notify.flush(db, c, rec, now=at(8) + timedelta(seconds=30))
    assert gap["reason"] == "gap" and 80 < gap["retry_in"] <= 90
    assert notify.flush(db, c, rec, now=at(8, 5))["sent"]
    notify.add(db, c, failed=1)
    assert notify.flush(db, cfg(enabled=False), rec, now=at(12))["reason"] == "disabled"
    assert notify.has_pending(notify.pending(db)) is False
    notify.add(db, c, failed=1)
    assert notify.flush(db, c, Recorder(available=False), now=at(13))["reason"] == "unavailable"
    notify.add(db, c, failed=1)
    assert notify.flush(db, c, Recorder(fail=True), now=at(14))["reason"] == "error"
    assert notify.has_pending(notify.pending(db)) is False  # dropped, never retried in a loop


def test_powershell_sender_builds_hidden_command_and_passes_xml_by_env(tmp_path):
    calls = []

    def runner(cmd, **kw):
        calls.append((cmd, kw))
        return types.SimpleNamespace(returncode=0, stderr=b"")

    exe = tmp_path / "powershell.exe"
    s = notify.PowerShellSender(runner=runner, exe=exe)
    s.show("<toast/>")
    cmd, kw = calls[0]
    assert cmd[0] == str(exe) and "-NonInteractive" in cmd and "-EncodedCommand" in cmd
    script = base64.b64decode(cmd[-1]).decode("utf-16-le")
    assert "ToastNotificationManager" in script and "$env:HCLOADER_TOAST_XML" in script
    assert kw["env"]["HCLOADER_TOAST_XML"] == "<toast/>"
    assert kw["env"]["HCLOADER_TOAST_APPID"] == "HCLoader.App" == app_main.APP_USER_MODEL_ID
    assert kw["timeout"] == notify.PS_TIMEOUT_S and kw["check"] is False
    bad = notify.PowerShellSender(
        runner=lambda *a, **k: types.SimpleNamespace(returncode=1, stderr=b"denied"), exe=exe
    )
    with pytest.raises(RuntimeError, match="denied"):
        bad.show("<toast/>")


class FakeKey:
    def __init__(self, store, path):
        self.store, self.path = store, path

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeReg:
    HKEY_CURRENT_USER, KEY_READ, KEY_WRITE, REG_SZ = "HKCU", 1, 2, 1

    def __init__(self):
        self.values, self.writes = {}, 0

    def CreateKeyEx(self, root, path, reserved, access):  # noqa: N802 - winreg API
        return FakeKey(self, path)

    def QueryValueEx(self, key, name):  # noqa: N802
        if (key.path, name) not in self.values:
            raise OSError("missing")
        return self.values[(key.path, name)], 1

    def SetValueEx(self, key, name, reserved, kind, value):  # noqa: N802
        self.writes += 1
        self.values[(key.path, name)] = value

    def OpenKey(self, root, path, reserved=0, access=1):  # noqa: N802
        if not any(p == path for p, _ in self.values):
            raise OSError("missing key")
        return FakeKey(self, path)

    def DeleteKey(self, root, path):  # noqa: N802
        for k in [k for k in self.values if k[0] == path]:
            del self.values[k]


def test_registration_is_per_user_and_idempotent(tmp_path):
    reg = FakeReg()
    root = tmp_path / "HCLoader"
    assert real_ensure_registered(root, root / "ui" / "img" / "hcloader.ico", reg=reg) is True
    v = reg.values
    assert v[(r"Software\Classes\AppUserModelId\HCLoader.App", "DisplayName")] == "HCLoader"
    assert v[(r"Software\Classes\hcloader", "URL Protocol")] == ""
    cmd = v[(r"Software\Classes\hcloader\shell\open\command", "")]
    assert "-m" not in cmd and str(root) in cmd
    assert cmd.endswith(' --protocol "%1"') and "--open" not in cmd  # M1: last and only argument
    assert " -I -c " in cmd  # m7: isolated, no caller directory on sys.path
    first = reg.writes
    real_ensure_registered(root, root / "ui" / "img" / "hcloader.ico", reg=reg)
    assert reg.writes == first  # nothing rewritten
    assert notify.protocol_command(Path("C:/it's here")) is None


def test_notification_service_debounces_and_retries_after_gap(db):
    timers = []

    class FakeTimer:
        def __init__(self, delay, fn):
            self.delay, self.fn, self.cancelled, self.daemon = delay, fn, False, False
            timers.append(self)

        def start(self):
            pass

        def cancel(self):
            self.cancelled = True

    settings = config.defaults()
    rec = Recorder()
    registered = []
    svc = NotificationService(
        db,
        lambda: settings,
        lambda: rec,
        delay=15,
        timer_factory=FakeTimer,
        registrar=lambda: registered.append(1),
    )
    svc.note(new_sets=2)
    svc.note(downloaded=1, titles=["Set"])
    assert len(timers) == 2 and timers[0].cancelled and timers[1].delay == 15
    assert svc.flush()["sent"] and len(rec.shown) == 1 and registered == [1]
    svc.note(failed=1)
    res = timers[-1].fn()
    assert res["reason"] == "gap" and timers[-1].delay > 100  # rescheduled after the gap
    svc.tick()  # a timer is pending: nothing extra
    n = len(timers)
    svc.stop()
    svc.note(failed=1)
    assert len(timers) == n  # stopped: no new timer


def test_api_hooks_queue_runs_and_watchlist(tmp_path, monkeypatch):
    from app.api import Api
    from app.core.scheduler import TaskScheduler
    from app.worker import EventBus
    from tests.test_api import FakeLock, FakeSchtasks, FakeWatchdog, FakeWindow, NullClient

    rec = Recorder()
    bus = EventBus()
    a = Api(
        bus=bus,
        task_scheduler=TaskScheduler(run=FakeSchtasks(), platform="win32"),
        watchdog=FakeWatchdog(),
        run_lock=lambda: FakeLock(),
        client_factory=NullClient,
        configure_logging=False,
        notify_sender=lambda: rec,
        notify_delay=0,
    )
    window = FakeWindow()
    bus.attach(window, ready=True)
    try:
        a._on_queue_session_end(
            {"downloaded": 2, "errors": 1, "titles": ["One", "Two"], "failed_titles": ["Bad"]}
        )
        a._notifier.flush()
        assert len(rec.shown) == 1 and "2 sets downloaded · 1 download failed" in rec.shown[0]
        assert 'launch="hcloader://open/downloads"' in rec.shown[0]
        a.open_view("inbox")
        a.open_view("../../evil")
        assert bus.flush(5)
        assert window.events_of("navigate") == [{"view": "inbox"}]
        st = a.get_notification_status()
        assert st["ok"] and st["backend"] == "none" and st["available"] is False
        assert a.test_notification()["ok"] is False  # conftest: no real backend
        monkeypatch.setattr(notify, "_sender", rec)
        assert a.test_notification() == {"ok": True, "backend": "test"}
        assert "notifications work" in rec.shown[-1]
    finally:
        a.shutdown()


def test_download_queue_reports_one_session(db, tmp_path):
    """DownloadQueue calls on_session_end once per run with titles (no network)."""
    from app.worker import DownloadQueue, EventBus

    sessions = []
    settings = config.defaults()
    settings.storage.target_dir = str(tmp_path / "m")
    settings.throttle.sleep_interval = 0
    settings.throttle.max_sleep_interval = 0
    for i in range(3):
        db.upsert_video({"id": f"vid0000000{i}", "title": f"Mix {i}", "status": "new"})
    db.enqueue([f"vid0000000{i}" for i in range(3)])

    class Client:
        def download(self, vid, **kw):
            if vid.endswith("2"):
                db.set_status(vid, "failed", error="HTTP 403")  # as YtClient does
                return types.SimpleNamespace(status="failed", title="Mix 2", error="HTTP 403")
            db.set_status(vid, "done", file_path=str(tmp_path / f"{vid}.mp3"))
            return types.SimpleNamespace(status="done", title=f"Mix {vid[-1]}")

        def close(self):
            pass

    from app.core.throttle import Throttle

    th = Throttle(db, lambda: settings.throttle)

    class Lock:
        def release(self):
            pass

    q = DownloadQueue(
        db,
        th,
        EventBus(),
        Client,
        settings_provider=lambda: settings,
        run_lock=lambda: Lock(),
        on_session_end=sessions.append,
        record_run=False,
    )
    q.run_pending()
    assert len(sessions) == 1
    s = sessions[0]
    assert (s["downloaded"], s["errors"]) == (2, 1)
    assert s["titles"] == ["Mix 0", "Mix 1"] and s["failed_titles"] == ["Mix 2"]


def test_headless_run_shows_one_aggregated_toast(tmp_path, monkeypatch):
    settings = config.defaults()
    settings.storage.target_dir = str(tmp_path / "music")
    settings.network.po_token_mode = "off"
    settings.throttle.sleep_interval = 0
    settings.throttle.max_sleep_interval = 0
    settings.throttle.sleep_requests = 0
    db = Database(tmp_path / "h.db")
    db.add_source(
        type="channel", name="DJ", url_or_query="https://www.youtube.com/@dj", auto_download=True
    )
    db.add_source(type="channel", name="Other", url_or_query="https://www.youtube.com/@other")

    def entry(vid, title):
        return {
            "id": vid,
            "title": title,
            "duration": 3600,
            "channel": "DJ",
            "channel_id": "UC1",
            "url": f"https://www.youtube.com/watch?v={vid}",
            "live_status": "not_live",
        }

    class Client:
        def list_source(self, url, n=None, **kw):
            if "@dj" in url:
                return [entry("newAAAAAAA1", "Hardcore Mix One")]
            return [
                entry("inbAAAAAAA1", "Hardstyle Mix One"),
                entry("inbAAAAAAA2", "Hardstyle Mix Two"),
            ]

        def search(self, *a, **kw):
            return []

        def download(self, vid, **kw):
            db.set_status(vid, "done", file_path=str(tmp_path / f"{vid}.mp3"))
            return types.SimpleNamespace(status="done", title="Hardcore Mix One")

        def close(self):
            pass

    class Watchdog:
        gave_up = False

        def check(self):
            pass

        def running(self):
            return True

        def wait_ready(self, *a, **k):
            return True

        def stop(self):
            pass

    rec = Recorder()
    try:
        code = headless.run_watchlist(
            settings=settings,
            db=db,
            client_factory=Client,
            watchdog=Watchdog(),
            configure_logging=False,
            notify_sender=rec,
            run_lock=lambda: types.SimpleNamespace(release=lambda: None),
            watchlist_lock=lambda: types.SimpleNamespace(release=lambda: None),
        )
        assert code == 0
        assert len(rec.shown) == 1
        assert "2 new sets in the inbox · 1 set downloaded" in rec.shown[0]
        assert notify.has_pending(notify.pending(db)) is False
        # quiet hours: nothing shown, the batch waits in the database for the GUI / next run
        settings.notifications.quiet_hours = True
        settings.notifications.quiet_from = settings.notifications.quiet_to = "00:00"
        res = notify.notify_run(db, settings, tmp_path, sender=rec, new_sets=4)
        assert res["reason"] == "quiet" and len(rec.shown) == 1
        assert notify.pending(db)["new_sets"] == 4
    finally:
        db.close()


@pytest.mark.parametrize(
    ("arg", "view"),
    [
        ("inbox", "inbox"),
        ("hcloader://inbox", "inbox"),
        ("hcloader:downloads/", "downloads"),
        ("HCLOADER://Stats/", "stats"),
        ("hcloader://../x", None),
        ("", None),
        (None, None),
    ],
)
def test_open_argument(arg, view):
    assert app_main.view_arg(arg) == view


def test_open_view_is_handed_out_once(tmp_path):
    from app.api import Api
    from app.core.scheduler import TaskScheduler
    from tests.test_api import FakeLock, FakeSchtasks, FakeWatchdog, NullClient

    a = Api(
        task_scheduler=TaskScheduler(run=FakeSchtasks(), platform="win32"),
        watchdog=FakeWatchdog(),
        run_lock=lambda: FakeLock(),
        client_factory=NullClient,
        configure_logging=False,
    )
    try:
        a.set_open_view("inbox")
        assert a.get_settings()["open_view"] == "inbox"
        assert "open_view" not in a.get_settings()  # a reload keeps the user's view
        a.set_open_view("../evil")
        assert "open_view" not in a.get_settings()
    finally:
        a.shutdown()
    assert "#" not in app_main.ui_url()


def test_activation_with_view(tmp_path):
    path = tmp_path / "activation.json"
    shown, views = [], []
    srv = ActivationServer(lambda: shown.append(1), path=path, on_view=views.append)
    assert srv.start()
    try:
        assert request_activation(path, view="inbox") is True
        assert request_activation(path, view="bad view!") is True  # shown, view ignored
        assert request_activation(path) is True
    finally:
        srv.stop()
    assert len(shown) == 3 and views == ["inbox"]


def test_second_start_with_open_forwards_view(monkeypatch):
    calls = []
    monkeypatch.setattr(app_main.locks, "acquire_single_instance", lambda: None)
    monkeypatch.setattr(
        "app.instance.request_activation", lambda view=None: calls.append(view) or True
    )
    assert app_main.main(["--open", "hcloader://inbox"]) == app_main.EXIT_OK
    assert calls == ["inbox"]


# --------------------------------------------------------------------------- review v0.9.0 M1


@pytest.fixture
def no_actions(monkeypatch):
    """Every action main() could take is replaced by a recorder; nothing real runs."""
    calls = []
    monkeypatch.setattr(app_main, "run_smoke", lambda *a, **k: calls.append(("smoke", a)) or 0)
    monkeypatch.setattr("app.headless.run_watchlist", lambda *a, **k: calls.append(("wl", a)) or 0)
    monkeypatch.setattr(app_main, "run_gui", lambda *a, **k: calls.append(("gui", a)) or 0)
    monkeypatch.setattr(
        "app.instance.request_activation",
        lambda view=None, **k: calls.append(("activate", view)) or True,
    )
    monkeypatch.setattr(app_main.locks, "acquire_single_instance", lambda: None)
    return calls


@pytest.mark.parametrize(
    ("url", "view"),
    [
        ("hcloader://open/inbox", "inbox"),
        ("hcloader://open/downloads/", "downloads"),
        ("HCLOADER://OPEN/Library", "library"),
        ("hcloader://stats", "stats"),  # v0.9.0 toast form
        ("hcloader://open/settings", None),
        ("hcloader://open/../inbox", None),
        ("hcloader://open/inbox?x=1", None),
        ("hcloader://open/inbox#y", None),
        ("hcloader://open/%69nbox", None),
        ("hcloader://open/inbox --smoke", None),
        ('hcloader://x" --smoke "https://attacker.example/a.mp3', None),
        ("hcloader://x%22%20--smoke%20%22https://attacker.example/a.mp3", None),
        ("hcloader://open/inbox\x00", None),
        ("https://open/inbox", None),
        ("hcloader:" + "/" * 70 + "inbox", None),
        ("", None),
        (None, None),
    ],
)
def test_protocol_view_allow_list(url, view):
    assert app_main.protocol_view(url) == view


@pytest.mark.parametrize(
    "argv",
    [
        # what Windows makes of an unencoded quote: extra arguments after the URL
        ["--protocol", "hcloader://x", "--smoke", "https://attacker.example/a.mp3"],
        ["--protocol", "hcloader://x", "--run-watchlist"],
        ["--protocol", "hcloader://x", "--headless", "--run-watchlist"],
        ["--protocol", "hcloader://open/inbox", "--smoke", "u"],
        ["--smoke", "u", "--protocol", "hcloader://open/inbox"],
        ["--run-watchlist", "--protocol=hcloader://open/inbox"],
        ["--protocol"],
        ["--protocol", "hcloader://open/inbox", "hcloader://open/stats"],
        ["--protocol", 'hcloader://x" --smoke "https://attacker.example/a.mp3'],
        ["--protocol", "hcloader://x%22%20--smoke%20%22https://attacker.example/a.mp3"],
        ["--protocol", "--smoke"],
        ["--protocol", "hcloader://open/settings"],
    ],
)
def test_protocol_crafted_links_do_nothing(no_actions, argv):
    assert app_main.main(argv) == app_main.EXIT_USAGE
    assert no_actions == []


def test_protocol_link_only_navigates(no_actions):
    assert app_main.main(["--protocol", "hcloader://open/downloads"]) == app_main.EXIT_OK
    assert no_actions == [("activate", "downloads")]


def test_protocol_link_starts_gui_at_view(no_actions, monkeypatch):
    class Inst:
        def release(self):
            pass

    monkeypatch.setattr(app_main.locks, "acquire_single_instance", lambda: Inst())
    monkeypatch.setattr(app_main.locks, "acquire_run_lock", lambda: None)
    assert app_main.main(["--protocol", "hcloader://open/stats"]) == 0
    assert no_actions == [("gui", ("stats",))]


@pytest.mark.parametrize(
    "argv",
    [
        ["--open", "hcloader://x", "--smoke", "u"],
        ["--smoke", "u", "--open", "inbox"],
        ["--open", "inbox", "--run-watchlist"],
        ["--open", "inbox", "--headless", "--run-watchlist"],
        ["--open", "inbox", "--headless"],
    ],
)
def test_open_refuses_other_actions(no_actions, argv):
    assert app_main.main(argv) == app_main.EXIT_USAGE
    assert no_actions == []


def test_parser_takes_no_abbreviations(no_actions):
    with pytest.raises(SystemExit):
        app_main.main(["--op", "inbox", "--smo", "u"])
    assert no_actions == []


def test_refresh_registration_rewrites_old_command(tmp_path, monkeypatch):
    monkeypatch.setattr(notify, "ensure_registered", real_ensure_registered)
    reg = FakeReg()
    root = tmp_path / "HCLoader"
    icon = root / "ui" / "img" / "hcloader.ico"
    # nothing registered: nothing is created on start
    assert notify.refresh_registration(root, icon, reg=reg) is False and reg.values == {}
    old = f'"{notify.pythonw()}" -X utf8 -c "x" --open "%1"'
    reg.values[(notify.PROTOCOL_COMMAND_KEY, "")] = old
    assert notify.refresh_registration(root, icon, reg=reg) is True
    assert reg.values[(notify.PROTOCOL_COMMAND_KEY, "")] == notify.protocol_command(root)
    assert notify.refresh_registration(root, icon, reg=reg) is False  # up to date


def test_unquotable_root_removes_old_command(tmp_path):
    reg = FakeReg()
    reg.values[(notify.PROTOCOL_COMMAND_KEY, "")] = 'x --open "%1"'
    root = Path("C:/it's here")
    assert real_ensure_registered(root, root / "i.ico", reg=reg) is False
    assert (notify.PROTOCOL_COMMAND_KEY, "") not in reg.values
    assert notify.protocol_command(Path("C:/100%")) is None


def test_toast_drops_xml_control_characters():
    toast = notify.build({**notify._empty(), "downloaded": 1, "titles": ["A\x01B\x0bC\x1f\r\nD"]})
    xml = notify.toast_xml(toast)
    assert not any(ord(c) < 32 for c in xml) and "A B C D" in xml
    fail = notify.build({**notify._empty(), "failed": 1, "failed_titles": ["X\x00\nY\x7f"]})
    assert "X Y" in fail.body and not any(ord(c) < 32 for c in notify.toast_xml(fail))


def test_flush_runs_once_across_two_connections(tmp_path):
    """m6: two processes (two connections) flush the same batch -> one toast."""
    path = tmp_path / "n.db"
    a, b = Database(path), Database(path)
    try:
        c = cfg()
        notify.add(a, c, downloaded=2)
        rec = Recorder()
        r1 = notify.flush(a, c, rec, now=at(12))
        r2 = notify.flush(b, c, rec, now=at(12))
        assert r1["sent"] is True and r2 == {"sent": False, "reason": "empty"}
        assert len(rec.shown) == 1
    finally:
        a.close()
        b.close()
