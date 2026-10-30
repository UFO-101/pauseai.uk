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
/** The space round the hexagons and names, so a selected one's outline isn't cut off. */
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
    x: WIDTH / 2 + WIDTH * (q - MIN_Q + (r & 1 ? 0.5 : 0)),
    y: RADIUS + ROW * (MAX_R - r),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "en-GB"));

/** A corner of a hexagon, at an angle from its centre: -90 is the top. */
function corner(x: number, y: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [x + r * Math.cos(a), y + r * Math.sin(a)];
}

const point = ([x, y]: [number, number]) => `${x.toFixed(2)},${y.toFixed(2)}`;

/** A hexagon's outline round a centre, a little smaller than the grid so a hairline of paper shows between. */
export function hexPath(x: number, y: number, inset = 0.6): string {
  return `M${[-90, -30, 30, 90, 150, 210].map((deg) => point(corner(x, y, RADIUS - inset, deg))).join("L")}Z`;
}

/** Each hexagon's region, by where its centre is. */
const REGION_AT = new Map(CELLS.map((c) => [`${c.x.toFixed(1)},${c.y.toFixed(1)}`, c.region]));

/**
 * The line round each region, London too, and so round the coast: every
 * side of a hexagon with another region or the sea across it. A side
 * between two regions is drawn once, from the hexagon whose code is first.
 * Its neighbour across the side facing angle a is a hexagon's width away
 * that way, and the side runs between the corners 30° either side of a.
 */
export const REGION_BORDERS: string = CELLS.flatMap((cell) =>
  [0, 60, 120, 180, 240, 300].flatMap((deg) => {
    const [nx, ny] = corner(cell.x, cell.y, WIDTH, deg);
    const across = REGION_AT.get(`${nx.toFixed(1)},${ny.toFixed(1)}`);
    if (across === cell.region || (across && across < cell.region)) return [];
    return [`M${point(corner(cell.x, cell.y, RADIUS, deg - 30))}L${point(corner(cell.x, cell.y, RADIUS, deg + 30))}`];
  }),
).join("");

/** Each region's name, by its official code: England's nine, and the other three nations. */
export const REGION_NAMES: Record<string, string> = {
  S92000003: "Scotland",
  N92000002: "Northern Ireland",
  W92000004: "Wales",
  E12000001: "North East",
  E12000002: "North West",
  E12000003: "Yorkshire and the Humber",
  E12000004: "East Midlands",
  E12000005: "West Midlands",
  E12000006: "East of England",
  E12000007: "London",
  E12000008: "South East",
  E12000009: "South West",
};

/** A region's name in the sea round the map, a line or two, and the line from it to the region. */
export type RegionLabel = {
  region: string;
  /** Each line of the name, and the middle of its height. */
  lines: readonly { text: string; y: number }[];
  x: number;
  /** Which end of the name is at x, as SVG's text-anchor says it. */
  align: "start" | "middle" | "end";
  /** The leader: from beside the name to the middle of the region's nearest hexagon. */
  leader: { x1: number; y1: number; x2: number; y2: number };
};

/** The labels' type size, and the space between a name's lines, in the map's units. */
export const LABEL_SIZE = 15;
const LINE = LABEL_SIZE * 1.1;
/** The gap between a name and its leader. */
const GAP = 4;

/**
 * The regions' names, each placed by hand in the sea beside its region, in
 * the map's units: west of the map for the regions on the west, east for
 * those on the east, and below for two with no room beside them. A long
 * name is broken into lines; the rest are one.
 */
const PLACES: { region: string; lines?: string[]; x: number; y: number; align: RegionLabel["align"] }[] = [
  { region: "S92000003", x: 94, y: 161, align: "end" },
  { region: "N92000002", lines: ["Northern", "Ireland"], x: 48, y: 314, align: "middle" },
  { region: "E12000001", x: 306, y: 228, align: "start" },
  { region: "E12000002", x: 114, y: 379, align: "end" },
  { region: "E12000003", lines: ["Yorkshire and", "the Humber"], x: 406, y: 331, align: "start" },
  { region: "E12000004", x: 398, y: 381, align: "start" },
  { region: "W92000004", x: 76, y: 446, align: "end" },
  { region: "E12000005", x: 108, y: 501, align: "end" },
  { region: "E12000006", lines: ["East of", "England"], x: 501, y: 491, align: "start" },
  { region: "E12000007", x: 476, y: 579, align: "start" },
  { region: "E12000009", x: 116, y: 611, align: "end" },
  { region: "E12000008", x: 466, y: 708, align: "middle" },
];

/** Every region's name, its lines centred on its place, and its leader. */
export const REGION_LABELS: readonly RegionLabel[] = PLACES.map(
  ({ region, lines = [REGION_NAMES[region]], x, y, align }) => {
    const first = y - (LINE * (lines.length - 1)) / 2;
    // The leader leaves the end of a name beside its region, or the top of
    // one below it, and goes to the region's nearest hexagon.
    const from =
      align === "middle" ? { x, y: first - LABEL_SIZE / 2 - GAP } : { x: align === "end" ? x + GAP : x - GAP, y };
    const to = CELLS.filter((c) => c.region === region).reduce((best, c) =>
      Math.hypot(c.x - from.x, c.y - from.y) < Math.hypot(best.x - from.x, best.y - from.y) ? c : best,
    );
    return {
      region,
      lines: lines.map((text, i) => ({ text, y: first + LINE * i })),
      x,
      align,
      leader: { x1: from.x, y1: from.y, x2: to.x, y2: to.y },
    };
  },
);

/**
 * Roughly how wide a name's line is: the display face's heavy letters
 * average about 0.6 of its size. It only has to keep the names inside the
 * map's box, which has a margin to spare.
 */
const textWidth = (text: string) => text.length * LABEL_SIZE * 0.6;

/**
 * The box the map is drawn in, in its own units, for the SVG's viewBox:
 * round the hexagons and the names in the sea, with a margin.
 */
export const MAP_BOX = (() => {
  const xs = CELLS.flatMap((c) => [c.x - WIDTH / 2, c.x + WIDTH / 2]);
  const ys = CELLS.flatMap((c) => [c.y - RADIUS, c.y + RADIUS]);
  for (const { lines, x, align } of REGION_LABELS) {
    for (const line of lines) {
      const width = textWidth(line.text);
      const left = align === "start" ? x : align === "middle" ? x - width / 2 : x - width;
      xs.push(left, left + width);
      ys.push(line.y - LABEL_SIZE / 2, line.y + LABEL_SIZE / 2);
    }
  }
  const x = Math.min(...xs) - MARGIN;
  const y = Math.min(...ys) - MARGIN;
  return { x, y, width: Math.max(...xs) + MARGIN - x, height: Math.max(...ys) + MARGIN - y };
})();

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
