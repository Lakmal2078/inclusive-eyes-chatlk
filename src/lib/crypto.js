const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const bytes = value => Uint8Array.from(value.match(/.{1,2}/g)?.map(x => parseInt(x, 16)) || []);
export async function hashPassword(password) { const salt = crypto.getRandomValues(new Uint8Array(16)); const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'}, key, 256); return {salt:hex(salt), hash:hex(bits)}; }
export async function verifyPassword(password, hash, salt) { const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(salt),iterations:100000,hash:'SHA-256'}, key, 256); return hex(bits) === hash; }
