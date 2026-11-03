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

test("unknown /api paths 404", async () => {
  expect((await createApp({ db }).request("/api/nope")).status).toBe(404);
});
