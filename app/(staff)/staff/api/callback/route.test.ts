import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { sessionEmail } from "@/lib/server/staff-auth";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { GET } from "./route";

// The fixture Google (tests/fixtures/outside-services.ts) answers code
// fixture-staff with staff@pauseai.uk, for the client fixture-client-id.
function callback(query: string, loginCookie = "state-1.verifier-1") {
  return GET(new NextRequest(`https://pauseai.uk/staff/api/callback?${query}`, { headers: { cookie: `staff_login=${loginCookie}` } }));
}

beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "fixture-client-id");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describeWithDatabase("GET /staff/api/callback", () => {
  useTestDatabase();

  it("starts a session for a pauseai.uk account, and goes to /staff", async () => {
    const res = await callback("code=fixture-staff&state=state-1");

    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff");
    const cookies = res.headers.getSetCookie();
    const session = cookies.find((c) => c.startsWith("staff_session="))!;
    expect(session).toMatch(/Path=\/staff;/);
    expect(session).toMatch(/HttpOnly/);
    expect(session).toMatch(/Secure/);
    expect(session).toMatch(/SameSite=lax/i);
    expect(session).toMatch(/Max-Age=43200/);
    expect(await sessionEmail(session.split(";")[0].split("=")[1])).toBe("staff@pauseai.uk");
    expect(cookies.some((c) => c.startsWith("staff_login=;"))).toBe(true);
  });

  it("refuses an account outside pauseai.uk", async () => {
    const res = await callback("code=fixture-outsider&state=state-1");
    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login?failed=1");
    expect(res.headers.getSetCookie().some((c) => c.startsWith("staff_session="))).toBe(false);
  });

  it("refuses a state that doesn't match, or a missing code or cookie", async () => {
    for (const res of [
      await callback("code=fixture-staff&state=other"),
      await callback("state=state-1"),
      await callback("code=fixture-staff&state=state-1", ""),
      await GET(new NextRequest("https://pauseai.uk/staff/api/callback?code=fixture-staff&state=")),
    ]) {
      expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login?failed=1");
    }
  });

  it("refuses everyone when Google login isn't set up", async () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect((await callback("code=fixture-staff&state=state-1")).headers.get("location")).toBe("https://pauseai.uk/staff/login?failed=1");
  });
});
