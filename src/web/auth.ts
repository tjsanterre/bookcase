import { createAuthClient } from "better-auth/vue";

export const authClient = createAuthClient();

export interface ProviderChoice {
  id: string;
  label: string;
}

export const fetchProviders = async (): Promise<ProviderChoice[]> => (await fetch("/api/auth/providers")).json();

/** Sends the browser to the Provider; it returns to `path` (a hash route) after the Worker admits the Owner. */
export const signInWithProvider = (provider: string, path: string) =>
  authClient.signIn.social({ provider, callbackURL: `/#${path}`, errorCallbackURL: "/#/sign-in" });
