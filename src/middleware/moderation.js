/**
 * AI Content Moderation Middleware
 */

import { moderateMessageText } from '../services/ai.js';

export async function moderationMiddleware(c, next) {
  if (c.req.method !== 'POST' && c.req.method !== 'PATCH') {
    return next();
  }

  try {
    const body = await c.req.raw.clone().json().catch(() => null);
    const text = body?.text || body?.content;

    if (text && typeof text === 'string') {
      const moderation = await moderateMessageText(c.env, text);

      if (moderation.status === 'blocked') {
        return c.json(
          {
            error: 'Message blocked by content moderation',
            reason: moderation.reason || 'Content violates community safety standards'
          },
          400
        );
      }

      // Pass moderation result down to the handler via context
      c.set('moderation', moderation);
    }
  } catch (err) {
    console.warn('[ChatLK Moderation Middleware] check note:', err);
  }

  return next();
}
