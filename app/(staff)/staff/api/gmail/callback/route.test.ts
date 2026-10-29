import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { http, HttpResponse } from "msw";
import { gmailAccounts } from "@/lib/server/gmail-accounts";
import { createSession } from "@/lib/server/staff-auth";
import { describeWithDatabase, TEST_GMAIL_TOKEN_KEY, useTestDatabase } from "@/tests/database";
import { server } from "@/tests/fixtures/msw";
import { requestCookies } from "@/tests/next-headers";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/tests/next-headers"));

const STARTED = JSON.stringify({ state: "st", back: "/staff/mailings/4?x=1" });

/** The callback, with the cookie the connect route left (`cookie`), and `params` from Google. */
function callback(params: Record<string, string>, cookie: string | null = STARTED) {
  const request = new NextRequest(`https://pauseai.uk/staff/api/gmail/callback?${new URLSearchParams(params)}`);
  if (cookie !== null) request.cookies.set("staff_gmail", cookie);
  return GET(request);
}

describeWithDatabase("GET /staff/api/gmail/callback", () => {
  useTestDatabase();
  beforeEach(async () => {
    requestCookies.clear();
    vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    vi.stubEnv("GMAIL_TOKEN_KEY", TEST_GMAIL_TOKEN_KEY);
    requestCookies.set("staff_session", await createSession("jo@pauseai.uk"));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("connects your Gmail and goes back to where it started, saying so, and forgets the state", async () => {
    const res = await callback({ code: "fixture:jo@pauseai.uk", state: "st" });
    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/mailings/4?x=1&gmail=connected");
    expect(res.cookies.get("staff_gmail")?.value).toBe("");
    expect((await gmailAccounts()).map((a) => a.email)).toEqual(["jo@pauseai.uk"]);
  });

  it("says when it was another account, or you said no", async () => {
    expect((await callback({ code: "fixture:sam@gmail.com", state: "st" })).headers.get("location")).toMatch(
      /gmail=other-account$/,
    );
    expect((await callback({ error: "access_denied", state: "st" })).headers.get("location")).toMatch(/gmail=refused$/);
    expect(await gmailAccounts()).toEqual([]);
  });

  it("fails without the state this browser started with: back where it started, or to your own page", async () => {
    expect((await callback({ code: "fixture:jo@pauseai.uk", state: "other" })).headers.get("location")).toBe(
      "https://pauseai.uk/staff/mailings/4?x=1&gmail=failed",
    );
    for (const [params, cookie] of [
      [{ code: "fixture:jo@pauseai.uk", state: "st" }, null],
      [{ code: "fixture:jo@pauseai.uk", state: "st" }, "not json"],
      [{ code: "fixture:jo@pauseai.uk", state: "st" }, JSON.stringify({ back: "/staff" })],
    ] as const) {
      expect((await callback(params, cookie)).headers.get("location")).toBe("https://pauseai.uk/staff/me?gmail=failed");
    }
    expect(await gmailAccounts()).toEqual([]);
  });

  it("says it failed when Google won't trade the code", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.post("https://oauth2.googleapis.com/token", () => HttpResponse.json({}, { status: 400 })));
    expect((await callback({ code: "c", state: "st" })).headers.get("location")).toMatch(/gmail=failed$/);
    expect(error).toHaveBeenCalledWith("Couldn't connect jo@pauseai.uk's Gmail:", expect.any(Error));
  });
});
