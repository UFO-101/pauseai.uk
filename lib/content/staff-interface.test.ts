import { describe, expect, it } from "vitest";
import { ASK_STATUSES } from "@/lib/asks";
import { COUNTRIES, PERSON_STATUSES } from "@/lib/server/politicians";
import { staffCopy } from "./staff-interface";

describe("staff interface copy", () => {
  it("puts the counts into each import's result", () => {
    const sync = staffCopy.syncs.statuses({ added: 12, changed: 3, removed: 4 });
    for (const n of ["12", "3", "4"]) expect(sync).toContain(n);
    const emails = staffCopy.pauseaiEmails.result({
      read: 12,
      added: 3,
      waiting: 4,
      noPolitician: 5,
      unplaced: [1, 2],
    });
    for (const n of ["12", "3", "4", "5", "2"]) expect(emails).toContain(n);
    const web = staffCopy.webForm.result({ read: 12, imported: 3, skipped: 4, alreadyHere: 5, noPolitician: 6 });
    for (const n of ["12", "3", "4", "5", "6"]) expect(web).toContain(n);
    const meetings = staffCopy.goToParliament.result({ guests: 12, mps: 3, added: 4, changed: 5, notFound: 6 });
    for (const n of ["12", "3", "4", "5", "6"]) expect(meetings).toContain(n);
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

describe("the lists' counts", () => {
  it("say one or many", () => {
    const { politicians, emails, letters } = staffCopy;
    expect(politicians.outOfOffice(1)).not.toBe(politicians.outOfOffice(2).replace("2", "1"));
    expect(politicians.otherHouses(1)).not.toBe(politicians.otherHouses(2).replace("2", "1"));
    expect(emails.count(1)).not.toBe(emails.count(2).replace("2", "1"));
    for (const list of [letters, politicians, staffCopy.supporters]) {
      expect(list.count(1, 1, 1)).not.toBe(list.count(2, 1, 1).replace("2", "1"));
    }
  });
});
