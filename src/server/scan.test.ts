import { beforeEach, expect, test, vi } from "vitest";
import { createApp } from "./app.ts";
import { openDb } from "./db.ts";
import { LookupFailed, type Lookup } from "./openLibrary.ts";

const details = { isbn: "9780306406157", title: "Dune", subtitle: null, authors: ["Frank Herbert"], publisher: "Ace", year: 1965, pageCount: 412 };
const hit: Lookup = { details, cover: { contentType: "image/jpeg", data: Buffer.from([1, 2, 3]) } };

let db: ReturnType<typeof openDb>;
const lookup = vi.fn<(isbn: string) => Promise<Lookup | undefined>>();
const scan = (isbn: unknown) =>
  createApp({ db, lookup }).request("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isbn }),
  });

beforeEach(() => {
  db = openDb(":memory:");
  lookup.mockReset();
});

test("POST /api/scan on a hit saves the Book and its cover with one lookup", async () => {
  lookup.mockResolvedValue(hit);
  const res = await scan("0-306-40615-2");
  expect(res.status).toBe(201);
  expect(await res.json()).toMatchObject({ status: "saved", book: { isbn: "9780306406157", title: "Dune" } });
  expect(lookup).toHaveBeenCalledExactlyOnceWith("9780306406157");
  const cover = await createApp({ db, lookup }).request("/api/books/9780306406157/cover");
  expect(cover.headers.get("content-type")).toBe("image/jpeg");
});

test("POST /api/scan on a miss saves nothing and asks for manual entry", async () => {
  lookup.mockResolvedValue(undefined);
  const res = await scan("9780306406157");
  expect(await res.json()).toEqual({ status: "manual", isbn: "9780306406157" });
  expect(db.prepare("SELECT COUNT(*) AS n FROM book").get()).toEqual({ n: 0 });
});

test("POST /api/scan on a duplicate returns the existing Book without a lookup", async () => {
  lookup.mockResolvedValue(hit);
  await scan("9780306406157");
  lookup.mockClear();
  const res = await scan("0306406152");
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ status: "duplicate", book: { title: "Dune" } });
  expect(lookup).not.toHaveBeenCalled();
});

test("POST /api/scan rejects an invalid ISBN without a lookup", async () => {
  expect((await scan("9780306406158")).status).toBe(400);
  expect((await scan(123)).status).toBe(400);
  expect(lookup).not.toHaveBeenCalled();
});

test("POST /api/scan answers 502 when Open Library fails", async () => {
  lookup.mockRejectedValue(new LookupFailed("Open Library is unreachable"));
  expect((await scan("9780306406157")).status).toBe(502);
});
