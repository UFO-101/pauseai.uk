import { buttonClass } from "@/components/ui/Button";
import Tag, { type TagTone } from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { AGREED_STATUSES, ASK_STATUSES, askHref, FIXED_ASKS } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AskWithCounts } from "@/lib/server/asks";
import type { DownloadColumn } from "@/lib/staff-list";
import { staffDate } from "@/lib/staff-time";
import Strip from "./ui/Strip";
import StaffLink from "./ui/StaffLink";
import styles from "./AsksList.module.css";

const copy = staffCopy.asks;

/** Each answer's colour: green for a yes, red for a no, amber for what's in between. */
export const ANSWER_TONES: Record<string, TagTone | undefined> = {
  signed: "green",
  going: "green",
  tentative: "amber",
  meeting_staff: "amber",
  tentative_staff: "amber",
  declined: "red",
  declined_surgery: "red",
};

/** The answers an ask's kind allows that some politicians gave. */
const answersOf = (ask: AskWithCounts) => ASK_STATUSES[ask.kind].filter((status) => ask.counts[status]);

/** How many politicians gave any answer. */
export const answeredOf = (ask: AskWithCounts) => Object.values(ask.counts).reduce((total: number, n) => total + n!, 0);

/** How many politicians agreed to it. */
export const agreedOf = (ask: AskWithCounts) =>
  AGREED_STATUSES.reduce((total, status) => total + (ask.counts[status] ?? 0), 0);

/** The campaigns and mailings that put it, in words. */
export const howAsked = (ask: AskWithCounts) =>
  [
    ask.campaigns ? copy.page.way(ask.campaigns, "campaign") : "",
    ask.mailings ? copy.page.way(ask.mailings, "mailing") : "",
  ]
    .filter(Boolean)
    .join(" · ");

/** The asks' columns in a download, the kind leading: read with the title as a sentence, "We ask them to" sign this. */
export const askColumns: DownloadColumn<AskWithCounts>[] = [
  { key: "kind", label: copy.columns.kind, text: (a) => copy.kinds[a.kind] },
  { key: "ask", label: copy.columns.ask, text: (a) => a.title },
  {
    key: "askedBy",
    label: copy.columns.askedBy,
    text: (a) => a.askedBy.map((asker) => copy.askedBy[asker]).join("; "),
  },
  { key: "how", label: copy.columns.how, text: (a) => howAsked(a) },
  {
    key: "answers",
    label: copy.columns.answers,
    text: (a) =>
      answersOf(a)
        .map((status) => copy.count(staffCopy.statuses[status], a.counts[status]!))
        .join("; "),
  },
  { key: "writtenTo", label: copy.columns.writtenTo, text: (a) => String(a.writtenTo) },
  { key: "answered", label: copy.columns.answered, text: (a) => String(answeredOf(a)) },
  { key: "date", label: copy.columns.date, text: (a) => a.date },
];

/**
 * An ask's lozenges: how many gave each answer its kind allows, each leading
 * to the politicians who gave it, then those written to with no answer,
 * leading to its own page, which lists them.
 */
function Answers({ ask }: { ask: AskWithCounts }) {
  if (answersOf(ask).length === 0 && !ask.noAnswer) return <Muted>{copy.noAnswers}</Muted>;
  return (
    <div className={styles.answers}>
      {answersOf(ask).map((status) => (
        <StaffLink key={status} href={`/staff/politicians?ask=${ask.slug}&answer=${status}`}>
          <Tag tone={ANSWER_TONES[status]}>
            {staffCopy.statuses[status]} <strong>{ask.counts[status]!.toLocaleString("en-GB")}</strong>
          </Tag>
        </StaffLink>
      ))}
      {ask.noAnswer > 0 && (
        <StaffLink className={styles.noAnswer} href={`${askHref(ask.slug)}?answer=none`}>
          {staffCopy.statuses.noAnswer} <strong>{ask.noAnswer.toLocaleString("en-GB")}</strong>
        </StaffLink>
      )}
    </div>
  );
}

/**
 * Every ask, newest first, each leading with how many agreed, then what we
 * ask, its answers, and at the right its date, who asks it and how, and its
 * Edit, but for those the code names, which staff can't change. A row's ID is
 * its slug, so a link can lead to it, the one `picked` tinted; over them,
 * `notice`, how the last save or delete went.
 */
export default function AsksList({
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
      <p className={styles.count}>{copy.total(asks.length)}</p>
      {asks.length === 0 ? (
        <p>{copy.none}</p>
      ) : (
        <ol className={styles.list}>
          {asks.map((ask) => (
            <li key={ask.slug} id={ask.slug} className={styles.ask} aria-current={ask.slug === picked || undefined}>
              <div className={styles.agreed}>
                <strong data-zero={!agreedOf(ask) || undefined}>{agreedOf(ask).toLocaleString("en-GB")}</strong>
                {/* An ask's first answer is the one that means it agreed. */}
                <Muted>{staffCopy.statuses[ASK_STATUSES[ask.kind][0]]}</Muted>
              </div>
              <div className={styles.main}>
                <span className={styles.kind}>{copy.kinds[ask.kind]}</span>
                <h2 className={styles.title}>
                  <StaffLink href={askHref(ask.slug)}>{ask.title}</StaffLink>
                </h2>
                <Answers ask={ask} />
              </div>
              <div className={styles.side}>
                <div>{ask.date && staffDate(ask.date)}</div>
                {ask.askedBy.map((asker) => (
                  <div key={asker}>
                    <Muted>{copy.askedBy[asker]}</Muted>
                  </div>
                ))}
                {ask.writtenTo > 0 && (
                  <div>
                    <Muted>
                      {ask.writtenTo.toLocaleString("en-GB")} {copy.page.writtenTo}
                    </Muted>
                  </div>
                )}
                <div>
                  <Muted>{howAsked(ask)}</Muted>
                </div>
                {!FIXED_ASKS.includes(ask.slug) && (
                  <StaffLink
                    className={buttonClass({ variant: "ghost", size: "small", fit: true })}
                    href={`/staff/asks/${ask.slug}/edit`}
                  >
                    {copy.edit}
                  </StaffLink>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
