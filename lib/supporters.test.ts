import { expect, it } from "vitest";
import { expectRedirect } from "@/tests/next-headers";
import { staffCopy } from "./content/staff-interface";
import {
  canonicalSupporter,
  eventsCounted,
  eventsOf,
  registrationStatus,
  supporterTitle,
  type SupporterActivity,
  type SupporterDetails,
} from "./supporters";

it("gives a registration's status with a capital, or registered when approved or unknown", () => {
  const { statuses, registered } = staffCopy.supporters.detail;
  expect(registrationStatus("waitlist")).toBe(statuses.waitlist[0].toUpperCase() + statuses.waitlist.slice(1));
  expect(registrationStatus("waitlist")).toMatch(/^[A-Z]/);
  expect(registrationStatus("approved")).toBe(registered);
  expect(registrationStatus(null)).toBe(registered);
});

it("lists their events, registered for or hosted, and counts the different ones not declined", () => {
  const row = (kind: SupporterActivity["kind"], href: string, detail: string | null = null) =>
    ({ kind, href, detail }) as SupporterActivity;
  const activity = [
    row("luma-registered", "https://luma.com/a", "approved"),
    row("luma-hosted", "https://luma.com/a"),
    row("luma-hosted", "https://luma.com/b"),
    row("luma-registered", "https://luma.com/c", "declined"),
    row("luma-contact", "https://luma.com/d"),
  ];
  expect(eventsOf(activity)).toEqual(activity.slice(0, 4));
  expect(eventsCounted(activity)).toBe(2);
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
