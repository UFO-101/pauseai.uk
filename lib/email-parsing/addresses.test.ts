import { describe, expect, it } from "vitest";
import { addressesIn, bareAddress, mailboxes, named, realSender } from "./addresses";

it("names someone by name and address, or either alone", () => {
  expect(named("Jo Seed", "jo@pauseai.uk")).toBe("Jo Seed <jo@pauseai.uk>");
  expect(named("", "jo@pauseai.uk")).toBe("jo@pauseai.uk");
  expect(named(undefined, "jo@pauseai.uk")).toBe("jo@pauseai.uk");
  expect(named("Jo Seed", null)).toBe("Jo Seed");
});

it("picks addresses out of a line, lowercased", () => {
  expect(addressesIn("Polly <P@X.uk>, j@x.uk")).toEqual(["p@x.uk", "j@x.uk"]);
  expect(addressesIn("nobody")).toEqual([]);
});

it("takes the address out of a To header, lowercased", () => {
  expect(bareAddress('"Jo Bloggs MP" <Jo@Example.org>')).toBe("jo@example.org");
  expect(bareAddress(" Jo@Example.org ")).toBe("jo@example.org");
});

describe("a header's line", () => {
  it("reads names and addresses, a comma in quotes being part of a name", () => {
    expect(mailboxes('"Placeholder, Polly" <Polly@Parliament.uk>, jane@example.com, Sam <sam@example.com>,')).toEqual([
      { name: "Placeholder, Polly", address: "polly@parliament.uk" },
      { name: "", address: "jane@example.com" },
      { name: "Sam", address: "sam@example.com" },
    ]);
  });

  it("keeps words with no address as a name, and finds nothing on an empty line", () => {
    expect(mailboxes("undisclosed-recipients:;")).toEqual([{ name: "undisclosed-recipients:;", address: "" }]);
    expect(mailboxes("")).toEqual([]);
  });
});

describe("who a message is from", () => {
  it("sees through the group's rewriting", () => {
    expect(realSender("x", "Real <r@x.uk>")).toBe("Real <r@x.uk>");
    expect(realSender("'Mo' via PauseAI UK <p@x.uk>", undefined, "mo@x.uk")).toBe("mo@x.uk");
    expect(realSender("'Mo' via PauseAI UK <p@x.uk>")).toBe("'Mo' via PauseAI UK <p@x.uk>");
    expect(realSender("Mo <mo@x.uk>", undefined, "other@x.uk")).toBe("Mo <mo@x.uk>");
  });

  it("takes the first of several addresses it's told to reply to, a comma in a name not ending it", () => {
    const from = "'Mo' via PauseAI UK <p@x.uk>";
    expect(realSender(from, undefined, "mo@x.uk, info@x.uk")).toBe("mo@x.uk");
    expect(realSender(from, undefined, '"Mo, MP" <mo@x.uk>, info@x.uk')).toBe('"Mo, MP" <mo@x.uk>');
  });
});
