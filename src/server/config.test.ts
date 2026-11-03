import { expect, test } from "vitest";
import { loadConfig } from "./config.ts";
import { validEnv } from "./test/env.ts";

test("loadConfig reads every setting and normalizes the Owner emails and issuer", () => {
  expect(loadConfig(validEnv)).toEqual({
    database: { url: "postgres://localhost/x", driver: "pg" },
    contactEmail: undefined,
    auth: { secret: "s3cret", baseURL: "http://localhost:5173", ownerEmails: ["me@example.com", "you@example.com"] },
    oidc: { issuer: "http://localhost:8080/default", clientId: "bookcase", clientSecret: "shh" },
  });
});

test("loadConfig fails loudly, listing every missing key and an unknown driver", () => {
  expect(() => loadConfig({})).toThrow(
    /DATABASE_URL is required; DATABASE_DRIVER must be pg or neon; BETTER_AUTH_SECRET is required; BETTER_AUTH_URL is required; OWNER_EMAILS is required; OIDC_ISSUER is required; OIDC_CLIENT_ID is required; OIDC_CLIENT_SECRET is required/,
  );
  expect(() => loadConfig({ ...validEnv, DATABASE_DRIVER: "sqlite" })).toThrow(/DATABASE_DRIVER/);
  expect(loadConfig({ ...validEnv, DATABASE_DRIVER: "neon" }).database.driver).toBe("neon");
});

test("loadConfig rejects an OWNER_EMAILS with no emails in it", () => {
  expect(() => loadConfig({ ...validEnv, OWNER_EMAILS: " , " })).toThrow(/OWNER_EMAILS must list at least one email/);
});
