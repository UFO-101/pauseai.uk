import { describe, expect, it } from "vitest";
import { idFrom, politicianDetailsFrom, signedFrom } from "./staff-forms";

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
    expect(
      politicianDetailsFrom(
        form({ house: "senedd", name: " Jo ", salutation: "", constituency: "", party: "P", email: "" }),
      ),
    ).toEqual({
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
