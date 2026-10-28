import { describe, expect, it } from "vitest";
import { fromLondon, londonDayHour, londonWhen, staffClock, staffDate, staffDay, staffTime } from "./staff-time";

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
    expect(londonWhen("2026-10-30T09:00:00Z")).toBe("Friday 30 October at 09:00");
    expect(londonWhen("2026-07-02T08:00:00Z")).toBe("Thursday 2 July at 09:00");
  });
});
