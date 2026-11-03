import { and, asc, count, eq, inArray, notInArray, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "./db.ts";
import { book, bookTag, cover, tag } from "./schema.ts";
import { authorSortKey } from "./authorSort.ts";
import { normalizeIsbn } from "./isbn.ts";
import { normalizeTag } from "./tags.ts";

export interface BookDetails {
  isbn: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  year: number | null;
  pageCount: number | null;
}

export interface Book extends BookDetails {
  tags: string[];
  hasCover: boolean;
  addedAt: string;
  updatedAt: string;
}

export class InvalidInput extends Error {}
export class DuplicateIsbn extends Error {}

function optionalString(v: unknown, field: string): string | null {
  if (v == null) return null;
  if (typeof v !== "string") throw new InvalidInput(`${field} must be a string`);
  return v.trim() || null;
}

function optionalInt(v: unknown, field: string): number | null {
  if (v == null) return null;
  if (!Number.isInteger(v) || (v as number) < 0) throw new InvalidInput(`${field} must be a non-negative integer`);
  return v as number;
}

/** Validates an untrusted request body into BookDetails, normalising the ISBN to ISBN-13. */
export function parseBookDetails(body: unknown): BookDetails {
  if (typeof body !== "object" || body === null) throw new InvalidInput("body must be an object");
  const b = body as Record<string, unknown>;
  const isbn = typeof b.isbn === "string" ? normalizeIsbn(b.isbn) : null;
  if (!isbn) throw new InvalidInput("isbn is not a valid ISBN-10 or ISBN-13");
  const title = optionalString(b.title, "title");
  if (!title) throw new InvalidInput("title is required");
  const authors = b.authors ?? [];
  if (!Array.isArray(authors) || !authors.every((a) => typeof a === "string")) {
    throw new InvalidInput("authors must be an array of strings");
  }
  return {
    isbn,
    title,
    subtitle: optionalString(b.subtitle, "subtitle"),
    authors: authors.map((a: string) => a.trim()).filter(Boolean),
    publisher: optionalString(b.publisher, "publisher"),
    year: optionalInt(b.year, "year"),
    pageCount: optionalInt(b.pageCount, "pageCount"),
  };
}

/** Validates and normalises a tag list, dropping duplicates. */
export function parseTags(v: unknown): string[] {
  if (!Array.isArray(v) || !v.every((t) => typeof t === "string")) {
    throw new InvalidInput("tags must be an array of strings");
  }
  const tags = v.map((t: string) => {
    const tag = normalizeTag(t);
    if (!tag) throw new InvalidInput(`invalid tag: ${JSON.stringify(t)}`);
    return tag;
  });
  return [...new Set(tags)];
}

export interface BookQuery {
  q?: string;
  tags?: string[];
  mode?: "all" | "any";
  sort?: "title" | "author" | "recent";
}

const likePattern = (word: string) => `%${word.replace(/[\\%_]/g, "\\$&")}%`;

type Executor = Pick<Db, "select" | "insert" | "update" | "delete">;
type BookRow = typeof book.$inferSelect;

// The driver may wrap the pg error, so look at the cause too
const isUniqueViolation = (e: unknown): boolean =>
  (e as { code?: string })?.code === "23505" || (e as { cause?: unknown })?.cause !== undefined && isUniqueViolation((e as { cause: unknown }).cause);

/** Maps the UNIQUE(isbn) violation to DuplicateIsbn */
async function guardDuplicate<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isUniqueViolation(e)) throw new DuplicateIsbn();
    throw e;
  }
}

const writeValues = (d: BookDetails) => ({
  isbn: d.isbn,
  title: d.title,
  subtitle: d.subtitle,
  authors: d.authors,
  publisher: d.publisher,
  year: d.year,
  pageCount: d.pageCount,
  updatedAt: new Date(),
});

async function rowByIsbn(q: Executor, isbn: string): Promise<BookRow | undefined> {
  return (await q.select().from(book).where(eq(book.isbn, isbn)))[0];
}

/** Attaches tags and cover flags to rows with two queries however many rows there are. */
async function toBooks(q: Executor, rows: BookRow[]): Promise<Book[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const tagRows = await q
    .select({ bookId: bookTag.bookId, name: tag.name })
    .from(bookTag)
    .innerJoin(tag, eq(tag.id, bookTag.tagId))
    .where(inArray(bookTag.bookId, ids))
    .orderBy(asc(tag.name));
  const covered = new Set((await q.select({ id: cover.bookId }).from(cover).where(inArray(cover.bookId, ids))).map((c) => c.id));
  return rows.map((row) => ({
    isbn: row.isbn,
    title: row.title,
    subtitle: row.subtitle,
    authors: row.authors,
    publisher: row.publisher,
    year: row.year,
    pageCount: row.pageCount,
    tags: tagRows.filter((t) => t.bookId === row.id).map((t) => t.name),
    hasCover: covered.has(row.id),
    addedAt: row.addedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

const deleteOrphanTags = (q: Executor) =>
  q.delete(tag).where(notInArray(tag.id, q.select({ id: bookTag.tagId }).from(bookTag)));

async function replaceTags(q: Executor, bookId: number, tags: string[]) {
  await q.delete(bookTag).where(eq(bookTag.bookId, bookId));
  if (tags.length) {
    await q.insert(tag).values(tags.map((name) => ({ name }))).onConflictDoNothing();
    const ids = await q.select({ id: tag.id }).from(tag).where(inArray(tag.name, tags));
    await q.insert(bookTag).values(ids.map(({ id }) => ({ bookId, tagId: id })));
  }
  await deleteOrphanTags(q);
}

export function createBookStore(db: Db) {
  const one = async (q: Executor, isbn: string) => {
    const row = await rowByIsbn(q, isbn);
    return row && (await toBooks(q, [row]))[0];
  };

  return {
    async create(details: BookDetails, tags: string[] = []): Promise<Book> {
      return db.transaction(async (tx) => {
        const now = new Date();
        const [row] = await guardDuplicate(() =>
          tx.insert(book).values({ ...writeValues(details), addedAt: now, updatedAt: now }).returning({ id: book.id }),
        );
        await replaceTags(tx, row!.id, tags);
        return (await one(tx, details.isbn))!;
      });
    },

    /** Books matching every word of `q` and the selected tags, sorted; `total` counts the whole Bookcase. */
    async list({ q = "", tags = [], mode = "all", sort = "title" }: BookQuery = {}): Promise<{ books: Book[]; total: number }> {
      // Build the WHERE clause: every query word, then the tag filter
      const where: SQL[] = [];
      for (const word of q.split(/\s+/).filter(Boolean)) {
        const p = likePattern(word);
        where.push(
          or(
            sql`${book.title} ILIKE ${p}`,
            sql`${book.subtitle} ILIKE ${p}`,
            sql`array_to_string(${book.authors}, ' ') ILIKE ${p}`,
            sql`${book.isbn} ILIKE ${p}`,
            sql`EXISTS (SELECT 1 FROM ${bookTag} JOIN ${tag} ON ${tag.id} = ${bookTag.tagId} WHERE ${bookTag.bookId} = ${book.id} AND ${tag.name} ILIKE ${p})`,
          )!,
        );
      }
      if (tags.length) {
        where.push(
          sql`(SELECT COUNT(*) FROM ${bookTag} JOIN ${tag} ON ${tag.id} = ${bookTag.tagId}
            WHERE ${bookTag.bookId} = ${book.id} AND ${inArray(tag.name, tags)}) >= ${mode === "all" ? tags.length : 1}`,
        );
      }
      // Sort in Node, since the author key isn't in SQL
      const rows = await db.select().from(book).where(and(...where));
      const books = await toBooks(db, rows);
      const byTitle = (a: Book, b: Book) => a.title.localeCompare(b.title);
      if (sort === "recent") books.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || byTitle(a, b));
      else if (sort === "author") {
        books.sort((a, b) => authorSortKey(a.authors).localeCompare(authorSortKey(b.authors)) || byTitle(a, b));
      } else books.sort(byTitle);
      const [{ n }] = await db.select({ n: count() }).from(book);
      return { books, total: n! };
    },

    get(isbn: string): Promise<Book | undefined> {
      return one(db, isbn);
    },

    /** Replaces the details of the Book at `isbn`; the new details may carry a different ISBN. */
    async update(isbn: string, details: BookDetails): Promise<Book | undefined> {
      return db.transaction(async (tx) => {
        const row = await rowByIsbn(tx, isbn);
        if (!row) return undefined;
        await guardDuplicate(() => tx.update(book).set(writeValues(details)).where(eq(book.id, row.id)));
        return one(tx, details.isbn);
      });
    },

    async delete(isbn: string): Promise<boolean> {
      return db.transaction(async (tx) => {
        const deleted = await tx.delete(book).where(eq(book.isbn, isbn)).returning({ id: book.id });
        if (!deleted.length) return false;
        await deleteOrphanTags(tx);
        return true;
      });
    },

    async setTags(isbn: string, tags: string[]): Promise<Book | undefined> {
      return db.transaction(async (tx) => {
        const row = await rowByIsbn(tx, isbn);
        if (!row) return undefined;
        await replaceTags(tx, row.id, tags);
        return one(tx, isbn);
      });
    },

    async listTags(): Promise<{ name: string; count: number }[]> {
      return db
        .select({ name: tag.name, count: count() })
        .from(tag)
        .innerJoin(bookTag, eq(bookTag.tagId, tag.id))
        .groupBy(tag.id)
        .orderBy(asc(tag.name));
    },

    async setCover(isbn: string, contentType: string, data: Buffer): Promise<boolean> {
      const row = await rowByIsbn(db, isbn);
      if (!row) return false;
      await db
        .insert(cover)
        .values({ bookId: row.id, contentType, data })
        .onConflictDoUpdate({ target: cover.bookId, set: { contentType, data } });
      return true;
    },

    async getCover(isbn: string): Promise<{ contentType: string; data: Buffer } | undefined> {
      const [row] = await db
        .select({ contentType: cover.contentType, data: cover.data })
        .from(cover)
        .innerJoin(book, eq(book.id, cover.bookId))
        .where(eq(book.isbn, isbn));
      return row;
    },
  };
}

export type BookStore = ReturnType<typeof createBookStore>;
