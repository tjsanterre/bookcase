import { Hono } from "hono";
import type { Auth } from "./auth.ts";
import type { Db } from "./db.ts";
import { createBookStore, DuplicateIsbn, InvalidInput, parseBookDetails, parseTags } from "./books.ts";
import { normalizeIsbn } from "./isbn.ts";
import { createOpenLibrary, LookupFailed, type Lookup } from "./openLibrary.ts";
import { normalizeTag } from "./tags.ts";

export function createApp(opts: {
  db: Db;
  /** Builds Better Auth; `withProvider` is true only for the sign-in routes. */
  auth: (withProvider: boolean) => Auth;
  lookup?: (isbn: string) => Promise<Lookup | undefined>;
}) {
  const lookup = opts.lookup ?? createOpenLibrary(fetch, "Bookcase");
  const store = createBookStore(opts.db);
  const app = new Hono();
  app.get("/api/health", (c) => c.json({ ok: true }));
  app.on(["GET", "POST"], "/api/auth/*", (c) => opts.auth(true).handler(c.req.raw));

  // Everything registered below this point needs a session
  app.use("/api/*", async (c, next) => {
    if (!(await opts.auth(false).api.getSession({ headers: c.req.raw.headers }))) return c.json({ error: "unauthorized" }, 401);
    await next();
  });

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

  app.get("/api/books", async (c) => {
    const { q, mode = "all", sort = "title" } = c.req.query();
    if (mode !== "all" && mode !== "any") throw new InvalidInput("mode must be all or any");
    if (sort !== "title" && sort !== "author" && sort !== "recent") {
      throw new InvalidInput("sort must be title, author or recent");
    }
    // An invalid tag becomes "", which matches no Book
    const tags = (c.req.queries("tag") ?? []).map((t) => normalizeTag(t) ?? "");
    return c.json(await store.list({ q, tags, mode, sort }));
  });

  app.post("/api/books", async (c) => {
    const body = await readJson(c);
    const tags = parseTags((body as { tags?: unknown } | null)?.tags ?? []);
    return c.json(await store.create(parseBookDetails(body), tags), 201);
  });

  // Outcomes: saved (hit), duplicate (already in the Bookcase), manual (Open Library has no usable edition)
  app.post("/api/add", async (c) => {
    const raw = ((await readJson(c)) as { isbn?: unknown } | null)?.isbn;
    const isbn = typeof raw === "string" ? normalizeIsbn(raw) : null;
    if (!isbn) throw new InvalidInput("isbn is not a valid ISBN-10 or ISBN-13");
    const existing = await store.get(isbn);
    if (existing) return c.json({ status: "duplicate", book: existing });
    const found = await lookup(isbn);
    if (!found) return c.json({ status: "manual", isbn });
    await store.create(found.details);
    if (found.cover) await store.setCover(isbn, found.cover.contentType, found.cover.data);
    return c.json({ status: "saved", book: await store.get(isbn) }, 201);
  });

  app.get("/api/books/:isbn", async (c) => {
    const book = await store.get(isbnParam(c.req.param("isbn")));
    return book ? c.json(book) : c.json({ error: "not found" }, 404);
  });

  app.put("/api/books/:isbn", async (c) => {
    const book = await store.update(isbnParam(c.req.param("isbn")), parseBookDetails(await readJson(c)));
    return book ? c.json(book) : c.json({ error: "not found" }, 404);
  });

  app.delete("/api/books/:isbn", async (c) =>
    (await store.delete(isbnParam(c.req.param("isbn")))) ? c.body(null, 204) : c.json({ error: "not found" }, 404),
  );

  app.put("/api/books/:isbn/tags", async (c) => {
    const body = (await readJson(c)) as { tags?: unknown } | null;
    const book = await store.setTags(isbnParam(c.req.param("isbn")), parseTags(body?.tags));
    return book ? c.json(book) : c.json({ error: "not found" }, 404);
  });

  app.get("/api/books/:isbn/cover", async (c) => {
    const cover = await store.getCover(isbnParam(c.req.param("isbn")));
    if (!cover) return c.json({ error: "not found" }, 404);
    // A cover only changes when its Book is deleted and re-added, so browsers may cache it for a year
    return c.body(new Uint8Array(cover.data), 200, {
      "Content-Type": cover.contentType,
      "Cache-Control": "public, max-age=31536000",
    });
  });

  app.get("/api/tags", async (c) => c.json(await store.listTags()));

  return app;
}
