// Who owns one of our events when nobody on staff has chosen: the rules,
// written here until staff can set them. The first rule whose place the
// event is in, by its city or one of its Luma tags, gives its owner; an
// event no rule matches is the default owner's. The Luma import
// gives each upcoming event with no owner its owner by these
// (lib/server/staff-events.ts).

/** Whose an event is when no rule matches. */
export const DEFAULT_OWNER = "joseph@pauseai.uk";

/** A place, as an event's city or Luma tag names it, and whose its events are. */
const RULES: readonly { place: string; owner: string }[] = [{ place: "Oxford", owner: "sean@pauseai.uk" }];

/** An event's owner by the rules, from its city and Luma tags. */
export function ruleOwner(event: { city: string | null; tags: readonly string[] }): string {
  const places = [event.city, ...event.tags].map((place) => place?.toLowerCase());
  return RULES.find((rule) => places.includes(rule.place.toLowerCase()))?.owner ?? DEFAULT_OWNER;
}
