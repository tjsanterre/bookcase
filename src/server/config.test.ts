import { expect, test } from "vitest";
import { loadConfig } from "./config.ts";

const db = { DATABASE_DRIVER: "pg", DATABASE_URL: "postgres://localhost/x" };

test("loadConfig applies defaults when only the database is set", () => {
  expect(loadConfig(db)).toEqual({
    database: { url: "postgres://localhost/x", driver: "pg" },
    contactEmail: undefined,
  });
});

test("loadConfig fails loudly on a missing URL or an unknown driver", () => {
  expect(() => loadConfig({})).toThrow(/DATABASE_URL is required; DATABASE_DRIVER must be pg or neon/);
  expect(() => loadConfig({ ...db, DATABASE_DRIVER: "sqlite" })).toThrow(/DATABASE_DRIVER/);
  expect(loadConfig({ ...db, DATABASE_DRIVER: "neon" }).database.driver).toBe("neon");
});
