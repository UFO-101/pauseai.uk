import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "@/lib/server/db";
import { createDraft, getWrittenMailing, saveDraft } from "@/lib/server/mailing-drafts";
import { createMessageDraft, getWrittenMessage } from "@/lib/server/message-drafts";
import { createSession } from "@/lib/server/staff-auth";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { addFollower, addTemplate, EVENT_WORDS } from "@/tests/message-fixtures";
import { expectRedirect, requestCookies } from "@/tests/next-headers";
import {
  attachToMessage,
  deleteMessageDraft,
  detachFromMessage,
  keepFilterForMessage,
  newMessage,
  replyToMessageNow,
  rescheduleMessageNow,
  saveMessage,
  scheduleMessageNow,
  sendMessageTestNow,
  stopMessageNow,
} from "./message-actions";

vi.mock("next/headers", () => import("@/tests/next-headers"));
const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const JO = "jo@pauseai.uk";
const EMAIL = { contact: "email:luma-calendar:yes" };
const TEXT = { contact: "phone:luma-calendar:yes" };
const FUTURE = "2099-01-01T09:18:00.000Z";

function form(fields: Record<string, string | string[] | File>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const one of [value].flat()) data.append(name, one);
  }
  return data;
}

const draft = async (params: Record<string, string> = EMAIL) => (await createMessageDraft(JO, params))!;

beforeEach(() => vi.stubEnv("DATA_FIXTURES", "1"));
afterEach(() => vi.unstubAllEnvs());

describeWithDatabase("the message pages' Server Actions", () => {
  useTestDatabase();

  beforeEach(async () => {
    requestCookies.clear();
    revalidatePath.mockClear();
    requestCookies.set("staff_session", await createSession(JO));
    await query("UPDATE staff_accounts SET permissions = ARRAY['supporters'] WHERE email = $1", [JO]);
  });

  it("asks for the supporters permission", async () => {
    await query("UPDATE staff_accounts SET permissions = '{}' WHERE email = $1", [JO]);
    await expect(saveMessage(1, 1, {})).rejects.toThrow();
  });

  it("makes a message from a Contact filter answered yes, and opens it", async () => {
    const to = await expectRedirect(() => newMessage(form({ ...EMAIL, near: "LS1", page: "2" })));
    expect(to).toMatch(/^\/staff\/messages\/\d+$/);
    const id = Number(to.split("/").at(-1));
    expect((await getWrittenMessage(id))!.filter.params).toEqual({ ...EMAIL, near: "LS1" });
  });

  it("goes back to say which filter to add, without one", async () => {
    await expect(expectRedirect(() => newMessage(form({ near: "LS1", within: ["10", "25"] })))).resolves.toBe(
      "/staff/supporters?near=LS1&within=10&within=25&why=contact",
    );
    expect(await query("SELECT id FROM mailings WHERE body IS NOT NULL")).toEqual([]);
  });

  it("keeps who it's to from the list, and goes back to the draft", async () => {
    const id = await draft();
    await expect(expectRedirect(() => keepFilterForMessage(id, form({ ...EMAIL, nation: "england" })))).resolves.toBe(
      `/staff/messages/${id}`,
    );
    expect((await getWrittenMessage(id))!.filter.params).toEqual({ ...EMAIL, nation: "england" });
  });

  it("saves a draft's changes, by its channel, and none that aren't allowed or to no message", async () => {
    const id = await draft();
    expect(await saveMessage(id, 1, { subject: "Events" })).toEqual({ saved: true, version: 2 });
    expect(await saveMessage(id, 2, { templateId: 1 })).toBeUndefined();
    expect(await saveMessage(999, 1, { subject: "Events" })).toBeUndefined();
  });

  it("attaches a file, takes it off, and refuses what isn't one or isn't a message's", async () => {
    const id = await draft();
    const file = new File(["x"], "brief.txt");
    expect(await attachToMessage(form({ id: String(id), version: "1" }))).toBeUndefined();
    expect(await attachToMessage(form({ id: "999", version: "1", file }))).toBeUndefined();
    const added = await attachToMessage(form({ id: String(id), version: "1", file }));
    expect(added).toMatchObject({
      saved: true,
      attachments: [{ filename: "brief.txt", contentType: "application/octet-stream" }],
    });
    expect(await detachFromMessage(id, 2, added!.attachments[0].id)).toMatchObject({ saved: true, attachments: [] });
    expect(await detachFromMessage(999, 1, 1)).toEqual({ saved: false, reason: "gone", attachments: [] });
  });

  it("sends a test copy: an email to you with no address given, a text only to a number", async () => {
    const jane = await addFollower("usr-1", "jane@example.com", "Jane", { phone: "07700 900001" });
    const email = await draft();
    await saveMessage(email, 1, { subject: "Hi", body: EVENT_WORDS });
    expect(await sendMessageTestNow(email, jane)).toMatchObject({ sent: true, to: JO });
    expect(await sendMessageTestNow(email, jane, "not an address")).toBeUndefined();
    expect(await sendMessageTestNow(email, 999, "me@pauseai.uk")).toBeUndefined();
    expect(await sendMessageTestNow(999, jane, "me@pauseai.uk")).toBeUndefined();
    const text = await draft(TEXT);
    expect(await sendMessageTestNow(text, jane)).toBeUndefined();
    await saveMessage(text, 1, { templateId: await addTemplate("March day") });
    expect(await sendMessageTestNow(text, jane, " +447700900002 ")).toMatchObject({ sent: true, to: "+447700900002" });
  });

  it("schedules, changes the time, and stops", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane");
    const id = await draft();
    await saveMessage(id, 1, { subject: "Hi", body: EVENT_WORDS, dueAt: FUTURE });
    expect(await scheduleMessageNow(id, 2)).toEqual({ scheduled: true });
    expect(revalidatePath).toHaveBeenCalledWith("/staff/messages");
    await rescheduleMessageNow(form({ id: String(id), day: "2099-02-03", hour: "9" }));
    expect((await getWrittenMessage(id))!.dueAt).not.toEqual(FUTURE);
    const moved = (await getWrittenMessage(id))!.dueAt;
    await rescheduleMessageNow(form({ id: "", day: "2099-02-03", hour: "9" }));
    await rescheduleMessageNow(form({ id: String(id), day: "soon", hour: "9" }));
    await rescheduleMessageNow(form({ id: String(id), day: "2099-02-04", hour: "25" }));
    await rescheduleMessageNow(form({ id: "999", day: "2099-02-04", hour: "9" }));
    expect((await getWrittenMessage(id))!.dueAt).toEqual(moved);
    await stopMessageNow(form({ id: "" }));
    expect((await getWrittenMessage(id))!.state).toBe("scheduled");
    await stopMessageNow(form({ id: String(id) }));
    expect((await getWrittenMessage(id))!.state).toBe("draft");
  });

  it("deletes a draft, and only a message's", async () => {
    const id = await draft();
    await expect(expectRedirect(() => deleteMessageDraft(form({ id: String(id) })))).resolves.toBe("/staff/messages");
    expect(await getWrittenMessage(id)).toBeUndefined();
    const { id: mailing } = await createDraft(JO, { list: "politicians", params: {} }, {});
    await expectRedirect(() => deleteMessageDraft(form({ id: String(mailing) })));
    expect(await getWrittenMailing(mailing)).toBeDefined();
    await expectRedirect(() => deleteMessageDraft(form({})));
  });

  it("sends a reply from the form", async () => {
    await addFollower("usr-1", "jane@example.com", "Jane");
    const id = await draft();
    await saveMessage(id, 1, { subject: "Hi", body: EVENT_WORDS, dueAt: FUTURE });
    await scheduleMessageNow(id, 2);
    const [{ copy }] = await query<{ copy: number }>("SELECT id::int AS copy FROM messages_to_supporters");
    await replyToMessageNow(form({ id: "", copy: String(copy), body: "No" }));
    await replyToMessageNow(form({ id: String(id), copy: "", body: "No" }));
    await replyToMessageNow(form({ id: String(id), copy: String(copy) }));
    expect(await query("SELECT id FROM message_replies")).toEqual([]);
    await replyToMessageNow(form({ id: String(id), copy: String(copy), body: "Yes, do." }));
    expect(await query("SELECT body, sent_by FROM message_replies")).toEqual([{ body: "Yes, do.", sent_by: JO }]);
    expect(revalidatePath).toHaveBeenCalledWith(`/staff/messages/${id}/${copy}`);
  });

  it("leaves a mailing to politicians alone", async () => {
    const { id } = await createDraft(JO, { list: "politicians", params: {} }, {});
    await saveDraft(id, 1, { subject: "Mine" });
    expect(await saveMessage(id, 2, { subject: "Theirs" })).toBeUndefined();
    await stopMessageNow(form({ id: String(id) }));
    expect((await getWrittenMailing(id))!.subject).toBe("Mine");
  });
});
