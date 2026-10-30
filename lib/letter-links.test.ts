import { describe, expect, it } from "vitest";
import { messageIdSearch, postmarkSearch, sentNearSearch } from "./letter-links";

describe("the searches", () => {
  it("finds an email by its Message-ID, or Postmark's at mtasv.net", () => {
    expect(messageIdSearch("abc@pauseai.uk")).toBe("rfc822msgid:abc@pauseai.uk");
    expect(postmarkSearch("0a1b2c3d-1111")).toBe("rfc822msgid:0a1b2c3d-1111@mtasv.net");
  });

  it("finds mail to the address sent five minutes either side", () => {
    const at = Date.parse("2026-10-01T12:00:00Z") / 1000;
    const search = sentNearSearch("jo.mp@parliament.uk", "2026-10-01T12:00:00Z");
    expect(search).toBe(`to:jo.mp@parliament.uk after:${at - 300} before:${at + 300}`);
    expect(sentNearSearch("jo.mp@parliament.uk", new Date("2026-10-01T12:00:00Z"))).toBe(search);
  });
});
