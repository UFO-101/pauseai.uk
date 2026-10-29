import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { rowsByCode } from "@/lib/constituency-map";
import { EDINBURGH, WESTMINSTER, exampleRows } from "./ConstituencyMap.examples";
import HexMap from "./HexMap";

const ROWS = rowsByCode(exampleRows);

async function renderMap(props: { picked?: string | null; hovered?: string | null } = {}) {
  const onPick = vi.fn();
  const onHover = vi.fn();
  const screen = await render(
    <HexMap
      rows={ROWS}
      layer="supporters"
      label="The map"
      picked={props.picked ?? null}
      hovered={props.hovered ?? null}
      tip={(row) => `${row.supporters} here`}
      onPick={onPick}
      onHover={onHover}
    />,
  );
  return { screen, onPick, onHover };
}

const hex = (code: string) => document.querySelector(`[data-code="${code}"]`)!;

describe("HexMap", () => {
  it("draws every constituency, filled by its step, the empty ones at none", async () => {
    await renderMap();
    expect(document.querySelectorAll("[data-code]")).toHaveLength(650);
    expect(hex(WESTMINSTER).getAttribute("data-step")).toBe("4");
    expect(hex(EDINBURGH).getAttribute("data-step")).toBe("1");
    expect(hex("E14001063").getAttribute("data-step")).toBe("0");
    expect(document.querySelector("svg")!.getAttribute("aria-label")).toBe("The map");
  });

  it("picks a hexagon clicked, and lets the picked one go", async () => {
    const { onPick } = await renderMap({ picked: WESTMINSTER });
    expect(document.querySelectorAll("path")).toHaveLength(651);
    hex(EDINBURGH).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onPick).toHaveBeenLastCalledWith(EDINBURGH);
    hex(WESTMINSTER).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onPick).toHaveBeenLastCalledWith(null);
  });

  it("follows a mouse, but not a finger, and shows the hovered one's name and tip", async () => {
    const { onHover, screen } = await renderMap({ hovered: WESTMINSTER });
    await expect.element(screen.getByText("Cities of London and Westminster")).toBeVisible();
    await expect.element(screen.getByText("42 here")).toBeVisible();
    hex(EDINBURGH).dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "touch" }));
    expect(onHover).not.toHaveBeenCalled();
    hex(EDINBURGH).dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
    expect(onHover).toHaveBeenLastCalledWith(EDINBURGH);
    // React reads leaving from the pointer going out to something outside.
    hex(EDINBURGH).dispatchEvent(
      new PointerEvent("pointerout", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }),
    );
    expect(onHover).toHaveBeenLastCalledWith(null);
  });
});
