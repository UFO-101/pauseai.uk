import { describe, expect, it } from "vitest";
import { PIN_CLEARANCE, connectorPath } from "./map-connector";

const box = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width });
const wrap = box(100, 50, 1000, 600);

describe("connectorPath", () => {
  it("leaves a left-hand card from its right edge and stops short of the pin", () => {
    // Card's right edge at x=400 (300 in wrap), middle at y=100 (50 in wrap); pin centre at (400, 50) in wrap.
    const d = connectorPath(box(200, 50, 200, 100), box(495, 95, 10, 10), wrap, true);
    expect(d).toBe(`M300,50 H314 L${400 - PIN_CLEARANCE},50`);
  });

  it("leaves a right-hand card from its left edge", () => {
    const d = connectorPath(box(800, 50, 200, 100), box(495, 95, 10, 10), wrap, false);
    expect(d).toBe(`M700,50 H686 L${400 + PIN_CLEARANCE},50`);
  });

  it("copes with a pin exactly at the end of the stub", () => {
    // Pin centre at x=314 in wrap, where the stub ends.
    const d = connectorPath(box(200, 50, 200, 100), box(409, 95, 10, 10), wrap, true);
    expect(d).toBe("M300,50 H314 L314,50");
  });
});
