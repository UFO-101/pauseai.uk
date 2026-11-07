// Which of our Luma tags an upcoming event should have, from its name and
// where it is, for the Luma import to apply (lib/server/event-tagging.ts).
// Only a tag the calendar already has is ever given, and only when the event
// says clearly which: anything else is left for a person.

/**
 * Words that mean a place tag without naming it, for places with no tag of
 * their own that past events show belong to one. A word of an event's name or
 * city, or its region.
 */
const PLACES_OF_TAGS: Readonly<Record<string, readonly string[]>> = {
  Oxford: ["Oxfordshire"],
  "West of England": ["Bristol", "Southwest"],
  Scotland: ["Edinburgh", "Glasgow"],
};

/** The tag for events held online, and the tags that aren't places. */
const ONLINE_TAG = "Online";
const NOT_PLACES = [ONLINE_TAG, "Big events"];

/** An event as Luma gives it, for telling which tags it should have. */
export type EventToTag = { name: string; city: string | null; region: string | null; locationType: string };

/** Whether `phrase` is in `text` as whole words, whatever the case. */
function says(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(text);
}

/** Those of the calendar's place `tags` that `text` names, itself or by one of its places. */
function placeTags(text: string, tags: readonly string[]): string[] {
  return tags.filter((tag) => [tag, ...(PLACES_OF_TAGS[tag] ?? [])].some((place) => says(text, place)));
}

/** How an event is held: online, on a call or saying so in its name; in person; or, with nothing to go on, unknown. */
function heldHow(event: EventToTag): "online" | "in-person" | "unknown" {
  if (event.city || event.locationType === "offline") return "in-person";
  if (event.locationType !== "unknown" || says(event.name, "online")) return "online";
  return "unknown";
}

/**
 * The tags an event should have, of the calendar's `tags`, or null when it
 * isn't clear. Its city, region and name must agree on at most one place tag.
 * An event in person needs that one; one online is tagged Online, with the
 * place tag of a local group's call if its name says.
 */
export function tagsForEvent(event: EventToTag, tags: readonly string[]): string[] | null {
  const places = tags.filter((tag) => !NOT_PLACES.includes(tag));
  const found = new Set([event.name, event.city ?? "", event.region ?? ""].flatMap((text) => placeTags(text, places)));
  const how = heldHow(event);
  if (found.size > 1 || how === "unknown") return null;
  if (how === "online") return tags.includes(ONLINE_TAG) ? [ONLINE_TAG, ...found] : null;
  return found.size === 1 ? [...found] : null;
}
