import Link from "next/link";
import { Muted } from "@/components/ui/Text";
import { campaignBySlug, campaignPath, displayPostcode } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffDate, staffTime } from "@/lib/staff-time";
import type {
  SupporterActivity,
  SupporterDetails as Details,
  SupporterOptOut,
  SupporterSource,
} from "@/lib/supporters";
import SupporterBadges from "./SupporterBadges";
import styles from "./Details.module.css";

const copy = staffCopy.supporters;

/** One value we hold, and where and when it came from: the sources that gave it, and the first time. */
type Given = { value: string; sources: Set<SupporterSource>; since: string };

/**
 * The distinct values of a detail, each with its sources and when it was
 * first given, oldest first. `canon` says which values are the same thing
 * and how to show them: postcodes typed differently are one postcode.
 */
function distinct(
  items: { value: string | null; source: SupporterSource; at: string | null }[],
  canon: (value: string) => string = (value) => value,
): Given[] {
  const given = new Map<string, Given>();
  for (const raw of items) {
    if (!raw.value) continue;
    const item = { ...raw, value: canon(raw.value) };
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
            {given.value} <span className={styles.origin}>({origin(given)})</span>
          </div>
        ))}
      </dd>
    </>
  );
}

/** What an activity was about: the event, the MP and campaign, or the list. `letters` lists the supporter's letters. */
function Subject({ item, letters }: { item: SupporterActivity; letters: string }) {
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
    // The MP, linked to their page; the campaign, linked to its public page while it's still one; then a letter's
    // status, linked to the supporter's letters on the letters page.
    const campaign = campaignBySlug(item.title ?? "");
    return (
      <>
        {item.href ? <Link href={item.href}>{item.detail}</Link> : item.detail}
        <Muted>
          {item.title && (
            <>
              {` ${copy.detail.about} `}
              {campaign ? <Link href={campaignPath(campaign)}>{campaign.title}</Link> : item.title}
            </>
          )}
          {item.status && (
            <>
              {" · "}
              <Link href={letters}>{staffCopy.letters.status[item.status] ?? item.status}</Link>
            </>
          )}
        </Muted>
      </>
    );
  }
  if (item.kind === "opted-out" || item.kind === "resubscribed") {
    // The import's own opt-outs say why: what the member did with "Keep me informed".
    const reason = item.source === "airtable-import" ? copy.detail.importReasons[item.kind] : undefined;
    return (
      <>
        {copy.lists[item.title ?? ""] ?? item.title}
        {reason && <Muted> · {reason}</Muted>}
        {item.detail && <Muted> · {item.detail}</Muted>}
      </>
    );
  }
  if (item.kind === "member-joined") {
    // Where the join form was, and what they chose on it, if either says anything.
    const said = [item.detail && copy.detail.joinedOn(item.detail), copy.detail.intents[item.title ?? ""]]
      .filter(Boolean)
      .join(", ");
    return said ? <Muted>{said}</Muted> : null;
  }
  return null;
}

/** Where an address stands on a list, and why. */
function standing(optOut: SupporterOptOut): string {
  const when = optOut.at ? staffDate(optOut.at) : "";
  const via = copy.detail.via[optOut.source ?? ""];
  switch (optOut.status) {
    case "subscribed":
      return copy.detail.notOptedOut;
    case "unsubscribed":
      return via ? `${copy.detail.optedOut(when)}, ${via}` : copy.detail.optedOut(when);
    default:
      return copy.detail.joining[optOut.status](when);
  }
}

/**
 * A supporter's page: their name and badges; one box of what we hold, each
 * value with where it came from; then everything they did, newest first.
 */
export default function SupporterDetails({ supporter }: { supporter: Details }) {
  const { summary, identities, contacts, activity, optOuts } = supporter;
  const emails = distinct(identities.map((i) => ({ value: i.email, source: i.source, at: i.seenAt })));
  const phones = distinct(contacts.map((c) => ({ value: c.phone, source: c.source, at: c.at })));
  const postcodes = distinct(
    contacts.map((c) => ({ value: c.postcode, source: c.source, at: c.at })),
    displayPostcode,
  );
  const cities = distinct(contacts.map((c) => ({ value: c.city, source: c.source, at: c.at })));
  return (
    <>
      <h1>
        {summary.name ?? copy.noName} <SupporterBadges supporter={summary} />
      </h1>

      <div className={styles.layout}>
        <dl className={`${styles.facts} ${styles.main}`}>
          <Fact label={copy.detail.emails} values={emails} />
          <Fact label={copy.detail.phone} values={phones} />
          <Fact label={copy.detail.postcode} values={postcodes} />
          <Fact label={copy.detail.city} values={cities} />
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

        {optOuts.length > 0 && (
          <section className={styles.side} aria-labelledby="subscriptions">
            <h2 id="subscriptions">{copy.detail.listsTitle}</h2>
            <dl className={styles.lists}>
              {optOuts.map((optOut) => (
                <div key={`${optOut.list}-${optOut.address}`}>
                  <dt>
                    {copy.lists[optOut.list]}
                    {emails.length > 1 && <Muted> · {optOut.address}</Muted>}
                  </dt>
                  <dd>{standing(optOut)}</dd>
                  {optOut.list === "pauseai-updates" && <dd className={styles.caveat}>{copy.detail.civicrmCaveat}</dd>}
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className={styles.below} aria-labelledby="history">
          <h2 id="history">{copy.detail.activityTitle}</h2>
          {activity.length === 0 ? (
            <p>{copy.detail.noActivity}</p>
          ) : (
            <ol className={styles.history} aria-label={copy.detail.activityTitle}>
              {activity.map((item, i) => (
                <li key={i}>
                  <span className={styles.when}>{staffTime(item.at)}</span>
                  <span>
                    {copy.detail.kinds[item.kind]}{" "}
                    <Subject item={item} letters={`/staff/letters?supporter=${summary.id}`} />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
