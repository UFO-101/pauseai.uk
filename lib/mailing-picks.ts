import type { Picked } from "@/lib/staff-search";

// How a mailing's ticks are said (StoredFilter's `picked`): as the group
// everyone a filter found was ticked from, then those added and taken off
// since by name, while they're few; otherwise as the names ticked.

/** The most added and taken off since a filter's group was ticked for the mailing still to be said as that group. */
export const MOST_CHANGES = 10;

/** Who's ticked, to say: the group ticked from a filter and those added and taken off since; or just who's ticked. */
export type PickedWho =
  | { kind: "group"; from: NonNullable<Picked["from"]>; plus: number[]; except: number[] }
  | { kind: "list"; ids: number[] };

/** How to say who's ticked for a mailing. */
export function pickedWho(picked: Picked): PickedWho {
  const { ids, from } = picked;
  if (!from) return { kind: "list", ids };
  const ticked = new Set(ids);
  const found = new Set(from.found);
  const plus = ids.filter((id) => !found.has(id));
  const except = from.found.filter((id) => !ticked.has(id));
  return plus.length + except.length > MOST_CHANGES ? { kind: "list", ids } : { kind: "group", from, plus, except };
}
