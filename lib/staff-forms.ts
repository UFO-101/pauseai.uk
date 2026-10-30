// Reads the staff interface's forms. Anything that doesn't fit is refused
// (undefined) rather than guessed at.
import { ASK_STATUSES, ASKERS, type Asker, type AskKind, type AskStatus } from "@/lib/asks";
import { answeredByHand } from "@/lib/email-your-mp";
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

export type StatusForm = { politicianId: number; ask: string; status: AskStatus | null; note: string };

/**
 * Setting an answer to an ask on a politician's page: only an ask staff
 * record by hand (answeredByHand), and a status some kind of ask allows, or
 * blank to clear it, with a note of how they know. Whether the ask's kind
 * allows it is the database's to say.
 */
export function statusFrom(form: FormData): StatusForm | undefined {
  const politicianId = idFrom(form, "politicianId");
  const ask = text(form, "ask");
  const status = text(form, "status");
  const statuses: readonly string[] = Object.values(ASK_STATUSES).flat();
  const note = text(form, "note");
  if (!politicianId || !answeredByHand(ask) || (status && !statuses.includes(status)) || !note) return undefined;
  return { politicianId, ask, status: (status as AskStatus) || null, note };
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

export type AskForm = {
  title: string;
  kind: AskKind;
  date: string | null;
  url: string | null;
  askedBy: Asker[];
};

/**
 * An ask's form: a title and a kind, and maybe a date (yyyy-mm-dd), a link
 * (one of ours, from /, or another site's, https://) and who asks it.
 */
export function askFrom(form: FormData): AskForm | undefined {
  const title = text(form, "title");
  const kind = text(form, "kind");
  const date = text(form, "date");
  const url = text(form, "url");
  const askedBy = form.getAll("askedBy").filter((one): one is Asker => (ASKERS as readonly unknown[]).includes(one));
  if (!title || !Object.hasOwn(ASK_STATUSES, kind)) return undefined;
  if (date && !(/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)))) return undefined;
  if (url && !url.startsWith("https://")) return undefined;
  return { title, kind: kind as AskKind, date: date || null, url: url || null, askedBy: [...new Set(askedBy)] };
}
