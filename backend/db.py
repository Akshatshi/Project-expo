import re
import sqlite3
from pathlib import Path

from flask import current_app, g

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    user_id       TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- one profile per student: current skills + chosen target internship
CREATE TABLE IF NOT EXISTS profiles (
    user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    course           TEXT NOT NULL DEFAULT '',
    year             TEXT NOT NULL DEFAULT '',
    skills_json      TEXT NOT NULL DEFAULT '[]',
    internship_id    TEXT,
    custom_json      TEXT,
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analyses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_title  TEXT NOT NULL,
    match_percent REAL NOT NULL,
    result_json   TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roadmaps (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_id   INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    source        TEXT NOT NULL,            -- 'ai' or 'fallback'
    model         TEXT,
    hours_per_week INTEGER NOT NULL,
    summary       TEXT NOT NULL DEFAULT '',
    weeks_json    TEXT NOT NULL,
    ai_status     TEXT,
    ai_note       TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
    roadmap_id  INTEGER NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
    week        INTEGER NOT NULL,
    task_index  INTEGER NOT NULL,
    completed   INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (roadmap_id, week, task_index)
);

CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lang         TEXT NOT NULL,
    claim        INTEGER NOT NULL,
    paper_json   TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'started',
    started_at   TEXT NOT NULL,
    submitted_at TEXT,
    result_json  TEXT
);

CREATE TABLE IF NOT EXISTS user_data (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key        TEXT NOT NULL,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS question_stats (
    question_id TEXT PRIMARY KEY,
    attempts    INTEGER NOT NULL DEFAULT 0,
    correct     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_assess_user ON assessments(user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON roadmaps(user_id, id DESC);
"""


_ID_TABLES = ("users", "analyses", "roadmaps", "assessments")   # tables whose INSERT must return the new id


def _pg_schema() -> list:
    sql = SCHEMA.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
    sql = sql.replace("DEFAULT (datetime('now'))", "DEFAULT (to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS'))")
    sql = sql.replace(" REAL ", " DOUBLE PRECISION ")
    sql = re.sub(r"--[^\n]*", "", sql)                      # drop comments
    return [x.strip() for x in sql.split(";") if x.strip()]


def to_pg(sql: str) -> str:
    return sql.replace("%", "%%").replace("?", "%s")


class _PgCursor:
    def __init__(self, cur, lastrowid=None):
        self._cur, self.lastrowid = cur, lastrowid

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()


class PgConnection:

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=()):
        sql = to_pg(sql)
        wants_id = bool(re.match(r"\s*INSERT\s+INTO\s+(" + "|".join(_ID_TABLES) + r")\b", sql, re.I))
        if wants_id:
            sql = sql.rstrip().rstrip(";") + " RETURNING id"
        cur = self._conn.execute(sql, tuple(params))
        return _PgCursor(cur, cur.fetchone()["id"] if wants_id else None)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def _pg_connect(url: str):
    import psycopg
    from psycopg.rows import dict_row
    if url.startswith("postgres://"):                       # some providers still use the old scheme
        url = "postgresql://" + url[len("postgres://"):]
    return psycopg.connect(url, row_factory=dict_row, connect_timeout=15)


def get_db():
    if "db" not in g:
        url = current_app.config.get("DATABASE_URL")
        if url:
            g.db = PgConnection(_pg_connect(url))
        else:
            conn = sqlite3.connect(current_app.config["DATABASE_PATH"])
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            g.db = conn
    return g.db


def close_db(_exc=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db(app):
    url = app.config.get("DATABASE_URL")
    if url:
        conn = _pg_connect(url)
        try:
            conn.execute("SELECT pg_advisory_lock(727274)")   # several gunicorn workers start together
            for stmt in _pg_schema():
                conn.execute(stmt)
            conn.execute("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS ai_status TEXT")
            conn.execute("ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS ai_note TEXT")
            conn.execute("SELECT pg_advisory_unlock(727274)")
            conn.commit()
        finally:
            conn.close()
        return
    Path(app.config["DATABASE_PATH"]).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(app.config["DATABASE_PATH"])
    conn.executescript(SCHEMA)
    for column in ("ai_status", "ai_note"):          # older database files do not have these yet
        try:
            conn.execute(f"ALTER TABLE roadmaps ADD COLUMN {column} TEXT")
        except sqlite3.OperationalError:
            pass
    conn.commit()
    conn.close()


def init_app(app):
    app.teardown_appcontext(close_db)
    init_db(app)
