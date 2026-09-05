# Installation Guide

## Requirements

- Node.js 20 or newer (`node --version`)
- npm 10+ (or Bun 1.1+)
- Internet access
- Cloudflare account access for remote development and deployment

## 1. Get the code

From the ZIP export:

```bash
unzip fast-cash-project.zip -d fast-cash
cd fast-cash
```

Or from Git:

```bash
git clone <your-repo-url> fast-cash
cd fast-cash
```

## 2. Install dependencies

```bash
npm install
# npm install --legacy-peer-deps   # if peer-dependency errors appear
# bun install                      # faster alternative
```

## 3. Configure environment

The export already contains a working `.env`. If it is missing, create one — see [ENVIRONMENT.md](ENVIRONMENT.md) for the exact keys.

## 4. Run the dev server

```bash
npm run dev
```

Open the URL printed by Wrangler. For a local Worker, use `npm run dev:local`.

## 5. Run the production build locally

```bash
npm run build
npm start
```

Open the URL printed in the terminal (usually `http://localhost:8787` for the Wrangler preview server).
Use `wrangler dev --cwd ./dist --port 3000` to change the preview port.

## 6. Verify the install

- Home page loads with header, bottom nav and footer
- `/deposit` shows agent accounts (proves the database read works)
- `/register` creates an account and shows the "confirm your email" message
- `/admin` asks for admin credentials

## Running in Termux or Ubuntu inside proot-distro (Android)

Wrangler's local runtime and its remote preview proxy can crash on
Android/Termux while allocating a 1 GiB virtual-memory region. The reported
`FATAL ERROR: Out of memory` followed by `write EPIPE` is that runtime failure;
it is not caused by the missing `.env.local` warning. This project therefore
uses a no-bundle Cloudflare deployment by default on Termux, avoiding the
preview process on the phone.

Install Termux from [F-Droid](https://f-droid.org/packages/com.termux/) or the
official Termux source. For a native Termux shell, run:

```bash
pkg update -y
pkg install -y git
git clone https://github.com/Lakmal2078/inclusive-eyes-chatlk.git
cd inclusive-eyes-chatlk
npm run setup:termux
npm run dev:termux
```

If you use Ubuntu through `proot-distro`, enter Ubuntu first and run the same
project commands there. The setup script automatically detects Ubuntu and
uses `apt` instead of Termux's `pkg`:

```bash
proot-distro login ubuntu
cd ~/inclusive-eyes-chatlk
npm run setup:termux
npm run dev:termux
```

If the repository is not yet inside Ubuntu, clone it after entering Ubuntu:

```bash
apt update && apt install -y git
git clone https://github.com/Lakmal2078/inclusive-eyes-chatlk.git
cd inclusive-eyes-chatlk
npm run setup:termux
npm run dev:termux
```

The setup script installs Node.js LTS, creates a random `.dev.vars` file, and
runs the tests. The first `npm run dev:termux` may open a Cloudflare login
flow. Complete it, then open the deployed Worker URL Wrangler prints. Each
subsequent run updates the remote Worker; this is not a local-only server.

The Android-safe deployment needs real Cloudflare resources configured in `wrangler.toml`
(D1, KV, R2, and Durable Objects). It is the recommended mode for a phone. On
a normal Linux/macOS computer, local development remains available with:

```bash
npm run dev:local
```

Do not use `npm install --ignore-scripts` for this project: Wrangler's
platform runtime is installed through npm optional dependencies.

## Troubleshooting

| Symptom                                    | Fix                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `FATAL ERROR: Out of memory` / `write EPIPE` in Termux | Pull the latest code and use `npm run dev:termux`; do not use `npm run dev:local` or `wrangler dev --remote` on Android |
| Wrangler asks you to log in                 | Complete the Cloudflare login in the shown URL, then rerun the command |
| Remote bindings are missing                 | Replace placeholder D1/KV IDs and create the R2 bucket; see `README.md` |
| `Missing .dev.vars`                          | Run `npm run setup:termux` or create `JWT_SECRET=...` in `.dev.vars` |
| Port already in use                         | Pass another port: `npm run dev:termux -- --port 8788` |
