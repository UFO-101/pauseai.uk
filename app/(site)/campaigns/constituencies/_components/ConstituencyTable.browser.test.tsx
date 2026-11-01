import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import { exampleRows } from "./ConstituencyMap.examples";
import ConstituencyTable from "./ConstituencyTable";

describe("ConstituencyTable", () => {
  it("lists the constituencies most written from, most first, with their MPs, under the total sent", async () => {
    const screen = await render(<ConstituencyTable rows={exampleRows} />);
    await expect.element(screen.getByRole("heading", { name: copy.table.title })).toBeVisible();
    await expect.element(screen.getByText(copy.table.total(21))).toBeVisible();
    expect([...document.querySelectorAll("tbody tr")].map((tr) => tr.textContent)).toEqual([
      "Cities of London and WestminsterWes Minster MP16",
      "Cardiff North3",
      "Edinburgh East and MusselburghEdie Burgh MP2",
    ]);
  });
});
