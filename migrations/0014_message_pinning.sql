-- Migration 0013: Message Pinning
-- Adds pinning fields to messages

ALTER TABLE messages ADD COLUMN is_pinned INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN pinned_by TEXT;
ALTER TABLE messages ADD COLUMN pinned_at TEXT;
