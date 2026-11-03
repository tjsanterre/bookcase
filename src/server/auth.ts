import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import type { Config } from "./config.ts";
import type { Db } from "./db.ts";
import { isOwner } from "./owner.ts";
import * as schema from "./schema.ts";

/** The id the SPA names when signing in with the configured OIDC Provider. */
export const PROVIDER_ID = "oidc";

/**
 * Better Auth backed by the app's database; build one per request alongside the Db it shares.
 * Registering the Provider fetches its discovery document, so only the sign-in routes ask for it.
 */
export function createAuth(db: Db, { auth, oidc }: Pick<Config, "auth" | "oidc">, withProvider: boolean) {
  return betterAuth({
    baseURL: auth.baseURL,
    secret: auth.secret,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    plugins: [
      genericOAuth({
        config: withProvider
          ? [
              {
                providerId: PROVIDER_ID,
                discoveryUrl: `${oidc.issuer}/.well-known/openid-configuration`,
                clientId: oidc.clientId,
                clientSecret: oidc.clientSecret,
                scopes: ["openid", "email", "profile"],
              },
            ]
          : [],
      }),
    ],
    user: {
      // Runs on create, account link and every returning sign-in, so removing an email from the allowlist locks it out.
      validateUserInfo: ({ user }) =>
        isOwner(auth.ownerEmails, user as { email?: string; emailVerified?: boolean })
          ? undefined
          : { error: "not_owner", errorDescription: "Only the Owner may sign in" },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
