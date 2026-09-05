export async function uploadFile(env, key, body, contentType, metadata = {}) {
  if (!env.MEDIA) throw new Error('MEDIA binding is not configured');
  return env.MEDIA.put(key, body, { httpMetadata: { contentType }, customMetadata: metadata });
}

export async function getFile(env, key) {
  if (!env.MEDIA) throw new Error('MEDIA binding is not configured');
  return env.MEDIA.get(key);
}

export async function deleteFile(env, key) {
  if (!env.MEDIA) throw new Error('MEDIA binding is not configured');
  return env.MEDIA.delete(key);
}
