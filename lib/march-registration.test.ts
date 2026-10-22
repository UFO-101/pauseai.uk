import { describe, expect, it } from "vitest";
import { checkMarchRegistration } from "./march-registration";

const valid = { name: "Testy McTestface", email: "testy@example.org" };

describe("checkMarchRegistration", () => {
  it("takes a name and an email, trimmed, and nothing else", () => {
    const result = checkMarchRegistration({
      name: "  Testy McTestface ",
      email: " testy@example.org ",
      phone: "0",
      postcode: "SW1A 0AA",
    });
    expect(result).toEqual({ ok: true, registration: { ...valid, tags: {} } });
  });

  it("keeps the tags of the link they came by, and leaves out any that don't look like tags", () => {
    const tags = {
      source: " in ",
      medium: "x".repeat(101),
      campaign: "other",
      term: "a\nb",
      content: 7,
      other: "kept out",
    };
    expect(checkMarchRegistration({ ...valid, tags })).toEqual({
      ok: true,
      registration: { ...valid, tags: { source: "in", campaign: "other" } },
    });
    expect(checkMarchRegistration({ ...valid, tags: "in" })).toEqual({
      ok: true,
      registration: { ...valid, tags: {} },
    });
  });

  it("asks for each field that's missing", () => {
    expect(checkMarchRegistration({ name: " ", email: "" })).toEqual({
      ok: false,
      errors: {
        name: "Please enter your full name.",
        email: "Please enter your email address.",
      },
    });
  });

  it("treats anything but an object of strings as missing", () => {
    expect(checkMarchRegistration(null).ok).toBe(false);
    expect(checkMarchRegistration({ name: [], email: {} }).ok).toBe(false);
  });

  it("refuses a name that's too long or has control characters in it", () => {
    for (const name of ["x".repeat(101), "Testy\nMcTestface"]) {
      expect(checkMarchRegistration({ ...valid, name }), name).toEqual({
        ok: false,
        errors: { name: "Please check your full name." },
      });
    }
  });

  it("refuses an email that isn't one", () => {
    for (const email of [
      "testy",
      "testy@example",
      "tes ty@example.org",
      "a@b@c.org",
      `${"a".repeat(250)}@x.org`,
      "te\u0007sty@example.org",
    ]) {
      expect(checkMarchRegistration({ ...valid, email }), email).toEqual({
        ok: false,
        errors: { email: "Please enter a valid email address." },
      });
    }
  });
});
