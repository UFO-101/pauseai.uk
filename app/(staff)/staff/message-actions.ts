"use server";

// The Server Actions of the pages of messages to supporters. Each is a public
// endpoint, so each calls requireStaff() before anything else
// (tests/checks/staff-auth.test.ts), and asks for the supporters permission,
// as a message is to someone who said yes to it.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { looksLikeEmail } from "@/lib/email-your-mp";
import { addAttachment, deleteDraft, removeAttachment, rescheduleMailing } from "@/lib/server/mailing-drafts";
import {
  changeMessageFilter,
  createMessageDraft,
  getWrittenMessage,
  messageChangesFrom,
  replyToMessage,
  saveMessageDraft,
  scheduleMessage,
  sendMessageTest,
  stopMessage,
  type MessageScheduleResult,
} from "@/lib/server/message-drafts";
import { supporterAudience } from "@/lib/server/message-recipients";
import { requireStaff } from "@/lib/server/staff-auth";
import type { SaveResult } from "@/lib/server/mailing-drafts";
import { idFrom } from "@/lib/staff-forms";
import { filtersPath, storedFilter, type Params } from "@/lib/staff-search";
import { fromLondon } from "@/lib/staff-time";

const LIST = "/staff/messages";

/** The form's fields, as the supporters list's parameters that choose who. */
function whoFrom(form: FormData): Params {
  const params: Record<string, string[]> = {};
  for (const [name, value] of form.entries()) {
    if (typeof value === "string") (params[name] ??= []).push(value);
  }
  return storedFilter("supporters", params).params;
}

/**
 * Makes a draft to everyone the form's filter finds, and opens it; with no
 * Contact filter answered yes, back to the list, to say which to add.
 */
export async function newMessage(form: FormData): Promise<void> {
  const { email } = await requireStaff("supporters");
  const params = whoFrom(form);
  const id = await createMessageDraft(email, params);
  if (!id) redirect(filtersPath("/staff/supporters", params, { why: "contact" }));
  revalidatePath(LIST);
  redirect(`${LIST}/${id}`);
}

/** Keeps the form's filter for draft `id`, and goes back to it. */
export async function keepFilterForMessage(id: number, form: FormData): Promise<void> {
  await requireStaff("supporters");
  await changeMessageFilter(id, whoFrom(form));
  revalidatePath(`${LIST}/${id}`);
  redirect(`${LIST}/${id}`);
}

/** Saves a draft's changes, if no one else has saved it since `version`. */
export async function saveMessage(id: number, version: number, changes: unknown): Promise<SaveResult | undefined> {
  await requireStaff("supporters");
  const message = await getWrittenMessage(id);
  const parsed = message && messageChangesFrom(changes, message.channel);
  return parsed && saveMessageDraft(message!, version, parsed);
}

/** Attaches the form's file to a draft email at its version. */
export async function attachToMessage(form: FormData) {
  await requireStaff("supporters");
  const id = idFrom(form);
  const version = idFrom(form, "version");
  const file = form.get("file");
  if (!id || !version || !(file instanceof File) || !file.name) return undefined;
  if (!(await getWrittenMessage(id))) return undefined;
  const saved = await addAttachment(id, version, {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    content: Buffer.from(await file.arrayBuffer()),
  });
  return { ...saved, attachments: (await getWrittenMessage(id))!.attachments };
}

/** Takes a file off a draft email at its version. */
export async function detachFromMessage(id: number, version: number, attachmentId: number) {
  await requireStaff("supporters");
  if (!(await getWrittenMessage(id))) return { saved: false as const, reason: "gone" as const, attachments: [] };
  const saved = await removeAttachment(id, version, attachmentId);
  return { ...saved, attachments: (await getWrittenMessage(id))!.attachments };
}

/**
 * Sends one recipient's copy of a draft, as they'd get it, to `to`, or with
 * none the staff member's address, for an email, and says where it went.
 */
export async function sendMessageTestNow(id: number, supporterId: number, to = "") {
  const { email } = await requireStaff("supporters");
  const message = await getWrittenMessage(id);
  if (!message) return undefined;
  const address = to.trim() || (message.channel === "email" ? email : "");
  if (message.channel === "email" ? !looksLikeEmail(address) : !address) return undefined;
  const { recipients } = await supporterAudience(message.filter, message);
  const recipient = recipients.find((one) => one.id === supporterId);
  const result = recipient && (await sendMessageTest(message, recipient, address));
  return result && { ...result, to: address };
}

/** Schedules a draft at its version, if nothing stops it. */
export async function scheduleMessageNow(id: number, version: number): Promise<MessageScheduleResult> {
  const { email } = await requireStaff("supporters");
  const result = await scheduleMessage(id, version, email);
  revalidatePath(LIST);
  return result;
}

/** Deletes the form's draft, then goes to the list of messages. */
export async function deleteMessageDraft(form: FormData): Promise<void> {
  const { email } = await requireStaff("supporters");
  const id = idFrom(form);
  if (id && (await getWrittenMessage(id))) await deleteDraft(id, email);
  revalidatePath(LIST);
  redirect(LIST);
}

/** Stops the form's message: a scheduled one becomes a draft again; one sending sends no more. */
export async function stopMessageNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("supporters");
  const id = idFrom(form);
  if (!id) return;
  await stopMessage(id, email);
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
}

/** Changes when the form's scheduled message goes: its day and hour, in London. */
export async function rescheduleMessageNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("supporters");
  const id = idFrom(form);
  const day = form.get("day");
  const hour = Number(form.get("hour"));
  if (!id || typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !(hour >= 0 && hour < 24)) return;
  if (!(await getWrittenMessage(id))) return;
  await rescheduleMailing(id, fromLondon(day, hour), email);
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
}

/** Sends the form's reply to one copy of a message. */
export async function replyToMessageNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("supporters");
  const id = idFrom(form);
  const copy = idFrom(form, "copy");
  const body = form.get("body");
  if (!id || !copy || typeof body !== "string") return;
  await replyToMessage(copy, body, email);
  revalidatePath(`${LIST}/${id}/${copy}`);
}
