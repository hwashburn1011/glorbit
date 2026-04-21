import type { Db } from "./connection.js";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS agents (
  id            TEXT PRIMARY KEY,
  handle        TEXT NOT NULL UNIQUE,
  repo_label    TEXT NOT NULL,
  repo_path     TEXT NOT NULL,
  provider      TEXT NOT NULL,
  launch_cmd    TEXT NOT NULL,
  color_key     TEXT NOT NULL,
  avatar_text   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'idle',
  current_task  TEXT,
  created_at    INTEGER NOT NULL,
  last_active   INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  agent_id        TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  pid             INTEGER,
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER,
  exit_code       INTEGER,
  tokens_used     INTEGER NOT NULL DEFAULT 0,
  cost_usd_cents  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id, started_at);

CREATE TABLE IF NOT EXISTS messages (
  id            TEXT PRIMARY KEY,
  session_id    TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  author_type   TEXT NOT NULL,
  author_id     TEXT,
  kind          TEXT NOT NULL,
  body          TEXT NOT NULL,
  mentions      TEXT NOT NULL DEFAULT '[]',
  metadata      TEXT NOT NULL DEFAULT '{}',
  created_at    INTEGER NOT NULL,
  read_at       INTEGER
);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_author  ON messages(author_type, author_id);
CREATE INDEX IF NOT EXISTS idx_messages_kind    ON messages(kind);

CREATE TABLE IF NOT EXISTS ops (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  op_type       TEXT NOT NULL,
  summary       TEXT NOT NULL,
  raw_excerpt   TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ops_session ON ops(session_id, created_at);

CREATE TABLE IF NOT EXISTS pinned_messages (
  message_id   TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  pinned_at    INTEGER NOT NULL
);
`;

export function initSchema(db: Db): void {
  db.exec(SCHEMA_SQL);
}
