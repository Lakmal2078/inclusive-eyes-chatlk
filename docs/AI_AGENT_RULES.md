# ChatLK — AI Agent එකට අත්‍යවශ්‍ය නීති

## Termux/Android Constraints (කඩන්න බැරි නීති)
1. `wrangler dev` කිසිවිටෙක භාවිතා නොකරන්න — TCMalloc OOM (1 GiB allocate කරන්න බැහැ)
2. `wrangler dev --remote` කිසිවිටෙක භාවිතා නොකරන්න — එයත් local workerd පටන් ගනී
3. D1 commands සැමවිටම `--remote` flag එක්ක පමණක් — `--local` කිසිවිටෙක නැත
4. Deploy: `npm run dev:termux` පමණක් (මෙය `wrangler deploy` run කරයි)

## වෙනස් නොකළ යුතු දේවල් (DO NOT REVERT)
1. `new_sqlite_classes` → `new_classes` වෙත ආපසු නොකරන්න (Workers Free plan සඳහා)
2. `wrangler deploy` එකට `--remote` flag එක එකතු නොකරන්න (invalid flag)
3. `wrangler deploy` එකට `--no-bundle` flag එක එකතු නොකරන්න (Hono bundle වෙන්න ඕනේ)
4. Binding IDs වෙනස් නොකරන්න:
   - KV: eacaab54753d4c6b9b17033350ab9bf3
   - D1: bead94cf-542e-407e-a6d5-ea77d0b08342
   - R2: chat-media
   - DO: ChatRoom class
5. JWT_SECRET, VAPID_PRIVATE_KEY source code එකේ hardcoded නොකරන්න — secrets ලෙස:
   - `npx wrangler secret put JWT_SECRET`
   - `npx wrangler secret put VAPID_PRIVATE_KEY`
6. CORS_ORIGIN = '*' වෙත ආපසු නොකරන්න (restricted ලෙස තබන්න)
7. Rate limiting 20/10min, phone/username scoped — IP-only වෙත ආපසු නොකරන්න

## Security — අත්‍යවශ්‍ය
1. WebSocket route (`/ws`): JWT token verify කිරීම ඉවත් නොකරන්න
2. DO එකට `X-User-Id` header එක pass වෙන එක ඉවත් නොකරන්න
3. D1 queries සියල්ල prepared statements + `.bind()` භාවිතා කරන්න
4. DO: `server.accept()` භාවිතා නොකරන්න — `acceptWebSocket()` (Hibernation API)
5. DO: `addEventListener('message')` භාවිතා නොකරන්න — `webSocketMessage()`
6. DO: `addEventListener('close')` භාවිතා නොකරන්න — `webSocketClose()`

## Migrations
1. Migration files එක් එකකට unique number එකක් දෙන්න (duplicate numbers නොකරන්න)
2. `CREATE TABLE/INDEX` සඳහා `IF NOT EXISTS` භාවිතා කරන්න (idempotent)
3. D1 migrations: `npx wrangler d1 migrations apply chat-db --remote`

## Tests
1. `npm test` එක `--test-concurrency=1` එක්ක පමණක් (SQLite lock ගැටලු)
2. FTS5 local test errors අපේක්ෂිතයි — Node.js SQLite FTS5 support නැත, remote D1 එකේ ක්‍රියාත්මකයි

## Project Info
- Account ID: 5e881675f6e48904761848cfbf3b44b8
- Worker URL: https://chatlk.agent-1xfast-srilanka.workers.dev
- GitHub: https://github.com/Lakmal2078/inclusive-eyes-chatlk (branch: main)
- Plan: Workers Free — R2 enabled, D1 enabled, DO SQLite-backed
- Stack: Wrangler 4.x, Hono framework, nodejs_compat flag
- Languages: Sinhala, Tamil, English (si,ta,en)

## Bindings
- CHAT_ROOM → Durable Object (ChatRoom class, SQLite-backed)
- CACHE → KV Namespace (eacaab54753d4c6b9b17033350ab9bf3)
- DB → D1 Database (chat-db, bead94cf-542e-407e-a6d5-ea77d0b08342)
- MEDIA → R2 Bucket (chat-media)
- AI → Workers AI binding
- JWT_SECRET → Secret (set via wrangler secret put)
- VAPID_PRIVATE_KEY → Secret (set via wrangler secret put)
- VAPID_PUBLIC_KEY → Environment Variable (in wrangler.toml)
- VAPID_SUBJECT → Environment Variable (mailto:admin@chatlk.app)

## D1 Database (24 tables)
users, chats, chat_participants, messages, message_status, message_reactions,
messages_fts (FTS5), groups, group_members, channels, channel_subscriptions,
contacts, blocked_users, muted_chats, statuses, status_views, stickers,
sticker_packs, user_sticker_purchases, premium_subscriptions, push_subscriptions,
flagged_messages, d1_migrations

## D1 Indexes (13 custom + auto)
idx_messages_chat_created, idx_messages_sender, idx_message_reactions_msg,
idx_chat_participants_user, idx_contacts_user, idx_users_username, idx_users_phone,
idx_blocked_users_blocker, idx_flagged_messages_msg, idx_group_members_user,
idx_muted_chats_user, idx_status_views_status, idx_statuses_expiry

## D1 FTS5 Triggers (remote only)
messages_fts_ai (AFTER INSERT), messages_fts_ad (AFTER DELETE),
messages_fts_au (AFTER UPDATE)

## Secrets (set via wrangler secret put)
- JWT_SECRET ✅
- VAPID_PRIVATE_KEY ✅

