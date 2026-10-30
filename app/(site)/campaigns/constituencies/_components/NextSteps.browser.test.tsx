import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import NextSteps from "./NextSteps";

describe("NextSteps", () => {
  it("links each step, but for the one that copies the map's link", async () => {
    const screen = await render(<NextSteps />);
    const [write, share, meet] = copy.next.steps;
    await expect.element(screen.getByRole("link", { name: write.link.label })).toHaveAttribute("href", write.link.href);
    await expect.element(screen.getByRole("link", { name: meet.link.label })).toHaveAttribute("href", meet.link.href);
    await expect.element(screen.getByRole("button", { name: share.link.label })).toBeVisible();
  });
});
