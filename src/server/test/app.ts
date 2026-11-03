import { createApp } from "../app.ts";
import { createAuth, PROVIDER_ID } from "../auth.ts";
import { loadConfig } from "../config.ts";
import type { Lookup } from "../openLibrary.ts";
import { db } from "./db.ts";
import { validEnv } from "./env.ts";
import { startFakeOidc, type FakeProfile } from "./oidc.ts";

export const OWNER_EMAIL = "owner@example.com";
export const ownerProfile: FakeProfile = { email: OWNER_EMAIL, email_verified: true };

const oidc = await startFakeOidc();

/** Collects Set-Cookie headers into a Cookie request header. */
const cookieHeader = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

/** The real app wired to the real database and the fake OIDC Provider; no session until `signIn` succeeds. */
export function createTestApp(opts: { lookup?: (isbn: string) => Promise<Lookup | undefined> } = {}) {
  const config = loadConfig({ ...validEnv, OWNER_EMAILS: ` ${OWNER_EMAIL.toUpperCase()} `, OIDC_ISSUER: oidc.issuer });
  const app = createApp({ db, auth: (withProvider) => createAuth(db, config, withProvider), lookup: opts.lookup });
  const base = config.auth.baseURL;

  /** Runs the browser's OAuth round trip as the Provider's `profile`; returns the session cookie, or undefined when rejected. */
  async function signIn(profile: FakeProfile = ownerProfile) {
    oidc.state.profile = profile;
    const start = await app.request(`${base}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ provider: PROVIDER_ID, callbackURL: "/" }),
    });
    const authorize = await fetch(((await start.json()) as { url: string }).url, { redirect: "manual" });
    const callback = await app.request(authorize.headers.get("Location")!, { headers: { Cookie: cookieHeader(start) } });
    const cookie = cookieHeader(callback);
    const session = await app.request(`${base}/api/books`, { headers: { Cookie: cookie } });
    return { cookie: session.status === 200 ? cookie : undefined, callback };
  }

  /** The app with a signed-in Owner's session on every request. */
  async function signedIn(profile: FakeProfile = ownerProfile) {
    const { cookie } = await signIn(profile);
    if (!cookie) throw new Error("test sign-in was rejected");
    return {
      request: (path: string, init: RequestInit = {}) =>
        app.request(path, { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), Cookie: cookie } }),
    };
  }

  return { app, signIn, signedIn };
}

export type SignedInApp = Awaited<ReturnType<ReturnType<typeof createTestApp>["signedIn"]>>;
