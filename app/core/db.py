"""SQLite storage: schema (SPEC §9), versioned migrations and query helpers.

One shared connection (check_same_thread=False) guarded by an RLock, WAL mode.
All timestamps are ISO-8601 UTC strings.
"""

from __future__ import annotations

import logging
import sqlite3
import threading
from collections.abc import Callable, Iterable, Iterator, Sequence
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .i18n import tr
from .platforms import platform_of

log = logging.getLogger(__name__)

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
    "geo_blocked",
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
    "item_count",
)


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def file_size_of(path: str | Path | None) -> int | None:
    """Size of a library file in bytes (v0.9.0 statistics); None = no path / not readable."""
    if not path:
        return None
    try:
        return Path(path).stat().st_size
    except (OSError, ValueError):
        return None


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


def _m6_geo_blocked(conn: sqlite3.Connection) -> None:
    """Review M1 (Phase 7a/8): `videos.geo_blocked` = SoundCloud track with API policy BLOCK
    (not available in this region). Flat listings keep such tracks (filter reason «Nicht
    verfügbar (Region)») instead of aborting the whole search/listing."""
    conn.execute("ALTER TABLE videos ADD COLUMN geo_blocked INTEGER NOT NULL DEFAULT 0")


def _m7_festivals(conn: sqlite3.Connection) -> None:
    """v0.3.0 festivals & series (docs/concepts/festivals.md, docs/decisions.md).

    - `series`: festival, radio show or podcast. `key` is stable (built-ins from
      app/data/series.yaml, user series `u-<slug>`); aliases/weak aliases/channels/variants are
      JSON lists (language-neutral data, only ever read as a whole). `builtin` = shipped with the
      app, `user_modified` = the user edited a built-in (an update never overwrites it again),
      `hidden` = the user deleted a built-in (it is not re-added by the next sync).
    - `editions`: series + year (0 = unknown) + variant ('' = none), e.g. Defqon.1 Australia 2019.
    - per video: `edition_id` (assigned), `suggested_edition_id` (detected below the confidence
      threshold, shown as a suggestion), `stage`, `set_type` (code), `episode` (radio/podcast),
      `festival_confidence` (last detection), `festival_manual` (set by the user: detection never
      touches the row again).
    """
    conn.execute(
        """CREATE TABLE series(
          id INTEGER PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          kind TEXT NOT NULL DEFAULT 'festival' CHECK(kind IN ('festival','radio','podcast')),
          aliases TEXT NOT NULL DEFAULT '[]',
          weak_aliases TEXT NOT NULL DEFAULT '[]',
          channels TEXT NOT NULL DEFAULT '[]',
          variants TEXT NOT NULL DEFAULT '[]',
          default_genre TEXT,
          builtin INTEGER NOT NULL DEFAULT 0,
          user_modified INTEGER NOT NULL DEFAULT 0,
          hidden INTEGER NOT NULL DEFAULT 0,
          enabled INTEGER NOT NULL DEFAULT 1,
          created TEXT,
          updated TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE editions(
          id INTEGER PRIMARY KEY,
          series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
          year INTEGER NOT NULL DEFAULT 0,
          variant TEXT NOT NULL DEFAULT '',
          UNIQUE(series_id, year, variant)
        )"""
    )
    conn.execute(
        "ALTER TABLE videos ADD COLUMN edition_id INTEGER "
        "REFERENCES editions(id) ON DELETE SET NULL"
    )
    conn.execute(
        "ALTER TABLE videos ADD COLUMN suggested_edition_id INTEGER "
        "REFERENCES editions(id) ON DELETE SET NULL"
    )
    conn.execute("ALTER TABLE videos ADD COLUMN stage TEXT")
    conn.execute("ALTER TABLE videos ADD COLUMN set_type TEXT")
    conn.execute("ALTER TABLE videos ADD COLUMN episode INTEGER")
    conn.execute("ALTER TABLE videos ADD COLUMN festival_confidence REAL")
    conn.execute("ALTER TABLE videos ADD COLUMN festival_manual INTEGER NOT NULL DEFAULT 0")
    conn.execute("CREATE INDEX idx_videos_edition ON videos(edition_id)")
    conn.execute("CREATE INDEX idx_editions_series ON editions(series_id, year)")


def _m8_backfill(conn: sqlite3.Connection) -> None:
    """v0.4.0 «Read everything (once)» (docs/decisions.md «Alles einlesen»).

    - `sources.item_count`: size of the listing as yt-dlp reported it on the first page
      (`playlist_count`, mostly playlists), NULL = unknown. Basis of the request estimate.
    - `backfills`: one row per source with a backfill. `state` pending (wants to run / was
      interrupted), running, paused (by the user or after repeated errors), done, cancelled;
      `position` = entries of the listing already processed (resume cursor), `total` = known
      size, `added` = hits put into the inbox, `found` = new video rows, `requests` = page
      requests so far, `failures` = errors in a row, `note` = last interruption.
    """
    conn.execute("ALTER TABLE sources ADD COLUMN item_count INTEGER")
    conn.execute(
        """CREATE TABLE backfills(
          source_id INTEGER PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
          state TEXT NOT NULL DEFAULT 'pending'
            CHECK(state IN ('pending','running','paused','done','cancelled')),
          position INTEGER NOT NULL DEFAULT 0,
          total INTEGER,
          added INTEGER NOT NULL DEFAULT 0,
          found INTEGER NOT NULL DEFAULT 0,
          requests INTEGER NOT NULL DEFAULT 0,
          failures INTEGER NOT NULL DEFAULT 0,
          note TEXT,
          started TEXT,
          updated TEXT,
          finished TEXT
        )"""
    )


def _m9_collector(conn: sqlite3.Connection) -> None:
    """v0.5.0 «Festival collector» (docs/concepts/festivals.md, docs/decisions.md).

    - `checklists`: one row per edition that has a checklist: the organiser playlist it was read
      from (`playlist_url`) and the state of the matching job (`job_state` NULL = never run,
      pending (wants to run / was interrupted), running, paused (3 errors in a row), done,
      cancelled; `job_total`/`job_done` = rows to search / searched in this job, `job_searches`
      = search requests, `job_hits` = rows that got a match, `job_failures` = errors in a row,
      `job_note` = last interruption).
    - `checklist_rows`: one expected set. `source` = where the row came from (playlist,
      timetable, file, manual); `status` = missing, found, queued, downloaded, ignored (kept in
      sync with the matched video, `ignored` = the user's flag); `video_id` + `confidence` =
      best match, `candidates` = JSON [{id, confidence}] of the other hits, `rejected` = JSON
      ids the user turned down (never proposed again); `confirmed` = the match is accepted
      (by the user or automatically: organiser playlist, certain hit), `checked` = the user
      wants it, `edited` = the user changed the row (manual values are authoritative),
      `searched` = time of its last search in the matching job (resume cursor).
    """
    conn.execute(
        """CREATE TABLE checklists(
          edition_id INTEGER PRIMARY KEY REFERENCES editions(id) ON DELETE CASCADE,
          playlist_url TEXT,
          job_state TEXT CHECK(job_state IS NULL OR job_state IN
            ('pending','running','paused','done','cancelled')),
          job_total INTEGER NOT NULL DEFAULT 0,
          job_done INTEGER NOT NULL DEFAULT 0,
          job_searches INTEGER NOT NULL DEFAULT 0,
          job_hits INTEGER NOT NULL DEFAULT 0,
          job_failures INTEGER NOT NULL DEFAULT 0,
          job_note TEXT,
          job_started TEXT,
          job_updated TEXT,
          job_finished TEXT,
          created TEXT,
          updated TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE checklist_rows(
          id INTEGER PRIMARY KEY,
          edition_id INTEGER NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
          artist TEXT NOT NULL,
          stage TEXT,
          day TEXT,
          start_time TEXT,
          end_time TEXT,
          set_type TEXT,
          source TEXT NOT NULL CHECK(source IN ('playlist','timetable','file','manual')),
          status TEXT NOT NULL DEFAULT 'missing'
            CHECK(status IN ('missing','found','queued','downloaded','ignored')),
          video_id TEXT REFERENCES videos(id) ON DELETE SET NULL,
          confidence REAL,
          candidates TEXT NOT NULL DEFAULT '[]',
          rejected TEXT NOT NULL DEFAULT '[]',
          confirmed INTEGER NOT NULL DEFAULT 0,
          checked INTEGER NOT NULL DEFAULT 1,
          ignored INTEGER NOT NULL DEFAULT 0,
          edited INTEGER NOT NULL DEFAULT 0,
          searched TEXT,
          position INTEGER NOT NULL DEFAULT 0,
          created TEXT,
          updated TEXT
        )"""
    )
    conn.execute("CREATE INDEX idx_checklist_rows_edition ON checklist_rows(edition_id, position)")
    conn.execute("CREATE INDEX idx_checklist_rows_video ON checklist_rows(video_id)")


def _m10_tracklists(conn: sqlite3.Connection) -> None:
    """v0.6.0 «Tracklist search» (core/tracklist.py, docs/decisions.md).

    - `tracklists`: one row per library item that was examined: where its tracklist came from
      (`source` = chapters | description | id3 | cue | none), number of tracks, time of the
      extraction. A row with `source = 'none'` means «looked, found nothing» (the «missing only»
      pass skips it).
    - `tracks`: one track of a set. `start` = seconds into the set (NULL = numbered list without
      timestamps), `artist`/`title`/`version`/`label` = normalised display values, `raw` = the
      line as found, `is_id` = unreleased/unknown track («ID - ID», «Artist - ID»), `key` =
      folded artists|title|version for «most played» ('' = not counted), `search` = folded text.
    - `tracks_fts`: FTS5 index over `tracks.search` (rowid = tracks.id), kept in sync by
      triggers. Only created if this SQLite has FTS5; otherwise the search falls back to LIKE.
    """
    conn.execute(
        """CREATE TABLE tracklists(
          video_id TEXT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
          source TEXT NOT NULL CHECK(source IN ('chapters','description','id3','cue','none')),
          count INTEGER NOT NULL DEFAULT 0,
          extracted TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE tracks(
          id INTEGER PRIMARY KEY,
          video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
          position INTEGER NOT NULL,
          start REAL,
          artist TEXT NOT NULL DEFAULT '',
          title TEXT NOT NULL DEFAULT '',
          version TEXT NOT NULL DEFAULT '',
          label TEXT NOT NULL DEFAULT '',
          raw TEXT NOT NULL DEFAULT '',
          is_id INTEGER NOT NULL DEFAULT 0,
          key TEXT NOT NULL DEFAULT '',
          search TEXT NOT NULL DEFAULT ''
        )"""
    )
    conn.execute("CREATE INDEX idx_tracks_video ON tracks(video_id, position)")
    conn.execute("CREATE INDEX idx_tracks_key ON tracks(key)")
    if not fts5_available(conn):
        return
    _create_tracks_fts(conn)


_TRACKS_FTS_TRIGGERS = {
    "tracks_fts_ai": "CREATE TRIGGER IF NOT EXISTS tracks_fts_ai AFTER INSERT ON tracks BEGIN "
    "INSERT INTO tracks_fts(rowid, search) VALUES (new.id, new.search); END",
    "tracks_fts_ad": "CREATE TRIGGER IF NOT EXISTS tracks_fts_ad AFTER DELETE ON tracks BEGIN "
    "DELETE FROM tracks_fts WHERE rowid = old.id; END",
    "tracks_fts_au": "CREATE TRIGGER IF NOT EXISTS tracks_fts_au AFTER UPDATE OF search ON tracks "
    "BEGIN UPDATE tracks_fts SET search = new.search WHERE rowid = new.id; END",
}


def _create_tracks_fts(conn: sqlite3.Connection) -> None:
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5("
        "search, tokenize = 'unicode61 remove_diacritics 2')"
    )
    for sql in _TRACKS_FTS_TRIGGERS.values():
        conn.execute(sql)


def ensure_tracks_fts(conn: sqlite3.Connection) -> bool:
    """Startup check of the tracklist index (v0.6.0, review «has_fts»): is FTS5 really usable
    with *this* SQLite? -> True = search via `tracks_fts`, False = LIKE fallback.

    - module missing but index present (DB made by another SQLite build): drop the sync
      triggers, otherwise every write to `tracks` (also `ON DELETE CASCADE`) would fail;
    - module present but index or triggers missing (DB migrated without FTS5, or the triggers
      were dropped by the case above): create them and rebuild the index from `tracks`.
    """
    names = {
        r[0]
        for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE name IN "
            "('tracks', 'tracks_fts', 'tracks_fts_ai', 'tracks_fts_ad', 'tracks_fts_au')"
        )
    }
    if "tracks" not in names:
        return False
    if not fts5_available(conn):
        for trig in _TRACKS_FTS_TRIGGERS:
            if trig in names:
                conn.execute(f"DROP TRIGGER IF EXISTS {trig}")
        if "tracks_fts" in names:
            log.warning("SQLite without FTS5: tracklist search falls back to LIKE")
        return False
    if names >= {"tracks_fts", *_TRACKS_FTS_TRIGGERS}:
        return True
    conn.execute("BEGIN IMMEDIATE")
    try:
        _create_tracks_fts(conn)
        conn.execute("DELETE FROM tracks_fts")
        conn.execute("INSERT INTO tracks_fts(rowid, search) SELECT id, search FROM tracks")
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    log.info("Tracklist search index (FTS5) rebuilt")
    return True


def fts5_available(conn: sqlite3.Connection) -> bool:
    """Does this SQLite build know FTS5? (Probed with a temporary table, nothing persists.)"""
    try:
        conn.execute("CREATE VIRTUAL TABLE temp.hc_fts5_probe USING fts5(x)")
        conn.execute("DROP TABLE temp.hc_fts5_probe")
        return True
    except sqlite3.OperationalError:
        return False


def _m11_tracks_key_index(conn: sqlite3.Connection) -> None:
    """v0.6.0 follow-up (QA: «most played» ~0.5 s on 150k tracks): covering index
    (key, video_id) so `top_tracks` counts sets per key from the index alone. Replaces
    `idx_tracks_key` (its prefix)."""
    conn.execute("CREATE INDEX idx_tracks_key_video ON tracks(key, video_id)")
    conn.execute("DROP INDEX IF EXISTS idx_tracks_key")


def _m12_audio_and_playback(conn: sqlite3.Connection) -> None:
    """v0.7.0 loudness, waveform and player memory (core/analysis.py, core/playback.py).

    - `audio_analysis`: one row per analysed library item. `lufs` = integrated loudness
      (EBU R128), `true_peak` = true peak in dBTP, `lra` = loudness range (LU); NULL = not
      measured (e.g. only the waveform was computed). `tagged` = ReplayGain tags written into
      the file (0 = not yet / format without tags / write failed -> the next pass retries the
      tag write without measuring again). `peaks` = waveform cached (file under
      `<app_home>/cache/peaks/`). `analysed` = time of the last measurement, `error` = last
      local error (ffmpeg missing, unreadable file ...).
    - `playback`: remembered position per set (seconds) for «resume» and «continue listening»;
      positions in the first/last 30 s are not stored (the row is removed instead).
    """
    conn.execute(
        """CREATE TABLE audio_analysis(
          video_id TEXT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
          lufs REAL,
          true_peak REAL,
          lra REAL,
          tagged INTEGER NOT NULL DEFAULT 0,
          peaks INTEGER NOT NULL DEFAULT 0,
          analysed TEXT,
          error TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE playback(
          video_id TEXT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
          position REAL NOT NULL,
          duration REAL,
          updated TEXT NOT NULL
        )"""
    )
    conn.execute("CREATE INDEX idx_playback_updated ON playback(updated)")


def _m13_artists_and_playlists(conn: sqlite3.Connection) -> None:
    """v0.8.0 DJ pages and playlist export (core/artists.py, core/playlists.py).

    - `artists`: only the artists the user (or the shipped seed list, app/data/artists.yaml)
      said something about - every other artist is derived on the fly from the library
      (checklist rows, title, channel). `key` = stable id (folded name without spaces, e.g.
      «subzeroproject»), `name` = display name, `aliases` = JSON list of other spellings /
      merged artists («HH» -> Headhunterz); a name or alias with a joiner («D-Block &
      S-te-Fan») is one act and never split into a b2b. `channel_url` = own channel for «Add to
      watchlist», `hidden` = not an artist (e.g. a mix series that was parsed as one),
      `builtin` = came from the seed list (afterwards the row is the user's like any other).
    - `playlists`: exported M3U8 files that can be regenerated. `spec` = JSON {kind, ...} of
      what was exported, `path` = the file, `relative` = relative entries, `sync` = rewrite
      it after downloads (only with `playlists.sync_after_download`).
    """
    conn.execute(
        """CREATE TABLE artists(
          id INTEGER PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          aliases TEXT NOT NULL DEFAULT '[]',
          channel_url TEXT,
          hidden INTEGER NOT NULL DEFAULT 0,
          builtin INTEGER NOT NULL DEFAULT 0,
          created TEXT,
          updated TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE playlists(
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          spec TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          relative INTEGER NOT NULL DEFAULT 1,
          sync INTEGER NOT NULL DEFAULT 0,
          count INTEGER NOT NULL DEFAULT 0,
          created TEXT,
          updated TEXT
        )"""
    )


# columns of a library row the DJ index (core/artists.py) derives credits and counts from
_ARTIST_COLS = (
    "title",
    "channel_id",
    "channel_name",
    "duration",
    "upload_date",
    "downloaded_at",
    "genre",
    "edition_id",
    "stage",
    "set_type",
    "platform",
    "file_path",
    "status",
)


def _m14_artist_index_revision(conn: sqlite3.Connection) -> None:
    """v0.8.0 review M2: one cache version for the DJ index (core/artists.py).

    Two counters in `state`, bumped by triggers so that every write path (festival
    assignment, collector, retag, delete, artist edits, headless runs in another process)
    invalidates the cached index without each caller having to remember it:
    - `artists_rev_rows`: a library row (status done before or after) changed in a column the
      index reads, a set was deleted, or a confirmed collector credit changed -> the index is
      updated incrementally (only the changed rows are parsed again),
    - `artists_rev_names`: the artist table or the series catalogue changed -> full rebuild.
    """
    for key in ("artists_rev_rows", "artists_rev_names"):
        conn.execute("INSERT OR IGNORE INTO state(key, value) VALUES (?, '0')", (key,))

    def bump(key: str) -> str:
        return f"UPDATE state SET value = CAST(value AS INTEGER) + 1 WHERE key = '{key}';"

    changed = " OR ".join(f"NEW.{c} IS NOT OLD.{c}" for c in _ARTIST_COLS)
    rows = bump("artists_rev_rows")
    names = bump("artists_rev_names")
    conn.execute(
        "CREATE TRIGGER artists_rev_video_ins AFTER INSERT ON videos "
        f"WHEN NEW.status = 'done' BEGIN {rows} END"
    )
    conn.execute(
        "CREATE TRIGGER artists_rev_video_upd AFTER UPDATE ON videos "
        f"WHEN (OLD.status = 'done' OR NEW.status = 'done') AND ({changed}) BEGIN {rows} END"
    )
    conn.execute(
        "CREATE TRIGGER artists_rev_video_del AFTER DELETE ON videos "
        f"WHEN OLD.status = 'done' BEGIN {rows} END"
    )
    credit = "NEW.video_id IS NOT NULL AND NEW.confirmed = 1"
    old_credit = "OLD.video_id IS NOT NULL AND OLD.confirmed = 1"
    conn.execute(
        "CREATE TRIGGER artists_rev_check_ins AFTER INSERT ON checklist_rows "
        f"WHEN {credit} BEGIN {rows} END"
    )
    conn.execute(
        "CREATE TRIGGER artists_rev_check_upd AFTER UPDATE ON checklist_rows "
        f"WHEN (({credit}) OR ({old_credit})) AND (NEW.video_id IS NOT OLD.video_id "
        "OR NEW.confirmed IS NOT OLD.confirmed OR NEW.artist IS NOT OLD.artist "
        "OR NEW.position IS NOT OLD.position) "
        f"BEGIN {rows} END"
    )
    conn.execute(
        "CREATE TRIGGER artists_rev_check_del AFTER DELETE ON checklist_rows "
        f"WHEN {old_credit} BEGIN {rows} END"
    )
    for table in ("artists", "series"):
        for op in ("INSERT", "UPDATE", "DELETE"):
            conn.execute(
                f"CREATE TRIGGER artists_rev_{table}_{op.lower()} AFTER {op} ON {table} "
                f"BEGIN {names} END"
            )


def _m15_stats(conn: sqlite3.Connection) -> None:
    """v0.9.0 statistics view (core/stats.py).

    - `videos.file_size`: size of the library file in bytes, written whenever `file_path` is set
      (download, re-tag move). NULL = not measured yet (libraries from before v0.9.0): the
      statistics view measures those once in the background (local `stat`, no network).
    - `idx_videos_downloaded`: library rows by download time (date range filter, per month).
    """
    conn.execute("ALTER TABLE videos ADD COLUMN file_size INTEGER")
    conn.execute("CREATE INDEX idx_videos_downloaded ON videos(status, downloaded_at)")


def _m16_fingerprints(conn: sqlite3.Connection) -> None:
    """v0.10.0 re-upload detection (core/fingerprint.py, docs/decisions.md «Re-upload
    detection»).

    - `fingerprints`: one row per fingerprinted library item. `hashes` = packed landmark hashes
      (uint32 hash + uint32 frame, little endian), `segments` = JSON [[start, end], …] of the
      fingerprinted frame ranges, `version` = algorithm version (a new version recomputes),
      `error` = last local error (ffmpeg missing, unreadable file; NULL hashes then).
    - `fingerprint_index`: the inverted index (a deterministic sample of the hashes, about one
      in four) for the fast candidate search; verified against the full `hashes` afterwards.
    - `reuploads`: «probable re-upload of X». `video_id` = the newer download, `of_id` = the
      library item it matches, `state` open | kept (keep both, dismissed) | linked (same
      mix, kept as a link).
    """
    conn.execute(
        """CREATE TABLE fingerprints(
          video_id TEXT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
          version INTEGER NOT NULL,
          created TEXT NOT NULL,
          duration REAL,
          hashes BLOB,
          segments TEXT,
          error TEXT
        )"""
    )
    conn.execute(
        """CREATE TABLE fingerprint_index(
          hash INTEGER NOT NULL,
          video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE
        )"""
    )
    conn.execute("CREATE INDEX idx_fp_index_hash ON fingerprint_index(hash)")
    conn.execute("CREATE INDEX idx_fp_index_video ON fingerprint_index(video_id)")
    conn.execute(
        """CREATE TABLE reuploads(
          video_id TEXT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
          of_id TEXT NOT NULL,
          score REAL NOT NULL,
          offset_s REAL,
          detected TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','kept','linked'))
        )"""
    )
    conn.execute("CREATE INDEX idx_reuploads_of ON reuploads(of_id)")


def _m17_festival_checks(conn: sqlite3.Connection) -> None:
    """v0.10.1 automatic festival assignment for existing libraries (core/series.py
    `auto_pending`, docs/decisions.md «Automatic catch-up passes»).

    `festival_checks`: library items the automatic pass has examined, with the catalogue
    signature it used (built-in series list, user series, detection settings). An item is
    examined again only when the signature changes (app update with a new series list, series
    edited) - so the pass on every GUI start only touches items it has never seen. A separate
    table (not a column on `videos`) so the DJ index triggers on `videos` do not fire.
    """
    conn.execute(
        """CREATE TABLE festival_checks(
          video_id TEXT PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
          sig TEXT NOT NULL,
          checked TEXT NOT NULL
        )"""
    )


# Append new steps at the end; never edit existing ones. Step i upgrades version i -> i+1.
MIGRATIONS: list[Callable[[sqlite3.Connection], None]] = [
    _m1_initial,
    _m2_queue,
    _m3_newest_last,
    _m4_source_videos,
    _m5_platforms,
    _m6_geo_blocked,
    _m7_festivals,
    _m8_backfill,
    _m9_collector,
    _m10_tracklists,
    _m11_tracks_key_index,
    _m12_audio_and_playback,
    _m13_artists_and_playlists,
    _m14_artist_index_revision,
    _m15_stats,
    _m16_fingerprints,
    _m17_festival_checks,
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
        super().__init__(tr("db.schema_too_new", found=found, known=supported))

    def user_message(self, backups: Path | str | None = None) -> str:
        """Clear German text for the start dialog (instead of a traceback)."""
        text = tr("db.schema_too_new_user", found=self.found, known=self.supported)
        if backups:
            text += tr("db.schema_downgrade_hint", folder=backups)
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
                tr("db.migration_backup_failed", old=version, new=len(steps), error=exc)
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
            # v0.6.0: FTS5 really usable with this SQLite? (index repaired / LIKE fallback)
            self.fts = ensure_tracks_fts(self._conn)

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
    def transaction(self, *, immediate: bool = False) -> Iterator[None]:
        """BEGIN … COMMIT (ROLLBACK on error) under the connection lock (Review Phase 3 m7).
        The connection runs in autocommit mode; nested use is not supported. `immediate` takes
        the write lock right away (read-modify-write shared with another process, e.g. the
        notification batch of the GUI and a scheduled headless run)."""
        with self._lock:
            self._conn.execute("BEGIN IMMEDIATE" if immediate else "BEGIN")
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
                row["geo_blocked"] = int(bool(video.get("geo_blocked")))
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
            if video.get("geo_blocked") is not None and "geo_blocked" in video:
                updates["geo_blocked"] = int(bool(video["geo_blocked"]))
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
            raise ValueError(f"Invalid status: {status}")

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
            sets.append("file_size=?")
            params.append(file_size_of(file_path))
        if status == "done":
            sets.append("downloaded_at=?")
            params.append(now_iso())
        self.execute(f"UPDATE videos SET {', '.join(sets)} WHERE id=?", [*params, video_id])

    def set_file_path(self, video_id: str, file_path: str | None) -> None:
        """Change only `file_path` (re-tag move); status and `downloaded_at` stay."""
        self.execute(
            "UPDATE videos SET file_path=?, file_size=? WHERE id=?",
            (file_path, file_size_of(file_path), video_id),
        )

    def mark_removed(self, video_id: str) -> None:
        """Library item deleted by the user: status `ignored` (never loaded again), no file.
        Its tracklist goes too (no «most played» spelling or index row from a deleted set)."""
        with self.transaction():
            self.execute(
                "UPDATE videos SET status='ignored', file_path=NULL, file_size=NULL, error=NULL, "
                "queue_pos=NULL "
                "WHERE id=?",
                (video_id,),
            )
            self.execute("DELETE FROM tracks WHERE video_id=?", (video_id,))
            self.execute("DELETE FROM tracklists WHERE video_id=?", (video_id,))

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
        queued/downloading, SoundCloud Go+ previews and geo-blocked tracks - never loadable)
        are skipped."""
        out: list[str] = []
        with self.transaction():
            pos = self._max_queue_pos()
            for vid in ids:
                row = self.get_video(vid)
                if not row or row["status"] not in ENQUEUEABLE or vid in out:
                    continue
                if row.get("preview") or row.get("geo_blocked"):
                    continue  # QA 7a/8: refused here instead of failing at download time
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
        self,
        platform: str,
        duration: int,
        *,
        tolerance: int = 5,
        statuses: Sequence[str] = (),
        same_platform: bool = False,
    ) -> list[dict[str, Any]]:
        """Rows of *other* platforms with a duration within +-tolerance (Phase 7a duplicates);
        `same_platform` (v0.10.0 re-upload pre-check): of every platform."""
        sql = "SELECT id, title, platform, status, duration FROM videos WHERE "
        params: list[Any] = []
        if not same_platform:
            sql += "platform != ? AND "
            params.append(platform)
        sql += "duration BETWEEN ? AND ?"
        params += [duration - tolerance, duration + tolerance]
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
            raise ValueError(f"Invalid sort: {order_by}")
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
            raise ValueError(f"Invalid source type: {type}")
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
            raise ValueError(f"Unknown fields: {', '.join(sorted(bad))}")
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
            self.execute("DELETE FROM backfills WHERE source_id=?", (source_id,))
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

    # -- backfills («Read everything (once)», v0.4.0)

    def get_backfill(self, source_id: int) -> dict[str, Any] | None:
        return self.query_one("SELECT * FROM backfills WHERE source_id=?", (source_id,))

    def list_backfills(self, states: Sequence[str] | None = None) -> list[dict[str, Any]]:
        if not states:
            return self.query("SELECT * FROM backfills ORDER BY started, source_id")
        marks = ",".join("?" for _ in states)
        return self.query(
            f"SELECT * FROM backfills WHERE state IN ({marks}) ORDER BY started, source_id",
            list(states),
        )

    def reset_backfill(self, source_id: int, *, state: str = "pending") -> None:
        """(Re)start a backfill from the beginning (new row or reset of an old one)."""
        now = now_iso()
        self.execute(
            "INSERT INTO backfills(source_id,state,position,total,added,found,requests,failures,"
            "note,started,updated,finished) VALUES (?,?,0,NULL,0,0,0,0,NULL,?,?,NULL) "
            "ON CONFLICT(source_id) DO UPDATE SET state=excluded.state, position=0, total=NULL, "
            "added=0, found=0, requests=0, failures=0, note=NULL, started=excluded.started, "
            "updated=excluded.updated, finished=NULL",
            (source_id, state, now, now),
        )

    _BACKFILL_FIELDS = (
        "state",
        "position",
        "total",
        "added",
        "found",
        "requests",
        "failures",
        "note",
        "started",
        "updated",
        "finished",
    )

    def update_backfill(
        self, source_id: int, *, only_states: Sequence[str] | None = None, **fields: Any
    ) -> bool:
        """Update fields of a backfill row; `only_states`: only while it is in one of these
        states (a pause/cancel of the user is never overwritten). Returns True if a row changed.
        `updated` is set automatically."""
        bad = set(fields) - set(self._BACKFILL_FIELDS)
        if bad:
            raise ValueError(f"Unknown fields: {', '.join(sorted(bad))}")
        fields.setdefault("updated", now_iso())
        sets = ", ".join(f"{k}=?" for k in fields)
        sql = f"UPDATE backfills SET {sets} WHERE source_id=?"
        params: list[Any] = [*fields.values(), source_id]
        if only_states:
            sql += f" AND state IN ({','.join('?' for _ in only_states)})"
            params.extend(only_states)
        return self.execute(sql, params).rowcount > 0

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
