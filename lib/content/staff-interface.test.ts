import { expect, it } from "vitest";
import { staffCopy } from "./staff-interface";

it("says one and many of each of the new pages' counts", () => {
  const { campaigns, oneOff, oldLetters, gmailReading, asks } = staffCopy;
  for (const words of [
    [campaigns.supporters(1), campaigns.supporters(2)],
    [campaigns.politicians(1), campaigns.politicians(2)],
    [campaigns.lettersTo(1, 1), campaigns.lettersTo(2, 2)],
    [campaigns.versionLine(null, 1), campaigns.versionLine("1 Jan", 2)],
    [oneOff.threads(1), oneOff.threads(2)],
    [oneOff.unmatchedAlert.subject(1), oneOff.unmatchedAlert.subject(2)],
    [oldLetters.unreadable(1), oldLetters.unreadable(2)],
    [gmailReading.oneOffs(1), gmailReading.oneOffs(2)],
    [asks.page.letters(1), asks.page.letters(2)],
    [asks.page.way(1, "mailing"), asks.page.way(2, "campaign")],
    [asks.page.bar(1, 2, "letter"), asks.page.bar(1, 2, "event")],
  ]) {
    expect(words[0]).not.toBe(words[1]);
  }
  const run = {
    dryRun: false,
    finished: true,
    read: 1,
    left: 0,
    replies: 0,
    autoReplies: 0,
    oneOffs: 0,
    formTexts: 0,
    postmarkTexts: 0,
  };
  expect(oldLetters.result(run)).toContain("all done");
  expect(oldLetters.result({ ...run, dryRun: true, finished: false })).not.toContain("all done");
});
