import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { EMPTY_MAILING_DOC } from "@/lib/mailing-doc";
import { connectTestGmail, describeWithDatabase, useTestDatabase } from "@/tests/database";
import { addFollower, addTemplate, EVENT_WORDS } from "@/tests/message-fixtures";
import { getWrittenMailing, saveDraft } from "./mailing-drafts";
import {
  approvedTemplates,
  changeMessageFilter,
  createMessageDraft,
  getWrittenMessage,
  messageChangesFrom,
  replyToMessage,
  saveMessageDraft,
  sameTerms,
  scheduleMessage,
  sendMessageTest,
  stopMessage,
} from "./message-drafts";
import { supporterAudience } from "./message-recipients";

const JO = "jo@pauseai.uk";
const FUTURE = "2099-01-01T09:18:00.000Z";
const EMAIL_FILTER = { contact: "email:luma-calendar:yes" };
const TEXT_FILTER = { contact: "phone:luma-calendar:yes" };

beforeEach(() => vi.stubEnv("DATA_FIXTURES", "1"));
afterEach(() => vi.unstubAllEnvs());

/** A draft to everyone with `params`, at version 1. */
async function draftOf(params: Record<string, string>): Promise<number> {
  return (await createMessageDraft(JO, params))!;
}

/** The draft, written and timed, ready to schedule; returns its version. */
async function readied(id: number, changes: object): Promise<number> {
  const message = (await getWrittenMessage(id))!;
  const saved = await saveMessageDraft(message, message.version, { dueAt: FUTURE, ...changes });
  if (!saved.saved) throw new Error("not saved");
  return saved.version;
}

it("takes only what a message may change, by its channel", () => {
  expect(messageChangesFrom(null, "email")).toBeUndefined();
  expect(messageChangesFrom({ ask: "an-ask" }, "email")).toBeUndefined();
  expect(messageChangesFrom({ templateId: 1 }, "email")).toBeUndefined();
  expect(messageChangesFrom({ subject: "Hello", fromName: "Jo" }, "email")).toEqual({
    subject: "Hello",
    fromName: "Jo",
  });
  expect(messageChangesFrom({ subject: "Hello" }, "text")).toBeUndefined();
  expect(messageChangesFrom({ sentFrom: "jo@pauseai.uk" }, "text")).toBeUndefined();
  expect(messageChangesFrom({ fromName: "Jo" }, "text")).toBeUndefined();
  expect(messageChangesFrom({ templateId: "one" }, "text")).toBeUndefined();
  expect(messageChangesFrom({ dueAt: FUTURE }, "text")).toEqual({ dueAt: FUTURE });
  expect(messageChangesFrom({ templateId: 3 }, "text")).toEqual({ templateId: 3 });
  expect(messageChangesFrom({ templateId: null }, "text")).toEqual({ templateId: null });
});

it("says whether a filter's terms are a message's own", () => {
  const own = { channel: "email" as const, topic: "site-forms" as const };
  expect(sameTerms(own, own)).toBe(true);
  expect(sameTerms({ ...own, topic: "luma-calendar" }, own)).toBe(false);
  expect(sameTerms(undefined, own)).toBe(false);
});

describeWithDatabase("messages to supporters", () => {
  useTestDatabase();

  it("makes a draft only from a Contact filter answered yes, from hello@ for an email and the account for a text", async () => {
    expect(await createMessageDraft(JO, { contact: "email:luma-calendar:unsure" })).toBeUndefined();
    const email = (await getWrittenMessage(await draftOf({ ...EMAIL_FILTER, near: "M1" })))!;
    expect(email).toMatchObject({
      channel: "email",
      topic: "luma-calendar",
      sentFrom: "hello@pauseai.uk",
      fromName: "PauseAI UK",
      state: "draft",
      template: null,
      filter: { list: "supporters", params: { ...EMAIL_FILTER, near: "M1" } },
    });
    vi.stubEnv("WHATSAPP_NUMBER", "+447700900000");
    expect(await getWrittenMessage(await draftOf(TEXT_FILTER))).toMatchObject({
      channel: "text",
      sentFrom: "+447700900000",
      fromName: "PauseAI UK",
    });
    vi.stubEnv("WHATSAPP_NUMBER", "");
    expect(await getWrittenMessage(await draftOf(TEXT_FILTER))).toMatchObject({ sentFrom: "" });
  });

  it("isn't found as a mailing to politicians, nor a mailing to politicians as a message", async () => {
    const id = await draftOf(EMAIL_FILTER);
    expect(await getWrittenMailing(id)).toBeUndefined();
    const [{ id: other }] = await query<{ id: number }>(
      `INSERT INTO mailings (title, audience, channel, filter, body, created_by, state)
       VALUES ('', 'politicians', 'email', '{"list": "politicians", "params": {}}', '{"type": "doc", "content": []}', 'jo@pauseai.uk', 'draft')
       RETURNING id::int AS id`,
    );
    expect(await getWrittenMessage(other)).toBeUndefined();
  });

  it("opens a draft, which keeps it from being tidied away", async () => {
    const id = await draftOf(EMAIL_FILTER);
    await query("UPDATE mailings SET opened_at = '2020-01-01T00:00:00Z' WHERE id = $1", [id]);
    await getWrittenMessage(id, true);
    const [{ recent }] = await query<{ recent: boolean }>(
      "SELECT opened_at > '2021-01-01' AS recent FROM mailings WHERE id = $1",
      [id],
    );
    expect(recent).toBe(true);
  });

  it("keeps a new filter only while it says the same channel and topic", async () => {
    const id = await draftOf(EMAIL_FILTER);
    expect(await changeMessageFilter(id, { ...EMAIL_FILTER, near: "LS1" })).toBe(true);
    expect((await getWrittenMessage(id))!.filter.params).toEqual({ ...EMAIL_FILTER, near: "LS1" });
    expect(await changeMessageFilter(id, { near: "LS1" })).toBe(false);
    expect(await changeMessageFilter(id, { contact: "email:site-forms:yes" })).toBe(false);
    expect(await changeMessageFilter(id, TEXT_FILTER)).toBe(false);
    expect(await changeMessageFilter(999, EMAIL_FILTER)).toBe(false);
  });

  it("saves an email as a mailing is saved, its title its subject", async () => {
    const id = await draftOf(EMAIL_FILTER);
    const message = (await getWrittenMessage(id))!;
    expect(await saveMessageDraft(message, 1, { subject: "Events" })).toEqual({ saved: true, version: 2 });
    expect((await getWrittenMessage(id))!.title).toBe("Events");
    expect(await saveMessageDraft(message, 1, { subject: "Late" })).toEqual({ saved: false, reason: "conflict" });
  });

  it("gives a text the words and name of an approved template, and none other", async () => {
    const id = await draftOf(TEXT_FILTER);
    const template = await addTemplate("March day");
    const pending = await addTemplate("Waiting", { status: "pending" });
    const message = (await getWrittenMessage(id))!;
    expect(await saveMessageDraft(message, 1, { templateId: pending })).toEqual({ saved: false, reason: "conflict" });
    expect(await saveMessageDraft(message, 1, { templateId: template })).toEqual({ saved: true, version: 2 });
    expect(await getWrittenMessage(id)).toMatchObject({
      title: "March day",
      body: EVENT_WORDS,
      template: { id: template, name: "March day", createdBy: JO, lastUsedAt: null, lastUsedTo: 0 },
    });
    // New words, and no template, title it by their first words.
    expect(await saveMessageDraft(message, 2, { templateId: null, body: EVENT_WORDS })).toEqual({
      saved: true,
      version: 3,
    });
    expect(await getWrittenMessage(id)).toMatchObject({
      title: expect.stringContaining("see you there"),
      template: null,
    });
    // Only a time keeps them.
    await saveMessageDraft(message, 3, { dueAt: FUTURE });
    expect((await getWrittenMessage(id))!.title).toContain("see you there");
  });

  it("schedules an email: fixes who gets it, with their values, and sets it going", async () => {
    const jane = await addFollower("usr-1", "jane@example.com", "Jane Smith");
    const id = await draftOf(EMAIL_FILTER);
    const version = await readied(id, { subject: "Events", body: EVENT_WORDS, fromName: null });
    expect(await scheduleMessage(id, version, JO)).toEqual({ scheduled: true });
    expect(await getWrittenMessage(id)).toMatchObject({ state: "scheduled", fromName: "" });
    expect(
      await query(
        `SELECT supporter_id::int AS id, address, status, merge_values ->> 'name' AS name FROM messages_to_supporters`,
      ),
    ).toEqual([{ id: jane, address: "jane@example.com", status: "scheduled", name: "Jane Smith" }]);
    expect(await scheduleMessage(id, version + 1, JO)).toEqual({ scheduled: false, reason: "not-draft" });
  });

  it("refuses what isn't there, has been saved since or can't go", async () => {
    expect(await scheduleMessage(999, 1, JO)).toEqual({ scheduled: false, reason: "gone" });
    await addFollower("usr-1", "jane@example.com", "Jane");
    const id = await draftOf(EMAIL_FILTER);
    expect(await scheduleMessage(id, 7, JO)).toEqual({ scheduled: false, reason: "conflict" });
    expect(await scheduleMessage(id, 1, JO)).toEqual({
      scheduled: false,
      problems: ["no-subject", "no-letter", "no-time"],
    });
    // Nothing goes on the live site yet.
    const version = await readied(id, { subject: "Events", body: EVENT_WORDS });
    vi.stubEnv("DATA_FIXTURES", "");
    expect(await scheduleMessage(id, version, JO)).toEqual({ scheduled: false, problems: ["cannot-send"] });
  });

  it("holds an email from a Gmail to its being connected", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane");
    const id = await draftOf(EMAIL_FILTER);
    const version = await readied(id, { subject: "Events", body: EVENT_WORDS, sentFrom: JO });
    expect(await scheduleMessage(id, version, JO)).toEqual({ scheduled: false, problems: ["not-connected"] });
    await connectTestGmail(JO);
    expect(await scheduleMessage(id, version, JO)).toEqual({ scheduled: true });
  });

  it("schedules a text on an approved template as it is, and new words as a template waiting for approval", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    const template = await addTemplate("March day");
    const on = await draftOf(TEXT_FILTER);
    expect(await scheduleMessage(on, await readied(on, { templateId: template }), JO)).toEqual({ scheduled: true });
    expect((await getWrittenMessage(on))!.template).toMatchObject({ id: template, status: "approved" });

    const fresh = await draftOf(TEXT_FILTER);
    expect(await scheduleMessage(fresh, await readied(fresh, { body: EVENT_WORDS }), JO)).toEqual({ scheduled: true });
    expect((await getWrittenMessage(fresh))!.template).toMatchObject({
      status: "pending",
      createdBy: JO,
      name: expect.stringContaining("see you there"),
      body: EVENT_WORDS,
    });
  });

  it("makes a rejected text a new template when it's scheduled again", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    const rejected = await addTemplate("Old words", { status: "rejected" });
    const id = await draftOf(TEXT_FILTER);
    const version = await readied(id, { body: EVENT_WORDS, templateId: null });
    await query("UPDATE mailings SET template_id = $2 WHERE id = $1", [id, rejected]);
    expect((await getWrittenMessage(id))!.template).toMatchObject({
      status: "rejected",
      rejectedReason: expect.any(String),
    });
    expect(await scheduleMessage(id, version, JO)).toEqual({ scheduled: true });
    expect((await getWrittenMessage(id))!.template).toMatchObject({ status: "pending" });
  });

  it("wants a template for a text", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    const id = await draftOf(TEXT_FILTER);
    const version = await readied(id, { body: EMPTY_MAILING_DOC });
    expect(await scheduleMessage(id, version, JO)).toEqual({ scheduled: false, problems: ["no-template"] });
  });

  it("lists approved templates, most recently used first", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    const unused = await addTemplate("Unused", { createdBy: null });
    const used = await addTemplate("Used");
    await addTemplate("Rejected", { status: "rejected" });
    const id = await draftOf(TEXT_FILTER);
    await scheduleMessage(id, await readied(id, { templateId: used }), JO);
    await query("UPDATE mailings SET state = 'sent' WHERE id = $1", [id]);
    expect(await approvedTemplates()).toMatchObject([
      { id: used, lastUsedAt: expect.anything(), lastUsedTo: 1 },
      { id: unused, createdBy: null, lastUsedAt: null, lastUsedTo: 0 },
    ]);
  });

  it("makes a scheduled message a draft again, taking back any words sent for approval", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    const id = await draftOf(TEXT_FILTER);
    await scheduleMessage(id, await readied(id, { body: EVENT_WORDS }), JO);
    expect(await stopMessage(id, JO)).toBe(true);
    expect(await getWrittenMessage(id)).toMatchObject({ state: "draft", template: null, body: EVENT_WORDS });
    expect(await query("SELECT id FROM messages_to_supporters")).toEqual([]);
    expect(await query("SELECT id FROM message_templates")).toEqual([]);
    expect(await stopMessage(id, JO)).toBe(false);
    expect(await stopMessage(999, JO)).toBe(false);
  });

  it("keeps an approved template when a message on it is unscheduled", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    const template = await addTemplate("March day");
    const id = await draftOf(TEXT_FILTER);
    await scheduleMessage(id, await readied(id, { templateId: template }), JO);
    await stopMessage(id, JO);
    expect((await getWrittenMessage(id))!.template).toMatchObject({ id: template });
  });

  it("stops one sending: sends no more, and says so of those not sent", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane");
    const id = await draftOf(EMAIL_FILTER);
    await scheduleMessage(id, await readied(id, { subject: "Events", body: EVENT_WORDS }), JO);
    await query("UPDATE mailings SET state = 'sending' WHERE id = $1", [id]);
    expect(await stopMessage(id, JO)).toBe(true);
    expect((await getWrittenMessage(id))!.state).toBe("cancelled");
    expect(await query("SELECT status FROM messages_to_supporters")).toEqual([{ status: "cancelled" }]);
  });

  it("tests an email by Postmark, and a text by its backend only on an approved template", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    const email = (await getWrittenMessage(await draftOf(EMAIL_FILTER)))!;
    const emailTo = (await supporterAudience(email.filter, email)).recipients[0];
    await expect(
      sendMessageTest({ ...email, subject: "Hi", body: EVENT_WORDS }, emailTo, "me@pauseai.uk"),
    ).resolves.toMatchObject({
      sent: true,
    });
    const id = await draftOf(TEXT_FILTER);
    const text = (await getWrittenMessage(id))!;
    const textTo = (await supporterAudience(text.filter, text)).recipients[0];
    expect(await sendMessageTest(text, textTo, "+447700900002")).toBeUndefined();
    await readied(id, { templateId: await addTemplate("March day") });
    const approved = (await getWrittenMessage(id))!;
    await expect(sendMessageTest(approved, textTo, "+447700900002")).resolves.toMatchObject({ sent: true });
    vi.stubEnv("DATA_FIXTURES", "");
    expect(await sendMessageTest(approved, textTo, "+447700900002")).toBeUndefined();
  });

  describe_replies();
});

function describe_replies() {
  /** A sent copy to Jane by `filter`; returns its ID. */
  async function sentCopy(params: Record<string, string>, changes: object): Promise<number> {
    await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    const id = await draftOf(params);
    await scheduleMessage(id, await readied(id, changes), JO);
    await query("UPDATE mailings SET state = 'sent' WHERE id = $1", [id]);
    const [{ copy }] = await query<{ copy: number }>(
      "UPDATE messages_to_supporters SET status = 'sent' RETURNING id::int AS copy",
    );
    return copy;
  }

  it("sends a reply to an email, and keeps who sent it", async () => {
    const copy = await sentCopy(EMAIL_FILTER, { subject: "Events", body: EVENT_WORDS });
    expect(await replyToMessage(copy, "  ", JO)).toBe(false);
    expect(await replyToMessage(copy, " Yes, do. ", JO)).toBe(true);
    expect(await query("SELECT body, sent_by FROM message_replies")).toEqual([{ body: "Yes, do.", sent_by: JO }]);
    expect(await replyToMessage(999, "Hello", JO)).toBe(false);
  });

  it("sends a reply to a text only within a day of their last message", async () => {
    const copy = await sentCopy(TEXT_FILTER, { templateId: await addTemplate("March day") });
    expect(await replyToMessage(copy, "Hello", JO)).toBe(false);
    await query(
      "INSERT INTO message_replies (message_id, body, at) VALUES ($1, 'Is it on?', now() - interval '25 hours')",
      [copy],
    );
    expect(await replyToMessage(copy, "Hello", JO)).toBe(false);
    await query("INSERT INTO message_replies (message_id, body, at) VALUES ($1, 'Well?', now() - interval '1 hour')", [
      copy,
    ]);
    expect(await replyToMessage(copy, "Yes", JO)).toBe(true);
  });

  it("sends no reply with nothing to send it by, or to someone erased", async () => {
    const copy = await sentCopy(EMAIL_FILTER, { subject: "Events", body: EVENT_WORDS });
    vi.stubEnv("DATA_FIXTURES", "");
    expect(await replyToMessage(copy, "Hello", JO)).toBe(false);
    vi.stubEnv("DATA_FIXTURES", "1");
    await query("UPDATE messages_to_supporters SET supporter_id = NULL, address = NULL, merge_values = NULL");
    expect(await replyToMessage(copy, "Hello", JO)).toBe(false);
  });

  it("says when a reply couldn't be sent", async () => {
    const copy = await sentCopy(EMAIL_FILTER, { subject: "Events", body: EVENT_WORDS });
    const channels = await import("./message-channels");
    const spy = vi
      .spyOn(channels, "messageBackend")
      .mockReturnValue({ send: async () => ({ sent: false, reason: "failed" }) });
    expect(await replyToMessage(copy, "Hello", JO)).toBe(false);
    spy.mockRestore();
  });

  it("leaves a saved draft's filter alone for saveDraft", async () => {
    const id = await draftOf(EMAIL_FILTER);
    await saveDraft(id, 1, { subject: "Hi" });
    expect((await getWrittenMessage(id))!.filter.params).toEqual(EMAIL_FILTER);
  });
}
