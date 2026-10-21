import { afterEach, describe, expect, it, vi } from "vitest";

// next.config.ts reads the environment once, when it's loaded, to decide
// where CSP reports go. Each test loads a fresh copy under a given environment.
async function loadConfig(env: { URL?: string; NODE_ENV?: string }) {
  vi.resetModules();
  vi.stubEnv("URL", env.URL ?? "");
  if (env.URL === undefined) delete process.env.URL;
  vi.stubEnv("NODE_ENV", env.NODE_ENV ?? "test");
  return (await import("./next.config")).default;
}

async function headersFor(env: { URL?: string; NODE_ENV?: string }) {
  const config = await loadConfig(env);
  const [siteWide] = await config.headers!();
  return Object.fromEntries(siteWide.headers.map((h) => [h.key, h.value]));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CSP reporting endpoint", () => {
  it("uses Netlify's URL for the absolute report-to endpoint", async () => {
    const headers = await headersFor({ URL: "https://deploy-preview-1--pauseai.netlify.app" });
    expect(headers["Reporting-Endpoints"]).toBe(
      'csp-endpoint="https://deploy-preview-1--pauseai.netlify.app/api/csp-report"',
    );
    expect(headers["Content-Security-Policy-Report-Only"]).toContain("report-to csp-endpoint");
  });

  it("falls back to the live site in a production build without URL", async () => {
    const headers = await headersFor({ NODE_ENV: "production" });
    expect(headers["Reporting-Endpoints"]).toBe('csp-endpoint="https://pauseai.uk/api/csp-report"');
  });

  it("uses only the relative report-uri outside production", async () => {
    const headers = await headersFor({ NODE_ENV: "development" });
    expect(headers["Reporting-Endpoints"]).toBeUndefined();
    expect(headers["Content-Security-Policy-Report-Only"]).toContain("report-uri /api/csp-report");
    expect(headers["Content-Security-Policy-Report-Only"]).not.toContain("report-to");
  });
});

describe("redirects", () => {
  it("keeps old story links, the campaigns-v2 links, old staff alert links, the Glasgow group's old path and malformed backlinks working", async () => {
    const config = await loadConfig({});
    const redirects = await config.redirects!();
    expect(redirects).toContainEqual({ source: "/stories", destination: "/people", permanent: true });
    expect(redirects).toContainEqual({ source: "/stories/:slug", destination: "/people/:slug", permanent: true });
    expect(redirects).toContainEqual({ source: "/campaigns-v2", destination: "/campaigns", permanent: true });
    expect(redirects).toContainEqual({
      source: "/campaigns-v2/:path*",
      destination: "/campaigns/:path*",
      permanent: true,
    });
    expect(redirects).toContainEqual({
      source: "/staff/blocked-addresses",
      destination: "/staff/blocked-emails",
      permanent: true,
    });
    expect(redirects).toContainEqual({ source: "/glasgow", destination: "/scotland", permanent: true });
    expect(redirects.filter((r) => !r.permanent)).toEqual([
      { source: "/protests", destination: "/protests/march-against-ai-extinction-nov-26", permanent: false },
    ]);
  });
});

describe("SITE_ORIGIN, for staff login links", () => {
  async function siteOrigin(env: Record<string, string | undefined>) {
    vi.resetModules();
    for (const [key, value] of Object.entries(env)) {
      vi.stubEnv(key, value ?? "");
      if (value === undefined) delete process.env[key];
    }
    return (await import("./next.config")).default.env!.SITE_ORIGIN;
  }

  it("is the live site's URL in production, and a preview's own address elsewhere on Netlify", async () => {
    expect(
      await siteOrigin({
        CONTEXT: "production",
        URL: "https://pauseai.uk",
        DEPLOY_PRIME_URL: "https://main--pauseai.netlify.app",
      }),
    ).toBe("https://pauseai.uk");
    expect(
      await siteOrigin({
        CONTEXT: "deploy-preview",
        URL: "https://pauseai.uk",
        DEPLOY_PRIME_URL: "https://deploy-preview-1--pauseai.netlify.app",
      }),
    ).toBe("https://deploy-preview-1--pauseai.netlify.app");
  });

  it("is empty for a local build", async () => {
    expect(await siteOrigin({ CONTEXT: undefined, DEPLOY_PRIME_URL: undefined })).toBe("");
  });
});
