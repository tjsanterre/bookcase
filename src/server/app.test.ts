import { beforeEach, describe, expect, test } from "vitest";
import { createTestApp, OWNER_EMAIL, ownerProfile } from "./test/app.ts";
import { resetDb } from "./test/db.ts";

beforeEach(resetDb);

test("GET /api/health responds ok without a session", async () => {
  const res = await createTestApp().app.request("/api/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test("GET /api/auth/providers lists the configured Providers without a session", async () => {
  const res = await createTestApp().app.request("/api/auth/providers");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual([{ id: "oidc", label: "Mock Provider" }]);
});

test("unknown /api routes 404 instead of falling back to the SPA", async () => {
  const owner = await createTestApp().signedIn();
  expect((await owner.request("/api/nope")).status).toBe(404);
});

describe("without a session", () => {
  const routes: [method: string, path: string][] = [
    ["GET", "/api/books"],
    ["POST", "/api/books"],
    ["POST", "/api/add"],
    ["GET", "/api/books/9780306406157"],
    ["PUT", "/api/books/9780306406157"],
    ["DELETE", "/api/books/9780306406157"],
    ["PUT", "/api/books/9780306406157/tags"],
    ["GET", "/api/books/9780306406157/cover"],
    ["GET", "/api/tags"],
    ["GET", "/api/nope"],
  ];

  test.each(routes)("%s %s answers 401 JSON", async (method, path) => {
    const res = await createTestApp().app.request(path, { method });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });
});

test("checking a session does not contact the Provider", async () => {
  const owner = await createTestApp().signedIn();
  const fetched: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input, init) => (fetched.push(String(input)), realFetch(input, init))) as typeof fetch;
  try {
    expect((await owner.request("/api/books")).status).toBe(200);
  } finally {
    globalThis.fetch = realFetch;
  }
  expect(fetched).toEqual([]);
});

describe("sign-in", () => {
  test("admits the Owner, matching the allowlist case-insensitively", async () => {
    const { signIn, app } = createTestApp();
    const { cookie } = await signIn({ ...ownerProfile, email: OWNER_EMAIL.toUpperCase() });
    expect(cookie).toBeDefined();
    expect((await app.request("/api/books", { headers: { Cookie: cookie! } })).status).toBe(200);
  });

  test("admits the Owner again on a later sign-in", async () => {
    const { signIn } = createTestApp();
    expect((await signIn()).cookie).toBeDefined();
    expect((await signIn()).cookie).toBeDefined();
  });

  test("rejects a verified email that is not on the allowlist", async () => {
    const { signIn } = createTestApp();
    const { cookie, callback } = await signIn({ email: "stranger@example.com", email_verified: true });
    expect(cookie).toBeUndefined();
    expect(callback.headers.get("Location")).toContain("error=not_owner");
  });

  test("rejects an allowlisted email the Provider reports unverified", async () => {
    const { signIn } = createTestApp();
    const { cookie, callback } = await signIn({ ...ownerProfile, email_verified: false });
    expect(cookie).toBeUndefined();
    expect(callback.headers.get("Location")).toContain("error=not_owner");
  });

  test("rejects a returning Owner whose Provider now reports the email unverified", async () => {
    const { signIn } = createTestApp();
    expect((await signIn()).cookie).toBeDefined();
    expect((await signIn({ ...ownerProfile, email_verified: false })).cookie).toBeUndefined();
  });
});
