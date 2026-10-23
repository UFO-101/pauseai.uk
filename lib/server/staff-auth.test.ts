import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import { query } from "./db";
import { createSession, deleteSession, openSessions, requireStaff, sessionEmail } from "./staff-auth";
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
    expect(await requireStaff()).toEqual({ email: "jo@pauseai.uk", token, permissions: [] });
    expect(await expectRedirect(() => requireStaff("supporters"))).toBe("/staff");
    await saveStaffAccount("jo@pauseai.uk", ["supporters"], "a");
    expect(await requireStaff("supporters")).toMatchObject({ permissions: ["supporters"] });
    expect(await expectRedirect(() => requireStaff("admin"))).toBe("/staff");
    // A session whose account has gone goes to the login page.
    await query("DELETE FROM staff_accounts WHERE email = 'jo@pauseai.uk'");
    expect(await expectRedirect(() => requireStaff())).toBe("/staff/login");
  });

  it("counts a staff member's sessions not yet expired", async () => {
    expect(await openSessions("jo@pauseai.uk")).toBe(0);
    await createSession("jo@pauseai.uk");
    await createSession("jo@pauseai.uk");
    await createSession("sam@pauseai.uk");
    expect(await openSessions("Jo@pauseai.uk")).toBe(2);
    await query("UPDATE staff_sessions SET expires_at = now() - interval '1 minute' WHERE email = 'sam@pauseai.uk'");
    expect(await openSessions("sam@pauseai.uk")).toBe(0);
  });

  it("requireStaff sends anyone else to the login page", async () => {
    expect(await expectRedirect(requireStaff)).toBe("/staff/login");
    requestCookies.set("staff_session", "made-up");
    expect(await expectRedirect(requireStaff)).toBe("/staff/login");
  });
});
