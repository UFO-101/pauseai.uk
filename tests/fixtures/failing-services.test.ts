import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { failingResponse, failService } from "./failing-services";
import { fixtureResponse } from "./outside-services";

describe("an outside service failing for one flow", () => {
  const dir = mkdtempSync(join(tmpdir(), "failing-"));
  afterEach(() => vi.unstubAllEnvs());

  it("fails each host the flow named, for it alone, and nothing anywhere else", async () => {
    failService("flow_a", "api.airtable.com", dir);
    failService("flow_a", "oauth2.googleapis.com", dir);
    expect(failingResponse("api.airtable.com", "flow_a", dir)!.status).toBe(503);
    const google = failingResponse("oauth2.googleapis.com", "flow_a", dir)!;
    expect([google.status, (await google.json()).error]).toEqual([400, "invalid_grant"]);
    expect(failingResponse("api.airtable.com", "flow_b", dir)).toBeUndefined();
    expect(failingResponse("public-api.luma.com", "flow_a", dir)).toBeUndefined();
    expect(failingResponse("api.airtable.com", undefined, dir)).toBeUndefined();
    expect(failingResponse("api.airtable.com", "flow_a", undefined)).toBeUndefined();
  });

  it("is what the fixtures answer, from FAILING_DIR", () => {
    vi.stubEnv("FAILING_DIR", dir);
    failService("flow_c", "api.postcodes.io", dir);
    expect(fixtureResponse("https://api.postcodes.io/postcodes/SW1A1AA", undefined, "flow_c")!.status).toBe(503);
    rmSync(dir, { recursive: true, force: true });
  });
});
