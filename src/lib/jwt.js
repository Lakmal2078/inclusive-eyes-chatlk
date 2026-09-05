const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64url(value) {
  const bytes = value instanceof Uint8Array ? value : encoder.encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function json(value) {
  return JSON.parse(decoder.decode(decode(value)));
}

async function key(secret, usage) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usage);
}

export async function sign(payload, secret) {
  if (!secret) throw new Error('JWT_SECRET is not configured');
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: payload.iat ?? Math.floor(Date.now() / 1000) }));
  const signature = await crypto.subtle.sign('HMAC', await key(secret, ['sign']), encoder.encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(new Uint8Array(signature))}`;
}

export async function verify(token, secret) {
  if (!secret || typeof token !== 'string') throw new Error('Invalid token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [header, body, signature] = parts;
  const parsedHeader = json(header);
  if (parsedHeader.alg !== 'HS256') throw new Error('Unsupported algorithm');
  const valid = await crypto.subtle.verify('HMAC', await key(secret, ['verify']), decode(signature), encoder.encode(`${header}.${body}`));
  if (!valid) throw new Error('Invalid signature');
  const payload = json(body);
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}
