import { describe, expect, it } from "vitest";
import { emailState } from "./email-permissions";

describe("emailState", () => {
  it("reads blocked, or a reason its topic can give, and nothing else", () => {
    expect(emailState("blocked")).toEqual({ reason: "blocked" });
    expect(emailState("luma-calendar:unsubscribed")).toEqual({ topic: "luma-calendar", reason: "unsubscribed" });
    expect(emailState("pauseai-updates:removed")).toEqual({ topic: "pauseai-updates", reason: "removed" });
    // A reason another topic gives.
    expect(emailState("luma-calendar:joined")).toBeUndefined();
    expect(emailState("luma-calendar:blocked")).toBeUndefined();
    expect(emailState("luma-calendar")).toBeUndefined();
    expect(emailState("toString:asked")).toBeUndefined();
    expect(emailState("")).toBeUndefined();
  });
});
