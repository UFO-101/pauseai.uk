import { describe, expect, it } from "vitest";
import {
  CELLS,
  MAP_BOX,
  MAP_STEPS,
  REGION_BORDERS,
  REGION_LABELS,
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
      expect(x).toBeGreaterThan(MAP_BOX.x);
      expect(x).toBeLessThan(MAP_BOX.x + MAP_BOX.width);
      expect(y).toBeGreaterThan(MAP_BOX.y);
      expect(y).toBeLessThan(MAP_BOX.y + MAP_BOX.height);
    }
  });

  it("put Scotland north of London, and Northern Ireland west of Wales", () => {
    const middle = (name: string) => {
      const cells = CELLS.filter((c) => c.region === REGION_LABELS.find((l) => l.lines[0].text === name)!.region);
      return {
        x: cells.reduce((sum, c) => sum + c.x, 0) / cells.length,
        y: cells.reduce((sum, c) => sum + c.y, 0) / cells.length,
      };
    };
    expect(middle("Scotland").y).toBeLessThan(middle("London").y);
    expect(middle("Northern").x).toBeLessThan(middle("Wales").x);
  });

  it("draw a hexagon as six corners round its centre, inset or outset", () => {
    expect(hexPath(0, 0)).toBe("M0.00,-9.40L8.14,-4.70L8.14,4.70L0.00,9.40L-8.14,4.70L-8.14,-4.70Z");
    expect(hexPath(0, 0, -0.4)).toContain("M0.00,-10.40");
  });
});

describe("the map's regions", () => {
  // Each side of a hexagon, by its two corners either way round.
  const sides = (code: string) => {
    const cell = CELLS.find((c) => c.code === code)!;
    const corners = hexPath(cell.x, cell.y, 0).slice(1, -1).split("L");
    return corners.map((a, i) => [a, corners[(i + 1) % 6]].sort().join(" "));
  };
  const drawn = REGION_BORDERS.slice(1)
    .split("M")
    .map((side) => side.split("L").sort().join(" "));

  it("are outlined: round a hexagon alone in the sea, between regions once, not inside one", () => {
    expect(new Set(drawn).size).toBe(drawn.length);
    for (const side of sides("W07000112")) expect(drawn).toContain(side);
    for (const side of sides("E14001172")) expect(drawn).not.toContain(side);
    // London's outer hexagons have a side drawn, its inner ones none.
    const london = CELLS.filter((c) => c.region === "E12000007").map((c) => c.code);
    const outlined = london.filter((code) => sides(code).some((side) => drawn.includes(side)));
    expect(outlined.length).toBeGreaterThan(0);
    expect(outlined.length).toBeLessThan(london.length);
  });

  it("are named in the sea, each with a leader to one of its own hexagons, inside the map's box", () => {
    expect(new Set(REGION_LABELS.map((l) => l.region))).toEqual(new Set(CELLS.map((c) => c.region)));
    for (const { region, x, lines, leader } of REGION_LABELS) {
      expect(CELLS.find((c) => c.x === leader.x2 && c.y === leader.y2)!.region).toBe(region);
      expect(x).toBeGreaterThan(MAP_BOX.x);
      expect(x).toBeLessThan(MAP_BOX.x + MAP_BOX.width);
      for (const { y } of lines) {
        expect(y).toBeGreaterThan(MAP_BOX.y);
        expect(y).toBeLessThan(MAP_BOX.y + MAP_BOX.height);
      }
    }
    const northernIreland = REGION_LABELS.find((l) => l.region === "N92000002")!;
    expect(northernIreland.lines.map((l) => l.text)).toEqual(["Northern", "Ireland"]);
    expect(northernIreland.leader.y1).toBeLessThan(northernIreland.lines[0].y);
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
