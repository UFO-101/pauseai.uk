import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import Foreword from "./Foreword";

describe("Foreword", () => {
  it("is paragraphs in a white band, a little wider than the reading column", async () => {
    const { container } = await render(
      <Foreword>
        <p>First</p>
      </Foreword>,
    );
    expect(container.querySelector("h2")).toBeNull();
    expect(getComputedStyle(container.querySelector(".container")!).maxWidth).toBe("920px");
    const first = page.getByText("First").element();
    expect(getComputedStyle(first, "::first-letter").float).toBe("none");
  });

  it("takes a heading, a drop cap, and the reading column's width", async () => {
    const { container } = await render(
      <Foreword title="About this" dropCap pageWidth>
        <p>First</p>
      </Foreword>,
    );
    await expect.element(page.getByRole("heading", { level: 2, name: "About this" })).toBeVisible();
    expect(getComputedStyle(container.querySelector(".container")!).maxWidth).toBe("880px");
    const first = page.getByText("First").element();
    expect(getComputedStyle(first, "::first-letter").float).toBe("left");
  });
});
