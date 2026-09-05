# ChatLK — Cloudflare Workers Deployment Guide

This guide describes how to deploy **ChatLK** to Cloudflare Workers using the Cloudflare CLI (`wrangler`).

---

## 🏗️ Architecture & Cloudflare Bindings

| Binding Name | Resource Type | Identifier / Details |
|---|---|---|
| `DB` | Cloudflare D1 | Database ID: `bead94cf-542e-407e-a6d5-ea77d0b08342` |
| `CACHE` | Cloudflare KV | Namespace ID: `eacaab54753d4c6b9b17033350ab9bf3` |
| `MEDIA` | Cloudflare R2 | Bucket Name: `chat-media` |
| `CHAT_ROOM` | Durable Objects | Class: `ChatRoom`, Namespace ID: `a58808d02cf044e78633a505b0d38332` |
| `AI` | Workers AI | Models: `@cf/meta/m2m100-1.2b`, `@cf/meta/llama-3.1-8b-instruct` |

---

## 📋 Prerequisites

1. **Node.js** 20+ installed
2. **Cloudflare Account** with Workers Paid (required for Durable Objects and Workers AI)
3. **Wrangler CLI** installed (`npm install -g wrangler` or use local `npx wrangler`)
4. Authenticate wrangler:
   ```bash
   npx wrangler login
   ```

---

## ⚙️ Step 1: Verify Configuration

Review `wrangler.toml` in the project root:

```toml
name = "chatlk"
main = "src/index.js"
compatibility_date = "2026-09-04"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "chat-db"
database_id = "bead94cf-542e-407e-a6d5-ea77d0b08342"
migrations_dir = "migrations"

[[kv_namespaces]]
binding = "CACHE"
id = "eacaab54753d4c6b9b17033350ab9bf3"

[[r2_buckets]]
binding = "MEDIA"
bucket_name = "chat-media"

[[durable_objects.bindings]]
name = "CHAT_ROOM"
class_name = "ChatRoom"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["ChatRoom"]

[ai]
binding = "AI"

[vars]
APP_NAME = "ChatLK"
SUPPORTED_LANGUAGES = "si,ta,en"
MAX_FILE_SIZE_MB = "100"
PREMIUM_MAX_FILE_SIZE_MB = "500"
CORS_ORIGIN = "*"
VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnmpGzU8="
```

---

## 🔑 Step 2: Set Secrets in Cloudflare Workers

Store sensitive credentials securely using Wrangler Secrets:

```bash
# JWT Secret for authentication tokens
npx wrangler secret put JWT_SECRET
# Enter your random 64-character secret when prompted

# (Optional) VAPID Private Key for Web Push dispatch
npx wrangler secret put VAPID_PRIVATE_KEY
```

---

## 🗄️ Step 3: Run D1 Database Migrations

Apply database schemas idempotently across the production D1 database:

```bash
# Apply all 16 migrations to Cloudflare D1
npx wrangler d1 migrations apply chat-db --remote

# Verify tables exist
npx wrangler d1 execute chat-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 🚀 Step 4: Build and Deploy

```bash
# 1. Sync frontend assets into JS bundle
npm run build

# 2. Deploy the Worker to Cloudflare
npx wrangler deploy
```

Once deployed, Wrangler provides your public worker URL (e.g. `https://chatlk.<your-subdomain>.workers.dev`).

---

## 🌍 Step 5: Custom Domain Setup (Optional)

To route a custom domain (e.g., `chat.example.com`):

```bash
npx wrangler custom-domain add chat.example.com
```
Or configure it in the Cloudflare Dashboard under **Workers & Pages → chatlk → Settings → Domains & Routes**.

---

## 🩺 Post-Deployment Health Check

Confirm all bindings and services are operational:

```bash
# Check service health
curl -s https://chatlk.<your-subdomain>.workers.dev/api/health
```

Expected response:
```json
{"status":"ok","app":"ChatLK","timestamp":1725530000000}
```

---

## 🔄 Staging Deployment

To deploy to the staging environment configured in `wrangler.toml`:

```bash
npx wrangler d1 migrations apply chat-db --env staging --remote
npx wrangler deploy --env staging
```
