"""SQLite helpers. Plain sqlite3, no ORM: write SQL, get dicts back."""

import sqlite3

from app import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    village TEXT,
    language TEXT NOT NULL,            -- 'mr' | 'hi' | 'ta'
    pct_reading_beginner INTEGER,      -- % of Gr 1-3 children at letter level or below
    pct_numeracy_beginner INTEGER      -- % of Gr 1-3 children who cannot recognise 1-9
);

CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL REFERENCES schools(id),
    name TEXT NOT NULL,
    grade INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT UNIQUE,             -- id created on the phone, makes sync safe to retry
    school_id INTEGER NOT NULL REFERENCES schools(id),
    teacher_id INTEGER NOT NULL REFERENCES teachers(id),
    subject TEXT,                      -- 'literacy' | 'numeracy'
    language TEXT NOT NULL,
    rubric_json TEXT,                  -- {item_id: 'yes' | 'partly' | 'no'}
    typed_note TEXT,
    observed_at TEXT,
    status TEXT NOT NULL DEFAULT 'queued',  -- queued | transcribing | generating | ready | approved | failed
    error TEXT,                        -- why the last run failed (shown to the CRP)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voice_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL REFERENCES visits(id),
    audio_path TEXT,
    mime TEXT,
    transcript TEXT
);

CREATE TABLE IF NOT EXISTS packets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL UNIQUE REFERENCES visits(id),
    original_json TEXT NOT NULL,       -- what Claude produced
    edited_json TEXT,                  -- what the CRP approved (to measure edit rate)
    share_token TEXT UNIQUE,
    teacher_rating INTEGER,            -- unused: the rating is asked at the next visit (followups)
    approved_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id INTEGER NOT NULL UNIQUE REFERENCES visits(id),
    status TEXT NOT NULL,              -- done | partly | not_done
    note TEXT,
    teacher_rating INTEGER,            -- 1-5: how useful the teacher found the last packet
    checked_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""


def get_conn():
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# Columns added after the first release. CREATE TABLE IF NOT EXISTS skips existing
# tables, so add these to older databases by hand.
ADDED_COLUMNS = [
    ("visits", "typed_note", "TEXT"),
    ("visits", "error", "TEXT"),
    ("voice_notes", "mime", "TEXT"),
    ("followups", "teacher_rating", "INTEGER"),
]


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        for table, column, kind in ADDED_COLUMNS:
            existing = [row["name"] for row in conn.execute(f"PRAGMA table_info({table})")]
            if column not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {kind}")


def query(sql, params=()):
    """Run a SELECT and return a list of dicts."""
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(row) for row in rows]


def query_one(sql, params=()):
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql, params=()):
    """Run an INSERT/UPDATE/DELETE and return the new row id."""
    with get_conn() as conn:
        cursor = conn.execute(sql, params)
        return cursor.lastrowid
