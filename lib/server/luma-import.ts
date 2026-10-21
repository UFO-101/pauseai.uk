import "server-only";
import type { LumaImportResult } from "@/lib/import-runs";
import { query, transaction, type Queryable } from "./db";
import { keepingFailure, recordRun } from "./import-runs";
import { linkSupporters } from "./supporters";
import { LumaRateLimited, type LumaPage } from "./outside-services/luma-api";
import {
  type CalendarEvent,
  listCalendarContacts,
  listCalendarEvents,
  type CalendarContact,
} from "./outside-services/luma-calendar";
import { type EventGuest, listEventGuests } from "./outside-services/luma-guests";

// Copies our Luma calendar into luma_events, luma_people and luma_guests:
// every public event, the guests who registered for each, and the
// calendar's contacts. Hourly (app/api/cron/import-luma) or when staff
// ask, each run in the import log (import-runs.ts, as "import-luma").
//
// A run has about 20 seconds (Netlify's scheduled functions stop at 30) and
// shares Luma's 200 requests a minute with the site, so it reads what's
// changed first and backfills the rest over later runs. Every write is an
// upsert on Luma's ID that touches a row only when a value differs, so a
// run cut short leaves nothing half done, and a second run does nothing.

const JOB = "import-luma";

/** How long a run may spend fetching before it stops choosing more work. */
const BUDGET_MS = 20_000;
/** Luma requests left in the minute that the run leaves for the site's own fetches. */
const RATE_LIMIT_RESERVE = 50;
/** An event is live from three days after it starts, when guests still register and drop out. */
const LIVE_DAYS = 3;
/** A settled event's guests are read again this often, for late changes. */
const SETTLED_DAYS = 30;
/** A full pass over every event, for edits to old ones and deletions, this often. */
const FULL_EVENTS_HOURS = 20;
/** A full pass over every contact this often, a few pages each run. */
const FULL_CONTACTS_DAYS = 7;
const CONTACT_PAGES_PER_RUN = 10;

type ImportList = "events" | "contacts";

/** A full pass over the contacts failed partway: its cursor is dropped, outside the run's transaction. */
class ContactsPassFailed extends Error {
  constructor(public readonly cause: unknown) {
    super(String(cause));
  }
}

/** Why a run stopped early. */
type Stop = NonNullable<LumaImportResult["stoppedBy"]>;

/** What's left of the run's time and of Luma's minute. */
class Budget {
  requests = 0;
  stoppedBy: Stop | undefined;
  private remaining: number | undefined;
  private readonly started = performance.now();

  constructor(private readonly ms: number) {}

  /** Fetches a page, counting it and noting Luma's rate limit; a 429 ends the run. */
  async page<T>(load: () => Promise<LumaPage<T>>): Promise<LumaPage<T> | undefined> {
    if (this.exhausted()) return undefined;
    try {
      const page = await load();
      this.requests++;
      this.remaining = page.remaining;
      return page;
    } catch (error) {
      if (!(error instanceof LumaRateLimited)) throw error;
      this.requests++;
      this.stoppedBy = "rate-limit";
      return undefined;
    }
  }

  /** Whether the run should stop choosing more work, and why. */
  exhausted(): boolean {
    if (this.stoppedBy) return true;
    if (performance.now() - this.started > this.ms) this.stoppedBy = "time";
    else if (this.remaining !== undefined && this.remaining < RATE_LIMIT_RESERVE) this.stoppedBy = "rate-limit";
    return this.stoppedBy !== undefined;
  }
}

async function fullPassDue(list: ImportList, interval: string, db: Queryable): Promise<boolean> {
  const [state] = await query<{ due: boolean }>(
    "SELECT full_pass_at IS NULL OR full_pass_at < now() - $2::interval AS due FROM luma_import_state WHERE list = $1",
    [list, interval],
    db,
  );
  return state?.due ?? true;
}

async function saveState(list: ImportList, cursor: string, finished: boolean, db?: Queryable): Promise<void> {
  await query(
    `INSERT INTO luma_import_state (list, cursor, full_pass_at) VALUES ($1, $2, CASE WHEN $3 THEN now() END)
     ON CONFLICT (list) DO UPDATE SET cursor = $2, full_pass_at = CASE WHEN $3 THEN now() ELSE luma_import_state.full_pass_at END`,
    [list, cursor, finished],
    db,
  );
}

/** Upserts an event; returns whether anything was new or different. */
async function upsertEvent(event: CalendarEvent, db: Queryable): Promise<boolean> {
  const rows = await query(
    `INSERT INTO luma_events (id, name, url, start_at, access, city, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, start_at = EXCLUDED.start_at,
       access = EXCLUDED.access, city = EXCLUDED.city, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
       changed_at = now()
     WHERE (luma_events.name, luma_events.url, luma_events.start_at, luma_events.access, luma_events.city, luma_events.latitude, luma_events.longitude)
       IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.url, EXCLUDED.start_at, EXCLUDED.access, EXCLUDED.city, EXCLUDED.latitude, EXCLUDED.longitude)
     RETURNING id`,
    [
      event.id,
      event.name,
      event.url,
      event.start_at,
      event.access,
      event.geo_address_info?.city ?? null,
      event.place?.latitude ?? null,
      event.place?.longitude ?? null,
    ],
    db,
  );
  return rows.length > 0;
}

/**
 * The events, newest first: page by page until a page holds nothing new or
 * changed, or on a full pass, to the end, after which events gone from the
 * calendar go too.
 */
async function importEvents(budget: Budget, db: Queryable): Promise<number> {
  const full = await fullPassDue("events", `${FULL_EVENTS_HOURS} hours`, db);
  const seen: string[] = [];
  let changed = 0;
  let cursor: string | undefined;
  do {
    const page = await budget.page(() => listCalendarEvents(cursor));
    if (!page) return changed;
    let changedOnPage = 0;
    for (const event of page.entries) {
      if (await upsertEvent(event, db)) changedOnPage++;
      seen.push(event.id);
    }
    changed += changedOnPage;
    cursor = page.nextCursor;
    if (!full && changedOnPage === 0) return changed;
  } while (cursor);
  if (full) {
    await query("DELETE FROM luma_events WHERE NOT (id = ANY($1::text[]))", [seen], db);
    await saveState("events", "", true, db);
  }
  return changed;
}

/**
 * The events whose guests are due a read, first first: live ones not read
 * in the last hour; never read, newest first; settled ones last read within
 * three days of their start, or over a month ago. An event whose last read
 * failed goes to the back. Only our own events: Luma shows no guests for one
 * another calendar runs.
 */
async function eventsDueGuests(db: Queryable): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM luma_events
     WHERE access = 'manage' AND (
       (start_at > now() - $1::interval AND (guests_synced_at IS NULL OR guests_synced_at < now() - interval '1 hour'))
       OR guests_synced_at IS NULL
       OR (start_at <= now() - $1::interval
           AND (guests_synced_at < start_at + $1::interval OR guests_synced_at < now() - $2::interval)))
     ORDER BY guests_error IS NOT NULL,
       CASE WHEN start_at > now() - $1::interval THEN 0 WHEN guests_synced_at IS NULL THEN 1 ELSE 2 END,
       start_at DESC`,
    [`${LIVE_DAYS} days`, `${SETTLED_DAYS} days`],
    db,
  );
  return rows.map((row) => row.id);
}

/** Upserts the people behind a page of guests; returns how many were new or different. */
async function upsertPeople(guests: EventGuest[], db: Queryable): Promise<number> {
  const people = new Map(guests.map((guest) => [guest.userId, guest]));
  const rows = await query(
    `INSERT INTO luma_people (user_id, email, name)
     SELECT user_id, email, name FROM unnest($1::text[], $2::text[], $3::text[]) AS p(user_id, email, name)
     WHERE user_id NOT IN (SELECT user_id FROM luma_erased)
     ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, changed_at = now()
     WHERE (luma_people.email, luma_people.name) IS DISTINCT FROM (EXCLUDED.email, EXCLUDED.name)
     RETURNING user_id`,
    [
      [...people.keys()],
      [...people.values()].map((guest) => guest.email.trim().toLowerCase()),
      [...people.values()].map((guest) => guest.name),
    ],
    db,
  );
  return rows.length;
}

/** The statuses a guest row can have: Luma's others (invited, or a ticket's) aren't registrations. */
const GUEST_STATUSES = ["approved", "pending_approval", "waitlist", "declined"];

/** Upserts a page of an event's guests; returns how many were new or different. */
async function upsertGuests(eventId: string, guests: EventGuest[], db: Queryable): Promise<number> {
  const rows = await query(
    `INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, phone, postcode, utm_source)
     SELECT g.id, $1, g.user_id, g.approval_status, g.registered_at, g.phone, g.postcode, g.utm_source
     FROM unnest($2::text[], $3::text[], $4::text[], $5::timestamptz[], $6::text[], $7::text[], $8::text[])
       AS g(id, user_id, approval_status, registered_at, phone, postcode, utm_source)
     WHERE g.user_id IN (SELECT user_id FROM luma_people)
     ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, approval_status = EXCLUDED.approval_status,
       registered_at = EXCLUDED.registered_at, phone = EXCLUDED.phone, postcode = EXCLUDED.postcode,
       utm_source = EXCLUDED.utm_source, removed_at = NULL, changed_at = now()
     WHERE (luma_guests.user_id, luma_guests.approval_status, luma_guests.registered_at, luma_guests.phone, luma_guests.postcode, luma_guests.utm_source, luma_guests.removed_at)
       IS DISTINCT FROM (EXCLUDED.user_id, EXCLUDED.approval_status, EXCLUDED.registered_at, EXCLUDED.phone, EXCLUDED.postcode, EXCLUDED.utm_source, NULL)
     RETURNING id`,
    [
      eventId,
      guests.map((g) => g.id),
      guests.map((g) => g.userId),
      guests.map((g) => g.approvalStatus),
      guests.map((g) => g.registeredAt),
      guests.map((g) => g.phone),
      guests.map((g) => g.postcode),
      guests.map((g) => g.utmSource),
    ],
    db,
  );
  return rows.length;
}

type GuestCounts = { guests: number; people: number };

/**
 * Every page of one event's guests, in one go, skipping rows that aren't
 * registrations. After a complete pass, guests gone from the list are
 * marked removed and the event is marked read; a failure is kept on the
 * event instead. Undefined when the budget ran out partway.
 */
async function importGuests(eventId: string, budget: Budget, db: Queryable): Promise<GuestCounts | undefined> {
  const counts: GuestCounts = { guests: 0, people: 0 };
  const seen: string[] = [];
  let cursor: string | undefined;
  try {
    do {
      const page = await budget.page(() => listEventGuests(eventId, cursor));
      if (!page) return undefined;
      const guests = page.entries.filter(
        (guest): guest is EventGuest & { registeredAt: string } =>
          GUEST_STATUSES.includes(guest.approvalStatus) && guest.registeredAt !== null,
      );
      const unique = [...new Map(guests.map((guest) => [guest.id, guest])).values()];
      counts.people += await upsertPeople(unique, db);
      counts.guests += await upsertGuests(eventId, unique, db);
      seen.push(...unique.map((guest) => guest.id));
      cursor = page.nextCursor;
    } while (cursor);
  } catch (error) {
    await query("UPDATE luma_events SET guests_error = $2 WHERE id = $1", [eventId, String(error)], db);
    return counts;
  }
  const removed = await query(
    `UPDATE luma_guests SET removed_at = now(), changed_at = now()
     WHERE event_id = $1 AND removed_at IS NULL AND NOT (id = ANY($2::text[])) RETURNING id`,
    [eventId, seen],
    db,
  );
  counts.guests += removed.length;
  await query("UPDATE luma_events SET guests_synced_at = now(), guests_error = NULL WHERE id = $1", [eventId], db);
  return counts;
}

/** Sets when each contact joined the calendar; returns how many that was news for. */
async function upsertContacts(contacts: CalendarContact[], db: Queryable): Promise<number> {
  const unique = [...new Map(contacts.map((contact) => [contact.userId, contact])).values()];
  const rows = await query(
    `INSERT INTO luma_people (user_id, email, name, contact_since)
     SELECT user_id, email, name, contact_since
     FROM unnest($1::text[], $2::text[], $3::text[], $4::timestamptz[]) AS c(user_id, email, name, contact_since)
     WHERE user_id NOT IN (SELECT user_id FROM luma_erased)
     ON CONFLICT (user_id) DO UPDATE SET contact_since = EXCLUDED.contact_since, changed_at = now()
     WHERE luma_people.contact_since IS DISTINCT FROM EXCLUDED.contact_since
     RETURNING user_id`,
    [
      unique.map((c) => c.userId),
      unique.map((c) => c.email.trim().toLowerCase()),
      unique.map((c) => c.name),
      unique.map((c) => c.createdAt),
    ],
    db,
  );
  return rows.length;
}

/**
 * The contacts, newest first, until a page holds nothing new. Once a week a
 * full pass, a few pages a run from a kept cursor, for anyone missed. A
 * cursor Luma no longer honours is dropped, so the next run starts the
 * pass again.
 */
async function importContacts(budget: Budget, db: Queryable): Promise<number> {
  const [state] = await query<{ cursor: string }>(
    "SELECT cursor FROM luma_import_state WHERE list = $1",
    ["contacts"],
    db,
  );
  let cursor: string | undefined = state?.cursor || undefined;
  const full = !!cursor || (await fullPassDue("contacts", `${FULL_CONTACTS_DAYS} days`, db));
  let changed = 0;
  let pages = 0;
  try {
    do {
      const page = await budget.page(() => listCalendarContacts(cursor));
      if (!page) break;
      const changedOnPage = await upsertContacts(page.entries, db);
      changed += changedOnPage;
      cursor = page.nextCursor;
      pages++;
      if (!full && changedOnPage === 0) return changed;
    } while (cursor && pages < CONTACT_PAGES_PER_RUN);
  } catch (error) {
    throw full ? new ContactsPassFailed(error) : error;
  }
  if (full) await saveState("contacts", cursor ?? "", cursor === undefined, db);
  return changed;
}

/**
 * Runs the import, within `budgetMs` of fetching, keeping the run. Only one
 * runs at a time: a second started meanwhile records that and stops. A
 * failure rolls the run back, so nothing is half done.
 */
export function importLuma(startedBy: string, budgetMs = BUDGET_MS): Promise<LumaImportResult> {
  return keepingFailure(JOB, startedBy, async () => {
    try {
      return await run(startedBy, budgetMs);
    } catch (error) {
      if (!(error instanceof ContactsPassFailed)) throw error;
      await saveState("contacts", "", false);
      throw error.cause;
    }
  });
}

function run(startedBy: string, budgetMs: number): Promise<LumaImportResult> {
  return transaction(async (db) => {
    const result: LumaImportResult = {
      events: 0,
      eventsSynced: 0,
      eventsLeft: 0,
      guestsChanged: 0,
      people: 0,
      contacts: 0,
      supportersAdded: 0,
      linked: 0,
      requests: 0,
    };
    const [{ locked }] = await query<{ locked: boolean }>(
      "SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked",
      [JOB],
      db,
    );
    if (!locked) {
      result.stoppedBy = "running";
      await recordRun(JOB, startedBy, "unchanged", result, db);
      return result;
    }
    const budget = new Budget(budgetMs);
    result.events = await importEvents(budget, db);
    const due = await eventsDueGuests(db);
    for (const eventId of due) {
      const counts = await importGuests(eventId, budget, db);
      if (!counts) break;
      result.eventsSynced++;
      result.guestsChanged += counts.guests;
      result.people += counts.people;
    }
    result.eventsLeft = due.length - result.eventsSynced;
    result.contacts = await importContacts(budget, db);
    // Anyone new, from any source, gets their supporter; letters written since the last run too.
    const links = await linkSupporters(db);
    result.supportersAdded = links.supportersAdded;
    result.linked = links.linked;
    result.requests = budget.requests;
    if (budget.stoppedBy) result.stoppedBy = budget.stoppedBy;
    const changed = result.events + result.guestsChanged + result.people + result.contacts + result.linked > 0;
    await recordRun(JOB, startedBy, changed ? "ok" : "unchanged", result, db);
    return result;
  });
}
