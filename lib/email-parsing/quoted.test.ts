import { describe, expect, it } from "vitest";
import { quotedHeaders, restoreCutDown } from "./quoted";

describe("reading quotes", () => {
  it("finds an Outlook block, its fields in any order, bold or quoted", () => {
    const text =
      "See below\n> *From:* Polly <p@x.uk>\n>\n> *Sent:* 1 Jan 2026\n> To: Joe <j@x.uk>\n> Cc: c@x.uk\n> Subject: Hello\n> Body";
    expect(quotedHeaders(text)).toEqual([
      { from: "Polly <p@x.uk>", sent: "1 Jan 2026", to: "Joe <j@x.uk>", cc: "c@x.uk", subject: "Hello" },
    ]);
  });

  it("finds a forward with its Subject and Date over its From, a wrapped Subject ending what it reads", () => {
    const text =
      "fyi\n\n-------- Forwarded Message --------\nSubject: \tA long subject\nwrapped here\nDate: \tFri, 25 Sep 2026\nFrom: \tJo <j@x.uk>\nTo: \tPolly <p@x.uk>\n\nDear Polly,";
    expect(quotedHeaders(text)).toEqual([
      { from: "Jo <j@x.uk>", sent: "Fri, 25 Sep 2026", to: "Polly <p@x.uk>", cc: "", subject: "" },
    ]);
  });

  it("takes Date for Sent, and carriage returns as line ends", () => {
    expect(quotedHeaders("From: Polly <p@x.uk>\r\nDate: 2 Feb 2026\r\n")).toEqual([
      { from: "Polly <p@x.uk>", sent: "2 Feb 2026", to: "", cc: "", subject: "" },
    ]);
  });

  it("finds each of several, a block and then Gmail's line", () => {
    const text = "From: Polly <p@x.uk>\nSent: 1 Jan 2026\n\nOn 2 Jan 2026, Joe <j@x.uk> wrote:\n> Hi";
    expect(quotedHeaders(text).map((quote) => quote.from)).toEqual(["Polly <p@x.uk>", "j@x.uk"]);
  });

  it("leaves a From with no Sent, and a text that quotes nothing", () => {
    expect(quotedHeaders("From: Polly\nHello")).toEqual([]);
    expect(quotedHeaders("Dear Polly,\n\nHello")).toEqual([]);
  });

  it("finds Gmail's line", () => {
    expect(quotedHeaders("Yes\n\nOn Tue, 1 Jan 2026 at 09:00, Polly <p@x.uk> wrote:\n> Hello")[0]).toMatchObject({
      from: "p@x.uk",
    });
  });
});

describe("a text whose characters were cut down to a byte", () => {
  it("has its curly quotes and dashes whole again, and nothing else changed", () => {
    expect(restoreCutDown("I\x19m \x18a\x19 \x1cb\x1d \x13 \x14 caf\u00e9\n")).toBe(
      "I\u2019m \u2018a\u2019 \u201cb\u201d \u2013 \u2014 caf\u00e9\n",
    );
  });
});
