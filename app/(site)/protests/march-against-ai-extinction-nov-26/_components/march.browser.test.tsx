import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import MarchArticle from "./MarchArticle";
import MarchHero from "./MarchHero";

describe("march page sections", () => {
  it("says when and where, and registers people on Luma", async () => {
    const { container } = await render(<MarchHero />);
    await expect.element(page.getByRole("heading", { level: 1, name: "March Against AI Extinction" })).toBeVisible();
    expect(container.querySelector(".march-when")?.textContent).toBe(
      "21 November 2026, 12–3pmStart: All Souls' Place, London W1B 3DAEnd: Downing Street, London SW1A 2AA",
    );
    await expect.element(page.getByRole("link", { name: "Register →" })).toHaveAttribute("href", "https://luma.com/pauseai-nov26");
  });

  it("gives the Luma description in its order, with its links and a second Register button", async () => {
    await render(<MarchArticle />);
    const headings = page.getByRole("heading", { level: 2 }).elements().map((h) => h.textContent);
    expect(headings).toEqual([
      "What we want: Frontier AI Legislation",
      "It’s time for the government to step in. We call on the Prime Minister to introduce frontier AI legislation to prevent catastrophe.",
      "Get involved",
      "Code of Conduct",
    ]);
    expect(page.getByRole("link", { name: "photos" }).element().getAttribute("href")).toContain("technologyreview.com");
    await expect.element(page.getByRole("link", { name: "hello@pauseai.uk" })).toHaveAttribute("href", "mailto:hello@pauseai.uk");
    await expect.element(page.getByRole("link", { name: "Register →" })).toHaveAttribute("href", "https://luma.com/pauseai-nov26");
    await expect.element(page.getByRole("img", { name: /Don't let AI decide your future/ })).toBeVisible();
  });
});
