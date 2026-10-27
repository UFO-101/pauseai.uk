import { describe, expect, it } from "vitest";
import { eraseFrom, idFrom, permissionsFrom, statusFrom, unblockFrom } from "./staff-forms";

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

describe("statusFrom", () => {
  const base = { politicianId: "4", ask: "frontier-ai-letter", status: "signed", note: " At the march " };

  it("reads the form: the status and its note, or blank to clear it", () => {
    expect(statusFrom(form(base))).toEqual({
      politicianId: 4,
      ask: "frontier-ai-letter",
      status: "signed",
      note: "At the march",
    });
    expect(statusFrom(form({ ...base, status: "" }))!.status).toBeNull();
  });

  it("refuses an unknown politician, ask or status, or no note", () => {
    expect(statusFrom(form({ ...base, note: " " }))).toBeUndefined();
    expect(statusFrom(form({ ...base, politicianId: "x" }))).toBeUndefined();
    expect(statusFrom(form({ ...base, ask: "nope" }))).toBeUndefined();
    expect(statusFrom(form({ ...base, status: "maybe" }))).toBeUndefined();
    // ControlAI's statement is set from its letter, never by hand.
    expect(statusFrom(form({ ...base, ask: "controlai-statement" }))).toBeUndefined();
  });
});

describe("unblockFrom", () => {
  it("reads the address, lowercased, and the note", () => {
    expect(unblockFrom(form({ address: " Jo@Example.org ", note: " fixed " }))).toEqual({
      address: "jo@example.org",
      note: "fixed",
    });
  });

  it("refuses anything that isn't an address, and an unblock with no note", () => {
    expect(unblockFrom(form({ address: "jo@example.org" }))).toBeUndefined();
    expect(unblockFrom(form({ address: "jo@example.org", note: "  " }))).toBeUndefined();
    expect(unblockFrom(form({ address: "nobody" }))).toBeUndefined();
    expect(unblockFrom(form({}))).toBeUndefined();
  });
});

describe("permissionsFrom", () => {
  it("reads whose, lowercased, and which boxes are ticked", () => {
    expect(permissionsFrom(form({ email: " Jo@PauseAI.uk ", "permission:supporters": "on" }))).toEqual({
      email: "jo@pauseai.uk",
      permissions: ["supporters"],
    });
    expect(permissionsFrom(form({ email: "jo@pauseai.uk" }))).toEqual({ email: "jo@pauseai.uk", permissions: [] });
    expect(
      permissionsFrom(form({ email: "jo@pauseai.uk", "permission:admin": "on", "permission:root": "on" })),
    ).toEqual({
      email: "jo@pauseai.uk",
      permissions: ["admin"],
    });
    expect(permissionsFrom(form({ email: "nobody", "permission:admin": "on" }))).toBeUndefined();
  });
});

describe("eraseFrom", () => {
  it("needs the supporter, a reference and the confirmation box", () => {
    expect(eraseFrom(form({ id: "7", reference: " ICO-123 ", confirm: "on" }))).toEqual({
      id: 7,
      reference: "ICO-123",
    });
    expect(eraseFrom(form({ id: "7", reference: "", confirm: "on" }))).toBeUndefined();
    expect(eraseFrom(form({ id: "7", reference: "x" }))).toBeUndefined();
    expect(eraseFrom(form({ id: "x", reference: "x", confirm: "on" }))).toBeUndefined();
  });
});
