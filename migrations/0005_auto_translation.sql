-- Migration 0004: Auto-translation support
-- Adds translations storage to messages and auto_translate preference to users

ALTER TABLE messages ADD COLUMN translations TEXT;
ALTER TABLE users ADD COLUMN auto_translate INTEGER DEFAULT 1;
