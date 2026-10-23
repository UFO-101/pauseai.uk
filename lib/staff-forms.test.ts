import { describe, expect, it } from "vitest";
import { eraseFrom, idFrom, permissionsFrom, signedFrom, unblockFrom } from "./staff-forms";

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

describe("signedFrom", () => {
  const base = { politicianId: "4", campaign: "regulate-letter-pm", signed: "1" };

  it("reads the button: signed, or not", () => {
    expect(signedFrom(form(base))).toEqual({ politicianId: 4, campaign: "regulate-letter-pm", signed: true });
    expect(signedFrom(form({ ...base, signed: "" }))!.signed).toBe(false);
  });

  it("refuses an unknown politician or campaign", () => {
    expect(signedFrom(form({ ...base, politicianId: "x" }))).toBeUndefined();
    expect(signedFrom(form({ ...base, campaign: "nope" }))).toBeUndefined();
    // The bill's status is set from ControlAI's letter, never by hand.
    expect(signedFrom(form({ ...base, campaign: "support-sobel-bill" }))).toBeUndefined();
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
