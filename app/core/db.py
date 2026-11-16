"""SQLite storage: schema (SPEC §9), versioned migrations and query helpers.

One shared connection (check_same_thread=False) guarded by an RLock, WAL mode.
All timestamps are ISO-8601 UTC strings.
"""

from __future__ import annotations

import sqlite3
import threading
from collections.abc import Callable, Iterable, Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

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
)
_SOURCE_FIELDS = (
    "type",
    "name",
    "url_or_query",
    "default_genre",
    "enabled",
    "auto_download",
    "max_entries",
    "last_checked",
)


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


# --------------------------------------------------------------------------- migrations


def _m1_initial(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE videos(
          id TEXT PRIMARY KEY, title TEXT, channel_id TEXT, channel_name TEXT,
          duration INTEGER, upload_date TEXT, view_count INTEGER, thumbnail TEXT,
          genre TEXT, genre_manual INTEGER DEFAULT 0, source_id INTEGER,
          status TEXT CHECK(status IN
            ('new','inbox','queued','downloading','done','ignored','failed')),
          file_path TEXT, error TEXT, first_seen TEXT, downloaded_at TEXT
        );
        CREATE INDEX idx_videos_status ON videos(status);
        CREATE INDEX idx_videos_channel ON videos(channel_id);
        CREATE TABLE sources(
          id INTEGER PRIMARY KEY, type TEXT, name TEXT, url_or_query TEXT,
          default_genre TEXT, enabled INTEGER, auto_download INTEGER,
          max_entries INTEGER, last_checked TEXT
        );
        CREATE TABLE channel_blacklist(
          channel_id TEXT PRIMARY KEY, channel_name TEXT, added TEXT
        );
        CREATE TABLE runs(
          id INTEGER PRIMARY KEY, kind TEXT, started TEXT, finished TEXT,
          found INTEGER, downloaded INTEGER, errors INTEGER, note TEXT
        );
        CREATE TABLE state(key TEXT PRIMARY KEY, value TEXT);
        """
    )


# Append new steps at the end; never edit existing ones. Step i upgrades version i -> i+1.
MIGRATIONS: list[Callable[[sqlite3.Connection], None]] = [_m1_initial]


def _current_version(conn: sqlite3.Connection) -> int:
    has = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_version'"
    ).fetchone()
    if not has:
        return 0
    row = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()
    return int(row[0] or 0)


def migrate(conn: sqlite3.Connection, migrations: Sequence[Callable] | None = None) -> int:
    """Apply pending migrations. Returns the resulting schema version."""
    steps = MIGRATIONS if migrations is None else migrations
    conn.execute("CREATE TABLE IF NOT EXISTS schema_version(version INTEGER)")
    conn.commit()
    version = _current_version(conn)
    if version > len(steps):
        raise RuntimeError(
            f"Datenbank-Schema v{version} ist neuer als unterstützt (v{len(steps)}); "
            "bitte HCLoader aktualisieren"
        )
    for target in range(version + 1, len(steps) + 1):
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
        self._conn = sqlite3.connect(
            self.path, check_same_thread=False, isolation_level=None, timeout=30
        )
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            if self.path != ":memory:":
                self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA foreign_keys=ON")
            self._conn.execute("PRAGMA busy_timeout=30000")
            migrate(self._conn)

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
                self._check_status(row["status"])
                cols = ", ".join(row)
                marks = ", ".join("?" for _ in row)
                self.execute(f"INSERT INTO videos({cols}) VALUES ({marks})", row.values())
                return
            updates: dict[str, Any] = {
                k: video[k] for k in _VIDEO_META_FIELDS if video.get(k) is not None
            }
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

    def set_genre(self, video_id: str, genre: str, *, manual: bool = True) -> None:
        self.execute(
            "UPDATE videos SET genre=?, genre_manual=? WHERE id=?",
            (genre, int(manual), video_id),
        )

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
        max_entries: int = 30,
    ) -> int:
        if type not in SOURCE_TYPES:
            raise ValueError(f"Ungültiger Quellentyp: {type}")
        cur = self.execute(
            "INSERT INTO sources(type,name,url_or_query,default_genre,enabled,auto_download,"
            "max_entries) VALUES (?,?,?,?,?,?,?)",
            (
                type,
                name,
                url_or_query,
                default_genre,
                int(enabled),
                int(auto_download),
                max_entries,
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
        for k in ("enabled", "auto_download"):
            if k in fields:
                fields[k] = int(bool(fields[k]))
        sets = ", ".join(f"{k}=?" for k in fields)
        self.execute(f"UPDATE sources SET {sets} WHERE id=?", [*fields.values(), source_id])

    def mark_source_checked(self, source_id: int) -> None:
        self.update_source(source_id, last_checked=now_iso())

    def delete_source(self, source_id: int) -> None:
        self.execute("DELETE FROM sources WHERE id=?", (source_id,))

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
