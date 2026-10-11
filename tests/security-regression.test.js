import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/index.js';
import { createNodeEnv } from '../src/lib/node-env.js';

test('CORS only grants configured origins when credentials are enabled', async () => {
  const env = createNodeEnv();
  env.CORS_ORIGIN = 'https://chatlk.example, https://staging.chatlk.example';

  const allowed = await app.request('/api/health', {
    headers: { Origin: 'https://chatlk.example' }
  }, env);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://chatlk.example');
  assert.equal(allowed.headers.get('Access-Control-Allow-Credentials'), 'true');
  assert.equal(allowed.headers.get('Vary'), 'Origin');
  assert.equal(allowed.headers.get('Permissions-Policy'), 'camera=(self), microphone=(self), geolocation=()');

  const rejected = await app.request('/api/health', {
    headers: { Origin: 'https://evil.example' }
  }, env);
  assert.equal(rejected.headers.has('Access-Control-Allow-Origin'), false);
  assert.equal(rejected.headers.has('Access-Control-Allow-Credentials'), false);

  const preflight = await app.request('/api/health', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://staging.chatlk.example',
      'Access-Control-Request-Method': 'POST'
    }
  }, env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://staging.chatlk.example');
});

test('Media access control rejects non-participant access to private media', async () => {
  const env = createNodeEnv();
  const { sign } = await import('../src/lib/jwt.js');

  const tokenOwner = await sign({ sub: 'user-owner', exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET);
  const tokenAttacker = await sign({ sub: 'user-stranger', exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET);

  const fileKey = 'media/user-owner/secret-doc.pdf';
  await env.MEDIA.put(fileKey, Buffer.from('confidential'), {
    httpMetadata: { contentType: 'application/pdf' }
  });

  // Owner can access their own media
  const ownerRes = await app.request(`/api/media/${fileKey}`, {
    headers: { Authorization: `Bearer ${tokenOwner}` }
  }, env);
  assert.equal(ownerRes.status, 200);

  // Stranger cannot access media they do not belong to
  const strangerRes = await app.request(`/api/media/${fileKey}`, {
    headers: { Authorization: `Bearer ${tokenAttacker}` }
  }, env);
  assert.equal(strangerRes.status, 403);
});

test('Reaction endpoints reject non-participants', async () => {
  const env = createNodeEnv();
  const { sign } = await import('../src/lib/jwt.js');

  const tokenMember = await sign({ sub: 'member-1', exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET);
  const tokenStranger = await sign({ sub: 'stranger-1', exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET);

  const now = Date.now();
  const chatId = 'private-chat-1';
  const msgId = 'private-msg-1';

  await env.DB.prepare('INSERT INTO users (id, username, phone, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind('member-1', 'member1', '+94770000003', 'Member', 'hash', now, now).run();
  await env.DB.prepare('INSERT INTO users (id, username, phone, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind('stranger-1', 'stranger1', '+94770000004', 'Stranger', 'hash', now, now).run();

  await env.DB.prepare('INSERT INTO chats (id, type, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(chatId, 'direct', 'member-1', now, now).run();
  await env.DB.prepare('INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)')
    .bind('cp-m1', chatId, 'member-1', 'member', now).run();
  await env.DB.prepare('INSERT INTO messages (id, chat_id, sender_id, text, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(msgId, chatId, 'member-1', 'Hello private', now).run();

  // Non-participant cannot add reaction
  const rxRes = await app.request(`/api/messages/${msgId}/reactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenStranger}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji: '🔥' })
  }, env);
  assert.equal(rxRes.status, 403);

  // Non-participant cannot view reactions
  const getRx = await app.request(`/api/messages/${msgId}/reactions`, {
    headers: { Authorization: `Bearer ${tokenStranger}` }
  }, env);
  assert.equal(getRx.status, 403);

  // Participant can add reaction
  const validRx = await app.request(`/api/messages/${msgId}/reactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenMember}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji: '🔥' })
  }, env);
  assert.equal(validRx.status, 200);
});

test('Contact block synchronization updates blocked_users table', async () => {
  const env = createNodeEnv();
  const { sign } = await import('../src/lib/jwt.js');

  const userA = 'user-blocker-1';
  const userB = 'user-blocked-1';
  const tokenA = await sign({ sub: userA, exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET);

  const now = Date.now();
  await env.DB.prepare('INSERT INTO users (id, username, phone, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(userA, 'blocker1', '+94770000001', 'Blocker', 'hash', now, now).run();
  await env.DB.prepare('INSERT INTO users (id, username, phone, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(userB, 'blocked1', '+94770000002', 'Blocked', 'hash', now, now).run();
  await env.DB.prepare('INSERT INTO contacts (id, user_id, contact_id, created_at) VALUES (?, ?, ?, ?)')
    .bind('ct-1', userA, userB, now).run();

  // Block via contacts route
  const resBlock = await app.request(`/api/users/contacts/${userB}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_blocked: true })
  }, env);
  assert.equal(resBlock.status, 200);

  // Verify blocked_users table contains the block
  const blockRecord = await env.DB.prepare('SELECT 1 FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?')
    .bind(userA, userB).first();
  assert.ok(blockRecord, 'blocked_users should contain record when contact is blocked');

  // Unblock via contacts route
  const resUnblock = await app.request(`/api/users/contacts/${userB}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_blocked: false })
  }, env);
  assert.equal(resUnblock.status, 200);

  const unblockRecord = await env.DB.prepare('SELECT 1 FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?')
    .bind(userA, userB).first();
  assert.equal(unblockRecord, null, 'blocked_users record should be removed on unblock');
});
