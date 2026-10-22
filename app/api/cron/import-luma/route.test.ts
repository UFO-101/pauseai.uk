import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.stubEnv("LUMA_API_KEY", "k");
});
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) =>
  POST(new Request("https://pauseai.uk/api/cron/import-luma", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/import-luma", () => {
  useTestDatabase();

  it("copies the fixture calendar and says what it did", async () => {
    const res = await call("Bearer s3cret");
    expect(await res.json()).toMatchObject({ events: 9, eventsSynced: 9, eventsLeft: 0, people: 5, contacts: 3 });
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
