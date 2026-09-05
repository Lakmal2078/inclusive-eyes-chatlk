-- Missing indexes for frequently-queried columns

CREATE INDEX IF NOT EXISTS idx_message_status_user
  ON message_status(user_id);

CREATE INDEX IF NOT EXISTS idx_message_status_msg
  ON message_status(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_chat
  ON chat_participants(chat_id);
