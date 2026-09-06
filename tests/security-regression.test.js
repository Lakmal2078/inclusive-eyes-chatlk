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
