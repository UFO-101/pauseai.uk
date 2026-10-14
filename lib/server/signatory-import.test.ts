import { expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { staffCopy } from "@/lib/content/staff-interface";
import { query } from "./db";
import { getPolitician, setStatus } from "./politicians";
import { importSignatories } from "./signatory-import";

// Airtable's API, matched without naming its host, which only lib/server/airtable.ts may do.
const AIRTABLE = "https://*.airtable.com/v0/*";
const PM = "regulate-letter-pm";

function airtable(...people: Record<string, string>[]) {
  server.use(http.get(AIRTABLE, () => HttpResponse.json({ records: people.map((fields, i) => ({ id: `rec${i}`, fields })) })));
}

describeWithDatabase("importSignatories", () => {
  useTestDatabase();

  it("matches MPs by email, then constituency, and adds everyone else", async () => {
    const byEmail = await addTestPolitician({ parliamentId: 1, name: "Rachel Blake", email: "rachel.blake.mp@parliament.uk" });
    const bySeat = await addTestPolitician({ parliamentId: 2, name: "Jack Abbott", constituency: "Ipswich", email: "jack@parliament.uk" });
    await addTestMp();
    airtable(
      { "Full name or Title": "Rachel Blake MP", Email: "Rachel.Blake.MP@parliament.uk ", Constituency: "Somewhere else" },
      { "Full name or Title": "Jack Abbott MP", Email: "old@parliament.uk", Constituency: "Ipswich" },
      { "Full name or Title": "Lord Example", Party: "Crossbench" },
      { "Full name or Title": "Former MP", Constituency: "Gone", Email: "former@example.org" },
      {},
    );

    expect(await importSignatories("token", "jo@pauseai.uk")).toEqual({ matched: 2, added: 3, alreadySet: 0 });

    for (const id of [byEmail, bySeat]) expect((await getPolitician(id))!.statuses[PM]).toMatchObject({ status: "signed", note: staffCopy.import.note, updatedBy: "jo@pauseai.uk" });
    const added = await query("SELECT house, name, constituency, party, email FROM politicians WHERE parliament_id IS NULL AND NOT is_test ORDER BY id");
    expect(added).toEqual([
      { house: "lords", name: "Lord Example", constituency: null, party: "Crossbench", email: null },
      { house: "other", name: "Former MP", constituency: "Gone", party: "", email: "former@example.org" },
      { house: "lords", name: "", constituency: null, party: "", email: null },
    ]);
    expect(await query("SELECT action FROM audit_log WHERE action LIKE 'import%'")).toEqual([{ action: "import signatories from Airtable" }]);
  });

  it("can run again without adding anyone twice or overwriting a status", async () => {
    const mp = await addTestPolitician({ parliamentId: 1 });
    await setStatus(mp, PM, { status: "supports", date: null, note: "Checked" }, "sam@pauseai.uk");
    airtable({ "Full name or Title": "Rachel Blake", Email: "rachel.blake.mp@parliament.uk" }, { "Full name or Title": "Lord Example" });

    await importSignatories("token", "jo@pauseai.uk");
    expect(await importSignatories("token", "jo@pauseai.uk")).toEqual({ matched: 2, added: 0, alreadySet: 2 });

    expect((await getPolitician(mp))!.statuses[PM]).toMatchObject({ status: "supports", note: "Checked" });
    expect(await query("SELECT count(*)::int AS n FROM politicians WHERE name = 'Lord Example'")).toEqual([{ n: 1 }]);
  });
});
