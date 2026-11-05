import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import { staffCopy } from "@/lib/content/staff-interface";
import type { SentEmail, SentPerson } from "@/lib/server/sent-emails";
import { filtersPath, pageParam, type SentEmailsSearch } from "@/lib/staff-search";
import { staffTime } from "@/lib/staff-time";
import FilterBar, { type Filter } from "./ui/FilterBar";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import StaffLink from "./ui/StaffLink";
import styles from "./SentEmails.module.css";

const PATH = "/staff/sent-emails";
const copy = staffCopy.sentEmails;

const filters: Filter[] = [
  {
    name: "purpose",
    label: copy.filters.purpose,
    repeat: true,
    options: Object.entries(copy.purposes).map(([value, label]) => ({ value, label })),
  },
  {
    name: "outcome",
    label: copy.filters.outcome,
    repeat: true,
    options: Object.entries(copy.outcomes).map(([value, label]) => ({ value, label })),
  },
  {
    name: "backend",
    label: copy.filters.backend,
    repeat: true,
    options: Object.entries(copy.backends).map(([value, label]) => ({ value, label })),
  },
];

/** Someone an email is to or from: their name, linked if it can be, over their address; or the address alone. */
function Person({ person, address }: { person: SentPerson | null; address: string | null }) {
  if (!person?.name) return <>{address}</>;
  return (
    <>
      <div>{person.href ? <StaffLink href={person.href}>{person.name}</StaffLink> : person.name}</div>
      <Muted>{address}</Muted>
    </>
  );
}

/** A row's outcome: red for what didn't reach them. */
function Outcome({ outcome }: { outcome: string }) {
  return <Tag tone={outcome === "sent" ? undefined : "red"}>{copy.outcomes[outcome] ?? outcome}</Tag>;
}

const columns: ListColumn<SentEmail>[] = [
  { key: "when", label: copy.columns.when, short: true, cell: (e) => staffTime(e.at) },
  {
    key: "what",
    label: copy.columns.what,
    short: true,
    cell: (e) => (
      <>
        {copy.purposes[e.purpose] ?? e.purpose}
        {e.imported && (
          <div>
            <Tag tone="blue">{copy.imported}</Tag>
          </div>
        )}
      </>
    ),
  },
  { key: "to", label: copy.columns.to, cell: (e) => <Person person={e.to} address={e.address} /> },
  {
    key: "from",
    label: copy.columns.from,
    cell: (e) => (
      <>
        <Person person={e.from} address={e.fromAddress} />
        <div>
          <Muted>{copy.backends[e.backend]}</Muted>
        </div>
      </>
    ),
  },
  { key: "subject", label: copy.columns.subject, cell: (e) => e.subject },
  { key: "outcome", label: copy.columns.outcome, short: true, cell: (e) => <Outcome outcome={e.outcome} /> },
  {
    key: "links",
    label: copy.columns.links,
    short: true,
    cell: (e) => (
      <>
        {e.letterHref && (
          <div>
            <StaffLink href={e.letterHref}>{copy.letterLink}</StaffLink>
          </div>
        )}
        {e.campaignHref && (
          <div>
            <StaffLink href={e.campaignHref}>{copy.campaignLink}</StaffLink>
          </div>
        )}
        {e.mailingHref && (
          <div>
            <StaffLink href={e.mailingHref}>{copy.mailingLink}</StaffLink>
          </div>
        )}
      </>
    ),
  },
];

/**
 * The send log, for admins: a heading only a screen reader reads, as the
 * menu names the page; a search and filters; then a row for each email.
 * A row never shows the email's text.
 */
export default function SentEmails({
  emails,
  total,
  pages,
  page,
  pageSize,
  search,
}: {
  emails: SentEmail[];
  total: number;
  pages: number;
  page: number;
  pageSize: number;
  search: SentEmailsSearch;
}) {
  const kept = { ...search, page: "" };
  return (
    <>
      <h1 className={styles.heading}>{staffCopy.nav.sentEmails}</h1>
      <FilterBar path={PATH} values={search} search={{ name: "q", label: copy.search }} filters={filters} />
      <ListFrame
        count={copy.total(total)}
        total={total}
        page={page}
        pages={pages}
        pageSize={pageSize}
        href={(n) => filtersPath(PATH, kept, pageParam(n))}
        columns={columns}
        rows={emails}
        rowKey={(e) => e.id}
        empty={copy.none}
      />
    </>
  );
}
