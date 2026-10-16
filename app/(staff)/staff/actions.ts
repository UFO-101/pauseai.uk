"use server";

// The staff interface's Server Actions. Each is a public endpoint, so each
// calls requireStaff() before anything else (staff-auth.test.ts).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { idFrom, politicianDetailsFrom, signedFrom } from "@/lib/staff-forms";
import { importControlAiLetter } from "@/lib/server/controlai-import";
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
  const today = new Date().toISOString().slice(0, 10);
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

export async function syncNow(): Promise<void> {
  await requireStaff();
  await syncMps();
  revalidatePath("/staff/import-data");
}

export async function checkNow(): Promise<void> {
  await requireStaff();
  await checkMps();
  revalidatePath("/staff/check-data");
}

/** Reads ControlAI's letter now. A failure is kept and shown on the page, like a nightly one. */
export async function importControlAiNow(): Promise<void> {
  await requireStaff();
  try {
    await importControlAiLetter();
  } catch (error) {
    console.error("ControlAI import failed:", error);
  }
  revalidatePath("/staff/import-data");
}

export async function decideSync(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const id = idFrom(form);
  const decision = form.get("decision");
  if (!id || (decision !== "apply" && decision !== "discard")) return;
  await decideHeldSync(id, decision, email);
  revalidatePath("/staff/import-data");
}

export async function importFromAirtable(): Promise<void> {
  const { email } = await requireStaff();
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) redirect("/staff/import-data?unconfigured=1");
  const result = await importSignatories(token, email);
  redirect(
    `/staff/import-data?${new URLSearchParams({ matched: String(result.matched), added: String(result.added), alreadySet: String(result.alreadySet) })}`,
  );
}
