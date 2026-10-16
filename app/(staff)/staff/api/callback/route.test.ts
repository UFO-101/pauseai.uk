import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { server } from "@/tests/fixtures/msw";
import { sessionEmail } from "@/lib/server/staff-auth";
import { loginBrowser, sendLoginLink } from "@/lib/server/staff-login";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { GET } from "./route";

beforeEach(() => {
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
});
afterEach(() => vi.unstubAllEnvs());

const BROWSER = loginBrowser(undefined);

/** Opens the emailed link, in a browser with this staff_login cookie, or none. */
function open(token?: string, browser: string | null = BROWSER) {
  const url =
    token === undefined
      ? "https://pauseai.uk/staff/api/callback"
      : `https://pauseai.uk/staff/api/callback?token=${token}`;
  return GET(new NextRequest(url, { headers: browser ? { cookie: `staff_login=${browser}` } : {} }));
}

/** Emails jo@pauseai.uk a login link, asked for from BROWSER, and returns its token. */
async function linkToken(): Promise<string> {
  let body = "";
  server.use(
    http.post("https://api.postmarkapp.com/email", async ({ request }) => {
      body = ((await request.json()) as { TextBody: string }).TextBody;
      return HttpResponse.json({ ErrorCode: 0, MessageID: "m" });
    }),
  );
  await sendLoginLink("jo@pauseai.uk", "", BROWSER);
  return body.match(/token=([\w-]+)/)![1];
}

const setsSession = (res: Response) => res.headers.getSetCookie().some((c) => c.startsWith("staff_session="));

describeWithDatabase("GET /staff/api/callback", () => {
  useTestDatabase();

  it("starts a session for a current link opened in the browser that asked, and goes to /staff", async () => {
    const res = await open(await linkToken());

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff");
    const session = res.headers.getSetCookie().find((c) => c.startsWith("staff_session="))!;
    expect(session).toMatch(/Path=\/staff;/);
    expect(session).toMatch(/HttpOnly/);
    expect(session).toMatch(/Secure/);
    expect(session).toMatch(/SameSite=lax/i);
    expect(session).toMatch(/Max-Age=604800/);
    expect(await sessionEmail(session.split(";")[0].split("=")[1])).toBe("jo@pauseai.uk");
    // The browser's login cookie has done its job.
    expect(res.headers.getSetCookie().find((c) => c.startsWith("staff_login="))).toMatch(
      /^staff_login=; Path=\/staff; .*(Max-Age=0|Expires=Thu, 01 Jan 1970)/,
    );
  });

  it("says a link opened in another browser belongs elsewhere, and leaves it working", async () => {
    const token = await linkToken();
    for (const res of [await open(token, loginBrowser(undefined)), await open(token, null)]) {
      expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login?elsewhere=1");
      expect(setsSession(res)).toBe(false);
    }
    expect(setsSession(await open(token))).toBe(true);
  });

  it("refuses a used, made-up or missing token", async () => {
    const token = await linkToken();
    await open(token);
    for (const res of [await open(token), await open("made-up"), await open()]) {
      expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login?failed=1");
      expect(setsSession(res)).toBe(false);
    }
  });
});
