import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { NIGHTLY } from "@/lib/import-runs";
import { query } from "./db";
import { importGoToParliament } from "./go-to-parliament-import";
import { listRuns } from "./import-runs";
import { syncPoliticians } from "./politician-sync";
import { setStatus } from "./politicians";

const JO = "jo@pauseai.uk";
const ASK = "go-to-parliament-oct-2026";

const statuses = () =>
  query(
    `SELECT n.name, s.status, s.updated_by AS by FROM ask_statuses s JOIN notable_people n ON n.id = s.notable_person_id
     WHERE s.ask = $1 ORDER BY n.name`,
    [ASK],
  );

/** Airtable's guests are these. */
function guests(records: { politicians: string[]; status: string }[]) {
  server.use(
    http.get("https://*.airtable.com/v0/appBInVvIm6opJ1Ob/tblminXS1xSuBbEjz", () =>
      HttpResponse.json({
        records: records.map((r, i) => ({
          id: `recG${i}`,
          fields: { "UK Parliamentarians": r.politicians, "MP Meeting Status": r.status },
        })),
      }),
    ),
  );
}

beforeEach(() => vi.stubEnv("AIRTABLE_TOKEN", "token"));
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("importGoToParliament", () => {
  useTestDatabase();

  it("gives each MP a guest was to meet a status from Airtable, the firmer of two", async () => {
    await syncPoliticians(NIGHTLY);
    expect(await importGoToParliament(JO)).toEqual({ guests: 5, mps: 4, added: 3, changed: 0, notFound: 1 });
    expect(await statuses()).toEqual([
      { name: "Gordon Gone", status: "declined_surgery", by: "airtable" },
      { name: "Ms Dora Dummy", status: "going", by: "airtable" },
      // "Meeting with staff" beats "Tentative meeting with staff".
      { name: "Polly Placeholder", status: "meeting_staff", by: "airtable" },
    ]);
    expect(
      await query(
        "SELECT count(*)::int AS n FROM audit_log WHERE action = 'set status' AND actor = 'airtable' AND details->>'ask' = $1",
        [ASK],
      ),
    ).toEqual([{ n: 3 }]);
    // Each dated the day of the event, which Airtable's sheet doesn't date.
    expect(await query("SELECT DISTINCT status_date::text AS date FROM ask_statuses WHERE ask = $1", [ASK])).toEqual([
      { date: "2026-10-20" },
    ]);
    expect(await query("SELECT actor, details FROM audit_log WHERE action = 'import Go to Parliament'")).toEqual([
      { actor: JO, details: { added: 3, changed: 0 } },
    ]);
    // Again: nothing changes.
    expect(await importGoToParliament(JO)).toMatchObject({ added: 0, changed: 0 });
  });

  it("changes its own statuses when Airtable does, never one staff set, and ranks every answer", async () => {
    await syncPoliticians(NIGHTLY);
    await importGoToParliament(JO);
    const [{ id }] = await query<{ id: number }>(
      "SELECT id::int AS id FROM notable_people WHERE airtable_id = 'recDummy'",
    );
    await setStatus(id, ASK, { status: "declined", date: null, note: "Rang us" }, JO);
    guests([
      { politicians: ["recDummy"], status: "Secured" },
      { politicians: ["recPlaceholder"], status: "Tentative yes" },
      { politicians: ["recPlaceholder"], status: "Tentative meeting with staff" },
      { politicians: ["recGone"], status: "Declined" },
      { politicians: ["recGone"], status: "Tentative yes" },
      { politicians: ["recMorag"], status: "Declined but surgery appointment" },
      { politicians: ["recMorag"], status: "Declined" },
    ]);
    expect(await importGoToParliament(JO)).toEqual({ guests: 7, mps: 4, added: 1, changed: 2, notFound: 0 });
    expect(await statuses()).toEqual([
      { name: "Gordon Gone", status: "declined", by: "airtable" },
      { name: "Morag Example", status: "declined_surgery", by: "airtable" },
      { name: "Ms Dora Dummy", status: "declined", by: JO },
      { name: "Polly Placeholder", status: "tentative", by: "airtable" },
    ]);
  });

  it("refuses a meeting status it doesn't know", async () => {
    guests([{ politicians: ["recDummy"], status: "Perhaps" }]);
    await expect(importGoToParliament(JO)).rejects.toThrow('Unknown MP Meeting Status "Perhaps"');
    expect(await listRuns("import-go-to-parliament")).toMatchObject([{ status: "failed" }]);
  });
});
