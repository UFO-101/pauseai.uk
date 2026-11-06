import { describe, expect, it } from "vitest";
import { ANSWER_GROUPS, ASK_STATUSES, askSlug, asksAgreed, type AskKind } from "./asks";

describe("askSlug", () => {
  it("makes a slug of the title's letters and digits, then the date's month and year", () => {
    expect(askSlug("Go to Parliament", "2026-10-20")).toBe("go-to-parliament-oct-2026");
    expect(askSlug("  Réunion d'été! ", null)).toBe("reunion-d-ete");
    expect(askSlug("!!!", "2027-01-05")).toBe("ask-jan-2027");
  });
});

describe("asksAgreed", () => {
  it("counts the asks they signed or are going to, not staff in their place, a tentative yes, or a no", () => {
    const answers = { a: "signed", b: "going", c: "meeting_staff", d: "tentative", e: "declined" } as const;
    expect(asksAgreed(Object.fromEntries(Object.entries(answers).map(([ask, status]) => [ask, { status }])))).toBe(2);
    expect(asksAgreed({})).toBe(0);
  });
});

describe("ANSWER_GROUPS", () => {
  it("has every answer a kind allows in exactly one column", () => {
    for (const kind of Object.keys(ASK_STATUSES) as AskKind[]) {
      expect(ANSWER_GROUPS[kind].flatMap((group) => group.statuses).sort()).toEqual([...ASK_STATUSES[kind]].sort());
    }
  });
});
