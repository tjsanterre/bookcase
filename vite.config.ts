import { readFileSync } from "node:fs";
import { cloudflare } from "@cloudflare/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const { BOOKCASE_TLS_CERT: cert, BOOKCASE_TLS_KEY: key } = process.env;

export default defineConfig({
  root: "src/web",
  // The Workers runtime plugin cannot run under Vitest, which tests the app in Node.
  build: { outDir: "../../dist", emptyOutDir: true },
  plugins: [vue(), !process.env.VITEST && cloudflare({ configPath: "../../wrangler.jsonc" })],
  test: { globalSetup: ["src/server/test/globalSetup.ts"], fileParallelism: false }, // test files share one database
  server: {
    https: cert && key ? { cert: readFileSync(cert), key: readFileSync(key) } : undefined,
    host: true, // reachable from a phone on the LAN
  },
});
