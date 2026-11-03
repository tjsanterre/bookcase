# Better Auth, one Owner, admitted by verified-email allowlist

Sign-in uses Better Auth with OAuth Providers (Google first, more later). Only an email that the Provider reports as verified and that appears in `OWNER_EMAILS` is admitted, so adding a Provider needs no schema change and a lax Provider cannot be used to claim the Owner's address. Every `/api` route except health and auth requires a session.

Multi-tenancy is deliberately deferred: tables carry no `user_id` today, and adding it later means re-creating them rather than migrating in place.
