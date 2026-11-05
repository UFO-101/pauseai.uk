import { buttonClass } from "@/components/ui/Button";
import styles from "./AsksTable.module.css";
import { ASK_STATUSES, askHref, FIXED_ASKS } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AskWithCounts } from "@/lib/server/asks";
import { staffDate } from "@/lib/staff-time";
import Strip from "./ui/Strip";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import { Muted } from "@/components/ui/Text";
import StaffLink from "./ui/StaffLink";

const copy = staffCopy.asks;

/** Who asks it: supporters, PauseAI, or both, a line each. */
function AskedBy({ ask }: { ask: AskWithCounts }) {
  return ask.askedBy.map((asker) => <div key={asker}>{copy.askedBy[asker]}</div>);
}

/** The answers an ask's kind allows that some politicians gave. */
const answersOf = (ask: AskWithCounts) => ASK_STATUSES[ask.kind].filter((status) => ask.counts[status]);

/** How many politicians gave any answer. */
export const answeredOf = (ask: AskWithCounts) =>
  Object.values(ask.counts).reduce((total: number, n) => total + (n ?? 0), 0);

/** The campaigns and mailings that put it, in words. */
const howAsked = (ask: AskWithCounts) =>
  [
    ask.campaigns ? copy.page.way(ask.campaigns, "campaign") : "",
    ask.mailings ? copy.page.way(ask.mailings, "mailing") : "",
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * The asks' columns: its kind, title and date, who asks it, how many
 * politicians gave each answer its kind allows, each count linked to the
 * politicians who gave it; how many were written to, how many answered, and how they were asked.
 */
export const askColumns: ListColumn<AskWithCounts>[] = [
  {
    key: "kind",
    label: copy.columns.kind,
    short: true,
    text: (a) => copy.kinds[a.kind],
    cell: (a) => copy.kinds[a.kind],
  },
  {
    key: "ask",
    label: copy.columns.ask,
    text: (a) => a.title,
    cell: (a) => <StaffLink href={askHref(a.slug)}>{a.title}</StaffLink>,
  },
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
            <StaffLink href={`/staff/politicians?ask=${a.slug}&answer=${status}`}>
              {copy.count(staffCopy.statuses[status], a.counts[status]!)}
            </StaffLink>
          </span>
        ))
      ),
  },
  {
    key: "writtenTo",
    label: copy.columns.writtenTo,
    short: true,
    text: (a) => String(a.writtenTo),
    cell: (a) => (a.writtenTo ? a.writtenTo.toLocaleString("en-GB") : <Muted>–</Muted>),
  },
  {
    key: "answered",
    label: copy.columns.answered,
    short: true,
    text: (a) => String(answeredOf(a)),
    cell: (a) => answeredOf(a).toLocaleString("en-GB"),
  },
  {
    key: "how",
    label: copy.columns.how,
    text: (a) => howAsked(a),
    cell: (a) => howAsked(a) || <Muted>–</Muted>,
  },
];

/** Each ask's Edit, but for those the code names, which staff can't change. */
const editColumn: ListColumn<AskWithCounts> = {
  key: "edit",
  label: "",
  end: true,
  cell: (a) =>
    !FIXED_ASKS.includes(a.slug) && (
      <StaffLink
        className={buttonClass({ variant: "ghost", size: "small", fit: true })}
        href={`/staff/asks/${a.slug}/edit`}
      >
        {copy.edit}
      </StaffLink>
    ),
};

/**
 * Every ask, newest first, in the list frame: how many, their downloads, a
 * row each with Edit, whose ID is its slug, so a link to the ask leads to
 * it (askHref), the one `picked` tinted; over them, `notice`, how the last
 * save or delete went.
 */
export default function AsksTable({
  asks,
  notice = "",
  picked = "",
}: {
  asks: AskWithCounts[];
  notice?: string;
  picked?: string;
}) {
  return (
    <>
      {copy.notices[notice] && (
        <div className={styles.notice}>
          <Strip tone={["added", "saved", "deleted"].includes(notice) ? "green" : "amber"} announce>
            {copy.notices[notice]}
          </Strip>
        </div>
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
        rowId={(a) => a.slug}
        picked={(a) => a.slug === picked}
        empty={copy.none}
        align="middle"
      />
    </>
  );
}
