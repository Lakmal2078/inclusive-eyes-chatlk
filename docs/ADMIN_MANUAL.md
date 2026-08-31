# Admin Manual

## Signing in

1. Go to `/admin`.
2. Sign in with an account that has the `admin` role.
3. Accounts without the role see "You do not have Administrator privileges".

Current admin accounts: `lakmalsujith25@gmail.com`, `djimini4plus@gmail.com`.

### Granting admin to a new person

1. The person registers normally at `/register` and confirms their email.
2. Ask the developer/owner to add an `admin` row for that user in the `user_roles` table (database-only, on purpose — the role cannot be granted from the UI, which is what prevents privilege escalation).
3. The person signs out and back in; the role is read at sign-in.

Revoking: delete their `admin` row in `user_roles`. They lose access on next sign-in.

## Dashboard

The overview shows: total users, total requests, pending, completed, deposits, withdrawals — plus the full request list, newest first.

## Processing requests

Each request row shows type, reference, amount, Player ID, and the details the player submitted (receipt reference/image for deposits; security code, name, bank, account number, contact number for withdrawals).

**Deposit workflow**

1. Open the request and read the receipt reference / receipt image.
2. Verify the payment landed in the agent account named on the request.
3. Credit the player's 1xBet account.
4. Set the status to **APPROVED** (or **COMPLETED** once credited). Use **REJECTED** if the payment cannot be found.

**Withdrawal workflow**

1. Verify the security code in the 1xBet agent tool.
2. Pay out to the bank account and number on the request. Re-read the account number against the player's name before paying.
3. Set the status to **APPROVED** / **COMPLETED**, or **REJECTED** with the reason communicated on WhatsApp.

Statuses are visible to the player on `/transactions`, so update them promptly. Status is conveyed by text as well as colour.

## Agent bank accounts

In the bank details section you can:

- Add an account: name, number, icon (emoji), type (BANK or WALLET)
- Edit name/number
- Toggle **active** — inactive accounts disappear from the player Deposit page instead of being deleted
- Delete an account (permanent; prefer deactivating so old requests stay readable)
- Reorder — the display order on the Deposit page follows the list order

Double-check every digit of an account number. A wrong number sends player money to the wrong place.

## System settings

- **WhatsApp number** — used by the support button and quick-contact modal (international format, e.g. `+94765865387`)
- **Minimum / maximum transaction** — enforced on both deposits and withdrawals
- **Promo code** — shown on the promotions page

Changes take effect immediately; no redeploy needed.

## Users

The users list shows full name, Player ID, email and signup date. There is no password access — ask users to use the password reset flow.

## Daily routine

1. Clear pending requests oldest first.
2. Confirm each agent account balance matches approved deposits.
3. Confirm active agent accounts are correct and reachable.
4. Watch for duplicate references or repeated rejected attempts from one Player ID and escalate.

## Escalation and don'ts

- Never share the admin credentials or reuse them elsewhere; enable a password manager entry per admin.
- Never approve a request based on a screenshot alone — always confirm in the bank/wallet statement.
- Never paste player bank details or security codes into chat groups.
- Suspected fraud: reject, keep the record, and report to the owner.
