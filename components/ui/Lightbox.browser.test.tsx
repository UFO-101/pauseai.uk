import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import Lightbox from "./Lightbox";

describe("Lightbox", () => {
  it("renders nothing while closed, and ignores keys", async () => {
    const onClose = vi.fn();
    await render(
      <Lightbox open={false} onClose={onClose} className="box">
        <p>Inside</p>
      </Lightbox>,
    );
    await userEvent.keyboard("{Escape}");
    expect(document.querySelector(".box")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens at the end of the page, and passes on Escape, the arrow keys and backdrop clicks", async () => {
    const onClose = vi.fn();
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const { container } = await render(
      <Lightbox open onClose={onClose} onPrevious={onPrevious} onNext={onNext} className="box" label="Photo">
        <p>Inside</p>
      </Lightbox>,
    );
    const dialog = page.getByRole("dialog", { name: "Photo" });
    await expect.element(dialog).toHaveClass("box open", { exact: true });
    expect(container.contains(dialog.element())).toBe(false);
    expect(dialog.element().parentElement).toBe(document.body);

    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{Enter}");
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    (page.getByText("Inside").element() as HTMLElement).click();
    expect(onClose).not.toHaveBeenCalled();
    (dialog.element() as HTMLElement).click();
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does without previous and next", async () => {
    const onClose = vi.fn();
    await render(
      <Lightbox open onClose={onClose} className="box">
        <p>Inside</p>
      </Lightbox>,
    );
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowRight}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stops listening when it closes", async () => {
    const onClose = vi.fn();
    const { rerender } = await render(
      <Lightbox open onClose={onClose} className="box">
        <p>Inside</p>
      </Lightbox>,
    );
    await rerender(
      <Lightbox open={false} onClose={onClose} className="box">
        <p>Inside</p>
      </Lightbox>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });
});
