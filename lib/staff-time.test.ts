import { describe, expect, it, vi } from "vitest";
import {
  earliestHour,
  fromLondon,
  hourNotTooSoon,
  londonDayHour,
  londonClock,
  londonWhen,
  londonWhenShort,
  sendsAt,
  staffClock,
  staffDate,
  staffDay,
  staffTime,
} from "./staff-time";

it("names the day, in UTC", () => {
  expect(staffDate("2026-11-03T10:34:56Z")).toBe("3 Nov 2026");
  expect(staffDate("2026-10-16T23:30:00-05:00")).toBe("17 Oct 2026");
});

it("is the day and the time to the minute, in UTC", () => {
  expect(staffTime("2026-10-16T10:34:56.789Z")).toBe("16 Oct 2026, 10:34");
  expect(staffTime("2026-10-16T23:30:00+01:00")).toBe("16 Oct 2026, 22:30");
});

it("names the weekday, day and month, in UTC", () => {
  expect(staffDay("2026-10-16T12:00:00Z")).toBe("Friday 16 October");
  expect(staffDay("2026-10-16T23:30:00-05:00")).toBe("Saturday 17 October");
});

it("is the time of day to the minute, in UTC", () => {
  expect(staffClock("2026-10-16T09:04:56.789Z")).toBe("09:04");
  expect(staffClock("2026-10-16T23:30:00+01:00")).toBe("22:30");
});

describe("London's time, for when a mailing goes", () => {
  it("reads a moment as London's day and hour, in winter and in summer time", () => {
    expect(londonDayHour("2026-11-30T09:00:00Z")).toEqual({ day: "2026-11-30", hour: 9 });
    expect(londonDayHour("2026-07-01T23:30:00Z")).toEqual({ day: "2026-07-02", hour: 0 });
  });

  it("makes a moment from London's day and hour", () => {
    expect(fromLondon("2026-11-30", 9)).toBe("2026-11-30T09:00:00.000Z");
    expect(fromLondon("2026-07-02", 0)).toBe("2026-07-01T23:00:00.000Z");
  });

  it("says when, in London", () => {
    expect(londonWhen("2026-10-30T09:00:00Z")).toBe("Friday 30 October at 09:18");
    expect(londonWhen("2026-07-02T08:00:00Z")).toBe("Thursday 2 July at 09:18");
    expect(londonWhenShort("2026-10-30T09:00:00Z")).toBe("Fri 30 Oct, 09:18");
    expect(londonWhen("2026-10-30T09:00:00Z", "short")).toBe("Fri 30 Oct at 09:18");
    // Overnight, when the sending doesn't run, at its first run of the morning.
    expect(londonWhen("2026-10-30T03:00:00Z")).toBe("Friday 30 October at 06:18");
    expect(londonWhen("2026-07-02T02:00:00Z")).toBe("Thursday 2 July at 07:18");
  });
});

it("sends a mailing at its hour's run of the sending, or overnight at the morning's first", () => {
  expect(sendsAt("2026-10-30T09:00:00.000Z")).toBe("2026-10-30T09:18:00.000Z");
  expect(sendsAt("2026-10-30T23:00:00.000Z")).toBe("2026-10-30T23:18:00.000Z");
  expect(sendsAt("2026-10-30T00:00:00.000Z")).toBe("2026-10-30T06:18:00.000Z");
  expect(londonClock("2026-07-02T23:18:00Z")).toBe("00:18");
});

describe("the first hour a mailing can go", () => {
  it("is the next whole hour at least five minutes away", () => {
    vi.useFakeTimers({ now: new Date("2026-07-01T10:30:00Z"), toFake: ["Date"] });
    try {
      expect(earliestHour()).toBe("2026-07-01T11:00:00.000Z");
      vi.setSystemTime(new Date("2026-07-01T10:56:00Z"));
      expect(earliestHour()).toBe("2026-07-01T12:00:00.000Z");
      vi.setSystemTime(new Date("2026-07-01T10:55:00Z"));
      expect(earliestHour()).toBe("2026-07-01T11:00:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves an hour too soon on that day to it, and keeps any other", () => {
    const earliest = { day: "2026-07-01", hour: 12 };
    expect(hourNotTooSoon("2026-07-01", 9, earliest)).toBe(12);
    expect(hourNotTooSoon("2026-07-01", 14, earliest)).toBe(14);
    expect(hourNotTooSoon("2026-07-02", 9, earliest)).toBe(9);
  });
});
