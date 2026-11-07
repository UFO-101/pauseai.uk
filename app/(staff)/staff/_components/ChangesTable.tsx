import { staffCopy } from "@/lib/content/staff-interface";
import { CHANGE_SORTS, type ChangeSort } from "@/lib/change-sort";
import { filtersPath, pageParam, type ChangesSearch, type Params } from "@/lib/staff-search";
import { parseSort, sortHref } from "@/lib/staff-sort";
import { staffClock, staffDate } from "@/lib/staff-time";
import type { ChangesPage, LoggedChange } from "@/lib/server/audit";
import AuditDetail from "./AuditDetail";
import { LoggedJson } from "./Logged";
import SortHeading from "./SortHeading";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import Withheld from "./ui/Withheld";
import styles from "./ChangesTable.module.css";

const copy = staffCopy.changes;
const PATH = "/staff/audit-log";

/**
 * The audit log's columns: the day and time; who; what; the details, in
 * words; and at the right, a button that opens the details as logged,
 * which a download has in place of the words. `airtableTable` is the table
 * an Airtable ID in the details is a record of.
 */
export function changeColumns(airtableTable: string): ListColumn<LoggedChange>[] {
  return [
    { key: "day", label: copy.day, short: true, text: (c) => c.at, cell: (c) => staffDate(c.at) },
    { key: "at", label: copy.at, short: true, cell: (c) => staffClock(c.at) },
    { key: "actor", label: copy.actor, text: (c) => c.actor, cell: (c) => c.actor },
    { key: "action", label: copy.action, text: (c) => c.action, cell: (c) => c.action },
    { key: "details", label: copy.details, cell: (c) => <AuditDetail change={c} airtableTable={airtableTable} /> },
    {
      key: "json",
      label: copy.json,
      heading: (
        <th key="json">
          <span className={styles.hidden}>{copy.json}</span>
        </th>
      ),
      text: (c) => JSON.stringify(c.details),
      cell: (c) => <LoggedJson id={`json-${c.id}`} details={c.details} />,
    },
  ];
}

/** What the log's URL says but its page: its filters and sort. */
export function changeFiltersOf(search: ChangesSearch): Params {
  const { page, filter, ...kept } = search as ChangesSearch & { filter?: unknown };
  void page;
  void filter;
  return kept;
}

/**
 * The log of who changed what, in the list frame: how many, its downloads of
 * what the filters find, in the order chosen, a page of it and the way through
 * the pages. The date, who and what sort it, newest first unless another is chosen.
 */
export default function ChangesTable({
  log,
  search,
  page,
  supporters = true,
  airtableTable,
}: {
  log: ChangesPage;
  search: ChangesSearch;
  page: number;
  /** Whether they may see entries about supporters; if not, it says they're left out. */
  supporters?: boolean;
  airtableTable: string;
}) {
  const kept = changeFiltersOf(search);
  const current = parseSort(CHANGE_SORTS, "day", search.sort, search.dir);
  const columns = changeColumns(airtableTable).map((column) =>
    column.key in CHANGE_SORTS
      ? {
          ...column,
          heading: (
            <SortHeading
              key={column.key}
              sortKey={column.key as ChangeSort}
              current={current}
              href={sortHref(PATH, kept, CHANGE_SORTS, current, column.key as ChangeSort)}
            >
              {column.label}
            </SortHeading>
          ),
        }
      : column,
  );
  return (
    <>
      {!supporters && (
        <p>
          <Withheld>{copy.withheld}</Withheld>
        </p>
      )}
      <ListFrame
        count={copy.total(log.total)}
        total={log.total}
        page={page}
        pages={log.pages}
        pageSize={log.pageSize}
        href={(n) => filtersPath(PATH, kept, pageParam(n))}
        download={(format) => filtersPath(`${PATH}/download`, { format, ...kept, saved: "" })}
        columns={columns}
        rows={log.changes}
        rowKey={(c) => c.id}
        empty={copy.none}
      />
    </>
  );
}
