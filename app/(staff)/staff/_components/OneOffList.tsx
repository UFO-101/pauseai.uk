import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import { ONE_OFF_FILTERS } from "@/lib/one-off";
import type { OneOffThreadRow } from "@/lib/server/one-off-emails";
import { filtersPath, pageParam } from "@/lib/staff-search";
import { staffDate } from "@/lib/staff-time";
import ListFrame, { ListTable, type ListColumn } from "./ui/ListFrame";
import StaffLink from "./ui/StaffLink";
import Tabs from "./ui/Tabs";

const PATH = "/staff/mailings/one-off";
const copy = staffCopy.oneOff;

/** The list's columns: when, the thread, the politicians in it, who began it, and who's in it. */
const oneOffColumns: ListColumn<OneOffThreadRow>[] = [
  { key: "when", label: copy.columns.when, short: true, cell: (t) => staffDate(t.latestAt) },
  {
    key: "subject",
    label: copy.columns.subject,
    cell: (t) => (
      <StaffLink href={`${PATH}/${t.id}`}>{t.subject === null ? copy.hidden : t.subject || copy.noSubject}</StaffLink>
    ),
  },
  {
    key: "politician",
    label: copy.columns.politician,
    cell: (t) =>
      t.people.length === 0 ? (
        <Muted>{copy.noPolitician}</Muted>
      ) : (
        t.people.map((person) => (
          <div key={person.id}>
            <StaffLink href={`/staff/politicians/${person.id}`}>{person.name}</StaffLink>
          </div>
        ))
      ),
  },
  { key: "from", label: copy.columns.from, cell: (t) => t.from ?? <Muted>–</Muted> },
  {
    key: "who",
    label: copy.columns.who,
    short: true,
    cell: (t) => (
      <Tag tone={t.someoneElse ? "amber" : undefined}>{copy.filters[t.someoneElse ? "someone-else" : "pauseai"]}</Tag>
    ),
  },
];

/** A politician's or supporter's one-off emails, on their page; nothing with none. */
export function OneOffTable({ threads }: { threads: OneOffThreadRow[] }) {
  if (threads.length === 0) return null;
  return (
    <>
      <h2>{copy.onPageTitle}</h2>
      <ListTable columns={oneOffColumns} rows={threads} rowKey={(t) => t.id} />
    </>
  );
}

/** The one-off emails: a filter for "PauseAI" or "Someone else", then a row for each thread, newest first. */
export default function OneOffList({
  threads,
  total,
  page,
  pages,
  pageSize,
  who,
}: {
  threads: OneOffThreadRow[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  who: string;
}) {
  return (
    <>
      <Tabs
        label={copy.filter}
        current={who || "all"}
        tabs={[
          { key: "all", label: copy.all, href: PATH },
          ...ONE_OFF_FILTERS.map((value) => ({ key: value, label: copy.filters[value], href: `${PATH}?who=${value}` })),
        ]}
      />
      <ListFrame
        count={copy.threads(total)}
        total={total}
        page={page}
        pages={pages}
        pageSize={pageSize}
        href={(n) => filtersPath(PATH, { who, page: "" }, pageParam(n))}
        columns={oneOffColumns}
        rows={threads}
        rowKey={(t) => t.id}
        empty={copy.none}
      />
    </>
  );
}
