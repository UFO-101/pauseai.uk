import { describe, expect, it } from "vitest";
import { gmailSearchUrl, googleGroupUrl } from "./letter-links";

describe("googleGroupUrl", () => {
  it("is the policy@ group's page for Postmark's message", () => {
    expect(googleGroupUrl("0a1b2c3d-1111-2222-3333-444455556666")).toBe(
      "https://groups.google.com/a/pauseai.uk/d/msgid/policy/0a1b2c3d-1111-2222-3333-444455556666@mtasv.net",
    );
  });
});

describe("gmailSearchUrl", () => {
  it("searches for mail to the address sent five minutes either side", () => {
    const url = gmailSearchUrl("jo.mp@parliament.uk", "2026-10-01T12:00:00Z");
    const at = Date.parse("2026-10-01T12:00:00Z") / 1000;
    expect(url).toBe(
      `https://mail.google.com/mail/#search/${encodeURIComponent(`to:jo.mp@parliament.uk after:${at - 300} before:${at + 300}`)}`,
    );
    expect(gmailSearchUrl("jo.mp@parliament.uk", new Date("2026-10-01T12:00:00Z"))).toBe(url);
  });
});
