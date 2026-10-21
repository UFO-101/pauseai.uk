import Link from "next/link";
import { Muted } from "@/components/ui/Text";
import { campaignBySlug } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffDate, staffTime } from "@/lib/staff-time";
import type { SupporterActivity, SupporterDetails as Details, SupporterSource } from "@/lib/supporters";
import SupporterBadges from "./SupporterBadges";
import styles from "./SupporterDetails.module.css";

const copy = staffCopy.supporters;

/** One value we hold, and where and when it came from: the sources that gave it, and the first time. */
type Given = { value: string; sources: Set<SupporterSource>; since: string };

/** The distinct values of a detail, each with its sources and when it was first given, oldest first. */
function distinct(items: { value: string | null; source: SupporterSource; at: string | null }[]): Given[] {
  const given = new Map<string, Given>();
  for (const item of items) {
    if (!item.value) continue;
    // The database gives a Date, the examples a string: one shape, to compare and sort.
    const at = item.at ? new Date(item.at).toISOString() : "";
    const seen = given.get(item.value);
    if (seen) {
      seen.sources.add(item.source);
      if (at && (!seen.since || at < seen.since)) seen.since = at;
    } else {
      given.set(item.value, { value: item.value, sources: new Set([item.source]), since: at });
    }
  }
  return [...given.values()].sort((a, b) => a.since.localeCompare(b.since));
}

/** Where a value came from and when, in words. */
function origin(given: Given): string {
  const sources = [...given.sources].map((source) => copy.sources[source]).join(", ");
  return given.since ? copy.detail.from(sources, staffDate(given.since)) : sources;
}

/** One line of the box: its label, then each value with where it came from. */
function Fact({ label, values }: { label: string; values: Given[] }) {
  if (values.length === 0) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>
        {values.map((given) => (
          <div key={given.value}>
            {given.value} <Muted>({origin(given)})</Muted>
          </div>
        ))}
      </dd>
    </>
  );
}

/** What an activity was about: the event, the MP and campaign, or the list. */
function Subject({ item }: { item: SupporterActivity }) {
  if (item.kind === "luma-registered") {
    const status = copy.detail.statuses[item.detail ?? ""];
    return (
      <>
        {item.href ? <Link href={item.href}>{item.title}</Link> : item.title}
        {status && <Muted> · {status}</Muted>}
      </>
    );
  }
  if (item.kind === "letter" || item.kind === "letter-replied") {
    const campaign = campaignBySlug(item.title ?? "")?.title ?? item.title;
    return (
      <>
        {item.detail}
        {campaign && <Muted> · {item.href ? <Link href={item.href}>{campaign}</Link> : campaign}</Muted>}
      </>
    );
  }
  if (item.kind === "opted-out" || item.kind === "resubscribed") {
    return (
      <>
        {copy.lists[item.title ?? ""] ?? item.title}
        {item.detail && <Muted> · {item.detail}</Muted>}
      </>
    );
  }
  return null;
}

/**
 * A supporter's page: their name and badges; one box of what we hold, each
 * value with where it came from; then everything they did, newest first.
 */
export default function SupporterDetails({ supporter }: { supporter: Details }) {
  const { summary, identities, contacts, activity, optOuts } = supporter;
  const emails = distinct(identities.map((i) => ({ value: i.email, source: i.source, at: i.seenAt })));
  const phones = distinct(contacts.map((c) => ({ value: c.phone, source: c.source, at: c.at })));
  const postcodes = distinct(contacts.map((c) => ({ value: c.postcode, source: c.source, at: c.at })));
  return (
    <>
      <h1>
        {summary.name ?? copy.noName} <SupporterBadges supporter={summary} />
      </h1>

      <dl className={styles.facts}>
        <Fact label={copy.detail.emails} values={emails} />
        <Fact label={copy.detail.phone} values={phones} />
        <Fact label={copy.detail.postcode} values={postcodes} />
        {optOuts.map((optOut) => (
          <div key={`${optOut.list}-${optOut.address}`} className={styles.pair}>
            <dt>{copy.lists[optOut.list]}</dt>
            <dd>
              {optOut.since === null ? copy.detail.notOptedOut : copy.detail.optedOut(staffDate(optOut.since))}
              {emails.length > 1 && <Muted> · {optOut.address}</Muted>}
            </dd>
          </div>
        ))}
        {summary.firstSeenAt && (
          <>
            <dt>{copy.detail.firstSeen}</dt>
            <dd>{staffDate(summary.firstSeenAt)}</dd>
          </>
        )}
        {summary.lastActiveAt && (
          <>
            <dt>{copy.detail.lastActive}</dt>
            <dd>{staffDate(summary.lastActiveAt)}</dd>
          </>
        )}
      </dl>

      <h2>{copy.detail.activityTitle}</h2>
      {activity.length === 0 ? (
        <p>{copy.detail.noActivity}</p>
      ) : (
        <ol className={styles.history} aria-label={copy.detail.activityTitle}>
          {activity.map((item, i) => (
            <li key={i}>
              <span className={styles.when}>{staffTime(item.at)}</span>
              <span>
                {copy.detail.kinds[item.kind]} <Subject item={item} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
