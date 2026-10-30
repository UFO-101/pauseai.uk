import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import { exampleRows } from "./ConstituencyMap.examples";
import ConstituencyTable from "./ConstituencyTable";

describe("ConstituencyTable", () => {
  it("folds every constituency's numbers away, by name, with its MP if it has one", async () => {
    const screen = await render(<ConstituencyTable rows={exampleRows} />);
    expect(document.querySelector("details")!.open).toBe(false);
    await screen.getByText(copy.table.summary).click();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(650);
    await expect
      .element(screen.getByRole("row", { name: /^Cities of London and Westminster/ }))
      .toHaveTextContent("Cities of London and WestminsterWes Minster MP42124");
    await expect.element(screen.getByRole("row", { name: /^Cardiff North/ })).toHaveTextContent("Cardiff North1230");
  });
});
