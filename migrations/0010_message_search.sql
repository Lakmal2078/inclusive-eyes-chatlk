-- Migration 0009: Message Search (Full-Text Search)
-- Creates FTS5 virtual table for full-text search indexing

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  sender_id,
  chat_id,
  created_at,
  message_id UNINDEXED
);
