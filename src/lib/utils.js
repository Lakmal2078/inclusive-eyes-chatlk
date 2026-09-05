export const generateId = () => crypto.randomUUID();
export const validateUsername = name => /^[a-zA-Z0-9_]{3,20}$/.test(name || '');
export const validatePhone = phone => /^\+[1-9]\d{7,14}$/.test(phone || '');
export const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json'}});
export const safeLimit = value => Math.min(Math.max(Number(value) || 50, 1), 50);
