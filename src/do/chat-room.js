import { verify } from '../lib/jwt.js';
import { autoTranslateMessage, moderateMessageText } from '../services/ai.js';
import { dbService } from '../services/database.js';

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.ctx = state;
    this.env = env;
    this.sessions = new Map(); // socket -> { userId, chatId, username, typingTimer }
  }

  async fetch(request) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const url = new URL(request.url);
    const userId = request.headers.get('X-User-Id') || url.searchParams.get('userId');
    const chatId = request.headers.get('X-Chat-Id') || url.searchParams.get('chatId');
    const token = url.searchParams.get('token');

    if (!userId || !chatId || !token) {
      return new Response('Missing WebSocket credentials', { status: 401 });
    }

    try {
      const claims = await verify(token, this.env.JWT_SECRET);
      if (claims.sub !== userId) throw new Error('Subject mismatch');
    } catch {
      return new Response('Invalid WebSocket token', { status: 401 });
    }

    // Verify chat participant
    if (this.env.DB) {
      const participant = await this.env.DB.prepare(
        'SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?'
      ).bind(chatId, userId).first();
      if (!participant) return new Response('Forbidden', { status: 403 });
    }

    // Fetch user details for presence and typing username
    let username = 'User';
    if (this.env.DB) {
      const user = await this.env.DB.prepare(
        'SELECT username, display_name FROM users WHERE id = ?'
      ).bind(userId).first();
      username = user?.display_name || user?.username || 'User';
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    // Hibernation API: the DO can sleep while this socket remains connected.
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ userId, chatId });

    this.sessions.set(server, { userId, chatId, username, typingTimer: null });

    // Feature 6: Presence Tracking - Mark online
    const nowIso = new Date().toISOString();
    if (this.env.DB) {
      await dbService.updateUserPresence(this.env.DB, userId, true);
    }
    this.broadcast({
      type: 'presence',
      userId,
      chatId,
      isOnline: true,
      status: 'online',
      lastSeen: nowIso
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(server, message) {
    // Rebuild transient state after a hibernation wake-up.
    if (!this.sessions.has(server)) {
      const attachment = server.deserializeAttachment() || {};
      this.sessions.set(server, {
        ...attachment,
        username: 'User',
        typingTimer: null
      });
    }
    try {
      await this.handleEvent(server, message);
    } catch (error) {
      console.error('[ChatRoom] WebSocket event error:', error);
    }
  }

  async webSocketClose(server) {
      const attachment = server.deserializeAttachment() || {};
      const userId = attachment.userId;
      const chatId = attachment.chatId;
      const session = this.sessions.get(server);
      if (session?.typingTimer) clearTimeout(session.typingTimer);
      this.sessions.delete(server);

      // Check if user still has other active sockets in this room
      const userHasOtherSockets = [...this.sessions.values()].some(s => s.userId === userId)
        || this.ctx.getWebSockets().some(ws => ws !== server && ws.deserializeAttachment()?.userId === userId);
      if (!userHasOtherSockets && this.env.DB) {
        await dbService.updateUserPresence(this.env.DB, userId, false);
      }

      const disconnectIso = new Date().toISOString();
      this.broadcast({
        type: 'presence',
        userId,
        chatId,
        isOnline: false,
        status: 'offline',
        lastSeen: disconnectIso
      });
  }

  async webSocketError(server, error) {
    console.error('[ChatRoom] WebSocket error:', error);
    try { server.close(1011, 'WebSocket error'); } catch {}
  }

  async handleEvent(socket, raw) {
    const session = this.sessions.get(socket);
    if (!session) return;

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    // Ping / Pong Heartbeat
    if (data.type === 'ping') {
      return socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    }

    // Feature 5: Typing Indicators
    if (data.type === 'typing' || data.type === 'typing_start' || data.type === 'typing_stop') {
      const isTyping = data.type === 'typing_stop' ? false : Boolean(data.isTyping ?? true);

      if (session.typingTimer) {
        clearTimeout(session.typingTimer);
        session.typingTimer = null;
      }

      this.broadcast({
        type: 'typing',
        chatId: session.chatId,
        userId: session.userId,
        username: session.username,
        isTyping
      }, socket);

      // Auto-expire typing indicator after 5 seconds if client didn't send stop
      if (isTyping) {
        session.typingTimer = setTimeout(() => {
          this.broadcast({
            type: 'typing',
            chatId: session.chatId,
            userId: session.userId,
            username: session.username,
            isTyping: false
          }, socket);
          session.typingTimer = null;
        }, 5000);
      }
      return;
    }

    // Feature 3: Message Reactions
    if (data.type === 'reaction') {
      const { messageId, emoji } = data;
      if (messageId && emoji && this.env.DB) {
        const result = await dbService.toggleMessageReaction(this.env.DB, messageId, session.userId, emoji);
        const reactionsData = await dbService.getMessageReactions(this.env.DB, messageId);
        return this.broadcast({
          type: 'reaction',
          chatId: session.chatId,
          messageId,
          userId: session.userId,
          emoji,
          action: result.action,
          summary: reactionsData.summary
        });
      }
      return;
    }

    // Feature 4: Message Editing via WebSocket
    if (data.type === 'message_edit') {
      const { messageId, text } = data;
      if (messageId && text && this.env.DB) {
        const message = await this.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first();
        if (message && message.sender_id === session.userId) {
          const age = Date.now() - Number(message.created_at);
          if (age <= 15 * 60 * 1000) {
            const nowIso = new Date().toISOString();
            await this.env.DB.prepare(
              'UPDATE messages SET text = ?, is_edited = 1, edited_at = ? WHERE id = ?'
            ).bind(text.trim(), nowIso, messageId).run();

            return this.broadcast({
              type: 'message_edited',
              chatId: session.chatId,
              messageId,
              text: text.trim(),
              isEdited: 1,
              editedAt: nowIso
            });
          }
        }
      }
      return;
    }

    // Feature 4: Message Deletion via WebSocket
    if (data.type === 'message_delete') {
      const { messageId } = data;
      if (messageId && this.env.DB) {
        const message = await this.env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(messageId).first();
        if (message) {
          const isOwner = message.sender_id === session.userId;
          const isAdmin = await dbService.isGroupAdmin(this.env.DB, session.chatId, session.userId);
          if (isOwner || isAdmin) {
            const nowIso = new Date().toISOString();
            await this.env.DB.prepare(
              'UPDATE messages SET is_deleted = 1, deleted_at = ?, text = NULL, media_url = NULL WHERE id = ?'
            ).bind(nowIso, messageId).run();

            return this.broadcast({
              type: 'message_deleted',
              chatId: session.chatId,
              messageId,
              deletedAt: nowIso
            });
          }
        }
      }
      return;
    }

    // Read receipt
    if (data.type === 'read') {
      if (this.env.DB && data.messageId) {
        await this.env.DB.prepare("UPDATE messages SET status = 'read' WHERE id = ?").bind(data.messageId).run();
      }
      return this.broadcast({
        type: 'read',
        chatId: session.chatId,
        userId: session.userId,
        messageId: data.messageId
      }, socket);
    }

    // WebRTC signaling
    if (['call-offer', 'call-answer', 'ice-candidate', 'call-end'].includes(data.type)) {
      return this.broadcast({
        type: data.type,
        userId: session.userId,
        chatId: session.chatId,
        payload: data.payload || null
      }, socket);
    }

    // New message
    if (data.type === 'message') {
      const text = typeof data.text === 'string' ? data.text.trim().slice(0, 4096) : '';
      if (!text && !data.mediaUrl) return;

      // Check block status in direct chat
      if (this.env.DB) {
        const chat = await this.env.DB.prepare('SELECT type FROM chats WHERE id = ?').bind(session.chatId).first();
        if (chat?.type === 'direct') {
          const other = await this.env.DB.prepare(
            'SELECT user_id FROM chat_participants WHERE chat_id = ? AND user_id != ?'
          ).bind(session.chatId, session.userId).first();
          if (other) {
            const isBlocked = await dbService.isUserBlocked(this.env.DB, other.user_id, session.userId);
            if (isBlocked) {
              return socket.send(JSON.stringify({ type: 'error', error: 'You are blocked by this user' }));
            }
          }
        }
      }

      // Moderation
      let moderationStatus = 'clean';
      let moderationReason = null;
      if (text) {
        const mod = await moderateMessageText(this.env, text);
        if (mod.status === 'blocked') {
          return socket.send(JSON.stringify({
            type: 'error',
            error: 'Message blocked by content moderation',
            reason: mod.reason
          }));
        }
        moderationStatus = mod.status;
        moderationReason = mod.reason || null;
      }

      // Auto-translation
      let translations = null;
      if (text) {
        const user = await this.env.DB?.prepare('SELECT auto_translate FROM users WHERE id = ?').bind(session.userId).first();
        if (user?.auto_translate !== 0) {
          translations = await autoTranslateMessage(this.env, text);
        }
      }

      const id = crypto.randomUUID();
      const now = Date.now();
      const hasOther = [...this.sessions.values()].some(s => s.chatId === session.chatId && s.userId !== session.userId);
      const status = hasOther ? 'delivered' : 'sent';

      const message = {
        id,
        chatId: session.chatId,
        senderId: session.userId,
        senderName: session.username,
        text: text || null,
        messageType: data.messageType || 'text',
        mediaUrl: data.mediaUrl || null,
        status,
        translations,
        moderationStatus,
        createdAt: now
      };

      if (this.env.DB) {
        await this.env.DB.prepare(
          `INSERT INTO messages (id, chat_id, sender_id, text, message_type, media_url, status, translations, moderation_status, moderation_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          session.chatId,
          session.userId,
          message.text,
          message.messageType,
          message.mediaUrl,
          status,
          translations ? JSON.stringify(translations) : null,
          moderationStatus,
          moderationReason,
          now
        ).run();

        await this.env.DB.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').bind(now, session.chatId).run();

        if (moderationStatus === 'flagged') {
          await this.env.DB.prepare(
            "INSERT INTO flagged_messages (id, message_id, reason, severity, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
          ).bind(crypto.randomUUID(), id, moderationReason, 'low').run();
        }
      }

      this.broadcast({ type: 'message', message });
    }
  }

  broadcast(message, exclude) {
    const encoded = JSON.stringify(message);
    const sockets = this.ctx?.getWebSockets ? this.ctx.getWebSockets() : [...this.sessions.keys()];
    for (const socket of sockets) {
      if (socket !== exclude && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(encoded);
        } catch {}
      }
    }
  }
}
