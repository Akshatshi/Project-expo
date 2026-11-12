"""SQLite helpers (standard library only)."""
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

CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON roadmaps(user_id, id DESC);
"""


def get_db() -> sqlite3.Connection:
    if "db" not in g:
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
    Path(app.config["DATABASE_PATH"]).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(app.config["DATABASE_PATH"])
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def init_app(app):
    app.teardown_appcontext(close_db)
    init_db(app)
