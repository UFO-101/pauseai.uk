import { MAP_STEPS, stepLabels, type MapLayer } from "@/lib/constituency-map";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import styles from "./MapKey.module.css";

/** A swatch: a small hexagon, filled as the map fills a step. */
function Swatch({ step }: { step: number }) {
  return (
    <svg className={styles.swatch} viewBox="0 0 20 20" aria-hidden="true">
      <path data-step={step} d="M10,1L17.8,5.5L17.8,14.5L10,19L2.2,14.5L2.2,5.5Z" />
    </svg>
  );
}

/** The map's key: what each fill means on this layer, none first. */
export default function MapKey({ layer }: { layer: MapLayer }) {
  return (
    <figure className={styles.key}>
      <figcaption className={styles.label}>{copy.legendLabel[layer]}</figcaption>
      <ul className={styles.steps}>
        <li>
          <Swatch step={0} />
          {copy.none}
        </li>
        {stepLabels(MAP_STEPS[layer]).map((label, i) => (
          <li key={label}>
            <Swatch step={i + 1} />
            {label}
          </li>
        ))}
      </ul>
    </figure>
  );
}
