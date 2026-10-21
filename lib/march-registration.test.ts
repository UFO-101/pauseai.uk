import { describe, expect, it } from "vitest";
import { checkMarchRegistration, marchGuestName } from "./march-registration";

const valid = { firstName: "Testy", lastName: "McTestface", email: "testy@example.org" };

describe("checkMarchRegistration", () => {
  it("takes a name and an email, trimmed, and nothing else", () => {
    const result = checkMarchRegistration({
      firstName: "  Testy ",
      lastName: "McTestface",
      email: " testy@example.org ",
      phone: "0",
    });
    expect(result).toEqual({ ok: true, registration: valid });
    expect(marchGuestName(valid)).toBe("Testy McTestface");
  });

  it("asks for each field that's missing", () => {
    expect(checkMarchRegistration({ firstName: "", lastName: " ", email: "" })).toEqual({
      ok: false,
      errors: {
        firstName: "Please enter your first name.",
        lastName: "Please enter your last name.",
        email: "Please enter your email address.",
      },
    });
  });

  it("treats anything but an object of strings as missing", () => {
    expect(checkMarchRegistration(null).ok).toBe(false);
    expect(checkMarchRegistration({ firstName: 1, lastName: [], email: {} }).ok).toBe(false);
  });

  it("refuses a name that's too long or has control characters in it", () => {
    expect(checkMarchRegistration({ ...valid, firstName: "x".repeat(101) })).toEqual({
      ok: false,
      errors: { firstName: "Please check your first name." },
    });
    expect(checkMarchRegistration({ ...valid, lastName: "Mc\nTestface" })).toEqual({
      ok: false,
      errors: { lastName: "Please check your last name." },
    });
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
