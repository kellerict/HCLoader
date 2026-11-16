import subprocess
from datetime import datetime, timedelta

import pytest

from app.core import scheduler
from app.core.scheduler import SchedulerError, SchedulerUnavailable, TaskScheduler

CSV_HEADER = (
    '"Hostname","Aufgabenname","Nächste Laufzeit","Status","Anmeldemodus",'
    '"Letzte Laufzeit","Letztes Ergebnis","Autor","Auszuführende Aufgabe"'
)


class FakeSchtasks:
    """Records schtasks calls; behaves like a tiny task store."""

    def __init__(self, *, fail_create=False, next_run="17.11.2026 03:00:00"):
        self.calls = []
        self.registered = False
        self.fail_create = fail_create
        self.next_run = next_run

    def __call__(self, args):
        args = list(args)
        self.calls.append(args)
        assert args[0] == "schtasks"
        op = args[1]
        if op == "/Create":
            if self.fail_create:
                return subprocess.CompletedProcess(
                    args, 1, b"", "FEHLER: Zugriff verweigert".encode("cp850")
                )
            self.registered = True
            return subprocess.CompletedProcess(args, 0, b"ERFOLGREICH", b"")
        if op == "/Query":
            if not self.registered:
                return subprocess.CompletedProcess(
                    args, 1, b"", b"FEHLER: Das System kann die angegebene Datei nicht finden."
                )
            row = f'"PC","\\HCLoader-Watchlist","{self.next_run}","Bereit","Interaktiv"'
            out = f"{CSV_HEADER}\r\n{row}\r\n".encode("cp850")
            return subprocess.CompletedProcess(args, 0, out, b"")
        if op == "/Delete":
            self.registered = False
            return subprocess.CompletedProcess(args, 0, b"ERFOLGREICH", b"")
        raise AssertionError(op)


def make(fake=None, **kw):
    fake = fake or FakeSchtasks()
    return TaskScheduler(run=fake, platform="win32", **kw), fake


def test_create_uses_daily_trigger_and_wrapper():
    sched, fake = make(executable=r"C:\HC\.venv\Scripts\python.exe")
    st = sched.create("03:30")
    create = fake.calls[0]
    assert create[:9] == [
        "schtasks",
        "/Create",
        "/SC",
        "DAILY",
        "/ST",
        "03:30",
        "/TN",
        "HCLoader-Watchlist",
        "/TR",
    ]
    assert create[-1] == "/F"
    tr = create[9]
    assert tr.endswith('run_watchlist.pyw"') and tr.startswith('"')
    assert "python" in tr.lower()
    assert st.registered and st.name == "\\HCLoader-Watchlist" and st.time == "03:30"
    assert st.next_run.startswith("2026-11-17T03:00:00")


def test_wrapper_script_exists_and_runs_headless_watchlist():
    text = scheduler.wrapper_script().read_text(encoding="utf-8")
    assert '"--headless", "--run-watchlist"' in text
    assert "sys.path.insert(0" in text  # schtasks has no working directory


def test_pythonw_preferred(tmp_path):
    py = tmp_path / "python.exe"
    py.write_text("")
    assert scheduler.pythonw_path(str(py)) == py  # no pythonw next to it
    (tmp_path / "pythonw.exe").write_text("")
    assert scheduler.pythonw_path(str(py)) == tmp_path / "pythonw.exe"


def test_query_not_registered():
    sched, _ = make()
    st = sched.query("03:00")
    assert st.to_dict() == {
        "registered": False,
        "name": "HCLoader-Watchlist",
        "next_run": None,
        "time": "03:00",
    }


def test_query_parses_english_dates_and_falls_back():
    fake = FakeSchtasks(next_run="11/17/2026 3:00:00 AM")
    fake.registered = True
    sched, _ = make(fake)
    assert sched.query().next_run.startswith("2026-11-17T03:00:00")
    fake.next_run = "N/A"
    st = sched.query("04:15")
    assert st.registered and st.time == "04:15" and "T04:15:00" in st.next_run


def test_delete():
    sched, fake = make()
    sched.create("03:00")
    sched.delete()
    assert ["schtasks", "/Delete", "/TN", "HCLoader-Watchlist", "/F"] in fake.calls
    assert not sched.query().registered


def test_create_failure_has_german_message():
    sched, _ = make(FakeSchtasks(fail_create=True))
    with pytest.raises(SchedulerError, match="nicht angelegt.*Zugriff verweigert"):
        sched.create("03:00")


def test_invalid_time():
    sched, fake = make()
    for bad in ("3:00", "24:00", "12:60", "", None, "abc"):
        with pytest.raises(SchedulerError, match="HH:MM"):
            sched.create(bad)
    assert fake.calls == []


def test_too_long_command(monkeypatch):
    sched, fake = make()
    monkeypatch.setattr(scheduler, "task_command", lambda exe=None: "x" * 300)
    with pytest.raises(SchedulerError, match="zu lang"):
        sched.create("03:00")
    assert fake.calls == []


def test_not_windows():
    sched = TaskScheduler(run=FakeSchtasks(), platform="linux")
    assert not sched.available
    for call in (lambda: sched.create("03:00"), sched.delete, sched.query):
        with pytest.raises(SchedulerUnavailable, match="nur unter Windows"):
            call()


def test_subprocess_error():
    def boom(args):
        raise FileNotFoundError("schtasks")

    sched = TaskScheduler(run=boom, platform="win32")
    with pytest.raises(SchedulerError, match="nicht ausgeführt"):
        sched.query()


def test_next_daily():
    now = datetime(2026, 11, 16, 9, 15).astimezone()
    assert scheduler.next_daily("10:00", now) == now.replace(hour=10, minute=0)
    assert scheduler.next_daily("09:15", now) == now.replace(hour=9, minute=15) + timedelta(days=1)
    assert scheduler.next_daily("03:00", now).date() == (now + timedelta(days=1)).date()
