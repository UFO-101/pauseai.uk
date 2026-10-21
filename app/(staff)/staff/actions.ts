"use server";

// The staff interface's Server Actions. Each is a public endpoint, so each
// calls requireStaff() before anything else (tests/checks/staff-auth.test.ts).
import { revalidatePath } from "next/cache";
import { now } from "@/lib/now";
import { idFrom, politicianDetailsFrom, signedFrom, unblockFrom } from "@/lib/staff-forms";
import { importControlAiLetter } from "@/lib/server/controlai-import";
import { unblock } from "@/lib/server/email";
import { importLuma } from "@/lib/server/luma-import";
import { checkMps } from "@/lib/server/mp-check";
import { decideHeldSync, syncMps } from "@/lib/server/mp-sync";
import { setStatus, updatePolitician } from "@/lib/server/politicians";
import { importSignatories } from "@/lib/server/signatory-import";
import { requireStaff } from "@/lib/server/staff-auth";

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

/**
 * Runs an import or check, then refreshes its page. A failure is in the
 * import log, shown on the page like a nightly one, so it's logged rather
 * than crashing the page.
 */
async function run(path: string, work: Promise<unknown>): Promise<void> {
  try {
    await work;
  } catch (error) {
    console.error(error);
  }
  revalidatePath(path);
}

export async function syncNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("/staff/import-data", syncMps(email));
}

export async function checkNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("/staff/import-data", checkMps(email));
}

export async function importControlAiNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("/staff/import-data", importControlAiLetter(email));
}

export async function importLumaNow(): Promise<void> {
  const { email } = await requireStaff();
  await run("/staff/import-data", importLuma(email));
}

export async function importFromAirtable(): Promise<void> {
  const { email } = await requireStaff();
  await run("/staff/import-data", importSignatories(email));
}

export async function decideSync(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const id = idFrom(form);
  const decision = form.get("decision");
  if (!id || (decision !== "apply" && decision !== "discard")) return;
  await decideHeldSync(id, decision, email);
  revalidatePath("/staff/import-data");
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
