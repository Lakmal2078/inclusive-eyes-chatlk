# API Documentation

Fast Cash has no custom HTTP backend. The UI calls a single typed bridge, `api(url, options)` in `src/lib/fastcash/api.ts`, which keeps the original Express-style URLs but executes each call against Lovable Cloud (Postgres + Auth) with row-level security enforced per request.

```ts
import { api } from "@/lib/fastcash/api";

const { transactions } = await api("/api/transactions");
await api("/api/deposits", { method: "POST", body: JSON.stringify(payload) });
```

Errors throw an `Error` with an extra `status` property (`400`, `401`, `403`, `503`).

## Endpoints

### Config

| Call              | Returns                                                         |
| ----------------- | --------------------------------------------------------------- |
| `GET /api/config` | `{ whatsappNumber, minTransaction, maxTransaction, promoCode }` |

### Auth

| Call                      | Body                                       | Returns                                                                                                 |
| ------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `GET /api/auth/me`        | —                                          | `{ user }` or `{ user: null }`                                                                          |
| `POST /api/auth/login`    | `{ email, password }`                      | `{ user }`; throws 401 on bad credentials                                                               |
| `POST /api/auth/register` | `{ email, password, fullName, playerId? }` | `{ user }`, or `{ user: null, pendingConfirmation: true, message }` when email confirmation is required |
| `POST /api/auth/logout`   | —                                          | `{}`                                                                                                    |

`user` shape: `{ id, email, fullName, playerId, role: "ADMIN" | "USER" }`. The role is derived from the server-side `user_roles` table — never from client state.

### Transactions

| Call                    | Body               | Returns                                                                 |
| ----------------------- | ------------------ | ----------------------------------------------------------------------- |
| `GET /api/transactions` | —                  | `{ transactions[] }`, newest first, scoped by RLS to the signed-in user |
| `POST /api/deposits`    | deposit payload    | `{ transaction }`                                                       |
| `POST /api/withdrawals` | withdrawal payload | `{ transaction }`                                                       |

Deposit payload: `amount`, `playerId`, `paymentMethod`, `receiptReference?`, `receiptImage?`.
Withdrawal payload: `amount`, `playerId`, `securityCode`, `fullName`, `bank`, `accountNumber`, `contactNumber`.

Validation before insert: amount is numeric, Player ID present, amount within `minTransaction`–`maxTransaction`. Guests may submit (no session) but cannot read rows back, so the reference is generated client-side for the confirmation screen.

Transaction shape: `{ id (reference), rowId, userId, type, status, amount, playerId, paymentMethod, receiptReference, receiptImage, securityCode, fullName, bank, accountNumber, contactNumber, createdAt }`.
`type`: `DEPOSIT | WITHDRAWAL`. `status`: `PENDING | APPROVED | COMPLETED | REJECTED`.

### Agent accounts

| Call                    | Returns                                                                        |
| ----------------------- | ------------------------------------------------------------------------------ |
| `GET /api/bank-details` | `{ agentBankDetails[] }` — `{ id, name, number, icon, type, active }`, ordered |

### Support

| Call                     | Body                                | Returns                                         |
| ------------------------ | ----------------------------------- | ----------------------------------------------- |
| `POST /api/support/chat` | `{ messages: [{ role, content }] }` | `{ reply }` — rule-based reply, no account data |

### Admin (requires `ADMIN` role; throws 403 otherwise)

| Call                                       | Body                                     | Returns                                                            |
| ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------ |
| `GET /api/admin/overview`                  | —                                        | `{ stats, transactions, agentBankDetails, systemSettings, users }` |
| `GET /api/admin/bank-details`              | —                                        | `{ agentBankDetails, systemSettings }`                             |
| `PUT /api/admin/bank-details`              | `{ agentBankDetails?, systemSettings? }` | refreshed bank details payload                                     |
| `DELETE /api/admin/bank-details/:id`       | —                                        | refreshed bank details payload                                     |
| `PATCH /api/admin/transactions/:reference` | `{ status }`                             | `{ transaction }`                                                  |

`stats`: `{ totalUsers, totalTransactions, pending, completed, deposits, withdrawals }`.

Any other URL throws `503 This service is not available.`

## Database tables

| Table           | Purpose                                             | Access                                             |
| --------------- | --------------------------------------------------- | -------------------------------------------------- |
| `profiles`      | Full name, player ID, email per auth user           | Owner read/write; admin read                       |
| `user_roles`    | `admin` / `user` role rows, checked by `has_role()` | Authenticated read; service role writes            |
| `transactions`  | Deposit & withdrawal requests                       | Insert by anyone; read own rows; admin read/update |
| `bank_accounts` | Agent bank/wallet accounts shown on Deposit         | Public read; admin write                           |
| `app_settings`  | Single row: WhatsApp number, limits, promo code     | Public read; admin write                           |

Roles are never stored on `profiles`. Admin checks always go through `user_roles` / `has_role()` server-side.

## Adding a real HTTP endpoint

If an external service ever needs to call in (webhook, cron), add a TanStack server route under `src/routes/api/public/` and verify the caller (signature or shared secret) inside the handler before doing any work. Do not expose the admin operations above as unauthenticated routes.
