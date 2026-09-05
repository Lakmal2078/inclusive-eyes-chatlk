import { Hono } from 'hono';
import { deleteFile, getFile, uploadFile } from '../lib/r2.js';
import { generateId, mediaExtension } from '../lib/utils.js';

export const mediaRoutes = new Hono();
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/ogg', 'audio/mp4', 'application/pdf']);

mediaRoutes.post('/upload', async c => {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !allowed.has(file.type)) return c.json({ error: 'Unsupported file type' }, 400);
  const user = await c.env.DB.prepare('SELECT is_premium FROM users WHERE id = ?').bind(c.get('userId')).first();
  const maxMb = user?.is_premium ? Number(c.env.PREMIUM_MAX_FILE_SIZE_MB || 500) : Number(c.env.MAX_FILE_SIZE_MB || 100);
  if (file.size > maxMb * 1024 * 1024) return c.json({ error: `File exceeds ${maxMb}MB limit` }, 413);
  const key = `media/${c.get('userId')}/${Date.now()}-${generateId()}.${mediaExtension(file.name)}`;
  await uploadFile(c.env, key, file.stream(), file.type, { userId: c.get('userId'), originalName: file.name.slice(0, 200) });
  return c.json({ key, url: `/api/media/${key}`, thumbnailUrl: file.type.startsWith('image/') ? `/api/media/${key}?thumb=1` : null }, 201);
});

mediaRoutes.get('/*', async c => {
  const key = c.req.path.replace(/^\/api\/media\//, '');
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
