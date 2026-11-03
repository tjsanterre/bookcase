# Sourced: makes the Playwright Chromium binary loadable without root by unpacking missing libs locally.
_bin=$(ls -d "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell | tail -1)
_libdir="$VERIFY_DIR/libs/usr/lib/x86_64-linux-gnu"
if ldd "$_bin" | grep -q "not found" && [ ! -d "$_libdir" ]; then
  mkdir -p "$VERIFY_DIR/debs" "$VERIFY_DIR/libs"
  (cd "$VERIFY_DIR/debs" && apt-get download libnspr4 libnss3 libasound2t64 >/dev/null 2>&1 && for f in *.deb; do dpkg -x "$f" ../libs; done)
fi
[ -d "$_libdir" ] && export LD_LIBRARY_PATH="$_libdir${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
true
