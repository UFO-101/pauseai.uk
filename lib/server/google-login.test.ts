import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from "jose";
import { createHash } from "node:crypto";
import { server } from "@/tests/fixtures/msw";
import { callbackUrl, finishLogin, googleClient, startLogin } from "./google-login";

const CLIENT = { clientId: "client-1", clientSecret: "secret-1" };
const TOKEN = "https://oauth2.googleapis.com/token";
const KEYS = "https://www.googleapis.com/oauth2/v3/certs";

let privateKey: CryptoKey;
let jwks: object;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  jwks = { keys: [{ ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" }] };
});

function idToken(claims: Record<string, unknown>, { audience = CLIENT.clientId, issuer = "https://accounts.google.com" } = {}) {
  return new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime("5m").sign(privateKey);
}

/** Google answers with this ID token, and records the token request. */
function google(token: Promise<string> | string | undefined) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.post(TOKEN, async ({ request }) => {
      requests.push(new URLSearchParams(await request.text()));
      return HttpResponse.json({ id_token: await token });
    }),
    http.get(KEYS, () => HttpResponse.json(jwks)),
  );
  return requests;
}

const STAFF = { email: "jo@pauseai.uk", email_verified: true, hd: "pauseai.uk" };

afterEach(() => vi.unstubAllEnvs());

describe("googleClient", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  });

  it("reads the client from the environment, if both parts are set", () => {
    expect(googleClient()).toEqual({ clientId: "id", clientSecret: "secret" });
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(googleClient()).toBeUndefined();
  });
});

describe("startLogin", () => {
  it("sends staff to Google with a state and a PKCE challenge, asking for pauseai.uk accounts", () => {
    const { url, state, verifier } = startLogin(CLIENT, "https://pauseai.uk");
    const params = new URL(url).searchParams;
    expect(url.startsWith("https://accounts.google.com/o/oauth2/v2/auth?")).toBe(true);
    expect(Object.fromEntries(params)).toMatchObject({
      client_id: "client-1",
      redirect_uri: "https://pauseai.uk/staff/api/callback",
      response_type: "code",
      scope: "openid email",
      state,
      code_challenge_method: "S256",
      hd: "pauseai.uk",
    });
    expect(params.get("code_challenge")).toBe(createHash("sha256").update(verifier).digest("base64url"));
    expect(startLogin(CLIENT, "x").state).not.toBe(state);
    expect(callbackUrl("http://localhost:3000")).toBe("http://localhost:3000/staff/api/callback");
  });
});

describe("finishLogin", () => {
  it("accepts a verified pauseai.uk account, sending the code and verifier", async () => {
    const requests = google(idToken(STAFF));
    expect(await finishLogin(CLIENT, "https://pauseai.uk", "code-1", "verifier-1")).toEqual({ ok: true, email: "jo@pauseai.uk" });
    expect(Object.fromEntries(requests[0])).toEqual({
      code: "code-1",
      code_verifier: "verifier-1",
      client_id: "client-1",
      client_secret: "secret-1",
      redirect_uri: "https://pauseai.uk/staff/api/callback",
      grant_type: "authorization_code",
    });
  });

  it("refuses other domains, unverified emails, and look-alike domains", async () => {
    google(idToken({ ...STAFF, hd: undefined, email: "jo@gmail.com" }));
    expect(await finishLogin(CLIENT, "o", "c", "v")).toEqual({ ok: false, reason: "not a pauseai.uk account" });
    google(idToken({ ...STAFF, hd: "pauseai.uk.evil.com" }));
    expect(await finishLogin(CLIENT, "o", "c", "v")).toMatchObject({ ok: false, reason: "not a pauseai.uk account" });
    google(idToken({ ...STAFF, email_verified: false }));
    expect(await finishLogin(CLIENT, "o", "c", "v")).toEqual({ ok: false, reason: "email not verified" });
    google(idToken({ ...STAFF, email: "jo@elsewhere.org" }));
    expect(await finishLogin(CLIENT, "o", "c", "v")).toEqual({ ok: false, reason: "not a pauseai.uk email" });
    google(idToken({ ...STAFF, email: undefined }));
    expect(await finishLogin(CLIENT, "o", "c", "v")).toEqual({ ok: false, reason: "not a pauseai.uk email" });
  });

  it("refuses a token for another client, from another issuer, or not signed by Google", async () => {
    google(idToken(STAFF, { audience: "someone-else" }));
    expect(await finishLogin(CLIENT, "o", "c", "v")).toMatchObject({ ok: false, reason: expect.stringContaining("bad ID token") });
    google(idToken(STAFF, { issuer: "https://evil.example" }));
    expect(await finishLogin(CLIENT, "o", "c", "v")).toMatchObject({ ok: false, reason: expect.stringContaining("bad ID token") });
    const other = await generateKeyPair("RS256");
    google(new SignJWT(STAFF).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer("https://accounts.google.com").setAudience(CLIENT.clientId).setExpirationTime("5m").sign(other.privateKey));
    expect(await finishLogin(CLIENT, "o", "c", "v")).toMatchObject({ ok: false, reason: expect.stringContaining("bad ID token") });
  });

  it("fails when Google refuses the code, sends no token, or its keys can't be had", async () => {
    server.use(http.post(TOKEN, () => HttpResponse.json({ error: "invalid_grant" }, { status: 400 })));
    expect(await finishLogin(CLIENT, "o", "c", "v")).toEqual({ ok: false, reason: "token request failed with 400" });
    google(undefined);
    expect(await finishLogin(CLIENT, "o", "c", "v")).toEqual({ ok: false, reason: "no ID token" });
    google(idToken(STAFF));
    server.use(http.get(KEYS, () => new HttpResponse(null, { status: 500 })));
    expect(await finishLogin(CLIENT, "o", "c", "v")).toEqual({ ok: false, reason: "key request failed with 500" });
  });

  it("works with the fixture Google that Playwright logs in through", async () => {
    expect(await finishLogin({ clientId: "fixture-client-id", clientSecret: "x" }, "o", "fixture-staff", "v")).toEqual({ ok: true, email: "staff@pauseai.uk" });
    expect(await finishLogin({ clientId: "fixture-client-id", clientSecret: "x" }, "o", "fixture-outsider", "v")).toMatchObject({ ok: false });
    expect(await finishLogin({ clientId: "fixture-client-id", clientSecret: "x" }, "o", "unknown", "v")).toMatchObject({ ok: false });
  });
});
