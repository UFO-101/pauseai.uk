import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import Tag from "@/components/ui/Tag";
import type { ConstituencyRow, MapLayer } from "@/lib/constituency-map";
import { constituencyMapCopy as copy } from "@/lib/content/constituency-map";
import styles from "./ConstituencyCard.module.css";

/** The card's counts on each layer: the layer's own first, in full ink. */
const COUNTS = {
  supporters: ["supporters", "frontier", "sobel"],
  letters: ["frontier", "sobel", "supporters"],
} as const;

/**
 * The constituency picked on the map, or found by postcode: its region and
 * name, its MP, every count, the layer's own first, and the letters to
 * write, the bill's first, as it's sooner.
 */
export default function ConstituencyCard({
  name,
  region,
  row,
  layer,
  yours,
  onClose,
}: {
  name: string;
  region: string;
  row: ConstituencyRow;
  layer: MapLayer;
  /** Whether it's the one their postcode found. */
  yours: boolean;
  onClose: () => void;
}) {
  return (
    <article className={styles.card} aria-live="polite">
      <header className={styles.header}>
        {yours && <Tag>{copy.card.yours}</Tag>}
        <p className={styles.region}>{region}</p>
        <h2 className={styles.name}>{name}</h2>
        <p className={styles.mp}>{row.mp ? copy.card.mp(row.mp.name, row.mp.party) : copy.card.noMp}</p>
      </header>
      <ul className={styles.counts}>
        {COUNTS[layer].map((counted) => (
          <li key={counted} data-shown={(counted === "supporters") === (layer === "supporters") || undefined}>
            {copy.card[counted](row[counted])}
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <ButtonLink variant="primary" href={copy.actions.sobel.href}>
          {copy.actions.sobel.label}
        </ButtonLink>
        <ButtonLink variant="ghost" href={copy.actions.frontier.href}>
          {copy.actions.frontier.label}
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
