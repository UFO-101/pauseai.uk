import { describe, expect, it } from "vitest";
import { contactState, stateValue, topicsOf } from "./contact-permissions";

describe("contactState", () => {
  it("reads blocked, or a reason its channel's topic can give, and nothing else", () => {
    expect(contactState("blocked")).toEqual({ channel: "email", reason: "blocked" });
    expect(contactState("email:luma-calendar:unsubscribed")).toEqual({
      channel: "email",
      topic: "luma-calendar",
      reason: "unsubscribed",
    });
    expect(contactState("phone:volunteering:volunteered")).toEqual({
      channel: "phone",
      topic: "volunteering",
      reason: "volunteered",
    });
    // A topic the channel doesn't have, and a reason another topic gives.
    expect(contactState("email:volunteering:volunteered")).toBeUndefined();
    expect(contactState("phone:pauseai-updates:asked")).toBeUndefined();
    expect(contactState("email:luma-calendar:joined")).toBeUndefined();
    expect(contactState("email:luma-calendar:blocked")).toBeUndefined();
    expect(contactState("post:luma-calendar:following")).toBeUndefined();
    expect(contactState("email:toString:asked")).toBeUndefined();
    expect(contactState("luma-calendar")).toBeUndefined();
    expect(contactState("")).toBeUndefined();
  });

  it("reads a topic and reason with no channel as email's, as older links have them", () => {
    expect(contactState("pauseai-updates:removed")).toEqual({
      channel: "email",
      topic: "pauseai-updates",
      reason: "removed",
    });
    expect(contactState("march-day:ended")).toBeUndefined();
  });

  it("writes a state as its form value", () => {
    for (const value of ["blocked", "email:site-forms:asked", "phone:march-day:ended"]) {
      expect(stateValue(contactState(value)!)).toBe(value);
    }
  });

  it("lists each channel's topics", () => {
    expect(topicsOf("email")).toEqual(["luma-calendar", "pauseai-updates", "site-forms"]);
    expect(topicsOf("phone")).toEqual(["luma-calendar", "volunteering", "site-forms", "march-day"]);
  });
});
