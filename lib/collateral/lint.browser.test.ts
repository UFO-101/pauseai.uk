import { afterEach, describe, expect, it, vi } from "vitest";
import { LintCollector, MIN_PRINT_PT, isUnreadableLink, lintLinksInText, sameIssues, splitByScope, type LintIssue } from "./lint";
import type { Rgb } from "./contrast";

// The contrast checks read pixels from a real canvas, so these run in the browser.

const INK: Rgb = [26, 22, 18];
const WHITE: Rgb = [255, 255, 255];

/** A canvas painted by `paint`. */
function canvas(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  paint(c.getContext("2d")!);
  return c;
}

const plain = (colour: string, width = 100, height = 50) =>
  canvas(width, height, (ctx) => {
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, width, height);
  });

const stripes = (width = 100, height = 50) =>
  canvas(width, height, (ctx) => {
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = x % 2 ? "#fff" : "#000";
      ctx.fillRect(x, 0, 1, height);
    }
  });

const box = { x: 0, y: 0, w: 100, h: 50 };

afterEach(() => vi.restoreAllMocks());

describe("LintCollector contrast checks", () => {
  it("reads fine with no photo, or no text over it", () => {
    const lint = new LintCollector();
    expect(lint.readsAt(0.5, true)).toBe(true);
    lint.captureBackdrop(plain("#000"), { bg: WHITE, visible: 1 });
    expect(lint.readsAt(0.5, true)).toBe(true);
    expect(lint.finish()).toEqual([]);
  });

  it("ignores text with no colour, blank text, and text before the photo is captured", () => {
    const lint = new LintCollector();
    lint.noteTextBox("Before", box, INK, false);
    lint.captureBackdrop(plain("#000"), { bg: WHITE, visible: 1 });
    lint.noteTextBox("No colour", box, null, false);
    lint.noteTextBox("   ", box, INK, false);
    expect(lint.readsAt(1, false)).toBe(true);
  });

  it("flags dark text on a dark photo, quoting the start of the line", () => {
    const lint = new LintCollector();
    lint.captureBackdrop(plain("#111"), { bg: WHITE, visible: 1 });
    lint.noteTextBox("A rather long headline that goes on and on", box, INK, false);
    expect(lint.readsAt(1, false)).toBe(false);
    // Enough white over the photo fixes it.
    expect(lint.readsAt(0.1, false)).toBe(true);
    const [issue] = lint.finish();
    expect(issue).toMatchObject({ id: "contrast", level: "warn" });
    expect(issue.message).toContain("“A rather long headline that…”");
  });

  it("notes small text on a busy photo, even when it reads", () => {
    const lint = new LintCollector();
    lint.captureBackdrop(stripes(), { bg: WHITE, visible: 0.3 });
    lint.noteTextBox("Small print", box, INK, false);
    expect(lint.readsAt(0.3, false)).toBe(true);
    expect(lint.readsAt(0.3, true)).toBe(false);
    expect(lint.finish()).toEqual([expect.objectContaining({ id: "busy-background", level: "info" })]);
  });

  it("is happy with dark text on a plain light photo", () => {
    const lint = new LintCollector();
    lint.captureBackdrop(plain("#eee"), { bg: WHITE, visible: 1 });
    lint.noteTextBox("Clear", box, INK, false);
    expect(lint.readsAt(1, true)).toBe(true);
    expect(lint.finish()).toEqual([]);
  });

  it("measures a wide canvas from a scaled-down copy", () => {
    const lint = new LintCollector();
    lint.captureBackdrop(plain("#111", 800, 400), { bg: WHITE, visible: 1 });
    // The box is in full-size canvas pixels; it still lands on the dark copy.
    lint.noteTextBox("Dark", { x: 400, y: 200, w: 400, h: 200 }, INK, false);
    expect(lint.readsAt(1, false)).toBe(false);
  });

  it("does nothing when the canvas can't be read", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const lint = new LintCollector();
    lint.captureBackdrop(document.createElement("canvas"), { bg: WHITE, visible: 1 });
    lint.noteTextBox("Ignored", box, INK, false);
    expect(lint.readsAt(1, true)).toBe(true);
  });
});

describe("LintCollector print size", () => {
  it("warns when the smallest text prints below the minimum", () => {
    const lint = new LintCollector();
    lint.noteText(0);
    lint.noteText(40);
    lint.noteText(20);
    lint.noteText(30);
    expect(lint.minTextPx).toBe(20);
    // 20 px at 300 dpi is 4.8 pt.
    const [issue] = lint.finish(300);
    expect(issue).toMatchObject({ id: "print-small-text", level: "warn" });
    expect(issue.message).toContain("4.8 pt");
    expect(MIN_PRINT_PT).toBe(7);
  });

  it("is fine with big enough text, no text, or a digital format", () => {
    const big = new LintCollector();
    big.noteText(60);
    expect(big.finish(300)).toEqual([]);
    expect(new LintCollector().finish(300)).toEqual([]);
    const digital = new LintCollector();
    digital.noteText(5);
    expect(digital.finish()).toEqual([]);
  });

  it("lists warnings before notes, each once", () => {
    const lint = new LintCollector();
    lint.add({ id: "a", level: "info", message: "A" });
    lint.add({ id: "b", level: "warn", message: "B" });
    lint.add({ id: "b", level: "warn", message: "B again" });
    lint.add({ id: "c", level: "info", message: "C" });
    expect(lint.finish().map((i) => i.id)).toEqual(["b", "a", "c"]);
  });
});

describe("lint helpers", () => {
  const issue = (id: string, message = id, scope?: "design"): LintIssue => ({ id, level: "warn", message, scope });

  it("compares issue lists by id and message, in order", () => {
    expect(sameIssues([issue("a"), issue("b")], [issue("a"), issue("b")])).toBe(true);
    expect(sameIssues([issue("a")], [issue("a"), issue("b")])).toBe(false);
    expect(sameIssues([issue("a")], [issue("b")])).toBe(false);
    expect(sameIssues([issue("a", "x")], [issue("a", "y")])).toBe(false);
  });

  it("lists a design problem once, whichever formats reported it", () => {
    const { design, own } = splitByScope([[issue("d", "d", "design"), issue("f1")], [issue("d", "d", "design")]]);
    expect(design.map((i) => i.id)).toEqual(["d"]);
    expect(own.map((list) => list.map((i) => i.id))).toEqual([["f1"], []]);
  });

  it("checks only text fields other than the web address", () => {
    const lint = new LintCollector();
    lintLinksInText(
      lint,
      [
        { key: "url", label: "Web address", kind: "text" },
        { key: "date", label: "Date", kind: "date" },
        { key: "body", label: "Body", kind: "textarea" },
        { key: "missing", label: "Missing", kind: "text" },
      ],
      { url: "pauseai.uk", date: "pauseai.uk", body: "See pauseai.uk/events." },
    );
    expect(lint.issues.map((i) => i.id)).toEqual(["link-in-body"]);
  });

  it("treats a malformed address as readable", () => {
    expect(isUnreadableLink("https://")).toBe(false);
    expect(isUnreadableLink("bit.ly")).toBe(false);
  });
});
