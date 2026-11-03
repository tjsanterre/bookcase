# Bookcase

A web app for keeping track of your personal book collection.

## Features

- Add books to your collection
- Browse your collection
- Update book details
- Search by title, author, and other fields

## Stack

TypeScript across the whole stack, running on Cloudflare Workers: a Vue single-page app served as static assets by a Hono Worker, with Postgres (via Drizzle) for storage.

## Getting started

Requires Node 22.18 or later and Docker (for Postgres).

```sh
npm install
cp .dev.vars.example .dev.vars
docker compose up -d db     # Postgres 18, matching Neon's default
npm run db:migrate
npm run dev                  # Vite serves the app and runs the Worker in workerd
npm run build                # Worker plus assets in dist/
npm test
npm run typecheck
```

Configuration lives in `.dev.vars` (see `.dev.vars.example`): `DATABASE_DRIVER` (`pg` or `neon`) and `DATABASE_URL` are required; `BOOKCASE_CONTACT_EMAIL` is optional. `BOOKCASE_TLS_CERT` and `BOOKCASE_TLS_KEY` are read by the dev server only. Schema changes: edit `src/server/schema.ts`, run `npm run db:generate`, then `npm run db:migrate`. Tests use a separate `bookcase_test` database on the same server and need `docker compose up -d db`.

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
npx wrangler secret put BOOKCASE_CONTACT_EMAIL   # optional
```

`npm run build && npm run deploy` publishes the Worker; `npm run deploy -- --dry-run` checks the bundle without publishing.

## License

MIT
