# Browser barcode decoding library

Question (issue #4): which ISBN/EAN-13 decoder should the Vue client use, and is native-first-with-fallback worth it?

Researched 2026-10-06. Sources are first-party docs, READMEs and the npm registry.

## Recommendation

Use the `barcode-detector` npm package (MIT, ZXing-C++ via `zxing-wasm`) as a ponyfill, and drive it directly from a `<video>` element. Skip a native-first strategy: the package already uses native `BarcodeDetector` where it exists, and Safari/iOS has none, so the WASM path must be the baseline anyway. Optionally wrap with `vue-qrcode-reader` for the camera UI.

## Findings

### Native `BarcodeDetector`
- Supports `ean_13` and `ean_8` among 16 formats; secure context (HTTPS) only; flagged experimental/not Baseline. [MDN: Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API)
- Chrome Android: supported since 83. Desktop Chrome: ChromeOS and macOS only. Firefox: not supported. [MDN browser-compat-data, `api/BarcodeDetector.json`](https://github.com/mdn/browser-compat-data/blob/main/api/BarcodeDetector.json)
- Safari and iOS Safari: only behind the "Shape Detection API" preference flag (since 17), so not usable by default. Same source.
- Consequence: iOS phones, the main target for LAN camera scanning, get no native decoding. A fallback is mandatory, so native-only is out.

### Candidates

| Library | Engine | Status | License | npm unpacked size | Notes |
|---|---|---|---|---|---|
| `barcode-detector` 3.2.2 | zxing-wasm (ZXing-C++) | Active; published 2026-08-16 | MIT | 261 KB JS; WASM fetched at runtime | Ponyfill or polyfill of the standard API; EAN-13 and linear formats ([README](https://github.com/Sec-ant/barcode-detector)) |
| `zxing-wasm` 3.1.5 | ZXing-C++ | Active; published 2026-10-06 | MIT | 3.7 MB (includes WASM variants) | The engine beneath the above |
| `vue-qrcode-reader` 5.7.3 | `barcode-detector` | Published 2025-07-16 | MIT | 202 KB | Vue 3 components; QR-only by default, other formats via `formats` prop; torch unsupported on iOS ([README](https://github.com/gruhn/vue-qrcode-reader)) |
| `@undecaf/barcode-detector-polyfill` 0.9.23 | ZBar WASM | Published 2025-07-17 | MIT (ZBar part LGPL) | 126 KB | No aztec/data_matrix/pdf417; LGPL dependency ([README](https://github.com/undecaf/barcode-detector-polyfill)) |
| `@zxing/library` 0.23.0 (zxing-js) | Pure JS | Maintenance mode; maintainers say they cannot actively maintain it ([README](https://github.com/zxing-js/library)) | Apache-2.0 | 11.9 MB | Reject: stalled, heavy |
| `html5-qrcode` 2.3.8 | zxing-js | Maintenance mode; last publish 2023-04-15 ([README](https://github.com/mebjas/html5-qrcode)) | Apache-2.0 | 2.6 MB | Reject: unmaintained, wraps zxing-js |

Sizes are npm `dist.unpackedSize` from the registry (`registry.npmjs.org/<pkg>/latest`), not gzipped bundle sizes; measure real bundle cost when building.

### Vue integration
- `vue-qrcode-reader` is Vue 3 only and ships `QrcodeStream` (live camera). Its decoder is `barcode-detector`, so it gives the same engine plus UI. [README](https://github.com/gruhn/vue-qrcode-reader)
- Alternative is a small custom composable: `getUserMedia` into `<video>`, call `detector.detect(video)` on an interval. Fewer dependencies, more camera code to own (permissions, torch, camera selection).

### iOS Safari
- `getUserMedia` and WASM both work in Safari, but camera access requires a secure context. This ties to the HTTPS decision on the map: a LAN HTTP origin will not open the camera on phones.
- Torch is not supported on iOS (vue-qrcode-reader README, as of iOS 17.1).

## Open points
- Gzipped bundle and WASM transfer size not measured here; `barcode-detector` fetches its WASM at runtime from a configurable path, so serve it from the Hono app for LAN/offline use rather than relying on a remote fetch.
- Confirm `vue-qrcode-reader` is wanted vs. a custom composable once the scan-flow UI is specced.
