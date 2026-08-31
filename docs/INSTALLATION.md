# Installation Guide

## Requirements

- Node.js 20 or newer (`node --version`)
- npm 10+ (or Bun 1.1+)
- A Lovable Cloud backend (already provisioned for this project) or your own Postgres/Supabase-compatible backend
- Internet access — the frontend talks directly to the hosted backend

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

Open http://localhost:8080

Change the port with `PORT=3000 npm run dev`.

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

## Running in Termux (Android)

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git unzip -y
termux-setup-storage
cd ~ && cp /sdcard/Download/fast-cash-project.zip .
unzip fast-cash-project.zip -d fast-cash && cd fast-cash
npm install --legacy-peer-deps
npm run dev
```

Then open http://localhost:8080 in the phone browser.

## Troubleshooting

| Symptom                                    | Fix                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `Missing Supabase environment variable(s)` | `.env` missing or misspelled keys — see ENVIRONMENT.md, then restart dev server        |
| `Failed to fetch` on register/deposit      | No internet or a firewall/VPN blocking the backend domain                              |
| Build runs out of memory                   | `NODE_OPTIONS=--max-old-space-size=2048 npm run build`                                 |
| Port already in use                        | `PORT=3000 npm run dev`                                                                |
| OCR never finishes                         | Tesseract needs a browser; check the tab is not throttled and the image is under ~5 MB |
| Blank page after edits                     | Stop the dev server, delete `node_modules/.vite`, restart                              |
