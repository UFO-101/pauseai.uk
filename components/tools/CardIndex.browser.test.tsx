import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { CardIndex, IndexCard } from "./CardIndex";

describe("CardIndex", () => {
  it("titles the page and lists its cards, opening outside ones in a new tab", async () => {
    await render(
      <CardIndex title="Tools" lede="For volunteers.">
        <IndexCard href="/tools/qr" title="QR" cta="Open →">
          <p>Make one.</p>
        </IndexCard>
        <IndexCard href="https://example.org/" title="Elsewhere" cta="Visit ↗" external>
          <p>Another site.</p>
        </IndexCard>
      </CardIndex>,
    );
    await expect.element(page.getByRole("heading", { level: 1, name: "Tools" })).toBeVisible();
    await expect.element(page.getByText("For volunteers.")).toBeVisible();
    expect(page.getByRole("listitem").elements()).toHaveLength(2);
    const inside = page.getByRole("link", { name: /QR/ });
    await expect.element(inside).toHaveAttribute("href", "/tools/qr");
    await expect.element(inside).not.toHaveAttribute("target");
    const outside = page.getByRole("link", { name: /Elsewhere/ });
    await expect.element(outside).toHaveAttribute("target", "_blank");
    expect(outside.element().textContent).toMatch(/\(opens in a new tab\)$/);
  });
});
