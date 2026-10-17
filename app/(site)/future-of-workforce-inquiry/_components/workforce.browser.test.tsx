import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import EvidenceSubmission from "./EvidenceSubmission";
import FootnoteTooltips from "./FootnoteTooltips";
import Foreword from "./Foreword";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("the submission", () => {
  it("has a foreword, the numbered evidence, and its notes", async () => {
    const { container } = await render(
      <>
        <Foreword />
        <EvidenceSubmission />
      </>,
    );
    await expect.element(page.getByRole("heading", { name: "About this inquiry" })).toBeVisible();
    await expect.element(page.getByRole("heading", { name: "Notes" })).toBeVisible();
    // Every footnote marker has a note to point at.
    for (const sup of container.querySelectorAll("sup"))
      expect(container.querySelector(`#fn${sup.textContent!.trim()}`), sup.textContent!).not.toBeNull();
  });
});

describe("FootnoteTooltips", () => {
  function Doc({ markerStyle = {} }: { markerStyle?: React.CSSProperties }) {
    return (
      <div style={{ paddingTop: 300 }}>
        <p>
          Claim<sup style={markerStyle}>1</sup> and<sup>9</sup>.
        </p>
        <ol>
          <li id="fn1">
            The <em>source</em>.
          </li>
        </ol>
        <FootnoteTooltips />
      </div>
    );
  }

  // The tooltip is the hidden-from-screen-readers div the script adds to the page.
  const tip = () => document.querySelector("body > div[aria-hidden='true']") as HTMLElement;
  // Shown, it takes the pointer (its opacity fades, its pointer-events don't).
  const shown = () => getComputedStyle(tip()).pointerEvents === "auto";
  // A marker with a note gets the help cursor.
  const hasNote = (sup: Element) => getComputedStyle(sup).cursor === "help";

  it("shows the note above a marker on hover, and hides it a moment after leaving", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { container } = await render(<Doc />);
    const sup = container.querySelector("sup") as HTMLElement;
    expect(hasNote(sup)).toBe(true);
    // A marker with no matching note is left alone.
    expect(hasNote(container.querySelectorAll("sup")[1])).toBe(false);

    sup.dispatchEvent(new MouseEvent("mouseenter"));
    expect(shown()).toBe(true);
    expect(tip().innerHTML).toBe("The <em>source</em>.");
    expect(parseFloat(tip().style.top)).toBeLessThan(sup.getBoundingClientRect().top + window.scrollY);

    // Moving onto the tooltip keeps it open.
    sup.dispatchEvent(new MouseEvent("mouseleave"));
    tip().dispatchEvent(new MouseEvent("mouseenter"));
    vi.advanceTimersByTime(200);
    expect(shown()).toBe(true);
    tip().dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(200);
    expect(shown()).toBe(false);
  });

  it("puts the note below a marker near the top of the screen, and keeps it on screen at the edge", async () => {
    const { container } = await render(<Doc markerStyle={{ position: "fixed", top: 2, right: 0 }} />);
    const sup = container.querySelector("sup") as HTMLElement;
    sup.dispatchEvent(new MouseEvent("mouseenter"));
    const supRect = sup.getBoundingClientRect();
    expect(parseFloat(tip().style.top)).toBeGreaterThan(supRect.bottom + window.scrollY);
    const tipRect = tip().getBoundingClientRect();
    expect(tipRect.right).toBeLessThanOrEqual(window.innerWidth);
  });

  it("removes the tooltip when the page goes", async () => {
    const { unmount } = await render(<Doc />);
    expect(tip()).not.toBeNull();
    await unmount();
    expect(tip()).toBeNull();
  });
});
