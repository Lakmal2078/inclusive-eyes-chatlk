import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/index.js';
import { createNodeEnv } from '../src/lib/node-env.js';

test('Password Reset Suite', async (t) => {
  const env = createNodeEnv();

  // 1. Register a test user
  const regRes = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'reset_user',
      phone: '+94778899000',
      display_name: 'Reset User',
      password: 'InitialPassword123'
    })
  }, env);

  assert.equal(regRes.status, 201);

  await t.test('Rejects reset when username or phone does not match', async () => {
    const res = await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'reset_user',
        phone: '+94770000000',
        newPassword: 'BrandNewPassword123'
      })
    }, env);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.match(json.error, /No account found/i);
  });

  await t.test('Rejects reset with short password', async () => {
    const res = await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'reset_user',
        phone: '+94778899000',
        newPassword: 'short'
      })
    }, env);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.match(json.error, /between 8 and 128/i);
  });

  await t.test('Successfully resets password with matching username and phone', async () => {
    const res = await app.request('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'reset_user',
        phone: '+94 77 889 9000', // Test phone with spaces
        newPassword: 'BrandNewPassword123'
      })
    }, env);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.token);
    assert.equal(json.user.username, 'reset_user');
  });

  await t.test('Old password is now rejected upon login', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'reset_user',
        password: 'InitialPassword123'
      })
    }, env);
    assert.equal(res.status, 401);
  });

  await t.test('New password successfully logs in', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'reset_user',
        password: 'BrandNewPassword123'
      })
    }, env);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.token);
    assert.equal(json.user.username, 'reset_user');
  });
});
