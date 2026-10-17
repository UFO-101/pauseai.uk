import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import Lightbox from "./Lightbox";

describe("Lightbox", () => {
  it("renders nothing while closed, and ignores keys", async () => {
    const onClose = vi.fn();
    await render(
      <Lightbox open={false} onClose={onClose}>
        <p>Inside</p>
      </Lightbox>,
    );
    await userEvent.keyboard("{Escape}");
    expect(document.querySelector("[role=dialog]")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens over the whole page, at its end, and passes on Escape, the arrow keys, its buttons and backdrop clicks", async () => {
    const onClose = vi.fn();
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const { container } = await render(
      <Lightbox open onClose={onClose} onPrevious={onPrevious} onNext={onNext} label="Photo">
        <p>Inside</p>
      </Lightbox>,
    );
    const dialog = page.getByRole("dialog", { name: "Photo" });
    await expect.element(dialog).toBeVisible();
    expect(container.contains(dialog.element())).toBe(false);
    expect(dialog.element().parentElement).toBe(document.body);
    expect(getComputedStyle(dialog.element()).position).toBe("fixed");

    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{Enter}");
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    (page.getByRole("button", { name: "Previous" }).element() as HTMLElement).click();
    (page.getByRole("button", { name: "Next" }).element() as HTMLElement).click();
    expect(onPrevious).toHaveBeenCalledTimes(2);
    expect(onNext).toHaveBeenCalledTimes(2);

    (page.getByText("Inside").element() as HTMLElement).click();
    expect(onClose).not.toHaveBeenCalled();
    (dialog.element() as HTMLElement).click();
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
    (page.getByRole("button", { name: "Close" }).element() as HTMLElement).click();
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("does without previous and next", async () => {
    const onClose = vi.fn();
    await render(
      <Lightbox open onClose={onClose}>
        <p>Inside</p>
      </Lightbox>,
    );
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");
    expect(onClose).not.toHaveBeenCalled();
    await expect.element(page.getByRole("button", { name: "Close" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Previous" })).not.toBeInTheDocument();
    await expect.element(page.getByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("stops listening when it closes", async () => {
    const onClose = vi.fn();
    const { rerender } = await render(
      <Lightbox open onClose={onClose}>
        <p>Inside</p>
      </Lightbox>,
    );
    await rerender(
      <Lightbox open={false} onClose={onClose}>
        <p>Inside</p>
      </Lightbox>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });
});
