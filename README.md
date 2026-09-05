# ChatLK

ChatLK is a mobile-first, installable real-time messaging application built for Cloudflare Workers. It follows the supplied technical specification with Hono routes, D1 persistence, KV rate limiting, R2 media storage, Workers AI features, and one Durable Object per chat room.

## Local development

Create local secrets before starting:

```bash
npm install
printf 'JWT_SECRET=replace-me\n' > .dev.vars
npm test
npm run dev:local
```

Use `npm run dev:local` on constrained environments. It avoids Wrangler's remote inspector/container path, which can fail with `FATAL ERROR: Out of memory` and `write EPIPE`. Workers AI uses the application's safe fallback responses when no local AI binding is available.

The browser shell is served by `src/routes/frontend.js`; the client provides login/register, chat list, conversation view, message composer, PWA manifest, responsive layout, and WebSocket updates. User-entered text is escaped before rendering.

## Cloudflare resources

Replace `YOUR_D1_DATABASE_ID` and `YOUR_KV_NAMESPACE_ID` in `wrangler.toml`, create the D1 database, KV namespace, and R2 bucket, then set the secret:

```bash
npx wrangler d1 create chat-db
npx wrangler kv namespace create CACHE
npx wrangler r2 bucket create chat-media
npx wrangler secret put JWT_SECRET
npm run db:migrate
npm run deploy
```

## Security notes

Passwords use PBKDF2 with 100,000 SHA-256 iterations and a random 16-byte salt. JWTs expire after seven days and use `JWT_SECRET`. D1 operations use prepared statements. API responses include configurable CORS and KV-backed rate limiting. Production deployment must use a real secret and real Cloudflare resource IDs; placeholder IDs are intentionally retained in source control.
