import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { sessionEmail } from "@/lib/server/staff-auth";
import { sendLoginLink } from "@/lib/server/staff-login";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => {
  vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
});
afterEach(() => vi.unstubAllEnvs());

function callback(token?: string) {
  const data = new FormData();
  if (token !== undefined) data.set("token", token);
  return POST(new Request("https://pauseai.uk/staff/api/callback", { method: "POST", body: data }));
}

/** Emails jo@pauseai.uk a login link, and returns its token. */
async function linkToken(): Promise<string> {
  let body = "";
  server.use(
    http.post("https://api.postmarkapp.com/email", async ({ request }) => {
      body = ((await request.json()) as { TextBody: string }).TextBody;
      return HttpResponse.json({ ErrorCode: 0, MessageID: "m" });
    }),
  );
  await sendLoginLink("jo@pauseai.uk", "");
  return body.match(/token=([\w-]+)/)![1];
}

describeWithDatabase("POST /staff/api/callback", () => {
  useTestDatabase();

  it("starts a session for a current link, and goes to /staff", async () => {
    const res = await callback(await linkToken());

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff");
    const session = res.headers.getSetCookie().find((c) => c.startsWith("staff_session="))!;
    expect(session).toMatch(/Path=\/staff;/);
    expect(session).toMatch(/HttpOnly/);
    expect(session).toMatch(/Secure/);
    expect(session).toMatch(/SameSite=lax/i);
    expect(session).toMatch(/Max-Age=43200/);
    expect(await sessionEmail(session.split(";")[0].split("=")[1])).toBe("jo@pauseai.uk");
  });

  it("refuses a used, made-up or missing token", async () => {
    const token = await linkToken();
    await callback(token);
    for (const res of [await callback(token), await callback("made-up"), await callback(), await POST(new Request("https://pauseai.uk/staff/api/callback", { method: "POST" }))]) {
      expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login?failed=1");
      expect(res.headers.getSetCookie().some((c) => c.startsWith("staff_session="))).toBe(false);
    }
  });
});
