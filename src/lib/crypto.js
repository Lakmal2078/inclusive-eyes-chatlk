const encoder = new TextEncoder();

function hex(buffer) {
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function bytes(value) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2) throw new Error('Invalid salt or hash');
  return Uint8Array.from(value.match(/.{2}/g), pair => Number.parseInt(pair, 16));
}

async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, key, 256);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: hex(salt), hash: hex(await derive(password, salt)) };
}

export async function verifyPassword(password, hash, salt) {
  try {
    const actual = new Uint8Array(await derive(password, bytes(salt)));
    const expected = bytes(hash);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < actual.length; i += 1) difference |= actual[i] ^ expected[i];
    return difference === 0;
  } catch {
    return false;
  }
}

export function encodePasswordRecord({ hash, salt }) {
  return `${salt}:${hash}`;
}

export function decodePasswordRecord(record) {
  const [salt, hash] = String(record || '').split(':');
  return { salt, hash };
}
