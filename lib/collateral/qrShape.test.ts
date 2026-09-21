import { describe, expect, it } from "vitest";
import { qrMatrix } from "./qr";
import { pauseBars, qrShape, qrSvg } from "./qrShape";

const target = "https://pauseai.uk";

describe("qrShape", () => {
  it("draws one cell per dark module when there is no logo", () => {
    const dark = qrMatrix(target).flat().filter(Boolean).length;
    expect(qrShape(target, 500, false).cells).toHaveLength(dark);
  });

  it("leaves a gap in the middle for the logo", () => {
    const withLogo = qrShape(target, 500, true);
    const without = qrShape(target, 500, false);
    expect(withLogo.cells.length).toBeLessThan(without.cells.length);
    expect(withLogo.logoRadius).toBeGreaterThan(0);
    // No module overlaps the logo circle.
    for (const c of withLogo.cells) {
      const d = Math.hypot(c.x + c.s / 2 - withLogo.centre.x, c.y + c.s / 2 - withLogo.centre.y);
      expect(d).toBeGreaterThanOrEqual(withLogo.logoRadius!);
    }
  });

  it("keeps every module inside the panel with a quiet margin", () => {
    const shape = qrShape(target, 500, true);
    for (const c of shape.cells) {
      expect(c.x).toBeGreaterThan(0);
      expect(c.y).toBeGreaterThan(0);
      expect(c.x + c.s).toBeLessThan(shape.size);
      expect(c.y + c.s).toBeLessThan(shape.size);
    }
  });

  it("scales with the requested size", () => {
    expect(qrShape(target, 1000, false).cells[0].s).toBeCloseTo(qrShape(target, 500, false).cells[0].s * 2, 5);
  });

  it("keeps the logo bars inside the logo circle", () => {
    const r = 40;
    const b = pauseBars(r);
    expect(Math.hypot(b.leftX, b.y)).toBeLessThan(r);
    expect(Math.hypot(b.rightX + b.w, -b.y)).toBeLessThan(r);
  });
});

describe("qrSvg", () => {
  it("is a self-contained SVG at the requested size", () => {
    const svg = qrSvg(qrShape(target, 800, true), { background: "#FFFFFF" });
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg).toContain('width="800"');
    expect(svg).toContain('viewBox="0 0 800 800"');
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).not.toMatch(/<script|href=|<image|<text/i);
  });

  it("has a background panel only when asked", () => {
    const shape = qrShape(target, 400, false);
    expect(qrSvg(shape, { background: "#FFFFFF" })).toContain('fill="#FFFFFF"');
    expect(qrSvg(shape, { background: null })).not.toContain('fill="#FFFFFF"');
  });

  it("includes the pause symbol only with a logo", () => {
    expect(qrSvg(qrShape(target, 400, true), { background: null })).toContain("<circle");
    expect(qrSvg(qrShape(target, 400, false), { background: null })).not.toContain("<circle");
  });
});
