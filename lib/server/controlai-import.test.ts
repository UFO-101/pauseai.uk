import { expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { CONTROLAI_LETTER_ASK } from "@/lib/asks";
import { CONTROLAI_LETTER_PAGE } from "@/lib/controlai-letter";
import { NIGHTLY } from "@/lib/import-runs";
import { importControlAiLetter } from "./controlai-import";
import { listRuns } from "./import-runs";

const recentControlAiImports = () => listRuns("import-controlai");
import { query } from "./db";

const PDF = "https://images.controlai.com/final%20letter.pdf";

/** A one-page PDF with these lines, as the fixture letter is made. */
async function pdfOf(...lines: string[]): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  lines.forEach((line, n) => page.drawText(line, { x: 50, y: 800 - n * 16, size: 11, font }));
  const bytes = await doc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

const statuses = () =>
  query<{ name: string; updatedBy: string }>(
    `SELECT p.name, s.updated_by AS "updatedBy" FROM ask_statuses s JOIN notable_people p ON p.id = s.notable_person_id
     WHERE s.ask = $1 ORDER BY p.name`,
    [CONTROLAI_LETTER_ASK],
  );

describeWithDatabase("importControlAiLetter", () => {
  useTestDatabase();

  it("sets the bill's status for each signatory in our table, and reports the names it can't place", async () => {
    // The fixture letter is signed by Polly Placeholder MP, Dora Dummy MP, Lord
    // Example of Somewhere and Baroness Nobody, then Sam Smyth MP and Lord Sample.
    await addTestPolitician();
    await addTestPolitician({ airtableId: "rec2", name: "Ms Dora Dummy", constituency: "Hackney North" });
    await addTestPolitician({ airtableId: null, house: "lords", name: "Lord Example", constituency: null });
    await addTestPolitician({ airtableId: "rec3", name: "Sam Smith", constituency: "Bath" });
    // Two Lord Samples: only a person can say which signed.
    await addTestPolitician({ airtableId: null, house: "lords", name: "Lord Sample", constituency: null });
    await addTestPolitician({ airtableId: null, house: "lords", name: "Lord Sample", constituency: null });
    // Gone from the Commons, so not matched.
    await addTestPolitician({ airtableId: "rec4", name: "Baroness Nobody", status: "left_office" });
    await addTestMp();

    expect(await recentControlAiImports()).toEqual([]);
    const result = await importControlAiLetter("jo@pauseai.uk");

    expect(result).toEqual({
      pdfUrl: PDF,
      signatories: 6,
      matched: 4,
      added: 4,
      removed: 0,
      problems: [
        { name: "Baroness Nobody", kind: "nobody", candidates: [] },
        { name: "Lord Sample", kind: "several", candidates: ["Lord Sample", "Lord Sample"] },
      ],
    });
    expect(await statuses()).toEqual([
      { name: "Lord Example", updatedBy: "controlai" },
      { name: "Ms Dora Dummy", updatedBy: "controlai" },
      { name: "Polly Placeholder", updatedBy: "controlai" },
      { name: "Sam Smith", updatedBy: "controlai" },
    ]);
    expect(await recentControlAiImports()).toMatchObject([{ status: "ok", startedBy: "jo@pauseai.uk", result }]);
    // The run's summary, then a status entry per politician, as setting one by hand logs it.
    expect(await query("SELECT actor, action, details FROM audit_log ORDER BY id LIMIT 1")).toEqual([
      { actor: "controlai", action: "import ControlAI letter", details: { added: 4, removed: 0, problems: 2 } },
    ]);
    expect(
      await query(
        `SELECT p.name, a.details->>'status' AS status, a.details->>'date' AS date
         FROM audit_log a JOIN notable_people p ON p.id = (a.details->>'politicianId')::bigint
         WHERE a.action = 'set status' AND a.actor = 'controlai' ORDER BY p.name`,
      ),
    ).toEqual([
      // Those who signed before the letter was delivered on its day; Sam Smith, who signed later, today.
      { name: "Lord Example", status: "signed", date: "2026-09-11" },
      { name: "Ms Dora Dummy", status: "signed", date: "2026-09-11" },
      { name: "Polly Placeholder", status: "signed", date: "2026-09-11" },
      { name: "Sam Smith", status: "signed", date: (await query<{ d: string }>("SELECT now()::date::text AS d"))[0].d },
    ]);
    expect(
      await query("SELECT DISTINCT status_date::text AS date FROM ask_statuses WHERE ask = $1 ORDER BY 1", [
        CONTROLAI_LETTER_ASK,
      ]),
    ).toHaveLength(2);
  });

  it("makes the table match the letter: statuses it set go when the name does, others stay", async () => {
    const polly = await addTestPolitician();
    const gone = await addTestPolitician({ airtableId: "rec5", name: "Gone Signer", constituency: "Elsewhere" });
    const byHand = await addTestPolitician({ airtableId: "rec6", name: "Hand Set", constituency: "Somewhere" });
    await query(
      `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by) VALUES
       ($1, $4, 'letter', 'signed', 'controlai'), ($2, $4, 'letter', 'signed', 'controlai'), ($3, $4, 'letter', 'signed', 'sync'),
       ($1, 'frontier-ai-letter', 'letter', 'signed', 'jo@pauseai.uk')`,
      [polly, gone, byHand, CONTROLAI_LETTER_ASK],
    );

    const result = await importControlAiLetter(NIGHTLY);

    expect(result).toMatchObject({ matched: 1, added: 0, removed: 1 });
    expect(await statuses()).toEqual([
      { name: "Hand Set", updatedBy: "sync" },
      { name: "Polly Placeholder", updatedBy: "controlai" },
    ]);
    expect(await query("SELECT count(*)::int AS n FROM ask_statuses WHERE ask = 'frontier-ai-letter'")).toEqual([
      { n: 1 },
    ]);
    // Nothing changed, so nothing to log.
    expect(await importControlAiLetter(NIGHTLY)).toMatchObject({ added: 0, removed: 0 });
    expect(await query("SELECT count(*)::int AS n FROM audit_log WHERE action = 'import ControlAI letter'")).toEqual([
      { n: 1 },
    ]);
  });

  it("keeps the failure and changes nothing when the page has no PDF, or too few names", async () => {
    await addTestPolitician();
    server.use(http.get(CONTROLAI_LETTER_PAGE, () => HttpResponse.text("<p>Moved</p>")));
    await expect(importControlAiLetter(NIGHTLY)).rejects.toThrow("No PDF linked");
    expect(await recentControlAiImports()).toMatchObject([
      { status: "failed", startedBy: NIGHTLY, error: `No PDF linked from ${CONTROLAI_LETTER_PAGE}`, result: {} },
    ]);

    server.resetHandlers();
    server.use(http.get(PDF, () => HttpResponse.text("not a pdf")));
    await expect(importControlAiLetter(NIGHTLY)).rejects.toThrow();

    // A letter with one name has changed shape, or the parse has broken.
    server.resetHandlers();
    server.use(http.get(PDF, async () => HttpResponse.arrayBuffer(await pdfOf("Yours sincerely", "Only One MP"))));
    await expect(importControlAiLetter(NIGHTLY)).rejects.toThrow("Only 1 signatories found");

    server.resetHandlers();
    server.use(http.get(CONTROLAI_LETTER_PAGE, () => new HttpResponse(null, { status: 500 })));
    await expect(importControlAiLetter(NIGHTLY)).rejects.toThrow(`${CONTROLAI_LETTER_PAGE} returned 500`);
    expect(await statuses()).toEqual([]);
    expect((await recentControlAiImports()).map((run) => run.status)).toEqual(["failed", "failed", "failed", "failed"]);
  });

  it("lists the newest runs first", async () => {
    await query(
      `INSERT INTO import_runs (at, job, status, error) VALUES
       (now() - interval '1 day', 'import-controlai', 'failed', 'old'), (now(), 'import-controlai', 'failed', 'new')`,
    );
    expect((await recentControlAiImports()).map((run) => run.error)).toEqual(["new", "old"]);
  });
});
