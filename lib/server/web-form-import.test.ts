import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { addTestLetter, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { NIGHTLY } from "@/lib/import-runs";
import { query } from "./db";
import { listRuns } from "./import-runs";
import { syncPoliticians } from "./politician-sync";
import { importWebFormLetters } from "./web-form-import";

const JO = "jo@pauseai.uk";

const imported = () =>
  query(
    `SELECT s.airtable_id AS "airtableId", n.name AS "to", s.campaign, s.sender_name AS "senderName",
       s.sender_email AS "senderEmail", s.sender_address AS address, s.sender_postcode AS postcode,
       s.contact_consent AS consent, s.reply_hash AS "replyHash", l.status, l.created_at AS "createdAt", l.sent_at AS "sentAt"
     FROM supporter_letters s JOIN letters l USING (id) JOIN notable_people n ON n.id = l.notable_person_id
     WHERE s.airtable_id IS NOT NULL ORDER BY l.sent_at`,
  );

beforeEach(() => vi.stubEnv("AIRTABLE_TOKEN", "token"));
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("importWebFormLetters", () => {
  useTestDatabase();

  it("imports each letter that was sent, once, as a supporter's, and its sender as a supporter", async () => {
    await syncPoliticians(NIGHTLY);
    const result = await importWebFormLetters(JO);
    expect(result).toEqual({
      read: 9,
      imported: 3,
      // Spam, invalid, and never sent (whose Campaign nobody knows, which doesn't matter as it wasn't sent).
      skipped: 3,
      // Wendy's second letter to Polly for the same ask.
      alreadyHere: 1,
      // To a politician not here, and to none.
      noPolitician: 2,
      supportersAdded: 2,
      linked: 3,
    });
    expect(await imported()).toEqual([
      {
        airtableId: "recWebDee",
        to: "Lord Seedling of Example",
        campaign: "pauseai-info-deepmind",
        senderName: "Dee Deepmind",
        senderEmail: "dee.deepmind@example.com",
        address: "",
        postcode: "M1 1AE",
        consent: false,
        replyHash: null,
        status: "sent",
        // Airtable has no time the form was sent, so it's when the letter was.
        createdAt: new Date("2025-07-20T09:00:30Z"),
        sentAt: new Date("2025-07-20T09:00:30Z"),
      },
      expect.objectContaining({
        airtableId: "recWebWendyLiability",
        campaign: "pauseai-info-liability",
        consent: false,
      }),
      expect.objectContaining({
        airtableId: "recWebWendyFrontier",
        campaign: "pauseai-info-frontier-ai",
        consent: true,
      }),
    ]);
    // One supporter for Wendy, however she wrote her address.
    expect(await query("SELECT count(*)::int AS n FROM supporters")).toEqual([{ n: 2 }]);
    expect(await query("SELECT actor, details FROM audit_log WHERE action = 'import web form letters'")).toEqual([
      { actor: JO, details: { imported: 3, skipped: 3, alreadyHere: 1, noPolitician: 2 } },
    ]);

    // Again: nothing twice.
    expect(await importWebFormLetters(JO)).toMatchObject({ imported: 0, alreadyHere: 4 });
    expect(await listRuns("import-web-form-letters")).toMatchObject([{ status: "ok" }, { status: "ok" }]);
  });

  it("skips a letter already here from the same sender to the same politician for the same ask, whichever campaign", async () => {
    await syncPoliticians(NIGHTLY);
    const [{ id }] = await query<{ id: number }>(
      "SELECT id::int AS id FROM notable_people WHERE airtable_id = 'recPlaceholder'",
    );
    // Through the site, for the letter to the PM, which the old form's frontier AI letter also asks.
    await addTestLetter({
      politicianId: id,
      senderEmail: " WENDY.webform@example.com",
      campaign: "regulate-letter-pm",
    });
    expect(await importWebFormLetters(JO)).toMatchObject({ imported: 2, alreadyHere: 2 });
  });

  it("refuses a sent letter whose Campaign it doesn't know, importing nothing", async () => {
    server.use(
      http.get("https://*.airtable.com/v0/appBInVvIm6opJ1Ob/tblkzjrRHiZiqMDGR", () =>
        HttpResponse.json({
          records: [
            { id: "recW", fields: { Campaign: "Mystery letter", "Email Sent Time": "2026-01-01T00:00:00.000Z" } },
          ],
        }),
      ),
    );
    await expect(importWebFormLetters(JO)).rejects.toThrow('Unknown Campaign "Mystery letter" on recW');
    expect(await listRuns("import-web-form-letters")).toMatchObject([{ status: "failed" }]);
  });
});
