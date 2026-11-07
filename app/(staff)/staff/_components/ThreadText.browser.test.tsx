import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import ThreadText from "./ThreadText";

it("shows an email's words, its bold, and its links leaving the site", async () => {
  const screen = await render(
    <ThreadText text={"Dear Jane,\n\n*Out now: https://example.org/a\n<https://example.org/a>*\n\nBye"} />,
  );
  const link = page.getByRole("link", { name: "https://example.org/a" });
  await expect.element(link).toHaveAttribute("href", "https://example.org/a");
  await expect.element(link).toHaveAttribute("target", "_blank");
  expect(link.element().closest("strong")?.textContent).toContain("Out now:");
  expect(screen.container.textContent).toContain("Bye");
});
