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
  /** How its newest run ended. */
  children: ReactNode;
};

/**
 * One import or check on the import page: a card with its name, what it
 * does, and how its newest run ended. The whole card opens the job's page;
 * the links in its description still open where it reads from.
 */
export default function ImportCard({ title, href, tags, intro, children }: Props) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>
        <Link href={href} className={styles.open}>
          {title}
        </Link>
        {tags}
      </h2>
      <p className={styles.intro}>{intro}</p>
      <div className={styles.runs}>{children}</div>
    </section>
  );
}
