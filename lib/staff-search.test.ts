import { describe, expect, it } from "vitest";
import {
  accountsSearch,
  askFormSearch,
  staffBack,
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
    flags: undefined,
    backend: undefined,
    consent: undefined,
    not: undefined,
    sort: { key: "created", dir: "desc" },
    page: 1,
  };
  const blank = {
    status: "",
    q: "",
    answered: "",
    campaign: [],
    flag: [],
    backend: [],
    consent: "",
    sort: "",
    dir: "",
    page: "",
  };

  it("filters by a status, a search, whether answered, campaigns, the MP's markers, where from and consent, and sorts", () => {
    expect(
      lettersSearch({
        status: "sent",
        q: " jane ",
        answered: "yes",
        campaign: ["regulate-letter-pm", "!pauseai-info-deepmind"],
        flag: ["test", "!important"],
        backend: ["airtable", "!gmail"],
        consent: "yes",
        sort: "from",
        dir: "asc",
        page: "2",
      }),
    ).toEqual({
      status: "sent",
      q: " jane ",
      answered: "yes",
      campaign: ["regulate-letter-pm", "!pauseai-info-deepmind"],
      flag: ["test", "!important"],
      backend: ["airtable", "!gmail"],
      consent: "yes",
      sort: "from",
      dir: "asc",
      page: "2",
      filter: {
        status: "sent",
        search: "jane",
        answered: true,
        campaign: ["regulate-letter-pm"],
        flags: ["test"],
        backend: ["airtable"],
        consent: true,
        not: { campaign: ["pauseai-info-deepmind"], flags: ["important"], backend: ["gmail"] },
        sort: { key: "from", dir: "asc" },
        page: 2,
      },
    });
    expect(
      lettersSearch({ answered: "no", consent: "no", backend: "postmark", campaign: "support-sobel-bill" }).filter,
    ).toEqual({
      ...none,
      answered: false,
      consent: false,
      backend: ["postmark"],
      campaign: ["support-sobel-bill"],
    });
  });

  it("filters by nothing when each is blank or unknown, newest written first", () => {
    expect(lettersSearch({})).toEqual({ ...blank, filter: none });
    expect(
      lettersSearch({
        status: "nope",
        q: "  ",
        answered: "maybe",
        campaign: ["Not A Slug", "!"],
        flag: "nope",
        backend: "nope",
        consent: "maybe",
        sort: "nope",
      }).filter,
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
  const blank = {
    q: "",
    activity: [],
    contact: [],
    event: [],
    campaign: "",
    wrote: "",
    nation: [],
    mp: [],
    near: "",
    within: "",
    sort: "",
    dir: "",
    page: "",
    erased: "",
  };

  it("reads each filter as typed and as applied, a repeated one as a list, its values marked ! left out", () => {
    expect(supportersSearch({})).toEqual({ ...blank, filter: { sort: "active", dir: "desc", page: 1 } });
    const all = supportersSearch({
      q: " jane ",
      activity: ["registered", "member", "!letter"],
      contact: ["email:luma-calendar:unsubscribed", "!email:blocked"],
      event: ["evt-1", "evt-2", "!evt-3"],
      campaign: "support-sobel-bill",
      wrote: "no",
      nation: ["wales", "!scotland"],
      mp: ["7", "!8"],
      near: " Leeds ",
      within: "25",
      sort: "name",
      dir: "desc",
      page: "3",
    });
    expect(all.filter).toEqual({
      search: "jane",
      activity: ["registered", "member"],
      contact: [{ channel: "email", topic: "luma-calendar", reason: "unsubscribed" }],
      event: ["evt-1", "evt-2"],
      campaign: "support-sobel-bill",
      wrote: false,
      country: ["wales"],
      mp: [7],
      near: { text: "Leeds", miles: 25 },
      not: {
        activity: ["letter"],
        contact: [{ channel: "email", reason: "blocked" }],
        event: ["evt-3"],
        country: ["scotland"],
        mp: [8],
      },
      sort: "name",
      dir: "desc",
      page: 3,
    });
    expect(all.q).toBe(" jane ");
    expect(all.activity).toEqual(["registered", "member", "!letter"]);
    expect(all.contact).toEqual(["email:luma-calendar:unsubscribed", "!email:blocked"]);
    // A campaign alone is those who wrote in it; Near alone is within 10 miles.
    expect(supportersSearch({ campaign: "support-sobel-bill", near: "M1" }).filter).toMatchObject({
      wrote: true,
      near: { text: "M1", miles: 10 },
    });
  });

  it("drops what it doesn't know", () => {
    const bad = supportersSearch({
      activity: ["x", "!x"],
      contact: "x",
      event: "!",
      campaign: "no-such-campaign",
      wrote: "no",
      nation: "atlantis",
      mp: "x",
      near: "  ",
      within: "7",
      sort: "x",
      page: "0",
    });
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

describe("askFormSearch and staffBack", () => {
  it("goes back to a staff page given, else the asks page, and says how the last save went", () => {
    expect(askFormSearch({ back: "/staff/mailings/4", notice: "added" })).toEqual({
      back: "/staff/mailings/4",
      notice: "added",
    });
    expect(askFormSearch({ back: "https://evil.example" })).toEqual({ back: "/staff/asks", notice: "" });
  });

  it("takes only a staff page, with its query", () => {
    expect(staffBack("/staff/politicians?house=lords", "/x")).toBe("/staff/politicians?house=lords");
    expect(staffBack("/staff//evil.example", "/x")).toBe("/x");
    expect(staffBack("/staffing", "/x")).toBe("/x");
    expect(staffBack(undefined, "/x")).toBe("/x");
  });
});
