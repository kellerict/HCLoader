import json
import logging
import re
import threading
import time
from types import SimpleNamespace

import pytest

from app import worker
from app.instance import ActivationServer, request_activation
from app.worker import (
    EventBus,
    LogForwarder,
    PotWatchdog,
    RunBusy,
    Worker,
    event_script,
    run_session,
)

_SCRIPT_RE = re.compile(r'^window\.mv && window\.mv\.emit\(("(?:[^"\\]|\\.)*"), (.*)\)$', re.S)


class FakeWindow:
    def __init__(self):
        self.scripts = []
        self._lock = threading.Lock()

    def evaluate_js(self, script):
        with self._lock:
            self.scripts.append(script)


def parse(script):
    m = _SCRIPT_RE.match(script)
    assert m, script
    return json.loads(m.group(1)), json.loads(m.group(2))


# --------------------------------------------------------------------------- escaping


@pytest.mark.parametrize(
    "data",
    [
        {"msg": "Quote \" and ' and \\ backslash"},
        {"msg": "Zeile 1\nZeile 2\r\n\tTab"},
        {"msg": "</script><script>alert(1)</script>"},
        {"msg": "Line" + chr(0x2028) + "Sep" + chr(0x2029) + "Para"},
        {"msg": "Zürich – Ümlaut ß 🎧"},
        {"msg": "${injection} `backtick`"},
        {"nested": [1, 2.5, None, True, {"a": "b"}]},
        None,
    ],
)
def test_event_script_is_json_safe(data):
    script = event_script("log", data)
    assert script.isascii()  # no raw U+2028/2029, no raw newlines
    assert "\n" not in script and "\r" not in script
    etype, payload = parse(script)
    assert etype == "log"
    assert payload == ({} if data is None else data)


def test_event_script_escapes_type_and_non_json_values():
    from datetime import datetime
    from pathlib import Path

    etype, payload = parse(
        event_script('x"); alert(1); ("', {"p": Path("a"), "d": datetime(2026, 1, 1)})
    )
    assert etype == 'x"); alert(1); ("'
    assert payload["p"] == "a" and payload["d"].startswith("2026-01-01")


# --------------------------------------------------------------------------- bus


def test_bus_delivers_in_order_after_ready():
    bus, win = EventBus(), FakeWindow()
    bus.emit("toast", {"msg": "zu früh"})  # no window -> dropped
    bus.attach(win)
    bus.emit("toast", {"msg": "noch nicht geladen"})  # not ready -> dropped
    bus.mark_ready()
    for i in range(5):
        bus.emit("progress", {"i": i})
    assert bus.flush()
    assert [parse(s)[1]["i"] for s in win.scripts] == list(range(5))
    bus.close()


def test_bus_thread_safety_many_emitters():
    bus, win = EventBus(), FakeWindow()
    bus.attach(win, ready=True)
    n_threads, per_thread = 16, 150

    def producer(t):
        for i in range(per_thread):
            bus.emit("log", {"t": t, "i": i, "msg": f'Thread {t} "{i}"\n'})

    threads = [threading.Thread(target=producer, args=(t,)) for t in range(n_threads)]
    for th in threads:
        th.start()
    for th in threads:
        th.join()
    assert bus.flush(10)
    events = [parse(s)[1] for s in win.scripts]
    assert len(events) == n_threads * per_thread and bus.dropped == 0
    for t in range(n_threads):  # order per producer is preserved
        assert [e["i"] for e in events if e["t"] == t] == list(range(per_thread))
    bus.close()


def test_bus_survives_window_errors_and_python_listeners():
    class Broken:
        def evaluate_js(self, script):
            raise RuntimeError("window closed")

    bus = EventBus()
    seen = []
    bus.subscribe(lambda t, d: seen.append((t, d)))
    bus.subscribe(lambda t, d: 1 / 0)  # broken listener is ignored
    bus.attach(Broken(), ready=True)
    bus.emit("status", {"a": 1})
    assert bus.flush()
    assert seen == [("status", {"a": 1})]
    bus.close()


def test_bus_drops_when_queue_full():
    bus = EventBus(max_queue=1)
    bus._window, bus._ready = FakeWindow(), threading.Event()
    bus._ready.set()  # ready but no dispatcher thread -> queue fills up
    bus.emit("a")
    bus.emit("b")
    assert bus.dropped == 1


# --------------------------------------------------------------------------- log forwarding


def test_log_forwarder_level_mapping():
    to = LogForwarder.to_line
    base = {"ts": 0.0, "logger": "hcloader", "message": "m"}
    assert to({**base, "level": "DEBUG"})["level"] == "debug"
    assert to({**base, "level": "INFO"})["level"] == "info"
    assert to({**base, "level": "WARNING"})["level"] == "warn"
    assert to({**base, "level": "ERROR"})["level"] == "error"
    assert to({**base, "level": "CRITICAL"})["level"] == "error"
    assert to({**base, "level": "INFO", "ui_level": "ok"})["level"] == "ok"
    line = to({**base, "level": "INFO"})
    assert line == {"ts": "1970-01-01T00:00:00+00:00", "level": "info", "msg": "m"}
    assert not LogForwarder.wanted({"logger": "pywebview"})
    assert not LogForwarder.wanted({"logger": "app.worker"})
    assert LogForwarder.wanted({"logger": "hcloader.api"})


def test_log_forwarder_streams_live_records():
    from app.core.logging_setup import live_handler

    root = logging.getLogger()
    root.addHandler(live_handler())
    old_level = root.level
    root.setLevel(logging.INFO)
    bus, win = EventBus(), FakeWindow()
    bus.attach(win, ready=True)
    fwd = LogForwarder(bus)
    fwd.start()
    try:
        worker.log_ok(logging.getLogger("hcloader.test"), "Fertig %s", "x")
        logging.getLogger("hcloader.test").warning("Achtung")
        logging.getLogger("pywebview").warning("intern")
        assert bus.flush()
        lines = [parse(s)[1] for s in win.scripts]
        assert [(lv["level"], lv["msg"]) for lv in lines] == [
            ("ok", "Fertig x"),
            ("warn", "Achtung"),
        ]
        assert {"level": "ok", "msg": "Fertig x"}.items() <= fwd.backlog()[-2].items()
    finally:
        fwd.stop()
        root.removeHandler(live_handler())
        root.setLevel(old_level)
        bus.close()


# --------------------------------------------------------------------------- worker


def test_worker_runs_jobs_in_background_thread():
    w = Worker()
    names = []
    fut = w.submit("a", lambda: names.append(threading.current_thread().name) or 42)
    assert fut.result(5) == 42
    assert names == ["hcloader-worker"]
    assert threading.current_thread().name != names[0]
    w.stop()


def test_worker_deduplicates_same_key_and_is_sequential():
    w = Worker()
    gate = threading.Event()
    order = []

    def slow():
        gate.wait(5)
        order.append("slow")
        return "slow"

    f1 = w.submit("update", slow)
    f2 = w.submit("update", slow)
    f3 = w.submit("backup", lambda: order.append("backup") or "b")
    assert f1 is f2 and w.busy("update")
    gate.set()
    assert f1.result(5) == "slow" and f3.result(5) == "b"
    assert order == ["slow", "backup"]  # one thread, FIFO
    assert not w.busy("update")
    w.stop()


def test_worker_propagates_exceptions_and_run_inline():
    w = Worker()
    with pytest.raises(ZeroDivisionError):
        w.run("x", lambda: 1 / 0, timeout=5)
    # run() from inside the worker thread does not deadlock
    assert w.run("outer", lambda: w.run("inner", lambda: "ok"), timeout=5) == "ok"
    w.stop()
    with pytest.raises(RuntimeError):
        w.submit("late", lambda: 1).result(1)


# --------------------------------------------------------------------------- run session


class FakeThrottle:
    def __init__(self):
        self.calls = []

    def start_run(self):
        self.calls.append("start")

    def finish_run(self, success):
        self.calls.append(("finish", success))


class FakeLock:
    def __init__(self):
        self.released = False

    def release(self):
        self.released = True


def test_run_session_success_and_failure():
    th, lock = FakeThrottle(), FakeLock()
    with run_session(th, acquire=lambda: lock) as run:
        run.success = True
    assert th.calls == ["start", ("finish", True)] and lock.released

    th, lock = FakeThrottle(), FakeLock()
    with pytest.raises(ValueError), run_session(th, acquire=lambda: lock):
        raise ValueError
    assert th.calls == ["start", ("finish", False)] and lock.released


def test_run_session_busy():
    th = FakeThrottle()
    with pytest.raises(RunBusy), run_session(th, acquire=lambda: None):
        pass
    assert th.calls == []


def test_run_session_uses_real_run_lock():
    from app.core import locks

    held = locks.acquire_run_lock()
    try:
        with pytest.raises(RunBusy), run_session(FakeThrottle()):
            pass
    finally:
        held.release()
    with run_session(FakeThrottle()):
        assert locks.acquire_run_lock() is None  # held for the whole run


# --------------------------------------------------------------------------- PO-token watchdog


class FakeServer:
    instances = []

    def __init__(self, port, ok=True):
        self.port, self.ok, self.alive, self.starts = port, ok, False, 0
        FakeServer.instances.append(self)

    def start(self):
        self.starts += 1
        self.alive = self.ok
        return self.ok

    def running(self):
        return self.alive

    def stop(self):
        self.alive = False


def _settings(mode="http", port=4416):
    return SimpleNamespace(
        network=SimpleNamespace(po_token_mode=mode, po_token_port=port, po_token_ttl_hours=6.0)
    )


def test_watchdog_starts_restarts_and_stops():
    FakeServer.instances = []
    cfg = {"s": _settings("http")}
    changes = []
    wd = PotWatchdog(
        lambda: cfg["s"], server_factory=FakeServer, on_change=lambda: changes.append(1)
    )
    wd.check()
    assert wd.running() and FakeServer.instances[0].starts == 1
    FakeServer.instances[0].alive = False  # crashed
    wd.check()
    assert wd.running() and FakeServer.instances[0].starts == 2
    cfg["s"] = _settings("http", 5000)  # port changed -> new server
    wd.check()
    assert wd.server.port == 5000 and not FakeServer.instances[0].alive
    cfg["s"] = _settings("script")
    wd.check()
    assert not wd.running() and wd.server is None
    assert changes
    wd.stop()


def test_watchdog_gives_up_after_failures_until_apply():
    attempts = []

    def factory(port):
        s = FakeServer(port, ok=False)
        attempts.append(s)
        return s

    wd = PotWatchdog(lambda: _settings("http"), server_factory=factory, max_failures=2)
    for _ in range(5):
        wd.check()
    assert sum(s.starts for s in attempts) == 2
    wd.apply()
    wd.check()
    assert sum(s.starts for s in attempts) == 3
    wd.stop()


def test_watchdog_thread_reacts_to_apply():
    FakeServer.instances = []
    cfg = {"s": _settings("off")}
    wd = PotWatchdog(lambda: cfg["s"], server_factory=FakeServer, interval=60)
    wd.start()
    cfg["s"] = _settings("http")
    wd.apply()
    deadline = time.monotonic() + 5
    while not wd.running() and time.monotonic() < deadline:
        time.sleep(0.02)
    assert wd.running()
    wd.stop()
    assert not FakeServer.instances[-1].alive


# --------------------------------------------------------------------------- single instance


def test_activation_roundtrip(tmp_path):
    shown = threading.Event()
    path = tmp_path / "activation.json"
    server = ActivationServer(shown.set, path=path)
    assert server.start()
    try:
        assert request_activation(path) is True
        assert shown.wait(2)
        data = json.loads(path.read_text())
        data["token"] = "wrong"
        bad = tmp_path / "bad.json"
        bad.write_text(json.dumps(data))
        shown.clear()
        assert request_activation(bad) is False
        assert not shown.is_set()
    finally:
        server.stop()
    assert not path.exists()
    assert request_activation(path) is False  # no running instance


def test_second_start_requests_activation(monkeypatch):
    from app import main as app_main
    from app.core import locks

    calls = []
    monkeypatch.setattr("app.instance.request_activation", lambda: calls.append(1) or True)
    monkeypatch.setattr(app_main, "run_gui", lambda: 0)
    first = locks.acquire_single_instance()
    try:
        assert app_main.main([]) == 0
    finally:
        first.release()
    assert calls == [1]
