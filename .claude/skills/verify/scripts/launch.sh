#!/usr/bin/env bash
# Starts an isolated Bookcase dev server on $VERIFY_PORT against a fresh $VERIFY_DB database.
set -euo pipefail
source "$(dirname "$0")/env.sh"
cd "$REPO"

if [ -f "$VERIFY_DIR/dev.pid" ] && kill -0 "$(cat "$VERIFY_DIR/dev.pid")" 2>/dev/null; then
  echo "verify server already running (pid $(cat "$VERIFY_DIR/dev.pid")); run cleanup.sh first" >&2; exit 1
fi
if ss -ltn | grep -q ":$VERIFY_PORT "; then echo "port $VERIFY_PORT is owned by something else" >&2; exit 1; fi

docker compose up -d db oidc >/dev/null
until docker compose exec -T db pg_isready -U postgres -q; do sleep 1; done
until curl -sf "$VERIFY_OIDC_ISSUER/.well-known/openid-configuration" >/dev/null; do sleep 1; done

# Fresh database every launch so runs start from an empty Bookcase
psql_verify -d postgres -c "DROP DATABASE IF EXISTS $VERIFY_DB WITH (FORCE)" -c "CREATE DATABASE $VERIFY_DB" >/dev/null
DATABASE_URL="postgres://postgres:postgres@localhost:5432/$VERIFY_DB" DATABASE_DRIVER=pg npm run db:migrate >/dev/null

# The Worker reads .dev.vars ahead of process env; CLOUDFLARE_ENV=verify selects this file instead (verification scaffolding, removed by cleanup.sh)
cat > .dev.vars.verify <<VARS
DATABASE_DRIVER=pg
DATABASE_URL=postgres://postgres:postgres@localhost:5432/$VERIFY_DB
BETTER_AUTH_SECRET=verify-secret-verify-secret-verify-secret
BETTER_AUTH_URL=$VERIFY_URL
OWNER_EMAILS=$VERIFY_OWNER_EMAIL
OIDC_ISSUER=$VERIFY_OIDC_ISSUER
OIDC_CLIENT_ID=bookcase
OIDC_CLIENT_SECRET=verify
VARS

# Empty TLS vars force plain http even when .dev.vars sets certs
CLOUDFLARE_ENV=verify BOOKCASE_TLS_CERT= BOOKCASE_TLS_KEY= \
  setsid npm run dev -- --port "$VERIFY_PORT" --strictPort --host 127.0.0.1 > "$VERIFY_DIR/dev.log" 2>&1 &
echo $! > "$VERIFY_DIR/dev.pid"

for _ in $(seq 60); do
  # 401 without a cookie shows the Worker loaded its config and enforces auth
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$VERIFY_URL/api/books")" = 401 ] && { echo "ready: $VERIFY_URL (log: $VERIFY_DIR/dev.log)"; exit 0; }
  sleep 1
done
echo "server did not become ready; see $VERIFY_DIR/dev.log" >&2; "$(dirname "$0")/cleanup.sh"; exit 1
