import { afterEach, describe, expect, it, vi } from "vitest";
import { arrivalTags, rememberArrivalTags } from "./arrival-tags";

const start = location.href;

/** Puts the test's page at `search`, its path unchanged. */
function arriveWith(search: string) {
  history.replaceState(null, "", `${location.pathname}${search}`);
}

afterEach(() => {
  history.replaceState(null, "", start);
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("arrival tags", () => {
  it("reads the UTM tags from the address, utm_ left off, and nothing else", () => {
    arriveWith("?utm_source=in&utm_campaign=other&utm_medium=&ref=x");
    expect(arrivalTags()).toEqual({ source: "in", campaign: "other" });
  });

  it("keeps them for the visit, for a later untagged arrival, until a tagged one replaces them", () => {
    arriveWith("?utm_source=newsletter&utm_medium=email");
    rememberArrivalTags();
    arriveWith("");
    rememberArrivalTags();
    expect(arrivalTags()).toEqual({ source: "newsletter", medium: "email" });
    arriveWith("?utm_source=in");
    rememberArrivalTags();
    arriveWith("");
    expect(arrivalTags()).toEqual({ source: "in" });
  });

  it("has none when the visit has none", () => {
    expect(arrivalTags()).toEqual({});
  });

  it("makes do with the address when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    arriveWith("?utm_source=in");
    rememberArrivalTags();
    expect(arrivalTags()).toEqual({ source: "in" });
    arriveWith("");
    expect(arrivalTags()).toEqual({});
  });
});
