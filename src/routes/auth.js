import { Hono } from 'hono';
import { hashPassword, verifyPassword, encodePasswordRecord, decodePasswordRecord } from '../lib/crypto.js';
import { sign, verify } from '../lib/jwt.js';
import { generateId, jsonBody, publicUser, validateEmail } from '../lib/utils.js';

export const authRoutes = new Hono();
const expiry = () => Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

async function issueToken(user, env) {
  return sign({ sub: user.id, email: user.email, exp: expiry() }, env.JWT_SECRET);
}

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

authRoutes.post('/register', async c => {
  const body = await jsonBody(c);
  if (!body || !validateEmail(body.email) || !validPassword(body.password)) {
    return c.json({ error: 'Email or password is invalid' }, 400);
  }
  const now = Date.now();
  const password = await hashPassword(body.password);
  const fullName = body.fullName?.trim() || body.email.split('@')[0];
  const user = { 
    id: generateId(), 
    email: body.email.toLowerCase(), 
    full_name: fullName,
    language: ['si', 'ta', 'en'].includes(body.language) ? body.language : 'en' 
  };
  try {
    await c.env.DB.prepare(`INSERT INTO users (id, email, full_name, password_hash, language, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(user.id, user.email, user.full_name, encodePasswordRecord(password), user.language, now, now).run();
    return c.json({ user: publicUser(user), token: await issueToken(user, c.env) }, 201);
  } catch (error) {
    console.error('registration failed', error);
    return c.json({ error: 'Email already exists' }, 409);
  }
});

authRoutes.post('/login', async c => {
  const body = await jsonBody(c);
  if (!body?.email || !body?.password) return c.json({ error: 'Email and password are required' }, 400);
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(body.email.toLowerCase()).first();
  const credentials = user && decodePasswordRecord(user.password_hash);
  if (!user || !credentials?.hash || !(await verifyPassword(body.password, credentials.hash, credentials.salt))) return c.json({ error: 'Invalid credentials' }, 401);
  await c.env.DB.prepare('UPDATE users SET last_seen = ?, updated_at = ? WHERE id = ?').bind(Date.now(), Date.now(), user.id).run();
  return c.json({ user: publicUser(user), token: await issueToken(user, c.env) });
});

authRoutes.post('/refresh', async c => {
  const header = c.req.header('Authorization') || '';
  let userId = c.get('userId');
  if (!userId && header.startsWith('Bearer ')) {
    try { userId = (await verify(header.slice(7), c.env.JWT_SECRET)).sub; } catch { return c.json({ error: 'Invalid or expired token' }, 401); }
  }
  if (!userId) return c.json({ error: 'Authentication required' }, 401);
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ token: await issueToken(user, c.env) });
});
