import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingSummary } from "@/lib/server/mailings";
import { firstOf } from "@/lib/staff-search";
import type { FilterWordsData } from "@/lib/server/mailing-pages";
import { politicianFilters } from "./PoliticianFilters";
import { filterWords } from "./ui/FilterBar";
import styles from "./MailingParts.module.css";

// Pieces of the mailing pages: the filter that chose who a mailing is to,
// and how many it went to and what came back.

const copy = staffCopy.mailingPages;

/** Who a mailing is to: its filter, as the politicians list's chips say it, as pills that can't be changed here. */
export function FilterPills({ data }: { data: FilterWordsData }) {
  const { params } = data.filter;
  // The house is the list's tabs, not one of its filters, so it comes first, on its own.
  const house = staffCopy.houses[firstOf(params.house)];
  const words = [
    ...(house ? [house] : []),
    ...filterWords(politicianFilters(firstOf(params.ask), data.parties, data.asks), params, "q"),
  ];
  if (words.length === 0) return <p className={styles.everyone}>{copy.everyone}</p>;
  return (
    <ul className={styles.pills} aria-label={copy.whoLabel}>
      {words.map((word) => (
        <li key={word}>{word}</li>
      ))}
    </ul>
  );
}

/** How a mailing went: how many it was sent to, replied, bounced, were skipped and answered its ask, each a coloured count. */
export function MailingCounts({ mailing }: { mailing: MailingSummary }) {
  const counts: [keyof typeof copy.counts, number, string][] = [
    ["sent", mailing.sent, styles.green],
    ["replied", mailing.replied, styles.blue],
    ["bounced", mailing.bounced, styles.red],
    ["skipped", mailing.skipped, styles.amber],
    ["answered", mailing.answered, styles.plain],
  ];
  return (
    <ul className={styles.counts}>
      {counts.map(([key, n, tone]) => (
        <li key={key} className={tone}>
          <strong>{n}</strong>
          {copy.counts[key]}
        </li>
      ))}
    </ul>
  );
}
