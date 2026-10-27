import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { staffCopy } from "@/lib/content/staff-interface";

// Every loading.tsx under the signed-in pages: what a page there shows while it loads.
const loadings = import.meta.glob<{ default: ComponentType }>("./**/loading.tsx", { eager: true });

describe("the signed-in pages' loading.tsx", () => {
  it.each(Object.keys(loadings))("%s shows the page's skeleton", async (file) => {
    const Loading = loadings[file].default;
    await render(<Loading />);
    await expect.element(page.getByRole("status")).toHaveTextContent(staffCopy.loading);
  });

  it("finds one in each folder with pages under it", () => {
    expect(Object.keys(loadings).length).toBeGreaterThan(5);
  });
});
