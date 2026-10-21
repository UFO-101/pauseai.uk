import { describe, expect, it } from "vitest";
import { keepCookie, sessionCookie } from "./staff-session";

describe("the session cookies", () => {
  it("are HttpOnly, Secure, SameSite=Lax, only under /staff: for the browser's session, or 30 days when kept", () => {
    expect(sessionCookie("t", false)).toEqual({
      name: "staff_session",
      value: "t",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/staff",
    });
    expect(sessionCookie("t", true)).toMatchObject({ name: "staff_session", value: "t", maxAge: 2_592_000 });
    expect(keepCookie()).toMatchObject({ name: "staff_keep", value: "1", path: "/staff", maxAge: 2_592_000 });
  });
});
