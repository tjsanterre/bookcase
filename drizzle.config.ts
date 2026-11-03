import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/schema.ts",
  out: "./src/server/migrations",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
