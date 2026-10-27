import { describe, expect, it } from "vitest";
import {
  accountsSearch,
  emailsSearch,
  letterId,
  mailingId,
  lettersSearch,
  pageNumber,
  pagePath,
  filtersPath,
  pageParam,
  politicianId,
  supporterId,
  supportersSearch,
} from "./staff-search";

describe("lettersSearch", () => {
  const none = {
    status: undefined,
    search: undefined,
    answered: undefined,
    campaign: undefined,
    consent: undefined,
    page: 1,
  };

  it("filters by a status, a search, whether answered, a campaign and consent", () => {
    expect(
      lettersSearch({
        status: "sent",
        q: " jane ",
        answered: "yes",
        campaign: "regulate-letter-pm",
        consent: "yes",
        page: "2",
      }),
    ).toEqual({
      status: "sent",
      q: " jane ",
      answered: "yes",
      campaign: "regulate-letter-pm",
      consent: "yes",
      page: "2",
      filter: {
        status: "sent",
        search: "jane",
        answered: true,
        campaign: "regulate-letter-pm",
        consent: true,
        page: 2,
      },
    });
    expect(lettersSearch({ answered: "no", consent: "no" }).filter).toEqual({
      ...none,
      answered: false,
      consent: false,
    });
  });

  it("filters by nothing when each is blank or unknown", () => {
    expect(lettersSearch({})).toEqual({
      status: "",
      q: "",
      answered: "",
      campaign: "",
      consent: "",
      page: "",
      filter: none,
    });
    expect(
      lettersSearch({ status: "nope", q: "  ", answered: "maybe", campaign: "nope", consent: "maybe" }).filter,
    ).toEqual(none);
    // A name every object inherits isn't a status.
    expect(lettersSearch({ status: "toString" }).filter).toEqual(none);
  });
});

describe("politicianId", () => {
  it("reads a whole number, and nothing else", () => {
    expect(politicianId("12")).toBe(12);
    for (const id of ["x", "1.5", "-1", ""]) expect(politicianId(id)).toBeUndefined();
  });
});

describe("emailsSearch", () => {
  it("filters by a hard bounce or a complaint, and by nothing else", () => {
    expect(emailsSearch({ kind: "complaint" })).toEqual({ q: "", kind: "complaint", filter: { kind: "complaint" } });
    expect(emailsSearch({ kind: "hard" }).filter).toEqual({ kind: "hard" });
    expect(emailsSearch({ kind: "soft" }).filter).toEqual({});
    expect(emailsSearch({})).toEqual({ q: "", kind: "", filter: {} });
  });

  it("searches the addresses for what was typed, trimmed", () => {
    expect(emailsSearch({ q: " bob@ " })).toEqual({ q: " bob@ ", kind: "", filter: { search: "bob@" } });
    expect(emailsSearch({ q: "  " }).filter).toEqual({});
  });
});

describe("supportersSearch", () => {
  it("reads each filter as typed and as applied, dropping what it doesn't know", () => {
    expect(supportersSearch({})).toEqual({
      q: "",
      activity: "",
      subscription: "",
      sort: "",
      dir: "",
      page: "",
      erased: "",
      filter: { sort: "active", dir: "desc", page: 1 },
    });
    const all = supportersSearch({
      q: " jane ",
      activity: "registered",
      subscription: "luma-calendar:unsubscribed",
      sort: "name",
      dir: "desc",
      page: "3",
    });
    expect(all.filter).toEqual({
      search: "jane",
      activity: "registered",
      subscription: { topic: "luma-calendar", reason: "unsubscribed" },
      sort: "name",
      dir: "desc",
      page: 3,
    });
    expect(all.q).toBe(" jane ");
    const bad = supportersSearch({ activity: "x", subscription: "x", sort: "x", page: "0" });
    expect(bad.filter).toEqual({ sort: "active", dir: "desc", page: 1 });
    expect(supportersSearch({ sort: "first" }).filter).toMatchObject({ sort: "first" });
  });
});

describe("accountsSearch", () => {
  it("keeps only the notice it knows", () => {
    expect(accountsSearch({ notice: "last-admin" })).toEqual({ notice: "last-admin" });
    expect(accountsSearch({ notice: "not-pauseai" })).toEqual({ notice: "not-pauseai" });
    expect(accountsSearch({ notice: "x" })).toEqual({ notice: "" });
    expect(accountsSearch({})).toEqual({ notice: "" });
  });
});

describe("pageNumber", () => {
  it("reads a page from 1, or the first page", () => {
    expect(pageNumber("3")).toBe(3);
    for (const page of ["0", "x", "", undefined]) expect(pageNumber(page)).toBe(1);
  });
});

describe("pageParam", () => {
  it("is the page's number in a list's URL, and nothing for the first", () => {
    expect(pageParam(2)).toEqual({ page: "2" });
    expect(pageParam(1)).toEqual({ page: "" });
  });
});

describe("filtersPath", () => {
  it("keeps the filters given, with the changes, and leaves out the blank ones", () => {
    expect(filtersPath("/staff/politicians", { q: "jo", house: "lords", party: "" }, { house: "" })).toBe(
      "/staff/politicians?q=jo",
    );
    expect(filtersPath("/staff/politicians", { q: "jo" }, { status: "any" })).toBe(
      "/staff/politicians?q=jo&status=any",
    );
    expect(filtersPath("/staff/politicians", {})).toBe("/staff/politicians");
  });
});

describe("pagePath", () => {
  it("gives the first page at the list's own URL, and any other with its number", () => {
    expect(pagePath("/staff/audit-log", 1)).toBe("/staff/audit-log");
    expect(pagePath("/staff/audit-log", 2)).toBe("/staff/audit-log?page=2");
  });
});

describe("letterId", () => {
  it("is a whole number from the URL", () => {
    expect(letterId("17")).toBe(17);
    expect(letterId("x")).toBeUndefined();
  });
});

describe("mailingId", () => {
  it("is a whole number from the URL", () => {
    expect(mailingId("3")).toBe(3);
    expect(mailingId("x")).toBeUndefined();
  });
});

describe("supporterId", () => {
  it("is a whole number from the URL", () => {
    expect(supporterId("12")).toBe(12);
    expect(supporterId("x")).toBeUndefined();
  });
});
