import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MailingDoc } from "./mailing-doc";
import { scheduleProblems, type SchedulingMailing } from "./mailing-schedule";

const LETTER: MailingDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Dear " },
        { type: "field", attrs: { field: "salutation" } },
      ],
    },
  ],
};
const READY: SchedulingMailing = {
  subject: "Hello",
  body: LETTER,
  sentFrom: "jo@pauseai.uk",
  dueAt: "2026-11-02T09:00:00Z",
  recipients: 2,
  lacking: ["constituency"],
  unknown: [],
  sends: true,
};

describe("scheduleProblems", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2026-11-01T09:00:00Z"), toFake: ["Date"] }));
  afterEach(() => vi.useRealTimers());

  it("finds nothing stopping a mailing that's ready", () => {
    expect(scheduleProblems(READY)).toEqual([]);
  });

  it("says everything that stops one, in the page's order", () => {
    expect(
      scheduleProblems({
        subject: " ",
        body: { type: "doc", content: [] },
        sentFrom: null,
        dueAt: null,
        recipients: 0,
        lacking: [],
        unknown: ["party=Gone"],
        sends: false,
      }),
    ).toEqual([
      "no-subject",
      "no-letter",
      "unknown-filter",
      "no-recipients",
      "no-sender",
      "no-time",
      "cannot-send",
    ]);
  });

  it("refuses a field someone lacks, and a time gone by", () => {
    expect(scheduleProblems({ ...READY, lacking: ["salutation"], dueAt: "2026-11-01T09:00:00Z" })).toEqual([
      "field-lacking",
      "time-passed",
    ]);
  });
});
