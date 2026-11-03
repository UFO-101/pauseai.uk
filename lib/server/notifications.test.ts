import { afterEach, expect, it, vi } from "vitest";
import { describeWithDatabase, useTestDatabase } from "@/tests/database";
import { NOTIFICATIONS, notifications } from "@/tests/notifications";
import { query } from "./db";
import { notifyStaff, staffLink } from "./notifications";

afterEach(() => vi.unstubAllEnvs());

it("links to the site where the build knows its address, and gives the path where it can't", () => {
  vi.stubEnv("SITE_ORIGIN", "https://pauseai.uk");
  expect(staffLink("/staff/letters", undefined)).toBe("https://pauseai.uk/staff/letters");
  vi.stubEnv("SITE_ORIGIN", "");
  vi.stubEnv("DEPLOY_CONTEXT", "local");
  expect(staffLink("/staff/letters", undefined)).toBe("/staff/letters");
});

describeWithDatabase("notifyStaff", () => {
  useTestDatabase();

  it("emails the notification inbox, logged as a staff alert, and nothing where it isn't set", async () => {
    const sent = notifications();
    expect(await notifyStaff("Subject", "Body")).toBe(true);
    expect(sent).toEqual([expect.objectContaining({ To: NOTIFICATIONS, Subject: "Subject", TextBody: "Body" })]);
    expect(await query("SELECT purpose, address, letter_id FROM email_sends")).toEqual([
      { purpose: "staff-alert", address: NOTIFICATIONS, letter_id: null },
    ]);
    vi.stubEnv("NOTIFICATION_INBOX", "");
    expect(await notifyStaff("Subject", "Body")).toBe(false);
    expect(sent).toHaveLength(1);
  });
});
