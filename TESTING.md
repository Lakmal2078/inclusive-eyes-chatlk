# ChatLK — Testing Guide & Verification Report

This document outlines the testing strategy, test suites, and verification methods for **ChatLK**, a multilingual real-time messaging application running on Cloudflare Workers, Hono, D1, KV, R2, Workers AI, and Durable Objects.

---

## 🚀 Quick Start: Running Tests

The test suite runs using Node.js's built-in test runner (`node:test`) against the local D1 emulator and mocked bindings.

```bash
# Run all unit and integration tests
npm test

# Run tests with detailed TAP or spec output
node --test tests/*.test.js
```

---

## 🧪 Test Coverage Across the 15 Features

| # | Feature | Test Module | Verification Method |
|---|---|---|---|
| 1 | **AI Auto-Translation** | `tests/features.test.js` | Verifies Sinhala (`si`), Tamil (`ta`), and English (`en`) script detection and translation dispatch via Workers AI (`@cf/meta/m2m100-1.2b` / `@cf/meta/llama-3.1-8b-instruct`). |
| 2 | **Group Chat Support** | `tests/features.test.js` | Validates group creation, initial member addition (capped at 50), member list retrieval, and admin privilege assignment. |
| 3 | **Message Reactions** | `tests/features.test.js` | Tests emoji reaction toggling (`added`, `removed`, `updated`), reaction aggregation summaries, and per-user reaction records. |
| 4 | **Message Editing & Soft Deletion** | `tests/features.test.js` | Ensures messages can only be edited within the 15-minute window, flags `is_edited = 1`, and validates soft deletion (`is_deleted = 1, deleted_at = ...`). |
| 5 | **Typing Indicators** | `tests/features.test.js`, WebSocket | Tests `typing_start` / `typing_stop` event broadcasting and automatic 5-second timeout expiration. |
| 6 | **Presence Tracking** | `tests/features.test.js` | Checks online/offline status toggling on WebSocket connect/disconnect, timestamp recording (`last_seen`), and `/api/users/:id/presence`. |
| 7 | **Message Search** | `tests/features.test.js` | Tests `/api/search/messages?q=...` full-text query matching across chats and date-range filters. |
| 8 | **User Profiles** | `tests/features.test.js` | Validates `PATCH /api/users/me` for updating display names, bio, avatar, and auto-translate preferences. |
| 9 | **Push Notifications** | `tests/features.test.js` | Verifies Web Push subscription storage (`/api/push/subscribe`), VAPID public key endpoint, and offline participant notification dispatch. |
| 10 | **AI Content Moderation** | `tests/features.test.js` | Validates classification of messages into `clean`, `flagged` (recorded in `flagged_messages`), and `blocked` (rejected with 400 Bad Request). |
| 11 | **Smart Replies** | `tests/features.test.js` | Tests generation of 3 contextual replies in user's language and 5-minute KV caching (`CACHE` namespace). |
| 12 | **Message Pinning** | `tests/features.test.js` | Verifies message pinning, unpinning by chat participants, and retrieval of pinned message lists (`/api/chats/:id/pinned`). |
| 13 | **Block & Mute Users/Chats** | `tests/features.test.js` | Tests blocking users (`/api/users/:id/block`), preventing blocked communication, and muting chat notifications (`/api/chats/:id/mute`). |
| 14 | **Admin Dashboard & Analytics** | `tests/features.test.js` | Enforces Role-Based Access Control (`requireAdmin`), rejecting non-admins with 403, and returning user, message, and storage statistics. |
| 15 | **Rate Limiting** | `tests/features.test.js` | Verifies KV sliding-window rate limiters: 30 messages/min and 10 media uploads/min, returning 429 Too Many Requests when exceeded. |

---

## 🔬 Running Individual Subtests

To test a specific feature module directly:

```bash
# Test password hashing and JWT authentication
node --test tests/crypto-jwt.test.js

# Test 15-feature suite
node --test tests/features.test.js
```

---

## 🔍 Manual Verification via REST API

You can verify the running server with `curl`:

### 1. Health Check
```bash
curl http://localhost:3000/api/health
# Response: {"status":"ok","app":"ChatLK","timestamp":...}
```

### 2. User Registration & Login
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"sam123","phone":"+94771234567","display_name":"Sam","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"sam123","password":"password123"}'
```

### 3. Smart Replies
```bash
curl http://localhost:3000/api/chats/<chatId>/suggestions \
  -H "Authorization: Bearer <TOKEN>"
# Response: {"suggestions":["Sounds good!","Understood, thanks!","I will check and let you know."]}
```

### 4. Search Messages
```bash
curl "http://localhost:3000/api/search/messages?q=Colombo" \
  -H "Authorization: Bearer <TOKEN>"
```

### 5. Admin Analytics (Admin token required)
```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## 🛡️ Linting and Code Integrity

```bash
npm run lint
```
Checks server, entry point, and environment modules for syntax errors.
