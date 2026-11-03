# Sign in, sign out, API requires a session

## Sub-features
- Signed-out visit to any hash route lands on `#/sign-in`, which has a `Continue with your account` button
- Owner admitted: a verified email on `OWNER_EMAILS` through the mock OIDC Provider's login form
- Refused: an email off the allowlist, or an allowlisted email without `email_verified`, returns to `#/sign-in` with an alert and no session
- `Sign out` in the header ends the session
- Every `/api` route except `/api/health` and `/api/auth/*` answers 401 JSON without a cookie, covers included

## How to get to it (user POV)
Open the app signed out. The mock Provider's form (http://127.0.0.1:8080/default) takes a username and a claims JSON; `launch.sh` makes `$VERIFY_OWNER_EMAIL` the Owner.

## Driving it with Playwright
`node scripts/drive-sign-in.mjs` covers all of the above and screenshots each state. Other drive scripts sign in with `signInAs(page, url, { email, verified })` from `scripts/sign-in.mjs`, then read the API through `page.request` so it carries the session cookie.

## Gotchas
- Sign-out leaves the Provider's own session alone, so the mock form still appears on the next sign-in.
- Rejected sign-ins create no `user` row; check `select email from "user"` in `bookcase_verify`.
