import Link from "next/link";
import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingGroup } from "@/lib/mailing-groups";
import { mailingWhen } from "@/lib/mailing-groups";
import type { MailingSummary } from "@/lib/server/mailings";
import { named } from "@/lib/named-address";
import { londonWhenShort, staffDate } from "@/lib/staff-time";
import Counts from "./ui/Counts";
import Grid, { spanClass } from "./ui/Grid";
import Progress from "./ui/Progress";
import styles from "./MailingsOverview.module.css";

const copy = staffCopy.mailingPages;

/**
 * How a mailing sent went, in the order it happens: what went out, what
 * didn't arrive, then what came back; the same in the list and on its page.
 */
export function mailingCounts(mailing: MailingSummary) {
  return [
    { key: "sent", n: mailing.sent, label: copy.counts.sent },
    { key: "skipped", n: mailing.skipped, label: copy.counts.skipped },
    { key: "bounced", n: mailing.bounced, label: copy.counts.bounced, tone: "red" as const },
    { key: "replied", n: mailing.replied, label: copy.counts.replied },
    { key: "answered", n: mailing.ask ? mailing.answered : null, label: copy.counts.answered, tone: "green" as const },
  ];
}

/**
 * When, at a row's left: when a draft was last saved; when one scheduled
 * goes, or one sending started, in blue, as it's going out; the day one
 * went, with its year when that's not `year`.
 */
function When({ mailing, year }: { mailing: MailingSummary; year: string }) {
  if (mailing.state === "draft") return <Muted>{copy.savedAt(staffDate(mailing.updatedAt))}</Muted>;
  if (mailing.state === "scheduled" || mailing.state === "sending") {
    return <strong className={styles.due}>{londonWhenShort(mailing.dueAt!)}</strong>;
  }
  const day = staffDate(mailingWhen(mailing));
  return <>{day.endsWith(year) ? day.slice(0, -5) : day}</>;
}

/**
 * How it stands, at a row's right, only what matters there: a draft's
 * Draft and how many it's to; one scheduled the same; one sending, its
 * bar; one sent, its counts, the box leading to it as its title does.
 */
function Standing({ mailing, href }: { mailing: MailingSummary; href: string }) {
  if (mailing.state === "draft" || mailing.state === "scheduled") {
    return (
      <span className={styles.state}>
        <Tag tone={mailing.state === "scheduled" ? "blue" : undefined}>{copy.states[mailing.state]}</Tag>
        {copy.toCount(mailing.to)}
      </span>
    );
  }
  if (mailing.state === "sending") {
    return (
      <Link href={href} className={styles.bar}>
        <Progress value={mailing.sent + mailing.skipped} max={mailing.to} tone="blue" label={copy.sentLabel}>
          {copy.sendingBar(mailing.sent, mailing.to)}
        </Progress>
      </Link>
    );
  }
  return <Counts counts={mailingCounts(mailing)} href={href} label={copy.countsLabel(mailing.title)} small />;
}

/** One mailing, a row: when; its title, leading to it, over who it's from, name and address, and its ask; how it stands. */
function Row({ mailing, year }: { mailing: MailingSummary; year: string }) {
  const href = `/staff/mailings/${mailing.id}`;
  // Its name, as a mail app shows it, before its address; with no name of its own, the address alone.
  const from = mailing.imported
    ? staffCopy.mailings.imported
    : named(mailing.fromName === mailing.sentFrom ? null : mailing.fromName, mailing.sentFrom);
  return (
    <li className={styles.row}>
      <span className={styles.when}>
        <When mailing={mailing} year={year} />
      </span>
      <span className={styles.what}>
        <Link href={href} className={styles.title}>
          {mailing.title || copy.untitled}
        </Link>
        <Muted>
          {from}
          {mailing.ask && (
            <>
              {from ? " · " : ""}
              {staffCopy.mailings.columns.ask}{" "}
              <Link href={`/staff/politicians?ask=${mailing.ask}`}>{mailing.askTitle}</Link>
            </>
          )}
        </Muted>
      </span>
      <span className={styles.standing}>
        <Standing mailing={mailing} href={href} />
      </span>
    </li>
  );
}

/**
 * The list of mailings, in its groups (mailingGroups): what's coming up,
 * then the months and years of those sent, each mailing a row that shows
 * only what matters at its stage. Nothing on it changes a mailing: that's
 * done on the mailing's own page, on purpose. It's as wide as the grid,
 * not the window.
 */
export default function MailingsOverview({ groups, now }: { groups: MailingGroup[]; now: string }) {
  if (groups.length === 0) {
    return (
      <p>
        <Muted>{staffCopy.mailings.none}</Muted>
      </p>
    );
  }
  const year = now.slice(0, 4);
  // On the grid, all of its row, so the page is no wider than the grid's six columns.
  return (
    <Grid>
      <div className={spanClass(6)}>
        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`mailings-${group.key}`} className={styles.group}>
            <h2 id={`mailings-${group.key}`}>{group.heading}</h2>
            <ul className={styles.rows}>
              {group.mailings.map((mailing) => (
                <Row key={mailing.id} mailing={mailing} year={year} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Grid>
  );
}
