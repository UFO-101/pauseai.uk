import { describe, expect, it } from "vitest";
import { isAcknowledgement, isMachineReply, plainSubject, sameSubject } from "./subjects";

describe("isMachineReply", () => {
  const reply = (headers: Record<string, string>, subject = "Re: Your letter") =>
    isMachineReply((name) => headers[name], subject);

  it("knows a machine's reply by its headers, however they're written", () => {
    expect(reply({ "auto-submitted": " Auto-Replied " })).toBe(true);
    expect(reply({ "x-autoreply": "yes" })).toBe(true);
    expect(reply({ "x-autorespond": "" })).toBe(true);
    for (const precedence of ["auto_reply", "bulk", "JUNK"]) expect(reply({ precedence })).toBe(true);
  });

  it("knows one by a subject that starts by saying so", () => {
    for (const subject of ["Automatic reply: Hi", "Auto-Reply: Hi", "autoresponse", "Out of the office"]) {
      expect(reply({}, subject), subject).toBe(true);
    }
  });

  it("takes a person's reply as a person's", () => {
    expect(reply({})).toBe(false);
    expect(reply({ "auto-submitted": "no", precedence: "list" })).toBe(false);
    expect(reply({}, "Re: Out of office hours support")).toBe(false);
  });
});

describe("a reply's subject", () => {
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
});
