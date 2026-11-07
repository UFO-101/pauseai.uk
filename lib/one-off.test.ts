import { describe, expect, it } from "vitest";
import {
  isPauseaiAddress,
  isRecognisedMail,
  isSomeoneElse,
  keepsPoliticianThreads,
  onParliamentDomain,
  participants,
  politicianAddresses,
  politicianAnswered,
  politiciansIn,
  politiciansOf,
  quotedAddresses,
  type PoliticianBook,
} from "./one-off";

const book: PoliticianBook = {
  addresses: new Map([
    ["polly@gmail.com", [1]],
    ["shared@parliament.uk", [2, 3]],
  ]),
  domains: new Map([["tulip.example", 4]]),
};

describe("what counts as a thread with a politician", () => {
  it("knows parliaments' domains and their subdomains", () => {
    expect(onParliamentDomain("a@parliament.uk")).toBe(true);
    expect(onParliamentDomain("a@mla.niassembly.gov.uk")).toBe(true);
    expect(onParliamentDomain("a@notparliament.uk")).toBe(false);
  });

  it("finds a politician by an address they have or had, or their own domain", () => {
    expect(politiciansOf(book, "polly@gmail.com")).toEqual([1]);
    expect(politiciansOf(book, "office@tulip.example")).toEqual([4]);
    expect(politiciansOf(book, "x@example.com")).toEqual([]);
  });

  it("counts by a politician, or a parliament's address with no one we know", () => {
    expect(politiciansIn(book, ["polly@gmail.com", "shared@parliament.uk"])).toEqual({
      counts: true,
      people: [1, 2, 3],
    });
    expect(politiciansIn(book, ["staff@parliament.uk"])).toEqual({ counts: true, people: [] });
    expect(politiciansIn(book, ["x@example.com"])).toEqual({ counts: false, people: [] });
  });

  it("reads the addresses in what a message quotes", () => {
    expect(quotedAddresses("From: Polly <polly@gmail.com>\nSent: 1 Jan\nTo: Me <me@x.uk>\nCc: c@x.uk")).toEqual([
      "polly@gmail.com",
      "me@x.uk",
      "c@x.uk",
    ]);
  });
});

describe("who's in a thread", () => {
  it("is PauseAI's by a connected Gmail or an alias", () => {
    expect(isPauseaiAddress("jo@pauseai.uk", ["jo@pauseai.uk"])).toBe(true);
    expect(isPauseaiAddress("joseph@pauseai.info", [])).toBe(true);
    expect(isPauseaiAddress("x@example.com", [])).toBe(false);
  });

  it("is someone else by anyone else", () => {
    expect(isSomeoneElse(book, "x@example.com", [])).toBe(true);
    expect(isSomeoneElse(book, "polly@gmail.com", [])).toBe(false);
    expect(isSomeoneElse(book, "joseph@pauseai.info", [])).toBe(false);
  });
});

describe("mail the site recognises", () => {
  it("is spam, its own, bounces and Google's", () => {
    expect(isRecognisedMail("x@example.com", ["SPAM"])).toBe(true);
    expect(isRecognisedMail("x@example.com", ["TRASH"])).toBe(true);
    expect(isRecognisedMail("mailer-daemon@x.uk", [])).toBe(true);
    expect(isRecognisedMail("a@notify.pauseai.uk", [])).toBe(true);
    expect(isRecognisedMail("noreply@x.uk", [])).toBe(true);
    expect(isRecognisedMail("x@example.com", ["INBOX"])).toBe(false);
  });
});

describe("a header's line", () => {
  it("says which politician an address is, unless several share it", () => {
    expect(
      politicianAddresses(book, [
        "polly@gmail.com",
        "shared@parliament.uk",
        "someone@tulip.example",
        "jane@example.com",
      ]),
    ).toEqual({ "polly@gmail.com": 1, "someone@tulip.example": 4 });
  });
});

describe("whether a politician answered", () => {
  it("counts a politician or a parliament's address after the first message, and no one else", () => {
    expect(politicianAnswered(book, ["joseph@pauseai.uk", "polly@gmail.com"])).toBe(true);
    expect(politicianAnswered(book, ["joseph@pauseai.uk", "office@parliament.uk"])).toBe(true);
    expect(politicianAnswered(book, ["polly@gmail.com", "joseph@pauseai.uk"])).toBe(false);
    expect(politicianAnswered(book, ["polly@gmail.com"])).toBe(false);
  });
});

describe("a thread's participants", () => {
  it("lists each sender once, in the order they first wrote, by name or else address", () => {
    expect(
      participants([
        { name: "Joseph", address: "joseph@pauseai.uk" },
        { name: "", address: "polly@parliament.uk" },
        { name: "Joseph", address: "joseph@pauseai.uk" },
      ]),
    ).toEqual(["Joseph", "polly@parliament.uk"]);
  });
});

describe("which mailboxes are kept", () => {
  it("keeps policy@'s and Joseph's threads with politicians, and no one else's", () => {
    expect(keepsPoliticianThreads("policy@pauseai.uk")).toBe(true);
    expect(keepsPoliticianThreads("Joseph@pauseai.uk")).toBe(true);
    expect(keepsPoliticianThreads("jo@pauseai.uk")).toBe(false);
  });
});
