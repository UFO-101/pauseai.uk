"use server";

// The staff interface's Server Actions. Each is a public endpoint, so each
// calls requireStaff() before anything else (tests/checks/staff-auth.test.ts).
import { importOldLetters } from "@/lib/server/old-letters-import";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ImportJob, importPath } from "@/lib/import-runs";
import { endPress, takePress } from "@/lib/server/import-runs";
import { now } from "@/lib/now";
import { erasedPath, staffBack } from "@/lib/staff-search";
import {
  askFrom,
  eraseFrom,
  eventFrom,
  idFrom,
  noteEditFrom,
  noteFrom,
  permissionsFrom,
  statusFrom,
  unblockFrom,
} from "@/lib/staff-forms";
import { addAsk, deleteAsk, editAsk } from "@/lib/server/asks";
import { importControlAiLetter } from "@/lib/server/controlai-import";
import { isPoliticianAddress, unblock } from "@/lib/server/email";
import { disconnectGmail } from "@/lib/server/gmail-accounts";
import { readGmail } from "@/lib/server/gmail-reading";
import { eraseSupporter } from "@/lib/server/erasure";
import { importLuma } from "@/lib/server/luma-import";
import { importMembers } from "@/lib/server/members-import";
import { checkMps } from "@/lib/server/mp-check";
import { decideHeldSync, syncPoliticians } from "@/lib/server/politician-sync";
import { syncEmails } from "@/lib/server/emails-sync";
import { importGoToParliament } from "@/lib/server/go-to-parliament-import";
import { importWebFormLetters } from "@/lib/server/web-form-import";
import { addNote, deleteNote, editNote, type NoteTarget } from "@/lib/server/notes";
import { deletePolitician, setStatus } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import { type EventSaved, setEventDoc, setEventOwner } from "@/lib/server/staff-events";
import { runSending } from "@/lib/server/sending-job";
import { runTidying } from "@/lib/server/log-retention";
import {
  type AccountChange,
  endStaffSessions,
  removeStaffAccount,
  saveStaffAccount,
} from "@/lib/server/staff-accounts";

/** The form on a politician's page: sets their answer to an ask, dated today, or clears it, with its note of how we know. */
export async function setAskStatus(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const parsed = statusFrom(form);
  if (!parsed) return;
  const today = now().toISOString().slice(0, 10);
  await setStatus(
    parsed.politicianId,
    parsed.ask,
    { status: parsed.status, date: parsed.status ? today : null, note: parsed.note },
    email,
  );
  revalidatePath("/staff/politicians");
  revalidatePath(`/staff/politicians/${parsed.politicianId}`);
  // A mailing's counts, and its letters' pages, where the answer can be set too.
  revalidatePath("/staff/mailings", "layout");
}

/**
 * An event's edit form on the events page: makes the staff member chosen
 * its owner, which emails them and the owner before, and sets or clears its
 * Google Doc. Any staff member can. Returns whom it emailed, and the new
 * owner, for the page to say so.
 */
export async function saveEventNow(form: FormData): Promise<EventSaved> {
  const { email } = await requireStaff();
  const parsed = eventFrom(form);
  if (!parsed) return { emailed: [], owner: null };
  const emailed = parsed.owner ? await setEventOwner(parsed.eventId, parsed.owner, email) : undefined;
  const doc = await setEventDoc(parsed.eventId, parsed.doc, email);
  if (emailed || doc) revalidatePath("/staff/events");
  return { emailed: emailed ?? [], owner: parsed.owner };
}

/** The button on the page of a politician gone from Airtable: deletes them, and goes back to the list. */
export async function deletePoliticianNow(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const id = idFrom(form, "politicianId");
  if (id && (await deletePolitician(id, email))) {
    revalidatePath("/staff/politicians");
    redirect("/staff/politicians");
  }
}

/** Refreshes the page of whom a note is about. */
function refreshNotes(target: NoteTarget): void {
  revalidatePath(
    "supporterId" in target ? `/staff/supporters/${target.supporterId}` : `/staff/politicians/${target.politicianId}`,
  );
}

/** The form under the notes on a supporter's or a politician's page: adds one, as the staff member. */
export async function addNoteNow(form: FormData): Promise<void> {
  const staff = await requireStaff();
  const parsed = noteFrom(form);
  if (parsed && (await addNote(parsed.target, parsed.body, staff))) refreshNotes(parsed.target);
}

/** The form under a note its writer may still change: saves its new text; false if it can't, as after a day. */
export async function editNoteNow(form: FormData): Promise<boolean> {
  const staff = await requireStaff();
  const parsed = noteEditFrom(form);
  const target = parsed && (await editNote(parsed.id, parsed.body, staff));
  if (target) refreshNotes(target);
  return Boolean(target);
}

/** The button under a note its writer may still change, or under any for an admin: deletes it; false if it can't. */
export async function deleteNoteNow(form: FormData): Promise<boolean> {
  const staff = await requireStaff();
  const id = idFrom(form);
  const target = id && (await deleteNote(id, staff));
  if (target) refreshNotes(target);
  return Boolean(target);
}

/** Refreshes the pages that show a job's runs: its own, the overview of every job, and the home page's actions. */
function refreshImport(job: ImportJob): void {
  revalidatePath(importPath(job));
  revalidatePath("/staff/import-data");
  revalidatePath("/staff");
}

/**
 * Runs an import or check, unless a press of it is still running, then
 * refreshes its pages. A failure is in the import log, shown on its page like
 * a nightly one, so it's logged rather than crashing the page.
 */
async function run(job: ImportJob, email: string, work: () => Promise<unknown>): Promise<void> {
  if (await takePress(job, email)) {
    try {
      await work();
    } catch (error) {
      console.error(error);
    } finally {
      await endPress(job);
    }
  }
  refreshImport(job);
}

export async function syncNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("sync-politicians", email, () => syncPoliticians(email));
}

export async function syncEmailsNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("sync-emails", email, () => syncEmails(email));
}

export async function importWebFormLettersNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-web-form-letters", email, () => importWebFormLetters(email));
}

export async function importGoToParliamentNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-go-to-parliament", email, () => importGoToParliament(email));
}

export async function importOldLettersNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-old-letters", email, () => importOldLetters(email));
}

export async function checkNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("check-mps", email, () => checkMps(email));
}

export async function importControlAiNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-controlai", email, () => importControlAiLetter(email));
}

export async function importLumaNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-luma", email, () => importLuma(email));
}

export async function importMembersNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-members", email, () => importMembers(email));
}

export async function sendNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("send-mailings", email, () => runSending(email));
}

export async function tidyNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("tidy-logs", email, () => runTidying(email));
}

export async function readGmailNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("read-gmail", email, () => readGmail(email));
}

export async function decideSync(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const id = idFrom(form);
  const decision = form.get("decision");
  if (!id || (decision !== "apply" && decision !== "discard")) return;
  await decideHeldSync(id, decision, email);
  refreshImport("sync-politicians");
}

/**
 * Unblocks an address, on either blocked emails page or a politician's.
 * Any address but a politician's needs `supporters`, as its page does. If
 * the provider can't be reached, it's logged and the address stays blocked.
 */
export async function unblockAddress(form: FormData): Promise<void> {
  const { email, permissions } = await requireStaff();
  const parsed = unblockFrom(form);
  if (!parsed) return;
  if (!permissions.includes("supporters") && !(await isPoliticianAddress(parsed.address))) return;
  try {
    await unblock(parsed.address, email, parsed.note);
  } catch (error) {
    console.error(error);
  }
  // The addresses page, the politicians list and their pages all show it.
  revalidatePath("/staff", "layout");
}

/** Where the accounts page goes after a change: back to itself, saying why if the change was refused. */
function accountsPage(change: AccountChange | "removed"): never {
  revalidatePath("/staff/accounts");
  redirect(change === "changed" || change === "unchanged" ? "/staff/accounts" : `/staff/accounts?notice=${change}`);
}

/**
 * The accounts page: gives an address an account with exactly the
 * permissions in the form, adding it if it has none, as the admin. A
 * change refused (the last admin, an address not at pauseai.uk) is said on
 * the page.
 */
export async function saveStaffAccountNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("admin");
  const parsed = permissionsFrom(form);
  if (!parsed) return;
  accountsPage(await saveStaffAccount(parsed.email, parsed.permissions, email));
}

/** The accounts page: removes an account, ending its sessions, and says what that leaves them. */
export async function removeStaffAccountNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("admin");
  const parsed = permissionsFrom(form);
  if (!parsed) return;
  const change = await removeStaffAccount(parsed.email, email);
  accountsPage(change === "changed" ? "removed" : change);
}

/** The accounts page: ends every session of an account, as the admin; their own included, which logs them out. */
export async function endStaffSessionsNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("admin");
  const parsed = permissionsFrom(form);
  if (!parsed) return;
  await endStaffSessions(parsed.email, email);
  accountsPage("changed");
}

/**
 * Erases a supporter, from their page, then goes to the list, which says
 * so, and what couldn't be cleared afterwards, if anything. A supporter
 * that's already gone is nothing to do.
 */
export async function eraseSupporterNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("supporters");
  const parsed = eraseFrom(form);
  if (!parsed) return;
  const result = await eraseSupporter(parsed.id, parsed.reference, email);
  if (!result) return;
  revalidatePath("/staff", "layout");
  redirect(erasedPath(result.notCleared));
}

/** Disconnects your own Gmail, from your page, going back to it saying so, in place of how connecting went. */
export async function disconnectMyGmail(): Promise<void> {
  const { email } = await requireStaff();
  await disconnectGmail(email, email);
  revalidatePath("/staff/me");
  redirect("/staff/me?gmail=disconnected");
}

/**
 * Where an ask's form goes after a save: `back`, or the asks page; or the
 * form again, saying why not; or, the ask deleted meanwhile, the asks page
 * saying so, as its form is gone too.
 */
function afterAsk(slug: string, back: string, result: { saved: boolean; reason?: string }, saved: string): never {
  revalidatePath("/staff/asks");
  if (result.reason === "gone") redirect("/staff/asks?notice=gone");
  const form = slug ? `/staff/asks/${slug}/edit` : "/staff/asks/new";
  const [path, query = ""] = (result.saved ? back : form).split("?");
  const params = new URLSearchParams(query);
  params.set("notice", result.saved ? saved : result.reason!);
  if (!result.saved) params.set("back", back);
  redirect(`${path}?${params}`);
}

/** An ask's form: adds the ask, or with its slug, saves it; then goes back to where it was opened from. */
export async function saveAskNow(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const slug = String(form.get("slug") ?? "");
  const back = staffBack(String(form.get("back") ?? ""), "/staff/asks");
  const parsed = askFrom(form);
  if (!parsed) afterAsk(slug, back, { saved: false, reason: "invalid" }, "");
  afterAsk(
    slug,
    back,
    slug ? await editAsk(slug, parsed, email) : await addAsk(parsed, email),
    slug ? "saved" : "added",
  );
}

/** An ask's Delete: deletes it, while nothing refers to it, then goes to the asks page. */
export async function deleteAskNow(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const slug = String(form.get("slug") ?? "");
  afterAsk(slug, "/staff/asks", await deleteAsk(slug, email), "deleted");
}
