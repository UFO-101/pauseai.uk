import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { server } from "@/tests/fixtures/msw";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "@/lib/server/db";
import { POST } from "./route";

beforeEach(() => {
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
});
afterEach(() => vi.unstubAllEnvs());

function post(body: BodyInit | null, cookie?: string) {
  return POST(
    new NextRequest("https://pauseai.uk/staff/api/login", { method: "POST", body, headers: cookie ? { cookie } : {} }),
  );
}

const form = (email: string) => {
  const data = new FormData();
  data.set("email", email);
  return data;
};

/** The browser token the response's staff_login cookie sets. */
const browserCookie = (res: Response) => res.headers.getSetCookie().find((c) => c.startsWith("staff_login="));

describeWithDatabase("POST /staff/api/login", () => {
  useTestDatabase();

  it("emails a link to a pauseai.uk address, and says the same whatever was typed", async () => {
    const to: string[] = [];
    server.use(
      http.post("https://api.postmarkapp.com/email", async ({ request }) => {
        to.push(((await request.json()) as { To: string }).To);
        return HttpResponse.json({ ErrorCode: 0, MessageID: crypto.randomUUID() });
      }),
    );

    for (const res of [await post(form("jo@pauseai.uk")), await post(form("jo@gmail.com")), await post(null)]) {
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login?sent=1");
      // Every answer marks the browser, so the cookie doesn't give away which addresses work.
      expect(browserCookie(res)).toMatch(/^staff_login=[\w-]{43}; Path=\/staff; .*Max-Age=900/);
    }
    expect(to).toEqual(["jo@pauseai.uk"]);
  });

  it("keeps the browser's token when it asks again, so its earlier links still work", async () => {
    const first = browserCookie(await post(form("jo@pauseai.uk")))!.split(";")[0];
    const again = browserCookie(await post(form("jo@pauseai.uk"), first))!.split(";")[0];
    expect(again).toBe(first);
    const [{ browsers }] = await query<{ browsers: number }>(
      "SELECT count(DISTINCT browser_hash)::int AS browsers FROM staff_login_links",
    );
    expect(browsers).toBe(1);
  });
});
