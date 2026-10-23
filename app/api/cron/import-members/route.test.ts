import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.stubEnv("AIRTABLE_TOKEN", "t");
});
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) =>
  POST(new Request("https://pauseai.uk/api/cron/import-members", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/import-members", () => {
  useTestDatabase();

  it("copies the fixture members and says what it did", async () => {
    const res = await call("Bearer s3cret");
    expect(await res.json()).toMatchObject({ members: 8, added: 8 });
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
