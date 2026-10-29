import { describe, expect, it } from "vitest";
import {
  AREA_LABELS,
  CELLS,
  MAP_SIZE,
  MAP_STEPS,
  hexPath,
  reach,
  rowsByCode,
  stepLabels,
  stepOf,
} from "./constituency-map";

describe("the constituency map's hexagons", () => {
  it("are the 650 constituencies, by name, none on top of another, all inside the map", () => {
    expect(CELLS).toHaveLength(650);
    expect(CELLS[0].name).toBe("Aberafan Maesteg");
    expect(new Set(CELLS.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)).size).toBe(650);
    for (const { x, y } of CELLS) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(MAP_SIZE.width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(MAP_SIZE.height);
    }
  });

  it("put Scotland north of London, and Northern Ireland west of Wales", () => {
    const at = (name: string) => AREA_LABELS.find((a) => a.name === name)!;
    expect(at("Scotland").y).toBeLessThan(at("London").y);
    expect(at("Northern Ireland").x).toBeLessThan(at("Wales").x);
  });

  it("draw a hexagon as six corners round its centre, inset or outset", () => {
    expect(hexPath(0, 0)).toBe("M0.00,-9.40L8.14,-4.70L8.14,4.70L0.00,9.40L-8.14,4.70L-8.14,-4.70Z");
    expect(hexPath(0, 0, -0.4)).toContain("M0.00,-10.40");
  });
});

describe("the map's steps", () => {
  it("put none at 0 and each count at the highest step it reaches", () => {
    const steps = MAP_STEPS.supporters;
    expect([0, 1, 2, 3, 9, 10, 29, 30, 500].map((n) => stepOf(n, steps))).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("say each step's counts, one number for a step of one", () => {
    expect(stepLabels(MAP_STEPS.supporters)).toEqual(["1–2", "3–9", "10–29", "30+"]);
    expect(stepLabels(MAP_STEPS.frontier)).toEqual(["1", "2–4", "5–9", "10+"]);
  });
});

describe("the map's rows", () => {
  const westminster = { code: "E14001172", supporters: 4, frontier: 2, sobel: 0, mp: null };
  const leeds = { code: "E14001319", supporters: 1, frontier: 0, sobel: 3, mp: null };

  it("give every hexagon a row, none for those not given", () => {
    const rows = rowsByCode([westminster]);
    expect(rows.size).toBe(650);
    expect(rows.get("E14001172")).toBe(westminster);
    expect(rows.get("E14001063")).toEqual({ code: "E14001063", supporters: 0, frontier: 0, sobel: 0, mp: null });
  });

  it("count the constituencies a layer reaches, and its total", () => {
    const rows = rowsByCode([westminster, leeds]).values();
    expect(reach([westminster, leeds], "supporters")).toEqual({ places: 2, total: 5 });
    expect(reach(rows, "sobel")).toEqual({ places: 1, total: 3 });
  });
});
