import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import BudgetChart from "./BudgetChart";
import SignatoriesChart from "./SignatoriesChart";
import WeekCalendar from "./WeekCalendar";

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
    { name: "Jobs", tone: "good" as const, items: [{ name: "Prize", amount: 20, purpose: "Rewards things" }] },
  ];

  it("splits the whole into its groups, labelled with their totals and keyed by name", async () => {
    const { container } = await render(
      <BudgetChart groups={groups} totalLabel="£60m in total" purposeHeading="For" caption="£ millions." />,
    );
    const parts = [...container.querySelectorAll<HTMLElement>("figure > div > span")];
    expect(parts.map((part) => part.textContent)).toEqual(["£40m", "£20m"]);
    // The groups' shares of the whole set the parts' widths.
    expect(parts[0].getBoundingClientRect().width).toBeGreaterThan(parts[1].getBoundingClientRect().width * 1.5);
    expect(parts[0].style.getPropertyValue("--share")).toBe(String(40 / 60));
    await expect.element(page.getByText("£60m in total")).toBeVisible();
    expect(
      page
        .getByRole("listitem")
        .elements()
        .map((item) => item.textContent),
    ).toEqual(["Safety", "Jobs"]);
    await expect.element(page.getByText("£ millions.")).toBeVisible();
  });

  it("lists every item largest first, with its amount and what it's for", async () => {
    await render(<BudgetChart groups={groups} totalLabel="" purposeHeading="For" caption="" />);
    const rows = page.getByRole("row").elements().slice(1);
    expect(rows.map((row) => row.querySelector("th")!.firstChild!.textContent)).toEqual(["Lab", "Prize", "Shield"]);
    expect(rows.map((row) => row.querySelector("td")!.textContent)).toEqual(["30", "20", "10"]);
    // What each is for has a column of its own on a wide screen, and goes under the name on a phone.
    expect(page.getByRole("table").element().querySelector("thead th")!.textContent).toBe("For");
    expect(rows[0].querySelector("td:last-child")!.textContent).toBe("Tests things");
    expect(rows[0].querySelector("th span")!.textContent).toBe("Tests things");
    // The largest item's bar is the longest.
    const bars = rows.map((row) => row.querySelector("td span")!.getBoundingClientRect().width);
    expect(bars[0]).toBeGreaterThan(bars[1]);
    expect(bars[1]).toBeGreaterThan(bars[2]);
  });
});

describe("SignatoriesChart", () => {
  it("shows each count as a bar, the event after them, and the callout", async () => {
    const { container } = await render(
      <SignatoriesChart
        title="Backers"
        counts={[
          { value: 10, date: "1 Jan", note: "launch" },
          { value: 20, date: "1 Feb", note: "latest" },
        ]}
        event={{ date: "1 Mar meeting", note: "15 countries" }}
        callout="Not signed"
        cite={<sup>1</sup>}
      />,
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
    await expect.element(page.getByText("Not signed")).toBeVisible();
    expect(container.querySelector("sup")?.textContent).toBe("1");
  });
});

describe("WeekCalendar", () => {
  it("shows each day's weekday and date, and what's on, ringing the busy days", async () => {
    const { container } = await render(
      <WeekCalendar
        days={[
          { date: "2026-11-02", events: [{ what: "Third reading", tone: "parliament" }, { what: "Summit", tone: "industry" }] },
          { date: "2026-11-03", events: [] },
        ]}
      />,
    );
    const days = [...container.querySelectorAll("ol > li")];
    expect(days.map((day) => day.querySelector("time")!.textContent)).toEqual(["Mon2", "Tue3"]);
    expect(days[0].querySelector("time")!.getAttribute("dateTime")).toBe("2026-11-02");
    expect(days[0].querySelector("time")!.getAttribute("title")).toBe("2 November 2026");
    expect([...days[0].querySelectorAll("ul li")].map((event) => event.textContent)).toEqual([
      "Third reading",
      "Summit",
    ]);
    expect(days[1].querySelector("ul")).toBeNull();
    const ring = (day: Element) => getComputedStyle(day.querySelector("time > span:last-child")!).borderTopColor;
    expect(ring(days[0])).not.toBe(ring(days[1]));
  });
});
