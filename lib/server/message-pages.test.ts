import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { staffCopy } from "@/lib/content/staff-interface";
import { query } from "@/lib/server/db";
import { connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { LETTERS_INBOX } from "@/tests/fixture-env.mjs";
import { addFollower, addTemplate, EVENT_WORDS } from "@/tests/message-fixtures";
import { createMessageDraft, getWrittenMessage, saveMessageDraft, scheduleMessage } from "./message-drafts";
import {
  choosingMessage,
  messageCopy,
  messagePageData,
  messagesPage,
  messagesToSupporter,
  messageTitle,
} from "./message-pages";

const JO = "jo@pauseai.uk";
const FUTURE = "2099-01-01T09:18:00.000Z";
const EMAIL_FILTER = { contact: "email:luma-calendar:yes" };
const TEXT_FILTER = { contact: "phone:luma-calendar:yes" };

beforeEach(() => vi.stubEnv("DATA_FIXTURES", "1"));
afterEach(() => vi.unstubAllEnvs());

/** A message by `params`, scheduled with these changes; returns its ID. */
async function scheduled(params: Record<string, string>, changes: object): Promise<number> {
  const id = (await createMessageDraft(JO, params))!;
  const message = (await getWrittenMessage(id))!;
  const saved = await saveMessageDraft(message, 1, { dueAt: FUTURE, ...changes });
  if (!saved.saved) throw new Error("not saved");
  const result = await scheduleMessage(id, saved.version, JO);
  if (!result.scheduled) throw new Error("not scheduled");
  return id;
}

/** Sets a message's copies going as sent, and each status by supporter's order, as `statuses`; returns their IDs. */
async function sent(id: number, statuses: [string, string | null][]): Promise<number[]> {
  await query("UPDATE mailings SET state = 'sent' WHERE id = $1", [id]);
  const copies = await query<{ id: number }>(
    "SELECT id::int AS id FROM messages_to_supporters WHERE mailing_id = $1 ORDER BY id",
    [id],
  );
  for (const [i, [status, reason]] of statuses.entries()) {
    await query(
      "UPDATE messages_to_supporters SET status = $2, skip_reason = $3, sent_at = '2026-10-20T08:00:00Z' WHERE id = $1",
      [copies[i].id, status, reason],
    );
  }
  return copies.map((copy) => copy.id);
}

describeWithDatabase("the pages of messages to supporters", () => {
  useTestDatabase();

  it("says when there are none", async () => {
    expect((await messagesPage()).groups).toEqual([]);
    expect(await messagePageData(999, {}, JO)).toBeUndefined();
    expect(await messageTitle(999)).toBeUndefined();
    expect(await messageCopy(999, 1)).toBeUndefined();
    expect(await choosingMessage("")).toBeUndefined();
    expect(await choosingMessage("999")).toBeUndefined();
  });

  it("lists drafts, with who they'd go to now, those coming up, and those sent, with their counts", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    await addFollower("usr-2", "sam@example.com", "Sam", { phone: "07700 900002" });
    await addFollower("usr-3", "pat@example.com", "Pat", { phone: "07700 900003" });
    await addFollower("usr-4", "bob@example.com", "Bob", { phone: "07700 900004" });
    await createMessageDraft(JO, EMAIL_FILTER);
    const waiting = await scheduled(TEXT_FILTER, { body: EVENT_WORDS });
    const onTemplate = await scheduled(TEXT_FILTER, {
      templateId: await addTemplate("March day"),
      dueAt: "2098-01-01T09:18:00.000Z",
    });
    const went = await scheduled(EMAIL_FILTER, { subject: "Sent", body: EVENT_WORDS });
    const copies = await sent(went, [
      ["delivered", null],
      ["failed", null],
      ["skipped", "unsubscribed"],
      ["skipped", "blocked"],
    ]);
    await query("INSERT INTO message_events (message_id, kind) VALUES ($1, 'read')", [copies[0]]);
    await query("INSERT INTO message_replies (message_id, body) VALUES ($1, 'Thanks')", [copies[0]]);
    const { groups, now } = await messagesPage();
    expect(typeof now).toBe("string");
    const coming = groups[0].mailings;
    expect(coming.map((m) => [m.id, m.state, m.waiting])).toEqual([
      [onTemplate, "scheduled", false],
      [waiting, "scheduled", true],
      [expect.any(Number), "draft", false],
    ]);
    expect(coming[2].to).toBe(4);
    expect(groups[1].mailings[0]).toMatchObject({
      id: went,
      channel: "email",
      to: 4,
      sent: 1,
      delivered: 1,
      failed: 2,
      stopped: 1,
      read: 1,
      replied: 1,
    });
  });

  it("gives a draft's page what writing it needs, with one recipient for each mix of conditions", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane");
    await addFollower("usr-2", "sam@example.com", "Sam");
    await addFollower("usr-3", "nameless@example.com", "");
    const id = (await createMessageDraft(JO, EMAIL_FILTER))!;
    const data = await messagePageData(id, {}, JO);
    expect(data).toMatchObject({
      kind: "draft",
      count: 3,
      me: JO,
      sends: true,
      unknown: [],
      templates: [],
      senders: [],
    });
    expect(data!.kind === "draft" && data!.recipients.length).toBe(2);
    await query(
      `UPDATE mailings SET filter = '{"list": "supporters", "params": {"contact": "email:luma-calendar:yes", "event": "gone"}}' WHERE id = $1`,
      [id],
    );
    expect(await messagePageData(id, {}, JO)).toMatchObject({ unknown: ["event=gone"], count: 0 });
  });

  it("offers connected Gmails to send from, never the letters inbox", async () => {
    await connectTestGmail(JO);
    await connectTestGmail(LETTERS_INBOX);
    vi.stubEnv("LETTERS_INBOX", LETTERS_INBOX);
    const id = (await createMessageDraft(JO, EMAIL_FILTER))!;
    const data = await messagePageData(id, {}, JO);
    expect(data!.kind === "draft" && data!.senders.map((one) => one.email)).toEqual([JO]);
  });

  it("titles a draft, or says it has none; a mailing to politicians is none", async () => {
    const id = (await createMessageDraft(JO, EMAIL_FILTER))!;
    expect(await messageTitle(id)).toBe(staffCopy.messagePages.untitled);
    await query("UPDATE mailings SET title = 'Events' WHERE id = $1", [id]);
    expect(await messageTitle(id)).toBe("Events");
    expect(await choosingMessage(String(id))).toEqual({
      id,
      channel: "email",
      topic: "luma-calendar",
      title: "Events",
    });
    await query("UPDATE mailings SET title = '' WHERE id = $1", [id]);
    expect((await choosingMessage(String(id)))!.title).toBe(staffCopy.messagePages.newTitle.email);
    expect(await choosingMessage("not a number")).toBeUndefined();
  });

  it("gives one sent's page its recipients, in a tab, a page at a time, and stops choosing for it", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane Smith", { postcode: undefined });
    await addFollower("usr-2", "sam@example.com", "Sam");
    const id = await scheduled(EMAIL_FILTER, { subject: "Sent", body: EVENT_WORDS });
    await sent(id, [
      ["delivered", null],
      ["failed", null],
    ]);
    const [{ jane }] = await query<{ jane: number }>(
      "SELECT id::int AS jane FROM messages_to_supporters WHERE address = 'jane@example.com'",
    );
    await query("INSERT INTO message_events (message_id, kind) VALUES ($1, 'read')", [jane]);
    await query("INSERT INTO message_replies (message_id, body) VALUES ($1, 'Thanks')", [jane]);
    const all = await messagePageData(id, {}, JO);
    expect(all).toMatchObject({ kind: "written", tab: "all", recipientsTotal: 2, page: 1, pages: 1, pageSize: 100 });
    expect(all!.kind === "written" && all!.recipients[0]).toMatchObject({ name: "Jane Smith", read: true, replies: 1 });
    expect(await messagePageData(id, { tab: "failed", page: "1" }, JO)).toMatchObject({
      tab: "failed",
      recipientsTotal: 1,
    });
    expect(await messagePageData(id, { tab: "nonsense" }, JO)).toMatchObject({ tab: "all" });
    for (const tab of ["delivered", "stopped", "read", "replied"]) {
      expect(await messagePageData(id, { tab }, JO)).toMatchObject({ tab });
    }
    expect(await choosingMessage(String(id))).toBeUndefined();
  });

  it("gives one copy with its replies, and until when a reply to a text is free", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane Smith", { phone: "07700 900001" });
    const id = await scheduled(TEXT_FILTER, { templateId: await addTemplate("March day") });
    const [copy] = await sent(id, [["delivered", null]]);
    expect(await messageCopy(id + 1, copy)).toBeUndefined();
    expect(await messageCopy(id, copy)).toMatchObject({
      channel: "text",
      name: "Jane Smith",
      address: "+447700900001",
      merge: { values: { firstName: "Jane" } },
      replies: [],
      replyUntil: null,
      deliveredAt: null,
      readAt: null,
      to: 1,
      sends: true,
    });
    await query(
      "INSERT INTO message_events (message_id, kind, at) VALUES ($1, 'delivered', '2026-10-20T08:01:00Z'), ($1, 'read', '2026-10-20T08:02:00Z')",
      [copy],
    );
    await query(
      `INSERT INTO message_replies (message_id, body, at, sent_by) VALUES
       ($1, 'Is it on?', '2026-10-20T09:00:00Z', NULL), ($1, 'Yes', '2026-10-20T10:00:00Z', 'jo@pauseai.uk')`,
      [copy],
    );
    expect(await messageCopy(id, copy)).toMatchObject({
      deliveredAt: expect.anything(),
      readAt: expect.anything(),
      replies: [
        { body: "Is it on?", sentBy: null },
        { body: "Yes", sentBy: JO },
      ],
      replyUntil: "2026-10-21T09:00:00.000Z",
    });
    // Erased, it keeps only that it was sent.
    await query("UPDATE messages_to_supporters SET supporter_id = NULL, address = NULL, merge_values = NULL");
    expect(await messageCopy(id, copy)).toMatchObject({ name: null, address: null, merge: null, supporterId: null });
  });

  it("lists the messages a supporter was sent, newest first, with their replies", async () => {
    const jane = await addFollower("usr-1", "jane@example.com", "Jane");
    expect(await messagesToSupporter(jane)).toEqual([]);
    const id = await scheduled(EMAIL_FILTER, { subject: "Events", body: EVENT_WORDS });
    const [copy] = await sent(id, [["delivered", null]]);
    await query(
      `INSERT INTO message_replies (message_id, body, sent_by) VALUES ($1, 'Thanks', NULL), ($1, 'Pleasure', 'jo@pauseai.uk')`,
      [copy],
    );
    expect(await messagesToSupporter(jane)).toMatchObject([
      {
        copyId: copy,
        messageId: id,
        title: "Events",
        channel: "email",
        status: "delivered",
        read: false,
        replies: [{ body: "Thanks" }],
      },
    ]);
  });
});
