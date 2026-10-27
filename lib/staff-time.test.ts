import { expect, it } from "vitest";
import { staffClock, staffDate, staffDay, staffTime } from "./staff-time";

it("names the day, in UTC", () => {
  expect(staffDate("2026-11-03T10:34:56Z")).toBe("3 Nov 2026");
  expect(staffDate("2026-10-16T23:30:00-05:00")).toBe("17 Oct 2026");
});

it("is the ISO date and time to the minute, in UTC", () => {
  expect(staffTime("2026-10-16T10:34:56.789Z")).toBe("2026-10-16 10:34");
  expect(staffTime("2026-10-16T23:30:00+01:00")).toBe("2026-10-16 22:30");
});

it("names the weekday, day and month, in UTC", () => {
  expect(staffDay("2026-10-16T12:00:00Z")).toBe("Friday 16 October");
  expect(staffDay("2026-10-16T23:30:00-05:00")).toBe("Saturday 17 October");
});

it("is the time of day to the minute, in UTC", () => {
  expect(staffClock("2026-10-16T09:04:56.789Z")).toBe("09:04");
  expect(staffClock("2026-10-16T23:30:00+01:00")).toBe("22:30");
});
