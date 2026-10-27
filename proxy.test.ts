import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
// Next 16.3.2 still exports this under its Middleware name, though its docs
// call it unstable_doesProxyMatch.
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "./proxy";

function visit(path: string, cookie?: string) {
  return proxy(new NextRequest(`https://pauseai.uk${path}`, { headers: cookie ? { cookie } : {} }));
}

beforeEach(() => vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk"));
afterEach(() => vi.unstubAllEnvs());

describe("proxy", () => {
  it("runs on /staff and everything under it, and nowhere else", () => {
    const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });
    expect(matches("/staff")).toBe(true);
    expect(matches("/staff/politicians/1")).toBe(true);
    expect(matches("/staff/api/logout")).toBe(true);
    expect(matches("/campaigns")).toBe(false);
    expect(matches("/staffing")).toBe(false);
  });

  it("sends staff pages without a session cookie to the login page, to come back to once logged in", () => {
    const res = visit("/staff/politicians/1?tab=x");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://pauseai.uk/staff/login?next=%2Fstaff%2Fpoliticians%2F1%3Ftab%3Dx",
    );
    expect(visit("/staff").headers.get("location")).toBe("https://pauseai.uk/staff/login");
  });

  it("answers staff API routes without a session cookie with 401", async () => {
    const res = visit("/staff/api/logout");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Not logged in" });
  });

  it("lets through the login steps, and anyone with a session cookie for requireStaff() to check", () => {
    for (const path of ["/staff/login", "/staff/api/login", "/staff/api/callback"]) {
      expect(visit(path).headers.get("x-middleware-next")).toBe("1");
    }
    expect(visit("/staff", "staff_session=anything").headers.get("x-middleware-next")).toBe("1");
  });

  it("tells requireStaff() the page asked for, in case the session has ended", () => {
    const res = visit("/staff/letters?page=2", "staff_session=anything");
    expect(res.headers.get("x-middleware-request-x-staff-path")).toBe("/staff/letters?page=2");
  });

  it("renews a kept session's cookies for another 30 days on every request, and leaves a browser session's alone", () => {
    const kept = visit("/staff/letters", "staff_session=tok; staff_keep=1");
    expect(kept.headers.get("x-middleware-next")).toBe("1");
    const cookies = kept.headers.getSetCookie();
    expect(cookies.find((c) => c.startsWith("staff_session="))).toMatch(
      /^staff_session=tok; Path=\/staff; .*Max-Age=2592000/,
    );
    expect(cookies.find((c) => c.startsWith("staff_keep="))).toMatch(/Max-Age=2592000/);
    expect(visit("/staff/letters", "staff_session=tok").headers.getSetCookie()).toEqual([]);
  });
});
