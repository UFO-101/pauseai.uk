import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { LightboxExample, PendingButtonAnchorExample, SubmitButtonExample } from "./ui.client";

describe("the ui kit's examples", () => {
  it("opens the lightbox, steps through its photos, logs each call, and closes it", async () => {
    await render(<LightboxExample />);
    const dialog = page.getByRole("dialog", { name: "A photo" });
    await expect.element(dialog).not.toBeInTheDocument();
    await page.getByRole("button", { name: "Open the lightbox" }).click();
    const photo = () => (page.getByRole("img", { name: "An example photo" }).element() as HTMLImageElement).src;
    await expect.element(dialog).toBeVisible();
    const first = photo();

    await page.getByRole("button", { name: "Next" }).click();
    expect(photo()).not.toBe(first);
    await page.getByRole("button", { name: "Previous" }).click();
    expect(photo()).toBe(first);
    await page.getByRole("button", { name: "Close" }).click();
    await expect.element(dialog).not.toBeInTheDocument();

    const log = page.getByRole("list", { name: "Event log" }).getByRole("listitem");
    expect(log.elements().map((item) => item.textContent)).toEqual(["onNext()", "onPrevious()", "onClose()"]);
  });

  it("shows the submit button pending while its form's action runs", async () => {
    await render(<SubmitButtonExample />);
    const button = page.getByRole("button", { name: "Import" });
    await button.click();
    await expect.element(button).toBeDisabled();
    await expect.element(button, { timeout: 3000 }).toBeEnabled();
  });

  it("shows a link pending", async () => {
    await render(<PendingButtonAnchorExample />);
    await expect.element(page.getByRole("link", { name: "Somewhere else" })).toHaveAttribute("aria-busy", "true");
  });
});
