import { describe, expect, it } from "vitest";
import { monthsAndYears } from "./dated-groups";

describe("monthsAndYears", () => {
  it("puts things newest first under their month for the last twelve months, and their year before that", () => {
    const at = [
      "2026-10-02T10:00:00Z",
      "2025-12-01T00:00:00Z",
      "2026-10-20T10:00:00Z",
      "2025-11-30T23:59:00Z",
      "2024-05-01T00:00:00Z",
    ];
    expect(monthsAndYears(at, (when) => when, new Date("2026-11-02T12:00:00Z"))).toEqual([
      { key: "2026-10", heading: "October 2026", items: ["2026-10-20T10:00:00Z", "2026-10-02T10:00:00Z"] },
      { key: "2025-12", heading: "December 2025", items: ["2025-12-01T00:00:00Z"] },
      { key: "2025", heading: "2025", items: ["2025-11-30T23:59:00Z"] },
      { key: "2024", heading: "2024", items: ["2024-05-01T00:00:00Z"] },
    ]);
    expect(monthsAndYears([], (when: string) => when, new Date())).toEqual([]);
  });
});
