"use server";

// The staff interface's Server Actions. Each is a public endpoint, so each
// calls requireStaff() before anything else (tests/checks/staff-auth.test.ts).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ImportJob, importPath } from "@/lib/import-runs";
import { now } from "@/lib/now";
import {
  accountsFrom,
  eraseFrom,
  idFrom,
  permissionsFrom,
  politicianDetailsFrom,
  signedFrom,
  unblockFrom,
} from "@/lib/staff-forms";
import { importControlAiLetter } from "@/lib/server/controlai-import";
import { unblock } from "@/lib/server/email";
import { eraseSupporter } from "@/lib/server/erasure";
import { importLuma } from "@/lib/server/luma-import";
import { importMembers } from "@/lib/server/members-import";
import { checkMps } from "@/lib/server/mp-check";
import { decideHeldSync, syncMps } from "@/lib/server/mp-sync";
import { setStatus, updatePolitician } from "@/lib/server/politicians";
import { importSignatories } from "@/lib/server/signatory-import";
import { requireStaff } from "@/lib/server/staff-auth";
import { type AccountChange, removeStaffAccount, saveStaffAccount } from "@/lib/server/staff-accounts";

/** The button in the politicians list: marks one as signed today, or as not signed. */
export async function markSigned(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const parsed = signedFrom(form);
  if (!parsed) return;
  const today = now().toISOString().slice(0, 10);
  await setStatus(
    parsed.politicianId,
    parsed.campaign,
    { status: parsed.signed ? "signed" : null, date: parsed.signed ? today : null, note: "" },
    email,
  );
  revalidatePath("/staff/politicians");
}

export async function editSigner(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const id = idFrom(form);
  const details = politicianDetailsFrom(form);
  if (!id || !details) return;
  await updatePolitician(id, details, email);
  revalidatePath(`/staff/politicians/${id}`);
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
  await run("sync-mps", syncMps(email));
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

export async function importFromAirtable(): Promise<void> {
  const { email } = await requireStaff();
  await run("import-signatories", importSignatories(email));
}

export async function decideSync(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const id = idFrom(form);
  const decision = form.get("decision");
  if (!id || (decision !== "apply" && decision !== "discard")) return;
  await decideHeldSync(id, decision, email);
  refreshImport("sync-mps");
}

/**
 * Unblocks an address, on the addresses page or a politician's. If the
 * provider can't be reached, it's logged and the address stays blocked.
 */
export async function unblockAddress(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const parsed = unblockFrom(form);
  if (!parsed) return;
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

/** The accounts page: gives an address an account with exactly the permissions ticked, as the admin. */
export async function saveStaffAccountNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("admin");
  const parsed = permissionsFrom(form);
  if (!parsed) return;
  accountsPage(await saveStaffAccount(parsed.email, parsed.permissions, email));
}

/**
 * The accounts page's Save: gives each account in the table exactly the
 * permissions ticked in its row, one after another, as the admin. A change
 * refused (the last admin) is said on the page; the others are kept.
 */
export async function saveStaffAccountsNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("admin");
  let result: AccountChange = "unchanged";
  for (const account of accountsFrom(form)) {
    const change = await saveStaffAccount(account.email, account.permissions, email);
    if (change !== "changed" && change !== "unchanged") result = change;
  }
  accountsPage(result);
}

/** The accounts page: removes an account, ending its sessions. */
export async function removeStaffAccountNow(form: FormData): Promise<void> {
  const { email } = await requireStaff("admin");
  const parsed = permissionsFrom(form);
  if (!parsed) return;
  accountsPage(await removeStaffAccount(parsed.email, email));
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
