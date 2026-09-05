import { verify } from '../lib/jwt.js';

export class ChatRoom {
  constructor(state, env) { this.state = state; this.env = env; this.sessions = new Map(); }
  async fetch(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const url = new URL(request.url), userId = url.searchParams.get('userId'), chatId = url.searchParams.get('chatId'), token = url.searchParams.get('token');
    if (!userId || !chatId || !token) return new Response('Missing WebSocket credentials', { status: 401 });
    try { const claims = await verify(token, this.env.JWT_SECRET); if (claims.sub !== userId) throw new Error('Subject mismatch'); } catch { return new Response('Invalid WebSocket token', { status: 401 }); }
    if (this.env.DB && !(await this.env.DB.prepare('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?').bind(chatId, userId).first())) return new Response('Forbidden', { status: 403 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    server.accept(); this.sessions.set(server, { userId, chatId });
    this.broadcast({ type: 'presence', userId, chatId, status: 'online' }, server);
    server.addEventListener('message', event => this.handleEvent(server, event.data).catch(error => console.error('WebSocket message error', error)));
    server.addEventListener('close', () => { this.sessions.delete(server); this.broadcast({ type: 'presence', userId, chatId, status: 'offline' }, server); });
    return new Response(null, { status: 101, webSocket: client });
  }
  async handleEvent(socket, raw) {
    const session = this.sessions.get(socket); if (!session) return;
    const data = JSON.parse(raw);
    if (data.type === 'ping') return socket.send(JSON.stringify({ type: 'pong' }));
    if (data.type === 'typing') return this.broadcast({ type: 'typing', userId: session.userId, chatId: session.chatId, isTyping: Boolean(data.isTyping) }, socket);
    if (data.type === 'read') { if (this.env.DB && data.messageId) await this.env.DB.prepare("UPDATE messages SET status = 'read' WHERE id = ?").bind(data.messageId).run(); return this.broadcast({ type: 'read', chatId: session.chatId, userId: session.userId, messageId: data.messageId }, socket); }
    if (data.type !== 'message') return;
    const text = typeof data.text === 'string' ? data.text.trim().slice(0, 4096) : '';
    if (!text && !data.mediaUrl) return;
    const id = crypto.randomUUID(), now = Date.now();
    const message = { id, chatId: session.chatId, senderId: session.userId, text: text || null, messageType: data.messageType || 'text', mediaUrl: data.mediaUrl || null, status: 'sent', createdAt: now };
    if (this.env.DB) { await this.env.DB.prepare('INSERT INTO messages (id, chat_id, sender_id, text, message_type, media_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, session.chatId, session.userId, message.text, message.messageType, message.mediaUrl, now).run(); await this.env.DB.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').bind(now, session.chatId).run(); }
    // Deliver to the sender as well as other participants so the UI stays
    // consistent for real-time sends (the REST fallback remains unchanged).
    this.broadcast({ type: 'message', message });
  }
  broadcast(message, exclude) { const encoded = JSON.stringify(message); for (const [socket] of this.sessions) if (socket !== exclude && socket.readyState === WebSocket.OPEN) socket.send(encoded); }
}
