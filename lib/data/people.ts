import peopleData from "./people.json";

export type Person = {
  name: string;
  // Required for anonymous entries (name: "") — without it the URL is
  // derived from array position, so inserting or removing another
  // anonymous entry earlier in the file silently changes an existing
  // person's URL instead of 404ing.
  slug?: string;
  imageSrc?: string;
  imageStyle?: string;
  paragraphs: string[];
  featured?: boolean;
};

export const people: Person[] = peopleData;

for (const person of people) {
  if (!person.name.trim() && !person.slug) {
    throw new Error(
      `lib/data/people.json has an anonymous entry with no "slug" (paragraphs start: "${person.paragraphs[0]?.slice(0, 60)}..."). ` +
        `Add an explicit "slug" so its URL stays stable if the array is reordered.`,
    );
  }
}

export function personSlug(person: Person, index: number): string {
  if (person.slug) return person.slug;
  const base = person.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Keep the historic "story-N" fallback for any named entry whose slugified
  // name is empty for some other reason — anonymous entries are covered by
  // the explicit `slug` field, enforced above.
  return base || `story-${index}`;
}

function storyLength(person: Person): number {
  return person.paragraphs.join("").length;
}

// Cap the /people masonry grid at the length of the 3rd-longest story:
// anything longer gets truncated with a "Read more" link to its own page,
// so one or two outliers don't leave a column much taller than the rest.
// Derived from the data (rather than a fixed number) so it stays sensible
// as stories are added or removed.
export const LONG_STORY_CHAR_THRESHOLD = [...people]
  .map(storyLength)
  .sort((a, b) => b - a)[2] ?? Infinity;

export function isLongStory(person: Person): boolean {
  return storyLength(person) > LONG_STORY_CHAR_THRESHOLD;
}
