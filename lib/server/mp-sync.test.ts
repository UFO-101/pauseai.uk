import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { type MpSync, NIGHTLY } from "@/lib/import-runs";
import { listRuns } from "./import-runs";
import { decideHeldSync, syncMps, syncsToShow } from "./mp-sync";

const recentSyncs = () => listRuns("sync-mps") as Promise<MpSync[]>;

const JO = "jo@pauseai.uk";

type Row = { airtable_id: string | null; name: string; email: string | null; sitting: boolean; is_test: boolean };
const politicians = () =>
  query<Row>("SELECT airtable_id, name, email, sitting, is_test FROM politicians ORDER BY is_test, airtable_id, name");

// Airtable's API, matched without naming its host, which only lib/server/outside-services/airtable.ts does.
const AIRTABLE = "https://*.airtable.com/v0/*";

const testStatuses = () =>
  query(
    "SELECT p.test_postcode, s.campaign, s.status FROM campaign_statuses s JOIN politicians p ON p.id = s.politician_id WHERE p.is_test ORDER BY p.test_postcode",
  );

beforeEach(() => {
  vi.stubEnv("TEST_MP_EMAIL", "test-mp@example.org");
  vi.stubEnv("AIRTABLE_TOKEN", "token");
});
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("syncMps", () => {
  useTestDatabase();

  it("fills an empty table from Airtable, adds the test MPs, and records the sync", async () => {
    const result = await syncMps(NIGHTLY);

    expect(result.status).toBe("applied");
    expect(result.changes.added).toHaveLength(2);
    expect(await politicians()).toEqual([
      {
        airtable_id: "recDummy",
        name: "Ms Dora Dummy",
        email: "mp90001.office@parliament.uk",
        sitting: true,
        is_test: false,
      },
      {
        airtable_id: "recPlaceholder",
        name: "Polly Placeholder",
        email: "polly.placeholder.mp@parliament.uk",
        sitting: true,
        is_test: false,
      },
      { airtable_id: null, name: "Backy McTestface MP", email: "test-mp@example.org", sitting: true, is_test: true },
      {
        airtable_id: null,
        name: "Bouncy McTestface MP",
        email: "no-such-mailbox@pauseai.uk",
        sitting: true,
        is_test: true,
      },
      { airtable_id: null, name: "Nomail McTestface MP", email: null, sitting: true, is_test: true },
      { airtable_id: null, name: "Signy McTestface MP", email: "test-mp@example.org", sitting: true, is_test: true },
      { airtable_id: null, name: "Testy McTestface MP", email: "test-mp@example.org", sitting: true, is_test: true },
    ]);
    expect(await testStatuses()).toEqual([
      { test_postcode: "ZZ99ZB", campaign: "support-sobel-bill", status: "signed" },
      { test_postcode: "ZZ99ZS", campaign: "regulate-letter-pm", status: "signed" },
    ]);
    const [sync] = await recentSyncs();
    expect(sync).toMatchObject({ status: "applied", startedBy: NIGHTLY, error: null, decidedBy: null });
    expect(sync.result.changes.added.map((mp) => mp.airtableId)).toEqual(["recPlaceholder", "recDummy"]);
    // Applied, so the full list isn't needed again.
    expect(sync.result.mps).toBeUndefined();
    expect(await query("SELECT actor, action FROM audit_log")).toEqual([{ actor: "sync", action: "apply MP sync" }]);
  });

  it("does nothing when nothing has changed, except keep the test MPs' inbox up to date, and records that", async () => {
    await syncMps(NIGHTLY);
    vi.stubEnv("TEST_MP_EMAIL", "");
    expect((await syncMps(JO)).status).toBe("unchanged");
    const [unchanged, applied] = await recentSyncs();
    expect(unchanged).toMatchObject({ status: "unchanged", startedBy: JO });
    expect(applied.status).toBe("applied");
    expect((await politicians()).filter((p) => p.is_test).map((p) => p.email)).toEqual([
      null,
      "no-such-mailbox@pauseai.uk",
      null,
      null,
      null,
    ]);
  });

  it("leaves the test MPs' statuses to staff once they're added", async () => {
    await syncMps(NIGHTLY);
    await query("DELETE FROM campaign_statuses");
    await syncMps(NIGHTLY);
    expect(await testStatuses()).toEqual([]);
  });

  it("applies a small change: an MP who left stays, no longer sitting", async () => {
    await syncMps(NIGHTLY);
    server.use(
      http.get(AIRTABLE, () =>
        HttpResponse.json({
          records: [
            {
              id: "recDummy",
              fields: {
                "Full name or Title": "Ms Dora Dummy",
                Salutation: "Ms Dummy",
                Constituency: "Hackney North and Stoke Newington",
                Party: "Labour",
                Email: "mp90001.office@parliament.uk",
              },
            },
          ],
        }),
      ),
    );
    const result = await syncMps(NIGHTLY);
    expect(result.status).toBe("applied");
    expect(result.changes.removed.map((mp) => mp.airtableId)).toEqual(["recPlaceholder"]);
    expect((await politicians()).find((p) => p.airtable_id === "recPlaceholder")!.sitting).toBe(false);
  });

  it("holds a sync that changes many MPs, until someone applies it", async () => {
    for (let i = 1; i <= 25; i++)
      await addTestPolitician({ airtableId: `rec${10000 + i}`, name: `MP ${i}`, constituency: `Seat ${i}` });

    const result = await syncMps(NIGHTLY);

    expect(result.status).toBe("held");
    expect((await politicians()).filter((p) => p.sitting && !p.is_test)).toHaveLength(25);
    const [held] = await recentSyncs();
    expect(held.status).toBe("held");
    // The full list, to apply later.
    expect(held.result.mps).toHaveLength(2);

    expect(await decideHeldSync(held.id, "apply", "jo@pauseai.uk")).toBe(true);
    expect((await politicians()).filter((p) => p.sitting && !p.is_test).map((p) => p.airtable_id)).toEqual([
      "recDummy",
      "recPlaceholder",
    ]);
    expect((await recentSyncs())[0]).toMatchObject({ status: "applied", decidedBy: "jo@pauseai.uk" });
    expect(await decideHeldSync(held.id, "apply", "jo@pauseai.uk")).toBe(false);
  });

  it("discards a held sync without changing anyone", async () => {
    for (let i = 1; i <= 25; i++)
      await addTestPolitician({ airtableId: `rec${10000 + i}`, name: `MP ${i}`, constituency: `Seat ${i}` });
    await syncMps(NIGHTLY);
    const [held] = await recentSyncs();

    expect(await decideHeldSync(held.id, "discard", "jo@pauseai.uk")).toBe(true);

    expect((await politicians()).filter((p) => p.sitting && !p.is_test)).toHaveLength(25);
    expect((await recentSyncs())[0].status).toBe("discarded");
    expect((await query<{ action: string }>("SELECT action FROM audit_log ORDER BY id")).map((r) => r.action)).toEqual([
      "hold MP sync",
      "discard held MP sync",
    ]);

    // The page shows the newest run, plus any held one still waiting: not the discarded one.
    await syncMps(NIGHTLY);
    await syncMps(NIGHTLY);
    const shown = await syncsToShow();
    expect(shown.map((run) => run.status)).toEqual(["held", "held"]);
    await decideHeldSync(shown[0].id, "apply", "jo@pauseai.uk");
    await syncMps(NIGHTLY);
    expect((await syncsToShow()).map((run) => run.status)).toEqual(["unchanged", "held"]);
  });

  it("asks Airtable for the sitting MPs only, with its token", async () => {
    const requests: Request[] = [];
    server.use(http.get(AIRTABLE, ({ request }) => void requests.push(request)));
    await syncMps(NIGHTLY);
    expect(requests[0].headers.get("authorization")).toBe("Bearer token");
    expect(new URL(requests[0].url).searchParams.get("filterByFormula")).toBe(
      "AND({Body}='House of Commons',{Status}=BLANK())",
    );
  });

  it("fails, changing nothing but the log, without a token or if Airtable fails", async () => {
    vi.stubEnv("AIRTABLE_TOKEN", "");
    await expect(syncMps(NIGHTLY)).rejects.toThrow("AIRTABLE_TOKEN isn't set");
    vi.stubEnv("AIRTABLE_TOKEN", "token");
    server.use(http.get(AIRTABLE, () => new HttpResponse(null, { status: 500 })));
    await expect(syncMps(JO)).rejects.toThrow("status 500");
    expect(await politicians()).toEqual([]);
    expect(await recentSyncs()).toMatchObject([
      { status: "failed", startedBy: JO, error: "Airtable request failed with status 500: ", result: {} },
      { status: "failed", startedBy: NIGHTLY, error: expect.stringContaining("AIRTABLE_TOKEN isn't set") },
    ]);
  });
});
