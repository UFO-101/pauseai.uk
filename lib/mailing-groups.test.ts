import { describe, expect, it } from "vitest";
import { staffCopy } from "@/lib/content/staff-interface";
import type { MailingSummary } from "@/lib/server/mailings";
import { mailingGroups, mailingWhen } from "./mailing-groups";

const base: MailingSummary = {
  id: 0,
  title: "",
  ask: null,
  askTitle: null,
  imported: false,
  state: "sent",
  createdBy: null,
  fromName: null,
  dueAt: null,
  updatedAt: "2026-01-01T00:00:00Z",
  to: 1,
  sentAt: null,
  sent: 1,
  skipped: 0,
  bounced: 0,
  replied: 0,
  answered: 0,
};
const one = (id: number, more: Partial<MailingSummary>): MailingSummary => ({ ...base, id, ...more });
const ids = (mailings: MailingSummary[]) => mailings.map((m) => m.id);

describe("mailingWhen", () => {
  it("is when its first letter went, or else when it was due, or last changed", () => {
    expect(mailingWhen(one(1, { sentAt: "2026-10-01T09:00:00Z", dueAt: "2026-09-01T09:00:00Z" }))).toBe(
      "2026-10-01T09:00:00.000Z",
    );
    expect(mailingWhen(one(1, { dueAt: "2026-09-01T09:00:00Z" }))).toBe("2026-09-01T09:00:00.000Z");
    expect(mailingWhen(one(1, {}))).toBe("2026-01-01T00:00:00.000Z");
    // As the database gives it.
    expect(mailingWhen(one(1, { sentAt: new Date("2026-10-01T09:00:00Z") as unknown as string }))).toBe(
      "2026-10-01T09:00:00.000Z",
    );
  });
});

describe("mailingGroups", () => {
  const now = new Date("2026-10-30T12:00:00Z");

  it("puts coming up first, sending before scheduled, then the drafts; then each month of the last year, then each year", () => {
    const groups = mailingGroups(
      {
        drafts: [one(1, { state: "draft" })],
        comingUp: [one(2, { state: "scheduled" }), one(3, { state: "sending" })],
        sent: [
          one(4, { sentAt: "2026-10-01T09:00:00Z" }),
          one(5, { sentAt: "2026-10-29T09:00:00Z" }),
          one(6, { sentAt: "2025-11-01T00:00:00Z" }),
          one(7, { sentAt: "2025-10-31T23:00:00Z" }),
          one(8, { sentAt: "2024-03-01T00:00:00Z" }),
        ],
      },
      now,
    );
    expect(groups.map((g) => [g.heading, ids(g.mailings)])).toEqual([
      [staffCopy.mailingPages.comingUp, [3, 2, 1]],
      ["October 2026", [5, 4]],
      ["November 2025", [6]],
      ["2025", [7]],
      ["2024", [8]],
    ]);
  });

  it("has no Coming up with nothing coming, and nothing for none", () => {
    expect(mailingGroups({ drafts: [], comingUp: [], sent: [] }, now)).toEqual([]);
    expect(
      mailingGroups({ drafts: [], comingUp: [], sent: [one(1, { sentAt: "2026-10-01T00:00:00Z" })] }, now).map(
        (g) => g.key,
      ),
    ).toEqual(["2026-10"]);
  });
});
