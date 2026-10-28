import type { ReactNode } from "react";
import Link from "next/link";
import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import { campaignBySlug, campaignPath, displayPostcode } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffDate, staffTime } from "@/lib/staff-time";
import { UK_MAP_HEIGHT, UK_MAP_WIDTH, ukMapPoint, ukOutline } from "@/lib/uk-map";
import { registrationStatus } from "@/lib/supporters";
import type { SupporterActivity, SupporterDetails as Details, SupporterSource } from "@/lib/supporters";
import PermissionTiles from "./PermissionTiles";
import Grid, { Card, spanClass } from "./ui/Grid";
import { ListTable, type ListColumn } from "./ui/ListFrame";
import styles from "./Details.module.css";

const copy = staffCopy.supporters;

/** One thing we hold about them, a row of Everything we hold: what it is, its value, where it came from, and when. */
type Held = { key: string; what: string; value: ReactNode; from: string; at: string | null };

/**
 * Everything we hold about a supporter, as Everything we hold's rows:
 * every value each source record gave, as it gave it, a kind at a
 * time, oldest first; a number no topic lets us use marked, the rest of
 * the addresses and numbers links.
 */
function held(supporter: Details, usable: Set<string>): Held[] {
  const d = copy.detail;
  const from = (source: SupporterSource) => copy.sources[source];
  const byTime = (a: { at: string | null }, b: { at: string | null }) =>
    String(a.at ?? "").localeCompare(String(b.at ?? ""));
  const identities = [...supporter.identities].sort((a, b) => byTime({ at: a.seenAt }, { at: b.seenAt }));
  const names = identities
    .filter((i) => i.name)
    .map((i, n) => ({ key: `name-${n}`, what: d.held.name, value: i.name, from: from(i.source), at: i.seenAt }));
  const emails = identities.map((i, n) => ({
    key: `email-${n}`,
    what: d.emails,
    value: <a href={`mailto:${i.email}`}>{i.email}</a>,
    from: from(i.source),
    at: i.seenAt,
  }));
  const contacts = [...supporter.contacts].sort(byTime);
  const each = (what: string, value: (c: (typeof contacts)[number]) => ReactNode | null) =>
    contacts.flatMap((c, n) => {
      const shown = value(c);
      return shown === null ? [] : [{ key: `${what}-${n}`, what, value: shown, from: from(c.source), at: c.at }];
    });
  return [
    ...names,
    ...emails,
    ...each(d.phone, (c) =>
      c.phone === null ? null : usable.has(c.phone) ? (
        <a href={`tel:${c.phone}`}>{c.phone}</a>
      ) : (
        <>
          {c.phone} <Tag>{d.unusable}</Tag>
        </>
      ),
    ),
    ...each(d.postcode, (c) => (c.postcode === null ? null : displayPostcode(c.postcode))),
    ...each(d.city, (c) => c.city),
    ...each(d.held.point, (c) =>
      c.latitude === null || c.longitude === null ? null : (
        <code>
          {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
        </code>
      ),
    ),
  ];
}

/** Everything we hold's columns: when, what it is, its value, and where it came from. */
const heldColumns: ListColumn<Held>[] = [
  { key: "at", label: copy.detail.held.columns.when, short: true, cell: (h) => h.at && staffDate(h.at) },
  { key: "what", label: copy.detail.held.columns.what, short: true, cell: (h) => h.what },
  { key: "value", label: copy.detail.held.columns.value, cell: (h) => h.value },
  { key: "from", label: copy.detail.held.columns.from, cell: (h) => h.from },
];

/** What an activity was about: the event, the MP and campaign, the form, or the list. `letters` lists the supporter's letters. */
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
  if (item.kind === "form-entry") {
    // The form, then the link they came by and what Luma said, where there's either.
    const said = [item.detail && copy.detail.cameFrom(item.detail), item.status && copy.detail.luma[item.status]]
      .filter(Boolean)
      .join(" · ");
    return (
      <>
        {copy.sources[item.title ?? ""] ?? item.title}
        {said && <Muted> · {said}</Muted>}
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
 * When we've known them: from when we first saw them to their last
 * activity, one day if they're the same; and the source they first came by.
 */
function Active({ first, last, source }: { first: string | null; last: string | null; source?: SupporterSource }) {
  const days = [...new Set([first, last].filter((at): at is string => Boolean(at)).map(staffDate))];
  if (days.length === 0) return null;
  return (
    <div>
      <dt>{copy.detail.active}</dt>
      <dd>{days.join(" – ")}</dd>
      {source && <dd className={styles.origin}>{copy.detail.firstVia(copy.sources[source])}</dd>}
    </div>
  );
}

/** Where they are on a map of the UK, drawn as a line, with a dot at the place; nothing for a place off it, or none. */
function PlaceMap({ latitude, longitude }: { latitude?: number | null; longitude?: number | null }) {
  const point = latitude != null && longitude != null ? ukMapPoint(latitude, longitude) : undefined;
  if (!point) return null;
  return (
    <svg className={styles.map} viewBox={`0 0 ${UK_MAP_WIDTH} ${UK_MAP_HEIGHT}`} aria-hidden="true">
      <path d={ukOutline()} />
      <circle cx={point.x} cy={point.y} r="2.2" />
    </svg>
  );
}

/**
 * The band at the top of their page: where they are on a map; their name;
 * then where they are and what it's from, their MP, when they were active
 * and how they first came, each when known; and how many events they
 * registered for and letters they wrote, linked to the tables, which say
 * what the list's lozenges would.
 */
function Band({ supporter, events, letters }: { supporter: Details; events: number; letters: number }) {
  const { summary, mp, identities } = supporter;
  const { place } = summary;
  const first = identities[0];
  return (
    <div className={styles.band}>
      {place && <PlaceMap latitude={place.latitude} longitude={place.longitude} />}
      <div className={styles.bandMain}>
        <h1>{summary.name ?? copy.noName}</h1>
        <div className={styles.bandRow}>
          <dl className={styles.bandFacts}>
            {place?.name && (
              <div>
                <dt>{copy.detail.place}</dt>
                <dd>{[place.name, staffCopy.countries[place.country ?? ""]].filter(Boolean).join(", ")}</dd>
                <dd className={styles.origin}>{copy.detail.placeFrom[place.basis](place.given)}</dd>
              </div>
            )}
            {mp && (
              <div>
                <dt>{copy.detail.theirMp}</dt>
                <dd>
                  <Link href={`/staff/politicians/${mp.id}`}>{mp.name}</Link>
                </dd>
                <dd className={styles.origin}>{[mp.constituency, mp.party].filter(Boolean).join(" · ")}</dd>
              </div>
            )}
            <Active first={summary.firstSeenAt} last={summary.lastActiveAt} source={first?.source} />
          </dl>
          <div className={styles.counts}>
            <a href="#events">
              <strong>{events}</strong> {copy.detail.eventsCounted(events)}
            </a>
            <a href="#letters">
              <strong>{letters}</strong> {copy.detail.lettersCounted(letters)}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The events they registered for, newest first: when, which, and how it stands. */
const eventColumns: ListColumn<SupporterActivity>[] = [
  { key: "at", label: copy.detail.columns.date, short: true, cell: (a) => staffDate(a.at) },
  {
    key: "event",
    label: copy.detail.columns.event,
    cell: (a) => (a.href ? <Link href={a.href}>{a.title}</Link> : a.title),
  },
  {
    key: "status",
    label: copy.detail.columns.status,
    short: true,
    cell: (a) => registrationStatus(a.detail),
  },
];

/** Their letters, newest first: when, to whom, in which campaign, and how it stands, linked to their letters. */
function letterColumns(letters: string): ListColumn<SupporterActivity>[] {
  return [
    { key: "at", label: copy.detail.columns.date, short: true, cell: (a) => staffDate(a.at) },
    {
      key: "to",
      label: copy.detail.columns.to,
      cell: (a) => (a.href ? <Link href={a.href}>{a.detail}</Link> : a.detail),
    },
    {
      key: "campaign",
      label: copy.detail.columns.campaign,
      cell: (a) => {
        const campaign = campaignBySlug(a.title ?? "");
        return campaign ? <Link href={campaignPath(campaign)}>{campaign.title}</Link> : a.title;
      },
    },
    {
      key: "letter",
      label: copy.detail.columns.letter,
      short: true,
      cell: (a) => a.status && <Link href={letters}>{staffCopy.letters.status[a.status] ?? a.status}</Link>,
    },
  ];
}

/**
 * A supporter's page: the band of what we've worked out about them, with
 * their name; a card of whether we'd contact them, a row per topic; beside
 * it, tables of the events they registered for and their letters; then a
 * quiet foot, each row folded: everything they did, newest first, and
 * everything we hold, `erase` (the button to erase them) at its end.
 */
export default function SupporterDetails({ supporter, erase }: { supporter: Details; erase?: ReactNode }) {
  const { summary, activity, permissions } = supporter;
  const usable = new Set(permissions.filter((p) => p.channel === "phone" && p.send !== "no").map((p) => p.address));
  const holding = held(supporter, usable);
  const events = activity.filter((a) => a.kind === "luma-registered");
  const letters = activity.filter((a) => a.kind === "letter");
  const lettersPage = `/staff/letters/supporter/${summary.id}`;
  return (
    <>
      <Band supporter={supporter} events={events.length} letters={letters.length} />

      <Grid>
        <Card span={2} title={copy.detail.listsTitle} id="subscriptions">
          <PermissionTiles permissions={permissions} />
        </Card>
        <div className={`${spanClass(4)} ${styles.tables}`}>
          <section aria-labelledby="events">
            <h2 id="events">{copy.detail.eventsTitle}</h2>
            {events.length ? (
              <ListTable columns={eventColumns} rows={events} rowKey={(a) => `${a.at}${a.title}`} />
            ) : (
              <p className={styles.none}>{copy.detail.noEvents}</p>
            )}
          </section>
          <section aria-labelledby="letters">
            <h2 id="letters">{copy.detail.lettersTitle}</h2>
            {letters.length ? (
              <ListTable columns={letterColumns(lettersPage)} rows={letters} rowKey={(a) => `${a.at}${a.detail}`} />
            ) : (
              <p className={styles.none}>{copy.detail.noLetters}</p>
            )}
          </section>
        </div>
      </Grid>
      <div className={styles.foot}>
        {activity.length === 0 ? (
          <section aria-labelledby="history" className={styles.footRow}>
            <h2 id="history">{copy.detail.activityTitle}</h2>{" "}
            <span className={styles.none}>{copy.detail.noActivity}</span>
          </section>
        ) : (
          <details className={styles.footRow}>
            <summary>
              <h2 id="history">{copy.detail.activityTitle}</h2> <span className={styles.count}>{activity.length}</span>
            </summary>
            <ol className={styles.history} aria-labelledby="history">
              {activity.map((item, i) => (
                <li key={i}>
                  <span className={styles.when}>{staffTime(item.at)}</span>
                  <span>
                    {copy.detail.kinds[item.kind]} <Subject item={item} letters={lettersPage} />
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}
        <details className={styles.footRow}>
          <summary>
            <h2 id="everything">{copy.detail.everythingTitle}</h2>{" "}
            <span className={styles.count}>{holding.length}</span>
          </summary>
          <ListTable columns={heldColumns} rows={holding} rowKey={(h) => h.key} />
          {erase && <div className={styles.erase}>{erase}</div>}
        </details>
      </div>
    </>
  );
}
