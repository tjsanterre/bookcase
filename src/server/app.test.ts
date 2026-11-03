import { beforeEach, expect, test } from "vitest";
import { createApp } from "./app.ts";
import { db, resetDb } from "./test/db.ts";

beforeEach(resetDb);

test("GET /api/health responds ok", async () => {
  const res = await createApp({ db: db }).request("/api/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test("unknown /api routes 404 instead of falling back to the SPA", async () => {
  const res = await createApp({ db: db }).request("/api/nope");
  expect(res.status).toBe(404);
});

test("with a web root, serves the SPA shell for client routes but still 404s unknown /api", async () => {
  const app = createApp({ db: db, webRoot: "dist/web" });
  const page = await app.request("/books/123");
  expect(page.status).toBe(200);
  expect(await page.text()).toContain('<div id="app">');
  expect((await app.request("/api/nope")).status).toBe(404);
});
