import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import PageHero from "./PageHero";

const style = (element: Element) => getComputedStyle(element);

describe("PageHero", () => {
  it("is a title and a lede, a reading column wide", async () => {
    const { container } = await render(<PageHero title="Press" lede="For journalists." />);
    const title = page.getByRole("heading", { level: 1, name: "Press" });
    await expect.element(title).toBeVisible();
    const lede = page.getByText("For journalists.");
    expect(style(lede.element()).maxWidth).toBe("640px");
    expect(style(container.querySelector(".container")!).maxWidth).toBe("880px");
    // The test window is phone-sized: 40px under it there, 56px on a desktop.
    expect(style(container.querySelector("section")!).paddingBottom).toBe("40px");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("leaves the lede out when there is none, and takes markup after the title", async () => {
    const { container } = await render(
      <PageHero title="Governance">
        <p>A byline</p>
      </PageHero>,
    );
    expect(container.querySelectorAll("p")).toHaveLength(1);
    await expect.element(page.getByText("A byline")).toBeVisible();
  });

  it("widens, tightens and lets the lede run long", async () => {
    const { container } = await render(<PageHero title="Blog" lede="Long" width="wide" tight longLede />);
    expect(style(container.querySelector(".container")!).maxWidth).toBe("1080px");
    expect(style(container.querySelector("section")!).paddingBottom).toBe("32px");
    const lede = style(page.getByText("Long").element());
    expect(lede.maxWidth).toBe("none");
    expect(lede.marginTop).toBe("22px");
  });

  it("sets a small title beside a figure, under a link back", async () => {
    await render(
      <PageHero
        title="A post"
        smallTitle
        before={<a href="https://example.org/">Back</a>}
        figure={<span role="img" aria-label="Ada" />}
      />,
    );
    const title = page.getByRole("heading", { level: 1, name: "A post" });
    expect(style(title.element()).marginTop).toBe("0px");
    expect(style(title.element()).textWrap).toBe("pretty");
    const back = page.getByRole("link", { name: "Back" }).element();
    expect(back.compareDocumentPosition(title.element()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(page.getByRole("img", { name: "Ada" }).element().parentElement).toBe(
      title.element().parentElement!.parentElement,
    );
  });

  it("draws the track record's swirl of forty rotated rings", async () => {
    const { container } = await render(<PageHero title="Track Record" swirl />);
    const rings = container.querySelectorAll("svg[aria-hidden] ellipse");
    expect(rings).toHaveLength(40);
    expect(rings[1].getAttribute("transform")).toBe("rotate(4.5 300 300)");
  });
});
