# ChatLK Worker — Full Audit & Fix Task

## Project Overview
ChatLK is a Cloudflare Workers-based chat application (Sinhala/Tamil/English)
deployed from a Termux (Android) environment. The project is at:
~/inclusive-eyes-chatlk (git branch: main)
GitHub repo: https://github.com/Lakmal2078/inclusive-eyes-chatlk

## Tech Stack
- Runtime: Cloudflare Workers (Wrangler 4.x)
- Framework: Hono
- Storage: D1 (SQLite), KV (CACHE namespace), R2 (chat-media bucket)
- Realtime: Durable Objects (ChatRoom class, SQLite-backed)
- AI: Workers AI binding
- Auth: JWT (custom), password hashing
- Frontend: Single HTML page (views/index.html) served as additional module

## Known Issues Already Fixed (DO NOT re-introduce these)
1. KV namespace ID was a placeholder ("YOUR_KV_NAMESPACE_ID") → replaced
   with real ID: eacaab54753d4c6b9b17033350ab9bf3
2. R2 was not enabled on the account → enabled via dashboard, bucket
   "chat-media" created
3. Durable Objects migration used `new_classes` → changed to
   `new_sqlite_classes` (required for Workers Free plan)
4. `scripts/termux-dev.sh` used `wrangler deploy --no-bundle` which
   prevented hono from being bundled → removed `--no-bundle` flag
5. D1 migrations failed locally (TCMalloc OOM on Termux) → must use
   `--remote` flag: `npx wrangler d1 migrations apply chat-db --remote`
6. Rate limit middleware was too aggressive (5 attempts/10min for register,
   IP-only scoping caused CGNAT lockouts) → increased to 20, scoped by
   phone/username
7. JWT_SECRET was not set for production → set via `wrangler secret put`

## Current Working State
- Worker URL: https://chatlk.agent-1xfast-srilanka.workers.dev
- D1 migrations applied (0001_init.sql, 0002_premium_features.sql) ✅
- All bindings functional: CHAT_ROOM (DO), CACHE (KV), DB (D1),
  MEDIA (R2), AI
- Account ID: 5e881675f6e48904761848cfbf3b44b8

## Termux/Android Constraints (CRITICAL)
- `wrangler dev` (local workerd) FAILS — TCMalloc cannot allocate 1 GiB
  virtual memory. NEVER use `wrangler dev` or `wrangler dev --remote`
  or any command that starts local workerd.
- ALL wrangler commands that need a local workerd process must use
  `--remote` flag or be deploy-only.
- Use `npm run dev:termux` for deployment (runs `wrangler deploy`).
- D1 migrations: `npx wrangler d1 migrations apply chat-db --remote`
- D1 queries for testing: `npx wrangler d1 execute chat-db --remote
  --command "SELECT ..."`

## Audit Checklist — Perform Each Item

### 1. wrangler.toml Validation
- Verify all binding IDs are real (not placeholders)
- Verify `new_sqlite_classes` (not `new_classes`) for Durable Objects
- Verify `[env.staging]` does not break top-level deploy
- Check compatibility_date is recent
- Verify `nodejs_compat` flag is present

### 2. Security Audit
- Check JWT implementation: token signing, verification, expiry handling
- Check password hashing: uses crypto.subtle with salt? timing-safe compare?
- Check CORS: `CORS_ORIGIN = "*"` in production — should this be restricted?
- Check auth middleware: properly rejects expired/invalid tokens?
- Check rate limiting: are auth endpoints properly rate-limited?
- Check for SQL injection: are all D1 queries parameterized?
- Check for XSS in frontend HTML (views/index.html)
- Check file upload validation: MIME type, size limit enforcement
- Check WebSocket auth: is the Durable Object WebSocket authenticated?
- Check .dev.vars is in .gitignore (contains JWT_SECRET)
- Check secrets are not hardcoded in source

### 3. D1 Database Audit
- Run: `npx wrangler d1 execute chat-db --remote --command "PRAGMA table_list;"`
- Verify all expected tables exist (users, messages, chats, etc.)
- Run: `npx wrangler d1 execute chat-db --remote --command "SELECT sql FROM sqlite_master WHERE type='table';"`
- Check for missing indexes on frequently-queried columns
- Check for foreign key constraints
- Verify migrations are idempotent (safe to re-run)

### 4. Durable Objects Audit
- Check ChatRoom class: WebSocket handling, connection cleanup, message
  broadcasting, error handling
- Verify storage API usage is SQLite-compatible (put/get works with
  new_sqlite_classes)
- Check for memory leaks: are old connections cleaned up?
- Check for proper hibernation support (optional but recommended)

### 5. API Routes Audit
- Verify all routes in src/routes/ handle errors gracefully
- Check input validation on every POST/PUT endpoint
- Verify consistent error response format ({ error: "..." })
- Check that /api/auth/register validates: username (3-20 chars
  alphanumeric+underscore), phone (+[country][number] format),
  password strength
- Check that protected routes all use authMiddleware
- Check /api/health endpoint works

### 6. Frontend Audit (views/index.html)
- Check the HTML is valid and self-contained
- Verify PWA manifest, service worker, icons are properly served
- Check for inline scripts that could cause XSS
- Verify WebSocket connection URL is correct
- Check that the frontend handles API errors gracefully

### 7. R2 Media Upload Audit
- Check file size limits are enforced (MAX_FILE_SIZE_MB, PREMIUM_MAX_FILE_SIZE_MB)
- Check file type validation (allowed extensions/MIME types)
- Check that uploaded files are properly stored in R2
- Check that media URLs are properly generated and returned
- Verify presigned URL handling if used

### 8. Workers AI Integration Audit
- Check AI binding usage: model selection, error handling, fallback
- Check that AI features are properly gated (premium users only?)
- Verify AI responses are properly sanitized before sending to users

### 9. Environment & Config Audit
- Verify .dev.vars exists and has JWT_SECRET (local dev)
- Verify JWT_SECRET is set as a Cloudflare secret (production)
- Check .gitignore includes: .dev.vars, node_modules, .wrangler
- Verify package.json scripts are correct for Termux environment
- Check that `npm test` passes (2 tests: password hash, JWT)

### 10. Deployment Audit
- Run: `npm run dev:termux` and verify successful deployment
- Test the deployed URL: https://chatlk.agent-1xfast-srilanka.workers.dev
  - GET /api/health should return { status: "ok", app: "ChatLK", timestamp: ... }
  - POST /api/auth/register should work with valid input
  - POST /api/auth/login should work after registration
  - GET / with valid JWT should return the chat frontend
- Check for the "Multiple environments" warning — consider adding
  `--env ""` to deploy script or document that it's expected

## Output Format
For each audit item, report:
- ✅ PASS — no issues found
- ⚠️ WARN — minor issue, describe it
- ❌ FAIL — critical issue, describe it AND provide the fix

After the audit, provide:
1. A summary of all issues found
2. For each issue: the exact file, the exact change needed, and why
3. All fixes as copy-pasteable code blocks
4. Commands to run after applying fixes (deploy, migrate, etc.)

## Important Rules
- NEVER use `wrangler dev` or any command that starts local workerd
  (it crashes on Termux due to TCMalloc memory limits)
- ALWAYS use `--remote` for D1 commands
- Test changes by deploying with `npm run dev:termux`
- Do NOT change binding IDs that are already correct
- Do NOT revert `new_sqlite_classes` to `new_classes`
- Do NOT add `--no-bundle` back to the deploy script
- Keep all responses in Sinhala where possible, technical terms in English

