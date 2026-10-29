import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ImportCard.module.css";
import Grid, { Card } from "./ui/Grid";

/** The import page's cards, side by side where there's room. */
export function ImportCards({ children }: { children: ReactNode }) {
  return <Grid even>{children}</Grid>;
}

type Props = {
  /** The job's name: the link to its page. */
  title: string;
  href: string;
  /** Its icons, before the name. */
  icons: ReactNode;
  /** What it does, and where from. */
  intro: ReactNode;
  /** How its newest run ended: under the name. */
  children: ReactNode;
};

/**
 * One import or check on the import page: a card with its icons and name,
 * how its newest run ended, and what it does. The whole card opens the job's page;
 * the links in its description still open where it reads from.
 */
export default function ImportCard({ title, href, icons, intro, children }: Props) {
  return (
    <Card span={2} className={styles.card}>
      <div className={styles.head}>
        {icons}
        <h3 className={styles.title}>
          <Link href={href} className={styles.open}>
            {title}
          </Link>
        </h3>
      </div>
      <div className={styles.status}>{children}</div>
      <p className={styles.intro}>{intro}</p>
    </Card>
  );
}
