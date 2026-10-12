import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { createNodeEnv } from '../src/lib/node-env.js';
import { sign } from '../src/lib/jwt.js';

const env = createNodeEnv();
const JWT_SECRET = env.JWT_SECRET;

async function createAuthToken(userId, role = 'user') {
  return sign({ sub: userId, role, exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
}

test('Message Idempotency Suite (REC-06)', async (t) => {
  const runId = Date.now().toString().slice(-6);
  const u1 = { id: `u_idem1_${runId}`, username: `alice_idem_${runId}`, phone: `+94770${runId}`, display_name: 'Alice', role: 'user' };
  const u2 = { id: `u_idem2_${runId}`, username: `bob_idem_${runId}`, phone: `+94773${runId}`, display_name: 'Bob', role: 'user' };
  const chatId = `chat_idem_${runId}`;
  const now = Date.now();

  for (const u of [u1, u2]) {
    await env.DB.prepare(
      'INSERT INTO users (id, username, phone, display_name, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(u.id, u.username, u.phone, u.display_name, 'hash123', u.role, now, now).run();
  }

  await env.DB.prepare(
    'INSERT INTO chats (id, type, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(chatId, 'direct', u1.id, now, now).run();

  await env.DB.prepare(
    'INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(`cp1_${runId}`, chatId, u1.id, 'member', now).run();
  await env.DB.prepare(
    'INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(`cp2_${runId}`, chatId, u2.id, 'member', now).run();

  const token = await createAuthToken(u1.id);
  const clientId = `client_msg_uuid_${runId}`;

  await t.test('POST /api/chats/:id/messages creates message on first call with clientId', async () => {
    const res = await app.request(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Subha udhasanak!',
        clientId: clientId
      })
    }, env);

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.message?.id);
    assert.equal(body.message.client_id, clientId);
    assert.equal(body.message.text, 'Subha udhasanak!');
  });

  await t.test('POST /api/chats/:id/messages returns existing message with 200 and duplicate:true on retry', async () => {
    const res = await app.request(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Subha udhasanak!',
        clientId: clientId
      })
    }, env);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.message?.id);
    assert.equal(body.message.client_id, clientId);
    assert.equal(body.message.duplicate, true);

    // Verify database only has 1 message for this clientId
    const countCheck = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM messages WHERE client_id = ?'
    ).bind(clientId).first();
    assert.equal(Number(countCheck.count), 1);
  });
});
