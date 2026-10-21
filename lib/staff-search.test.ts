import { describe, expect, it } from "vitest";
import {
  accountsSearch,
  emailsSearch,
  historySearch,
  lettersSearch,
  politicianId,
  supporterId,
  supportersSearch,
} from "./staff-search";

describe("historySearch", () => {
  it("filters by a job", () => {
    expect(historySearch({ job: "sync-mps" })).toEqual({ job: "sync-mps", filter: "sync-mps" });
  });

  it("filters by nothing when there's no job, or one there isn't", () => {
    expect(historySearch({})).toEqual({ job: "", filter: undefined });
    expect(historySearch({ job: "nope" })).toEqual({ job: "nope", filter: undefined });
  });
});

describe("lettersSearch", () => {
  it("filters by a status", () => {
    expect(lettersSearch({ status: "sent" })).toEqual({ status: "sent", filter: "sent" });
  });

  it("filters by nothing when there's no status, or one there isn't", () => {
    expect(lettersSearch({})).toEqual({ status: "", filter: undefined });
    expect(lettersSearch({ status: "nope" })).toEqual({ status: "nope", filter: undefined });
    // A name every object inherits isn't a status.
    expect(lettersSearch({ status: "toString" })).toEqual({ status: "toString", filter: undefined });
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
    expect(emailsSearch({ kind: "complaint" })).toEqual({ kind: "complaint", filter: "complaint" });
    expect(emailsSearch({ kind: "hard" })).toEqual({ kind: "hard", filter: "hard" });
    expect(emailsSearch({ kind: "soft" })).toEqual({ kind: "soft", filter: undefined });
    expect(emailsSearch({})).toEqual({ kind: "", filter: undefined });
  });
});

describe("supportersSearch", () => {
  it("reads each filter as typed and as applied, dropping what it doesn't know", () => {
    expect(supportersSearch({})).toEqual({
      q: "",
      source: "",
      registered: "",
      active: "",
      from: "",
      to: "",
      unsubscribed: "",
      sort: "",
      dir: "",
      page: "",
      erased: "",
      filter: { sort: "active", dir: "desc", page: 1 },
    });
    const all = supportersSearch({
      q: " jane ",
      source: "luma",
      registered: "1",
      active: "90",
      from: "2026-01-01",
      to: "2026-12-31",
      unsubscribed: "1",
      sort: "name",
      dir: "desc",
      page: "3",
    });
    expect(all.filter).toEqual({
      search: "jane",
      source: "luma",
      registered: true,
      active: "90",
      from: "2026-01-01",
      to: "2026-12-31",
      unsubscribed: true,
      sort: "name",
      dir: "desc",
      page: 3,
    });
    expect(all.q).toBe(" jane ");
    expect(supportersSearch({ registered: "on" }).filter).toMatchObject({ registered: true });
    const bad = supportersSearch({ source: "x", active: "7", from: "soon", sort: "x", page: "0" });
    expect(bad.filter).toEqual({ sort: "active", dir: "desc", page: 1 });
    expect(supportersSearch({ active: "older", sort: "first" }).filter).toMatchObject({
      active: "older",
      sort: "first",
    });
  });
});

describe("accountsSearch", () => {
  it("keeps only the notice it knows", () => {
    expect(accountsSearch({ notice: "last-admin" })).toEqual({ notice: "last-admin" });
    expect(accountsSearch({ notice: "x" })).toEqual({ notice: "" });
    expect(accountsSearch({})).toEqual({ notice: "" });
  });
});

describe("supporterId", () => {
  it("is a whole number from the URL", () => {
    expect(supporterId("12")).toBe(12);
    expect(supporterId("x")).toBeUndefined();
  });
});
