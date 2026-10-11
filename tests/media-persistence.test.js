import assert from 'node:assert/strict';
import test from 'node:test';
import { rmSync, existsSync } from 'node:fs';
import { createNodeEnv } from '../src/lib/node-env.js';

test('Local media storage persists files across storage instances', async () => {
  const testDir = './data/test-media-persistent';
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });

  const prevEnv = process.env.MEDIA_DIR;
  const prevDbPath = process.env.DB_PATH;
  try {
    process.env.MEDIA_DIR = testDir;
    delete process.env.DB_PATH; // allow persistent mode

    const env1 = createNodeEnv();
    const testKey = 'test-image-123.jpg';
    const testContent = Buffer.from('fake-jpeg-image-binary-data');

    await env1.MEDIA.put(testKey, testContent, {
      httpMetadata: { contentType: 'image/jpeg' },
      customMetadata: { uploader: 'user-abc' }
    });

    // Create a fresh environment simulating server restart
    const env2 = createNodeEnv();
    const retrieved = await env2.MEDIA.get(testKey);

    assert.ok(retrieved, 'Media should be found after server restart');
    assert.deepEqual(retrieved.body, testContent);
    assert.equal(retrieved.httpMetadata.contentType, 'image/jpeg');
    assert.equal(retrieved.customMetadata.uploader, 'user-abc');

    // Clean up
    await env2.MEDIA.delete(testKey);
    const afterDelete = await env2.MEDIA.get(testKey);
    assert.equal(afterDelete, null);
  } finally {
    if (prevEnv) process.env.MEDIA_DIR = prevEnv; else delete process.env.MEDIA_DIR;
    if (prevDbPath) process.env.DB_PATH = prevDbPath; else delete process.env.DB_PATH;
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  }
});
