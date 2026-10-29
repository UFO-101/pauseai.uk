import { afterEach, describe, expect, it, vi } from "vitest";
import { isBackupRequest, isCronRequest } from "./cron";

afterEach(() => vi.unstubAllEnvs());

const request = (authorization?: string) =>
  new Request("https://pauseai.uk/api/cron/x", { headers: authorization ? { authorization } : {} });

describe("isCronRequest", () => {
  it("accepts only the right bearer token", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isCronRequest(request("Bearer s3cret"))).toBe(true);
    expect(isCronRequest(request("Bearer s3cres"))).toBe(false);
    expect(isCronRequest(request("Bearer s3"))).toBe(false);
    expect(isCronRequest(request())).toBe(false);
  });

  it("accepts nothing without CRON_SECRET", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isCronRequest(request("Bearer "))).toBe(false);
  });
});

describe("isBackupRequest", () => {
  it("accepts only BACKUP_SECRET, and nothing without it", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.stubEnv("BACKUP_SECRET", "b4ckup");
    expect(isBackupRequest(request("Bearer b4ckup"))).toBe(true);
    expect(isBackupRequest(request("Bearer s3cret"))).toBe(false);
    vi.stubEnv("BACKUP_SECRET", "");
    expect(isBackupRequest(request("Bearer "))).toBe(false);
  });
});
