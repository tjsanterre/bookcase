import { expect, test } from "vitest";
import { loadConfig } from "./config.ts";

const db = { DATABASE_DRIVER: "pg", DATABASE_URL: "postgres://localhost/x" };

test("loadConfig applies defaults when only the database is set", () => {
  expect(loadConfig(db)).toEqual({
    host: "0.0.0.0",
    port: 3000,
    database: { url: "postgres://localhost/x", driver: "pg" },
    contactEmail: undefined,
    tls: undefined,
  });
});

test("loadConfig reads host and port from env", () => {
  expect(loadConfig({ ...db, BOOKCASE_HOST: "127.0.0.1", BOOKCASE_PORT: "8443" })).toMatchObject({ host: "127.0.0.1", port: 8443 });
});

test("loadConfig fails loudly on a missing URL or an unknown driver", () => {
  expect(() => loadConfig({})).toThrow(/DATABASE_URL is required; DATABASE_DRIVER must be pg or neon/);
  expect(() => loadConfig({ ...db, DATABASE_DRIVER: "sqlite" })).toThrow(/DATABASE_DRIVER/);
  expect(loadConfig({ ...db, DATABASE_DRIVER: "neon" }).database.driver).toBe("neon");
});

test("loadConfig enables tls only when both cert and key are set", () => {
  expect(loadConfig({ ...db, BOOKCASE_TLS_CERT: "c.pem" }).tls).toBeUndefined();
  expect(loadConfig({ ...db, BOOKCASE_TLS_KEY: "k.pem" }).tls).toBeUndefined();
  expect(loadConfig({ ...db, BOOKCASE_TLS_CERT: "c.pem", BOOKCASE_TLS_KEY: "k.pem" }).tls).toEqual({
    cert: "c.pem",
    key: "k.pem",
  });
});
