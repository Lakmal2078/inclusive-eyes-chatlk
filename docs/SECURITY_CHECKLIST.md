# Security Checklist

Run through this before launch and after any change to auth, roles, or database policies.

## Authentication

- [ ] Email + password sign-up works; email confirmation is enabled (no auto-confirm)
- [ ] Anonymous sign-ups are disabled
- [ ] Password reset flow works and links to the production domain
- [ ] Sign-out clears the session on the device
- [ ] OAuth redirect URLs (if enabled) point at a same-origin public URL, never straight at `/admin`

## Authorization

- [ ] Roles live in `user_roles`, never on `profiles` or a user table column
- [ ] `has_role()` is `security definer` with a fixed `search_path`, and is not executable by the public role
- [ ] Admin status is checked server-side on every admin read/write — never from localStorage, a client flag, or a hardcoded email
- [ ] A non-admin account hitting `/admin` sees a refusal and no data in the network responses
- [ ] Removing a user's `admin` row revokes access on next sign-in

## Database

- [ ] RLS is enabled on `profiles`, `user_roles`, `transactions`, `bank_accounts`, `app_settings`
- [ ] Every public table has explicit `GRANT`s matching its policies (`authenticated`, `service_role`, `anon` only where a policy allows anon)
- [ ] A signed-in user can read only their own transactions and profile
- [ ] Guests can insert a transaction but cannot read any transaction back
- [ ] `bank_accounts` and `app_settings` are readable publicly but writable only by admins
- [ ] No policy uses `USING (true)` on a table that holds personal or financial data

## Secrets

- [ ] Only publishable keys appear in `VITE_*` variables or client code
- [ ] No service-role key or database password anywhere in the repo, logs, or docs
- [ ] Nothing logs receipt images, security codes, bank account numbers, or tokens
- [ ] `.env` is not committed with private values

## Input handling

- [ ] Amount, Player ID and limits validated before insert; non-numeric and out-of-range amounts rejected
- [ ] Uploaded receipts are size- and type-checked; OCR runs in the browser only
- [ ] No user-supplied HTML is rendered with `dangerouslySetInnerHTML`
- [ ] Support chat replies are rule-based and never echo account data

## Transport and headers

- [ ] Site is HTTPS-only, including the custom domain
- [ ] `og:image` / favicon URLs are absolute HTTPS
- [ ] No mixed-content requests in the console

## Operational

- [ ] Admin accounts use unique strong passwords stored in a password manager
- [ ] Admin list reviewed — every `admin` row belongs to a current staff member
- [ ] Backups verified and encrypted (see BACKUP.md)
- [ ] Security linter run with zero unexplained warnings
- [ ] Dependency scan run; no known-critical advisories left unresolved

## Accepted design decisions

- Guests may submit deposit/withdraw requests without an account (business requirement); they get insert-only access and no read access.
- `bank_accounts` and `app_settings` are intentionally world-readable — they are the public agent contact details already shown on the site.
