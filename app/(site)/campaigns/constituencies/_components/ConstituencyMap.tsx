"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Segmented } from "@/components/ui/Controls";
import { CELLS, MAP_LAYERS, reach, rowsByCode, type ConstituencyRow, type MapLayer } from "@/lib/constituency-map";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import ConstituencyCard from "./ConstituencyCard";
import HexMap from "./HexMap";
import MapKey from "./MapKey";
import PostcodeFinder from "./PostcodeFinder";
import styles from "./ConstituencyMap.module.css";

const NAMES = new Map(CELLS.map((cell) => [cell.code, cell.name]));

/**
 * The map and what goes with it: the switch between supporters and each
 * campaign's letters, how far the layer reaches, the key, a postcode box,
 * and the card of the constituency picked or found.
 */
export default function ConstituencyMap({ rows }: { rows: ConstituencyRow[] }) {
  const byCode = useMemo(() => rowsByCode(rows), [rows]);
  const [layer, setLayer] = useState<MapLayer>("supporters");
  const [picked, setPicked] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [yours, setYours] = useState<string | null>(null);
  const { places, total } = reach(byCode.values(), layer);
  const cardRef = useRef<HTMLDivElement>(null);

  // A constituency picked or found brings its card into view, as on a
  // phone it's under the map and the postcode box. Smooth unless the
  // reader would rather not have motion (styles/base.css).
  useEffect(() => {
    if (picked) cardRef.current!.scrollIntoView({ block: "nearest" });
  }, [picked]);

  return (
    <div className={styles.explorer}>
      <div className={styles.controls}>
        <Segmented
          label={copy.layerLabel}
          options={MAP_LAYERS.map((value) => ({ value, label: copy.layers[value] }))}
          value={layer}
          onChange={setLayer}
        />
        <p className={styles.reach} aria-live="polite">
          {copy.reach[layer](places, total)}
        </p>
      </div>
      <div className={styles.map}>
        <HexMap
          rows={byCode}
          layer={layer}
          label={copy.mapLabel(copy.layers[layer])}
          picked={picked}
          hovered={hovered}
          tip={(row) => copy.card[layer](row[layer])}
          onPick={setPicked}
          onHover={setHovered}
        />
        <MapKey layer={layer} />
      </div>
      <aside className={styles.panel}>
        <PostcodeFinder
          onFound={(code) => {
            setYours(code);
            setPicked(code);
          }}
        />
        <div ref={cardRef}>
          <ConstituencyCard
            picked={picked === null ? null : { name: NAMES.get(picked)!, row: byCode.get(picked)! }}
            layer={layer}
            yours={picked === yours}
            onClose={() => setPicked(null)}
          />
        </div>
      </aside>
    </div>
  );
}
