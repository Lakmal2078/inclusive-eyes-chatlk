import { Hono } from 'hono';
import { getChatParticipants, getChatRole, assertParticipant } from '../lib/db.js';
import { generateId, jsonBody } from '../lib/utils.js';

export const chatRoutes = new Hono();

  chatRoutes.get('/', async c => {
  const result = await c.env.DB.prepare(`SELECT ch.*, cp.role,
    (SELECT text FROM messages m WHERE m.chat_id = ch.id AND m.is_deleted = 0 ORDER BY m.created_at DESC LIMIT 1) AS last_message,
    (SELECT sender_id FROM messages m WHERE m.chat_id = ch.id AND m.is_deleted = 0 ORDER BY m.created_at DESC LIMIT 1) AS last_message_sender_id,
    (SELECT created_at FROM messages m WHERE m.chat_id = ch.id AND m.is_deleted = 0 ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
    (SELECT COUNT(*) FROM messages um WHERE um.chat_id = ch.id AND um.is_deleted = 0 AND um.sender_id != ?
      AND (cp.last_read_message_id IS NULL OR um.created_at > COALESCE((SELECT rm.created_at FROM messages rm WHERE rm.id = cp.last_read_message_id), 0))) AS unread_count
    FROM chats ch JOIN chat_participants cp ON cp.chat_id = ch.id WHERE cp.user_id = ? ORDER BY COALESCE(last_message_at, ch.updated_at) DESC`).bind(c.get('userId'), c.get('userId')).all();
  return c.json({ chats: result.results || [] });
});

chatRoutes.post('/', async c => {
  const body = await jsonBody(c);
  const type = body?.type === 'group' ? 'group' : 'direct';
  const participants = [...new Set([c.get('userId'), ...(Array.isArray(body?.participantIds) ? body.participantIds : [])])].filter(Boolean);
  if (type === 'direct' && participants.length !== 2) return c.json({ error: 'A direct chat requires one other participant' }, 400);
  if (type === 'group' && participants.length < 2) return c.json({ error: 'A group requires at least two participants' }, 400);
  const now = Date.now();
  const id = generateId();
  const statements = [c.env.DB.prepare('INSERT INTO chats (id, type, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, type, body.name?.trim().slice(0, 120) || null, body.description?.trim().slice(0, 500) || '', c.get('userId'), now, now)];
  for (const userId of participants) statements.push(c.env.DB.prepare('INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)').bind(generateId(), id, userId, userId === c.get('userId') ? 'admin' : 'member', now));
  try { await c.env.DB.batch(statements); } catch { return c.json({ error: 'One or more participants do not exist' }, 400); }
  return c.json({ id, type, participants }, 201);
});

chatRoutes.get('/:id', async c => {
  try { await assertParticipant(c.env.DB, c.req.param('id'), c.get('userId')); } catch (error) { return c.json({ error: error.message }, error.status || 403); }
  const chat = await c.env.DB.prepare('SELECT * FROM chats WHERE id = ?').bind(c.req.param('id')).first();
  return c.json({ chat, participants: await getChatParticipants(c.env.DB, c.req.param('id')) });
});

chatRoutes.put('/:id', async c => {
  const role = await getChatRole(c.env.DB, c.req.param('id'), c.get('userId'));
  if (role !== 'admin') return c.json({ error: 'Only chat admins can update this chat' }, 403);
  const body = await jsonBody(c);
  await c.env.DB.prepare('UPDATE chats SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url), description = COALESCE(?, description), updated_at = ? WHERE id = ?')
    .bind(body?.name?.trim().slice(0, 120) || null, body?.avatar_url || null, body?.description?.trim().slice(0, 500) || null, Date.now(), c.req.param('id')).run();
  return c.json({ ok: true });
});

chatRoutes.delete('/:id', async c => {
  const chatId = c.req.param('id');
  const role = await getChatRole(c.env.DB, chatId, c.get('userId'));
  if (!role) return c.json({ error: 'Chat not found' }, 404);
  if (role === 'admin') await c.env.DB.prepare('DELETE FROM chats WHERE id = ?').bind(chatId).run();
  else await c.env.DB.prepare('DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?').bind(chatId, c.get('userId')).run();
  return c.json({ ok: true });
});

chatRoutes.post('/:id/participants', async c => {
  if (await getChatRole(c.env.DB, c.req.param('id'), c.get('userId')) !== 'admin') return c.json({ error: 'Admin access required' }, 403);
  const body = await jsonBody(c);
  if (!body?.userId) return c.json({ error: 'userId is required' }, 400);
  await c.env.DB.prepare('INSERT OR IGNORE INTO chat_participants (id, chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)').bind(generateId(), c.req.param('id'), body.userId, 'member', Date.now()).run();
  return c.json({ ok: true }, 201);
});

chatRoutes.delete('/:id/participants/:userId', async c => {
  if (await getChatRole(c.env.DB, c.req.param('id'), c.get('userId')) !== 'admin') return c.json({ error: 'Admin access required' }, 403);
  await c.env.DB.prepare('DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?').bind(c.req.param('id'), c.req.param('userId')).run();
  return c.json({ ok: true });
});
