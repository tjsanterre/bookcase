# Shared settings, sourced by the other scripts.
export VERIFY_DIR="${VERIFY_DIR:-/tmp/bookcase-verify}"
export VERIFY_PORT="${VERIFY_PORT:-5199}"
export VERIFY_DB="bookcase_verify"
export VERIFY_URL="http://127.0.0.1:$VERIFY_PORT"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
export REPO
export EVIDENCE_DIR="$VERIFY_DIR/evidence"
mkdir -p "$VERIFY_DIR" "$EVIDENCE_DIR"
psql_verify() { docker compose -f "$REPO/docker-compose.yml" exec -T db psql -U postgres -v ON_ERROR_STOP=1 "$@"; }
