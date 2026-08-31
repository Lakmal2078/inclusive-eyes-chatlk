# Fix `npm start` production server command

## Problem

- `package.json` declares `"start": "vite start"`, but Vite has no `start` subcommand.
- Users running `npm start` either see `Missing script: "start"` (older zip) or will see an `Unknown command` error from Vite.
- README and docs claim `npm start` serves the production build.

## Goal

Make `npm run build && npm start` reliably serve the production build locally on any platform (Node/Termux).

## Plan

1. **Choose the correct production start command**
   - TanStack Start v1 + Nitro produces a server bundle under `.output/`.
   - The local production preview command provided by the stack is `vite preview` (already present as `npm run preview`).
   - Change `start` to alias the verified preview command so `npm start` works as documented.

2. **Update `package.json`**
   - Replace `"start": "vite start"` with `"start": "vite preview"`.

3. **Update documentation**
   - `README.md`: keep the `npm start` entry but clarify it runs the production preview server.
   - `docs/DEPLOYMENT.md`: ensure the self-host section mentions `npm run build` then `npm start` (or `npm run preview`).
   - `docs/INSTALLATION.md`: add a short "Run production build locally" subsection.

4. **Verify the command works**
   - Run `npm run build`.
   - Run `npm start` and confirm the server starts and serves the app.
   - Smoke-test the home page.

5. **Re-package the project zip**
   - Create a fresh `fast-cash-project.zip` including the fixed `package.json` and updated docs.

## Acceptance criteria

- `npm start` no longer errors.
- After `npm run build`, `npm start` serves the production build on the expected port.
- README/docs accurately describe the command.
