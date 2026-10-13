import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import FeatureCard from "./FeatureCard";

describe("FeatureCard", () => {
  it("is an article with an accent edge", async () => {
    const { container } = await render(
      <FeatureCard>
        <h3>Title</h3>
        <p>Text</p>
      </FeatureCard>,
    );
    const card = container.querySelector("article[data-card]") as HTMLElement;
    expect(card.querySelector("h3")?.textContent).toBe("Title");
    expect(getComputedStyle(card).borderLeftWidth).toBe("3px");
  });
});
