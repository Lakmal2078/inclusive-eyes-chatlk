import { Hono } from 'hono';
import { assertParticipant } from '../lib/db.js';
import { jsonBody } from '../lib/utils.js';

export const aiRoutes = new Hono();

async function run(env, model, input) {
  if (!env.AI) return null;
  try {
    return await env.AI.run(model, input);
  } catch (error) {
    console.error('Workers AI error', error);
    return null;
  }
}

function sanitizeText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on[a-z]+\s*=/gi, '')
    .trim();
}

aiRoutes.post('/smart-reply', async c => {
  const body = await jsonBody(c);
  if (!body?.text || body.text.length > 4096) return c.json({ error: 'Text is required' }, 400);
  const result = await run(c.env, '@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'system', content: 'Return exactly three short reply suggestions as a JSON array of strings.' }, { role: 'user', content: body.text }] });
  let replies = ['Sounds good!', 'Thank you for letting me know.', 'I will get back to you soon.'];
  try {
    const parsed = JSON.parse(result?.response || '');
    if (Array.isArray(parsed)) replies = parsed.slice(0, 3).map(sanitizeText).filter(Boolean);
  } catch {}
  return c.json({ replies });
});

aiRoutes.post('/translate', async c => {
  const body = await jsonBody(c);
  if (!body?.text || !['si', 'ta', 'en'].includes(body.source_lang) || !['si', 'ta', 'en'].includes(body.target_lang)) return c.json({ error: 'text, source_lang, and target_lang are required' }, 400);
  if (body.source_lang === body.target_lang) return c.json({ translation: body.text });
  const result = await run(c.env, '@cf/meta/m2m100-1.2b', { text: body.text, source_lang: body.source_lang, target_lang: body.target_lang });
  return c.json({ translation: sanitizeText(result?.translated_text || result?.translation || body.text), fallback: !result });
});

aiRoutes.post('/moderate', async c => {
  const body = await jsonBody(c);
  if (!body?.text || body.text.length > 4096) return c.json({ error: 'Text is required' }, 400);
  const result = await run(c.env, '@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'system', content: 'Classify this text as exactly one of: clean, spam, profanity.' }, { role: 'user', content: body.text }] });
  const classification = String(result?.response || '').toLowerCase().match(/spam|profanity|clean/)?.[0] || 'clean';
  return c.json({ classification, allowed: classification === 'clean' });
});

aiRoutes.post('/search', async c => {
  const body = await jsonBody(c);
  if (!body?.chatId || !body?.query) return c.json({ error: 'chatId and query are required' }, 400);
  try { await assertParticipant(c.env.DB, body.chatId, c.get('userId')); } catch { return c.json({ error: 'Forbidden' }, 403); }
  const result = await c.env.DB.prepare('SELECT * FROM messages WHERE chat_id = ? AND text LIKE ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 50').bind(body.chatId, `%${String(body.query).slice(0, 100)}%`).all();
  return c.json({ messages: result.results || [], semantic: false });
});

aiRoutes.post('/transcribe', async c => {
  if (!c.env.AI) return c.json({ error: 'AI binding not available' }, 503);
  let audioData;
  const contentType = c.req.header('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await jsonBody(c);
    if (!body?.audioBase64) return c.json({ error: 'audioBase64 is required' }, 400);
    const binaryStr = atob(body.audioBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    audioData = bytes;
  } else {
    audioData = await c.req.arrayBuffer();
  }
  try {
    const result = await c.env.AI.run('@cf/openai/whisper', {
      audio: [...new Uint8Array(audioData)]
    });
    return c.json({ text: sanitizeText(result?.text || ''), vtt: result?.vtt || null });
  } catch (err) {
    console.error('Whisper transcription error:', err);
    return c.json({ error: 'Audio transcription failed', details: err.message }, 500);
  }
});

