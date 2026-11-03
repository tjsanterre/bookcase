import { sql } from "drizzle-orm";
import { openDb } from "../db.ts";
import { TEST_DATABASE_URL } from "./url.ts";

export const db = openDb({ url: TEST_DATABASE_URL, driver: "pg" });

/** Empties every table; call from beforeEach. */
export const resetDb = () => db.execute(sql`TRUNCATE book, tag, book_tag, cover RESTART IDENTITY CASCADE`);
