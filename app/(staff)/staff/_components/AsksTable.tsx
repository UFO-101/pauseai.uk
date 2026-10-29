import Link from "next/link";
import Actions from "@/components/ui/Actions";
import { ButtonLink } from "@/components/ui/Button";
import styles from "./AsksTable.module.css";
import { ASK_STATUSES, FIXED_ASKS } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AskWithCounts } from "@/lib/server/asks";
import { staffDate } from "@/lib/staff-time";
import Strip from "./ui/Strip";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import { Muted } from "@/components/ui/Text";

const copy = staffCopy.asks;

/** Who asks it: supporters, PauseAI, or both, a line each. */
function AskedBy({ ask }: { ask: AskWithCounts }) {
  return ask.askedBy.map((asker) => <div key={asker}>{copy.askedBy[asker]}</div>);
}

/** An ask's title, linked to the letter or the event if we know where it is. A link to another site opens in a new tab. */
function Title({ ask }: { ask: AskWithCounts }) {
  if (!ask.url) return ask.title;
  return ask.url.startsWith("/") ? (
    <Link href={ask.url}>{ask.title}</Link>
  ) : (
    <a href={ask.url} target="_blank" rel="noreferrer">
      {ask.title}
    </a>
  );
}

/** The answers an ask's kind allows that some politicians gave. */
const answersOf = (ask: AskWithCounts) => ASK_STATUSES[ask.kind].filter((status) => ask.counts[status]);

/**
 * The asks' columns: its kind, title and date, who asks it, and how many
 * politicians gave each answer its kind allows, each count linked to the
 * politicians who gave it.
 */
export const askColumns: ListColumn<AskWithCounts>[] = [
  {
    key: "kind",
    label: copy.columns.kind,
    short: true,
    text: (a) => copy.kinds[a.kind],
    cell: (a) => copy.kinds[a.kind],
  },
  { key: "ask", label: copy.columns.ask, text: (a) => a.title, cell: (a) => <Title ask={a} /> },
  {
    key: "date",
    label: copy.columns.date,
    short: true,
    text: (a) => a.date,
    cell: (a) => a.date && staffDate(a.date),
  },
  {
    key: "askedBy",
    label: copy.columns.askedBy,
    text: (a) => a.askedBy.map((asker) => copy.askedBy[asker]).join("; "),
    cell: (a) => <AskedBy ask={a} />,
  },
  {
    key: "answers",
    label: copy.columns.answers,
    text: (a) =>
      answersOf(a)
        .map((status) => copy.count(staffCopy.statuses[status], a.counts[status]!))
        .join("; "),
    cell: (a) =>
      answersOf(a).length === 0 ? (
        <Muted>{copy.noAnswers}</Muted>
      ) : (
        answersOf(a).map((status, i) => (
          <span key={status}>
            {i > 0 && " · "}
            <Link href={`/staff/politicians?ask=${a.slug}&answer=${status}`}>
              {copy.count(staffCopy.statuses[status], a.counts[status]!)}
            </Link>
          </span>
        ))
      ),
  },
];

/** Each ask's Edit, but for those the code names, which staff can't change. */
const editColumn: ListColumn<AskWithCounts> = {
  key: "edit",
  label: "",
  short: true,
  cell: (a) =>
    !FIXED_ASKS.includes(a.slug) && (
      <ButtonLink href={`/staff/asks/${a.slug}`} variant="ghost" size="small" fit>
        {copy.edit}
      </ButtonLink>
    ),
};

/** Every ask, newest first, in the list frame: how many, their downloads, a row each with Edit; under them, Add an ask; over them, `notice`, how the last save or delete went. */
export default function AsksTable({ asks, notice = "" }: { asks: AskWithCounts[]; notice?: string }) {
  return (
    <>
      {copy.notices[notice] && (
        <Strip tone={["added", "saved", "deleted"].includes(notice) ? "green" : "amber"} announce>
          {copy.notices[notice]}
        </Strip>
      )}
      <ListFrame
        count={copy.total(asks.length)}
        total={asks.length}
        page={1}
        pages={1}
        pageSize={asks.length}
        download={(format) => `/staff/asks/download?format=${format}`}
        columns={[...askColumns, editColumn]}
        rows={asks}
        rowKey={(a) => a.slug}
        empty={copy.none}
      />
      <div className={styles.add}>
        <Actions>
          <ButtonLink href="/staff/asks/new" variant="primary" fit>
            {copy.add}
          </ButtonLink>
        </Actions>
      </div>
    </>
  );
}
