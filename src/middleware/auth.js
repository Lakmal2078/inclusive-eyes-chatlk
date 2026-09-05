import { verify } from '../lib/jwt.js';

export async function authMiddleware(c, next) {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return c.json({ error: 'Authentication required' }, 401);
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
