-- is_edited, edited_at, is_deleted already exist
-- Only add deleted_at
ALTER TABLE messages ADD COLUMN deleted_at TEXT;
