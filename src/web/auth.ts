import { createAuthClient } from "better-auth/vue";

export const authClient = createAuthClient();

/** The id the Worker registers the OIDC Provider under. */
const PROVIDER_ID = "oidc";

/** Sends the browser to the Provider; it returns to `path` (a hash route) after the Worker admits the Owner. */
export const signInWithProvider = (path: string) =>
  authClient.signIn.social({ provider: PROVIDER_ID, callbackURL: `/#${path}`, errorCallbackURL: "/#/sign-in" });
