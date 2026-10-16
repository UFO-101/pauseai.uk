import type { ReactNode } from "react";
import styles from "./CampaignContext.module.css";
/** Why the campaign matters: the paragraphs under the heading. */
export default function CampaignContext({ children }: { children: ReactNode }) {
  return (
    <section className={styles.context}>
      <div className="container">{children}</div>
    </section>
  );
}
