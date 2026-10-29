import { afterEach, expect, it, vi } from "vitest";
import {
  addDays,
  isDay,
  longDay,
  mondayOf,
  monthsBetween,
  shortDay,
  shortMonth,
  today,
  weeksFrom,
} from "./calendar-days";

afterEach(() => vi.useRealTimers());

it("knows a day from anything else", () => {
  expect(isDay("2026-10-30")).toBe(true);
  expect(isDay("2026-02-30")).toBe(false);
  expect(isDay("2026-13-45")).toBe(false);
  expect(isDay("30/10/2026")).toBe(false);
  expect(isDay("")).toBe(false);
});

it("counts days across months, years and clock changes", () => {
  expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
});

it("finds a week's Monday, and lays weeks out from it", () => {
  expect(mondayOf("2026-11-01")).toBe("2026-10-26");
  expect(mondayOf("2026-10-26")).toBe("2026-10-26");
  const weeks = weeksFrom("2026-10-26", 2);
  expect(weeks.map((week) => [week[0], week[6]])).toEqual([
    ["2026-10-26", "2026-11-01"],
    ["2026-11-02", "2026-11-08"],
  ]);
});

it("knows today in London, which is ahead of UTC in summer", () => {
  vi.useFakeTimers({ now: new Date("2026-07-01T23:30:00Z"), toFake: ["Date"] });
  expect(today()).toBe("2026-07-02");
});

it("says a day short, in full, and its month", () => {
  expect(shortDay("2026-10-30")).toBe("Fri 30 Oct 2026");
  expect(longDay("2026-10-30")).toBe("Friday 30 October 2026");
  expect(shortMonth("2026-11-01")).toBe("Nov");
});

it("names the months a run of days spans", () => {
  expect(monthsBetween("2026-10-05", "2026-10-25")).toBe("October 2026");
  expect(monthsBetween("2026-10-26", "2026-12-06")).toBe("October – December 2026");
  expect(monthsBetween("2026-12-28", "2027-02-07")).toBe("December 2026 – February 2027");
});
