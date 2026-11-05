import { buttonClass } from "@/components/ui/Button";
import { Muted } from "@/components/ui/Text";
import Tag, { type TagTone } from "@/components/ui/Tag";
import { ASK_STATUSES } from "@/lib/asks";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AskAnswer, AskPageData, AskWay } from "@/lib/server/asks";
import { staffDate } from "@/lib/staff-time";
import { answeredOf } from "./AsksTable";
import Band, { BandFact } from "./ui/Band";
import Counts from "./ui/Counts";
import Grid, { Card } from "./ui/Grid";
import { ListTable, type ListColumn } from "./ui/ListFrame";
import Progress from "./ui/Progress";
import StaffLink from "./ui/StaffLink";
import SegmentLinks from "./ui/SegmentLinks";
import styles from "./AskView.module.css";

const copy = staffCopy.asks;
const page = copy.page;

/** Who asked and what, in the words a politician's page uses. */
function askedLine(ask: AskPageData): string {
  const who = new Intl.ListFormat("en-GB").format(ask.askedBy.map((asker) => copy.askedBy[asker]));
  return staffCopy.politician.askedThem(who, ask.kind);
}

/** A way's dates: its first and last days, or one day. */
function dates(way: AskWay): string {
  if (!way.from || !way.to) return "";
  const from = staffDate(way.from);
  const to = staffDate(way.to);
  return from === to ? from : `${from} – ${to}`;
}

/** Answers that are a yes, in green; a no, in red. */
const ANSWER_TONES: Record<string, TagTone | undefined> = {
  signed: "green",
  going: "green",
  declined: "red",
  declined_surgery: "red",
};

const answerColumns: ListColumn<AskAnswer>[] = [
  {
    key: "politician",
    label: page.politician,
    cell: (a) => (
      <>
        <StaffLink href={`/staff/politicians/${a.politicianId}`}>{a.name}</StaffLink>
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
 * An ask's page, in a mailing's shape: over its title what they were asked
 * to do, its date and where to read it, with its counts; how many answered;
 * then every campaign and mailing that put it, by date, beside its answers.
 * It has no letters of its own. An ask the code names can't be edited.
 */
export default function AskView({ ask, answer }: { ask: AskPageData; answer: string }) {
  const path = `/staff/asks/${ask.slug}`;
  const answers = ASK_STATUSES[ask.kind].filter((status) => ask.counts[status]);
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
        aside={
          <Counts
            counts={[
              { key: "writtenTo", n: ask.writtenTo, label: page.writtenTo },
              { key: "answered", n: answered, label: page.answered },
            ]}
          />
        }
      >
        <BandFact label={page.asked}>{askedLine(ask)}</BandFact>
        <BandFact label={ask.kind === "letter" ? page.started : page.on}>{ask.date && staffDate(ask.date)}</BandFact>
        <BandFact label={page.readIt[ask.kind]}>
          {ask.url &&
            (ask.url.startsWith("/") ? (
              <StaffLink href={ask.url}>{page.theLink[ask.kind]}</StaffLink>
            ) : (
              <a href={ask.url} target="_blank" rel="noreferrer">
                {page.theLink[ask.kind]}
              </a>
            ))}
        </BandFact>
      </Band>
      {ask.writtenTo > 0 && (
        <Grid>
          <Card span={6} as="div">
            <Progress value={ask.writtenTo - ask.noAnswer} max={ask.writtenTo} tone="green" label={page.answered} big>
              {page.bar(ask.writtenTo - ask.noAnswer, ask.writtenTo, ask.kind)}
            </Progress>
          </Card>
        </Grid>
      )}
      <Grid>
        <Card span={3} look="aside" title={page.howWeAsked} id="how-we-asked">
          {ask.ways.length === 0 ? (
            <p>
              <Muted>{page.noWay}</Muted>
            </p>
          ) : (
            <ul className={styles.ways}>
              {ask.ways.map((way) => (
                <li key={way.href}>
                  <Muted>{dates(way)}</Muted>
                  <span>
                    <Tag tone={way.kind === "campaign" ? "amber" : "blue"}>{page[way.kind]}</Tag>{" "}
                    <StaffLink href={way.href}>{way.title}</StaffLink>
                  </span>
                  <span>{page.letters(way.letters)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card span={3} as="div" title={page.answersTitle} id="answers">
          {answered === 0 && ask.noAnswer === 0 ? (
            <p>
              <Muted>{page.none}</Muted>
            </p>
          ) : (
            <>
              {/* Each shows those who gave that answer; pressed again, everyone. */}
              <SegmentLinks
                label={page.answersTitle}
                links={[
                  ...answers.map((status) => [status, staffCopy.statuses[status], ask.counts[status]!, false] as const),
                  ...(ask.noAnswer ? [["none", staffCopy.statuses.noAnswer, ask.noAnswer, true] as const] : []),
                ].map(([key, words, n, quiet]) => ({
                  key,
                  words: `${words} ${n}`,
                  href: key === answer ? path : `${path}?answer=${key}`,
                  quiet,
                  current: key === answer,
                  title: key === answer ? page.showAll : undefined,
                }))}
              />
              <ListTable columns={answerColumns} rows={ask.answers} rowKey={(a) => a.politicianId} />
              <p>
                <StaffLink href={`/staff/politicians?ask=${ask.slug}`}>{page.everyone}</StaffLink>
              </p>
            </>
          )}
        </Card>
      </Grid>
    </div>
  );
}
