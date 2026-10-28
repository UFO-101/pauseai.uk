import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { query } from "@/lib/server/db";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { POST } from "./route";

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.stubEnv("AIRTABLE_TOKEN", "token");
});
afterEach(() => vi.unstubAllEnvs());

const call = (authorization: string) =>
  POST(new Request("https://pauseai.uk/api/cron/sync-politicians", { method: "POST", headers: { authorization } }));

describeWithDatabase("POST /api/cron/sync-politicians", () => {
  useTestDatabase();

  it("copies the politicians from Airtable, then PauseAI's emails to them, and says what changed", async () => {
    const res = await call("Bearer s3cret");
    expect(await res.json()).toEqual({
      status: "applied",
      added: 6,
      removed: 0,
      changed: 0,
      renamed: 0,
      statuses: { added: 5, changed: 0, removed: 0 },
      emails: 5,
    });
  });

  it("copies the emails even when the politicians fail, then fails, keeping both runs", async () => {
    server.use(
      // A Status the sync doesn't know fails it; the Emails sync reads the same table only for Test.
      http.get("https://*.airtable.com/v0/appBInVvIm6opJ1Ob/tblH3ks9wqQHLpYx3", () =>
        HttpResponse.json({ records: [{ id: "recOdd", fields: { "Full name or Title": "Odd", Status: "Odd" } }] }),
      ),
    );
    await expect(call("Bearer s3cret")).rejects.toThrow('Unknown Status "Odd"');
    expect(await query("SELECT job, status FROM import_runs ORDER BY id")).toEqual([
      { job: "sync-politicians", status: "failed" },
      { job: "sync-emails", status: "unchanged" },
    ]);
  });

  it("fails if the emails do, once the politicians are copied", async () => {
    server.use(
      http.get(
        "https://*.airtable.com/v0/appBInVvIm6opJ1Ob/tblp4nH5Jymq48rcm",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await expect(call("Bearer s3cret")).rejects.toThrow("status 500");
    expect(await query("SELECT job, status FROM import_runs ORDER BY id")).toEqual([
      { job: "sync-politicians", status: "applied" },
      { job: "sync-emails", status: "failed" },
    ]);
  });

  it("refuses anyone without the secret", async () => {
    expect((await call("Bearer guess")).status).toBe(401);
  });
});
