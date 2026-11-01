"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import {
  CELLS,
  MAP_LAYERS,
  REGION_NAMES,
  countOf,
  reach,
  rowsByCode,
  type ConstituencyRow,
  type MapLayer,
} from "@/lib/constituency-map";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import ConstituencyCard from "./ConstituencyCard";
import HexMap from "./HexMap";
import MapKey from "./MapKey";
import PostcodeFinder from "./PostcodeFinder";
import styles from "./ConstituencyMap.module.css";

const BY_CODE = new Map(CELLS.map((cell) => [cell.code, cell]));

/**
 * The map and what goes with it. On one side, what to do: write to your
 * MP, a postcode box, and the card of the constituency picked or found.
 * On the other, boxed, the map: the switch between supporters and
 * letters, how many constituencies the layer reaches, and the key.
 */
export default function ConstituencyMap({ rows }: { rows: ConstituencyRow[] }) {
  const byCode = useMemo(() => rowsByCode(rows), [rows]);
  const [layer, setLayer] = useState<MapLayer>("supporters");
  const [picked, setPicked] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [yours, setYours] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // A constituency picked or found brings its card into view, as on a
  // phone it's away from the map. Smooth unless the reader would rather
  // not have motion (styles/base.css).
  useEffect(() => {
    if (picked) cardRef.current!.scrollIntoView({ block: "nearest" });
  }, [picked]);

  return (
    <div className={styles.explorer}>
      <div className={styles.panel}>
        <div className={styles.write}>
          <h2 className={styles.title}>{copy.write.title}</h2>
          <p className={styles.body}>{copy.write.body}</p>
          <div className={styles.actions}>
            <ButtonLink variant="primary" href={copy.actions.sobel.href}>
              {copy.actions.sobel.label}
            </ButtonLink>
            <ButtonLink variant="ghost" href={copy.actions.frontier.href}>
              {copy.actions.frontier.label}
            </ButtonLink>
          </div>
        </div>
        <PostcodeFinder
          onFound={(code) => {
            setYours(code);
            setPicked(code);
          }}
        />
        <div ref={cardRef}>
          {picked && (
            <ConstituencyCard
              name={BY_CODE.get(picked)!.name}
              region={REGION_NAMES[BY_CODE.get(picked)!.region]}
              row={byCode.get(picked)!}
              layer={layer}
              yours={picked === yours}
              onClose={() => setPicked(null)}
            />
          )}
        </div>
      </div>
      <div className={styles.map}>
        <div className={styles.controls}>
          <Segmented
            label={copy.layerLabel}
            options={MAP_LAYERS.map((value) => ({ value, label: copy.layers[value] }))}
            value={layer}
            onChange={setLayer}
          />
          <p className={styles.reach} aria-live="polite">
            {copy.reach(reach(byCode.values(), layer).places)}
          </p>
        </div>
        <HexMap
          rows={byCode}
          layer={layer}
          label={copy.mapLabel(copy.layers[layer])}
          picked={picked}
          hovered={hovered}
          tip={(row) => copy.card[layer](countOf(row, layer))}
          onPick={setPicked}
          onHover={setHovered}
        />
        <MapKey layer={layer} />
      </div>
    </div>
  );
}
