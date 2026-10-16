import { expect, it } from "vitest";
import { staffTime } from "./staff-time";

it("is the ISO date and time to the minute, in UTC", () => {
  expect(staffTime("2026-10-16T10:34:56.789Z")).toBe("2026-10-16 10:34");
  expect(staffTime("2026-10-16T23:30:00+01:00")).toBe("2026-10-16 22:30");
});
