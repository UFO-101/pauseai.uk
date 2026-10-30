// The constituency map group's examples that take a function, doing what they do.
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import { ConstituencyCardExample, HexMapExample, PostcodeFinderExample } from "./constituency-map.client";

describe("the constituency map group's examples", () => {
  it("picks another hexagon, and follows the mouse", async () => {
    await render(<HexMapExample />);
    await expect.element(page.getByText("Edinburgh East and Musselburgh")).toBeVisible();
    const hex = document.querySelector('[data-code="E14001352"]')!;
    hex.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    hex.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
    await expect.element(page.getByText("7 on this layer")).toBeVisible();
  });

  it("shows a card, the prompt, and a card with nothing to clear to", async () => {
    await render(<ConstituencyCardExample code={null} />);
    await expect.element(page.getByText(copy.card.prompt)).toBeVisible();
    await render(<ConstituencyCardExample code="S14000078" yours />);
    await page.getByRole("button", { name: copy.card.close }).click();
    await expect.element(page.getByText(copy.card.yours)).toBeVisible();
  });

  it("looks a postcode up", async () => {
    const fetch = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, mp: { constituency: "Manchester Central" } })));
    await render(<PostcodeFinderExample />);
    await page.getByLabelText(copy.finder.label).fill("M1 1AE");
    await page.getByRole("button", { name: copy.finder.button }).click();
    await expect.poll(() => fetch.mock.calls.length).toBe(1);
    await expect.element(page.getByRole("button", { name: copy.finder.button })).toBeEnabled();
    vi.restoreAllMocks();
  });
});
