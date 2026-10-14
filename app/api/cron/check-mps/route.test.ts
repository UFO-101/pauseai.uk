import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("CRON_SECRET", "s3cret"));
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) => POST(new Request("https://pauseai.uk/api/cron/check-mps", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/check-mps", () => {
  useTestDatabase();

  it("checks the MPs against Parliament's, and says how many problems it found", async () => {
    // No MPs copied yet, so both of Parliament's are missing.
    const res = await call("Bearer s3cret");
    expect(await res.json()).toEqual({ problems: 2 });
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
