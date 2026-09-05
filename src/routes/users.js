import { Hono } from 'hono';
import { deleteFile, uploadFile } from '../lib/r2.js';
import { generateId, jsonBody, mediaExtension, publicUser } from '../lib/utils.js';

export const userRoutes = new Hono();

userRoutes.get('/me', async c => c.json(publicUser(await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('userId')).first())));

userRoutes.put('/me', async c => {
  const body = await jsonBody(c);
  if (!body || (body.language && !['si', 'ta', 'en'].includes(body.language))) return c.json({ error: 'Invalid profile data' }, 400);
  await c.env.DB.prepare(`UPDATE users SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), language = COALESCE(?, language), avatar_url = COALESCE(?, avatar_url), updated_at = ? WHERE id = ?`)
    .bind(typeof body.display_name === 'string' ? body.display_name.trim().slice(0, 80) : null, typeof body.bio === 'string' ? body.bio.trim().slice(0, 500) : null, body.language || null, body.avatar_url || null, Date.now(), c.get('userId')).run();
  return c.json({ user: publicUser(await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('userId')).first()) });
});

userRoutes.post('/me/avatar', async c => {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 5 * 1024 * 1024) return c.json({ error: 'Avatar must be an image up to 5MB' }, 400);
  const key = `avatars/${c.get('userId')}/${Date.now()}-${generateId()}.${mediaExtension(file.name)}`;
  await uploadFile(c.env, key, file.stream(), file.type, { userId: c.get('userId') });
  const url = `/api/media/${key}`;
  await c.env.DB.prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?').bind(url, Date.now(), c.get('userId')).run();
  return c.json({ url }, 201);
});

userRoutes.get('/search', async c => {
  const query = (c.req.query('q') || '').trim().slice(0, 40);
  if (query.length < 2) return c.json({ users: [] });
  const like = `%${query}%`;
  const result = await c.env.DB.prepare(`SELECT id, username, display_name, avatar_url, is_verified FROM users
    WHERE id != ? AND (username LIKE ? OR phone LIKE ? OR display_name LIKE ?) LIMIT 20`).bind(c.get('userId'), like, like, like).all();
  return c.json({ users: result.results || [] });
});

userRoutes.get('/contacts', async c => {
  const result = await c.env.DB.prepare(`SELECT u.id, u.username, u.phone, u.display_name, u.avatar_url, c.nickname, c.is_blocked
    FROM contacts c JOIN users u ON u.id = c.contact_id WHERE c.user_id = ? ORDER BY u.display_name`).bind(c.get('userId')).all();
  return c.json({ contacts: result.results || [] });
});

userRoutes.post('/contacts', async c => {
  const body = await jsonBody(c);
  const me = c.get('userId');
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE username = ? OR phone = ?').bind(body?.identifier, body?.identifier).first();
  if (!user || user.id === me) return c.json({ error: 'Contact not found' }, 404);
  await c.env.DB.prepare('INSERT OR IGNORE INTO contacts (id, user_id, contact_id, nickname, created_at) VALUES (?, ?, ?, ?, ?)').bind(generateId(), me, user.id, body.nickname?.slice(0, 80) || null, Date.now()).run();
  return c.json({ ok: true }, 201);
});

userRoutes.patch('/contacts/:id', async c => {
  const body = await jsonBody(c);
  await c.env.DB.prepare('UPDATE contacts SET nickname = COALESCE(?, nickname), is_blocked = COALESCE(?, is_blocked) WHERE user_id = ? AND contact_id = ?')
    .bind(body?.nickname ?? null, body?.is_blocked == null ? null : Boolean(body.is_blocked) ? 1 : 0, c.get('userId'), c.req.param('id')).run();
  return c.json({ ok: true });
});

userRoutes.delete('/contacts/:id', async c => {
  await c.env.DB.prepare('DELETE FROM contacts WHERE user_id = ? AND contact_id = ?').bind(c.get('userId'), c.req.param('id')).run();
  return c.json({ ok: true });
});
