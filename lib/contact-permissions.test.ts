import { describe, expect, it } from "vitest";
import { contactState, stateValue, topicsOf } from "./contact-permissions";

describe("contactState", () => {
  it("reads a blocked email, or a reason its channel's topic can give, and nothing else", () => {
    expect(contactState("email:blocked")).toEqual({ channel: "email", reason: "blocked" });
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
    // Only an email address is blocked; and a topic and reason need their channel.
    expect(contactState("phone:blocked")).toBeUndefined();
    expect(contactState("blocked")).toBeUndefined();
    expect(contactState("pauseai-updates:removed")).toBeUndefined();
    expect(contactState("luma-calendar")).toBeUndefined();
    expect(contactState("")).toBeUndefined();
  });

  it("writes a state as its form value", () => {
    for (const value of ["email:blocked", "email:site-forms:asked", "phone:march-day:ended"]) {
      expect(stateValue(contactState(value)!)).toBe(value);
    }
  });

  it("lists each channel's topics", () => {
    expect(topicsOf("email")).toEqual(["luma-calendar", "pauseai-updates", "site-forms"]);
    expect(topicsOf("phone")).toEqual(["luma-calendar", "volunteering", "site-forms", "march-day"]);
  });
});
