export interface Config {
  database: { url: string; driver: "pg" | "neon" };
  /** Sent in the User-Agent of Open Library requests; undefined when unset. */
  contactEmail: string | undefined;
  auth: {
    secret: string;
    /** The origin the browser reaches the app at; OAuth redirect URIs are built from it. */
    baseURL: string;
    /** Lowercased emails of the Owner(s) admitted at sign-in. */
    ownerEmails: string[];
  };
  /** The OIDC Provider. Its discovery document lives at `${issuer}/.well-known/openid-configuration`. */
  oidc: { issuer: string; clientId: string; clientSecret: string };
}

/** Reads the environment into a Config, throwing one error that lists every missing or invalid key. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const problems: string[] = [];
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value) problems.push(`${key} is required`);
    return value ?? "";
  };

  const url = required("DATABASE_URL");
  const driver = env.DATABASE_DRIVER;
  if (driver !== "pg" && driver !== "neon") problems.push("DATABASE_DRIVER must be pg or neon");
  const secret = required("BETTER_AUTH_SECRET");
  const baseURL = required("BETTER_AUTH_URL");
  const ownerEmails = required("OWNER_EMAILS")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (env.OWNER_EMAILS?.trim() && !ownerEmails.length) problems.push("OWNER_EMAILS must list at least one email");
  const issuer = required("OIDC_ISSUER").replace(/\/+$/, "");
  const clientId = required("OIDC_CLIENT_ID");
  const clientSecret = required("OIDC_CLIENT_SECRET");
  if (problems.length) throw new Error(`Invalid configuration (see .dev.vars.example): ${problems.join("; ")}`);

  return {
    database: { url, driver: driver as "pg" | "neon" },
    contactEmail: env.BOOKCASE_CONTACT_EMAIL,
    auth: { secret, baseURL, ownerEmails },
    oidc: { issuer, clientId, clientSecret },
  };
}
