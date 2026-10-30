import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingSummary } from "@/lib/server/mailings";
import type { DownloadColumn } from "@/lib/staff-list";

const copy = staffCopy.mailings;

/** A count's column. */
function count(key: "sent" | "skipped" | "bounced" | "replied" | "answered"): DownloadColumn<MailingSummary> {
  return { key, label: copy.columns[key], text: (m) => m[key] };
}

/**
 * The mailings download's columns: its title and the ask it makes; who
 * sent it, or that it was copied from Airtable, and when; how many it went
 * to, skipped, bounced, got a reply from and had its ask answered by.
 */
export const mailingColumns: DownloadColumn<MailingSummary>[] = [
  { key: "title", label: copy.columns.title, text: (m) => m.title },
  { key: "ask", label: copy.columns.ask, text: (m) => m.askTitle },
  { key: "sender", label: copy.columns.sender, text: (m) => (m.imported ? copy.imported : m.fromName) },
  { key: "sentAt", label: copy.columns.sentAt, text: (m) => m.sentAt },
  count("sent"),
  count("skipped"),
  count("bounced"),
  count("replied"),
  count("answered"),
];
