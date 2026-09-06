/**
 * Message Search Routes (Feature 7)
 * Uses FTS5 virtual table (messages_fts) for fast full-text search.
 * Falls back to LIKE scan if the FTS5 table is unavailable (e.g. fresh
 * install before migration 0019 has run).
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

  // Try FTS5 first for fast ranked search
  try {
    let ftsSql = `
      SELECT m.*, u.username as sender_username, u.display_name as sender_display_name,
             c.name as chat_name, c.type as chat_type
      FROM messages_fts f
      JOIN messages m ON m.id = f.message_id
      JOIN chat_participants cp ON m.chat_id = cp.chat_id AND cp.user_id = ?
      JOIN chats c ON m.chat_id = c.id
      JOIN users u ON m.sender_id = u.id
      WHERE m.is_deleted = 0
        AND messages_fts MATCH ?
    `;
    const ftsParams = [userId, q];

    if (chatId) {
      ftsSql += ` AND m.chat_id = ?`;
      ftsParams.push(chatId);
    }
    if (from) {
      const fromTime = isNaN(Number(from)) ? new Date(from).getTime() : Number(from);
      if (!isNaN(fromTime)) { ftsSql += ` AND m.created_at >= ?`; ftsParams.push(fromTime); }
    }
    if (to) {
      const toTime = isNaN(Number(to)) ? new Date(to).getTime() : Number(to);
      if (!isNaN(toTime)) { ftsSql += ` AND m.created_at <= ?`; ftsParams.push(toTime); }
    }

    ftsSql += ` ORDER BY rank LIMIT 50`;

    const results = await c.env.DB.prepare(ftsSql).bind(...ftsParams).all();
    return c.json({ query: q, count: results.results?.length || 0, messages: results.results || [], engine: 'fts5' });
  } catch {
    // FTS5 table not yet available — fall back to LIKE scan
  }

  // Fallback: LIKE scan
  let sql = `
    SELECT m.*, u.username as sender_username, u.display_name as sender_display_name,
           c.name as chat_name, c.type as chat_type
    FROM messages m
    JOIN chat_participants cp ON m.chat_id = cp.chat_id AND cp.user_id = ?
    JOIN chats c ON m.chat_id = c.id
    JOIN users u ON m.sender_id = u.id
    WHERE m.is_deleted = 0
      AND m.text LIKE ?
  `;
  const params = [userId, `%${q}%`];

  if (chatId) { sql += ` AND m.chat_id = ?`; params.push(chatId); }
  if (from) {
    const fromTime = isNaN(Number(from)) ? new Date(from).getTime() : Number(from);
    if (!isNaN(fromTime)) { sql += ` AND m.created_at >= ?`; params.push(fromTime); }
  }
  if (to) {
    const toTime = isNaN(Number(to)) ? new Date(to).getTime() : Number(to);
    if (!isNaN(toTime)) { sql += ` AND m.created_at <= ?`; params.push(toTime); }
  }
  sql += ` ORDER BY m.created_at DESC LIMIT 50`;

  const results = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ query: q, count: results.results?.length || 0, messages: results.results || [], engine: 'like' });
});

export default searchRoutes;
