import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("CRON_SECRET", "s3cret"));
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) =>
  POST(new Request("https://pauseai.uk/api/cron/read-gmail", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/read-gmail", () => {
  useTestDatabase();

  it("reads each connected Gmail, and says what it found", async () => {
    await connectTestGmail("jo@pauseai.uk");
    expect(await (await call("Bearer s3cret")).json()).toEqual({
      accounts: [{ account: "jo@pauseai.uk", replies: 0, autoReplies: 0, bounces: 0 }],
    });
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
