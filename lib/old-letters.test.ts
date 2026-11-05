import { describe, expect, it } from "vitest";
import { FORM_VERSIONS } from "./content/pauseai-info-form";
import {
  addressesIn,
  augustColleagues,
  augustTemplate,
  deepmindMailing,
  documentaryMailing,
  fitTemplate,
  formDraft,
  formVersionAt,
  isAcknowledgement,
  isReplySubject,
  joinSent,
  joinWindow,
  mailingOfLetter,
  mailingOfNewLetter,
  paragraphs,
  placeReply,
  plainSubject,
  quotedHeaders,
  realSender,
  sameSubject,
  templateDoc,
  templateOf,
} from "./old-letters";

const at = (iso: string) => new Date(iso);

describe("joining a sent email to its letter", () => {
  it("looks from 5 seconds before it went to 25 minutes after, as Airtable noted a letter once it had gone", () => {
    const { from, to } = joinWindow(at("2026-01-01T12:00:00Z"));
    expect(from).toEqual(at("2026-01-01T11:59:55Z"));
    expect(to).toEqual(at("2026-01-01T12:25:00Z"));
  });

  const letter = (id: number, time: string, more = {}) => ({ id, at: at(time), ...more });
  const sent = { at: at("2026-01-01T12:00:00Z"), cc: ["jane@example.com"], text: "Yours, Sam Brown" };

  it("takes the only letter that fits, or none", () => {
    expect(joinSent([], sent)).toBeUndefined();
    expect(joinSent([letter(1, "2026-01-01T12:10:00Z")], sent)?.id).toBe(1);
  });

  it("has the sender's address or name pick a form letter's email from several", () => {
    const jane = letter(1, "2026-01-01T12:01:00Z", { senderEmail: " Jane@example.com ", senderName: "Jane" });
    const sam = letter(2, "2026-01-01T12:01:00Z", { senderEmail: "sam@example.com", senderName: "Sam Brown" });
    const other = letter(3, "2026-01-01T12:01:00Z", { senderEmail: "x@example.com", senderName: "Pat" });
    expect(joinSent([jane, other], sent)?.id).toBe(1);
    expect(joinSent([sam, other], sent)?.id).toBe(2);
  });

  it("else takes the only one within a second of the nearest, or none where two are as near", () => {
    const near = letter(1, "2026-01-01T12:00:10Z");
    const far = letter(2, "2026-01-01T12:10:00Z");
    const alike = letter(3, "2026-01-01T12:00:10Z");
    expect(joinSent([far, near], sent)?.id).toBe(1);
    expect(joinSent([near, alike], sent)).toBeUndefined();
    const both = [
      letter(1, "2026-01-01T12:01:00Z", { senderName: "Sam Brown" }),
      letter(2, "2026-01-01T12:01:00Z", { senderName: "Sam Brown" }),
    ];
    expect(joinSent(both, sent)).toBeUndefined();
  });

  it("knows a reply or forward from a letter", () => {
    expect(isReplySubject("Hello", undefined)).toBe(false);
    expect(isReplySubject("Hello", "<a@b>")).toBe(true);
    expect(isReplySubject(" Re: Hello", undefined)).toBe(true);
    expect(isReplySubject("Fwd: Hello", undefined)).toBe(true);
    expect(isReplySubject("Fw: Hello", undefined)).toBe(true);
  });
});

describe("which mailing a letter belongs to", () => {
  const june = at("2025-06-10T09:00:00Z");

  it("tells DeepMind's sends apart by their phrases, however they wrapped", () => {
    expect(deepmindMailing("Please\njoin 40 of your colleagues", june)).toBe("deepmind-40");
    expect(deepmindMailing("join 25 of your", june)).toBe("deepmind-25");
    expect(deepmindMailing("Ten of your colleagues have", june)).toBe("deepmind-ten");
    expect(deepmindMailing("please reply by 30 June", june)).toBe("deepmind-30-june");
    expect(deepmindMailing("something else", june)).toBe("deepmind-others");
  });

  it("puts one whose text we can't read in August's by its date", () => {
    expect(deepmindMailing(null, at("2025-08-06T00:00:00Z"))).toBe("deepmind-august");
    expect(deepmindMailing(null, at("2025-08-05T23:59:00Z"))).toBe("deepmind-others");
  });

  it("tells the documentary's sends apart by subject and text", () => {
    expect(documentaryMailing("PauseAI Documentary Screening - Jubilee Room", "")).toBe("documentary-signatories");
    expect(documentaryMailing("6pm today", "Thank you again\nfor signing")).toBe("documentary-reminder");
    expect(documentaryMailing("6pm today", "I'd like to invite you")).toBe("documentary-everyone");
  });

  it("goes by a letter's tick box, or else it's DeepMind's", () => {
    expect(mailingOfLetter("Documentary Invitation", "6pm today", null, june)).toBe("documentary-everyone");
    expect(mailingOfLetter("Documentary Invitation", "6pm today", "x", june)).toBe("documentary-everyone");
    expect(mailingOfLetter("CSRB Iqbal Amendment", "x", "y", june)).toBe("csrb");
    expect(mailingOfLetter(null, "x", "join 25 of your", june)).toBe("deepmind-25");
    expect(mailingOfLetter("A box we don't know", "x", "x", june)).toBe("deepmind-others");
  });

  it("finds a mailing for a letter production has no record of, by its subject", () => {
    const of = (subject: string, text = "") => mailingOfNewLetter(subject, text, june);
    expect(of("Invitation to speak on panel with Professor Stuart Russell")).toBe("russell-speak");
    expect(of("Invitation to Co-host Panel Discussion on AI Risk")).toBe("russell-cohost");
    expect(of("PauseAI Conference in Parliament on Monday")).toBe("conference-parliament");
    expect(of("Request to co-sign letter on AI liability")).toBe("liability-own");
    expect(of("Request to co-sign letter on frontier AI risks")).toBe("frontier-own");
    expect(of("Westminster Hall Debate on AI Safety")).toBe("westminster-hall");
    expect(of("Request to co-sign letter on Google's breach", "join 40 of your")).toBe("deepmind-40");
    expect(of("Coffee?")).toBeUndefined();
  });
});

describe("a mailing's template", () => {
  const shared = "Google broke its promise.";
  const ending = "Thank you,\nJoseph";
  const text = (name: string, own = "") => `Dear ${name},\r\n\r\n${shared}\n\n${own ? `${own}\n\n` : ""}${ending}`;

  it("joins a paragraph's wrapped lines", () => {
    expect(paragraphs("One\nline\r\n\r\n \n\nTwo  ")).toEqual(["One line", "Two"]);
  });

  it("is the paragraphs most share, split where letters have their own", () => {
    const template = templateOf([text("A", "Yours."), text("B", "Mine."), text("C")]);
    expect(template).toEqual({ before: [shared], after: ["Thank you, Joseph"] });
    expect(templateOf([])).toBeUndefined();
  });

  it("goes at the end when none has anything of its own", () => {
    expect(templateOf([text("A"), text("B")])).toEqual({ before: [shared, "Thank you, Joseph"], after: [] });
  });

  it("has nothing where no letter has every shared paragraph, or none is shared", () => {
    expect(templateOf(["one\n\ntwo", "two\n\nthree", "three\n\none"])).toBeUndefined();
    expect(templateOf(["Dear A"])).toBeUndefined();
  });

  it("fits a letter to it, or says it doesn't", () => {
    const template = { before: [shared], after: ["Thank you, Joseph"] };
    expect(fitTemplate(text("A", "Yours."), template)).toEqual({
      values: { greeting: "Dear A,", own: "Yours." },
      meets: [],
    });
    expect(fitTemplate(`${shared}\n\n${ending}`, template)).toEqual({ values: { greeting: "", own: "" }, meets: [] });
    expect(fitTemplate("Dear A,\n\nSomething else.\n\nThank you, Joseph", template)).toBeUndefined();
    expect(fitTemplate(`Dear A,\n\n${shared}\n\nNot the ending`, template)).toBeUndefined();
    expect(fitTemplate("Thank you, Joseph", { before: [], after: ["Thank you, Joseph", "Bye"] })).toBeUndefined();
    expect(fitTemplate("", { before: [], after: [] })).toEqual({ values: { greeting: "", own: "" }, meets: [] });
  });

  it("is a document with its greeting and own paragraph as fields", () => {
    const doc = templateDoc({ before: ["a"], after: ["b"] });
    expect(doc.content.map((block) => (block as { content: { type: string }[] }).content[0].type)).toEqual([
      "field",
      "text",
      "field",
      "text",
    ]);
  });
});

describe("the August letters", () => {
  it("said 40 colleagues until 8 August, then 50", () => {
    expect(augustColleagues(at("2025-08-07T23:00:00Z"))).toBe("40");
    expect(augustColleagues(at("2025-08-08T00:00:00Z"))).toBe("50");
  });

  it("are rebuilt from the paragraphs quotes share, with the number a field", () => {
    const quote = (n: number) => `Dear You,\n\nPlease join ${n} of your colleagues now.\n\nThanks,`;
    const doc = augustTemplate([quote(40), quote(40), quote(50)])!;
    expect(doc.content).toHaveLength(3);
    expect(doc.content[1]).toEqual({
      type: "paragraph",
      content: [
        { type: "text", text: "Please join " },
        { type: "field", attrs: { field: "colleagues" } },
        { type: "text", text: " of your colleagues now." },
      ],
    });
    expect(doc.content[2]).toEqual({ type: "paragraph", content: [{ type: "text", text: "Thanks," }] });
    expect(augustTemplate([])).toBeUndefined();
  });
});

describe("the form's versions", () => {
  it("takes the one live then, ten minutes after its commit, or the first for one before them", () => {
    const [first, second] = FORM_VERSIONS;
    expect(formVersionAt(at("2020-01-01T00:00:00Z"))).toBe(first);
    const committed = new Date(second.committedAt).getTime();
    expect(formVersionAt(new Date(committed + 9 * 60_000))).toBe(first);
    expect(formVersionAt(new Date(committed + 10 * 60_000))).toBe(second);
  });

  it("fills in a version's names", () => {
    const version = { ...FORM_VERSIONS[0], text: "Dear {salutation}, of {constituency}\n\n**{name}**\n\n{postcode}" };
    expect(formDraft(version, { salutation: "Ms D", constituency: "Seat", name: "Jane", postcode: "m1 1ae" })).toBe(
      "Dear Ms D, of Seat\n\nJane\n\nM1 1AE",
    );
  });
});

describe("placing a reply", () => {
  it("compares subjects without Re:, an automatic reply's words, or a case's reference", () => {
    expect(plainSubject("Re: Fwd: Hello (Case Ref: AB123)")).toBe("hello");
    expect(plainSubject("Automatic reply: Hello")).toBe("hello");
    expect(sameSubject("RE: The Bill and more", "the bill")).toBe(true);
    expect(sameSubject("Hello", "")).toBe(false);
    expect(sameSubject("Hello", "Bye")).toBe(false);
  });

  it("knows an acknowledgement by its subject", () => {
    for (const subject of [
      "Automatic Reply: x",
      "Out of office",
      "Thank you for contacting me",
      "Your email: automated response",
    ]) {
      expect(isAcknowledgement(subject)).toBe(true);
    }
    expect(isAcknowledgement("Thanks, I'll sign")).toBe(false);
  });

  const letter = (id: number, time: string, more = {}) => ({ id, at: at(time), subject: "The Bill", ...more });

  it("takes the latest before it with the letter's subject", () => {
    const placed = placeReply(
      [letter(1, "2026-01-01T09:00:00Z"), letter(2, "2026-02-01T09:00:00Z"), letter(3, "2026-04-01T09:00:00Z")],
      { at: at("2026-03-01T09:00:00Z"), subject: "Re: The Bill", automatic: false },
    );
    expect(placed).toEqual({ id: 2, rule: "subject" });
  });

  it("finds none with no letter before it", () => {
    expect(
      placeReply([letter(1, "2026-04-01T09:00:00Z")], {
        at: at("2026-03-01T09:00:00Z"),
        subject: "x",
        automatic: true,
      }),
    ).toBeUndefined();
  });

  it("places an automatic reply by its time, within 3 days, with no other letter within 20 minutes", () => {
    const reply = { at: at("2026-01-02T09:00:00Z"), subject: "I'm away", automatic: true };
    const latest = letter(2, "2026-01-02T08:00:00Z");
    expect(placeReply([latest], reply)).toEqual({ id: 2, rule: "time" });
    expect(placeReply([latest, letter(1, "2026-01-01T08:00:00Z")], reply)).toEqual({ id: 2, rule: "time" });
    expect(placeReply([latest, letter(1, "2026-01-02T07:50:00Z")], reply)).toBeUndefined();
    expect(placeReply([letter(1, "2025-12-01T08:00:00Z")], reply)).toBeUndefined();
  });

  describe("once its text is read", () => {
    const reply = { at: at("2026-03-01T09:00:00Z"), subject: "Your letter", automatic: false };
    const jane = letter(1, "2026-01-01T09:00:00Z", { senderEmail: "Jane@example.com ", senderName: "Jane Smith" });
    const sam = letter(2, "2026-02-01T09:00:00Z", { senderEmail: "sam@example.com", senderName: "Sam Brown" });

    it("waits for it", () => {
      expect(placeReply([jane], reply)).toBeUndefined();
    });

    it("finds a form letter's sender's address, then their name", () => {
      expect(placeReply([jane, sam], { ...reply, text: "To jane@example.com:" })).toEqual({ id: 1, rule: "sender" });
      expect(placeReply([jane, sam], { ...reply, text: "Dear sam brown," })).toEqual({ id: 2, rule: "sender" });
    });

    it("when stuck, reads the Sent time of the original it quotes, in UTC or Summer Time", () => {
      const quoting = (sent: string) => ({
        ...reply,
        text: `Hi\n\nFrom: Joseph <j@pauseai.info>\nSent: ${sent}\nTo: me@x.uk\n\nDear`,
      });
      expect(placeReply([jane, sam], quoting("1 January 2026 09:00"))).toEqual({ id: 1, rule: "quote" });
      expect(placeReply([jane, sam], quoting("01/02/2026 10:00"))).toEqual({ id: 2, rule: "quote" });
      expect(placeReply([jane, sam], quoting("not a date"))).toBeUndefined();
      expect(placeReply([jane, sam], quoting("3 March 2026 09:00"))).toBeUndefined();
    });

    it("in the group's mail, a form letter's politician with only that letter", () => {
      expect(placeReply([jane], { ...reply, text: "Thanks", group: true })).toEqual({ id: 1, rule: "quote" });
      expect(placeReply([jane], { ...reply, text: "Thanks" })).toBeUndefined();
      expect(
        placeReply([letter(3, "2026-01-01T09:00:00Z")], { ...reply, text: "Thanks", group: true }),
      ).toBeUndefined();
      expect(placeReply([jane, sam], { ...reply, text: "Thanks", group: true })).toBeUndefined();
    });
  });
});

describe("reading quotes", () => {
  it("finds an Outlook block, its fields in any order, bold or quoted", () => {
    const text =
      "See below\n> *From:* Polly <p@x.uk>\n>\n> *Sent:* 1 Jan 2026\n> To: Joe <j@x.uk>\n> Cc: c@x.uk\n> Subject: Hello\n> Body\n";
    expect(quotedHeaders(text)).toEqual([
      { from: "Polly <p@x.uk>", sent: "1 Jan 2026", to: "Joe <j@x.uk>", cc: "c@x.uk", subject: "Hello" },
    ]);
  });

  it("leaves a From with no Sent", () => {
    expect(quotedHeaders("From: Polly\nHello")).toEqual([]);
  });

  it("finds Gmail's line", () => {
    expect(quotedHeaders("Yes\n\nOn Tue, 1 Jan 2026 at 09:00, Polly <p@x.uk> wrote:\n> Hello")[0]).toMatchObject({
      from: "p@x.uk",
    });
  });

  it("picks addresses out of a line, lowercased", () => {
    expect(addressesIn("Polly <P@X.uk>, j@x.uk")).toEqual(["p@x.uk", "j@x.uk"]);
    expect(addressesIn("nobody")).toEqual([]);
  });
});

describe("who a message is from", () => {
  it("sees through the group's rewriting", () => {
    expect(realSender("x", "Real <r@x.uk>")).toBe("Real <r@x.uk>");
    expect(realSender("'Mo' via PauseAI UK <p@x.uk>", undefined, "mo@x.uk")).toBe("mo@x.uk");
    expect(realSender("'Mo' via PauseAI UK <p@x.uk>")).toBe("'Mo' via PauseAI UK <p@x.uk>");
    expect(realSender("Mo <mo@x.uk>", undefined, "other@x.uk")).toBe("Mo <mo@x.uk>");
  });
});
