import { Hono } from 'hono';
import { assertParticipant, getChatRole } from '../lib/db.js';
import { cleanText, generateId, jsonBody, parseLimit } from '../lib/utils.js';
import { autoTranslateMessage, getSmartReplySuggestions, moderateMessageText } from '../services/ai.js';
import { dbService } from '../services/database.js';
import { messageRateLimiter } from '../middleware/rateLimit.js';
import { sendPushToUser } from '../services/push.js';

export const messageRoutes = new Hono();

async function participant(c, chatId) {
  try {
    await assertParticipant(c.env.DB, chatId, c.get('userId'));
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/messages/:id/translations (Feature 1)
 */
messageRoutes.get('/messages/:id/translations', async c => {
  const messageId = c.req.param('id');
  const message = await c.env.DB.prepare(
    'SELECT id, chat_id, text, translations FROM messages WHERE id = ?'
  ).bind(messageId).first();

  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }

  if (!await participant(c, message.chat_id)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  let translations = {};
  if (message.translations) {
    try {
      translations = JSON.parse(message.translations);
    } catch {}
  } else if (message.text) {
    translations = await autoTranslateMessage(c.env, message.text);
    await c.env.DB.prepare('UPDATE messages SET translations = ? WHERE id = ?')
      .bind(JSON.stringify(translations), messageId).run();
  }

  return c.json({
    messageId: message.id,
    originalText: message.text,
    translations
  });
});

/**
 * GET /api/messages/:chatId/suggestions (Feature 11)
 */
messageRoutes.get('/messages/:chatId/suggestions', async c => {
  const chatId = c.req.param('chatId');
  if (!await participant(c, chatId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const user = await c.env.DB.prepare('SELECT language FROM users WHERE id = ?').bind(c.get('userId')).first();
  const recent = await c.env.DB.prepare(
    'SELECT text, sender_id FROM messages WHERE chat_id = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 5'
  ).bind(chatId).all();

  const messages = (recent.results || []).reverse();
  const suggestions = await getSmartReplySuggestions(c.env, chatId, messages, user?.language || 'en');

  return c.json({ chatId, suggestions });
});

/**
 * POST /api/messages/:id/pin (Feature 12)
 */
messageRoutes.post('/messages/:id/pin', async c => {
  const messageId = c.req.param('id');
  const userId = c.get('userId');

  const message = await c.env.DB.prepare('SELECT chat_id FROM messages WHERE id = ?').bind(messageId).first();
  if (!message) return c.json({ error: 'Message not found' }, 404);

  const chat = await c.env.DB.prepare('SELECT type FROM chats WHERE id = ?').bind(message.chat_id).first();
  if (chat?.type === 'group') {
    const role = await getChatRole(c.env.DB, message.chat_id, userId);
    if (role !== 'admin') {
      return c.json({ error: 'Only admins can pin messages in groups' }, 403);
    }
  } else {
    if (!await participant(c, message.chat_id)) return c.json({ error: 'Forbidden' }, 403);
  }

  await dbService.pinMessage(c.env.DB, messageId, userId);
  return c.json({ success: true, message: 'Message pinned' });
});

/**
 * DELETE /api/messages/:id/pin (Feature 12)
 */
messageRoutes.delete('/messages/:id/pin', async c => {
  const messageId = c.req.param('id');
  const userId = c.get('userId');

  const message = await c.env.DB.prepare('SELECT chat_id FROM messages WHERE id = ?').bind(messageId).first();
  if (!message) return c.json({ error: 'Message not found' }, 404);

  const chat = await c.env.DB.prepare('SELECT type FROM chats WHERE id = ?').bind(message.chat_id).first();
  if (chat?.type === 'group') {
    const role = await getChatRole(c.env.DB, message.chat_id, userId);
    if (role !== 'admin') {
      return c.json({ error: 'Only admins can unpin messages in groups' }, 403);
    }
  } else {
    if (!await participant(c, message.chat_id)) return c.json({ error: 'Forbidden' }, 403);
  }

  await dbService.unpinMessage(c.env.DB, messageId);
  return c.json({ success: true, message: 'Message unpinned' });
});

/**
 * PATCH /api/messages/:id - Edit message within 15 minutes (Feature 4)
 */
messageRoutes.patch('/messages/:id', async c => {
  const messageId = c.req.param('id');
  const userId = c.get('userId');
  const body = await jsonBody(c);
  const newContent = cleanText(body?.content || body?.text);

  if (!newContent) {
    return c.json({ error: 'Content is required' }, 400);
  }

  const message = await c.env.DB.prepare(
    'SELECT * FROM messages WHERE id = ?'
  ).bind(messageId).first();

  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }

  if (message.sender_id !== userId) {
    return c.json({ error: 'You can only edit your own messages' }, 403);
  }

  // Enforce 15-minute edit window (Feature 4 requirement)
  const messageAgeMs = Date.now() - Number(message.created_at);
  if (messageAgeMs > 15 * 60 * 1000) {
    return c.json({ error: 'Messages can only be edited within 15 minutes of sending' }, 400);
  }

  // AI Content Moderation on edited text (Feature 10)
  const moderation = await moderateMessageText(c.env, newContent);
  if (moderation.status === 'blocked') {
    return c.json({ error: 'Message blocked by content moderation', reason: moderation.reason }, 400);
  }

  const editedAt = Date.now();
  await c.env.DB.prepare(
    'UPDATE messages SET text = ?, is_edited = 1, edited_at = ? WHERE id = ?'
  ).bind(newContent, editedAt, messageId).run();

  return c.json({
    id: messageId,
    content: newContent,
    is_edited: 1,
    edited_at: editedAt
  });
});

/**
 * PUT /api/messages/:id - Backward compatibility for PUT edit
 */
messageRoutes.put('/messages/:id', async c => {
  const text = cleanText((await jsonBody(c))?.text);
  if (!text) return c.json({ error: 'Message text is required' }, 400);
  const result = await c.env.DB.prepare('UPDATE messages SET text = ?, is_edited = 1, edited_at = ? WHERE id = ? AND sender_id = ? AND is_deleted = 0').bind(text, Date.now(), c.req.param('id'), c.get('userId')).run();
  if (!result.meta?.changes) return c.json({ error: 'Message not found or not owned by you' }, 404);
  return c.json({ ok: true });
});

/**
 * DELETE /api/messages/:id - Soft delete message (Feature 4)
 */
messageRoutes.delete('/messages/:id', async c => {
  const messageId = c.req.param('id');
  const userId = c.get('userId');

  const message = await c.env.DB.prepare(
    'SELECT * FROM messages WHERE id = ?'
  ).bind(messageId).first();

  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }

  const isOwner = message.sender_id === userId;
  const isGroupAdmin = await dbService.isGroupAdmin(c.env.DB, message.chat_id, userId);

  if (!isOwner && !isGroupAdmin) {
    return c.json({ error: 'Only the message author or a group admin can delete this message' }, 403);
  }

  const nowIso = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE messages SET is_deleted = 1, deleted_at = ?, text = NULL, media_url = NULL WHERE id = ?'
  ).bind(nowIso, messageId).run();

  return c.json({
    success: true,
    message: 'Message deleted',
    id: messageId,
    deleted_at: nowIso
  });
});

/**
 * GET /api/chats/:id/messages - List messages for chat
 */
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

/**
 * POST /api/chats/:id/messages - Send a message (Features 1, 10, 13, 15)
 */
messageRoutes.post('/chats/:id/messages', messageRateLimiter, async c => {
  const chatId = c.req.param('id');
  const userId = c.get('userId');

  if (!await participant(c, chatId)) return c.json({ error: 'Forbidden' }, 403);

  // Feature 13: Check if sender is blocked by other participants in a direct chat
  const chat = await c.env.DB.prepare('SELECT type FROM chats WHERE id = ?').bind(chatId).first();
  if (chat?.type === 'direct') {
    const participants = await c.env.DB.prepare(
      'SELECT user_id FROM chat_participants WHERE chat_id = ? AND user_id != ?'
    ).bind(chatId, userId).all();
    for (const p of participants.results || []) {
      const isBlocked = await dbService.isUserBlocked(c.env.DB, p.user_id, userId);
      if (isBlocked) {
        return c.json({ error: 'You are blocked by this user' }, 403);
      }
    }
  }

  const body = await jsonBody(c);
  const text = cleanText(body?.text || body?.content);
  const mediaUrl = typeof body?.mediaUrl === 'string' ? body.mediaUrl.slice(0, 1000) : null;
  const mediaThumbnail = typeof body?.mediaThumbnail === 'string' ? body.mediaThumbnail.slice(0, 1000) : null;
  if (!text && !mediaUrl) return c.json({ error: 'Message text or media is required' }, 400);

  // Feature 10: AI Content Moderation
  let moderationStatus = 'clean';
  let moderationReason = null;
  if (text) {
    const modResult = await moderateMessageText(c.env, text);
    if (modResult.status === 'blocked') {
      return c.json({ error: 'Message blocked by content moderation', reason: modResult.reason }, 400);
    }
    moderationStatus = modResult.status;
    moderationReason = modResult.reason || null;
  }

  // Feature 1: AI Auto-Translation
  let translationsJson = null;
  if (text) {
    const senderUser = await c.env.DB.prepare('SELECT auto_translate FROM users WHERE id = ?').bind(userId).first();
    const shouldTranslate = senderUser?.auto_translate !== 0; // defaults to 1
    if (shouldTranslate) {
      const translations = await autoTranslateMessage(c.env, text);
      translationsJson = JSON.stringify(translations);
    }
  }

  const id = generateId();
  const now = Date.now();
  const type = ['text', 'image', 'video', 'audio', 'file', 'sticker', 'voice_note'].includes(body?.messageType) ? body.messageType : 'text';

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO messages (id, chat_id, sender_id, text, message_type, media_url, media_thumbnail, media_size, reply_to_id, status, translations, moderation_status, moderation_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, chatId, userId, text, type, mediaUrl, mediaThumbnail, Number(body?.mediaSize) || null, body?.replyToId || null, 'sent', translationsJson, moderationStatus, moderationReason, now),
    c.env.DB.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').bind(now, chatId)
  ]);

  // If message was flagged by moderation, record in flagged_messages
  if (moderationStatus === 'flagged') {
    await c.env.DB.prepare(
      "INSERT INTO flagged_messages (id, message_id, reason, severity, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
    ).bind(crypto.randomUUID(), id, moderationReason, 'low').run();
  }

  // Feature 9: Dispatch Push Notifications to offline participants
  try {
    const offlineParticipants = await c.env.DB.prepare(`
      SELECT cp.user_id, u.display_name
      FROM chat_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.chat_id = ? AND cp.user_id != ? AND (u.is_online = 0 OR u.is_online IS NULL)
    `).bind(chatId, userId).all();

    const sender = await c.env.DB.prepare('SELECT display_name FROM users WHERE id = ?').bind(userId).first();
    const senderName = sender?.display_name || 'Someone';

    for (const p of offlineParticipants.results || []) {
      const isMuted = await dbService.isChatMuted(c.env.DB, p.user_id, chatId);
      if (!isMuted) {
        sendPushToUser(c.env, p.user_id, {
          title: `New message from ${senderName}`,
          body: text || 'Sent an attachment',
          data: { chatId, messageId: id }
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[ChatLK Push Dispatch] error note:', err);
  }

  return c.json({
    message: {
      id,
      chat_id: chatId,
      sender_id: userId,
      text,
      message_type: type,
      media_url: mediaUrl,
      status: 'sent',
      translations: translationsJson ? JSON.parse(translationsJson) : null,
      moderation_status: moderationStatus,
      created_at: now
    }
  }, 201);
});

/**
 * Existing search and read routes
 */
messageRoutes.get('/chats/:id/messages/search', async c => {
  const chatId = c.req.param('id');
  if (!await participant(c, chatId)) return c.json({ error: 'Forbidden' }, 403);
  const query = (c.req.query('q') || '').trim().slice(0, 100);
  if (!query) return c.json({ messages: [] });
  const result = await c.env.DB.prepare('SELECT * FROM messages WHERE chat_id = ? AND text LIKE ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 50').bind(chatId, `%${query}%`).all();
  return c.json({ messages: result.results || [] });
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
