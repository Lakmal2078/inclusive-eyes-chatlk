import { getClientIp } from '../lib/utils.js';

/**
 * Creates a configurable rate-limiter middleware using Cloudflare KV (CACHE).
 * @param {object} options
 * @param {number} options.max - Maximum allowed requests in window
 * @param {number} options.windowSeconds - Window size in seconds (default: 60)
 * @param {string} options.prefix - Key prefix in KV
 * @param {string} options.errorMessage - Error description
 */
export function createRateLimiter({
  max = 30,
  windowSeconds = 60,
  prefix = 'ratelimit',
  errorMessage = 'Rate limit exceeded. Try again later.'
} = {}) {
  return async function rateLimiter(c, next) {
    if (c.req.method === 'OPTIONS' || !c.env.CACHE) {
      return next();
    }

    const userId = c.get('userId');
    const ip = getClientIp(c);
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
    const key = `${prefix}:${identifier}:${bucket}`;

    const count = Number((await c.env.CACHE.get(key)) || 0) + 1;
    await c.env.CACHE.put(key, String(count), { expirationTtl: windowSeconds + 1 });

    if (count > max) {
      return c.json(
        { error: errorMessage },
        429,
        { 'Retry-After': String(windowSeconds) }
      );
    }

    return next();
  };
}

/**
 * Feature 15: Max 30 messages per minute per user.
 */
export const messageRateLimiter = createRateLimiter({
  max: 30,
  windowSeconds: 60,
  prefix: 'rl:msg',
  errorMessage: 'Message sending rate limit exceeded (max 30/minute). Try again in a minute.'
});

/**
 * Feature 15: Max 10 file uploads per minute per user.
 */
export const uploadRateLimiter = createRateLimiter({
  max: 10,
  windowSeconds: 60,
  prefix: 'rl:upload',
  errorMessage: 'File upload rate limit exceeded (max 10/minute). Try again in a minute.'
});

/**
 * Global rate limiting middleware for IP-based protection
 */
export async function rateLimitMiddleware(c, next) {
  if (c.req.method === 'OPTIONS' || !c.env.CACHE) return next();

  const bucket = Math.floor(Date.now() / 600_000); // 10-minute window
  const ip = getClientIp(c);
  const authenticated = Boolean(c.req.header('Authorization'));
  const isRegister = c.req.method === 'POST' && c.req.path.endsWith('/register');

  let limit;
  let key;

  if (isRegister) {
    const body = await c.req.raw.clone().json().catch(() => null);
    const scope = body?.phone || body?.username || 'anon';
    limit = 20;
    key = `rate:${ip}:reg:${scope}:${bucket}`;
  } else if (c.req.path.startsWith('/api/auth')) {
    limit = 20;
    key = `rate:${ip}:auth:${bucket}`;
  } else {
    limit = authenticated ? 150 : 30;
    key = `rate:${ip}:${bucket}`;
  }

  const count = Number((await c.env.CACHE.get(key)) || 0) + 1;
  await c.env.CACHE.put(key, String(count), { expirationTtl: 601 });

  if (count > limit) {
    return c.json({ error: 'Rate limit exceeded. Try again in a few minutes.' }, 429, { 'Retry-After': '600' });
  }
  return next();
}
