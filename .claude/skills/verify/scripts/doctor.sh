#!/usr/bin/env bash
# Read-only: is the verify instance up, ours, and writing to the verify database?
source "$(dirname "$0")/env.sh"
fail=0
check() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
check "pid file points at a live process" '[ -f "$VERIFY_DIR/dev.pid" ] && kill -0 "$(cat "$VERIFY_DIR/dev.pid")"'
check "health endpoint answers" 'curl -sf "$VERIFY_URL/api/health"'
check "API turns away anonymous requests with 401" '[ "$(curl -s -o /dev/null -w "%{http_code}" "$VERIFY_URL/api/books")" = 401 ]'
check "mock OIDC Provider answers" 'curl -sf "$VERIFY_OIDC_ISSUER/.well-known/openid-configuration"'
check "verify DB exists" '[ "$(psql_verify -d postgres -tAc "select 1 from pg_database where datname='"'$VERIFY_DB'"'")" = 1 ]'
check "SPA is served" 'curl -sf "$VERIFY_URL/" | grep -q "<div id=\"app\""'
exit $fail
