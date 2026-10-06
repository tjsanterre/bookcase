import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

const migrationsDir = `${import.meta.dirname}/migrations`;

/** Opens the database (":memory:" for tests) and applies any migrations newer than its user_version. */
export function openDb(path: string): Database.Database {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("foreign_keys = ON");

  // Migration files are named NNN_name.sql; NNN is the user_version they bring the database to
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  const current = db.pragma("user_version", { simple: true }) as number;
  for (const file of files) {
    const version = Number.parseInt(file, 10);
    if (version <= current) continue;
    db.transaction(() => {
      db.exec(readFileSync(`${migrationsDir}/${file}`, "utf8"));
      db.pragma(`user_version = ${version}`);
    })();
  }
  return db;
}
