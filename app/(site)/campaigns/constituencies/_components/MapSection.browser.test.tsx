import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import { exampleRows } from "./ConstituencyMap.examples";
import MapSection from "./MapSection";

describe("MapSection", () => {
  it("puts the map, where its numbers come from, and the table together", async () => {
    const screen = await render(<MapSection rows={exampleRows} />);
    await expect.element(screen.getByRole("img")).toBeVisible();
    await expect.element(screen.getByRole("link", { name: copy.sourceLink })).toHaveAttribute("href", copy.sourceLink);
    await expect.element(screen.getByText(copy.table.summary)).toBeVisible();
  });
});
