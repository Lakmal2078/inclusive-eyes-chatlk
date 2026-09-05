import { Hono } from 'hono';
import { ChatRoom } from './do/chat-room.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { chatRoutes } from './routes/chats.js';
import { messageRoutes } from './routes/messages.js';
import { mediaRoutes } from './routes/media.js';
import { aiRoutes } from './routes/ai.js';
import { statusRoutes } from './routes/statuses.js';
import groupRoutes from './routes/groups.js';
import reactionRoutes from './routes/reactions.js';
import searchRoutes from './routes/search.js';
import pushRoutes from './routes/push.js';
import adminRoutes from './routes/admin.js';
import { authMiddleware } from './middleware/auth.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { serveApp, serveFrontend, serveIcon192, serveIcon512, serveManifest, serveServiceWorker, serveStyle } from './routes/frontend.js';
import { verify as verifyJwt } from './lib/jwt.js';

const app = new Hono();

// CORS applied globally
app.use('*', corsMiddleware);

// Apply rate limiting only to sensitive endpoints (auth, media uploads)
app.use('/api/auth/*', rateLimitMiddleware);
app.use('/api/media/*', rateLimitMiddleware);

app.get('/api/health', c => c.json({ status: 'ok', app: c.env.APP_NAME || 'ChatLK', timestamp: Date.now() }));

app.route('/api/auth', authRoutes);
app.get('/api/manifest.json', serveManifest);

app.get('/ws', async c => {
  const userId = c.req.query('userId');
  const chatId = c.req.query('chatId');
  const token = c.req.query('token');
  if (!userId || !chatId || !token) return c.json({ error: 'Missing WebSocket credentials' }, 401);

  try {
    const payload = await verifyJwt(token, c.env.JWT_SECRET);
    if (!payload || payload.sub !== userId) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  const id = c.env.CHAT_ROOM.idFromName(chatId);
  return c.env.CHAT_ROOM.get(id).fetch(c.req.raw);
});

// Protected routes (JWT authentication required)
app.use('/api/*', authMiddleware);

// Mount API routes with clear paths to avoid collisions
app.route('/api/users', userRoutes);
app.route('/api/statuses', statusRoutes);
app.route('/api/chats', chatRoutes);
app.route('/api/groups', groupRoutes);
app.route('/api/messages', messageRoutes);
app.route('/api/reactions', reactionRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/push', pushRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/media', mediaRoutes);
app.route('/api/ai', aiRoutes);

// Frontend assets & fallback
app.get('/style.css', serveStyle);
app.get('/app.js', serveApp);
app.get('/manifest.json', serveManifest);
app.get('/sw.js', serveServiceWorker);
app.get('/icon-192.svg', serveIcon192);
app.get('/icon-512.svg', serveIcon512);
app.get('*', serveFrontend);

export { ChatRoom };
export default app;
