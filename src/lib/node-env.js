import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { verify } from './jwt.js';

function createD1Database(dbPath = './data/chatlk.db') {
  let db;
  try {
    const dir = dbPath.substring(0, dbPath.lastIndexOf('/'));
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    db = new DatabaseSync(dbPath);
  } catch (err) {
    console.warn('[ChatLK] Falling back to in-memory SQLite database:', err.message);
    db = new DatabaseSync(':memory:');
  }

  // Enable foreign keys
  try {
    db.exec('PRAGMA foreign_keys = ON;');
  } catch (err) {
    console.warn('[ChatLK] Failed to enable foreign keys:', err.message);
  }

  // Run migrations
  // Use db.exec() on the whole file so that multi-statement blocks such as
  // CREATE TRIGGER ... BEGIN ... END are not broken by a naive split(';').
  try {
    const migrationsDir = './migrations';
    if (existsSync(migrationsDir)) {
      const files = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
      for (const file of files) {
        const sql = readFileSync(join(migrationsDir, file), 'utf8');
        try {
          db.exec(sql);
        } catch (err) {
          // Ignore expected idempotency messages; log everything else.
          const msg = err.message || '';
          if (
            !msg.includes('duplicate column') &&
            !msg.includes('already exists') &&
            !msg.includes('no such table: sqlite_master')
          ) {
            console.warn(`[ChatLK] Migration note in ${file}:`, msg);
          }
        }
      }
    }
  } catch (err) {
    console.error('[ChatLK] Error running migrations:', err);
  }

  // Prepare statement wrapper matching Cloudflare D1 API
  const stmtCache = new Map();
  function getPreparedStmt(sql) {
    let stmt = stmtCache.get(sql);
    if (!stmt) {
      stmt = db.prepare(sql);
      stmtCache.set(sql, stmt);
    }
    return stmt;
  }

  return {
    prepare(sql) {
      const stmt = getPreparedStmt(sql);
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          const bound = Object.create(this);
          bound._params = params.map(p => (p === undefined ? null : p));
          return bound;
        },
        async first(col) {
          const row = stmt.get(...this._params);
          if (!row) return null;
          const obj = { ...row };
          return col ? obj[col] : obj;
        },
        async all() {
          const rows = stmt.all(...this._params);
          return { results: rows.map(r => ({ ...r })) };
        },
        async run() {
          const info = stmt.run(...this._params);
          return {
            success: true,
            meta: {
              changes: Number(info.changes || 0),
              last_row_id: info.lastInsertRowid
            }
          };
        }
      };
    },
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) {
          results.push(await s.run());
        }
        db.exec('COMMIT');
        return results;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    }
  };
}

function createKvCache() {
  const store = new Map();
  return {
    async get(key) {
      const item = store.get(key);
      if (!item) return null;
      if (item.expires && item.expires < Date.now()) {
        store.delete(key);
        return null;
      }
      return item.value;
    },
    async put(key, value, options = {}) {
      const expires = options.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null;
      store.set(key, { value: String(value), expires });
    },
    async delete(key) {
      store.delete(key);
    }
  };
}

async function streamToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }
  if (typeof body[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    for await (const chunk of body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  return Buffer.from(body);
}

function createMediaStorage() {
  const files = new Map();
  return {
    async put(key, body, options = {}) {
      const buffer = await streamToBuffer(body);
      files.set(key, {
        buffer,
        httpMetadata: options.httpMetadata || { contentType: 'application/octet-stream' },
        customMetadata: options.customMetadata || {},
        httpEtag: `"${Date.now()}-${buffer.length}"`
      });
      return { key };
    },
    async get(key) {
      const item = files.get(key);
      if (!item) return null;
      return {
        body: item.buffer,
        httpMetadata: item.httpMetadata,
        customMetadata: item.customMetadata,
        httpEtag: item.httpEtag
      };
    },
    async delete(key) {
      files.delete(key);
    }
  };
}

export function createNodeEnv() {
  const db = createD1Database(process.env.DB_PATH || './data/chatlk.db');
  const cache = createKvCache();
  const media = createMediaStorage();

  const env = {
    APP_NAME: process.env.APP_NAME || 'ChatLK',
    SUPPORTED_LANGUAGES: process.env.SUPPORTED_LANGUAGES || 'si,ta,en',
    MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB || '100',
    PREMIUM_MAX_FILE_SIZE_MB: process.env.PREMIUM_MAX_FILE_SIZE_MB || '500',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    JWT_SECRET: (() => {
      const secret = process.env.JWT_SECRET;
      if (!secret || secret.trim() === '') {
        console.error('[ChatLK] FATAL: JWT_SECRET environment variable is not set. Set it in your .env file before starting the server.');
        process.exit(1);
      }
      return secret;
    })(),
    DB: db,
    CACHE: cache,
    MEDIA: media,
    AI: {
      async run(model, input) {
        if (model?.includes('llama') || model?.includes('instruct')) {
          if (input?.messages?.[0]?.content?.includes('JSON array of strings')) {
            return { response: JSON.stringify(['Sounds good!', 'Understood, thanks!', 'I will check on this.']) };
          }
          return { response: 'clean' };
        }
        if (model?.includes('m2m100') || model?.includes('translate')) {
          return { translated_text: input?.text || '' };
        }
        return null;
      }
    },
    CHAT_ROOM: {
      idFromName(name) { return name; },
      get(id) {
        return {
          async fetch() {
            return new Response('WebSocket endpoint handled by server', { status: 426 });
          }
        };
      }
    }
  };

  return env;
}

export function setupWebSocketServer(server, env) {
  const wss = new WebSocketServer({ noServer: true });
  // Map of chatId -> Set of { socket, userId, chatId }
  const rooms = new Map();

  function broadcastToRoom(chatId, message, excludeSocket) {
    const clients = rooms.get(chatId);
    if (!clients) return;
    const encoded = JSON.stringify(message);
    for (const session of clients) {
      if (session.socket !== excludeSocket && session.socket.readyState === WebSocket.OPEN) {
        session.socket.send(encoded);
      }
    }
  }

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, ws => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', async (socket, request) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const userId = url.searchParams.get('userId');
      const chatId = url.searchParams.get('chatId');
      const token = url.searchParams.get('token');

      if (!userId || !chatId || !token) {
        socket.close(4401, 'Missing WebSocket credentials');
        return;
      }

      try {
        const claims = await verify(token, env.JWT_SECRET);
        if (claims.sub !== userId) {
          socket.close(4401, 'Subject mismatch');
          return;
        }
      } catch {
        socket.close(4401, 'Invalid WebSocket token');
        return;
      }

      if (env.DB) {
        const isParticipant = await env.DB.prepare(
          'SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?'
        ).bind(chatId, userId).first();

        if (!isParticipant) {
          socket.close(4403, 'Forbidden');
          return;
        }
      }

      const session = { socket, userId, chatId };
      if (!rooms.has(chatId)) {
        rooms.set(chatId, new Set());
      }
      const room = rooms.get(chatId);
      room.add(session);

      // Broadcast online presence to other participants
      broadcastToRoom(chatId, { type: 'presence', userId, chatId, status: 'online' }, socket);

      socket.on('message', async raw => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.type === 'ping') {
            return socket.send(JSON.stringify({ type: 'pong' }));
          }
          if (data.type === 'typing') {
            return broadcastToRoom(chatId, { type: 'typing', userId, chatId, isTyping: Boolean(data.isTyping) }, socket);
          }
          if (data.type === 'read') {
            if (env.DB && data.messageId) {
              await env.DB.prepare("UPDATE messages SET status = 'read' WHERE id = ?").bind(data.messageId).run();
            }
            return broadcastToRoom(chatId, { type: 'read', chatId, userId, messageId: data.messageId }, socket);
          }
          if (['call-offer', 'call-answer', 'ice-candidate', 'call-end'].includes(data.type)) {
            return broadcastToRoom(chatId, { type: data.type, userId, chatId, payload: data.payload || null }, socket);
          }
          if (data.type === 'message') {
            const text = typeof data.text === 'string' ? data.text.trim().slice(0, 4096) : '';
            if (!text && !data.mediaUrl) return;

            // Content moderation — mirror the HTTP route behaviour
            if (text && env.AI) {
              try {
                const result = await env.AI.run('@cf/mistral/mistral-7b-instruct-v0.1', {
                  messages: [
                    { role: 'system', content: 'You are a content moderator. Reply with exactly one word: "clean" if the message is acceptable, or "blocked" if it contains hate speech, spam, or harmful content.' },
                    { role: 'user', content: text.slice(0, 500) }
                  ]
                });
                const verdict = (result?.response || '').toLowerCase().trim();
                if (verdict === 'blocked') {
                  return socket.send(JSON.stringify({ type: 'error', code: 'moderation', message: 'Message blocked by content moderation.' }));
                }
              } catch {
                // Moderation failure must not drop the message — log and continue
                console.warn('[ChatLK] WebSocket moderation check skipped');
              }
            }

            const id = crypto.randomUUID();
            const now = Date.now();
            const hasOtherParticipant = [...room].some(s => s.userId !== userId);
            const status = hasOtherParticipant ? 'delivered' : 'sent';
            const message = {
              id,
              chatId,
              senderId: userId,
              text: text || null,
              messageType: data.messageType || 'text',
              mediaUrl: data.mediaUrl || null,
              status,
              createdAt: now
            };

            if (env.DB) {
              await env.DB.prepare(
                'INSERT INTO messages (id, chat_id, sender_id, text, message_type, media_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
              ).bind(id, chatId, userId, message.text, message.messageType, message.mediaUrl, status, now).run();
              await env.DB.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').bind(now, chatId).run();
            }

            // Deliver to everyone in room including sender
            broadcastToRoom(chatId, { type: 'message', message }, null);
          }
        } catch (err) {
          console.error('[ChatLK] WebSocket message processing error:', err);
        }
      });

      socket.on('close', () => {
        room.delete(session);
        if (room.size === 0) {
          rooms.delete(chatId);
        }
        broadcastToRoom(chatId, { type: 'presence', userId, chatId, status: 'offline' }, socket);
      });

      socket.on('error', () => {
        room.delete(session);
      });
    } catch (err) {
      console.error('[ChatLK] WebSocket connection error:', err);
      try { socket.close(); } catch {}
    }
  });

  return wss;
}
