import { describe, expect, it } from "vitest";
import {
  carriedParams,
  choosingParams,
  sameParams,
  savedFilterHref,
  savedFilterId,
  savedParams,
  urlParams,
  withoutValues,
} from "./saved-filters";

describe("savedParams", () => {
  it("keeps a list's filters, its tab and its sort, without blanks; a list where one repeats", () => {
    expect(
      savedParams("politicians", {
        q: "dummy",
        house: "commons",
        party: ["Labour", "!Green"],
        status: "",
        sort: "name",
        dir: "desc",
        page: "3",
        mailing: "12",
        tab: "ticked",
        pasted: ["Jo"],
        saved: "4",
      }),
    ).toEqual({ q: "dummy", house: "commons", party: ["Labour", "!Green"], sort: "name", dir: "desc" });
    expect(
      savedParams("supporters", { near: "Leeds", within: "25", q: "jo", erased: "1", why: "mail", page: "2" }),
    ).toEqual({ near: "Leeds", within: "25", q: "jo" });
    expect(
      savedParams("events", { when: "past", owner: "!a@pauseai.uk", removed: "yes", sort: "name", saved: "1" }),
    ).toEqual({
      when: "past",
      owner: "!a@pauseai.uk",
      removed: "yes",
      sort: "name",
    });
  });
});

describe("choosingParams", () => {
  it("leaves out the sort, and the events list's tab", () => {
    expect(choosingParams("events", { when: "past", tag: "Talk", sort: "name", dir: "asc" })).toEqual({ tag: "Talk" });
    expect(choosingParams("politicians", { house: "lords", sort: "name" })).toEqual({ house: "lords" });
  });
});

describe("carriedParams", () => {
  it("is only who a mailing is being chosen for", () => {
    expect(carriedParams({ mailing: "12", pasted: ["Jo", "Al"], tab: "pasted", q: "x" })).toEqual({
      mailing: "12",
      pasted: ["Jo", "Al"],
    });
  });
});

describe("sameParams", () => {
  it("ignores order and blanks", () => {
    expect(sameParams({ party: ["a", "b"], q: "" }, { party: ["b", "a"], sort: [] })).toBe(true);
    expect(sameParams({ party: "a" }, { party: ["a"] })).toBe(true);
  });

  it("sees a value more, or a different one", () => {
    expect(sameParams({ party: ["a", "b"] }, { party: "a" })).toBe(false);
    expect(sameParams({ party: "a" }, {})).toBe(false);
    expect(sameParams({}, { party: "a" })).toBe(false);
  });
});

describe("withoutValues", () => {
  it("takes out those named, keeping the rest and those left out by a mark of their own", () => {
    expect(withoutValues({ party: ["a", "!b", "c"], q: "a", none: undefined }, ["party=a", "party=!b"])).toEqual({
      party: ["c"],
      q: ["a"],
      none: [],
    });
  });
});

describe("savedFilterHref", () => {
  it("is the list's page with the filter and its ID", () => {
    expect(savedFilterHref("events", 7, { when: "past" })).toBe("/staff/events?when=past&saved=7");
  });

  it("keeps what's carried", () => {
    expect(savedFilterHref("politicians", 7, { party: ["a", "b"] }, { mailing: "12" })).toBe(
      "/staff/politicians?party=a&party=b&mailing=12&saved=7",
    );
  });
});

describe("savedFilterId", () => {
  it("is a whole number above nought that's safe to send to the database", () => {
    expect(savedFilterId("12")).toBe(12);
    expect(savedFilterId(["12", "13"])).toBe(12);
    for (const not of [undefined, "", "0", "1x", "-1", "99999999999999999999"]) {
      expect(savedFilterId(not)).toBeUndefined();
    }
  });
});

describe("urlParams", () => {
  it("reads a URL's parameters, each as a list", () => {
    expect(urlParams("/staff/politicians?party=a&party=b&q=x%20y")).toEqual({ party: ["a", "b"], q: ["x y"] });
    expect(urlParams("/staff/politicians")).toEqual({});
  });
});
