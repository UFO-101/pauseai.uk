import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { stubLettersInboxEnv } from "@/tests/gmail-sends";
import { POST } from "./route";

const post = (authorization?: string) =>
  POST(
    new Request("https://pauseai.uk/api/cron/import-old-letters", {
      method: "POST",
      headers: authorization ? { authorization } : {},
      body: JSON.stringify({ startedBy: "jo@pauseai.uk" }),
    }),
  );

describeWithDatabase("POST /api/cron/import-old-letters", () => {
  useTestDatabase();
  beforeEach(() => {
    stubLettersInboxEnv();
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.stubEnv("AIRTABLE_TOKEN", "fixture");
    vi.stubEnv("GMAIL_TOKEN_KEY", Buffer.alloc(32, 7).toString("base64"));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("does some of a press, for the background function", async () => {
    await connectTestGmail("joseph@pauseai.uk");
    await connectTestGmail("policy@pauseai.uk");
    // Nothing to read, so it's done at once at its real pace.
    server.use(http.get("https://gmail.googleapis.com/gmail/v1/users/me/messages", () => HttpResponse.json({})));
    const res = await post("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ runId: 1, more: false });
  });

  it("refuses a call without the secret", async () => {
    expect((await post()).status).toBe(401);
  });
});
