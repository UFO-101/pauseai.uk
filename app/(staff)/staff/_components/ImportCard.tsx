import type { ReactNode } from "react";
import styles from "./ImportCard.module.css";

/** The import page's cards, side by side where there's room. */
export function ImportCards({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

type Props = {
  /** The job's name, with its lozenges. */
  title: ReactNode;
  /** What it does, and where from. */
  intro: ReactNode;
  /** Its button and the way to its runs. */
  actions: ReactNode;
  /** Its newest run, or that it has never run. */
  children: ReactNode;
};

/** One import or check on the import page: a card with what it does, its button, and its newest run. */
export default function ImportCard({ title, intro, actions, children }: Props) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.intro}>{intro}</p>
      {actions}
      <div className={styles.runs}>{children}</div>
    </section>
  );
}
