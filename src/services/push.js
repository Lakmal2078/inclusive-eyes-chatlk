/**
 * Web Push service for Cloudflare Workers.
 * Implements VAPID ES256 authentication and RFC 8291 aes128gcm payload encryption.
 */

const encoder = new TextEncoder();
const concat = (...parts) => {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};

function base64urlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(value) {
  const padded = String(value).replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - String(value).length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint32be(value) {
  return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
}

async function hkdfExtract(salt, ikm) {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm));
}

async function hkdfExpand(prk, info, length) {
  const key = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const output = new Uint8Array(length);
  let previous = new Uint8Array(0);
  let offset = 0;
  let counter = 1;
  while (offset < length) {
    previous = new Uint8Array(await crypto.subtle.sign('HMAC', key, concat(previous, info, new Uint8Array([counter]))));
    const chunk = previous.slice(0, Math.min(previous.length, length - offset));
    output.set(chunk, offset);
    offset += chunk.length;
    counter += 1;
  }
  return output;
}

function publicJwkFromRaw(raw) {
  if (raw.length !== 65 || raw[0] !== 4) throw new Error('Invalid P-256 public key');
  return { kty: 'EC', crv: 'P-256', x: base64urlEncode(raw.slice(1, 33)), y: base64urlEncode(raw.slice(33, 65)), ext: true };
}

function rawPublicKeyFromJwk(jwk) {
  return concat(new Uint8Array([4]), base64urlDecode(jwk.x), base64urlDecode(jwk.y));
}

async function createVapidAuthorization(endpoint, publicKey, privateKey, subject) {
  const url = new URL(endpoint);
  const publicRaw = base64urlDecode(publicKey);
  const publicJwk = publicJwkFromRaw(publicRaw);
  const privateJwk = { ...publicJwk, d: privateKey, key_ops: ['sign'] };
  const signingKey = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = base64urlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = base64urlEncode(encoder.encode(JSON.stringify({
    aud: `${url.protocol}//${url.host}`,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject
  })));
  const input = `${header}.${payload}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, encoder.encode(input));
  return `vapid t=${input}.${base64urlEncode(signature)}, k=${publicKey}`;
}

async function encryptPayload(payload, subscription) {
  const receiverRaw = base64urlDecode(subscription.keys_p256dh);
  const receiverKey = await crypto.subtle.importKey('raw', receiverRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, ephemeral.privateKey, 256));
  const authSecret = base64urlDecode(subscription.keys_auth);
  const authPrk = await hkdfExtract(authSecret, sharedSecret);
  const receiverInfo = concat(encoder.encode('WebPush: info\0'), receiverRaw, rawPublicKeyFromJwk(await crypto.subtle.exportKey('jwk', ephemeral.publicKey)));
  const ikm = await hkdfExpand(authPrk, receiverInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, encoder.encode('Content-Encoding: nonce\0'), 12);
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const plaintext = concat(encoder.encode(JSON.stringify(payload)), new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext));
  const ephemeralRaw = rawPublicKeyFromJwk(await crypto.subtle.exportKey('jwk', ephemeral.publicKey));
  return concat(salt, uint32be(4096), new Uint8Array([ephemeralRaw.length]), ephemeralRaw, ciphertext);
}

export async function savePushSubscription(env, userId, endpoint, keys) {
  const id = crypto.randomUUID();
  await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
  await env.DB.prepare(
    "INSERT INTO push_subscriptions (id, user_id, endpoint, keys_p256dh, keys_auth, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
  ).bind(id, userId, endpoint, keys.p256dh, keys.auth).run();
  return id;
}

export async function removePushSubscription(env, userId, endpoint) {
  const res = await env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').bind(userId, endpoint).run();
  return Number(res.meta?.changes || 0) > 0;
}

export async function sendPushToUser(env, userId, payload) {
  const result = { sent: 0, failed: 0 };
  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) {
    console.warn('[ChatLK Push] VAPID keys not configured — skipping dispatch');
    return { ...result, error: 'VAPID keys not configured' };
  }
  const subs = await env.DB.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').bind(userId).all();
  for (const sub of subs.results || []) {
    try {
      const body = await encryptPayload(payload, sub);
      const response = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          Authorization: await createVapidAuthorization(sub.endpoint, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT || 'mailto:admin@chatlk.app'),
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          TTL: '86400'
        },
        body
      });
      if ([200, 201, 202, 204].includes(response.status)) result.sent += 1;
      else if ([404, 410].includes(response.status)) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(sub.id).run();
        result.failed += 1;
      } else result.failed += 1;
    } catch (error) {
      console.warn('[ChatLK Push] Dispatch error:', error.message);
      result.failed += 1;
    }
  }
  return result;
}
