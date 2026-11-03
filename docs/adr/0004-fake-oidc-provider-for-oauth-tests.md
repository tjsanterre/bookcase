# Test OAuth against a fake OIDC Provider

Automated tests and local development, including phone testing on the LAN, sign in through a mock OIDC Provider run in Docker and registered through Better Auth's generic OAuth support, so the real OAuth code path is exercised. Google rejects LAN-IP redirect URIs and cannot run in CI, so real Google is verified by hand from `localhost` with a written checklist.
