/** A complete, valid environment for loadConfig. */
export const validEnv = {
  DATABASE_DRIVER: "pg",
  DATABASE_URL: "postgres://localhost/x",
  BETTER_AUTH_SECRET: "s3cret",
  BETTER_AUTH_URL: "http://localhost:5173",
  OWNER_EMAILS: " Me@Example.com, you@example.com ,",
  OIDC_ISSUER: "http://localhost:8080/default/",
  OIDC_CLIENT_ID: "bookcase",
  OIDC_CLIENT_SECRET: "shh",
};
