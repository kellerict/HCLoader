import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from app.core import scheduler
from app.core.scheduler import SchedulerError, SchedulerUnavailable, TaskScheduler

# pre-v0.2.0 behaviour tests assert the German texts (pins the de catalog)
pytestmark = pytest.mark.usefixtures("german_messages")

CSV_HEADER = (
    '"Hostname","Aufgabenname","Nächste Laufzeit","Status","Anmeldemodus",'
    '"Letzte Laufzeit","Letztes Ergebnis","Autor","Auszuführende Aufgabe"'
)


class FakeSchtasks:
    """Records schtasks calls; behaves like a tiny task store."""

    def __init__(self, *, fail_create=False, next_run="17.11.2026 03:00:00"):
        self.calls = []
        self.xml = []  # XML text of every /Create (read while the temp file still exists)
        self.registered = False
        self.fail_create = fail_create
        self.next_run = next_run

    def __call__(self, args):
        args = list(args)
        self.calls.append(args)
        assert args[0] == "schtasks"
        op = args[1]
        if op == "/Create":
            self.xml.append(Path(args[args.index("/XML") + 1]).read_bytes())
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


NS = {"t": "http://schemas.microsoft.com/windows/2004/02/mit/task"}


def parse_xml(raw: bytes) -> ET.Element:
    assert raw[:2] in (b"\xff\xfe", b"\xfe\xff")  # UTF-16 with BOM (what schtasks expects)
    return ET.fromstring(raw.decode("utf-16").split("?>", 1)[1])


def test_create_uses_xml_import_with_laptop_friendly_settings():
    sched, fake = make(executable=r"C:\HC\.venv\Scripts\python.exe")
    st = sched.create("03:30")
    create = fake.calls[0]
    assert create[:5] == ["schtasks", "/Create", "/TN", "HCLoader-Watchlist", "/XML"]
    assert create[6:] == ["/F"]
    assert not Path(create[5]).exists()  # temp file removed again
    task = parse_xml(fake.xml[0])
    settings = {c.tag.split("}")[1]: c.text for c in task.find("t:Settings", NS)}
    assert settings["StartWhenAvailable"] == "true"
    assert settings["DisallowStartIfOnBatteries"] == "false"
    assert settings["StopIfGoingOnBatteries"] == "false"
    assert settings["ExecutionTimeLimit"] == "PT6H"
    assert settings["MultipleInstancesPolicy"] == "IgnoreNew"
    trigger = task.find("t:Triggers/t:CalendarTrigger", NS)
    assert trigger.find("t:StartBoundary", NS).text.endswith("T03:30:00")
    assert trigger.find("t:ScheduleByDay/t:DaysInterval", NS).text == "1"
    exe = task.find("t:Actions/t:Exec", NS)
    assert exe.find("t:Command", NS).text.lower().endswith("python.exe")
    assert exe.find("t:Arguments", NS).text.endswith('run_watchlist.pyw"')
    assert exe.find("t:WorkingDirectory", NS).text == str(scheduler.repo_root())
    assert st.registered and st.name == "\\HCLoader-Watchlist" and st.time == "03:30"
    assert st.next_run.startswith("2026-11-17T03:00:00")


def test_task_xml_escapes_paths_and_validates_time():
    xml = scheduler.task_xml("04:05", r"C:\Users\A&B <x>\python.exe")
    assert "A&amp;B &lt;x&gt;" in xml
    ET.fromstring(xml.split("?>", 1)[1])
    with pytest.raises(SchedulerError, match="HH:MM"):
        scheduler.task_xml("4:5")


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
        "error": None,
        "path_mismatch": False,
        "task_command": None,
    }


def test_query_other_failure_is_unknown_not_unregistered():
    def denied(args):
        return subprocess.CompletedProcess(args, 1, b"", b"FEHLER: Zugriff verweigert")

    sched = TaskScheduler(run=denied, platform="win32")
    st = sched.query("03:00")
    assert st.registered is None and "Zugriff verweigert" in st.error
    assert st.to_dict()["registered"] is None
    with pytest.raises(SchedulerError, match="nicht entfernt"):
        sched.delete()


def test_date_parsing_prefers_day_first(monkeypatch):
    monkeypatch.setattr(scheduler, "_date_formats", lambda: scheduler._DATE_FORMATS)
    d = scheduler._parse_local("03/12/2026 10:00:00")
    assert (d.month, d.day) == (12, 3)  # 3 December, not March 12
    d = scheduler._parse_local("12/31/2026 10:00:00")  # only valid month-first
    assert (d.month, d.day) == (12, 31)
    d = scheduler._parse_local("2026-11-17 03:00:00")
    assert (d.month, d.day) == (11, 17)
    assert scheduler._parse_local("17.11.2026 03:00:00").day == 17


def test_date_parsing_us_locale_is_month_first(monkeypatch):
    monkeypatch.setattr("locale.getlocale", lambda *a: ("en_US", "UTF-8"))
    d = scheduler._parse_local("03/12/2026 10:00:00")
    assert (d.month, d.day) == (3, 12)


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


@pytest.mark.parametrize(
    ("now", "expected"),
    [
        (datetime(2026, 11, 16, 2, 0), "2026-11-16T03:30:00"),  # still ahead today
        (datetime(2026, 11, 16, 3, 30), "2026-11-17T03:30:00"),  # exactly now: tomorrow
        (datetime(2026, 11, 16, 14, 0), "2026-11-17T03:30:00"),  # past: tomorrow
    ],
)
def test_task_xml_start_boundary_is_next_future_occurrence(now, expected):
    """n4: a past StartBoundary could start a «missed» run at once (StartWhenAvailable)."""
    xml = scheduler.task_xml("03:30", now=now)
    assert f"<StartBoundary>{expected}</StartBoundary>" in xml
