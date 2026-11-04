import { staffCopy } from "@/lib/content/staff-interface";
import { pickedWho } from "@/lib/mailing-picks";
import { firstOf, type Params, type Picked } from "@/lib/staff-search";
import { staffDate } from "@/lib/staff-time";
import type { FilterWordsData } from "@/lib/server/mailing-pages";
import { politicianFilters } from "./PoliticianFilters";
import { filterWords } from "./ui/FilterBar";
import styles from "./MailingParts.module.css";

// Pieces of the mailing pages: who a mailing is to.

const copy = staffCopy.mailingPages;

/** The most names ticked said as pills; the rest are a count. */
const MOST_NAMES = 10;

/** A filter's words, as the politicians list's tabs and chips say them: the house first, then the search, then the chips. */
function filterPills(data: FilterWordsData, params: Params): string[] {
  // The house is the list's tabs, not one of its filters, so it comes first, on its own.
  const house = staffCopy.houses[firstOf(params.house)];
  // The search in quotes, so it reads as what was typed.
  const search = firstOf(params.q);
  return [
    ...(house ? [house] : []),
    ...(search ? [copy.searchPill(search)] : []),
    ...filterWords(politicianFilters(firstOf(params.ask), data.parties, data.asks), { ...params, q: "" }, "q"),
  ];
}

/** Who's ticked, in words: the group a filter found and when, with those added and taken off; else their names. */
function pickedPills(data: FilterWordsData, picked: Picked): string[] {
  const name = (id: number) => data.names[id] ?? `#${id}`;
  const who = pickedWho(picked);
  if (who.kind === "group") {
    const { from, plus, except } = who;
    const group = filterPills(data, from.params);
    return [
      ...(group.length ? group : [copy.everyone]),
      copy.pickedFrom(staffDate(from.at), from.found.length),
      ...plus.map((id) => copy.pickedPlus(name(id))),
      ...except.map((id) => copy.pickedExcept(name(id))),
    ];
  }
  const names = who.ids.map(name).sort((a, b) => a.localeCompare(b));
  return [
    ...names.slice(0, MOST_NAMES),
    ...(names.length > MOST_NAMES ? [copy.pickedMore(names.length - MOST_NAMES)] : []),
  ];
}

/**
 * Who a mailing is to, as pills that can't be changed here: those ticked,
 * as pickedWho says them, or, for one from before ticks, its filter, as the
 * politicians list's chips say it.
 */
export function FilterPills({ data }: { data: FilterWordsData }) {
  const { picked } = data.filter;
  const words = picked ? pickedPills(data, picked) : filterPills(data, data.filter.params);
  if (words.length === 0) {
    return <p className={styles.everyone}>{picked ? copy.pickedNone : copy.everyone}</p>;
  }
  return (
    <ul className={styles.pills} aria-label={copy.whoLabel}>
      {words.map((word) => (
        <li key={word}>{word}</li>
      ))}
    </ul>
  );
}
