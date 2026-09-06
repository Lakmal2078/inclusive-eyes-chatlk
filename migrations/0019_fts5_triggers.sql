-- FTS5 message search index. Rebuild the earlier schema so TEXT message IDs
-- are stored explicitly instead of being coerced into the INTEGER rowid.
DROP TABLE IF EXISTS messages_fts;

-- FTS5 rowid is an internal INTEGER; message_id preserves the TEXT PK.
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  sender_id,
  chat_id,
  created_at,
  message_id UNINDEXED
);

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

-- Backfill rows created before this migration.
INSERT INTO messages_fts(content, sender_id, chat_id, created_at, message_id)
SELECT m.text, m.sender_id, m.chat_id, m.created_at, m.id
FROM messages m
WHERE m.text IS NOT NULL AND m.text <> ''
  AND NOT EXISTS (SELECT 1 FROM messages_fts f WHERE f.message_id = m.id);
