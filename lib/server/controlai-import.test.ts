import { expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { addTestMp, addTestPolitician, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { BILL_CAMPAIGN, LETTER_PAGE } from "@/lib/controlai-letter";
import { importControlAiLetter, latestControlAiImport } from "./controlai-import";
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
    `SELECT p.name, s.updated_by AS "updatedBy" FROM campaign_statuses s JOIN politicians p ON p.id = s.politician_id
     WHERE s.campaign = $1 ORDER BY p.name`,
    [BILL_CAMPAIGN],
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
    await addTestPolitician({ airtableId: "rec4", name: "Baroness Nobody", sitting: false });
    await addTestMp();

    expect(await latestControlAiImport()).toBeUndefined();
    const result = await importControlAiLetter();

    expect(result).toEqual({
      ok: true,
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
    expect(await latestControlAiImport()).toMatchObject({ result });
    expect(await query("SELECT actor, action, details FROM audit_log")).toEqual([
      { actor: "controlai", action: "import ControlAI letter", details: { added: 4, removed: 0, problems: 2 } },
    ]);
  });

  it("makes the table match the letter: statuses it set go when the name does, others stay", async () => {
    const polly = await addTestPolitician();
    const gone = await addTestPolitician({ airtableId: "rec5", name: "Gone Signer", constituency: "Elsewhere" });
    const byHand = await addTestPolitician({ airtableId: "rec6", name: "Hand Set", constituency: "Somewhere" });
    await query(
      `INSERT INTO campaign_statuses (politician_id, campaign, status, updated_by) VALUES
       ($1, $4, 'signed', 'controlai'), ($2, $4, 'signed', 'controlai'), ($3, $4, 'signed', 'sync'),
       ($1, 'regulate-letter-pm', 'signed', 'jo@pauseai.uk')`,
      [polly, gone, byHand, BILL_CAMPAIGN],
    );

    const result = await importControlAiLetter();

    expect(result).toMatchObject({ ok: true, matched: 1, added: 0, removed: 1 });
    expect(await statuses()).toEqual([
      { name: "Hand Set", updatedBy: "sync" },
      { name: "Polly Placeholder", updatedBy: "controlai" },
    ]);
    expect(
      await query("SELECT count(*)::int AS n FROM campaign_statuses WHERE campaign = 'regulate-letter-pm'"),
    ).toEqual([{ n: 1 }]);
    // Nothing changed, so nothing to log.
    expect(await importControlAiLetter()).toMatchObject({ added: 0, removed: 0 });
    expect(await query("SELECT count(*)::int AS n FROM audit_log")).toEqual([{ n: 1 }]);
  });

  it("keeps the failure and changes nothing when the page has no PDF, or too few names", async () => {
    await addTestPolitician();
    server.use(http.get(LETTER_PAGE, () => HttpResponse.text("<p>Moved</p>")));
    await expect(importControlAiLetter()).rejects.toThrow("No PDF linked");
    expect((await latestControlAiImport())!.result).toEqual({ ok: false, error: `No PDF linked from ${LETTER_PAGE}` });

    server.resetHandlers();
    server.use(http.get(PDF, () => HttpResponse.text("not a pdf")));
    await expect(importControlAiLetter()).rejects.toThrow();

    // A letter with one name has changed shape, or the parse has broken.
    server.resetHandlers();
    server.use(http.get(PDF, async () => HttpResponse.arrayBuffer(await pdfOf("Yours sincerely", "Only One MP"))));
    await expect(importControlAiLetter()).rejects.toThrow("Only 1 signatories found");

    server.resetHandlers();
    server.use(http.get(LETTER_PAGE, () => new HttpResponse(null, { status: 500 })));
    await expect(importControlAiLetter()).rejects.toThrow(`${LETTER_PAGE} returned 500`);
    expect(await statuses()).toEqual([]);
    expect(await query("SELECT count(*)::int AS n FROM controlai_imports WHERE result->>'ok' = 'false'")).toEqual([
      { n: 4 },
    ]);
  });

  it("shows the newest run", async () => {
    await query(
      `INSERT INTO controlai_imports (at, result) VALUES (now() - interval '1 day', '{"ok":false,"error":"old"}'), (now(), '{"ok":false,"error":"new"}')`,
    );
    expect((await latestControlAiImport())!.result).toEqual({ ok: false, error: "new" });
  });
});
