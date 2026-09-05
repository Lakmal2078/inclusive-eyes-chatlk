export const uploadFile = (env,key,body,contentType) => env.MEDIA.put(key,body,{httpMetadata:{contentType}});
export const getFile = (env,key) => env.MEDIA.get(key);
export const deleteFile = (env,key) => env.MEDIA.delete(key);
