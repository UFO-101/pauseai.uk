import { describe, expect, it } from "vitest";
import { staffCopy } from "@/lib/content/staff-interface";
import type { AskWithCounts } from "@/lib/server/asks";
import { askGroups, askPeriod } from "./ask-groups";

const ask = (fields: Partial<AskWithCounts>) =>
  ({ slug: "x", kind: "letter", date: null, firstLetter: null, lastLetter: null, ...fields }) as AskWithCounts;

describe("askPeriod", () => {
  it("gives an event its own day, whatever its letters", () => {
    const event = { kind: "event", firstLetter: "2026-10-12", lastLetter: "2026-10-14" } as const;
    expect(askPeriod(ask({ ...event, date: "2026-11-01" }))).toBe("1 Nov 2026");
    expect(askPeriod(ask(event))).toBe("");
  });

  it("gives a letter the months of its letters, or the day of the only one", () => {
    const letters = (firstLetter: string, lastLetter: string) =>
      askPeriod(ask({ date: "2020-01-01", firstLetter, lastLetter }));
    expect(letters("2026-06-18", "2026-11-04")).toBe("Jun–Nov 2026");
    expect(letters("2025-06-02", "2026-02-01")).toBe("Jun 2025–Feb 2026");
    expect(letters("2026-06-01", "2026-06-20")).toBe("Jun 2026");
    expect(letters("2026-10-29", "2026-10-29")).toBe("29 Oct 2026");
  });

  it("gives a letter with no letters the day typed for it, if any", () => {
    expect(askPeriod(ask({ date: "2025-02-06" }))).toBe("6 Feb 2025");
    expect(askPeriod(ask({}))).toBe("");
  });
});

describe("askGroups", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  const shape = (asks: AskWithCounts[]) =>
    askGroups(asks, now).map((group) => [group.heading, group.items.map((a) => a.slug)]);

  it("puts events still to come first, soonest first, today's among them", () => {
    expect(
      shape([
        ask({ slug: "later", kind: "event", date: "2027-01-01" }),
        ask({ slug: "today", kind: "event", date: "2026-11-06" }),
      ]),
    ).toEqual([[staffCopy.asks.comingUp, ["today", "later"]]]);
  });

  it("puts the rest under the month or year each last moved, those with no day last with no heading", () => {
    expect(
      shape([
        ask({ slug: "undated" }),
        ask({ slug: "undated event", kind: "event" }),
        ask({ slug: "old", date: "2025-02-06" }),
        ask({ slug: "past event", kind: "event", date: "2026-11-01", lastLetter: "2026-10-14" }),
        ask({ slug: "active", date: "2025-01-01", lastLetter: "2026-11-04" }),
        ask({ slug: "next year's letter", date: "2027-01-01" }),
      ]),
    ).toEqual([
      ["January 2027", ["next year's letter"]],
      ["November 2026", ["active", "past event"]],
      ["2025", ["old"]],
      ["", ["undated", "undated event"]],
    ]);
  });
});
