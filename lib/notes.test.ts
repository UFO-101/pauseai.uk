import { describe, expect, it } from "vitest";
import { canDeleteNote, canEditNote, isSaveKey, NOTE_EDIT_HOURS, noteParts } from "./notes";

const note = { writtenBy: "jo@pauseai.uk", createdAt: "2026-11-02T09:00:00Z" };
const jo = { email: "jo@pauseai.uk", permissions: [] };
const sam = { email: "sam@pauseai.uk", permissions: [] };
const admin = { email: "ada@pauseai.uk", permissions: ["admin" as const] };
const hours = (n: number) => new Date(Date.parse(note.createdAt) + n * 60 * 60 * 1000);

describe("canEditNote and canDeleteNote", () => {
  it("let the writer change a note for a day, and no one else", () => {
    expect(canEditNote(note, jo, hours(NOTE_EDIT_HOURS))).toBe(true);
    expect(canEditNote(note, jo, hours(NOTE_EDIT_HOURS + 0.01))).toBe(false);
    expect(canEditNote(note, sam, hours(1))).toBe(false);
    expect(canDeleteNote(note, jo, hours(1))).toBe(true);
    expect(canDeleteNote(note, jo, hours(25))).toBe(false);
    expect(canDeleteNote(note, sam, hours(1))).toBe(false);
  });

  it("let an admin delete anyone's note at any time, but not edit it", () => {
    expect(canDeleteNote(note, admin, hours(1000))).toBe(true);
    expect(canEditNote(note, admin, hours(1))).toBe(false);
  });
});

describe("noteParts", () => {
  it("leaves text without an address as it is", () => {
    expect(noteParts("Met at the stall.\nKeen to help")).toEqual([{ text: "Met at the stall.\nKeen to help" }]);
    expect(noteParts("")).toEqual([]);
  });

  it("makes each address a link, without the punctuation after it", () => {
    expect(noteParts("See https://example.org/a?b=1. And www.example.com, too")).toEqual([
      { text: "See " },
      { text: "https://example.org/a?b=1", href: "https://example.org/a?b=1" },
      { text: ". And " },
      { text: "www.example.com", href: "https://www.example.com" },
      { text: ", too" },
    ]);
    expect(noteParts("http://example.org")).toEqual([{ text: "http://example.org", href: "http://example.org" }]);
  });

  it("keeps a bracket that's part of the address, and drops one around it", () => {
    expect(noteParts("(see https://en.wikipedia.org/wiki/Foo_(bar)).")).toEqual([
      { text: "(see " },
      { text: "https://en.wikipedia.org/wiki/Foo_(bar)", href: "https://en.wikipedia.org/wiki/Foo_(bar)" },
      { text: ")." },
    ]);
    expect(noteParts("(https://example.org/x)")).toEqual([
      { text: "(" },
      { text: "https://example.org/x", href: "https://example.org/x" },
      { text: ")" },
    ]);
  });

  it("doesn't make a link of what isn't one", () => {
    expect(noteParts("javascript:alert(1) or ftp://x or mailwww.example")).toEqual([
      { text: "javascript:alert(1) or ftp://x or mailwww.example" },
    ]);
  });
});

describe("isSaveKey", () => {
  const keys = { key: "Enter", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
  it("is Ctrl+Enter, or Cmd+Enter, and nothing else", () => {
    expect(isSaveKey({ ...keys, ctrlKey: true })).toBe(true);
    expect(isSaveKey({ ...keys, metaKey: true })).toBe(true);
    expect(isSaveKey(keys)).toBe(false);
    expect(isSaveKey({ ...keys, ctrlKey: true, shiftKey: true })).toBe(false);
    expect(isSaveKey({ ...keys, metaKey: true, altKey: true })).toBe(false);
    expect(isSaveKey({ ...keys, key: "a", ctrlKey: true })).toBe(false);
  });
});
