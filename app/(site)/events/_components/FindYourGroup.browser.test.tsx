import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import FindYourGroup from "./FindYourGroup";

describe("FindYourGroup", () => {
  it("points to the local groups on the home page", async () => {
    await render(<FindYourGroup />);
    await expect
      .element(page.getByRole("link", { name: "Find your local group" }))
      .toHaveAttribute("href", "/#local-groups");
  });
});
