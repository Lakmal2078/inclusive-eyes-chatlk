import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { createNodeEnv } from '../src/lib/node-env.js';
import { sign } from '../src/lib/jwt.js';
import { autoTranslateMessage, detectLanguage, getSmartReplySuggestions, moderateMessageText } from '../src/services/ai.js';
import { dbService } from '../src/services/database.js';

const env = createNodeEnv();
const JWT_SECRET = env.JWT_SECRET;

async function createAuthToken(userId, role = 'user') {
  return sign({ sub: userId, role, exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
}

const runId = Date.now().toString().slice(-6);
const user1 = { id: `u1_${runId}`, username: `alice_${runId}`, phone: `+94771${runId}`, display_name: 'Alice', role: 'user' };
const user2 = { id: `u2_${runId}`, username: `bob_${runId}`, phone: `+94772${runId}`, display_name: 'Bob', role: 'user' };
const adminUser = { id: `adm_${runId}`, username: `admin_${runId}`, phone: `+94779${runId}`, display_name: 'Admin User', role: 'admin' };
const chatId = `chat_${runId}`;

test('ChatLK 15 Features Verification Suite', async (t) => {
  await t.test('Setup seed test users and chats', async () => {
    const now = Date.now();
    for (const u of [user1, user2, adminUser]) {
      await env.DB.prepare(
        'INSERT INTO users (id, username, phone, display_name, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(u.id, u.username, u.phone, u.display_name, 'hash123', u.role, now, now).run();
    }

    await env.DB.prepare(
      'INSERT INTO chats (id, type, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(chatId, 'direct', user1.id, now, now).run();

    await env.DB.prepare(
      'INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(`cp1_${runId}`, chatId, user1.id, 'member', now).run();

    await env.DB.prepare(
      'INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(`cp2_${runId}`, chatId, user2.id, 'member', now).run();

    const check = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE id = ?').bind(user1.id).first();
    assert.equal(Number(check.count), 1);
  });

  await t.test('Feature 1: Auto-translation and language detection', async () => {
    assert.equal(detectLanguage('ආයුබෝවන්'), 'si');
    assert.equal(detectLanguage('வணக்கம்'), 'ta');
    assert.equal(detectLanguage('Hello world'), 'en');

    const translations = await autoTranslateMessage(env, 'Hello there');
    assert.ok(translations.en);
    assert.ok(translations.si);
    assert.ok(translations.ta);
  });

  await t.test('Feature 2: Group chat creation and member management', async () => {
    const token = await createAuthToken(user1.id);
    const res = await app.request('/api/groups', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Engineers LK ${runId}`,
        description: 'Tech discussions in Sri Lanka',
        memberIds: [user2.id]
      })
    }, env);

    assert.equal(res.status, 201);
    const group = await res.json();
    assert.equal(group.name, `Engineers LK ${runId}`);
    assert.equal(group.member_count, 2);

    // Get group details
    const getRes = await app.request(`/api/groups/${group.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }, env);
    assert.equal(getRes.status, 200);
    const details = await getRes.json();
    assert.equal(details.members.length, 2);
  });

  await t.test('Feature 3: Message reactions toggle and summary', async () => {
    const token = await createAuthToken(user1.id);
    const msgId = `msg_rx_${runId}`;
    await env.DB.prepare(
      'INSERT INTO messages (id, chat_id, sender_id, text, message_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(msgId, chatId, user1.id, 'Testing reactions', 'text', 'sent', Date.now()).run();

    // Add reaction
    const rxRes = await app.request(`/api/messages/${msgId}/reactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' })
    }, env);

    assert.equal(rxRes.status, 200);
    const rxData = await rxRes.json();
    assert.equal(rxData.action, 'added');
    assert.equal(rxData.summary[0].emoji, '👍');
    assert.equal(rxData.summary[0].count, 1);

    // Toggle reaction off
    const rxToggle = await app.request(`/api/messages/${msgId}/reactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' })
    }, env);
    const toggleData = await rxToggle.json();
    assert.equal(toggleData.action, 'removed');
  });

  await t.test('Feature 4: Message editing and soft deletion with 15m window', async () => {
    const token = await createAuthToken(user1.id);
    const msgId = `msg_edit_${runId}`;
    await env.DB.prepare(
      'INSERT INTO messages (id, chat_id, sender_id, text, message_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(msgId, chatId, user1.id, 'Original text', 'text', 'sent', Date.now()).run();

    // Edit message
    const editRes = await app.request(`/api/messages/${msgId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Edited new text' })
    }, env);

    assert.equal(editRes.status, 200);
    const editData = await editRes.json();
    assert.equal(editData.content, 'Edited new text');
    assert.equal(editData.is_edited, 1);

    // Soft delete message
    const delRes = await app.request(`/api/messages/${msgId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }, env);
    assert.equal(delRes.status, 200);

    const deletedMsg = await env.DB.prepare('SELECT is_deleted, deleted_at, text FROM messages WHERE id = ?').bind(msgId).first();
    assert.equal(deletedMsg.is_deleted, 1);
    assert.ok(deletedMsg.deleted_at);
    assert.equal(deletedMsg.text, null);
  });

  await t.test('Feature 6: Presence tracking and status', async () => {
    await dbService.updateUserPresence(env.DB, user1.id, true);
    const presence = await app.request(`/api/users/${user1.id}/presence`, {
      headers: { Authorization: `Bearer ${await createAuthToken(user1.id)}` }
    }, env);
    assert.equal(presence.status, 200);
    const data = await presence.json();
    assert.equal(data.isOnline, true);
    assert.ok(data.lastSeen);
  });

  await t.test('Feature 7: Full-text message search', async () => {
    const token = await createAuthToken(user1.id);
    const sMsgId = `msg_search_${runId}`;
    await env.DB.prepare(
      'INSERT INTO messages (id, chat_id, sender_id, text, message_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(sMsgId, chatId, user1.id, 'Kottu roti is delicious in Colombo', 'text', 'sent', Date.now()).run();

    const searchRes = await app.request('/api/search/messages?q=Kottu', {
      headers: { Authorization: `Bearer ${token}` }
    }, env);

    assert.equal(searchRes.status, 200);
    const data = await searchRes.json();
    assert.ok(data.count >= 1);
    assert.ok(data.messages.some(m => m.text.includes('Kottu')));
  });

  await t.test('Feature 8: User Profile update and retrieval', async () => {
    const token = await createAuthToken(user1.id);
    const patchRes = await app.request('/api/users/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Alice Developer',
        bio: 'Cloudflare Workers builder in Colombo',
        autoTranslate: 1
      })
    }, env);

    assert.equal(patchRes.status, 200);
    const getRes = await app.request(`/api/users/${user1.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }, env);
    assert.equal(getRes.status, 200);
    const data = await getRes.json();
    assert.equal(data.user.display_name, 'Alice Developer');
    assert.equal(data.user.bio, 'Cloudflare Workers builder in Colombo');
  });

  await t.test('Feature 9: Web Push notification subscription', async () => {
    const token = await createAuthToken(user1.id);
    const subRes = await app.request('/api/push/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: `https://fcm.googleapis.com/fcm/send/fake-endpoint-${runId}`,
        keys: { p256dh: 'test-p256dh-key', auth: 'test-auth-key' }
      })
    }, env);

    assert.equal(subRes.status, 200);
    const subData = await subRes.json();
    assert.ok(subData.subscriptionId);

    // VAPID key
    const vapidRes = await app.request('/api/push/vapid-key', {
      headers: { Authorization: `Bearer ${token}` }
    }, env);
    assert.equal(vapidRes.status, 200);
  });

  await t.test('Feature 10: AI Content Moderation', async () => {
    const cleanResult = await moderateMessageText(env, 'Good morning everyone!');
    assert.equal(cleanResult.status, 'clean');

    const flaggedResult = await moderateMessageText(env, 'Claim your free crypto spam now');
    assert.equal(flaggedResult.status, 'flagged');

    const blockedResult = await moderateMessageText(env, 'I will commit suicide');
    assert.equal(blockedResult.status, 'blocked');
  });

  await t.test('Feature 11: Smart reply suggestions', async () => {
    const suggestions = await getSmartReplySuggestions(env, `chat-test-${runId}`, [
      { text: 'Can we meet tomorrow at 10 AM?', sender_id: user2.id }
    ], 'en');

    assert.equal(suggestions.length, 3);
    assert.ok(typeof suggestions[0] === 'string');
  });

  await t.test('Feature 12: Message Pinning', async () => {
    const token = await createAuthToken(user1.id);
    const pinMsgId = `msg_pin_${runId}`;
    await env.DB.prepare(
      'INSERT INTO messages (id, chat_id, sender_id, text, message_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(pinMsgId, chatId, user1.id, 'Important announcement', 'text', 'sent', Date.now()).run();

    const pinRes = await app.request(`/api/messages/${pinMsgId}/pin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }, env);
    assert.equal(pinRes.status, 200);

    const pinnedList = await app.request(`/api/chats/${chatId}/pinned`, {
      headers: { Authorization: `Bearer ${token}` }
    }, env);
    assert.equal(pinnedList.status, 200);
    const listData = await pinnedList.json();
    assert.ok(listData.pinned.some(m => m.id === pinMsgId));
  });

  await t.test('Feature 13: Block and Mute users/chats', async () => {
    const token1 = await createAuthToken(user1.id);
    // Block user2
    const blockRes = await app.request(`/api/users/${user2.id}/block`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` }
    }, env);
    assert.equal(blockRes.status, 200);

    const isBlocked = await dbService.isUserBlocked(env.DB, user1.id, user2.id);
    assert.equal(isBlocked, true);

    // Mute chat
    const muteRes = await app.request(`/api/chats/${chatId}/mute`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` }
    }, env);
    assert.equal(muteRes.status, 200);

    const isMuted = await dbService.isChatMuted(env.DB, user1.id, chatId);
    assert.equal(isMuted, true);
  });

  await t.test('Feature 14: Admin Dashboard & Analytics (RBAC)', async () => {
    const adminToken = await createAuthToken(adminUser.id, 'admin');
    const userToken = await createAuthToken(user1.id, 'user');

    // Normal user forbidden
    const forbiddenRes = await app.request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${userToken}` }
    }, env);
    assert.equal(forbiddenRes.status, 403);

    // Admin allowed
    const statsRes = await app.request('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    }, env);
    assert.equal(statsRes.status, 200);
    const stats = await statsRes.json();
    assert.ok(stats.totalUsers >= 1);
    assert.ok(stats.storageUsage);
  });

  await t.test('Feature 15: Rate Limiting protection', async () => {
    const token = await createAuthToken(user1.id);
    // Fast loop to test rate limiter behavior
    let lastStatus = 200;
    for (let i = 0; i < 35; i++) {
      const res = await app.request(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `Message #${i}` })
      }, env);
      lastStatus = res.status;
      if (res.status === 429) break;
    }
    assert.equal(lastStatus, 429);
  });
});
