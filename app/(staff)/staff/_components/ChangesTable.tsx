import { staffCopy } from "@/lib/content/staff-interface";
import { pagePath } from "@/lib/staff-search";
import { staffClock, staffDate } from "@/lib/staff-time";
import type { ChangesPage, LoggedChange } from "@/lib/server/audit";
import IconButton from "@/components/ui/IconButton";
import AuditDetail from "./AuditDetail";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
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
      cell: (c) => (
        <>
          <IconButton look="outline" size={28} aria-label={copy.json} popoverTarget={`json-${c.id}`}>
            {"{}"}
          </IconButton>
          <pre id={`json-${c.id}`} popover="auto" className={styles.json}>
            {JSON.stringify(c.details, null, 2)}
          </pre>
        </>
      ),
    },
  ];
}

/** The log of who changed what, newest first, in the list frame: how many, its downloads, a page of it and the way through the pages. */
export default function ChangesTable({
  log,
  page,
  airtableTable,
}: {
  log: ChangesPage;
  page: number;
  airtableTable: string;
}) {
  return (
    <ListFrame
      count={copy.total(log.total)}
      total={log.total}
      page={page}
      pages={log.pages}
      pageSize={log.pageSize}
      href={(n) => pagePath(PATH, n)}
      download={(format) => `${PATH}/download?format=${format}`}
      columns={changeColumns(airtableTable)}
      rows={log.changes}
      rowKey={(c) => c.id}
      empty={copy.none}
    />
  );
}
