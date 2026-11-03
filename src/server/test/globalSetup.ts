import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { TEST_DATABASE_URL } from "./url.ts";

/** Creates the test database if needed and brings it to the latest migration. */
export default async function setup() {
  const target = new URL(TEST_DATABASE_URL);
  const name = target.pathname.slice(1);
  const admin = new pg.Client({ connectionString: new URL("/postgres", target).href, connectionTimeoutMillis: 5000 });
  try {
    await admin.connect();
  } catch (e) {
    throw new Error(
      `Cannot reach Postgres at ${target.host} (${(e as Error).message}). Start it with \`docker compose up -d db\`, or set TEST_DATABASE_URL.`,
    );
  }
  const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (!rowCount) await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  await admin.end();

  const pool = new pg.Pool({ connectionString: TEST_DATABASE_URL });
  await migrate(drizzle({ client: pool }), { migrationsFolder: `${import.meta.dirname}/../migrations` });
  await pool.end();
}
