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
 * Who owns an event, in bold, by the name in their address (every staff
 * account is at pauseai.uk), the whole address on hover. With no owner, an
 * error in red, with a warning, when it's still to come and on Luma, as
 * someone must take it; otherwise only said, in grey.
 */
function Owner({ owner, needed }: { owner: string | null; needed: boolean }) {
  if (owner) {
    return (
      <strong className={styles.owner} title={owner}>
        {owner.split("@")[0]}
      </strong>
    );
  }
  if (needed) {
    return (
      <span className={styles.noOwner}>
        <AlertIcon tone="red" />
        {copy.noOwner}
      </span>
    );
  }
  return <Muted>{copy.noOwner}</Muted>;
}

/**
 * One event, a row: when it starts; its owner; its name, leading to it on
 * Luma, and its Luma tags, over where, how many are going and its Google
 * Doc; and its Edit button, which opens the form for its owner and doc
 * under it.
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
  return (
    <li className={styles.row}>
      <span className={styles.when}>{londonStart(event.startAt)}</span>
      <span className={styles.ownerCell}>
        <Owner owner={event.owner} needed={event.startAt >= now && !event.removed} />
      </span>
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
          {event.doc && (
            <>
              {" · "}
              <a href={event.doc}>{copy.doc}</a>
            </>
          )}
        </Muted>
      </span>
      <EventEdit event={event} staff={staff} save={save} />
    </li>
  );
}

/**
 * The list of our events, in their groups: Coming up, then the months and
 * years of those past, each a row with its owner, which any staff member
 * can change, with its Google Doc, from its Edit button. An event coming up
 * with no owner is an error, unless it's been taken off Luma. It's as wide
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
