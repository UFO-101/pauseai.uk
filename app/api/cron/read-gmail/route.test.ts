import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { listRuns } from "@/lib/server/import-runs";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("CRON_SECRET", "s3cret"));
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) =>
  POST(new Request("https://pauseai.uk/api/cron/read-gmail", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/read-gmail", () => {
  useTestDatabase();

  it("reads each connected Gmail, says what it found, and keeps the run as the schedule's", async () => {
    await connectTestGmail("jo@pauseai.uk");
    expect(await (await call("Bearer s3cret")).json()).toEqual({
      accounts: [{ account: "jo@pauseai.uk", replies: 0, autoReplies: 0, bounces: 0 }],
    });
    expect(await listRuns("read-gmail")).toMatchObject([{ startedBy: "nightly", status: "unchanged" }]);
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
