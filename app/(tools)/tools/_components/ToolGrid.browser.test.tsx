import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import ToolGrid, { TOOLS } from "./ToolGrid";

describe("ToolGrid", () => {
  it("links to each tool, opening outside tools in a new tab", async () => {
    await render(<ToolGrid />);
    for (const tool of TOOLS) {
      const link = page.getByRole("link", { name: new RegExp(tool.title) });
      await expect.element(link).toHaveAttribute("href", tool.href);
      if (tool.external) {
        await expect.element(link).toHaveAttribute("target", "_blank");
        expect(link.element().textContent).toMatch(/Visit ↗\(opens in a new tab\)$/);
      } else {
        expect(link.element().textContent).toMatch(/Open →$/);
      }
    }
  });
});
