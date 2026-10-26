import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import fixture from "@/tests/fixtures/airtable-politicians.json";
import { addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { query } from "./db";
import { type PoliticianSync, NIGHTLY } from "@/lib/import-runs";
import { listRuns } from "./import-runs";
import { decideHeldSync, mpsInOffice, syncPoliticians } from "./politician-sync";
import { setStatus } from "./politicians";

const recentSyncs = () => listRuns("sync-politicians") as Promise<PoliticianSync[]>;

const JO = "jo@pauseai.uk";

// Airtable's API, matched without naming its host, which only lib/server/outside-services/airtable.ts does.
const AIRTABLE = "https://*.airtable.com/v0/*";

type Record = (typeof fixture.records)[number] | { id: string; fields: { [field: string]: unknown } };

/** Airtable answers with these records instead of the fixture's. */
function airtableHas(records: Record[]) {
  server.use(http.get(AIRTABLE, () => HttpResponse.json({ records })));
}

/** `count` made-up MPs, as Airtable has them. */
const many = (count: number, from = 1): Record[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `recMany${from + i}`,
    fields: { "Full name or Title": `Many ${from + i}`, Body: "House of Commons", Constituency: `Seat ${from + i}` },
  }));

const people = () =>
  query<{ airtableId: string | null; name: string; status: string; house: string; removed: boolean; isTest: boolean }>(
    `SELECT n.airtable_id AS "airtableId", n.name, n.status, p.house, n.airtable_removed_at IS NOT NULL AS removed,
       p.is_test AS "isTest"
     FROM notable_people n JOIN politicians p ON p.id = n.id ORDER BY p.is_test, n.name`,
  );

const statuses = () =>
  query<{ name: string; ask: string; status: string; by: string }>(
    `SELECT n.name, s.ask, s.status, s.updated_by AS by FROM ask_statuses s JOIN notable_people n ON n.id = s.notable_person_id
     ORDER BY n.name, s.ask`,
  );

beforeEach(() => {
  vi.stubEnv("TEST_MP_EMAIL", "test-mp@example.org");
  vi.stubEnv("AIRTABLE_TOKEN", "token");
});
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("syncPoliticians", () => {
  useTestDatabase();

  it("fills an empty table from Airtable, every body, with Airtable's statuses and the test MPs, and records the sync", async () => {
    const result = await syncPoliticians(NIGHTLY);
    expect(result).toMatchObject({ status: "applied", renamed: [], statuses: { added: 5, changed: 0, removed: 0 } });
    expect(result.changes.added).toHaveLength(6);
    expect((await people()).filter((p) => !p.isTest)).toEqual([
      {
        airtableId: "recGone",
        name: "Gordon Gone",
        status: "left_office",
        house: "commons",
        removed: false,
        isTest: false,
      },
      {
        airtableId: "recSeedling",
        name: "Lord Seedling of Example",
        status: "in_office",
        house: "lords",
        removed: false,
        isTest: false,
      },
      {
        airtableId: "recMorag",
        name: "Morag Example",
        status: "in_office",
        house: "scottish-parliament",
        removed: false,
        isTest: false,
      },
      {
        airtableId: "recDummy",
        name: "Ms Dora Dummy",
        status: "in_office",
        house: "commons",
        removed: false,
        isTest: false,
      },
      {
        airtableId: "recPlaceholder",
        name: "Polly Placeholder",
        status: "in_office",
        house: "commons",
        removed: false,
        isTest: false,
      },
      {
        airtableId: "recRetired",
        name: "Rita Retired",
        status: "retired",
        house: "commons",
        removed: false,
        isTest: false,
      },
    ]);
    expect((await people()).filter((p) => p.isTest).map((p) => p.name)).toEqual([
      "Backy McTestface MP",
      "Bouncy McTestface MP",
      "Nomail McTestface MP",
      "Signy McTestface MP",
      "Testy McTestface MP",
    ]);
    expect(await statuses()).toEqual([
      { name: "Backy McTestface MP", ask: "controlai-statement", status: "signed", by: "sync" },
      { name: "Lord Seedling of Example", ask: "deepmind-letter", status: "signed", by: "airtable" },
      { name: "Morag Example", ask: "edinburgh-conference-2026", status: "going", by: "airtable" },
      { name: "Polly Placeholder", ask: "controlai-statement", status: "signed", by: "airtable" },
      { name: "Polly Placeholder", ask: "edinburgh-conference-2026", status: "declined", by: "airtable" },
      { name: "Rita Retired", ask: "frontier-ai-letter", status: "signed", by: "airtable" },
      { name: "Signy McTestface MP", ask: "frontier-ai-letter", status: "signed", by: "sync" },
    ]);
    // Everything the sync copies, for one of them.
    expect(
      await query(
        `SELECT n.forename, n.surname, n.salutation, n.email, n.notes, n.important_target AS "importantTarget",
           n.personal_connection AS "personalConnection", p.constituency, p.party, p.country, p.city
         FROM notable_people n JOIN politicians p USING (id) WHERE n.airtable_id = 'recPlaceholder'`,
      ),
    ).toEqual([
      {
        forename: "Polly",
        surname: "Placeholder",
        salutation: "Ms Placeholder",
        email: "polly.placeholder.mp@parliament.uk",
        notes: "Met at the example fair.\nRecommended",
        importantTarget: true,
        personalConnection: false,
        constituency: "Cities of London and Westminster",
        party: "Labour (Co-op)",
        country: "england",
        city: null,
      },
    ]);
    const [sync] = await recentSyncs();
    expect(sync).toMatchObject({ status: "applied", startedBy: NIGHTLY, error: null, decidedBy: null });
    // Applied, so the records aren't needed again.
    expect(sync.result.records).toBeUndefined();
    // The run's summary, one entry per politician added, by their row, and one per status set.
    const log = await query<{ actor: string; action: string }>("SELECT actor, action FROM audit_log ORDER BY id");
    expect(log.filter((e) => e.action === "add politician")).toHaveLength(6);
    expect(log.filter((e) => e.action === "set status" && e.actor === "airtable")).toHaveLength(5);
    expect(log.at(-1)).toEqual({ actor: "sync", action: "apply politician sync" });
    expect(
      await query(
        "SELECT count(*)::int AS n FROM audit_log a JOIN notable_people p ON p.id = (a.details->>'id')::bigint WHERE a.action = 'add politician'",
      ),
    ).toEqual([{ n: 6 }]);
  });

  it("does nothing when nothing has changed, except keep the test MPs' inbox up to date, and records that", async () => {
    await syncPoliticians(NIGHTLY);
    vi.stubEnv("TEST_MP_EMAIL", "");
    expect((await syncPoliticians(JO)).status).toBe("unchanged");
    const [unchanged, applied] = await recentSyncs();
    expect(unchanged).toMatchObject({ status: "unchanged", startedBy: JO });
    expect(applied.status).toBe("applied");
    expect(
      await query("SELECT n.email FROM notable_people n JOIN politicians p USING (id) WHERE p.is_test ORDER BY n.name"),
    ).toEqual([
      { email: null },
      { email: "no-such-mailbox@pauseai.uk" },
      { email: null },
      { email: null },
      { email: null },
    ]);
    expect(await query("SELECT count(*)::int AS n FROM audit_log WHERE action LIKE '%politician sync'")).toEqual([
      { n: 1 },
    ]);
  });

  it("leaves the test MPs' statuses to staff once they're added", async () => {
    await syncPoliticians(NIGHTLY);
    await query("DELETE FROM ask_statuses WHERE updated_by = 'sync'");
    await syncPoliticians(NIGHTLY);
    expect((await statuses()).filter((s) => s.by === "sync")).toEqual([]);
  });

  it("applies a small change: one gone from Airtable is kept with their status, one retires, and one comes back", async () => {
    await syncPoliticians(NIGHTLY);
    const [dora, polly, ...rest] = fixture.records;
    airtableHas([{ ...polly, fields: { ...polly.fields, Status: "Retired" } }, ...rest]);
    const result = await syncPoliticians(NIGHTLY);
    expect(result.status).toBe("applied");
    expect(result.changes.removed.map((p) => p.airtableId)).toEqual(["recDummy"]);
    expect(result.changes.changed.map((p) => p.airtableId)).toEqual(["recPlaceholder"]);
    const after = await people();
    expect(after.find((p) => p.name === "Ms Dora Dummy")).toMatchObject({ status: "in_office", removed: true });
    expect(after.find((p) => p.name === "Polly Placeholder")).toMatchObject({ status: "retired", removed: false });
    const edit = await query<{ details: { changed: object } }>(
      "SELECT details FROM audit_log WHERE action = 'edit politician'",
    );
    expect(edit[0].details.changed).toEqual({ status: ["in_office", "retired"] });
    expect(await query("SELECT details->>'name' AS name FROM audit_log WHERE action = 'remove politician'")).toEqual([
      { name: "Ms Dora Dummy" },
    ]);

    // Dora's record is back: no longer marked, and logged as an edit, not added again.
    airtableHas([dora, { ...polly, fields: { ...polly.fields, Status: "Retired" } }, ...rest]);
    const back = await syncPoliticians(NIGHTLY);
    expect(back.changes).toMatchObject({ added: [], changed: [{ airtableId: "recDummy" }] });
    expect((await people()).find((p) => p.name === "Ms Dora Dummy")).toMatchObject({ removed: false });
    expect(await query("SELECT count(*)::int AS n FROM notable_people WHERE airtable_id = 'recDummy'")).toEqual([
      { n: 1 },
    ]);
  });

  it("takes a politician added by hand under the same name to be Airtable's, rather than adding them twice", async () => {
    const peer = await addTestPolitician({
      airtableId: null,
      name: "Lord Seedling of Example",
      house: "lords",
      constituency: null,
      forename: null,
      surname: null,
    });
    await syncPoliticians(NIGHTLY);
    expect(
      await query("SELECT id::int AS id, airtable_id FROM notable_people WHERE name = 'Lord Seedling of Example'"),
    ).toEqual([{ id: peer, airtable_id: "recSeedling" }]);
  });

  it("holds a sync that changes too much, for staff to apply, with its statuses, or discard", async () => {
    airtableHas(many(3));
    await syncPoliticians(NIGHTLY);
    airtableHas([...many(3), ...many(21, 4), ...fixture.records]);
    const held = await syncPoliticians(NIGHTLY);
    expect(held.status).toBe("held");
    expect(held.changes.added).toHaveLength(27);
    // Nothing applied, but the statuses of those already here are set.
    expect((await people()).filter((p) => !p.isTest)).toHaveLength(3);
    const [run] = await recentSyncs();
    expect(run.result.records).toHaveLength(30);

    expect(await decideHeldSync(run.id, "apply", JO)).toBe(true);
    expect((await people()).filter((p) => !p.isTest)).toHaveLength(30);
    expect((await statuses()).filter((s) => s.by === "airtable")).toHaveLength(5);
    expect((await recentSyncs())[0]).toMatchObject({ status: "applied", decidedBy: JO });
    expect(await query("SELECT actor, action FROM audit_log ORDER BY id DESC LIMIT 1")).toEqual([
      { actor: JO, action: "apply held politician sync" },
    ]);
    // Decided, so it can't be decided again.
    expect(await decideHeldSync(run.id, "discard", JO)).toBe(false);
    expect(await decideHeldSync(9999, "apply", JO)).toBe(false);
  });

  it("holds a sync that renames anyone, which may be Airtable reusing a record, and discards it on request", async () => {
    await syncPoliticians(NIGHTLY);
    const [dora, ...rest] = fixture.records;
    airtableHas([{ ...dora, fields: { ...dora.fields, "Full name or Title": "Someone New" } }, ...rest]);
    const held = await syncPoliticians(NIGHTLY);
    expect(held).toMatchObject({
      status: "held",
      renamed: [{ airtableId: "recDummy", from: "Ms Dora Dummy", to: "Someone New" }],
    });
    const [run] = await recentSyncs();
    expect(await decideHeldSync(run.id, "discard", JO)).toBe(true);
    expect((await people()).map((p) => p.name)).toContain("Ms Dora Dummy");
    expect((await recentSyncs())[0]).toMatchObject({ status: "discarded", decidedBy: JO });
  });

  it("sets only its own statuses: changes and takes away Airtable's, and leaves staff's and the other imports' alone", async () => {
    await syncPoliticians(NIGHTLY);
    const id = async (name: string) =>
      (await query<{ id: number }>("SELECT id::int AS id FROM notable_people WHERE name = $1", [name]))[0].id;
    // Staff marked Dora as having signed the letter to the PM; Airtable's Go to Parliament import set Rita's meeting.
    await setStatus(await id("Ms Dora Dummy"), "frontier-ai-letter", { status: "signed", date: null, note: "" }, JO);
    await setStatus(
      await id("Rita Retired"),
      "go-to-parliament-oct-2026",
      { status: "going", date: null, note: "" },
      "airtable",
    );
    // Staff took over Morag's answer to the conference.
    await setStatus(
      await id("Morag Example"),
      "edinburgh-conference-2026",
      { status: "tentative", date: null, note: "" },
      JO,
    );
    const [dora, polly, seedling, morag, ...rest] = fixture.records;
    airtableHas([
      { ...dora, fields: { ...dora.fields, "Signed Frontier AI Letter": false } },
      // Polly now goes to the conference, and no longer backs ControlAI's statement.
      {
        ...polly,
        fields: { ...polly.fields, "ControlAI Signatory": false, "Edinburgh Conference November 2026": "Going" },
      },
      seedling,
      { ...morag, fields: { ...morag.fields, "Edinburgh Conference November 2026": "Declined" } },
      ...rest,
    ]);
    const result = await syncPoliticians(NIGHTLY);
    expect(result).toMatchObject({ status: "applied", statuses: { added: 0, changed: 1, removed: 1 } });
    expect(await statuses()).toEqual(
      expect.arrayContaining([
        { name: "Ms Dora Dummy", ask: "frontier-ai-letter", status: "signed", by: JO },
        { name: "Morag Example", ask: "edinburgh-conference-2026", status: "tentative", by: JO },
        { name: "Polly Placeholder", ask: "edinburgh-conference-2026", status: "going", by: "airtable" },
        { name: "Rita Retired", ask: "go-to-parliament-oct-2026", status: "going", by: "airtable" },
      ]),
    );
    expect((await statuses()).some((s) => s.name === "Polly Placeholder" && s.ask === "controlai-statement")).toBe(
      false,
    );
    expect(
      await query(
        `SELECT details->>'ask' AS ask, details->>'status' AS status FROM audit_log
         WHERE action = 'set status' AND actor = 'airtable' ORDER BY id DESC LIMIT 2`,
      ),
    ).toEqual([
      { ask: "controlai-statement", status: null },
      { ask: "edinburgh-conference-2026", status: "going" },
    ]);
  });

  it("gives the check against Parliament the MPs in office, by constituency", async () => {
    await syncPoliticians(NIGHTLY);
    expect(await mpsInOffice()).toEqual([
      {
        name: "Polly Placeholder",
        constituency: "Cities of London and Westminster",
        email: "polly.placeholder.mp@parliament.uk",
      },
      {
        name: "Ms Dora Dummy",
        constituency: "Hackney North and Stoke Newington",
        email: "mp90001.office@parliament.uk",
      },
    ]);
  });

  it("fails, changing nothing but the log, without a token or if Airtable fails", async () => {
    vi.stubEnv("AIRTABLE_TOKEN", "");
    await expect(syncPoliticians(NIGHTLY)).rejects.toThrow("AIRTABLE_TOKEN isn't set");
    vi.stubEnv("AIRTABLE_TOKEN", "token");
    server.use(http.get(AIRTABLE, () => new HttpResponse(null, { status: 500 })));
    await expect(syncPoliticians(JO)).rejects.toThrow("status 500");
    expect(await people()).toEqual([]);
    expect(await recentSyncs()).toMatchObject([
      { status: "failed", startedBy: JO, error: "Airtable request failed with status 500: ", result: {} },
      { status: "failed", startedBy: NIGHTLY, error: expect.stringContaining("AIRTABLE_TOKEN isn't set") },
    ]);
  });
});
