import { boolean, customType, index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

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

// Better Auth's core tables. Property names are the field names the adapter looks up; casing: "snake_case" maps them to columns.
export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ipAddress: text(),
    userAgent: text(),
    userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_id").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_identifier").on(t.identifier)],
);
