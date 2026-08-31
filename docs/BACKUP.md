# Backup Guide

Two things need protecting: the **code** and the **database**.

## What matters

| Asset                           | Where it lives                          | Loss impact                          |
| ------------------------------- | --------------------------------------- | ------------------------------------ |
| Source code                     | Git repo / Lovable project / ZIP export | High — rebuildable but slow          |
| `transactions`                  | Database                                | Critical — financial record          |
| `profiles`, `user_roles`        | Database                                | Critical — accounts and admin access |
| `bank_accounts`, `app_settings` | Database                                | Medium — small, re-enterable         |
| Receipt images                  | Stored with the transaction row         | High — audit evidence                |
| `.env` values                   | Project settings                        | Low — reissuable                     |

## Code backups

- Connect the project to GitHub so every change is committed automatically. That is the primary code backup.
- Keep a dated ZIP export (`fast-cash-project.zip`) off-platform, e.g. once per release.
- Never commit real secrets; only publishable keys belong in the repo.

## Database backups

The managed backend takes automated daily snapshots with point-in-time recovery. On top of that, take your own logical export on a schedule you control:

**Weekly, before any migration, and before bulk status updates.**

Export the tables that carry business data:

```
profiles, user_roles, transactions, bank_accounts, app_settings
```

Save each export as CSV/JSON with the date in the filename, e.g. `transactions-2026-08-23.csv`, and store copies in two places (one offline/cold). Exports contain personal and financial data — encrypt the archive and restrict who can open it.

Retention suggestion: daily for 7 days, weekly for 8 weeks, monthly for 12 months, then keep month-end exports only.

## Restore procedure

1. Freeze writes — put the app in a maintenance state or stop processing requests.
2. Identify the last good point in time (snapshot or export).
3. Restore into a **new** database first and inspect it; never overwrite the live database as a first move.
4. Verify: row counts per table, newest transaction reference, admin rows still present in `user_roles`.
5. Point the app at the restored data (or copy the missing rows back into the live database).
6. Re-run the smoke tests in TESTING_CHECKLIST.md.
7. Reconcile: any request submitted during the outage must be re-entered from WhatsApp/bank records.

## Recovery targets

- RPO (data you can afford to lose): 24 hours; effectively minutes with point-in-time recovery.
- RTO (time to be back up): 2 hours for a code redeploy, 4 hours including a data restore.

## Drills

Test a restore into a scratch database at least once a quarter and write down how long it took. A backup you have never restored is not a backup.
