import { serveStatic } from "@hono/node-server/serve-static";
import type Database from "better-sqlite3";
import { Hono } from "hono";
import { createBookStore, DuplicateIsbn, InvalidInput, parseBookDetails, parseTags } from "./books.ts";
import { normalizeIsbn } from "./isbn.ts";
import { createOpenLibrary, LookupFailed, type Lookup } from "./openLibrary.ts";
import { normalizeTag } from "./tags.ts";

export function createApp(opts: {
  db: Database.Database;
  webRoot?: string;
  lookup?: (isbn: string) => Promise<Lookup | undefined>;
}) {
  const lookup = opts.lookup ?? createOpenLibrary(fetch, "Bookcase");
  const store = createBookStore(opts.db);
  const app = new Hono();
  app.get("/api/health", (c) => c.json({ ok: true }));

  app.onError((e, c) => {
    if (e instanceof InvalidInput) return c.json({ error: e.message }, 400);
    if (e instanceof LookupFailed) return c.json({ error: e.message }, 502);
    if (e instanceof DuplicateIsbn) return c.json({ error: "a Book with that ISBN already exists" }, 409);
    throw e;
  });

  // Reads the JSON body; unparseable input becomes InvalidInput
  const readJson = (c: { req: { json(): Promise<unknown> } }) =>
    c.req.json().catch(() => {
      throw new InvalidInput("body must be valid JSON");
    });

  // The :isbn path segment may be an ISBN-10; unknown or malformed ISBNs both read as "not found"
  const isbnParam = (raw: string) => normalizeIsbn(raw) ?? "";

  app.get("/api/books", (c) => {
    const { q, mode = "all", sort = "title" } = c.req.query();
    if (mode !== "all" && mode !== "any") throw new InvalidInput("mode must be all or any");
    if (sort !== "title" && sort !== "author" && sort !== "recent") {
      throw new InvalidInput("sort must be title, author or recent");
    }
    // An invalid tag becomes "", which matches no Book
    const tags = (c.req.queries("tag") ?? []).map((t) => normalizeTag(t) ?? "");
    return c.json(store.list({ q, tags, mode, sort }));
  });

  app.post("/api/books", async (c) => {
    const body = await readJson(c);
    const tags = parseTags((body as { tags?: unknown } | null)?.tags ?? []);
    return c.json(store.create(parseBookDetails(body), tags), 201);
  });

  // Outcomes: saved (hit), duplicate (already in the Bookcase), manual (Open Library has no usable edition)
  app.post("/api/scan", async (c) => {
    const raw = ((await readJson(c)) as { isbn?: unknown } | null)?.isbn;
    const isbn = typeof raw === "string" ? normalizeIsbn(raw) : null;
    if (!isbn) throw new InvalidInput("isbn is not a valid ISBN-10 or ISBN-13");
    const existing = store.get(isbn);
    if (existing) return c.json({ status: "duplicate", book: existing });
    const found = await lookup(isbn);
    if (!found) return c.json({ status: "manual", isbn });
    const book = store.create(found.details);
    if (found.cover) store.setCover(isbn, found.cover.contentType, found.cover.data);
    return c.json({ status: "saved", book }, 201);
  });

  app.get("/api/books/:isbn", (c) => {
    const book = store.get(isbnParam(c.req.param("isbn")));
    return book ? c.json(book) : c.json({ error: "not found" }, 404);
  });

  app.put("/api/books/:isbn", async (c) => {
    const book = store.update(isbnParam(c.req.param("isbn")), parseBookDetails(await readJson(c)));
    return book ? c.json(book) : c.json({ error: "not found" }, 404);
  });

  app.delete("/api/books/:isbn", (c) =>
    store.delete(isbnParam(c.req.param("isbn"))) ? c.body(null, 204) : c.json({ error: "not found" }, 404),
  );

  app.put("/api/books/:isbn/tags", async (c) => {
    const body = (await readJson(c)) as { tags?: unknown } | null;
    const book = store.setTags(isbnParam(c.req.param("isbn")), parseTags(body?.tags));
    return book ? c.json(book) : c.json({ error: "not found" }, 404);
  });

  app.get("/api/books/:isbn/cover", (c) => {
    const cover = store.getCover(isbnParam(c.req.param("isbn")));
    if (!cover) return c.json({ error: "not found" }, 404);
    return c.body(new Uint8Array(cover.data), 200, { "Content-Type": cover.contentType });
  });

  app.get("/api/tags", (c) => c.json(store.listTags()));

  if (opts.webRoot) {
    const root = opts.webRoot;
    // Unknown /api paths must 404, not fall through to the SPA shell below
    app.all("/api/*", (c) => c.notFound());
    app.use("*", serveStatic({ root }));
    app.use("*", serveStatic({ root, path: "index.html" }));
  }
  return app;
}
