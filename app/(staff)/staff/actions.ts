"use server";

// The staff interface's Server Actions. Each is a public endpoint, so each
// calls requireStaff() before anything else (scripts/check-staff-auth.mjs).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { idFrom, politicianDetailsFrom, statusFrom } from "@/lib/staff-forms";
import { decideHeldSync, syncMps } from "@/lib/server/mp-sync";
import { addPolitician, setStatus, updatePolitician } from "@/lib/server/politicians";
import { importSignatories } from "@/lib/server/signatory-import";
import { requireStaff } from "@/lib/server/staff-auth";

export async function saveStatus(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const parsed = statusFrom(form);
  if (!parsed) return;
  await setStatus(parsed.politicianId, parsed.campaign, parsed.change, email);
  revalidatePath(`/staff/politicians/${parsed.politicianId}`);
}

export async function addSigner(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const details = politicianDetailsFrom(form);
  if (!details) redirect("/staff/politicians/new?missing=1");
  const id = await addPolitician(details, email);
  redirect(`/staff/politicians/${id}`);
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
  revalidatePath("/staff/mp-sync");
}

export async function decideSync(form: FormData): Promise<void> {
  const { email } = await requireStaff();
  const id = idFrom(form);
  const decision = form.get("decision");
  if (!id || (decision !== "apply" && decision !== "discard")) return;
  await decideHeldSync(id, decision, email);
  revalidatePath("/staff/mp-sync");
}

export async function importFromAirtable(): Promise<void> {
  const { email } = await requireStaff();
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) redirect("/staff/import?unconfigured=1");
  const result = await importSignatories(token, email);
  redirect(`/staff/import?${new URLSearchParams({ matched: String(result.matched), added: String(result.added), alreadySet: String(result.alreadySet) })}`);
}
