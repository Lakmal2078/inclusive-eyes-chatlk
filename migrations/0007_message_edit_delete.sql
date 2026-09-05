-- Migration 0007: Message Editing & Deletion
-- Adds fields for soft deletion and tracking message edits

ALTER TABLE messages ADD COLUMN deleted_at TEXT;
