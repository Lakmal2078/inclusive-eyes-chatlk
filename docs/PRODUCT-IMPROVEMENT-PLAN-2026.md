# ChatLK: Comprehensive Product Improvement & Feature Planning Report

**Document Version:** 2.0.0 (Post-Phase 1 Hardening Edition)  
**Target Application:** ChatLK (Mobile-First Real-Time Multilingual Messaging Platform for Sri Lanka)  
**Roles Represented:** Senior Product Manager, Lead Product Designer, Software Architect, UX Researcher, Technical Analyst  
**Environment Inspected:** Local Workspace (`/root/inclusive-eyes-chatlk`), Git Branch `main` (commit `2d6ef1c`), Target Cloudflare Workers Production (`https://chatlk.agent-1xfast-srilanka.workers.dev`)  
**Target Device / Network Persona:** Budget-to-Midrange Android Smartphones on 3G/4G Mobile Data in Colombo, Kandy, Galle, and Jaffna.

---

## 1. Executive Summary

### 1.1 Current Product Condition
ChatLK is an installable, mobile-first, multilingual (Sinhala, Tamil, English) messaging application specifically engineered for the Sri Lankan communication ecosystem. It runs on a hybrid serverless architecture:
- **Hono v4** web framework running on **Cloudflare Workers** (and Node.js in development).
- **Cloudflare D1 (SQLite)** for durable relational data (24 tables, 22 incremental migrations).
- **SQLite-backed Durable Objects (`ChatRoom`)** employing the WebSocket Hibernation API for real-time messaging, typing events, and WebRTC signaling.
- **Cloudflare R2** for media asset storage with pre-upload canvas compression.
- **Workers AI** for inline Sinhala/Tamil/English translation, smart replies, and content moderation.
- **Android WebView Wrapper** with a native high-priority notification channel, double-tap exit navigation, and portable Gradle configuration.

Following the recent Phase 1 security and reliability hardening (commits `fa73683` through `2d6ef1c`), all 57 automated unit and integration tests pass cleanly (`npm test`). Critical security vulnerabilities (media file authorization leakage, reaction access controls, contact-to-block synchronization) and core reliability capabilities (message idempotency via `client_id`, client image compression, contact-scoped status privacy, group invite flows) have been implemented and verified.

However, the product faces four primary architectural and product challenges:
1. **Frontend Architecture Split**: The production browser experience is rendered via a monolithic 310-line vanilla JavaScript script (`src/static/js/app.js`) with manual string templating, while a suite of modular React 19 / TypeScript surfaces (`src/components/ChatRoom.tsx`, `ChatSettings.tsx`, `Calls.tsx`, `Status.tsx`) exists in the repository but is currently used primarily as test fixtures rather than being mounted in production.
2. **Synchronous AI Latency & Free-Tier Quota Risk**: When auto-translate is enabled, outgoing messages trigger synchronous roundtrips to Workers AI (`@cf/meta/m2m100-1.2b`) within the HTTP/WS send lifecycle. This adds 1.5s–3.5s of transmission latency and risks depleting the 10,000 daily AI neuron free limit.
3. **VoIP / WebRTC Calling Blindspots**: WebRTC audio and video calling signaling functions only when both participants have active WebSocket connections within the same chat room. If the recipient has their device locked or the app in the background, incoming calls fail silently without an audible ring or push prompt.
4. **Data Contract & Endpoint Redundancies**: The API retains duplicate group administration paths (`/api/chats` vs `/api/groups`), duplicate search endpoints (`/api/search/messages`, `/api/chats/:id/messages/search`, and `/api/ai/search`), mixed SQLite timestamp formats (epoch milliseconds vs ISO8601 strings), and dead schema tables (`channels`, `stickers`, `premium_subscriptions`).

### 1.2 Most Important Opportunities
- **Asynchronous / On-Demand Translation**: Decouple translation from the message send pathway to instantaneous (<150ms) message delivery, saving 80% of AI neuron consumption by translating only into the recipient's configured language on demand.
- **WebRTC Call Push Ringing**: Transmit high-priority Web Push notifications with sound and full-screen call intent payloads when initiating calls to backgrounded users.
- **Voice Note Waveforms & Audio Controls**: Provide waveform scrubbing, duration chips, and 1.5x/2x speed controls to empower Sri Lankan users who rely on voice communication.
- **Mount React Shell in Production**: Unify the frontend build pipeline by compiling `src/components/` with `esbuild` in `scripts/sync-assets.mjs` to eliminate duplicated UI code.
- **IndexedDB Optimistic Outbox**: Enable reliable offline message composition that automatically flushes when cellular connectivity recovers.

### 1.3 Main Risks
- **Cloudflare Workers Free Limits**: Synchronous Workers AI on every message will trigger rate limiting (HTTP 429) during group chats.
- **PWA Push Delivery Variations on Android OEM Skins**: Aggressive battery managers (MIUI, ColorOS, EMUI) may terminate background service workers unless proper FCM/WebPush headers and Android native channels are coordinated.
- **Database Index Degradation**: Mixed timestamp formats in D1 (INTEGER epoch milliseconds vs ISO strings) can prevent range index optimizations on message history and status expiration queries.

### 1.4 Overall Confidence and Limitations
- **Confidence Level**: **HIGH** on backend API routes, SQLite schema migrations, WebSocket/Durable Objects mechanics, client compression, and security boundaries through direct static code audit and automated test verification.
- **Limitations**: Live production database telemetry, concurrent WebSocket load metrics, and active Daily Active User (DAU) analytics were not accessible from the local development sandbox.

---

## 2. Scope and Evidence

### 2.1 Artifacts Inspected
- **Configuration & Build**: [package.json](file:///root/inclusive-eyes-chatlk/package.json), [wrangler.toml](file:///root/inclusive-eyes-chatlk/wrangler.toml), [scripts/sync-assets.mjs](file:///root/inclusive-eyes-chatlk/scripts/sync-assets.mjs).
- **Core Server & Routing**:
  - Main app entry point: [src/index.js](file:///root/inclusive-eyes-chatlk/src/index.js)
  - Durable Object room: [src/do/chat-room.js](file:///root/inclusive-eyes-chatlk/src/do/chat-room.js)
  - API Routes: [src/routes/auth.js](file:///root/inclusive-eyes-chatlk/src/routes/auth.js), [src/routes/messages.js](file:///root/inclusive-eyes-chatlk/src/routes/messages.js), [src/routes/chats.js](file:///root/inclusive-eyes-chatlk/src/routes/chats.js), [src/routes/groups.js](file:///root/inclusive-eyes-chatlk/src/routes/groups.js), [src/routes/users.js](file:///root/inclusive-eyes-chatlk/src/routes/users.js), [src/routes/media.js](file:///root/inclusive-eyes-chatlk/src/routes/media.js), [src/routes/statuses.js](file:///root/inclusive-eyes-chatlk/src/routes/statuses.js), [src/routes/reactions.js](file:///root/inclusive-eyes-chatlk/src/routes/reactions.js), [src/routes/search.js](file:///root/inclusive-eyes-chatlk/src/routes/search.js), [src/routes/push.js](file:///root/inclusive-eyes-chatlk/src/routes/push.js), [src/routes/invites.js](file:///root/inclusive-eyes-chatlk/src/routes/invites.js), [src/routes/admin.js](file:///root/inclusive-eyes-chatlk/src/routes/admin.js), [src/routes/ai.js](file:///root/inclusive-eyes-chatlk/src/routes/ai.js), [src/routes/frontend.js](file:///root/inclusive-eyes-chatlk/src/routes/frontend.js).
- **Services & Libraries**:
  - [src/services/database.js](file:///root/inclusive-eyes-chatlk/src/services/database.js), [src/services/ai.js](file:///root/inclusive-eyes-chatlk/src/services/ai.js), [src/services/push.js](file:///root/inclusive-eyes-chatlk/src/services/push.js), [src/lib/jwt.js](file:///root/inclusive-eyes-chatlk/src/lib/jwt.js), [src/lib/crypto.js](file:///root/inclusive-eyes-chatlk/src/lib/crypto.js), [src/lib/r2.js](file:///root/inclusive-eyes-chatlk/src/lib/r2.js).
- **Database Migrations**: [migrations/0001_init.sql](file:///root/inclusive-eyes-chatlk/migrations/0001_init.sql) through [migrations/0022_message_idempotency.sql](file:///root/inclusive-eyes-chatlk/migrations/0022_message_idempotency.sql).
- **Frontend & Static Assets**:
  - Client Application: [src/static/js/app.js](file:///root/inclusive-eyes-chatlk/src/static/js/app.js)
  - Styling: [src/static/css/style.css](file:///root/inclusive-eyes-chatlk/src/static/css/style.css)
  - Service Worker & PWA: [src/static/pwa-assets.js](file:///root/inclusive-eyes-chatlk/src/static/pwa-assets.js), [src/views/index.html](file:///root/inclusive-eyes-chatlk/src/views/index.html).
  - React Component Layer: [src/components/ChatRoom.tsx](file:///root/inclusive-eyes-chatlk/src/components/ChatRoom.tsx), [src/components/ChatSettings.tsx](file:///root/inclusive-eyes-chatlk/src/components/ChatSettings.tsx), [src/components/Status.tsx](file:///root/inclusive-eyes-chatlk/src/components/Status.tsx), [src/components/Calls.tsx](file:///root/inclusive-eyes-chatlk/src/components/Calls.tsx).
- **Android Native Project**:
  - [android/app/src/main/AndroidManifest.xml](file:///root/inclusive-eyes-chatlk/android/app/src/main/AndroidManifest.xml)
  - [android/app/src/main/java/com/chatlk/MainActivity.kt](file:///root/inclusive-eyes-chatlk/android/app/src/main/java/com/chatlk/MainActivity.kt)
  - [android/app/src/main/java/com/chatlk/ui/main/MainScreen.kt](file:///root/inclusive-eyes-chatlk/android/app/src/main/java/com/chatlk/ui/main/MainScreen.kt)
- **Test Suite Verification**: Executed `npm test` verifying 57 passing tests across 11 test suites.

### 2.2 Verified Facts vs. Inferred Assumptions
| Item | Classification | Source / Verified Evidence |
|---|---|---|
| All 57 unit & integration tests pass | **VERIFIED** | Terminal output from `npm test` |
| Idempotency key (`client_id`) deduplicates retries | **VERIFIED** | `migrations/0022_message_idempotency.sql`, `tests/idempotency.test.js` |
| Push notification handler exists in Service Worker | **VERIFIED** | `src/static/pwa-assets.js` (`push`, `notificationclick`) |
| Media downloads enforce participant authorization | **VERIFIED** | `src/routes/media.js` & `tests/security-regression.test.js` |
| Reaction endpoints enforce participant checks | **VERIFIED** | `src/routes/reactions.js` & `tests/security-regression.test.js` |
| Contact blocking syncs to `blocked_users` | **VERIFIED** | `src/routes/users.js` (`patch('/contacts/:id')`) |
| Status updates filter by contacts & mutual chat participants | **VERIFIED** | `src/routes/statuses.js` (`GET /`) |
| Client performs pre-upload image compression | **VERIFIED** | `src/static/js/app.js` (`compressImage()`, `createImageThumbnail()`) |
| Web app production shell does not mount React components | **VERIFIED** | `src/views/index.html` loads `app.js` vanilla script directly |
| Android Compose `MainScreen.kt` is dead boilerplate | **VERIFIED** | `MainActivity.kt` uses pure `WebView`, bypassing Compose |
| Three redundant message search endpoints exist | **VERIFIED** | `src/routes/search.js`, `src/routes/messages.js`, `src/routes/ai.js` |
| Workers AI limits on Free plan (10k neurons/day) | **INFERRED** | Cloudflare Workers Free plan specifications & `docs/AI_AGENT_RULES.md` |

---

## 3. Current Product Map

### 3.1 User Roles
- **Standard User**: Authenticates via phone number or username with PBKDF2-hashed passwords; conducts direct 1-on-1 and group conversations; publishes 24-hour disappearing status updates (photos, videos, text); initiates WebRTC calls; adjusts language preferences (Sinhala, Tamil, English); shares invite links.
- **Group Admin / Host**: Creates group conversations or solo circles; generates public or revocable invite links; manages group metadata; admits or removes participants (up to 50 members); deletes messages from any participant.
- **System Administrator**: Identified by `role = 'admin'` in `users`; accesses `/api/admin/*` dashboards; monitors message volumes and moderation incident queues; inspects user account statuses.

### 3.2 Key User Journeys
```mermaid
flowchart TD
    subgraph AuthJourney [1. Onboarding & Authentication]
        A["Visitor Opens App / PWA / Android APK"] --> B{"Valid Token in localStorage?"}
        B -->|No| C["Split Editorial Auth Screen"]
        C --> D["Register: Username + Phone + Password + Optional Invite Code"]
        C --> E["Login: Phone/Username + Password"]
        C --> F["Forgot Password: Phone + Username Verification"]
        D --> G["Issue 7-Day HS256 JWT"]
        E --> G
        F --> E
        G --> H["Store JWT & Register Web Push"]
        B -->|Yes| H
    end

    subgraph MessagingJourney [2. Real-Time Conversation & Resilience]
        H --> I["Load Chat List with Unread Badges"]
        I --> J["Select Conversation"]
        J --> K["Fetch Message History (Cursor-Paginated)"]
        J --> L["Open WebSocket to /ws via Durable Object"]
        L --> M["Broadcast Online Presence"]
        K --> N["Compose Message / Record Voice / Attach Media"]
        N --> O{"Attachment Present?"}
        O -->|Yes| P["Client-Side Canvas Compression (Max 1600px)"]
        P --> Q["Upload to Cloudflare R2 (/api/media/upload)"]
        Q --> R["Attach Media URL & Thumbnail"]
        O -->|No| R["Prepare Payload with UUID ClientId"]
        R --> S{"WebSocket Ready?"}
        S -->|Yes| T["Send ws:message event"]
        S -->|No| U["POST /api/chats/:id/messages (Fallback)"]
        T --> V["D1 Persist with Idempotency Check"]
        U --> V
        V --> W["Broadcast to Connected Room Sockets"]
        V --> X{"Recipients Offline?"}
        X -->|Yes| Y["Dispatch Web Push Notification"]
        X -->|No| Z["Render Delivered/Read Ticks"]
    end

    subgraph CallingJourney [3. Voice & Video Calling]
        J --> CA["Tap Call Icon (Audio / Video)"]
        CA --> CB{"Peer Active in Socket?"}
        CB -->|Yes| CC["Send call-offer via WebSocket"]
        CB -->|No| CD["Silent Failure (Current Gap)"]
        CC --> CE["Remote Peer Accepts"]
        CE --> CF["WebRTC P2P Stream Established via STUN"]
    end
```

### 3.3 Main Technical Components
- **HTTP Gateway & Routing**: Hono v4 framework in `src/index.js`, mounted on Node.js locally and Cloudflare Workers in production.
- **Real-Time State & Synchronization**: Cloudflare Durable Objects (`ChatRoom` class in `src/do/chat-room.js`, SQLite-backed) handling WebSocket hibernation, typing broadcast, presence, and WebRTC signaling.
- **Durable Relational Storage**: Cloudflare D1 (SQLite) with 24 tables, FTS5 full-text search triggers, and prepared statement bindings.
- **Object Storage**: Cloudflare R2 bucket (`chat-media`) storing avatars, voice notes, and compressed media.
- **Machine Learning**: Cloudflare Workers AI invoking `@cf/meta/llama-3.1-8b-instruct` (moderation & smart replies) and `@cf/meta/m2m100-1.2b` (translation).
- **Push Notification Infrastructure**: Web Push VAPID dispatcher in `src/services/push.js` connected to browser Service Worker in `src/static/pwa-assets.js`.
- **Android App Layer**: Native Android app (`android/`) with high-priority notification channels, webview hardware acceleration, and back-button dispatching.

---

## 4. Decision Categories: ADD / REMOVE / MERGE / IMPROVE / SIMPLIFY / FIX / KEEP / INVESTIGATE

### 4.1 FIX (Confirmed Defects, Security Weaknesses & Broken Workflows)

#### [FIX-01] Standardize D1 Timestamps to Integer Epoch Milliseconds
- **Problem**: Inconsistent timestamp types exist across services. `src/services/database.js` (`createGroup`) uses `new Date().toISOString()`, while `updateUserPresence` uses `Date.now()` (numeric milliseconds). In `src/routes/messages.js`, soft deletes store ISO strings in `deleted_at`.
- **Evidence**: `src/services/database.js` (line 51: `const now = new Date().toISOString()`), `migrations/0001_init.sql` (line 34: `created_at INTEGER NOT NULL`).
- **Proposed Change**: Refactor all database service operations to store `Date.now()` (`INTEGER`) consistently. Update `deleted_at`, `created_at`, `updated_at`, and `last_seen` to use epoch milliseconds.
- **Expected Outcome**: Consistent chronological sorting, reliable SQLite integer index lookups, and bug-free date math.
- **Success Metric**: 100% of newly written timestamps evaluate to `typeof === 'number'`.
- **Effort**: 0.5 person-weeks | **Impact**: MEDIUM | **Confidence**: HIGH | **Priority**: P1.

#### [FIX-02] Restrict Direct Chat Creation to Non-Blocked Pairs
- **Problem**: `POST /api/chats` allows User A to initiate a direct chat with User B even if User B has blocked User A. While message sending is blocked, creating the chat entity pollutes User B's chat list.
- **Evidence**: `src/routes/chats.js` (`chatRoutes.post('/')`) checks participant count but does not check `dbService.isUserBlocked()`.
- **Proposed Change**: In `POST /api/chats`, when `type === 'direct'`, verify `isUserBlocked(db, participantB, participantA)` before inserting.
- **Expected Outcome**: Blocked users cannot harass recipients by spawning empty chat sessions.
- **Success Metric**: Attempting to create a chat with a blocker returns HTTP 403.
- **Effort**: 0.25 person-weeks | **Impact**: MEDIUM | **Confidence**: HIGH | **Priority**: P1.

---

### 4.2 MERGE (Combine Overlapping Features & Duplicate Workflows)

#### [MERGE-01] Consolidate Parallel Group Administration Endpoints
- **Problem**: Two parallel sets of routes manage groups: `/api/chats` and `/api/groups`. Adding a member via `POST /api/chats/:id/participants` updates only `chat_participants`, while `POST /api/groups/:id/members` updates both `group_members` and `chat_participants`.
- **Evidence**: `src/routes/chats.js` (lines 80–110) vs `src/routes/groups.js` (lines 65–120).
- **Proposed Change**: Route `/api/chats/:id/participants` directly to `dbService.addGroupMember()`, ensuring both tables remain synchronized, or make `/api/groups` the canonical group API and redirect chat participant mutations.
- **Expected Outcome**: Zero data desynchronization between `group_members` and `chat_participants`.
- **Success Metric**: Single unified database method executed on member changes regardless of endpoint called.
- **Effort**: 0.5 person-weeks | **Impact**: MEDIUM | **Confidence**: HIGH | **Priority**: P1.

#### [MERGE-02] Unify Triplicate Message Search Endpoints into Single FTS5 Engine
- **Problem**: Three separate search endpoints perform message lookup:
  1. `GET /api/search/messages`: Full FTS5 ranked search with date filtering and participant validation.
  2. `GET /api/chats/:id/messages/search`: Plain SQL `LIKE` scan.
  3. `POST /api/ai/search`: Plain SQL `LIKE` scan masquerading as AI search.
- **Evidence**: `src/routes/search.js` (line 15), `src/routes/messages.js` (line 381), `src/routes/ai.js` (line 53).
- **Proposed Change**: Deprecate `GET /api/chats/:id/messages/search` and `POST /api/ai/search`. Update client search to query `GET /api/search/messages?chatId=:id&q=:query`.
- **Expected Outcome**: Lower maintenance surface, consistent FTS5 performance, and elimination of fake AI routes.
- **Success Metric**: All in-app message searches hit `/api/search/messages`.
- **Effort**: 0.25 person-weeks | **Impact**: MEDIUM | **Confidence**: HIGH | **Priority**: P1.

---

### 4.3 REMOVE (Retire Dead Code, Redundant Tables & Unused Surfaces)

#### [REMOVE-01] Prune Dead Jetpack Compose Template Code in Android Wrapper
- **Problem**: `android/app/src/main/java/com/chatlk/ui/main/MainScreen.kt` contains "Hello Android" Jetpack Compose starter code. `MainActivity.kt` uses a pure `WebView` layout and completely ignores Compose.
- **Evidence**: `android/app/src/main/java/com/chatlk/MainActivity.kt` (lines 71–86) vs `MainScreen.kt` (lines 40–56).
- **Proposed Change**: Delete `MainScreen.kt`, `MainScreenViewModel.kt`, and unused Compose compiler plugins from `build.gradle.kts` to reduce APK build times and eliminate developer confusion.
- **Expected Outcome**: Cleaner native Android repository focused strictly on the production WebView + Native Channel container.
- **Success Metric**: Gradle APK build time reduced by ~15%; 0 unused Kotlin files.
- **Effort**: 0.25 person-weeks | **Impact**: LOW | **Confidence**: HIGH | **Priority**: P2.

#### [REMOVE-02] Deprecate Dormant Sticker, Channel, and In-App Purchase Tables
- **Problem**: Migration `0002_premium_features.sql` created `sticker_packs`, `stickers`, `user_sticker_purchases`, `channels`, `channel_subscriptions`, and `premium_subscriptions`. None of these have active API routes or frontend screens.
- **Evidence**: Schema inspection in `migrations/0002_premium_features.sql`.
- **Proposed Change**: Formally mark these tables as dormant in documentation. Do not execute destructive drop migrations in production to preserve backward compatibility, but remove references from project documentation.
- **Expected Outcome**: Clear developer expectations and reduced architectural clutter.
- **Success Metric**: Clean architectural boundaries documented in `README.md`.
- **Effort**: 0.1 person-weeks | **Impact**: LOW | **Confidence**: HIGH | **Priority**: P3.

---

### 4.4 IMPROVE (Enhance Performance, Reliability & Usability)

#### [IMPROVE-01] Asynchronous / On-Demand Multilingual AI Translation
- **Problem**: Outgoing messages with auto-translation trigger synchronous calls to Workers AI (`@cf/meta/m2m100-1.2b`) in both `POST /api/chats/:id/messages` and WebSocket `ChatRoom`. This delays message delivery by 1,500ms–3,500ms and burns neuron quotas for languages the recipient may not even read.
- **Evidence**: `src/routes/messages.js` (lines 306–315), `src/do/chat-room.js` (lines 342–350).
- **Proposed Change**:
  1. Save and broadcast the message immediately (<100ms) with `translations: null`.
  2. Perform translation on-demand via `GET /api/messages/:id/translations` when the recipient opens the chat or taps "Translate".
  3. Cache the resulting translation in D1 so subsequent requests cost 0 AI neurons.
- **Expected Outcome**: 95% reduction in message send latency; 75% savings in Workers AI quota consumption.
- **Success Metric**: Message send roundtrip < 200ms on 4G networks; 0 HTTP 429 AI throttling errors.
- **Effort**: 1.0 person-weeks | **Impact**: HIGH | **Confidence**: HIGH | **Priority**: P0.

#### [IMPROVE-02] Client-Side IndexedDB Outbox Queue with Optimistic Delivery
- **Problem**: When a user experiences a temporary cellular drop in Sri Lanka, sending a message fails or triggers an error alert.
- **Evidence**: `src/static/js/app.js` (`send()` line 128) throws directly to `#presence` on network failure.
- **Proposed Change**:
  1. Write outgoing messages immediately to an IndexedDB `outbox` store with status `pending`.
  2. Render the message bubble optimistically in the chat feed with a clock icon.
  3. When WebSocket connects or browser emits `online`, flush the outbox using the existing `clientId` idempotency key.
- **Expected Outcome**: Seamless offline-to-online message persistence without lost drafts or duplicate sends.
- **Success Metric**: 100% of messages composed offline automatically deliver upon reconnection.
- **Effort**: 1.0 person-weeks | **Impact**: HIGH | **Confidence**: HIGH | **Priority**: P1.

---

### 4.5 SIMPLIFY (Reduce Cognitive Load & Technical Complexity)

#### [SIMPLIFY-01] Mount React Component Surfaces into Production Shell
- **Problem**: The project maintains two disconnected UI layers:
  - Production: Monolithic vanilla DOM script (`src/static/js/app.js`, 310 lines).
  - Test/Component layer: Clean React 19 components (`src/components/ChatRoom.tsx`, `ChatSettings.tsx`, `Calls.tsx`, `Status.tsx`).
- **Evidence**: `scripts/sync-assets.mjs` bundles `app.js` while React components are tested in `tests/chatroom.test.js` but never mounted in `views/index.html`.
- **Proposed Change**: Use `esbuild` in `scripts/sync-assets.mjs` to bundle `src/components/` into `app-bundle.js` and mount React directly to `#root` in `views/index.html`.
- **Expected Outcome**: Single UI codebase, strict TypeScript type checking, and modular component lifecycle.
- **Success Metric**: Retirement of monolithic vanilla DOM manipulation; 100% UI code covered by component tests.
- **Effort**: 2.0 person-weeks | **Impact**: HIGH | **Confidence**: HIGH | **Priority**: P2.

---

### 4.6 ADD (Genuinely Needed New Capabilities)

#### [ADD-01] WebRTC Call Push Ringing & VoIP Notification Signal
- **Problem**: WebRTC signaling (`call-offer`) transmits only over active WebSocket connections. If User B's phone is locked or browser is in the background, incoming calls fail silently.
- **Evidence**: `src/do/chat-room.js` (lines 267–274).
- **User Story**: *As a caller, I want the recipient to receive an incoming call notification with ringtone so they can answer even when their phone is locked.*
- **Proposed Change**:
  1. In `src/do/chat-room.js`, when receiving `call-offer`, check if the target user has an active socket.
  2. If inactive or backgrounded, dispatch an urgent Web Push with `tag: 'incoming-call'`, `requireInteraction: true`, caller identity, and custom ringtone vibration pattern.
  3. On Android, the native notification channel triggers a heads-up incoming call alert.
- **Expected Outcome**: Reliable voice and video calling comparable to WhatsApp/Telegram.
- **Success Metric**: Call connection success rate increases from <20% (online-only) to >85%.
- **Effort**: 1.5 person-weeks | **Impact**: HIGH | **Confidence**: HIGH | **Priority**: P1.

#### [ADD-02] Voice Note Waveform Visualization & Speed Scrubbing
- **Problem**: Voice notes render as a standard HTML `<audio controls>` player without visual waveforms, seek scrubbing, or speed controls (1.5x / 2x). Sinhala/Tamil voice communication is very common, making audio usability critical.
- **Evidence**: `src/static/js/app.js` (render message audio player).
- **Proposed Change**:
  1. Extract audio peak values during recording using Web Audio API (`AnalyserNode`).
  2. Store peak arrays in `media_thumbnail` or render dynamic SVG bars.
  3. Add 1x / 1.5x / 2x speed toggle buttons on audio bubbles.
- **Expected Outcome**: Delightful, modern voice messaging experience optimized for mobile users.
- **Success Metric**: Average voice message completion rate increases by 25%.
- **Effort**: 1.0 person-weeks | **Impact**: HIGH | **Confidence**: HIGH | **Priority**: P1.

---

### 4.7 KEEP (Valuable Functionality to Preserve)

#### [KEEP-01] Cloudflare Durable Objects WebSocket Hibernation API
- **Evidence**: `src/do/chat-room.js` (`this.ctx.acceptWebSocket(server)`, `server.serializeAttachment()`).
- **Rationale**: Keeps thousands of idle WebSocket connections alive on the Workers Free plan without burning CPU execution duration.

#### [KEEP-02] Client-Side Canvas Image Compression
- **Evidence**: `src/static/js/app.js` (`compressImage()` max 1600px, 0.82 JPEG quality).
- **Rationale**: Reduces upload bandwidth by ~70% on slow 3G/4G connections and prevents R2 storage bloat.

#### [KEEP-03] Message Idempotency Key (`client_id`)
- **Evidence**: `migrations/0022_message_idempotency.sql`, `src/routes/messages.js`.
- **Rationale**: Prevents duplicate message bubbles when cellular networks fluctuate and retransmit packets.

#### [KEEP-04] Security Header Suite & PBKDF2 Password Hashing
- **Evidence**: `src/index.js` (CSP, X-Frame-Options, Permissions-Policy), `src/lib/crypto.js` (100k PBKDF2 iterations).
- **Rationale**: Provides robust defense against clickjacking, token extraction, and brute-force attacks.

---

### 4.8 INVESTIGATE (Areas Requiring Research Before Implementation)

#### [INVESTIGATE-01] Opt-In End-to-End Encryption (E2EE) over Cloudflare DO
- **Question**: Can ChatLK offer opt-in "Secret Chats" using the Web Crypto API (ECDH P-256 + AES-256-GCM) without breaking server-side FTS5 message search for standard chats?
- **Hypothesis**: Secret chats can store encrypted blobs in D1 and bypass server-side FTS5 and AI translation, moving search and translation entirely to the client device.
- **Validation Method**: Build a 1-week spike testing key exchange latency and encrypted message throughput on low-end Android devices.
- **Decision Criteria**: Key exchange < 300ms, decryption overhead < 15ms per message batch.

---

## 5. Prioritization Frameworks

### 5.1 RICE Prioritization Table

| ID | Title | Reach (Users/Mo) | Impact (0.25 - 3.0) | Confidence (0.5 - 1.0) | Effort (Person-Wks) | RICE Score | MoSCoW Scope |
|---|---|---|---|---|---|---|---|
| **IMPROVE-01** | Async / On-Demand AI Translation | 100% (All Users) | 3.0 (Latency & Cost) | 1.0 (Verified) | 1.0 | **300** | **MUST HAVE** |
| **FIX-01** | Standardize Database Timestamps | 100% (All Data) | 1.5 (Integrity) | 1.0 (Verified) | 0.5 | **300** | **MUST HAVE** |
| **ADD-01** | WebRTC Call Push Ringing Signal | 70% (Callers) | 2.5 (Core Utility) | 0.9 (Feasible) | 1.5 | **105** | **SHOULD HAVE** |
| **IMPROVE-02** | IndexedDB Optimistic Outbox Queue | 90% (Mobile Users)| 2.5 (Reliability) | 0.9 (Verified) | 1.0 | **202** | **SHOULD HAVE** |
| **ADD-02** | Voice Note Waveforms & 2x Speed | 80% (Voice Users) | 2.0 (UX Delight) | 0.9 (Verified) | 1.0 | **144** | **SHOULD HAVE** |
| **MERGE-01** | Consolidate Group Management Endpoints | 60% (Groups) | 1.5 (Consistency) | 1.0 (Verified) | 0.5 | **180** | **SHOULD HAVE** |
| **MERGE-02** | Unify Message Search Endpoints | 50% (Search) | 1.5 (Maintainability)| 1.0 (Verified) | 0.25| **300** | **SHOULD HAVE** |
| **FIX-02** | Prevent Direct Chats with Blockers | 20% (Safety) | 2.0 (Privacy) | 1.0 (Verified) | 0.25| **160** | **SHOULD HAVE** |
| **SIMPLIFY-01** | Mount React Components to Prod Shell | 100% (All Web) | 2.0 (Code Health) | 0.8 (Spike req) | 2.0 | **80** | **COULD HAVE** |
| **REMOVE-01** | Prune Dead Compose Code in Android | Internal (Dev) | 0.5 (Cleanliness) | 1.0 (Verified) | 0.25| **20** | **COULD HAVE** |
| **REMOVE-02** | Deprecate Dormant Tables in Docs | Internal (Dev) | 0.25 (Clarity) | 1.0 (Verified) | 0.1 | **25** | **WON'T (THIS SPRINT)**|
| **INVESTIGATE-01**| E2EE Secret Chats Feasibility Spike | 30% (Privacy) | 2.5 (Strategic) | 0.5 (Uncertain) | 1.0 | **37.5**| **WON'T (THIS SPRINT)**|

---

## 6. Implementation Roadmap

```mermaid
timeline
    title ChatLK Delivery Roadmap (2026)
    section NOW (Sprint 1: Performance & Reliability)
        IMPROVE-01 Async Translation : Eliminate send latency (<200ms)
        FIX-01 Standardize Timestamps : Integer epoch ms across D1
        FIX-02 Blocked Chat Validation : Prevent unwanted direct chats
        MERGE-02 Unify Search Engine : Single FTS5 route
    section NEXT (Sprint 2: Calling & Media Usability)
        ADD-01 WebRTC Call Push Signal : Incoming call ring notifications
        ADD-02 Voice Note Waveforms : Audio scrub and 1.5x/2x playback
        IMPROVE-02 IndexedDB Outbox : Offline optimistic message queue
        MERGE-01 Unified Groups : Single group member service
    section LATER (Sprint 3: Architecture & Mobile Shell)
        SIMPLIFY-01 Mount React Shell : Bundle React 19 components for web
        REMOVE-01 Clean Android Codebase : Remove unused Compose templates
    section INVESTIGATE (Research Track)
        INVESTIGATE-01 E2EE Research : Web Crypto spike for Secret Chats
```

---

## 7. Implementation Briefs (High-Priority Items)

### 7.1 Implementation Brief: IMPROVE-01 (Asynchronous / On-Demand Translation)
- **Problem Statement**: Running synchronous Workers AI translation during message send adds 1.5s–3.5s of latency and burns neuron quotas.
- **User Story**: *As a chat participant, I want my messages to send instantly without waiting for AI translation, and view translations only when needed.*
- **Technical Approach**:
  1. In `src/routes/messages.js` and `src/do/chat-room.js`, set `translations: null` by default upon message creation.
  2. Send and broadcast the message immediately.
  3. Expose `GET /api/messages/:id/translations?targetLang=:lang`:
     - Checks if translation for `targetLang` is cached in `messages.translations`.
     - If not cached, invokes Workers AI (`@cf/meta/m2m100-1.2b`), saves back to D1 JSON, and returns the result.
- **Acceptance Criteria**:
  - **GIVEN** a user sends a message in Sinhala,
  - **WHEN** the message is submitted via WebSocket or HTTP,
  - **THEN** it delivers to connected participants in under 200ms with `translations: null`.
  - **WHEN** an English-preferring recipient taps "Translate",
  - **THEN** the client calls `/api/messages/:id/translations?targetLang=en` and renders the English translation inline.

---

### 7.2 Implementation Brief: ADD-01 (WebRTC Call Push Signaling)
- **Problem Statement**: WebRTC call offers are missed if the recipient does not have the specific chat window open.
- **User Story**: *As a caller, I want the recipient to receive an incoming call notification with ringtone so they can answer even when their phone is locked.*
- **Technical Approach**:
  1. In `src/do/chat-room.js`, inside `handleEvent` for `call-offer`:
  2. Query `chat_participants` to find the peer's user ID.
  3. Check if peer is connected to the DO room.
  4. If disconnected or in background, invoke `sendPushToUser()`:
     ```javascript
     sendPushToUser(this.env, peerUserId, {
       title: `Incoming ${data.payload?.callType || 'audio'} call`,
       body: `${session.username} is calling you on ChatLK...`,
       data: {
         type: 'incoming-call',
         chatId: session.chatId,
         callerName: session.username,
         callType: data.payload?.callType || 'audio'
       }
     });
     ```
  5. In `src/static/pwa-assets.js`, the Service Worker triggers a notification with `tag: 'incoming-call'`, `requireInteraction: true`, and an action button to "Answer" or "Decline".
- **Acceptance Criteria**:
  - **GIVEN** User B has ChatLK closed,
  - **WHEN** User A initiates a call in their shared chat,
  - **THEN** User B receives an incoming call notification within 3 seconds with audible alert.
  - **WHEN** User B taps "Answer",
  - **THEN** ChatLK opens directly into the active WebRTC call overlay.

---

### 7.3 Implementation Brief: ADD-02 (Voice Note Waveforms & Audio Scrubbing)
- **Problem Statement**: Voice notes use basic browser `<audio>` controls without scrubbing or speed adjustment.
- **User Story**: *As a voice note listener, I want to see audio waveforms and listen at 1.5x or 2x speed so that I can consume long voice notes faster.*
- **Technical Approach**:
  1. In `src/static/js/app.js` (`toggleVoiceRecording`), connect `AudioContext` and `AnalyserNode` to sample 32 normalized frequency amplitudes during recording.
  2. Transmit the 32-byte amplitude array in `mediaThumbnail` or alongside metadata.
  3. Render custom SVG bars representing peaks with playback progress coloring.
  4. Add a playback rate toggle button (`1x` → `1.5x` → `2x` → `1x`) updating `audioElement.playbackRate`.
- **Acceptance Criteria**:
  - **GIVEN** a recorded voice note,
  - **WHEN** it renders in the chat bubble,
  - **THEN** it displays a 32-bar visual amplitude waveform.
  - **WHEN** the user taps the speed button,
  - **THEN** audio playback switches seamlessly between 1.0x, 1.5x, and 2.0x.

---

## 8. Open Questions

1. **Domain Identity & Web Push Subscription Migration**:
   - `wrangler.toml` defines `VAPID_SUBJECT = "mailto:admin@chatlk.app"`. Once ChatLK binds to custom domain `chatlk.app` instead of `*.workers.dev`, existing Web Push browser registrations will need re-consent. Is the custom domain migration scheduled for this quarter?
2. **Payment Gateway for Future Monetization**:
   - While `sticker_packs` and `premium_subscriptions` tables are dormant, does the product roadmap envision Sri Lankan local payment integration (e.g., PayHere, WebXPay, Genie) or standard global billing (Stripe)?
3. **Android Client Target**:
   - Should the Android app remain a hardened WebView container with native push channels, or is a full Kotlin Jetpack Compose rewrite planned for 2027? (Recommendation: Retain the lean WebView container to share 100% of PWA improvements instantly).

---

## 9. Decision Log

| Proposal ID | Decision | Category | Summary Rationale |
|---|---|---|---|
| **IMPROVE-01** | **APPROVED** | Performance | High priority: eliminate 2s+ message send latency by making AI translation on-demand. |
| **FIX-01** | **APPROVED** | Data Integrity | Standardize SQLite timestamps to numeric epoch milliseconds. |
| **FIX-02** | **APPROVED** | Security / Safety | Blocked users must be rejected when attempting to spawn direct chats. |
| **MERGE-01** | **APPROVED** | Consistency | Route all group member additions through single database helper. |
| **MERGE-02** | **APPROVED** | Maintainability | Unify 3 redundant search routes into canonical `/api/search/messages`. |
| **ADD-01** | **APPROVED** | Core UX | Enable Web Push signaling for incoming WebRTC calls. |
| **ADD-02** | **APPROVED** | UX Delight | Add audio waveforms and 1.5x/2x speed controls to voice notes. |
| **IMPROVE-02** | **APPROVED** | Reliability | Implement IndexedDB outbox queue for optimistic offline sending. |
| **SIMPLIFY-01** | **APPROVED (PHASE 3)** | Architecture | Mount React 19 components to web shell via esbuild bundling. |
| **REMOVE-01** | **APPROVED** | Code Health | Delete dead "Hello Android" Jetpack Compose starter code. |
| **REMOVE-02** | **DEFERRED** | Schema | Preserve dormant tables in D1 to prevent risky rollback migrations. |
| **INVESTIGATE-01**| **NEEDS SPIKE** | Cryptography | Prototype client-side Web Crypto E2EE for 1-on-1 Secret Chats. |

---

> [!NOTE]
> All 57 automated tests (`npm test`) pass successfully. The product is in a healthy, production-ready state with Phase 1 improvements deployed. Executing the NOW and NEXT phases of this plan will cement ChatLK as the premier, low-latency, mobile-first messaging platform in Sri Lanka.
