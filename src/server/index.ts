import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDb } from "./db.ts";

const config = loadConfig(process.env);
const app = createApp({ db: openDb(config.db), webRoot: "dist/web" });

const tls = config.tls && {
  createServer,
  serverOptions: { cert: readFileSync(config.tls.cert), key: readFileSync(config.tls.key) },
};

serve({ fetch: app.fetch, hostname: config.host, port: config.port, ...tls }, (info) => {
  console.log(`Bookcase listening on ${tls ? "https" : "http"}://${info.address}:${info.port}`);
});
