"use server";

// The Server Actions of the mailing pages. Each is a public endpoint, so
// each calls requireStaff() before anything else (tests/checks/staff-auth.test.ts).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { idFrom } from "@/lib/staff-forms";
import { fromLondon } from "@/lib/staff-time";
import type { Params } from "@/lib/staff-search";
import {
  addAttachment,
  createDraft,
  deleteDraft,
  getWrittenMailing,
  mailingChangesFrom,
  removeAttachment,
  rescheduleMailing,
  saveDraft,
  scheduleMailing,
  sendTestCopy,
  stopMailing,
  type SaveResult,
  type ScheduleResult,
} from "@/lib/server/mailing-drafts";
import { politicianAudience } from "@/lib/server/mailing-recipients";
import { looksLikeEmail } from "@/lib/email-your-mp";
import { requireStaff } from "@/lib/server/staff-auth";
import { storedFilter } from "@/lib/staff-search";

/**
 * Makes a draft of a new mailing at its first change worth keeping, to the
 * politicians `params` find. Its ID and version; undefined for changes
 * that aren't what they should be.
 */
export async function startMailing(
  params: Params,
  changes: unknown,
): Promise<{ id: number; version: number } | undefined> {
  const { email } = await requireStaff();
  const parsed = mailingChangesFrom(changes);
  if (!parsed) return undefined;
  // Not revalidated: that would refresh the page, by now at the draft's own
  // address, remounting the writer under someone still typing. The list of
  // mailings is fetched afresh whenever it's opened.
  return createDraft(email, storedFilter("politicians", params), parsed);
}

/** Saves a draft's changes, if no one else has saved it since `version`. */
export async function saveMailing(id: number, version: number, changes: unknown): Promise<SaveResult | undefined> {
  await requireStaff();
  const parsed = mailingChangesFrom(changes);
  return parsed && saveDraft(id, version, parsed);
}

/** Attaches the form's file to a draft at its version. */
export async function attachToMailing(form: FormData) {
  await requireStaff();
  const id = idFrom(form);
  const version = idFrom(form, "version");
  const file = form.get("file");
  if (!id || !version || !(file instanceof File) || !file.name) return undefined;
  const saved = await addAttachment(id, version, {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    content: Buffer.from(await file.arrayBuffer()),
  });
  return { ...saved, attachments: (await getWrittenMailing(id))?.attachments ?? [] };
}

/** Takes a file off a draft at its version. */
export async function detachFromMailing(id: number, version: number, attachmentId: number) {
  await requireStaff();
  const saved = await removeAttachment(id, version, attachmentId);
  return { ...saved, attachments: (await getWrittenMailing(id))?.attachments ?? [] };
}

/**
 * Sends one recipient's email of a draft, as they'd get it, to `to`, or
 * with none the staff member, and says where it went; nothing to an
 * address that doesn't look like one.
 */
export async function sendMailingTest(id: number, politicianId: number, to = "") {
  const { email } = await requireStaff();
  const address = to.trim() || email;
  if (!looksLikeEmail(address)) return undefined;
  const mailing = await getWrittenMailing(id);
  if (!mailing) return undefined;
  const recipient = (await politicianAudience(mailing.filter)).recipients.find((r) => r.id === politicianId);
  return recipient && { ...(await sendTestCopy(mailing, recipient, address)), to: address };
}

/** Schedules a draft at its version, if nothing stops it. */
export async function scheduleMailingNow(id: number, version: number): Promise<ScheduleResult> {
  const { email } = await requireStaff();
  const result = await scheduleMailing(id, version, email);
  revalidatePath("/staff/mailings");
  return result;
}

/** Deletes the form's draft, then goes to the list of mailings. */
export async function deleteMailingDraft(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const id = idFrom(form);
  if (id) await deleteDraft(id, email);
  revalidatePath("/staff/mailings");
  redirect("/staff/mailings");
}

/** Stops the form's mailing: a scheduled one becomes a draft again; one sending sends no more. */
export async function stopMailingNow(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const id = idFrom(form);
  if (!id) return;
  await stopMailing(id, email);
  revalidatePath("/staff/mailings");
  revalidatePath(`/staff/mailings/${id}`);
}

/** Changes when the form's scheduled mailing goes: its day and hour, in London. */
export async function rescheduleMailingNow(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const id = idFrom(form);
  const day = form.get("day");
  const hour = Number(form.get("hour"));
  if (!id || typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !(hour >= 0 && hour < 24)) return;
  await rescheduleMailing(id, fromLondon(day, hour), email);
  revalidatePath("/staff/mailings");
  revalidatePath(`/staff/mailings/${id}`);
}

/**
 * Makes a draft go to who the politicians list's filter finds now, from
 * the list's button after Change who, then goes back to the draft.
 */
export async function changeMailingWho(form: FormData): Promise<void> {
  await requireStaff();
  const id = idFrom(form);
  const mailing = id ? await getWrittenMailing(id) : undefined;
  if (!mailing) return;
  const params: Record<string, string[]> = {};
  for (const [name, value] of form.entries()) {
    if (typeof value === "string" && name !== "id") (params[name] ??= []).push(value);
  }
  await saveDraft(mailing.id, mailing.version, { filter: storedFilter("politicians", params) });
  revalidatePath(`/staff/mailings/${mailing.id}`);
  redirect(`/staff/mailings/${mailing.id}`);
}
