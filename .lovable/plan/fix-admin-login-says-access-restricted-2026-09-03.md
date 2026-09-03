# Fix: admin login says "Access restricted"

## What is actually happening

Sign-in itself works — the password is accepted. The failure is the role check right after it.

Verified from the sign-in traffic in your browser and the live database:

- Your browser is talking to an **older backend instance** (the account it signed into has a different internal user id there), and in that instance the role lookup came back **empty** — no `admin` row.
- In the project's **current backend** (the one the code now points at), both `lakmalsujith25@gmail.com` and `djimini4plus@gmail.com` **do** have the `admin` role.

So the app screen is correct about what it sees: the build you are using reads a backend where your account has no admin role.

## Plan

1. Confirm which backend the currently served preview/published bundle is built against, and re-point the app at the project's current backend connection (no hand-editing of the generated env values).
2. Rebuild/refresh preview and published output so the browser stops calling the old instance.
3. Re-check the two admin accounts in the active backend; if either is missing a role row there, add the `admin` row in `user_roles` (database-only, as designed).
4. Verify end-to-end: sign in at `/admin` and confirm the dashboard loads instead of the restricted notice.

## Notes

- No schema or policy changes are expected; `user_roles` + `has_role()` stay as they are.
- If the old instance is the one you must keep using, the alternative is to grant the `admin` role there instead — say the word and I will do that instead of re-pointing the connection.
