import { getClientIp } from '../lib/utils.js';

export async function rateLimitMiddleware(c, next) {
  if (c.req.method === 'OPTIONS' || !c.env.CACHE) return next();
  const bucket = Math.floor(Date.now() / 600_000);
  const ip = getClientIp(c);
  const authenticated = Boolean(c.req.header('Authorization'));
  const limit = c.req.path.startsWith('/api/auth') ? (c.req.method === 'POST' && c.req.path.endsWith('/register') ? 5 : 10) : authenticated ? 100 : 20;
  const key = `rate:${ip}:${bucket}`;
  const count = Number(await c.env.CACHE.get(key) || 0) + 1;
  await c.env.CACHE.put(key, String(count), { expirationTtl: 601 });
  if (count > limit) return c.json({ error: 'Rate limit exceeded' }, 429, { 'Retry-After': '600' });
  return next();
}
