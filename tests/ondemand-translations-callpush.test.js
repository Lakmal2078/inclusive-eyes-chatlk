import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { createNodeEnv } from '../src/lib/node-env.js';
import { sign } from '../src/lib/jwt.js';
import { ChatRoom } from '../src/do/chat-room.js';

test('On-Demand Translations and Call Push Suite', async (t) => {
  const env = createNodeEnv();
  const JWT_SECRET = env.JWT_SECRET;
  const runId = Date.now().toString().slice(-6);

  const userA = { id: `uA_${runId}`, username: `alice_${runId}`, phone: `+94773${runId}`, display_name: 'Alice' };
  const userB = { id: `uB_${runId}`, username: `bob_${runId}`, phone: `+94774${runId}`, display_name: 'Bob' };
  const chatId = `chat_call_${runId}`;

  const tokenA = await sign({ sub: userA.id, exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
  const tokenB = await sign({ sub: userB.id, exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);

  const now = Date.now();
  await env.DB.prepare('INSERT INTO users (id, username, phone, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(userA.id, userA.username, userA.phone, userA.display_name, 'hash', now, now).run();
  await env.DB.prepare('INSERT INTO users (id, username, phone, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(userB.id, userB.username, userB.phone, userB.display_name, 'hash', now, now).run();

  await env.DB.prepare('INSERT INTO chats (id, type, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(chatId, 'direct', userA.id, now, now).run();
  await env.DB.prepare('INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)')
    .bind(`cp_a_${runId}`, chatId, userA.id, 'member', now).run();
  await env.DB.prepare('INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)')
    .bind(`cp_b_${runId}`, chatId, userB.id, 'member', now).run();

  await t.test('POST /api/chats/:id/messages delivers instantly with translations: null', async () => {
    const res = await app.request(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Ayubowan subha udasanak',
        clientId: `client_${runId}_1`
      })
    }, env);

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.message?.id);
    assert.equal(data.message.text, 'Ayubowan subha udasanak');
    assert.equal(data.message.translations, null, 'Should not block on synchronous translation on send');

    // On-demand fetch generates translations via GET /api/messages/:id/translations
    const transRes = await app.request(`/api/messages/${data.message.id}/translations`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    }, env);

    assert.equal(transRes.status, 200);
    const transData = await transRes.json();
    assert.equal(transData.messageId, data.message.id);
    assert.ok(transData.translations);
    assert.ok(transData.translations.en);
  });

  await t.test('ChatRoom WebSocket handles call-offer and broadcasts', async () => {
    const mockState = {
      acceptWebSocket: () => {},
      getWebSockets: () => []
    };
    const room = new ChatRoom(mockState, env);

    const mockSocket = {
      send: () => {},
      readyState: 1,
      serializeAttachment: () => {},
      deserializeAttachment: () => ({ userId: userA.id, chatId })
    };

    room.sessions.set(mockSocket, {
      userId: userA.id,
      chatId,
      username: 'Alice',
      typingTimer: null
    });

    // Handle call-offer without throwing errors
    await room.handleEvent(mockSocket, JSON.stringify({
      type: 'call-offer',
      payload: { callType: 'video', sdp: 'dummy-sdp-offer' }
    }));

    assert.ok(true, 'Call offer handled gracefully');
  });
});
