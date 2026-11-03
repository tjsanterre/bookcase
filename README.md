# Bookcase

A web app for keeping track of your personal book collection.

## Features

- Add books to your collection
- Browse your collection
- Update book details
- Search by title, author, and other fields

## Stack

TypeScript across the whole stack, running on Cloudflare Workers: a Vue single-page app served as static assets by a Hono Worker, with Postgres (via Drizzle) for storage (Neon in production, a Docker container locally) and Better Auth for sign-in.

## Getting started

Requires Node 22.18 or later and Docker (for Postgres).

```sh
npm install
cp .dev.vars.example .dev.vars
docker compose up -d db oidc   # Postgres 18 (Neon's default) and a mock OIDC Provider
npm run db:migrate
npm run dev                  # Vite serves the app and runs the Worker in workerd
npm run build                # Worker plus assets in dist/
npm test
npm run typecheck
```

Configuration lives in `.dev.vars` (see `.dev.vars.example`); every key except `BOOKCASE_CONTACT_EMAIL` is required, and the Worker names all missing ones at once. `DATABASE_URL` is the Postgres connection string and `DATABASE_DRIVER` picks the client: `pg` for the local Docker database, `neon` for Neon on Workers. `BOOKCASE_CONTACT_EMAIL` is sent in the User-Agent of Open Library lookups. Sign-in keys are under Signing in. `BOOKCASE_TLS_CERT` and `BOOKCASE_TLS_KEY` are read by the dev server only. Schema changes: edit `src/server/schema.ts`, run `npm run db:generate`, then `npm run db:migrate`. Tests use a separate `bookcase_test` database on the same server and need `docker compose up -d db`; they sign in through an in-process fake OIDC Provider, so they do not need the `oidc` service.

### Signing in

Bookcase has one Owner. Sign-in goes through Better Auth with Google or a mock OIDC Provider, and only an email that the Provider reports as verified and that is listed in `OWNER_EMAILS` is admitted. Every `/api` route except `/api/health` and `/api/auth/*` needs a session.

- `OWNER_EMAILS`: comma-separated allowlist, case-insensitive.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google. Set both or neither.
- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`: the mock Provider. Its discovery document is read from `${OIDC_ISSUER}/.well-known/openid-configuration`. The browser and the Worker both use this URL, so it must be reachable from both. Set all three or none.
- At least one Provider must be configured; the sign-in page offers each one that is. Supporting another Provider is one entry in `PROVIDERS` in `src/server/config.ts`.
- `BETTER_AUTH_URL`: the origin the browser opens the app at; `BETTER_AUTH_SECRET`: a random secret.

With the mock Provider (`docker compose up -d oidc`, port 8080, any client id and secret), the issuer is `http://<host>:8080/default`, where `<host>` is the one you browse the app on. On a phone use the LAN address for both `BETTER_AUTH_URL` and `OIDC_ISSUER`. The sign-in form asks for a username and a claims JSON. Enter `{"email": "you@example.com", "email_verified": true}` to sign in as the Owner, or drop `email_verified` (or use another email) to see the rejection.

#### Verifying Google by hand

Google rejects LAN-IP redirect URIs and cannot run in CI, so test it from `localhost` with a real Google account. Phone testing uses the mock Provider instead.

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), configure the OAuth consent screen (External, Testing, with your Google account as a test user), then create an **OAuth client ID** of type **Web application**.
2. Add the authorized redirect URI `http://localhost:5173/api/auth/oauth2/callback/google`. For a deployment add `https://<deployed origin>/api/auth/oauth2/callback/google` too.
3. Put the client ID and secret in `.dev.vars` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, set `BETTER_AUTH_URL=http://localhost:5173`, and set `OWNER_EMAILS` to your Google address. Restart `npm run dev`.
4. Open `http://localhost:5173`. Expect the sign-in page with **Continue with Google**. Sign in with the Owner address and expect the covers grid.
5. Sign out, then sign in with a Google account whose email is not in `OWNER_EMAILS`. Expect to land back on the sign-in page with "That account isn't allowed" and no session: `/api/books` answers 401.
6. Optionally remove your address from `OWNER_EMAILS`, restart, and confirm the Owner is locked out too.

### HTTPS for phone camera scanning

Phones only allow camera access on a secure origin, so serve HTTPS using a local CA from [mkcert](https://github.com/FiloSottile/mkcert). Set `CAROOT` to a private directory and skip `mkcert -install` so nothing is trusted on the host.

```sh
CAROOT=./certs mkcert -cert-file certs/bookcase.pem -key-file certs/bookcase-key.pem <lan-ip> localhost 127.0.0.1
openssl x509 -in certs/rootCA.pem -outform DER -out certs/rootCA.crt   # .crt for Android
```

Set `BOOKCASE_TLS_CERT` and `BOOKCASE_TLS_KEY` in `.dev.vars` to the two paths; `npm run dev` then serves HTTPS on port 5173 and on your LAN. Serve `rootCA.crt` to each phone (AirDrop, email, or any file server) and install it once:

- **iOS**: open the file, install the profile, then enable it under Settings > General > About > Certificate Trust Settings.
- **Android**: Chrome refuses to install it from the download. Use Settings > Security > Encryption & credentials > Install a certificate > CA certificate (a screen lock must be set), then fully restart Chrome.

The certificate lasts about two years and covers one IP, so reissue it if the server's LAN IP changes (a DHCP reservation avoids this).

On WSL2 in mirrored networking mode, the Hyper-V firewall blocks inbound LAN traffic by default. Allow it from an elevated PowerShell:

```powershell
New-NetFirewallHyperVRule -Name Bookcase -DisplayName Bookcase -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 5173 -Action Allow
```

## Deploying

Production secrets live in Cloudflare, not in the repo. Set them with Wrangler (it prompts for each value):

```sh
npx wrangler secret put DATABASE_URL      # Neon connection string
npx wrangler secret put DATABASE_DRIVER   # neon
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BETTER_AUTH_URL   # the deployed origin
npx wrangler secret put OWNER_EMAILS
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put BOOKCASE_CONTACT_EMAIL   # optional
```

`npm run build && npm run deploy` publishes the Worker; `npm run deploy -- --dry-run` checks the bundle without publishing; CI runs it on every push. There is no deploy job yet. When one is added it must run `npm run db:migrate` against Neon (with `DATABASE_URL` set to the Neon connection string) before `wrangler deploy`.

## License

MIT
