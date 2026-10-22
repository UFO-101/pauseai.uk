import { describe, expect, it } from "vitest";
import { parseSort, sortHref } from "./staff-sort";

const columns = { name: "asc", events: "desc" } as const;

describe("parseSort", () => {
  it("takes a known column and direction, or the fallback in its natural direction", () => {
    expect(parseSort(columns, "name")).toEqual({ key: "name", dir: "asc" });
    expect(parseSort(columns, "name", "events")).toEqual({ key: "events", dir: "desc" });
    expect(parseSort(columns, "name", "events", "asc")).toEqual({ key: "events", dir: "asc" });
    expect(parseSort(columns, "name", "age", "down")).toEqual({ key: "name", dir: "asc" });
  });
});

describe("sortHref", () => {
  it("keeps the filters, sorts by the column its natural way, or the other way when it's already the sort", () => {
    const current = { key: "name", dir: "asc" } as const;
    expect(sortHref("/staff/x", { q: "jo", house: "" }, columns, current, "events")).toBe(
      "/staff/x?q=jo&sort=events&dir=desc",
    );
    expect(sortHref("/staff/x", {}, columns, current, "name")).toBe("/staff/x?sort=name&dir=desc");
    expect(sortHref("/staff/x", {}, columns, { key: "name", dir: "desc" }, "name")).toBe("/staff/x?sort=name&dir=asc");
  });
});
