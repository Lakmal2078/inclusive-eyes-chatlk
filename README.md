# Fast Cash

Fast Cash is a multilingual deposit and withdrawal payment-support portal for 1xBet players in Sri Lanka. Users can submit deposit or withdrawal requests, attach payment receipts, review transaction status, contact an agent, and use the browser-based receipt scanner. Authorized administrators can manage payment accounts, system settings, users, and transaction requests from the protected admin dashboard.

> **Important:** Fast Cash is an independent payment-support portal. It is not the 1xBet platform, does not provide betting odds or account balances, and must not request or store a user's 1xBet password or security credentials. The service is intended for users aged 18 and above.

**Live application:** [https://inclusive-eyes.lovable.app](https://inclusive-eyes.lovable.app)

## Contents

- [Features](#features)
- [Technology](#technology)
- [Application routes](#application-routes)
- [Project structure](#project-structure)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Environment configuration](#environment-configuration)
- [Available scripts](#available-scripts)
- [User and admin workflows](#user-and-admin-workflows)
- [PWA installation](#pwa-installation)
- [Testing and verification](#testing-and-verification)
- [Deployment](#deployment)
- [Termux and proot-distro](#termux-and-proot-distro)
- [Troubleshooting](#troubleshooting)
- [Security and operational notes](#security-and-operational-notes)
- [Documentation](#documentation)

## Features

| Area | Current behavior |
| --- | --- |
| Deposit requests | Displays active agent bank or payment accounts, validates amount limits, accepts Player ID and payment method, and optionally attaches a receipt image. |
| Withdrawal requests | Collects Player ID, security code, recipient bank details, amount, and contact information for agent review. |
| Receipt OCR | Uses Tesseract.js in the browser to detect receipt amount and reference details; no OCR server is required. |
| Transaction history | Authenticated users can review their own requests and statuses such as `PENDING`, `APPROVED`, `COMPLETED`, `REJECTED`, `CANCELLED`, and `PROCESSING`. |
| Authentication | Email and password registration and login are backed by Supabase Auth. Email confirmation may be required by the backend configuration. |
| Admin dashboard | Server-authorized administrators can view overview statistics, process transactions, manage agent payment accounts, edit system settings, and review users. |
| Support | Includes a rule-based support assistant, FAQ content, WhatsApp contact actions, promotional information, privacy policy, and responsible-gambling notices. |
| Languages and theme | Supports English, සිංහල, and தமிழ், together with dark and light themes. The selected language is synchronized with the document language. |
| Responsive layout | Uses CSS Grid and Flexbox for desktop, tablet, and mobile layouts. Admin tabs use equal-width columns on larger screens and uniform stacking on narrow screens. |
| Progressive Web App | Includes a web manifest, service worker, install icons, offline shell caching, and browser-specific installation guidance. |
| Accessibility | Includes labelled form fields, keyboard focus indicators, skip navigation, ARIA attributes for menus and dialogs, and responsive controls with usable touch targets. |

## Technology

| Layer | Technology |
| --- | --- |
| UI framework | React 19 with TanStack Start v1 and TanStack Router file-based routes |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 plus the application stylesheet at `src/fastcash.css` |
| Backend | Supabase-compatible backend with Postgres, Auth, Row Level Security, and server-side API handlers |
| Browser OCR | Tesseract.js |
| Server runtime | Nitro output with Wrangler/Cloudflare-compatible worker configuration |
| Package manager | npm; Bun can also be used when supported by the environment |
| PWA assets | `public/manifest.webmanifest`, `public/sw.js`, and `public/icon-192.png` / `public/icon-512.png` |

## Application routes

The application uses TanStack Router. Each route file is located in `src/routes/` and is also available through the corresponding URL path.

| Path | Purpose | Access |
| --- | --- | --- |
| `/` | Home page, feature cards, 1xBet information, privacy summary, and responsible-gambling notice | Public |
| `/deposit` | Deposit request form and active agent payment accounts | Public form; authentication may be used for history |
| `/withdraw` | Withdrawal request form | Public form; authentication may be used for history |
| `/transactions` | User transaction history and status | Authenticated user data |
| `/1xbet` | 1xBet account and Player ID guide | Public |
| `/sports` | Sports betting payment-support guide | Public |
| `/live-bet` | Live betting payment-support guide | Public |
| `/casino` | Casino and slots payment-support guide | Public |
| `/promotions` | Promotions and agent promo-code information | Public |
| `/support` | Support assistant, FAQ, and agent contact details | Public |
| `/privacy-policy` | Full privacy policy | Public |
| `/login` | User account login | Public |
| `/register` | User account registration | Public |
| `/admin` | Administrator login and dashboard | Admin role required for dashboard data |

## Project structure

```text
src/
├── components/fastcash/
│   ├── AdminPanel.jsx       # Admin login and dashboard interface
│   ├── pages.jsx            # Shared pages, header, drawer, cards, forms, and PWA banner
│   └── ReceiptScanner.jsx   # Browser receipt OCR component
├── integrations/supabase/   # Supabase client and authentication integration
├── lib/fastcash/
│   ├── api.ts               # Frontend API/data access helper
│   ├── FastCashContext.tsx  # Shared navigation, session, theme, and form state
│   └── translations.js      # English, Sinhala, and Tamil translations
├── routes/                  # TanStack Router route files
├── fastcash.css             # Fast Cash design tokens and responsive layout rules
├── styles.css               # Tailwind and global styles
├── router.tsx               # Router setup
└── start.ts                 # TanStack Start middleware and server setup
public/
├── manifest.webmanifest     # PWA metadata
├── sw.js                    # PWA service worker
├── icon-192.png             # PWA install icon
├── icon-512.png             # PWA install icon
├── favicon.png              # Browser favicon
├── og-image.png             # Social sharing image
└── robots.txt
supabase/
└── migrations/              # Database schema and policy migrations
docs/                        # Operational, API, installation, and security guides
```

## Requirements

Use **Node.js 20 or newer** and npm 10 or newer. The application also needs internet access because the frontend communicates with the configured Supabase-compatible backend and Tesseract.js may download OCR language data in the browser. A provisioned Lovable Cloud or Supabase-compatible backend is required for authentication, data access, and administrator authorization.

Check the installed versions before starting:

```bash
node --version
npm --version
```

## Local setup

From a ZIP export, extract the project and enter the project directory:

```bash
unzip fast-cash-project.zip -d fast-cash
cd fast-cash
```

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The development server normally runs at [http://localhost:8080](http://localhost:8080). The port can be changed with an environment variable:

```bash
PORT=3000 npm run dev
```

For a production-style local preview, build first and then start the generated Nitro/Wrangler server:

```bash
npm run build
npm start
```

The preview server normally uses port `8787`. The terminal output is the authority if the configured runtime selects another port.

## Environment configuration

Create `.env` in the project root when it is not already supplied by the deployment platform. The complete example is in [`.env.example`](.env.example), and the detailed reference is [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Supabase backend URL exposed to the client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Publishable/anonymous key exposed to the client |
| `VITE_SUPABASE_PROJECT_ID` | Browser | Supabase project identifier |
| `SUPABASE_URL` | Server and SSR | Backend URL for server-side rendering and handlers |
| `SUPABASE_PUBLISHABLE_KEY` | Server and SSR | Publishable key for server-side reads |
| `SUPABASE_PROJECT_ID` | Server and SSR | Backend project identifier |
| `VITE_APP_URL` | Optional browser value | Absolute production URL used for social image metadata |
| `PORT` | Optional runtime value | Development server port override |
| `NODE_OPTIONS` | Optional build value | Memory override for constrained devices |

Never place service-role keys, database passwords, or other secrets in a `VITE_*` variable. Anything prefixed with `VITE_` is bundled into browser code. After changing `.env`, restart the development server and rebuild before testing the change.

WhatsApp number, transaction limits, and the promo code are application settings stored in the backend and managed from the admin portal. They are not environment variables. The documented defaults are WhatsApp `+94765865387`, minimum transaction `1,000`, maximum transaction `500,000`, and promo code `VGSL` when the settings row is absent.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server, normally on port `8080`. |
| `npm run build` | Create the production client and Nitro server output. |
| `npm run build:dev` | Create a development-mode Vite build. |
| `npm start` | Run the generated production preview through Wrangler using `.output/server/wrangler.json`. |
| `npm run preview` | Alias for `npm start`. |
| `npm run lint` | Run the repository ESLint configuration. |
| `npm run format` | Format project files with Prettier. |

## User and admin workflows

A user may browse the public pages without signing in. Deposit and withdrawal requests are submitted through their respective forms, and authenticated users can later view their own transaction history. An uploaded receipt remains associated with the request according to the configured backend implementation. Users should never submit their 1xBet password, one-time password, or unrelated security credentials to this portal.

Administrators sign in at `/admin`. The backend derives the administrator role from the protected `user_roles` data and checks authorization on admin reads and writes. The dashboard contains four tabs: **Bank & Payment Accounts**, **Transactions**, **System Settings**, and **Stats Overview**. These tabs use an equal-width responsive grid on desktop, a two-column grid on medium screens, and a single-column stack on narrow mobile screens.

To grant administrator access, create the user normally and add the appropriate `admin` role through the controlled backend process described in [`docs/ADMIN_MANUAL.md`](docs/ADMIN_MANUAL.md). Do not add a client-side role flag or hardcode an administrator email in the frontend.

## PWA installation

The project includes the three requirements needed for browser installation: a web manifest, install icons, and a registered service worker. The root layout registers `/sw.js`, and the manifest is linked from the document head.

On browsers that support `beforeinstallprompt`, the **Install App** button opens the native installation prompt. On iOS and browsers that do not expose that event, the button displays the correct browser-menu or **Add to Home Screen** guidance instead of silently doing nothing. Installation generally requires a secure HTTPS deployment or a local development origin supported by the browser.

When testing a new deployment, clear any previous site data or wait for the service-worker update if an older cached bundle is still displayed. The service-worker cache version is intentionally bumped when the application shell changes.

## Testing and verification

After editing the application, run the production build:

```bash
npm run build
```

Then verify the main routes, authentication, request submission, admin authorization, responsive layouts, and PWA assets. The project checklists provide the detailed acceptance criteria:

- [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) contains smoke, authentication, deposit, withdrawal, admin, security, and responsive checks.
- [`docs/PRODUCTION_CHECKLIST.md`](docs/PRODUCTION_CHECKLIST.md) covers production content, deployment, performance, and end-to-end verification.
- [`docs/SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md) covers role authorization, Row Level Security, secrets, and operational controls.

The build must complete with `✓ built`. Run `npm run lint` as part of review and resolve any reported findings before release. For OCR testing, use a clear receipt image and confirm that the browser is allowed to load the Tesseract language data.

## Deployment

For Lovable Cloud deployments, keep the project connected to its configured backend and use the platform's deployment workflow. For a Cloudflare-compatible deployment, build the project and deploy the generated Nitro/Wrangler output according to [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Set `VITE_APP_URL` to the final HTTPS domain so Open Graph and Twitter image metadata use the correct origin.

Before a production release, confirm that the backend migrations are applied, Row Level Security policies are active, administrator access is verified, agent payment accounts are correct digit by digit, and the WhatsApp contact reaches a monitored device. Never use production credentials in screenshots, source control, public issue reports, or test fixtures.

## Termux and proot-distro

Inside a Termux Ubuntu or `proot-distro` Ubuntu environment, the project can be run with the same npm commands after Node.js and unzip are available:

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git unzip -y
termux-setup-storage

cd /root
unzip /root/storage/Download/FastCash-admin-tabs-fixed.zip -d inclusive
cd /root/inclusive
npm install --legacy-peer-deps
npm run dev
```

If the project already exists and only selected files are being updated, copy only the files supplied with the update ZIP and keep a backup of the existing files. Do not delete the existing project directory, `.env`, Supabase migrations, or unrelated source files. The development site can then be opened at [http://localhost:8080](http://localhost:8080) from the phone browser.

On low-memory devices, use the following build command:

```bash
NODE_OPTIONS=--max-old-space-size=2048 npm run build
```

## Troubleshooting

| Symptom | Recommended action |
| --- | --- |
| `Missing Supabase environment variable(s)` | Confirm the required keys in `.env`, check spelling, and restart the dev server. |
| `Failed to fetch` during login or request submission | Check internet access, backend availability, firewall/VPN settings, and Supabase configuration. |
| Port already in use | Run `PORT=3000 npm run dev` and open the new port. |
| Build runs out of memory | Set `NODE_OPTIONS=--max-old-space-size=2048` before `npm run build`. |
| OCR does not finish | Use a smaller, clearer image, keep the browser tab active, and confirm that OCR language data can load. |
| Install button shows instructions instead of a native prompt | This is expected when the browser does not expose `beforeinstallprompt`; use the displayed browser-menu instructions. |
| Old layout remains after deployment | Refresh after the service-worker update, clear site data during testing, or unregister the old service worker in browser developer tools. |
| Blank page after local edits | Stop the server, remove `node_modules/.vite`, reinstall dependencies if necessary, and restart. |

## Security and operational notes

Admin authorization is a server-side concern. The frontend must not decide whether a user is an administrator based on local storage, a hardcoded email, or a client-only flag. Keep Row Level Security enabled for profiles, roles, transactions, bank accounts, and application settings. Review the role table and payment account details regularly.

Treat receipts, bank details, contact numbers, security codes, and transaction records as sensitive information. Use HTTPS in production, avoid logging personal or financial data, and retain only the data required for the service and its audit process. Follow the backup, recovery, and incident procedures in [`docs/BACKUP.md`](docs/BACKUP.md).

## Documentation

| Guide | Coverage |
| --- | --- |
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md) | Detailed setup, Termux commands, verification, and troubleshooting |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment and rollback guidance |
| [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) | Environment variables and configuration rules |
| [`docs/API.md`](docs/API.md) | API endpoints, request payloads, responses, and data model |
| [`docs/ADMIN_MANUAL.md`](docs/ADMIN_MANUAL.md) | Administrator sign-in, dashboard operation, and role management |
| [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md) | User-facing deposit, withdrawal, account, and support workflows |
| [`docs/BACKUP.md`](docs/BACKUP.md) | Backup, restore, and recovery procedures |
| [`docs/SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md) | Security acceptance checks |
| [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md) | Functional and regression test checklist |
| [`docs/PRODUCTION_CHECKLIST.md`](docs/PRODUCTION_CHECKLIST.md) | Production readiness checklist |

Maintained for the Fast Cash project.
