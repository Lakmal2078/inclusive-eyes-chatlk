# Environment Variables

All variables live in `.env` at the project root. `VITE_*` variables are inlined into the browser bundle at build time; the rest are server-side only.

## Required

| Variable                        | Scope        | Purpose                                |
| ------------------------------- | ------------ | -------------------------------------- |
| `VITE_SUPABASE_URL`             | Browser      | Backend API base URL                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser      | Publishable (anon) key — safe to ship  |
| `VITE_SUPABASE_PROJECT_ID`      | Browser      | Backend project identifier             |
| `SUPABASE_URL`                  | Server / SSR | Same URL, used during server rendering |
| `SUPABASE_PUBLISHABLE_KEY`      | Server / SSR | Same publishable key for SSR reads     |
| `SUPABASE_PROJECT_ID`           | Server / SSR | Backend project identifier             |

## Optional

| Variable       | Scope      | Purpose                                                                                   |
| -------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `VITE_APP_URL` | Browser    | Absolute site URL used for `og:image` / `twitter:image`. Set it to the production domain. |
| `PORT`         | Dev/server | Overrides the default port 8080                                                           |
| `NODE_OPTIONS` | Build      | e.g. `--max-old-space-size=2048` on low-memory devices                                    |

## Example `.env`

```dotenv
VITE_SUPABASE_URL="https://<project>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxxxxxxxxxxxxxxxxxxx"
VITE_SUPABASE_PROJECT_ID="<project>"
SUPABASE_URL="https://<project>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxxxxxxxxxxxxxxxxxxx"
SUPABASE_PROJECT_ID="<project>"
VITE_APP_URL="https://inclusive-eyes.lovable.app"
```

## Rules

- Never put a secret key in a `VITE_*` variable — anything `VITE_*` is public.
- The service-role key and database password are **not available** on Lovable Cloud; nothing in this app needs them. Never add a placeholder value for them.
- `.env` is generated/managed for Lovable Cloud projects — edit backend keys through the platform, not by hand.
- After changing any variable, restart the dev server (Vite reads `.env` at startup) and rebuild before deploying.
- Values that must change per environment: `VITE_APP_URL` only. Everything else points at the same backend across local, preview and production.

## Application settings that are _not_ env vars

WhatsApp number, min/max transaction amount and the promo code are stored in the `app_settings` database row and edited from the admin portal, so they can change without a redeploy. Defaults if the row is missing: `+94765865387`, 1,000, 500,000, `VGSL`.
