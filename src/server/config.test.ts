import { expect, test } from "vitest";
import { loadConfig } from "./config.ts";

test("loadConfig applies defaults when env is empty", () => {
  expect(loadConfig({})).toEqual({
    host: "0.0.0.0",
    port: 3000,
    db: "./data/bookcase.db",
    tls: undefined,
  });
});

test("loadConfig reads host, port and db from env", () => {
  const c = loadConfig({ BOOKCASE_HOST: "127.0.0.1", BOOKCASE_PORT: "8443", BOOKCASE_DB: "/tmp/b.db" });
  expect(c).toMatchObject({ host: "127.0.0.1", port: 8443, db: "/tmp/b.db" });
});

test("loadConfig enables tls only when both cert and key are set", () => {
  expect(loadConfig({ BOOKCASE_TLS_CERT: "c.pem" }).tls).toBeUndefined();
  expect(loadConfig({ BOOKCASE_TLS_KEY: "k.pem" }).tls).toBeUndefined();
  expect(loadConfig({ BOOKCASE_TLS_CERT: "c.pem", BOOKCASE_TLS_KEY: "k.pem" }).tls).toEqual({
    cert: "c.pem",
    key: "k.pem",
  });
});
