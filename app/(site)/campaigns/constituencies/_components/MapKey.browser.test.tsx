import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import MapKey from "./MapKey";

describe("MapKey", () => {
  it("names the layer and each step, none first", async () => {
    const screen = await render(<MapKey layer="frontier" />);
    await expect.element(screen.getByText(copy.legendLabel.frontier)).toBeVisible();
    expect([...document.querySelectorAll("li")].map((li) => li.textContent)).toEqual([
      copy.none,
      "1",
      "2–4",
      "5–9",
      "10+",
    ]);
  });
});
