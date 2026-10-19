import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { TextInput } from "@/components/ui/Controls";
import StaffPage from "./StaffPage";

describe("StaffPage", () => {
  it("is the page's main landmark, the full width", async () => {
    await render(
      <StaffPage>
        <h1>Heading</h1>
      </StaffPage>,
    );
    const main = page.getByRole("main");
    await expect.element(main.getByRole("heading", { name: "Heading" })).toBeVisible();
    expect(getComputedStyle(main.element()).width).toBe(`${document.body.clientWidth}px`);
  });

  it("frames a part of a staff page the same way inside another page's main", async () => {
    const { container } = await render(
      <StaffPage as="div">
        <h1>Heading</h1>
      </StaffPage>,
    );
    await expect.element(page.getByRole("main")).not.toBeInTheDocument();
    const div = container.querySelector("h1")!.parentElement!;
    expect(div.tagName).toBe("DIV");
    expect(getComputedStyle(div).paddingTop).toBe("32px");
  });

  it("sets the compact density on what's in it", async () => {
    await page.viewport(1280, 800);
    await render(
      <>
        <TextInput aria-label="Outside" />
        <StaffPage>
          <TextInput aria-label="Inside" />
        </StaffPage>
      </>,
    );
    const height = (name: string) => page.getByRole("textbox", { name }).element().getBoundingClientRect().height;
    expect(height("Outside")).toBe(48);
    expect(height("Inside")).toBe(36);
  });
});
