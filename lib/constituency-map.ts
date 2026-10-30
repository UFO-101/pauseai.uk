import { constituencyName } from "./constituencies";
import hexes from "./constituency-hexes.json";

// The constituency map (/campaigns/constituencies): every Westminster
// constituency as one hexagon of the same size, so each MP counts the same
// however big their seat. The layout is Open Innovations' for the July 2024
// boundaries, by official code, with each hexagon's region:
// https://github.com/odileeds/hexmaps/blob/gh-pages/maps/uk-constituencies-2023.hexjson
// (MIT licence), fetched 29 Oct 2026. Its rows are "odd-r": pointy-topped
// hexagons, each odd row pushed half a hexagon right, and r grows northwards.
// Replace it with lib/constituencies.json after the next boundary review.

/** What the map can be coloured by: supporters, or letters in one of two campaigns. */
export type MapLayer = "supporters" | "frontier" | "sobel";

/** The layers, in the order the switch offers them. */
export const MAP_LAYERS: readonly MapLayer[] = ["supporters", "frontier", "sobel"];

/** The campaign whose letters each letters layer counts, by slug. */
export const LAYER_CAMPAIGNS = { frontier: "regulate-letter-pm", sobel: "support-sobel-bill" } as const;

/** What's counted in a constituency, one number a layer. */
export type ConstituencyCounts = Record<MapLayer, number>;

/** A constituency's MP in office. */
export type ConstituencyMp = { name: string; party: string };

/** A constituency as the page is given it: its code, its counts and its MP, if it has one in office. */
export type ConstituencyRow = ConstituencyCounts & { code: string; mp: ConstituencyMp | null };

/** A hexagon of the map: its constituency, its region and its centre. */
export type Cell = { code: string; name: string; region: string; x: number; y: number };

/** From a hexagon's centre to a corner, in the map's units. */
const RADIUS = 10;
const WIDTH = Math.sqrt(3) * RADIUS;
const ROW = 1.5 * RADIUS;
/** The space round the hexagons, so a selected one's outline isn't cut off. */
const MARGIN = 4;

const LAYOUT = hexes as unknown as Record<string, [q: number, r: number, region: string]>;
const QS = Object.values(LAYOUT).map(([q]) => q);
const RS = Object.values(LAYOUT).map(([, r]) => r);
const MIN_Q = Math.min(...QS);
const MAX_R = Math.max(...RS);

/** Every constituency's hexagon, by name. */
export const CELLS: readonly Cell[] = Object.entries(LAYOUT)
  .map(([code, [q, r, region]]) => ({
    code,
    name: constituencyName(code)!,
    region,
    x: MARGIN + WIDTH / 2 + WIDTH * (q - MIN_Q + (r & 1 ? 0.5 : 0)),
    y: MARGIN + RADIUS + ROW * (MAX_R - r),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "en-GB"));

/** The map's size, in its own units, for the SVG's viewBox. */
export const MAP_SIZE = {
  width: Math.max(...CELLS.map((c) => c.x)) + WIDTH / 2 + MARGIN,
  height: Math.max(...CELLS.map((c) => c.y)) + RADIUS + MARGIN,
};

/** A hexagon's outline round a centre, a little smaller than the grid so a hairline of paper shows between. */
export function hexPath(x: number, y: number, inset = 0.6): string {
  const r = RADIUS - inset;
  const corners = [-90, -30, 30, 90, 150, 210].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return `${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${corners.join("L")}Z`;
}

/** The areas named on the map, each by the regions its hexagons are in. */
const AREAS: { name: string; regions: (region: string) => boolean }[] = [
  { name: "Scotland", regions: (region) => region.startsWith("S") },
  { name: "Northern Ireland", regions: (region) => region.startsWith("N") },
  { name: "Wales", regions: (region) => region.startsWith("W") },
  { name: "London", regions: (region) => region === "E12000007" },
];

/** Where each area's name goes: the middle of its hexagons. */
export const AREA_LABELS: readonly { name: string; x: number; y: number }[] = AREAS.map(({ name, regions }) => {
  const cells = CELLS.filter((c) => regions(c.region));
  return {
    name,
    x: cells.reduce((sum, c) => sum + c.x, 0) / cells.length,
    y: cells.reduce((sum, c) => sum + c.y, 0) / cells.length,
  };
});

/**
 * Where each layer's colours change: the lowest count of each step after
 * none. Supporters are many more than letters, so they step further apart.
 */
export const MAP_STEPS: Record<MapLayer, readonly number[]> = {
  supporters: [1, 3, 10, 30],
  frontier: [1, 2, 5, 10],
  sobel: [1, 2, 5, 10],
};

/** Which step of its layer's colours a count takes: 0 for none, up to the number of steps. */
export function stepOf(count: number, steps: readonly number[]): number {
  return steps.filter((lowest) => count >= lowest).length;
}

/** Each step's counts, as its key says them: "1", "2–4", "10+". */
export function stepLabels(steps: readonly number[]): string[] {
  return steps.map((lowest, i) => {
    const next = steps[i + 1];
    if (next === undefined) return `${lowest}+`;
    return next - 1 === lowest ? `${lowest}` : `${lowest}–${next - 1}`;
  });
}

/** No one, and nothing sent: a constituency with no row of its own. */
const NONE: ConstituencyRow = { code: "", supporters: 0, frontier: 0, sobel: 0, mp: null };

/** Every hexagon's row, by code, with none for a constituency the rows leave out. */
export function rowsByCode(rows: readonly ConstituencyRow[]): Map<string, ConstituencyRow> {
  const given = new Map(rows.map((row) => [row.code, row]));
  return new Map(CELLS.map((cell) => [cell.code, given.get(cell.code) ?? { ...NONE, code: cell.code }]));
}

/** How many constituencies have at least one of a layer's count, and the total of that count. */
export function reach(rows: Iterable<ConstituencyRow>, layer: MapLayer): { places: number; total: number } {
  let places = 0;
  let total = 0;
  for (const row of rows) {
    if (row[layer] > 0) places++;
    total += row[layer];
  }
  return { places, total };
}
