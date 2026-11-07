import "server-only";
import { tagsForEvent, type EventToTag } from "@/lib/event-tags";
import { staffCopy } from "@/lib/content/staff-interface";
import { londonStart } from "@/lib/staff-time";
import { query, type Queryable } from "./db";
import { notifyStaff, staffLink } from "./notifications";
import { applyEventTag, listEventTags } from "./outside-services/luma-calendar";
import { problem } from "./problems";

// Tags our upcoming events on Luma, during the Luma import. Each event is
// settled once: tagged if it's clear which of the calendar's tags it should
// have (lib/event-tags.ts), or else the notification inbox is asked to, so a tag
// someone later takes off stays off. Nothing makes a new tag.

/** The most events a run settles: it has little time, and the next run does the rest. */
const EVENTS_PER_RUN = 10;

/** An event left for a person to tag. */
export type UnclearEvent = { name: string; startAt: string; city: string | null; url: string };

export type EventTagging = { tagged: number; requests: number; unclear: UnclearEvent[] };

/** Whether this build may change the real calendar: not a preview's or a local one, which hold a copy of its events. */
function mayTag(): boolean {
  return process.env.DEPLOY_CONTEXT === "production" || process.env.DATA_FIXTURES === "1";
}

/**
 * Settles our upcoming events with no tags, soonest first: applies each one's
 * tags on Luma and keeps them, or notes it as unclear, for unclearEventEmails()
 * once the run's transaction is done. Applying twice does no harm, so an event
 * Luma refuses, or a run rolled back, is tried again by the next run. One that
 * hasn't been read since we began keeping how it's held waits for its next read.
 */
export async function tagUpcomingEvents(db?: Queryable): Promise<EventTagging> {
  const done: EventTagging = { tagged: 0, requests: 0, unclear: [] };
  if (!mayTag()) return done;
  const events = await query<EventToTag & UnclearEvent & { id: string }>(
    `SELECT id, name, start_at AS "startAt", city, region, location_type AS "locationType", url FROM luma_events
     WHERE access = 'manage' AND removed_at IS NULL AND start_at > now() AND tags = '{}'
       AND tags_checked_at IS NULL AND location_type IS NOT NULL
     ORDER BY start_at, id LIMIT $1`,
    [EVENTS_PER_RUN],
    db,
  );
  if (!events.length) return done;
  let calendarTags: string[];
  try {
    calendarTags = await listEventTags();
    done.requests++;
  } catch (error) {
    problem(staffCopy.problems.job.lumaTagsUnread, error);
    return done;
  }
  for (const event of events) {
    const tags = tagsForEvent(event, calendarTags);
    if (tags === null) {
      done.unclear.push({
        name: event.name,
        startAt: new Date(event.startAt).toISOString(),
        city: event.city,
        url: event.url,
      });
    } else {
      try {
        for (const tag of tags) {
          done.requests++;
          await applyEventTag(tag, event.id);
        }
      } catch (error) {
        problem(staffCopy.problems.job.lumaTagRefused(event.name), error);
        continue;
      }
      done.tagged++;
    }
    await query("UPDATE luma_events SET tags = $2, tags_checked_at = now() WHERE id = $1", [event.id, tags ?? []], db);
  }
  return done;
}

/** Asks the notification inbox to tag each event it wasn't clear how to, once. */
export async function unclearEventEmails(events: UnclearEvent[]): Promise<void> {
  const copy = staffCopy.events.unclearTagEmail;
  for (const event of events) {
    await notifyStaff(
      copy.subject(event.name),
      copy.body({
        name: event.name,
        when: londonStart(event.startAt),
        place: event.city ?? staffCopy.events.online,
        url: event.url,
        link: staffLink("/staff/events", undefined),
      }),
    );
  }
}
