"use server";

// The staff interface's Server Actions. Each is a public endpoint, so each
// calls requireStaff() before anything else (tests/checks/staff-auth.test.ts).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ImportJob, importPath } from "@/lib/import-runs";
import { now } from "@/lib/now";
import { eraseFrom, idFrom, permissionsFrom, statusFrom, unblockFrom } from "@/lib/staff-forms";
import { importControlAiLetter } from "@/lib/server/controlai-import";
import { isPoliticianAddress, unblock } from "@/lib/server/email";
import { eraseSupporter } from "@/lib/server/erasure";
import { importLuma } from "@/lib/server/luma-import";
import { importMembers } from "@/lib/server/members-import";
import { checkMps } from "@/lib/server/mp-check";
import { decideHeldSync, syncPoliticians } from "@/lib/server/politician-sync";
import { syncEmails } from "@/lib/server/emails-sync";
import { importGoToParliament } from "@/lib/server/go-to-parliament-import";
import { importWebFormLetters } from "@/lib/server/web-form-import";
import { deletePolitician, setStatus } from "@/lib/server/politicians";
import { requireStaff } from "@/lib/server/staff-auth";
import {
  type AccountChange,
  endStaffSessions,
  removeStaffAccount,
  saveStaffAccount,
} from "@/lib/server/staff-accounts";

/** The form on a politician's page: sets their answer to an ask, dated today, with its note, or clears it. */
export async function setAskStatus(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const parsed = statusFrom(form);
  if (!parsed) return;
  const today = now().toISOString().slice(0, 10);
  await setStatus(
    parsed.politicianId,
    parsed.ask,
    { status: parsed.status, date: parsed.status ? today : null, note: parsed.status ? parsed.note : "" },
    email,
  );
  revalidatePath("/staff/politicians");
  revalidatePath(`/staff/politicians/${parsed.politicianId}`);
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

/** Refreshes the pages that show a job's runs: its own, the overview of every job, and the home page's actions. */
function refreshImport(job: ImportJob): void {
  revalidatePath(importPath(job));
  revalidatePath("/staff/import-data");
  revalidatePath("/staff");
}

/**
 * Runs an import or check, then refreshes its pages. A failure is in the
 * import log, shown on its page like a nightly one, so it's logged rather
 * than crashing the page.
 */
async function run(job: ImportJob, work: Promise<unknown>): Promise<void> {
  try {
    await work;
  } catch (error) {
    console.error(error);
  }
  refreshImport(job);
}

export async function syncNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("sync-politicians", syncPoliticians(email));
}

export async function syncEmailsNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("sync-emails", syncEmails(email));
}

export async function importWebFormLettersNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-web-form-letters", importWebFormLetters(email));
}

export async function importGoToParliamentNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-go-to-parliament", importGoToParliament(email));
}

export async function checkNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("check-mps", checkMps(email));
}

export async function importControlAiNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-controlai", importControlAiLetter(email));
}

export async function importLumaNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-luma", importLuma(email));
}

export async function importMembersNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-members", importMembers(email));
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
function accountsPage(change: AccountChange): never {
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

/** The accounts page: removes an account, ending its sessions. */
export async function removeStaffAccountNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("admin");
  const parsed = permissionsFrom(form);
  if (!parsed) return;
  accountsPage(await removeStaffAccount(parsed.email, email));
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
 * so. A supporter that's already gone is nothing to do.
 */
export async function eraseSupporterNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("supporters");
  const parsed = eraseFrom(form);
  if (!parsed) return;
  const result = await eraseSupporter(parsed.id, parsed.reference, email);
  if (!result) return;
  revalidatePath("/staff", "layout");
  redirect("/staff/supporters?erased=1");
}
