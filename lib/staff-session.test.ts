import { describe, expect, it } from "vitest";
import { afterLogin, keepCookie, loginPath, sessionCookie } from "./staff-session";

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

describe("returning after login", () => {
  it("goes back to a staff page, with its query", () => {
    expect(afterLogin("/staff/politicians/7")).toBe("/staff/politicians/7");
    expect(afterLogin("/staff/politicians?house=lords")).toBe("/staff/politicians?house=lords");
    expect(afterLogin("/staff?x=1")).toBe("/staff?x=1");
  });

  it("goes to the staff home from anything else", () => {
    for (const next of [
      undefined,
      7,
      "",
      "https://evil.example/staff",
      "//evil.example",
      "/staffing",
      "/staff\\evil",
    ]) {
      expect(afterLogin(next)).toBe("/staff");
    }
    for (const next of [
      "/staff/login",
      "/staff/login?next=/staff/letters",
      "/staff/api/logout",
      "/staff/api/callback",
    ]) {
      expect(afterLogin(next)).toBe("/staff");
    }
  });

  it("puts the page to go back to in the login page's address, if there is one", () => {
    expect(loginPath("/staff/politicians?house=lords")).toBe(
      "/staff/login?next=%2Fstaff%2Fpoliticians%3Fhouse%3Dlords",
    );
    expect(loginPath("/staff")).toBe("/staff/login");
    expect(loginPath(undefined)).toBe("/staff/login");
  });
});
