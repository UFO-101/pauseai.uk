import { describe, expect, it } from "vitest";
import { ASK_STATUSES } from "@/lib/asks";
import { COUNTRIES, PERSON_STATUSES } from "@/lib/server/politicians";
import { staffCopy } from "./staff-interface";

describe("staff interface copy", () => {
  it("says one or more of what the dashboard and the Luma import count", () => {
    const { eventRegistrations } = staffCopy.home.dashboard.metrics;
    expect(eventRegistrations(1)).not.toBe(eventRegistrations(2));
    expect(staffCopy.luma.eventsTagged(1)).not.toBe(staffCopy.luma.eventsTagged(2).replace("2", "1"));
  });

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
      ["proxy", "proxies"],
      ["message in the letters inbox", "messages in the letters inbox"],
      ["session", "sessions"],
    ]);
    expect(staffCopy.luma.places({ postcodes: 1, towns: 1 })).toBe("1 postcode, 1 town looked up.");
    expect(staffCopy.luma.places({ postcodes: 2, towns: 6 })).toBe("2 postcodes, 6 towns looked up.");
    expect(staffCopy.mailingPages.leftOut(1, 1, 0)).toContain("Of the 1 person the filter found");
    expect(staffCopy.mailingPages.leftOut(3, 1, 0)).toContain("Of the 3 people the filter found");
    expect(staffCopy.mailingPages.leftOut(3, 1, 0, true)).not.toContain("filter");
    expect(staffCopy.mailingPages.writeToThese(1)).toBe("Write to this one");
    expect(staffCopy.mailingPages.writeToThese(4)).toBe("Write to these 4");
    expect(staffCopy.mailingPages.useThese(1)).not.toContain("1");
    expect(staffCopy.mailingPages.useThese(4)).toContain("these 4");
  });

  it("says how many messages in the letters inbox need a person, one or more", () => {
    const { subject } = staffCopy.lettersInbox.alert;
    expect(subject(1, "letters@pauseai.uk")).toBe("1 MP email in letters@pauseai.uk not relayed");
    expect(subject(2, "letters@pauseai.uk")).toBe("2 MP emails in letters@pauseai.uk not relayed");
  });

  it("counts supporters' bounces and letters waiting, one or more", () => {
    const bounces = staffCopy.notifications.supporterBounces;
    expect(bounces.subject(1)).not.toBe(bounces.subject(2).replace("2", "1"));
    expect(bounces.body(1, 1, [], "/l")).not.toBe(bounces.body(1, 2, [], "/l").replace("2", "1"));
    const waiting = staffCopy.notifications.lettersWaiting;
    expect(waiting.subject(1, 3)).not.toBe(waiting.subject(2, 3).replace("2", "1"));
    expect(waiting.body(1, 3, "why", "/l")).not.toBe(waiting.body(2, 3, "why", "/l").replace("2", "1"));
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
      [...new Set(Object.values(ASK_STATUSES).flat()), "noAnswer"].sort(),
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
    expect(staffCopy.events.removedMatches(1)).not.toBe(staffCopy.events.removedMatches(2).replace("2", "1"));
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
      writing.letterAndReplies,
      (n: number) => writing.leftOut(n + 2, n, n),
    ]) {
      expect(say(1)).not.toBe(say(2).replaceAll("2", "1"));
    }
    for (const list of [letters, politicians, staffCopy.supporters, staffCopy.mailings, staffCopy.changes]) {
      expect(list.total(1)).not.toBe(list.total(2).replace("2", "1"));
    }
  });
});

it("says one and many of each of the new pages' counts", () => {
  const { campaigns, oneOff, oldLetters, gmailReading, asks, runs } = staffCopy;
  expect(runs.range("09:00", "09:00")).toBe("09:00");
  expect(runs.range("09:00", "09:05")).toBe("09:00–09:05");
  expect(runs.quiet(1)).toContain("1 run,");
  expect(runs.quiet(2)).toContain("2 runs,");
  expect(runs.stretch(1)).toContain("1 run,");
  expect(runs.stretch(2)).toContain("2 runs,");
  expect(oldLetters.progress.refusals(1)).toContain("1 run.");
  expect(oldLetters.progress.refusals(2)).toContain("2 runs.");
  for (const words of [
    [campaigns.supporters(1), campaigns.supporters(2)],
    [campaigns.politicians(1), campaigns.politicians(2)],
    [campaigns.lettersTo(1, 1), campaigns.lettersTo(2, 2)],
    [campaigns.versionLine(null, 1), campaigns.versionLine("1 Jan", 2)],
    [staffCopy.allLetters.total(1), staffCopy.allLetters.total(2)],
    [oneOff.unmatchedAlert.subject(1), oneOff.unmatchedAlert.subject(2)],
    [gmailReading.oneOffs(1), gmailReading.oneOffs(2)],
    [asks.page.letters(1), asks.page.letters(2)],
    [asks.page.lettersWord(1), asks.page.lettersWord(2)],
  ]) {
    expect(words[0]).not.toBe(words[1]);
  }
  const run = {
    finished: true,
    read: 1,
    left: 0,
    replies: 0,
    autoReplies: 0,
    oneOffs: 0,
    formTexts: 0,
    postmarkTexts: 0,
  };
  const { sending, tidying } = staffCopy;
  const { job, anywhere, logs } = staffCopy.problems;
  for (const words of [job.couldntRead, job.nameUnknown, logs.tokenNotRevoked]) {
    expect(words("jo@pauseai.uk")).toContain("jo@pauseai.uk");
  }
  expect(job.eventGuests("evt-1")).toContain("evt-1");
  expect(job.eventHosts("evt-1")).toContain("evt-1");
  expect(anywhere.sendFailed("mailing")).toContain("mailing");
  expect(logs.badBody("Postmark")).toContain("Postmark");
  expect(anywhere.letterNotSent(7)).toContain("7");
  expect(anywhere.charsetUnknown("x-mac")).toContain("x-mac");
  expect(
    sending.result({ started: [1], sent: 1, skipped: 0, failed: 0, left: 0, queue: { sent: 0, left: 0 } }),
  ).toContain("1 mailing;");
  expect(
    sending.result({ started: [1, 2], sent: 1, skipped: 0, failed: 0, left: 0, queue: { sent: 0, left: 0 } }),
  ).toContain("2 mailings;");
  expect(tidying.result({ importRuns: 1, auditEntries: 1, drafts: 1 })).toContain(
    "1 run, 1 audit log entry and 1 draft.",
  );
  expect(tidying.result({ importRuns: 2, auditEntries: 2, drafts: 2 })).toContain(
    "2 runs, 2 audit log entries and 2 drafts.",
  );
  expect(oldLetters.result(run)).toContain("all done");
  expect(oldLetters.result({ ...run, finished: false })).not.toContain("all done");
});

it("says which inbox the one-off emails are copied to", () => {
  expect(staffCopy.allLetters.intro("policy@example.org")).toContain("policy@example.org");
});
