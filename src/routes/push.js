/**
 * Web Push Notification Routes (Feature 9)
 */

import { Hono } from 'hono';
import { savePushSubscription, removePushSubscription, sendPushToUser } from '../services/push.js';

const pushRoutes = new Hono();

/**
 * GET /api/push/vapid-key - Retrieve public VAPID key for browser subscription
 */
pushRoutes.get('/vapid-key', c => {
  return c.json({
    publicKey: c.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnmpGzU8='
  });
});

/**
 * POST /api/push/subscribe - Register a Web Push subscription
 */
pushRoutes.post('/subscribe', async c => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: 'endpoint, keys.p256dh, and keys.auth are required' }, 400);
  }

  const subId = await savePushSubscription(c.env, userId, body.endpoint, body.keys);
  return c.json({ success: true, subscriptionId: subId });
});

/**
 * DELETE /api/push/subscribe - Remove a Web Push subscription
 */
pushRoutes.delete('/subscribe', async c => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);

  const endpoint = body?.endpoint || c.req.query('endpoint');
  if (!endpoint) {
    return c.json({ error: 'endpoint is required' }, 400);
  }

  const removed = await removePushSubscription(c.env, userId, endpoint);
  return c.json({ success: true, removed });
});

/**
 * POST /api/push/test - Dispatch a test push notification
 */
pushRoutes.post('/test', async c => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => ({}));

  const payload = {
    title: body.title || 'ChatLK Test Notification',
    body: body.body || 'This is a test notification from ChatLK!',
    icon: '/icon-192.svg'
  };

  const dispatch = await sendPushToUser(c.env, userId, payload);
  return c.json({
    success: true,
    message: 'Test notification processed',
    ...dispatch
  });
});

export default pushRoutes;
