# ChatLK

ChatLK is a mobile-first, installable real-time messaging application built on Cloudflare Workers. It uses Hono for HTTP routing, D1 for durable data, KV for rate limiting, R2 for media, Workers AI for optional assistance, and one Durable Object per chat room for WebSocket delivery.

## Features

- Username/phone registration and HS256 JWT authentication with seven-day expiry.
- Direct and group chats with participant administration.
- Cursor-paginated message history, search, edit, delete, and read receipts.
- Authenticated Durable Object WebSockets for messages, presence, typing, ping, and read events.
- R2 uploads with MIME and free/premium size validation.
- Sinhala, Tamil, and English language fields plus responsive PWA shell.
- Optional smart reply, translation, moderation, and message-search endpoints through Workers AI.
- PBKDF2-SHA256 password hashing with 100,000 iterations and random 16-byte salts.

## Local development

```bash
npm install
printf 'JWT_SECRET=replace-with-a-long-local-secret\n' > .dev.vars
npm test
npm run dev:local
```

Open the URL printed by Wrangler. The local runtime uses local D1/KV/R2 state. Workers AI falls back safely when the local AI binding is unavailable.

### Termux and Ubuntu proot-distro

Android's local `workerd` runtime and Wrangler's preview proxy can fail with `FATAL ERROR: Out of memory` and `write EPIPE`. The Android-safe command deploys the no-bundle Worker directly to Cloudflare instead of starting a local preview process:

```bash
# In native Termux, or after: proot-distro login ubuntu
git clone https://github.com/Lakmal2078/inclusive-eyes-chatlk.git
cd inclusive-eyes-chatlk
npm run setup:termux
npm run dev:termux
```

The setup command detects native Termux versus Ubuntu and uses `pkg` or `apt` accordingly. `dev:termux` requires a Cloudflare login and real remote resource IDs, and prints the deployed Worker URL.

## Cloudflare resources and deployment

Create resources, copy the returned IDs into `wrangler.toml`, and set the production secret:

```bash
npm run db:create
npm run kv:create
npm run r2:create
npm run secret:set
npm run db:migrate
npm run deploy
```

For staging, configure the staging resource bindings and run:

```bash
npm run db:migrate:staging
npm run deploy:staging
```

## API overview

Public endpoints are `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`, and `POST /api/auth/refresh` when a current authenticated context is available. All other `/api/*` routes require `Authorization: Bearer <token>`.

The protected API includes `/api/users`, `/api/chats`, `/api/chats/:id/messages`, `/api/messages/:id`, `/api/media/upload`, `/api/media/:key`, and `/api/ai/{smart-reply,translate,moderate,search}`. The WebSocket endpoint is `/ws?userId=<id>&chatId=<id>&token=<jwt>`.

## Tests and project layout

```bash
npm test
npm run sync-assets
```

The ordered build is represented by `wrangler.toml`, the two migrations, helpers and middleware, routes, Durable Object, frontend shell, static assets, worker entrypoint, and this documentation. See [`docs/INSTALLATION.md`](docs/INSTALLATION.md) for operational details and [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) for configuration guidance.

## Security notes

All SQL values are bound through prepared statements. User-rendered message text is assigned through `textContent` in the browser. CORS is configurable through `CORS_ORIGIN`, KV applies ten-minute request buckets, WebSocket upgrades validate the JWT subject and chat membership, and media uploads validate MIME type and plan-specific size limits. Production deployments must replace placeholder resource IDs and use a strong secret stored with `wrangler secret put JWT_SECRET`.
