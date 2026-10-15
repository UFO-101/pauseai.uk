import { beforeEach, expect, it, vi } from "vitest";
import { createSession, sessionEmail } from "@/lib/server/staff-auth";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import { POST } from "./route";

vi.mock("next/headers", () => import("@/tests/next-headers"));

describeWithDatabase("POST /staff/api/logout", () => {
  useTestDatabase();
  beforeEach(() => requestCookies.clear());

  it("ends the session, clears the cookie and goes to the login page", async () => {
    const token = await createSession("jo@pauseai.uk");
    requestCookies.set("staff_session", token);

    const res = await POST(new Request("https://pauseai.uk/staff/api/logout", { method: "POST" }));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login");
    expect(res.headers.get("set-cookie")).toMatch(/^staff_session=;.*Path=\/staff/);
    expect(await sessionEmail(token)).toBeUndefined();
  });

  it("needs a session", async () => {
    expect(
      await expectRedirect(() => POST(new Request("https://pauseai.uk/staff/api/logout", { method: "POST" }))),
    ).toBe("/staff/login");
  });
});
