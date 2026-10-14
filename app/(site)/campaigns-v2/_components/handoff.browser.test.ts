import { afterEach, describe, expect, it, vi } from "vitest";
import { leaveHandoff, takeHandoff, type Handoff } from "./handoff";

const HANDOFF: Handoff = {
  from: "regulate-letter-pm",
  to: "support-sobel-bill",
  name: "Jane Smith",
  postcode: "SW1A 1AA",
  mp: { name: "Rachel Blake", salutation: "Ms Blake", constituency: "Cities of London and Westminster", email: null },
  statuses: { "regulate-letter-pm": "signed" },
};

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("handoff", () => {
  it("is taken once, by the page it's for", () => {
    expect(leaveHandoff(HANDOFF)).toBe(true);
    expect(takeHandoff("support-sobel-bill")).toEqual(HANDOFF);
    expect(takeHandoff("support-sobel-bill")).toBeNull();
  });

  it("isn't taken by another page, which drops it", () => {
    leaveHandoff(HANDOFF);
    expect(takeHandoff("regulate-letter-pm")).toBeNull();
    expect(takeHandoff("support-sobel-bill")).toBeNull();
  });

  it("does without sessionStorage when the browser blocks it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(leaveHandoff(HANDOFF)).toBe(false);
    expect(takeHandoff("support-sobel-bill")).toBeNull();
  });
});
