import type Database from "better-sqlite3";
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

interface BookRow {
  id: number;
  isbn: string;
  title: string;
  subtitle: string | null;
  authors: string;
  publisher: string | null;
  year: number | null;
  page_count: number | null;
  added_at: string;
  updated_at: string;
}

export function createBookStore(db: Database.Database) {
  const insertBook = db.prepare(
    `INSERT INTO book (isbn, title, subtitle, authors, publisher, year, page_count, added_at, updated_at)
     VALUES (@isbn, @title, @subtitle, @authors, @publisher, @year, @pageCount, @now, @now)`,
  );
  const updateBook = db.prepare(
    `UPDATE book SET isbn = @isbn, title = @title, subtitle = @subtitle, authors = @authors,
       publisher = @publisher, year = @year, page_count = @pageCount, updated_at = @now
     WHERE id = @id`,
  );
  const rowByIsbn = db.prepare<[string], BookRow>("SELECT * FROM book WHERE isbn = ?");
  const tagsFor = db.prepare<[number], { name: string }>(
    "SELECT t.name FROM tag t JOIN book_tag bt ON bt.tag_id = t.id WHERE bt.book_id = ? ORDER BY t.name",
  );
  const deleteBook = db.prepare("DELETE FROM book WHERE id = ?");
  const clearBookTags = db.prepare("DELETE FROM book_tag WHERE book_id = ?");
  const insertTag = db.prepare("INSERT OR IGNORE INTO tag (name) VALUES (?)");
  const linkTag = db.prepare(
    "INSERT INTO book_tag (book_id, tag_id) SELECT ?, id FROM tag WHERE name = ?",
  );
  const deleteOrphanTags = db.prepare(
    "DELETE FROM tag WHERE id NOT IN (SELECT tag_id FROM book_tag)",
  );
  const selectTags = db.prepare("SELECT name, COUNT(*) AS count FROM tag t JOIN book_tag bt ON bt.tag_id = t.id GROUP BY t.id ORDER BY name");
  const upsertCover = db.prepare(
    "INSERT OR REPLACE INTO cover (book_id, content_type, data) VALUES (?, ?, ?)",
  );
  const selectCover = db.prepare<[string], { content_type: string; data: Buffer }>(
    "SELECT c.content_type, c.data FROM cover c JOIN book b ON b.id = c.book_id WHERE b.isbn = ?",
  );

  function toBook(row: BookRow): Book {
    return {
      isbn: row.isbn,
      title: row.title,
      subtitle: row.subtitle,
      authors: JSON.parse(row.authors),
      publisher: row.publisher,
      year: row.year,
      pageCount: row.page_count,
      tags: tagsFor.all(row.id).map((t) => t.name),
      addedAt: row.added_at,
      updatedAt: row.updated_at,
    };
  }

  // Maps the UNIQUE(isbn) violation to DuplicateIsbn
  function guardDuplicate<T>(fn: () => T): T {
    try {
      return fn();
    } catch (e) {
      if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") throw new DuplicateIsbn();
      throw e;
    }
  }

  function writeParams(d: BookDetails) {
    return { ...d, authors: JSON.stringify(d.authors), now: new Date().toISOString() };
  }

  function replaceTags(bookId: number, tags: string[]) {
    clearBookTags.run(bookId);
    for (const name of tags) {
      insertTag.run(name);
      linkTag.run(bookId, name);
    }
    deleteOrphanTags.run();
  }

  return {
    create(details: BookDetails, tags: string[] = []): Book {
      return db.transaction(() => {
        const { lastInsertRowid } = guardDuplicate(() => insertBook.run(writeParams(details)));
        replaceTags(Number(lastInsertRowid), tags);
        return toBook(rowByIsbn.get(details.isbn)!);
      })();
    },

    get(isbn: string): Book | undefined {
      const row = rowByIsbn.get(isbn);
      return row && toBook(row);
    },

    /** Replaces the details of the Book at `isbn`; the new details may carry a different ISBN. */
    update(isbn: string, details: BookDetails): Book | undefined {
      return db.transaction(() => {
        const row = rowByIsbn.get(isbn);
        if (!row) return undefined;
        guardDuplicate(() => updateBook.run({ ...writeParams(details), id: row.id }));
        return toBook(rowByIsbn.get(details.isbn)!);
      })();
    },

    delete(isbn: string): boolean {
      return db.transaction(() => {
        const row = rowByIsbn.get(isbn);
        if (!row) return false;
        deleteBook.run(row.id);
        deleteOrphanTags.run();
        return true;
      })();
    },

    setTags(isbn: string, tags: string[]): Book | undefined {
      return db.transaction(() => {
        const row = rowByIsbn.get(isbn);
        if (!row) return undefined;
        replaceTags(row.id, tags);
        return toBook(row);
      })();
    },

    listTags(): { name: string; count: number }[] {
      return selectTags.all() as { name: string; count: number }[];
    },

    setCover(isbn: string, contentType: string, data: Buffer): boolean {
      const row = rowByIsbn.get(isbn);
      if (!row) return false;
      upsertCover.run(row.id, contentType, data);
      return true;
    },

    getCover(isbn: string): { contentType: string; data: Buffer } | undefined {
      const row = selectCover.get(isbn);
      return row && { contentType: row.content_type, data: row.data };
    },
  };
}

export type BookStore = ReturnType<typeof createBookStore>;
