import { describe, expect, it } from "vitest";
import { idFrom, politicianDetailsFrom, statusFrom } from "./staff-forms";

function form(fields: Record<string, string | Blob>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("idFrom", () => {
  it("reads a positive whole number, and nothing else", () => {
    expect(idFrom(form({ id: " 12 " }))).toBe(12);
    expect(idFrom(form({ politicianId: "3" }), "politicianId")).toBe(3);
    for (const id of ["0", "-1", "1.5", "x", ""]) expect(idFrom(form({ id }))).toBeUndefined();
    expect(idFrom(form({ id: new Blob(["1"]) }))).toBeUndefined();
  });
});

describe("politicianDetailsFrom", () => {
  it("reads a signer's details, with blanks as none", () => {
    expect(politicianDetailsFrom(form({ house: "senedd", name: " Jo ", salutation: "", constituency: "", party: "P", email: "" }))).toEqual({
      house: "senedd",
      name: "Jo",
      salutation: "",
      constituency: null,
      party: "P",
      email: null,
    });
  });

  it("needs a known house and a name", () => {
    expect(politicianDetailsFrom(form({ house: "hogwarts", name: "Jo" }))).toBeUndefined();
    expect(politicianDetailsFrom(form({ house: "lords", name: " " }))).toBeUndefined();
  });
});

describe("statusFrom", () => {
  const base = { politicianId: "4", campaign: "regulate-pm-letter", status: "signed", date: "2026-10-01", note: " ok " };

  it("reads a status change", () => {
    expect(statusFrom(form(base))).toEqual({
      politicianId: 4,
      campaign: "regulate-pm-letter",
      change: { status: "signed", date: "2026-10-01", note: "ok" },
    });
    expect(statusFrom(form({ ...base, status: "", date: "" }))!.change).toEqual({ status: null, date: null, note: "ok" });
  });

  it("refuses an unknown politician, campaign, status or a bad date", () => {
    expect(statusFrom(form({ ...base, politicianId: "x" }))).toBeUndefined();
    expect(statusFrom(form({ ...base, campaign: "nope" }))).toBeUndefined();
    expect(statusFrom(form({ ...base, status: "opposes" }))).toBeUndefined();
    expect(statusFrom(form({ ...base, date: "1 Oct" }))).toBeUndefined();
  });
});
