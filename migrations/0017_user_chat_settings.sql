-- Migration 0017: User Chat Settings
-- Adds mute_notifications column to users table
ALTER TABLE users ADD COLUMN mute_notifications INTEGER DEFAULT 0;
