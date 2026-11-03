#!/usr/bin/env bash
# Stops only the server launch.sh started and removes scaffolding. Evidence in $EVIDENCE_DIR is kept.
source "$(dirname "$0")/env.sh"
if [ -f "$VERIFY_DIR/dev.pid" ]; then
  kill -- "-$(cat "$VERIFY_DIR/dev.pid")" 2>/dev/null || kill "$(cat "$VERIFY_DIR/dev.pid")" 2>/dev/null || true
  rm -f "$VERIFY_DIR/dev.pid"
fi
rm -f "$REPO/.dev.vars.verify"
psql_verify -d postgres -c "DROP DATABASE IF EXISTS $VERIFY_DB WITH (FORCE)" >/dev/null 2>&1 || true
echo "cleaned up; evidence kept in $EVIDENCE_DIR"
