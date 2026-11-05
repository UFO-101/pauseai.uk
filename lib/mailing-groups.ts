import { staffCopy } from "@/lib/content/staff-interface";
import { monthsAndYears } from "@/lib/dated-groups";
import type { MailingSummary } from "@/lib/server/mailings";

/** A heading of the mailings page, and its mailings in order. */
export type MailingGroup<T extends MailingSummary = MailingSummary> = { key: string; heading: string; mailings: T[] };

/**
 * When a mailing went, for its group, as an ISO string: its first letter
 * sent, or else when it was due, or last changed. The database gives these
 * as Dates, so each is read as one.
 */
export function mailingWhen(mailing: MailingSummary): string {
  return new Date(mailing.sentAt ?? mailing.dueAt ?? mailing.updatedAt).toISOString();
}

/**
 * The mailings page's groups: Coming up, of those sending, then those
 * scheduled, soonest first, then the drafts, newest edited first; then
 * the rest under their months and years (monthsAndYears).
 */
export function mailingGroups<T extends MailingSummary>(
  { drafts, comingUp, sent }: { drafts: T[]; comingUp: T[]; sent: T[] },
  now: Date,
): MailingGroup<T>[] {
  const coming = [...comingUp.filter((m) => m.state === "sending"), ...comingUp.filter((m) => m.state !== "sending")];
  const groups: MailingGroup<T>[] = [];
  if (coming.length + drafts.length > 0) {
    groups.push({ key: "coming", heading: staffCopy.mailingPages.comingUp, mailings: [...coming, ...drafts] });
  }
  for (const { key, heading, items } of monthsAndYears(sent, mailingWhen, now)) {
    groups.push({ key, heading, mailings: items });
  }
  return groups;
}
