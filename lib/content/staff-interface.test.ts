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

  it("words a count of one, and of more, each its own way", () => {
    const counts = staffCopy.changes.counts;
    expect(Object.keys(counts).map((key) => [counts[key](1), counts[key](2)])).toEqual([
      ["added", "added"],
      ["removed", "removed"],
      ["changed", "changed"],
      ["matched", "matched"],
      ["already signed", "already signed"],
      ["problem", "problems"],
      ["Luma person", "Luma people"],
      ["form entry", "form entries"],
      ["letter", "letters"],
      ["member record", "member records"],
      ["session", "sessions"],
    ]);
    expect(staffCopy.luma.places({ postcodes: 1, towns: 1 })).toBe("1 postcode, 1 town looked up.");
    expect(staffCopy.luma.places({ postcodes: 2, towns: 6 })).toBe("2 postcodes, 6 towns looked up.");
    expect(staffCopy.mailingPages.leftOut(1, 1, 0)).toContain("Of the 1 person the filter found");
    expect(staffCopy.mailingPages.leftOut(3, 1, 0)).toContain("Of the 3 people the filter found");
    expect(staffCopy.mailingPages.useThese(1)).toBe("Use this one for the draft");
    expect(staffCopy.mailingPages.useThese(4)).toBe("Use these 4 for the draft");
  });

  it("names the ask being edited", () => {
    expect(staffCopy.asks.editTitle("Winter reception")).toContain("Winter reception");
  });

  it("ends the bounce's reason with one full stop, whether Postmark's has one or not", () => {
    for (const reason of ["Mailbox not found.", "Mailbox not found"]) {
      expect(staffCopy.alert.body("Testy MP", "testy@example.org", reason, "https://example.org")).toContain(
        "The mail server said: “Mailbox not found.”",
      );
    }
  });

  it("reads each dashboard tile as a sentence, for one and for more", () => {
    for (const label of Object.values(staffCopy.home.dashboard.metrics)) {
      expect(label(1)).not.toBe(label(2));
      expect(label(2)).toBe(label(12));
    }
  });

  it("names a letter's page by whom it was from and to, and a supporter's letters' by who wrote them", () => {
    expect(staffCopy.letters.oneTitle("Jane Smith", "Testy MP")).toContain("Jane Smith");
    expect(staffCopy.letters.oneTitle("Jane Smith", "Testy MP")).toContain("Testy MP");
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
    expect(politicians.tests(1)).not.toBe(politicians.tests(2).replace("2", "1"));
    expect(staffCopy.mailings.recipientsCount(1)).not.toBe(staffCopy.mailings.recipientsCount(2).replace("2", "1"));
    expect(staffCopy.supporters.detail.eventsCounted(1)).not.toBe(staffCopy.supporters.detail.eventsCounted(2));
    expect(staffCopy.supporters.detail.lettersCounted(1)).not.toBe(staffCopy.supporters.detail.lettersCounted(2));
    expect(emails.count(1)).not.toBe(emails.count(2).replace("2", "1"));
    const writing = staffCopy.mailingPages;
    for (const say of [
      writing.willGet,
      writing.schedule,
      (n: number) => writing.summary(n, null, null),
      (n: number) => writing.scheduledLine(n, "Jo"),
      writing.toCount,
      (n: number) => writing.leftOut(n + 2, n, n),
    ]) {
      expect(say(1)).not.toBe(say(2).replaceAll("2", "1"));
    }
    for (const list of [
      letters,
      politicians,
      staffCopy.supporters,
      staffCopy.mailings,
      staffCopy.asks,
      staffCopy.changes,
    ]) {
      expect(list.total(1)).not.toBe(list.total(2).replace("2", "1"));
    }
  });
});
