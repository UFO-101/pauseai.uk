import { describe, expect, it } from "vitest";
import { sectionsFor, STAFF_SECTIONS } from "./staff-sections";

describe("sectionsFor", () => {
  it("shows everyone the open groups, and the admin group to admins", () => {
    expect(sectionsFor([]).map((s) => s.id)).toEqual(["politicians", "data"]);
    expect(sectionsFor(["supporters"]).map((s) => s.id)).toEqual(["supporters", "politicians", "data"]);
    expect(sectionsFor(["admin"]).map((s) => s.id)).toEqual(["politicians", "data", "admin"]);
    expect(STAFF_SECTIONS.flatMap((s) => s.pages.map((p) => p.href))).toContain("/staff/accounts");
  });
});
