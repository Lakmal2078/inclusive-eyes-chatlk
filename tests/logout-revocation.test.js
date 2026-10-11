import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/index.js';
import { createNodeEnv } from '../src/lib/node-env.js';

test('Logout revokes token and prevents subsequent API and WebSocket requests', async () => {
  const env = createNodeEnv();

  // 1. Register a test user
  const regRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'logoutuser',
      phone: '+94771234567',
      password: 'StrongPassword123'
    })
  }, env);
  assert.equal(regRes.status, 201);
  const regData = await regRes.json();
  const token = regData.token;
  assert.ok(token);

  // 2. Verify token works on protected endpoint
  const authRes = await app.request('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  }, env);
  assert.equal(authRes.status, 200);

  // 3. Perform logout
  const logoutRes = await app.request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }, env);
  assert.equal(logoutRes.status, 200);
  const logoutData = await logoutRes.json();
  assert.equal(logoutData.success, true);

  // 4. Verify token is now revoked for API requests
  const revokedRes = await app.request('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  }, env);
  assert.equal(revokedRes.status, 401);
  const revokedData = await revokedRes.json();
  assert.match(revokedData.error, /revoked/i);

  // 5. Verify token is revoked for WebSocket handshake
  const wsRes = await app.request(`/ws?userId=${regData.user.id}&chatId=test-chat&token=${token}`, {}, env);
  assert.equal(wsRes.status, 401);
  const wsData = await wsRes.json();
  assert.match(wsData.error, /revoked/i);
});
