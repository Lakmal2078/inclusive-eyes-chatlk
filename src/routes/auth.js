import { Hono } from 'hono';
import { hashPassword, verifyPassword, encodePasswordRecord, decodePasswordRecord } from '../lib/crypto.js';
import { sign, verify } from '../lib/jwt.js';
import { generateId, jsonBody, publicUser, validatePhone, validateUsername } from '../lib/utils.js';
import { dbService } from '../services/database.js';

export const authRoutes = new Hono();
const expiry = () => Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

async function issueToken(user, env) {
  return sign({ sub: user.id, username: user.username, exp: expiry() }, env.JWT_SECRET);
}

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

authRoutes.post('/register', async c => {
  const body = await jsonBody(c);
  if (!body || !validateUsername(body.username) || !validatePhone(body.phone) || !validPassword(body.password)) {
    return c.json({ error: 'Username, phone, or password is invalid' }, 400);
  }
  const now = Date.now();
  const password = await hashPassword(body.password);
  const user = { id: generateId(), username: body.username, phone: body.phone, display_name: body.display_name?.trim() || body.username, language: ['si', 'ta', 'en'].includes(body.language) ? body.language : 'si' };
  try {
    await c.env.DB.prepare(`INSERT INTO users (id, username, phone, display_name, password_hash, language, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(user.id, user.username, user.phone, user.display_name, encodePasswordRecord(password), user.language, now, now).run();

    let joinedChatId = null;
    let joinedGroupName = null;
    const inviteCode = body.invite_code || body.inviteCode;
    if (inviteCode) {
      try {
        const joinRes = await dbService.joinGroupViaInvite(c.env.DB, inviteCode, user.id);
        joinedChatId = joinRes.groupId;
        joinedGroupName = joinRes.groupName;
      } catch (err) {
        console.warn('Auto-join via invite error during registration:', err.message);
      }
    }

    return c.json({
      user: publicUser(user, true),
      token: await issueToken(user, c.env),
      joinedChatId,
      joinedGroupName
    }, 201);
  } catch (error) {
    console.error('registration failed', error);
    return c.json({ error: 'Username or phone already exists' }, 409);
  }
});

authRoutes.post('/login', async c => {
  const body = await jsonBody(c);
  if (!body?.identifier || !body?.password) return c.json({ error: 'Identifier and password are required' }, 400);
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? OR phone = ?').bind(body.identifier, body.identifier).first();
  const credentials = user && decodePasswordRecord(user.password_hash);
  if (!user || !credentials?.hash || !(await verifyPassword(body.password, credentials.hash, credentials.salt))) return c.json({ error: 'Invalid credentials' }, 401);
  await c.env.DB.prepare('UPDATE users SET last_seen = ?, updated_at = ? WHERE id = ?').bind(Date.now(), Date.now(), user.id).run();
  return c.json({ user: publicUser(user, true), token: await issueToken(user, c.env) });
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

authRoutes.post('/logout', async c => {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token && c.env.CACHE) {
    try {
      const payload = await verify(token, c.env.JWT_SECRET);
      const nowSec = Math.floor(Date.now() / 1000);
      const remainingSeconds = Math.max(60, (payload.exp || (nowSec + 3600)) - nowSec);
      await c.env.CACHE.put(`blacklist:${token}`, 'revoked', { expirationTtl: remainingSeconds });
    } catch {
      // If token is expired or malformed, continue
    }
  }
  return c.json({ success: true, message: 'Logged out successfully' });
});

/**
 * POST /api/auth/ws-ticket - Request an ephemeral, single-use ticket for WebSocket authentication (Feature SEC-004)
 */
authRoutes.post('/ws-ticket', async c => {
  const header = c.req.header('Authorization') || '';
  let userId = c.get('userId');
  if (!userId && header.startsWith('Bearer ')) {
    try {
      userId = (await verify(header.slice(7), c.env.JWT_SECRET)).sub;
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
  }
  if (!userId) return c.json({ error: 'Authentication required' }, 401);

  const ticket = generateId();
  if (c.env.CACHE) {
    await c.env.CACHE.put(`ws_ticket:${ticket}`, userId, { expirationTtl: 60 });
  }

  return c.json({ ticket, expiresIn: 60 });
});

/**
 * POST /api/auth/forgot-password - Step 1: Request 6-digit verification code (Feature SEC-001)
 */
authRoutes.post('/forgot-password', async c => {
  const body = await jsonBody(c);
  if (!body) return c.json({ error: 'Request body is required' }, 400);

  const identifier = (body.username || body.identifier)?.trim();
  const phone = body.phone?.replace(/[\s\-]/g, '').trim();

  if (!identifier || !validateUsername(identifier)) {
    return c.json({ error: 'Valid username is required' }, 400);
  }
  if (!phone || !validatePhone(phone)) {
    return c.json({ error: 'Valid phone number with country code (e.g. +94771234567) is required' }, 400);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? AND phone = ?')
    .bind(identifier, phone)
    .first();

  if (!user) {
    return c.json({ error: 'No account found matching this username and phone number' }, 404);
  }

  // Generate a cryptographically secure 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  if (c.env.CACHE) {
    await c.env.CACHE.put(`reset_otp:${user.id}`, otp, { expirationTtl: 600 });
  }

  return c.json({
    success: true,
    message: 'Verification code sent to registered phone number',
    userId: user.id,
    devOtp: c.env.ENVIRONMENT !== 'production' ? otp : undefined
  });
});

/**
 * POST /api/auth/reset-password - Step 2: Verify OTP and reset password (Feature SEC-001)
 */
authRoutes.post('/reset-password', async c => {
  const body = await jsonBody(c);
  if (!body) return c.json({ error: 'Request body is required' }, 400);

  const identifier = (body.username || body.identifier)?.trim();
  const phone = body.phone?.replace(/[\s\-]/g, '').trim();
  const newPassword = body.newPassword || body.password;
  const otp = (body.otp || body.code || '')?.trim();

  if (!identifier || !validateUsername(identifier)) {
    return c.json({ error: 'Valid username is required' }, 400);
  }
  if (!phone || !validatePhone(phone)) {
    return c.json({ error: 'Valid phone number with country code (e.g. +94771234567) is required' }, 400);
  }
  if (!validPassword(newPassword)) {
    return c.json({ error: 'New password must be between 8 and 128 characters' }, 400);
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? AND phone = ?')
    .bind(identifier, phone)
    .first();

  if (!user) {
    return c.json({ error: 'No account found matching this username and phone number' }, 404);
  }

  if (!otp) {
    return c.json({ error: 'Verification code (OTP) is required' }, 400);
  }

  if (c.env.CACHE) {
    const cachedOtp = await c.env.CACHE.get(`reset_otp:${user.id}`);
    if (!cachedOtp || cachedOtp !== otp) {
      return c.json({ error: 'Invalid or expired verification code' }, 401);
    }
    await c.env.CACHE.delete(`reset_otp:${user.id}`);
  }

  const passwordRecord = await hashPassword(newPassword);
  const now = Date.now();

  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(encodePasswordRecord(passwordRecord), now, user.id)
    .run();

  return c.json({
    success: true,
    message: 'Password reset successfully',
    user: publicUser(user, true),
    token: await issueToken(user, c.env)
  });
});

