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
    last_err = 0  # what ctypes.get_last_error() would return (n2)
    existing: set = set()

    def __init__(self):
        self.closed = []
        self.released = []

    def CreateMutexW(self, attrs, owner, name):  # noqa: N802
        self.last = name
        self.ERR = locks.ERROR_ALREADY_EXISTS if name in self.existing else 0
        FakeKernel.last_err = self.ERR
        self.existing.add(name)
        return 42

    def GetLastError(self):  # noqa: N802
        return self.ERR

    def CloseHandle(self, h):  # noqa: N802
        self.closed.append(h)

    def ReleaseMutex(self, h):  # noqa: N802
        self.released.append(h)


@pytest.fixture
def fake_last_error(monkeypatch):
    """Only for tests with a fake kernel32: on Windows the real tests above must see the real
    `GetLastError` (an autouse fake hid ERROR_ALREADY_EXISTS there and leaked run-lock
    handles into later tests -> exit code 4 cascades in the Windows CI)."""
    monkeypatch.setattr(locks, "_last_error", lambda: FakeKernel.last_err)


def test_kernel32_sets_handle_restype(monkeypatch):
    """n2: CreateMutexW returns a pointer-sized HANDLE (no truncation to int)."""
    import ctypes
    from ctypes import wintypes

    class Fn:
        argtypes = restype = None

    class Dll:
        def __init__(self, name, use_last_error=False):
            self.use_last_error = use_last_error
            self.CreateMutexW, self.ReleaseMutex, self.CloseHandle = Fn(), Fn(), Fn()

    monkeypatch.setattr(ctypes, "WinDLL", Dll, raising=False)
    k = locks._kernel32()
    assert k.use_last_error is True
    assert k.CreateMutexW.restype is wintypes.HANDLE
    assert k.CloseHandle.argtypes == (wintypes.HANDLE,)


@pytest.mark.usefixtures("fake_last_error")
def test_windows_named_mutex(monkeypatch):
    monkeypatch.setattr(locks, "IS_WINDOWS", True)
    kernel = FakeKernel()
    kernel.existing = set()
    monkeypatch.setattr(locks, "_kernel32", lambda: kernel)
    a = locks.ProcessLock("mx")
    assert a.acquire() and a._handle == 42
    b = locks.ProcessLock("mx")
    monkeypatch.setattr(locks, "_HELD", set())  # check the OS answer, not the in-process set
    assert b.acquire() is False and kernel.closed == [42]  # already exists -> not acquired
    a.release()
    # never owned -> no ReleaseMutex (thread-bound), only CloseHandle
    assert kernel.released == [] and kernel.closed == [42, 42] and not a.held


@pytest.mark.usefixtures("fake_last_error")
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


@pytest.mark.usefixtures("fake_last_error")
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
    assert names == [f"Global\\HCLoader.Pidi_Test.{locks._home_tag()}.run"]
    lock.release()


def test_mutex_name_depends_on_data_folder(monkeypatch, tmp_path):
    """Installed and portable copy (separate data folders) must not block each other."""
    monkeypatch.setenv("HCLOADER_HOME", str(tmp_path / "a"))
    a = locks.mutex_names("run")
    monkeypatch.setenv("HCLOADER_HOME", str(tmp_path / "b"))
    b = locks.mutex_names("run")
    monkeypatch.setenv("HCLOADER_HOME", str(tmp_path / "a"))
    assert a != b and locks.mutex_names("run") == a


@pytest.mark.usefixtures("fake_last_error")
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


class RealisticKernel:
    """Fake kernel32 with the semantics of named mutexes that matter here: a name exists as
    long as one handle is open; CreateMutexW on an existing name returns a new handle and sets
    ERROR_ALREADY_EXISTS; CloseHandle works from any thread; ReleaseMutex fails unless the
    calling thread owns the mutex (owned mutexes are never used by ProcessLock)."""

    def __init__(self):
        import threading

        self.open: dict[int, str] = {}
        self.next = 100
        self.lock = threading.Lock()
        self.err = threading.local()

    def CreateMutexW(self, attrs, owner, name):  # noqa: N802
        assert owner is False  # bInitialOwner must be FALSE
        with self.lock:
            exists = name in self.open.values()
            self.next += 1
            self.open[self.next] = name
            FakeKernel.last_err = locks.ERROR_ALREADY_EXISTS if exists else 0
            return self.next

    def CloseHandle(self, h):  # noqa: N802
        with self.lock:
            return self.open.pop(h, None) is not None

    def ReleaseMutex(self, h):  # noqa: N802
        return False  # never owned


@pytest.mark.usefixtures("fake_last_error")
def test_mutex_semantics_same_process_and_cross_thread_release(monkeypatch):
    import threading

    monkeypatch.setattr(locks, "IS_WINDOWS", True)
    kernel = RealisticKernel()
    monkeypatch.setattr(locks, "_kernel32", lambda: kernel)
    a = locks.ProcessLock("run")
    box = {}
    t = threading.Thread(target=lambda: box.setdefault("ok", a.acquire()))
    t.start()
    t.join()
    assert box["ok"] is True  # acquired in thread A
    # same process, same and other thread: taken
    assert locks.ProcessLock("run").acquire() is False
    other = {}
    t = threading.Thread(target=lambda: other.setdefault("ok", locks.ProcessLock("run").acquire()))
    t.start()
    t.join()
    assert other["ok"] is False
    # without the in-process set the OS answer alone is exclusive as well
    monkeypatch.setattr(locks, "_HELD", set())
    assert locks.ProcessLock("run").acquire() is False
    monkeypatch.setattr(locks, "_HELD", {"run"})
    # release from the main thread (thread B)
    a.release()
    assert not a.held and kernel.open == {}
    b = locks.ProcessLock("run")
    assert b.acquire() is True
    b.release()


def test_dropped_lock_object_frees_the_name():
    lock = locks.ProcessLock("gc-test")
    assert lock.acquire()
    del lock  # CPython: refcount -> __del__ -> release
    again = locks.ProcessLock("gc-test")
    assert again.acquire()
    again.release()


def test_file_lock_is_exclusive_inside_the_process(tmp_path):
    path = tmp_path / "f.lock"
    a = locks.ProcessLock("f", path=path)
    assert a.acquire()
    assert locks.ProcessLock("f", path=path).acquire() is False
    a.release()
    b = locks.ProcessLock("f", path=path)
    assert b.acquire()
    b.release()
