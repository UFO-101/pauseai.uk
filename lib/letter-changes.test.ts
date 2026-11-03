import { describe, expect, it } from "vitest";
import { changeBlocks, draftHash, ownWords, wordDiff } from "./letter-changes";

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

describe("changeBlocks", () => {
  it("gives each run of changed, added or cut paragraphs word by word, and runs of those left alone", () => {
    expect(
      changeBlocks(
        "Dear MP,\n\nOne.\n\nTwo two.\n\nThree.\n\nMeet me.\n\nJane",
        "Dear MP,\n\n One.\n\nTwo two, really.\n\nThree.\n\nMine.\n\n\nNew too.\n\nJane",
      ),
    ).toEqual([
      { kind: "unchanged", paragraphs: ["Dear MP,", "One."] },
      {
        kind: "changed",
        changes: [
          { kind: "same", text: "Two " },
          { kind: "added", text: "two, really." },
          { kind: "removed", text: "two." },
        ],
      },
      { kind: "unchanged", paragraphs: ["Three."] },
      {
        kind: "changed",
        changes: [
          { kind: "removed", text: "Meet me." },
          { kind: "added", text: "Mine.\n\nNew too." },
        ],
      },
      { kind: "unchanged", paragraphs: ["Jane"] },
    ]);
  });

  it("strikes through a paragraph rewritten with other words whole, then gives the new one, rather than mixing them", () => {
    expect(
      changeBlocks("I would like to meet you to discuss this.", "My children ask me about this every week."),
    ).toEqual([
      {
        kind: "changed",
        changes: [
          { kind: "removed", text: "I would like to meet you to discuss this." },
          { kind: "added", text: "My children ask me about this every week." },
        ],
      },
    ]);
  });

  it("gives a letter sent as drafted as one unchanged run, and what was only added or only cut, at either end", () => {
    expect(changeBlocks("A\n\nB", "A\n\nB")).toEqual([{ kind: "unchanged", paragraphs: ["A", "B"] }]);
    expect(changeBlocks("A", "A\n\nB")).toEqual([
      { kind: "unchanged", paragraphs: ["A"] },
      { kind: "changed", changes: [{ kind: "added", text: "B" }] },
    ]);
    expect(changeBlocks("A\n\nB", "B")).toEqual([
      { kind: "changed", changes: [{ kind: "removed", text: "A" }] },
      { kind: "unchanged", paragraphs: ["B"] },
    ]);
  });
});
