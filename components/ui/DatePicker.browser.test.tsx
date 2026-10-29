import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { longDay } from "@/lib/calendar-days";
import DatePicker from "./DatePicker";

beforeEach(() => vi.useFakeTimers({ now: new Date("2026-10-29T12:00:00Z"), toFake: ["Date"] }));
afterEach(() => vi.useRealTimers());

const calendar = () => page.getByRole("dialog");
/** A day's button in the calendar, by its full name ("Friday 30 October 2026", and today's ", today"). */
const day = (d: string) => calendar().getByRole("button", { name: new RegExp(`^${longDay(d)}`) });
const hidden = () => document.querySelector<HTMLInputElement>('input[type="hidden"]')!;

/** A picker as a form's controlled field, with what it was last told. */
function Controlled({ initial, min, clearable }: { initial: string; min?: string; clearable?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DatePicker aria-label="When" name="day" value={value} onChange={setValue} min={min} clearable={clearable} />
      <output>{value || "none"}</output>
    </>
  );
}

describe("DatePicker", () => {
  it("shows the day, opens weeks running across the month's end, and takes the day clicked", async () => {
    await render(<Controlled initial="2026-10-30" />);
    const button = page.getByRole("button", { name: "When" });
    await expect.element(button).toHaveTextContent("Fri 30 Oct 2026");
    await expect.element(button).toHaveAccessibleDescription("Fri 30 Oct 2026");
    expect(hidden().value).toBe("2026-10-30");
    await button.click();
    await expect.element(calendar()).toBeVisible();
    await expect.element(button).toHaveAttribute("aria-expanded", "true");
    // From the week before, into the next month, its first day named.
    await expect.element(calendar().getByText("October – November 2026")).toBeVisible();
    await expect.element(day("2026-10-19")).toBeVisible();
    await expect.element(day("2026-11-29")).toBeVisible();
    await expect.element(day("2026-11-01")).toHaveTextContent("Nov1");
    await expect.element(day("2026-10-30")).toHaveAttribute("aria-pressed", "true");
    await expect.element(day("2026-10-30")).toHaveFocus();
    // Today, by name.
    await expect
      .element(calendar().getByRole("button", { name: `${longDay("2026-10-29")}, today` }))
      .toHaveAttribute("data-today");
    await day("2026-11-03").click();
    await expect.element(calendar()).not.toBeInTheDocument();
    await expect.element(button).toHaveFocus();
    await expect.element(button).toHaveTextContent("Tue 3 Nov 2026");
    expect(hidden().value).toBe("2026-11-03");
  });

  it("draws a stepped line where each month starts: over its first week, and down the left of its 1st", async () => {
    await render(<Controlled initial="2026-10-30" />);
    await page.getByRole("button", { name: "When" }).click();
    const cell = (d: string) => day(d).element().closest("td")!;
    // 1 November is a Sunday: the line runs over it, down its left, and over the next Monday to Saturday.
    expect(cell("2026-11-01").hasAttribute("data-month-left")).toBe(true);
    expect(["2026-11-01", "2026-11-02", "2026-11-07"].map((d) => cell(d).hasAttribute("data-month-top"))).toEqual([
      true,
      true,
      true,
    ]);
    expect(cell("2026-11-08").hasAttribute("data-month-top")).toBe(false);
    expect(cell("2026-10-31").hasAttribute("data-month-left")).toBe(false);
    expect(getComputedStyle(cell("2026-11-01")).borderLeftStyle).toBe("solid");
    // A 1st on a Monday starts its row, so there's no step, only the line over it.
    await userEvent.keyboard("{Escape}");
    await render(<DatePicker aria-label="June" defaultValue="2026-06-03" />);
    await page.getByRole("button", { name: "June" }).click();
    expect(cell("2026-06-01").hasAttribute("data-month-left")).toBe(false);
    expect(cell("2026-06-01").hasAttribute("data-month-top")).toBe(true);
  });

  it("moves a few weeks at a time, keeping the weeks either side in view", async () => {
    await render(<Controlled initial="2026-10-30" />);
    await page.getByRole("button", { name: "When" }).click();
    await calendar().getByRole("button", { name: "Later weeks" }).click();
    await expect.element(calendar().getByText("November – December 2026")).toBeVisible();
    await expect.element(day("2026-11-16")).toBeVisible();
    await calendar().getByRole("button", { name: "Earlier weeks" }).click();
    await calendar().getByRole("button", { name: "Earlier weeks" }).click();
    await expect.element(calendar().getByText("September – November 2026")).toBeVisible();
  });

  it("moves the focus by the keys, bringing its weeks into view, chooses by Enter, and closes on Escape", async () => {
    await render(<Controlled initial="2026-10-30" />);
    await page.getByRole("button", { name: "When" }).click();
    await expect.element(day("2026-10-30")).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect.element(day("2026-10-31")).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}{ArrowDown}");
    await expect.element(day("2026-11-05")).toHaveFocus();
    // Past the last week shown, which comes into view.
    await userEvent.keyboard("{PageDown}");
    await expect.element(day("2026-12-03")).toHaveFocus();
    // Before the first, likewise; other keys do nothing.
    await userEvent.keyboard("{PageUp}{PageUp}");
    await expect.element(day("2026-10-08")).toHaveFocus();
    await expect.element(day("2026-10-05")).toBeVisible();
    await userEvent.keyboard("{Home}{ArrowUp}");
    await expect.element(day("2026-10-01")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(page.getByText("2026-10-01")).toBeVisible();
    await page.getByRole("button", { name: "When" }).click();
    await userEvent.keyboard("{Escape}");
    await expect.element(calendar()).not.toBeInTheDocument();
    await expect.element(page.getByText("2026-10-01")).toBeVisible();
  });

  it("can't take a day before the first allowed, and opens with none chosen at the first", async () => {
    await render(<Controlled initial="" min="2026-11-02" />);
    const button = page.getByRole("button", { name: "When" });
    await expect.element(button).toHaveTextContent("Choose a day");
    expect(hidden().value).toBe("");
    await button.click();
    await expect.element(day("2026-11-02")).toHaveFocus();
    await expect.element(day("2026-11-01")).toHaveAttribute("aria-disabled", "true");
    await day("2026-11-01").click({ force: true });
    await expect.element(calendar()).toBeVisible();
    await expect.element(page.getByText("none")).toBeVisible();
    // Arrows still pass over the days before it.
    await userEvent.keyboard("{ArrowLeft}");
    await expect.element(day("2026-10-31")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect.element(page.getByText("none")).toBeVisible();
  });

  it("opens at today with no day and none too soon, and offers No day only when one can be taken away", async () => {
    await render(<Controlled initial="" clearable />);
    await page.getByRole("button", { name: "When" }).click();
    await expect.element(day("2026-10-29")).toHaveFocus();
    await expect.element(calendar().getByRole("button", { name: "No day" })).not.toBeInTheDocument();
    await day("2026-10-29").click();
    await page.getByRole("button", { name: "When" }).click();
    await calendar().getByRole("button", { name: "No day" }).click();
    await expect.element(page.getByText("none")).toBeVisible();
  });

  it("keeps its own day without a value, from its default, and can be disabled", async () => {
    await render(
      <>
        <DatePicker aria-label="Own" defaultValue="2026-10-30" />
        <DatePicker aria-label="Off" disabled />
        <DatePicker aria-label="Bad" defaultValue="soon" />
      </>,
    );
    await page.getByRole("button", { name: "Own" }).click();
    await day("2026-11-02").click();
    await expect.element(page.getByRole("button", { name: "Own" })).toHaveTextContent("Mon 2 Nov 2026");
    await expect.element(page.getByRole("button", { name: "Off" })).toBeDisabled();
    await expect.element(page.getByRole("button", { name: "Bad" })).toHaveTextContent("Choose a day");
    expect(document.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
  });
});
