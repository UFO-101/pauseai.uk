import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "client-1");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret-1");
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /staff/api/login", () => {
  it("sends staff to Google, remembering the state and verifier for the callback only", async () => {
    const res = await GET(new Request("https://pauseai.uk/staff/api/login"));
    const google = new URL(res.headers.get("location")!);
    expect(google.origin).toBe("https://accounts.google.com");
    expect(google.searchParams.get("redirect_uri")).toBe("https://pauseai.uk/staff/api/callback");

    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toContain(`staff_login=${google.searchParams.get("state")}.`);
    expect(cookie).toMatch(/Path=\/staff\/api\/callback/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=600/);
  });

  it("says so when Google login isn't set up", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    const res = await GET(new Request("https://pauseai.uk/staff/api/login"));
    expect(res.status).toBe(500);
  });
});
