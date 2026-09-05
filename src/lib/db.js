export async function isChatParticipant(db, chatId, userId) {
  const row = await db.prepare('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?').bind(chatId, userId).first();
  return Boolean(row);
}

export async function getChatRole(db, chatId, userId) {
  const row = await db.prepare('SELECT role FROM chat_participants WHERE chat_id = ? AND user_id = ?').bind(chatId, userId).first();
  return row?.role || null;
}

export async function getChatParticipants(db, chatId) {
  const result = await db.prepare(`SELECT u.id, u.username, u.phone, u.display_name, u.avatar_url, u.bio, u.language, u.last_seen, u.is_verified, cp.role, cp.joined_at, cp.last_read_message_id
    FROM chat_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.chat_id = ? ORDER BY cp.joined_at`).bind(chatId).all();
  return result.results || [];
}

export async function assertParticipant(db, chatId, userId) {
  if (!(await isChatParticipant(db, chatId, userId))) {
    const error = new Error('You are not a participant in this chat');
    error.status = 403;
    throw error;
  }
}

export const requireParticipant = assertParticipant;

export function messageRow(row) {
  if (!row) return null;
  return { ...row, isEdited: Boolean(row.is_edited), isDeleted: Boolean(row.is_deleted) };
}
