/**
 * Admin Dashboard & Analytics Routes (Feature 14)
 */

import { Hono } from 'hono';
import { requireAdmin } from '../middleware/auth.js';

const adminRoutes = new Hono();

// Apply requireAdmin to all admin endpoints
adminRoutes.use('*', requireAdmin);

/**
 * GET /api/admin/stats - System overview metrics
 */
adminRoutes.get('/stats', async c => {
  const db = c.env.DB;
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  // 1. Total users
  const usersCount = await db.prepare('SELECT COUNT(*) as count FROM users').first();

  // 2. Active users (last 24 hours based on last_seen or is_online)
  const activeCount = await db.prepare(`
    SELECT COUNT(*) as count FROM users
    WHERE is_online = 1 OR last_seen >= datetime('now', '-1 day')
  `).first();

  // 3. Total messages
  const msgCount = await db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_deleted = 0').first();

  // 4. Total groups
  const groupCount = await db.prepare('SELECT COUNT(*) as count FROM groups').first();

  // 5. Storage usage estimate (from media files recorded)
  const mediaStats = await db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(media_size), 0) as total_bytes
    FROM messages WHERE media_url IS NOT NULL
  `).first();

  return c.json({
    totalUsers: Number(usersCount?.count || 0),
    activeUsers24h: Number(activeCount?.count || 0),
    totalMessages: Number(msgCount?.count || 0),
    totalGroups: Number(groupCount?.count || 0),
    storageUsage: {
      mediaFilesCount: Number(mediaStats?.count || 0),
      estimatedBytes: Number(mediaStats?.total_bytes || 0),
      estimatedMB: ((Number(mediaStats?.total_bytes || 0)) / (1024 * 1024)).toFixed(2)
    }
  });
});

/**
 * GET /api/admin/stats/messages - Messages per day (last 30 days)
 */
adminRoutes.get('/stats/messages', async c => {
  const db = c.env.DB;
  const res = await db.prepare(`
    SELECT date(created_at / 1000, 'unixepoch') as date, COUNT(*) as count
    FROM messages
    WHERE created_at >= ?
    GROUP BY date
    ORDER BY date ASC
  `).bind(Date.now() - 30 * 24 * 60 * 60 * 1000).all();

  return c.json({
    stats: res.results || []
  });
});

/**
 * GET /api/admin/stats/users - New users per day (last 30 days)
 */
adminRoutes.get('/stats/users', async c => {
  const db = c.env.DB;
  const res = await db.prepare(`
    SELECT date(created_at / 1000, 'unixepoch') as date, COUNT(*) as count
    FROM users
    WHERE created_at >= ?
    GROUP BY date
    ORDER BY date ASC
  `).bind(Date.now() - 30 * 24 * 60 * 60 * 1000).all();

  return c.json({
    stats: res.results || []
  });
});

/**
 * GET /api/admin/users - List users with pagination and search
 */
adminRoutes.get('/users', async c => {
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 20)));
  const offset = (page - 1) * limit;
  const q = c.req.query('q')?.trim();

  let sql = `SELECT id, username, phone, display_name, avatar_url, role, is_online, last_seen, created_at FROM users`;
  const params = [];

  if (q) {
    sql += ` WHERE username LIKE ? OR display_name LIKE ? OR phone LIKE ?`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const list = await c.env.DB.prepare(sql).bind(...params).all();

  const countRes = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
  const total = Number(countRes?.count || 0);

  return c.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    users: list.results || []
  });
});

/**
 * GET /api/admin/flagged-messages - Flagged messages for moderation review
 */
adminRoutes.get('/flagged-messages', async c => {
  const res = await c.env.DB.prepare(`
    SELECT fm.*, m.text, m.sender_id, m.chat_id, u.username as sender_username, u.display_name as sender_display_name
    FROM flagged_messages fm
    JOIN messages m ON fm.message_id = m.id
    JOIN users u ON m.sender_id = u.id
    ORDER BY fm.created_at DESC
    LIMIT 50
  `).all();

  return c.json({
    count: res.results?.length || 0,
    flaggedMessages: res.results || []
  });
});

/**
 * POST /api/admin/flagged-messages/:id/review - Mark flagged message as reviewed
 */
adminRoutes.post('/flagged-messages/:id/review', async c => {
  const reviewerId = c.get('userId');
  const id = c.req.param('id');
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'UPDATE flagged_messages SET reviewed = 1, reviewed_by = ?, reviewed_at = ? WHERE id = ?'
  ).bind(reviewerId, now, id).run();

  return c.json({ success: true, message: 'Message review status updated' });
});

export default adminRoutes;
