import "server-only";
import { query, transaction } from "./db";
import { linkSupporters } from "./supporters";

// Keeping a form entry: one person filling in one of our forms once
// (form_entries; docs/domain-concepts.md, "Form entries"), and its sender
// linked to a supporter in the same transaction.

/** The forms whose entries this keeps; Email your MP's are kept with their letter (./mp-letters.ts). */
export type EntryForm = "march-2026-11";

export type FormEntry = {
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  postcode: string | null;
  /** The box to hear from us. */
  consent: boolean;
  utmSource: string | null;
};

/** What adding them to a Luma event came to, for a form that does. */
export type EntryLuma = { eventId: string; status: "added" | "skipped" | "not-configured" | "failed" };

/** Keeps an entry, and what Luma said if the form registers for an event, and links its supporter. Returns its ID. */
export async function addFormEntry(form: EntryForm, entry: FormEntry, luma?: EntryLuma): Promise<number> {
  return transaction(async (db) => {
    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO form_entries (form, name, email, phone, city, postcode, contact_consent, utm_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id::int AS id`,
      [form, entry.name, entry.email, entry.phone, entry.city, entry.postcode, entry.consent, entry.utmSource],
      db,
    );
    if (luma) {
      await query(
        "INSERT INTO form_entry_luma (entry_id, event_id, status) VALUES ($1, $2, $3)",
        [id, luma.eventId, luma.status],
        db,
      );
    }
    await linkSupporters(db);
    return id;
  });
}
