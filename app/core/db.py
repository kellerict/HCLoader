"""SQLite storage: schema (SPEC §9), versioned migrations and query helpers.

One shared connection (check_same_thread=False) guarded by an RLock, WAL mode.
All timestamps are ISO-8601 UTC strings.
"""

from __future__ import annotations

import sqlite3
import threading
from collections.abc import Callable, Iterable, Iterator, Sequence
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .platforms import platform_of

STATUSES = ("new", "inbox", "queued", "downloading", "done", "ignored", "failed")
SOURCE_TYPES = ("channel", "playlist", "search")

_VIDEO_META_FIELDS = (
    "title",
    "channel_id",
    "channel_name",
    "duration",
    "upload_date",
    "view_count",
    "thumbnail",
)
_VIDEO_COLUMNS = (
    "id",
    *_VIDEO_META_FIELDS,
    "genre",
    "genre_manual",
    "source_id",
    "status",
    "file_path",
    "error",
    "first_seen",
    "downloaded_at",
    "queue_pos",
    "date_approx",
    "platform",
    "url",
    "channel_url",
    "preview",
)
_SOURCE_FIELDS = (
    "type",
    "name",
    "url_or_query",
    "default_genre",
    "enabled",
    "auto_download",
    "max_entries",
    "newest_last",
    "last_checked",
    "platform",
    "name_auto",
)


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


# --------------------------------------------------------------------------- migrations


_M1_STATEMENTS = (
    """CREATE TABLE videos(
      id TEXT PRIMARY KEY, title TEXT, channel_id TEXT, channel_name TEXT,
      duration INTEGER, upload_date TEXT, view_count INTEGER, thumbnail TEXT,
      genre TEXT, genre_manual INTEGER DEFAULT 0, source_id INTEGER,
      status TEXT CHECK(status IN
        ('new','inbox','queued','downloading','done','ignored','failed')),
      file_path TEXT, error TEXT, first_seen TEXT, downloaded_at TEXT
    )""",
    "CREATE INDEX idx_videos_status ON videos(status)",
    "CREATE INDEX idx_videos_channel ON videos(channel_id)",
    """CREATE TABLE sources(
      id INTEGER PRIMARY KEY, type TEXT, name TEXT, url_or_query TEXT,
      default_genre TEXT, enabled INTEGER, auto_download INTEGER,
      max_entries INTEGER, last_checked TEXT
    )""",
    """CREATE TABLE channel_blacklist(
      channel_id TEXT PRIMARY KEY, channel_name TEXT, added TEXT
    )""",
    """CREATE TABLE runs(
      id INTEGER PRIMARY KEY, kind TEXT, started TEXT, finished TEXT,
      found INTEGER, downloaded INTEGER, errors INTEGER, note TEXT
    )""",
    "CREATE TABLE state(key TEXT PRIMARY KEY, value TEXT)",
)


def _m1_initial(conn: sqlite3.Connection) -> None:
    # Single execute() calls only: executescript() would COMMIT implicitly and break atomicity.
    for statement in _M1_STATEMENTS:
        conn.execute(statement)


def _m2_queue(conn: sqlite3.Connection) -> None:
    """Phase 3: persistent queue order and the "approximate upload date" flag of flat results."""
    conn.execute("ALTER TABLE videos ADD COLUMN queue_pos INTEGER")
    conn.execute("ALTER TABLE videos ADD COLUMN date_approx INTEGER DEFAULT 0")
    conn.execute("CREATE INDEX idx_videos_queue ON videos(status, queue_pos)")
    # rows queued before the migration keep their first-seen order
    conn.execute(
        "UPDATE videos SET queue_pos = (SELECT COUNT(*) FROM videos v2 "
        "WHERE v2.status IN ('queued','downloading','failed') "
        "AND (v2.first_seen < videos.first_seen OR "
        "(v2.first_seen = videos.first_seen AND v2.id <= videos.id))) "
        "WHERE status IN ('queued','downloading','failed')"
    )


def _m3_newest_last(conn: sqlite3.Connection) -> None:
    """Phase 4: playlist option "newest videos are at the end" (list the last N, reversed)."""
    conn.execute("ALTER TABLE sources ADD COLUMN newest_last INTEGER NOT NULL DEFAULT 0")


def _m4_source_videos(conn: sqlite3.Connection) -> None:
    """Review Phase 4 M1: which source has seen which video (a video can be in several
    sources; `videos.source_id` only keeps the first one). The incremental stop of a watchlist
    check uses this table, not "known in the DB". Existing rows are taken over from
    `videos.source_id`."""
    conn.execute(
        """CREATE TABLE source_videos(
          source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
          video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
          first_seen TEXT,
          PRIMARY KEY(source_id, video_id)
        )"""
    )
    conn.execute("CREATE INDEX idx_source_videos_video ON source_videos(video_id)")
    conn.execute(
        "INSERT OR IGNORE INTO source_videos(source_id, video_id, first_seen) "
        "SELECT source_id, id, first_seen FROM videos "
        "WHERE source_id IS NOT NULL AND source_id IN (SELECT id FROM sources)"
    )


def _m5_platforms(conn: sqlite3.Connection) -> None:
    """Phase 7a: SoundCloud as second platform (docs/decisions.md «SoundCloud: IDs»).

    - `videos.platform` / `sources.platform`: 'youtube' | 'soundcloud'; existing rows = youtube.
      SoundCloud video ids carry the prefix `sc:` (unique across platforms without a composite
      key), the column is for queries and the UI.
    - `videos.url`: web page of the video/track (SoundCloud permalinks cannot be rebuilt from
      the id), `videos.channel_url`: page of the uploader (watchlist from a search hit).
    - `videos.preview`: SoundCloud Go+ snippet (30 s preview only), never downloaded.
    - `sources.name_auto`: the name was suggested automatically and may be replaced by the real
      channel/uploader name of the next check (no extra request).
    """
    conn.execute("ALTER TABLE videos ADD COLUMN platform TEXT NOT NULL DEFAULT 'youtube'")
    conn.execute("ALTER TABLE videos ADD COLUMN url TEXT")
    conn.execute("ALTER TABLE videos ADD COLUMN channel_url TEXT")
    conn.execute("ALTER TABLE videos ADD COLUMN preview INTEGER NOT NULL DEFAULT 0")
    conn.execute("ALTER TABLE sources ADD COLUMN platform TEXT NOT NULL DEFAULT 'youtube'")
    conn.execute("ALTER TABLE sources ADD COLUMN name_auto INTEGER NOT NULL DEFAULT 0")
    conn.execute("CREATE INDEX idx_videos_platform_duration ON videos(platform, duration)")


# Append new steps at the end; never edit existing ones. Step i upgrades version i -> i+1.
MIGRATIONS: list[Callable[[sqlite3.Connection], None]] = [
    _m1_initial,
    _m2_queue,
    _m3_newest_last,
    _m4_source_videos,
    _m5_platforms,
]
# statuses a user may put into the download queue (enqueue / retry)
ENQUEUEABLE = ("new", "inbox", "failed")


def _current_version(conn: sqlite3.Connection) -> int:
    has = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_version'"
    ).fetchone()
    if not has:
        return 0
    row = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()
    return int(row[0] or 0)


class SchemaTooNewError(RuntimeError):
    """The DB was written by a newer HCLoader (higher schema version than this code knows).
    Nothing is changed; `main.py` shows `message` instead of a traceback (self-update)."""

    def __init__(self, found: int, supported: int) -> None:
        self.found = found
        self.supported = supported
        super().__init__(
            f"Datenbank-Schema v{found} ist neuer als unterstützt (v{supported}); "
            "bitte HCLoader aktualisieren"
        )

    def user_message(self, backups: Path | str | None = None) -> str:
        """Clear German text for the start dialog (instead of a traceback)."""
        text = (
            f"Die Datenbank stammt von einer neueren HCLoader-Version (Schema v{self.found}); "
            f"diese Version kennt nur v{self.supported}.\n\n"
            "Bitte HCLoader auf die neueste Version aktualisieren (Portable-ZIP neu "
            "herunterladen bzw. «git pull» und setup.ps1). Die Daten bleiben unverändert."
        )
        if backups:
            text += (
                "\n\nWer bewusst zur älteren Version zurück will: HCLoader schliessen und eine "
                f"Sicherung aus {backups} (hcloader-premigrate-…) als hcloader.db zurückkopieren."
            )
        return text


class MigrationBackupError(RuntimeError):
    """The automatic backup before a migration failed: the migration is not started."""


def migrate(
    conn: sqlite3.Connection,
    migrations: Sequence[Callable] | None = None,
    *,
    before: Callable[[int, int], Any] | None = None,
) -> int:
    """Apply pending migrations. Returns the resulting schema version.

    `before(old, new)` runs once before the first pending step of an existing DB (old >= 1),
    never for a fresh one; the self-update uses it for the pre-migration backup. If it raises,
    nothing is migrated (MigrationBackupError)."""
    steps = MIGRATIONS if migrations is None else migrations
    conn.execute("CREATE TABLE IF NOT EXISTS schema_version(version INTEGER)")
    conn.commit()
    version = _current_version(conn)
    if version > len(steps):
        raise SchemaTooNewError(version, len(steps))
    if before is not None and 0 < version < len(steps):
        try:
            before(version, len(steps))
        except Exception as exc:
            raise MigrationBackupError(
                f"Sicherung vor der Datenbank-Migration v{version} → v{len(steps)} "
                f"fehlgeschlagen ({exc}). Die Migration wurde nicht gestartet, die Daten sind "
                "unverändert."
            ) from exc
    for target in range(version + 1, len(steps) + 1):
        # Migration steps must use conn.execute() only (never executescript(), which commits).
        try:
            conn.execute("BEGIN")
            steps[target - 1](conn)
            conn.execute("DELETE FROM schema_version")
            conn.execute("INSERT INTO schema_version(version) VALUES (?)", (target,))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    return len(steps)


# --------------------------------------------------------------------------- database


class Database:
    def __init__(self, path: Path | str = ":memory:") -> None:
        self.path = str(path)
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._run_listeners: list[Callable[[dict[str, Any]], None]] = []
        self._conn = sqlite3.connect(
            self.path, check_same_thread=False, isolation_level=None, timeout=30
        )
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            if self.path != ":memory:":
                self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA foreign_keys=ON")
            self._conn.execute("PRAGMA busy_timeout=30000")
            migrate(
                self._conn,
                before=self._backup_before_migration if self.path != ":memory:" else None,
            )

    def _backup_before_migration(self, old: int, new: int) -> Path:
        """Self-update: copy of the DB before it is migrated to a higher schema version,
        `<db folder>/backups/hcloader-premigrate-v<old>-to-v<new>-<ts>.db` (own retention)."""
        from .maintenance import backup_before_migration  # lazy: maintenance imports more

        return backup_before_migration(Path(self.path), old, new)

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def __enter__(self) -> Database:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    # -- low level

    def execute(self, sql: str, params: Iterable[Any] = ()) -> sqlite3.Cursor:
        with self._lock:
            return self._conn.execute(sql, tuple(params))

    def query(self, sql: str, params: Iterable[Any] = ()) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(r) for r in self._conn.execute(sql, tuple(params)).fetchall()]

    def query_one(self, sql: str, params: Iterable[Any] = ()) -> dict[str, Any] | None:
        rows = self.query(sql, params)
        return rows[0] if rows else None

    @contextmanager
    def transaction(self) -> Iterator[None]:
        """BEGIN … COMMIT (ROLLBACK on error) under the connection lock (Review Phase 3 m7).
        The connection runs in autocommit mode; nested use is not supported."""
        with self._lock:
            self._conn.execute("BEGIN")
            try:
                yield
            except BaseException:
                self._conn.rollback()
                raise
            self._conn.commit()

    def schema_version(self) -> int:
        with self._lock:
            return _current_version(self._conn)

    # -- videos

    def upsert_video(self, video: dict[str, Any]) -> None:
        """Insert a video (status 'new') or refresh its metadata.

        Never changes status/file_path of an existing row. `genre` is only overwritten if it
        was not set manually; `source_id` only if currently empty.
        """
        vid = video["id"]
        with self._lock:
            existing = self.get_video(vid)
            if existing is None:
                row = {k: video.get(k) for k in _VIDEO_COLUMNS}
                row["status"] = video.get("status") or "new"
                row["genre_manual"] = int(bool(video.get("genre_manual", 0)))
                row["first_seen"] = video.get("first_seen") or now_iso()
                row["date_approx"] = int(bool(video.get("date_approx")))
                row["platform"] = video.get("platform") or platform_of(vid)
                row["preview"] = int(bool(video.get("preview")))
                self._check_status(row["status"])
                cols = ", ".join(row)
                marks = ", ".join("?" for _ in row)
                self.execute(f"INSERT INTO videos({cols}) VALUES ({marks})", row.values())
                return
            updates: dict[str, Any] = {
                k: video[k] for k in _VIDEO_META_FIELDS if video.get(k) not in (None, "")
            }
            if "upload_date" in updates:
                approx = bool(video.get("date_approx"))
                if approx and existing["upload_date"] and not existing["date_approx"]:
                    del updates["upload_date"]  # never replace an exact date by an estimate
                else:
                    updates["date_approx"] = int(approx)
            for key in ("url", "channel_url"):
                if video.get(key):
                    updates[key] = video[key]
            if video.get("preview") is not None and "preview" in video:
                updates["preview"] = int(bool(video["preview"]))
            if video.get("genre") and not existing["genre_manual"]:
                updates["genre"] = video["genre"]
            if video.get("source_id") is not None and existing["source_id"] is None:
                updates["source_id"] = video["source_id"]
            if updates:
                sets = ", ".join(f"{k}=?" for k in updates)
                self.execute(f"UPDATE videos SET {sets} WHERE id=?", [*updates.values(), vid])

    @staticmethod
    def _check_status(status: str) -> None:
        if status not in STATUSES:
            raise ValueError(f"Ungültiger Status: {status}")

    def get_video(self, video_id: str) -> dict[str, Any] | None:
        return self.query_one("SELECT * FROM videos WHERE id=?", (video_id,))

    def is_known(self, video_id: str) -> bool:
        """True if the video exists in the DB with any status."""
        return self.query_one("SELECT 1 AS x FROM videos WHERE id=?", (video_id,)) is not None

    def known_ids(self, ids: Iterable[str]) -> set[str]:
        ids = list(ids)
        found: set[str] = set()
        for i in range(0, len(ids), 500):
            chunk = ids[i : i + 500]
            marks = ",".join("?" for _ in chunk)
            for r in self.query(f"SELECT id FROM videos WHERE id IN ({marks})", chunk):
                found.add(r["id"])
        return found

    def set_status(
        self,
        video_id: str,
        status: str,
        *,
        error: str | None = None,
        file_path: str | None = None,
    ) -> None:
        self._check_status(status)
        sets = ["status=?", "error=?"]
        params: list[Any] = [status, error]
        if file_path is not None:
            sets.append("file_path=?")
            params.append(file_path)
        if status == "done":
            sets.append("downloaded_at=?")
            params.append(now_iso())
        self.execute(f"UPDATE videos SET {', '.join(sets)} WHERE id=?", [*params, video_id])

    def set_file_path(self, video_id: str, file_path: str | None) -> None:
        """Change only `file_path` (re-tag move); status and `downloaded_at` stay."""
        self.execute("UPDATE videos SET file_path=? WHERE id=?", (file_path, video_id))

    def mark_removed(self, video_id: str) -> None:
        """Library item deleted by the user: status `ignored` (never loaded again), no file."""
        self.execute(
            "UPDATE videos SET status='ignored', file_path=NULL, error=NULL, queue_pos=NULL "
            "WHERE id=?",
            (video_id,),
        )

    def set_genre(self, video_id: str, genre: str, *, manual: bool = True) -> None:
        self.execute(
            "UPDATE videos SET genre=?, genre_manual=? WHERE id=?",
            (genre, int(manual), video_id),
        )

    def reset_interrupted_downloads(self, message: str = "Unterbrochen") -> int:
        """At startup: rows stuck in 'downloading' (crash/kill) become 'failed'. Returns count."""
        with self._lock:
            cur = self.execute(
                "UPDATE videos SET status='failed', error=? WHERE status='downloading'",
                (message,),
            )
            return int(cur.rowcount)

    def requeue_downloading(self, message: str | None = None) -> int:
        """Rows in 'downloading' back to 'queued' (shutdown while a download could not be
        stopped in time, Review Phase 3 m5). Returns the count."""
        cur = self.execute(
            "UPDATE videos SET status='queued', error=? WHERE status='downloading'", (message,)
        )
        return int(cur.rowcount)

    # -- download queue (status 'queued' + queue_pos = persistent order)

    def _max_queue_pos(self) -> int:
        row = self.query_one("SELECT MAX(queue_pos) AS m FROM videos")
        return int((row or {}).get("m") or 0)

    def enqueue(self, ids: Iterable[str]) -> list[str]:
        """Put known videos with an ENQUEUEABLE status at the end of the queue (in the given
        order). Returns the ids that were queued; others (unknown, done, ignored, already
        queued/downloading) are skipped."""
        out: list[str] = []
        with self.transaction():
            pos = self._max_queue_pos()
            for vid in ids:
                row = self.get_video(vid)
                if not row or row["status"] not in ENQUEUEABLE or vid in out:
                    continue
                pos += 1
                self.execute(
                    "UPDATE videos SET status='queued', error=NULL, queue_pos=? WHERE id=?",
                    (pos, vid),
                )
                out.append(vid)
        return out

    def dequeue(self, video_id: str, status: str = "new") -> None:
        """Take a video out of the queue (status `status`, no position)."""
        self._check_status(status)
        self.execute(
            "UPDATE videos SET status=?, error=NULL, queue_pos=NULL WHERE id=?",
            (status, video_id),
        )

    def next_queued(self, *, exclude_platforms: Iterable[str] = ()) -> dict[str, Any] | None:
        """First waiting entry; `exclude_platforms`: skip entries of blocked platforms (Phase
        7a: a SoundCloud backoff must not hold up YouTube entries and vice versa)."""
        skip = list(exclude_platforms)
        cond = f" AND platform NOT IN ({','.join('?' for _ in skip)})" if skip else ""
        return self.query_one(
            f"SELECT * FROM videos WHERE status='queued'{cond} "
            "ORDER BY queue_pos IS NULL, queue_pos, first_seen, id LIMIT 1",
            skip,
        )

    def queued_platforms(self) -> list[str]:
        """Platforms with waiting entries, in queue order of their first entry."""
        rows = self.query(
            "SELECT platform, MIN(COALESCE(queue_pos, 1e18)) AS p FROM videos "
            "WHERE status='queued' GROUP BY platform ORDER BY p"
        )
        return [r["platform"] for r in rows]

    def duplicate_candidates(
        self, platform: str, duration: int, *, tolerance: int = 5, statuses: Sequence[str] = ()
    ) -> list[dict[str, Any]]:
        """Rows of *other* platforms with a duration within +-tolerance (Phase 7a duplicates)."""
        sql = (
            "SELECT id, title, platform, status, duration FROM videos WHERE platform != ? "
            "AND duration BETWEEN ? AND ?"
        )
        params: list[Any] = [platform, duration - tolerance, duration + tolerance]
        if statuses:
            sql += f" AND status IN ({','.join('?' for _ in statuses)})"
            params += list(statuses)
        return self.query(sql, params)

    def list_queue(self) -> list[dict[str, Any]]:
        """Queue view: downloading first, then queued in order, then failed."""
        return self.query(
            "SELECT * FROM videos WHERE status IN ('downloading','queued','failed') ORDER BY "
            "CASE status WHEN 'downloading' THEN 0 WHEN 'queued' THEN 1 ELSE 2 END, "
            "queue_pos IS NULL, queue_pos, first_seen, id"
        )

    def move_in_queue(self, video_id: str, delta: int) -> bool:
        """Swap a waiting entry with its waiting neighbour (delta -1 = up, +1 = down)."""
        if delta not in (-1, 1):
            return False
        with self.transaction():
            waiting = self.query(
                "SELECT id, queue_pos FROM videos WHERE status='queued' "
                "ORDER BY queue_pos IS NULL, queue_pos, first_seen, id"
            )
            ids = [r["id"] for r in waiting]
            if video_id not in ids:
                return False
            i = ids.index(video_id)
            j = i + delta
            if j < 0 or j >= len(ids):
                return False
            # renumber densely (NULL positions from older rows), then swap
            base = self._max_queue_pos()
            order = ids[:]
            order[i], order[j] = order[j], order[i]
            for n, vid in enumerate(order, start=1):
                self.execute("UPDATE videos SET queue_pos=? WHERE id=?", (base + n, vid))
            return True

    def delete_video(self, video_id: str) -> None:
        self.execute("DELETE FROM videos WHERE id=?", (video_id,))

    def list_videos(
        self,
        *,
        status: str | Sequence[str] | None = None,
        genre: str | Sequence[str] | None = None,
        channel_id: str | None = None,
        source_id: int | None = None,
        year: int | str | None = None,
        search: str | None = None,
        order_by: str = "first_seen",
        descending: bool = True,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        where, params = self._video_where(status, genre, channel_id, source_id, year, search)
        orders = {
            "first_seen": "first_seen",
            "downloaded_at": "downloaded_at",
            "upload_date": "upload_date",
            "duration": "duration",
            "view_count": "view_count",
            "title": "title COLLATE NOCASE",
            "channel": "channel_name COLLATE NOCASE",
        }
        if order_by not in orders:
            raise ValueError(f"Ungültige Sortierung: {order_by}")
        sql = f"SELECT * FROM videos {where} ORDER BY {orders[order_by]} "
        sql += "DESC" if descending else "ASC"
        sql += ", id"
        if limit is not None:
            sql += " LIMIT ? OFFSET ?"
            params += [limit, offset]
        return self.query(sql, params)

    def count_videos(self, **filters: Any) -> int:
        where, params = self._video_where(
            filters.get("status"),
            filters.get("genre"),
            filters.get("channel_id"),
            filters.get("source_id"),
            filters.get("year"),
            filters.get("search"),
        )
        return self.query(f"SELECT COUNT(*) AS n FROM videos {where}", params)[0]["n"]

    @staticmethod
    def _video_where(status, genre, channel_id, source_id, year, search) -> tuple[str, list]:
        clauses: list[str] = []
        params: list[Any] = []

        def in_clause(col: str, value: str | Sequence[str]) -> None:
            values = [value] if isinstance(value, str) else list(value)
            clauses.append(f"{col} IN ({','.join('?' for _ in values)})")
            params.extend(values)

        if status:
            in_clause("status", status)
        if genre:
            in_clause("genre", genre)
        if channel_id:
            clauses.append("channel_id=?")
            params.append(channel_id)
        if source_id is not None:
            clauses.append("source_id=?")
            params.append(source_id)
        if year:
            clauses.append("substr(upload_date,1,4)=?")
            params.append(str(year))
        if search:
            like = f"%{search}%"
            clauses.append("(title LIKE ? OR channel_name LIKE ?)")
            params += [like, like]
        return ("WHERE " + " AND ".join(clauses)) if clauses else "", params

    # -- sources

    def add_source(
        self,
        type: str,
        name: str,
        url_or_query: str,
        *,
        default_genre: str | None = None,
        enabled: bool = True,
        auto_download: bool = False,
        max_entries: int | None = None,
        newest_last: bool = False,
        platform: str = "youtube",
        name_auto: bool = False,
    ) -> int:
        if type not in SOURCE_TYPES:
            raise ValueError(f"Ungültiger Quellentyp: {type}")
        cur = self.execute(
            "INSERT INTO sources(type,name,url_or_query,default_genre,enabled,auto_download,"
            "max_entries,newest_last,platform,name_auto) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (
                type,
                name,
                url_or_query,
                default_genre,
                int(enabled),
                int(auto_download),
                max_entries,
                int(newest_last),
                platform,
                int(name_auto),
            ),
        )
        return int(cur.lastrowid)

    def get_source(self, source_id: int) -> dict[str, Any] | None:
        return self.query_one("SELECT * FROM sources WHERE id=?", (source_id,))

    def list_sources(self, *, enabled_only: bool = False) -> list[dict[str, Any]]:
        sql = (
            "SELECT * FROM sources" + (" WHERE enabled=1" if enabled_only else "") + " ORDER BY id"
        )
        return self.query(sql)

    def update_source(self, source_id: int, **fields: Any) -> None:
        bad = set(fields) - set(_SOURCE_FIELDS)
        if bad:
            raise ValueError(f"Unbekannte Felder: {', '.join(sorted(bad))}")
        if not fields:
            return
        for k in ("enabled", "auto_download", "newest_last", "name_auto"):
            if k in fields:
                fields[k] = int(bool(fields[k]))
        sets = ", ".join(f"{k}=?" for k in fields)
        self.execute(f"UPDATE sources SET {sets} WHERE id=?", [*fields.values(), source_id])

    def source_platforms(self, *, enabled_only: bool = True) -> set[str]:
        sql = "SELECT DISTINCT platform FROM sources" + (" WHERE enabled=1" if enabled_only else "")
        return {r["platform"] for r in self.query(sql)}

    def mark_source_checked(self, source_id: int) -> None:
        self.update_source(source_id, last_checked=now_iso())

    def delete_source(self, source_id: int) -> None:
        with self.transaction():  # explicit: older DBs may run without foreign keys
            self.execute("DELETE FROM source_videos WHERE source_id=?", (source_id,))
            self.execute("DELETE FROM sources WHERE id=?", (source_id,))

    # -- source <-> video (which source has already seen a video, Review Phase 4 M1)

    def source_has_seen(self, source_id: int, video_id: str) -> bool:
        return (
            self.query_one(
                "SELECT 1 AS x FROM source_videos WHERE source_id=? AND video_id=?",
                (source_id, video_id),
            )
            is not None
        )

    def link_source_video(self, source_id: int, video_id: str) -> None:
        """Remember that `source_id` listed `video_id` (the video row must exist)."""
        self.execute(
            "INSERT OR IGNORE INTO source_videos(source_id, video_id, first_seen) VALUES (?,?,?)",
            (source_id, video_id, now_iso()),
        )

    def source_video_count(self, source_id: int) -> int:
        row = self.query_one(
            "SELECT COUNT(*) AS n FROM source_videos WHERE source_id=?", (source_id,)
        )
        return int((row or {}).get("n") or 0)

    # -- blacklist

    def add_to_blacklist(self, channel_id: str, channel_name: str = "") -> None:
        self.execute(
            "INSERT INTO channel_blacklist(channel_id,channel_name,added) VALUES (?,?,?) "
            "ON CONFLICT(channel_id) DO UPDATE SET channel_name=excluded.channel_name",
            (channel_id, channel_name, now_iso()),
        )

    def remove_from_blacklist(self, channel_id: str) -> None:
        self.execute("DELETE FROM channel_blacklist WHERE channel_id=?", (channel_id,))

    def is_blacklisted(self, channel_id: str) -> bool:
        return (
            self.query_one("SELECT 1 AS x FROM channel_blacklist WHERE channel_id=?", (channel_id,))
            is not None
        )

    def list_blacklist(self) -> list[dict[str, Any]]:
        return self.query("SELECT * FROM channel_blacklist ORDER BY channel_name COLLATE NOCASE")

    def blacklist_ids(self) -> set[str]:
        return {r["channel_id"] for r in self.query("SELECT channel_id FROM channel_blacklist")}

    # -- runs

    def start_run(self, kind: str) -> int:
        cur = self.execute("INSERT INTO runs(kind,started) VALUES (?,?)", (kind, now_iso()))
        return int(cur.lastrowid)

    def finish_run(
        self,
        run_id: int,
        *,
        found: int = 0,
        downloaded: int = 0,
        errors: int = 0,
        note: str | None = None,
    ) -> None:
        self.execute(
            "UPDATE runs SET finished=?, found=?, downloaded=?, errors=?, note=? WHERE id=?",
            (now_iso(), found, downloaded, errors, note, run_id),
        )
        row = self.query_one("SELECT * FROM runs WHERE id=?", (run_id,))
        for fn in list(self._run_listeners):
            try:
                if row:
                    fn(row)
            except Exception:  # a broken listener must never break a run
                pass

    def add_run_listener(self, fn: Callable[[dict[str, Any]], None]) -> None:
        """Called with the finished `runs` row after every `finish_run` (UI event `run`)."""
        if fn not in self._run_listeners:
            self._run_listeners.append(fn)

    def remove_run_listener(self, fn: Callable[[dict[str, Any]], None]) -> None:
        if fn in self._run_listeners:
            self._run_listeners.remove(fn)

    def list_runs(self, limit: int = 50) -> list[dict[str, Any]]:
        return self.query("SELECT * FROM runs ORDER BY id DESC LIMIT ?", (limit,))

    # -- state (key/value)

    def get_state(self, key: str, default: str | None = None) -> str | None:
        row = self.query_one("SELECT value FROM state WHERE key=?", (key,))
        return row["value"] if row else default

    def set_state(self, key: str, value: Any) -> None:
        self.execute(
            "INSERT INTO state(key,value) VALUES (?,?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, str(value)),
        )

    def delete_state(self, key: str) -> None:
        self.execute("DELETE FROM state WHERE key=?", (key,))
