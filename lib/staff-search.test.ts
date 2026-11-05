import { describe, expect, it } from "vitest";
import {
  sentEmailsSearch,
  accountsSearch,
  askFormSearch,
  staffBack,
  emailsSearch,
  eventsSearch,
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
  erasedPath,
} from "./staff-search";

describe("sentEmailsSearch", () => {
  it("reads the sent emails' filters and search, those to leave out apart", () => {
    const { filter, ...typed } = sentEmailsSearch({
      q: " jane ",
      purpose: ["letter", "!relay"],
      outcome: "sent",
      backend: "!gmail",
      link: ["campaign", "!mailing", "nonsense"],
      sort: "subject",
      dir: "asc",
      page: "2",
    });
    expect(typed).toEqual({
      sort: "subject",
      dir: "asc",
      q: " jane ",
      purpose: ["letter", "!relay"],
      outcome: ["sent"],
      backend: ["!gmail"],
      link: ["campaign", "!mailing", "nonsense"],
      page: "2",
    });
    expect(filter).toEqual({
      search: "jane",
      sort: { key: "subject", dir: "asc" },
      purpose: ["letter"],
      outcome: ["sent"],
      backend: undefined,
      link: ["campaign"],
      not: { purpose: ["relay"], backend: ["gmail"], link: ["mailing"] },
      page: 2,
    });
    expect(sentEmailsSearch({}).filter).toEqual({
      search: undefined,
      sort: { key: "when", dir: "desc" },
      purpose: undefined,
      outcome: undefined,
      backend: undefined,
      link: undefined,
      not: undefined,
      page: 1,
    });
  });
});

describe("lettersSearch", () => {
  const none = {
    status: undefined,
    search: undefined,
    answered: undefined,
    tab: undefined,
    campaign: undefined,
    flags: undefined,
    backend: undefined,
    consent: undefined,
    not: undefined,
    sort: { key: "created", dir: "desc" },
    page: 1,
  };
  const blank = {
    tab: "",
    status: "",
    q: "",
    answered: "",
    campaign: [],
    flag: [],
    backend: [],
    sort: "",
    dir: "",
    page: "",
  };

  it("filters by a status, a search, whether answered, campaigns, the MP's markers, and where from, and sorts", () => {
    expect(
      lettersSearch({
        status: "sent",
        q: " jane ",
        answered: "yes",
        campaign: ["regulate-letter-pm", "!pauseai-info-deepmind"],
        flag: ["test", "!important"],
        backend: ["airtable", "!gmail"],
        sort: "from",
        dir: "asc",
        page: "2",
      }),
    ).toEqual({
      tab: "",
      status: "sent",
      q: " jane ",
      answered: "yes",
      campaign: ["regulate-letter-pm", "!pauseai-info-deepmind"],
      flag: ["test", "!important"],
      backend: ["airtable", "!gmail"],
      sort: "from",
      dir: "asc",
      page: "2",
      filter: {
        status: "sent",
        search: "jane",
        answered: "yes",
        campaign: ["regulate-letter-pm"],
        flags: ["test"],
        backend: ["airtable"],
        not: { campaign: ["pauseai-info-deepmind"], flags: ["important"], backend: ["gmail"] },
        sort: { key: "from", dir: "asc" },
        page: 2,
      },
    });
    expect(lettersSearch({ answered: "no", backend: "postmark", campaign: "support-sobel-bill" }).filter).toEqual({
      ...none,
      answered: "no",
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
        sort: "nope",
      }).filter,
    ).toEqual(none);
    // A name every object inherits isn't a status; nor is a kind of event, which a letter's status never is.
    for (const status of ["toString", "replied", "auto_reply"]) expect(lettersSearch({ status }).filter).toEqual(none);
    expect(lettersSearch({ answered: "auto" }).filter).toEqual({ ...none, answered: "auto" });
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

describe("eventsSearch", () => {
  const blank = {
    when: "",
    q: "",
    owner: [],
    tag: [],
    place: [],
    removed: "",
    sort: "",
    dir: "",
    page: "",
  };
  const none = {
    search: undefined,
    owner: undefined,
    tag: undefined,
    place: undefined,
    removed: false,
    not: undefined,
    page: 1,
  };

  it("is the Future tab, soonest first, with those taken off Luma left out, nothing chosen; and Past, latest first", () => {
    expect(eventsSearch({})).toEqual({
      ...blank,
      filter: { ...none, tab: "future", sort: { key: "start", dir: "asc" } },
    });
    expect(eventsSearch({ when: "past" }).filter).toEqual({
      ...none,
      tab: "past",
      sort: { key: "start", dir: "desc" },
    });
    expect(eventsSearch({ when: "someday" }).filter.tab).toBe("future");
    // Only "yes" finds those taken off Luma.
    expect(eventsSearch({ removed: "no" }).filter.removed).toBe(false);
  });

  it("reads each filter as typed and as applied, a repeated one as a list, its values marked ! left out", () => {
    const all = eventsSearch({
      when: "past",
      q: " social ",
      owner: ["none", "!jo@pauseai.uk"],
      tag: "London",
      place: ["!online"],
      removed: "yes",
      sort: "going",
      dir: "asc",
      page: "2",
    });
    expect(all.owner).toEqual(["none", "!jo@pauseai.uk"]);
    expect(all.filter).toEqual({
      tab: "past",
      search: "social",
      owner: ["none"],
      tag: ["London"],
      place: undefined,
      removed: true,
      not: { owner: ["jo@pauseai.uk"], place: ["online"] },
      sort: { key: "going", dir: "asc" },
      page: 2,
    });
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
    why: "",
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
    expect(accountsSearch({ notice: "removed" })).toEqual({ notice: "removed" });
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

it("sends an erasure to the list saying so, with what couldn't be cleared, if anything", () => {
  expect(erasedPath([])).toBe("/staff/supporters?erased=1");
  expect(erasedPath(["Mail wasn't cleared", "Nor one-offs"])).toBe(
    "/staff/supporters?erased=partly&why=Mail%20wasn't%20cleared%0ANor%20one-offs",
  );
});
