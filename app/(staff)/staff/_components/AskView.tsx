import { buttonClass } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import { askPeriod } from "@/lib/ask-groups";
import { staffCopy } from "@/lib/content/staff-interface";
import { filtersPath, pageParam } from "@/lib/staff-search";
import type { AskAnswer, AskAnswerGroup, AskPageData } from "@/lib/server/asks";
import { staffDate } from "@/lib/staff-time";
import { answeredOf, ANSWER_TONES, askCounts } from "./AsksList";
import Band, { BandFact } from "./ui/Band";
import Counts from "./ui/Counts";
import Grid, { Card } from "./ui/Grid";
import ListFrame, { type ListColumn } from "./ui/ListFrame";
import StaffLink from "./ui/StaffLink";
import { askedLine } from "./AskLine";
import AskKindIcon from "./AskKindIcon";
import AskWays from "./AskWays";
import styles from "./AskView.module.css";
import TestTag from "./TestTag";
import ExternalLink from "./ui/ExternalLink";

const copy = staffCopy.asks;
const page = copy.page;

/** What a column of answers is called. */
function groupName(key: string): string {
  if (key === "other") return page.otherAnswers;
  return staffCopy.statuses[key === "none" ? "noAnswer" : key];
}

/** The colour over each column: that of its answer, and amber for the rarer ones together. */
const GROUP_TONES: Record<string, string | undefined> = { ...ANSWER_TONES, other: "amber" };

const answerColumns: ListColumn<AskAnswer>[] = [
  {
    key: "politician",
    label: page.politician,
    cell: (a) => (
      <>
        <StaffLink href={`/staff/politicians/${a.politicianId}`}>{a.name}</StaffLink>
        <TestTag isTest={a.isTest} />
        <div>
          <Muted>{[a.constituency, a.party].filter(Boolean).join(" · ")}</Muted>
        </div>
      </>
    ),
  },
  {
    key: "answer",
    label: page.answer,
    short: true,
    cell: (a) =>
      a.status ? (
        <Tag tone={ANSWER_TONES[a.status]}>{staffCopy.statuses[a.status]}</Tag>
      ) : (
        <Muted>{staffCopy.statuses.noAnswer}</Muted>
      ),
  },
  {
    key: "lastWrittenTo",
    label: page.lastWrittenTo,
    short: true,
    cell: (a) => (a.lastWrittenTo ? staffDate(a.lastWrittenTo) : <Muted>–</Muted>),
  },
];

/**
 * The top of one answer's column: its name and how many gave it, in its
 * colour, leading to all of them. With an answer chosen (`answer`), its own
 * top is marked, and leads back to the columns.
 */
function ColumnHead({ group, path, answer = "" }: { group: AskAnswerGroup; path: string; answer?: string }) {
  const current = group.key === answer;
  const heading = (
    <>
      <span>{groupName(group.key)}</span> <strong>{group.total.toLocaleString("en-GB")}</strong>
    </>
  );
  return (
    <h2 className={styles.columnHead}>
      {group.total > 0 ? (
        <StaffLink
          href={current ? path : `${path}?answer=${group.key}`}
          aria-current={current || undefined}
          title={current ? page.showAll : undefined}
        >
          {heading}
        </StaffLink>
      ) : (
        <span>{heading}</span>
      )}
    </h2>
  );
}

/**
 * One answer's column: its top, and the first few who gave it. Someone whose
 * answer differs from the column's name is tagged with theirs.
 */
function AnswerColumn({ group, path }: { group: AskAnswerGroup; path: string }) {
  return (
    <section className={styles.column} data-tone={GROUP_TONES[group.key]}>
      <ColumnHead group={group} path={path} />
      {group.people.length === 0 ? (
        <p className={styles.columnFoot}>
          <Muted>{page.none}</Muted>
        </p>
      ) : (
        <ul className={styles.people}>
          {group.people.map((person) => (
            <li key={person.politicianId}>
              <span className={styles.person}>
                <StaffLink href={`/staff/politicians/${person.politicianId}`}>{person.name}</StaffLink>
                <TestTag isTest={person.isTest} />
                <Muted>{person.party}</Muted>
              </span>
              {person.status && person.status !== group.key && (
                <Tag tone={ANSWER_TONES[person.status]}>{staffCopy.statuses[person.status]}</Tag>
              )}
            </li>
          ))}
        </ul>
      )}
      {group.total > group.people.length && (
        <p className={styles.columnFoot}>
          <StaffLink href={`${path}?answer=${group.key}`}>{page.allOf(group.total)}</StaffLink>
        </p>
      )}
    </section>
  );
}

/**
 * Those who gave one answer, a page at a time, under the tops of the columns,
 * which choose an answer; the one chosen, pressed again, goes back to the
 * columns. The list's edge is in the chosen answer's colour.
 */
function ChosenAnswer({ ask, answer, path }: { ask: AskPageData; answer: string; path: string }) {
  return (
    <>
      <nav className={`${styles.columns} ${styles.heads}`} aria-label={page.answersTitle}>
        {ask.groups.map((group) => (
          <div key={group.key} className={styles.column} data-tone={GROUP_TONES[group.key]}>
            <ColumnHead group={group} path={path} answer={answer} />
          </div>
        ))}
      </nav>
      <section className={styles.chosen} data-tone={GROUP_TONES[answer]} aria-label={page.answersTitle}>
        <ListFrame
          count={staffCopy.campaigns.politicians(ask.answersTotal)}
          total={ask.answersTotal}
          page={ask.page}
          pages={ask.pages}
          pageSize={ask.pageSize}
          href={(n) => filtersPath(path, { answer, page: "" }, pageParam(n))}
          columns={answerColumns}
          rows={ask.answers}
          rowKey={(a) => a.politicianId}
          empty={page.none}
        />
      </section>
    </>
  );
}

/**
 * An ask's page, in a mailing's shape: over its title what they were asked to
 * do, its date and where to read it; then its answers, a column each, or those
 * of the one chosen; a link to those who answered on the politicians list; and last how we asked, how many were written to, its letters and
 * who replied at its top right, and each campaign and mailing under its kind.
 * It has no letters of its own. An ask the code names can't be edited.
 */
export default function AskView({ ask, answer }: { ask: AskPageData; answer: string }) {
  const path = `/staff/asks/${ask.slug}`;
  const answered = answeredOf(ask);
  return (
    <div className={styles.page}>
      <Band
        title={ask.title}
        corner={
          !ask.fixed && (
            <StaffLink className={buttonClass({ variant: "ghost", size: "small", fit: true })} href={`${path}/edit`}>
              {copy.edit}
            </StaffLink>
          )
        }
      >
        <BandFact label={page.asked}>
          <span className={styles.asked}>
            <AskKindIcon kind={ask.kind} size={18} />
            {askedLine(ask)}
          </span>
        </BandFact>
        <BandFact label={ask.kind === "letter" ? page.when : page.on}>{askPeriod(ask)}</BandFact>
        <BandFact label={page.readIt[ask.kind]}>
          {ask.url &&
            (ask.url.startsWith("/") ? (
              <StaffLink href={ask.url}>{page.theLink[ask.kind]}</StaffLink>
            ) : (
              <ExternalLink href={ask.url}>{page.theLink[ask.kind]}</ExternalLink>
            ))}
        </BandFact>
      </Band>
      {answered === 0 && ask.noAnswer === 0 ? (
        <Grid>
          <Card span={6} as="div" title={page.answersTitle} id="answers">
            <p>
              <Muted>{page.none}</Muted>
            </p>
          </Card>
        </Grid>
      ) : answer ? (
        <ChosenAnswer ask={ask} answer={answer} path={path} />
      ) : (
        <section className={styles.columns} aria-label={page.answersTitle}>
          {ask.groups.map((group) => (
            <AnswerColumn key={group.key} group={group} path={path} />
          ))}
        </section>
      )}
      <p className={styles.toPoliticians}>
        <StaffLink href={`/staff/politicians?ask=${ask.slug}`}>{page.everyone}</StaffLink>
      </p>
      <Grid>
        <Card
          span={6}
          look="aside"
          title={page.howWeAsked}
          id="how-we-asked"
          action={
            <div className={styles.howCounts}>
              <Counts small counts={askCounts(ask)} />
            </div>
          }
        >
          {ask.ways.length === 0 ? (
            <p>
              <Muted>{page.noWay}</Muted>
            </p>
          ) : (
            <AskWays ways={ask.ways} wide />
          )}
        </Card>
      </Grid>
    </div>
  );
}
