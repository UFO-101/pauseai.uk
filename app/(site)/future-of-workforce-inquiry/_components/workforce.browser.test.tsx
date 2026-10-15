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

  const tip = () => document.querySelector(".fn-tooltip") as HTMLElement;

  it("shows the note above a marker on hover, and hides it a moment after leaving", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { container } = await render(<Doc />);
    const sup = container.querySelector("sup") as HTMLElement;
    expect(sup.classList.contains("fn-ref")).toBe(true);
    // A marker with no matching note is left alone.
    expect(container.querySelectorAll("sup")[1].classList.contains("fn-ref")).toBe(false);

    sup.dispatchEvent(new MouseEvent("mouseenter"));
    expect(tip().classList.contains("fn-tooltip--visible")).toBe(true);
    expect(tip().innerHTML).toBe("The <em>source</em>.");
    expect(parseFloat(tip().style.top)).toBeLessThan(sup.getBoundingClientRect().top + window.scrollY);

    // Moving onto the tooltip keeps it open.
    sup.dispatchEvent(new MouseEvent("mouseleave"));
    tip().dispatchEvent(new MouseEvent("mouseenter"));
    vi.advanceTimersByTime(200);
    expect(tip().classList.contains("fn-tooltip--visible")).toBe(true);
    tip().dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(200);
    expect(tip().classList.contains("fn-tooltip--visible")).toBe(false);
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
    expect(document.querySelector(".fn-tooltip")).toBeNull();
  });
});
