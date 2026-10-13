import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import NotFound from "./not-found";

describe("not found page", () => {
  it("says so, with the site header and a way home", async () => {
    await render(<NotFound />);
    await expect.element(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect.element(page.getByRole("link", { name: "Go to homepage" })).toHaveAttribute("href", "/");
  });
});
