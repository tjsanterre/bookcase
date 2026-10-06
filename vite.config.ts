import { readFileSync } from "node:fs";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { loadConfig } from "./src/server/config.ts";

const { port, tls } = loadConfig(process.env);

export default defineConfig({
  root: "src/web",
  plugins: [vue()],
  build: { outDir: "../../dist/web", emptyOutDir: true },
  server: {
    https: tls && { cert: readFileSync(tls.cert), key: readFileSync(tls.key) },
    proxy: { "/api": { target: `${tls ? "https" : "http"}://127.0.0.1:${port}`, secure: false } },
  },
});
