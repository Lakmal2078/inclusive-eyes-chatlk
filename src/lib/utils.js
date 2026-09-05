const USERNAME = /^[A-Za-z0-9_]{3,20}$/;
const PHONE = /^\+[1-9]\d{7,14}$/;

export function generateId() {
  return crypto.randomUUID();
}

export function validateUsername(value) {
  return typeof value === 'string' && USERNAME.test(value);
}

export function validatePhone(value) {
  return typeof value === 'string' && PHONE.test(value);
}

export function cleanText(value, max = 4096) {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}

export function parseLimit(value, fallback = 50, max = 50) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), max) : fallback;
}

export function jsonBody(c) {
  return c.req.json().catch(() => null);
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    phone: user.phone,
    displayName: user.display_name ?? user.displayName,
    avatarUrl: user.avatar_url ?? user.avatarUrl ?? null,
    bio: user.bio ?? '',
    isPremium: Boolean(user.is_premium ?? user.isPremium),
    isBusiness: Boolean(user.is_business ?? user.isBusiness),
    isVerified: Boolean(user.is_verified ?? user.isVerified),
    language: user.language ?? 'si',
    lastSeen: user.last_seen ?? user.lastSeen ?? null,
  };
}

export function getClientIp(c) {
  return c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'local';
}

export function mediaExtension(name = '') {
  const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return extension || 'bin';
}
