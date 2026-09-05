/**
 * Storage helpers for Cloudflare R2 (chat-media bucket)
 */

export async function uploadFile(env, key, body, contentType, metadata = {}) {
  if (!env.MEDIA) {
    throw new Error('MEDIA (R2) binding is not configured');
  }
  return env.MEDIA.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: metadata
  });
}

export async function getFile(env, key) {
  if (!env.MEDIA) {
    throw new Error('MEDIA (R2) binding is not configured');
  }
  return env.MEDIA.get(key);
}

export async function deleteFile(env, key) {
  if (!env.MEDIA) {
    throw new Error('MEDIA (R2) binding is not configured');
  }
  return env.MEDIA.delete(key);
}

export async function uploadAvatar(env, userId, buffer, contentType = 'image/jpeg') {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const key = `avatars/${userId}/avatar.${ext}`;
  await uploadFile(env, key, buffer, contentType, { userId, type: 'avatar' });
  return `/api/media/${key}`;
}

export async function deleteAvatar(env, userId) {
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of extensions) {
    try {
      await deleteFile(env, `avatars/${userId}/avatar.${ext}`);
    } catch {}
  }
}
