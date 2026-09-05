-- FTS5 sync triggers for messages_fts
-- Uses messages.id (TEXT PK) as FTS rowid

CREATE TRIGGER IF NOT EXISTS messages_fts_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content, sender_id, chat_id, created_at)
  VALUES (new.id, new.text, new.sender_id, new.chat_id, new.created_at);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content, sender_id, chat_id, created_at)
  VALUES ('delete', old.id, old.text, old.sender_id, old.chat_id, old.created_at);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_au AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content, sender_id, chat_id, created_at)
  VALUES ('delete', old.id, old.text, old.sender_id, old.chat_id, old.created_at);
  INSERT INTO messages_fts(rowid, content, sender_id, chat_id, created_at)
  VALUES (new.id, new.text, new.sender_id, new.chat_id, new.created_at);
END;
