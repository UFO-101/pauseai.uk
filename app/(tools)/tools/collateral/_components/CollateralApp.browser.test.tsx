import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import CollateralApp from "./CollateralApp";

describe("CollateralApp", () => {
  it("switches between a single image, a campaign pack and a gallery", async () => {
    const { container } = await render(<CollateralApp events={[]} />);
    await expect.element(page.getByRole("radio", { name: "Single image" })).toHaveAttribute("aria-checked", "true");
    expect(container.querySelector(".collateral-mode-hint")?.textContent).toBe("One design, one format.");
    await page.getByRole("radio", { name: "Campaign pack" }).click();
    await expect.element(page.getByRole("heading", { name: "7. Formats" })).toBeVisible();
    await page.getByRole("radio", { name: "Gallery / carousel" }).click();
    await expect.element(page.getByRole("heading", { name: "1. Platforms" })).toBeVisible();
  });
});
