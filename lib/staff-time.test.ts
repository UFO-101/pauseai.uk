import { expect, it } from "vitest";
import { staffDate, staffTime } from "./staff-time";

it("names the day, in UTC", () => {
  expect(staffDate("2026-11-03T10:34:56Z")).toBe("3 Nov 2026");
  expect(staffDate("2026-10-16T23:30:00-05:00")).toBe("17 Oct 2026");
});

it("is the ISO date and time to the minute, in UTC", () => {
  expect(staffTime("2026-10-16T10:34:56.789Z")).toBe("2026-10-16 10:34");
  expect(staffTime("2026-10-16T23:30:00+01:00")).toBe("2026-10-16 22:30");
});
