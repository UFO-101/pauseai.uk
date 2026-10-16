import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import ToolPage from "./ToolPage";

describe("ToolPage", () => {
  it("links back to the tools, then gives the tool's title, lede and the tool", async () => {
    await render(
      <ToolPage title="QR code generator" lede="Make a QR code.">
        <p>The tool</p>
      </ToolPage>,
    );
    await expect.element(page.getByRole("link", { name: "← All tools" })).toHaveAttribute("href", "/tools");
    await expect.element(page.getByRole("heading", { level: 1, name: "QR code generator" })).toBeVisible();
    await expect.element(page.getByText("Make a QR code.")).toBeVisible();
    await expect.element(page.getByText("The tool")).toBeVisible();
  });
});
