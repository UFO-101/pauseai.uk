import { afterEach, expect, it, vi } from "vitest";
import { siteUrl } from "./staff-session";

afterEach(() => vi.unstubAllEnvs());

it("builds redirects on the deploy's own origin, not the request's, which on Netlify is netlify.app", () => {
  const request = new Request("https://main--pauseaiuk.netlify.app/staff/api/callback?token=t");
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  expect(siteUrl("/staff/login?sent=1", request).href).toBe("https://pauseai.uk/staff/login?sent=1");
  vi.stubEnv("SITE_ORIGIN", "");
  expect(siteUrl("/staff", request).href).toBe("https://main--pauseaiuk.netlify.app/staff");
});
