import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import { monthsAndYears, type DatedGroup } from "@/lib/dated-groups";
import { ruleOwner } from "@/lib/event-owners";
import { now } from "@/lib/now";
import { londonStart } from "@/lib/staff-time";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";
import { send } from "./email";
import { notifyDomain } from "./outside-services/postmark";

// Our events on Luma, as the hourly import has them (luma-import.ts), for
// the staff interface's events page, and who on staff owns each
// (event_owners). Only our own: one another calendar runs and ours lists
// isn't ours to own. When an owner changes, the new owner and the one
// before are emailed, saying who changed it, but not whoever did. Each can
// have a link to its Google Doc too (event_docs), which anyone can set.

export type StaffEvent = {
  id: string;
  name: string;
  /** Its page on luma.com. */
  url: string;
  /** When it starts, as an ISO string. */
  startAt: string;
  /** None for one online. */
  city: string | null;
  /** The calendar's tags on it in Luma: a local group, Big events, Online. */
  tags: string[];
  /** Gone from our Luma calendar, kept for its history. */
  removed: boolean;
  /** Registered and approved, and still on its guest list. */
  going: number;
  /** Its owner's staff email, if it has one. */
  owner: string | null;
  /** The link to its Google Doc, if anyone has set one. */
  doc: string | null;
};

export type EventGroup = DatedGroup<StaffEvent>;

/** What saving an event's edit form did, for the page to say: whom it emailed, and its owner as chosen. */
export type EventSaved = { emailed: string[]; owner: string | null };

const SELECT_EVENTS = `SELECT e.id, e.name, 'https://luma.com/' || e.url AS url, e.start_at AS "startAt", e.city, e.tags,
    e.removed_at IS NOT NULL AS removed,
    (SELECT count(*)::int FROM luma_guests g WHERE g.event_id = e.id AND g.approval_status = 'approved' AND g.removed_at IS NULL) AS going,
    o.owner, d.url AS doc
  FROM luma_events e LEFT JOIN event_owners o ON o.event_id = e.id LEFT JOIN event_docs d ON d.event_id = e.id
  WHERE e.access = 'manage'`;

/** Our events whose IDs are `ids`, or all of them, soonest first, each with its start as an ISO string. */
async function listEvents(ids?: string[], db?: Queryable): Promise<StaffEvent[]> {
  const rows = await query<StaffEvent>(
    `${SELECT_EVENTS} AND ($1::text[] IS NULL OR e.id = ANY($1)) ORDER BY e.start_at, e.id`,
    [ids ?? null],
    db,
  );
  return rows.map((event) => ({ ...event, startAt: new Date(event.startAt).toISOString() }));
}

/**
 * The events page: Coming up, soonest first, then those past under their
 * months and years (monthsAndYears); every staff account, whom an event
 * can be given to; and now, as an ISO string.
 */
export async function eventsPage(): Promise<{ groups: EventGroup[]; staff: string[]; now: string }> {
  const at = now();
  const iso = at.toISOString();
  const events = await listEvents();
  const coming = events.filter((event) => event.startAt >= iso);
  const groups: EventGroup[] = coming.length
    ? [{ key: "coming", heading: staffCopy.events.comingUp, items: coming }]
    : [];
  groups.push(
    ...monthsAndYears(
      events.filter((event) => event.startAt < iso),
      (event) => event.startAt,
      at,
    ),
  );
  const staff = await query<{ email: string }>("SELECT email FROM staff_accounts ORDER BY email");
  return { groups, staff: staff.map((account) => account.email), now: iso };
}

/**
 * Emails that `owner` owns `ids` now: to them, copied to `previous`, the
 * owner before, as `by` changed it; or with no `by`, the rules gave them.
 * Never to `by`, who knows: with neither left, nothing is sent. Returns
 * whom it emailed, none if it wasn't sent.
 */
async function tellOwner(
  owner: string,
  ids: string[],
  by: string | null,
  previous: string | null = null,
): Promise<string[]> {
  const [to, cc] = [owner, previous].filter((address): address is string => !!address && address !== by);
  if (!to) return [];
  const events = await listEvents(ids);
  const copy = staffCopy.events.ownerEmail;
  const result = await send(
    {
      From: `PauseAI UK <noreply@${notifyDomain()}>`,
      To: to,
      ...(cc ? { Cc: cc } : {}),
      Subject: copy.subject(events.length, events[0].name),
      TextBody: copy.body({
        events: events.map((event) => ({ name: event.name, when: londonStart(event.startAt), url: event.url })),
        owner,
        previous,
        by,
      }),
      Tag: "staff-alert",
    },
    "staff-alert",
  );
  return result.sent ? [to, ...(cc ? [cc] : [])] : [];
}

/**
 * Makes `owner` the owner of one of our events, as `by`, in the audit log,
 * and emails them and the owner before (tellOwner). Nothing for an event
 * not ours, an address with no staff account, or the owner it has.
 * Returns whom it emailed, or undefined if nothing changed.
 */
export async function setEventOwner(eventId: string, owner: string, by: string): Promise<string[] | undefined> {
  const previous = await transaction(async (db) => {
    const [event] = await query<{ previous: string | null }>(
      `SELECT o.owner AS previous FROM luma_events e LEFT JOIN event_owners o ON o.event_id = e.id
       WHERE e.id = $1 AND e.access = 'manage' FOR UPDATE OF e`,
      [eventId],
      db,
    );
    const [account] = await query("SELECT 1 FROM staff_accounts WHERE email = $1", [owner], db);
    if (!event || !account || event.previous === owner) return undefined;
    await query(
      `INSERT INTO event_owners (event_id, owner, assigned_by) VALUES ($1, $2, $3)
       ON CONFLICT (event_id) DO UPDATE SET owner = EXCLUDED.owner, assigned_by = EXCLUDED.assigned_by, assigned_at = now()`,
      [eventId, owner, by],
      db,
    );
    await logChange(by, "set event owner", { eventId, owner, previous: event.previous }, db);
    return { was: event.previous };
  });
  if (!previous) return undefined;
  return tellOwner(owner, [eventId], by, previous.was);
}

/**
 * Sets the link to one of our events' Google Doc, as `by`, in the audit
 * log; null clears it. Nothing for an event not ours, or the link it has.
 * Returns whether it changed.
 */
export async function setEventDoc(eventId: string, url: string | null, by: string): Promise<boolean> {
  return transaction(async (db) => {
    const [event] = await query<{ previous: string | null }>(
      `SELECT d.url AS previous FROM luma_events e LEFT JOIN event_docs d ON d.event_id = e.id
       WHERE e.id = $1 AND e.access = 'manage' FOR UPDATE OF e`,
      [eventId],
      db,
    );
    if (!event || event.previous === url) return false;
    if (url) {
      await query(
        `INSERT INTO event_docs (event_id, url, set_by) VALUES ($1, $2, $3)
         ON CONFLICT (event_id) DO UPDATE SET url = EXCLUDED.url, set_by = EXCLUDED.set_by, set_at = now()`,
        [eventId, url, by],
        db,
      );
    } else {
      await query("DELETE FROM event_docs WHERE event_id = $1", [eventId], db);
    }
    await logChange(by, "set event doc", { eventId, url, previous: event.previous }, db);
    return true;
  });
}

/** Who gives an event its owner by the rules, in event_owners and the audit log: the import, as for any sync. */
const RULES = "sync";

/**
 * Gives each of our events still to come that has no owner its owner by
 * the rules (lib/event-owners.ts), if they have a staff account; one
 * without stays with none, for staff to see. Returns, for each new owner,
 * the IDs of the events they were given, for ownerEmails() once the
 * transaction is done.
 */
export async function assignRuleOwners(db: Queryable): Promise<Map<string, string[]>> {
  const events = await query<{ id: string; city: string | null; tags: string[] }>(
    `SELECT e.id, e.city, e.tags FROM luma_events e
     WHERE e.access = 'manage' AND e.removed_at IS NULL AND e.start_at > now()
       AND NOT EXISTS (SELECT 1 FROM event_owners o WHERE o.event_id = e.id)
     ORDER BY e.start_at, e.id`,
    [],
    db,
  );
  const given = new Map<string, string[]>();
  for (const event of events) {
    const owner = ruleOwner(event);
    const rows = await query(
      `INSERT INTO event_owners (event_id, owner, assigned_by)
       SELECT $1, email, $3 FROM staff_accounts WHERE email = $2
       ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [event.id, owner, RULES],
      db,
    );
    if (!rows.length) continue;
    await logChange(RULES, "set event owner", { eventId: event.id, owner, previous: null }, db);
    given.set(owner, [...(given.get(owner) ?? []), event.id]);
  }
  return given;
}

/** Emails each owner the rules gave events to, once, listing them. */
export async function ownerEmails(given: Map<string, string[]>): Promise<void> {
  for (const [owner, ids] of given) await tellOwner(owner, ids, null);
}
