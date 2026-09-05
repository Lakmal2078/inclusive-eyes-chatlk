import { Hono } from 'hono';
import { deleteFile, uploadFile } from '../lib/r2.js';
import { generateId, jsonBody, mediaExtension, publicUser } from '../lib/utils.js';
import { dbService } from '../services/database.js';

export const userRoutes = new Hono();

/**
 * GET /api/users/me - Get current user profile
 */
userRoutes.get('/me', async c => {
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('userId')).first();
  return c.json(publicUser(user));
});

/**
 * PATCH /api/users/me - Update own profile (displayName, bio, autoTranslate, language)
 */
userRoutes.patch('/me', async c => {
  const body = await jsonBody(c);
  if (!body) return c.json({ error: 'Invalid body' }, 400);

  const displayName = body.displayName || body.display_name;
  const bio = body.bio;
  const autoTranslate = body.autoTranslate !== undefined ? (body.autoTranslate ? 1 : 0) : body.auto_translate;
  const muteNotifications = body.muteNotifications !== undefined ? (body.muteNotifications ? 1 : 0) : (body.mute_notifications !== undefined ? (body.mute_notifications ? 1 : 0) : (body.mute !== undefined ? (body.mute ? 1 : 0) : undefined));
  const language = body.language;

  const fields = [];
  const values = [];

  if (displayName !== undefined && typeof displayName === 'string') {
    fields.push('display_name = ?');
    values.push(displayName.trim().slice(0, 80));
  }
  if (bio !== undefined) {
    fields.push('bio = ?');
    values.push(typeof bio === 'string' ? bio.trim().slice(0, 500) : null);
  }
  if (autoTranslate !== undefined) {
    fields.push('auto_translate = ?');
    values.push(autoTranslate ? 1 : 0);
  }
  if (muteNotifications !== undefined) {
    fields.push('mute_notifications = ?');
    values.push(muteNotifications ? 1 : 0);
  }
  if (language && ['si', 'ta', 'en'].includes(language)) {
    fields.push('language = ?');
    values.push(language);
  }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(c.get('userId'));
    await c.env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const updated = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('userId')).first();
  return c.json({ user: publicUser(updated) });
});

/**
 * GET /api/users/me/settings - Get user chat & notification settings
 */
userRoutes.get('/me/settings', async c => {
  const user = await c.env.DB.prepare('SELECT id, auto_translate, mute_notifications, language FROM users WHERE id = ?').bind(c.get('userId')).first();
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({
    autoTranslate: user.auto_translate !== 0,
    muteNotifications: Boolean(user.mute_notifications),
    language: user.language || 'si'
  });
});

/**
 * PATCH /api/users/me/settings - Update user chat settings
 */
userRoutes.patch('/me/settings', async c => {
  const body = await jsonBody(c);
  if (!body) return c.json({ error: 'Invalid body' }, 400);

  const fields = [];
  const values = [];

  if (body.autoTranslate !== undefined) {
    fields.push('auto_translate = ?');
    values.push(body.autoTranslate ? 1 : 0);
  }
  if (body.muteNotifications !== undefined || body.mute !== undefined) {
    const isMuted = body.muteNotifications !== undefined ? body.muteNotifications : body.mute;
    fields.push('mute_notifications = ?');
    values.push(isMuted ? 1 : 0);
  }
  if (body.language && ['si', 'ta', 'en'].includes(body.language)) {
    fields.push('language = ?');
    values.push(body.language);
  }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(c.get('userId'));
    await c.env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const updated = await c.env.DB.prepare('SELECT id, auto_translate, mute_notifications, language FROM users WHERE id = ?').bind(c.get('userId')).first();
  return c.json({
    autoTranslate: updated.auto_translate !== 0,
    muteNotifications: Boolean(updated.mute_notifications),
    language: updated.language
  });
});

/**
 * PUT /api/users/me - Backward-compatible profile update
 */
userRoutes.put('/me', async c => {
  const body = await jsonBody(c);
  if (!body || (body.language && !['si', 'ta', 'en'].includes(body.language))) return c.json({ error: 'Invalid profile data' }, 400);
  const autoTranslateVal = body.auto_translate !== undefined ? (body.auto_translate ? 1 : 0) : (body.autoTranslate !== undefined ? (body.autoTranslate ? 1 : 0) : null);
  const muteVal = body.mute_notifications !== undefined ? (body.mute_notifications ? 1 : 0) : (body.muteNotifications !== undefined ? (body.muteNotifications ? 1 : 0) : (body.mute !== undefined ? (body.mute ? 1 : 0) : null));
  await c.env.DB.prepare(`UPDATE users SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), language = COALESCE(?, language), avatar_url = COALESCE(?, avatar_url), auto_translate = COALESCE(?, auto_translate), mute_notifications = COALESCE(?, mute_notifications), updated_at = ? WHERE id = ?`)
    .bind(
      typeof body.display_name === 'string' ? body.display_name.trim().slice(0, 80) : null,
      typeof body.bio === 'string' ? body.bio.trim().slice(0, 500) : null,
      body.language || null,
      body.avatar_url || null,
      autoTranslateVal,
      muteVal,
      Date.now(),
      c.get('userId')
    ).run();
  return c.json({ user: publicUser(await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('userId')).first()) });
});

/**
 * POST /api/users/me/avatar - Upload avatar to R2
 */
userRoutes.post('/me/avatar', async c => {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'Avatar must be an image up to 5MB' }, 400);
  }
  const key = `avatars/${c.get('userId')}/${Date.now()}-${generateId()}.${mediaExtension(file.name)}`;
  await uploadFile(c.env, key, file.stream(), file.type, { userId: c.get('userId') });
  const url = `/api/media/${key}`;
  await c.env.DB.prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?').bind(url, Date.now(), c.get('userId')).run();
  return c.json({ url, avatarUrl: url }, 201);
});

/**
 * DELETE /api/users/me/avatar - Remove avatar
 */
userRoutes.delete('/me/avatar', async c => {
  const user = await c.env.DB.prepare('SELECT avatar_url FROM users WHERE id = ?').bind(c.get('userId')).first();
  if (user?.avatar_url && user.avatar_url.startsWith('/api/media/')) {
    const key = user.avatar_url.replace('/api/media/', '');
    try { await deleteFile(c.env, key); } catch {}
  }
  await c.env.DB.prepare('UPDATE users SET avatar_url = NULL, updated_at = ? WHERE id = ?').bind(Date.now(), c.get('userId')).run();
  return c.json({ success: true, message: 'Avatar removed' });
});

/**
 * GET /api/users/blocked - List blocked users (Feature 13)
 */
userRoutes.get('/blocked', async c => {
  const userId = c.get('userId');
  const blocked = await dbService.getBlockedUsers(c.env.DB, userId);
  return c.json({ blockedUsers: blocked });
});

/**
 * GET /api/users/me/presence - Get current authenticated user's presence
 */
userRoutes.get('/me/presence', async c => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare(
    'SELECT id, is_online, last_seen FROM users WHERE id = ?'
  ).bind(userId).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    userId: user.id,
    isOnline: Boolean(user.is_online),
    lastSeen: user.last_seen || null
  });
});

/**
 * POST /api/users/me/presence - Update current user online/presence status (Feature 6)
 */
userRoutes.post('/me/presence', async c => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => ({}));
  const isOnline = body.isOnline !== undefined ? Boolean(body.isOnline) : true;
  await dbService.updateUserPresence(c.env.DB, userId, isOnline);
  const now = Date.now();
  return c.json({
    success: true,
    userId,
    isOnline,
    lastSeen: now
  });
});

/**
 * POST /api/users/presence/batch - Get presence for multiple user IDs in one call
 */
userRoutes.post('/presence/batch', async c => {
  const body = await c.req.json().catch(() => ({}));
  const userIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [];
  if (!userIds.length) {
    return c.json({ presences: [] });
  }

  const placeholders = userIds.map(() => '?').join(',');
  const query = `SELECT id, is_online, last_seen FROM users WHERE id IN (${placeholders})`;
  const { results } = await c.env.DB.prepare(query).bind(...userIds).all();

  const presences = (results || []).map(row => ({
    userId: row.id,
    isOnline: Boolean(row.is_online),
    lastSeen: row.last_seen || null
  }));

  return c.json({ presences });
});

/**
 * GET /api/users/:id/presence - Get user online/presence status (Feature 6)
 */
userRoutes.get('/:id/presence', async c => {
  const targetId = c.req.param('id');
  const user = await c.env.DB.prepare(
    'SELECT id, is_online, last_seen FROM users WHERE id = ?'
  ).bind(targetId).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    userId: user.id,
    isOnline: Boolean(user.is_online),
    lastSeen: user.last_seen || null
  });
});

/**
 * POST /api/users/:id/block - Block a user (Feature 13)
 */
userRoutes.post('/:id/block', async c => {
  const blockerId = c.get('userId');
  const blockedId = c.req.param('id');

  if (blockerId === blockedId) {
    return c.json({ error: 'Cannot block yourself' }, 400);
  }

  await dbService.blockUser(c.env.DB, blockerId, blockedId);
  return c.json({ success: true, message: 'User blocked' });
});

/**
 * DELETE /api/users/:id/block - Unblock a user (Feature 13)
 */
userRoutes.delete('/:id/block', async c => {
  const blockerId = c.get('userId');
  const blockedId = c.req.param('id');

  await dbService.unblockUser(c.env.DB, blockerId, blockedId);
  return c.json({ success: true, message: 'User unblocked' });
});

/**
 * GET /api/users/:id - Get user profile (Feature 8)
 */
userRoutes.get('/:id', async c => {
  const id = c.req.param('id');
  const user = await c.env.DB.prepare(
    'SELECT id, username, display_name, avatar_url, bio, role, is_online, last_seen, created_at FROM users WHERE id = ?'
  ).bind(id).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

/**
 * Existing search and contacts
 */
userRoutes.get('/search', async c => {
  const query = (c.req.query('q') || '').trim().slice(0, 40);
  if (query.length < 2) return c.json({ users: [] });
  const like = `%${query}%`;
  const result = await c.env.DB.prepare(`SELECT id, username, display_name, avatar_url, is_verified FROM users
    WHERE id != ? AND (username LIKE ? OR phone LIKE ? OR display_name LIKE ?) LIMIT 20`).bind(c.get('userId'), like, like, like).all();
  return c.json({ users: result.results || [] });
});

userRoutes.get('/contacts', async c => {
  const result = await c.env.DB.prepare(`SELECT u.id, u.username, u.phone, u.display_name, u.avatar_url, u.is_online, u.last_seen, c.nickname, c.is_blocked
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
