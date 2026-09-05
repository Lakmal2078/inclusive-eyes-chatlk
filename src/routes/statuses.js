import { Hono } from 'hono';
import { assertParticipant } from '../lib/db.js';
import { generateId, jsonBody } from '../lib/utils.js';

export const statusRoutes = new Hono();

statusRoutes.get('/', async c => {
  const now = Date.now();
  const result = await c.env.DB.prepare(`SELECT s.id, s.user_id, s.text, s.media_url, s.media_type, s.created_at, s.expires_at,
    u.username, u.display_name, u.avatar_url, u.is_verified,
    (SELECT COUNT(*) FROM status_views sv WHERE sv.status_id = s.id) AS viewer_count,
    EXISTS(SELECT 1 FROM status_views ownv WHERE ownv.status_id = s.id AND ownv.viewer_id = ?) AS viewed
    FROM statuses s JOIN users u ON u.id = s.user_id
    WHERE s.expires_at > ? ORDER BY s.created_at DESC`).bind(c.get('userId'), now).all();
  return c.json({ statuses: result.results || [] });
});

statusRoutes.post('/', async c => {
  const body = await jsonBody(c);
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 700) : '';
  const mediaUrl = typeof body?.mediaUrl === 'string' ? body.mediaUrl.slice(0, 1000) : null;
  const mediaType = typeof body?.mediaType === 'string' ? body.mediaType.slice(0, 80) : null;
  if (!text && !mediaUrl) return c.json({ error: 'Status text or media is required' }, 400);
  if (mediaType && !['image/jpeg','image/png','image/webp','image/gif','video/mp4'].includes(mediaType)) return c.json({ error: 'Unsupported status media type' }, 400);
  const now = Date.now();
  const id = generateId();
  await c.env.DB.prepare('INSERT INTO statuses (id, user_id, text, media_url, media_type, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, c.get('userId'), text, mediaUrl, mediaType, now, now + 24 * 60 * 60 * 1000).run();
  return c.json({ id, created_at: now, expires_at: now + 24 * 60 * 60 * 1000 }, 201);
});

statusRoutes.post('/:id/view', async c => {
  const status = await c.env.DB.prepare('SELECT id, user_id FROM statuses WHERE id = ? AND expires_at > ?').bind(c.req.param('id'), Date.now()).first();
  if (!status) return c.json({ error: 'Status not found' }, 404);
  await c.env.DB.prepare('INSERT OR IGNORE INTO status_views (id, status_id, viewer_id, viewed_at) VALUES (?, ?, ?, ?)').bind(generateId(), status.id, c.get('userId'), Date.now()).run();
  return c.json({ ok: true });
});

statusRoutes.delete('/:id', async c => {
  const result = await c.env.DB.prepare('DELETE FROM statuses WHERE id = ? AND user_id = ?').bind(c.req.param('id'), c.get('userId')).run();
  if (!result.meta?.changes) return c.json({ error: 'Status not found' }, 404);
  return c.json({ ok: true });
});
