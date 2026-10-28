import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/fixtures/msw";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { type EmailSync, NIGHTLY } from "@/lib/import-runs";
import { query } from "./db";
import { syncEmails } from "./emails-sync";
import { listRuns } from "./import-runs";
import { syncPoliticians } from "./politician-sync";

const letters = () =>
  query(
    `SELECT n.name, coalesce(m.airtable_field, m.title) AS mailing, l.status, l.sent_at AS "sentAt", p.personalised
     FROM letters_from_pauseai p JOIN letters l USING (id) JOIN mailings m ON m.id = p.mailing_id
       JOIN notable_people n ON n.id = l.notable_person_id
     ORDER BY p.airtable_id`,
  );

beforeEach(() => vi.stubEnv("AIRTABLE_TOKEN", "token"));
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("syncEmails", () => {
  useTestDatabase();

  it("adds each email once, as a letter of its mailing, by its box or the dates it was sent in, holding back one with no mailing we know", async () => {
    await syncPoliticians(NIGHTLY);
    const requests: URL[] = [];
    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("tblp4nH5Jymq48rcm")) requests.push(new URL(request.url));
    });
    expect(await syncEmails(NIGHTLY)).toEqual({
      read: 7,
      added: 5,
      waiting: 0,
      noPolitician: 1,
      unplaced: [{ airtableId: "recEmailNewBox", mailings: [] }],
    });
    server.events.removeAllListeners();
    // It asks for the boxes of the mailings we have.
    expect(requests[0].searchParams.getAll("fields[]")).toEqual(
      expect.arrayContaining([
        "CSRB Iqbal Amendment",
        "Edinburgh Conference Nov 26 Invitation",
        "Ben Lake October 2026 Debate",
      ]),
    );
    expect(await letters()).toEqual([
      {
        name: "Ms Dora Dummy",
        mailing: "Ben Lake October 2026 Debate",
        status: "sent",
        sentAt: new Date("2026-10-15T08:30:00Z"),
        personalised: false,
      },
      {
        name: "Ms Dora Dummy",
        mailing: "CSRB Iqbal Amendment",
        status: "sent",
        sentAt: new Date("2026-06-10T09:00:00Z"),
        personalised: false,
      },
      // Summer 2025's, with no box of a mailing ticked, is the DeepMind letter's by when it was sent.
      {
        name: "Polly Placeholder",
        mailing: "DeepMind letter",
        status: "sent",
        sentAt: new Date("2025-07-09T11:00:00Z"),
        personalised: true,
      },
      {
        name: "Morag Example",
        mailing: "Edinburgh Conference Nov 26 Invitation",
        status: "sent",
        sentAt: new Date("2026-10-01T10:05:00Z"),
        personalised: false,
      },
      {
        name: "Polly Placeholder",
        mailing: "Edinburgh Conference Nov 26 Invitation",
        status: "sent",
        sentAt: new Date("2026-10-01T10:00:00Z"),
        personalised: true,
      },
    ]);
    expect(await query("SELECT actor, action, details FROM audit_log WHERE action = 'copy PauseAI emails'")).toEqual([
      { actor: "sync", action: "copy PauseAI emails", details: { added: 5 } },
    ]);

    // Again: nothing new, so nothing added or logged, and the run says so.
    expect(await syncEmails("jo@pauseai.uk")).toMatchObject({ added: 0, unplaced: [{ airtableId: "recEmailNewBox" }] });
    expect(await letters()).toHaveLength(5);
    const runs = (await listRuns("sync-emails")) as EmailSync[];
    expect(runs.map((run) => [run.status, run.startedBy])).toEqual([
      ["unchanged", "jo@pauseai.uk"],
      ["ok", NIGHTLY],
    ]);
  });

  it("leaves an email to a politician not here yet for a later run, and holds back one with two mailings", async () => {
    server.use(
      http.get("https://*.airtable.com/v0/appBInVvIm6opJ1Ob/tblp4nH5Jymq48rcm", () =>
        HttpResponse.json({
          records: [
            {
              id: "recE1",
              fields: {
                Timestamp: "2026-06-10T09:00:00.000Z",
                "UK Parliamentarian": ["recDummy"],
                "CSRB Iqbal Amendment": true,
              },
            },
            {
              id: "recE2",
              fields: {
                Timestamp: "2026-06-10T09:00:00.000Z",
                "UK Parliamentarian": ["recDummy", "recPlaceholder"],
                "CSRB Iqbal Amendment": true,
              },
            },
            {
              id: "recE3",
              fields: {
                Timestamp: "2026-06-10T09:00:00.000Z",
                "UK Parliamentarian": ["recDummy"],
                "CSRB Iqbal Amendment": true,
                "Ben Lake October 2026 Debate": true,
              },
            },
          ],
        }),
      ),
    );
    expect(await syncEmails(NIGHTLY)).toEqual({
      read: 3,
      added: 0,
      waiting: 1,
      noPolitician: 1,
      unplaced: [{ airtableId: "recE3", mailings: ["CSRB Iqbal Amendment", "Ben Lake October 2026 Debate"] }],
    });
    await syncPoliticians(NIGHTLY);
    expect(await syncEmails(NIGHTLY)).toMatchObject({ added: 1, waiting: 0 });
  });

  it("skips an email to a politician ticked Test in Airtable, as the politicians sync does", async () => {
    server.use(
      http.get("https://*.airtable.com/v0/appBInVvIm6opJ1Ob/tblH3ks9wqQHLpYx3", () =>
        HttpResponse.json({
          records: [
            { id: "recTest", fields: { Test: true } },
            { id: "recDummy", fields: {} },
          ],
        }),
      ),
      http.get("https://*.airtable.com/v0/appBInVvIm6opJ1Ob/tblp4nH5Jymq48rcm", () =>
        HttpResponse.json({
          records: [
            {
              id: "recE1",
              fields: {
                Timestamp: "2026-06-10T09:00:00.000Z",
                "UK Parliamentarian": ["recTest"],
                "CSRB Iqbal Amendment": true,
              },
            },
          ],
        }),
      ),
    );
    expect(await syncEmails(NIGHTLY)).toEqual({ read: 1, added: 0, waiting: 0, noPolitician: 0, unplaced: [] });
  });

  it("keeps a failure", async () => {
    vi.stubEnv("AIRTABLE_TOKEN", "");
    await expect(syncEmails(NIGHTLY)).rejects.toThrow("AIRTABLE_TOKEN isn't set");
    expect(await listRuns("sync-emails")).toMatchObject([{ status: "failed" }]);
  });
});
