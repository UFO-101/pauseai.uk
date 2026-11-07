import { staffCopy } from "@/lib/content/staff-interface";
import { WINDOW_OPTIONS } from "@/lib/staff-dashboard";
import type { SavedFiltersState } from "@/lib/server/saved-filters";
import { changesSearch, type ChangesSearch, type Params } from "@/lib/staff-search";
import { changeFiltersOf } from "./ChangesTable";
import FilterBar, { filteredName, filterWords, type Filter } from "./ui/FilterBar";
import { savedFiltersProps, type SavedFilterActions } from "./ui/SavedFilters";

const copy = staffCopy.changes;
const PATH = "/staff/audit-log";

/** The choices the log's filters offer: everyone in it, and everything they've done. */
export type ChangeChoices = { actors: string[]; actions: string[] };

/** The log's filters, in its columns' order: how recent; who and what, each of which can be chosen more than once. */
function changeFilters({ actors, actions }: ChangeChoices): Filter[] {
  return [
    { name: "when", label: copy.at, options: WINDOW_OPTIONS },
    { name: "actor", label: copy.actor, repeat: true, options: actors.map((value) => ({ value, label: value })) },
    { name: "action", label: copy.action, repeat: true, options: actions.map((value) => ({ value, label: value })) },
  ];
}

/** The log's search and filters that are on, in words, as their chips say them; who and what say themselves, so need no choices. */
export function changeWords(search: ChangesSearch): string[] {
  return filterWords(changeFilters({ actors: [], actions: [] }), changeFiltersOf(search), "q");
}

/** Search and filter the audit log, with its `saved` filters, if they may see them, and what those can do. */
export default function ChangesFilters({
  search,
  choices,
  saved,
  actions,
}: {
  search: ChangesSearch;
  choices: ChangeChoices;
  saved?: SavedFiltersState;
  actions: SavedFilterActions;
}) {
  const values = changeFiltersOf(search);
  return (
    <FilterBar
      path={PATH}
      values={values}
      search={{ name: "q", label: copy.search }}
      filters={changeFilters(choices)}
      saved={
        saved &&
        savedFiltersProps({
          state: saved,
          actions,
          list: "audit-log",
          values,
          path: PATH,
          name: filteredName(copy.title, changeWords(search)),
          summary: (params: Params) => changeWords(changesSearch(params)),
        })
      }
    />
  );
}
