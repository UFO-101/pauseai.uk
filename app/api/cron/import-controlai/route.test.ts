import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("CRON_SECRET", "s3cret"));
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) =>
  POST(new Request("https://pauseai.uk/api/cron/import-controlai", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/import-controlai", () => {
  useTestDatabase();

  it("reads the letter and says what it did", async () => {
    // No politicians yet, so nobody matches.
    const res = await call("Bearer s3cret");
    expect(await res.json()).toMatchObject({ signatories: 6, matched: 0, added: 0 });
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
