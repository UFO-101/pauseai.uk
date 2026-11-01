"use client";

// The constituency map's examples that take a function: client components
// with no props, so the server-rendered gallery can place them.
import { useState } from "react";
import ConstituencyCard from "@/app/(site)/campaigns/constituencies/_components/ConstituencyCard";
import {
  EDINBURGH,
  WESTMINSTER,
  exampleRows,
} from "@/app/(site)/campaigns/constituencies/_components/ConstituencyMap.examples";
import HexMap from "@/app/(site)/campaigns/constituencies/_components/HexMap";
import PostcodeFinder from "@/app/(site)/campaigns/constituencies/_components/PostcodeFinder";
import { CELLS, REGION_NAMES, countOf, rowsByCode, type MapLayer } from "@/lib/constituency-map";

const ROWS = rowsByCode(exampleRows);
const cellOf = (code: string) => CELLS.find((cell) => cell.code === code)!;

/** The hexagons on a layer, Westminster picked and Edinburgh hovered; clicking picks another. */
export function HexMapExample({ layer = "supporters" }: { layer?: MapLayer }) {
  const [picked, setPicked] = useState<string | null>(WESTMINSTER);
  const [hovered, setHovered] = useState<string | null>(EDINBURGH);
  return (
    <div style={{ maxWidth: 480 }}>
      <HexMap
        rows={ROWS}
        layer={layer}
        label="An example map"
        picked={picked}
        hovered={hovered}
        tip={(row) => `${countOf(row, layer)} on this layer`}
        onPick={setPicked}
        onHover={setHovered}
      />
    </div>
  );
}

/** A constituency's card. */
export function ConstituencyCardExample({ code, yours = false }: { code: string; yours?: boolean }) {
  return (
    <div style={{ maxWidth: 420 }}>
      <ConstituencyCard
        name={cellOf(code).name}
        region={REGION_NAMES[cellOf(code).region]}
        row={ROWS.get(code)!}
        layer="supporters"
        yours={yours}
        onClose={() => {}}
      />
    </div>
  );
}

/** The postcode box, which looks the postcode up. */
export function PostcodeFinderExample() {
  return (
    <div style={{ maxWidth: 420 }}>
      <PostcodeFinder onFound={() => {}} />
    </div>
  );
}
