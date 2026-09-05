import { getClientIp } from '../lib/utils.js';

export async function rateLimitMiddleware(c, next) {
  if (c.req.method === 'OPTIONS' || !c.env.CACHE) return next();

  const bucket = Math.floor(Date.now() / 600_000); // 10-minute window
  const ip = getClientIp(c);
  const authenticated = Boolean(c.req.header('Authorization'));
  const isRegister = c.req.method === 'POST' && c.req.path.endsWith('/register');

  let limit;
  let key;

  if (isRegister) {
    // Register: higher limit (20) + key scoped by phone/username, so
    // retries on one account don't lock out everyone behind the same IP.
    const body = await c.req.raw.clone().json().catch(() => null);
    const scope = body?.phone || body?.username || 'anon';
    limit = 20;
    key = `rate:${ip}:reg:${scope}:${bucket}`;
  } else if (c.req.path.startsWith('/api/auth')) {
    limit = 10;
    key = `rate:${ip}:auth:${bucket}`;
  } else {
    limit = authenticated ? 100 : 20;
    key = `rate:${ip}:${bucket}`;
  }

  const count = Number((await c.env.CACHE.get(key)) || 0) + 1;
  await c.env.CACHE.put(key, String(count), { expirationTtl: 601 });

  if (count > limit) {
    return c.json({ error: 'Rate limit exceeded. Try again in a few minutes.' }, 429, { 'Retry-After': '600' });
  }
  return next();
}

