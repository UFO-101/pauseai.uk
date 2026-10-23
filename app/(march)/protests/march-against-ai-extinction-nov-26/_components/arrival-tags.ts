import { ARRIVAL_TAGS, type ArrivalTags } from "@/lib/march-registration";

/** Where the tags someone arrived with are kept, for the length of their visit. */
const STORAGE_KEY = "march-arrival-tags";

function tagsInUrl(): ArrivalTags {
  const params = new URLSearchParams(location.search);
  const tags: ArrivalTags = {};
  for (const key of ARRIVAL_TAGS) {
    const value = params.get(`utm_${key}`);
    if (value) tags[key] = value;
  }
  return tags;
}

const untagged = (tags: ArrivalTags) => Object.keys(tags).length === 0;

/**
 * Keeps the UTM tags of the link someone arrived by, if it had any, so they're
 * still known if they go to another page and come back to the sign-up by an
 * untagged link. A later tagged link takes their place, as in GA.
 */
export function rememberArrivalTags() {
  const tags = tagsInUrl();
  if (untagged(tags)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {
    // Storage is blocked: the tags in the address are all there is.
  }
}

/** The tags of the link someone came to the sign-up by: the address's own, or else those kept from earlier in the visit. */
export function arrivalTags(): ArrivalTags {
  const tags = tagsInUrl();
  if (!untagged(tags)) return tags;
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    // Storage is blocked, or what's there isn't ours.
    return {};
  }
}
