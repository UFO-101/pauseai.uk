import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies, requestHeaders } from "@/tests/next-headers";
import { query } from "./db";
import {
  createSession,
  deleteSession,
  endSession,
  listSessions,
  requireStaff,
  sessionEmail,
  sessionId,
} from "./staff-auth";
import { saveStaffAccount } from "./staff-accounts";

vi.mock("next/headers", () => import("@/tests/next-headers"));

describeWithDatabase("staff sessions", () => {
  useTestDatabase();
  beforeEach(() => requestCookies.clear());

  it("stores only a hash of the token, finds the session by it, and lasts a day, or 30 days renewed on use when kept", async () => {
    const token = await createSession("jo@pauseai.uk");
    const hours = async (t: string) =>
      (
        await query<{ hours: number }>(
          "SELECT round(extract(epoch FROM expires_at - now()) / 3600)::int AS hours FROM staff_sessions WHERE token_hash = encode(sha256($1::bytea), 'hex')",
          [t],
        )
      )[0].hours;
    const [row] = await query<{ token_hash: string }>("SELECT token_hash FROM staff_sessions");
    expect(row.token_hash).not.toContain(token);
    expect(await hours(token)).toBe(24);
    expect(await sessionEmail(token)).toBe("jo@pauseai.uk");
    expect(await hours(token)).toBe(24);
    expect(await sessionEmail("guess")).toBeUndefined();

    const kept = await createSession("jo@pauseai.uk", true);
    expect(await hours(kept)).toBe(720);
    await query("UPDATE staff_sessions SET expires_at = now() + interval '1 day' WHERE remember");
    expect(await sessionEmail(kept)).toBe("jo@pauseai.uk");
    expect(await hours(kept)).toBe(720);
  });

  it("ends a session, and ignores and clears expired ones", async () => {
    const token = await createSession("jo@pauseai.uk");
    await deleteSession(token);
    expect(await sessionEmail(token)).toBeUndefined();

    const old = await createSession("old@pauseai.uk");
    await query("UPDATE staff_sessions SET expires_at = now() - interval '1 minute'");
    expect(await sessionEmail(old)).toBeUndefined();
    await createSession("new@pauseai.uk");
    expect(await query("SELECT email FROM staff_sessions")).toEqual([{ email: "new@pauseai.uk" }]);
  });

  it("gives an address an account with no permissions on its first login, logged, and keeps an existing one", async () => {
    await createSession("jo@pauseai.uk");
    await saveStaffAccount("sam@pauseai.uk", ["admin"], "jo@pauseai.uk");
    await createSession("sam@pauseai.uk");
    await createSession("jo@pauseai.uk");
    expect(await query("SELECT email, permissions, added_by FROM staff_accounts ORDER BY email")).toEqual([
      { email: "jo@pauseai.uk", permissions: [], added_by: "login" },
      { email: "sam@pauseai.uk", permissions: ["admin"], added_by: "jo@pauseai.uk" },
    ]);
    expect(
      await query("SELECT actor, action, details FROM audit_log WHERE details->>'email' = 'jo@pauseai.uk'"),
    ).toEqual([{ actor: "jo@pauseai.uk", action: "add staff account", details: { email: "jo@pauseai.uk", to: [] } }]);
  });

  it("requireStaff returns the staff member for a current session, with their permissions", async () => {
    const token = await createSession("jo@pauseai.uk");
    requestCookies.set("staff_session", token);
    expect(await requireStaff()).toEqual({ email: "jo@pauseai.uk", token, permissions: [], sessions: 1 });
    expect(await expectRedirect(() => requireStaff("supporters"))).toBe("/staff");
    await saveStaffAccount("jo@pauseai.uk", ["supporters"], "a");
    expect(await requireStaff("supporters")).toMatchObject({ permissions: ["supporters"] });
    expect(await expectRedirect(() => requireStaff("admin"))).toBe("/staff");
    // A session whose account has gone goes to the login page.
    await query("DELETE FROM staff_accounts WHERE email = 'jo@pauseai.uk'");
    expect(await expectRedirect(() => requireStaff())).toBe("/staff/login");
  });

  it("requireStaff counts the sessions open, and listSessions lists them, newest first, marking this one", async () => {
    const kept = await createSession("jo@pauseai.uk", true);
    await query("UPDATE staff_sessions SET created_at = now() - interval '1 day'");
    const token = await createSession("jo@pauseai.uk");
    const gone = await createSession("jo@pauseai.uk");
    await query(
      "UPDATE staff_sessions SET expires_at = now() - interval '1 minute' WHERE token_hash = encode(sha256($1::bytea), 'hex')",
      [gone],
    );
    await createSession("sam@pauseai.uk");
    requestCookies.set("staff_session", token);
    expect(await requireStaff()).toMatchObject({ email: "jo@pauseai.uk", sessions: 2 });
    const sessions = await listSessions("jo@pauseai.uk", token);
    expect(sessions.map((s) => [s.remember, s.current])).toEqual([
      [false, true],
      [true, false],
    ]);
    expect(sessions[1].startedAt).toBeInstanceOf(Date);
    // Without a User-Agent, none is kept.
    expect(sessions.map((s) => s.userAgent)).toEqual([null, null]);
    expect(await listSessions("jo@pauseai.uk", kept)).toMatchObject([
      { current: false },
      { current: true, id: sessionId(kept) },
    ]);
    // Begun at the same moment, this one comes first, whatever the tokens.
    await query("UPDATE staff_sessions SET created_at = now()");
    for (const current of [token, kept]) {
      expect((await listSessions("jo@pauseai.uk", current)).map((s) => s.id)).toEqual([
        sessionId(current),
        sessionId(current === token ? kept : token),
      ]);
    }
    // Ending one: only your own, logged.
    expect(await endSession("sam@pauseai.uk", sessionId(kept))).toBe(false);
    expect(await endSession("Jo@pauseai.uk", sessionId(kept))).toBe(true);
    expect(await listSessions("jo@pauseai.uk", token)).toHaveLength(1);
    expect(await query("SELECT actor, details FROM audit_log WHERE action = 'end staff sessions'")).toEqual([
      { actor: "jo@pauseai.uk", details: { email: "jo@pauseai.uk", sessions: 1 } },
    ]);
  });

  it("keeps the User-Agent a session began with, cut to a length no browser's reaches", async () => {
    const firefox = "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0";
    const token = await createSession("jo@pauseai.uk", false, firefox);
    await createSession("jo@pauseai.uk", false, "x".repeat(2000));
    const agents = (await listSessions("jo@pauseai.uk", token)).map((s) => s.userAgent);
    expect(agents.sort()).toEqual(["x".repeat(512), firefox].sort());
  });

  it("requireStaff sends anyone else to the login page", async () => {
    expect(await expectRedirect(requireStaff)).toBe("/staff/login");
    requestCookies.set("staff_session", "made-up");
    expect(await expectRedirect(requireStaff)).toBe("/staff/login");
  });

  it("requireStaff sends someone whose session has ended to the login page, to come back to the page they asked for", async () => {
    requestCookies.set("staff_session", "ended");
    requestHeaders.set("x-staff-path", "/staff/letters?page=2");
    try {
      expect(await expectRedirect(requireStaff)).toBe("/staff/login?next=%2Fstaff%2Fletters%3Fpage%3D2");
    } finally {
      requestHeaders.delete("x-staff-path");
    }
  });
});
