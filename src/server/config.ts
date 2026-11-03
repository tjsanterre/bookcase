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
  /** The configured Providers, at least one. Each discovery document lives at `${issuer}/.well-known/openid-configuration`. */
  providers: ProviderConfig[];
}

export interface ProviderConfig {
  /** The id the SPA names when signing in with it. */
  id: string;
  label: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
}

// One entry per supported Provider; it is enabled once its keys are set. Without `issuer`, `issuerKey` names the env key holding it.
const PROVIDERS = [
  { id: "google", label: "Google", issuer: "https://accounts.google.com", clientIdKey: "GOOGLE_CLIENT_ID", clientSecretKey: "GOOGLE_CLIENT_SECRET" },
  { id: "oidc", label: "Mock Provider", issuerKey: "OIDC_ISSUER", clientIdKey: "OIDC_CLIENT_ID", clientSecretKey: "OIDC_CLIENT_SECRET" },
];

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

  const providers: ProviderConfig[] = [];
  for (const { id, label, ...p } of PROVIDERS) {
    const keys = [p.issuerKey, p.clientIdKey, p.clientSecretKey].filter((k): k is string => !!k);
    const [set, missing] = [keys.filter((k) => env[k]?.trim()), keys.filter((k) => !env[k]?.trim())];
    if (!set.length) continue;
    if (missing.length) problems.push(`${missing.join(", ")} required when ${set[0]} is set`);
    else {
      const issuer = p.issuerKey ? env[p.issuerKey]!.trim() : p.issuer!;
      providers.push({ id, label, issuer: issuer.replace(/\/+$/, ""), clientId: env[p.clientIdKey]!.trim(), clientSecret: env[p.clientSecretKey]!.trim() });
    }
  }
  if (!providers.length && !problems.some((x) => x.includes("required when"))) {
    problems.push("no Provider configured: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (or the OIDC_* mock keys)");
  }
  if (problems.length) throw new Error(`Invalid configuration (see .dev.vars.example): ${problems.join("; ")}`);

  return {
    database: { url, driver: driver as "pg" | "neon" },
    contactEmail: env.BOOKCASE_CONTACT_EMAIL,
    auth: { secret, baseURL, ownerEmails },
    providers,
  };
}
