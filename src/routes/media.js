import { Hono } from 'hono';
import { deleteFile, getFile, uploadFile } from '../lib/r2.js';
import { generateId, mediaExtension } from '../lib/utils.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';

export const mediaRoutes = new Hono();
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/ogg', 'audio/mp4', 'audio/webm', 'application/pdf']);

const startsWith = (bytes, values, offset = 0) => values.every((value, index) => bytes[offset + index] === value);
async function matchesDeclaredType(file) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signatures = {
    'image/jpeg': startsWith(bytes, [0xff, 0xd8, 0xff]),
    'image/png': startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    'image/gif': startsWith(bytes, [0x47, 0x49, 0x46, 0x38]),
    'image/webp': startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8),
    'video/mp4': startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4),
    'audio/mp4': startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4),
    'audio/ogg': startsWith(bytes, [0x4f, 0x67, 0x67, 0x53]),
    'audio/webm': startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]),
    'application/pdf': startsWith(bytes, [0x25, 0x50, 0x44, 0x46])
  };
  return signatures[file.type] ?? false;
}

mediaRoutes.post('/upload', uploadRateLimiter, async c => {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !allowed.has(file.type)) return c.json({ error: 'Unsupported file type' }, 400);
  if (!(await matchesDeclaredType(file))) return c.json({ error: 'File content does not match declared type' }, 400);
  const user = await c.env.DB.prepare('SELECT is_premium FROM users WHERE id = ?').bind(c.get('userId')).first();
  const maxMb = user?.is_premium ? Number(c.env.PREMIUM_MAX_FILE_SIZE_MB || 500) : Number(c.env.MAX_FILE_SIZE_MB || 100);
  if (file.size > maxMb * 1024 * 1024) return c.json({ error: `File exceeds ${maxMb}MB limit` }, 413);
  const key = `media/${c.get('userId')}/${Date.now()}-${generateId()}.${mediaExtension(file.name)}`;
  await uploadFile(c.env, key, file.stream(), file.type, { userId: c.get('userId'), originalName: file.name.slice(0, 200) });
  return c.json({ key, url: `/api/media/${key}`, thumbnailUrl: file.type.startsWith('image/') ? `/api/media/${key}?thumb=1` : null }, 201);
});

mediaRoutes.get('/*', async c => {
  const key = c.req.path.replace(/^\/api\/media\//, '');
  const userId = c.get('userId');

  // Avatars are accessible to authenticated users
  const isAvatar = key.startsWith('avatars/');
  const isOwner = userId && key.startsWith(`media/${userId}/`);

  if (!isAvatar && !isOwner && c.env.DB && userId) {
    // Check if user is a participant of a chat where this media is shared
    const inChat = await c.env.DB.prepare(`
      SELECT 1 FROM messages m
      JOIN chat_participants cp ON cp.chat_id = m.chat_id
      WHERE (m.media_url LIKE ? OR m.media_thumbnail LIKE ?) AND cp.user_id = ?
      LIMIT 1
    `).bind(`%${key}%`, `%${key}%`, userId).first();

    if (!inChat) {
      // Check if media is referenced in an active status
      const inStatus = await c.env.DB.prepare(`
        SELECT s.user_id FROM statuses s
        WHERE s.media_url LIKE ? AND s.expires_at > ?
        LIMIT 1
      `).bind(`%${key}%`, Date.now()).first();

      let allowedStatus = false;
      if (inStatus) {
        // Status media is accessible if the viewer is not blocked by status author
        const blocked = await c.env.DB.prepare(`
          SELECT 1 FROM blocked_users
          WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
        `).bind(userId, inStatus.user_id, inStatus.user_id, userId).first();
        if (!blocked) allowedStatus = true;
      }

      if (!allowedStatus) {
        return c.json({ error: 'Forbidden' }, 403);
      }
    }
  }

  const object = await getFile(c.env, key);
  if (!object) return c.notFound();
  const headers = new Headers({ 'content-type': object.httpMetadata?.contentType || 'application/octet-stream', etag: object.httpEtag || '' });
  if (object.httpMetadata?.contentDisposition) headers.set('content-disposition', object.httpMetadata.contentDisposition);
  return new Response(object.body, { headers });
});

mediaRoutes.delete('/*', async c => {
  const key = c.req.path.replace(/^\/api\/media\//, '');
  if (!key.startsWith(`media/${c.get('userId')}/`) && !key.startsWith(`avatars/${c.get('userId')}/`)) return c.json({ error: 'Forbidden' }, 403);
  await deleteFile(c.env, key);
  return c.json({ ok: true });
});
