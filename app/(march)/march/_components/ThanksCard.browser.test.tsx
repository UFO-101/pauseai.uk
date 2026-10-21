import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { marchSignupCopy } from "@/lib/content/march-signup";
import ThanksCard from "./ThanksCard";

const copy = marchSignupCopy.thanks;

describe("ThanksCard", () => {
  it("links to managing the registration on Luma, and quietly offers the form again", async () => {
    const onRegisterAnother = vi.fn();
    await render(<ThanksCard onRegisterAnother={onRegisterAnother} motion="still" onLeft={() => {}} />);
    await expect.element(page.getByRole("heading", { name: "Thank you for registering" })).toBeVisible();
    await expect
      .element(page.getByRole("link", { name: copy.manage }))
      .toHaveAttribute("href", "https://luma.com/pauseai-nov26");
    await expect.element(page.getByRole("link", { name: "PauseAI UK" })).toHaveAttribute("href", "/");
    await page.getByRole("button", { name: copy.registerAnother }).click();
    expect(onRegisterAnother).toHaveBeenCalledOnce();
  });

  it("calls onLeft when its own leaving animation ends, not one inside it", async () => {
    const onLeft = vi.fn();
    const { container } = await render(<ThanksCard onRegisterAnother={() => {}} motion="leaving" onLeft={onLeft} />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.dataset.motion).toBe("leaving");
    expect(card.inert).toBe(true);
    card.querySelector("p")!.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
    expect(onLeft).not.toHaveBeenCalled();
    await expect.poll(() => onLeft.mock.calls.length).toBe(1);
  });

  it("doesn't move on when an entering animation ends", async () => {
    const onLeft = vi.fn();
    const { container } = await render(<ThanksCard onRegisterAnother={() => {}} motion="entering" onLeft={onLeft} />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.dataset.motion).toBe("entering");
    card.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
    expect(onLeft).not.toHaveBeenCalled();
  });
});
