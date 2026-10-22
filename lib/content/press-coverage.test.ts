import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OUTLETS,
  allCoverage,
  assertOutletsValid,
  findOutletProblems,
  formatCoverageDate,
  marqueeItem,
  newestFirst,
  newsRow1,
  newsRow2,
  tileToMinLength,
  type Outlet,
} from "./press-coverage";

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
    const missing = OUTLETS.filter((o) => o.logoSrc && !existsSync(join(process.cwd(), "public", o.logoSrc))).map(
      (o) => o.logoSrc,
    );
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
    expect(findOutletProblems([linksOnly])).toContain(
      "Example: inCarousel but no article with a single url to link to",
    );
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
    const twice: Outlet = {
      ...carouselOutlet,
      articles: [
        { ...article, featured: true },
        { ...article, featured: true },
      ],
    };
    expect(findOutletProblems([twice])).toContain("Example: more than one featured article");

    const notCarousel: Outlet = { name: "Plain", articles: [{ ...article, featured: true }] };
    expect(
      findOutletProblems([notCarousel]).some((p) => p.includes("featured only applies to inCarousel outlets")),
    ).toBe(true);
  });
});

describe("findOutletProblems, the remaining checks", () => {
  it("flags an empty name and an empty title", () => {
    const problems = findOutletProblems([{ name: "", articles: [{ ...article, title: " " }] }]);
    expect(problems).toContain("(unnamed outlet): name is empty");
    expect(problems.some((p) => p.includes("title is empty"))).toBe(true);
  });

  it("flags a featured article without a single url", () => {
    const outlet: Outlet = {
      ...carouselOutlet,
      articles: [
        article,
        { title: "Clip", medium: "Video", featured: true, links: [{ label: "X", url: "https://x.com/a" }] },
      ],
    };
    expect(findOutletProblems([outlet]).some((p) => p.includes("featured needs a single url"))).toBe(true);
  });

  it("flags two kinds of logo at once, and accepts an HTML logo alone", () => {
    const both: Outlet = { ...carouselOutlet, logoHtml: "<b>Ex</b>" };
    expect(findOutletProblems([both])).toContain("Example: has both logoSrc and logoHtml — use one");
    const htmlOnly: Outlet = { name: "Html", logoHtml: "<b>H</b>", inCarousel: true, articles: [article] };
    expect(findOutletProblems([htmlOnly])).toEqual([]);
  });
});

describe("assertOutletsValid", () => {
  it("throws with every problem listed", () => {
    expect(() => assertOutletsValid([{ name: "Empty", articles: [] }])).toThrow(/- Empty: has no articles/);
    expect(() => assertOutletsValid(OUTLETS)).not.toThrow();
  });
});

describe("newestFirst", () => {
  it("puts newer dates first and undated items last, keeping their order", () => {
    const items = [
      { date: undefined, n: 1 },
      { date: "2026-01-01", n: 2 },
      { date: undefined, n: 3 },
      { date: "2026-05-01", n: 4 },
    ];
    expect([...items].sort(newestFirst).map((i) => i.n)).toEqual([4, 2, 1, 3]);
  });

  // Which pairs sort() compares, in which order, is the engine's choice, so each order is checked directly.
  it("puts a dated item before an undated one, whichever comes first", () => {
    expect(newestFirst({ date: "2026-01-01" }, {})).toBe(-1);
    expect(newestFirst({}, { date: "2026-01-01" })).toBe(1);
    expect(newestFirst({}, {})).toBe(0);
  });
});

describe("marqueeItem", () => {
  it("links to the featured article when one is pinned", () => {
    const outlet: Outlet = {
      ...carouselOutlet,
      articles: [
        { ...article, date: "2026-05-01" },
        { ...article, title: "Pinned", featured: true },
      ],
    };
    expect(marqueeItem(outlet).title).toBe("Pinned");
  });

  it("otherwise links to the newest article with a url, undated ones last", () => {
    const outlet: Outlet = {
      ...carouselOutlet,
      articles: [
        { ...article, title: "Undated", date: undefined },
        { ...article, title: "Old", date: "2025-01-01" },
        { ...article, title: "New", date: "2026-02-01" },
        { title: "Links only", medium: "Video", date: "2027-01-01", links: [{ label: "X", url: "https://x.com" }] },
      ],
    };
    expect(marqueeItem(outlet).title).toBe("New");
    expect(
      marqueeItem({
        ...carouselOutlet,
        articles: [
          { ...article, date: undefined },
          { ...article, title: "B", date: undefined },
        ],
      }).title,
    ).toBe("A piece");
  });
});

describe("tileToMinLength", () => {
  it("repeats a short row until it is long enough", () => {
    expect(tileToMinLength([1, 2, 3], 7)).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3]);
    expect(tileToMinLength([1, 2], 2)).toEqual([1, 2]);
  });

  it("leaves an empty row empty", () => {
    expect(tileToMinLength([], 10)).toEqual([]);
  });
});

describe("formatCoverageDate", () => {
  it("formats a date, or shows a dash without one", () => {
    expect(formatCoverageDate("2026-03-03")).toBe("3 Mar 2026");
    expect(formatCoverageDate()).toBe("—");
  });
});
