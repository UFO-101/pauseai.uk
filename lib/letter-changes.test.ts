import { describe, expect, it } from "vitest";
import { draftHash, ownWords, wordDiff } from "./letter-changes";

describe("draftHash", () => {
  it("is the same for the same text, and another for any change", () => {
    expect(draftHash("Dear MP,")).toBe(draftHash("Dear MP,"));
    expect(draftHash("Dear MP,")).not.toBe(draftHash("Dear MP."));
    expect(draftHash("")).toMatch(/^[0-9a-f]{8}$/);
    expect(draftHash("Zoë 🙂")).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("wordDiff", () => {
  it("marks what the letter added and what it cut, word by word, keeping the rest", () => {
    expect(wordDiff("Dear MP,\n\nPlease act now.\n\nJane", "Dear MP,\n\nPlease act now. I live here.\n\nJane")).toEqual(
      [
        { kind: "same", text: "Dear MP,\n\nPlease act now. " },
        { kind: "added", text: "I live here.\n\n" },
        { kind: "same", text: "Jane" },
      ],
    );
    // A word with its punctuation changed is a word cut and another added.
    expect(wordDiff("Please act now.", "Please do act.")).toEqual([
      { kind: "same", text: "Please " },
      { kind: "added", text: "do act." },
      { kind: "removed", text: "act now." },
    ]);
  });

  it("finds nothing changed in the same words spaced differently, and handles empty texts", () => {
    expect(wordDiff("a  b", "a b")).toEqual([{ kind: "same", text: "a b" }]);
    expect(wordDiff("", "")).toEqual([]);
    expect(wordDiff("", "new")).toEqual([{ kind: "added", text: "new" }]);
    expect(wordDiff("old", "")).toEqual([{ kind: "removed", text: "old" }]);
  });
});

describe("ownWords", () => {
  it("is the share of the letter's words not in the draft", () => {
    expect(ownWords("one two three", "one two three")).toBe(0);
    expect(ownWords("one two three", "one two three four")).toBe(0.25);
    expect(ownWords("one two", "five six")).toBe(1);
    expect(ownWords("one", "")).toBe(0);
  });
});
