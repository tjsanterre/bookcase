# Camera scanning over the LAN: HTTPS approach

Research for issue #3 (parent #1). Sources fetched 2026-10-06.

## Recommendation

Use **mkcert**: create a local CA on the machine that runs Bookcase, issue one leaf cert for the LAN IP (plus `localhost`), serve it from Node, and install the CA root on each phone once. Give the server a fixed LAN address (DHCP reservation or a hostname) so the cert does not need reissuing.

A bare self-signed cert is the worse version of the same thing: each phone must trust that exact cert, so every reissue repeats the phone setup. A real domain with a DNS-01 public cert is the only option needing no per-phone setup, but it costs a domain and a DNS API token (see "Other options").

## Why HTTPS is needed

- `getUserMedia()` is available only in secure contexts; otherwise `navigator.mediaDevices` is `undefined`. [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- Potentially trustworthy origins are `https`/`wss`, loopback (`127.0.0.0/8`, `::1`), `localhost`, and `file`. RFC1918 addresses such as `192.168.x.x` are not included, so `http://<lan-ip>` fails on the phone. [W3C Secure Contexts](https://w3c.github.io/webappsec-secure-contexts/)
- `http://localhost` works on the host machine itself, which is enough for desktop dev, not for phones.

## Serving TLS from Hono on Node

`@hono/node-server`'s `serve()` takes `createServer` and `serverOptions`. The docs example uses HTTP/2:

```ts
import { createSecureServer } from 'node:http2'
import { readFileSync } from 'node:fs'

serve({
  fetch: app.fetch,
  createServer: createSecureServer,
  serverOptions: {
    key: readFileSync('localhost-privkey.pem'),
    cert: readFileSync('localhost-cert.pem'),
  },
})
```

[Hono Node.js docs](https://hono.dev/docs/getting-started/nodejs). Node's `https.createServer({ key, cert })` takes the same key/cert options ([Node https docs](https://nodejs.org/api/https.html)), so `node:https` should work as `createServer` too; not verified against the adapter source. Static serving for the built SPA uses `serveStatic` from `@hono/node-server/serve-static` (same Hono page).

Cert and key paths should be config alongside the bind address and port. If the files are absent, fall back to plain HTTP (typed ISBN and USB scanner still work).

## How a phone trusts the cert

mkcert accepts IP addresses as names, e.g. `mkcert example.com localhost 127.0.0.1 ::1`; the CA lives in `mkcert -CAROOT`. [mkcert README](https://github.com/FiloSottile/mkcert)

**iOS**
1. Get `rootCA.pem` onto the phone (AirDrop, email, or HTTP server), open it, install via Settings > Profile Downloaded. [mkcert README](https://github.com/FiloSottile/mkcert)
2. Then Settings > General > About > Certificate Trust Settings > enable full trust for the root. Required for profiles received by email or downloaded from a website. [Apple support 102390](https://support.apple.com/en-us/102390)

**Android**
- Settings > Security & privacy > More security settings > Encryption & credentials > Install a certificate (path as of Android 14+; a screen lock is required). [Google Pixel help](https://support.google.com/pixelphone/answer/2844832)
- Android 7+ apps do not trust user-added CAs by default; only system CAs, unless the app opts in via Network Security Config. [Android security config](https://developer.android.com/privacy-and-security/security-config) mkcert says the same for apps. This is about apps, not browsers. I did not find a primary source stating whether Chrome on Android accepts user-installed CAs; check on a real device before committing (open question).
- Chrome does not require Certificate Transparency for manually installed roots. [Chromium CT docs](https://chromium.googlesource.com/chromium/src/+/main/net/docs/certificate-transparency.md)

**Security note:** `rootCA-key.pem` can intercept TLS for any site on devices that trust the root. Keep it on the server only and never share it. [mkcert README](https://github.com/FiloSottile/mkcert) Installing the root on phones is a standing trust grant: a reasonable cost for a personal LAN, but worth knowing.

## Ongoing cost

- **Leaf expiry:** Apple rejects TLS server certs issued after 2019-07-01 with validity over 825 days; certs need a SAN and the serverAuth EKU. [Apple support 103769](https://support.apple.com/en-us/103769) Plan to reissue roughly every two years. mkcert's own default validity is not confirmed here; check with `openssl x509 -enddate`. Picking up a new cert needs a server restart (or `server.setSecureContext`; not verified).
- **IP changes:** the IP is in the cert's SAN, so a new IP means reissuing the leaf. The phones' CA trust is untouched, so reissue is one `mkcert` command on the server plus a restart. Avoid even that with a DHCP reservation, or a local hostname in the SAN too.
- **New phone:** repeat the CA install steps.

## Other options

| Option | Per-phone setup | Ongoing cost | Verdict |
|---|---|---|---|
| mkcert local CA | install root once | reissue on IP change or about every 2 years | Recommended |
| Plain self-signed cert | trust that exact cert | repeat on every reissue | Strictly worse than mkcert |
| Own domain, DNS-01 public cert pointing at LAN IP | none | domain, DNS API token, 90-day renewals (automatable) | Works but heavy for a personal app. Let's Encrypt's warning is about shipping private keys in native apps, not a single owned server. [Let's Encrypt](https://letsencrypt.org/docs/certificates-for-localhost/) |
| Tailscale `tailscale cert` | none, but phones must be on the tailnet | 90-day LE certs, manual renewal; machine names go in public CT logs. [Tailscale docs](https://tailscale.com/kb/1153/enabling-https) | Fine if already on Tailscale; otherwise adds an account and VPN, against "LAN-only" |
| Reverse proxy (Caddy) with internal CA | same as mkcert | auto renewal | Extra process; contradicts the one-process decision. Not researched against Caddy docs |
| Browser flag to treat the origin as secure | per phone, Chrome only | none | Not researched (the web.dev page fetched returned 404). Not available on iOS Safari as far as I know, unverified |

## Open questions for the build plan

- Confirm on a real Android phone that Chrome accepts the mkcert root (and Firefox on Android if used).
- Decide stable addressing: DHCP reservation vs mDNS hostname in the SAN.
- Decide whether TLS is optional config (fall back to HTTP) or required.
