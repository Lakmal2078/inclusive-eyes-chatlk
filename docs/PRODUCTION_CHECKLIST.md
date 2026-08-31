# Production Checklist

## Before the first launch

**Content and branding**

- [ ] Agent bank/wallet accounts in the admin portal are real, active and verified digit by digit
- [ ] WhatsApp number reaches a monitored device
- [ ] Min/max transaction limits match the current agent policy
- [ ] Promo code current
- [ ] Privacy policy, 18+ notice and responsible-gambling text reviewed
- [ ] Favicon and social share banner show Fast Cash branding

**Configuration**

- [ ] `VITE_APP_URL` set to the production domain
- [ ] All required env vars present at build and runtime (see ENVIRONMENT.md)
- [ ] Email confirmation enabled; confirmation links point at the production domain

**Quality gates**

- [ ] SECURITY_CHECKLIST.md complete
- [ ] TESTING_CHECKLIST.md complete on the production build
- [ ] Build and lint clean
- [ ] Backups verified, one restore drill done (BACKUP.md)

**SEO and metadata**

- [ ] Every route has a unique title (< 60 chars) and description (< 160 chars)
- [ ] One `h1` per page; semantic landmarks present
- [ ] `robots.txt` correct; `/admin` marked `noindex`
- [ ] Canonical URLs on the production domain
- [ ] Link preview renders correctly in WhatsApp

**Performance**

- [ ] Images sized and lazy-loaded
- [ ] Tesseract loads only when a receipt is uploaded, not on page load
- [ ] First load acceptable on 3G on a mid-range Android phone

## Deploy

- [ ] Announce a short maintenance window if a migration is involved
- [ ] Take a fresh database export
- [ ] Apply migrations (forward-only)
- [ ] Publish / deploy the frontend
- [ ] Run the smoke test list against the live URL

## Immediately after deploy

- [ ] Submit one real small-value deposit end to end, approve it, confirm the player sees COMPLETED
- [ ] Register a throwaway account, confirm the email flow, then remove it
- [ ] Check console and network for errors on the live site
- [ ] Confirm admin sign-in works for every admin account

## Ongoing operations

**Daily**

- [ ] Clear pending requests; oldest first
- [ ] Reconcile approved deposits against agent account statements
- [ ] Scan for errors reported by users on WhatsApp

**Weekly**

- [ ] Database export stored in two places
- [ ] Review the admin list in `user_roles`
- [ ] Review rejected/duplicate request patterns for fraud

**Monthly**

- [ ] Dependency and security scan; patch advisories
- [ ] Accessibility pass on any changed page
- [ ] Restore drill into a scratch database (quarterly at minimum)

## Rollback plan

1. Re-publish the previous version (Lovable history) or redeploy the previous artifact.
2. If data is wrong, restore into a new database first and copy corrected rows back — never overwrite live as a first step.
3. Notify pending users on WhatsApp with their reference numbers.
4. Record the incident: cause, fix, and the check added to prevent a repeat.
