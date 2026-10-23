// Reads the staff interface's forms. Anything that doesn't fit is refused
// (undefined) rather than guessed at.
import { trackedCampaigns } from "@/lib/email-your-mp";
import { PERMISSIONS, type Permission } from "@/lib/staff-permissions";

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** A positive whole number, such as a row's ID. */
export function idFrom(form: FormData, name = "id"): number | undefined {
  const value = text(form, name);
  return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : undefined;
}

export type SignedForm = { politicianId: number; campaign: string; signed: boolean };

/**
 * The button in the politicians list. Only a campaign staff record by hand
 * (trackedCampaigns): the bill's status comes from ControlAI's letter alone.
 */
export function signedFrom(form: FormData): SignedForm | undefined {
  const politicianId = idFrom(form, "politicianId");
  const campaign = text(form, "campaign");
  if (!politicianId || !trackedCampaigns.some((c) => c.slug === campaign)) return undefined;
  return { politicianId, campaign, signed: text(form, "signed") === "1" };
}

export type UnblockForm = { address: string; note: string };

/** Unblocking an address: which, and the note for the audit log; none without both. */
export function unblockFrom(form: FormData): UnblockForm | undefined {
  const address = text(form, "address").toLowerCase();
  const note = text(form, "note");
  if (!address.includes("@") || !note) return undefined;
  return { address, note };
}

export type PermissionsForm = { email: string; permissions: Permission[] };

/**
 * One account: whose, and each permission's checkbox, named
 * "permission:<name>", ticked or not: the accounts table sends one per
 * change, and the form to remove someone only whose.
 */
export function permissionsFrom(form: FormData): PermissionsForm | undefined {
  const email = text(form, "email").toLowerCase();
  if (!email.includes("@")) return undefined;
  return { email, permissions: PERMISSIONS.filter((permission) => form.get(`permission:${permission}`) !== null) };
}

export type EraseForm = { id: number; reference: string };

/** The erase form on a supporter's page: whom, and the request's reference, which must be given. */
export function eraseFrom(form: FormData): EraseForm | undefined {
  const id = idFrom(form);
  const reference = text(form, "reference");
  if (!id || !reference || text(form, "confirm") === "") return undefined;
  return { id, reference };
}
