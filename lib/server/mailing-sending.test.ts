import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { addTestPolitician, connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import type { MailingDoc } from "@/lib/mailing-doc";
import { query } from "./db";
import { recordProblem } from "./email";
import type { ChannelMessage, MailingChannel } from "./mailing-channels";
import { createDraft, saveDraft, scheduleMailing } from "./mailing-drafts";
import { sendDueLetters, startDueMailings } from "./mailing-sending";

const JO = "jo@pauseai.uk";
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
  ],
};

/** A channel that records what it sends, and answers with `answer` for each. */
function recording(answer: (message: ChannelMessage) => Awaited<ReturnType<MailingChannel["send"]>>, remaining = 100) {
  const sent: ChannelMessage[] = [];
  const channel: MailingChannel = {
    sendsMailings: true,
    send: async (message) => {
      sent.push(message);
      return answer(message);
    },
    remainingToday: async () => remaining - sent.length,
    cost: () => 0,
    report: () => undefined,
  };
  return { sent, channel };
}

const SENT = () => ({ sent: true as const, id: "g", messageId: "m@pauseai.uk", threadId: "t" });

describeWithDatabase("sending mailings", () => {
  useTestDatabase();
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-11-01T09:00:00Z"), toFake: ["Date"] }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  /** A mailing from Jo's Gmail to everyone in office, scheduled for `due`. Returns its ID. */
  async function scheduled(due = "2026-11-01T10:00:00Z", subject = "AI"): Promise<number> {
    await connectTestGmail(JO);
    const { id } = await createDraft(JO, { list: "politicians", params: {} }, { subject, body: LETTER });
    const saved = await saveDraft(id, 1, { sentFrom: JO, fromName: "Jo Staff", dueAt: due });
    expect(await scheduleMailing(id, (saved as { version: number }).version, JO)).toEqual({ scheduled: true });
    return id;
  }

  const letters = () =>
    query(
      `SELECT n.name, l.status, p.skip_reason AS "skipReason", l.sent_at IS NOT NULL AS "sentAt"
       FROM letters l JOIN letters_from_pauseai p USING (id) JOIN notable_people n ON n.id = l.notable_person_id ORDER BY n.name`,
    );
  const state = async (id: number) =>
    (await query<{ state: string }>("SELECT state FROM mailings WHERE id = $1", [id]))[0].state;

  it("starts the mailings that are due, and only those", async () => {
    await addTestPolitician();
    const due = await scheduled("2026-11-01T10:00:00Z");
    const later = await scheduled("2026-11-01T12:00:00Z");
    expect(await startDueMailings()).toEqual([]);
    vi.setSystemTime(new Date("2026-11-01T10:05:00Z"));
    expect(await startDueMailings()).toEqual([due]);
    expect([await state(due), await state(later)]).toEqual(["sending", "scheduled"]);
    expect(await query("SELECT actor, action, details FROM audit_log WHERE action = 'start mailing'")).toEqual([
      { actor: "send-mailings", action: "start mailing", details: { id: due } },
    ]);
  });

  it("sends each letter from the sender's Gmail in their name, filled in for each, then marks the mailing sent", async () => {
    await addTestPolitician({
      airtableId: null,
      name: "Polly Placeholder",
      salutation: "Ms Placeholder",
      email: "polly@example.org",
    });
    await addTestPolitician({
      airtableId: null,
      name: "Dora Dummy",
      salutation: "Lady Dummy",
      email: "dora@example.org",
    });
    const id = await scheduled();
    await query(
      "INSERT INTO mailing_attachments (mailing_id, filename, content_type, content) VALUES ($1, 'a.pdf', 'application/pdf', 'PDF')",
      [id],
    );
    vi.setSystemTime(new Date("2026-11-01T10:00:00Z"));
    await startDueMailings();
    const { sent, channel } = recording(SENT);
    expect(await sendDueLetters({ until: Infinity, gap: 0, channel })).toEqual({
      sent: 2,
      skipped: 0,
      failed: 0,
      left: 0,
      waiting: [],
    });
    expect(sent.map((m) => [m.from, m.to.address, m.text])).toEqual([
      [{ name: "Jo Staff", address: JO }, "dora@example.org", "Dear Lady Dummy"],
      [{ name: "Jo Staff", address: JO }, "polly@example.org", "Dear Ms Placeholder"],
    ]);
    expect(sent[0].attachments).toEqual([{ Name: "a.pdf", ContentType: "application/pdf", Content: "UERG" }]);
    expect(await letters()).toEqual([
      { name: "Dora Dummy", status: "sent", skipReason: null, sentAt: true },
      { name: "Polly Placeholder", status: "sent", skipReason: null, sentAt: true },
    ]);
    expect(await query("SELECT status, details FROM letter_events ORDER BY id LIMIT 1")).toEqual([
      { status: "sent", details: { from: JO, messageId: "m@pauseai.uk", threadId: "t" } },
    ]);
    expect(await state(id)).toBe("sent");
  });

  it("sends in the name the Gmail sends as when the mailing gives none", async () => {
    await addTestPolitician({ airtableId: null, name: "Polly Placeholder", email: "polly@example.org" });
    await connectTestGmail(JO);
    await query("UPDATE staff_accounts SET gmail_name = 'Jo Gmail' WHERE email = $1", [JO]);
    const { id } = await createDraft(JO, { list: "politicians", params: {} }, { subject: "AI", body: LETTER });
    const saved = await saveDraft(id, 1, { sentFrom: JO, fromName: "", dueAt: "2026-11-01T10:00:00Z" });
    await scheduleMailing(id, (saved as { version: number }).version, JO);
    vi.setSystemTime(new Date("2026-11-01T10:00:00Z"));
    await startDueMailings();
    const { sent, channel } = recording(SENT);
    await sendDueLetters({ until: Infinity, gap: 0, channel });
    expect(sent.map((m) => m.from)).toEqual([{ name: "Jo Gmail", address: JO }]);
  });

  it("skips anyone who has left office or whose address is blocked since, and marks a failure", async () => {
    await addTestPolitician({ airtableId: null, name: "Ann Away", email: "ann@example.org" });
    await addTestPolitician({ airtableId: null, name: "Bob Bounced", email: "bob@example.org" });
    await addTestPolitician({ airtableId: null, name: "Cat Fails", email: "cat@example.org" });
    await addTestPolitician({ airtableId: null, name: "Dan Refused", email: "dan@example.org" });
    await addTestPolitician({ airtableId: null, name: "Eve Emptied", email: "eve@example.org" });
    await scheduled();
    await query("UPDATE notable_people SET status = 'retired' WHERE name = 'Ann Away'");
    await query("UPDATE notable_people SET email = '' WHERE name = 'Eve Emptied'");
    await recordProblem({ address: "bob@example.org", messageId: null, kind: "hard", reason: "No", canReset: true });
    vi.setSystemTime(new Date("2026-11-01T10:00:00Z"));
    await startDueMailings();
    const { channel } = recording((m) =>
      m.to.address === "cat@example.org"
        ? { sent: false, reason: "failed" }
        : m.to.address === "dan@example.org"
          ? { sent: false, reason: "blocked" }
          : SENT(),
    );
    expect(await sendDueLetters({ until: Infinity, gap: 0, channel })).toMatchObject({
      sent: 0,
      skipped: 4,
      failed: 1,
    });
    expect(await letters()).toEqual([
      { name: "Ann Away", status: "skipped", skipReason: "left-office", sentAt: false },
      { name: "Bob Bounced", status: "skipped", skipReason: "blocked", sentAt: false },
      { name: "Cat Fails", status: "not_sent", skipReason: null, sentAt: false },
      { name: "Dan Refused", status: "skipped", skipReason: "blocked", sentAt: false },
      { name: "Eve Emptied", status: "skipped", skipReason: "blocked", sentAt: false },
    ]);
    expect(await query("SELECT status, details FROM letter_events WHERE status <> 'skipped'")).toEqual([
      { status: "failed", details: {} },
    ]);
  });

  it("stops for the day at the account's limit, and when its Gmail is no longer connected, leaving the rest", async () => {
    await addTestPolitician({ airtableId: null, name: "Polly", email: "polly@example.org" });
    await addTestPolitician({ airtableId: null, name: "Dora", email: "dora@example.org" });
    const id = await scheduled();
    vi.setSystemTime(new Date("2026-11-01T10:00:00Z"));
    await startDueMailings();
    const limited = recording(SENT, 1);
    expect(await sendDueLetters({ until: Infinity, gap: 0, channel: limited.channel })).toEqual({
      sent: 1,
      skipped: 0,
      failed: 0,
      left: 1,
      waiting: [JO],
    });
    await query("UPDATE staff_accounts SET gmail_token = NULL, gmail_connected_at = NULL, gmail_history_id = NULL");
    const unconnected = recording(SENT);
    expect(await sendDueLetters({ until: Infinity, gap: 0, channel: unconnected.channel })).toMatchObject({
      sent: 0,
      left: 1,
      waiting: [JO],
    });
    expect(await state(id)).toBe("sending");
  });

  it("sends a second mailing from the same account no further once it's waiting, and stops at the time given", async () => {
    await addTestPolitician({ airtableId: null, name: "Polly", email: "polly@example.org" });
    await scheduled("2026-11-01T10:00:00Z", "One");
    await scheduled("2026-11-01T10:00:00Z", "Two");
    vi.setSystemTime(new Date("2026-11-01T10:00:00Z"));
    await startDueMailings();
    const limited = recording(SENT, 0);
    expect(await sendDueLetters({ until: Infinity, gap: 0, channel: limited.channel })).toMatchObject({
      sent: 0,
      left: 2,
      waiting: [JO],
    });
    const late = recording(SENT);
    expect(await sendDueLetters({ until: Date.now(), gap: 1000, channel: late.channel })).toMatchObject({
      sent: 0,
      left: 2,
    });
  });

  it("goes at the channel's pace, a gap between each", async () => {
    await addTestPolitician({ airtableId: null, name: "Polly", email: "polly@example.org" });
    await addTestPolitician({ airtableId: null, name: "Dora", email: "dora@example.org" });
    await scheduled();
    vi.useRealTimers();
    await query("UPDATE mailings SET state = 'sending' WHERE body IS NOT NULL");
    const times: number[] = [];
    const { channel } = recording(() => {
      times.push(Date.now());
      return SENT();
    });
    await sendDueLetters({ until: Infinity, gap: 50, channel });
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(45);
  });

  it("sends by Gmail when no channel is given", async () => {
    await addTestPolitician({ airtableId: null, name: "Polly", email: "polly@example.org" });
    await scheduled();
    vi.setSystemTime(new Date("2026-11-01T10:00:00Z"));
    await startDueMailings();
    expect(await sendDueLetters({ until: Infinity, gap: 0 })).toMatchObject({ sent: 1, left: 0 });
    expect(await query("SELECT backend, sender, purpose FROM email_sends")).toEqual([
      { backend: "gmail", sender: JO, purpose: "mailing" },
    ]);
  });
});
