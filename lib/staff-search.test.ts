import { describe, expect, it } from "vitest";
import { emailsSearch, historySearch, lettersSearch, politicianId } from "./staff-search";

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
