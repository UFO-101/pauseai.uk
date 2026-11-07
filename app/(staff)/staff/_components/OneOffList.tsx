import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { OneOffThreadRow } from "@/lib/server/one-off-emails";
import { staffTime } from "@/lib/staff-time";
import { ListTable, type ListColumn } from "./ui/ListFrame";
import StaffLink from "./ui/StaffLink";
import Withheld from "./ui/Withheld";
import TestTag from "./TestTag";

const PATH = "/staff/one-off";
const copy = staffCopy.oneOff;

const hidden = <Muted>–</Muted>;

function answered(value: boolean | null) {
  if (value === null) return hidden;
  return value ? copy.answers.yes : copy.answers.no;
}

/** The list's columns, as the style guide orders them: the thread, who's in it, whether a politician answered, its length and when, then where it was read. */
const oneOffColumns: ListColumn<OneOffThreadRow>[] = [
  {
    key: "subject",
    label: copy.columns.subject,
    cell: (t) =>
      t.subject === null ? (
        <Withheld>{copy.hidden}</Withheld>
      ) : (
        <StaffLink href={`${PATH}/${t.id}`}>{t.subject || copy.noSubject}</StaffLink>
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
            <TestTag isTest={person.isTest} />
          </div>
        ))
      ),
  },
  { key: "participants", label: copy.columns.participants, cell: (t) => t.participants?.join(", ") ?? hidden },
  { key: "answered", label: copy.columns.answered, short: true, cell: (t) => answered(t.answered) },
  { key: "messages", label: copy.columns.messages, short: true, cell: (t) => t.messages },
  { key: "when", label: copy.columns.when, short: true, cell: (t) => staffTime(t.latestAt) },
  { key: "mailbox", label: copy.columns.mailbox, cell: (t) => t.mailboxes?.join(", ") ?? hidden },
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
