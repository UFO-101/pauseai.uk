// Reads the staff interface's forms. Anything that doesn't fit is refused
// (undefined) rather than guessed at.
import { trackedCampaigns } from "@/lib/email-your-mp";
import { PERMISSIONS, type Permission } from "@/lib/staff-permissions";

const HOUSES = ["commons", "lords", "scottish-parliament", "senedd", "ni-assembly", "other"];

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** A positive whole number, such as a row's ID. */
export function idFrom(form: FormData, name = "id"): number | undefined {
  const value = text(form, name);
  return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : undefined;
}

export type PoliticianDetailsForm = {
  house: "commons" | "lords" | "scottish-parliament" | "senedd" | "ni-assembly" | "other";
  name: string;
  salutation: string;
  constituency: string | null;
  party: string;
  email: string | null;
};

export function politicianDetailsFrom(form: FormData): PoliticianDetailsForm | undefined {
  const house = text(form, "house");
  const name = text(form, "name");
  if (!HOUSES.includes(house) || !name) return undefined;
  return {
    house: house as PoliticianDetailsForm["house"],
    name,
    salutation: text(form, "salutation"),
    constituency: text(form, "constituency") || null,
    party: text(form, "party"),
    email: text(form, "email") || null,
  };
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

/** Unblocking an address: which, and the note for the audit log. */
export function unblockFrom(form: FormData): UnblockForm | undefined {
  const address = text(form, "address").toLowerCase();
  if (!address.includes("@")) return undefined;
  return { address, note: text(form, "note") };
}

export type PermissionsForm = { email: string; permissions: Permission[] };

/**
 * The permissions form: whose, and each permission's checkbox, named
 * "permission:<name>", ticked or not.
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
