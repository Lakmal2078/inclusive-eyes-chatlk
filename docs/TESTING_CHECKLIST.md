# Testing Checklist

## Automated

- [ ] `npm run lint` clean
- [ ] `npm run build` succeeds (no warnings about missing imports or server-only modules)
- [ ] `npm run preview` serves the production build without console errors
- [ ] axe/Playwright accessibility pass on every route: zero violations

## Smoke test (every deploy)

- [ ] `/` loads with header, bottom nav, footer, correct title and favicon
- [ ] All routes render: `/deposit`, `/withdraw`, `/transactions`, `/1xbet`, `/sports`, `/casino`, `/live-bet`, `/promotions`, `/support`, `/privacy-policy`, `/login`, `/register`, `/admin`
- [ ] Deep-link refresh on a sub-route returns the page, not a 404
- [ ] No console errors or failed network requests on any page

## Auth

- [ ] Register with a new email → "check your email" message, redirect to Login
- [ ] Confirm the email → sign in works → profile is created automatically
- [ ] Wrong password → "Email or password is incorrect", no session
- [ ] Sign out → protected content and history are gone
- [ ] Non-admin at `/admin` → privileges refusal

## Deposit

- [ ] Agent accounts list loads; copy button copies the number
- [ ] Amount below minimum and above maximum both rejected with a clear message
- [ ] Missing Player ID rejected
- [ ] Valid guest submission succeeds and shows a `TXN…` reference
- [ ] Valid signed-in submission appears in `/transactions` as PENDING
- [ ] Receipt upload runs OCR, fills amount/reference, and the values are editable
- [ ] Non-image or oversized upload handled gracefully

## Withdrawal

- [ ] All required fields enforced (amount, Player ID, security code, name, bank, account number, contact number)
- [ ] Limits enforced
- [ ] Successful submission returns a reference and shows as PENDING

## Admin

- [ ] Overview stats match the request list
- [ ] Status change PENDING → APPROVED → COMPLETED persists after refresh and is visible to the user
- [ ] REJECTED works
- [ ] Add / edit / toggle-active / delete an agent account; player Deposit page reflects it
- [ ] Update WhatsApp number, limits, promo code → limits enforced immediately on the forms
- [ ] Users list shows name, Player ID, email, signup date

## Localisation and theme

- [ ] Switch to Sinhala and Tamil — all visible strings translate, no layout overflow
- [ ] `<html lang>` matches the selected language
- [ ] Dark and light themes both readable; theme persists after reload

## Accessibility (manual)

- [ ] Tab through each page: logical order, always-visible focus ring, skip link works
- [ ] Every input has a visible label; errors announced and linked to the field
- [ ] Icon-only buttons have accessible names
- [ ] Menus expose `aria-expanded`; dialogs use `role="dialog"`, trap focus, close on Escape and return focus
- [ ] One `h1` per page, no skipped heading levels
- [ ] Images have descriptive `alt`, decorative ones `alt=""`
- [ ] Status/toast messages announced via the live region
- [ ] Text contrast meets AA in both themes

## Devices

- [ ] Android Chrome (small screen, 360–430 px wide) — no horizontal scroll, tap targets ≥ 44×44
- [ ] iOS Safari — viewport height correct with the browser chrome visible
- [ ] Desktop Chrome and Firefox
- [ ] Slow 3G throttling: pages usable, OCR still completes

## Regression checks after backend changes

- [ ] Guest insert still allowed, guest read still denied
- [ ] User sees only their own transactions
- [ ] Admin reads all transactions
