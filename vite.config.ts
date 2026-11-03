import { readFileSync } from "node:fs";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const { BOOKCASE_PORT = "3000", BOOKCASE_TLS_CERT: cert, BOOKCASE_TLS_KEY: key } = process.env;
const port = Number(BOOKCASE_PORT);
const tls = cert && key ? { cert, key } : undefined;

export default defineConfig({
  root: "src/web",
  plugins: [vue()],
  build: { outDir: "../../dist/web", emptyOutDir: true },
  test: { globalSetup: ["src/server/test/globalSetup.ts"], fileParallelism: false }, // test files share one database
  server: {
    https: tls && { cert: readFileSync(tls.cert), key: readFileSync(tls.key) },
    proxy: { "/api": { target: `${tls ? "https" : "http"}://127.0.0.1:${port}`, secure: false } },
  },
});
