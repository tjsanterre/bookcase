import { beforeEach, expect, test } from "vitest";
import { createApp } from "./app.ts";
import { createBookStore } from "./books.ts";
import { openDb } from "./db.ts";

let db: ReturnType<typeof openDb>;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = openDb(":memory:");
  app = createApp({ db });
});

const send = (method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const dune = { isbn: "9780306406157", title: "Dune", authors: ["Frank Herbert"], year: 1965 };

test("openDb applies migrations once and records user_version", () => {
  expect(db.pragma("user_version", { simple: true })).toBe(1);
  expect(() => db.prepare("SELECT 1 FROM book, tag, book_tag, cover").all()).not.toThrow();
});

test("POST /api/books creates a Book and normalises an ISBN-10", async () => {
  const res = await send("POST", "/api/books", { ...dune, isbn: "0-306-40615-2", tags: [" SciFi "] });
  expect(res.status).toBe(201);
  expect(await res.json()).toMatchObject({ isbn: "9780306406157", title: "Dune", tags: ["scifi"], subtitle: null });
});

test("POST /api/books rejects a duplicate ISBN, even given as ISBN-10", async () => {
  await send("POST", "/api/books", dune);
  const res = await send("POST", "/api/books", { ...dune, isbn: "0306406152" });
  expect(res.status).toBe(409);
  expect(db.prepare("SELECT COUNT(*) AS n FROM book").get()).toEqual({ n: 1 });
});

test("POST /api/books rejects a bad check digit, missing title, and bad JSON", async () => {
  expect((await send("POST", "/api/books", { ...dune, isbn: "9780306406158" })).status).toBe(400);
  expect((await send("POST", "/api/books", { ...dune, title: "  " })).status).toBe(400);
  expect((await send("POST", "/api/books", { ...dune, tags: ["x".repeat(41)] })).status).toBe(400);
  const res = await app.request("/api/books", { method: "POST", body: "{nope" });
  expect(res.status).toBe(400);
});

test("GET /api/books/:isbn finds a Book by ISBN-10 or ISBN-13 and 404s otherwise", async () => {
  await send("POST", "/api/books", dune);
  expect((await send("GET", "/api/books/0306406152")).status).toBe(200);
  expect((await send("GET", "/api/books/9780306406157")).status).toBe(200);
  expect((await send("GET", "/api/books/9781234567897")).status).toBe(404);
  expect((await send("GET", "/api/books/garbage")).status).toBe(404);
});

test("PUT /api/books/:isbn updates details and can change the ISBN", async () => {
  await send("POST", "/api/books", { ...dune, tags: ["a"] });
  const res = await send("PUT", "/api/books/9780306406157", { ...dune, isbn: "9780804429573", title: "Dune Messiah" });
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ isbn: "9780804429573", title: "Dune Messiah", tags: ["a"] });
  expect((await send("GET", "/api/books/9780306406157")).status).toBe(404);
});

test("PUT /api/books/:isbn refuses an ISBN that belongs to another Book", async () => {
  await send("POST", "/api/books", dune);
  await send("POST", "/api/books", { isbn: "9780804429573", title: "Other" });
  const res = await send("PUT", "/api/books/9780804429573", dune);
  expect(res.status).toBe(409);
  expect(await (await send("GET", "/api/books/9780804429573")).json()).toMatchObject({ title: "Other" });
});

test("PUT /api/books/:isbn 404s for an unknown Book", async () => {
  expect((await send("PUT", "/api/books/9780306406157", dune)).status).toBe(404);
});

test("DELETE /api/books/:isbn removes the Book, its cover and its orphaned tags", async () => {
  await send("POST", "/api/books", { ...dune, tags: ["solo", "shared"] });
  await send("POST", "/api/books", { isbn: "9780804429573", title: "Other", tags: ["shared"] });
  createBookStore(db).setCover(dune.isbn, "image/png", Buffer.from([1, 2, 3]));

  expect((await send("DELETE", "/api/books/9780306406157")).status).toBe(204);
  expect((await send("GET", "/api/books/9780306406157")).status).toBe(404);
  expect(db.prepare("SELECT COUNT(*) AS n FROM cover").get()).toEqual({ n: 0 });
  expect(await (await send("GET", "/api/tags")).json()).toEqual([{ name: "shared", count: 1 }]);
  expect((await send("DELETE", "/api/books/9780306406157")).status).toBe(404);
});

test("PUT /api/books/:isbn/tags replaces tags and deletes a tag once its last Book loses it", async () => {
  await send("POST", "/api/books", { ...dune, tags: ["a", "b"] });
  await send("POST", "/api/books", { isbn: "9780804429573", title: "Other", tags: ["b"] });

  const res = await send("PUT", "/api/books/9780306406157/tags", { tags: ["B", "c", "c"] });
  expect(await res.json()).toMatchObject({ tags: ["b", "c"] });
  expect(await (await send("GET", "/api/tags")).json()).toEqual([
    { name: "b", count: 2 },
    { name: "c", count: 1 },
  ]);
  expect(db.prepare("SELECT COUNT(*) AS n FROM tag").get()).toEqual({ n: 2 });
});

test("PUT /api/books/:isbn/tags rejects invalid tags and unknown Books", async () => {
  await send("POST", "/api/books", dune);
  expect((await send("PUT", "/api/books/9780306406157/tags", { tags: [""] })).status).toBe(400);
  expect((await send("PUT", "/api/books/9780306406157/tags", {})).status).toBe(400);
  expect((await send("PUT", "/api/books/9780804429573/tags", { tags: [] })).status).toBe(404);
});

test("GET /api/books/:isbn/cover serves the stored image and 404s without one", async () => {
  await send("POST", "/api/books", dune);
  expect((await send("GET", "/api/books/9780306406157/cover")).status).toBe(404);

  createBookStore(db).setCover(dune.isbn, "image/png", Buffer.from([1, 2, 3]));
  const res = await send("GET", "/api/books/9780306406157/cover");
  expect(res.headers.get("Content-Type")).toBe("image/png");
  expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([1, 2, 3]);
});
