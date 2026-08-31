# Import Fast Cash, then fix accessibility

The upload is a standalone React app with an Express server and a JSON-file data store (users, transactions, bank details, support requests, promotions), JWT cookie auth, and in-browser Tesseract OCR. This project runs on TanStack Start with an edge server runtime, so the Express server and file store cannot be copied over — the backend gets rebuilt on Lovable Cloud (database + auth), and the UI is split into real routes.

## Phase 1 — Bring the app in

Routing (today everything is one 1,780-line file switching pages by hash/localStorage):

- `/` Home, `/deposit`, `/withdraw`, `/transactions`, `/1xbet`, `/sports`, `/casino`, `/live-bet`, `/promotions`, `/privacy-policy`, `/support`, `/admin`, `/auth`
- Shared header, bottom/primary nav, "More" menu, language switcher and footer move into the root layout so they render on every page
- Each page keeps its own `head()` title/description; the three-language translation file is reused as-is

Backend on Lovable Cloud:

- Auth (email/password sign-up, sign-in, sign-out, session) replaces the JWT-cookie Express routes
- Tables for transactions (deposit/withdrawal requests), bank details, support requests, promotions, plus a separate roles table so admin access is verified server-side (never from the browser)
- Row-level security: users see only their own transactions; admin-only reads/writes for the admin panel
- Config and the rule-based support chat reply move into server functions
- Receipt OCR stays in the browser (Tesseract) — no server dependency

Not carried over: the Express server, the JSON file store, rate-limit/helmet middleware (handled by the platform), and demo data files. Existing accounts in the JSON store are not migrated.

## Phase 2 — Accessibility audit and fixes

Shared layout and reusable components first (nav, More menu, modals, language switcher, toasts, form fields), then Home, Deposit, Withdraw, Transactions/Support, Receipt Scanner, OCR Review, Admin Panel.

Fixes applied:

- `lang` on `<html>`, updated per selected language (en/si/ta)
- One `<h1>` per page, no skipped heading levels; a single `<main>` landmark in the layout, `<nav>` with accessible names
- Every input, select and textarea tied to a `<label>`; error text linked with `aria-describedby` and `aria-invalid`; status/toast messages in an `aria-live` region
- `aria-label` on icon-only and emoji-only buttons (nav items, close, copy, upload, delete); emoji marked `aria-hidden` so labels read cleanly
- Menus and dropdowns get `aria-expanded`, `aria-controls`; modals get `role="dialog"`, `aria-modal`, a labelled title, Escape to close, focus trap and focus return
- Visible `:focus-visible` rings on all interactive elements using theme tokens
- Descriptive `alt` on images (receipt previews, logos), `alt=""` for decorative ones
- Tap targets at least 44x44 on mobile, `h-dvh` instead of `h-screen`
- Status conveyed by text/icon in addition to colour (transaction states, OCR confidence)

## Technical notes

- Page components port from `.jsx` to `.tsx` route files; the existing `styles.css` design system is merged into `src/styles.css` as theme tokens (no hardcoded colour utilities in components).
- `fetch('/api/...')` calls are replaced with `createServerFn` calls or direct Cloud queries; `OcrReview`/`ReceiptScanner` keep Tesseract behind a client-only boundary since it needs browser APIs.
- Admin checks use a server-side role lookup, not a client flag.

## Sequencing

Phase 1 is the bulk of the work and is done first, page by page, with accessibility rules applied as each page lands; Phase 2 then does a full sweep and a final audit pass over every screen, including the admin panel.
