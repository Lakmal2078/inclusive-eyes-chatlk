import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ChatSettings } from '../src/components/ChatSettings.js';
import app from '../src/index.js';
import { createNodeEnv } from '../src/lib/node-env.js';
import { sign } from '../src/lib/jwt.js';
import { hashPassword } from '../src/lib/crypto.js';

test('ChatSettings React Component and D1 Integration Suite', async (t) => {
  let env;
  let user1;
  let chatId;
  let authToken;

  t.before(async () => {
    env = createNodeEnv();
    const JWT_SECRET = env.JWT_SECRET;
    const runId = Math.random().toString(36).substring(2, 9);
    const passwordData = await hashPassword('SecurePass123!');
    user1 = {
      id: `user_settings_${runId}`,
      username: `settings_user_${runId}`,
      phone: `+9477000${Math.floor(1000 + Math.random() * 9000)}`,
      display_name: 'Test Settings User',
      password_hash: passwordData.hash,
      role: 'user',
      language: 'si',
      created_at: Date.now(),
      updated_at: Date.now()
    };

    await env.DB.prepare(
      'INSERT INTO users (id, username, phone, display_name, password_hash, role, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      user1.id,
      user1.username,
      user1.phone,
      user1.display_name,
      user1.password_hash,
      user1.role,
      user1.language,
      user1.created_at,
      user1.updated_at
    ).run();

    chatId = `chat_settings_${runId}`;
    await env.DB.prepare(
      'INSERT INTO chats (id, type, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(chatId, 'direct', 'Settings Direct Chat', user1.id, Date.now(), Date.now()).run();

    await env.DB.prepare(
      'INSERT INTO chat_participants (id, chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(`part_${runId}`, chatId, user1.id, 'admin', Date.now()).run();

    authToken = await sign({ sub: user1.id, role: user1.role, exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
  });

  await t.test('renders ChatSettings component with toggles in default state', () => {
    const html = renderToString(
      React.createElement(ChatSettings, {
        chatName: 'Team Chat',
        initialAutoTranslate: true,
        initialMute: false
      })
    );

    assert.ok(html.includes('Team Chat Settings'), 'Renders chat name in header');
    assert.ok(html.includes('Auto-Translate Messages'), 'Renders auto-translate label');
    assert.ok(html.includes('Mute Notifications'), 'Renders mute notifications label');
    assert.ok(html.includes('id="toggle-auto-translate"'), 'Renders auto-translate toggle button');
    assert.ok(html.includes('id="toggle-mute"'), 'Renders mute toggle button');
    assert.ok(html.includes('Cloudflare D1'), 'Shows D1 database synchronization notice');
  });

  await t.test('renders language target options when auto-translate is enabled', () => {
    const html = renderToString(
      React.createElement(ChatSettings, {
        initialAutoTranslate: true,
        initialLanguage: 'si'
      })
    );

    assert.ok(html.includes('Primary Translation Target:'), 'Shows primary translation target label');
    assert.ok(html.includes('සිංහල (Sinhala)'), 'Renders Sinhala language option');
    assert.ok(html.includes('தமிழ் (Tamil)'), 'Renders Tamil language option');
    assert.ok(html.includes('English'), 'Renders English language option');
  });

  await t.test('renders mute duration options when mute toggle is active', () => {
    const html = renderToString(
      React.createElement(ChatSettings, {
        chatName: 'Project Group',
        initialAutoTranslate: false,
        initialMute: true
      })
    );

    assert.ok(html.includes('Mute Duration:'), 'Shows mute duration box');
    assert.ok(html.includes('8 Hours'), 'Shows 8 Hours duration button');
    assert.ok(html.includes('1 Week'), 'Shows 1 Week duration button');
    assert.ok(html.includes('Always'), 'Shows Always duration button');
    assert.ok(html.includes('Muted'), 'Shows Muted status badge');
  });

  await t.test('renders modal wrapper when mode="modal"', () => {
    const html = renderToString(
      React.createElement(ChatSettings, {
        mode: 'modal',
        chatName: 'Modal Settings Test'
      })
    );

    assert.ok(html.includes('chat-settings-modal-backdrop'), 'Renders modal backdrop');
    assert.ok(html.includes('chat-settings-card'), 'Renders settings card inside modal');
  });

  await t.test('D1 Database: GET and PATCH /api/users/me/settings updates auto-translate in D1', async () => {
    // 1. Initial settings fetch
    const getRes = await app.request('/api/users/me/settings', {
      headers: { Authorization: `Bearer ${authToken}` }
    }, env);
    assert.equal(getRes.status, 200);
    const initialData = await getRes.json();
    assert.equal(typeof initialData.autoTranslate, 'boolean');

    // 2. Toggle auto-translate to false
    const patchRes1 = await app.request('/api/users/me/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoTranslate: false })
    }, env);
    assert.equal(patchRes1.status, 200);
    const patchData1 = await patchRes1.json();
    assert.equal(patchData1.autoTranslate, false);

    // Verify directly in D1 SQLite table
    const dbRow1 = await env.DB.prepare('SELECT auto_translate FROM users WHERE id = ?').bind(user1.id).first();
    assert.equal(dbRow1.auto_translate, 0);

    // 3. Toggle auto-translate back to true
    const patchRes2 = await app.request('/api/users/me/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoTranslate: true })
    }, env);
    assert.equal(patchRes2.status, 200);
    const patchData2 = await patchRes2.json();
    assert.equal(patchData2.autoTranslate, true);

    const dbRow2 = await env.DB.prepare('SELECT auto_translate FROM users WHERE id = ?').bind(user1.id).first();
    assert.equal(dbRow2.auto_translate, 1);
  });

  await t.test('D1 Database: updates user mute preference and chat-level mute in D1 tables', async () => {
    // 1. Toggle global mute notification preference in D1 users table
    const muteUserRes = await app.request('/api/users/me/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ muteNotifications: true })
    }, env);
    assert.equal(muteUserRes.status, 200);
    const muteUserData = await muteUserRes.json();
    assert.equal(muteUserData.muteNotifications, true);

    const userDbRow = await env.DB.prepare('SELECT mute_notifications FROM users WHERE id = ?').bind(user1.id).first();
    assert.equal(userDbRow.mute_notifications, 1);

    // 2. Mute specific chat in D1 muted_chats table
    const muteChatRes = await app.request(`/api/chats/${chatId}/mute`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, env);
    assert.equal(muteChatRes.status, 200);

    const chatInfoMuted = await app.request(`/api/chats/${chatId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    }, env);
    assert.equal(chatInfoMuted.status, 200);
    const chatDataMuted = await chatInfoMuted.json();
    assert.equal(chatDataMuted.isMuted, true);

    // 3. Unmute chat in D1 muted_chats table
    const unmuteChatRes = await app.request(`/api/chats/${chatId}/mute`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    }, env);
    assert.equal(unmuteChatRes.status, 200);

    const chatInfoUnmuted = await app.request(`/api/chats/${chatId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    }, env);
    assert.equal(chatInfoUnmuted.status, 200);
    const chatDataUnmuted = await chatInfoUnmuted.json();
    assert.equal(chatDataUnmuted.isMuted, false);
  });
});
