import Link from "next/link";
import { Muted } from "@/components/ui/Text";
import Tag from "@/components/ui/Tag";
import { campaignBySlug, campaignPath, displayPostcode } from "@/lib/email-your-mp";
import { staffCopy } from "@/lib/content/staff-interface";
import { staffDate, staffTime } from "@/lib/staff-time";
import { givenPlaces } from "@/lib/supporter-place";
import { UK_MAP_HEIGHT, UK_MAP_WIDTH, ukMapPoint, ukOutline } from "@/lib/uk-map";
import type {
  SupporterActivity,
  SupporterDetails as Details,
  SupporterSource,
  SupporterSummary,
} from "@/lib/supporters";
import PermissionTiles from "./PermissionTiles";
import SupporterBadges from "./SupporterBadges";
import Grid, { Card, spanClass } from "./ui/Grid";
import { ListTable, type ListColumn } from "./ui/ListFrame";
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

/** The icons by the profile's details, one each: an envelope, a phone, a pin, buildings, a map, a calendar. */
const ICONS = {
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  place: (
    <>
      <path d="M12 21s7-6.3 7-12a7 7 0 1 0-14 0c0 5.7 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  // Buildings.
  city: <path d="M3 21h18M5 21V8l5-3v16M10 21V10h9v11M13 13h1M16 13h1M13 16h1M16 16h1M7 11h1M7 14h1M7 17h1" />,
  // A folded map.
  postcode: <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
  // A calendar.
  active: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
};

/** A detail's label, with its icon. */
function Label({ label, icon }: { label: string; icon: keyof typeof ICONS }) {
  return (
    <dt>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[icon]}
      </svg>
      {label}
    </dt>
  );
}

/**
 * One detail of the profile: its label, then each value, with where it
 * came from under it; with `href`, each value a link, as an email or a
 * phone number is, but for one `unusable` says no topic lets us use,
 * which is marked so.
 */
function Fact({
  label,
  values,
  icon,
  href,
  unusable = () => false,
}: {
  label: string;
  values: Given[];
  icon: keyof typeof ICONS;
  href?: (value: string) => string;
  unusable?: (value: string) => boolean;
}) {
  if (values.length === 0) return null;
  return (
    <>
      <Label label={label} icon={icon} />
      <dd>
        {values.map((given) => (
          <div key={given.value}>
            {unusable(given.value) ? (
              <>
                {given.value} <Tag>{copy.detail.unusable}</Tag>
              </>
            ) : href ? (
              <a href={href(given.value)}>{given.value}</a>
            ) : (
              given.value
            )}{" "}
            <span className={styles.origin}>{origin(given)}</span>
          </div>
        ))}
      </dd>
    </>
  );
}

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

/** When we've known them: from when we first saw them to their last activity; one day if they're the same. */
function Active({ first, last }: { first: string | null; last: string | null }) {
  const days = [...new Set([first, last].filter((at): at is string => Boolean(at)).map(staffDate))];
  if (days.length === 0) return null;
  return (
    <>
      <Label label={copy.detail.active} icon="active" />
      <dd>{days.join(" – ")}</dd>
    </>
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

/** Where they are, and what it's from, with a map; nothing when no place is known. */
function PlaceFact({ place }: { place: SupporterSummary["place"] }) {
  if (!place?.name) return null;
  return (
    <>
      <Label label={copy.detail.place} icon="place" />
      <dd>
        {place.name} <span className={styles.origin}>{copy.detail.placeFrom[place.basis](place.given)}</span>
        <PlaceMap latitude={place.latitude} longitude={place.longitude} />
      </dd>
    </>
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
    cell: (a) => copy.detail.statuses[a.detail ?? ""] ?? copy.detail.registered,
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
 * A supporter's page (design C, the profile column): their name and
 * badges; a narrow card of who they are, each detail with its icon and
 * where it came from, its email and phone links, a number we may not use
 * marked, then whether we'd contact them; beside it, tables of the events they registered for and their
 * letters, then everything they did, newest first, folded.
 */
export default function SupporterDetails({ supporter }: { supporter: Details }) {
  const { summary, identities, contacts, activity, permissions } = supporter;
  const emails = distinct(identities.map((i) => ({ value: i.email, source: i.source, at: i.seenAt })));
  const phones = distinct(contacts.map((c) => ({ value: c.phone, source: c.source, at: c.at })));
  const usable = new Set(permissions.filter((p) => p.channel === "phone" && p.send !== "no").map((p) => p.address));
  const postcodes = distinct(
    contacts.map((c) => ({ value: c.postcode, source: c.source, at: c.at })),
    displayPostcode,
  );
  const cities = distinct(givenPlaces(contacts).map((c) => ({ value: c.city, source: c.source, at: c.at })));
  const events = activity.filter((a) => a.kind === "luma-registered");
  const letters = activity.filter((a) => a.kind === "letter");
  const lettersPage = `/staff/letters/supporter/${summary.id}`;
  return (
    <>
      <h1>
        {summary.name ?? copy.noName} <SupporterBadges supporter={summary} />
      </h1>

      <Grid>
        <Card span={2} as="div">
          <dl className={styles.profile}>
            <Fact label={copy.detail.emails} values={emails} icon="email" href={(email) => `mailto:${email}`} />
            <Fact
              label={copy.detail.phone}
              values={phones}
              icon="phone"
              href={(phone) => `tel:${phone.replace(/\s+/g, "")}`}
              unusable={(phone) => !usable.has(phone)}
            />
            <PlaceFact place={summary.place} />
            <Fact label={copy.detail.postcode} values={postcodes} icon="postcode" />
            <Fact label={copy.detail.city} values={cities} icon="city" />
            <Active first={summary.firstSeenAt} last={summary.lastActiveAt} />
          </dl>
          <section aria-labelledby="subscriptions" className={styles.part}>
            <h3 id="subscriptions" className={styles.partTitle}>
              {copy.detail.listsTitle}
            </h3>
            <PermissionTiles permissions={permissions} />
          </section>
        </Card>
        <div className={`${spanClass(4)} ${styles.tables}`}>
          <section aria-labelledby="events">
            <h2 id="events">
              {copy.detail.eventsTitle}
              {events.length > 0 && <Muted> {copy.detail.eventsCount(events.length)}</Muted>}
            </h2>
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
          <section aria-labelledby="history">
            <h2 id="history">{copy.detail.activityTitle}</h2>
            {activity.length === 0 ? (
              <p className={styles.none}>{copy.detail.noActivity}</p>
            ) : (
              <details className={styles.folded}>
                <summary>{copy.detail.showHistory(activity.length)}</summary>
                <ol className={styles.history} aria-label={copy.detail.activityTitle}>
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
          </section>
        </div>
      </Grid>
    </>
  );
}
