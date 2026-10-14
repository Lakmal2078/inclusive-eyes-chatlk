<p align="center">
  <img src="public/icon-192.svg" alt="ChatLK Logo" width="96" height="96">
</p>

<h1 align="center">ChatLK</h1>

<p align="center">
  <b>A private, mobile-first, real-time messaging platform designed for Sinhala, Tamil, and English communities.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Cloudflare%20Workers%20%7C%20Node.js-orange" alt="Runtime">
  <img src="https://img.shields.io/badge/Framework-Hono%20v4-blue" alt="Hono">
  <img src="https://img.shields.io/badge/Database-Cloudflare%20D1%20%28SQLite%29-green" alt="D1">
  <img src="https://img.shields.io/badge/Realtime-Durable%20Objects-purple" alt="Durable Objects">
  <img src="https://img.shields.io/badge/PWA-Ready-success" alt="PWA Ready">
</p>

---

ChatLK combines edge computing with modern messaging patterns to provide high-performance, low-latency communication. It runs seamlessly on **Cloudflare Workers** (with D1, Durable Objects, KV, R2, and Workers AI) for production, or as a self-hosted **Node.js** service with SQLite for local development and Android/Termux environments.

## Highlights & Capabilities

- **Trilingual First**: Native support for Sinhala (`si`), Tamil (`ta`), and English (`en`), featuring AI-assisted on-demand translation powered by Cloudflare Workers AI (`@cf/meta/m2m100-1.2b`).
- **Real-Time Edge Messaging**: Built on Cloudflare Durable Objects using the WebSocket Hibernation API for zero-cost idle connections and instant broadcasts.
- **Message Reliability & Idempotency**: Automatic duplicate prevention via client message IDs (`clientId`), ensuring reliable delivery across spotty mobile networks.
- **Circle-First Group Invites**: Solo group creation with shareable invite codes (`/api/invites/:code`) and seamless contextual onboarding for new members.
- **Voice & Video Calling**: Peer-to-peer WebRTC calls with signaling over Durable Object WebSockets and incoming call push alerts.
- **24-Hour Status Updates**: WhatsApp-style status stories supporting text, photo, and video uploads.
- **Rich Media & Storage**: Direct media delivery backed by Cloudflare R2 in production and local filesystem storage during development.
- **Smart Moderation & Replies**: AI-powered content moderation, automatic toxicity detection, and smart reply suggestions.
- **Full-Text Search**: SQLite FTS5 full-text indexing for rapid message search with date range filters.
- **Security & Privacy**:
  - PBKDF2-SHA256 password hashing with 100,000 iterations and 16-byte cryptographically secure random salts.
  - HS256 JWT tokens with KV-backed token revocation / logout blacklist.
  - Comprehensive security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).
  - Strict prepared statements and input sanitization across all database interactions.
- **PWA & Native Android**:
  - Installable Progressive Web App with offline caching, background Service Worker, and Web Push (VAPID).
  - Modern native Android app built with Kotlin & Jetpack Compose in `android/`.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │          Browser PWA / Android          │
                      └────────────────────┬────────────────────┘
                                           │ HTTPS / WSS
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │      Cloudflare Worker / Hono App       │
                      └────┬───────────────┬────────────────┬───┘
                           │               │                │
             ┌─────────────┴────┐    ┌─────┴─────┐    ┌─────┴──────────────┐
             │ Durable Objects  │    │  D1 (SQL) │    │ KV (Rate Limiting  │
             │   (ChatRoom)     │    │ Database  │    │  & Token Blacklist)│
             └─────────────┬────┘    └───────────┘    └────────────────────┘
                           │
             ┌─────────────┴────┐    ┌───────────┐    ┌────────────────────┐
             │    Workers AI    │    │ R2 Media  │    │      Web Push      │
             │ (Translate & Mod)│    │  Bucket   │    │      (VAPID)       │
             └──────────────────┘    └───────────┘    └────────────────────┘
```

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- npm or bun

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lakmal2078/inclusive-eyes-chatlk.git
   cd inclusive-eyes-chatlk
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Generate a secure 64-character secret and set `JWT_SECRET` in `.env`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Build assets & run tests:**
   ```bash
   npm run build
   npm test
   ```

5. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!NOTE]
> The local development server automatically simulates Cloudflare D1 using local SQLite, emulates R2 media storage on disk, and provides in-process WebSocket handling.

---

## Termux & Android Deployment

ChatLK is fully optimized for development directly on mobile devices using Termux or PRoot Ubuntu:

```bash
# In Termux (or proot-distro login ubuntu):
git clone https://github.com/Lakmal2078/inclusive-eyes-chatlk.git
cd inclusive-eyes-chatlk
npm install
cp .env.example .env
# Set JWT_SECRET in .env
npm run dev
```

To build assets and deploy directly to Cloudflare from Termux:
```bash
npm run dev:termux
```

---

## Cloudflare Production Deployment

For full production deployment steps, refer to [`DEPLOYMENT.md`](DEPLOYMENT.md).

### 1. Provision Cloudflare Resources

```bash
npx wrangler d1 create chat-db
npx wrangler kv namespace create CACHE
npx wrangler r2 bucket create chat-media
```
Copy the generated resource IDs into your `wrangler.toml`.

### 2. Configure Secrets

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put VAPID_PRIVATE_KEY
```

### 3. Apply Database Migrations

Apply all 22 idempotent migrations (`0001` through `0022`) to remote D1:
```bash
npm run db:migrate
```

### 4. Deploy

```bash
npm run deploy
```

---

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & application status |
| `POST` | `/api/auth/register` | Register new user account (supports `invite_code`) |
| `POST` | `/api/auth/login` | Login with username/phone and password |
| `POST` | `/api/auth/forgot-password` | Password recovery with phone verification |
| `GET` | `/api/invites/:code` | Preview group invite details |
| `GET` | `/api/push/vapid-key` | Retrieve public VAPID key |

### Authenticated Endpoints (`Authorization: Bearer <token>`)

| Prefix / Route | Method | Description |
|---|---|---|
| `/api/users/me` | `GET`, `PATCH` | Current user profile & status |
| `/api/users/me/settings` | `GET`, `PATCH` | Auto-translate & notification preferences |
| `/api/chats` | `GET`, `POST` | List and initiate conversations |
| `/api/chats/:id/messages` | `GET`, `POST` | Fetch history & post messages (idempotent) |
| `/api/groups` | `GET`, `POST` | List and create groups |
| `/api/groups/:id/invites` | `POST` | Generate shareable invite link |
| `/api/invites/:code/join` | `POST` | Join a group using an invite code |
| `/api/messages/:id` | `PATCH`, `DELETE` | Edit or delete message |
| `/api/messages/:id/pin` | `POST`, `DELETE` | Pin or unpin message |
| `/api/messages/:id/reactions` | `GET`, `POST` | Emoji reactions summary and toggle |
| `/api/search/messages` | `GET` | FTS5 full-text message search |
| `/api/statuses` | `GET`, `POST` | 24-hour status stories |
| `/api/media/upload` | `POST` | Upload photo, video, audio, or document |
| `/api/ai/translate` | `POST` | On-demand message translation |
| `/api/push/subscribe` | `POST`, `DELETE` | Manage Web Push subscriptions |
| `/api/admin/*` | `GET`, `POST` | Administrative metrics and moderation queue |

### WebSocket Endpoint

```
/ws?userId=<USER_ID>&chatId=<CHAT_ID>&token=<JWT_TOKEN>
```
Real-time events: `message`, `presence`, `typing`, `call-offer`, `call-answer`, `ice-candidate`, `call-end`, `read`.

---

## Repository Structure

```
inclusive-eyes-chatlk/
├── .github/workflows/    # CI and Android build pipelines
├── android/              # Native Android application (Jetpack Compose)
├── migrations/           # 22 D1 database migration SQL files
├── public/               # PWA static assets (icons, manifest, sw.js)
├── scripts/              # Asset synchronization and Termux setup scripts
├── src/
│   ├── components/       # Modular React surfaces (ChatRoom, Settings, etc.)
│   ├── do/               # Durable Objects implementation (ChatRoom)
│   ├── lib/              # Crypto, JWT, D1/SQLite, and R2 abstractions
│   ├── middleware/       # Auth, CORS, rate limiting, and AI moderation
│   ├── routes/           # Hono API routes (auth, chats, messages, etc.)
│   ├── services/         # AI, database, push, and storage services
│   ├── static/           # Bundled web assets (CSS, app.js, PWA assets)
│   └── index.js          # Main Hono entrypoint
├── tests/                # Test suite (Node.js test runner)
├── server.js             # Local Node.js server entrypoint
├── wrangler.toml         # Cloudflare Workers configuration
├── DEPLOYMENT.md         # Production deployment guide
└── TESTING.md            # Testing instructions and test suites
```

---

## Testing & Quality Assurance

Run the test suite using Node.js built-in test runner:

```bash
npm test
```

The test suite validates:
- Password hashing & JWT signing/revocation
- All 15 core product features
- Message idempotency and deduplication
- Circle-first group invite flows and preview
- WebRTC call signaling and push dispatch
- CORS policy and media access authorization
- Rate limiting and security controls
