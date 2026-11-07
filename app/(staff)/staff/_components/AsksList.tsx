import Tag, { type TagTone } from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { ASK_STATUSES, askHref } from "@/lib/asks";
import { askGroups, askPeriod } from "@/lib/ask-groups";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AskWithCounts } from "@/lib/server/asks";
import { askedLine } from "./AskLine";
import AskKindIcon from "./AskKindIcon";
import AskWays from "./AskWays";
import Counts from "./ui/Counts";
import Grid, { spanClass } from "./ui/Grid";
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

/** How far an ask has gone: who was written to, in how many letters, and who replied. */
export function askCounts(ask: AskWithCounts) {
  const letters = ask.ways.reduce((total, way) => total + way.letters, 0);
  return [
    { key: "writtenTo", n: ask.writtenTo, label: copy.page.writtenTo },
    { key: "letters", n: letters, label: copy.page.lettersWord(letters) },
    { key: "replied", n: ask.replied, label: copy.page.replied },
  ];
}

/** An ask's lozenges: how many gave each answer its kind allows, then those written to with no answer. */
function Answers({ ask }: { ask: AskWithCounts }) {
  if (answersOf(ask).length === 0 && !ask.noAnswer)
    return (
      <span className={styles.nothing}>
        <Muted>{copy.noAnswers}</Muted>
      </span>
    );
  return (
    <div className={styles.answers}>
      {answersOf(ask).map((status) => (
        <Tag key={status} tone={ANSWER_TONES[status]}>
          {staffCopy.statuses[status]} <strong>{ask.counts[status]!.toLocaleString("en-GB")}</strong>
        </Tag>
      ))}
      {ask.noAnswer > 0 && (
        <span className={styles.noAnswer}>
          {staffCopy.statuses.noAnswer} <strong>{ask.noAnswer.toLocaleString("en-GB")}</strong>
        </span>
      )}
    </div>
  );
}

/** One ask's row: who asked them to do what and when, its title and its answers; the campaigns and mailings that asked it; and how it stands. */
function AskRow({ ask, picked, Title }: { ask: AskWithCounts; picked: boolean; Title: "h2" | "h3" }) {
  return (
    <li id={ask.slug} className={styles.ask} aria-current={picked || undefined}>
      <div className={styles.what}>
        <span className={styles.asked}>
          <AskKindIcon kind={ask.kind} size={16} />
          {[askedLine(ask), askPeriod(ask)].filter(Boolean).join(" · ")}
        </span>
        <Title className={styles.title}>
          <StaffLink href={askHref(ask.slug)}>{ask.title}</StaffLink>
        </Title>
        <Answers ask={ask} />
      </div>
      {ask.ways.length > 0 && (
        <div className={styles.how}>
          <AskWays ways={ask.ways} />
        </div>
      )}
      <div className={styles.standing}>
        <Counts small counts={askCounts(ask)} />
      </div>
    </li>
  );
}

/**
 * Every ask, as the list of mailings sets out its rows: events still to come,
 * then the rest under their months and years (askGroups). A row's ID is its
 * slug, so a link can lead to it, the one `picked` tinted; over them, `notice`,
 * how the last save or delete went.
 */
export default function AsksList({
  asks,
  now,
  notice = "",
  picked = "",
}: {
  asks: AskWithCounts[];
  /** What divides what's to come from what's gone, and which months have their own heading. */
  now: Date;
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
      {asks.length === 0 ? (
        <p>{copy.none}</p>
      ) : (
        <Grid>
          <div className={spanClass(6)}>
            {askGroups(asks, now).map((group) => (
              <section key={group.key} className={styles.group} aria-label={group.heading || undefined}>
                {group.heading && <h2>{group.heading}</h2>}
                <ol className={styles.list}>
                  {group.items.map((ask) => (
                    <AskRow key={ask.slug} ask={ask} picked={ask.slug === picked} Title={group.heading ? "h3" : "h2"} />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </Grid>
      )}
    </>
  );
}
