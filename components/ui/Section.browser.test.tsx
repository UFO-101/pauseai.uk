import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import Section, { Lede, SectionHeader } from "./Section";

const style = (element: Element) => getComputedStyle(element);

describe("Section", () => {
  it("is a plain band with room above and below, its heading and a short lede", async () => {
    const { container } = await render(
      <Section id="join">
        <SectionHeader title="Join">
          <Lede>Fill it in.</Lede>
        </SectionHeader>
      </Section>,
    );
    const section = container.querySelector("section#join")!;
    expect(style(section).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(style(section).borderTopStyle).toBe("none");
    // The test window is phone-sized: 56px there, 80px on a desktop.
    expect(style(section).paddingTop).toBe("56px");
    await expect.element(page.getByRole("heading", { level: 2, name: "Join" })).toBeVisible();
    expect(style(page.getByText("Fill it in.").element()).maxWidth).toBe("720px");
  });

  it("takes a muted or white ground, borders, a long lede and less room on a phone", async () => {
    const { container } = await render(
      <>
        <Section id="a" tone="muted">
          <Lede long>Long</Lede>
        </Section>
        <Section id="b" tone="white" bordered snug>
          <Lede style={{ maxWidth: 640 }}>Styled</Lede>
        </Section>
      </>,
    );
    const muted = style(container.querySelector("#a")!);
    const white = style(container.querySelector("#b")!);
    expect(muted.backgroundColor).not.toBe(white.backgroundColor);
    expect(white.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(white.borderTopStyle).toBe("solid");
    expect(white.paddingTop).toBe("32px");
    expect(style(page.getByText("Long").element()).maxWidth).toBe("none");
    expect(style(page.getByText("Styled").element()).maxWidth).toBe("640px");
  });
});
