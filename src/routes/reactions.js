/**
 * Message Reactions Routes (Feature 3)
 */

import { Hono } from 'hono';
import { assertParticipant } from '../lib/db.js';
import { dbService } from '../services/database.js';

const reactionRoutes = new Hono();

/**
 * POST /api/messages/:id/reactions - Add or toggle an emoji reaction
 */
reactionRoutes.post('/:id/reactions', async c => {
  const userId = c.get('userId');
  const messageId = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.emoji || typeof body.emoji !== 'string') {
    return c.json({ error: 'Valid emoji is required' }, 400);
  }

  const emoji = body.emoji.trim();

  // Verify message exists
  const message = await c.env.DB.prepare(
    'SELECT chat_id FROM messages WHERE id = ?'
  ).bind(messageId).first();

  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }

  try {
    await assertParticipant(c.env.DB, message.chat_id, userId);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Toggle reaction
  const result = await dbService.toggleMessageReaction(c.env.DB, messageId, userId, emoji);
  const updatedReactions = await dbService.getMessageReactions(c.env.DB, messageId);

  return c.json({
    action: result.action,
    emoji: result.emoji,
    ...updatedReactions
  });
});

/**
 * GET /api/messages/:id/reactions - List all reactions for a message
 */
reactionRoutes.get('/:id/reactions', async c => {
  const messageId = c.req.param('id');
  const userId = c.get('userId');

  const message = await c.env.DB.prepare(
    'SELECT chat_id FROM messages WHERE id = ?'
  ).bind(messageId).first();

  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }

  try {
    await assertParticipant(c.env.DB, message.chat_id, userId);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const reactions = await dbService.getMessageReactions(c.env.DB, messageId);
  return c.json(reactions);
});

/**
 * DELETE /api/messages/:id/reactions - Remove caller's reaction
 */
reactionRoutes.delete('/:id/reactions', async c => {
  const userId = c.get('userId');
  const messageId = c.req.param('id');

  const message = await c.env.DB.prepare(
    'SELECT chat_id FROM messages WHERE id = ?'
  ).bind(messageId).first();

  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }

  try {
    await assertParticipant(c.env.DB, message.chat_id, userId);
  } catch {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await c.env.DB.prepare(
    'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ?'
  ).bind(messageId, userId).run();

  const updatedReactions = await dbService.getMessageReactions(c.env.DB, messageId);
  return c.json({
    success: true,
    message: 'Reaction removed',
    ...updatedReactions
  });
});

export default reactionRoutes;
