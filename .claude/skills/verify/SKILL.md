---
name: verify
description: Launch Bookcase (Vue SPA + Hono Worker + Postgres) on an isolated port and database, drive it in headless Chromium with Playwright, and capture screenshots plus API/DB evidence. Use to prove a UI or API change works in the real app, not just in unit tests.
---

# Verify Bookcase

Surface: a mobile-first web app. Vue SPA (hash routes `#/`, `#/add`, `#/books/:isbn`) served by Vite with the Worker running in workerd; storage is Postgres via Docker. Feature journeys are in [features/README.md](features/README.md). Run every command from the repo root; scripts live in `.claude/skills/verify/scripts/`.

## Launch

```sh
.claude/skills/verify/scripts/launch.sh
```

Starts Postgres (`docker compose up -d db`), drops and recreates database `bookcase_verify`, migrates it, and starts Vite on `127.0.0.1:5199` over plain http. Ready means `GET /api/books` returns 200 against the empty database; the script prints `ready:` and exits non-zero otherwise (log: `/tmp/bookcase-verify/dev.log`).

Isolation, because the user's own dev server (`:5173`, database `bookcase`) may be running:
- The Worker reads `.dev.vars` ahead of process env, so `DATABASE_URL=...` on the command line is silently ignored and writes hit the dev database. `launch.sh` writes `.dev.vars.verify` and sets `CLOUDFLARE_ENV=verify`, which selects it instead. Wrangler warns that no `verify` environment exists in `wrangler.jsonc`; ignore it.
- Never drive `:5173` or the `bookcase` database. Add/Undo/Delete there change the user's real collection.
- Refuses to start if port 5199 is taken or a previous run's pid file is live; run `cleanup.sh` first.

Override with `VERIFY_PORT` and `VERIFY_DIR` (default `/tmp/bookcase-verify`) to run two instances side by side with different ports; the database name is fixed, so two instances share it.

## Doctor

```sh
.claude/skills/verify/scripts/doctor.sh
```

Read-only. Checks the pid is live, `/api/health` and `/api/books` answer, the verify database exists, and the SPA is served. Run it first whenever a drive misbehaves.

## Drive

Playwright with headless Chromium, installed once outside the repo (nothing is added to `package.json`):

```sh
export PW_DIR=$(.claude/skills/verify/scripts/ensure-playwright.sh)
source .claude/skills/verify/scripts/env.sh   # exports VERIFY_URL and EVIDENCE_DIR
source .claude/skills/verify/scripts/chromium-libs.sh   # no-op unless Chromium is missing system libs and root is unavailable
node .claude/skills/verify/scripts/drive-add-by-isbn.mjs
```

Import Playwright in new scripts via `createRequire(`${process.env.PW_DIR}/`)("playwright")` as that script does. Use a phone-sized viewport (420x800); the UI is built for phones. Stable handles:

| Where | Handle |
| --- | --- |
| List search / sort | `getByLabel("Search books")`, `getByLabel("Sort")` (A–Z, Author, Recent) |
| List filters | `getByRole("button", { name: /^Filters/ })` opens `role=dialog` named "Filters" |
| List count | text `N of M` |
| Add by ISBN | `getByLabel("ISBN")` + button `Add`; results in `role=status` / `role=alert` |
| Add outcomes | heading `Just added`; dialog with `is already in your Bookcase`; manual form dialog `No details found for` |
| Detail | `Edit details`, `Delete` (then confirm `Delete`), `Add tag` input, `Remove <tag>` chips |

The camera path (`Start camera`) needs a real device and a secure origin; headless runs skip it and use typed ISBN, which shares the same `/api/add` endpoint.

## Evidence

Everything goes to `/tmp/bookcase-verify/evidence/` (`$EVIDENCE_DIR`). Cleanup never touches it. Standards:
- Drive the real UI path; do not seed through `POST /api/books` and then claim the Add flow works. The API may be used to read state or to set up preconditions for a different feature.
- Capture the action and the resulting state: a screenshot after the action, then the API response and a database row (`docker compose exec -T db psql -U postgres -d bookcase_verify -c '...'`) for side effects.
- `/api/add` calls the real Open Library over the network. If offline, it returns `manual` or 502; report that as the blocker rather than mocking.
- Database tables: `book`, `tag`, `book_tag`, `cover`.

## Cleanup

```sh
.claude/skills/verify/scripts/cleanup.sh
```

Kills only the process group launch.sh recorded, deletes `.dev.vars.verify`, and drops `bookcase_verify`. Run it after failed attempts too. It leaves the Postgres container alone because the dev server shares it.
