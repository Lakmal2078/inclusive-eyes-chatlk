# ChatLK

ChatLK is a mobile-first, installable real-time messaging application built for Sri Lanka. It uses Hono for HTTP routing, SQLite (local) or Cloudflare D1 (production) for durable data, KV for rate limiting, R2 or in-memory storage for media, Workers AI for optional assistance, and a WebSocket server per chat room for real-time delivery.

## Features

- Username/phone registration and HS256 JWT authentication with seven-day expiry.
- Direct and group chats (up to 50 members) with participant administration.
- Cursor-paginated message history, FTS5 full-text search, edit, delete, and read receipts.
- WebSocket connections for messages, presence, typing, ping, and read events.
- R2 uploads (production) or in-memory storage (local) with MIME and free/premium size validation.
- Sinhala, Tamil, and English language fields plus responsive PWA shell.
- Smart reply, translation, content moderation, and message search via Workers AI.
- Push notifications via Web Push API (VAPID).
- Admin dashboard, user blocking/muting, message pinning, and status updates.
- WhatsApp-style mobile shell with Chats, Status, and Calls navigation, green message bubbles, unread badges, presence dots, delivery ticks, and touch-friendly composer controls.
- Status updates support text, photo, and video creation through `/api/statuses` and `/api/media`, while Calls provides audio/video entry points over the existing WebRTC call overlay.
- Profile and chat settings include avatar, about, language, notification mute, auto-translation, and logout controls without changing the existing D1 data model.
- PBKDF2-SHA256 password hashing with 100,000 iterations and random 16-byte salts.
- Security headers: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` on every response.

## Local development

```bash
npm install
cp .env.example .env
# Edit .env and set JWT_SECRET to a strong random value:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm test
npm run dev
```

Open `http://localhost:3000` in your browser. The local runtime uses SQLite for the database and in-memory storage for uploaded files. Workers AI and push notifications fall back safely when their bindings are unavailable.

> **Note:** The server will refuse to start if `JWT_SECRET` is empty or missing.

### Termux and Ubuntu proot-distro

The local Node.js server works in Termux without issues:

```bash
# In native Termux, or after: proot-distro login ubuntu
git clone https://github.com/Lakmal2078/inclusive-eyes-chatlk.git
cd inclusive-eyes-chatlk
npm install
cp .env.example .env
# Set JWT_SECRET in .env, then:
npm run dev
```

To deploy directly to Cloudflare from Termux (requires a Cloudflare account and real resource IDs in `wrangler.toml`):

```bash
npm run dev:termux
```

## Cloudflare resources and deployment

Create resources, copy the returned IDs into `wrangler.toml`, and set the production secret:

```bash
npx wrangler d1 create chat-db
npx wrangler kv namespace create CACHE
npx wrangler r2 bucket create chat-media
npx wrangler secret put JWT_SECRET
npx wrangler d1 migrations apply chat-db --remote
npx wrangler deploy
```

For staging, configure the staging resource bindings in `wrangler.toml` and run:

```bash
npx wrangler d1 migrations apply chat-db --env staging --remote
npx wrangler deploy --env staging
```

## API overview

Public endpoints: `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`, and `POST /api/auth/refresh`. All other `/api/*` routes require `Authorization: Bearer <token>`.

The protected API includes:

| Prefix | Description |
|---|---|
| `/api/users` | Profile, search, presence, settings, avatar |
| `/api/chats` | Direct and group chat management |
| `/api/groups` | Group-specific administration |
| `/api/messages` | Send, edit, delete, read receipts, pinning |
| `/api/messages/:id/reactions` | Emoji reactions |
| `/api/search/messages` | FTS5 full-text search with date range filter |
| `/api/statuses` | 24-hour status updates |
| `/api/media` | File upload and retrieval |
| `/api/push` | Web Push subscription management |
| `/api/admin` | Admin dashboard (admin role required) |
| `/api/ai` | Smart reply, translation, and moderation |

The WebSocket endpoint is `/ws?userId=<id>&chatId=<id>&token=<jwt>`. WebSocket messages are subject to the same AI content moderation as HTTP messages.

## Tests and project layout

```bash
npm test          # Run all tests (Node.js built-in test runner)
npm run sync-assets  # Rebuild the bundled frontend
```

The reusable React surfaces live in `src/components/ChatRoom.tsx`, `src/components/ChatSettings.tsx`, `src/components/Status.tsx`, and `src/components/Calls.tsx`. The production browser shell is rendered by `src/static/js/app.js`; `scripts/sync-assets.mjs` keeps its bundled JavaScript and CSS plus the compiled React entry points in sync.

The migration files in `migrations/` are numbered `0001`–`0019` and applied in order on every server start (idempotent). See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for operational details.

## Security notes

- All SQL values are bound through prepared statements.
- User-rendered message text is assigned through `textContent` in the browser.
- CORS is configurable through the `CORS_ORIGIN` environment variable.
- KV applies ten-minute request buckets for rate limiting.
- WebSocket upgrades validate the JWT subject and chat membership before accepting a connection.
- Content moderation runs on both HTTP and WebSocket messages.
- Media uploads validate MIME type and plan-specific size limits.
- Production deployments must replace placeholder resource IDs in `wrangler.toml` and store the JWT secret with `npx wrangler secret put JWT_SECRET`.
