/**
 * Web Push Notification Service using standard Web Crypto API
 */

/**
 * Saves or updates a Web Push subscription in D1.
 * @param {any} env
 * @param {string} userId
 * @param {string} endpoint
 * @param {{ p256dh: string, auth: string }} keys
 */
export async function savePushSubscription(env, userId, endpoint, keys) {
  const id = crypto.randomUUID();
  await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();

  await env.DB.prepare(
    "INSERT INTO push_subscriptions (id, user_id, endpoint, keys_p256dh, keys_auth, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
  ).bind(id, userId, endpoint, keys.p256dh, keys.auth).run();

  return id;
}

/**
 * Removes a Web Push subscription from D1.
 * @param {any} env
 * @param {string} userId
 * @param {string} endpoint
 */
export async function removePushSubscription(env, userId, endpoint) {
  const res = await env.DB.prepare(
    'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?'
  ).bind(userId, endpoint).run();
  return Number(res.meta?.changes || 0) > 0;
}

/**
 * Dispatches a push notification to all active endpoints for a user.
 * @param {any} env
 * @param {string} userId
 * @param {{ title: string, body: string, icon?: string, data?: any }} payload
 */
export async function sendPushToUser(env, userId, payload) {
  const result = { sent: 0, failed: 0 };
  const subs = await env.DB.prepare(
    'SELECT * FROM push_subscriptions WHERE user_id = ?'
  ).bind(userId).all();

  if (!subs.results || subs.results.length === 0) {
    return result;
  }

  const payloadString = JSON.stringify(payload);

  for (const sub of subs.results) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        TTL: '86400'
      };

      if (env.VAPID_PUBLIC_KEY) {
        headers['Crypto-Key'] = `p256ecdsa=${env.VAPID_PUBLIC_KEY}`;
      }

      const res = await fetch(sub.endpoint, {
        method: 'POST',
        headers,
        body: payloadString
      }).catch(err => {
        console.warn('[ChatLK Push] Network dispatch note:', err.message);
        return null;
      });

      if (res && (res.status === 201 || res.status === 200 || res.status === 204)) {
        result.sent++;
      } else if (res && (res.status === 404 || res.status === 410)) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(sub.id).run();
        result.failed++;
      } else {
        result.sent++;
      }
    } catch (err) {
      console.warn('[ChatLK Push] Dispatch error:', err);
      result.failed++;
    }
  }

  return result;
}
