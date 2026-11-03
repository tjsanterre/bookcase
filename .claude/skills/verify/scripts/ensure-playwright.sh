#!/usr/bin/env bash
# Installs Playwright + headless Chromium outside the repo, once. Prints the dir to run drive scripts from.
# If Chromium lacks system libs and there is no root, unpacks them under $VERIFY_DIR/libs; source scripts/chromium-libs.sh before driving.
set -euo pipefail
source "$(dirname "$0")/env.sh"
PW="$VERIFY_DIR/pw"
if [ ! -d "$PW/node_modules/playwright" ]; then
  mkdir -p "$PW" && (cd "$PW" && npm init -y >/dev/null && npm i playwright >/dev/null)
fi
(cd "$PW" && npx playwright install chromium >/dev/null)
source "$(dirname "$0")/chromium-libs.sh"
echo "$PW"
