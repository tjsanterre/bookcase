import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import type { Config } from "./config.ts";
import * as schema from "./schema.ts";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Connects Drizzle with the driver named by the config; both support interactive transactions. */
export function openDb({ url, driver }: Config["database"]): Db {
  if (driver === "pg") return drizzlePg({ client: new pg.Pool({ connectionString: url }), schema, casing: "snake_case" });
  return drizzleNeon({ client: new NeonPool({ connectionString: url }), schema, casing: "snake_case" });
}
