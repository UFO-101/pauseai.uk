import Tag from "@/components/ui/Tag";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { importPath } from "@/lib/import-runs";
import type { EventGroup, StaffEvent } from "@/lib/server/staff-events";
import { londonStart } from "@/lib/staff-time";
import AlertIcon from "./AlertIcon";
import EventEdit, { type SaveEvent } from "./EventEdit";
import Grid, { spanClass } from "./ui/Grid";
import StaffLink from "./ui/StaffLink";
import styles from "./EventsOverview.module.css";

const copy = staffCopy.events;

/** Under the page's title, in small grey print: where the events come from, leading to the Luma import's page. */
export function EventsSource() {
  return (
    <p className={styles.source}>
      {copy.intro.before}
      <StaffLink href={importPath("import-luma")}>{copy.intro.link}</StaffLink>
      {copy.intro.after}
    </p>
  );
}

/**
 * What an event lacks, said: an error, in red, with a warning, when it's
 * still to come and on Luma (`needed`), as someone must see to it;
 * otherwise only said, in grey.
 */
function Missing({ needed, children }: { needed: boolean; children: string }) {
  if (!needed) return <Muted>{children}</Muted>;
  return (
    <span className={styles.missing}>
      <AlertIcon tone="red" />
      {children}
    </span>
  );
}

/** Who owns an event, by their address, in bold; on hover too, if it's too long for its column. */
function Owner({ owner, needed }: { owner: string | null; needed: boolean }) {
  if (!owner) return <Missing needed={needed}>{copy.noOwner}</Missing>;
  return (
    <strong className={styles.owner} title={owner}>
      {owner}
    </strong>
  );
}

/** The link to an event's Google Doc. */
function Doc({ doc, needed }: { doc: string | null; needed: boolean }) {
  if (!doc) return <Missing needed={needed}>{copy.noDoc}</Missing>;
  return <a href={doc}>{copy.doc}</a>;
}

/**
 * One event, a row: when it starts; its name, leading to it on Luma, and
 * its Luma tags, over where and how many are going; its owner; its Google
 * Doc; and its Edit button, which puts the form for its owner and doc in
 * their place.
 */
function Row({
  event,
  staff,
  now,
  save,
}: {
  event: StaffEvent;
  staff: readonly string[];
  now: string;
  save: SaveEvent;
}) {
  // Still to come and on Luma, so an owner and a doc are needed.
  const needed = event.startAt >= now && !event.removed;
  return (
    <li className={styles.row}>
      <span className={styles.when}>{londonStart(event.startAt)}</span>
      <span className={styles.what}>
        <span className={styles.name}>
          <a href={event.url} className={styles.title}>
            {event.name}
          </a>
          {event.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          {event.removed && <Tag>{copy.removed}</Tag>}
        </span>
        <Muted>
          {event.city ?? copy.online} · {copy.going(event.going)}
        </Muted>
      </span>
      <EventEdit event={event} staff={staff} save={save}>
        <span className={styles.ownerCell}>
          <Owner owner={event.owner} needed={needed} />
        </span>
        <span className={styles.docCell}>
          <Doc doc={event.doc} needed={needed} />
        </span>
      </EventEdit>
    </li>
  );
}

/**
 * The list of our events, in their groups: Coming up, then the months and
 * years of those past, each a row with its owner, which any staff member
 * can change, with its Google Doc, from its Edit button. An event coming up
 * with no owner or no doc is an error, unless it's been taken off Luma. It's as wide
 * as the grid, not the window.
 */
export default function EventsOverview({
  groups,
  staff,
  now,
  save,
}: {
  groups: EventGroup[];
  staff: readonly string[];
  now: string;
  save: SaveEvent;
}) {
  if (groups.length === 0) {
    return (
      <p>
        <Muted>{copy.none}</Muted>
      </p>
    );
  }
  return (
    <Grid>
      <div className={spanClass(6)}>
        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`events-${group.key}`} className={styles.group}>
            <h2 id={`events-${group.key}`}>{group.heading}</h2>
            <ul className={styles.rows}>
              {group.items.map((event) => (
                <Row key={event.id} event={event} staff={staff} now={now} save={save} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Grid>
  );
}
