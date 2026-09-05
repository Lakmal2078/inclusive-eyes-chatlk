/**
 * Message Search Routes (Feature 7)
 */

import { Hono } from 'hono';

const searchRoutes = new Hono();

/**
 * GET /api/search/messages - Full-text message search with date range and chat filtering
 */
searchRoutes.get('/messages', async c => {
  const userId = c.get('userId');
  const q = c.req.query('q')?.trim() || '';
  const chatId = c.req.query('chatId');
  const from = c.req.query('from');
  const to = c.req.query('to');

  if (!q) {
    return c.json({ error: 'Search query (q) is required' }, 400);
  }

  // Base query ensures user is participant in the chat
  let sql = `
    SELECT m.*, u.username as sender_username, u.display_name as sender_display_name,
           c.name as chat_name, c.type as chat_type
    FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id AND cp.user_id = ?
    JOIN chats c ON m.chat_id = c.id
    JOIN users u ON m.sender_id = u.id
    WHERE m.is_deleted = 0
  `;
  const params = [userId];

  // FTS5 or LIKE search matching
  sql += ` AND m.text LIKE ?`;
  params.push(`%${q}%`);

  if (chatId) {
    sql += ` AND m.chat_id = ?`;
    params.push(chatId);
  }

  if (from) {
    const fromTime = isNaN(Number(from)) ? new Date(from).getTime() : Number(from);
    if (!isNaN(fromTime)) {
      sql += ` AND m.created_at >= ?`;
      params.push(fromTime);
    }
  }

  if (to) {
    const toTime = isNaN(Number(to)) ? new Date(to).getTime() : Number(to);
    if (!isNaN(toTime)) {
      sql += ` AND m.created_at <= ?`;
      params.push(toTime);
    }
  }

  sql += ` ORDER BY m.created_at DESC LIMIT 50`;

  const results = await c.env.DB.prepare(sql).bind(...params).all();

  return c.json({
    query: q,
    count: results.results?.length || 0,
    messages: results.results || []
  });
});

export default searchRoutes;
