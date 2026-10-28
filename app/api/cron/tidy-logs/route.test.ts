import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("CRON_SECRET", "s3cret"));
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) =>
  POST(new Request("https://pauseai.uk/api/cron/tidy-logs", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/tidy-logs", () => {
  useTestDatabase();

  it("tidies the logs and says how much went", async () => {
    await query(
      "INSERT INTO import_runs (job, at, status) VALUES ('import-luma', now() - interval '8 days', 'ok'), ('import-luma', now(), 'ok')",
    );
    expect(await (await call("Bearer s3cret")).json()).toEqual({ importRuns: 1, auditEntries: 0 });
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
