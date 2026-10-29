import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createSession, sessionEmail, sessionId } from "@/lib/server/staff-auth";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import { POST } from "./route";

vi.mock("next/headers", () => import("@/tests/next-headers"));

describeWithDatabase("POST /staff/api/logout", () => {
  useTestDatabase();
  beforeEach(() => {
    requestCookies.clear();
    vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("ends the session, clears the cookies and goes to the login page", async () => {
    const token = await createSession("jo@pauseai.uk");
    requestCookies.set("staff_session", token);

    const res = await POST(new Request("https://pauseai.uk/staff/api/logout", { method: "POST" }));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login");
    const cookies = res.headers.getSetCookie();
    expect(cookies.find((c) => c.startsWith("staff_session="))).toMatch(/^staff_session=;.*Path=\/staff/);
    expect(cookies.find((c) => c.startsWith("staff_keep="))).toMatch(/^staff_keep=;.*Path=\/staff/);
    expect(await sessionEmail(token)).toBeUndefined();
  });

  it("with everywhere, ends every session of yours, logged, and leaves others' alone", async () => {
    const token = await createSession("jo@pauseai.uk");
    const other = await createSession("jo@pauseai.uk", true);
    const sam = await createSession("sam@pauseai.uk");
    requestCookies.set("staff_session", token);
    const body = new FormData();
    body.set("everywhere", "1");

    const res = await POST(new Request("https://pauseai.uk/staff/api/logout", { method: "POST", body }));

    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login");
    expect(await sessionEmail(token)).toBeUndefined();
    expect(await sessionEmail(other)).toBeUndefined();
    expect(await sessionEmail(sam)).toBe("sam@pauseai.uk");
    expect(await query("SELECT actor, action FROM audit_log WHERE action = 'end staff sessions'")).toEqual([
      { actor: "jo@pauseai.uk", action: "end staff sessions" },
    ]);
  });

  it("with a session of yours, ends that one: another goes back to the page of them, this one logs out", async () => {
    const token = await createSession("jo@pauseai.uk");
    const other = await createSession("jo@pauseai.uk");
    const sam = await createSession("sam@pauseai.uk");
    requestCookies.set("staff_session", token);
    const post = (session: string) => {
      const body = new FormData();
      body.set("session", session);
      return POST(new Request("https://pauseai.uk/staff/api/logout", { method: "POST", body }));
    };

    // Someone else's is left alone.
    expect((await post(sessionId(sam))).headers.get("location")).toBe("https://pauseai.uk/staff/me#sessions");
    expect(await sessionEmail(sam)).toBe("sam@pauseai.uk");
    const res = await post(sessionId(other));
    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/me#sessions");
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(await sessionEmail(other)).toBeUndefined();
    expect(await sessionEmail(token)).toBe("jo@pauseai.uk");

    const out = await post(sessionId(token));
    expect(out.headers.get("location")).toBe("https://pauseai.uk/staff/login");
    expect(await sessionEmail(token)).toBeUndefined();
    expect(await query("SELECT details FROM audit_log WHERE action = 'end staff sessions'")).toEqual([
      { details: { email: "jo@pauseai.uk", sessions: 1 } },
      { details: { email: "jo@pauseai.uk", sessions: 1 } },
    ]);
  });

  it("needs a session", async () => {
    expect(
      await expectRedirect(() => POST(new Request("https://pauseai.uk/staff/api/logout", { method: "POST" }))),
    ).toBe("/staff/login");
  });
});
