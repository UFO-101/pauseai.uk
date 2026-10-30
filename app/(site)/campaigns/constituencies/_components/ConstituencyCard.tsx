import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import Tag from "@/components/ui/Tag";
import { MAP_LAYERS, type ConstituencyRow, type MapLayer } from "@/lib/constituency-map";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import styles from "./ConstituencyCard.module.css";

/** The two letters to write, the one the map is showing first; on supporters, the bill's, which is sooner. */
function letters(layer: MapLayer) {
  return layer === "frontier"
    ? [copy.actions.frontier, copy.actions.sobel]
    : [copy.actions.sobel, copy.actions.frontier];
}

/**
 * The constituency picked on the map, or found by postcode: its name, its
 * MP, every count, the layer's own first, and the letters to write.
 * With none picked, how to pick one.
 */
export default function ConstituencyCard({
  picked,
  layer,
  yours,
  onClose,
}: {
  /** The constituency, by name, and its row; null for none picked. */
  picked: { name: string; row: ConstituencyRow } | null;
  layer: MapLayer;
  /** Whether it's the one their postcode found. */
  yours: boolean;
  onClose: () => void;
}) {
  if (!picked) return <p className={styles.prompt}>{copy.card.prompt}</p>;
  const { name, row } = picked;
  const [first, second] = letters(layer);
  return (
    <article className={styles.card} aria-live="polite">
      <header className={styles.header}>
        {yours && <Tag>{copy.card.yours}</Tag>}
        <h2 className={styles.name}>{name}</h2>
        <p className={styles.mp}>{row.mp ? copy.card.mp(row.mp.name, row.mp.party) : copy.card.noMp}</p>
      </header>
      <ul className={styles.counts}>
        {[layer, ...MAP_LAYERS.filter((other) => other !== layer)].map((counted) => (
          <li key={counted} data-shown={counted === layer || undefined}>
            {copy.card[counted](row[counted])}
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <ButtonLink variant="primary" href={first.href}>
          {first.label}
        </ButtonLink>
        <ButtonLink variant="ghost" href={second.href}>
          {second.label}
        </ButtonLink>
      </div>
      <footer className={styles.footer}>
        <Link className="inline-link" href={copy.actions.events.href}>
          {copy.actions.events.label}
        </Link>
        <LinkButton onClick={onClose}>{copy.card.close}</LinkButton>
      </footer>
    </article>
  );
}
