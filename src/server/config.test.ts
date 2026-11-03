import { expect, test } from "vitest";
import { loadConfig } from "./config.ts";
import { validEnv } from "./test/env.ts";

test("loadConfig reads every setting and normalizes the Owner emails and issuer", () => {
  expect(loadConfig(validEnv)).toEqual({
    database: { url: "postgres://localhost/x", driver: "pg" },
    contactEmail: undefined,
    auth: { secret: "s3cret", baseURL: "http://localhost:5173", ownerEmails: ["me@example.com", "you@example.com"] },
    providers: [{ id: "oidc", label: "Mock Provider", issuer: "http://localhost:8080/default", clientId: "bookcase", clientSecret: "shh" }],
  });
});

test("loadConfig fails loudly, listing every missing key and an unknown driver", () => {
  expect(() => loadConfig({})).toThrow(
    /DATABASE_URL is required; DATABASE_DRIVER must be pg or neon; BETTER_AUTH_SECRET is required; BETTER_AUTH_URL is required; OWNER_EMAILS is required; no Provider configured/,
  );
  expect(() => loadConfig({ ...validEnv, DATABASE_DRIVER: "sqlite" })).toThrow(/DATABASE_DRIVER/);
  expect(loadConfig({ ...validEnv, DATABASE_DRIVER: "neon" }).database.driver).toBe("neon");
});

test("loadConfig rejects an OWNER_EMAILS with no emails in it", () => {
  expect(() => loadConfig({ ...validEnv, OWNER_EMAILS: " , " })).toThrow(/OWNER_EMAILS must list at least one email/);
});

const google = { GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gsecret" };
const noMock = { ...validEnv, OIDC_ISSUER: undefined, OIDC_CLIENT_ID: undefined, OIDC_CLIENT_SECRET: undefined };

test("loadConfig enables Google from its two keys and lists it beside the mock Provider", () => {
  expect(loadConfig({ ...noMock, ...google }).providers).toEqual([
    { id: "google", label: "Google", issuer: "https://accounts.google.com", clientId: "gid", clientSecret: "gsecret" },
  ]);
  expect(loadConfig({ ...validEnv, ...google }).providers.map((p) => p.id)).toEqual(["google", "oidc"]);
});

test("loadConfig rejects a half-configured Provider", () => {
  expect(() => loadConfig({ ...noMock, GOOGLE_CLIENT_ID: "gid" })).toThrow(/GOOGLE_CLIENT_SECRET required when GOOGLE_CLIENT_ID is set/);
  expect(() => loadConfig({ ...validEnv, OIDC_CLIENT_SECRET: undefined })).toThrow(/OIDC_CLIENT_SECRET required when OIDC_ISSUER is set/);
});
