import { describe, expect, it } from "vitest";
import { type EmailFacts, type EmailTopic, emailPermissions } from "./email-permissions";

const NOTHING: EmailFacts = {
  address: "jane@example.com",
  blocked: null,
  optOuts: [],
  luma: false,
  followingSince: null,
  member: null,
  letter: null,
};

const MEMBER = { createdAt: "2026-09-12T00:00:00Z", keepInformed: true, removed: false };
const LETTER = { at: "2026-10-05T00:00:00Z", consent: true };

/** The answer for one topic, without the topic or address; undefined if the topic doesn't apply. */
function answer(topic: EmailTopic, facts: Partial<EmailFacts>) {
  const found = emailPermissions({ ...NOTHING, ...facts }).find((p) => p.topic === topic);
  return found && { send: found.send, reason: found.reason, at: found.at, source: found.source };
}

describe("emailPermissions", () => {
  it("answers only the topics the address has had anything to do with", () => {
    expect(emailPermissions(NOTHING)).toEqual([]);
    expect(emailPermissions({ ...NOTHING, luma: true, member: MEMBER, letter: LETTER }).map((p) => p.topic)).toEqual([
      "luma-calendar",
      "pauseai-updates",
      "events-and-ways-to-help",
    ]);
    expect(emailPermissions({ ...NOTHING, letter: LETTER })).toEqual([
      {
        topic: "events-and-ways-to-help",
        address: "jane@example.com",
        send: "yes",
        reason: "asked",
        at: "2026-10-05T00:00:00Z",
        source: "letter",
      },
    ]);
    // An opt-out brings its topic in, even before we know the address.
    expect(
      emailPermissions({
        ...NOTHING,
        optOuts: [
          { list: "luma-calendar", source: "luma-webhook", at: "2026-10-16T00:00:00Z" },
          { list: "pauseai-updates", source: "civicrm-import", at: "2026-10-17T00:00:00Z" },
        ],
      }).map((p) => [p.topic, p.reason]),
    ).toEqual([
      ["luma-calendar", "unsubscribed"],
      ["pauseai-updates", "unsubscribed"],
    ]);
  });

  it("says no to everything for a blocked address, whatever else it said", () => {
    const blocked = {
      blocked: { at: "2026-10-05T00:00:00Z", kind: "complaint" },
      luma: true,
      followingSince: "2026-09-01T00:00:00Z",
      member: MEMBER,
      letter: LETTER,
    };
    for (const topic of ["luma-calendar", "pauseai-updates", "events-and-ways-to-help"] as const)
      expect(answer(topic, blocked)).toEqual({
        send: "no",
        reason: "blocked",
        at: "2026-10-05T00:00:00Z",
        source: "complaint",
      });
  });

  it("emails the calendar's followers, unsure of those from before its webhook, not those who unsubscribed or never followed", () => {
    expect(answer("luma-calendar", { luma: true, followingSince: "2026-10-22T09:00:00Z" })).toEqual({
      send: "yes",
      reason: "following",
      at: "2026-10-22T09:00:00Z",
      source: "luma",
    });
    // Following since before Luma told us of unsubscribes: they may have left unheard.
    expect(answer("luma-calendar", { luma: true, followingSince: "2026-09-20T00:00:00Z" })).toMatchObject({
      send: "unsure",
      reason: "following",
    });
    expect(
      answer("luma-calendar", {
        luma: true,
        followingSince: "2026-09-20T00:00:00Z",
        optOuts: [{ list: "luma-calendar", source: "luma-webhook", at: "2026-10-16T00:00:00Z" }],
      }),
    ).toEqual({ send: "no", reason: "unsubscribed", at: "2026-10-16T00:00:00Z", source: "luma-webhook" });
    expect(answer("luma-calendar", { luma: true })).toEqual({
      send: "no",
      reason: "not-following",
      at: null,
      source: null,
    });
  });

  it("is unsure of members who asked or joined before it was a choice, and says no to those who declined or left", () => {
    const member = (createdAt: string, keepInformed: boolean, removed = false) =>
      answer("pauseai-updates", { member: { createdAt, keepInformed, removed } });
    // Every yes is unsure: the updates come from CiviCRM, whose unsubscribes we don't read.
    expect(member("2026-09-12T00:00:00Z", true)).toEqual({
      send: "unsure",
      reason: "asked",
      at: "2026-09-12T00:00:00Z",
      source: "member",
    });
    expect(member("2026-09-12T00:00:00Z", false)).toMatchObject({ send: "no", reason: "declined" });
    // Before 30 June 2026 the form required the box, or had none: on the list either way.
    expect(member("2026-03-03T00:00:00Z", true)).toMatchObject({ send: "unsure", reason: "joined" });
    expect(member("2025-11-29T00:00:00Z", false)).toMatchObject({ send: "unsure", reason: "joined" });
    // No longer shared with us.
    expect(member("2026-09-12T00:00:00Z", true, true)).toMatchObject({ send: "no", reason: "removed" });
    // The import's own opt-out says declined; another source's says unsubscribed.
    const optedOut = (source: string) =>
      answer("pauseai-updates", {
        member: MEMBER,
        optOuts: [{ list: "pauseai-updates", source, at: "2026-10-01T00:00:00Z" }],
      });
    expect(optedOut("airtable-import")).toMatchObject({ send: "no", reason: "declined", source: "airtable-import" });
    expect(optedOut("civicrm-import")).toMatchObject({ send: "no", reason: "unsubscribed" });
  });

  it("sends news of events and ways to help to whoever agreed on their newest letter", () => {
    expect(answer("events-and-ways-to-help", { letter: LETTER })).toMatchObject({ send: "yes", reason: "asked" });
    expect(answer("events-and-ways-to-help", { letter: { ...LETTER, consent: false } })).toEqual({
      send: "no",
      reason: "declined",
      at: "2026-10-05T00:00:00Z",
      source: "letter",
    });
  });
});
