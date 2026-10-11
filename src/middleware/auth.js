import { verify } from '../lib/jwt.js';

export async function authMiddleware(c, next) {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return c.json({ error: 'Authentication required' }, 401);
  if (c.env.CACHE) {
    const isRevoked = await c.env.CACHE.get(`blacklist:${token}`);
    if (isRevoked) return c.json({ error: 'Token has been revoked' }, 401);
  }
  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    if (!payload.sub) throw new Error('Missing subject');
    c.set('userId', payload.sub);
    c.set('jwt', payload);
    return next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
}

export async function requireAdmin(c, next) {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const jwt = c.get('jwt');
  if (jwt?.role === 'admin') {
    return next();
  }

  const user = await c.env.DB.prepare(
    'SELECT role FROM users WHERE id = ?'
  ).bind(userId).first();

  if (user?.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  return next();
}

