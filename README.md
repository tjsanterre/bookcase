# Bookcase

A web app for keeping track of your personal book collection.

## Features

- Add books to your collection
- Browse your collection
- Update book details
- Search by title, author, and other fields

## Stack

TypeScript across the whole stack, running on Node.js: a Vue single-page app served by a Hono backend, with SQLite for storage.

## Getting started

Requires Node 22.18 or later.

```sh
npm install
cp .env.example .env
npm run build && npm start   # one process: API plus the built app
npm run dev                  # Hono watch plus Vite dev server (Vite proxies /api)
npm test
npm run typecheck
```

Configuration is environment variables (see `.env.example`): `BOOKCASE_HOST`, `BOOKCASE_PORT`, `BOOKCASE_DB`, `BOOKCASE_CONTACT_EMAIL`, `BOOKCASE_TLS_CERT`, `BOOKCASE_TLS_KEY`. State lives in `data/`.

### HTTPS for phone camera scanning

Phones only allow camera access on a secure origin, so serve HTTPS using a local CA from [mkcert](https://github.com/FiloSottile/mkcert). Set `CAROOT` to a private directory and skip `mkcert -install` so nothing is trusted on the host.

```sh
CAROOT=./certs mkcert -cert-file certs/bookcase.pem -key-file certs/bookcase-key.pem <lan-ip> localhost 127.0.0.1
openssl x509 -in certs/rootCA.pem -outform DER -out certs/rootCA.crt   # .crt for Android
```

Set `BOOKCASE_TLS_CERT` and `BOOKCASE_TLS_KEY` to the two paths. Serve `rootCA.crt` to each phone (AirDrop, email, or any file server) and install it once:

- **iOS**: open the file, install the profile, then enable it under Settings > General > About > Certificate Trust Settings.
- **Android**: Chrome refuses to install it from the download. Use Settings > Security > Encryption & credentials > Install a certificate > CA certificate (a screen lock must be set), then fully restart Chrome.

The certificate lasts about two years and covers one IP, so reissue it if the server's LAN IP changes (a DHCP reservation avoids this). Test the camera against `npm start`, not the dev server.

On WSL2 in mirrored networking mode, the Hyper-V firewall blocks inbound LAN traffic by default. Allow it from an elevated PowerShell:

```powershell
New-NetFirewallHyperVRule -Name Bookcase -DisplayName Bookcase -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 3000 -Action Allow
```

## License

MIT
