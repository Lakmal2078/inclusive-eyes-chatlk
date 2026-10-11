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

const runId = Date.now().toString().slice(-6);
const hostUser = { id: `host_${runId}`, username: `host_${runId}`, phone: `+94770${runId}`, display_name: 'Nadee Host', role: 'user' };
const guestUser = { id: `guest_${runId}`, username: `guest_${runId}`, phone: `+94778${runId}`, display_name: 'Kamal Guest', role: 'user' };

test('Circle-First Invite Flow Verification Suite', async (t) => {
  let hostToken;
  let guestToken;
  let groupId;
  let inviteCode;

  await t.test('Setup seed users for invite test', async () => {
    const now = Date.now();
    for (const u of [hostUser, guestUser]) {
      await env.DB.prepare(
        'INSERT INTO users (id, username, phone, display_name, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(u.id, u.username, u.phone, u.display_name, 'dummy_hash', u.role, now, now).run();
    }
    hostToken = await createAuthToken(hostUser.id);
    guestToken = await createAuthToken(guestUser.id);
  });

  await t.test('Solo group creation: Host creates group without initial members', async () => {
    const res = await app.request('/api/groups', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hostToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Colombo Cycling Club ${runId}`,
        description: 'Weekend rides and routes'
      })
    }, env);

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.id);
    assert.equal(data.name, `Colombo Cycling Club ${runId}`);
    assert.equal(data.member_count, 1);
    groupId = data.id;
  });

  await t.test('Invite Generation: Host creates a shareable invite link', async () => {
    const res = await app.request(`/api/groups/${groupId}/invites`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hostToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expiresInDays: 7
      })
    }, env);

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.invite?.code);
    assert.equal(data.invite.url, `/join/${data.invite.code}`);
    inviteCode = data.invite.code;
  });

  await t.test('Non-admin cannot generate invite link', async () => {
    const res = await app.request(`/api/groups/${groupId}/invites`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${guestToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    }, env);

    assert.equal(res.status, 403);
  });

  await t.test('Public Preview: Unauthenticated user previews invite card', async () => {
    const res = await app.request(`/api/invites/${inviteCode}`, {
      method: 'GET'
    }, env);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.valid, true);
    assert.equal(data.invite.code, inviteCode);
    assert.equal(data.invite.group.name, `Colombo Cycling Club ${runId}`);
    assert.equal(data.invite.group.member_count, 1);
    assert.equal(data.invite.host.display_name, 'Nadee Host');
  });

  await t.test('Authenticated Join: Existing user joins via invite code', async () => {
    const res = await app.request(`/api/invites/${inviteCode}/join`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${guestToken}`
      }
    }, env);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.chatId, groupId);

    // Verify member count is now 2
    const groupRes = await app.request(`/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${hostToken}` }
    }, env);
    const groupData = await groupRes.json();
    assert.equal(groupData.member_count, 2);
  });

  await t.test('Contextual Signup: New user registers with invite_code and lands in group', async () => {
    const newUsername = `newbie_${runId}`;
    const newPhone = `+94775${runId}`;
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newUsername,
        phone: newPhone,
        display_name: 'Newbie Rider',
        password: 'Password123!',
        invite_code: inviteCode
      })
    }, env);

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.token);
    assert.equal(data.joinedChatId, groupId);
    assert.equal(data.joinedGroupName, `Colombo Cycling Club ${runId}`);

    // Verify group now has 3 members
    const groupRes = await app.request(`/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${hostToken}` }
    }, env);
    const groupData = await groupRes.json();
    assert.equal(groupData.member_count, 3);
  });

  await t.test('Invalid or expired invite returns appropriate error', async () => {
    const res = await app.request('/api/invites/nonexistent_code', {
      method: 'GET'
    }, env);

    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.valid, false);
  });
});
