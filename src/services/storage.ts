/**
 * Storage helpers for Cloudflare R2 (chat-media bucket)
 */

export async function uploadFile(
  env: any,
  key: string,
  body: any,
  contentType: string,
  metadata: Record<string, string> = {}
) {
  if (!env.MEDIA) {
    throw new Error('MEDIA (R2) binding is not configured');
  }
  return env.MEDIA.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: metadata
  });
}

export async function getFile(env: any, key: string) {
  if (!env.MEDIA) {
    throw new Error('MEDIA (R2) binding is not configured');
  }
  return env.MEDIA.get(key);
}

export async function deleteFile(env: any, key: string) {
  if (!env.MEDIA) {
    throw new Error('MEDIA (R2) binding is not configured');
  }
  return env.MEDIA.delete(key);
}

/**
 * Uploads a user avatar to R2 under the avatars/{userId}/ prefix.
 */
export async function uploadAvatar(
  env: any,
  userId: string,
  buffer: any,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const key = `avatars/${userId}/avatar.${ext}`;
  await uploadFile(env, key, buffer, contentType, { userId, type: 'avatar' });
  return `/api/media/${key}`;
}

/**
 * Deletes user avatar from R2.
 */
export async function deleteAvatar(env: any, userId: string): Promise<void> {
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of extensions) {
    try {
      await deleteFile(env, `avatars/${userId}/avatar.${ext}`);
    } catch {}
  }
}
