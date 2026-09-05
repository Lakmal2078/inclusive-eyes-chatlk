-- Migration 0012: AI Content Moderation
-- Adds moderation fields to messages and a flagged_messages review table

ALTER TABLE messages ADD COLUMN moderation_status TEXT DEFAULT 'clean';
ALTER TABLE messages ADD COLUMN moderation_reason TEXT;

CREATE TABLE IF NOT EXISTS flagged_messages (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  reason TEXT,
  severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
  reviewed INTEGER DEFAULT 0,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flagged_messages_msg ON flagged_messages(message_id);
