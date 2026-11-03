export interface Config {
  database: { url: string; driver: "pg" | "neon" };
  /** Sent in the User-Agent of Open Library requests; undefined when unset. */
  contactEmail: string | undefined;
}

/** Reads the environment into a Config, throwing one error that lists every missing or invalid key. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const problems: string[] = [];
  const url = env.DATABASE_URL;
  if (!url) problems.push("DATABASE_URL is required");
  const driver = env.DATABASE_DRIVER;
  if (driver !== "pg" && driver !== "neon") problems.push("DATABASE_DRIVER must be pg or neon");
  if (problems.length) throw new Error(`Invalid configuration (see .dev.vars.example): ${problems.join("; ")}`);

  return {
    database: { url: url!, driver: driver as "pg" | "neon" },
    contactEmail: env.BOOKCASE_CONTACT_EMAIL,
  };
}
