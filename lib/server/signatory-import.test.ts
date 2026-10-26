import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { staffCopy } from "@/lib/content/staff-interface";
import { query } from "./db";
import { getPolitician, setStatus } from "./politicians";
import { listRuns } from "./import-runs";
import { importSignatories } from "./signatory-import";

const recentSignatoryImports = () => listRuns("import-signatories");

// Airtable's API, matched without naming its host, which only lib/server/outside-services/airtable.ts does.
const AIRTABLE = "https://*.airtable.com/v0/*";
const PM = "frontier-ai-letter";

function airtable(...people: Record<string, string>[]) {
  server.use(
    http.get(AIRTABLE, () => HttpResponse.json({ records: people.map((fields, i) => ({ id: `rec${i}`, fields })) })),
  );
}

describeWithDatabase("importSignatories", () => {
  useTestDatabase();
  beforeEach(() => vi.stubEnv("AIRTABLE_TOKEN", "token"));
  afterEach(() => vi.unstubAllEnvs());

  it("matches MPs by Airtable's ID, then email, then constituency, and adds everyone else to their house", async () => {
    const byId = await addTestPolitician({
      airtableId: "rec0",
      name: "Polly Placeholder",
      email: "polly.placeholder.mp@parliament.uk",
    });
    const byEmail = await addTestPolitician({
      airtableId: "recX",
      name: "Sam Smith",
      constituency: "Bath",
      email: "sam.smith.mp@parliament.uk",
    });
    const bySeat = await addTestPolitician({
      airtableId: "recY",
      name: "Ian Instance",
      constituency: "Ipswich",
      email: "jack@parliament.uk",
    });
    await addTestMp();
    airtable(
      { "Full name or Title": "Polly Placeholder MP", Email: "old@parliament.uk", Constituency: "Somewhere else" },
      { "Full name or Title": "Sam Smith MP", Email: "Sam.Smith.MP@parliament.uk ", Constituency: "Somewhere else" },
      { "Full name or Title": "Ian Instance MP", Email: "old@parliament.uk", Constituency: "Ipswich" },
      { "Full name or Title": "Lord Example", Party: "Crossbench", Body: "House of Lords" },
      { "Full name or Title": "Ann MSP", Constituency: "Glasgow", Body: "Scottish Parliament" },
      { "Full name or Title": "Bryn MS", Constituency: "Cardiff", Body: "Welsh Parliament" },
      { "Full name or Title": "Ciara MLA", Constituency: "Foyle", Body: "Northern Ireland Assembly" },
      {
        "Full name or Title": "Former MP",
        Constituency: "Gone",
        Email: "former@example.org",
        Body: "House of Commons",
      },
      { "Full name or Title": "Lord Unlisted" },
      { "Full name or Title": "Someone", Constituency: "Somewhere" },
    );

    expect(await importSignatories("jo@pauseai.uk")).toEqual({ matched: 3, added: 7, alreadySet: 0 });
    expect(await recentSignatoryImports()).toMatchObject([
      { status: "ok", startedBy: "jo@pauseai.uk", result: { matched: 3, added: 7, alreadySet: 0 } },
    ]);

    for (const id of [byId, byEmail, bySeat])
      expect((await getPolitician(id))!.statuses[PM]).toMatchObject({
        status: "signed",
        note: staffCopy.import.note,
        updatedBy: "jo@pauseai.uk",
      });
    const added = await query(
      `SELECT p.house, n.name, p.constituency, p.party, n.email FROM notable_people n JOIN politicians p ON p.id = n.id
       WHERE n.airtable_id IS NULL AND NOT p.is_test ORDER BY n.id`,
    );
    expect(added).toEqual([
      { house: "lords", name: "Lord Example", constituency: null, party: "Crossbench", email: null },
      { house: "scottish-parliament", name: "Ann MSP", constituency: "Glasgow", party: "", email: null },
      { house: "senedd", name: "Bryn MS", constituency: "Cardiff", party: "", email: null },
      { house: "ni-assembly", name: "Ciara MLA", constituency: "Foyle", party: "", email: null },
      { house: "other", name: "Former MP", constituency: "Gone", party: "", email: "former@example.org" },
      { house: "lords", name: "Lord Unlisted", constituency: null, party: "", email: null },
      { house: "other", name: "Someone", constituency: "Somewhere", party: "", email: null },
    ]);
    expect(await query("SELECT action FROM audit_log WHERE action LIKE 'import%'")).toEqual([
      { action: "import signatories from Airtable" },
    ]);
    // Each signer added is logged by their row, by whoever ran the import.
    expect(
      await query(
        `SELECT a.actor, p.name FROM audit_log a JOIN notable_people p ON p.id = (a.details->>'id')::bigint
         WHERE a.action = 'add politician' ORDER BY p.name`,
      ),
    ).toEqual([
      { actor: "jo@pauseai.uk", name: "Ann MSP" },
      { actor: "jo@pauseai.uk", name: "Bryn MS" },
      { actor: "jo@pauseai.uk", name: "Ciara MLA" },
      { actor: "jo@pauseai.uk", name: "Former MP" },
      { actor: "jo@pauseai.uk", name: "Lord Example" },
      { actor: "jo@pauseai.uk", name: "Lord Unlisted" },
      { actor: "jo@pauseai.uk", name: "Someone" },
    ]);
  });

  it("can run again without adding anyone twice or overwriting a status", async () => {
    const mp = await addTestPolitician({ airtableId: "recPlaceholder" });
    await setStatus(mp, PM, { status: "signed", date: null, note: "Checked" }, "sam@pauseai.uk");
    airtable(
      { "Full name or Title": "Polly Placeholder", Email: "polly.placeholder.mp@parliament.uk" },
      { "Full name or Title": "Lord Example" },
    );

    await importSignatories("jo@pauseai.uk");
    expect(await importSignatories("jo@pauseai.uk")).toEqual({ matched: 2, added: 0, alreadySet: 2 });

    expect((await getPolitician(mp))!.statuses[PM]).toMatchObject({
      status: "signed",
      note: "Checked",
      updatedBy: "sam@pauseai.uk",
    });
    expect(await query("SELECT count(*)::int AS n FROM notable_people WHERE name = 'Lord Example'")).toEqual([
      { n: 1 },
    ]);
  });

  it("fails, keeping the failure, without a token", async () => {
    vi.stubEnv("AIRTABLE_TOKEN", "");
    await expect(importSignatories("jo@pauseai.uk")).rejects.toThrow("AIRTABLE_TOKEN isn't set");
    expect(await recentSignatoryImports()).toMatchObject([{ status: "failed", startedBy: "jo@pauseai.uk" }]);
  });
});
