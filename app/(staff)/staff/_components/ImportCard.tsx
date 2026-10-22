import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ImportCard.module.css";

/** The import page's cards, side by side where there's room. */
export function ImportCards({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

type Props = {
  /** The job's name: the link to its page. */
  title: string;
  href: string;
  /** Its lozenges, after the name. */
  tags: ReactNode;
  /** What it does, and where from. */
  intro: ReactNode;
  /** How its newest run ended: under the name. */
  children: ReactNode;
  /** Colours the card's edge by how its newest run ended; plain when left out. */
  tone?: "green" | "amber" | "red";
};

/**
 * One import or check on the import page: a card with its name, how its
 * newest run ended, and what it does, its edge coloured by that ending. The whole card opens the job's page;
 * the links in its description still open where it reads from.
 */
export default function ImportCard({ title, href, tags, intro, children, tone }: Props) {
  return (
    <section className={tone ? `${styles.card} ${styles[tone]}` : styles.card}>
      <h2 className={styles.title}>
        <Link href={href} className={styles.open}>
          {title}
        </Link>
        {tags}
      </h2>
      <div className={styles.status}>{children}</div>
      <p className={styles.intro}>{intro}</p>
    </section>
  );
}
