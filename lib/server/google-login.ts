import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { outsideFetch } from "./outside-fetch";

// Staff log in with Google, pauseai.uk Workspace accounts only. The OAuth
// client is "Internal", so Google refuses other accounts; we check anyway.
// Done by hand rather than with a library so every request to Google goes
// through outsideFetch, and the fixture Google flow covers it in tests.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** The Workspace domain whose accounts are staff. */
export const STAFF_DOMAIN = "pauseai.uk";

type GoogleClient = { clientId: string; clientSecret: string };

export function googleClient(): GoogleClient | undefined {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

function base64url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

export function callbackUrl(origin: string): string {
  return `${origin}/staff/api/callback`;
}

/** Where to send someone to log in, and the state and verifier to check when they come back. */
export function startLogin(client: GoogleClient, origin: string): { url: string; state: string; verifier: string } {
  const state = base64url(randomBytes(24));
  const verifier = base64url(randomBytes(32));
  const params = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: callbackUrl(origin),
    response_type: "code",
    scope: "openid email",
    state,
    code_challenge: base64url(createHash("sha256").update(verifier).digest()),
    code_challenge_method: "S256",
    hd: STAFF_DOMAIN,
    prompt: "select_account",
  });
  return { url: `${AUTH_URL}?${params}`, state, verifier };
}

export type LoginResult = { ok: true; email: string } | { ok: false; reason: string };

/**
 * Swaps Google's code for an ID token, and checks it: Google's signature,
 * issuer and audience, a verified email, and `hd` exactly pauseai.uk.
 */
export async function finishLogin(client: GoogleClient, origin: string, code: string, verifier: string): Promise<LoginResult> {
  const tokenRes = await outsideFetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: callbackUrl(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return { ok: false, reason: `token request failed with ${tokenRes.status}` };
  const { id_token: idToken } = await tokenRes.json();
  if (typeof idToken !== "string") return { ok: false, reason: "no ID token" };

  const keysRes = await outsideFetch(KEYS_URL);
  if (!keysRes.ok) return { ok: false, reason: `key request failed with ${keysRes.status}` };
  const keys = createLocalJWKSet((await keysRes.json()) as JSONWebKeySet);

  try {
    const { payload } = await jwtVerify(idToken, keys, { issuer: ISSUERS, audience: client.clientId });
    if (payload.email_verified !== true) return { ok: false, reason: "email not verified" };
    if (payload.hd !== STAFF_DOMAIN) return { ok: false, reason: `not a ${STAFF_DOMAIN} account` };
    const email = String(payload.email ?? "");
    if (!email.toLowerCase().endsWith(`@${STAFF_DOMAIN}`)) return { ok: false, reason: `not a ${STAFF_DOMAIN} email` };
    return { ok: true, email };
  } catch (error) {
    return { ok: false, reason: `bad ID token: ${(error as Error).message}` };
  }
}
