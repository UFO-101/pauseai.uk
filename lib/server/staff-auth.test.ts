import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import { query } from "./db";
import { createSession, deleteSession, requireStaff, sessionEmail } from "./staff-auth";
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

  it("requireStaff returns the staff member for a current session, with their account and permissions", async () => {
    const token = await createSession("jo@pauseai.uk");
    requestCookies.set("staff_session", token);
    // Without an account: only a login is satisfied; a page needing an account sends them home.
    expect(await requireStaff("login")).toEqual({ email: "jo@pauseai.uk", token, account: false, permissions: [] });
    expect(await expectRedirect(() => requireStaff())).toBe("/staff");
    expect(await expectRedirect(() => requireStaff("supporters"))).toBe("/staff");
    await saveStaffAccount("jo@pauseai.uk", [], "a");
    expect(await requireStaff()).toEqual({ email: "jo@pauseai.uk", token, account: true, permissions: [] });
    expect(await expectRedirect(() => requireStaff("supporters"))).toBe("/staff");
    await saveStaffAccount("jo@pauseai.uk", ["supporters"], "a");
    expect(await requireStaff("supporters")).toMatchObject({ account: true, permissions: ["supporters"] });
    expect(await expectRedirect(() => requireStaff("admin"))).toBe("/staff");
  });

  it("requireStaff sends anyone else to the login page", async () => {
    expect(await expectRedirect(requireStaff)).toBe("/staff/login");
    requestCookies.set("staff_session", "made-up");
    expect(await expectRedirect(requireStaff)).toBe("/staff/login");
  });
});
