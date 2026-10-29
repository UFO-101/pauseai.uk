import { expect, it } from "vitest";
import { expectRedirect } from "@/tests/next-headers";
import { staffCopy } from "./content/staff-interface";
import { canonicalSupporter, registrationStatus, supporterTitle, type SupporterDetails } from "./supporters";

it("gives a registration's status with a capital, or registered when approved or unknown", () => {
  const { statuses, registered } = staffCopy.supporters.detail;
  expect(registrationStatus("waitlist")).toBe(statuses.waitlist[0].toUpperCase() + statuses.waitlist.slice(1));
  expect(registrationStatus("waitlist")).toMatch(/^[A-Z]/);
  expect(registrationStatus("approved")).toBe(registered);
  expect(registrationStatus(null)).toBe(registered);
});

it("names a supporter's page after them, or the stand-in when they have no name", () => {
  expect(supporterTitle({ name: "Jane Example" })).toBe("Jane Example");
  expect(supporterTitle({ name: null })).toBe(staffCopy.supporters.noName);
});

it("gives the supporter at their own ID, and redirects a merged one's old ID to it", async () => {
  const supporter = { summary: { id: 12 } } as SupporterDetails;
  expect(canonicalSupporter(12, supporter)).toBe(supporter);
  expect(await expectRedirect(async () => canonicalSupporter(1035, supporter))).toBe("/staff/supporters/12");
});
