-- Migration 0005: Group Chat Support
-- Adds groups and group_members tables

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin' or 'member'
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
