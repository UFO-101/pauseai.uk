import type { ReactNode } from "react";
import styles from "./FeatureCard.module.css";

/** A card with an accent edge. Put an `<h3>` and a `<p>` or two inside. */
export default function FeatureCard({ children }: { children: ReactNode }) {
  return <article className={styles.card}>{children}</article>;
}
