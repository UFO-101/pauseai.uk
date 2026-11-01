import type { SyntheticEvent } from "react";
import {
  CELLS,
  LABEL_SIZE,
  MAP_BOX,
  MAP_STEPS,
  countOf,
  REGION_BORDERS,
  REGION_LABELS,
  hexPath,
  stepOf,
  type ConstituencyRow,
  type MapLayer,
} from "@/lib/constituency-map";
import styles from "./HexMap.module.css";

const PATHS = new Map(CELLS.map((cell) => [cell.code, hexPath(cell.x, cell.y)]));
const BY_CODE = new Map(CELLS.map((cell) => [cell.code, cell]));

/** The constituency an event on the hexagons is on, by its hexagon's code. */
function codeOf(event: SyntheticEvent): string | null {
  return (event.target as Element).getAttribute("data-code");
}

/**
 * The 650 constituencies as hexagons, each filled by its count on the
 * layer: hollow for none, then darker for more, with a line round each
 * region and its name in the sea. Clicking or tapping one
 * picks it, and clicking it again lets it go; a mouse over one shows its
 * name and count. The picked one is outlined. The numbers are in the
 * table too, as a hexagon can't be reached from the keyboard.
 */
export default function HexMap({
  rows,
  layer,
  label,
  picked,
  hovered,
  tip,
  onPick,
  onHover,
}: {
  rows: Map<string, ConstituencyRow>;
  layer: MapLayer;
  /** What the map shows, read out in place of it. */
  label: string;
  picked: string | null;
  hovered: string | null;
  /** What the tip over the hovered hexagon says: its count, in words. */
  tip: (row: ConstituencyRow) => string;
  onPick: (code: string | null) => void;
  onHover: (code: string | null) => void;
}) {
  const steps = MAP_STEPS[layer];
  const pickedCell = picked ? BY_CODE.get(picked) : undefined;
  const hoveredCell = hovered ? BY_CODE.get(hovered) : undefined;
  return (
    <div className={styles.map}>
      <svg
        className={styles.svg}
        viewBox={[MAP_BOX.x, MAP_BOX.y, MAP_BOX.width, MAP_BOX.height].map((n) => n.toFixed(1)).join(" ")}
        role="img"
        aria-label={label}
      >
        <g
          onClick={(event) => {
            const code = codeOf(event);
            onPick(code === picked ? null : code);
          }}
          onPointerOver={(event) => {
            if (event.pointerType === "mouse") onHover(codeOf(event));
          }}
          onPointerLeave={() => onHover(null)}
        >
          {CELLS.map((cell) => (
            <path
              key={cell.code}
              className={styles.hex}
              d={PATHS.get(cell.code)}
              data-code={cell.code}
              data-step={stepOf(countOf(rows.get(cell.code)!, layer), steps)}
            />
          ))}
        </g>
        <path className={styles.borders} d={REGION_BORDERS} />
        {REGION_LABELS.map(({ region, lines, x, align, leader }) => (
          <g key={region}>
            <line className={styles.leader} {...leader} />
            <circle className={styles.end} cx={leader.x2} cy={leader.y2} r={2} />
            <text className={styles.region} x={x} textAnchor={align} fontSize={LABEL_SIZE}>
              {lines.map((line) => (
                <tspan key={line.text} x={x} y={line.y}>
                  {line.text}
                </tspan>
              ))}
            </text>
          </g>
        ))}
        {pickedCell && <path className={styles.picked} d={hexPath(pickedCell.x, pickedCell.y, -0.4)} />}
      </svg>
      {hoveredCell && (
        <div
          className={styles.tip}
          role="presentation"
          style={{
            left: `${((hoveredCell.x - MAP_BOX.x) / MAP_BOX.width) * 100}%`,
            top: `${((hoveredCell.y - MAP_BOX.y) / MAP_BOX.height) * 100}%`,
          }}
        >
          <strong>{hoveredCell.name}</strong>
          <span>{tip(rows.get(hoveredCell.code)!)}</span>
        </div>
      )}
    </div>
  );
}
