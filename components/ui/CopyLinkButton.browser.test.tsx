import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import CopyLinkButton from "./CopyLinkButton";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("CopyLinkButton", () => {
  it("copies a person's link and confirms, then resets", async () => {
    const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await render(<CopyLinkButton slug="jane-doe" />);

    const button = page.getByRole("button", { name: "Copy link to this story" });
    await button.click();

    expect(write).toHaveBeenCalledWith(`${location.origin}/people/jane-doe`);
    await expect.element(page.getByRole("button", { name: "Link copied" })).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Copy link to this story" }), { timeout: 3000 })
      .toBeVisible();
  });

  it("copies an explicit href and shows a label", async () => {
    const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await render(<CopyLinkButton href="/track-record/#x" title="Copy entry" label="Share" className="extra" />);

    const button = page.getByRole("button", { name: "Copy entry" });
    // A ghost button, its icon spaced from the label.
    expect(getComputedStyle(button.element()).borderRadius).toBe("8px");
    expect(getComputedStyle(button.element()).columnGap).toBe("8px");
    await expect.element(button).toHaveClass("extra");
    await expect.element(button).toHaveTextContent("Share");
    await button.click();

    expect(write).toHaveBeenCalledWith(`${location.origin}/track-record/#x`);
    await expect.element(page.getByRole("button", { name: "Link copied" })).toHaveTextContent("Copied!");
  });

  it("renders as an icon-only circle without a label, smaller when asked", async () => {
    await render(
      <>
        <CopyLinkButton slug="x" className="extra" />
        <CopyLinkButton slug="y" title="Small" small />
      </>,
    );
    const button = page.getByRole("button", { name: "Copy link to this story" });
    await expect.element(button).toHaveClass("extra");
    expect(getComputedStyle(button.element()).borderRadius).toBe("50%");
    expect(button.element().getBoundingClientRect().width).toBe(32);
    const small = page.getByRole("button", { name: "Small" }).element();
    expect(small.getBoundingClientRect().width).toBe(28);
    expect(small.querySelector("svg")?.getAttribute("width")).toBe("14");
  });

  it("stays idle when the clipboard refuses", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await render(<CopyLinkButton slug="x" />);

    await page.getByRole("button", { name: "Copy link to this story" }).click();

    await expect.element(page.getByRole("button", { name: "Copy link to this story" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Link copied" })).not.toBeInTheDocument();
  });
});
