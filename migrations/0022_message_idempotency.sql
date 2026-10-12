-- Migration 0022: Message Idempotency Support (client_id)
ALTER TABLE messages ADD COLUMN client_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id) WHERE client_id IS NOT NULL;
