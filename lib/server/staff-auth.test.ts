import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import { query } from "./db";
import { createSession, deleteSession, requireStaff, sessionCookie, sessionEmail } from "./staff-auth";

vi.mock("next/headers", () => import("@/tests/next-headers"));

describe("sessionCookie", () => {
  it("is HttpOnly, Secure, SameSite=Lax, only under /staff, for a week", () => {
    expect(sessionCookie("t")).toEqual({
      name: "staff_session",
      value: "t",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/staff",
      maxAge: 604800,
    });
  });
});

describeWithDatabase("staff sessions", () => {
  useTestDatabase();
  beforeEach(() => requestCookies.clear());

  it("stores only a hash of the token, and finds the session by it", async () => {
    const token = await createSession("jo@pauseai.uk");
    const [row] = await query<{ token_hash: string; hours: number }>(
      "SELECT token_hash, round(extract(epoch FROM expires_at - created_at) / 3600)::int AS hours FROM staff_sessions",
    );
    expect(row.token_hash).not.toContain(token);
    expect(row.hours).toBe(168);
    expect(await sessionEmail(token)).toBe("jo@pauseai.uk");
    expect(await sessionEmail("guess")).toBeUndefined();
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

  it("requireStaff returns the staff member for a current session", async () => {
    const token = await createSession("jo@pauseai.uk");
    requestCookies.set("staff_session", token);
    expect(await requireStaff()).toEqual({ email: "jo@pauseai.uk", token });
  });

  it("requireStaff sends anyone else to the login page", async () => {
    expect(await expectRedirect(requireStaff)).toBe("/staff/login");
    requestCookies.set("staff_session", "made-up");
    expect(await expectRedirect(requireStaff)).toBe("/staff/login");
  });
});
