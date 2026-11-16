import pytest

from app.core import locks


def test_run_lock_is_exclusive_and_releasable():
    first = locks.acquire_run_lock()
    assert first is not None and first.held
    assert locks.acquire_run_lock() is None
    first.release()
    assert not first.held
    again = locks.acquire_run_lock()
    assert again is not None
    again.release()


def test_single_instance_and_run_lock_are_independent():
    inst = locks.acquire_single_instance()
    run = locks.acquire_run_lock()
    assert inst is not None and run is not None
    assert locks.acquire_single_instance() is None
    inst.release()
    run.release()


def test_context_manager_releases():
    with locks.ProcessLock("ctx") as lock:
        assert lock.acquire()
        assert locks.ProcessLock("ctx").acquire() is False
    assert locks.ProcessLock("ctx").acquire() is True


def test_acquire_is_idempotent_for_holder():
    lock = locks.ProcessLock("idem")
    assert lock.acquire() and lock.acquire()
    lock.release()


class FakeKernel:
    ERR = 0
    existing: set = set()

    def __init__(self):
        self.closed = []
        self.released = []

    def CreateMutexW(self, attrs, owner, name):  # noqa: N802
        self.last = name
        self.ERR = locks.ERROR_ALREADY_EXISTS if name in self.existing else 0
        self.existing.add(name)
        return 42

    def GetLastError(self):  # noqa: N802
        return self.ERR

    def CloseHandle(self, h):  # noqa: N802
        self.closed.append(h)

    def ReleaseMutex(self, h):  # noqa: N802
        self.released.append(h)


def test_windows_named_mutex(monkeypatch):
    monkeypatch.setattr(locks, "IS_WINDOWS", True)
    kernel = FakeKernel()
    kernel.existing = set()
    monkeypatch.setattr(locks, "_kernel32", lambda: kernel)
    a = locks.ProcessLock("mx")
    assert a.acquire() and a._handle == 42
    b = locks.ProcessLock("mx")
    assert b.acquire() is False and kernel.closed == [42]  # already exists -> not acquired
    a.release()
    assert kernel.released == [42] and not a.held


def test_windows_mutex_failure_falls_back_to_file(monkeypatch):
    monkeypatch.setattr(locks, "IS_WINDOWS", True)

    def broken():
        raise OSError("no kernel32")

    monkeypatch.setattr(locks, "_kernel32", broken)
    # file strategy on this (non-Windows) test host: fcntl is used by _try_lock_file
    monkeypatch.setattr(locks, "_try_lock_file", lambda fh: True)
    lock = locks.ProcessLock("fb")
    assert lock.acquire() and lock._fh is not None
    monkeypatch.setattr(locks, "_unlock_file", lambda fh: None)
    lock.release()


def test_mutex_prefers_global_namespace_with_user_tag(monkeypatch):
    """N3: Global\\ first (a task in session 0 must see the GUI's lock)."""
    monkeypatch.setattr(locks, "IS_WINDOWS", True)
    monkeypatch.setenv("USERNAME", "Pidi Test")
    names = []

    class K(FakeKernel):
        def CreateMutexW(self, attrs, owner, name):  # noqa: N802
            names.append(name)
            return super().CreateMutexW(attrs, owner, name)

    kernel = K()
    kernel.existing = set()
    monkeypatch.setattr(locks, "_kernel32", lambda: kernel)
    lock = locks.ProcessLock("run")
    assert lock.acquire()
    assert names == ["Global\\HCLoader.Pidi_Test.run"]
    lock.release()


def test_mutex_falls_back_to_local_when_global_is_denied(monkeypatch):
    monkeypatch.setattr(locks, "IS_WINDOWS", True)
    names = []

    class K(FakeKernel):
        def CreateMutexW(self, attrs, owner, name):  # noqa: N802
            names.append(name)
            if name.startswith("Global\\"):
                return 0  # ERROR_ACCESS_DENIED
            return super().CreateMutexW(attrs, owner, name)

    kernel = K()
    kernel.existing = set()
    monkeypatch.setattr(locks, "_kernel32", lambda: kernel)
    lock = locks.ProcessLock("run")
    assert lock.acquire() and lock._handle == 42
    assert [n.split(".")[0] for n in names] == ["Global\\HCLoader", "Local\\HCLoader"]
    lock.release()


def test_cross_process_lock_blocks_then_times_out(tmp_path):
    path = tmp_path / "x.lock"
    with locks.cross_process_lock("x", path=path) as held:
        assert held
        with locks.cross_process_lock("x", path=path, timeout=0.2, poll=0.02) as other:
            assert other is False  # gave up instead of blocking forever
        with pytest.raises(KeyError):
            with locks.cross_process_lock(
                "x", path=path, timeout=0.1, poll=0.02, on_timeout=lambda: KeyError("busy")
            ):
                pass
    with locks.cross_process_lock("x", path=path, timeout=0.2) as again:
        assert again


def test_watchlist_lock_is_exclusive():
    first = locks.acquire_watchlist_lock()
    assert first is not None and locks.acquire_watchlist_lock() is None
    first.release()
    assert locks.acquire_watchlist_lock() is not None
