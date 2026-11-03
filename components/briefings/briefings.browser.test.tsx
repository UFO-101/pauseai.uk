import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { BRIEFINGS, briefings, type Briefing as BriefingData } from "@/lib/content/briefings";
import Briefing from "./Briefing";
import BriefingBox from "./BriefingBox";
import BriefingCard from "./BriefingCard";
import BriefingColumns from "./BriefingColumns";
import BriefingList from "./BriefingList";
import BriefingMasthead from "./BriefingMasthead";
import BriefingPicture from "./BriefingPicture";
import BriefingQuote from "./BriefingQuote";
import BriefingSheet from "./BriefingSheet";
import BriefingSources from "./BriefingSources";
import { Accent, Aside, Flag, Subhead } from "./BriefingText";
import BudgetChart, { tickStep } from "./BudgetChart";
import KeyStories from "./KeyStories";
import SignatoriesChart from "./SignatoriesChart";
import WeekCalendar from "./WeekCalendar";

// Desktop width, but where a test says otherwise: the briefing's columns stack on a phone.
beforeEach(async () => {
  await page.viewport(1280, 900);
});

const BRIEFING = briefings[0];
const STORIES = [
  { lead: "Monday: a filing.", body: "It filed." },
  { lead: "Wednesday: a budget.", body: "It spent." },
];
/** A token's colour as the browser computes it. */
function token(name: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

describe("Briefing", () => {
  it("links back to the briefings, then shows the masthead, the key stories whole and the rest", async () => {
    const { container } = await render(<Briefing briefing={BRIEFING} section={BRIEFINGS} />);
    expect(page.getByRole("link", { name: "← All briefings" }).element().getAttribute("href")).toBe(
      "/campaigns/briefings",
    );
    await expect.element(page.getByRole("heading", { level: 1, name: BRIEFING.title })).toBeVisible();
    const keyStories = page.getByRole("heading", { name: "Key stories this week" }).element().closest("section")!;
    expect(keyStories.textContent).toContain("resist shutdown");
    await expect.element(page.getByRole("heading", { name: "Sources" })).toBeVisible();
    expect(container.querySelector("article")).not.toBeNull();
  });
});

describe("BriefingList and BriefingCard", () => {
  const earlier: BriefingData = { ...BRIEFING, slug: "earlier", title: "An earlier briefing" };

  it("lists each briefing as a link, its masthead and its key stories' headlines alone", async () => {
    const { container } = await render(<BriefingList briefings={[BRIEFING, earlier]} section={BRIEFINGS} />);
    const cards = [...container.querySelectorAll("ol > li > a")];
    expect(cards.map((card) => card.getAttribute("href"))).toEqual([
      `/campaigns/briefings/${BRIEFING.slug}`,
      "/campaigns/briefings/earlier",
    ]);
    expect(cards.map((card) => card.querySelector("h2")!.textContent)).toEqual([BRIEFING.title, "An earlier briefing"]);
    expect(cards[0].textContent).toContain("Monday: Anthropic files to go public.");
    expect(cards[0].textContent).not.toContain("resist shutdown");
    expect(cards[0].textContent).toContain("Read the briefing →");
    // A link in a link isn't allowed: the author's name isn't one here.
    expect(cards[0].querySelector("a")).toBeNull();
  });

  it("is a sheet that isn't an article", async () => {
    const { container } = await render(<BriefingCard briefing={BRIEFING} section={BRIEFINGS} />);
    expect(container.querySelector("article")).toBeNull();
    expect(container.querySelector("a > div")).not.toBeNull();
  });
});

describe("BriefingMasthead", () => {
  it("puts the logo and byline beside the week, and the title under both", async () => {
    const { container } = await render(<BriefingMasthead briefing={BRIEFING} />);
    await expect.element(page.getByRole("img", { name: "PauseAI" })).toBeVisible();
    expect(container.querySelector("p")!.textContent).toBe("By Annabelle Collins · 30 October 2026");
    expect(page.getByRole("link", { name: "Annabelle Collins" }).element().getAttribute("href")).toMatch(
      /^\/people\/.+$/,
    );
    const byline = container.querySelector("p")!.getBoundingClientRect();
    const week = container.querySelector("ol")!.getBoundingClientRect();
    const title = page.getByRole("heading", { level: 1 }).element().getBoundingClientRect();
    expect(week.left).toBeGreaterThan(byline.right);
    expect(title.top).toBeGreaterThan(week.bottom);
  });

  it("names the organisation without a link", async () => {
    await render(<BriefingMasthead briefing={{ ...BRIEFING, author: "PauseAI UK" }} />);
    expect(page.getByRole("link").query()).toBeNull();
    expect(page.getByText("By PauseAI UK", { exact: false }).query()).not.toBeNull();
  });

  it("on a card, titles it as a card's heading", async () => {
    await render(<BriefingMasthead briefing={BRIEFING} card />);
    await expect.element(page.getByRole("heading", { level: 2, name: BRIEFING.title })).toBeVisible();
    expect(page.getByRole("link").query()).toBeNull();
  });
});

describe("BriefingBox", () => {
  it("heads its box with a tab, its frame and markers in its topic's colour, the headline's tab stronger", async () => {
    const { container } = await render(
      <BriefingSheet>
        <BriefingBox title="Westminster" tone="parliament">
          <ul>
            <li>A story</li>
          </ul>
        </BriefingBox>
        <BriefingBox title="Key stories" tone="headline">
          <p>Stories</p>
        </BriefingBox>
      </BriefingSheet>,
    );
    const [westminster, key] = [...container.querySelectorAll("section")];
    expect(getComputedStyle(westminster, "::before").borderTopColor).toBe(token("--briefing-parliament"));
    expect(getComputedStyle(westminster.querySelector("h2")!).backgroundColor).toBe(token("--briefing-parliament"));
    expect(getComputedStyle(westminster.querySelector("li")!, "::marker").color).toBe(token("--briefing-parliament"));
    expect(getComputedStyle(key.querySelector("h2")!).backgroundColor).toBe(token("--briefing-headline-strong"));
  });
});

describe("KeyStories", () => {
  it("leads each story with its headline in bold, or shows the headlines alone", async () => {
    const { container, rerender } = await render(<KeyStories stories={STORIES} />);
    const items = () => [...container.querySelectorAll("li")].map((item) => item.textContent);
    expect(items()).toEqual(["Monday: a filing. It filed.", "Wednesday: a budget. It spent."]);
    expect(container.querySelector("li strong")!.textContent).toBe("Monday: a filing.");
    await rerender(<KeyStories stories={STORIES} leads />);
    expect(items()).toEqual(["Monday: a filing.", "Wednesday: a budget."]);
  });
});

describe("BriefingColumns", () => {
  it.each(["aside", "figure", "even", "pair"] as const)("sets its %s side by side", async (layout) => {
    const { container } = await render(
      <div style={{ width: 900 }}>
        <BriefingColumns layout={layout}>
          <p>One</p>
          <p>Two</p>
        </BriefingColumns>
      </div>,
    );
    const [one, two] = [...container.querySelectorAll("p")].map((p) => p.getBoundingClientRect());
    expect(two.left).toBeGreaterThan(one.right);
    expect(two.top).toBe(one.top);
  });

  it("stacks them on a phone", async () => {
    await page.viewport(390, 800);
    const { container } = await render(
      <BriefingColumns layout="aside">
        <p>One</p>
        <p>Two</p>
      </BriefingColumns>,
    );
    const [one, two] = [...container.querySelectorAll("p")].map((p) => p.getBoundingClientRect());
    expect(two.top).toBeGreaterThan(one.bottom);
  });

  it("makes a pair of boxes as tall as each other, the second wider", async () => {
    const { container } = await render(
      <div style={{ width: 900 }}>
        <BriefingColumns layout="pair">
          <BriefingBox title="Short" tone="good">
            <p>One</p>
          </BriefingBox>
          <BriefingBox title="Long" tone="diary">
            <p>One</p>
            <p>Two</p>
            <p>Three</p>
          </BriefingBox>
        </BriefingColumns>
      </div>,
    );
    const [short, long] = [...container.querySelectorAll("section")].map((box) => box.getBoundingClientRect());
    expect(short.height).toBe(long.height);
    expect(long.width).toBeGreaterThan(short.width);
  });
});

describe("BriefingQuote", () => {
  it("quotes in italic, who said it under, its size as asked", async () => {
    const { container } = await render(
      <>
        <BriefingQuote who="Jane Smith" size="small">
          “Small”
        </BriefingQuote>
        <BriefingQuote who="Jane Smith">“Medium”</BriefingQuote>
        <BriefingQuote who="Jane Smith" size="large">
          “Large”
        </BriefingQuote>
      </>,
    );
    const quotes = [...container.querySelectorAll("blockquote")];
    expect(quotes[0].querySelectorAll("p")[1].textContent).toBe("Jane Smith");
    expect(getComputedStyle(quotes[0].querySelector("p")!).fontStyle).toBe("italic");
    const sizes = quotes.map((quote) => parseFloat(getComputedStyle(quote).fontSize));
    expect(sizes[0]).toBeLessThan(sizes[1]);
    expect(sizes[1]).toBeLessThan(sizes[2]);
  });
});

describe("BriefingText", () => {
  it("colours an accent and a subhead as their box, flags in red, and rules off an aside", async () => {
    const { container } = await render(
      <BriefingBox title="Box" tone="international">
        <h3>
          <Accent>Mon -</Accent> A debate <Flag>POSTPONED</Flag>
        </h3>
        <Subhead>What changed</Subhead>
        <Aside>Further ahead</Aside>
      </BriefingBox>,
    );
    const teal = token("--briefing-international");
    expect(getComputedStyle(page.getByText("Mon -").element()).color).toBe(teal);
    expect(getComputedStyle(page.getByText("What changed").element()).color).toBe(teal);
    expect(getComputedStyle(page.getByText("POSTPONED").element()).color).toBe(token("--briefing-risk"));
    expect(getComputedStyle(page.getByText("Further ahead").element()).borderTopStyle).toBe("dashed");
    expect(container.querySelector("h3")).not.toBeNull();
  });
});

describe("BriefingPicture", () => {
  it("sits at the bottom right of its box", async () => {
    const { container } = await render(
      <div style={{ display: "grid", width: 500, height: 600 }}>
        <BriefingBox title="Good news" tone="good">
          <p>News</p>
          <BriefingPicture src="/images/briefings/chest-x-ray.svg" alt="An X-ray" width={300} height={320} />
        </BriefingBox>
      </div>,
    );
    const box = container.querySelector("section")!.getBoundingClientRect();
    const picture = page.getByRole("img", { name: "An X-ray" }).element().getBoundingClientRect();
    expect(box.bottom - picture.bottom).toBeLessThan(40);
    expect(box.right - picture.right).toBeLessThan(40);
  });
});

describe("BriefingSources", () => {
  it("lists the sources under their heading", async () => {
    await render(
      <BriefingSources>
        <li id="source-1">A source</li>
      </BriefingSources>,
    );
    await expect.element(page.getByRole("heading", { level: 2, name: "Sources" })).toBeVisible();
    expect(page.getByRole("listitem").element().id).toBe("source-1");
  });
});

describe("tickStep", () => {
  it("steps by 1, 2 or 5 of a power of ten, to four marks or fewer", () => {
    expect(tickStep(165)).toBe(50);
    expect(tickStep(30)).toBe(10);
    expect(tickStep(10)).toBe(5);
    expect(tickStep(400)).toBe(100);
    expect(tickStep(900)).toBe(500);
  });
});

describe("BudgetChart", () => {
  const groups = [
    {
      name: "Safety",
      tone: "risk" as const,
      items: [
        { name: "Lab", amount: 30, purpose: "Tests things" },
        { name: "Shield", amount: 10, purpose: "Defends things" },
      ],
    },
    { name: "Industry", tone: "industry" as const, items: [{ name: "Fund", amount: 15, purpose: "Funds things" }] },
    { name: "Jobs", tone: "good" as const, items: [{ name: "Prize", amount: 20, purpose: "Rewards things" }] },
  ];

  it("splits the whole into its groups, named above but the last, which is named under", async () => {
    const { container } = await render(
      <BudgetChart groups={groups} totalLabel="£75m in total" purposeHeading="For" caption="£ millions." />,
    );
    const parts = [...container.querySelectorAll<HTMLElement>("figure > div:first-child > div")];
    expect(parts.map((part) => part.children[1].textContent)).toEqual(["£40m", "£15m", "£20m"]);
    expect(parts.map((part) => part.children[0].textContent)).toEqual(["Safety", "Industry", ""]);
    expect(parts.map((part) => part.children[2].textContent)).toEqual(["£75m in total", "", "Jobs"]);
    expect(parts[0].getBoundingClientRect().width).toBeGreaterThan(parts[2].getBoundingClientRect().width * 1.5);
    // Each group's in its topic's colour, its hatching at its own angle.
    expect(getComputedStyle(parts[0].children[0]).color).toBe(token("--briefing-risk"));
    expect(parts.map((part) => part.style.getPropertyValue("--angle"))).toEqual(["45deg", "135deg", "90deg"]);
    await expect.element(page.getByText("£ millions.")).toBeVisible();
  });

  it("lists every item largest first, its amount and what it's for, on an axis of £10m steps", async () => {
    await render(<BudgetChart groups={groups} totalLabel="" purposeHeading="For" caption="" />);
    const rows = page.getByRole("row").elements().slice(1, -1);
    expect(rows.map((row) => row.querySelector("th")!.firstChild!.textContent)).toEqual([
      "Lab",
      "Prize",
      "Fund",
      "Shield",
    ]);
    expect(rows.map((row) => row.querySelector("td")!.textContent)).toEqual(["30", "20", "15", "10"]);
    expect(page.getByRole("table").element().querySelector("thead th")!.textContent).toBe("For");
    expect(rows[0].querySelector("td:last-child")!.textContent).toBe("Tests things");
    expect(rows[0].querySelector("th span")!.textContent).toBe("Tests things");
    const bars = rows.map((row) => row.querySelector("td span")!.getBoundingClientRect());
    expect(bars[0].width).toBeGreaterThan(bars[1].width);
    expect(bars[1].width).toBeGreaterThan(bars[3].width);
    // The marks sit where the bars of their amounts end: £30m at the end of the largest.
    const marks = [...page.getByRole("table").element().querySelectorAll("tfoot span")];
    expect(marks.map((mark) => mark.textContent)).toEqual(["£0m", "£10m", "£20m", "£30m"]);
    const centre = (mark: Element) => {
      const box = mark.getBoundingClientRect();
      return box.left + box.width / 2;
    };
    expect(Math.abs(centre(marks[0]) - bars[0].left)).toBeLessThan(2);
    expect(Math.abs(centre(marks[3]) - bars[0].right)).toBeLessThan(2);
  });
});

describe("SignatoriesChart", () => {
  it("shows each count as a bar, the event after them, and the callout above the event", async () => {
    const { container } = await render(
      <div style={{ width: 400 }}>
        <SignatoriesChart
          title="Backers"
          counts={[
            { value: 10, date: "1 Jan", note: "launch" },
            { value: 20, date: "1 Feb", note: "latest" },
          ]}
          event={{ date: "1 Mar meeting", note: "15 countries" }}
          callout="Not signed"
          cite={<sup>1</sup>}
        />
      </div>,
    );
    await expect.element(page.getByText("Backers")).toBeVisible();
    const items = page.getByRole("listitem").elements();
    expect(items.map((item) => item.textContent)).toEqual([
      "101 Janlaunch",
      "201 Feblatest",
      "1 Mar meeting15 countries",
    ]);
    const bars = [...container.querySelectorAll("li > span:first-child > span:nth-child(2)")];
    expect(bars[1].getBoundingClientRect().height).toBeGreaterThan(bars[0].getBoundingClientRect().height * 1.8);
    const callout = page.getByText("Not signed").element().getBoundingClientRect();
    const event = items[2].getBoundingClientRect();
    expect(callout.left).toBeGreaterThanOrEqual(event.left);
    expect(callout.bottom).toBeLessThan(event.bottom);
    expect(container.querySelector("sup")?.textContent).toBe("1");
  });
});

describe("WeekCalendar", () => {
  it("shows each day's weekday and date, and what's on dotted by topic, ringing the busy days", async () => {
    const { container } = await render(
      <WeekCalendar
        days={[
          {
            date: "2026-11-02",
            events: [
              { what: "Third reading", tone: "parliament" },
              { what: "Summit", tone: "industry" },
            ],
          },
          { date: "2026-11-03", events: [] },
        ]}
      />,
    );
    const days = [...container.querySelectorAll("ol > li")];
    expect(days.map((day) => day.querySelector("time")!.textContent)).toEqual(["Mon2", "Tue3"]);
    expect(days[0].querySelector("time")!.getAttribute("dateTime")).toBe("2026-11-02");
    expect(days[0].querySelector("time")!.getAttribute("title")).toBe("2 November 2026");
    const events = [...days[0].querySelectorAll("ul li")];
    expect(events.map((event) => event.textContent)).toEqual(["Third reading", "Summit"]);
    expect(getComputedStyle(events[1], "::before").backgroundColor).toBe(token("--briefing-industry"));
    expect(days[1].querySelector("ul")).toBeNull();
    const ring = (day: Element) => getComputedStyle(day.querySelector("time > span:last-child")!).borderTopColor;
    expect(ring(days[0])).toBe(token("--briefing-headline"));
    expect(ring(days[0])).not.toBe(ring(days[1]));
  });
});
