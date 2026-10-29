import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import DraftNotice from "./DraftNotice";

describe("DraftNotice", () => {
  it("says the page is a draft", async () => {
    const screen = await render(<DraftNotice />);
    await expect.element(screen.getByRole("note")).toHaveTextContent(copy.draftNotice);
  });
});
