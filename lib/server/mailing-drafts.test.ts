import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addTestPolitician, connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { server } from "@/tests/fixtures/msw";
import { http, HttpResponse } from "msw";
import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingDoc } from "@/lib/mailing-doc";
import { query } from "./db";
import type { MailingChannel } from "./mailing-channels";
import {
  addAttachment,
  createDraft,
  deleteDraft,
  deleteForgottenDrafts,
  emailFor,
  getWrittenMailing,
  mailingChangesFrom,
  openWrittenMailing,
  removeAttachment,
  rescheduleMailing,
  saveDraft,
  scheduleMailing,
  sendTestCopy,
  stopMailing,
} from "./mailing-drafts";
import { politicianAudience } from "./mailing-recipients";

const STAFF = "jo@pauseai.uk";
const POLITICIANS = { list: "politicians" as const, params: {} };
const LETTER: MailingDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Dear " },
        { type: "field", attrs: { field: "salutation" } },
      ],
    },
    {
      type: "onlyFor",
      attrs: { condition: "frontier-ai-letter:signed" },
      content: [{ type: "paragraph", content: [{ type: "text", text: "Thanks for signing." }] }],
    },
  ],
};
/** A channel that sends mailings, as Gmail will. */
const SENDS: MailingChannel = {
  sendsMailings: true,
  send: async () => ({ sent: true, id: "x" }),
  remainingToday: async () => null,
  cost: () => 0,
  report: () => undefined,
};
const TOMORROW = "2026-11-02T10:00:00Z";

describeWithDatabase("mailing drafts", () => {
  useTestDatabase();
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-11-01T09:00:00Z"), toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  /** A draft ready to schedule, to everyone, from Jo's connected Gmail, and its version. */
  async function readyDraft() {
    await connectTestGmail(STAFF);
    const { id } = await createDraft(STAFF, POLITICIANS, { subject: "Hello", body: LETTER });
    const saved = await saveDraft(id, 1, { sentFrom: STAFF, fromName: "Jo Staff", dueAt: TOMORROW });
    return { id, version: (saved as { version: number }).version };
  }

  it("makes a draft at the first change, saves each change after, and tells a second editor", async () => {
    const { id, version } = await createDraft(
      STAFF,
      { list: "politicians", params: { house: "lords" } },
      { subject: "Hi" },
    );
    expect(version).toBe(1);
    expect(await getWrittenMailing(id)).toEqual({
      id,
      filter: { list: "politicians", params: { house: "lords" } },
      subject: "Hi",
      body: { type: "doc", content: [] },
      ask: null,
      createdBy: STAFF,
      sentFrom: null,
      fromName: null,
      dueAt: null,
      state: "draft",
      version: 1,
      attachments: [],
    });
    // The list of mailings calls it by its subject.
    expect(await query("SELECT title FROM mailings WHERE id = $1", [id])).toEqual([{ title: "Hi" }]);

    expect(await saveDraft(id, 1, { body: LETTER, ask: "frontier-ai-letter", filter: POLITICIANS })).toEqual({
      saved: true,
      version: 2,
    });
    // Someone who opened it at version 1 is told.
    expect(await saveDraft(id, 1, { subject: "Mine" })).toEqual({ saved: false, reason: "conflict" });
    expect(await getWrittenMailing(id)).toMatchObject({
      subject: "Hi",
      body: LETTER,
      ask: "frontier-ai-letter",
      filter: POLITICIANS,
    });
    expect(await saveDraft(999, 1, { subject: "x" })).toEqual({ saved: false, reason: "gone" });
    expect(await query("SELECT actor, action FROM audit_log")).toEqual([{ actor: STAFF, action: "create mailing" }]);
  });

  it("finds no written mailing for an imported one, or none", async () => {
    const [{ id }] = await query<{ id: number }>("SELECT id::int AS id FROM mailings LIMIT 1");
    expect(await getWrittenMailing(id)).toBeUndefined();
    expect(await openWrittenMailing(999)).toBeUndefined();
  });

  it("attaches files and takes them off, each a save", async () => {
    const { id } = await createDraft(STAFF, POLITICIANS, {});
    const file = { filename: "brief.pdf", contentType: "application/pdf", content: Buffer.from("%PDF") };
    expect(await addAttachment(id, 1, file)).toEqual({ saved: true, version: 2 });
    expect(await addAttachment(id, 1, file)).toEqual({ saved: false, reason: "conflict" });
    const { attachments } = (await getWrittenMailing(id))!;
    expect(attachments).toEqual([
      { id: expect.any(Number), filename: "brief.pdf", contentType: "application/pdf", size: 4 },
    ]);
    expect(await removeAttachment(id, 1, attachments[0].id)).toEqual({ saved: false, reason: "conflict" });
    expect(await removeAttachment(id, 2, attachments[0].id)).toEqual({ saved: true, version: 3 });
    expect((await getWrittenMailing(id))!.attachments).toEqual([]);
  });

  it("deletes a draft, but not one scheduled", async () => {
    await addTestPolitician();
    const { id } = await createDraft(STAFF, POLITICIANS, {});
    expect(await deleteDraft(id, STAFF)).toBe(true);
    expect(await getWrittenMailing(id)).toBeUndefined();
    expect(await deleteDraft(id, STAFF)).toBe(false);
    const ready = await readyDraft();
    await scheduleMailing(ready.id, ready.version, STAFF, SENDS);
    expect(await deleteDraft(ready.id, STAFF)).toBe(false);
    expect(await saveDraft(ready.id, ready.version + 1, { subject: "x" })).toEqual({
      saved: false,
      reason: "not-draft",
    });
  });

  it("tidies away drafts with nothing in them that nobody has opened for a day", async () => {
    vi.useRealTimers();
    const blank = (await createDraft(STAFF, POLITICIANS, {})).id;
    const written = (await createDraft(STAFF, POLITICIANS, { body: LETTER })).id;
    const titled = (await createDraft(STAFF, POLITICIANS, { subject: "Hi" })).id;
    const attached = (await createDraft(STAFF, POLITICIANS, {})).id;
    await addAttachment(attached, 1, { filename: "a.pdf", contentType: "application/pdf", content: Buffer.from("x") });
    const opened = (await createDraft(STAFF, POLITICIANS, {})).id;
    await query("UPDATE mailings SET opened_at = now() - interval '25 hours' WHERE body IS NOT NULL");
    await openWrittenMailing(opened);
    expect(await deleteForgottenDrafts()).toBe(1);
    const left = await query<{ id: number }>("SELECT id::int AS id FROM mailings WHERE body IS NOT NULL ORDER BY id");
    expect(left.map((row) => row.id)).toEqual([written, titled, attached, opened]);
    expect(blank).toBeLessThan(written);
  });

  it("schedules a draft, fixing its recipients with their values, and won't while anything stops it", async () => {
    const polly = await addTestPolitician({ name: "Polly Placeholder", airtableId: "rec1" });
    await addTestPolitician({ name: "Ned Noaddress", airtableId: "rec2", email: null });
    await query(
      `INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, updated_by) VALUES ($1, 'frontier-ai-letter', 'letter', 'signed', 'staff')`,
      [polly],
    );
    const { id, version } = await readyDraft();
    // Nothing can be scheduled by a channel that doesn't send, nor from a Gmail not connected.
    expect(await scheduleMailing(id, version, STAFF, { ...SENDS, sendsMailings: false })).toEqual({
      scheduled: false,
      problems: ["cannot-send"],
    });
    await query("UPDATE staff_accounts SET gmail_token = NULL, gmail_connected_at = NULL, gmail_history_id = NULL");
    expect(await scheduleMailing(id, version, STAFF)).toEqual({ scheduled: false, problems: ["not-connected"] });
    await connectTestGmail(STAFF);
    expect(await scheduleMailing(id, version - 1, STAFF, SENDS)).toEqual({ scheduled: false, reason: "conflict" });
    expect(await scheduleMailing(999, 1, STAFF, SENDS)).toEqual({ scheduled: false, reason: "gone" });

    expect(await scheduleMailing(id, version, STAFF, SENDS)).toEqual({ scheduled: true });
    expect(await scheduleMailing(id, version + 1, STAFF, SENDS)).toEqual({ scheduled: false, reason: "not-draft" });
    expect(await getWrittenMailing(id)).toMatchObject({ state: "scheduled", version: version + 1 });
    expect(
      await query(
        `SELECT l.notable_person_id::int AS politician, l.status, p.merge_values AS values
         FROM letters_from_pauseai p JOIN letters l USING (id) WHERE p.mailing_id = $1`,
        [id],
      ),
    ).toEqual([
      {
        politician: polly,
        status: "scheduled",
        values: {
          values: {
            salutation: "Ms Placeholder",
            name: "Polly Placeholder",
            constituency: "Cities of London and Westminster",
            party: "Labour (Co-op)",
            house: "House of Commons",
          },
          meets: ["frontier-ai-letter:signed"],
        },
      },
    ]);
    expect(await query("SELECT action, details FROM audit_log WHERE action = 'schedule mailing'")).toEqual([
      { action: "schedule mailing", details: { id, recipients: 1 } },
    ]);
  });

  it("changes when a scheduled mailing goes, but not to a time gone by, nor for a draft", async () => {
    await addTestPolitician();
    const { id, version } = await readyDraft();
    expect(await rescheduleMailing(id, "2026-11-05T10:00:00Z", STAFF)).toBe(false);
    await scheduleMailing(id, version, STAFF, SENDS);
    expect(await rescheduleMailing(id, "2026-10-01T10:00:00Z", STAFF)).toBe(false);
    expect(await rescheduleMailing(id, "2026-11-05T10:00:00Z", STAFF)).toBe(true);
    expect((await getWrittenMailing(id))!.dueAt).toEqual(new Date("2026-11-05T10:00:00Z"));
  });

  it("stops a scheduled mailing, a draft again with no recipients, and one sending, which sends no more", async () => {
    await addTestPolitician({ airtableId: "rec1" });
    await addTestPolitician({ name: "Dora Dummy", airtableId: "rec2" });
    const { id, version } = await readyDraft();
    expect(await stopMailing(id, STAFF)).toBe(false);
    await scheduleMailing(id, version, STAFF, SENDS);
    expect(await stopMailing(id, STAFF)).toBe(true);
    expect(await getWrittenMailing(id)).toMatchObject({ state: "draft", version: version + 2 });
    expect(await query("SELECT 1 FROM letters")).toEqual([]);

    await scheduleMailing(id, version + 2, STAFF, SENDS);
    // One sent, then it's stopped.
    await query("UPDATE mailings SET state = 'sending' WHERE id = $1", [id]);
    await query("UPDATE letters SET status = 'sent', sent_at = now() WHERE id = (SELECT min(id) FROM letters)");
    expect(await stopMailing(id, STAFF)).toBe(true);
    expect(await query("SELECT status FROM letters ORDER BY id")).toEqual([
      { status: "sent" },
      { status: "cancelled" },
    ]);
    expect((await getWrittenMailing(id))!.state).toBe("cancelled");
    expect(await stopMailing(999, STAFF)).toBe(false);
  });

  it("writes one recipient's email, and sends a test copy of it to a staff member with its files", async () => {
    await addTestPolitician();
    const { id } = await readyDraft();
    await addAttachment(id, 2, { filename: "brief.pdf", contentType: "application/pdf", content: Buffer.from("%PDF") });
    const mailing = (await getWrittenMailing(id))!;
    const [polly] = (await politicianAudience(POLITICIANS)).recipients;
    expect(emailFor(mailing, polly)).toEqual({
      subject: "Hello",
      html: "<p>Dear Ms Placeholder</p>",
      text: "Dear Ms Placeholder",
    });

    vi.stubEnv("POSTMARK_SERVER_TOKEN", "server-token");
    let sent: Record<string, unknown> = {};
    server.use(
      http.post("https://api.postmarkapp.com/email", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ MessageID: "test-copy", ErrorCode: 0 });
      }),
    );
    // Without the Gmail it's sent from, by Postmark, from the notification domain.
    await query("UPDATE staff_accounts SET gmail_token = NULL, gmail_connected_at = NULL, gmail_history_id = NULL");
    expect(await sendTestCopy(mailing, polly, STAFF)).toMatchObject({ sent: true, id: "test-copy" });
    expect(sent).toMatchObject({
      From: `"${staffCopy.mailingPages.testFromName}" <noreply@notify.pauseai.uk>`,
      ReplyTo: `"${staffCopy.mailingPages.testFromName}" <${STAFF}>`,
      To: `"Polly Placeholder" <${STAFF}>`,
      Subject: "Hello",
      Attachments: [
        { Name: "brief.pdf", Content: Buffer.from("%PDF").toString("base64"), ContentType: "application/pdf" },
      ],
      Tag: "mailing-test",
    });
    expect(await query("SELECT purpose, address FROM email_sends")).toEqual([
      { purpose: "mailing-test", address: STAFF },
    ]);
  });

  it("sends the test copy by the Gmail it's sent from, in its sender's name, when that's connected", async () => {
    await addTestPolitician();
    const { id } = await readyDraft();
    const [polly] = (await politicianAudience(POLITICIANS)).recipients;
    let raw = "";
    server.use(
      http.post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", async ({ request }) => {
        raw = Buffer.from(((await request.json()) as { raw: string }).raw, "base64url").toString();
        return HttpResponse.json({ id: "g1", threadId: "t1" });
      }),
    );
    expect(await sendTestCopy((await getWrittenMailing(id))!, polly, "al@pauseai.uk")).toMatchObject({
      sent: true,
      id: "g1",
    });
    expect(raw).toContain('From: "Jo Staff" <jo@pauseai.uk>');
    expect(raw).toContain('To: "Polly Placeholder" <al@pauseai.uk>');
    await saveDraft(id, (await getWrittenMailing(id))!.version, { fromName: null });
    await sendTestCopy((await getWrittenMailing(id))!, polly, "al@pauseai.uk");
    // With no From name, as the mailing will go: in the name the Gmail sends as, or with none known, the address alone.
    expect(raw).toMatch(/^From: jo@pauseai\.uk\r?$/m);
    await query("UPDATE staff_accounts SET gmail_name = 'Jo Gmail' WHERE email = 'jo@pauseai.uk'");
    await sendTestCopy((await getWrittenMailing(id))!, polly, "al@pauseai.uk");
    expect(raw).toContain('From: "Jo Gmail" <jo@pauseai.uk>');
  });

  it("won't schedule a letter with a field a recipient has no value for", async () => {
    await addTestPolitician({ salutation: "" });
    const { id, version } = await readyDraft();
    expect(await scheduleMailing(id, version, STAFF, SENDS)).toEqual({ scheduled: false, problems: ["field-lacking"] });
  });

  it("won't attach a file too big to send", async () => {
    const { id } = await createDraft(STAFF, POLITICIANS, {});
    const big = Buffer.alloc(4 * 1024 * 1024 + 1);
    expect(await addAttachment(id, 1, { filename: "big.pdf", contentType: "application/pdf", content: big })).toEqual({
      saved: false,
      reason: "too-big",
    });
  });
});

describe("mailingChangesFrom", () => {
  it("takes each change the editor makes, a sender's address lowercased and blanks as none", () => {
    expect(
      mailingChangesFrom({
        subject: "Hi",
        body: LETTER,
        ask: "",
        sentFrom: "Jo@PauseAI.uk",
        fromName: "Jo",
        dueAt: "2026-11-02T10:00:00Z",
      }),
    ).toEqual({
      subject: "Hi",
      body: LETTER,
      ask: null,
      sentFrom: STAFF,
      fromName: "Jo",
      dueAt: "2026-11-02T10:00:00Z",
    });
    expect(mailingChangesFrom({ sentFrom: null, fromName: null, dueAt: null, ask: "frontier-ai-letter" })).toEqual({
      sentFrom: null,
      fromName: null,
      dueAt: null,
      ask: "frontier-ai-letter",
    });
  });

  it.each([
    ["nothing", null],
    ["a list", "hi"],
    ["a subject that isn't text", { subject: 1 }],
    ["a letter that isn't one", { body: { type: "doc", content: [{ type: "image" }] } }],
    ["an ask that isn't text", { ask: 1 }],
    ["a sender that isn't text", { sentFrom: 1 }],
    ["a time that isn't one", { dueAt: "soon" }],
    ["a time that isn't text", { dueAt: 5 }],
    ["the filter", { filter: {} }],
  ])("refuses %s", (_, value) => {
    expect(mailingChangesFrom(value)).toBeUndefined();
  });
});
