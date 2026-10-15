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
    await expect.element(button).toHaveAttribute("data-variant", "ghost");
    await expect.element(button).toHaveClass("story-share-cta");
    await expect.element(button).toHaveClass("extra");
    await expect.element(button).toHaveTextContent("Share");
    await button.click();

    expect(write).toHaveBeenCalledWith(`${location.origin}/track-record/#x`);
    await expect.element(page.getByRole("button", { name: "Link copied" })).toHaveTextContent("Copied!");
  });

  it("renders as an icon-only circle without a label", async () => {
    await render(<CopyLinkButton slug="x" className="extra" />);
    const button = page.getByRole("button", { name: "Copy link to this story" });
    await expect.element(button).toHaveClass("story-share-btn extra");
    await expect.element(button).not.toHaveAttribute("data-button");
  });

  it("stays idle when the clipboard refuses", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await render(<CopyLinkButton slug="x" />);

    await page.getByRole("button", { name: "Copy link to this story" }).click();

    await expect.element(page.getByRole("button", { name: "Copy link to this story" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Link copied" })).not.toBeInTheDocument();
  });
});
