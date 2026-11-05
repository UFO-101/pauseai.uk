import { describe, expect, it } from "vitest";
import { sectionsFor, staffPageOf } from "./staff-sections";

const pages = (permissions: Parameters<typeof sectionsFor>[0]) =>
  sectionsFor(permissions).map((s) => [s.id, s.pages.map((p) => p.id)]);

describe("sectionsFor", () => {
  it("shows each section with only the pages the permissions open, and hides an empty one", () => {
    expect(pages([])).toEqual([
      ["politicians", ["politicians", "asks", "mailings", "mpEmails"]],
      ["events", ["events"]],
      ["admin", ["import"]],
    ]);
    expect(pages(["supporters"])).toEqual([
      ["supporters", ["supporters", "campaigns", "supporterEmails"]],
      ["politicians", ["politicians", "asks", "mailings", "mpEmails"]],
      ["events", ["events"]],
      ["admin", ["import"]],
    ]);
    expect(pages(["admin"])).toEqual([
      ["politicians", ["politicians", "asks", "mailings", "mpEmails"]],
      ["events", ["events"]],
      ["admin", ["import", "accounts", "changes", "sentEmails"]],
    ]);
  });
});

describe("staffPageOf", () => {
  it("finds the page a path is, or is under, by the longest whole segment", () => {
    expect(staffPageOf("/staff/supporters")?.id).toBe("supporters");
    expect(staffPageOf("/staff/supporters/[id]/erase")?.id).toBe("supporters");
    expect(staffPageOf("/staff/supporters/blocked-emails")?.id).toBe("supporterEmails");
    expect(staffPageOf("/staff/letters/supporter/[id]")?.id).toBe("supporters");
    expect(staffPageOf("/staff/letters/[id]")?.id).toBe("campaigns");
    expect(staffPageOf("/staff/campaigns/[slug]")?.id).toBe("campaigns");
    expect(staffPageOf("/staff/politicians/[id]")).toEqual({ id: "politicians", href: "/staff/politicians" });
    expect(staffPageOf("/staff/lettersx")).toBeUndefined();
    expect(staffPageOf("/staff")).toBeUndefined();
  });
});
