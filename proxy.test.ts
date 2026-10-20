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

  it("sends staff pages without a session cookie to the login page", () => {
    const res = visit("/staff/politicians/1");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://pauseai.uk/staff/login");
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
});
