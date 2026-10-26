import { describe, expect, it } from "vitest";
import { ASK_STATUSES } from "@/lib/asks";
import { COUNTRIES, PERSON_STATUSES } from "@/lib/server/politicians";
import { staffCopy } from "./staff-interface";

describe("staff interface copy", () => {
  it("puts the counts into the import's result", () => {
    const result = staffCopy.import.result({ matched: 12, added: 3, alreadySet: 4 });
    for (const n of ["12", "3", "4"]) expect(result).toContain(n);
  });

  it("ends the bounce's reason with one full stop, whether Postmark's has one or not", () => {
    for (const reason of ["Mailbox not found.", "Mailbox not found"]) {
      expect(staffCopy.alert.body("Testy MP", "testy@example.org", reason, "https://example.org")).toContain(
        "didn't arrive: Mailbox not found. Nothing more",
      );
    }
  });

  it("reads each dashboard tile as a sentence, for one and for more", () => {
    for (const label of Object.values(staffCopy.home.dashboard.metrics)) {
      expect(label(1)).not.toBe(label(2));
      expect(label(2)).toBe(label(12));
    }
  });

  it("names a letter's page by whom it was to, and a supporter's letters' by who wrote them", () => {
    expect(staffCopy.letters.oneTitle("Testy MP")).toContain("Testy MP");
    expect(staffCopy.letters.fromTitle("Jane Smith")).toContain("Jane Smith");
  });

  it("names every house and status", () => {
    expect(Object.keys(staffCopy.houses)).toEqual([
      "commons",
      "lords",
      "scottish-parliament",
      "senedd",
      "ni-assembly",
      "other",
    ]);
    // Every status any kind of ask allows, and the words for no answer.
    expect(Object.keys(staffCopy.statuses).sort()).toEqual(
      [...Object.values(ASK_STATUSES).flat(), "none", "noAnswer"].sort(),
    );
    expect(Object.keys(staffCopy.personStatuses)).toEqual([...PERSON_STATUSES]);
    expect(Object.keys(staffCopy.countries)).toEqual([...COUNTRIES]);
  });
});
