import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingSummary } from "@/lib/server/mailings";

/** A heading of the mailings page, and its mailings in order. */
export type MailingGroup = { key: string; heading: string; mailings: MailingSummary[] };

/** When a mailing went, for its group: its first letter sent, or else when it was due, or last changed. */
export function mailingWhen(mailing: MailingSummary): string {
  return mailing.sentAt ?? mailing.dueAt ?? mailing.updatedAt;
}

/**
 * The mailings page's groups: Coming up, of those sending, then those
 * scheduled, soonest first, then the drafts, newest edited first; then
 * the rest, newest first, under their month for the twelve months to
 * `now`'s, and under their year before that. A month or year with none
 * has no heading.
 */
export function mailingGroups(
  { drafts, comingUp, sent }: { drafts: MailingSummary[]; comingUp: MailingSummary[]; sent: MailingSummary[] },
  now: Date,
): MailingGroup[] {
  const coming = [...comingUp.filter((m) => m.state === "sending"), ...comingUp.filter((m) => m.state !== "sending")];
  const groups: MailingGroup[] = [];
  if (coming.length + drafts.length > 0) {
    groups.push({ key: "coming", heading: staffCopy.mailingPages.comingUp, mailings: [...coming, ...drafts] });
  }
  // The first of the month eleven months before now's, in UTC, as staffDate reads days.
  const months = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)).toISOString();
  for (const mailing of [...sent].sort((a, b) => mailingWhen(b).localeCompare(mailingWhen(a)))) {
    const when = mailingWhen(mailing);
    const byMonth = when >= months;
    const key = when.slice(0, byMonth ? 7 : 4);
    const heading = byMonth
      ? new Date(when).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
      : key;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.mailings.push(mailing);
    else groups.push({ key, heading, mailings: [mailing] });
  }
  return groups;
}
