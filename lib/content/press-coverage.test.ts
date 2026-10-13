import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OUTLETS, allCoverage, findOutletProblems, newsRow1, newsRow2, type Outlet } from "./press-coverage";

const article = { title: "A piece", medium: "Article" as const, url: "https://example.com/a", date: "2026-01-01" };
const carouselOutlet: Outlet = {
  name: "Example",
  logoSrc: "/images/media-coverage/example.svg",
  logoHeight: 40,
  logoIntrinsicWidth: 100,
  logoIntrinsicHeight: 40,
  inCarousel: true,
  articles: [article],
};

describe("press coverage data", () => {
  it("has no structural problems", () => {
    expect(findOutletProblems(OUTLETS)).toEqual([]);
  });

  it("points every logoSrc at a file that exists in public/", () => {
    const missing = OUTLETS.filter((o) => o.logoSrc && !existsSync(join(process.cwd(), "public", o.logoSrc))).map((o) => o.logoSrc);
    expect(missing).toEqual([]);
  });

  it("gives every marquee slot a logo and a link", () => {
    for (const item of [...newsRow1, ...newsRow2]) {
      expect(item.logoSrc ?? item.logoHtml, item.outlet).toBeTruthy();
      expect(item.url, item.outlet).toBeTruthy();
    }
  });

  it("puts each carousel outlet in the marquee once, before tiling", () => {
    const carouselOutlets = OUTLETS.filter((o) => o.inCarousel).length;
    expect(new Set([...newsRow1, ...newsRow2].map((i) => i.outlet)).size).toBe(carouselOutlets);
  });

  it("carries the outlet's lean and logo onto every one of its articles", () => {
    const guardian = allCoverage.filter((i) => i.outlet === "The Guardian");
    expect(guardian.length).toBeGreaterThan(1);
    expect(new Set(guardian.map((i) => i.lean))).toEqual(new Set(["Left"]));
    expect(guardian.every((i) => i.logoSrc)).toBe(true);
  });
});

describe("findOutletProblems", () => {
  it("accepts a well-formed carousel outlet", () => {
    expect(findOutletProblems([carouselOutlet])).toEqual([]);
  });

  it("flags a carousel outlet with no logo", () => {
    const noLogo: Outlet = { ...carouselOutlet, logoSrc: undefined };
    expect(findOutletProblems([noLogo])).toContain("Example: inCarousel but has no logo");
  });

  it("flags a carousel outlet with nothing to link to", () => {
    const linksOnly: Outlet = {
      ...carouselOutlet,
      articles: [{ title: "Clip", medium: "Video", links: [{ label: "X", url: "https://x.com/a" }] }],
    };
    expect(findOutletProblems([linksOnly])).toContain("Example: inCarousel but no article with a single url to link to");
  });

  it("flags a logoSrc without intrinsic dimensions or a display height", () => {
    const bad: Outlet = { ...carouselOutlet, logoIntrinsicWidth: undefined, logoHeight: undefined };
    const problems = findOutletProblems([bad]);
    expect(problems).toContain("Example: logoSrc needs logoIntrinsicWidth and logoIntrinsicHeight");
    expect(problems).toContain("Example: inCarousel logoSrc needs logoHeight");
  });

  it("flags empty, duplicate and malformed outlets and articles", () => {
    const problems = findOutletProblems([
      { name: "Empty", articles: [] },
      { name: "Dupe", articles: [article] },
      { name: "Dupe", articles: [{ ...article, date: "1 Jan 2026" }] },
      { name: "NoLink", articles: [{ title: "x", medium: "Article" }] },
      { name: "Both", articles: [{ ...article, links: [{ label: "X", url: "https://x.com/a" }] }] },
    ]);
    expect(problems).toContain("Empty: has no articles");
    expect(problems).toContain("Dupe: duplicate outlet name");
    expect(problems.some((p) => p.includes('date "1 Jan 2026" is not YYYY-MM-DD'))).toBe(true);
    expect(problems.some((p) => p.startsWith("NoLink") && p.includes("needs a url or links"))).toBe(true);
    expect(problems.some((p) => p.startsWith("Both") && p.includes("both url and links"))).toBe(true);
  });

  it("flags misuse of featured", () => {
    const twice: Outlet = { ...carouselOutlet, articles: [{ ...article, featured: true }, { ...article, featured: true }] };
    expect(findOutletProblems([twice])).toContain("Example: more than one featured article");

    const notCarousel: Outlet = { name: "Plain", articles: [{ ...article, featured: true }] };
    expect(findOutletProblems([notCarousel]).some((p) => p.includes("featured only applies to inCarousel outlets"))).toBe(true);
  });
});
