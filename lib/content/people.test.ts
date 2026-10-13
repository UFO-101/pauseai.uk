import { describe, expect, it } from "vitest";
import {
  LONG_STORY_CHAR_THRESHOLD,
  checkPeople,
  findPerson,
  isLongStory,
  longStoryThreshold,
  people,
  personMetadata,
  personSlug,
  type Person,
} from "./people";

const named = (name: string, paragraphs = ["Hello."], extra: Partial<Person> = {}) => ({ name, paragraphs, ...extra }) as Person;

describe("personSlug", () => {
  it("derives a URL-safe slug from the name", () => {
    expect(personSlug(named("  Jane O'Brien-Smith "))).toBe("jane-o-brien-smith");
  });

  it("uses an explicit slug over the name", () => {
    expect(personSlug(named("Jane", undefined, { slug: "jane-2" }))).toBe("jane-2");
  });

  it("uses the slug for anonymous entries", () => {
    expect(personSlug({ slug: "anonymous-1", paragraphs: [] })).toBe("anonymous-1");
  });

  it("gives every real person a different slug", () => {
    const slugs = people.map(personSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("checkPeople", () => {
  it("rejects an empty name, which would make an empty slug", () => {
    expect(() => checkPeople([named("")])).toThrow(/name: ""/);
    expect(() => checkPeople(people)).not.toThrow();
  });
});

describe("long stories", () => {
  it("cuts off at the third-longest story", () => {
    const lengths = people.map((p) => p.paragraphs.join("").length).sort((a, b) => b - a);
    expect(LONG_STORY_CHAR_THRESHOLD).toBe(lengths[2]);
    expect(people.filter(isLongStory)).toHaveLength(lengths.filter((n) => n > lengths[2]).length);
  });

  it("has no threshold with fewer than three stories", () => {
    expect(longStoryThreshold([named("A"), named("B")])).toBe(Infinity);
  });

  it("treats a story at the threshold as not long", () => {
    expect(isLongStory(named("X", ["a".repeat(LONG_STORY_CHAR_THRESHOLD)]))).toBe(false);
    expect(isLongStory(named("X", ["a".repeat(LONG_STORY_CHAR_THRESHOLD + 1)]))).toBe(true);
  });
});

describe("findPerson", () => {
  it("finds a person by slug, or returns null", () => {
    const person = people[0];
    expect(findPerson(personSlug(person))).toEqual({ person });
    expect(findPerson("nobody-at-all")).toBeNull();
  });
});

describe("personMetadata", () => {
  it("uses the name and the first paragraph without its tags", () => {
    const meta = personMetadata(named("Jane Doe", ["I <em>really</em> care.", "More."]));
    expect(meta).toEqual({
      title: "Jane Doe",
      description: "I really care.",
      openGraph: {
        title: "Jane Doe",
        description: "I really care.",
        images: [{ url: "/images/open-graph/open-graph-1200-630.jpg", width: 1200, height: 630 }],
        url: "https://pauseai.uk/people/jane-doe/",
      },
      twitter: { images: ["/images/open-graph/open-graph-1600-840.jpg"] },
      alternates: { canonical: "/people/jane-doe" },
    });
  });

  it("shortens a long first paragraph to 160 characters", () => {
    const description = personMetadata(named("X", ["word ".repeat(60)])).description!;
    expect(description.length).toBeLessThanOrEqual(158);
    expect(description.endsWith("…")).toBe(true);
    expect(description).not.toMatch(/\s…$/);
  });

  it("titles anonymous stories, and copes with no paragraphs", () => {
    const meta = personMetadata({ slug: "anon", paragraphs: [] });
    expect(meta.title).toBe("Anonymous submission");
    expect(meta.description).toBe("");
  });
});
