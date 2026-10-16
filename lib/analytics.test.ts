import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsEnabled } from "./analytics";

afterEach(() => vi.unstubAllEnvs());

describe("analyticsEnabled", () => {
  it("is on for the live site", () => {
    vi.stubEnv("DEPLOY_CONTEXT", "production");
    vi.stubEnv("ANALYTICS", "");
    expect(analyticsEnabled()).toBe(true);
  });

  it("is off for a deploy preview or a local build", () => {
    vi.stubEnv("DEPLOY_CONTEXT", "deploy-preview");
    vi.stubEnv("ANALYTICS", "");
    expect(analyticsEnabled()).toBe(false);
    vi.stubEnv("DEPLOY_CONTEXT", "local");
    expect(analyticsEnabled()).toBe(false);
  });

  it("is on where ANALYTICS=1 asks for it, as a fixture build does", () => {
    vi.stubEnv("DEPLOY_CONTEXT", "local");
    vi.stubEnv("ANALYTICS", "1");
    expect(analyticsEnabled()).toBe(true);
  });
});
