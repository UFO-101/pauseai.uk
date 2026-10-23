import Link from "next/link";
import { Muted } from "@/components/ui/Text";
import { campaignBySlug, campaignPath, displayPostcode } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffDate, staffTime } from "@/lib/staff-time";
import { givenPlaces, supporterPlace } from "@/lib/supporter-place";
import type { SupporterActivity, SupporterDetails as Details, SupporterSource } from "@/lib/supporters";
import EmailPermissionTiles from "./EmailPermissionTiles";
import SupporterBadges from "./SupporterBadges";
import Grid, { Card } from "./ui/Grid";
import styles from "./Details.module.css";

const copy = staffCopy.supporters;

/** One value we hold, and where and when it came from: the sources that gave it, and the first time. */
/** `event` marks a city that's an event's they registered for, not one they gave. */
type Given = { value: string; sources: Set<SupporterSource>; since: string; event?: boolean };

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
  if (given.event) return copy.detail.fromEvent(staffDate(given.since));
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
    // status, linked to the page of the supporter's letters.
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
    return (
      <>
        {copy.lists[item.title ?? ""] ?? item.title}
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

/**
 * A supporter's page: their name and badges; one box of what we hold, each
 * value with where it came from; then everything they did, newest first.
 */
export default function SupporterDetails({ supporter }: { supporter: Details }) {
  const { summary, identities, contacts, activity, permissions } = supporter;
  const emails = distinct(identities.map((i) => ({ value: i.email, source: i.source, at: i.seenAt })));
  const phones = distinct(contacts.map((c) => ({ value: c.phone, source: c.source, at: c.at })));
  const postcodes = distinct(
    contacts.map((c) => ({ value: c.postcode, source: c.source, at: c.at })),
    displayPostcode,
  );
  // The cities they gave us; failing those, their newest event's (supporterPlace).
  const given = distinct(givenPlaces(contacts).map((c) => ({ value: c.city, source: c.source, at: c.at })));
  const place = supporterPlace(contacts);
  const cities: Given[] =
    given.length > 0 || !place?.city
      ? given
      : [{ value: place.city, sources: new Set([place.source]), since: new Date(place.at).toISOString(), event: true }];
  return (
    <>
      <h1>
        {summary.name ?? copy.noName} <SupporterBadges supporter={summary} />
      </h1>

      <Grid>
        <Card span={4} as="div">
          <dl className={styles.facts}>
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
        </Card>
        <Card span={2} look="aside" title={copy.detail.listsTitle} id="subscriptions">
          <EmailPermissionTiles permissions={permissions} />
        </Card>
        <Card span={6} look="log" title={copy.detail.activityTitle} id="history">
          {activity.length === 0 ? (
            <p className={styles.none}>{copy.detail.noActivity}</p>
          ) : (
            <ol className={styles.history} aria-label={copy.detail.activityTitle}>
              {activity.map((item, i) => (
                <li key={i}>
                  <span className={styles.when}>{staffTime(item.at)}</span>
                  <span>
                    {copy.detail.kinds[item.kind]}{" "}
                    <Subject item={item} letters={`/staff/letters/supporter/${summary.id}`} />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </Grid>
    </>
  );
}
