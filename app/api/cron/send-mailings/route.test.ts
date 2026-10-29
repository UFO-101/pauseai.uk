import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("CRON_SECRET", "s3cret"));
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) =>
  POST(new Request("https://pauseai.uk/api/cron/send-mailings", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/send-mailings", () => {
  useTestDatabase();

  it("starts the mailings due and sends, saying what it did and what's left", async () => {
    expect(await (await call("Bearer s3cret")).json()).toEqual({
      started: [],
      sent: 0,
      skipped: 0,
      failed: 0,
      left: 0,
      waiting: [],
    });
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
