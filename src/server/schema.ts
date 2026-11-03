import { customType, index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const book = pgTable("book", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  isbn: text().notNull().unique(),
  title: text().notNull(),
  subtitle: text(),
  authors: text().array().notNull().default([]),
  publisher: text(),
  year: integer(),
  pageCount: integer(),
  addedAt: timestamp({ withTimezone: true }).notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull(),
});

export const tag = pgTable("tag", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull().unique(),
});

export const bookTag = pgTable(
  "book_tag",
  {
    bookId: integer().notNull().references(() => book.id, { onDelete: "cascade" }),
    tagId: integer().notNull().references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.tagId] }), index("book_tag_tag_id").on(t.tagId)],
);

export const cover = pgTable("cover", {
  bookId: integer().primaryKey().references(() => book.id, { onDelete: "cascade" }),
  contentType: text().notNull(),
  data: bytea().notNull(),
});
