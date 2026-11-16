"""Windows task scheduler (schtasks) for the daily headless watchlist run (SPEC §2, §3.2).

The task runs `pythonw.exe scripts/run_watchlist.pyw` and is created from a Task Scheduler XML
(`schtasks /Create /XML`, UTF-16), because the command line cannot set the conditions a laptop
needs (Review Phase 2 n6): run missed starts as soon as possible (`StartWhenAvailable`), also
on battery, one instance at a time, 6 h time limit. The wrapper script finds the repo root from
its own location and no console window opens (docs/decisions.md). `run` (subprocess) is
injectable for tests.
"""

from __future__ import annotations

import csv
import io
import logging
import os
import re
import subprocess
import sys
import tempfile
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape, unescape

log = logging.getLogger(__name__)

TASK_NAME = "HCLoader-Watchlist"
EXECUTION_TIME_LIMIT = "PT6H"
TIMEOUT_S = 20
_TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)
# schtasks prints dates in the Windows locale. Target system is de-CH: ISO first, then
# day-first formats, month-first (US) only afterwards (m7). Unambiguous values still parse:
# "12/31/2026" fails every day-first format and falls through to the US ones.
_DATE_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
    "%d.%m.%Y %H:%M:%S",
    "%d.%m.%Y %H:%M",
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y %I:%M:%S %p",
    "%m/%d/%Y %I:%M:%S %p",
    "%m/%d/%Y %H:%M:%S",
)
_US_FIRST = ("%m/%d/%Y %I:%M:%S %p", "%m/%d/%Y %H:%M:%S")
_BOUNDARY_RE = re.compile(r"<StartBoundary>\s*\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})", re.I)
_COMMAND_RE = re.compile(r"<Command>(.*?)</Command>", re.I | re.S)
_ARGUMENTS_RE = re.compile(r"<Arguments>(.*?)</Arguments>", re.I | re.S)
_NOT_FOUND_RE = re.compile(
    r"cannot find|can't find|does not exist|nicht finden|nicht vorhanden|existiert nicht|"
    r"introuvable|0x80070002|n'existe pas|no se puede encontrar",
    re.I,
)

Runner = Callable[[Sequence[str]], subprocess.CompletedProcess]


class SchedulerError(Exception):
    """User-facing (German) error from the task scheduler."""


class SchedulerUnavailable(SchedulerError):
    def __init__(self) -> None:
        super().__init__("Die Aufgabenplanung gibt es nur unter Windows.")


@dataclass
class TaskStatus:
    registered: bool | None  # None = unknown (schtasks failed for another reason, see `error`)
    name: str = TASK_NAME
    next_run: str | None = None  # ISO, local time with offset
    time: str | None = None
    error: str | None = None
    # the registered task starts HCLoader from another folder (app moved, e.g. portable on a
    # USB stick); `task_command` is that registered command line (None = not readable)
    path_mismatch: bool = False
    task_command: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "registered": self.registered,
            "name": self.name,
            "next_run": self.next_run,
            "time": self.time,
            "error": self.error,
            "path_mismatch": self.path_mismatch,
            "task_command": self.task_command,
        }


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def wrapper_script() -> Path:
    return repo_root() / "scripts" / "run_watchlist.pyw"


def pythonw_path(executable: str | None = None) -> Path:
    """pythonw.exe next to the running interpreter (venv), else the interpreter itself."""
    exe = Path(executable or sys.executable)
    candidate = exe.with_name("pythonw.exe" if exe.suffix.lower() == ".exe" else "pythonw")
    return candidate if candidate.exists() else exe


def task_command(executable: str | None = None) -> str:
    """Human-readable command line: `"<pythonw>" "<repo>\\scripts\\run_watchlist.pyw"`."""
    return f'"{pythonw_path(executable)}" "{wrapper_script()}"'


def task_xml(time_str: str, executable: str | None = None, now: datetime | None = None) -> str:
    """Task Scheduler XML (schema 1.2) of the daily watchlist task (docs/decisions.md).

    Daily at `time_str` (local time); missed runs start as soon as possible; no battery
    restrictions; a second start while one runs is ignored (`IgnoreNew`); 6 h limit.
    `StartBoundary` = next occurrence of `time_str` (today if still ahead, else tomorrow).
    """
    hhmm = validate_time(time_str)
    # n4: the next future occurrence (a time already past today would count as a missed run
    # and start at once through StartWhenAvailable on some Windows versions)
    start = next_daily(hhmm, now).strftime("%Y-%m-%dT%H:%M:00")
    command = escape(str(pythonw_path(executable)))
    arguments = escape(f'"{wrapper_script()}"')
    workdir = escape(str(repo_root()))
    return f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>HCLoader: Watchlist prüfen und neue Mixes laden (headless)</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>{start}</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>{EXECUTION_TIME_LIMIT}</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{command}</Command>
      <Arguments>{arguments}</Arguments>
      <WorkingDirectory>{workdir}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"""


def validate_time(value: Any) -> str:
    if not isinstance(value, str) or not _TIME_RE.match(value.strip()):
        raise SchedulerError("Uhrzeit im Format HH:MM erwartet.")
    return value.strip()


def next_daily(time_str: str, now: datetime | None = None) -> datetime:
    """Next local occurrence of HH:MM (today if still ahead, else tomorrow); tz-aware."""
    now = (now or datetime.now().astimezone()).astimezone()
    hh, mm = (int(x) for x in validate_time(time_str).split(":"))
    nxt = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
    if nxt <= now:
        nxt += timedelta(days=1)
    return nxt


def _norm_path(value: str) -> str:
    """Comparable form of a Windows path (quotes, separators, case, `.`/`..`)."""
    text = value.strip().strip('"').strip().replace("/", "\\")
    parts: list[str] = []
    for part in text.split("\\"):
        if part in ("", ".") and parts:
            continue
        if part == ".." and len(parts) > 1:
            parts.pop()
            continue
        parts.append(part)
    return "\\".join(parts).casefold()


def _first_quoted(arguments: str) -> str:
    """First argument (the wrapper script) of the task's `<Arguments>`."""
    text = arguments.strip()
    if text.startswith('"'):
        end = text.find('"', 1)
        return text[1:end] if end > 0 else text[1:]
    return text.split(" ", 1)[0]


def registered_paths(xml_text: str) -> tuple[str, str] | None:
    """(command, wrapper script) of the task XML (`schtasks /Query /XML`); None if absent."""
    cmd = _COMMAND_RE.search(xml_text or "")
    if not cmd:
        return None
    args = _ARGUMENTS_RE.search(xml_text)
    command = unescape(cmd.group(1).strip()).strip('"')
    script = _first_quoted(unescape(args.group(1))) if args else ""
    return command, script


def path_mismatch(xml_text: str, executable: str | None = None) -> tuple[bool, str | None]:
    """Does the registered task start another HCLoader folder than the running one?

    Compares the program (pythonw.exe) and the wrapper script with what `create` would write
    now. Returns (mismatch, registered command line). Unreadable XML = no mismatch (nothing is
    claimed that cannot be shown)."""
    found = registered_paths(xml_text)
    if found is None:
        return False, None
    command, script = found
    shown = f'"{command}" "{script}"' if script else f'"{command}"'
    same = _norm_path(command) == _norm_path(str(pythonw_path(executable))) and (
        _norm_path(script) == _norm_path(str(wrapper_script()))
    )
    return (not same), shown


def _date_formats() -> tuple[str, ...]:
    """US locale (en_US) reads month-first; everything else (de-CH, ...) day-first."""
    import locale

    try:
        name = locale.getlocale()[0] or ""
    except (ValueError, TypeError):
        name = ""
    if name.lower().startswith(("en_us", "english_united states")):
        return _US_FIRST + tuple(f for f in _DATE_FORMATS if f not in _US_FIRST)
    return _DATE_FORMATS


def _parse_local(text: str) -> datetime | None:
    text = (text or "").strip()
    for fmt in _date_formats():
        try:
            return datetime.strptime(text, fmt).astimezone()
        except ValueError:
            continue
    return None


def _decode(data: bytes | str | None) -> str:
    if data is None:
        return ""
    if isinstance(data, str):
        return data
    for enc in ("oem", "utf-8") if sys.platform == "win32" else ("utf-8",):
        try:
            return data.decode(enc)
        except (LookupError, UnicodeDecodeError):
            continue
    return data.decode("latin-1", errors="replace")


def _default_run(args: Sequence[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        list(args),
        capture_output=True,
        timeout=TIMEOUT_S,
        creationflags=_NO_WINDOW,
        check=False,
    )


class TaskScheduler:
    """Thin wrapper around schtasks.exe. `platform` and `run` are injectable for tests."""

    def __init__(
        self,
        *,
        run: Runner | None = None,
        platform: str | None = None,
        executable: str | None = None,
        name: str = TASK_NAME,
    ) -> None:
        self._run = run or _default_run
        self._platform = platform or sys.platform
        self._executable = executable
        self.name = name

    @property
    def available(self) -> bool:
        return self._platform == "win32"

    def _require(self) -> None:
        if not self.available:
            raise SchedulerUnavailable

    def _call(self, *args: str) -> tuple[int, str]:
        try:
            proc = self._run(["schtasks", *args])
        except (OSError, subprocess.SubprocessError) as exc:
            raise SchedulerError(f"schtasks konnte nicht ausgeführt werden: {exc}") from exc
        out = _decode(proc.stdout).strip()
        err = _decode(proc.stderr).strip()
        return proc.returncode, (out if proc.returncode == 0 else (err or out))

    def command(self) -> str:
        return task_command(self._executable)

    def create(self, time_str: str) -> TaskStatus:
        self._require()
        time_str = validate_time(time_str)
        fd, name = tempfile.mkstemp(prefix="hcloader-task-", suffix=".xml")
        xml_path = Path(name)
        try:
            with os.fdopen(fd, "wb") as fh:
                fh.write(task_xml(time_str, self._executable).encode("utf-16"))  # BOM + LE
            code, msg = self._call("/Create", "/TN", self.name, "/XML", str(xml_path), "/F")
        finally:
            try:
                xml_path.unlink()
            except OSError:
                pass
        if code != 0:
            raise SchedulerError(f"Aufgabe konnte nicht angelegt werden: {msg}")
        log.info("Aufgabenplanung: %s täglich um %s angelegt", self.name, time_str)
        status = self.query(time_str)
        if not status.registered:  # created but not queryable: still report what we know
            status = TaskStatus(True, self.name, next_daily(time_str).isoformat(), time_str)
        return status

    def delete(self) -> None:
        self._require()
        code, msg = self._call("/Delete", "/TN", self.name, "/F")
        if code != 0 and self.query().registered is not False:
            raise SchedulerError(f"Aufgabe konnte nicht entfernt werden: {msg}")
        log.info("Aufgabenplanung: %s entfernt", self.name)

    def _task_xml(self) -> str | None:
        """Task definition via `schtasks /Query /XML`; None if not readable."""
        try:
            code, out = self._call("/Query", "/TN", self.name, "/XML")
        except SchedulerError:
            return None
        return out if code == 0 else None

    @staticmethod
    def _trigger_time(xml_text: str | None) -> str | None:
        """`HH:MM` of the daily trigger in the task XML."""
        m = _BOUNDARY_RE.search(xml_text) if xml_text else None
        return m.group(1) if m else None

    def query(self, expected_time: str | None = None) -> TaskStatus:
        """Status via `/Query /FO CSV /V`. Columns are localized, so they are read by position
        (1 TaskName, 2 Next Run Time); the time falls back to `expected_time`."""
        self._require()
        code, out = self._call("/Query", "/TN", self.name, "/FO", "CSV", "/V")
        if code != 0:
            if _NOT_FOUND_RE.search(out):
                return TaskStatus(False, self.name, None, expected_time)
            # any other failure (access denied, service down, ...) is not "not registered" (m6)
            log.warning("schtasks /Query fehlgeschlagen (Code %s): %s", code, out[:200])
            detail = out[:200] or f"Code {code}"
            return TaskStatus(
                None, self.name, None, expected_time, f"Status nicht lesbar: {detail}"
            )
        rows = [r for r in csv.reader(io.StringIO(out)) if r]
        data = rows[1] if len(rows) > 1 else []
        name = data[1].strip() if len(data) > 1 and data[1].strip() else self.name
        # n7: the CSV date is printed in the Windows locale; the task definition (`/XML`) is
        # locale independent. HCLoader's task is a plain daily trigger, so the next run is the
        # next occurrence of its trigger time. The CSV date is only the fallback.
        xml_text = self._task_xml()
        xml_time = self._trigger_time(xml_text)
        mismatch, registered_cmd = path_mismatch(xml_text or "", self._executable)
        if mismatch:
            log.debug(
                "Aufgabenplanung: %s startet %s statt %s (App verschoben?)",
                self.name,
                registered_cmd,
                self.command(),
            )
        if xml_time:
            next_dt = next_daily(xml_time)
        else:
            next_dt = _parse_local(data[2]) if len(data) > 2 else None
        time_str = expected_time
        if next_dt is not None:
            time_str = time_str or f"{next_dt:%H:%M}"
        elif expected_time:
            next_dt = next_daily(expected_time)
        return TaskStatus(
            True,
            name,
            next_dt.isoformat() if next_dt else None,
            time_str,
            path_mismatch=mismatch,
            task_command=registered_cmd,
        )
