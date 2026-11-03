import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

/** The claims the fake Provider puts in the ID token for a sign-in. */
export interface FakeProfile {
  sub?: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

interface Grant {
  profile: FakeProfile;
  clientId: string;
  nonce: string | null;
}

const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

/**
 * A minimal in-process OIDC Provider (discovery, authorize, token, JWKS; RS256 ID tokens) so tests drive Better Auth's
 * real OAuth code path without Docker. The profile it vouches for is whatever `state.profile` holds when authorize is hit.
 */
export async function startFakeOidc() {
  const state = { profile: undefined as FakeProfile | undefined };
  const grants = new Map<string, Grant>();
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "fake", alg: "RS256", use: "sig" };
  let issuer = "";

  const idToken = ({ profile, clientId, nonce }: Grant) => {
    const now = Math.floor(Date.now() / 1000);
    const claims = { iss: issuer, aud: clientId, iat: now, exp: now + 3600, sub: profile.email, name: "Test Owner", ...profile, nonce };
    const signingInput = `${b64url(JSON.stringify({ alg: "RS256", kid: "fake", typ: "JWT" }))}.${b64url(JSON.stringify(claims))}`;
    return `${signingInput}.${createSign("RSA-SHA256").update(signingInput).sign(privateKey).toString("base64url")}`;
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url!, issuer);
    const json = (body: unknown, status = 200) => res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));

    if (url.pathname === "/.well-known/openid-configuration") {
      return json({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/jwks`,
        id_token_signing_alg_values_supported: ["RS256"],
      });
    }
    if (url.pathname === "/jwks") return json({ keys: [jwk] });
    if (url.pathname === "/authorize") {
      const code = randomUUID();
      const { searchParams } = url;
      grants.set(code, { profile: state.profile!, clientId: searchParams.get("client_id")!, nonce: searchParams.get("nonce") });
      const back = new URL(searchParams.get("redirect_uri")!);
      back.searchParams.set("code", code);
      back.searchParams.set("state", searchParams.get("state")!);
      return void res.writeHead(302, { Location: back.href }).end();
    }
    if (url.pathname === "/token") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      return void req.on("end", () => {
        const grant = grants.get(new URLSearchParams(body).get("code") ?? "");
        if (!grant) return json({ error: "invalid_grant" }, 400);
        json({ access_token: randomUUID(), token_type: "Bearer", expires_in: 3600, id_token: idToken(grant) });
      });
    }
    res.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  server.unref();
  issuer = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { issuer, state };
}
