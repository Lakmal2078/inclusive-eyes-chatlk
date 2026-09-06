-- Recreate message search triggers with standard FTS5 row deletes.
-- This migration is needed for databases that already applied 0019.
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  sender_id,
  chat_id,
  created_at,
  message_id UNINDEXED
);

DROP TRIGGER IF EXISTS messages_fts_ai;
DROP TRIGGER IF EXISTS messages_fts_ad;
DROP TRIGGER IF EXISTS messages_fts_au;

CREATE TRIGGER IF NOT EXISTS messages_fts_ai AFTER INSERT ON messages
WHEN new.text IS NOT NULL AND new.text <> ''
BEGIN
  INSERT INTO messages_fts(content, sender_id, chat_id, created_at, message_id)
  VALUES (new.text, new.sender_id, new.chat_id, new.created_at, new.id);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_ad AFTER DELETE ON messages
WHEN old.text IS NOT NULL AND old.text <> ''
BEGIN
  DELETE FROM messages_fts WHERE message_id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_au AFTER UPDATE OF text, sender_id, chat_id, created_at ON messages
BEGIN
  DELETE FROM messages_fts WHERE message_id = old.id;
  INSERT INTO messages_fts(content, sender_id, chat_id, created_at, message_id)
  SELECT new.text, new.sender_id, new.chat_id, new.created_at, new.id
  WHERE new.text IS NOT NULL AND new.text <> '';
END;
