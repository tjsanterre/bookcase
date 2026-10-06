import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

export function createApp(opts: { webRoot?: string } = {}) {
  const app = new Hono();
  app.get("/api/health", (c) => c.json({ ok: true }));

  if (opts.webRoot) {
    const root = opts.webRoot;
    // Unknown /api paths must 404, not fall through to the SPA shell below
    app.all("/api/*", (c) => c.notFound());
    app.use("*", serveStatic({ root }));
    app.use("*", serveStatic({ root, path: "index.html" }));
  }
  return app;
}
