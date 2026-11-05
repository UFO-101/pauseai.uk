import { describe, expect, it, vi } from "vitest";
import { staffCopy } from "./content/staff-interface";
import { EMPTY_MAILING_DOC, type MailingDoc } from "./mailing-doc";
import {
  firstWords,
  hasField,
  messageCost,
  messageScheduleProblems,
  messageTerms,
  textReplyUntil,
  textStopsAt,
  type SchedulingMessage,
} from "./supporter-messages";

const WORDS: MailingDoc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] };

describe("messageTerms", () => {
  it("takes the channel and topic from one topic answered yes, a number's being by text", () => {
    expect(messageTerms("email:pauseai-updates:yes")).toEqual({ channel: "email", topic: "pauseai-updates" });
    expect(messageTerms(["phone:luma-calendar:yes"])).toEqual({ channel: "text", topic: "luma-calendar" });
  });

  it("ignores what the filter leaves out", () => {
    expect(messageTerms(["email:site-forms:yes", "!email:luma-calendar:yes"])).toEqual({
      channel: "email",
      topic: "site-forms",
    });
  });

  it("gives none without one topic answered yes, as not sure isn't enough", () => {
    expect(messageTerms(undefined)).toBeUndefined();
    expect(messageTerms("email:pauseai-updates:unsure")).toBeUndefined();
    expect(messageTerms("email:pauseai-updates")).toBeUndefined();
    expect(messageTerms("email:blocked")).toBeUndefined();
    expect(messageTerms(["email:site-forms:yes", "email:luma-calendar:yes"])).toBeUndefined();
  });
});

describe("the fixed limits", () => {
  it("stops a text three days after its time", () => {
    expect(textStopsAt("2026-11-12T09:18:00.000Z")).toBe("2026-11-15T09:18:00.000Z");
  });

  it("keeps a reply free for a day after their last message, and none before they've written", () => {
    expect(textReplyUntil("2026-11-07T08:52:00.000Z")).toBe("2026-11-08T08:52:00.000Z");
    expect(textReplyUntil(null)).toBeNull();
  });
});

it("says what messages cost, by channel", () => {
  expect(messageCost("email", 400)).toBe(staffCopy.messagePages.cost.email("0.50"));
  expect(messageCost("text", 100)).toBe(staffCopy.messagePages.cost.text("4.40", 4.4));
});

it("names the condition for having a field", () => {
  expect(hasField("mp")).toBe("has:mp");
});

describe("firstWords", () => {
  const doc = (text: string): MailingDoc => ({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hi " },
          { type: "field", attrs: { field: "firstName" } },
          { type: "hardBreak" },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "field", attrs: { field: "other" } },
          { type: "text", text },
        ],
      },
    ],
  });

  it("says a field by its label, or its ID with none, each paragraph after the last", () => {
    expect(firstWords(doc(" there"), { firstName: "first name" })).toBe("Hi {first name} {other} there");
  });

  it("stops at a length, saying there's more", () => {
    const words = firstWords(doc(` ${"word ".repeat(40)}`), {});
    expect(words.length).toBeLessThanOrEqual(81);
    expect(words.endsWith("…")).toBe(true);
  });
});

describe("messageScheduleProblems", () => {
  const good: SchedulingMessage = {
    channel: "email",
    subject: "Hello",
    body: WORDS,
    dueAt: "2099-01-01T09:18:00Z",
    recipients: 3,
    unknown: [],
    byGmail: false,
    connected: false,
    sends: true,
  };

  it("finds nothing wrong with one ready to go, even with no Gmail connected", () => {
    expect(messageScheduleProblems(good)).toEqual([]);
  });

  it("says everything that stops an email", () => {
    expect(
      messageScheduleProblems({
        ...good,
        subject: " ",
        body: EMPTY_MAILING_DOC,
        dueAt: null,
        recipients: 0,
        unknown: ["event=gone"],
        sends: false,
      }),
    ).toEqual(["unknown-filter", "no-recipients", "no-subject", "no-letter", "no-time", "cannot-send"]);
  });

  it("wants a text to have a template and no subject", () => {
    expect(messageScheduleProblems({ ...good, channel: "text", subject: "" })).toEqual([]);
    expect(messageScheduleProblems({ ...good, channel: "text", subject: "", body: EMPTY_MAILING_DOC })).toEqual([
      "no-template",
    ]);
  });

  it("holds a Gmail to being connected and to its daily limit", () => {
    expect(messageScheduleProblems({ ...good, byGmail: true, recipients: 5000 })).toEqual([
      "not-connected",
      "too-many",
    ]);
    expect(messageScheduleProblems({ ...good, byGmail: true, connected: true })).toEqual([]);
  });

  it("won't send into the past", () => {
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"));
    expect(messageScheduleProblems({ ...good, dueAt: "2026-11-05T11:00:00Z" })).toEqual(["time-passed"]);
    vi.useRealTimers();
  });
});
