import { describe, expect, it } from "vitest";
import { mailParts } from "./mail-text";

describe("mailParts", () => {
  it("leaves plain words alone", () => {
    expect(mailParts("Dear Jane")).toEqual([{ text: "Dear Jane" }]);
    expect(mailParts("")).toEqual([]);
  });

  it("makes an address a link, leaving out the punctuation after it", () => {
    expect(mailParts("See https://example.org/a?b=1, or (https://example.org/c).")).toEqual([
      { text: "See " },
      { link: "https://example.org/a?b=1" },
      { text: ", or (" },
      { link: "https://example.org/c" },
      { text: ")." },
    ]);
  });

  it("makes an address given twice one link, on one line or two", () => {
    expect(mailParts("At https://example.org/a <https://example.org/a> now")).toEqual([
      { text: "At " },
      { link: "https://example.org/a" },
      { text: " now" },
    ]);
    expect(mailParts("At https://example.org/a\n<https://example.org/a>")).toEqual([
      { text: "At " },
      { link: "https://example.org/a" },
    ]);
  });

  it("keeps a different address in brackets as its own link", () => {
    expect(mailParts("Our page <https://example.org/a>")).toEqual([
      { text: "Our page <" },
      { link: "https://example.org/a" },
      { text: ">" },
    ]);
  });

  it("makes words between asterisks bold, over several lines, with any link in them", () => {
    expect(
      mailParts("Dear Jane,\n\n*Good news: it's out at https://example.org/a\n<https://example.org/a>*\n\nBye"),
    ).toEqual([
      { text: "Dear Jane,\n\n" },
      { bold: [{ text: "Good news: it's out at " }, { link: "https://example.org/a" }] },
      { text: "\n\nBye" },
    ]);
    expect(mailParts("(*Thanks*), *Jane*.")).toEqual([
      { text: "(" },
      { bold: [{ text: "Thanks" }] },
      { text: "), " },
      { bold: [{ text: "Jane" }] },
      { text: "." },
    ]);
  });

  it("leaves asterisks that don't wrap words: a sum, a list, or a pair across paragraphs", () => {
    expect(mailParts("2 * 3 * 4")).toEqual([{ text: "2 * 3 * 4" }]);
    expect(mailParts("* one\n* two")).toEqual([{ text: "* one\n* two" }]);
    expect(mailParts("*one\n\ntwo*")).toEqual([{ text: "*one\n\ntwo*" }]);
  });
});
