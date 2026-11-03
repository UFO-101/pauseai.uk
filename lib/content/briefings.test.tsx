import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BRIEFINGS, briefings, findBriefing } from "./briefings";

/** All a briefing says: its key stories, then the rest. */
const html = (briefing: (typeof briefings)[number]) =>
  renderToStaticMarkup(
    <>
      {briefing.keyStories.map((story) => story.body)}
      {briefing.content}
    </>,
  );

describe("briefings", () => {
  it("finds a briefing by slug, or nothing", () => {
    expect(findBriefing(briefings[0].slug)).toBe(briefings[0]);
    expect(findBriefing("no-such-briefing")).toBeUndefined();
  });

  it("live under the campaigns", () => {
    expect(BRIEFINGS.path).toBe("/campaigns/briefings");
  });

  it("are summed up by their key stories' headlines", () => {
    expect(briefings[0].tldr).toBe("Monday: Anthropic files to go public. Wednesday: Budget released. £700m for AI");
  });

  it("cite only sources they list, and list only sources they cite", () => {
    for (const briefing of briefings) {
      const text = html(briefing);
      const cited = new Set([...text.matchAll(/href="#source-(\d+)"/g)].map((match) => Number(match[1])));
      const listed = [...text.matchAll(/id="source-(\d+)"/g)].map((match) => Number(match[1]));
      expect(listed, briefing.slug).toEqual(listed.map((_, i) => i + 1));
      expect(
        [...cited].sort((a, b) => a - b),
        briefing.slug,
      ).toEqual(listed);
    }
  });

  it("separate the sources of one mark with commas", () => {
    expect(html(briefings[0])).toContain(
      '<a href="#source-2" aria-label="Source 2">2</a>,<a href="#source-3" aria-label="Source 3">3</a>',
    );
  });
});
