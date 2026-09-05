-- Migration 0015: Admin Dashboard & Roles
-- Adds role column to users

ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'; -- 'user' or 'admin'
