import { staffCopy } from "@/lib/content/staff-interface";
import { firstOf } from "@/lib/staff-search";
import type { FilterWordsData } from "@/lib/server/mailing-pages";
import { politicianFilters } from "./PoliticianFilters";
import { filterWords } from "./ui/FilterBar";
import styles from "./MailingParts.module.css";

// Pieces of the mailing pages: the filter that chose who a mailing is to.

const copy = staffCopy.mailingPages;

/** Who a mailing is to: its filter, as the politicians list's chips say it, as pills that can't be changed here. */
export function FilterPills({ data }: { data: FilterWordsData }) {
  const { params } = data.filter;
  // The house is the list's tabs, not one of its filters, so it comes first, on its own.
  const house = staffCopy.houses[firstOf(params.house)];
  // The search in quotes, so it reads as what was typed.
  const search = firstOf(params.q);
  const words = [
    ...(house ? [house] : []),
    ...(search ? [copy.searchPill(search)] : []),
    ...filterWords(politicianFilters(firstOf(params.ask), data.parties, data.asks), { ...params, q: "" }, "q"),
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
