import { Hono } from 'hono';
import { assertParticipant } from '../lib/db.js';
import { cleanText, generateId, jsonBody, parseLimit } from '../lib/utils.js';

export const messageRoutes = new Hono();

async function participant(c, chatId) {
  try { await assertParticipant(c.env.DB, chatId, c.get('userId')); return true; } catch { return false; }
}

messageRoutes.get('/chats/:id/messages', async c => {
  const chatId = c.req.param('id');
  if (!await participant(c, chatId)) return c.json({ error: 'Forbidden' }, 403);
  const limit = parseLimit(c.req.query('limit'));
  const cursor = Number(c.req.query('cursor'));
  const where = Number.isFinite(cursor) ? 'AND created_at < ?' : '';
  const binds = Number.isFinite(cursor) ? [chatId, cursor, limit + 1] : [chatId, limit + 1];
  const rows = await c.env.DB.prepare(`SELECT m.*, u.display_name AS sender_name FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.chat_id = ? AND m.is_deleted = 0 ${where} ORDER BY m.created_at DESC LIMIT ?`).bind(...binds).all();
  const messages = rows.results || [];
  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();
  return c.json({ messages, nextCursor: hasMore ? messages.at(-1)?.created_at || null : null });
});

messageRoutes.post('/chats/:id/messages', async c => {
  const chatId = c.req.param('id');
  if (!await participant(c, chatId)) return c.json({ error: 'Forbidden' }, 403);
  const body = await jsonBody(c);
  const text = cleanText(body?.text);
  const mediaUrl = typeof body?.mediaUrl === 'string' ? body.mediaUrl.slice(0, 1000) : null;
  if (!text && !mediaUrl) return c.json({ error: 'Message text or media is required' }, 400);
  const id = generateId();
  const now = Date.now();
  const type = ['text', 'image', 'video', 'audio', 'file', 'sticker'].includes(body?.messageType) ? body.messageType : 'text';
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO messages (id, chat_id, sender_id, text, message_type, media_url, media_size, reply_to_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, chatId, c.get('userId'), text, type, mediaUrl, Number(body?.mediaSize) || null, body?.replyToId || null, now),
    c.env.DB.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').bind(now, chatId),
  ]);
  return c.json({ message: { id, chat_id: chatId, sender_id: c.get('userId'), text, message_type: type, media_url: mediaUrl, status: 'sent', created_at: now } }, 201);
});

messageRoutes.get('/chats/:id/messages/search', async c => {
  const chatId = c.req.param('id');
  if (!await participant(c, chatId)) return c.json({ error: 'Forbidden' }, 403);
  const query = (c.req.query('q') || '').trim().slice(0, 100);
  if (!query) return c.json({ messages: [] });
  const result = await c.env.DB.prepare('SELECT * FROM messages WHERE chat_id = ? AND text LIKE ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 50').bind(chatId, `%${query}%`).all();
  return c.json({ messages: result.results || [] });
});

messageRoutes.put('/messages/:id', async c => {
  const text = cleanText((await jsonBody(c))?.text);
  if (!text) return c.json({ error: 'Message text is required' }, 400);
  const result = await c.env.DB.prepare('UPDATE messages SET text = ?, is_edited = 1, edited_at = ? WHERE id = ? AND sender_id = ? AND is_deleted = 0').bind(text, Date.now(), c.req.param('id'), c.get('userId')).run();
  if (!result.meta?.changes) return c.json({ error: 'Message not found or not owned by you' }, 404);
  return c.json({ ok: true });
});

messageRoutes.delete('/messages/:id', async c => {
  const result = await c.env.DB.prepare('UPDATE messages SET is_deleted = 1, text = NULL, media_url = NULL WHERE id = ? AND sender_id = ?').bind(c.req.param('id'), c.get('userId')).run();
  if (!result.meta?.changes) return c.json({ error: 'Message not found or not owned by you' }, 404);
  return c.json({ ok: true });
});

messageRoutes.post('/messages/:id/read', async c => {
  const message = await c.env.DB.prepare('SELECT chat_id FROM messages WHERE id = ?').bind(c.req.param('id')).first();
  if (!message || !await participant(c, message.chat_id)) return c.json({ error: 'Message not found' }, 404);
  const now = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE messages SET status = CASE WHEN status IN ('sent', 'delivered') THEN 'read' ELSE status END WHERE id = ?").bind(c.req.param('id')),
    c.env.DB.prepare("INSERT INTO message_status (id, message_id, user_id, status, timestamp) VALUES (?, ?, ?, 'read', ?) ON CONFLICT(message_id, user_id) DO UPDATE SET status = 'read', timestamp = excluded.timestamp").bind(generateId(), c.req.param('id'), c.get('userId'), now),
    c.env.DB.prepare('UPDATE chat_participants SET last_read_message_id = ? WHERE chat_id = ? AND user_id = ?').bind(c.req.param('id'), message.chat_id, c.get('userId')),
  ]);
  return c.json({ ok: true });
});
