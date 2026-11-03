import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSession } from "@/lib/server/staff-auth";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { requestCookies } from "@/tests/next-headers";
import { GET } from "./route";

vi.mock("next/headers", () => import("@/tests/next-headers"));

describeWithDatabase("GET /staff/api/gmail/connect", () => {
  useTestDatabase();
  beforeEach(async () => {
    requestCookies.clear();
    vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    requestCookies.set("staff_session", await createSession("jo@pauseai.uk"));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("goes to Google's consent for your account, keeping its state and the page to go back to", async () => {
    const res = await GET(new NextRequest("https://pauseai.uk/staff/api/gmail/connect?back=%2Fstaff%2Fmailings%2F4"));
    expect(res.status).toBe(303);
    const to = new URL(res.headers.get("location")!);
    expect(to.host).toBe("accounts.google.com");
    expect(to.searchParams.get("login_hint")).toBe("jo@pauseai.uk");
    expect(to.searchParams.get("redirect_uri")).toBe("https://pauseai.uk/staff/api/gmail/callback");
    const cookie = res.cookies.get("staff_gmail")!;
    expect(JSON.parse(cookie.value)).toEqual({ state: to.searchParams.get("state"), back: "/staff/mailings/4" });
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/staff/api/gmail" });
  });

  it("goes back to your own page if where to go back to isn't a staff page", async () => {
    const res = await GET(
      new NextRequest("https://pauseai.uk/staff/api/gmail/connect?back=https%3A%2F%2Fevil.example"),
    );
    expect(JSON.parse(res.cookies.get("staff_gmail")!.value).back).toBe("/staff/me");
  });

  it("asks the letters inbox, logged in as itself, for labelling and trashing too", async () => {
    vi.stubEnv("LETTERS_INBOX", "letters@pauseai.uk");
    const scope = async () =>
      new URL(
        (await GET(new NextRequest("https://pauseai.uk/staff/api/gmail/connect"))).headers.get("location")!,
      ).searchParams
        .get("scope")!
        .split(" ");
    expect(await scope()).not.toContain("https://www.googleapis.com/auth/gmail.modify");
    requestCookies.set("staff_session", await createSession("letters@pauseai.uk"));
    expect(await scope()).toContain("https://www.googleapis.com/auth/gmail.modify");
  });
});
