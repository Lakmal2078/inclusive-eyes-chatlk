-- last_seen already exists
-- Only add is_online
ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0;
