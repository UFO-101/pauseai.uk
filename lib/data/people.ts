import peopleData from "./people.json";

export type Person = {
  name: string;
  imageSrc?: string;
  imageStyle?: string;
  paragraphs: string[];
  featured?: boolean;
};

export const people: Person[] = peopleData;

export function personSlug(person: Person, index: number): string {
  const base = person.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Keep the historic "story-N" fallback: anonymous entries were shared
  // publicly under /stories/story-N, which now redirects to /people/story-N.
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
