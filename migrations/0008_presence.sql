-- Migration 0008: Online/Offline Presence Tracking
-- Adds online presence flag to users

ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0;
