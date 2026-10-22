import { describe, expect, it } from "vitest";
import { type EmailFacts, type EmailTopic, emailPermissions } from "./email-permissions";

const NOTHING: EmailFacts = {
  address: "jane@example.com",
  blocked: null,
  optOuts: [],
  followingSince: null,
  member: null,
  letter: null,
};

/** The answer for one topic, without the address. */
function answer(topic: EmailTopic, facts: Partial<EmailFacts>) {
  const found = emailPermissions({ ...NOTHING, ...facts }).find((p) => p.topic === topic)!;
  return { send: found.send, reason: found.reason, at: found.at, source: found.source };
}

describe("emailPermissions", () => {
  it("answers every topic for the address, and no to all of them when nothing asked it", () => {
    expect(emailPermissions(NOTHING)).toEqual([
      {
        topic: "luma-calendar",
        address: "jane@example.com",
        send: false,
        reason: "not-following",
        at: null,
        source: null,
      },
      {
        topic: "pauseai-updates",
        address: "jane@example.com",
        send: false,
        reason: "not-asked",
        at: null,
        source: null,
      },
      {
        topic: "events-and-ways-to-help",
        address: "jane@example.com",
        send: false,
        reason: "not-asked",
        at: null,
        source: null,
      },
    ]);
  });

  it("says no to everything for a blocked address, whatever else it said", () => {
    const blocked = {
      blocked: { at: "2026-10-05T00:00:00Z", kind: "complaint" },
      followingSince: "2026-09-01T00:00:00Z",
      member: { createdAt: "2026-09-12T00:00:00Z", keepInformed: true },
      letter: { at: "2026-10-01T00:00:00Z", consent: true },
    };
    for (const topic of ["luma-calendar", "pauseai-updates", "events-and-ways-to-help"] as const)
      expect(answer(topic, blocked)).toEqual({
        send: false,
        reason: "blocked",
        at: "2026-10-05T00:00:00Z",
        source: "complaint",
      });
  });

  it("emails the calendar's followers, unless they unsubscribed, and not those who never followed", () => {
    expect(answer("luma-calendar", { followingSince: "2026-09-20T00:00:00Z" })).toEqual({
      send: true,
      reason: "following",
      at: "2026-09-20T00:00:00Z",
      source: "luma",
    });
    expect(
      answer("luma-calendar", {
        followingSince: "2026-09-20T00:00:00Z",
        optOuts: [{ list: "luma-calendar", source: "luma-webhook", at: "2026-10-16T00:00:00Z" }],
      }),
    ).toEqual({ send: false, reason: "unsubscribed", at: "2026-10-16T00:00:00Z", source: "luma-webhook" });
  });

  it("sends the updates to members who asked or joined before it was a choice, not to those who declined", () => {
    const member = (createdAt: string, keepInformed: boolean) =>
      answer("pauseai-updates", { member: { createdAt, keepInformed } });
    expect(member("2026-09-12T00:00:00Z", true)).toEqual({
      send: true,
      reason: "asked",
      at: "2026-09-12T00:00:00Z",
      source: "member",
    });
    expect(member("2026-09-12T00:00:00Z", false)).toMatchObject({ send: false, reason: "declined" });
    // Before 30 June 2026 the form required the box, or had none: on the list either way.
    expect(member("2026-03-03T00:00:00Z", true)).toMatchObject({ send: true, reason: "joined" });
    expect(member("2025-11-29T00:00:00Z", false)).toMatchObject({ send: true, reason: "joined" });
    // The import's own opt-out says declined; another source's says unsubscribed.
    const optedOut = (source: string) =>
      answer("pauseai-updates", {
        member: { createdAt: "2026-03-03T00:00:00Z", keepInformed: true },
        optOuts: [{ list: "pauseai-updates", source, at: "2026-10-01T00:00:00Z" }],
      });
    expect(optedOut("airtable-import")).toMatchObject({ send: false, reason: "declined", source: "airtable-import" });
    expect(optedOut("civicrm-import")).toMatchObject({ send: false, reason: "unsubscribed" });
  });

  it("sends news of events and ways to help to whoever agreed on their newest letter", () => {
    expect(answer("events-and-ways-to-help", { letter: { at: "2026-10-05T00:00:00Z", consent: true } })).toEqual({
      send: true,
      reason: "asked",
      at: "2026-10-05T00:00:00Z",
      source: "letter",
    });
    expect(answer("events-and-ways-to-help", { letter: { at: "2026-10-05T00:00:00Z", consent: false } })).toMatchObject(
      {
        send: false,
        reason: "declined",
      },
    );
  });
});
