import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import ButtonRow from "./ButtonRow";
import Callout from "./Callout";
import { PhotoCardBody, PhotoCardImage, photoCardClass } from "./PhotoCard";

describe("Callout", () => {
  it("sets words beside an action, and takes a style", async () => {
    const { container } = await render(
      <Callout style={{ marginTop: 18 }}>
        <p>Words</p>
        <a href="https://example.org/">Act</a>
      </Callout>,
    );
    const callout = container.firstElementChild as HTMLElement;
    expect(getComputedStyle(callout).display).toBe("flex");
    expect(callout.style.marginTop).toBe("18px");
    await expect.element(page.getByRole("link", { name: "Act" })).toBeVisible();
  });
});

describe("ButtonRow", () => {
  it("centres its buttons", async () => {
    const { container } = await render(
      <ButtonRow>
        <a href="https://example.org/">One</a>
      </ButtonRow>,
    );
    expect(getComputedStyle(container.firstElementChild!).justifyContent).toBe("center");
  });
});

describe("PhotoCard", () => {
  it("is a card with a photo and words, lifting on hover when it is a link", async () => {
    await render(
      <>
        <article className={photoCardClass()} aria-label="Still">
          <PhotoCardImage style={{ backgroundImage: 'url("/a.jpg")' }} />
          <PhotoCardBody>
            <h3>Still</h3>
          </PhotoCardBody>
        </article>
        <a className={photoCardClass({ link: true })} href="https://example.org/">
          <PhotoCardBody>
            <h3>Moves</h3>
          </PhotoCardBody>
        </a>
      </>,
    );
    const still = page.getByRole("article", { name: "Still" }).element();
    expect(getComputedStyle(still).borderRadius).toBe("12px");
    expect((still.firstElementChild as HTMLElement).style.backgroundImage).toContain("/a.jpg");
    expect(getComputedStyle(still.querySelector("h3")!).fontSize).toBe("20px");
    const link = page.getByRole("link", { name: "Moves" });
    await link.hover();
    await expect.poll(() => getComputedStyle(link.element()).transform).not.toBe("none");
  });
});
