import { describe, expect, it } from "vitest";
import { UK_MAP_HEIGHT, UK_MAP_WIDTH, ukMapPoint, ukOutline } from "./uk-map";

describe("the UK map", () => {
  it("draws the outline within the map, once", () => {
    const outline = ukOutline();
    expect(outline).toMatch(/^M[\d.]+,[\d.]+L/);
    expect(ukOutline()).toBe(outline);
    const numbers = outline.match(/[\d.]+/g)!.map(Number);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(UK_MAP_HEIGHT);
  });

  it("places a town where it is, north above south, west left of east", () => {
    const london = ukMapPoint(51.507, -0.128)!;
    const edinburgh = ukMapPoint(55.953, -3.188)!;
    const belfast = ukMapPoint(54.597, -5.93)!;
    expect(edinburgh.y).toBeLessThan(london.y);
    expect(belfast.x).toBeLessThan(edinburgh.x);
    for (const point of [london, edinburgh, belfast]) {
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(UK_MAP_WIDTH);
    }
  });

  it("leaves off a place outside the UK", () => {
    expect(ukMapPoint(40.7, -74)).toBeUndefined();
    expect(ukMapPoint(-33.9, 151.2)).toBeUndefined();
    expect(ukMapPoint(48.85, 2.35)).toBeUndefined();
  });
});
