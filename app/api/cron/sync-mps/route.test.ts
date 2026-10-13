import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("CRON_SECRET", "s3cret"));
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) => POST(new Request("https://pauseai.uk/api/cron/sync-mps", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/sync-mps", () => {
  useTestDatabase();

  it("copies the MPs from Parliament, and says what changed", async () => {
    const res = await call("Bearer s3cret");
    expect(await res.json()).toEqual({ status: "applied", added: 2, removed: 0, changed: 0 });
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
