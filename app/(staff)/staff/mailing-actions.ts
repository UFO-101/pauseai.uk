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
  changePicks,
  createDraft,
  deleteDraft,
  foundIds,
  getWrittenMailing,
  mailingChangesFrom,
  picksOf,
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
import { filtersPath, staffBack, storedFilter } from "@/lib/staff-search";

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

/** The form's fields but `skip`, as the politicians list's parameters. */
function formParams(form: FormData, skip: string[]): Params {
  const params: Record<string, string[]> = {};
  for (const [name, value] of form.entries()) {
    if (typeof value === "string" && !skip.includes(name)) (params[name] ??= []).push(value);
  }
  return params;
}

/**
 * Makes a new mailing, a draft, and opens the politicians list choosing
 * who it's for. From the list with a filter, with its fields and `found`, it
 * starts with everyone the filter finds ticked, on that filter; from the
 * list with none, or the list of mailings, with no one.
 */
export async function newMailing(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const found = form.has("found");
  const params = storedFilter("politicians", formParams(form, ["found"])).params;
  const picks = found ? picksOf(await foundIds(params), params) : picksOf([]);
  const { id } = await createDraft(email, picks, {});
  revalidatePath("/staff/mailings");
  redirect(filtersPath("/staff/politicians", params, { mailing: String(id) }));
}

/** Ticks a politician for a draft, or unticks them. */
export async function pickPolitician(mailing: number, politician: number, ticked: boolean): Promise<void> {
  await requireStaff();
  await changePicks(mailing, ticked ? { tick: [politician] } : { untick: [politician] });
  revalidatePath("/staff/politicians");
}

/** Ticks everyone the politicians list's `params` find for a draft, on every page, or unticks them. */
export async function pickFound(mailing: number, params: Params, ticked: boolean): Promise<void> {
  await requireStaff();
  await changePicks(mailing, ticked ? { found: params } : { untick: await foundIds(params) });
  revalidatePath("/staff/politicians");
}

/** Unticks everyone for a draft, to start again: bound to its ID, for a form or a tick box. */
export async function untickAll(mailing: number): Promise<void> {
  await requireStaff();
  await changePicks(mailing, { clear: true });
  revalidatePath("/staff/politicians");
}

/** The most lines of names pasted that are looked for at once. */
const MOST_PASTED = 100;

/**
 * Goes to the paste tab of the list on `back` with the form's names, a
 * line each, to show who each found, unticked till they're ticked there.
 */
export async function pasteNames(form: FormData): Promise<void> {
  await requireStaff();
  const text = form.get("names");
  const back = staffBack(String(form.get("back") ?? ""), "/staff/politicians");
  if (typeof text !== "string") return;
  const url = new URL(back, "http://staff");
  url.searchParams.delete("pasted");
  for (const line of text
    .split(/\r?\n/)
    .map((one) => one.trim())
    .filter(Boolean)
    .slice(0, MOST_PASTED)) {
    url.searchParams.append("pasted", line);
  }
  url.searchParams.set("tab", "pasted");
  redirect(`${url.pathname}${url.search}`);
}

/** Ticks these politicians for a draft, or unticks them: everyone a paste found, from the box over them. */
export async function pickMany(mailing: number, politicians: number[], ticked: boolean): Promise<void> {
  await requireStaff();
  await changePicks(mailing, ticked ? { tick: politicians } : { untick: politicians });
  revalidatePath("/staff/politicians");
}
